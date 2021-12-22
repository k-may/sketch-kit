var inquirer = require('inquirer');
var fs = require('fs-extra');
var os = require('os');
var path = require('path');
var replace = require('replace');

class Create {

    constructor(config, args) {

        this.config = config;
        this.args = args;
        this.sketchName = args.length ? args[0] : '';

    }

    async start() {
        var config = await this._getConfig();
        if (this.sketchName) {
            //return this._createSketch(this.sketchName, os.userInfo().username);
            await this._tryCreateSketch(this.sketchName, os.userInfo().username);
        } else
            await this._prompt();
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

    async _tryCreateSketch(name, author) {

        this.sketchName = name;
        this.author = author;

        if (this.sketchConfig.sketches.hasOwnProperty(name)) {
            this._seeReplaceOrCopy();
        } else if (name === '') {
            console.log('Name not valid');
            return this._prompt();
        } else {
            await this._createSketch(name, author);
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

        var origSketchPath = path.join(process.cwd(), 'sketch-kit/js/sketches/', name);

        var newName = this.args.length > 1 ? this.args[1] : name
        newName = this._seeSketchTreeName(newName);
        var newSketchPath = './sketch-kit/js/sketches/' + newName;

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

                        this.replaceNameInFile(name, newName, [newSketchPath, newSassPath]);

                        await this._addSketchToTree(newName, author, newSketchPath, newSassPath, name);

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
    async _createSketch(name, author) {

        //cleanup names
        name = name.replace('-', '');

        var sketchKitPath = './sketch-kit/js/sketches/' + name;
        var sassPath = './sketch-kit/scss/sketches';

        try {
            await this._createScript(name, sketchKitPath);
            await this._createSass(name);
            await this._addSketchToTree(name, author, sketchKitPath, sassPath);
        } catch (e) {
            console.log('createSketch error : ' + e.message);
        }
    }

    replaceNameInFile(regex, replacement, paths){

        try {
            paths = Array.isArray(paths) ? paths : [paths];
            paths = paths.map(p => path.resolve(p));
            //replace all sketchnames throughout templates
            replace({
                regex,
                replacement,
                paths,
                recursive: true,
                silent: true,
            });
        }catch(e){
            console.log("Replace error : ", e);
            console.log({regex, replacement, paths});
        }
    }

    async _addSketchToTree(name, author, jsPath, sassPath, nameReplace) {

        //add new sketch config to sketch-kit/data/config.json
        this.sketchConfig.sketches[name] = {
            'date': new Date(),
            'author': author
        };

        this._seeConfigSketchTree();
        var sketchConfigPath = this._getConfigPath();
        await fs.writeFile(sketchConfigPath, JSON.stringify(this.sketchConfig, null, 4));
    }

    async _createScript(name, jsPath) {
        var templatePath = path.resolve(__dirname, '../');
        templatePath = path.join(templatePath, '/lib/templates/script.txt');
        var sketchKitPath = path.join(jsPath, '/' + name + '.js');
        //copy and rename
        await fs.copy(templatePath, sketchKitPath);

        //replace all sketchnames throughout templates
        this.replaceNameInFile('{sketchname}', name, sketchKitPath);
    }

    async _createSass(name) {
        var templatePath = path.resolve(__dirname, '../');
        templatePath = path.join(templatePath, '/lib/templates/sass.txt');
        var sassPath = './sketch-kit/scss/sketches/_' + name + '.scss';
        //copy and rename
        await fs.copy(templatePath, sassPath);

        //replace all sketchnames throughout templates
        this.replaceNameInFile('{sketchname}', name, sassPath);

        //append import to entry point..
        var sassEntryPath = './sketch-kit/scss/main.scss';
        return new Promise((resolve => {
            const entrySass = fs.readFile(sassEntryPath, 'utf8', (err, data) => {
                if (err) {
                    console.log(err.message);
                    throw err;
                }
                data += `\n@import "sketches/${name}";`
                fs.writeFile(sassEntryPath, data);
                resolve();
            });
        }))

    }

    _seeConfigSketchTree() {

        const {sketches} = this.sketchConfig;
        for (var name in sketches) {
            var children = [];
            var lastIndex = name.lastIndexOf('_');
            var version = name.substring(lastIndex);
            for (var child in sketches) {
                if (name !== child && child.indexOf(name) == 0) {
                    //check root version
                    var parentVersion = this._seeRoot(child);
                    if (parentVersion == version) {
                        children.push(child);
                    }
                }
            }

            if (children.length) {
                children.sort();
                sketches[name].children = children;
            }
        }

    }

    _seeTreeDepth(name) {
        var lastIndex = name.lastIndexOf('_');
        return name.substring(lastIndex);
    }

    _seeRoot(name) {
        var lastIndex = name.lastIndexOf('_');
        name = name.substring(0, lastIndex);
        return name.substring(name.indexOf('_'));
    }

    _seeSketchTreeName(parent) {

        const {sketches} = this.sketchConfig;
        var parentVersion = this._seeTreeDepth(parent);

        var children = [];
        for (var name in sketches) {

            if (parent != name) {
                //check root
                if (name.indexOf(parent) == 0) {
                    //check version root
                    var versionRoot = this._seeRoot(name);
                    if (versionRoot == parentVersion)
                        children.push(name);
                }
            }
        }

        return parent + '_' + (children.length + 1);
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

    _getConfig() {
        return new Promise((resolve, reject) => {

            var sketchConfigPath = this._getConfigPath();

            try {
                this.sketchConfig = fs.readJSONSync(sketchConfigPath);
            } catch (e) {
                this.config.legacy = true;
                sketchConfigPath = this._getConfigPath();
                this.sketchConfig = fs.readJSONSync(sketchConfigPath);
            }

            resolve(this.sketchConfig);

        });
    }

    _getConfigPath() {
        if (this.config.legacy)
            return this.config.root + '/data/config.json';

        return this.config.root + '/config.json';
    }
}

module.exports = Create;
