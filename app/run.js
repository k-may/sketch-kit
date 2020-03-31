var gulp = require('gulp');
var path = require('path');
var plugins = require('gulp-load-plugins')();
var fs = require('fs');

class Run {

    constructor(config, args) {

        this._tasksConfig = config;
        this.args = args;

    }

    start() {

        //browser-sync
        var taskPath = path.resolve(__dirname, '../tools/build/sass');
        const scripts = require(taskPath)(gulp, plugins, this._tasksConfig);
        var sketchKitPath = path.resolve(process.cwd(), 'sketch-kit/');
        var scssPath = sketchKitPath + '/' + this._tasksConfig.sass.src;

        this.watch(scssPath, scripts);
        scripts();

        //sass
        taskPath = path.resolve(__dirname, '../tools/build/serve');

        const serve = require(taskPath)(this._tasksConfig);
        serve();

    }

    watch(path, cb){
        var tmeOut;
        fs.watch(path, {recursive: true}, () => {
            if (!tmeOut) {
                tmeOut = setTimeout(() => {
                    cb();
                    tmeOut = null;
                });
            }
        });

    }
}

module.exports = Run;