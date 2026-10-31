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
vm.runInNewContext(fs.readFileSync(path.join(root, 'content/percentage-multipliers/multipliers.js'), 'utf8'), { window });
const M = window.PercentageMultipliers, E = window.Maths1to9LessonEngine;
// The lesson seeds each Practice item with a 32-bit number from pick(), so
// test with seeds like those (small seeds all give a similar first draw).
const realSeed = n => { const random = E.seededRandom(n); random(); return E.randomInt(0, 4294967295, random); };
const generated = (type, n) => { const seed = realSeed(n); return M.generate({ type, seed }, E.seededRandom(seed)); };

const SUPERSCRIPTS = { '²': 2, '³': 3, '⁴': 4, '⁵': 5 };
const toNumber = text => Number(String(text).replace(/−/g, '-').replace(/[%£,\s]/g, ''));
const plain = value => JSON.parse(JSON.stringify(value));
const close = (a, b, within = 1e-6) => Math.abs(a - b) <= within;

// Works out displayed working, such as "12 000 × 0.85³" or "100% − 7%".
function evaluate(text) {
    const js = text.replace(/£/g, '').replace(/([\d.]+)%/g, '($1/100)').replace(/(\d) (?=\d{3}\b)/g, '$1').replace(/−/g, '-')
        .replace(/×/g, '*').replace(/÷/g, '/')
        .replace(/([\d.]+)([²³⁴⁵])/g, (all, base, index) => `(${base}**${SUPERSCRIPTS[index]})`);
    assert.match(js, /^[\d\s.+\-*/()]+$/, `"${text}" is plain working`);
    return Function(`"use strict"; return (${js});`)();
}

// Checks every "a × b = c" style sum. Money answers may be rounded to the penny.
function assertSums(text, where) {
    const sums = text.match(/£?\d[\d .,]*(?:%|[²³⁴⁵])?(?: [×÷+−] £?\d[\d.]*(?:%|[²³⁴⁵])?)+(?: = £?\d[\d .]*\d%?)+/g) || [];
    for (const sum of sums) {
        const sides = sum.split(' = ').map(evaluate);
        sides.forEach(value => assert.ok(close(value, sides[0], 0.006), `${where}: ${sum}`));
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
        assert.notEqual(o.feedback, o.label, `${where}: feedback for ${o.label} isn't just its label`);
    });
}

// The value a card is about: the multiplier, or the amount after all the changes.
function expected(q) {
    const multipliers = q.changes.map(c => M.multiplier(c.percent, c.direction));
    if (q.asked === 'multiplier') return M.apply(1, multipliers);
    return M.apply(q.start, multipliers);
}

function assertCard(q, where) {
    assert.ok(Array.isArray(q.changes) && q.changes.length >= 1, `${where}: changes`);
    assertSums(JSON.stringify([q.prompt, q.options, q.feedback, q.rules]), where);
    if (q.input === 'choice') {
        assertOptions(q, where);
        const right = q.options.find(o => o.correct).label;
        if (q.asked === 'multiplier' && !right.includes('=')) assert.ok(close(toNumber(right), expected(q)), `${where}: right multiplier`);
        if (q.asked === 'multiplier' && right.includes('=')) assert.ok(close(evaluate(right.split(' = ')[0]), expected(q)), `${where}: right multiplier`);
        if (q.asked === 'final') assert.ok(close(toNumber(right), expected(q), 0.5), `${where}: right amount`);
        if (q.asked === 'calculation') assert.ok(close(evaluate(right), expected(q)), `${where}: right working`);
        return;
    }
    assert.equal(q.input, 'number', where);
    assert.ok(q.fallback, `${where}: fallback feedback`);
    assert.ok(q.feedback, `${where}: right-answer feedback`);
    const tolerance = q.tolerance || 0;
    if (q.asked === 'multiplier') {
        assert.equal(q.inputLabel, 'Multiplier', `${where}: input label`);
        assert.ok(close(toNumber(q.answer), expected(q)), `${where}: answer`);
    }
    if (q.asked === 'final') {
        assert.ok(close(toNumber(q.answer), expected(q), Math.max(tolerance, 0.005) + 1e-6), `${where}: answer`);
        assert.ok(close(toNumber(q.answer), expected(q), tolerance + 1e-6), `${where}: the exact value is also accepted`);
        if (q.inputLabel === 'Pounds (no £ sign)') assert.equal(q.tolerance, 0.01, `${where}: money is within a penny`);
    }
    assert.ok(/^\d+(\.\d{1,3})?$/.test(q.answer), `${where}: answer ${q.answer} is plain`);
    const values = q.rules.map(r => toNumber(r.value));
    assert.ok(values.length >= 2, `${where}: at least two mistake rules`);
    values.forEach(value => assert.ok(Math.abs(value - toNumber(q.answer)) > tolerance, `${where}: rule ${value} isn't marked right`));
    values.forEach((value, i) => values.slice(i + 1).forEach(other =>
        assert.ok(Math.abs(value - other) > tolerance, `${where}: rules ${value} and ${other} are different`)));
    q.rules.forEach(r => assert.ok(r.feedback, `${where}: every rule has feedback`));
}

test('the lesson fills the existing placeholder and leaves no notes behind', () => {
    const curriculum = JSON.parse(fs.readFileSync(path.join(root, 'content/curriculum.json'), 'utf8'));
    const lesson = curriculum.categories.flatMap(category => category.lessons || [])
        .find(each => each.folder === 'percentage-multipliers');
    assert.deepEqual([...lesson.skills], ['decimal-multipliers', 'repeated-percentage-change']);
    const json = JSON.parse(fs.readFileSync(path.join(root, 'content/percentage-multipliers/lesson.json'), 'utf8'));
    const skills = new Set(Object.values(json.assessment.question_types));
    assert.deepEqual([...skills].sort(), ['decimal-multipliers', 'repeated-percentage-change']);
    assert.ok(!fs.existsSync(path.join(root, 'content/percentage-multipliers/README.md')));
});

test('multiplier() and apply() give clean values', () => {
    assert.equal(M.multiplier(8, 'up'), 1.08);
    assert.equal(M.multiplier(7, 'down'), 0.93);
    assert.equal(M.multiplier(12.5, 'up'), 1.125);
    assert.equal(M.multiplier(17.5, 'down'), 0.825);
    assert.ok(close(M.apply(12000, [0.85, 0.85, 0.85]), 7369.5));
    assert.equal(M.pounds(7369.5), '£7369.50');
    assert.equal(M.pounds(12000), '£12 000');
});

test('Learn has seven screens, and all the working on them is right', () => {
    assert.equal(M.learnScreens.length, 7);
    const text = JSON.stringify(M.learnScreens);
    for (const idea of ['£81', '£80', 'calculator', 'multiplier', '1.08', "It isn't 1.8", '0.93', '0.07',
        '1.125', '0.85³', '£7369.50', "Don't add the percentages", 'Round only at the end', '0.8 × 1.1']) {
        assert.ok(text.includes(idea), `Learn mentions "${idea}"`);
    }
    for (const word of ['AQA', 'Edexcel', 'OCR', 'depreciation', 'compound', 'interest', 'scale factor']) {
        assert.ok(!text.toLowerCase().includes(word.toLowerCase()), `Learn doesn't say "${word}"`);
    }
    assertSums(text, 'Learn');
    M.learnScreens.forEach(screen => {
        assert.ok(screen.start >= screen.min && screen.start <= screen.max, `${screen.title}: slider starts in range`);
    });
});

test('Try it has ten cards, four choice and six typed, all with the right answers', () => {
    const cards = M.examples();
    assert.equal(cards.length, 10);
    assert.equal(cards.filter(q => q.input === 'choice').length, 4);
    cards.forEach((q, i) => assertCard(q, `Try it ${i + 1}`));
    assert.deepEqual(plain(cards.filter(q => q.input === 'number').map(q => toNumber(q.answer))), [81, 396, 1.35, 81, 2376, 1029]);
});

test('Check has five cards, two choice and three typed, all with the right answers', () => {
    const cards = M.checks();
    assert.equal(cards.length, 5);
    assert.equal(cards.filter(q => q.input === 'choice').length, 2);
    cards.forEach((q, i) => assertCard(q, `Check ${i + 1}`));
    assert.deepEqual(plain(cards.filter(q => q.input === 'number').map(q => toNumber(q.answer))), [180, 291600, 24.2]);
    const day2 = cards[1];
    assert.equal(toNumber(day2.answer), 960 * 0.75 * 0.25);
    assert.ok(close(toNumber(cards[4].answer), (1.08 * 1.15 - 1) * 100));
});

test('every Practice type makes sound questions for 2,000 real seeds', () => {
    for (const type of M.practiceTypes) {
        for (let n = 0; n < 2000; n++) {
            const q = generated(type, n), where = `${type} seed ${n}: ${q.prompt}`;
            assert.equal(q.input, M.CHOICE_TYPES.includes(type) ? 'choice' : 'number', where);
            assert.equal(q.questionType, type, where);
            assertCard(q, where);
            for (const word of ['interest', 'compound', 'undefined', 'NaN', '%DIR%', '£-', '£0 ']) {
                assert.ok(!JSON.stringify(q).includes(word), `${where}: no "${word}"`);
            }
        }
    }
});

test('a Practice session has six types, three choice and three typed, and repeats from its seed', () => {
    for (let n = 0; n < 200; n++) {
        const items = M.pick(E.seededRandom(realSeed(n)));
        assert.equal(items.length, 6);
        assert.equal(new Set(items.map(item => item.type)).size, 6);
        assert.equal(items.filter(item => M.CHOICE_TYPES.includes(item.type)).length, 3);
        assert.deepEqual(plain(M.pick(E.seededRandom(realSeed(n)))), plain(items));
        const item = items[0];
        assert.deepEqual(plain(M.generate(item, E.seededRandom(item.seed))), plain(M.generate(item, E.seededRandom(item.seed))));
    }
});
