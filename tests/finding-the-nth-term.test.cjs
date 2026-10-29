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
vm.runInNewContext(fs.readFileSync(path.join(root, 'content/finding-the-nth-term/finding-nth-term.js'), 'utf8'), { window });
const N = window.FindingNthTerm, E = window.Maths1to9LessonEngine;
// The lesson seeds each Practice item with a 32-bit number from pick(), so
// test with seeds like those (small seeds all give a similar first draw).
const realSeed = n => { const random = E.seededRandom(n); random(); return E.randomInt(0, 4294967295, random); };
const generated = (type, n) => { const seed = realSeed(n); return N.generate({ type, seed }, E.seededRandom(seed)); };
const CHOICE_TYPES = ['rule-up', 'rule-down', 'pattern-dots'];
const TYPED_TYPES = ['adjust', 'find-then-use', 'down-jump'];

const toNumber = text => Number(String(text).replace(/−/g, '-'));
const plain = value => JSON.parse(JSON.stringify(value));

// Works out one side of displayed working, such as "4 × 2 + 1" or "−3 + 17".
function evaluate(text) {
    const js = text.replace(/−/g, '-').replace(/×/g, '*');
    assert.match(js, /^[\d\s+\-*()]+$/, `"${text}" is plain working`);
    return Function(`"use strict"; return (${js});`)();
}

// Checks every "a × b + c = d" style sum in a piece of text.
function assertSums(text, where) {
    for (const [sum] of text.matchAll(/(?<![\d×+−] ?)−?\d+(?: [+−×] −?\d+)+(?: = −?\d+(?: [+−×] −?\d+)*)+/g)) {
        const sides = sum.split(' = ').map(evaluate);
        sides.forEach(value => assert.equal(value, sides[0], `${where}: ${sum}`));
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
        assert.ok(!/\+ −|\+ -/.test(o.label), `${where}: no "+ −" in ${o.label}`);
    });
}

function expectedAnswer(q) {
    if (q.position) return N.term(q.rule, q.position);
    if (q.asked === 'jump') return q.rule.d;
    if (q.asked === 'adjust') return Math.abs(q.rule.c);
    return null;
}

function assertCard(q, where) {
    assert.deepEqual(plain(q.terms), [1, 2, 3, 4].map(n => N.term(q.rule, n)), `${where}: shown terms follow the rule`);
    assertSums(JSON.stringify([q.options, q.feedback]), where);
    if (q.input === 'choice') {
        assertOptions(q, where);
        const right = q.options.find(o => o.correct).label;
        if (q.asked === 'rule') assert.ok(right === N.ruleText(q.rule) || right.endsWith(`${N.ruleText(q.rule)}.`), `${where}: right rule ${right}`);
        else assert.equal(toNumber(right), expectedAnswer(q), `${where}: right option`);
        return;
    }
    const expected = expectedAnswer(q);
    assert.equal(q.input, 'number', where);
    assert.ok(q.fallback, `${where}: fallback feedback`);
    assert.ok(q.feedback, `${where}: right-answer feedback`);
    assert.equal(toNumber(q.answer), expected, `${where}: answer`);
    const values = q.rules.map(r => toNumber(r.value));
    assert.ok(values.length >= 2, `${where}: at least two mistake rules`);
    assert.ok(!values.includes(expected), `${where}: no rule matches the right answer`);
    assert.equal(new Set(values).size, values.length, `${where}: rules are all different`);
    q.rules.forEach(r => assert.ok(r.feedback, `${where}: every rule has feedback`));
}

test('registration keeps the existing placeholder', () => {
    const curriculum = JSON.parse(fs.readFileSync(path.join(root, 'content/curriculum.json'), 'utf8'));
    const lessons = curriculum.categories.flatMap(category => category.lessons || []);
    const index = lessons.findIndex(lesson => lesson.folder === 'finding-the-nth-term');
    assert.equal(lessons[index - 1].folder, 'nth-term');
    assert.equal(lessons[index].title, 'Finding the nth term');
    assert.deepEqual([...lessons[index].skills], ['find-linear-nth-term']);
    assert.ok(!fs.existsSync(path.join(root, 'content/finding-the-nth-term/README.md')));
});

test('ruleText() writes rules the lesson way', () => {
    assert.equal(N.ruleText({ d: 4, c: 1 }), '4n + 1');
    assert.equal(N.ruleText({ d: 4, c: -3 }), '4n − 3');
    assert.equal(N.ruleText({ d: 4, c: 0 }), '4n');
    assert.equal(N.ruleText({ d: -2, c: 12 }), '12 − 2n');
    assert.equal(N.term({ d: -3, c: 17 }, 4), 5);
});

test('Learn has six screens, and all the working on them is right', () => {
    assert.equal(N.learnScreens.length, 6);
    const text = JSON.stringify(N.learnScreens);
    for (const idea of ['difference', '4 times table', '4n + 1', '3n − 1', '17 − 3n', 'Check the first two terms',
        'last lesson', '4n + 5']) assert.ok(text.toLowerCase().includes(idea.toLowerCase()), `Learn mentions "${idea}"`);
    for (const word of ['common difference', 'linear', 'arithmetic', 'coefficient', 'AQA', '−3n + 17', '\\(']) {
        assert.ok(!text.toLowerCase().includes(word.toLowerCase()), `Learn doesn't say "${word}"`);
    }
    // "4n + 5 ... 4 × 1 + 5 = 9" is the mistake being shown, and is right as a sum.
    assertSums(text, 'Learn');
});

test('Try it has nine cards, four choice and five typed, all with the right answers', () => {
    const cards = N.examples();
    assert.equal(cards.length, 9);
    assert.equal(cards.filter(q => q.input === 'choice').length, 4);
    cards.forEach((q, i) => assertCard(q, `Try it ${i + 1}`));
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
            assert.ok(!/(^|[\s(,])-\d/.test(q.prompt + JSON.stringify(q.options || [])), `${where}: real minus signs`);
            assert.ok(q.terms.every(t => t >= 1) || type === 'find-then-use' || type === 'adjust' || type === 'down-jump',
                `${where}: terms above zero`);
            assertCard(q, where);
        }
    }
});

test('a Practice session has six types, three choice and three typed, and repeats from its seed', () => {
    for (let n = 0; n < 200; n++) {
        const items = N.pick(E.seededRandom(realSeed(n)));
        assert.equal(items.length, 6);
        assert.equal(new Set(items.map(item => item.type)).size, 6);
        assert.equal(items.filter(item => CHOICE_TYPES.includes(item.type)).length, 3);
        assert.deepEqual(plain(N.pick(E.seededRandom(realSeed(n)))), plain(items));
        items.forEach(item => assert.deepEqual(
            plain(N.generate(item, E.seededRandom(item.seed))), plain(N.generate(item, E.seededRandom(item.seed))),
            `${item.type} rebuilds the same`));
    }
});
