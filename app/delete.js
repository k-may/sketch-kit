import fs from 'fs-extra';
import path from 'node:path';
import inquirer from 'inquirer';
import Create from './create.js';
import { validateSketchId, serializeRegistry } from './lib/SketchRegistry.js';
import { utils } from './utils.js';

export default class Delete {
    constructor(config, args = [], options = {}) {
        this.config = config;
        this.args = args;
        this.options = options;
    }

    async start() {
        if (this.args.length !== 1) throw new Error('Usage: sketch-kit delete <name> [--yes]');
        const id = validateSketchId(this.args[0]);
        // Share config resolution and registry validation with create.
        const workspace = new Create(this.config);
        const check = async () => {
            const config = await workspace._getConfig();
            if (!Object.hasOwn(config.sketches, id)) throw new Error(`Unknown sketch: ${id}`);
            const children = Object.keys(config.sketches).filter(key => config.sketches[key].parentId === id);
            if (children.length) throw new Error(`Delete child sketches first: ${children.join(', ')}`);
            await workspace._assertModernStyles(id);
            return config;
        };
        await check();
        if (!this.options.yes) {
            if (!process.stdin.isTTY) throw new Error('Deletion requires confirmation. Use --yes to confirm.');
            const { confirmed } = await inquirer.prompt({
                type: 'confirm', name: 'confirmed', default: false,
                message: `Permanently delete sketch "${id}" and all files in its directory?`,
            });
            if (!confirmed) return false;
        }
        const lockPath = path.join(workspace.root, '.sketch-kit-create.lock');
        let lock;
        try {
            lock = await fs.open(lockPath, 'wx');
        } catch (error) {
            if (error.code === 'EEXIST') throw new Error('Another create or delete operation is active.');
            throw error;
        }
        let stage;
        try {
            const config = await check();
            const directory = workspace._paths(id).directory;
            const oldConfig = await fs.readFile(workspace.configPath);
            stage = await fs.mkdtemp(path.join(workspace.root, '.sketch-kit-delete-'));
            const backup = path.join(stage, 'sketch');
            let moved = false;
            try {
                if (await fs.pathExists(directory)) {
                    await fs.move(directory, backup);
                    moved = true;
                }
                delete config.sketches[id];
                const temporary = path.join(stage, 'config.json');
                await fs.writeJSON(temporary, serializeRegistry(config), { spaces: 4 });
                await fs.rename(temporary, workspace.configPath);
            } catch (error) {
                try {
                    if (moved) await fs.move(backup, directory);
                    await fs.writeFile(workspace.configPath, oldConfig);
                } catch (rollbackError) {
                    const recovery = stage;
                    stage = null;
                    throw new AggregateError([error, rollbackError], `Delete failed; recovery files retained at ${recovery}`);
                }
                throw error;
            }
            utils.message(`Deleted sketch ${id}`);
            return id;
        } finally {
            try {
                if (stage) await fs.remove(stage);
            } finally {
                await fs.close(lock);
                await fs.remove(lockPath);
            }
        }
    }
}
