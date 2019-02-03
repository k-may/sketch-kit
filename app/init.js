var fs = require('fs-extra');
var path = require('path');
var inquirer = require('inquirer');
var replace = require("replace");

module.exports = class Main {

    constructor(config) {

        this.config = config;
    }

    run() {
        if (this._IsInitialized()) {
            throw new Error('Sketches already initialized');
        } else {
            return this._initialize();
        }
    }

    //----------------------------------------------------

    _initialize() {
        if (this.config.debug) {
            return this._createApp({
                "sketch": "test"
            });
        }

        return this._prompt().then(result => {
            return this._createApp(result);
        });

    }

    _createApp(result) {

        var name = result.sketch;
        return this._copyApp().then(() => {

            var sketchConfigPath = './sketches/data/config.json';
            fs.readFile(sketchConfigPath, 'utf8', (err, config) => {

                //replace all sketch names throughout template
                replace({
                    regex: "test",
                    replacement: name,
                    paths: ["./"],
                    recursive: true,
                    silent: true,
                });

                config = JSON.parse(config);
                config.project = name;

                return fs.writeFile(sketchConfigPath, JSON.stringify(config, null, 4));

            });
        });
    }

    _prompt() {
        return inquirer.prompt(this._getPromptConfig());
    }

    _IsInitialized() {

        if (fs.existsSync('./sketches')) {
            return true;
        }

        return false;
    }

    _getPromptConfig() {

        return [{
            'type': 'input',
            'message': 'Project name',
            'name': 'sketch',
            'default': path.dirname(process.cwd()).split('/').pop()
        }];

    }

    /***
     * Updates ingore file with sketches vendor path.
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
     * Copies sketches template application to /sketches folder
     *
     * @private
     */
    _copyApp() {

        return new Promise(resolve => {
            var sketchesPath = path.resolve(__dirname, '../');
            sketchesPath = path.join(sketchesPath + '/lib/sketches');
            fs.copy(sketchesPath, './sketches', () => {
                resolve();
            });

        });

    }

};