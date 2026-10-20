import { test } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { spawnSync } from 'node:child_process';
import Create from '../app/create.js';
import inquirer from 'inquirer';
import { prepareRegistry, planSketch, registerSketch, buildSketchTree, serializeRegistry, validateSketchId } from '../app/lib/SketchRegistry.js';

const legacy = () => ({ project: 'test', sketches: { motion: { author: 'original' } } });

async function fixture(t, input = legacy()) {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sketch-kit-registry-'));
    // This test owns only this newly allocated directory.
    t.after(() => fs.remove(root));
    await fs.outputJSON(path.join(root, 'sketch-kit.config.json'), input);
    await fs.outputFile(path.join(root, 'js/sketches/motion/motion.js'), 'import "./motion.scss"; export default class motion { name = "motion"; }');
    await fs.outputFile(path.join(root, 'js/sketches/motion/helper.js'), 'export const keep = true;');
    await fs.outputFile(path.join(root, 'js/sketches/motion/motion.scss'), '#motion { color: red; }');
    await fs.outputFile(path.join(root, 'scss/main.scss'), 'body { color: red; }\n');
    const command = new Create({ root, configFile: 'sketch-kit.config.json' }, []);
    return { root, command, read: () => fs.readJSON(path.join(root, 'sketch-kit.config.json')) };
}

test('legacy migration preserves metadata, ancestry and numeric gaps', () => {
    const input = { project: 'demo', sketches: { motion: { tags: ['test'], children: ['motion_1', 'motion_3'] }, motion_1: {}, motion_3: {} } };
    const { config, issues } = prepareRegistry(input);
    assert.deepEqual(issues, []);
    assert.equal(config.schemaVersion, 2);
    assert.equal(config.sketches.motion_3.parentId, 'motion');
    assert.equal(config.sketches.motion_3.order, 3);
    assert.equal(planSketch(config, 'motion').id, 'motion_4');
    assert.deepEqual(config.sketches.motion.tags, ['test']);
    assert.ok(!Object.hasOwn(config.sketches.motion, 'children'));
    assert.equal(input.schemaVersion, undefined);
});

test('ambiguous multi-digit legacy names require explicit ancestry', () => {
    const input = { sketches: { motion: {}, motion_1: { children: ['motion_10'] }, motion_10: {} } };
    assert.equal(prepareRegistry(input).issues.length, 1);
    input.sketches.motion_10.parentId = 'motion';
    const { config, issues } = prepareRegistry(input);
    assert.deepEqual(issues, []);
    assert.equal(config.sketches.motion_10.order, 10);
});

test('explicit ancestry overrides filenames and stale children', () => {
    const { config } = prepareRegistry({ sketches: { motion: {}, unrelated: { parentId: 'motion' }, motion_1: { parentId: null } } });
    const tree = buildSketchTree(config.sketches);
    assert.equal(tree.length, 2);
    assert.equal(tree[0].children[0].name, 'unrelated');
});

test('rejects cycles, dangling parents, duplicate orders and future schemas', () => {
    assert.throws(() => prepareRegistry({ sketches: { a: { parentId: 'b' }, b: { parentId: 'a' } } }), /Cycle/);
    assert.throws(() => prepareRegistry({ sketches: { a: { parentId: 'missing' } } }), /Unknown parent/);
    assert.throws(() => prepareRegistry({ sketches: { a: { order: 1 }, b: { order: 1 } } }), /duplicate/);
    assert.throws(() => prepareRegistry({ schemaVersion: 9, sketches: {} }), /Unsupported/);
});

test('allocation counter survives deletion of the highest numbered child', () => {
    let { config } = prepareRegistry(legacy());
    config = registerSketch(config, planSketch(config, 'motion'), 'author');
    delete config.sketches.motion_1;
    config = prepareRegistry(config).config;
    assert.equal(planSketch(config, 'motion').id, 'motion_2');
});

test('derived legacy children round-trip without becoming authoritative', () => {
    let { config } = prepareRegistry(legacy());
    config = registerSketch(config, planSketch(config, 'motion', 'custom'), 'author');
    const saved = serializeRegistry(config);
    assert.deepEqual(saved.sketches.motion.children, ['custom']);
    assert.deepEqual(prepareRegistry(saved).config, config);
});

test('serialization keeps a root first for older menus and default selection', () => {
    const { config } = prepareRegistry({ sketches: {
        child: { parentId: 'root', order: 1 },
        root: { parentId: null, order: 5 },
    } });
    assert.equal(Object.keys(serializeRegistry(config).sketches)[0], 'root');
});

test('IDs reject traversal and invalid JavaScript class names', () => {
    for (const id of ['../outside', 'a/b', 'a\\b', 'first-idea', '9motion', 'class', '']) {
        assert.throws(() => validateSketchId(id));
    }
});

test('case-insensitive registry collisions are rejected even without files', () => {
    const { config } = prepareRegistry({ sketches: { motion: {}, MOTION_1: { parentId: 'motion' } } });
    assert.throws(() => planSketch(config, 'motion', 'motion_1'), /already exists/);
    assert.equal(planSketch(config, 'motion').id, 'motion_2');
});

test('copies beyond nine remain siblings and support nested custom branches', async t => {
    const { root, command, read } = await fixture(t);
    for (let i = 1; i <= 12; i++) assert.equal(await command._copySketch('motion', 'author'), `motion_${i}`);
    command._args = ['motion_10', 'spring'];
    await command._copySketch('motion_10', 'author');
    const config = await read();
    assert.equal(config.sketches.motion_10.parentId, 'motion');
    assert.equal(config.sketches.spring.parentId, 'motion_10');
    assert.equal(buildSketchTree(prepareRegistry(config).config.sketches)[0].children.length, 12);
    assert.match(await fs.readFile(path.join(root, 'js/sketches/spring/spring.js'), 'utf8'), /class spring/);
    assert.equal(await fs.readFile(path.join(root, 'js/sketches/spring/helper.js'), 'utf8'), 'export const keep = true;');
});

test('rejects explicit collisions without overwriting either sketch', async t => {
    const { root, command, read } = await fixture(t);
    await command._copySketch('motion', 'author');
    const before = await read();
    command._args = ['motion', 'motion_1'];
    await assert.rejects(command._copySketch('motion', 'author'), /already exists/);
    assert.deepEqual(await read(), before);
    assert.match(await fs.readFile(path.join(root, 'js/sketches/motion_1/motion_1.js'), 'utf8'), /class motion_1/);
});

test('automatic allocation skips files absent from the registry, including case variants', async t => {
    const { root, command } = await fixture(t);
    await fs.ensureDir(path.join(root, 'js/sketches/MOTION_1'));
    assert.equal(await command._copySketch('motion', 'author'), 'motion_2');
});

test('a late failure rolls back new files, stylesheet and registry', async t => {
    const { root, command, read } = await fixture(t);
    const before = await read();
    const oldMain = await fs.readFile(path.join(root, 'scss/main.scss'), 'utf8');
    const rename = fs.rename;
    fs.rename = async (from, to) => {
        if (path.basename(from) === 'config.json') throw new Error('simulated config commit failure');
        return rename(from, to);
    };
    try {
        await assert.rejects(command._copySketch('motion', 'author'), /simulated/);
    } finally {
        fs.rename = rename;
    }
    assert.deepEqual(await read(), before);
    assert.equal(await fs.readFile(path.join(root, 'scss/main.scss'), 'utf8'), oldMain);
    assert.equal(await fs.pathExists(path.join(root, 'js/sketches/motion_1')), false);
    assert.equal(await fs.pathExists(path.join(root, 'scss/sketches/_motion_1.scss')), false);
    assert.equal(await fs.pathExists(path.join(root, '.sketch-kit-create.lock')), false);
});

test('missing source files reject without migrating or leaving partial output', async t => {
    const { root, command, read } = await fixture(t);
    const before = await read();
    await fs.remove(path.join(root, 'js/sketches/motion/motion.scss'));
    await assert.rejects(command._copySketch('motion', 'author'), /ENOENT/);
    assert.deepEqual(await read(), before);
    assert.equal(await fs.pathExists(path.join(root, 'js/sketches/motion_1')), false);
});

test('replace preserves branch metadata and does not duplicate SCSS imports', async t => {
    const { root, command, read } = await fixture(t);
    await command._copySketch('motion', 'author');
    const before = await read();
    await command._writeSketch({ id: 'motion_1', author: 'other', replace: true });
    assert.deepEqual((await read()).sketches.motion_1, before.sketches.motion_1);
    const main = await fs.readFile(path.join(root, 'scss/main.scss'), 'utf8');
    assert.equal(main, 'body { color: red; }\n');
    assert.match(await fs.readFile(path.join(root, 'js/sketches/motion_1/motion_1.js'), 'utf8'), /import ".\/motion_1.scss"/);
    assert.match(await fs.readFile(path.join(root, 'js/sketches/motion_1/motion_1.scss'), 'utf8'), /#motion_1/);
});

test('a failed replacement restores the original sketch and its extra files', async t => {
    const { root, command, read } = await fixture(t);
    const before = await read();
    const rename = fs.rename;
    fs.rename = async (from, to) => {
        if (path.basename(from) === 'config.json') throw new Error('replacement failure');
        return rename(from, to);
    };
    try {
        await assert.rejects(command._writeSketch({ id: 'motion', author: 'other', replace: true }), /replacement failure/);
    } finally {
        fs.rename = rename;
    }
    assert.deepEqual(await read(), before);
    assert.equal(await fs.readFile(path.join(root, 'js/sketches/motion/motion.js'), 'utf8'), 'import "./motion.scss"; export default class motion { name = "motion"; }');
    assert.equal(await fs.readFile(path.join(root, 'js/sketches/motion/helper.js'), 'utf8'), 'export const keep = true;');
});

test('CLI errors return a failing exit code without a partial branch', async t => {
    const { root } = await fixture(t);
    const project = await fs.mkdtemp(path.join(os.tmpdir(), 'sketch-kit-cli-'));
    t.after(() => fs.remove(project));
    await fs.copy(root, path.join(project, 'sketch-kit'));
    const cli = new URL('../index.js', import.meta.url);
    const { fileURLToPath } = await import('node:url');
    const result = spawnSync(process.execPath, [fileURLToPath(cli), 'create', 'motion', 'motion'], {
        cwd: project, encoding: 'utf8', timeout: 10000,
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /already exists/);
});

test('new sketches are roots; concurrent mutations are refused', async t => {
    const { root, command, read } = await fixture(t);
    await command._createSketch('fresh', 'author');
    assert.equal((await read()).sketches.fresh.parentId, null);
    await fs.writeFile(path.join(root, '.sketch-kit-create.lock'), '');
    await assert.rejects(command._copySketch('motion', 'author'), /Another create/);
});

test('invalid JSON and ambiguous migration leave files unchanged', async t => {
    const { root, command } = await fixture(t, { sketches: { motion: {}, motion_10: {} } });
    await assert.rejects(command._copySketch('motion', 'author'), /Review legacy branching/);
    const configPath = path.join(root, 'sketch-kit.config.json');
    await fs.writeFile(configPath, '{ broken');
    await assert.rejects(command._getConfig(), /JSON|position|property/i);
    assert.equal(await fs.readFile(configPath, 'utf8'), '{ broken');
});

test('initialized workspace creates and builds a branch with the new menu', async t => {
    const project = await fs.mkdtemp(path.join(os.tmpdir(), 'sketch-kit-build-'));
    t.after(() => fs.remove(project));
    const moduleUrl = new URL('../app/sketch-kit.js', import.meta.url).href;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
        import SketchKit from ${JSON.stringify(moduleUrl)};
        const kit = new SketchKit({ debug: true });
        await kit.init();
        await kit.create(['motion']);
        await kit.create(['motion', 'spring']);
        await kit.build();
    `], { cwd: project, encoding: 'utf8', timeout: 60000 });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const saved = await fs.readJSON(path.join(project, 'sketch-kit/sketch-kit.config.json'));
    assert.equal(saved.sketches.spring.parentId, 'motion');
    assert.ok(await fs.pathExists(path.join(project, 'sketch-kit/build/index.html')));
    const assets = path.join(project, 'sketch-kit/build/assets');
    const cssFiles = (await fs.readdir(assets)).filter(file => file.endsWith('.css'));
    const css = (await Promise.all(cssFiles.map(file => fs.readFile(path.join(assets, file), 'utf8')))).join('\n');
    for (const id of ['SketchKit', 'motion', 'spring']) assert.ok(css.includes(`#${id}`), `Missing built CSS for ${id}`);
});

test('interactive copy suggests the next name and accepts the default', async t => {
    const { command, read } = await fixture(t);
    await command._getConfig();
    const calls = [];
    t.mock.method(inquirer, 'prompt', async question => {
        calls.push(question);
        if (question.name === 'action') return { action: 'copy' };
        assert.equal(question.default, 'motion_1');
        assert.equal(await question.validate(question.default), true);
        return { id: question.default };
    });
    assert.equal(await command._tryCreateSketch('motion', 'author'), 'motion_1');
    assert.deepEqual(calls.map(question => question.name), ['action', 'id']);
    assert.equal((await read()).sketches.motion_1.parentId, 'motion');
});

test('interactive copy allows a custom name and validates before writing', async t => {
    const { root, command, read } = await fixture(t);
    await fs.ensureDir(path.join(root, 'js/sketches/motion_1'));
    await command._getConfig();
    t.mock.method(inquirer, 'prompt', async question => {
        if (question.name === 'action') return { action: 'copy' };
        assert.equal(question.default, 'motion_2');
        assert.match(await question.validate('motion'), /already exists/);
        assert.match(await question.validate('MOTION_1'), /already exists/);
        assert.match(await question.validate('../outside'), /Invalid/);
        assert.match(await question.validate('class'), /Invalid/);
        assert.equal(question.filter(' spring '), 'spring');
        assert.equal(await question.validate('spring'), true);
        return { id: 'spring' };
    });
    assert.equal(await command._tryCreateSketch('motion', 'author'), 'spring');
    assert.equal((await read()).sketches.spring.parentId, 'motion');
});

test('an explicit copy destination skips both prompts', async t => {
    const { command, read } = await fixture(t);
    command._args = ['motion', 'spring'];
    await command._getConfig();
    t.mock.method(inquirer, 'prompt', () => { throw new Error('Unexpected prompt'); });
    await command._tryCreateSketch('motion', 'author');
    assert.equal((await read()).sketches.spring.parentId, 'motion');
});

test('cancelling the name prompt leaves the registry and files untouched', async t => {
    const { root, command, read } = await fixture(t);
    const before = await read();
    await command._getConfig();
    t.mock.method(inquirer, 'prompt', async question => {
        if (question.name === 'action') return { action: 'copy' };
        throw new Error('Prompt cancelled');
    });
    await assert.rejects(command._tryCreateSketch('motion', 'author'), /cancelled/);
    assert.deepEqual(await read(), before);
    assert.equal(await fs.pathExists(path.join(root, 'js/sketches/motion_1')), false);
});


test('creation and copying need no global stylesheet or legacy style directory', async t => {
    const { root, command } = await fixture(t);
    await fs.remove(path.join(root, 'scss/main.scss'));
    await command._createSketch('fresh', 'author');
    await command._copySketch('motion', 'author');
    assert.match(await fs.readFile(path.join(root, 'js/sketches/fresh/fresh.js'), 'utf8'), /import \".\/fresh.scss\"/);
    assert.ok(await fs.pathExists(path.join(root, 'js/sketches/fresh/fresh.scss')));
    assert.equal(await fs.pathExists(path.join(root, 'scss/main.scss')), false);
    assert.equal(await fs.pathExists(path.join(root, 'scss/sketches')), false);
});

test('copies rename the primary style and preserve additional styles and assets', async t => {
    const { root, command } = await fixture(t);
    const source = path.join(root, 'js/sketches/motion');
    await fs.writeFile(path.join(source, 'motion.scss'), '@use "./parts/palette"; #motion { color: palette.$ink; }');
    await fs.outputFile(path.join(source, 'parts/_palette.scss'), '$ink: red;');
    await fs.writeFile(path.join(source, 'extra.scss'), '.extra { color: blue; }');
    await fs.writeFile(path.join(source, 'asset.txt'), 'unchanged');
    await command._copySketch('motion', 'author', 'spring');
    const target = path.join(root, 'js/sketches/spring');
    assert.match(await fs.readFile(path.join(target, 'spring.js'), 'utf8'), /import \".\/spring.scss\"/);
    assert.equal(await fs.readFile(path.join(target, 'spring.scss'), 'utf8'), '@use "./parts/palette"; #spring { color: palette.$ink; }');
    for (const file of ['parts/_palette.scss', 'extra.scss', 'asset.txt']) {
        assert.equal(await fs.readFile(path.join(target, file), 'utf8'), await fs.readFile(path.join(source, file), 'utf8'));
    }
    assert.equal(await fs.pathExists(path.join(target, 'motion.scss')), false);
});

test('legacy styles reject copy and replacement without changing files', async t => {
    const { root, command, read } = await fixture(t);
    const legacyPath = path.join(root, 'scss/sketches/_motion.scss');
    await fs.outputFile(legacyPath, '#motion { color: red; }');
    const before = await read();
    const scriptPath = path.join(root, 'js/sketches/motion/motion.js');
    const beforeScript = await fs.readFile(scriptPath, 'utf8');
    await assert.rejects(command._copySketch('motion', 'author'), /legacy styles.*docs\/sass.md/);
    await assert.rejects(command._writeSketch({ id: 'motion', author: 'other', replace: true }), /legacy styles/);
    assert.deepEqual(await read(), before);
    assert.equal(await fs.readFile(scriptPath, 'utf8'), beforeScript);
    assert.equal(await fs.readFile(legacyPath, 'utf8'), '#motion { color: red; }');
    assert.equal(await fs.pathExists(path.join(root, 'js/sketches/motion_1')), false);
    assert.equal(await fs.pathExists(path.join(root, '.sketch-kit-create.lock')), false);
});

test('orphaned legacy styles still reserve their IDs without requiring that directory', async t => {
    const { root, command } = await fixture(t);
    await fs.outputFile(path.join(root, 'scss/sketches/_MOTION_1.scss'), '#MOTION_1 {}');
    assert.equal(await command._copySketch('motion', 'author'), 'motion_2');
    await assert.rejects(command._createSketch('MOTION_1', 'author'), /Destination already exists/);
});

test('Vite serves colocated SCSS imports and sends style updates', async t => {
    const { root, command } = await fixture(t);
    await command._createSketch('fresh', 'author');
    await fs.outputFile(path.join(root, 'js/base/BaseSketch.js'), 'export class BaseSketch extends HTMLElement {}');
    const { createServer } = await import('vite');
    const server = await createServer({
        root, configFile: false, logLevel: 'error',
        server: { host: '127.0.0.1', port: 0 },
    });
    t.after(() => server.close());
    await server.listen();
    const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
    const jsResponse = await fetch(`${origin}/js/sketches/fresh/fresh.js`);
    assert.equal(jsResponse.status, 200);
    const js = await jsResponse.text();
    assert.match(js, /fresh.scss/);
    const styleUrl = '/js/sketches/fresh/fresh.scss';
    const cssResponse = await fetch(origin + styleUrl);
    assert.equal(cssResponse.status, 200);
    const css = await cssResponse.text();
    assert.match(css, /#fresh/);
    const updates = [];
    const originalSend = server.ws.send.bind(server.ws);
    server.ws.send = (...args) => { updates.push(args[0]); return originalSend(...args); };
    await fs.writeFile(path.join(root, 'js/sketches/fresh/fresh.scss'), '#fresh { color: rgb(12, 34, 56); }');
    const deadline = Date.now() + 5000;
    while (!updates.some(message => message.type === 'update') && Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 25));
    }
    assert.ok(updates.some(message => message.type === 'update' && message.updates.some(update => update.path === styleUrl)), 'Expected a style HMR update');
    const updated = await (await fetch(origin + styleUrl)).text();
    assert.match(updated, /12, 34, 56/);
});

test('template registry reader accepts CLI output without exposing CLI mutations', async () => {
    const browser = await import('../templates/workspace/js/utils/SketchRegistry.js');
    assert.deepEqual(Object.keys(browser).sort(), ['buildSketchTree', 'prepareRegistry']);
    let config = prepareRegistry(legacy()).config;
    config = registerSketch(config, planSketch(config, 'motion', 'spring'), 'author');
    const serialized = serializeRegistry(config);
    assert.deepEqual(browser.prepareRegistry(serialized), prepareRegistry(serialized));
    assert.deepEqual(browser.buildSketchTree(config.sketches), buildSketchTree(config.sketches));
    assert.deepEqual(browser.prepareRegistry(legacy()), prepareRegistry(legacy()));
});

function interactiveTerminal(t) {
    const descriptor = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
    const previousTest = process.env.TEST;
    Object.defineProperty(process.stdin, 'isTTY', { configurable: true, value: true });
    delete process.env.TEST;
    t.after(() => {
        if (descriptor) Object.defineProperty(process.stdin, 'isTTY', descriptor);
        else delete process.stdin.isTTY;
        if (previousTest === undefined) delete process.env.TEST;
        else process.env.TEST = previousTest;
    });
}

test('interactive creation defaults to None and generates the empty starter', async t => {
    interactiveTerminal(t);
    const { root, command } = await fixture(t);
    await command._getConfig();
    t.mock.method(inquirer, 'prompt', async question => {
        if (question.name === 'confirmed') return { confirmed: true };
        assert.equal(question.name, 'template');
        assert.equal(question.default, 'none');
        assert.deepEqual(question.choices.map(choice => choice.value), ['none', 'threejs']);
        return { template: question.default };
    });
    await command._tryCreateSketch('fresh', 'author');
    const script = await fs.readFile(path.join(root, 'js/sketches/fresh/fresh.js'), 'utf8');
    assert.match(script, /class fresh extends BaseSketch/);
    assert.doesNotMatch(script, /three/);
});

test('interactive Three.js selection substitutes names and uses standard Sass', async t => {
    interactiveTerminal(t);
    const { root, command } = await fixture(t);
    await command._getConfig();
    t.mock.method(inquirer, 'prompt', async question => question.name === 'confirmed' ? { confirmed: true } : { template: 'threejs' });
    await command._tryCreateSketch('scene', 'author');
    const script = await fs.readFile(path.join(root, 'js/sketches/scene/scene.js'), 'utf8');
    assert.match(script, /from 'three'/);
    assert.match(script, /class scene extends BaseSketch/);
    assert.match(script, /import '.\/scene.scss'/);
    assert.doesNotMatch(script, /\{sketchname\}/);
    const expectedSass = (await fs.readFile(new URL('../templates/sketch/sass.txt', import.meta.url), 'utf8')).replaceAll('{sketchname}', 'scene');
    assert.equal(await fs.readFile(path.join(root, 'js/sketches/scene/scene.scss'), 'utf8'), expectedSass);
});

test('cancelling template selection leaves no files or registry changes', async t => {
    interactiveTerminal(t);
    const { root, command, read } = await fixture(t);
    await command._getConfig();
    const before = await read();
    t.mock.method(inquirer, 'prompt', async () => { throw new Error('Template cancelled'); });
    await assert.rejects(command._tryCreateSketch('fresh', 'author'), /Template cancelled/);
    assert.deepEqual(await read(), before);
    assert.equal(await fs.pathExists(path.join(root, 'js/sketches/fresh')), false);
    assert.equal(await fs.pathExists(path.join(root, '.sketch-kit-create.lock')), false);
});

test('replacement offers template selection and retains ancestry', async t => {
    interactiveTerminal(t);
    const { root, command, read } = await fixture(t);
    await command._getConfig();
    const before = await read();
    const calls = [];
    t.mock.method(inquirer, 'prompt', async question => {
        calls.push(question.name);
        if (question.name === 'confirmed') return { confirmed: true };
        return question.name === 'action' ? { action: 'replace' } : { template: 'threejs' };
    });
    await command._tryCreateSketch('motion', 'author');
    assert.deepEqual(calls, ['action', 'template', 'confirmed']);
    assert.deepEqual(prepareRegistry(await read()).config, prepareRegistry(before).config);
    assert.match(await fs.readFile(path.join(root, 'js/sketches/motion/motion.js'), 'utf8'), /from 'three'/);
});

test('unsupported template names cannot escape the template directory', async t => {
    const { root, command } = await fixture(t);
    await assert.rejects(command._createSketch('fresh', 'author', '../outside'), /Unknown sketch template/);
    assert.equal(await fs.pathExists(path.join(root, 'js/sketches/fresh')), false);
});

test('noninteractive creation defaults to None without prompting', async t => {
    const descriptor = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
    Object.defineProperty(process.stdin, 'isTTY', { configurable: true, value: false });
    t.after(() => {
        if (descriptor) Object.defineProperty(process.stdin, 'isTTY', descriptor);
        else delete process.stdin.isTTY;
    });
    const { root, command } = await fixture(t);
    await command._getConfig();
    t.mock.method(inquirer, 'prompt', () => { throw new Error('Unexpected prompt'); });
    await command._tryCreateSketch('fresh', 'author');
    assert.doesNotMatch(await fs.readFile(path.join(root, 'js/sketches/fresh/fresh.js'), 'utf8'), /from 'three'/);
});

for (const action of ['create', 'copy', 'replace']) {
    test(`declining ${action} summary leaves files and registry untouched`, async t => {
        interactiveTerminal(t);
        const { root, command, read } = await fixture(t);
        const before = await read();
        const original = await fs.readFile(path.join(root, 'js/sketches/motion/motion.js'), 'utf8');
        const messages = [];
        t.mock.method(console, 'log', (...args) => messages.push(args.join(' ')));
        t.mock.method(inquirer, 'prompt', async question => {
            assert.equal(question.name, 'confirmed');
            assert.equal(question.default, false);
            assert.equal(await fs.pathExists(path.join(root, '.sketch-kit-stage-')), false);
            return { confirmed: false };
        });
        const result = await command._writeSketch({
            id: action === 'replace' ? 'motion' : 'fresh', author: 'reviewer',
            sourceId: action === 'copy' ? 'motion' : null, replace: action === 'replace',
        });
        assert.equal(result, false);
        assert.deepEqual(await read(), before);
        assert.equal(await fs.readFile(path.join(root, 'js/sketches/motion/motion.js'), 'utf8'), original);
        assert.equal(await fs.pathExists(path.join(root, 'js/sketches/fresh')), false);
        assert.equal(await fs.pathExists(path.join(root, '.sketch-kit-create.lock')), false);
        assert.ok(!(await fs.readdir(root)).some(name => name.startsWith('.sketch-kit-stage-')));
        const summary = messages.join('\n');
        assert.match(summary, /Directory:/);
        assert.match(summary, /Registry:/);
        assert.match(summary, action === 'copy' ? /Source: motion/ : /Template: None/);
        if (action === 'replace') assert.match(summary, /existing files.*replaced/);
    });
}

test('--yes skips create confirmation in an interactive terminal', async t => {
    interactiveTerminal(t);
    const { command } = await fixture(t);
    command.options.yes = true;
    t.mock.method(inquirer, 'prompt', () => { throw new Error('Unexpected confirmation'); });
    assert.equal(await command._createSketch('fresh', 'author'), 'fresh');
});
