
import {build} from 'vite';
import path from 'path';
import {utils} from './utils.js';
import glslify from 'vite-plugin-glsl';
import {viteStaticCopy} from "vite-plugin-static-copy";

export default class Build {

    constructor(config, args) {
        this._args = args;
        this._config = config;
    }

    async start() {

        utils.log('Build');

        const publicDir = path.resolve(process.cwd(), 'sketch-kit');
        const outDir = path.resolve(process.cwd(), 'sketch-kit/build');
        const assetDir = path.resolve(process.cwd(), 'sketch-kit/assets');

        return build({
            root: publicDir,
            mode: 'production',
            build: {
                outDir,
            },
            plugins: [
                glslify(),
                viteStaticCopy({
                    targets: [
                        {
                            src: "assets/**/*",
                            dest: 'assets'
                        }
                    ]
                })
            ],
            define : {
                __version__ : `"${this._config.version}"`
            }
        })

    }

}
