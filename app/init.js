var fs = require('fs-extra');
var path = require('path');
var inquirer = require('inquirer');
var replace = require("replace");

module.exports = class Main {

    constructor(config) {

        this.config = config;

        //TODO: prompt for project title
        //TODO: add project title to page title

        if (this._IsInitialized()) {
            console.log('Sketches already initialized');
        } else {
            this._prompt();
        }
    }

    //----------------------------------------------------

    _prompt() {

        inquirer.prompt(this._getPromptConfig()).then(result => {

            var name = result.sketch;
            this._copyApp().then(() => {

                var sketchConfigPath = './sketches/data/config.json';
                fs.readFile(sketchConfigPath, 'utf8', (err, config) => {

                    //replace all projectnames throughout template
                    replace({
                        regex: "sketch-kit",
                        replacement: name,
                        paths: ["./"],
                        recursive: true,
                        silent: true,
                    });

                    config = JSON.parse(config);
                    config.project = name;
                    fs.writeFile(sketchConfigPath, JSON.stringify(config, null, 4));

                });
            });
        }).catch(e => {
            console.log(e);
        });
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