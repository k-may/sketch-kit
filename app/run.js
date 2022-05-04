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
        const includeDir = path.resolve(publicDir, 'js/*')

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
            ]
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

            console.log(config)
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
