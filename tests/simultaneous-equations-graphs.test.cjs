const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const window = {};
vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/js/lesson-engine.js'), 'utf8'),
    { window, document: { body: { dataset: { lessonRenderer: 'custom' } } } });
vm.runInNewContext(fs.readFileSync(path.join(root, 'content/simultaneous-equations-graphs/simultaneous.js'), 'utf8'), { window });
const T = window.Simultaneous, E = window.Maths1to9LessonEngine;
const plain = value => JSON.parse(JSON.stringify(value));
const linesAt = (h, k) => [{ m: 1, c: k - h }, { m: -2, c: k + 2 * h }];

test('simultaneous crossings give reduced exact fractions and numeric values, including negatives and zero', () => {
    for (const [lines, x, y, exact] of [
        [linesAt(1, 2), 1, 2, { x: { numerator: 1, denominator: 1 }, y: { numerator: 2, denominator: 1 } }],
        [[{ m: 2, c: 0 }, { m: -1, c: 4 }], 4 / 3, 8 / 3, { x: { numerator: 4, denominator: 3 }, y: { numerator: 8, denominator: 3 } }],
        [[{ m: -2, c: 0 }, { m: 1, c: 2 }], -2 / 3, 4 / 3, { x: { numerator: -2, denominator: 3 }, y: { numerator: 4, denominator: 3 } }],
        [linesAt(0, -2), 0, -2, { x: { numerator: 0, denominator: 1 }, y: { numerator: -2, denominator: 1 } }]
    ]) {
        assert.deepEqual(plain(T.crossing(...lines)), { x, y, exact });
        assert.ok(lines.every(line => T.onLine(line, [x, y])));
        assert.ok(!T.onLine(lines[0], [x, y + 1]));
    }
    assert.throws(() => T.crossing({ m: 1, c: 1 }, { m: 1, c: 2 }), /different gradients/);
});

test('simultaneous equation text covers coefficients, signs, zero intercepts and coordinates', () => {
    for (const [m, c, expected] of [[2, 7, 'y = 2x + 7'], [-1, 4, 'y = −x + 4'], [3, 0, 'y = 3x'], [1, -2, 'y = x − 2'], [-2, -3, 'y = −2x − 3'], [0, -1, 'y = −1']]) {
        assert.equal(T.equationText({ m, c }), expected);
    }
    assert.equal(T.coordinate([-1, 5]), '(−1,\u00a05)');
    assert.equal(T.solution([-1, 5]), 'x = −1, y = 5');
});

test('simultaneous feedback rules cover each row in order and omit duplicates, answers and inapplicable rows', () => {
    const rules = plain(T.solutionRules(linesAt(2, -1), [2, -1]));
    assert.deepEqual(rules.map(r => r.value), [
        { x: '-1', y: '2' }, { x: '-2', y: '1' }, { x: '-2' }, { y: '1' },
        { x: '0', y: '-3' }, { x: '0', y: '3' }, { x: '2' }, { y: '-1' }
    ]);
    assert.equal(rules[0].feedback, 'Write x first, then y: x = 2, y = −1.');
    assert.match(rules[1].feedback, /Check both signs/);
    assert.match(rules[2].feedback, /Right of 0 is positive/);
    assert.match(rules[3].feedback, /Below 0 is negative/);
    assert.match(rules[4].feedback, /y = x − 3 crosses/);
    assert.match(rules[5].feedback, /y = −2x \+ 3 crosses/);
    assert.match(rules[6].feedback, /x is right/);
    assert.match(rules[7].feedback, /y is right/);
    assert.match(T.solutionRules(linesAt(-2, 1), [-2, 1])[2].feedback, /Left of 0 is negative/);
    assert.match(T.solutionRules(linesAt(-2, 1), [-2, 1])[3].feedback, /Above 0 is positive/);
    for (let h = -4; h <= 4; h++) for (let k = -4; k <= 4; k++) {
        const list = plain(T.solutionRules(linesAt(h, k), [h, k]));
        const values = list.map(r => JSON.stringify(r.value));
        assert.equal(values.length, new Set(values).size);
        assert.ok(!values.includes(JSON.stringify({ x: String(h), y: String(k) })));
        assert.equal(list.some(r => /Check both signs/.test(r.feedback)), h !== 0 && k !== 0 && h !== -k);
        if (h === 0) assert.ok(!list.some(r => /Check the sign of x|crosses the y-axis/.test(r.feedback)));
        if (k === 0) assert.ok(!list.some(r => /Check the sign of y/.test(r.feedback)));
        if (h === k) assert.ok(!list.some(r => /Write x first/.test(r.feedback)));
    }
    const repeated = plain(T.solutionRules([{ m: 1, c: 3 }, { m: -1, c: 3 }], [0, 3]));
    assert.ok(!repeated.some(r => /crosses the y-axis/.test(r.feedback)));
});

test('simultaneous generator is seeded, alternates three distinct typed kinds with one of each choice type and valid maths', () => {
    for (let seed = 0; seed < 500; seed++) {
        const items = T.pick(E.seededRandom(seed));
        assert.deepEqual(plain(T.pick(E.seededRandom(seed))), plain(items));
        assert.deepEqual(plain(items.map(i => i.type === 'read-solution')), [true, false, true, false, true, false]);
        const typed = items.filter(i => i.type === 'read-solution');
        assert.equal(new Set(typed.map(i => i.kind)).size, 3);
        assert.equal(new Set(typed.flatMap(i => i.lines.map(l => `${l.m}:${l.c}`))).size, 6);
        assert.deepEqual(plain(items.filter(i => i.type !== 'read-solution').map(i => i.type).sort()), plain([...T.choiceTypes].sort()));
        for (const item of items) {
            const card = T.generate(item, E.seededRandom(item.seed));
            const { x, y } = T.crossing(...card.lines);
            assert.equal(card.lines.length, 2);
            assert.ok(card.lines[0].m * card.lines[1].m < 0);
            if (item.type !== 'estimate') {
                assert.ok(card.lines.every(l => Number.isInteger(l.m) && Math.abs(l.m) >= 1 && Math.abs(l.m) <= 3 && Math.abs(l.c) <= 8));
                assert.ok(Number.isInteger(x) && Number.isInteger(y) && Math.abs(x) <= 4 && Math.abs(y) <= 4);
                if (item.kind === 'positive') assert.ok(x > 0 && y > 0);
                if (item.kind === 'negative-x') assert.ok(x < 0 && y > 0);
                if (item.kind === 'negative-y') assert.ok(x > 0 && y < 0);
                if (item.kind === 'on-axis') assert.ok((x === 0) !== (y === 0));
            }
            if (card.options) {
                assert.equal(card.options.length, 4);
                assert.equal(new Set(card.options.map(o => o.label)).size, 4);
                assert.equal(card.options.filter(o => o.correct).length, 1);
                assert.ok(card.options.every(o => o.feedback));
                if (item.type === 'which-solution') {
                    assert.ok(!typed.some(t => t.kind === item.kind));
                    assert.equal(card.options.find(o => o.correct).label, T.mathText(T.solution([x, y])));
                }
                if (item.type === 'estimate') assert.equal(card.options.find(o => o.correct).label,
                    T.mathText(T.solution([x, y].map(v => Number(v.toFixed(1))), '≈')));
                if (item.type === 'both-lines') {
                    assert.equal(card.lines.filter(l => T.onLine(l, card.point)).length, 1);
                    assert.ok(card.point.every(v => Number.isInteger(v) && Math.abs(v) <= 4));
                    assert.ok(Math.hypot(card.point[0] - x, card.point[1] - y) >= 2);
                }
            } else assert.deepEqual(plain(card.answer), { x: String(x), y: String(y) });
            const rebuilt = T.generate(item, E.seededRandom(item.seed));
            assert.deepEqual(plain({ ...rebuilt, figure: null }), plain({ ...card, figure: null }));
        }
    }
});

test('simultaneous registries place the new lesson and skill immediately after their required neighbours', () => {
    const json = file => JSON.parse(fs.readFileSync(path.join(root, 'content', file), 'utf8'));
    const skills = json('skills.json').skills;
    const skill = skills[skills.findIndex(s => s.id === 'simultaneous-substitution') + 1];
    assert.deepEqual(skill, { id: 'simultaneous-graphs', title: 'Solve simultaneous equations using graphs', content_references: ['A19'], recommended_prerequisites: ['plot-linear-graphs', 'coordinates-four-quadrants'] });
    const lessons = json('curriculum.json').categories.flatMap(c => c.lessons);
    assert.equal(lessons[lessons.findIndex(l => l.folder === 'finding-the-equation-of-a-line') + 1].folder, 'simultaneous-equations-graphs');
    const graphs = json('collections.json').collections.find(c => c.id === 'graphs');
    assert.ok(graphs);
    assert.equal(graphs.lessons[graphs.lessons.indexOf('finding-the-equation-of-a-line') + 1], 'simultaneous-equations-graphs');
});


test('simultaneous line ends stop at all four grid edges, including steep, shallow and corner crossings', () => {
    for (const [line, expected] of [
        [{ m: 4, c: 0 }, [[-1.25, -5], [1.25, 5]]],
        [{ m: 0.25, c: 1 }, [[-5, -0.25], [5, 2.25]]],
        [{ m: 1, c: 0 }, [[-5, -5], [5, 5]]],
        [{ m: -1, c: 0 }, [[-5, 5], [5, -5]]],
        [{ m: 2, c: 1 }, [[-3, -5], [2, 5]]],
        [{ m: -2, c: 1 }, [[-2, 5], [3, -5]]],
        [{ m: 0, c: 2 }, [[-5, 2], [5, 2]]]
    ]) assert.deepEqual(plain(T.lineEnds(line)), expected);
    assert.deepEqual(plain(T.lineEnds({ m: -2, c: 4 }, T.LEARN_GRID)), [[-1, 6], [4, -4]]);
    assert.deepEqual(plain(T.lineEnds({ m: 1, c: 20 })), []);
    for (let seed = 0; seed < 100; seed++) for (const item of T.pick(E.seededRandom(seed))) {
        const card = T.generate(item, E.seededRandom(item.seed));
        for (const line of card.lines) {
            const ends = T.lineEnds(line);
            assert.equal(ends.length, 2);
            ends.forEach(point => {
                assert.ok(T.onLine(line, point));
                assert.ok(point.every(v => v >= -5 && v <= 5));
                assert.ok(point.some(v => Math.abs(v) === 5));
            });
        }
    }
});

test('simultaneous maths text keeps equations, values and working together without joining prose', () => {
    for (const text of ['y = 4 − 2x', 'x = −1', 'x ≈ 1.3', '4 − 2 × 0 = 4', 'y = x + 1', '≈ means']) {
        assert.equal(T.mathText(text), text.replace(/ /g, '\u00a0'));
    }
    assert.equal(T.mathText('Read x, then y.'), 'Read x, then\u00a0y.');
    assert.equal(T.mathText('It is on y = 4 − 2x.'), 'It is on y\u00a0=\u00a04\u00a0−\u00a02x.');
    assert.equal(T.mathText('(−1, 1)'), '(−1, 1)');
});
