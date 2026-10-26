const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const window = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/graph.js'), 'utf8'), { window });
const graph = window.Maths1to9Graph;
const plain = value => JSON.parse(JSON.stringify(value));

test('graph helpers load without JSXGraph; only creating a board requires it', () => {
    assert.equal(typeof graph.snap, 'function');
    assert.throws(() => graph.create({}), {
        message: 'Load vendor/jsxgraph/jsxgraphcore.js before creating a graph.'
    });
    const widget = graph.questionWidget({});
    assert.throws(() => widget.render({}, { value: null, editable: true }), {
        message: 'Load vendor/jsxgraph/jsxgraphcore.js before creating a graph.'
    });
});

test('graph snap rounds halfway points towards positive infinity, including negatives and edges', () => {
    for (const [input, expected] of [
        [[2.4, 3.6], [2, 4]], [[2.49, 2.5], [2, 3]], [[2.51, -2.49], [3, -2]],
        [[-2.51, -2.5], [-3, -2]], [[-0.4, -0.5], [0, 0]], [[-0.51, 0.5], [-1, 1]],
        [[-6, 6], [-6, 6]], [[-5.51, 5.51], [-6, 6]]
    ]) {
        const original = [...input];
        assert.deepEqual(plain(graph.snap(input)), expected);
        assert.deepEqual(input, original);
    }
    assert.equal(Object.is(graph.snap([-0.4, 0])[0], -0), false);
});

test('graph classify distinguishes horizontal, vertical, axes and fractional slopes', () => {
    for (const [from, to, expected] of [
        [[-3, 4], [5, 4], { kind: 'horizontal', value: 4 }],
        [[-2, -3], [-2, 5], { kind: 'vertical', value: -2 }],
        [[-6, 0], [6, 0], { kind: 'horizontal', value: 0 }],
        [[0, -6], [0, 6], { kind: 'vertical', value: 0 }],
        [[0, -3], [2, 1], { kind: 'sloping', m: 2, c: -3 }],
        [[0, 2], [2, 0], { kind: 'sloping', m: -1, c: 2 }],
        [[-2, 0], [2, 2], { kind: 'sloping', m: 0.5, c: 1 }],
        [[0, 1], [4, -1], { kind: 'sloping', m: -0.5, c: 1 }]
    ]) assert.deepEqual(plain(graph.classify({ from, to })), expected);
});

test('graph length measures horizontal, vertical and sloping segments in grid units', () => {
    assert.equal(graph.length({ from: [-3, 4], to: [5, 4] }), 8);
    assert.equal(graph.length({ from: [-2, -3], to: [-2, 5] }), 8);
    assert.equal(graph.length({ from: [0, 0], to: [3, 4] }), 5);
    assert.equal(graph.length({ from: [1, 1], to: [1, 1] }), 0);
    assert.equal(graph.length({ from: [0, 0], to: [1, 1] }), Math.SQRT2);
});

test('graph number and point labels use Unicode minus and normalise negative zero', () => {
    assert.equal(graph.formatNumber(-2), '−2');
    assert.equal(graph.formatNumber(-0), '0');
    assert.equal(graph.formatNumber(2.5), '2.5');
    assert.equal(graph.formatPoint([-3, 4]), '(−3, 4)');
    assert.equal(graph.formatPoint([-0.5, -2]), '(−0.5, −2)');
    assert.doesNotMatch(graph.formatNumber(-1e-7), /-/);
});

test('creating a graph rejects a detached host before reading colours or building a board', () => {
    const window = { JXG: {} };
    const document = {};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/graph.js'), 'utf8'), { window, document });
    assert.throws(() => window.Maths1to9Graph.create({ isConnected: false, ownerDocument: document }), {
        message: "Add the graph's container to the page before creating a graph."
    });
});

test('graph snap accepts axis steps, preserving halfway rounding and unit coordinates', () => {
    for (const [input, step, expected] of [
        [[1.2, 3.1], { x: 1, y: 2 }, [1, 4]],
        [[-1.2, -3.1], { x: 1, y: 2 }, [-1, -4]],
        [[2.99, 3], { x: 2, y: 2 }, [2, 4]],
        [[3, -3], { x: 2, y: 2 }, [4, -2]],
        [[3.01, -3.01], { x: 2, y: 2 }, [4, -4]],
        [[-0.5, -1], { x: 1, y: 2 }, [0, 0]],
        [[-0.51, -1.01], { x: 1, y: 2 }, [-1, -2]],
        [[-12, 6], { x: 2, y: 1 }, [-12, 6]],
        [[1.2, 3.1], { y: 2 }, [1, 4]],
        [[1.24, 1.25], { x: 0.5, y: 0.5 }, [1, 1.5]]
    ]) {
        assert.deepEqual(plain(graph.snap(input, step)), expected);
    }
    assert.equal(Object.is(graph.snap([-0.4, -0.8], { x: 1, y: 2 })[1], -0), false);
});


test('graph subdivisions snap halves, fifths and odd y values without floating-point noise', () => {
    assert.deepEqual(plain(graph.snap([0.49, 3.1], { x: 1, y: 2 }, { x: 2, y: 2 })), [0.5, 3]);
    assert.deepEqual(plain(graph.snap([-0.26, -7.1], { y: 2 }, { x: 2, y: 2 })), [-0.5, -7]);
    assert.deepEqual(plain(graph.snap([0.61, -0.61], {}, { x: 5, y: 5 })), [0.6, -0.6]);
    assert.deepEqual(plain(graph.snap([0.3, -0.3], {}, { x: 5, y: 5 })), [0.4, -0.2]);
    assert.deepEqual(plain(graph.snap([0.7, -0.7], {}, { x: 5, y: 5 })), [0.8, -0.6]);
    assert.deepEqual(plain(graph.snap([0.1 + 0.2, -0.1 - 0.2], { x: 0.1, y: 0.1 })), [0.3, -0.3]);
    assert.deepEqual(plain(graph.snap([1.2, 3.1], { y: 2 }, {})), [1, 4]);
    assert.equal(graph.formatNumber(0.1 + 0.2), '0.3');
    assert.equal(graph.formatNumber(-0.25), '−0.25');
});

test('graph subdivisions reject malformed values', () => {
    for (const value of [null, [], 2, { x: 0 }, { y: -1 }, { x: 1.5 }, { y: Infinity }, { x: undefined }]) {
        assert.throws(() => graph.snap([0, 0], {}, value), { name: 'RangeError' });
    }
});

test('graph aspect needs explicit steps', () => {
    assert.throws(() => graph.create({}, { aspect: 1 }), { name: 'TypeError', message: 'Graph aspect requires step.' });
});

test('default graph retains its bounding box, square shape and axis letters', () => {
    const labels = [];
    let settings;
    const node = () => ({ style: { setProperty() { assert.fail('Default graph must not override its square shape.'); } },
        append() {}, setAttribute() {}, addEventListener() {} });
    const document = { createElement: node, body: node() };
    const board = { create(kind, args) { if (kind === 'text') labels.push(args[2]); return {}; } };
    const stop = new Error('Axes captured');
    const window = { JXG: { JSXGraph: { initBoard(surface, options) { settings = options; return board; } } } };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/graph.js'), 'utf8'), {
        window, document, getComputedStyle: () => ({ getPropertyValue: () => '' }),
        ResizeObserver: class { constructor() { throw stop; } }
    });
    assert.throws(() => window.Maths1to9Graph.create({ isConnected: true, ownerDocument: document, append() {} }), error => error === stop);
    assert.deepEqual(plain(settings.boundingbox), [-6.8, 6.8, 6.8, -6.8]);
    assert.equal(settings.keepaspectratio, true);
    assert.deepEqual(labels.slice(-2), ['x', 'y']);
});

function labelBoard() {
    const texts = [];
    const node = () => ({ style: { setProperty() {} }, append() {}, setAttribute() {}, addEventListener() {} });
    const document = { createElement: node, body: node() };
    const board = { unitX: 25, unitY: 25, origin: { scrCoords: [1, 170, 170] },
        create(kind, args, attributes) {
            const object = { rendNode: { getBoundingClientRect: () => ({ width: String(args[2] ?? '').length * 7, height: 12 }) } };
            if (kind === 'text') texts.push({ args, attributes, object });
            return object;
        }, update() {}, removeObject() {} };
    const window = { JXG: { JSXGraph: { initBoard: () => board } } };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/graph.js'), 'utf8'), {
        window, document, getComputedStyle: () => ({ getPropertyValue: property => property }),
        ResizeObserver: class { observe() {} }, MutationObserver: class { observe() {} }
    });
    const graph = window.Maths1to9Graph.create({ isConnected: true, ownerDocument: document, append() {} });
    return { graph, last: () => texts.at(-1), position: () => Array.from(texts.at(-1).args.slice(0, 2), fn => fn()) };
}
test('segment labels retain their original anchor and line tone without new options', () => {
    const fixture = labelBoard();
    fixture.graph.segment([-2, -2], [2, 2], { label: 'A' });
    assert.deepEqual(fixture.position(), [0.2, 0.3]);
    assert.equal(fixture.last().attributes.strokeColor, '--primary');
    assert.equal(fixture.last().attributes.anchorY, undefined);
});
test('segment labelTone changes the text independently and survives updates', () => {
    const fixture = labelBoard();
    const segment = fixture.graph.segment([-2, -2], [2, 2], { tone: 'neutral', label: 'A', labelTone: 'ink' });
    assert.equal(fixture.last().attributes.strokeColor, '--text');
    assert.equal(segment.settings.tone, 'neutral');
    assert.deepEqual(fixture.position(), [0.2, 0.3]);
    segment.update({ labelTone: 'muted' });
    assert.equal(fixture.last().attributes.strokeColor, '--text-muted');
});
test('opt-in segment labels use each side and clear marked points inside the grid', () => {
    for (const side of ['above', 'below', 'left', 'right']) {
        const fixture = labelBoard();
        fixture.graph.point([0, 2], { size: 'large' });
        fixture.graph.segment([-3, 0], [3, 0], { label: 'A', labelSide: side, labelTone: 'ink' });
        const [x, y] = fixture.position();
        const left = 170 + x * 25, top = 170 - y * 25;
        assert.ok(left >= 20 && left + 7 <= 320 && top >= 20 && top + 12 <= 320);
        assert.ok(top + 12 < 164 || top > 176, 'label must clear its own segment');
        assert.ok(left + 7 <= 159 || left >= 181 || top + 12 <= 109 || top >= 131, 'label must clear the marked point');
        assert.equal(fixture.last().attributes.anchorY, 'top');
        assert.equal(fixture.last().attributes.strokeColor, '--text');
    }
});
