const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.join(__dirname, '..');
const window = {};
vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/js/lesson-engine.js'), 'utf8'),
    { window, document: { body: { dataset: { lessonRenderer: 'custom' } } } });
vm.runInNewContext(fs.readFileSync(path.join(root, 'content/quadratic-turning-points/turning.js'), 'utf8'), { window });
const T = window.Turning, E = window.Maths1to9LessonEngine;
const plain = value => JSON.parse(JSON.stringify(value));

test('turning helpers give values, kinds and Unicode-minus coordinates', () => {
    assert.equal(T.valueOf({ a: 1, h: 1, k: -2 }, 3), 2);
    assert.equal(T.valueOf({ a: -1, h: -2, k: 3 }, 0), -1);
    assert.equal(T.kind({ a: 1, h: 0, k: 0 }), 'minimum');
    assert.equal(T.kind({ a: -1, h: 0, k: 0 }), 'maximum');
    assert.equal(T.coordinate([-3, 2]).replace(/ /g, ' '), '(−3, 2)');
    assert.doesNotMatch(T.coordinate([-3, -2]), /-/);
});

test('sliding dot positions stay on the curve and inside the grid, including the turning point', () => {
    const form = { a: 1, h: -1, k: -2 };
    const positions = T.positions(form);
    assert.ok(positions.some(([x, y]) => x === -1 && y === -2));
    for (const [x, y] of positions) {
        assert.equal(y, T.valueOf(form, x));
        assert.ok(y >= T.GRID.y[0] && y <= T.GRID.y[1]);
    }
});

test('turning rules cover every row in order and skip correct, duplicate and inapplicable values', () => {
    const rules = plain(T.turningRules({ a: -1, h: 2, k: 4 }));
    assert.deepEqual(rules.map(r => r.value), [
        { x: '4', y: '2' }, { x: '-2', y: '-4' }, { x: '-2' }, { y: '-4' }, { x: '0', y: '0' }, { x: '2' }, { y: '4' }]);
    assert.match(rules[0].feedback, /x-coordinate first/);
    assert.match(rules[2].feedback, /Right of 0 is positive/);
    assert.match(rules[4].feedback, /crosses the y-axis/);

    // h = 0: no x sign rule and no y-axis crossing; k = 0: no y sign rule.
    const onAxis = plain(T.turningRules({ a: 1, h: 0, k: -3 }));
    assert.ok(!onAxis.some(r => r.value.x === '0' && r.value.y !== undefined && r.value.y !== '-3' && /crosses/.test(r.feedback)));
    assert.ok(!onAxis.some(r => /x sign/.test(r.feedback)));
    assert.ok(!plain(T.turningRules({ a: 1, h: 2, k: 0 })).some(r => /y sign/.test(r.feedback)));

    // The y-axis crossing is skipped when it is off the grid: (x + 3)² + 2 crosses at 11.
    assert.ok(!plain(T.turningRules({ a: 1, h: -3, k: 2 })).some(r => /crosses/.test(r.feedback)));

    // No two-field rule is the answer, and no rule repeats.
    for (let h = -3; h <= 3; h++) for (let k = -4; k <= 4; k++) for (const a of [1, -1]) {
        const keys = T.turningRules({ a, h, k }).map(rule => JSON.stringify(rule.value));
        assert.equal(new Set(keys).size, keys.length);
        assert.ok(!keys.includes(JSON.stringify({ x: String(h), y: String(k) })));
    }
});

test('choice builders give one right option and real-mistake wrong options with no duplicates', () => {
    const trap = T.typeOptions({ a: -1, h: 1, k: -2 });
    assert.equal(trap.find(o => o.correct).label, 'Maximum');
    assert.match(trap.find(o => !o.correct).feedback, /below the x-axis/);
    assert.doesNotMatch(T.typeOptions({ a: 1, h: 1, k: -2 }).find(o => !o.correct).feedback, /above/);

    const which = T.whichOptions({ a: 1, h: -2, k: 1 }, E.seededRandom(1));
    assert.equal(which.filter(o => o.correct).length, 1);
    assert.equal(new Set(which.map(o => o.label)).size, which.length);
    assert.ok(which.some(o => /crosses the y-axis/.test(o.feedback)));

    assert.equal(T.whyOptions({ a: 1, h: 0, k: 2 }).length, 2);
    assert.match(T.whyOptions({ a: -1, h: 2, k: -1 })[1].label, /below the x-axis/);
});

test('practice sessions alternate typed and choice cards, use each choice type once, and include a trap', () => {
    for (let seed = 0; seed < 300; seed++) {
        const items = T.pick(E.seededRandom(seed));
        assert.deepEqual(plain(items.map(i => i.type === 'read-point')), [true, false, true, false, true, false]);
        assert.deepEqual(plain(items.filter(i => i.type !== 'read-point').map(i => i.type).sort()), plain([...T.choiceTypes].sort()));
        assert.equal(items.filter(i => i.trap).length, 1);
        assert.deepEqual(plain(T.pick(E.seededRandom(seed))), plain(items));
        for (const item of items) {
            const card = T.generate(item, E.seededRandom(item.seed));
            const { a, h, k } = card.form;
            assert.ok(h >= -3 && h <= 3 && h !== k && !(h === 0 && k === 0));
            assert.ok(a === 1 ? k >= -4 && k <= 2 : k >= -2 && k <= 4);
            if (item.trap) assert.ok(a === 1 ? k > 0 : k < 0);
            if (card.options) {
                assert.equal(card.options.filter(o => o.correct).length, 1);
                assert.equal(new Set(card.options.map(o => o.label)).size, card.options.length);
            } else assert.deepEqual(plain(card.answer), { x: String(h), y: String(k) });
            assert.deepEqual(plain(T.generate(item, E.seededRandom(item.seed)).form), plain(card.form));
        }
    }
});
