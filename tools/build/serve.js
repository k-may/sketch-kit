/* eslint-disable no-undef */
var browserSync = require('browser-sync');

module.exports = function(config) {
    return function() {

        var pathSketches = process.cwd() + '/' + config.root;

        var files = [
            '*.html',
            'css/**/*.css',
            'js/**/*.js',
            'sass/**/*.scss'
        ];

        var _port = 3003;

        browserSync.init(files, {
            server: pathSketches,
            port: _port,
            ghostMode: false/*,
            https: true*/
        });
    };
};
