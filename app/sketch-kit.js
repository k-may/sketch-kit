var fs = require('fs-extra');
var U = require('./update');
const utils = require('./utils.js');
const {version} = require('../package.json');

class SketchKit {

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
            'version': 'v' + version
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
                var Create = require('./create');
                var create = new Create(this.config, args);
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
    init() {
        var Init = require('./init');
        var init = new Init(this.config);
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
                    var update = new U(config);
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
    run(args, context) {
        this.update().then(() => {
            var Run = require('./run');
            var run = new Run(this.config, args);
            return run.start();
        }).catch((e) => {
            console.log('Run error : ' + e);
        });
    }

    build(args) {
        this.update().then(() => {
            var Build = require('./build');
            var build = new Build(this.config, args);
            return build.start();
        }).catch(e => {
            console.log('Build error : ' + e);
        })
    }

    preview(args) {

        var Preview = require('./preview.js');
        var preview = new Preview(this.config,args);
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

module.exports = SketchKit;
