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
vm.runInNewContext(fs.readFileSync(path.join(root, 'content/inverse-proportion/inverse.js'), 'utf8'), { window });
const I = window.InverseProportion, E = window.Maths1to9LessonEngine;
const lesson = JSON.parse(fs.readFileSync(path.join(root, 'content/inverse-proportion/lesson.json'), 'utf8'));
// The lesson seeds each Practice item with a 32-bit number from pick(), so
// test with seeds like those (small seeds all give a similar first draw).
const realSeed = n => { const random = E.seededRandom(n); random(); return E.randomInt(0, 4294967295, random); };
const generated = (type, n) => { const seed = realSeed(n); return I.generate({ type, seed }, E.seededRandom(seed)); };
const close = (a, b, within = 1e-6) => Math.abs(a - b) <= within;
const SEEDS = 500;
const ASKED = ['time', 'workers', 'total', 'xy', 'change', 'applies', 'table'];

// "12 ÷ 3 = 4 hours" and "3 builders × 4 hours = 12" both count as sums.
// A number ending in "…" is a rounded value, so it is only checked to 2 dp.
function sumAt(text, index) {
    const boundaries = ['.', ',', '(', ';']
        .map(character => text.lastIndexOf(character, index - 1));
    const and = text.lastIndexOf(' and ', index - 1);
    const start = Math.max(...boundaries, and < 0 ? -1 : and + 4) + 1;
    const left = text.slice(start, index).trim();
    const right = text.slice(index + 1).match(/^\s*([\d.]+)\s*(…)?/);
    if (!right) return null;
    return { left, value: Number(right[1]), approximate: Boolean(right[2]) };
}

function evaluate(left, where) {
    const js = left.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')
        .replace(/[A-Za-z£][A-Za-z-]*/g, ' ')
        .trim();
    if (!js) return null;
    if (!/^[\d\s.+\-*/()]+$/.test(js)) return null;
    try {
        const value = Function(`"use strict"; return (${js});`)();
        return Number.isFinite(value) ? value : null;
    } catch {
        throw new Error(`${where}: cannot read "${left}"`);
    }
}

function assertSums(text, where) {
    if (!text) return;
    for (let index = text.indexOf('='); index >= 0; index = text.indexOf('=', index + 1)) {
        const sum = sumAt(text, index);
        if (!sum || sum.approximate) continue;
        const value = evaluate(sum.left, where);
        if (value === null) continue;
        assert.ok(close(value, sum.value, 0.006), `${where}: "${sum.left} = ${sum.value}"`);
    }
}

function assertOptions(q, where) {
    assert.equal(q.options.length, 4, `${where}: four options`);
    assert.equal(new Set(q.options.map(option => option.label)).size, 4, `${where}: four different options`);
    assert.equal(q.options.filter(option => option.correct).length, 1, `${where}: one right option`);
    const feedbacks = q.options.map(option => option.feedback);
    assert.equal(new Set(feedbacks).size, 4, `${where}: each option has its own feedback`);
    q.options.forEach(option => {
        assert.ok(option.feedback, `${where}: option ${option.label} has feedback`);
        assert.notEqual(option.feedback.trim(), option.label.trim(), `${where}: feedback isn't just the label`);
    });
}

function assertCard(q, where) {
    const text = JSON.stringify(q);
    assert.doesNotMatch(text, /undefined|NaN|Infinity/, `${where}: no broken numbers in ${text}`);
    assert.doesNotMatch(text, /\d\.\d{3,}/, `${where}: no number with 3 or more decimal places in ${text}`);
    assert.ok(ASKED.includes(q.asked), `${where}: asked is one of the lesson's kinds`);
    assert.ok(q.questionType, `${where}: questionType`);
    assert.ok(q.values === null || (q.values && ['count', 'time', 'newCount', 'newTime'].every(key => key in q.values)),
        `${where}: values is null or has count, time, newCount, newTime`);
    if (q.values) {
        for (const value of Object.values(q.values)) {
            assert.ok(value === null || (typeof value === 'number' && Number.isFinite(value)), `${where}: values are numbers or null`);
        }
    }
    if (q.input === 'choice') {
        assertOptions(q, where);
    } else {
        assert.equal(q.input, 'number', where);
        assert.ok(q.unit === undefined || typeof q.unit === 'string', `${where}: unit is text`);
        const answer = Number(q.answer);
        assert.ok(Number.isFinite(answer) && answer > 0, `${where}: answer ${q.answer} is positive`);
        assert.ok(q.rules.length >= 1, `${where}: at least one rule`);
        const values = q.rules.map(rule => Number(rule.value));
        assert.equal(new Set(values).size, values.length, `${where}: rules differ`);
        values.forEach(value => assert.ok(!close(value, answer), `${where}: rule ${value} isn't the answer`));
        values.forEach(value => assert.ok(value > 0, `${where}: rule ${value} is positive`));
        values.forEach(value => assert.ok(close(value, Number(value.toFixed(2)), 1e-9), `${where}: rule ${value} has at most 2 decimal places`));
        assert.ok(q.fallback, `${where}: fallback`);
        assert.ok(q.feedback, `${where}: right-answer feedback`);
        assert.notEqual(q.feedback.trim(), q.answer, `${where}: feedback is the working, not just the answer`);
    }
    for (const part of [q.prompt, q.feedback, q.fallback,
        ...(q.options || []).flatMap(option => [option.label, option.feedback]),
        ...(q.rules || []).map(rule => rule.feedback)]) {
        assertSums(part, where);
    }
}

function pairsIn(prompt) {
    const pairs = [];
    const pattern = /When x is ([\d.]+), y is ([\d.]+)\./g;
    let match;
    while ((match = pattern.exec(prompt))) pairs.push([Number(match[1]), Number(match[2])]);
    return pairs;
}

test('Learn has 8 screens, Try it 10 cards, Check 6 cards', () => {
    assert.equal(I.learnScreens.length, 8);
    assert.equal(I.examples().length, 10);
    assert.equal(I.checks().length, 6);
    assert.equal(lesson.comparison.questions.length, 6);
    assert.equal(lesson.question_bank.session_length, 6);
    assert.equal(lesson.comparison.summary.points.length, 6);
    assert.equal(lesson.score_activities.length, 10);
});

test('Try it and Check mix choice and typed cards, and every card is sound', () => {
    for (const [name, cards] of [['try', I.examples()], ['check', I.checks()]]) {
        const inputs = cards.map(card => card.input);
        assert.ok(inputs.includes('choice') && inputs.includes('number'), `${name} mixes card types`);
        assert.equal(inputs.filter(input => input === 'choice').length, cards.length / 2, `${name}: half choice`);
        cards.forEach((card, index) => assertCard(card, `${name}-${index + 1}`));
    }
});

test('every choice card in Try it and Check has one right answer and real feedback', () => {
    for (const [name, cards] of [['try', I.examples()], ['check', I.checks()]]) {
        for (const [index, card] of cards.entries()) {
            if (card.input !== 'choice') continue;
            assert.equal(card.options.filter(option => option.correct).length, 1, `${name}-${index + 1}`);
        }
    }
});

test('every question type maps to the lesson skill', () => {
    const types = [...I.practiceTypes, ...I.examples().map(card => card.questionType), ...I.checks().map(card => card.questionType)];
    for (const type of types) assert.equal(lesson.assessment.question_types[type], 'inverse-proportion-numerical', type);
});

test('Lesson 8 shows the four steps and the check line', () => {
    const screen = I.learnScreens[7];
    assert.equal(screen.steps.length, 4);
    assert.match(screen.check, /8 is more than 5/);
});

test('a session has all six types once, three choice and three typed', () => {
    for (let n = 0; n < 50; n++) {
        const items = I.pick(E.seededRandom(realSeed(n)));
        assert.equal(JSON.stringify(items.map(item => item.type).sort()), JSON.stringify([...I.practiceTypes].sort()));
        const inputs = items.map(item => I.generate(item, E.seededRandom(item.seed)).input);
        assert.equal(inputs.filter(input => input === 'choice').length, 3);
    }
});

for (const type of I.practiceTypes) {
    test(`Practice ${type}: ${SEEDS} real seeds give sound cards`, () => {
        for (let n = 0; n < SEEDS; n++) assertCard(generated(type, n), `${type} seed ${n}`);
    });
    test(`Practice ${type}: the same seed rebuilds the same card`, () => {
        for (let n = 0; n < 20; n++) {
            assert.equal(JSON.stringify(generated(type, n)), JSON.stringify(generated(type, n)));
        }
    });
}

test('find-time answers are whole or end in .5, and share the total the right way', () => {
    for (let n = 0; n < SEEDS; n++) {
        const q = generated('find-time', n);
        const answer = Number(q.answer);
        assert.ok(close(answer * 2, Math.round(answer * 2)), `find-time seed ${n}: ${q.prompt} gives ${q.answer}`);
        const { count, time, newCount } = q.values;
        assert.ok(close(count * time / newCount, answer), `find-time seed ${n}: total ÷ workers`);
        assert.notEqual(count, newCount, `find-time seed ${n}: the number of workers changes`);
    }
});

test('find-workers answers are whole, above the starting workers, at most 40, and round up', () => {
    for (let n = 0; n < SEEDS; n++) {
        const q = generated('find-workers', n);
        const answer = Number(q.answer);
        const { count, time, newTime } = q.values;
        const share = count * time / newTime;
        assert.ok(Number.isInteger(answer), `find-workers seed ${n}: a whole number of workers, got ${q.answer}`);
        assert.ok(answer > count, `find-workers seed ${n}: more workers than ${count}, got ${answer}`);
        assert.ok(answer <= 40, `find-workers seed ${n}: at most 40, got ${answer}`);
        if (!Number.isInteger(share)) {
            assert.equal(answer, Math.ceil(share), `find-workers seed ${n}: round up above ${share}`);
            assert.match(q.feedback, new RegExp(`round up to ${answer}\\.$`), `find-workers seed ${n}: says to round up`);
        } else {
            assert.equal(answer, share, `find-workers seed ${n}: exact share`);
        }
    }
});

test('inverse-xy cards keep x × y the same and divide by the new x', () => {
    for (let n = 0; n < SEEDS; n++) {
        const q = generated('inverse-xy', n);
        const { count, time, newCount } = q.values;
        assert.ok(close(count * time, newCount * Number(q.answer)), `inverse-xy seed ${n}: ${q.prompt}`);
    }
});

test('is-it-inverse tables go down, and a "no" table has a last total that differs', () => {
    for (let n = 0; n < SEEDS; n++) {
        const q = generated('is-it-inverse', n);
        const pairs = pairsIn(q.prompt);
        assert.equal(pairs.length, 3, `is-it-inverse seed ${n}: three pairs in ${q.prompt}`);
        const [first, second, third] = pairs;
        assert.ok(first[0] < second[0] && second[0] < third[0], `is-it-inverse seed ${n}: x goes up`);
        assert.ok(third[1] < second[1], `is-it-inverse seed ${n}: the last y still goes down`);
        const total = first[0] * first[1];
        const right = q.options.find(option => option.correct);
        if (right.label.startsWith('No:')) {
            assert.ok(second[0] * second[1] === total, `is-it-inverse seed ${n}: the first two pairs match`);
            assert.ok(third[0] * third[1] !== total, `is-it-inverse seed ${n}: the last pair doesn't match`);
        } else {
            assert.ok(third[0] * third[1] === total, `is-it-inverse seed ${n}: the last pair matches`);
        }
    }
});

test('no card asks for 0 or a negative amount', () => {
    for (const type of I.practiceTypes) {
        for (let n = 0; n < SEEDS; n++) {
            const q = generated(type, n);
            if (q.input !== 'number') continue;
            assert.ok(Number(q.answer) > 0, `${type} seed ${n}: answer`);
            q.rules.forEach(rule => assert.ok(Number(rule.value) > 0, `${type} seed ${n}: rule ${rule.value}`));
        }
    }
});

test('does-it-apply always offers one inverse, two direct and one that is neither', () => {
    for (let n = 0; n < SEEDS; n++) {
        const q = generated('does-it-apply', n);
        assert.ok(q.options.filter(option => option.correct).length === 1, `seed ${n}`);
        const right = q.options.find(option => option.correct);
        assert.match(right.feedback, /shared out|shared between/, `seed ${n}: the inverse example explains sharing`);
    }
});
