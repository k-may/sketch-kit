/*var gulp = require('gulp');

var plugins = require('gulp-load-plugins')();*/
var path = require('path');
var fs = require('fs');

const {createServer} = require('vite');

class Run {

    constructor(config, args) {

        this._tasksConfig = config;
        this.args = args;

    }

    async start() {

        //browser-sync
        /*var taskPath = path.resolve(__dirname, '../tools/build/sass');
        const scripts = require(taskPath)(gulp, plugins, this._tasksConfig);
        var sketchKitPath = path.resolve(process.cwd(), 'sketch-kit/');
        var scssPath = sketchKitPath + '/' + this._tasksConfig.sass.src;

        this.watch(scssPath, scripts);
        scripts();

        //sass
        taskPath = path.resolve(__dirname, '../tools/build/serve');

        const serve = require(taskPath)(this._tasksConfig);
        serve();*/

        const publicDir = path.resolve(process.cwd(), 'sketch-kit');
        console.log(publicDir);
        const server = await createServer({
            // any valid user config options, plus `mode` and `configFile`
            root: publicDir,
            server: {
                port: 3001
            }
        })
        await server.listen()

        server.printUrls()

    }

    watch(path, cb) {
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
