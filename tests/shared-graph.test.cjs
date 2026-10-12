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
