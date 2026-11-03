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
vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/js/diagram.js'), 'utf8'), { window });
vm.runInNewContext(fs.readFileSync(path.join(root, 'content/angle-facts/angles.js'), 'utf8'), { window });
const A = window.AngleFacts, E = window.Maths1to9LessonEngine;
// The lesson seeds each Practice item with a 32-bit number from pick(), so
// test with seeds like those (small seeds all give a similar first draw).
const realSeed = n => { const random = E.seededRandom(n); random(); return E.randomInt(0, 4294967295, random); };
const generated = (type, n) => { const seed = realSeed(n); return A.generate({ type, seed }, E.seededRandom(seed)); };

// Works out displayed working, such as "180 − 138 = 42".
function evaluate(text) {
    const js = text.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
    assert.match(js, /^[\d\s.+\-*/]+$/, `"${text}" is plain working`);
    return Function(`"use strict"; return (${js});`)();
}

// Checks every "a − b = c" and "a + b = c" sum in the text.
function assertSums(text, where) {
    const sums = text.match(/\(?\d+(?:\.\d+)?(?: [×÷+−] \(?\d+(?:\.\d+)?\)?)+(?: = \d+(?:\.\d+)?)/g) || [];
    for (const sum of sums) {
        const [left, right] = sum.split(' = ').map(evaluate);
        assert.ok(Math.abs(left - right) < 1e-9, `${where}: ${sum} is true`);
    }
}

function assertOptions(q, where) {
    assert.equal(q.options.length, 4, `${where}: four options`);
    assert.equal(new Set(q.options.map(option => option.label)).size, 4, `${where}: four different options`);
    assert.equal(q.options.filter(option => option.correct).length, 1, `${where}: one right option`);
    const feedback = q.options.map(option => option.feedback);
    assert.equal(new Set(feedback).size, 4, `${where}: each option has its own feedback`);
    q.options.forEach(option => {
        assert.ok(option.feedback && option.feedback.length > 5, `${where}: feedback for ${option.label}`);
        assert.notEqual(option.feedback, option.label, `${where}: feedback for ${option.label} isn't just its label`);
    });
}

function assertNumberCard(q, where) {
    assert.equal(q.input, 'number', where);
    assert.equal(q.unit, '°', `${where}: the unit is degrees`);
    assert.ok(q.fallback, `${where}: fallback feedback`);
    assert.ok(q.feedback, `${where}: right-answer feedback`);
    assert.match(q.answer, /^\d+$/, `${where}: answer ${q.answer} is a whole number of degrees`);
    const answer = Number(q.answer);
    assert.ok(answer > 0 && answer < 360, `${where}: answer ${q.answer} is an angle`);
    const values = q.rules.map(rule => Number(rule.value));
    assert.ok(q.rules.length >= 1, `${where}: at least one mistake rule`);
    q.rules.forEach(rule => assert.ok(rule.feedback && rule.feedback.length > 5, `${where}: every rule has feedback`));
    values.forEach(value => {
        assert.ok(value !== answer, `${where}: rule ${value} isn't the answer`);
    });
    values.forEach((value, index) => values.slice(index + 1).forEach(other =>
        assert.notEqual(value, other, `${where}: rules ${value} and ${other} are different`)));
}

const isWholeAngle = value => Number.isInteger(value) && value >= 1 && value <= 359;

function givenValues(q) {
    const given = q.angles?.given ?? {};
    return Object.values(given).flat();
}

function assertAngles(q, where) {
    for (const value of givenValues(q)) {
        assert.ok(isWholeAngle(value), `${where}: ${value} is a whole angle`);
    }
    if (q.input === 'number') assert.ok(isWholeAngle(Number(q.answer)), `${where}: ${q.answer} is a whole angle`);
    if (q.input === 'custom') {
        assert.ok(q.marks, `${where}: the tap card lists its marks`);
        const marks = Object.values(q.marks);
        assert.equal(marks.length, 4, `${where}: four tappable angles`);
        assert.equal(marks.filter(mark => mark.correct).length, 1, `${where}: exactly one right angle`);
        marks.forEach(mark => assert.ok(mark.feedback && mark.feedback.length > 5, `${where}: every tap has feedback`));
    }
    if (q.prompt) assertSums(q.prompt, `${where} prompt`);
    if (q.feedback) assertSums(q.feedback, `${where} feedback`);
    if (q.options) q.options.forEach(option => assertSums(option.feedback, `${where} option ${option.label}`));
    (q.rules ?? []).forEach(rule => assertSums(rule.feedback, `${where} rule ${rule.value}`));
}

function assertSumsMatchLayout(q, where) {
    const given = q.angles?.given ?? {};
    const answer = q.input === 'choice'
        ? Number(q.options.find(option => option.correct).label.replace('°', ''))
        : Number(q.answer);
    if (q.questionType === 'straight-line') {
        const total = Object.values(given).reduce((sum, value) => sum + value, 0);
        assert.equal(total + answer, 180, `${where}: the angles make a straight line`);
    }
    if (q.questionType === 'around-point') {
        const total = (given.values ?? []).reduce((sum, value) => sum + value, 0);
        assert.equal(total + answer, 360, `${where}: the angles make a full turn`);
    }
    if (q.questionType === 'opposite') {
        const g = given.start;
        assert.ok(answer === g || answer === 180 - g, `${where}: x is opposite or next to g`);
    }
    if (q.questionType === 'parallel-angle' || q.questionType === 'which-reason') {
        const [corner] = Object.keys(given);
        const g = given[corner];
        const [, side, end] = corner.split('-');
        // The inverse of cornerAngle: read theta back from the given angle.
        const theta = (side === 'above') === (end === 'right') ? g : 180 - g;
        assert.equal(A.cornerAngle(theta, corner), g, `${where}: cornerAngle reads the given angle`);
        // The relation already decides which corner x is, so cornerAngle
        // settles x: equal for corresponding and alternate, the other size
        // for co-interior, and those two add up to 180.
        const wanted = A.cornerAngle(theta, q.angles.x);
        if (q.angles.relation === 'coInterior') {
            assert.equal(wanted + g, 180, `${where}: co-interior angles add up to 180`);
        } else {
            assert.equal(wanted, g, `${where}: this pair is equal`);
        }
        if (q.input === 'number') {
            assert.equal(answer, wanted, `${where}: cornerAngle gives x`);
        } else {
            assert.match(q.prompt, new RegExp(`x = ${wanted}°`), `${where}: the prompt gives x`);
        }
    }
}

test('angle facts: Try it has 10 cards, 4 choice, 4 typed and 2 tap', () => {
    const cards = A.examples();
    assert.equal(cards.length, 10);
    assert.equal(cards.filter(q => q.input === 'choice').length, 4);
    assert.equal(cards.filter(q => q.input === 'number').length, 4);
    assert.equal(cards.filter(q => q.input === 'custom').length, 2);
    cards.forEach((q, index) => {
        const where = `try-${index + 1}`;
        assert.ok(q.skill, `${where}: skill`);
        assert.ok(q.asked, `${where}: what is asked`);
        assert.ok(q.angles, `${where}: angles`);
        if (q.input === 'choice') assertOptions(q, where);
        if (q.input === 'number') assertNumberCard(q, where);
        assertAngles(q, where);
        assertSumsMatchLayout(q, where);
    });
});

test('angle facts: Check has 6 cards, 3 choice and 3 typed, all correct', () => {
    const cards = A.checks();
    assert.equal(cards.length, 6);
    assert.equal(cards.filter(q => q.input === 'choice').length, 3);
    assert.equal(cards.filter(q => q.input === 'number').length, 3);
    cards.forEach((q, index) => {
        const where = `check-${index + 1}`;
        if (q.input === 'choice') assertOptions(q, where);
        if (q.input === 'number') assertNumberCard(q, where);
        assertAngles(q, where);
    });
    assert.equal(Number(cards[1].answer), 296, 'check-2 is the reflex angle');
    assert.equal(Number(cards[5].answer), 108, 'check-6 finds y first');
});

test('angle facts: the lesson.json types map to the three skills', () => {
    const lesson = JSON.parse(fs.readFileSync(path.join(root, 'content/angle-facts/lesson.json'), 'utf8'));
    const types = lesson.assessment.question_types;
    const used = [...A.practiceTypes, ...A.examples().map(q => q.questionType), ...A.checks().map(q => q.questionType)];
    for (const type of used) {
        assert.ok(types[type], `${type} is in lesson.json`);
        assert.ok(['angles-point-line', 'vertically-opposite-angles', 'parallel-line-angles'].includes(types[type]),
            `${type} has one of the lesson's skills`);
    }
    assert.equal(types['straight-line'], 'angles-point-line');
    assert.equal(types['around-point'], 'angles-point-line');
    assert.equal(types.opposite, 'vertically-opposite-angles');
    assert.equal(types['likely-unused'], undefined);
    assert.equal(types['find-the-pair'], 'parallel-line-angles');
    assert.equal(types['parallel-angle'], 'parallel-line-angles');
    assert.equal(types['which-reason'], 'parallel-line-angles');
    assert.equal(lesson.comparison.questions.length, A.checks().length);
    assert.equal(lesson.question_bank.session_length, 6);
    assert.equal(lesson.comparison.summary.points.length, 4);
    assert.deepEqual(lesson.section_order, ['explanation', 'interactive', 'question-bank', 'comparison']);
});

test('angle facts: each Practice session has one card of every type', () => {
    for (let n = 0; n < 200; n++) {
        const items = A.pick(E.seededRandom(realSeed(n)));
        assert.equal(items.length, 6);
        assert.equal(new Set(items.map(item => item.type)).size, 6);
        for (const type of A.practiceTypes) assert.ok(items.some(item => item.type === type), type);
        items.forEach(item => assert.ok(Number.isInteger(item.seed) && item.seed >= 0, `${item.type} seed`));
    }
});

test('angle facts: every Practice type makes good cards (500 seeds each)', () => {
    for (const type of A.practiceTypes) {
        for (let n = 0; n < 500; n++) {
            const q = generated(type, n);
            const where = `${type} seed ${n}`;
            assert.equal(q.questionType, type, where);
            assert.ok(q.skill, `${where}: skill`);
            assert.ok(q.asked, `${where}: what is asked`);
            if (q.input === 'choice') assertOptions(q, where);
            else if (q.input === 'number') assertNumberCard(q, where);
            else assert.equal(q.input, 'custom', where);
            assertAngles(q, where);
            assertSumsMatchLayout(q, where);
        }
    }
});

test('angle facts: Practice rebuilds the same card from the same seed', () => {
    for (const type of A.practiceTypes) {
        assert.deepEqual(JSON.parse(JSON.stringify(generated(type, 7))),
            JSON.parse(JSON.stringify(generated(type, 7))), type);
    }
});

test('angle facts: parallel cards never sit between 85 and 95 degrees', () => {
    for (const type of ['parallel-angle', 'which-reason', 'find-the-pair']) {
        for (let n = 0; n < 500; n++) {
            const q = generated(type, n);
            const given = q.angles?.given ?? {};
            for (const value of Object.values(given)) {
                assert.ok(value < 85 || value > 95, `${type} seed ${n}: ${value} avoids the look-alike band`);
            }
        }
    }
});

test('angle facts: cornerAngle reads both sizes at a crossing', () => {
    const corners = ['top-above-left', 'top-above-right', 'top-below-left', 'top-below-right',
        'bottom-above-left', 'bottom-above-right', 'bottom-below-left', 'bottom-below-right'];
    for (const theta of [40, 52, 55, 64, 70, 73, 100, 140]) {
        for (const corner of corners) {
            const size = A.cornerAngle(theta, corner);
            assert.ok(size === theta || size === 180 - theta, `${corner} at ${theta}`);
            assert.equal(A.cornerAngle(theta, corner.replace('top', 'bottom')), size, `${corner} matches its pair`);
        }
    }
    assert.throws(() => A.cornerAngle(60, 'middle'), /not a corner/);
});

test('angle facts: Learn has 8 screens, all showing before they ask', () => {
    assert.equal(A.learnScreens.length, 8);
    A.learnScreens.forEach((screen, index) => {
        assert.ok(screen.title && screen.lines.length, `learn-${index + 1}`);
        assert.ok(screen.callout, `learn-${index + 1} has a callout`);
        assert.ok(!screen.lines.some(line => line.trim().endsWith('?')), `learn-${index + 1} asks nothing`);
        assert.doesNotMatch(screen.lines.join(' '), /transversal|AQA|Edexcel|OCR/i, `learn-${index + 1} wording`);
    });
    assert.equal(A.learnScreens[0].cards.length, 4);
    assert.deepEqual([...A.learnScreens[0].cards.map(card => card.size)], [40, 90, 130, 250]);
});

test('angle facts: the six reasons are word for word', () => {
    assert.deepEqual([...A.REASON_LIST], [
        'Angles on a straight line add up to 180°.',
        'Angles around a point add up to 360°.',
        'Vertically opposite angles are equal.',
        'Corresponding angles are equal.',
        'Alternate angles are equal.',
        'Co-interior angles add up to 180°.'
    ]);
});

test('angle facts: curriculum lists the three skills and the plain subtitle', () => {
    const curriculum = JSON.parse(fs.readFileSync(path.join(root, 'content/curriculum.json'), 'utf8'));
    const lessons = curriculum.categories.flatMap(category => category.lessons);
    const entry = lessons.find(lesson => lesson.folder === 'angle-facts');
    assert.deepEqual(entry.skills, ['angles-point-line', 'vertically-opposite-angles', 'parallel-line-angles']);
    assert.equal(entry.subtitle, 'Use angles on a line, round a point and on parallel lines.');
});

// A stand-in for the shared diagram that records what a picture draws,
// so the test can see whether every angle really has a line on both sides.
function spyDiagram() {
    const drawn = [];
    const arcs = [];
    const makePoint = position => {
        const point = {
            position: () => position.slice(),
            moveTo(next) { position = next.slice(); },
            label() { return point; }
        };
        return point;
    };
    const diagram = {
        point: position => makePoint(position),
        segment(a, b) { drawn.push([a.position(), b.position()]); return {}; },
        line(a, b) { drawn.push([a.position(), b.position()]); return {}; },
        angle(one, vertex, two) {
            arcs.push([one.position(), vertex.position(), two.position()]);
            return { setLabel() {}, position: () => ({ x: 0, y: 0 }), settings: {} };
        },
        protractor() { return {}; },
        arrow() { return {}; },
        select() {},
        describe() {},
        questionWidget: () => null
    };
    return { diagram, drawn, arcs };
}

// True when a point sits on one of the drawn lines or rays.
function onLine([x, y], drawn) {
    return drawn.some(([[ax, ay], [bx, by]]) => {
        const dx = bx - ax;
        const dy = by - ay;
        const length = Math.hypot(dx, dy);
        if (!length) return false;
        const along = ((x - ax) * dx + (y - ay) * dy) / (length * length);
        if (along < -1e-9 || along > 1 + 1e-9) return false;
        return Math.abs((x - ax) * dy - (y - ay) * dx) / length < 1e-9;
    });
}

test('angle facts: every angle in a card has a line on both sides', () => {
    const realCreate = window.Maths1to9Diagram.create;
    for (const type of ['straight-line', 'around-point', 'opposite']) {
        for (let n = 1; n <= 150; n++) {
            const question = generated(type, n);
            const spy = spyDiagram();
            window.Maths1to9Diagram.create = () => spy.diagram;
            try {
                question.figure('host');
            } finally {
                window.Maths1to9Diagram.create = realCreate;
            }
            assert.ok(spy.arcs.length >= 2, `${type} ${n}: at least two angles drawn`);
            for (const [one, vertex, two] of spy.arcs) {
                assert.ok(onLine(one, spy.drawn), `${type} ${n}: one side of an angle has a line`);
                assert.ok(onLine(two, spy.drawn), `${type} ${n}: the other side has a line`);
            }
        }
    }
});
