import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planRelease, readReleaseMetadata } from '../scripts/prepare-release.mjs';
import { validateRelease } from '../scripts/validate-release.mjs';

const lock = version => ({ name: 'sketch-kit', version, packages: { '': { version } } });
const pkg = version => ({ name: 'sketch-kit', version });

test('feature then fix preserves the pending minor release', () => {
    const feature = planRelease('1.0.0', 'feature/blah');
    assert.equal(feature.version, '1.1.0');
    const fix = planRelease('1.0.0', 'fix/blah', feature);
    assert.equal(fix.version, '1.1.0');
    assert.equal(fix.bump, 'minor');
    assert.equal(planRelease('1.0.0', 'feature/another', fix).version, '1.1.0');
});

test('fix then feature promotes patch to minor without accumulating bumps', () => {
    const patch = planRelease('1.0.0', 'fix/first');
    assert.equal(patch.version, '1.0.1');
    assert.equal(planRelease('1.0.0', 'fix/second', patch).version, '1.0.1');
    assert.equal(planRelease('1.0.0', 'feature/new', patch).version, '1.1.0');
});

test('after release merge the next bump starts from the new main version', () => {
    const old = planRelease('1.0.0', 'feature/old');
    assert.equal(planRelease('1.1.0', 'fix/new', old).version, '1.1.1');
    assert.equal(planRelease('1.1.0', 'feature/new', old).version, '1.2.0');
});

test('planning rejects unsupported source branches and unstable versions', () => {
    assert.throws(() => planRelease('1.0.0', 'release/next'), /source branch/);
    assert.throws(() => planRelease('1.0.0-rc.1', 'fix/x'), /stable/);
    assert.throws(() => planRelease('1.0.0', 'fix/x', { baseVersion: '1.0.0', bump: 'major' }), /Invalid/);
});

test('pending state survives a commit round trip; unmanaged branches are rejected', () => {
    const pending = { ...planRelease('1.0.0', 'feature/new'), sources: [1, 2] };
    assert.deepEqual(readReleaseMetadata('chore(release)\n\nSketch-Kit-Release: ' + JSON.stringify(pending)), pending);
    assert.throws(() => readReleaseMetadata('manual work'), /refusing to overwrite/);
});

test('publication accepts aligned patch/minor versions and rejects stale or mismatched files', () => {
    for (const version of ['1.0.1', '1.1.0']) assert.equal(validateRelease('1.0.0', pkg(version), lock(version)), version);
    for (const version of ['1.0.0', '0.9.9', '2.0.0', '1.0.2']) {
        assert.throws(() => validateRelease('1.0.0', pkg(version), lock(version)), /must be a patch or minor/);
    }
    assert.throws(() => validateRelease('1.0.0', pkg('1.1.0'), lock('1.0.1')), /do not match/);
    const broken = lock('1.1.0');
    broken.packages[''].version = '1.0.0';
    assert.throws(() => validateRelease('1.0.0', pkg('1.1.0'), broken), /do not match/);
});

test('preparation updates one PR branch, preserves minor, and never changes remote main', async t => {
    const fs = await import('node:fs');
    const os = await import('node:os');
    const path = await import('node:path');
    const { execFileSync } = await import('node:child_process');
    const { prepareRelease } = await import('../scripts/prepare-release.mjs');
    const originalCwd = process.cwd();
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sketch-kit-release-'));
    const remote = path.join(root, 'remote.git');
    const workspace = path.join(root, 'workspace');
    fs.mkdirSync(workspace);
    const gitAt = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    gitAt(root, 'init', '--bare', '--initial-branch=main', remote);
    gitAt(workspace, 'init', '--initial-branch=main');
    gitAt(workspace, 'config', 'user.name', 'Release Test');
    gitAt(workspace, 'config', 'user.email', 'test@example.com');
    fs.writeFileSync(path.join(workspace, 'package.json'), JSON.stringify(pkg('1.0.0')));
    fs.writeFileSync(path.join(workspace, 'package-lock.json'), JSON.stringify(lock('1.0.0')));
    gitAt(workspace, 'add', '.');
    gitAt(workspace, 'commit', '-m', 'Initial feature merged');
    gitAt(workspace, 'remote', 'add', 'origin', remote);
    gitAt(workspace, 'push', '-u', 'origin', 'main');
    const git = (...args) => gitAt(workspace, ...args);
    let open = null;
    let closed = [];
    let creations = 0;
    let updates = 0;
    const env = { GITHUB_REPOSITORY: 'owner/repo', SOURCE_BRANCH: 'feature/blah', PR_NUMBER: '1', MERGE_SHA: git('rev-parse', 'main') };
    const run = (command, args, input) => {
        if (command === 'git') return git(...args);
        if (command === 'npm') {
            assert.equal(args[0], 'version');
            for (const name of ['package.json', 'package-lock.json']) {
                const data = JSON.parse(fs.readFileSync(name));
                data.version = args[1];
                if (data.packages) data.packages[''].version = args[1];
                fs.writeFileSync(name, JSON.stringify(data));
            }
            return args[1];
        }
        assert.equal(command, 'gh');
        if (args.includes('--slurp')) return JSON.stringify([closed]);
        if (!input) return JSON.stringify(open ? [open] : []);
        const payload = JSON.parse(input);
        if (args.includes('POST')) {
            creations++;
            open = { ...payload, number: 10, html_url: 'https://example.com/pr/10' };
        } else {
            updates++;
            Object.assign(open, payload);
        }
        return JSON.stringify(open);
    };
    try {
        process.chdir(workspace);
        prepareRelease({ run, env });
        assert.equal(creations, 1);
        assert.match(open.title, /v1.1.0/);
        assert.equal(gitAt(remote, 'show', 'main:package.json'), JSON.stringify(pkg('1.0.0')));
        git('checkout', 'main');
        git('commit', '--allow-empty', '-m', 'Fix merged');
        git('push', 'origin', 'main');
        env.SOURCE_BRANCH = 'fix/blah';
        env.PR_NUMBER = '2';
        env.MERGE_SHA = git('rev-parse', 'main');
        prepareRelease({ run, env });
        assert.equal(creations, 1);
        assert.equal(updates, 1);
        assert.match(open.title, /v1.1.0/);
        assert.match(open.body, /#1, #2/);
        assert.equal(JSON.parse(gitAt(remote, 'show', 'release/next:package.json')).version, '1.1.0');
        assert.equal(gitAt(remote, 'rev-parse', 'main'), env.MERGE_SHA);
        assert.deepEqual(git('diff', '--name-only', 'origin/main', 'HEAD').split('\n').sort(), ['package-lock.json', 'package.json']);
        git('checkout', 'main');
        git('fetch', 'origin');
        git('merge', '--no-ff', 'origin/release/next', '-m', 'Merge release PR');
        git('push', 'origin', 'main');
        closed = [{ number: 10, head: { ref: 'release/next', repo: { full_name: 'owner/repo' } }, merged_at: '2026-10-20T12:00:00Z', merge_commit_sha: git('rev-parse', 'HEAD') }];
        open = null;
        prepareRelease({ run, env }); // Rerunning the old fix must not release twice.
        assert.equal(creations, 1);
        git('checkout', 'main');
        git('commit', '--allow-empty', '-m', 'Next fix merged');
        git('push', 'origin', 'main');
        env.PR_NUMBER = '3';
        env.MERGE_SHA = git('rev-parse', 'main');
        prepareRelease({ run, env });
        assert.equal(creations, 2);
        assert.match(open.title, /v1.1.1/);
    } finally {
        process.chdir(originalCwd);
        fs.rmSync(root, { recursive: true, force: true });
    }
});
