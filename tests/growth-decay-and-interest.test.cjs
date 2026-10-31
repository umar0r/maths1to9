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
vm.runInNewContext(fs.readFileSync(path.join(root, 'content/growth-decay-and-interest/growth.js'), 'utf8'), { window });
const G = window.GrowthDecay, E = window.Maths1to9LessonEngine;
// The lesson seeds each Practice item with a 32-bit number from pick(), so
// test with seeds like those (small seeds all give a similar first draw).
const realSeed = n => { const random = E.seededRandom(n); random(); return E.randomInt(0, 4294967295, random); };
const generated = (type, n) => { const seed = realSeed(n); return G.generate({ type, seed }, E.seededRandom(seed)); };

const SUPERSCRIPTS = { '²': 2, '³': 3, '⁴': 4, '⁵': 5, '¹⁰': 10, '¹²': 12 };
const toNumber = text => Number(String(text).replace(/−/g, '-').replace(/[%£,\s]/g, ''));
const plain = value => JSON.parse(JSON.stringify(value));
const close = (a, b, within = 1e-6) => Math.abs(a - b) <= within;

// Works out displayed working, such as "1000 × 1.05³" or "5306.04 − 5000".
function evaluate(text) {
    const js = text.replace(/£/g, '').replace(/([\d.]+)%/g, '($1/100)').replace(/(\d) (?=\d{3}\b)/g, '$1')
        .replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/')
        .replace(/([\d.]+)(¹⁰|¹²|[²³⁴⁵])/g, (all, base, index) => `(${base}**${SUPERSCRIPTS[index]})`);
    assert.match(js, /^[\d\s.+\-*/()]+$/, `"${text}" is plain working`);
    return Function(`"use strict"; return (${js});`)();
}

// Checks every "a × b = c" style sum. Money answers may be rounded to the penny.
function assertSums(text, where) {
    const sums = text.match(/£?\d[\d .,]*(?:%|¹⁰|¹²|[²³⁴⁵])?(?: [×÷+−] £?\d[\d.]*(?:%|¹⁰|¹²|[²³⁴⁵])?)+(?: = £?\d[\d .]*\d%?)+/g) || [];
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
        assert.ok(!/£-|£0\b/.test(o.label), `${where}: ${o.label} is a sensible amount`);
    });
}

// The amount a card is about: the total, or the interest only.
function expected(q) {
    const final = G.total(q.start, q.method, q.direction, q.rates);
    return q.asked === 'interest' ? final - q.start : final;
}

function assertCard(q, where) {
    assert.ok(q.start > 0 && Array.isArray(q.rates) && q.rates.length >= 1, `${where}: start and rates`);
    assert.ok(['simple', 'compound'].includes(q.method) && ['up', 'down'].includes(q.direction), `${where}: method`);
    assertSums(JSON.stringify([q.prompt, q.options, q.feedback, q.rules]), where);
    if (q.input === 'choice') {
        assertOptions(q, where);
        if (q.asked !== 'compare') {
            const right = q.options.find(o => o.correct).label;
            assert.ok(close(toNumber(right), expected(q), 0.006), `${where}: right option ${right}`);
        }
        return;
    }
    assert.equal(q.input, 'number', where);
    assert.ok(q.fallback, `${where}: fallback feedback`);
    assert.ok(q.feedback, `${where}: right-answer feedback`);
    const tolerance = q.tolerance;
    assert.ok(tolerance === 0.01 && q.inputLabel === 'Pounds (no £ sign)' || tolerance === 0.5 && q.inputLabel === 'Answer',
        `${where}: money within a penny, counts to the nearest whole number`);
    assert.ok(close(toNumber(q.answer), expected(q), tolerance + 1e-6), `${where}: answer ${q.answer}`);
    assert.ok(/^\d+(\.\d{1,2})?$/.test(q.answer), `${where}: answer ${q.answer} is plain`);
    const values = q.rules.map(r => toNumber(r.value));
    assert.ok(values.length >= 2, `${where}: at least two mistake rules`);
    values.forEach(value => assert.ok(value > 0 && Math.abs(value - toNumber(q.answer)) > (tolerance === 0.5 ? 1.5 : tolerance), `${where}: rule ${value} isn't marked right`));
    values.forEach((value, i) => values.slice(i + 1).forEach(other =>
        assert.ok(Math.abs(value - other) > tolerance, `${where}: rules ${value} and ${other} are different`)));
    q.rules.forEach(r => assert.ok(r.feedback, `${where}: every rule has feedback`));
}

test('the lesson fills the existing placeholder and leaves no notes behind', () => {
    const curriculum = JSON.parse(fs.readFileSync(path.join(root, 'content/curriculum.json'), 'utf8'));
    const lesson = curriculum.categories.flatMap(category => category.lessons || [])
        .find(each => each.folder === 'growth-decay-and-interest');
    assert.deepEqual([...lesson.skills], ['simple-interest', 'compound-growth-decay']);
    const json = JSON.parse(fs.readFileSync(path.join(root, 'content/growth-decay-and-interest/lesson.json'), 'utf8'));
    assert.deepEqual([...new Set(Object.values(json.assessment.question_types))].sort(), ['compound-growth-decay', 'simple-interest']);
    assert.ok(!fs.existsSync(path.join(root, 'content/growth-decay-and-interest/README.md')));
});

test('total() does simple and compound change', () => {
    assert.equal(G.total(1000, 'simple', 'up', [5, 5, 5]), 1150);
    assert.ok(close(G.total(1000, 'compound', 'up', [5, 5, 5]), 1157.625));
    assert.ok(close(G.total(800, 'compound', 'down', [20, 20]), 512));
    assert.equal(G.pounds(1157.625), '£1157.63');
    assert.equal(G.pounds(10222.08), '£10 222.08');
});

test('Learn has six screens, and all the working on them is right', () => {
    assert.equal(G.learnScreens.length, 6);
    const text = JSON.stringify(G.learnScreens);
    for (const idea of ['called interest', 'calculator', 'simple interest', 'compound interest', '1.05³', '£1157.63',
        '£1628.89', 'Interest = total − the money you put in', '£519.42', 'depreciation', '0.8', '3 years, not 4', 'Round only at the end']) {
        assert.ok(text.includes(idea), `Learn mentions "${idea}"`);
    }
    for (const word of ['AQA', 'Edexcel', 'OCR', 'is of', 'principal', 'per annum']) {
        assert.ok(!text.includes(word), `Learn doesn't say "${word}"`);
    }
    assertSums(text, 'Learn');
    assert.ok(close(1000 * 1.05 ** 10 - 1500, 128.89, 0.005), 'Learn 4 gap');
});

test('Try it has ten cards, four choice and six typed, all with the right answers', () => {
    const cards = G.examples();
    assert.equal(cards.length, 10);
    assert.equal(cards.filter(q => q.input === 'choice').length, 4);
    cards.forEach((q, i) => assertCard(q, `Try it ${i + 1}`));
    assert.deepEqual(plain(cards.filter(q => q.input === 'number').map(q => toNumber(q.answer))), [81, 300, 1352, 3374.59, 121.8, 2267]);
});

test('Check has five cards, two choice and three typed, all with the right answers', () => {
    const cards = G.checks();
    assert.equal(cards.length, 5);
    assert.equal(cards.filter(q => q.input === 'choice').length, 2);
    cards.forEach((q, i) => assertCard(q, `Check ${i + 1}`));
    assert.deepEqual(plain(cards.filter(q => q.input === 'number').map(q => toNumber(q.answer))), [182.17, 2970.24, 10222.08]);
    const b = 4000 * 1.029 ** 5;
    assert.ok(close(b - 4600, 14.63, 0.005), 'Check 2: B beats A by £14.63');
    assert.ok(close(2000 * 1.06 ** 12, 4024.39, 0.005), 'Check 4: about £4024.39');
});

test('every Practice type makes sound questions for 2,000 real seeds', () => {
    for (const type of G.practiceTypes) {
        for (let n = 0; n < 2000; n++) {
            const q = generated(type, n), where = `${type} seed ${n}: ${q.prompt}`;
            assert.equal(q.input, G.CHOICE_TYPES.includes(type) ? 'choice' : 'number', where);
            assert.equal(q.questionType, type, where);
            assertCard(q, where);
            for (const word of ['undefined', 'NaN', '£-']) {
                assert.ok(!JSON.stringify(q).includes(word), `${where}: no "${word}"`);
            }
            assert.ok(!/\de-\d/.test(JSON.stringify(q)), `${where}: no tiny numbers like 1e-7`);
        }
    }
});

test('a Practice session has six types, three choice and three typed, and repeats from its seed', () => {
    for (let n = 0; n < 200; n++) {
        const items = G.pick(E.seededRandom(realSeed(n)));
        assert.equal(items.length, 6);
        assert.equal(new Set(items.map(item => item.type)).size, 6);
        assert.equal(items.filter(item => G.CHOICE_TYPES.includes(item.type)).length, 3);
        assert.deepEqual(plain(G.pick(E.seededRandom(realSeed(n)))), plain(items));
    }
});
