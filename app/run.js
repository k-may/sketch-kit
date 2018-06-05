var gulp = require('gulp');
var path = require('path');
var plugins = require('gulp-load-plugins')();
var gulpSync = require('gulp-sync')(gulp);
var browserSync = require('browser-sync');

class Run {

    constructor(config, args) {

        this._tasksConfig = config;

        this._tasks({
            type: 'sketch', sync: true, tasks: ['serve', 'sass'], callback: () => {

                var sketchesPath = path.resolve(process.cwd(), "sketches/");

                var scssPath =  sketchesPath + '/' + this._tasksConfig.sass.src;
                scssPath = path.join(scssPath, '/**/*.scss');
                gulp.watch(scssPath, ['sass']);

                if(args.indexOf('reload') != -1) {
                    gulp.watch(sketchesPath + '/**/*.js').on('change', function() {
                        browserSync.reload();
                    });
                }
            }
        });

        gulp.run('sketch');
    }

    //--------------------------------------------------

    /**
     * Parses and adds sketch tasks to gulp
     *
     * @param options
     * @private
     */
    _tasks(options) {

        var tasks = [];
        var task, name;

        var toolsDir = path.resolve(__dirname, '../tools/build');

        for (var i = 0, len = options.tasks.length; i < len; i++) {
            task = options.tasks[i];
            name = task;
            var taskPath = path.resolve(toolsDir, task);
            gulp.task(name, require(taskPath)(gulp, plugins, this._tasksConfig, 'local'));
            tasks.push(name);
        }

        var callback = options.callback || undefined;
        tasks = options.sync ? gulpSync.sync(tasks) : tasks;
        gulp.task(options.type, tasks, callback);
    }
}

module.exports = Run;