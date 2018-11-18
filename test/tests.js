const Sketches = require('../app/sketch');
const assert = require('chai').assert;
const fs = require('fs-extra');
const path = require('path');

sketches = new Sketches({debug: true});

describe("Sketches init", function () {

    it("sketches/ folder created", function () {
        var sketchesPath = path.resolve(process.cwd(), "sketches");

        //remove previous version
        fs.removeSync(sketchesPath);

        return sketches.init().then(() => {
            var folderExist = fs.existsSync(sketchesPath);

            assert(folderExist, "folder is not created");

        });

    });
});