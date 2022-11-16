const {build} = require('vite');
const path = require('path');
const utils = require('./utils.js');

module.exports = class Build {

    constructor(config, args) {
        this._args = args;
        this._config = config;
    }

    async start() {

        utils.log('Build');

        const publicDir = path.resolve(process.cwd(), 'sketch-kit');
        const outDir = path.resolve(process.cwd(), 'sketch-kit/build');

        return build({
            root: publicDir,
            mode: 'production',
            build: {
                outDir,
            },
            plugins: [
                // glslify()
            ],
            define : {
                __version__ : `"${this._config.version}"`
            }
        })

    }

}
