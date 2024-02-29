
import inquirer from 'inquirer';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import {utils} from './utils.js';

import * as url from 'url';
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

export default class Create {

    constructor(config, args) {

        this._config = config;
        this._args = args;
        this.sketchName = args.length ? args[0] : '';

    }

    async start() {

        utils.log("Create");

        var config = await this._getConfig();
        if (this.sketchName) {
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
            if(process.env.TEST)
               return this._copySketch(this.sketchName, this.author)
            else
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
            'message': '\x1b[33mSketch already exists, would you like to replace it or copy it?',
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

    async _copySketch(name, author) {

        var origSketchPath = path.join(process.cwd(), 'sketch-kit/js/sketches/', name + '/' + name + '.js');
        var origSassPath = path.join(process.cwd(), 'sketch-kit/scss/sketches/_' + name + '.scss');

        //if new name, will create a new tree
        var newName = this._args.length > 1 ? this._args[1] : this._seeSketchTreeName(name);

        try {
            await this._createScript(newName, origSketchPath, name, true);
            await this._createSass(newName, origSassPath, name);
            await this._addSketchToTree(newName, author);
        } catch (e) {
            console.log('copySketch error : ' + e.message);
        }
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

        try {
            await this._createScript(name);
            await this._createSass(name);
            await this._addSketchToTree(name, author);
        } catch (e) {
            console.log('createSketch error : ' + e.message);
        }
    }

    async _addSketchToTree(name, author) {

        //add new sketch config to sketch-kit/data/config.json
        this.sketchConfig.sketches[name] = {
            'date': new Date(),
            'author': author
        };

        this._seeConfigSketchTree();
        var sketchConfigPath = this._getConfigPath();
        await fs.writeFile(sketchConfigPath, JSON.stringify(this.sketchConfig, null, 4));
    }

    async _createScript(name, templatePath, replaceName, copyDeps) {

        if (!templatePath) {
            templatePath = path.resolve(__dirname, '../');
            templatePath = path.join(templatePath, '/lib/templates/script.txt');
        }

        var sketchFolder = './sketch-kit/js/sketches/' + name + '/';
        var sketchKitPath = sketchFolder + name + '.js';
        await fs.copy(templatePath, sketchKitPath);

        //replace all sketchnames throughout templates
        replaceName = replaceName || '{sketchname}';

        utils.replaceNameInFile(replaceName, name, sketchKitPath);

        //copy deps
        if(copyDeps) {
            const templateFileName = path.basename(templatePath);
            const templateDirName = path.dirname(templatePath);
            const files = await fs.promises.readdir(templateDirName);
            files.forEach(async (file) => {
                if (file !== templateFileName) {
                    await fs.copy(path.join(templateDirName, file), sketchFolder + file);
                }
            });
        }
    }

    async _createSass(name, templatePath, replaceName) {


        if (!templatePath) {
            templatePath = path.resolve(__dirname, '../');
            templatePath = path.join(templatePath, '/lib/templates/sass.txt');
        }

        var sassPath = './sketch-kit/scss/sketches/_' + name + '.scss';

        //copy and rename
        await fs.copy(templatePath, sassPath);

        //replace all sketchnames throughout templates
        replaceName = replaceName || '{sketchname}';
        utils.replaceNameInFile(replaceName, name, sassPath);

        //append import to entry point..
        var sassEntryPath = './sketch-kit/scss/main.scss';
        return new Promise((resolve => {
            fs.readFile(sassEntryPath, 'utf8', (err, data) => {
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
        for (var current in sketches) {
            var children = [];

            for (var child in sketches) {
                if (current !== child && child.indexOf(current) == 0) {
                    //see if child branches directly from current
                    let childDepth = this._getDepth(child);
                    //step one branch back...
                    childDepth.pop();

                    const parentDepth = this._getDepth(current);

                    if (JSON.stringify(childDepth) === JSON.stringify(parentDepth)) {
                        children.push(child);
                    }
                }
            }

            if (children.length) {
                children.sort();
                sketches[current].children = children;
            }
        }

    }

    _seeTreeDepth(name) {
        var lastIndex = name.lastIndexOf('_');
        return name.substring(lastIndex);
    }

    /**
     * Converts branching syntax to multidimensional array
     * @param name
     * @return {string[]}
     * @private
     */
    _getDepth(name) {
        const index = (name.indexOf('_'))
        if (index > -1) {
            const substring = index > -1 ? name.substring(index) : index;
            const depth = substring.replace(/_/g, '').split('').map(num => parseInt(num))
            return depth;
        } else {
            //initial sketch....
            return [];
        }
    }

    _seeRoot(name) {
        var lastIndex = name.lastIndexOf('_');
        name = name.substring(0, lastIndex);
        return name.substring(name.indexOf('_'));
    }

    _seeSketchTreeName(current) {

        const {sketches} = this.sketchConfig;

        var parentVersion = this._getDepth(current)

        var children = [];
        for (var name in sketches) {

            if (current != name && name.indexOf(current) == 0) {
                //check version root
                var versionRoot = this._getDepth(name)
                versionRoot.pop()
                if (JSON.stringify(versionRoot) == JSON.stringify(parentVersion)) {
                    children.push(name);
                }
            }
        }

        return current + '_' + (children.length + 1);
    }

    _getPromptConfig() {
        return [{
            'type': 'input',
            'message': '\x1b[33mSketch name',
            'name': 'sketch'
        }, {
            'type': 'input',
            'message': '\x1b[33mAuthor',
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
                this._config.legacy = true;
                sketchConfigPath = this._getConfigPath();
                this.sketchConfig = fs.readJSONSync(sketchConfigPath);
            }

            resolve(this.sketchConfig);

        });
    }

    _getConfigPath() {
        if (this._config.legacy)
            return this._config.root + '/data/config.json';

        return path.resolve(this._config.root, this._config.configFile);
    }
}
