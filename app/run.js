var path = require('path');
var fs = require('fs');
const glslify = require('rollup-plugin-glslify');
const {createServer, defineConfig} = require('vite');
const utils = require('./utils.js');

class Run {

    constructor(config, args) {
        this._args = args;
        this._config = config;
    }

    async start() {

        utils.log("Run");

        const publicDir = path.resolve(process.cwd(), 'sketch-kit');

        const config = {
            // any valid user config options, plus `mode` and `configFile`
            root: publicDir,
            mode: 'development',
            server: {
                port: 3002,
                host: true,
                hmr: true
            },
            plugins: [
                glslify()
            ],
            define : {
                __configFile__ : JSON.stringify(this._config.configFile),
                __version__ : `"${this._config.version}"`
            }
        }


        try {
            //try to load cert files..
            //todo add to documentation

            let filePath = path.resolve(process.cwd(), '.cert/key.pem');
            const keyFile = fs.readFileSync(filePath);

            filePath = path.resolve(process.cwd(), '.cert/cert.pem');
            const certFile = fs.readFileSync(filePath);


            if (keyFile && certFile) {
                config.server.https = {
                    key: keyFile,
                    cert: certFile
                }
            }

        }catch(e){
            utils.message("No certs found, defaulting to http")
        }

        const server = await createServer(config);
        await server.listen()
        server.printUrls();
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
