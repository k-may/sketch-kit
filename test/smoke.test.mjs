import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, symlink, rm, readdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { purgeSmokeProjects } from '../scripts/purge-smoke.mjs';

async function fixture(t) {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'sketch-purge-test-'));
    const repo = path.join(directory, 'repo');
    const external = path.join(directory, 'external');
    await mkdir(repo);
    await mkdir(external);
    await writeFile(path.join(external, 'keep.txt'), 'keep');
    t.after(() => rm(directory, { recursive: true, force: true }));
    return { repo, external, root: path.join(repo, '.tmp/smoke') };
}

test('purge removes generated projects and pointer without following checkout links', async t => {
    const { repo, root, external } = await fixture(t);
    await mkdir(path.join(root, 'project-one/node_modules'), { recursive: true });
    await mkdir(path.join(root, 'project-two'), { recursive: true });
    await mkdir(path.join(root, 'notes'));
    await writeFile(path.join(root, 'current.json'), JSON.stringify({ directory: 'project-one' }));
    await writeFile(path.join(repo, 'package.json'), '{}');
    await symlink(repo, path.join(root, 'project-one/node_modules/sketch-kit'), process.platform === 'win32' ? 'junction' : 'dir');
    await symlink(external, path.join(root, 'project-two/external'), process.platform === 'win32' ? 'junction' : 'dir');
    assert.equal(await purgeSmokeProjects(repo), 2);
    assert.deepEqual(await readdir(root), ['notes']);
    assert.equal(await readFile(path.join(repo, 'package.json'), 'utf8'), '{}');
    assert.equal(await readFile(path.join(external, 'keep.txt'), 'utf8'), 'keep');
    assert.equal(await purgeSmokeProjects(repo), 0);
});

test('purge on a fresh checkout does not create a smoke workspace', async t => {
    const { repo } = await fixture(t);
    assert.equal(await purgeSmokeProjects(repo), 0);
    assert.deepEqual(await readdir(repo), []);
});

test('purge refuses a redirected smoke root', async t => {
    const { repo, root, external } = await fixture(t);
    await mkdir(path.dirname(root));
    await symlink(external, root, process.platform === 'win32' ? 'junction' : 'dir');
    await assert.rejects(purgeSmokeProjects(repo), /redirected/);
    assert.equal(await readFile(path.join(external, 'keep.txt'), 'utf8'), 'keep');
});

test('purge preflights every project before deleting any', async t => {
    const { repo, root, external } = await fixture(t);
    await mkdir(path.join(root, 'project-valid'), { recursive: true });
    await symlink(external, path.join(root, 'project-linked'), process.platform === 'win32' ? 'junction' : 'dir');
    await assert.rejects(purgeSmokeProjects(repo), /unexpected project/);
    assert.ok((await readdir(root)).includes('project-valid'));
    assert.equal(await readFile(path.join(external, 'keep.txt'), 'utf8'), 'keep');
});
