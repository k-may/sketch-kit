#!/usr/bin/env node
/* eslint-disable no-undef */

var argv = require('minimist')(process.argv.slice(2));
var Sketches = require('./app/sketch-kit');
var s = new Sketches({
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
    default :
        s.update(args);
        break;

}