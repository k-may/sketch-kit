import { mkdir, mkdtemp, readFile, writeFile, realpath, symlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { purgeSmokeProjects } from './purge-smoke.mjs';

const repository = fileURLToPath(new URL('../', import.meta.url));
const smokeRoot = path.join(repository, '.tmp/smoke');
const currentFile = path.join(smokeRoot, 'current.json');
const [action = 'run', ...args] = process.argv.slice(2);
const allowed = new Set(['setup', 'run', 'create', 'build', 'path', 'purge']);

function cli(project, command, commandArgs = []) {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [path.join(project, 'node_modules/sketch-kit/index.js'), command, ...commandArgs], {
            cwd: project,
            stdio: 'inherit',
            env: { ...process.env, TEST: 'false' },
        });
        child.once('error', reject);
        child.once('exit', (code, signal) => {
            if (code === 0 || signal === 'SIGINT') resolve();
            else reject(new Error(`sketch-kit ${command} exited with ${signal ?? code}`));
        });
    });
}

async function setup() {
    await mkdir(smokeRoot, { recursive: true });
    const project = await mkdtemp(path.join(smokeRoot, 'project-'));
    console.log(`Creating smoke host: ${project}`);
    const relativeRepository = path.relative(project, repository).replaceAll('\\', '/');
    await writeFile(path.join(project, 'package.json'), JSON.stringify({
        name: 'sketch-kit-smoke-host',
        private: true,
        type: 'module',
        scripts: {
            dev: 'node node_modules/sketch-kit/index.js run',
            'sketch-kit': 'node node_modules/sketch-kit/index.js',
            build: 'node node_modules/sketch-kit/index.js build',
        },
        devDependencies: { 'sketch-kit': `file:${relativeRepository}` },
    }, null, 2) + '\n');
    await mkdir(path.join(project, 'node_modules'));
    // A local development link: no global install or dependency downloads.
    await symlink(repository, path.join(project, 'node_modules/sketch-kit'), process.platform === 'win32' ? 'junction' : 'dir');
    await mkdir(path.join(project, 'src'));
    await writeFile(path.join(project, 'src/message.js'), 'export const message = "Hello from the host JavaScript project";\n');

    // Exercise the real initializer without its interactive project-name prompt.
    const previousDirectory = process.cwd();
    try {
        process.chdir(project);
        const { default: SketchKit } = await import('../app/sketch-kit.js');
        await new SketchKit({ debug: true }).init();
    } finally {
        process.chdir(previousDirectory);
    }
    const configPath = path.join(project, 'sketch-kit/sketch-kit.config.json');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    config.project = 'Sketch Kit smoke host';
    await writeFile(configPath, JSON.stringify(config, null, 2) + '\n');
    await cli(project, 'create', ['smoke']);
    await writeFile(path.join(project, 'sketch-kit/js/sketches/smoke/smoke.js'), `import { BaseSketch } from '../../base/BaseSketch.js';
import { message } from '../../../../src/message.js';

export default class smoke extends BaseSketch {
    async init() {
        this.textContent = message;
    }
}
`);
    await cli(project, 'create', ['smoke', 'smoke_1']);
    await writeFile(path.join(project, 'README.md'), `# Local smoke host

This disposable JavaScript project links to the live Sketch Kit checkout.
Choose smoke or smoke.1 from the sketch menu to see a module imported from src/.

- npm run dev
- npm run sketch-kit -- create smoke spring
- npm run build

Edit sketches here freely. Starting the smoke server again reuses this project.
From the repository, npm run smoke:setup creates another project and selects it.
`);
    // Select only fully initialized projects; a failed setup leaves the previous one selected.
    await writeFile(currentFile, JSON.stringify({ directory: path.basename(project) }, null, 2) + '\n');
    return project;
}

async function currentProject() {
    let current;
    try {
        current = JSON.parse(await readFile(currentFile, 'utf8'));
    } catch (error) {
        if (error.code === 'ENOENT') return setup();
        throw error;
    }
    if (!/^project-[a-zA-Z0-9]+$/.test(current.directory)) throw new Error('Invalid smoke project pointer. Run npm run smoke:setup.');
    const project = await realpath(path.join(smokeRoot, current.directory));
    const parent = await realpath(smokeRoot);
    if (path.dirname(project) !== parent) throw new Error('Smoke project must stay inside .tmp/smoke/.');
    return project;
}

async function main() {
    if (!allowed.has(action)) throw new Error('Usage: npm run smoke -- [run|create <name> [copy-name]|build|path|setup|purge]');
    if (action === 'purge') {
        const count = await purgeSmokeProjects(repository);
        console.log(`Removed ${count} smoke project(s) and cleared the current selection.`);
        return;
    }
    const project = action === 'setup' ? await setup() : await currentProject();
    console.log(`\nSmoke host: ${project}`);
    if (action === 'setup') {
        console.log('Ready. Run npm run smoke to start the dev server.');
        console.log('Try npm run smoke -- create smoke spring, or npm run smoke -- build.');
    } else if (action !== 'path') {
        await cli(project, action, args);
    }
}

main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});
