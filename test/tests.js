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

after(() => {
    setTimeout(() => {
        fs.removeSync(sketchesPath, {}, err=>{
            console.log(err);
        })
    }, 100);
});

//========================================================

describe('SketchKit init', () => {
    it('sketch-kit/ folder created', async () => {

        //remove previous version
        //await fs.removeSync(sketchesPath);

        return sketches.init().then(async () => {
            var folderExist = await fs.existsSync(sketchesPath);

            assert(folderExist, 'folder is not created');
        });

    });
});

//--------------------------------------------------------

describe('SketchKit create', function () {

    it('sketch created', function () {

        return sketches.create(['test']).then(async () => {

            var sketchPath = path.join(sketchesPath, '/js/views/sketches/test');
            var folderExist = await fs.existsSync(sketchPath);

            assert(folderExist, 'folder is not created');

        });

    });


    //remove previous version
    //fs.removeSync(sketchesPath);
});