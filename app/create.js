var inquirer = require('inquirer');
var fs = require('fs-extra');
var os = require("os");
var path = require("path");
var replace = require("replace");

class Create {

    constructor(config, args) {

        this.config = config;
        this.args = args;

        var sketchConfigPath = this.config.root + "/data/config.json";
        this.sketchConfig = fs.readJSONSync(sketchConfigPath);

        if (args.length == 1)
            this._createSketch(args[0], os.userInfo().username);
        else
            this._prompt();
    }

    //----------------------------------------------------

    /***
     * Prompts user for sketch name and author and then creates sketch.
     * Will also check if sketch already exists.
     *
     * @private
     */
    _prompt() {

        inquirer.prompt(this._getPromptConfig()).then(result => {

            var name = result.sketch;
            var author = result.author;

            if (this.sketchConfig.sketches.hasOwnProperty(name)) {
                inquirer.prompt({
                    "type": "confirm",
                    "message": "Sketch already exist, would like to replace it",
                    "name": "replace"
                }).then(result => {
                    if (result.replace) {
                        this._createSketch(name, author);
                    } else {
                        this._prompt();
                    }

                });
            } else if (name === "") {
                console.log("Name not valid");
                this._prompt();
            }
            else {
                this._createSketch(name, author);
            }

        }).catch(e => {
            console.log(e);
        });
    }

    /***
     * Copies sketch template to sketches project and updates
     * sketches configuration.
     *
     * @param name
     * @param author
     * @private
     */
    _createSketch(name, author) {

        var sketchesPath = './sketches/js/views/sketches/' + name;
        var sassPath = './sketches/scss/sketches';

        this._createScript(name)
            .then(this._createSass(name))
            .then(() => {

                //replace all sketchnames throughout templates
                replace({
                    regex: "{sketchname}",
                    replacement: name,
                    paths: [sketchesPath, sassPath],
                    recursive: true,
                    silent: true,
                });

                //add new sketch config to sketches/data/config.json
                this.sketchConfig.sketches[name] = {
                    "date": new Date(),
                    "author": author
                };

                var sketchConfigPath = this.config.root + "/data/config.json";
                fs.writeFile(sketchConfigPath, JSON.stringify(this.sketchConfig, null, 4));

            });
    }

    _createScript(name) {
        return new Promise((resolve, reject) => {
            var templatePath = path.resolve(__dirname, "../");
            templatePath = path.join(templatePath, "/lib/templates/script.txt");
            var sketchesPath = './sketches/js/views/sketches/' + name + "/" + name + ".js";
            //copy and rename
            fs.copy(templatePath, sketchesPath).then(() => {
                resolve();
            });
        });
    }

    _createSass(name) {
        return new Promise((resolve, reject) => {
            var templatePath = path.resolve(__dirname, "../");
            templatePath = path.join(templatePath, "/lib/templates/sass.txt");
            var sassPath = './sketches/scss/sketches/_' + name + '.scss';
            //copy and rename
            fs.copy(templatePath, sassPath).then(() => {
                resolve();
            });
        });
    }

    _getSassTemplate(name) {
        return new Promise(resolve => {
            var templatePath = path.resolve(__dirname, "../");
            templatePath = path.join(templatePath, "/lib/templates/script.txt");
            fs.readFile(templatePath, "utf8", (err, txt) => {
                if (err) console.error(err.message);
                resolve(txt);
            });
        });
    }

    _getPromptConfig() {

        return [{
            "type": "input",
            "message": "Sketch name",
            "name": "sketch"
        }, {
            "type": "input",
            "message": "Author",
            "name": "author",
            "default": os.userInfo().username
        }];
    }
}

module.exports = Create;