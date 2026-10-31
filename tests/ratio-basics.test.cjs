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
vm.runInNewContext(fs.readFileSync(path.join(root, 'content/ratio-basics/ratio.js'), 'utf8'), { window });
const R = window.RatioBasics, E = window.Maths1to9LessonEngine;
const lesson = JSON.parse(fs.readFileSync(path.join(root, 'content/ratio-basics/lesson.json'), 'utf8'));
// The lesson seeds each Practice item with a 32-bit number from pick(), so
// test with seeds like those (small seeds all give a similar first draw).
const realSeed = n => { const random = E.seededRandom(n); random(); return E.randomInt(0, 4294967295, random); };
const generated = (type, n) => { const seed = realSeed(n); return R.generate({ type, seed }, E.seededRandom(seed)); };
const CHOICE_TYPES = ['simplify-choice', 'fraction-choice', 'same-ratio'];
const TYPED_TYPES = ['simplify-typed', 'part-and-rest', 'fraction-typed'];

const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
const plain = value => JSON.parse(JSON.stringify(value));
const ratioOf = text => String(text).split(/\s*:\s*/).map(Number);
const valueOf = text => { const [top, bottom] = String(text).split('/').map(Number); return top / (bottom ?? 1); };
const close = (a, b) => Math.abs(a - b) < 1e-9;
const sameRatio = ([a, b], [c, d]) => a * d === b * c;

// Works out one side of displayed working, such as "200 ÷ 40" or "5 + 1 + 6".
function evaluate(text) {
    const js = text.replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/');
    assert.match(js, /^[\d\s.+\-*/()]+$/, `"${text}" is plain working`);
    return Function(`"use strict"; return (${js});`)();
}

// Checks every "a ÷ b = c" style sum in a piece of text.
function assertSums(text, where) {
    for (const [sum] of text.matchAll(/(?<![\d.÷×+−/] ?)\d+(?: [÷×+−] \d+)+(?: = \d+)+(?![\d/])/g)) {
        const sides = sum.split(' = ').map(evaluate);
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

// A ratio never breaks across lines: every " : " uses non-breaking spaces.
function assertKeptTogether(q, where) {
    const text = JSON.stringify(plain([q.prompt, q.feedback, q.fallback, q.options, q.rules]));
    assert.ok(!/\d : \d| : [a-z]/.test(text), `${where}: ratios use non-breaking spaces`);
}

function assertCard(q, where) {
    assert.ok(Array.isArray(q.ratio) && q.ratio.length === 2, `${where}: ratio`);
    assert.ok(['simplify', 'fraction', 'notation', 'compare'].includes(q.asked), `${where}: asked`);
    assert.ok(lesson.assessment.question_types[q.questionType], `${where}: ${q.questionType} maps to a skill`);
    assertKeptTogether(q, where);
    assertSums(JSON.stringify(plain([q.prompt, q.options, q.feedback])).replace(/ /g, ' '), where);
    if (q.input === 'choice') {
        assertOptions(q, where);
        const right = q.options.find(o => o.correct).label;
        if (q.asked === 'simplify') {
            const [p, r] = ratioOf(right);
            assert.ok(sameRatio([p, r], q.ratio), `${where}: right option is the same ratio`);
            assert.equal(gcd(p, r), 1, `${where}: right option is in its simplest form`);
            q.options.filter(o => !o.correct).forEach(o => {
                const wrong = ratioOf(o.label);
                assert.ok(!(sameRatio(wrong, q.ratio) && gcd(...wrong) === 1), `${where}: ${o.label} isn't also right`);
            });
        }
        if (q.asked === 'fraction') {
            const [a, b] = q.ratio;
            assert.ok(close(valueOf(right), a / (a + b)) || close(valueOf(right), b / (a + b)), `${where}: right fraction`);
        }
        if (q.questionType === 'same-ratio') {
            assert.ok(sameRatio(ratioOf(right), q.ratio), `${where}: right option is the same ratio`);
            q.options.filter(o => !o.correct).forEach(o =>
                assert.ok(!sameRatio(ratioOf(o.label), q.ratio), `${where}: ${o.label} isn't the same ratio`));
        }
        return;
    }
    assert.equal(q.input, 'number', where);
    assert.equal(q.fractions, true, `${where}: fractions on`);
    assert.ok(q.fallback, `${where}: fallback feedback`);
    assert.ok(q.feedback, `${where}: right-answer feedback`);
    assert.ok(q.rules.length >= 2, `${where}: at least two mistake rules`);
    q.rules.forEach(r => assert.ok(r.feedback, `${where}: every rule has feedback`));
    if (q.fields) {
        assert.equal(q.asked, 'simplify', where);
        assert.deepEqual(plain(q.fields.map(f => f.id)), ['first', 'second'], `${where}: two fields`);
        const answer = [Number(q.answer.first), Number(q.answer.second)];
        assert.ok(sameRatio(answer, q.ratio), `${where}: answer is the same ratio as ${q.ratio}`);
        assert.equal(gcd(...answer), 1, `${where}: answer is in its simplest form`);
        const keys = q.rules.map(r => `${r.value.first}:${r.value.second}`);
        assert.equal(new Set(keys).size, keys.length, `${where}: rules are all different`);
        assert.ok(!keys.includes(`${answer[0]}:${answer[1]}`), `${where}: no rule matches the right answer`);
    } else {
        assert.equal(q.asked, 'fraction', where);
        assert.equal(q.inputLabel, 'Fraction, like 1/4', `${where}: input label`);
        const [a, b] = q.ratio;
        const answer = valueOf(q.answer);
        assert.ok(close(answer, a / (a + b)) || close(answer, b / (a + b)), `${where}: answer`);
        const values = q.rules.map(r => valueOf(r.value));
        values.forEach(value => assert.ok(!close(value, answer), `${where}: no rule matches the right answer`));
        assert.equal(new Set(values.map(v => v.toFixed(9))).size, values.length, `${where}: rules are all different`);
    }
}

test('Learn has five teaching screens with sliders and no questions', () => {
    assert.equal(R.learnScreens.length, 5);
    R.learnScreens.forEach((screen, index) => {
        assert.ok(screen.title && screen.lines.length && screen.slider, `screen ${index + 1}`);
        assert.ok(screen.start >= screen.min && screen.start <= screen.max, `screen ${index + 1} starts in range`);
        assert.ok(!screen.lines.some(line => line.includes('?')), `screen ${index + 1} asks nothing`);
        assertSums([...screen.lines, screen.callout, screen.secondCallout ?? '', ...screen.maths].join(' ').replace(/ /g, ' '), `learn ${index + 1}`);
    });
    assert.equal(R.sliderText(1, 2), 'Block size: 40 ml');
    assert.equal(R.sliderText(2, 1), 'Step 1 of 3');
});

test('simplify divides both numbers by the HCF', () => {
    assert.deepEqual(plain(R.simplify(200, 120)), [5, 3]);
    assert.deepEqual(plain(R.simplify(84, 147)), [4, 7]);
    assert.deepEqual(plain(R.simplify(3, 4)), [3, 4]);
});

test('Try it: 8 cards, 4 choice and 4 typed, all correct', () => {
    const cards = R.examples();
    assert.equal(cards.length, 8);
    assert.equal(cards.filter(q => q.input === 'choice').length, 4);
    cards.forEach((q, index) => assertCard(q, `try ${index + 1}`));
    assert.equal(lesson.score_activities.length, cards.length);
});

test('Check: 5 cards, 2 choice and 3 typed, all correct', () => {
    const cards = R.checks();
    assert.equal(cards.length, 5);
    assert.equal(cards.filter(q => q.input === 'choice').length, 2);
    cards.forEach((q, index) => assertCard(q, `check ${index + 1}`));
    assert.equal(lesson.comparison.questions.length, cards.length);
});

test('Practice: each session has all six types once, 3 choice and 3 typed', () => {
    for (let n = 0; n < 50; n++) {
        const items = R.pick(E.seededRandom(realSeed(n)));
        assert.deepEqual(plain(items.map(i => i.type)).sort(), plain(R.practiceTypes).sort());
        const cards = items.map(item => R.generate(item, E.seededRandom(item.seed)));
        assert.equal(cards.filter(q => q.input === 'choice').length, 3);
    }
    assert.deepEqual(plain(R.practiceTypes).sort(), [...CHOICE_TYPES, ...TYPED_TYPES].sort());
});

test('Practice cards are right for many seeds', () => {
    for (const type of R.practiceTypes) {
        for (let n = 0; n < 300; n++) assertCard(generated(type, n), `${type} seed ${n}`);
    }
});

test('Practice gives the same card for the same seed', () => {
    for (const type of R.practiceTypes) {
        assert.deepEqual(plain(generated(type, 7)), plain(generated(type, 7)));
    }
});
