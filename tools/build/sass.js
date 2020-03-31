/* eslint-disable no-undef */
var path = require('path');
var sassGlob = require('gulp-sass-glob');
var plugins = require('gulp-load-plugins')();

module.exports = function(gulp, plugins, config) {
    return function() {

        var src = process.cwd() + '/' + config.root;
        var dest = path.resolve(src, config.sass.dest);
        src = path.join(src, config.sass.src, config.sass.entry);

        gulp.src(src)
            .pipe(sassGlob())
            .pipe(plugins.plumber())
            .pipe(plugins.sass())
            .pipe(plugins.autoprefixer({browsers: ['last 2 versions', 'ie 11', 'safari >= 8', 'ios 9', 'android 4']}))
            .pipe(gulp.dest(dest));
    };
};
