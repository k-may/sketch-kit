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
        if (this.sketchName) {
            //return this._createSketch(this.sketchName, os.userInfo().username);
            return this._tryCreateSketch(this.sketchName, os.userInfo().username);
        } else
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
            this._tryCreateSketch(result.sketch, result.author);
        }).catch(e => {
            console.log(e);
        });
    }

    _tryCreateSketch(name, author) {

        this.sketchName = name;
        this.author = author;

        if (this.sketchConfig.sketches.hasOwnProperty(name)) {
            this._seeReplaceOrCopy();
        } else if (name === '') {
            console.log('Name not valid');
            return this._prompt();
        } else {
            return this._createSketch(name, author);
        }

    }

    _seeReplaceOrCopy() {
        inquirer.prompt({
            'type': 'list',
            'message': 'Sketch already exists, would like to replace it or copy it',
            'name': 'replace',
            'choices': ['copy', 'replace', 'niether']
        }).then(result => {

            if (result.replace === 'replace')
                this._createSketch(this.sketchName, this.author);
            else if (result.replace === 'copy') {
                this._copySketch(this.sketchName, this.author)
            } else {
                this._prompt();
            }

        });
    }

    _copySketch(name, author) {

        var origSketchPath = path.join(process.cwd(), 'sketch-kit/js/views/sketches/', name);
        var newName = this._getSketchNameVersioned(name);//this._getSketchVersion(name);
        var newSketchPath = './sketch-kit/js/views/sketches/' + newName;

        return new Promise((resolve, reject) => {

            //copy original
            fs.copy(origSketchPath, newSketchPath).then(() => {

                //rename js
                var origFileName = path.join(newSketchPath, name + '.js');
                var newFileName = path.join(newSketchPath, newName + '.js');

                fs.rename(origFileName, newFileName).then(() => {

                    var sassPath = path.join(process.cwd(), 'sketch-kit/scss/sketches/_' + name + '.scss');
                    var newSassPath = path.join(process.cwd(), 'sketch-kit/scss/sketches/_' + newName + '.scss');

                    fs.copy(sassPath, newSassPath).then(async () => {

                        await this._writeSketch(newName, author, newSketchPath, newSassPath, name);

                        resolve();
                    });
                });
            });
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

                    await this._writeSketch(name, author, sketchKitPath, sassPath);

                    resolve();
                });
        });
    }

    async _writeSketch(name, author, jsPath, sassPath, nameReplace) {

        nameReplace = nameReplace || '{sketchname}';

        //replace all sketchnames throughout templates
        replace({
            regex: nameReplace,
            replacement: name,
            paths: [jsPath, sassPath],
            recursive: true,
            silent: true,
        });

        //add new sketch config to sketch-kit/data/config.json
        this.sketchConfig.sketches[name] = {
            'date': new Date(),
            'author': author
        };

        this._seeConfigRelations();

        var sketchConfigPath = this.config.root + '/data/config.json';
        await fs.writeFileSync(sketchConfigPath, JSON.stringify(this.sketchConfig, null, 4));

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

    _seeConfigRelations() {

        var sketches = this.sketchConfig.sketches;

        for (var name in sketches) {

            var children = [];
            var lastIndex = name.lastIndexOf('_');
            var version = name.substring(lastIndex);

            for (var child in sketches) {

                if (name != child) {

                    //check root
                    if (child.indexOf(name) == 0) {

                        //check root version
                        var parentVersion = this._versionRoot(child);
                        if (parentVersion == version) {
                            children.push(child);
                        }

                    }

                }

            }

            if (children.length) {
                children.sort();
                sketches[name].children = children;
            }
        }

    }

    _version(name) {
        var lastIndex = name.lastIndexOf('_');
        return name.substring(lastIndex);
    }

    _versionRoot(name) {
        var lastIndex = name.lastIndexOf('_');
        name = name.substring(0, lastIndex);
        return name.substring(name.indexOf('_'));
    }

    _getSketchNameVersioned(parent) {

        var sketches = this.sketchConfig.sketches;
        var parentVersion = this._version(parent);

        var children = [];
        for (var name in sketches) {

            if (parent != name) {
                //check root
                if (name.indexOf(parent) == 0) {
                    //check version root
                    var versionRoot = this._versionRoot(name);
                    if (versionRoot == parentVersion)
                        children.push(name);
                }
            }
        }

        return parent + '_' + (children.length + 1);

    }

    /*_getSketchVersion(name) {

        var srcPath = path.join(process.cwd(), 'sketch-kit/js/views/sketches/');
        const getDirectories = srcPath => fs.readdirSync(srcPath).filter(file => fs.statSync(path.join(srcPath, file)).isDirectory());
        var result = getDirectories(srcPath);
        var versions = []
        var version = this._versionRoot(name);
        result.forEach(dir => {

            //check root
            if (dir.indexOf(name) == 0) {

                //check version root
                var parentVersion = this._versionRoot(dir);
                if (parentVersion == version) {
                    versions.push(dir);
                }
            }
        });
        return name + '_' + (versions.length);
    }*/

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