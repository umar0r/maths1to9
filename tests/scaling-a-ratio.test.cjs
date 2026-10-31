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
vm.runInNewContext(fs.readFileSync(path.join(root, 'content/scaling-a-ratio/scaling.js'), 'utf8'), { window });
const S = window.ScalingRatio, E = window.Maths1to9LessonEngine;
const lesson = JSON.parse(fs.readFileSync(path.join(root, 'content/scaling-a-ratio/lesson.json'), 'utf8'));
// The lesson seeds each Practice item with a 32-bit number from pick(), so
// test with seeds like those (small seeds all give a similar first draw).
const realSeed = n => { const random = E.seededRandom(n); random(); return E.randomInt(0, 4294967295, random); };
const generated = (type, n) => { const seed = realSeed(n); return S.generate({ type, seed }, E.seededRandom(seed)); };
const CHOICE_TYPES = ['one-part-choice', 'which-calc', 'amount-choice'];

const plain = value => JSON.parse(JSON.stringify(value));
const toNumber = text => Number(String(text).replace(/\s*[a-z]+$/, '').replace(/[£\s]/g, ''));
const close = (a, b) => Math.abs(a - b) < 1e-9;

// Works out one side of displayed working, such as "60 ÷ 5" or "3 × 12".
function evaluate(text) {
    const js = text.replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/');
    assert.match(js, /^[\d\s.+\-*/()]+$/, `"${text}" is plain working`);
    return Function(`"use strict"; return (${js});`)();
}

// Checks every "a ÷ b = c" style sum in a piece of text.
function assertSums(text, where) {
    for (const [sum] of text.matchAll(/(?<![\d.÷×+−/] ?)\d+(?:\.\d+)?(?: [÷×+−] \d+(?:\.\d+)?)+(?: = £?\d+(?:\.\d+)?)+(?![\d/])/g)) {
        const sides = sum.replace(/£/g, '').split(' = ').map(evaluate);
        sides.forEach(value => assert.ok(close(value, sides[0]), `${where}: ${sum}`));
    }
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

function assertCard(q, where) {
    assert.ok(Array.isArray(q.ratio) && q.ratio.length >= 2, `${where}: ratio`);
    const { index, amount } = q.known;
    assert.ok(index >= 0 && index < q.ratio.length && amount > 0, `${where}: known amount`);
    assert.ok(['match', 'one-part', 'amount', 'working', 'mistake'].includes(q.asked), `${where}: asked`);
    assert.ok(lesson.assessment.question_types[q.questionType], `${where}: ${q.questionType} maps to a skill`);
    const text = JSON.stringify(plain([q.prompt, q.feedback, q.fallback, q.options, q.rules]));
    assert.ok(!/\d : \d/.test(text), `${where}: ratios use non-breaking spaces`);
    assertSums(text.replace(/\\u00a0| /g, ' '), where);
    const amounts = plain(S.scale(q.ratio, index, amount));
    const onePart = amount / q.ratio[index];
    const others = amounts.filter((_, i) => i !== index);
    if (q.input === 'choice') {
        assertOptions(q, where);
        const right = q.options.find(o => o.correct).label;
        if (q.asked === 'one-part') assert.ok(close(toNumber(right), onePart), `${where}: right option is one part`);
        if (q.asked === 'amount') assert.ok(others.some(value => close(toNumber(right), value)), `${where}: right amount`);
        if (q.asked === 'working') assert.ok(others.some(value => close(evaluate(right), value)), `${where}: right working`);
        if (q.asked === 'amount' || q.asked === 'one-part') {
            q.options.filter(o => !o.correct).forEach(o =>
                assert.ok(!close(toNumber(o.label), toNumber(right)), `${where}: ${o.label} isn't also right`));
        }
        return;
    }
    assert.equal(q.input, 'number', where);
    assert.ok(q.fallback, `${where}: fallback feedback`);
    assert.ok(q.feedback, `${where}: right-answer feedback`);
    assert.ok(q.rules.length >= 2, `${where}: at least two mistake rules`);
    q.rules.forEach(r => assert.ok(r.feedback, `${where}: every rule has feedback`));
    if (q.fields) {
        assert.equal(q.fractions, true, `${where}: fields need fractions on`);
        assert.deepEqual([Number(q.answer.first), Number(q.answer.second)], others, `${where}: both amounts`);
        const keys = q.rules.map(r => `${r.value.first}:${r.value.second}`);
        assert.equal(new Set(keys).size, keys.length, `${where}: rules are all different`);
        assert.ok(!keys.includes(`${q.answer.first}:${q.answer.second}`), `${where}: no rule matches the right answer`);
        return;
    }
    assert.ok(q.inputLabel, `${where}: input label`);
    const answer = Number(q.answer);
    if (q.asked === 'one-part') assert.ok(close(answer, onePart), `${where}: answer is one part`);
    else assert.ok(others.some(value => close(answer, value)), `${where}: answer is a scaled amount`);
    const values = q.rules.map(r => Number(r.value));
    values.forEach(value => {
        assert.ok(value > 0 && !close(value, answer), `${where}: rule ${value} is wrong and positive`);
        assert.ok(Math.abs(value * 100 - Math.round(value * 100)) < 1e-9, `${where}: rule ${value} is a value a pupil can type`);
    });
    assert.equal(new Set(values).size, values.length, `${where}: rules are all different`);
}

test('Learn has five teaching screens with sliders and no questions to answer', () => {
    assert.equal(S.learnScreens.length, 5);
    S.learnScreens.forEach((screen, index) => {
        assert.ok(screen.title && screen.lines.length && screen.slider, `screen ${index + 1}`);
        assert.ok(screen.start >= screen.min && screen.start <= screen.max, `screen ${index + 1} starts in range`);
        assertSums([...screen.lines, screen.callout ?? '', ...screen.maths].join(' ').replace(/ /g, ' '), `learn ${index + 1}`);
    });
    assert.equal(S.sliderText(0, 4), 'Each part is worth: 4 ml');
    assert.equal(S.sliderText(1, 2), 'Step 2 of 4');
    assert.equal(S.sliderText(4, 1), 'Show: the right way');
});

test('scale finds every amount from one known part', () => {
    assert.deepEqual(plain(S.scale([5, 3], 0, 60)), [60, 36]);
    assert.deepEqual(plain(S.scale([4, 7], 1, 21)), [12, 21]);
    assert.deepEqual(plain(S.scale([1, 2, 4], 1, 6)), [3, 6, 12]);
});

test('Try it: 8 cards, 3 choice and 5 typed, all correct', () => {
    const cards = S.examples();
    assert.equal(cards.length, 8);
    assert.equal(cards.filter(q => q.input === 'choice').length, 3);
    cards.forEach((q, index) => assertCard(q, `try ${index + 1}`));
    assert.equal(lesson.score_activities.length, cards.length);
});

test('Check: 5 cards, 2 choice and 3 typed, all correct', () => {
    const cards = S.checks();
    assert.equal(cards.length, 5);
    assert.equal(cards.filter(q => q.input === 'choice').length, 2);
    cards.forEach((q, index) => assertCard(q, `check ${index + 1}`));
    assert.equal(lesson.comparison.questions.length, cards.length);
});

test('Practice: each session has all six types once, 3 choice and 3 typed', () => {
    for (let n = 0; n < 50; n++) {
        const items = S.pick(E.seededRandom(realSeed(n)));
        assert.deepEqual(plain(items.map(i => i.type)).sort(), plain(S.practiceTypes).sort());
        const cards = items.map(item => S.generate(item, E.seededRandom(item.seed)));
        assert.deepEqual(plain(cards.filter(q => q.input === 'choice').map(q => q.questionType)).sort(), [...CHOICE_TYPES].sort());
    }
});

test('Practice cards are right for many seeds', () => {
    for (const type of S.practiceTypes) {
        for (let n = 0; n < 300; n++) {
            const q = generated(type, n);
            assertCard(q, `${type} seed ${n}`);
            assert.ok(q.ratio[q.known.index] > 1, `${type} seed ${n}: the known amount is more than 1 part`);
            if (type === 'three-part-typed') assert.equal(q.ratio.length, 3, `${type} seed ${n}: three parts`);
        }
    }
});

test('Practice gives the same card for the same seed', () => {
    for (const type of S.practiceTypes) {
        assert.deepEqual(plain(generated(type, 7)), plain(generated(type, 7)));
    }
});
