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
vm.runInNewContext(fs.readFileSync(path.join(root, 'content/scale-drawings/scale.js'), 'utf8'), { window });
const S = window.ScaleDrawings;
const E = window.Maths1to9LessonEngine;
const realSeed = n => { const random = E.seededRandom(n); random(); return E.randomInt(0, 4294967295, random); };
const generated = (type, seed) => S.generate({ type, seed }, E.seededRandom(seed));
const numeric = value => Number(String(value).replace(/\s/g, '').replace(/(?:cm|km|m)(?:²)?$/, ''));

function expected(card) {
    const { scale, drawing, real } = card.values;
    if (card.asked === 'to-real') return drawing * scale;
    if (card.asked === 'to-drawing') return real / scale;
    if (card.asked === 'route') return (drawing.length === 3 ? drawing[1] + drawing[2] - drawing[0] : drawing.reduce((a, b) => a + b, 0)) * scale;
    if (card.asked === 'area') return drawing.reduce((a, b) => a * b, 1) * scale ** 2;
    if (card.asked === 'find-scale') return drawing[0] * scale / drawing[1];
    return null;
}

test('scale drawings: Try it has ten ordered cards with the promised types', () => {
    const cards = S.examples();
    assert.equal(cards.length, 10);
    assert.equal(cards.filter(card => card.input === 'choice').length, 4);
    assert.equal(cards.filter(card => card.input === 'number').length, 5);
    assert.equal(cards.filter(card => card.input === 'custom').length, 1);
    cards.forEach((card, index) => {
        assert.equal(card.questionType, `try-${index + 1}`);
        for (const field of ['scale', 'scaleUnit', 'drawing', 'real']) assert.ok(field in card.values, `${card.questionType}: ${field}`);
        assert.ok(card.asked && card.prompt);
    });
});

test('scale drawings: each Try it choice has four distinct answers and useful feedback', () => {
    for (const card of S.examples().filter(card => card.input === 'choice')) {
        assert.equal(card.options.length, 4, card.questionType);
        assert.equal(new Set(card.options.map(option => option.label)).size, 4, card.questionType);
        assert.equal(card.options.filter(option => option.correct).length, 1, card.questionType);
        card.options.forEach(option => assert.ok(option.feedback, `${card.questionType}: ${option.label}`));
        const right = card.options.find(option => option.correct);
        assert.notEqual(right.feedback, right.label, card.questionType);
        if (card.asked === 'zoom') {
            assert.ok(card.values.drawing[1] > card.values.drawing[0]);
            assert.equal(right.label, 'Map B is zoomed in more');
        } else {
            assert.equal(numeric(right.label), expected(card), card.questionType);
        }
    }
});

test('scale drawings: typed Try it answers, mistake rules and feedback are sound', () => {
    for (const card of S.examples().filter(card => card.input === 'number')) {
        const answer = numeric(card.answer);
        assert.ok(answer > 0 && card.unit && card.feedback && card.fallback, card.questionType);
        assert.equal(answer, expected(card), card.questionType);
        assert.ok(card.rules.length > 0, card.questionType);
        const rules = card.rules.map(rule => numeric(rule.value));
        assert.equal(new Set(rules).size, rules.length, card.questionType);
        card.rules.forEach(rule => {
            assert.ok(numeric(rule.value) > 0, card.questionType);
            assert.notEqual(numeric(rule.value), answer, card.questionType);
            assert.ok(rule.feedback, card.questionType);
        });
    }
});

test('scale drawings: drawing answer accepts either orientation, not the real sizes', () => {
    const card = S.examples()[8];
    const [width, height] = card.values.drawing;
    assert.equal(width * card.values.scale, card.values.real[0]);
    assert.equal(height * card.values.scale, card.values.real[1]);
    assert.equal(card.widget.mark({ width, height }).correct, true);
    assert.equal(card.widget.mark({ width: height, height: width }).correct, true);
    assert.equal(card.widget.mark({ width: 6, height: 4 }).correct, false);
    assert.equal(card.widget.isEmpty(null), true);
});

test('scale drawings: numbers remove float noise and format thousands', () => {
    assert.equal(S.number(0.1 + 0.2), '0.3');
    assert.equal(S.number(1250), '1250');
    assert.equal(S.number(28800), '28 800');
});

function checkCard(card, where) {
    assert.ok(card.values && card.asked, `${where}: values and asked`);
    if (card.input === 'custom') {
        const [width, height] = card.values.drawing;
        assert.ok(width <= 7 && height <= 7 && width !== height, `${where}: grid fit`);
        assert.equal(width * 2, Math.round(width * 2), `${where}: width snaps`);
        assert.equal(height * 2, Math.round(height * 2), `${where}: height snaps`);
        assert.equal(card.widget.mark({ width, height }).correct, true, `${where}: right`);
        assert.equal(card.widget.mark({ width: height, height: width }).correct, true, `${where}: rotated`);
        assert.equal(card.widget.mark({ width: card.values.real[0], height: card.values.real[1] }).correct, false, `${where}: real sizes`);
        return;
    }
    if (card.input === 'choice') {
        assert.equal(card.options.length, 4, `${where}: four options`);
        assert.equal(new Set(card.options.map(option => option.label)).size, 4, `${where}: unique options`);
        const correct = card.options.filter(option => option.correct);
        assert.equal(correct.length, 1, `${where}: one correct`);
        card.options.forEach(option => assert.ok(option.feedback, `${where}: feedback`));
        assert.notEqual(correct[0].feedback, correct[0].label, `${where}: right feedback`);
        if (expected(card) !== null) {
            assert.equal(numeric(correct[0].label), expected(card), `${where}: choice answer`);
            assert.ok(Number.isInteger(numeric(correct[0].label) * 100), `${where}: at most two decimal places`);
        }
        return;
    }
    assert.equal(card.input, 'number', `${where}: input`);
    const answer = numeric(card.answer);
    assert.ok(answer > 0 && card.feedback && card.fallback && card.rules.length, `${where}: answer and feedback`);
    assert.equal(answer, expected(card), `${where}: numerical answer`);
    assert.ok(Number.isInteger(answer * 100), `${where}: at most two decimal places`);
    const rules = card.rules.map(rule => numeric(rule.value));
    assert.equal(new Set(rules).size, rules.length, `${where}: unique rules`);
    card.rules.forEach(rule => {
        assert.ok(numeric(rule.value) > 0 && rule.feedback, `${where}: positive rule and feedback`);
        assert.notEqual(numeric(rule.value), answer, `${where}: rule differs from answer`);
    });
}

test('scale drawings: Practice picks every type once with seeded ordering', () => {
    for (let n = 0; n < 500; n++) {
        const seed = realSeed(n);
        const picked = S.pick(E.seededRandom(seed));
        assert.equal(picked.length, 6);
        assert.equal(new Set(picked.map(item => item.type)).size, 6);
        S.practiceTypes.forEach(type => assert.ok(picked.some(item => item.type === type), type));
        picked.forEach(item => assert.ok(Number.isInteger(item.seed) && item.seed >= 0 && item.seed <= 4294967295));
    }
});

test('scale drawings: every Practice type is correct and deterministic over 500 real seeds', () => {
    for (const type of S.practiceTypes) {
        for (let n = 0; n < 500; n++) {
            const seed = realSeed(n);
            const card = generated(type, seed);
            checkCard(card, `${type} seed ${seed}`);
            // JSON fields are the saved card data; widget functions are checked separately above.
            assert.deepEqual(JSON.parse(JSON.stringify(card)), JSON.parse(JSON.stringify(generated(type, seed))), `${type} seed ${seed}`);
        }
    }
});

test('scale drawings: Check has six correct fixed cards', () => {
    const cards = S.checks();
    assert.equal(cards.length, 6);
    cards.forEach((card, index) => { assert.equal(card.questionType, `check-${index + 1}`); checkCard(card, card.questionType); });
    assert.equal(cards[4].widget.mark({ width: 5, height: 3 }).correct, true);
    assert.equal(cards[4].widget.mark({ width: 3, height: 5 }).correct, true);
});

test('scale drawings: all card types map to the skill in lesson.json', () => {
    const lesson = JSON.parse(fs.readFileSync(path.join(root, 'content/scale-drawings/lesson.json'), 'utf8'));
    for (const type of [...S.practiceTypes, ...S.examples().map(card => card.questionType), ...S.checks().map(card => card.questionType)]) {
        assert.equal(lesson.assessment.question_types[type], 'scale-drawings', type);
    }
    assert.equal(lesson.question_bank.session_length, 6);
});
