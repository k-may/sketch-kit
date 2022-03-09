var path = require('path');
var fs = require('fs');

const {createServer} = require('vite');
const {glslify} = require('vite-plugin-glslify');
const dynamicImportVariables = require('@rollup/plugin-dynamic-import-vars').default;

console.log(glslify);

class Run {

    constructor(config, args) {

        this._config = config;
        this.args = args;

    }

    async start() {

        const publicDir = path.resolve(process.cwd(), 'sketch-kit');
        const includeDir =  path.resolve(publicDir, 'js/*')

        const server = await createServer({
            // any valid user config options, plus `mode` and `configFile`
            root: publicDir,
            mode: 'development',
            server: {
                port: 3002,
                host: true,
                hmr: true
            },
            plugins: [
                glslify(),
                dynamicImportVariables({
                    include : includeDir,
                })
            ]
        })
        await server.listen()

    }

    watch(path, cb) {
        var tmeOut;
        fs.watch(path, {recursive: true}, () => {
            if (!tmeOut) {
                tmeOut = setTimeout(() => {
                    cb();
                    tmeOut = null;
                });
            }
        });

    }
}

module.exports = Run;
