const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const window = {};
vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/js/lesson-engine.js'), 'utf8'), { window, document: { body: { dataset: { lessonRenderer: 'custom' } } } });
vm.runInNewContext(fs.readFileSync(path.join(root, 'content/gradient-and-intercept/equations.js'), 'utf8'), { window });
const E = window.GradientIntercept;
const plain = value => JSON.parse(JSON.stringify(value));
const text = value => value.replace(/\u00a0/g, ' ');

test('gradient and intercept equation text covers signs, hidden ones, zero terms and nonbreaking spacing', () => {
    for (const [m, c, expected] of [[2, 3, 'y = 2x + 3'], [2, -3, 'y = 2x − 3'], [1, 4, 'y = x + 4'],
        [-1, 4, 'y = −x + 4'], [3, 0, 'y = 3x'], [-2, 0, 'y = −2x'], [0, 3, 'y = 3'], [0, -3, 'y = −3']]) {
        assert.equal(text(E.equationText(m, c)), expected);
        assert.ok(!E.equationText(m, c).includes(' '));
    }
    assert.equal(E.coordinate(-2, 3), '(−2,\u00a03)');
});
test('gradient and intercept equation HTML labels highlighted parts and reveals hidden numbers', () => {
    assert.match(E.equationHtml(-1, 4, { showHidden: true }), /equation-hidden">−1<\/span><i>x<\/i>/);
    assert.match(E.equationHtml(1, 4, { showHidden: true }), /equation-hidden">1<\/span>/);
    assert.match(E.equationHtml(3, 0, { showHidden: true }), /equation-hidden">&nbsp;\+&nbsp;0/);
    assert.doesNotMatch(E.equationHtml(3, 0), /equation-hidden/);
    assert.match(E.equationHtml(2, -3, { highlight: 'm' }), /2<small>gradient/);
    assert.doesNotMatch(E.equationHtml(2, -3, { highlight: 'm' }), /<small>y-intercept/);
    assert.match(E.equationHtml(2, -3, { highlight: 'c' }), /−&nbsp;3<small>y-intercept/);
    assert.equal((E.equationHtml(2, 3, { highlight: 'both' }).match(/is-highlighted/g) || []).length, 2);
    assert.doesNotMatch(E.equationHtml(0, 3), /<i>x/);
});
test('gradient and intercept reading rules cover each row in order and skip inapplicable or equal answers', () => {
    const rules = (m, c) => plain(E.readingRules(m, c));
    assert.deepEqual(rules(-4, -7).map(r => r.value), [{ m: '-7', c: '-4' }, { m: '4' }, { c: '7' }, { m: '-4' }, { c: '-7' }]);
    assert.match(rules(-4, -7)[1].feedback, /number multiplying x is −4/);
    assert.match(rules(-4, -7)[2].feedback, /subtracts 7/);
    assert.match(rules(5, 3)[1].feedback, /positive: 5/);
    assert.match(rules(5, 3)[2].feedback, /adds 3/);
    assert.match(rules(1, -5)[1].feedback, /^x means 1x/);
    assert.match(rules(-1, 6)[1].feedback, /^−x means −1x/);
    assert.match(text(rules(6, 0)[0].feedback), /y = 6x means y = 6x \+ 0/);
    assert.deepEqual(rules(6, 0)[0].value, { c: '6' });
    assert.deepEqual(rules(6, 0)[1].value, { m: '0', c: '6' });
    assert.equal(rules(6, 0).length, 5);
    assert.equal(rules(2, 2).some(r => r.value.m === '2' && r.value.c === '2'), false);
    assert.equal(rules(0, 3).some(r => r.value.m === '0' && Object.keys(r.value).length === 1), true);
    assert.equal(rules(0, 3).length, 4);
    for (const [m, c] of [[-1, 6], [1, -5], [6, 0], [-4, -7], [5, 3]]) {
        const r = rules(m, c);
        assert.match(r.at(-2).feedback, /^The gradient is right/);
        assert.match(r.at(-1).feedback, /^The y-intercept is right/);
    }
});
test('gradient and intercept seeded sessions alternate four distinct typed types and every choice type', () => {
    const { seededRandom } = window.Maths1to9LessonEngine;
    for (let seed = 0; seed < 500; seed++) {
        const items = plain(E.pick(seededRandom(seed)));
        assert.deepEqual(items, plain(E.pick(seededRandom(seed))));
        assert.equal(items.length, 8);
        assert.equal(new Set(items.filter((_, index) => index % 2 === 0).map(item => item.type)).size, 4);
        assert.deepEqual(items.filter((_, index) => index % 2 === 1).map(item => item.type).sort(), [...E.choiceTypes].sort());
        items.forEach((item, index) => {
            const question = plain(E.generate(item, seededRandom(item.seed)));
            assert.deepEqual(question, plain(E.generate(item, seededRandom(item.seed))));
            assert.equal(question.input, index % 2 === 0 ? 'number' : 'choice');
            if (question.input === 'number') {
                const m = Number(question.answer.m), c = Number(question.answer.c);
                assert.notEqual(Math.abs(m), Math.abs(c));
                if (item.type === 'positive') assert.ok(m > 0 && c > 0);
                if (item.type === 'negative-intercept') assert.ok(m > 0 && c < 0);
                if (item.type === 'negative-gradient') assert.ok(m < 0 && c > 0);
                if (item.type === 'both-negative') assert.ok(m < 0 && c < 0);
                if (item.type === 'hidden-one') assert.ok(Math.abs(m) === 1 && c !== 0);
                if (item.type === 'no-intercept') assert.ok(Math.abs(m) >= 2 && c === 0);
                assert.ok(Math.abs(m) <= 9 && Math.abs(c) <= 9);
            } else {
                assert.equal(question.options.filter(option => option.correct).length, 1);
                assert.equal(new Set(question.options.map(option => option.label)).size, question.options.length);
                assert.ok(question.options.length >= 3);
            }
        });
    }
});
test('gradient and intercept hidden choices alternate forms by seed', () => {
    for (let seed = 0; seed < 50; seed++) {
        const question = E.generate({ type: 'hidden', seed }, window.Maths1to9LessonEngine.seededRandom(seed));
        assert.match(question.prompt, seed % 2 === 0 ? /What is the gradient/ : /What is the y-intercept/);
    }
});
test('gradient and intercept step arrows obey bounds and avoid the x-axis for all slider values', () => {
    for (let m = -3; m <= 3; m++) for (let c = -4; c <= 4; c++) {
        const step = plain(E.step(m, c));
        const valid = x => m !== 0 && m * x + c !== 0 &&
            [m * x + c, m * (x + 1) + c].every(y => y >= -5 && y <= 7);
        const x = valid(1) ? 1 : valid(-2) ? -2 : null;
        if (x === null) assert.equal(step, null);
        else assert.deepEqual(step, { from: [x, m * x + c], corner: [x + 1, m * x + c], to: [x + 1, m * (x + 1) + c] });
    }
});

test('gradient and intercept choice answers agree with their equations and never use equal magnitudes', () => {
    function readEquation(value) {
        const match = /y = (−?\d*)x(?: ([+−]) (\d+))?/.exec(text(value));
        assert.ok(match, value);
        const m = match[1] === '' ? 1 : match[1] === '−' ? -1 : Number(match[1].replace('−', '-'));
        return { m, c: match[3] ? Number(match[3]) * (match[2] === '−' ? -1 : 1) : 0 };
    }
    for (const type of E.choiceTypes) for (let seed = 0; seed < 100; seed++) {
        const question = E.generate({ type, seed }, window.Maths1to9LessonEngine.seededRandom(seed));
        const answer = question.options.find(option => option.correct).label;
        const { m, c } = readEquation(type === 'match-equation' ? answer : question.prompt);
        assert.notEqual(Math.abs(m), Math.abs(c));
        if (type === 'match-equation') assert.equal(text(question.prompt), `Which line has gradient ${E.number(m)} and y-intercept ${E.number(c)}?`);
        if (type === 'crossing-point') assert.equal(answer, E.coordinate(0, c));
        if (type === 'direction') assert.equal(answer, `${Math.abs(m)} ${m < 0 ? 'down' : 'up'} for every 1 right`);
        if (type === 'hidden') assert.equal(answer, seed % 2 ? '0' : E.number(m));
    }
});
