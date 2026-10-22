const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const window = {};
vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/js/lesson-engine.js'), 'utf8'), {
    window, document: { body: { dataset: { lessonRenderer: 'custom' } } }
});
vm.runInNewContext(fs.readFileSync(path.join(root, 'content/drawing-cubic-graphs/cubics.js'), 'utf8'), { window });
const Q = window.Cubics, E = window.Maths1to9LessonEngine;
const plain = value => JSON.parse(JSON.stringify(value));

test('cubics formats all specified equations and worked examples', () => {
    for (const [a, c, expected] of [[1,0,'y = x³'], [1,1,'y = x³ + 1'], [1,-2,'y = x³ − 2'], [2,-1,'y = 2x³ − 1']]) {
        assert.equal(Q.cubicText({ a, c }), expected);
    }
    for (const [a, c, x, expected] of [
        [1,1,-2,'(−2)³ + 1 = −8 + 1 = −7'], [1,-1,2,'2³ − 1 = 8 − 1 = 7'],
        [2,-1,-2,'2 × (−2)³ − 1 = 2 × (−8) − 1 = −17'], [1,2,0,'0³ + 2 = 0 + 2 = 2']
    ]) assert.equal(Q.workingText({ a, c }, x), expected);
    assert.equal(Q.valueOf({ a: 2, c: -1 }, -2), -17);
    assert.equal(Q.prose('y = x³ + 1 at (−2, −7)'), 'y\u00a0=\u00a0x³\u00a0+\u00a01 at (−2,\u00a0−7)');
});

test('cubic plot domains stop at the grid edges', () => {
    for (const a of [1, 2]) for (let c = -2; c <= 2; c++) {
        const form = { a, c }, domain = Q.plotDomain(form);
        assert.ok(domain[0] >= -2.3 && domain[1] <= 2.3);
        for (const x of domain) assert.ok(Math.abs(Q.valueOf(form, x)) <= 10 + 1e-12);
    }
    const plots = [];
    const board = { plot(fn, options) { plots.push({ fn, options }); return {}; } };
    Q.joinDrawing(board, { a: 1, c: 1 }, 3);
    assert.ok(plots[0].options.domain.every(x => plots[0].fn(x) <= 10 + 1e-12));
});

test('cubic value rules cover every misconception and skip equal or duplicate answers', () => {
    const feedback = new Set();
    for (const a of [1, 2]) for (const c of [-3, -2, -1, 0, 1, 2, 3]) for (let x = -3; x <= 3; x++) {
        const form = { a, c }, rules = Q.valueRules(form, x), values = rules.map(r => Number(r.value));
        assert.equal(new Set(values).size, values.length);
        assert.ok(!values.includes(Q.valueOf(form, x)));
        for (const rule of rules) feedback.add(rule.feedback);
        if (x >= 0) assert.ok(!rules.some(r => r.feedback.startsWith('A negative')));
        if (a !== 2) assert.ok(!rules.some(r => r.feedback.startsWith('Cube first, then multiply')));
        if (!c) assert.ok(!rules.some(r => /forget|sign of the number|before cubing/.test(r.feedback)));
    }
    for (const pattern of [/negative cubed/, /multiplying by 3/, /That's squaring/, /multiply by 2/, /before cubing/, /sign of the number/, /Don't forget/]) {
        assert.ok([...feedback].some(text => pattern.test(text)), pattern.toString());
    }
    assert.deepEqual(plain(Q.valueRules({ a: 1, c: 1 }, -2)).map(r => Number(r.value)), [9, -5, 5, -1, -9, -8]);
    // Triple and square coincide for x = 3; only the earlier row survives.
    assert.equal(Q.valueRules({ a: 1, c: 0 }, 3).length, 1);
});

test('cubic table rules distinguish sign errors, squaring, zero, every single field and fallback', () => {
    const form = { a: 1, c: 1 }, widget = Q.tableWidget(form);
    const answer = Object.fromEntries(Q.xs.map(x => [`x${x}`, String(Q.valueOf(form, x))]));
    assert.equal(widget.mark(answer).correct, true);
    assert.match(widget.mark({ ...answer, 'x-2': '9', 'x-1': '2' }).feedback, /negative cubed/);
    assert.match(widget.mark(Object.fromEntries(Q.xs.map(x => [`x${x}`, String(x * x + 1)]))).feedback, /That's squaring/);
    assert.match(widget.mark({ ...answer, x0: '99' }).feedback, /When x\s=\s0/);
    for (const x of [-2, -1, 1, 2]) {
        assert.equal(widget.mark({ ...answer, [`x${x}`]: '99' }).feedback,
            Q.prose(`One box is wrong. Work out that one again: ${Q.workingText(form, x)}`));
    }
    assert.equal(widget.mark(Object.fromEntries(Q.xs.map(x => [`x${x}`, '99']))).feedback,
        'Cube x first, then the rest. Work each column out on its own.');
    assert.equal(widget.isEmpty(null), true);
    assert.equal(widget.isEmpty({ ...answer, x0: '' }), true);
    for (const sign of ['-', '−', '–']) assert.equal(Q.readNumber(`${sign}7`), -7);
});

test('cubic plotting marks swaps, signs, odd lines and zero coordinates in order', () => {
    const target = [-2, -7];
    assert.match(Q.plotMark([-7, -2], target).feedback, /across first/);
    assert.match(Q.plotMark([2, -7], target).feedback, /x sign/);
    assert.match(Q.plotMark([-2, 7], target).feedback, /y sign/);
    for (const y of [-8, -6]) assert.equal(Q.plotMark([-2, y], target).feedback,
        'Count carefully: the y-axis goes up in 2s. y = −7 is on the faint line between −8 and −6.');
    assert.equal(Q.plotMark([3, 4], target).feedback, 'Start at (0, 0). Go across to x = −2, then down to y = −7.');
    assert.match(Q.plotMark([0, 0], [0, 1]).feedback, /faint line between 0 and 2/);
    assert.match(Q.plotMark([3, 3], [-1, 0]).feedback, /stay on the x-axis/);
    assert.equal(Q.plotMark([0, 0], [0, 0]).correct, true);
    assert.equal(Q.plotMark(target, target).correct, true);
});

test('cubic generator alternates all typed types with three distinct choices and repeats by seed', () => {
    const seen = new Set();
    for (let i = 0; i < 1000; i++) {
        const seed = Math.imul(i, 2654435761) >>> 0;
        const session = Q.pick(E.seededRandom(seed));
        assert.deepEqual(plain(session), plain(Q.pick(E.seededRandom(seed))));
        assert.equal(session.length, 6);
        assert.equal(new Set(session.map(item => item.type)).size, 6);
        assert.ok(session[0].nonZero);
        session.forEach((item, index) => {
            seen.add(item.type);
            assert.ok((index % 2 ? Q.choiceTypes : Q.typedTypes).includes(item.type));
            const q = Q.generate(item, E.seededRandom(item.seed));
            assert.deepEqual(plain(q), plain(Q.generate(item, E.seededRandom(item.seed))));
            if (q.options) {
                assert.equal(q.options.length, 4);
                assert.equal(new Set(q.options.map(o => o.label)).size, 4);
                assert.equal(q.options.filter(o => o.correct).length, 1);
                assert.ok(q.options.every(o => o.feedback));
            }
            if (item.type === 'table') for (const value of Object.values(q.widget.answers)) assert.ok(Math.abs(Number(value)) <= 10);
            if (item.type === 'plot') {
                // Extract the correct target from marking, independently of the generated equation.
                const matches = [];
                for (let x = -2; x <= 2; x++) for (let y = -10; y <= 10; y++) if (q.widget.mark([x, y]).correct) matches.push([x, y]);
                assert.equal(matches.length, 1);
            }
        });
    }
    assert.equal(seen.size, 7);
});
