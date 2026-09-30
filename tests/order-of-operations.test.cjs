// Maths checks for order-of-operations: every expression is re-evaluated
// independently and compared with the lesson's answer and distractors.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { questionsOf, evaluate, plain, num, close } = require('./helpers/lessons.cjs');

const folder = 'order-of-operations';
const numericTypes = ['multiplyBeforeAdd', 'divideBeforeSubtract', 'divideMultiplyLeftToRight', 'addSubtractLeftToRight',
    'brackets', 'powers', 'roots', 'hiddenMultiplication', 'reciprocal', 'negativeNumbers', 'groupedDivision'];

// Work strictly left to right, ignoring the order of operations (the mistake Amir makes).
function leftToRight(text) {
    const tokens = text.replace(/−/g, '-').match(/\d+|[-+×÷]/g);
    let value = Number(tokens[0]);
    for (let i = 1; i < tokens.length; i += 2) {
        const next = Number(tokens[i + 1]);
        value = { '+': value + next, '-': value - next, '×': value * next, '÷': value / next }[tokens[i]];
    }
    return value;
}

for (const type of numericTypes) {
    test(`${type}: the answer is the value of the expression and no distractor equals it`, () => {
        for (const { seed, q, raw } of questionsOf(folder, type)) {
            const expression = plain(raw.expression);
            const value = evaluate(expression);
            assert.ok(close(num(q.answer), value), `${expression} = ${value}, but the answer is ${q.answer} (seed ${seed})`);
            for (const option of q.options.filter(option => option !== q.answer)) {
                assert.ok(!close(num(option), value), `distractor ${option} is also correct for ${expression} (seed ${seed})`);
            }
        }
    });
}

test('firstOperationQuestion: the answer is the calculation inside the brackets', () => {
    for (const { seed, q, raw } of questionsOf(folder, 'firstOperationQuestion')) {
        const expression = plain(raw.expression);
        const bracket = expression.match(/\(([^()]+)\)/)?.[1].trim();
        assert.ok(bracket, `expected a bracket in ${expression} (seed ${seed})`);
        assert.equal(q.answer, bracket, `${expression}: brackets come first (seed ${seed})`);
    }
});

test("errorSpotting: Amir's claim is the left-to-right value and the correct statement gives the true value", () => {
    for (const { seed, q } of questionsOf(folder, 'errorSpotting')) {
        const [, expression, claim] = q.prompt.match(/says (.+?) = (−?\d+) because/) ?? [];
        assert.ok(expression, `unexpected prompt "${q.prompt}" (seed ${seed})`);
        assert.equal(leftToRight(expression), num(claim), `Amir's value should come from working left to right: ${q.prompt} (seed ${seed})`);
        const value = evaluate(expression);
        assert.notEqual(value, num(claim), `Amir is actually right: ${q.prompt} (seed ${seed})`);
        assert.match(q.answer, new RegExp(`wrong: the answer is ${value}\\.`), `${expression} = ${value} (seed ${seed})`);
    }
});
