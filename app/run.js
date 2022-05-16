var path = require('path');
var fs = require('fs');

const {createServer, defineConfig} = require('vite');
const {glslify} = require('vite-plugin-glslify');
const utils = require('./utils.js');
const dynamicImportVariables = require('@rollup/plugin-dynamic-import-vars').default;

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
                __configFile__ : `"${this._config.configFile}"`
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
            console.log(e);
        }

        const server = await createServer(config);
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
