#!/usr/bin/env node
/* eslint-disable no-undef */

var argv = require('minimist')(process.argv.slice(2));
var SketchKit = require('./app/sketch-kit');
var s = new SketchKit({
    debug: false
});

var action = argv._.shift();
var args = argv._;

switch (action) {
    case 'create':
        s.create(args);
        break;
    case 'run':
        s.run(args);
        break;
    case 'init':
        s.init(args);
        break;
    case 'build':
        s.build(args);
    default :
        console.log("No Command, will update")
        s.update(args);
        break;

}
