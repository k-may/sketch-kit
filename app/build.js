const {build} = require('vite');
const path = require('path');
const {glslify} = require('vite-plugin-glslify');
const {default: dynamicImportVariables} = require('@rollup/plugin-dynamic-import-vars');
const utils = require('./utils.js');

module.exports = class Build {

    constructor(config) {
        this._config = config;
    }

    async start(){

        utils.log("build");

        const publicDir = path.resolve(process.cwd(), 'sketch-kit');
        const outDir = path.resolve(process.cwd(), 'sketch-kit/build');
        const includeDir =  path.resolve(publicDir, '/js')

        return build({
            root : publicDir,
            publicDir,
            build : {
                outDir,
            },
            plugins : [
                glslify(),
                dynamicImportVariables({
                    include : includeDir,
                })
            ]
        })

    }

}
