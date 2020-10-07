var fs = require('fs-extra');
var path = require('path');
var inquirer = require('inquirer');
var replace = require('replace');
var utils = require('./utils.js');

const FOLDER_NAME = 'sketch-kit';

module.exports = class Main {

    constructor(config) {
        this.config = config;
    }

    run() {
        if (this._IsInitialized()) {
            throw new Error('Sketch-Kit already initialized');
        } else {
            return this._initialize();
        }
    }

    //----------------------------------------------------

    async _initialize() {
        if (this.config.debug) {
            return this._createApp({
                'sketch': 'test'
            });
        }

        var result = await this._prompt()
        return this._createApp(result);

    }

    /**
     *
     * @param result : inquirer.ui.Prompt
     * @returns {Promise<null>}
     * @private
     */
    async _createApp(result) {

        await this._copyApp();
        await this._copyConfig(result);

    }

    _prompt() {
        return inquirer.prompt(this._getPromptConfig());
    }

    /**
     * Check if project folder already exists
     * @returns {boolean}
     * @private
     */
    _IsInitialized() {

        if (fs.existsSync('./' + FOLDER_NAME)) {
            return true;
        }

        return false;
    }

    _getPromptConfig() {
        var defaultName = path.basename(path.dirname(process.cwd()));
        return [{
            'type': 'input',
            'message': 'Project name',
            'name': 'sketch',
            'default': defaultName
        }, {
            'type': 'input',
            'message': 'Copy Node Dependencies',
            'name': 'copyDependencies',
            'choices': ['yes', 'no'],
            'default': 'yes',
            validate: answer => {
                return answer === 'yes' || answer === 'no'
            }
        }];

    }

    /***
     * Updates ingore file with Sketch-Kit vendor path.
     * @private
     */
    _updateGitignore() {
        if (fs.existsSync('.gitignore')) {
            var vendorPath = path.join(this.config.root, 'js/vendor');
            var gIgnore = fs.readFileSync('./.gitignore', 'utf8');
            if (gIgnore.indexOf(vendorPath) == -1) {
                gIgnore += '\n' + vendorPath;
                fs.writeFile('./.gitignore', gIgnore);
            }
        }
    }

    /***
     * Copies Sketch-Kit template application to /Sketch-Kit folder
     *
     * @private
     */
    _copyApp() {

        return new Promise(resolve => {
            var sketchKitPath = path.resolve(__dirname, '../');
            sketchKitPath = path.join(sketchKitPath + '/lib/' + FOLDER_NAME);
            fs.copy(sketchKitPath, './' + FOLDER_NAME, () => {
                resolve();
            });

        });

    }

    async _copyConfig({sketch, copyDependencies}) {

        const {config, path} = await utils.loadConfig();//.then(({config, path}) => {
        //replace all sketch names throughout template
        replace({
            regex: '{project-name}',
            replacement: sketch,
            paths: ['./sketch-kit/'],
            recursive: true,
            silent: true,
        });

        config.project = sketch;
        config.copyDependencies = copyDependencies === 'yes';

        await fs.writeFile(path, JSON.stringify(config, null, 4));

    }

};