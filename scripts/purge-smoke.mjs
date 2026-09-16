import { lstat, readdir, realpath, rm } from 'node:fs/promises';
import path from 'node:path';

export async function purgeSmokeProjects(repository) {
    const repo = await realpath(repository);
    const temporary = path.join(repo, '.tmp');
    const root = path.join(temporary, 'smoke');
    try {
        // Refuse redirected roots before considering any recursive deletion.
        if ((await lstat(temporary)).isSymbolicLink() || await realpath(temporary) !== temporary ||
            (await lstat(root)).isSymbolicLink() || await realpath(root) !== root) {
            throw new Error('Refusing to purge a redirected smoke directory.');
        }
    } catch (error) {
        if (error.code === 'ENOENT') return 0;
        throw error;
    }

    const projects = [];
    for (const entry of await readdir(root, { withFileTypes: true })) {
        if (!/^project-[a-zA-Z0-9]+$/.test(entry.name)) continue;
        const target = path.join(root, entry.name);
        if (entry.isSymbolicLink() || !entry.isDirectory() || path.dirname(await realpath(target)) !== root) {
            throw new Error(`Refusing to purge an unexpected project path: ${target}`);
        }
        projects.push(target);
    }
    // All absolute targets have been checked. Node rm removes nested links
    // themselves, without traversing their targets (including the checkout link).
    for (const target of projects) {
        await rm(target, { recursive: true, force: true });
    }
    await rm(path.join(root, 'current.json'), { force: true });
    return projects.length;
}
