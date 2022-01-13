
var path = require('path');
var fs = require('fs');

const {createServer} = require('vite');
const {glslify} = require('vite-plugin-glslify');

console.log(glslify);

class Run {

    constructor(config, args) {

        this._tasksConfig = config;
        this.args = args;

    }

    async start() {

        const publicDir = path.resolve(process.cwd(), 'sketch-kit');
        const server = await createServer({
            // any valid user config options, plus `mode` and `configFile`
            root: publicDir,
            mode : "development",
            server: {
                port: 3002,
                host: true,
                hmr : {
                    protocol: 'wss',
                    host : "localhost"
                }
            },
            plugins : [
                glslify()
            ]
        })
        await server.listen()
        server.printUrls()

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
