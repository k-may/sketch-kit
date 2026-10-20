import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SketchUtils } from '../templates/workspace/js/utils/SketchUtils.js';
import { RenderUtils } from '../templates/workspace/js/utils/RenderUtils.js';
import matrix, { Matrix } from '../templates/workspace/js/utils/MatrixUtils.js';
import Vector from '../templates/workspace/js/utils/VectorUtils.js';
import { TransformUtils } from '../templates/workspace/js/utils/TransformUtils.js';
import { LoadingUtils } from '../templates/workspace/js/utils/LoadingUtils.js';

function mockGlobal(t, name, value) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
    t.after(() => descriptor ? Object.defineProperty(globalThis, name, descriptor) : delete globalThis[name]);
}
function frames(t) {
    const queue = new Map(); let next = 0;
    mockGlobal(t, 'window', {
        requestAnimationFrame(fn) { const id = ++next; queue.set(id, fn); return id; },
        cancelAnimationFrame(id) { queue.delete(id); },
    });
    return { queue, step(time) {
        const pending = [...queue.values()]; queue.clear(); pending.forEach(fn => fn(time));
    } };
}

test('element names preserve underscores, nesting, case and escape characters', () => {
    const ids = ['motion1', 'motion_1', 'motion11', 'motion_11', 'motion_1_1', 'motion$1', 'Motion1', 'motion-5f-1'];
    const names = ids.map(SketchUtils.sanitizeElementName);
    assert.equal(new Set(names).size, ids.length);
    names.forEach(name => assert.match(name, /^sk-[a-z0-9-]+$/));
});

test('registration reuses only the same class and rejects collisions', () => {
    const classes = new Map();
    const registry = { get: name => classes.get(name), define: (name, value) => classes.set(name, value) };
    class A {} class B {}
    SketchUtils.registerElement('sk-a', A, registry);
    SketchUtils.registerElement('sk-a', A, registry);
    assert.throws(() => SketchUtils.registerElement('sk-a', B, registry), /different sketch class/);
    assert.equal(classes.get('sk-a'), A);
});

test('render stop/start cancels frames and ignores stale callbacks', t => {
    const { queue, step } = frames(t); const deltas = [];
    const loop = RenderUtils.loop(frame => deltas.push(frame.deltaTime));
    const stale = [...queue.values()][0];
    loop.stop(); loop.stop(); assert.equal(queue.size, 0);
    loop.start(); loop.start(); assert.equal(queue.size, 1);
    stale(100); assert.equal(queue.size, 1); assert.equal(deltas.length, 0);
    step(100); step(120); assert.deepEqual(deltas, [0, 20]);
    loop.stop(); loop.start(); step(9000);
    assert.equal(deltas.at(-1), 0); assert.equal(queue.size, 1);
});

test('render callback can stop and restart without duplicating its chain', t => {
    const { queue, step } = frames(t);
    const loop = RenderUtils.loop(() => { loop.stop(); loop.start(); }, { isRunning: false });
    assert.equal(queue.size, 0); loop.start(); step(100); step(120);
    assert.equal(queue.size, 1);
    loop.stop(); assert.equal(queue.size, 0);
});

test('stopping in callback stays stopped and target rate is respected', t => {
    const { queue, step } = frames(t); let count = 0;
    const loop = RenderUtils.loop(() => { if (++count === 2) loop.stop(); }, { targetFrameRate: 30 });
    step(0); step(16); step(34);
    assert.equal(count, 2); assert.equal(queue.size, 0);
    assert.throws(() => RenderUtils.loop(() => {}, { targetFrameRate: 0 }), RangeError);
});

test('matrix multiplication, determinant, inverse and singular handling', () => {
    const a = matrix([[1, 2], [3, 4]]);
    assert.equal(a.det(), -2);
    assert.ok(a.x(a.inverse()).eql(Matrix.I(2)));
    assert.deepEqual(a.x(matrix([[2, 0], [0, 2]])).elements, [[2, 4], [6, 8]]);
    assert.equal(matrix([[1, 2], [2, 4]]).inverse(), null);
    assert.equal(matrix([[0, 1], [1, 0]]).det(), -1);
});

test('matrix vectors, diagonal, trace and 1x1 operations', () => {
    const a = matrix([[1, 2], [3, 4]]);
    assert.deepEqual(a.row(1).elements, [1, 2]);
    assert.deepEqual(a.col(2).elements, [2, 4]);
    assert.deepEqual(a.diagonal().elements, [1, 4]);
    assert.deepEqual(a.x(Vector.create([1, 2])).elements, [5, 11]);
    assert.ok(Vector.create([1, 2]).toDiagonalMatrix().eql(matrix([[1, 0], [0, 2]])));
    assert.equal(a.row(0), null); assert.equal(a.col(0), null);
    assert.equal(matrix([[1, 2]]).diagonal(), null);
    const single = matrix([[4]]);
    assert.equal(single.det(), 4); assert.equal(single.trace(), 4);
    assert.deepEqual(single.inverse().elements, [[0.25]]);
    assert.match(a.inspect(), /1, 2/);
});

test('translation and composition write the standard transform property', () => {
    const el = { style: {} };
    TransformUtils.Translate(el, { x: 3, y: 4, z: 5 });
    assert.equal(el.style.transform, 'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,3,4,5,1)');
    TransformUtils.SetTransformMatrix(el, [TransformUtils.GetScaleMatrix(2), TransformUtils.GetTranslationMatrix(3, 4, 5)]);
    assert.match(el.style.transform, /^matrix3d\(/);
    assert.deepEqual(Object.keys(el.style), ['transform']);
});

function xhr(t, responses) {
    const instances = [];
    mockGlobal(t, 'XMLHttpRequest', class {
        constructor() { instances.push(this); }
        open(method, url) { this.url = url; }
        send() {
            const response = responses[this.url];
            if (response.pending) return;
            queueMicrotask(() => {
                this.status = response.status ?? 200;
                this.responseText = response.text ?? '';
                this.responseXML = response.xml ?? null;
                this[response.event ?? 'onload']?.();
            });
        }
        abort() { this.onabort?.(); }
    });
    return instances;
}

test('loaders return successful 2xx text, JSON, XML and shader batches', async t => {
    const xml = { documentElement: {} };
    xhr(t, { '/text': { status: 201, text: 'hello' }, '/json': { text: '{"ok":true}' }, '/svg': { xml }, '/empty': { status: 204 } });
    assert.equal(await LoadingUtils.LoadAJAX('/text'), 'hello');
    assert.deepEqual(await LoadingUtils.LoadJSON('/json'), { ok: true });
    assert.equal(await LoadingUtils.LoadSVG('/svg'), xml);
    assert.deepEqual(await LoadingUtils.LoadShaders(['/text', '/empty']), ['hello', '']);
});

test('loaders reject HTTP, network, timeout, invalid JSON and failed batches', async t => {
    const instances = xhr(t, { '/404': { status: 404 }, '/network': { event: 'onerror' }, '/timeout': { event: 'ontimeout' }, '/bad': { text: '{' }, '/ok': { text: 'shader' } });
    await assert.rejects(LoadingUtils.LoadAJAX('/404'), /HTTP 404.*404/);
    await assert.rejects(LoadingUtils.LoadSVG('/network'), /Network error/);
    await assert.rejects(LoadingUtils.LoadShader('/timeout'), /timed out/);
    await assert.rejects(LoadingUtils.LoadJSON('/bad'), /Invalid JSON/);
    await assert.rejects(LoadingUtils.LoadJSON('/404'), /HTTP 404/);
    await assert.rejects(LoadingUtils.LoadShaders(['/ok', '/404']), /HTTP 404/);
    assert.equal(instances[0].timeout, 30000);
});

test('request aborts reject before and during loading', async t => {
    xhr(t, { '/wait': { pending: true } });
    const controller = new AbortController();
    const pending = LoadingUtils.LoadAJAX('/wait', { signal: controller.signal });
    controller.abort();
    await assert.rejects(pending, /aborted/);
    await assert.rejects(LoadingUtils.LoadAJAX('/wait', { signal: controller.signal }), /aborted/);
});

test('image batches propagate errors and individual images time out', async t => {
    mockGlobal(t, 'Image', class {
        set src(value) { if (value !== 'wait') queueMicrotask(() => value === 'bad' ? this.onerror?.() : this.onload?.()); }
    });
    assert.equal((await LoadingUtils.LoadImages(['one', 'two'])).length, 2);
    await assert.rejects(LoadingUtils.LoadImages(['one', 'bad']), /Image load failed/);
    await assert.rejects(LoadingUtils.LoadImage('wait', { timeout: 5 }), /timed out/);
});
