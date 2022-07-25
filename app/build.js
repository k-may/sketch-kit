const {build} = require('vite');
const path = require('path');
const {glslify} = require('vite-plugin-glslify');
const {default: dynamicImportVariables} = require('@rollup/plugin-dynamic-import-vars');
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
        const includeDir = path.resolve(publicDir, '/js')

        return build({
            root: publicDir,
            publicDir,
            build: {
                outDir,
            },
            plugins: [
                glslify()
            ],
            define : {
                __configFile__ : `"${this._config.configFile}"`
            }
        })

    }

}
