/* eslint-disable no-undef */
var webpack = require('webpack');

module.exports = function(gulp, plugins, config) {
    return function(callback) {

        //TODO is this necessary? Still need to add to require shim!

        //load project dependencies into sketches
        var sketchDest = process.cwd() + '/' + config.root + '/js';

        console.log('js path    :: ' + sketchDest);

        var webpackConfig = {
            entry: config.dependencies,
            output: {
                filename: 'vendor/[name].js',
                libraryTarget: 'umd',
                path: sketchDest,
                umdNamedDefine: true
            },
            resolve: {
                alias: config.js.alias,
                modules: [
                    sketchDest,
                    'node_modules'
                ]
            },
            module: {
                loaders: [
                    {test: /backbone\.js$/, loader: 'imports-loader?define=>false'}
                ]
            },
            plugins: [
                new webpack.IgnorePlugin(/^jquery$/)
            ]
        };

        webpack(webpackConfig, function(error, stats) {
            if (error) throw new plugins.util.PluginError('webpack', error);
            var statsErrors = stats.toString('errors-only');
            if (statsErrors) plugins.util.log('[webpack]', statsErrors);
            callback();
        });
    };
};
