
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

        if (this._isInitialized()) {
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

    }

    _prompt() {
        return inquirer.prompt(this._getPromptConfig());
    }

    /**
     * Check if project folder already exists
     * @returns {boolean}
     * @private
     */
    _isInitialized() {

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
        }];

    }

    /***
     * Copies Sketch-Kit template application to /Sketch-Kit folder
     *
     * @private
     */
    async _copyApp() {
        var sketchKitPath = path.resolve(__dirname, '../');
        sketchKitPath = path.join(sketchKitPath + '/lib/' + FOLDER_NAME);
        await fs.copy(sketchKitPath, './' + FOLDER_NAME);
    }

    async _copyConfig({sketch}) {

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
        config.version = this._config.version;

        await fs.writeFile(path, JSON.stringify(config, null, 4));

    }

};
