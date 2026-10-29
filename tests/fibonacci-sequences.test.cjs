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
vm.runInNewContext(fs.readFileSync(path.join(root, 'content/fibonacci-sequences/fibonacci.js'), 'utf8'), { window });
const F = window.Fibonacci, E = window.Maths1to9LessonEngine;
// The lesson seeds each Practice item with a 32-bit number from pick(), so
// test with seeds like those (small seeds all give a similar first draw).
const realSeed = n => { const random = E.seededRandom(n); random(); return E.randomInt(0, 4294967295, random); };
const generated = (type, n) => { const seed = realSeed(n); return F.generate({ type, seed }, E.seededRandom(seed)); };
const CHOICE_TYPES = ['next-two-choice', 'spot-wrong', 'which-is-fib'];
const TYPED_TYPES = ['next-term', 'next-two', 'kth-term'];

const toNumber = text => Number(String(text).replace(/−/g, '-'));
const list = terms => terms.map(F.number).join(', ');
const plain = value => JSON.parse(JSON.stringify(value));

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

// Every sum like "7 + 12 = 19" on screen must be right.
function assertSums(text, where) {
    for (const [, a, b, c] of text.matchAll(/(?<![+−] )(?<!\d)(−?\d+) \+ (−?\d+) = (−?\d+)/g)) {
        assert.equal(toNumber(a) + toNumber(b), toNumber(c), `${where}: ${a} + ${b} = ${c}`);
    }
}

function assertCard(q, where) {
    assertSums(JSON.stringify(q.options || q.feedback || ''), where);
    const start = q.start;
    // Shown terms follow the rule, except on cards that hide a mistake.
    if (q.asked !== 'wrong-term' && q.questionType !== 'check-mia' && q.asked !== 'which') {
        assert.deepEqual(plain(q.terms), plain(F.extend(start[0], start[1], q.terms.length)), `${where}: shown terms`);
    }
    if (q.input === 'choice') assertOptions(q, where);
    const right = q.input === 'choice' ? q.options.find(o => o.correct).label : null;
    if (q.asked === 'pair') {
        const shown = q.terms;
        assert.equal(right, `${shown.at(-2)} and ${shown.at(-1)}`, `${where}: the last two terms`);
        return;
    }
    if (q.asked === 'which') {
        assert.ok(right.startsWith(list(F.extend(start[0], start[1], 4))), `${where}: the Fibonacci-type list`);
        return;
    }
    if (q.asked === 'wrong-term') {
        const fails = [];
        for (let i = 2; i < q.terms.length; i++) if (q.terms[i - 2] + q.terms[i - 1] !== q.terms[i]) fails.push(i + 1);
        assert.deepEqual(fails, [q.wrongPosition], `${where}: exactly one sum fails`);
        assert.equal(right, `The ${F.ordinal(q.wrongPosition)} term`, `${where}: right option`);
        return;
    }
    const longest = Math.max(...q.asked);
    const expected = q.asked.map(position => F.extend(start[0], start[1], longest)[position - 1]);
    if (q.input === 'choice') {
        if (expected.length === 1 && /^−?\d+$/.test(right)) assert.equal(toNumber(right), expected[0], `${where}: right option`);
        else if (expected.length === 1) assert.ok(right.includes(`= ${F.number(expected[0])}`), `${where}: right option gives ${expected[0]}`);
        else assert.equal(right, list(expected), `${where}: right option`);
        return;
    }
    assert.ok(q.fallback, `${where}: fallback feedback`);
    assert.ok(q.feedback, `${where}: right-answer feedback`);
    if (q.fields) {
        assert.deepEqual([toNumber(q.answer.first), toNumber(q.answer.second)], plain(expected), `${where}: answer`);
        const keys = q.rules.map(r => `${toNumber(r.value.first)},${toNumber(r.value.second)}`);
        assert.ok(!keys.includes(expected.join(',')), `${where}: no rule matches the answer`);
        assert.equal(new Set(keys).size, keys.length, `${where}: rules are all different`);
    } else {
        assert.equal(toNumber(q.answer), expected[0], `${where}: answer`);
        const values = q.rules.map(r => toNumber(r.value));
        assert.ok(!values.includes(expected[0]), `${where}: no rule matches the answer`);
        assert.equal(new Set(values).size, values.length, `${where}: rules are all different`);
    }
    assert.ok(q.rules.length >= 2, `${where}: at least two mistake rules`);
    q.rules.forEach(r => assert.ok(r.feedback, `${where}: every rule has feedback`));
}

test('registration adds the skill and the lesson after finding the nth term', () => {
    const curriculum = JSON.parse(fs.readFileSync(path.join(root, 'content/curriculum.json'), 'utf8'));
    const lessons = curriculum.categories.flatMap(category => category.lessons || []);
    const index = lessons.findIndex(lesson => lesson.folder === 'fibonacci-sequences');
    assert.equal(lessons[index - 1].folder, 'finding-the-nth-term');
    assert.deepEqual([...lessons[index].skills], ['continue-fibonacci-sequences']);
    assert.equal(lessons.find(lesson => lesson.folder === 'special-sequences').subtitle,
        'Recognise square, cube and triangular numbers.');
    const skills = JSON.parse(fs.readFileSync(path.join(root, 'content/skills.json'), 'utf8'));
    const all = JSON.stringify(skills);
    assert.ok(all.includes('"id":"continue-fibonacci-sequences"'));
    assert.ok(!fs.existsSync(path.join(root, 'content/fibonacci-sequences/README.md')));
});

test('extend() builds a Fibonacci-type sequence', () => {
    assert.deepEqual(plain(F.extend(1, 1, 7)), [1, 1, 2, 3, 5, 8, 13]);
    assert.deepEqual(plain(F.extend(-2, 3, 5)), [-2, 3, 1, 4, 5]);
});

test('Learn has five screens, and every sum on them is right', () => {
    assert.equal(F.learnScreens.length, 5);
    const text = JSON.stringify(F.learnScreens);
    for (const idea of ['add the two terms before', 'Fibonacci-type sequence', 'nth term', '3n − 1',
        'Count the positions', 'negative']) assert.ok(text.includes(idea), `Learn mentions "${idea}"`);
    for (const word of ['AQA', 'recursive', 'arithmetic', '\\(']) assert.ok(!text.includes(word), `Learn doesn't say "${word}"`);
    assertSums(text, 'Learn');
    assert.deepEqual(plain(F.extend(1, 3, 8)).slice(5), [18, 29, 47]);
});

test('Try it has nine cards, four choice and five typed, all with the right answers', () => {
    const cards = F.examples();
    assert.equal(cards.length, 9);
    assert.equal(cards.filter(q => q.input === 'choice').length, 4);
    cards.forEach((q, i) => assertCard(q, `Try it ${i + 1}`));
});

test('Check has five cards, two choice and three typed, all with the right answers', () => {
    const cards = F.checks();
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
            assertCard(q, where);
        }
    }
});

test('a Practice session has six types, three choice and three typed, and repeats from its seed', () => {
    for (let n = 0; n < 200; n++) {
        const items = F.pick(E.seededRandom(realSeed(n)));
        assert.equal(items.length, 6);
        assert.equal(new Set(items.map(item => item.type)).size, 6);
        assert.equal(items.filter(item => CHOICE_TYPES.includes(item.type)).length, 3);
        assert.deepEqual(plain(F.pick(E.seededRandom(realSeed(n)))), plain(items));
        items.forEach(item => assert.deepEqual(
            plain(F.generate(item, E.seededRandom(item.seed))), plain(F.generate(item, E.seededRandom(item.seed))),
            `${item.type} rebuilds the same`));
    }
});
