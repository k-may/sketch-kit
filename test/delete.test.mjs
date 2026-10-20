import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import Delete from '../app/delete.js';

async function fixture(t) {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sketch-kit-delete-test-'));
    t.after(() => fs.remove(root));
    const configPath = path.join(root, 'sketch-kit.config.json');
    await fs.writeJSON(configPath, { sketches: { motion: {}, motion_1: {} } });
    await fs.outputFile(path.join(root, 'js/sketches/motion_1/helper.txt'), 'extra');
    return { root, configPath, command: (args, options = { yes: true }) => new Delete({ root }, args, options) };
}

test('deletes files and registry entry while retaining allocation counters', async t => {
    const f = await fixture(t);
    assert.equal(await f.command(['motion_1']).start(), 'motion_1');
    const config = await fs.readJSON(f.configPath);
    assert.deepEqual(Object.keys(config.sketches), ['motion']);
    assert.deepEqual(config.sketches.motion.children, []);
    assert.equal(config.sketches.motion.nextOrder, 2);
    assert.equal(await fs.pathExists(path.join(f.root, 'js/sketches/motion_1')), false);
});

test('invalid, missing, parent and unconfirmed targets leave files unchanged', async t => {
    const f = await fixture(t);
    const original = await fs.readFile(f.configPath, 'utf8');
    for (const args of [[], ['../motion'], ['missing'], ['motion'], ['motion_1', 'motion']]) {
        await assert.rejects(f.command(args).start());
    }
    if (!process.stdin.isTTY) await assert.rejects(f.command(['motion_1'], {}).start(), /confirmation/);
    assert.equal(await fs.readFile(f.configPath, 'utf8'), original);
    assert.equal(await fs.pathExists(path.join(f.root, 'js/sketches/motion_1/helper.txt')), true);
});

test('refuses legacy styles and concurrent mutation', async t => {
    const f = await fixture(t);
    const style = path.join(f.root, 'scss/sketches/_motion_1.scss');
    await fs.outputFile(style, '');
    await assert.rejects(f.command(['motion_1']).start(), /legacy styles/);
    await fs.remove(style);
    await fs.outputFile(path.join(f.root, '.sketch-kit-create.lock'), '');
    await assert.rejects(f.command(['motion_1']).start(), /operation is active/);
});

test('failed config save restores sketch files and original registry', async t => {
    const f = await fixture(t);
    const original = await fs.readFile(f.configPath, 'utf8');
    const rename = fs.rename;
    fs.rename = async (source, destination, ...args) => {
        if (destination === f.configPath) throw new Error('simulated config failure');
        return rename(source, destination, ...args);
    };
    try {
        await assert.rejects(f.command(['motion_1']).start(), /simulated config failure/);
    } finally {
        fs.rename = rename;
    }
    assert.equal(await fs.readFile(f.configPath, 'utf8'), original);
    assert.equal(await fs.readFile(path.join(f.root, 'js/sketches/motion_1/helper.txt'), 'utf8'), 'extra');
    assert.equal(await fs.pathExists(path.join(f.root, '.sketch-kit-create.lock')), false);
});
