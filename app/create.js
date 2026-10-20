import inquirer from 'inquirer';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { utils } from './utils.js';
import { prepareRegistry, validateSketchId, planSketch, registerSketch, serializeRegistry } from './lib/SketchRegistry.js';

const templates = fileURLToPath(new URL('../templates/sketch/', import.meta.url));
const scriptTemplates = new Map([['none', 'script.txt'], ['threejs', 'script_threejs.txt']]);

export default class Create {
    constructor(config, args = [], options = {}) {
        this._config = config;
        this.options = options;
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
            return this._createSketch(name, author, await this._promptTemplate());
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
        if (action === 'replace') return this._writeSketch({ id: name, author, replace: true, template: await this._promptTemplate() });
    }

    async _promptTemplate() {
        // Scripted creation remains noninteractive and uses the empty starter.
        if (process.env.TEST === 'true' || this._config.debug || !process.stdin.isTTY) return 'none';
        const { template } = await inquirer.prompt({
            type: 'list', name: 'template', message: 'Template (optional)', default: 'none',
            choices: [
                { name: 'None', value: 'none' },
                { name: 'Three.js ? cube, ground and orbiting camera', value: 'threejs' },
            ],
        });
        if (template === 'threejs') utils.message('Three.js requires the host dependency: npm install three');
        return template;
    }

    _createSketch(name, author, template = 'none') {
        return this._writeSketch({ id: validateSketchId(name), author, template });
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
            sass: path.join(this.root, 'js/sketches', id, `${id}.scss`),
        };
    }

    async _destinationExists(id) {
        const destination = this._paths(id);
        // Case-insensitive comparison also prevents cross-platform collisions.
        const directories = await fs.readdir(path.join(this.root, 'js/sketches'));
        let legacyStyles = [];
        try {
            legacyStyles = await fs.readdir(path.join(this.root, 'scss/sketches'));
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }
        return directories.some(name => name.toLowerCase() === path.basename(destination.directory).toLowerCase()) ||
            legacyStyles.some(name => name.toLowerCase() === `_${id}.scss`.toLowerCase());
    }

    async _assertModernStyles(id) {
        const legacy = path.join(this.root, 'scss/sketches', `_${id}.scss`);
        if (await fs.pathExists(legacy)) {
            throw new Error(`Sketch ${id} uses legacy styles. Move scss/sketches/_${id}.scss to js/sketches/${id}/${id}.scss, import "./${id}.scss" from ${id}.js, and remove its import from scss/main.scss. See docs/sass.md before copying or replacing.`);
        }
    }

    async _writeSketch({ sourceId = null, id, author, replace = false, template = 'none' }) {
        if (!scriptTemplates.has(template)) throw new Error(`Unknown sketch template: ${template}`);
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
            if (sourceId !== null || replace) await this._assertModernStyles(sourceId ?? planned.id);
            const destination = this._paths(planned.id);
            const action = replace ? 'Replace' : sourceId !== null ? 'Copy' : 'Create';
            utils.message([
                action + ' sketch: ' + planned.id,
                'Author: ' + (replace ? planned.author ?? 'unspecified (unchanged)' : author),
                sourceId !== null ? 'Source: ' + sourceId : 'Template: ' + (template === 'threejs' ? 'Three.js' : 'None'),
                'Directory: ' + destination.directory,
                'Registry: ' + this.configPath,
                ...(replace ? ['All existing files in the sketch directory will be replaced. Branch metadata is preserved.'] : []),
            ].join('\n'));
            if (!this.options.yes && process.env.TEST !== 'true' && !this._config.debug && process.stdin.isTTY) {
                const { confirmed } = await inquirer.prompt({
                    type: 'confirm', name: 'confirmed', default: false,
                    message: action + ' this sketch?',
                });
                if (!confirmed) return false;
            }
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
                    if (file !== `${sourceId}.js` && file !== `${sourceId}.scss`) await fs.copy(path.join(source.directory, file), path.join(stagedDirectory, file));
                }
            } else {
                script = await fs.readFile(path.join(templates, scriptTemplates.get(template)), 'utf8');
                sass = await fs.readFile(path.join(templates, 'sass.txt'), 'utf8');
            }
            const token = sourceId ?? '{sketchname}';
            await fs.writeFile(path.join(stagedDirectory, `${planned.id}.js`), script.split(token).join(planned.id));
            const stagedSass = path.join(stagedDirectory, `${planned.id}.scss`);
            await fs.writeFile(stagedSass, sass.split(token).join(planned.id));

            const oldConfig = await fs.readFile(this.configPath);
            const nextConfig = replace ? config : registerSketch(config, planned, author);
            const backupDirectory = path.join(stage, 'previous-sketch');
            let installedDirectory = false, savedDirectory = false;
            try {
                if (replace) {
                    if (await fs.pathExists(destination.directory)) {
                        await fs.move(destination.directory, backupDirectory);
                        savedDirectory = true;
                    }
                }
                await fs.move(stagedDirectory, destination.directory, { overwrite: false });
                installedDirectory = true;
                const configTemp = path.join(stage, 'config.json');
                await fs.writeJSON(configTemp, serializeRegistry(nextConfig), { spaces: 4 });
                await fs.rename(configTemp, this.configPath);
            } catch (error) {
                // All paths are derived from validated IDs beneath this workspace.
                try {
                    if (installedDirectory) await fs.remove(destination.directory);
                    if (savedDirectory) await fs.move(backupDirectory, destination.directory);
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
