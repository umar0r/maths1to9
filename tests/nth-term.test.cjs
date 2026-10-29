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
vm.runInNewContext(fs.readFileSync(path.join(root, 'content/nth-term/nth-term.js'), 'utf8'), { window });
const N = window.NthTerm, E = window.Maths1to9LessonEngine;
// The lesson seeds each Practice item with a 32-bit number from pick(), so
// test with seeds like those (small seeds all give a similar first draw).
const realSeed = n => { const random = E.seededRandom(n); random(); return E.randomInt(0, 4294967295, random); };
const generated = (type, n) => { const seed = realSeed(n); return N.generate({ type, seed }, E.seededRandom(seed)); };
const CHOICE_TYPES = ['term-choice', 'first-terms', 'every-term'];
const TYPED_TYPES = ['linear-term', 'take-away', 'square-rule'];

const toNumber = text => Number(String(text).replace(/−/g, '-'));

// Works out one side of displayed working, such as "3 × 4 + 2" or "4²".
function evaluate(text) {
    const js = text.replace(/−/g, '-').replace(/×/g, '*').replace(/(\d+|\))²/g, '$1**2');
    assert.match(js, /^[\d\s+\-*()]+$/, `"${text}" is plain working`);
    return Function(`"use strict"; return (${js});`)();
}

function assertWorking(line, where) {
    const sides = line.split(' = ');
    if (sides.length < 2) return;
    const values = sides.map(evaluate);
    values.forEach(value => assert.equal(value, values[0], `${where}: ${line}`));
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

function assertTyped(q, expected, where) {
    assert.equal(q.input, 'number', where);
    assert.ok(q.fallback, `${where}: fallback feedback`);
    assert.ok(q.feedback, `${where}: right-answer feedback`);
    assert.equal(toNumber(q.answer), expected, `${where}: answer`);
    const values = q.rules.map(r => toNumber(r.value));
    assert.ok(values.length >= 2, `${where}: at least two mistake rules`);
    assert.ok(!values.includes(expected), `${where}: no rule matches the right answer`);
    assert.equal(new Set(values).size, values.length, `${where}: rules are all different`);
    q.rules.forEach(r => assert.ok(r.feedback, `${where}: every rule has feedback`));
    // The working in the right-answer feedback must end on the answer.
    const working = q.feedback.replace(/\.$/, '').split(', then ').at(-1);
    assertWorking(working, where);
    assert.equal(toNumber(working.split(' = ').at(-1)), expected, `${where}: working ends on the answer`);
}

function assertCard(q, where) {
    if (q.asked === 'step') return assertOptions(q, where);
    if (q.fields) return;
    if (q.input === 'choice') {
        assertOptions(q, where);
        const right = q.options.find(o => o.correct).label;
        if (q.positions) {
            assert.equal(right, q.positions.map(n => N.number(N.term(q.rule, n))).join(', '), `${where}: right list`);
        } else if (/^−?\d+$/.test(right)) {
            assert.equal(toNumber(right), N.term(q.rule, q.position), `${where}: right option`);
        } else {
            assert.ok(right.includes(N.number(N.term(q.rule, q.position))), `${where}: right option names the term`);
        }
        return;
    }
    assertTyped(q, N.term(q.rule, q.position), where);
}

test('registration uses one skill and adds the finding placeholder after it', () => {
    const curriculum = JSON.parse(fs.readFileSync(path.join(root, 'content/curriculum.json'), 'utf8'));
    const lessons = curriculum.categories.flatMap(category => category.lessons || []);
    const index = lessons.findIndex(lesson => lesson.folder === 'nth-term');
    assert.ok(index >= 0);
    assert.deepEqual([...lessons[index].skills], ['use-nth-term']);
    assert.equal(lessons[index].title, 'Using the nth term');
    assert.equal(lessons[index + 1].folder, 'finding-the-nth-term');
    assert.deepEqual([...lessons[index + 1].skills], ['find-linear-nth-term']);
    assert.ok(!fs.existsSync(path.join(root, 'content/nth-term/README.md')));
});

test('term() works out a rule at a position', () => {
    assert.equal(N.term({ a: 0, b: 3, c: 2 }, 20), 62);
    assert.equal(N.term({ a: 0, b: -4, c: 30 }, 8), -2);
    assert.equal(N.term({ a: 1, b: 2, c: 0 }, 3), 15);
});

test('Learn has six screens, and all the working on them is right', () => {
    assert.equal(N.learnScreens.length, 6);
    const text = JSON.stringify(N.learnScreens);
    for (const idea of ['term', 'position', 'Positions start at 1', '3n means 3 × n', 'nth term',
        "You don't need to write out", 'below zero', 'n² means n × n', '2n² means 2 × n²',
        'Put it in place of every n']) assert.ok(text.includes(idea), `Learn mentions "${idea}"`);
    for (const word of ['substitut', 'coefficient', 'linear', 'quadratic', '^2', '\\(']) {
        assert.ok(!text.toLowerCase().includes(word), `Learn doesn't say "${word}"`);
    }
    for (const screen of N.learnScreens) {
        for (const line of screen.maths || []) assertWorking(line, screen.title);
    }
});

test('Try it has nine cards, four choice and five typed, all with the right answers', () => {
    const cards = N.examples();
    assert.equal(cards.length, 9);
    assert.equal(cards.filter(q => q.input === 'choice').length, 4);
    cards.forEach((q, i) => assertCard(q, `Try it ${i + 1}`));
    const parts = cards.find(q => q.fields);
    assert.deepEqual({ ...parts.answer }, { square: '9', times: '6' });
    parts.rules.forEach(r => assert.notDeepEqual({ ...r.value }, { ...parts.answer }));
});

test('Check has five cards, two choice and three typed, all with the right answers', () => {
    const cards = N.checks();
    assert.equal(cards.length, 5);
    assert.equal(cards.filter(q => q.input === 'choice').length, 2);
    cards.forEach((q, i) => assertCard(q, `Check ${i + 1}`));
});

test('every Practice type makes sound questions for 2,000 real seeds', () => {
    for (const type of [...CHOICE_TYPES, ...TYPED_TYPES]) {
        for (let n = 0; n < 2000; n++) {
            const q = generated(type, n), where = `${type} seed ${n}`;
            assert.equal(q.input, CHOICE_TYPES.includes(type) ? 'choice' : 'number', where);
            assert.ok(!/-\d/.test(q.prompt + (q.ruleText || '')), `${where}: real minus signs`);
            assertCard(q, where);
            if (type === 'every-term') {
                assert.ok(N.term(q.rule, 1) > 0, `${where}: the 1st term is above zero`);
            }
            if (type === 'take-away') assert.notEqual(N.term(q.rule, q.position), 0, `${where}: answer isn't 0`);
        }
    }
});

test('take-away answers fall below zero about half the time', () => {
    let below = 0;
    for (let n = 0; n < 1000; n++) if (N.term(generated('take-away', n).rule, generated('take-away', n).position) < 0) below++;
    assert.ok(below > 350 && below < 650, `${below} of 1000 below zero`);
});

test('a Practice session has six types, three choice and three typed, and repeats from its seed', () => {
    for (let n = 0; n < 200; n++) {
        const items = N.pick(E.seededRandom(realSeed(n)));
        assert.equal(items.length, 6);
        assert.equal(new Set(items.map(item => item.type)).size, 6);
        assert.equal(items.filter(item => CHOICE_TYPES.includes(item.type)).length, 3);
        assert.deepEqual(JSON.parse(JSON.stringify(N.pick(E.seededRandom(realSeed(n))))), JSON.parse(JSON.stringify(items)));
        items.forEach(item => assert.deepEqual(
            JSON.parse(JSON.stringify(N.generate(item, E.seededRandom(item.seed)))),
            JSON.parse(JSON.stringify(N.generate(item, E.seededRandom(item.seed)))), `${item.type} rebuilds the same`));
    }
});
