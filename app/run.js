
var path = require('path');
var fs = require('fs');

const {createServer} = require('vite');

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
            server: {
                port: 3001,
                hmr : {
                    protocol: 'ws',
                    host : "localhost"
                }
            }
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
