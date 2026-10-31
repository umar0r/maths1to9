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
vm.runInNewContext(fs.readFileSync(path.join(root, 'content/direct-proportion/proportion.js'), 'utf8'), { window });
const D = window.DirectProportion, E = window.Maths1to9LessonEngine;
const lesson = JSON.parse(fs.readFileSync(path.join(root, 'content/direct-proportion/lesson.json'), 'utf8'));
// The lesson seeds each Practice item with a 32-bit number from pick(), so
// test with seeds like those (small seeds all give a similar first draw).
const realSeed = n => { const random = E.seededRandom(n); random(); return E.randomInt(0, 4294967295, random); };
const generated = (type, n) => { const seed = realSeed(n); return D.generate({ type, seed }, E.seededRandom(seed)); };
const close = (a, b, within = 1e-6) => Math.abs(a - b) <= within;
const SEEDS = 600;

// "£2.40 ÷ 5 = £0.48", "7.5p × 6 = 45p": pence become pounds so mixed sums check.
function evaluate(text) {
    const js = text.replace(/£([\d.]+)/g, '$1').replace(/([\d.]+)p\b/g, '($1/100)').replace(/([\d.]+) ?(g|km|pages)\b/g, '$1')
        .replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/');
    assert.match(js, /^[\d\s.+\-*/()]+$/, `"${text}" is plain working`);
    return Function(`"use strict"; return (${js});`)();
}

function assertSums(text, where) {
    const sums = text.match(/£?\d[\d.]*(?:p| g| km| pages)?(?: [×÷+−] £?\d[\d.]*(?:p| g| km| pages)?)+(?: = £?\d[\d.]*(?:p| g| km| pages)?)+/g) || [];
    for (const sum of sums.map(each => each.replace(/\.$/, ''))) {
        let sides; try { sides = sum.split(' = ').map(evaluate); } catch (error) { throw new Error(`${where}: cannot read "${sum}" (${error.message})`); }
        sides.forEach(value => assert.ok(close(value, sides[0], 0.006), `${where}: ${sum}`));
    }
}

function assertOptions(q, where) {
    assert.equal(q.options.length, 4, `${where}: four options`);
    assert.equal(new Set(q.options.map(o => o.label)).size, 4, `${where}: four different options`);
    assert.equal(q.options.filter(o => o.correct).length, 1, `${where}: one right option`);
    assert.equal(new Set(q.options.map(o => o.feedback)).size, 4, `${where}: each option has its own feedback`);
    q.options.forEach(o => assert.notEqual(o.feedback, o.label, `${where}: feedback isn't just the label`));
}

function assertCard(q, where) {
    const text = JSON.stringify(q);
    assert.doesNotMatch(text, /undefined|NaN|Infinity|null p|\d\.\d{3,}/, `${where}: no broken numbers in ${text}`);
    assert.ok(['one', 'scaled', 'calculation', 'proportional', 'mistake'].includes(q.asked), `${where}: asked`);
    assert.ok(q.questionType, `${where}: questionType`);
    if (q.input === 'choice') assertOptions(q, where);
    else {
        assert.equal(q.input, 'number', where);
        assert.ok(q.rules.length >= 1, `${where}: at least one rule`);
        const values = q.rules.map(rule => Number(rule.value));
        assert.equal(new Set(values).size, values.length, `${where}: rules differ`);
        values.forEach(value => assert.ok(!close(value, Number(q.answer)), `${where}: rule ${value} isn't the answer`));
        values.forEach(value => assert.ok(value > 0, `${where}: rule ${value} is positive`));
        assert.ok(q.fallback && q.feedback, `${where}: fallback and feedback`);
        assert.ok(!q.unit !== !q.inputLabel || q.unit || q.inputLabel, `${where}: unit or money label`);
        if (q.values?.want) assert.ok(close(Number(q.answer), q.values.total / q.values.count * q.values.want), `${where}: answer = total ÷ count × want`);
        if (q.asked === 'one') assert.ok(close(Number(q.answer), q.values.total / q.values.count), `${where}: answer is the price of 1`);
    }
    for (const part of [q.prompt, q.feedback, q.fallback, ...(q.options || []).flatMap(o => [o.label, o.feedback]), ...(q.rules || []).map(r => r.feedback)]) {
        if (part) assertSums(part, where);
    }
}

test('money follows the lesson rule', () => {
    assert.equal(D.money(0.45), '45p');
    assert.equal(D.money(0.075), '7.5p');
    assert.equal(D.money(1.44), '£1.44');
    assert.equal(D.money(2), '£2');
    assert.equal(D.money(28), '£28');
    assert.equal(D.money(0.1 + 0.2), '30p');
});

test('Learn has 7 screens, Try it 10 cards, Check 6 cards', () => {
    assert.equal(D.learnScreens.length, 7);
    assert.equal(D.examples().length, 10);
    assert.equal(D.checks().length, 6);
    assert.equal(lesson.comparison.questions.length, 6);
    assert.equal(lesson.question_bank.session_length, 6);
});

test('Try it and Check mix choice and typed cards, and every card is sound', () => {
    for (const [name, cards] of [['try', D.examples()], ['check', D.checks()]]) {
        const inputs = cards.map(card => card.input);
        assert.ok(inputs.includes('choice') && inputs.includes('number'), `${name} mixes card types`);
        assert.equal(inputs.filter(input => input === 'choice').length, cards.length / 2, `${name}: half choice`);
        cards.forEach((card, index) => assertCard(card, `${name}-${index + 1}`));
    }
});

test('every question type maps to the lesson skill', () => {
    const types = [...D.practiceTypes, ...D.examples().map(c => c.questionType), ...D.checks().map(c => c.questionType)];
    for (const type of types) assert.equal(lesson.assessment.question_types[type], 'direct-proportion-numerical', type);
});

test('a session has all six types once, three choice and three typed', () => {
    for (let n = 0; n < 50; n++) {
        const items = D.pick(E.seededRandom(realSeed(n)));
        assert.equal(JSON.stringify(items.map(item => item.type).sort()), JSON.stringify([...D.practiceTypes].sort()));
        const inputs = items.map(item => D.generate(item, E.seededRandom(item.seed)).input);
        assert.equal(inputs.filter(input => input === 'choice').length, 3);
    }
});

for (const type of D.practiceTypes) {
    test(`Practice ${type}: ${SEEDS} seeds give sound cards`, () => {
        for (let n = 0; n < SEEDS; n++) assertCard(generated(type, n), `${type} seed ${n}`);
    });
    test(`Practice ${type}: the same seed rebuilds the same card`, () => {
        for (let n = 0; n < 20; n++) assert.equal(JSON.stringify(generated(type, n)), JSON.stringify(generated(type, n)));
    });
}

test('adding-trap never charges half a penny in a price', () => {
    for (let n = 0; n < SEEDS; n++) {
        const q = generated('adding-trap', n);
        assert.ok(Number.isInteger(q.values.total * 100 + 1e-9 | 0) && close(q.values.total * 100, Math.round(q.values.total * 100)),
            `adding-trap seed ${n}: ${q.prompt}`);
    }
});

test('scale-amount asks for grams in plain words', () => {
    for (let n = 0; n < 50; n++) assert.match(generated('scale-amount', n).prompt, /How many grams of \w+ do you need for \d+ people\?$/);
});

test('Learn 7 is called "Three steps, every time"', () => {
    assert.equal(D.learnScreens[6].title, 'Three steps, every time');
});
