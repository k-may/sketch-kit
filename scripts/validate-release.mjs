import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { planRelease } from './prepare-release.mjs';

export function validateRelease(previous, pkg, lock) {
    const allowed = ['fix/release', 'feature/release'].map(branch => planRelease(previous, branch).version);
    if (!allowed.includes(pkg.version)) throw new Error(`Release version ${pkg.version} must be a patch or minor bump from ${previous}`);
    if (lock.version !== pkg.version || lock.packages?.['']?.version !== pkg.version || lock.name !== pkg.name) {
        throw new Error('Package and lockfile release versions/names do not match');
    }
    return pkg.version;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const previous = JSON.parse(execFileSync('git', ['show', 'HEAD^1:package.json'], { encoding: 'utf8' })).version;
    const version = validateRelease(previous, JSON.parse(fs.readFileSync('package.json')), JSON.parse(fs.readFileSync('package-lock.json')));
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\n`);
}
