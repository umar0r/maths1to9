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
vm.runInNewContext(fs.readFileSync(path.join(root, 'content/speed-distance-time/speed.js'), 'utf8'), { window });
const S = window.SpeedDistanceTime, E = window.Maths1to9LessonEngine;
// The lesson seeds each Practice item with a 32-bit number from pick(), so
// test with seeds like those (small seeds all give a similar first draw).
const realSeed = n => { const random = E.seededRandom(n); random(); return E.randomInt(0, 4294967295, random); };
const generated = (type, n) => { const seed = realSeed(n); return S.generate({ type, seed }, E.seededRandom(seed)); };

const toNumber = text => Number(String(text).replace(/ ?(km\/h|mph|km|miles|hours|seconds)$/, ''));
const close = (a, b, within = 1e-6) => Math.abs(a - b) <= within;

// Works out displayed working, such as "54 ÷ 3" or "5 ÷ (25 ÷ 60)".
function evaluate(text) {
    const js = text.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
    assert.match(js, /^[\d\s.+\-*/()]+$/, `"${text}" is plain working`);
    return Function(`"use strict"; return (${js});`)();
}

// Checks every "a × b = c" style sum in the text. Rounded answers may be 0.05 out.
function assertSums(text, where) {
    const sums = text.match(/\(?\d+(?:\.\d+)?(?: [×÷+−] \(?\d+(?:\.\d+)?\)?)+(?: = \d+(?:\.\d+)?)/g) || [];
    for (const sum of sums) {
        const sides = sum.split(' = ').map(evaluate);
        assert.ok(close(sides[0], sides[1], 0.05), `${where}: ${sum}`);
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

// The value the card asks for, from the two it gives.
function expected(q) {
    const { distance, speed, time } = q.values;
    if (q.asked === 'speed') return distance / time;
    if (q.asked === 'distance') return speed * time;
    if (q.asked === 'time') return distance / speed;
    return null;
}

function assertCard(q, where) {
    assertSums(JSON.stringify([q.prompt, q.options, q.feedback, q.fallback, q.rules]), where);
    assert.doesNotMatch(JSON.stringify(q), /AQA|Edexcel|OCR|undefined|NaN|Infinity/, `${where}: no exam boards or broken text`);
    assert.ok(q.values && 'distance' in q.values && 'speed' in q.values && 'time' in q.values, `${where}: values`);
    if (q.input === 'choice') {
        assertOptions(q, where);
        const right = q.options.find(o => o.correct).label;
        if (q.asked === 'calculation') {
            const answer = q.values.speed === null ? q.values.distance / q.values.time
                : q.values.time === null ? q.values.distance / q.values.speed : q.values.speed * q.values.time;
            assert.ok(close(evaluate(right), answer), `${where}: right working ${right}`);
        }
        if (['speed', 'distance'].includes(q.asked) && /^\d/.test(right)) {
            assert.ok(close(toNumber(right), expected(q), 0.05), `${where}: right answer ${right}`);
        }
        return;
    }
    assert.equal(q.input, 'number', where);
    assert.ok(q.unit, `${where}: unit`);
    assert.ok(q.fallback, `${where}: fallback feedback`);
    assert.ok(q.feedback, `${where}: right-answer feedback`);
    assert.ok(/^\d+(\.\d{1,2})?$/.test(q.answer), `${where}: answer ${q.answer} is plain`);
    if (q.unit !== 'seconds' || q.asked !== 'time') {
        assert.ok(close(Number(q.answer), expected(q), q.tolerance ?? 0.005), `${where}: answer ${q.answer}`);
    }
    const tolerance = q.tolerance ?? 0;
    const values = q.rules.map(r => Number(r.value));
    assert.ok(values.length >= 1, `${where}: at least one mistake rule`);
    values.forEach(value => assert.ok(Math.abs(value - Number(q.answer)) > tolerance, `${where}: rule ${value} isn't marked right`));
    values.forEach((value, i) => values.slice(i + 1).forEach(other =>
        assert.notEqual(value, other, `${where}: rules ${value} and ${other} are different`)));
    q.rules.forEach(r => assert.ok(r.feedback, `${where}: every rule has feedback`));
}

test('speed lesson: Try it has 10 cards, 5 choice and 5 typed, all correct', () => {
    const cards = S.examples();
    assert.equal(cards.length, 10);
    assert.equal(cards.filter(q => q.input === 'choice').length, 5);
    cards.forEach((q, i) => assertCard(q, `try-${i + 1}`));
});

test('speed lesson: Check has 6 cards, 3 choice and 3 typed, all correct', () => {
    const cards = S.checks();
    assert.equal(cards.length, 6);
    assert.equal(cards.filter(q => q.input === 'choice').length, 3);
    cards.forEach((q, i) => assertCard(q, `check-${i + 1}`));
});

test('speed lesson: every question type is in lesson.json and scored for the one skill', () => {
    const lesson = JSON.parse(fs.readFileSync(path.join(root, 'content/speed-distance-time/lesson.json'), 'utf8'));
    const types = lesson.assessment.question_types;
    const used = [...S.practiceTypes, ...S.examples().map(q => q.questionType), ...S.checks().map(q => q.questionType)];
    used.forEach(type => assert.equal(types[type], 'speed-distance-time', type));
    assert.equal(lesson.comparison.questions.length, S.checks().length);
});

test('speed lesson: each Practice session has the 3 typed types and 3 choice types', () => {
    for (let n = 0; n < 200; n++) {
        const items = S.pick(E.seededRandom(realSeed(n)));
        assert.equal(items.length, 6);
        assert.equal(new Set(items.map(item => item.type)).size, 6);
        S.TYPED_TYPES.forEach(type => assert.ok(items.some(item => item.type === type), type));
    }
});

test('speed lesson: every Practice type makes good cards (500 seeds each)', () => {
    for (const type of S.practiceTypes) {
        for (let n = 0; n < 500; n++) assertCard(generated(type, n), `${type} seed ${n}`);
    }
});

test('speed lesson: Practice rebuilds the same card from the same seed', () => {
    for (const type of S.practiceTypes) {
        assert.deepEqual(generated(type, 7), generated(type, 7), type);
    }
});

test('speed lesson: toHours has no float noise', () => {
    assert.equal(S.toHours(1, 15), 1.25);
    assert.equal(S.toHours(0, 40), Number((40 / 60).toPrecision(12)));
    assert.equal(S.toHours(2, 45), 2.75);
});

test('speed lesson: Learn screens show before they ask', () => {
    assert.equal(S.learnScreens.length, 7);
    S.learnScreens.forEach((screen, i) => {
        assert.ok(screen.title && screen.lines.length, `learn-${i + 1}`);
        assert.doesNotMatch(screen.lines.join(' '), /AQA|Edexcel|OCR|compound measure|\brate\b/i, `learn-${i + 1} wording`);
    });
    assert.doesNotMatch(S.learnScreens[0].lines.join(' '), /\?$/, 'Learn 1 does not open with a question');
});

test('speed lesson: curriculum lists only the speed skill, and the units lesson has speed units', () => {
    const curriculum = JSON.parse(fs.readFileSync(path.join(root, 'content/curriculum.json'), 'utf8'));
    const lessons = curriculum.categories.flatMap(category => category.lessons);
    assert.deepEqual(lessons.find(l => l.folder === 'speed-distance-time').skills, ['speed-distance-time']);
    assert.ok(lessons.find(l => l.folder === 'units-and-conversions').skills.includes('speed-unit-conversions'));
});
