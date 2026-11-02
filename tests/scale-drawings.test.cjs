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
const numeric = value => Number(String(value).replace(/\s/g, '').replace(/(?:cm|km|m)(?:²)?$/, ''));

function expected(card) {
    const { scale, drawing, real } = card.values;
    if (card.asked === 'to-real') return drawing * scale;
    if (card.asked === 'to-drawing') return real / scale;
    if (card.asked === 'route') return drawing.reduce((a, b) => a + b, 0) * scale;
    if (card.asked === 'area') return drawing.reduce((a, b) => a * b, 1) * scale ** 2;
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
