// Maths checks for substituting-into-formulae: each formula is evaluated
// with the given values and compared with the substitution and the answer.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { questionsOf, evaluate, num, close } = require('./helpers/lessons.cjs');

const folder = 'substituting-into-formulae';
const types = ['singleLetterQuestion', 'hiddenMultiplicationQuestion', 'areaQuestion', 'perimeterQuestion', 'repeatedLetterQuestion',
    'bracketQuestion', 'powerQuestion', 'negativeQuestion', 'negativePowerQuestion', 'divisionQuestion'];
const rhs = text => text.split('=').slice(1).join('=');
// The number in an answer like "A = 56 cm²", "£28" or "m = −15".
const answerNumber = text => num(text.replace(/^[^=]*=/, '').replace(/[^\d.\-−]/g, ''));
const UNITS = { area: 'cm²', perimeter: 'cm', volume: 'cm³', speed: 'mph' };

for (const type of types) {
    test(`${type}: the substitution matches the formula and the answer is its value`, () => {
        for (const { seed, q, raw } of questionsOf(folder, type)) {
            const value = evaluate(rhs(raw.formula), raw.givens);
            assert.ok(close(evaluate(rhs(raw.substituted)), value),
                `${raw.substituted} is not ${raw.formula} with ${JSON.stringify(raw.givens)} (seed ${seed})`);
            for (const [letter, given] of Object.entries(raw.givens)) {
                assert.ok(raw.substituted.includes(String(given).replace('-', '−')), `${raw.substituted} does not show ${letter} = ${given} (seed ${seed})`);
            }
            assert.ok(close(answerNumber(q.answer), value), `${raw.formula} with ${JSON.stringify(raw.givens)} = ${value}, answer ${q.answer} (seed ${seed})`);
            const kind = Object.keys(UNITS).find(k => raw.context.toLowerCase().includes(k));
            if (kind) assert.ok(q.answer.endsWith(` ${UNITS[kind]}`), `${raw.context} should be in ${UNITS[kind]}, got ${q.answer} (seed ${seed})`);
            // A wrong option must differ in value or in unit ("56 cm" vs "56 cm²").
            const unit = text => text.replace(/.*\d/, '');
            for (const option of q.options.filter(option => option !== q.answer)) {
                const sameValue = close(answerNumber(option), value), sameUnit = unit(option) === unit(q.answer);
                assert.ok(!(sameValue && sameUnit), `distractor ${option} is also correct (seed ${seed})`);
            }
        }
    });
}

test('hiddenMultiplicationQuestion: the story uses the numbers in the formula', () => {
    for (const { seed, raw } of questionsOf(folder, 'hiddenMultiplicationQuestion')) {
        const numbers = rhs(raw.formula).match(/\d+/g);
        for (const n of numbers) assert.ok(raw.context.includes(`£${n}`), `formula ${raw.formula} uses ${n} but the story "${raw.context}" does not (seed ${seed})`);
    }
});
