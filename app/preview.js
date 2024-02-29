import {preview} from 'vite';
import path from 'path';
import {utils} from './utils.js';

export default class Preview {

    constructor(config, args) {
        this._args = args;
        this._config = config;
    }

    async start() {

        utils.log('Preview');

        const publicDir = path.resolve(process.cwd(), './sketch-kit/build');

        const previewServer = await preview({
            root: './sketch-kit/build',
            plugins: [
                // glslify()
            ],
            define : {
                __version__ : `"${this._config.version}"`
            }
        })

        previewServer.printUrls();
    }

}
