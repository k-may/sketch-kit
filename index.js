#!/usr/bin/env node
/* eslint-disable no-undef */
const minimist = require('minimist');
const SketchKit = require('./app/sketch-kit');
const {version} = require('./package.json');

// Function to display help information
function displayHelp() {
    console.log('Usage:');
    console.log('  sketch-kit <command> [options]');
    console.log('\nCommands:');
    console.log('  init                                     Initialize Sketch-Kit');
    console.log('  create <name / copy> <copy => new name (optional)>      Create a new sketch');
    console.log('  run                                      Run Sketch-Kit');
}


function main() {
    var argv = minimist(process.argv.slice(2), {
        string: ['configFile'],
        alias: {
            h: 'help', // Add an alias for the help option
            v: 'version'
        },
    });

    if (argv.help) {
        displayHelp();
    }else if (argv.version) {
        console.log(`Sketch-Kit v${version}`);
    }else {
        var action = argv._.shift();
        var args = argv._;
        var context = {
            configFile: argv.configFile
        }

        var s = new SketchKit({
            debug: false,
            ...context
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
                console.log('No Command, will update instead.')
                s.update(args);
                break;

        }
    }
}

main();
