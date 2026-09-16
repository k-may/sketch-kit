import { test } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { spawnSync } from 'node:child_process';
import Create from '../app/create.js';
import inquirer from 'inquirer';
import { prepareRegistry, planSketch, registerSketch, buildSketchTree, serializeRegistry, validateSketchId } from '../lib/sketch-kit/js/utils/SketchRegistry.js';

const legacy = () => ({ project: 'test', sketches: { motion: { author: 'original' } } });

async function fixture(t, input = legacy()) {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sketch-kit-registry-'));
    // This test owns only this newly allocated directory.
    t.after(() => fs.remove(root));
    await fs.outputJSON(path.join(root, 'sketch-kit.config.json'), input);
    await fs.outputFile(path.join(root, 'js/sketches/motion/motion.js'), 'export default class motion { name = "motion"; }');
    await fs.outputFile(path.join(root, 'js/sketches/motion/helper.js'), 'export const keep = true;');
    await fs.outputFile(path.join(root, 'scss/sketches/_motion.scss'), '.motion { color: red; }');
    await fs.outputFile(path.join(root, 'scss/main.scss'), '// code-in: sketch-styles\n@use "sketches/motion" as sketch_motion;\n// code-out: sketch-styles\n');
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
    await fs.remove(path.join(root, 'scss/sketches/_motion.scss'));
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
    assert.equal(main.split('@use "sketches/motion_1" as sketch_motion_1;').length - 1, 1);
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
    assert.equal(await fs.readFile(path.join(root, 'js/sketches/motion/motion.js'), 'utf8'), 'export default class motion { name = "motion"; }');
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


test('missing Sass insertion directive leaves the project unchanged', async t => {
    const { root, command, read } = await fixture(t);
    const mainPath = path.join(root, 'scss/main.scss');
    await fs.writeFile(mainPath, 'body { color: red; }');
    const before = await read();
    await assert.rejects(command._copySketch('motion', 'author'), /code-in\/code-out/);
    assert.deepEqual(await read(), before);
    assert.equal(await fs.readFile(mainPath, 'utf8'), 'body { color: red; }');
    assert.equal(await fs.pathExists(path.join(root, 'js/sketches/motion_1')), false);
    assert.equal(await fs.pathExists(path.join(root, 'scss/sketches/_motion_1.scss')), false);
});


test('Sass insertion preserves CRLF, precedes rules, and is idempotent', async () => {
    const { insertSketchStyle } = await import('../app/sketch-styles.js');
    const source = '// code-in: sketch-styles\r\n// code-out: sketch-styles\r\n@use "menu";\r\nbody { color: red; }';
    const next = insertSketchStyle(source, 'menu');
    assert.ok(next.includes('@use "sketches/menu" as sketch_menu;\r\n// code-out'));
    assert.ok(next.endsWith('@use "menu";\r\nbody { color: red; }'));
    assert.equal(insertSketchStyle(next, 'menu'), next);
    assert.throws(() => insertSketchStyle('body {}\n' + source, 'motion'), /beginning/);
    assert.throws(() => insertSketchStyle(source + '\n// code-out: sketch-styles', 'motion'), /single/);
});
