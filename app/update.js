var fs = require('fs-extra');
var pkg = require('./sketches/package.json');

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

        return {
            entry: {
                vendor: Object.keys(pkg.dependencies)
            },
            output: {
                filename: 'vendor.js',
                library: '[name]',
                path: (environmentData.environment === 'local') ? path.resolve(config.js.dest) : path.resolve(config.release.dest + '/js')
            },
            resolve: {
                alias: config.js.alias,
                modules: [
                    path.resolve(config.js.src),
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

            var package;
            this._getFile('package.json').then(file => {
                var deps = file.dependencies;

                console.log(deps);
                this._getFile("./sketches/package.json").then(file => {
                    var deps = file.dependencies;

                    console.log(deps);
                    resolve(deps);
                });

            })
        });
    }

    _getFile(src) {
        return new Promise(resolve => {
            fs.readFile('package.json', function (err, data) {
                if (err)
                    reject(new Error(err.message));
                else
                    resolve(data);
            });

        });
    }

};

module.exports = Update;