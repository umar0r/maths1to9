const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const file = path.join(__dirname, '../assets/js/diagram.js');
const diagram = require(file);
const plain = value => JSON.parse(JSON.stringify(value));
const close = (actual, expected, message) =>
    assert.ok(Math.abs(actual - expected) < 1e-9, `${message}: ${actual} ≠ ${expected}`);

test('diagram loads with no window and only creating one needs a browser', () => {
    const window = {};
    vm.runInNewContext(fs.readFileSync(file, 'utf8'), { window });
    for (const name of ['fromBearing', 'bearingOf', 'angleAt', 'formatAngle',
        'formatBearing', 'formatNumber', 'regularPolygon', 'labelDirection', 'snapAngle']) {
        assert.equal(typeof window.Maths1to9Diagram[name], 'function', name);
    }
    assert.throws(() => diagram.create({}), {
        message: 'Maths1to9Diagram.create needs a browser.'
    });
    assert.throws(() => diagram.questionWidget({}).render({}, { value: null, editable: true }), {
        message: 'Maths1to9Diagram.create needs a browser.'
    });
});

test('fromBearing and bearingOf are inverse for every test bearing', () => {
    const start = [3, -2];
    for (const bearing of [0, 45, 90, 135, 180, 270, 305, 359]) {
        const end = diagram.fromBearing(start, bearing, 5);
        close(diagram.bearingOf(start, end), bearing, `bearing ${bearing}`);
        close(Math.hypot(end[0] - start[0], end[1] - start[1]), 5, `distance ${bearing}`);
    }
    const north = diagram.fromBearing([0, 0], 0, 1);
    assert.deepEqual(plain(north), [0, 1]);
    const east = diagram.fromBearing([0, 0], 90, 1);
    assert.ok(Math.abs(east[0] - 1) < 1e-9 && Math.abs(east[1]) < 1e-9);
    close(diagram.bearingOf([0, 0], [0, 0]), 0, 'a point bearing from itself');
});

test('angleAt measures smaller, anticlockwise and clockwise turns, reflex and straight', () => {
    const vertex = [0, 0];
    const right = [1, 0];
    const up = [0, 1];
    const down = [0, -1];
    const left = [-1, 0];
    close(diagram.angleAt(right, vertex, up), 90, 'smaller right angle');
    close(diagram.angleAt(right, vertex, up, 'anticlockwise'), 90, 'anticlockwise quarter');
    close(diagram.angleAt(right, vertex, up, 'clockwise'), 270, 'clockwise reflex');
    close(diagram.angleAt(right, vertex, down, 'anticlockwise'), 270, 'anticlockwise reflex');
    close(diagram.angleAt(right, vertex, down, 'clockwise'), 90, 'clockwise quarter');
    close(diagram.angleAt(right, vertex, down), 90, 'smaller picks the quarter');
    close(diagram.angleAt(right, vertex, left), 180, 'straight: smaller');
    close(diagram.angleAt(right, vertex, left, 'anticlockwise'), 180, 'straight: anticlockwise');
    close(diagram.angleAt(right, vertex, left, 'clockwise'), 180, 'straight: clockwise');
    close(diagram.angleAt(up, vertex, up), 0, 'the same direction twice');
    const diagonal = [Math.cos(Math.PI / 3), Math.sin(Math.PI / 3)];
    close(diagram.angleAt(right, vertex, diagonal), 60, 'smaller 60 degrees');
    close(diagram.angleAt(right, vertex, diagonal, 'clockwise'), 300, 'clockwise 300 degrees');
});

test('formatBearing always shows three figures and wraps at 360', () => {
    for (const [value, expected] of [[0, '000°'], [5, '005°'], [58, '058°'],
        [128, '128°'], [359.6, '000°'], [360, '000°'], [305, '305°'], [999, '279°']]) {
        assert.equal(diagram.formatBearing(value), expected, `formatBearing(${value})`);
    }
    assert.equal(diagram.formatAngle(58), '58°');
    assert.equal(diagram.formatAngle(-12), '−12°');
});

test('regularPolygon returns equal sides and the right interior angle', () => {
    for (const count of [3, 4, 6, 8]) {
        const corners = diagram.regularPolygon(count, [1, 2], 3);
        assert.equal(corners.length, count);
        const sides = corners.map((corner, index) => {
            const next = corners[(index + 1) % count];
            return Math.hypot(next[0] - corner[0], next[1] - corner[1]);
        });
        sides.forEach((side, index) => close(side, sides[0], `n=${count} side ${index}`));
        const interior = corners.map((corner, index) =>
            diagram.angleAt(corners[(index + count - 1) % count], corner,
                corners[(index + 1) % count]));
        interior.forEach((value, index) =>
            close(value, ((count - 2) * 180) / count, `n=${count} angle ${index}`));
        close(corners[0][0], 1, 'the first corner starts above the centre');
        close(corners[0][1], 5, 'the first corner is due north by default');
    }
    const square = diagram.regularPolygon(4, [0, 0], 1, 0);
    const fromStart = diagram.regularPolygon(4, [0, 0], 1, 180);
    assert.notDeepEqual(plain(square[0]), plain(fromStart[0]), 'startAngle rotates the shape');
});

test('labelDirection finds the middle of the widest gap', () => {
    assert.equal(diagram.labelDirection([]), 45);
    close(diagram.labelDirection([0]), 180, 'one direction');
    close(diagram.labelDirection([0, 180]), 90, 'two opposite directions');
    close(diagram.labelDirection([350, 10]), 180, 'two directions across the wrap');
    close(diagram.labelDirection([0, 90, 180, 270]), 45, 'a four-way crossing');
    close(diagram.labelDirection([0, 120, 240]), 60, 'three around a point');
    close(diagram.labelDirection([0, 20, 90]), 225, 'the widest gap wins');
});

test('snapAngle rounds to the nearest step and wraps into one turn', () => {
    for (const [angle, step, expected] of [[58, 1, 58], [58.4, 1, 58], [58.6, 1, 59],
        [-1, 1, 359], [359.6, 1, 0], [122, 5, 120], [123, 5, 125], [180, 15, 180]]) {
        close(diagram.snapAngle(angle, step), expected, `snapAngle(${angle}, ${step})`);
    }
});

test('formatNumber uses a real minus sign', () => {
    assert.equal(diagram.formatNumber(-2.5), '−2.5');
    assert.equal(diagram.formatNumber(-0), '0');
    assert.equal(diagram.formatPoint([-3, 4]), '(−3, 4)');
    assert.doesNotMatch(diagram.formatNumber(-1e-7), /-/);
});
