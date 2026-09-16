import inquirer from 'inquirer';
import { insertSketchStyle } from './sketch-styles.js';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { utils } from './utils.js';
import { prepareRegistry, validateSketchId, planSketch, registerSketch, serializeRegistry } from '../lib/sketch-kit/js/utils/SketchRegistry.js';

const templates = fileURLToPath(new URL('../lib/templates/', import.meta.url));

export default class Create {
    constructor(config, args = []) {
        this._config = config;
        this._args = args;
        this.root = path.resolve(config.root ?? 'sketch-kit');
    }

    async start() {
        utils.log('Create');
        await this._getConfig();
        if (this._args.length) return this._tryCreateSketch(this._args[0], os.userInfo().username);
        return this._prompt();
    }

    async _prompt() {
        const result = await inquirer.prompt([
            { type: 'input', name: 'sketch', message: 'Sketch name' },
            { type: 'input', name: 'author', message: 'Author', default: os.userInfo().username },
        ]);
        return this._tryCreateSketch(result.sketch, result.author);
    }

    async _tryCreateSketch(input, author) {
        // Keep existing IDs intact; normalize hyphens only for new IDs.
        const name = Object.hasOwn(this.sketchConfig.sketches, input) ? input : input.replaceAll('-', '');
        validateSketchId(name);
        if (!Object.hasOwn(this.sketchConfig.sketches, name)) {
            if (this._args.length > 1) throw new Error(`Cannot copy missing sketch: ${name}`);
            return this._createSketch(name, author);
        }
        if (this._args.length > 1 || process.env.TEST === 'true') return this._copySketch(name, author);
        const { action } = await inquirer.prompt({
            type: 'list', name: 'action', message: 'Sketch exists. Copy or replace it?',
            choices: ['copy', 'replace', 'neither'],
        });
        if (action === 'copy') {
            const id = await this._promptCopyName(name);
            return this._copySketch(name, author, id);
        }
        if (action === 'replace') return this._writeSketch({ id: name, author, replace: true });
    }

    _createSketch(name, author) {
        return this._writeSketch({ id: validateSketchId(name), author });
    }

    _copySketch(sourceId, author, requestedId = this._args[1]) {
        const id = requestedId === undefined ? undefined : validateSketchId(requestedId);
        return this._writeSketch({ sourceId: validateSketchId(sourceId), id, author });
    }

    async _promptCopyName(sourceId) {
        const config = await this._getConfig();
        const suggested = await this._planAvailableSketch(config, sourceId);
        const { id } = await inquirer.prompt({
            type: 'input',
            name: 'id',
            message: 'New sketch name',
            default: suggested.id,
            filter: value => value.trim(),
            validate: async value => {
                try {
                    const current = await this._getConfig();
                    await this._planAvailableSketch(current, sourceId, value.trim());
                    return true;
                } catch (error) {
                    return error.message;
                }
            },
        });
        return id;
    }

    async _planAvailableSketch(config, sourceId, id) {
        let planned = planSketch(config, sourceId, id);
        while (await this._destinationExists(planned.id)) {
            if (id !== undefined) throw new Error(`Destination already exists: ${planned.id}`);
            const order = planned.order + 1;
            planned = { ...planned, id: `${sourceId}_${order}`, order };
            while (Object.keys(config.sketches).some(key => key.toLowerCase() === planned.id.toLowerCase())) {
                planned.order++;
                planned.id = `${sourceId}_${planned.order}`;
            }
        }
        return planned;
    }

    async _getConfig() {
        let configPath = path.resolve(this.root, this._config.configFile ?? 'sketch-kit.config.json');
        let input;
        try {
            input = await fs.readJSON(configPath);
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
            configPath = path.join(this.root, 'data/config.json');
            input = await fs.readJSON(configPath);
        }
        const { config, issues } = prepareRegistry(input);
        if (issues.length) throw new Error(`Review legacy branching before writing:\n${issues.join('\n')}`);
        this.configPath = configPath;
        this.sketchConfig = config;
        return config;
    }

    _paths(id) {
        validateSketchId(id);
        return {
            directory: path.join(this.root, 'js/sketches', id),
            sass: path.join(this.root, 'scss/sketches', `_${id}.scss`),
        };
    }

    async _destinationExists(id) {
        const destination = this._paths(id);
        // Case-insensitive comparison also prevents cross-platform collisions.
        const directories = await fs.readdir(path.join(this.root, 'js/sketches'));
        const styles = await fs.readdir(path.join(this.root, 'scss/sketches'));
        return directories.some(name => name.toLowerCase() === path.basename(destination.directory).toLowerCase()) ||
            styles.some(name => name.toLowerCase() === path.basename(destination.sass).toLowerCase());
    }

    async _writeSketch({ sourceId = null, id, author, replace = false }) {
        const lockPath = path.join(this.root, '.sketch-kit-create.lock');
        let lock;
        try {
            lock = await fs.open(lockPath, 'wx');
        } catch (error) {
            if (error.code === 'EEXIST') throw new Error('Another create operation is active. If it crashed, remove .sketch-kit-create.lock before retrying.');
            throw error;
        }
        let stage;
        try {
            const config = await this._getConfig();
            let planned;
            if (replace) {
                if (!Object.hasOwn(config.sketches, id)) throw new Error(`Unknown sketch: ${id}`);
                planned = { id, ...config.sketches[id] };
            } else {
                planned = await this._planAvailableSketch(config, sourceId, id);
            }
            const destination = this._paths(planned.id);
            stage = await fs.mkdtemp(path.join(this.root, '.sketch-kit-stage-'));
            const stagedDirectory = path.join(stage, 'sketch');
            await fs.ensureDir(stagedDirectory);
            let script;
            let sass;
            if (sourceId !== null) {
                const source = this._paths(sourceId);
                script = await fs.readFile(path.join(source.directory, `${sourceId}.js`), 'utf8');
                sass = await fs.readFile(source.sass, 'utf8');
                for (const file of await fs.readdir(source.directory)) {
                    if (file !== `${sourceId}.js`) await fs.copy(path.join(source.directory, file), path.join(stagedDirectory, file));
                }
            } else {
                script = await fs.readFile(path.join(templates, 'script.txt'), 'utf8');
                sass = await fs.readFile(path.join(templates, 'sass.txt'), 'utf8');
            }
            const token = sourceId ?? '{sketchname}';
            await fs.writeFile(path.join(stagedDirectory, `${planned.id}.js`), script.split(token).join(planned.id));
            const stagedSass = path.join(stage, 'sketch.scss');
            await fs.writeFile(stagedSass, sass.split(token).join(planned.id));

            const mainPath = path.join(this.root, 'scss/main.scss');
            const oldMain = await fs.readFile(mainPath);
            const oldConfig = await fs.readFile(this.configPath);
            const nextConfig = replace ? config : registerSketch(config, planned, author);
            const nextMain = insertSketchStyle(oldMain.toString('utf8'), planned.id);
            const backupDirectory = path.join(stage, 'previous-sketch');
            const backupSass = path.join(stage, 'previous.scss');
            let installedDirectory = false, installedSass = false, savedDirectory = false, savedSass = false;
            try {
                if (replace) {
                    if (await fs.pathExists(destination.directory)) {
                        await fs.move(destination.directory, backupDirectory);
                        savedDirectory = true;
                    }
                    if (await fs.pathExists(destination.sass)) {
                        await fs.move(destination.sass, backupSass);
                        savedSass = true;
                    }
                }
                await fs.move(stagedDirectory, destination.directory, { overwrite: false });
                installedDirectory = true;
                await fs.move(stagedSass, destination.sass, { overwrite: false });
                installedSass = true;
                await fs.writeFile(mainPath, nextMain);
                const configTemp = path.join(stage, 'config.json');
                await fs.writeJSON(configTemp, serializeRegistry(nextConfig), { spaces: 4 });
                await fs.rename(configTemp, this.configPath);
            } catch (error) {
                // All paths are derived from validated IDs beneath this workspace.
                try {
                    if (installedDirectory) await fs.remove(destination.directory);
                    if (installedSass) await fs.remove(destination.sass);
                    if (savedDirectory) await fs.move(backupDirectory, destination.directory);
                    if (savedSass) await fs.move(backupSass, destination.sass);
                    await fs.writeFile(mainPath, oldMain);
                    await fs.writeFile(this.configPath, oldConfig);
                } catch (rollbackError) {
                    const recovery = stage;
                    stage = null; // Preserve backups when recovery requires manual intervention.
                    throw new AggregateError([error, rollbackError], `Copy failed; recovery files retained at ${recovery}`);
                }
                throw error;
            }
            this.sketchConfig = nextConfig;
            return planned.id;
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
