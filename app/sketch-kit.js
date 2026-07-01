import fs from 'fs-extra';
import {utils} from './utils.js';
import packageJson from '../package.json' with {type: "json"};

export default class SketchKit {

    //TODO add clean task

    constructor(options) {

        this.config = {
            'debug': options.debug !== undefined ? options.debug : false,
            'root': 'sketch-kit',
            'sass': {
                'src': 'scss/',
                'dest': 'css/',
                'entry': 'main.scss'
            },
            'configFile': options.configFile || utils.defaultConfigFile,
            'include_modules': true,
            'version': 'v' + packageJson.version
        };

        if (this._isInitialized()) {
            var configFile = options.configFile || utils.defaultConfigFile;
            configFile = utils.getConfigFilePath(configFile);
            this.config.configFile = configFile;
        } else {
            this.config.configFile = utils.defaultConfigFile;
        }
    }

    //----------------------------------------------------

    /**
     * Prompts for info and appends new sketch to sketches
     */
    async create(args) {
        await this.update()

        var Create = await import('./create.js');
        var create = new Create.default(this.config, args);
        return create.start();
    }

    /**
     * Initiates Sketch-Kit with application folder and build tasks
     */
    async init() {
        var Init = await import('./init.js');
        var init = new Init.default(this.config);
        return init.run();
    }

    /**
     * Copies ness deps
     *
     * @returns {Promise}
     */
    async update() {
        if (!fs.existsSync('./sketch-kit')) {
            throw new Error("Sketch-Kit not initialized. Please run 'sketch-kit init' first.");
        }

        try {
            const data = await fs.readFile('./sketch-kit/' + this.config.configFile, 'utf-8');
            this.config = {...this.config, ...JSON.parse(data)};
        } catch (err) {
            // First time — no config file found, use default config
            console.log(err, this.config.configFile);
        }

    }

    /**
     * Runs gulp taks for project (sass, webpack, serve)
     */
    async run(args) {

        await this.update()

        const Run = await import('./run.js');
        const run = new Run.default(this.config, args);
        return run.start();
    }

    async build(args) {
        await this.update();
        const Build = await import('./build.js');
        const build = new Build.default(this.config, args);
        return build.start();
    }

    async preview(args) {

        const Preview = await import('./preview.js');
        const preview = new Preview.default(this.config, args);
        return preview.start();
    }

    //-----------------------------------------------------

    /***
     * Check if sketches folder has been created.
     *
     * @returns {boolean}
     * @private
     */
    _isInitialized() {

        if (fs.existsSync('./sketch-kit')) {
            return true;
        }

        return false;
    }

}
