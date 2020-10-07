const Sketches = require('../app/sketch-kit');
const assert = require('chai').assert;
const fs = require('fs-extra');
const path = require('path');

const sketchesPath = path.resolve(process.cwd(), 'sketch-kit');

var sketches;

//========================================================
process.env.TEST = true;

before(() => {
    sketches = new Sketches({debug: true});
});


//========================================================

//describe('SketchKit A : init', () => {
    it('sketch-kit/ folder created', async () => {

        //remove previous version
        //await fs.removeSync(sketchesPath);

        await sketches.init()
        var folderExist = await fs.existsSync(sketchesPath);
        assert(folderExist, 'sketch-kit initialized');

    });
    it('sketch created', async  () =>{

        await sketches.create(['test']);

        var sketchPath = path.join(sketchesPath, '/js/sketches/test');
        var folderExist = await fs.existsSync(sketchPath);

        assert(folderExist, 'sketch was created');

    });
//})

after(() => {
    fs.removeSync(sketchesPath, {}, err => {
        console.log(err);
    })
});

//--------------------------------------------------------
/*

describe('SketchKit B : create', function () {



    //remove previous version
    //fs.removeSync(sketchesPath);
});*/
