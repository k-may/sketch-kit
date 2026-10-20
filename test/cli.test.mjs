import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import assert from 'node:assert/strict';
import { before, after, describe, it } from 'node:test';
import os from 'node:os';
import fs from 'fs-extra';
import path from 'path';
import {SketchUtils} from "../templates/workspace/js/utils/SketchUtils.js";

const execFileAsync = promisify(execFile);
const moduleUrl = new URL('../app/sketch-kit.js', import.meta.url).href;
let project;
let sketchesPath;

async function runCommand(method, args = []) {
    await execFileAsync(process.execPath, ['--input-type=module', '-e',
        'import SketchKit from ' + JSON.stringify(moduleUrl) + '; ' +
        'const kit = new SketchKit({ debug: true }); ' +
        'await kit.' + method + '(' + JSON.stringify(args) + ');',
    ], { cwd: project, env: { ...process.env, TEST: 'true' }, timeout: 60000 });
}

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
before(async () => {
    project = await fs.mkdtemp(path.join(os.tmpdir(), 'sketch-kit-cli-'));
    sketchesPath = path.join(project, 'sketch-kit');
});


//========================================================

describe('CLI Tests', () => {

    it('sketch-kit/ folder created', async () => {

        await runCommand('init')
        const folderExist = await fs.pathExists(sketchesPath);
        assert(folderExist, 'sketch-kit initialized');

    });
    it('sketch created', async () => {

        await runCommand('create', ['test']);

        const sketchPath = path.join(sketchesPath, '/js/sketches/test');
        const folderExist = await fs.pathExists(sketchPath);

        assert(folderExist, 'sketch was created');

    });
    it('sketch copied', async () => {

        await runCommand('create', ['test', 'forceCopy']);

        const sketchPath = path.join(sketchesPath, '/js/sketches/forceCopy');
        const folderExist = await fs.pathExists(sketchPath);

        assert(folderExist, `sketch was copied : ${sketchPath} / exists : ${folderExist}`);

    });

    it("sketch-kit built", async () => {
        await runCommand('build');
        const buildPath = path.join(sketchesPath, '/build');
        const folderExist = await fs.pathExists(buildPath);
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
    if (project) await fs.remove(project);
});
