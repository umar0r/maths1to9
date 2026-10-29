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
vm.runInNewContext(fs.readFileSync(path.join(root, 'content/one-amount-as-a-percentage/percentage-of.js'), 'utf8'), { window });
const P = window.PercentageOf, E = window.Maths1to9LessonEngine;
// The lesson seeds each Practice item with a 32-bit number from pick(), so
// test with seeds like those (small seeds all give a similar first draw).
const realSeed = n => { const random = E.seededRandom(n); random(); return E.randomInt(0, 4294967295, random); };
const generated = (type, n) => { const seed = realSeed(n); return P.generate({ type, seed }, E.seededRandom(seed)); };
const CHOICE_TYPES = ['which-is-100', 'which-working', 'percent-choice'];
const TYPED_TYPES = ['part-of-whole', 'find-the-whole', 'more-than-100'];

const toNumber = text => Number(String(text).replace(/−/g, '-').replace(/[%£,]|\s*km$/g, ''));
const plain = value => JSON.parse(JSON.stringify(value));
// Whole numbers, or one decimal place, never a long or recurring decimal.
const tidy = (value, places = 1) => Math.abs(value * 10 ** places - Math.round(value * 10 ** places)) < 1e-6;

// Works out one side of displayed working, such as "18 ÷ 30 × 100" or "84 + 36".
function evaluate(text) {
    const js = text.replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/');
    assert.match(js, /^[\d\s.+\-*/()]+$/, `"${text}" is plain working`);
    return Function(`"use strict"; return (${js});`)();
}

// Checks every "a ÷ b × 100 = c" style sum in a piece of text.
function assertSums(text, where) {
    for (const [sum] of text.matchAll(/(?<![\d.÷×+−] ?)\d+(?:\.\d+)?(?: [÷×+−] \d+(?:\.\d+)?)+(?: = \d+(?:\.\d+)?)+(?!\.?\d)/g)) {
        const sides = sum.split(' = ').map(evaluate);
        // Rounded wrong answers on screen (83.3%) only need to be close.
        sides.forEach(value => assert.ok(Math.abs(value - sides[0]) < 0.06, `${where}: ${sum}`));
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
    assert.ok(q.part > 0 && q.whole > 0, `${where}: part and whole`);
    assertSums(JSON.stringify([q.prompt, q.options, q.feedback]), where);
    // Round off float noise: 23 ÷ 40 × 100 gives 57.49999999999999.
    const expected = Math.round(P.percent(q.part, q.whole) * 1000) / 1000;
    assert.ok(tidy(expected), `${where}: ${expected} has at most one decimal place`);
    if (q.input === 'choice') {
        assertOptions(q, where);
        const right = q.options.find(o => o.correct).label;
        if (q.asked === 'percent') assert.equal(toNumber(right), expected, `${where}: right option`);
        if (q.asked === 'whole') assert.equal(toNumber(right), q.whole, `${where}: right option is the whole`);
        if (q.asked === 'working') assert.ok(Math.abs(evaluate(right) - expected) < 1e-9, `${where}: right working`);
        if (q.asked === 'mistake') assert.ok(right.includes(`÷ ${q.whole}`), `${where}: right option divides by the whole`);
        return;
    }
    assert.equal(q.input, 'number', where);
    assert.equal(q.asked, 'percent', where);
    assert.equal(q.inputLabel, 'Percentage (no % sign)', `${where}: input label`);
    assert.ok(q.fallback, `${where}: fallback feedback`);
    assert.ok(q.feedback, `${where}: right-answer feedback`);
    assert.equal(toNumber(q.answer), expected, `${where}: answer`);
    const values = q.rules.map(r => toNumber(r.value));
    assert.ok(values.length >= 2, `${where}: at least two mistake rules`);
    assert.ok(!values.includes(expected), `${where}: no rule matches the right answer`);
    assert.equal(new Set(values).size, values.length, `${where}: rules are all different`);
    values.forEach(value => assert.ok(tidy(value, 3), `${where}: rule ${value} is a value a pupil can type`));
    q.rules.forEach(r => assert.ok(r.feedback, `${where}: every rule has feedback`));
}

test('registration adds the skill and the lesson after percentages of amounts', () => {
    const curriculum = JSON.parse(fs.readFileSync(path.join(root, 'content/curriculum.json'), 'utf8'));
    const lessons = curriculum.categories.flatMap(category => category.lessons || []);
    const index = lessons.findIndex(lesson => lesson.folder === 'one-amount-as-a-percentage');
    assert.equal(lessons[index - 1].folder, 'percentages-of-amounts');
    assert.equal(lessons[index].title, 'One amount as a percentage of another');
    assert.deepEqual([...lessons[index].skills], ['express-as-percentage']);
    const skills = JSON.stringify(JSON.parse(fs.readFileSync(path.join(root, 'content/skills.json'), 'utf8')));
    assert.ok(skills.includes('"id":"express-as-percentage"'));
    const collections = JSON.parse(fs.readFileSync(path.join(root, 'content/collections.json'), 'utf8'));
    const route = JSON.stringify(collections);
    assert.ok(route.includes('"percentages-of-amounts","one-amount-as-a-percentage"'));
    assert.ok(!fs.existsSync(path.join(root, 'content/one-amount-as-a-percentage/README.md')));
});

test('percent() divides by the whole and multiplies by 100', () => {
    assert.equal(P.percent(18, 30), 60);
    assert.equal(P.percent(9, 40), 22.5);
    assert.equal(P.percent(25, 20), 125);
});

test('Learn has five screens, and all the working on them is right', () => {
    assert.equal(P.learnScreens.length, 5);
    const text = JSON.stringify(P.learnScreens);
    for (const idea of ['100%', 'calculator', '18 ÷ 30', 'A ÷ B × 100', '50 ÷ 20 × 100 = 250', '22.5%',
        '25 ÷ 20 × 100 = 125', 'more than 100%', '84 + 36', '84 ÷ 120 × 100 = 70']) {
        assert.ok(text.includes(idea), `Learn mentions "${idea}"`);
    }
    for (const word of ['AQA', 'represents', 'quantity', 'proportion', '\\(']) {
        assert.ok(!text.includes(word), `Learn doesn't say "${word}"`);
    }
    assertSums(text, 'Learn');
});

test('Try it has nine cards, four choice and five typed, all with the right answers', () => {
    const cards = P.examples();
    assert.equal(cards.length, 9);
    assert.equal(cards.filter(q => q.input === 'choice').length, 4);
    cards.forEach((q, i) => assertCard(q, `Try it ${i + 1}`));
    assert.deepEqual(plain(cards.filter(q => q.input === 'number').map(q => toNumber(q.answer))), [22.5, 75, 125, 75, 100]);
});

test('Check has five cards, two choice and three typed, all with the right answers', () => {
    const cards = P.checks();
    assert.equal(cards.length, 5);
    assert.equal(cards.filter(q => q.input === 'choice').length, 2);
    cards.forEach((q, i) => assertCard(q, `Check ${i + 1}`));
    assert.deepEqual(plain(cards.filter(q => q.input === 'number').map(q => toNumber(q.answer))), [25, 20, 35]);
});

test('every Practice type makes sound questions for 2,000 real seeds', () => {
    for (const type of [...CHOICE_TYPES, ...TYPED_TYPES]) {
        for (let n = 0; n < 2000; n++) {
            const q = generated(type, n), where = `${type} seed ${n}`;
            assert.equal(q.input, CHOICE_TYPES.includes(type) ? 'choice' : 'number', where);
            assert.ok(q.part < q.whole === (type !== 'more-than-100'), `${where}: part ${q.part}, whole ${q.whole}`);
            assert.notEqual(P.percent(q.part, q.whole), 50, `${where}: not 50%`);
            assertCard(q, where);
        }
    }
});

test('a Practice session has six types, three choice and three typed, and repeats from its seed', () => {
    for (let n = 0; n < 200; n++) {
        const items = P.pick(E.seededRandom(realSeed(n)));
        assert.equal(items.length, 6);
        assert.equal(new Set(items.map(item => item.type)).size, 6);
        assert.equal(items.filter(item => CHOICE_TYPES.includes(item.type)).length, 3);
        assert.deepEqual(plain(P.pick(E.seededRandom(realSeed(n)))), plain(items));
        items.forEach(item => assert.deepEqual(
            plain(P.generate(item, E.seededRandom(item.seed))), plain(P.generate(item, E.seededRandom(item.seed))),
            `${item.type} rebuilds the same`));
    }
});
