import fs from 'fs-extra';
import Update from './update.js';
import {utils} from './utils.js';
import packageJson from '../package.json' assert {type: "json"};

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

        if (this._IsInitialized()) {
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

        try {
            await this.update()
            if (this._IsInitialized()) {
                var Create = await import('./create.js');
                var create = new Create.default(this.config, args);
                return create.start();
            } else {
                throw new Error('Sketch-Kit not initialized!\nPlease run \'test init\' first.');
            }
        } catch (e) {
            console.log(e);
        }
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
    update() {

        return new Promise((resolve, reject) => {

            if (this._IsInitialized()) {
                this._getConfig().then(config => {
                    var update = new Update(config);
                    update.start().then(() => {
                        resolve();
                    });
                });
            } else {
                console.log('Sketch-Kit not initialized!\n');
                console.log('Please run \'test init\' first.');
                reject();
            }
        });
    }

    /**
     * Runs gulp taks for project (sass, webpack, serve)
     */
    async run(args, context) {
        await this.update()
        var Run = await import('./run.js');
        var run = new Run.default(this.config, args);
        return run.start();
    }

    async build(args) {
        await this.update();
        var Build = await import('./build.js');
        var build = new Build.default(this.config, args);
        return build.start();
    }

    async preview(args) {

        var Preview = await import('./preview.js');
        var preview = new Preview.default(this.config, args);
        return preview.start();
    }

    //-----------------------------------------------------

    /***
     * Check if sketches folder has been created.
     *
     * @returns {boolean}
     * @private
     */
    _IsInitialized() {

        if (fs.existsSync('./sketch-kit')) {
            return true;
        }

        return false;
    }

    _getConfig() {
        return new Promise((resolve, reject) => {
            if (this._IsInitialized()) {

                fs.readFile('./sketch-kit/' + this.config.configFile, 'utf-8', (err, data) => {

                    if (err) {
                        console.log(err, configFile);
                        resolve(this.config)
                    } else {
                        //merge global and local configs
                        this.config = {
                            ...this.config,
                            ...JSON.parse(data)
                        };
                        resolve(this.config);
                    }
                });
            } else
                reject();
        });
    }
}
