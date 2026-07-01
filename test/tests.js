import SketchKit from '../app/sketch-kit.js';
import {assert} from 'chai';
import fs from 'fs-extra';
import path from 'path';
import {SketchUtils} from "../lib/sketch-kit/js/utils/SketchUtils.js";

const sketchesPath = path.resolve(process.cwd(), 'sketch-kit');

let sketches;

function generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters.charAt(randomIndex);
    }

    return result;
}

//========================================================
process.env.TEST = "true";

before(() => {
    sketches = new SketchKit({debug: true});
});


//========================================================

describe('CLI Tests', () => {

    it('sketch-kit/ folder created', async () => {

        await fs.remove(sketchesPath);

        await sketches.init()
        const folderExist = await fs.existsSync(sketchesPath);
        assert(folderExist, 'sketch-kit initialized');

    });
    it('sketch created', async () => {

        await sketches.create(['test']);

        const sketchPath = path.join(sketchesPath, '/js/sketches/test');
        const folderExist = await fs.pathExists(sketchPath);

        assert(folderExist, 'sketch was created');

    });
    it('sketch copied', async () => {

        await sketches.create(['test', 'forceCopy']);

        const sketchPath = path.join(sketchesPath, '/js/sketches/forceCopy');
        const folderExist = await fs.existsSync(sketchPath);

        assert(folderExist, `sketch was copied : ${sketchPath} / exists : ${folderExist}`);

    });

    it("sketch-kit built", async () => {
        await sketches.build();
        const buildPath = path.join(sketchesPath, '/build');
        const folderExist = await fs.existsSync(buildPath);
        assert(folderExist, 'build folder exists');
    });
});

describe("Sketches Tests", () => {

    it("Name is sanitized", () => {
        //generate random names

        let numNames = 100;
        let names = [];
        for (let i = 0; i < numNames; i++) {
            //generate random name
            let name = generateRandomString(Math.random() * 15 + 1);
            // name = SketchUtils.sanitizeElementName(name);
            names.push({name, sanitizeElementName: SketchUtils.sanitizeElementName(name)});
        }

        const isValidCustomElementName = /^[a-z][a-z0-9]*-[a-z0-9-]*$/;

        const failures = names.filter(n => !isValidCustomElementName.test(n.sanitizeElementName));
        assert(failures.length === 0, `Unsanitized names: ${JSON.stringify(failures)}`);

    });
});
after(async () => {
    await fs.remove(sketchesPath);
});
