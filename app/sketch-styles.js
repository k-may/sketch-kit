import { validateSketchId } from '../lib/sketch-kit/js/utils/SketchRegistry.js';

const start = '// code-in: sketch-styles';
const end = '// code-out: sketch-styles';

// Fail before installing files when an older/custom template needs migration.
export function insertSketchStyle(source, id) {
    validateSketchId(id);
    const text = source.replace(/^\uFEFF/, '');
    if (!text.startsWith(start) || text.split(start).length !== 2 || text.split(end).length !== 2) {
        throw new Error('scss/main.scss needs a single sketch-styles code-in/code-out block at the beginning. See docs/sass.md.');
    }
    const close = text.indexOf(end);
    const block = text.slice(start.length, close);
    const uses = [...block.matchAll(/@use\s+["'](?:\.\/)?sketches\/([^"']+)["'][^;]*;/g)];
    if (uses.some(match => match[1].replace(/\.scss$/, '').replace(/^_/, '') === id)) return source;
    const newline = source.includes('\r\n') ? '\r\n' : '\n';
    const insertion = `@use "sketches/${id}" as sketch_${id};${newline}`;
    const offset = source.indexOf(end);
    return source.slice(0, offset) + insertion + source.slice(offset);
}
