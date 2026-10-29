const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const window = {};
vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/js/lesson-engine.js'), 'utf8'), {
    window, document: { body: { dataset: { lessonRenderer: 'custom' } } }
});
vm.runInNewContext(fs.readFileSync(path.join(root, 'content/sequences/sequences.js'), 'utf8'), { window });
const S = window.Sequences, E = window.Maths1to9LessonEngine;
// The lesson seeds each Practice item with a 32-bit number from pick(), so
// test with seeds like those (small seeds all give a similar first draw).
const realSeed = n => { const random = E.seededRandom(n); random(); return E.randomInt(0, 4294967295, random); };
const generated = (type, n) => { const seed = realSeed(n); return S.generate({ type, seed }, E.seededRandom(seed)); };
const CHOICE_TYPES = ['rule-choice', 'next-multiply', 'every-pair'];
const TYPED_TYPES = ['below-zero', 'two-step', 'next-two', 'pattern-k'];

const toNumber = text => Number(String(text).replace(/−/g, '-'));
const RULE_WORDS = { add: 'Add', subtract: 'Subtract', multiply: 'Multiply by', divide: 'Divide by' };

// The terms a card asks for, worked out again from its sequence and rule.
function askedTerms(q) {
    const known = q.terms.length;
    return [...q.asked.positions].map(position => {
        let value = q.terms[known - 1];
        for (let i = known; i < position; i++) value = S.apply(value, q.rule);
        return value;
    });
}

function assertOptions(q, where) {
    assert.equal(q.input, 'choice', where);
    assert.equal(q.options.length, 4, `${where}: four options`);
    assert.equal(new Set(q.options.map(o => o.label)).size, 4, `${where}: four different options`);
    assert.equal(q.options.filter(o => o.correct).length, 1, `${where}: one right option`);
    assert.equal(new Set(q.options.map(o => o.feedback)).size, 4, `${where}: each option has its own feedback`);
    q.options.forEach(o => {
        assert.ok(o.feedback && o.feedback.length > 5, `${where}: feedback for ${o.label}`);
        assert.notEqual(o.feedback, o.label, `${where}: feedback for ${o.label} isn't just its label again`);
    });
}

function assertAnswer(q, where) {
    const right = q.input === 'choice' ? q.options.find(o => o.correct).label : null;
    if (q.asked.kind === 'rule') {
        assert.equal(right, `${RULE_WORDS[q.rule.op]} ${q.rule.value}`, `${where}: the right rule`);
        for (let i = 1; i < q.terms.length; i++) {
            assert.equal(S.apply(q.terms[i - 1], q.rule), q.terms[i], `${where}: the rule works for every pair`);
        }
        return;
    }
    const expected = askedTerms(q);
    if (q.input === 'choice') {
        if (expected.length === 1) assert.equal(toNumber(right), expected[0], `${where}: right option`);
        else expected.forEach(value => assert.ok(right.includes(String(value)), `${where}: right option has ${value}`));
        return;
    }
    assert.ok(q.fallback, `${where}: fallback feedback`);
    if (q.fields) {
        assert.deepEqual([toNumber(q.answer.first), toNumber(q.answer.second)], expected, `${where}: answer`);
        (q.rules || []).forEach(r => assert.notDeepEqual(
            [toNumber(r.value.first), toNumber(r.value.second)], expected, `${where}: no rule matches the answer`));
    } else {
        assert.deepEqual([toNumber(q.answer)], expected, `${where}: answer`);
        const values = (q.rules || []).map(r => toNumber(r.value));
        assert.ok(!values.includes(expected[0]), `${where}: no rule matches the right answer`);
        assert.equal(new Set(values).size, values.length, `${where}: rules are all different`);
    }
    (q.rules || []).forEach(r => assert.ok(r.feedback, `${where}: every rule has feedback`));
}

test('Learn has six screens, and every sum on them is right', () => {
    assert.equal(S.learnScreens.length, 6);
    const text = JSON.stringify(S.learnScreens);
    for (const idea of ['sequence', 'term-to-term rule', 'subtract 4', 'multiply by 3', '10 ÷ 2 = 5',
        'check your rule on every pair', 'Do the steps in order']) assert.ok(text.includes(idea), `Learn mentions "${idea}"`);
    for (const screen of S.learnScreens) for (const line of screen.maths || []) {
        const sum = /^(−?\d+) ([+−×÷]) (\d+) = (−?\d+)$/.exec(line);
        if (!sum) continue;
        const [, a, op, b, c] = sum;
        const rule = { op: { '+': 'add', '−': 'subtract', '×': 'multiply', '÷': 'divide' }[op], value: Number(b) };
        if (line === '6 + 4 = 10') continue;
        assert.equal(S.apply(toNumber(a), rule), toNumber(c), `Learn sum ${line}`);
    }
});

test('Try it has nine cards, four choice and five typed, all with the right answers', () => {
    const cards = S.examples();
    assert.equal(cards.length, 9);
    assert.equal(cards.filter(q => q.input === 'choice').length, 4);
    cards.forEach((q, i) => {
        if (q.input === 'choice') assertOptions(q, `Try it ${i + 1}`);
        if (q.questionType === 'added') assert.equal(q.answer, String(q.terms[1] - q.terms[0]));
        else assertAnswer(q, `Try it ${i + 1}`);
    });
});

test('Check has five cards, two choice and three typed, all with the right answers', () => {
    const cards = S.checks();
    assert.equal(cards.length, 5);
    assert.equal(cards.filter(q => q.input === 'choice').length, 2);
    cards.forEach((q, i) => {
        if (q.input === 'choice') assertOptions(q, `Check ${i + 1}`);
        if (q.questionType !== 'sam') assertAnswer(q, `Check ${i + 1}`);
    });
    assert.deepEqual(S.checks()[3].options.find(o => o.correct).label, 'No. The next two terms are 0.5 and 0.25.');
});

test('every Practice type makes sound questions for 2,000 real seeds', () => {
    for (const type of [...CHOICE_TYPES, ...TYPED_TYPES]) {
        for (let n = 0; n < 2000; n++) {
            const q = generated(type, n), where = `${type} seed ${n}`;
            if (CHOICE_TYPES.includes(type)) {
                assertOptions(q, where);
                q.options.forEach(o => {
                    if (q.asked.kind !== 'term') return;
                    assert.ok(Number.isInteger(toNumber(o.label)), `${where}: whole-number option ${o.label}`);
                    if (!o.correct) assert.notEqual(toNumber(o.label), q.terms.at(-1), `${where}: no option repeats the last term`);
                });
            } else {
                assert.equal(q.input, 'number', where);
            }
            assertAnswer(q, where);
        }
    }
});

test('a Practice session has six types, three choice and three typed, and repeats from its seed', () => {
    for (let n = 0; n < 200; n++) {
        const items = S.pick(E.seededRandom(realSeed(n)));
        assert.equal(items.length, 6);
        assert.equal(new Set(items.map(item => item.type)).size, 6);
        assert.equal(items.filter(item => CHOICE_TYPES.includes(item.type)).length, 3);
        assert.deepEqual(JSON.parse(JSON.stringify(S.pick(E.seededRandom(realSeed(n))))), JSON.parse(JSON.stringify(items)));
    }
});
