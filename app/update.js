
import fs from 'fs-extra';
import copyNodeModules from 'copy-node-modules';
import {utils} from './utils.js';

export default class Update {

    constructor(config) {
        this.config = config;
    }

    start() {

        utils.log("Update");

        return this._copyDependencies();
    }

    //------------------------------------------

    _copyDependencies() {

        return new Promise(resolve => {

            if (!this.config.copyDependencies || process.env.TEST) {
                resolve();
            } else {

                var pkg = fs.readFileSync('./package.json');
                if (pkg) {
                    pkg = JSON.parse(pkg);

                    if (!pkg.dependencies) {
                        resolve();
                        return;
                    }
                }

                var srcDir = './';
                var dstDir = 'sketch-kit/js';

                fs.remove('sketch-kit/js/node_modules', () => {

                    copyNodeModules(srcDir, dstDir, {devDependencies: false}, function (err, results) {
                        if (err) {
                            console.warn(err);
                            resolve();
                        }
                        for (var i in results) {
                            console.log('package name:' + results[i].name + ' version:' + results[i].version);
                        }

                        resolve();
                    });
                });
            }
        });
    }
}

