var fs = require('fs-extra');
var webpack = require('webpack');
var path = require('path');

class Update {

    constructor(config) {
        this.config = config;
    }

    start() {
        //todo run webpack
        return new Promise(resolve => {
            this._getDependencies().then(deps => {
                var webpackConfig = this._getWebkitConfig(deps);
                webpack(webpackConfig, function (error, stats) {
                    resolve();
                });
            });
        });
    }

    //------------------------------------------

    _getWebkitConfig(pkg) {

        var rP =  path.resolve(process.cwd(), "sketches/js/vendor");

        return {
            entry: {
                vendor: Object.keys(pkg)
            },
            output: {
                filename: 'vendor.js',
                library: '[name]',
                path: rP
            },
            resolve: {
                modules: [
                    'node_modules'
                ]
            },
            module: {
                rules: []
            },
            plugins: []
        };
    }

    _getDependencies() {
        //first search for parent deps
        return new Promise((resolve, reject) => {

            var deps = {};
            this._getFile('package.json').then(d => {

                deps = d || {};

                this._getFile("sketches/package.json").then(d => {

                    if(d)
                        Object.assign(d, deps);

                    resolve(deps);
                });

            })
        });
    }

    _getFile(src) {
        return new Promise(resolve => {
            fs.readFile('package.json', 'utf8', function (err, data) {
                if (err)
                    resolve({});
                else {
                    data = JSON.parse(data);
                    data = data.dependencies || {};
                    resolve(data);
                }
            });

        });
    }

};

module.exports = Update;