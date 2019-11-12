var gulp = require('gulp');
var path = require('path');
var plugins = require('gulp-load-plugins')();

class Run {

    constructor(config, args) {

        this._tasksConfig = config;
        this.args = args;

    }

    start() {

        //browser-sync
        var taskPath = path.resolve(__dirname, '../tools/build/sass');
        var scripts =  require(taskPath)(gulp, plugins, this._tasksConfig);
        var sketchKitPath = path.resolve(process.cwd(), "sketch-kit/");
        var scssPath =  sketchKitPath + '/' + this._tasksConfig.sass.src;
        scssPath = path.join(scssPath, '/**/*.scss');
        gulp.watch(scssPath, scripts);
        scripts();

        //sass
        var taskPath = path.resolve(__dirname, '../tools/build/serve');
        var scripts =  require(taskPath)(gulp, plugins, this._tasksConfig);
        scripts();

    }


}

module.exports = Run;