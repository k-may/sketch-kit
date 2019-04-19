var inquirer = require('inquirer');
var fs = require('fs-extra');
var os = require('os');
var path = require('path');
var replace = require('replace');

class Create {

    constructor(config, args) {

        this.config = config;
        this.args = args;

        var sketchConfigPath = this.config.root + '/data/config.json';
        this.sketchConfig = fs.readJSONSync(sketchConfigPath);
        this.sketchName = args.length ? args[0] : '';


    }

    start() {
        if (this.sketchName)
            return this._createSketch(this.sketchName, os.userInfo().username);
        else
            return this._prompt();
    }

    //----------------------------------------------------

    /***
     * Prompts user for sketch name and author and then creates sketch.
     * Will also check if sketch already exists.
     *
     * @private
     */
    _prompt() {

        return inquirer.prompt(this._getPromptConfig()).then(result => {

            var name = this.sketchName;
            var author = result.author;

            if (this.sketchConfig.sketches.hasOwnProperty(name)) {
                inquirer.prompt({
                    'type': 'confirm',
                    'message': 'Sketch already exists, would like to replace it',
                    'name': 'replace'
                }).then(result => {
                    if (result.replace) {
                        this._createSketch(name, author);
                    } else {
                        this._prompt();
                    }

                });
            } else if (name === '') {
                console.log('Name not valid');
                return this._prompt();
            } else {
                return this._createSketch(name, author);
            }

        }).catch(e => {
            console.log(e);
        });
    }

    /***
     * Copies sketch template to Sketch-Kit project and updates
     * Sketch-Kit configuration.
     *
     * @param name
     * @param author
     * @private
     */
    _createSketch(name, author) {

        //cleanup names
        name = name.replace('-', '');

        var sketchKitPath = './sketch-kit/js/views/sketches/' + name;
        var sassPath = './sketch-kit/scss/sketches';

        return new Promise((resolve, reject) => {
            return this._createScript(name)
                .then(this._createSass(name))
                .then(async () => {

                    //replace all sketchnames throughout templates
                    replace({
                        regex: '{sketchname}',
                        replacement: name,
                        paths: [sketchKitPath, sassPath],
                        recursive: true,
                        silent: true,
                    });

                    //add new sketch config to sketch-kit/data/config.json
                    this.sketchConfig.sketches[name] = {
                        'date': new Date(),
                        'author': author
                    };

                    var sketchConfigPath = this.config.root + '/data/config.json';
                    await fs.writeFileSync(sketchConfigPath, JSON.stringify(this.sketchConfig, null, 4));

                    resolve();
                });
        });
    }

    _createScript(name) {
        return new Promise((resolve, reject) => {
            var templatePath = path.resolve(__dirname, '../');
            templatePath = path.join(templatePath, '/lib/templates/script.txt');
            var sketchKitPath = './sketch-kit/js/views/sketches/' + name + '/' + name + '.js';
            //copy and rename
            fs.copy(templatePath, sketchKitPath).then(() => {
                resolve();
            });
        });
    }

    _createSass(name) {
        return new Promise((resolve, reject) => {
            var templatePath = path.resolve(__dirname, '../');
            templatePath = path.join(templatePath, '/lib/templates/sass.txt');
            var sassPath = './sketch-kit/scss/sketches/_' + name + '.scss';
            //copy and rename
            fs.copy(templatePath, sassPath).then(() => {
                resolve();
            });
        });
    }

    _getSassTemplate(name) {
        return new Promise(resolve => {
            var templatePath = path.resolve(__dirname, '../');
            templatePath = path.join(templatePath, '/lib/templates/script.txt');
            fs.readFile(templatePath, 'utf8', (err, txt) => {
                if (err) console.error(err.message);
                resolve(txt);
            });
        });
    }

    _getPromptConfig() {

        return [{
            'type': 'input',
            'message': 'Sketch name',
            'name': 'sketch'
        }, {
            'type': 'input',
            'message': 'Author',
            'name': 'author',
            'default': os.userInfo().username
        }];
    }
}

module.exports = Create;