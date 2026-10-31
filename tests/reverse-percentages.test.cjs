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
vm.runInNewContext(fs.readFileSync(path.join(root, 'content/reverse-percentages/reverse.js'), 'utf8'), { window });
const R = window.ReversePercentages, E = window.Maths1to9LessonEngine;
// The lesson seeds each Practice item with a 32-bit number from pick(), so
// test with seeds like those (small seeds all give a similar first draw).
const realSeed = n => { const random = E.seededRandom(n); random(); return E.randomInt(0, 4294967295, random); };
const generated = (type, n) => { const seed = realSeed(n); return R.generate({ type, seed }, E.seededRandom(seed)); };

const toNumber = text => Number(String(text).replace(/−/g, '-').replace(/[%£,\s]|minutes|sweets|g$/g, ''));
const close = (a, b, within = 1e-6) => Math.abs(a - b) <= within;

// Works out displayed working, such as "£60 ÷ 80" or "100% − 7%".
function evaluate(text) {
    const js = text.replace(/£/g, '').replace(/([\d.]+)%/g, '$1').replace(/(\d) (?=\d{3}\b)/g, '$1').replace(/−/g, '-')
        .replace(/×/g, '*').replace(/÷/g, '/');
    assert.match(js, /^[\d\s.+\-*/()]+$/, `"${text}" is plain working`);
    return Function(`"use strict"; return (${js});`)();
}

// Checks every "a × b = c" style sum. Money may be rounded to the penny.
function assertSums(text, where) {
    const sums = text.match(/(?<!\d )(?<![\d.])£?\d+(?: \d{3})*(?:\.\d+)?%?(?: [×÷+−] £?\d+(?: \d{3})*(?:\.\d+)?%?)+(?: = £?\d+(?: \d{3})*(?:\.\d+)?%?)+/g) || [];
    for (const sum of sums) {
        const sides = sum.split(' = ').map(evaluate);
        sides.forEach(value => assert.ok(close(value, sides[0], 0.006), `${where}: ${sum}`));
    }
}

function assertOptions(q, where) {
    assert.equal(q.options.length, 4, `${where}: four options`);
    assert.equal(new Set(q.options.map(o => o.label)).size, 4, `${where}: four different options`);
    assert.equal(q.options.filter(o => o.correct).length, 1, `${where}: one right option`);
    assert.equal(new Set(q.options.map(o => o.feedback)).size, 4, `${where}: each option has its own feedback`);
    q.options.forEach(o => {
        assert.ok(o.feedback && o.feedback.length > 5, `${where}: feedback for ${o.label}`);
        assert.notEqual(o.feedback, o.label, `${where}: feedback for ${o.label} isn't just its label`);
    });
}

// The amount before the change: the given amount is givenPercent of it.
const before = q => q.given / (q.givenPercent / 100);

function assertCard(q, where) {
    assert.ok(q.givenPercent > 0, `${where}: givenPercent`);
    assertSums(JSON.stringify([q.prompt, q.options, q.feedback, q.fallback, q.rules]), where);
    assert.doesNotMatch(JSON.stringify(q), /AQA|Edexcel|OCR|undefined|NaN/, `${where}: no exam boards or broken text`);
    if (q.input === 'choice') {
        assertOptions(q, where);
        const right = q.options.find(o => o.correct).label;
        if (q.asked === 'original') assert.ok(close(toNumber(right), before(q), 0.005), `${where}: right amount ${right}`);
        if (q.asked === 'percent-now') assert.equal(toNumber(right), q.givenPercent, `${where}: right percentage`);
        if (q.asked === 'multiplier') assert.ok(close(toNumber(right), q.givenPercent / 100), `${where}: right multiplier`);
        if (q.asked === 'calculation') assert.ok(close(evaluate(right.split(' = ')[0]), before(q)), `${where}: right working`);
        if (q.asked === 'mistake') assert.ok(right.includes(R.number(before(q))), `${where}: right reply`);
        return;
    }
    assert.equal(q.input, 'number', where);
    assert.equal(q.asked, 'original', where);
    assert.ok(q.fallback, `${where}: fallback feedback`);
    assert.ok(q.feedback, `${where}: right-answer feedback`);
    assert.equal(q.tolerance, 0.01, `${where}: within a penny`);
    assert.ok(close(toNumber(q.answer), before(q), 0.005), `${where}: answer ${q.answer}`);
    assert.ok(/^\d+(\.\d{1,2})?$/.test(q.answer), `${where}: answer ${q.answer} is plain`);
    const values = q.rules.map(r => toNumber(r.value));
    assert.ok(values.length >= 2, `${where}: at least two mistake rules`);
    values.forEach(value => assert.ok(Math.abs(value - toNumber(q.answer)) > q.tolerance, `${where}: rule ${value} isn't marked right`));
    values.forEach((value, i) => values.slice(i + 1).forEach(other =>
        assert.ok(Math.abs(value - other) > q.tolerance, `${where}: rules ${value} and ${other} are different`)));
    q.rules.forEach(r => assert.ok(r.feedback, `${where}: every rule has feedback`));
}

test('the lesson fills the existing placeholder and leaves no notes behind', () => {
    const curriculum = JSON.parse(fs.readFileSync(path.join(root, 'content/curriculum.json'), 'utf8'));
    const lesson = curriculum.categories.flatMap(category => category.lessons || [])
        .find(each => each.folder === 'reverse-percentages');
    assert.deepEqual([...lesson.skills], ['original-value-percentages']);
    const json = JSON.parse(fs.readFileSync(path.join(root, 'content/reverse-percentages/lesson.json'), 'utf8'));
    assert.deepEqual([...new Set(Object.values(json.assessment.question_types))], ['original-value-percentages']);
    for (const type of R.practiceTypes) assert.ok(json.assessment.question_types[type], `${type} is mapped`);
    assert.ok(!fs.existsSync(path.join(root, 'content/reverse-percentages/README.md')));
});

test('Learn has seven screens that show before they ask, and its working is right', () => {
    assert.equal(R.learnScreens.length, 7);
    const text = JSON.stringify(R.learnScreens);
    const said = JSON.stringify(R.learnScreens.map(screen => [screen.lines, screen.maths, screen.callout]));
    assert.doesNotMatch(said, /\?/, 'Learn asks no questions');
    for (const idea of ['£72', '£57.60', 'calculator', '100%', '80%', '125%', '£0.75', '£75', 'multiplier', '÷ 0.8',
        "Jo's mistake", 'VAT', 'longer than', 'less than', 'Check']) {
        assert.ok(text.includes(idea), `Learn mentions "${idea}"`);
    }
    assertSums(text, 'Learn');
    const method = R.learnScreens[5];
    for (const percent of method.values) {
        for (const direction of ['up', 'down']) {
            const answer = 396 / R.multiplier(percent, direction);
            assert.ok(close(answer * 100, Math.round(answer * 100)), `£396 at ${percent}% ${direction} gives exact pence`);
        }
    }
});

test('Try it has ten cards, half choice and half typed, all right', () => {
    const cards = R.examples();
    assert.equal(cards.length, 10);
    assert.equal(cards.filter(q => q.input === 'choice').length, 5);
    cards.forEach((q, i) => assertCard(q, `try-${i + 1}`));
    assert.deepEqual(cards.map(q => q.questionType), cards.map((q, i) => `try-${i + 1}`));
});

test('Check has five cards that mix choice and typed answers, all right', () => {
    const cards = R.checks();
    assert.equal(cards.length, 5);
    assert.equal(cards.filter(q => q.input === 'choice').length, 2);
    cards.forEach((q, i) => assertCard(q, `check-${i + 1}`));
});

test('Practice gives every type once: three choice and three typed', () => {
    const items = R.pick(E.seededRandom(realSeed(5)));
    assert.deepEqual(JSON.parse(JSON.stringify(items.map(item => item.type).sort())), [...R.practiceTypes].sort());
    const cards = items.map(item => R.generate(item, E.seededRandom(item.seed)));
    assert.equal(cards.filter(q => q.input === 'choice').length, 3);
    assert.equal(cards.filter(q => q.input === 'number').length, 3);
    assert.deepEqual(Array.from(R.CHOICE_TYPES).sort(), ['compare', 'percent-now', 'which-divide']);
});

test('every Practice type is right 500 times over', () => {
    for (const type of R.practiceTypes) {
        for (let n = 0; n < 500; n++) {
            const q = generated(type, n);
            assertCard(q, `${type} #${n}`);
            if (q.given !== null) {
                assert.ok(close(q.given * 100, Math.round(q.given * 100)), `${type} #${n}: ${q.given} is exact to the penny`);
            }
        }
    }
});

test('the same seed rebuilds the same Practice question', () => {
    for (const type of R.practiceTypes) {
        assert.deepEqual(generated(type, 7), generated(type, 7));
    }
});
