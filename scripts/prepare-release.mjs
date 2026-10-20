import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const marker = 'Sketch-Kit-Release: ';

export function planRelease(baseVersion, branch, pending = null) {
    const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(baseVersion);
    if (!match) throw new Error(`Expected a stable main version, got ${baseVersion}`);
    let bump = branch.startsWith('feature/') ? 'minor' : branch.startsWith('fix/') ? 'patch' : null;
    if (!bump) throw new Error(`Not a release source branch: ${branch}`);
    if (pending?.baseVersion === baseVersion) {
        if (!['patch', 'minor'].includes(pending.bump)) throw new Error('Invalid pending release bump');
        if (pending.bump === 'minor') bump = 'minor';
    }
    const [major, minor, patch] = match.slice(1).map(Number);
    return {
        baseVersion, bump,
        version: bump === 'minor' ? `${major}.${minor + 1}.0` : `${major}.${minor}.${patch + 1}`,
    };
}

export function readReleaseMetadata(message) {
    const line = message.split('\n').find(line => line.startsWith(marker));
    if (!line) throw new Error('release/next is not managed by this automation; refusing to overwrite it');
    return JSON.parse(line.slice(marker.length));
}

export function prepareRelease({
    run = (command, args, input) => execFileSync(command, args, { encoding: 'utf8', input }).trim(),
    env = process.env,
} = {}) {
    const git = (...args) => run('git', args);
    const gh = (...args) => run('gh', args);
    const repo = env.GITHUB_REPOSITORY;
    const source = env.SOURCE_BRANCH;
    const merge = env.MERGE_SHA;
    const number = Number(env.PR_NUMBER);
    if (!repo || !source || !/^[a-f0-9]{40}$/.test(merge ?? '') || !Number.isSafeInteger(number) || number < 1) {
        throw new Error('Missing release event context');
    }
    git('fetch', 'origin', 'main');
    git('checkout', '--detach', 'origin/main');
    git('merge-base', '--is-ancestor', merge, 'HEAD');
    // Rerunning an old source event after its release merged must not create another bump.
    const closed = JSON.parse(gh('api', '--paginate', '--slurp', `repos/${repo}/pulls?state=closed&base=main&per_page=100`)).flat();
    for (const pr of closed) {
        if (pr.head.ref !== 'release/next' || pr.head.repo?.full_name !== repo || !pr.merged_at) continue;
        try {
            git('merge-base', '--is-ancestor', merge, pr.merge_commit_sha);
            console.log(`PR #${number} is already included in release PR #${pr.number}`);
            return;
        } catch { /* This release predates the source PR. */ }
    }
    const baseVersion = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
    const remote = git('ls-remote', '--heads', 'origin', 'refs/heads/release/next');
    const previous = remote.split(/\s/)[0];
    let pending = null;
    if (previous) {
        git('fetch', 'origin', 'refs/heads/release/next');
        pending = readReleaseMetadata(git('show', '-s', '--format=%B', previous));
    }
    const plan = planRelease(baseVersion, source, pending);
    const sources = [...new Set([...(pending?.baseVersion === baseVersion ? pending.sources ?? [] : []), number])];
    // npm updates package.json and all lockfile version fields together.
    run('npm', ['version', plan.version, '--no-git-tag-version', '--ignore-scripts']);
    git('config', 'user.name', 'github-actions[bot]');
    git('config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com');
    git('add', 'package.json', 'package-lock.json');
    git('commit', '-m', `chore(release): v${plan.version}`, '-m', marker + JSON.stringify({ ...plan, sources }));
    // Only the automation-owned branch is rewritten. A concurrent edit fails the lease.
    git('push', `--force-with-lease=refs/heads/release/next:${previous}`, 'origin', 'HEAD:refs/heads/release/next');
    const open = JSON.parse(gh('api', `repos/${repo}/pulls?state=open&base=main&head=${repo.split('/')[0]}:release/next`));
    const body = `Release v${plan.version} (${plan.bump}).\n\nIncludes current main and source PRs: ${sources.map(n => `#${n}`).join(', ')}.\n\nMerge this PR to tag and publish to npm. This branch is regenerated automatically; do not edit it manually.`;
    const payload = { title: `chore(release): v${plan.version}`, body };
    const result = open.length
        ? run('gh', ['api', '--method', 'PATCH', `repos/${repo}/pulls/${open[0].number}`, '--input', '-'], JSON.stringify(payload))
        : run('gh', ['api', '--method', 'POST', `repos/${repo}/pulls`, '--input', '-'], JSON.stringify({ ...payload, head: 'release/next', base: 'main' }));
    console.log(JSON.parse(result).html_url);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) prepareRelease();
