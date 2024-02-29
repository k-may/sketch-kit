
import fs from 'fs-extra';
import path from 'path';
import inquirer from 'inquirer';
import replace from 'replace';
import {utils} from './utils.js';

import * as url from 'url';
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const FOLDER_NAME = 'sketch-kit';

export default class Main {

    constructor(config) {
        this._config = config;
    }

    run() {

        utils.log("Init");

        if (this._IsInitialized()) {
            throw new Error('Sketch-Kit already initialized');
        } else {
            return this._initialize();
        }
    }

    //----------------------------------------------------

    async _initialize() {
        if (this._config.debug) {
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
        await this._updateIgnore();

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
            'message': '\x1b[33mProject name',
            'name': 'sketch',
            'default': defaultName
        }, {
            'type': 'input',
            'message': '\x1b[33mWould you like to include node dependencies?',
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
            var vendorPath = path.join(this._config.root, 'js/vendor');
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

        const {config, path} = await utils.loadConfig(this._config.configFile);//.then(({config, path}) => {
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
        config.version = this._config.version;

        await fs.writeFile(path, JSON.stringify(config, null, 4));

    }

    /**
     * Make sure copied node modules aren't included in the repo..
     *
     * @return {Promise<unknown>}
     * @private
     */
    async _updateIgnore() {

        const ignorePath = path.join(process.cwd(), '.gitignore');
        return new Promise(resolve => {
            fs.appendFile(ignorePath, '/sketch-kit/js/node_modules/', function (err) {
                if (err)
                    console.log(err.message);

                resolve();
            });
        })
    }

};
