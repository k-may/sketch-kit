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

        if(args.length == 1)
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
            }else if(name === ""){
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

        var templatePath = path.resolve(__dirname, "../");
        templatePath = path.join(templatePath, "/lib/sketches/js/views/sketches/template");
        var sketchesPath = './sketches/js/views/sketches/' + name;

        this._createTemplate(name)
            .then(() => {

                this._createSassFile(name).then(() => {

                    //replace all sketchnames throughout template
                    replace({
                        regex: "{sketchname}",
                        replacement: name,
                        paths: [sketchesPath],
                        recursive: true,
                        silent: true,
                    });

                    //add new sketch config to sketches/data/config.json
                    this.sketchConfig.sketches[name] = {
                        "view": name + "/SketchView",
                        "date": new Date(),
                        "author": author
                    };

                    var sketchConfigPath = this.config.root + "/data/config.json";
                    fs.writeFile(sketchConfigPath, JSON.stringify(this.sketchConfig, null, 4));

                });
            })

    }

    _createTemplate(name) {
        var templatePath = path.resolve(__dirname, "../");
        templatePath = path.join(templatePath, "/lib/sketches/js/views/sketches/template");
        var sketchesPath = './sketches/js/views/sketches/' + name;
        return fs.copy(templatePath, sketchesPath);
    }

    _createSassFile(name) {
        return new Promise((resolve, reject) => {
            var sassPath = path.join(this.config.root, this.config.sass.src);
            fs.writeFile(sassPath + '/sketches/_' + name + '.scss', this._getSassTemplate(name), {}, err => {
                if (err) reject("Sass Error : " + err.message);
                resolve();
            });
        });
    }

    _getSassTemplate(name){
        return  "." + name + "{ canvas { display:block; position : fixed; }}"
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
};

module.exports = Create;