#!/usr/bin/env node
/* eslint-disable no-undef */
const minimist = require('minimist');
const SketchKit = require('./app/sketch-kit');


function main() {
    var argv = minimist(process.argv.slice(2), {string: ['configFile']});

    var action = argv._.shift();
    var args = argv._;
    var context = {
        configFile: argv.configFile
    }

    var s = new SketchKit({
        debug: false,
        ... context
    });

    switch (action) {
        case 'create':
            s.create(args);
            break;
        case 'run':
            s.run(args, context);
            break;
        case 'init':
            s.init(args);
            break;
        case 'build':
            s.build(args);
            break;
        case 'preview':
            s.preview(args);
            break;
        default :
            console.log('No Command, will update')
            s.update(args);
            break;

    }
}

main();
