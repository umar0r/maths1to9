// Maths checks for simplifying-expressions: every simplification is tested
// by substituting values for the letters.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { contentDir, readJson, evaluate, close } = require('./helpers/lessons.cjs');

const lesson = readJson(path.join(contentDir, 'simplifying-expressions', 'lesson.json'));
const [paint, trays, tiles] = lesson.explanation.interactives;

// Same expression if equal for several values of every letter used.
function equivalent(a, b) {
    const letters = [...new Set(`${a} ${b}`.match(/[a-z]/g) ?? [])];
    return [[2, 3, 5], [-1.5, 7, 0.25], [11, -4, 6]].every(values => {
        const vars = Object.fromEntries(letters.map((letter, i) => [letter, values[i % 3] + i]));
        return close(evaluate(a, vars), evaluate(b, vars));
    });
}
const sumOf = terms => terms.map(term => term.text).join(' ').replace(/^\+/, '');
// Fully collected: each letter part appears at most once, and at most one number.
function collected(expression) {
    const terms = expression.replace(/−/g, '+−').split('+').map(t => t.trim()).filter(Boolean);
    const families = terms.map(t => t.replace(/^[−\d]+/, '') || 'number');
    return new Set(families).size === families.length;
}

test('worked examples: the answer equals the expression and is fully collected', () => {
    for (const example of lesson.worked_examples) {
        const expression = example.title.replace(/^Simplify:\s*/, '');
        assert.ok(equivalent(expression, example.answer), `${expression} ≠ ${example.answer}`);
        assert.ok(collected(example.answer), `${example.answer} still has like terms to collect`);
        if (example.visual) {
            assert.ok(equivalent(sumOf(example.visual.terms), expression), `${example.title}: the tiles do not match the expression`);
            for (const group of example.visual.groups) {
                const family = group.label.replace(/ terms$/, '');
                const members = example.visual.terms.filter(term => term.family === family || (family === 'numbers' && term.family === 'number'));
                if (members.length) assert.ok(equivalent(sumOf(members), group.result), `${example.title}: ${group.label} give ${group.result}?`);
            }
        }
    }
});

test('quick check: the answer equals the expression', () => {
    const expression = lesson.interactive.title.replace(/^Simplify:\s*/, '');
    assert.ok(equivalent(expression, lesson.interactive.answer), `${expression} ≠ ${lesson.interactive.answer}`);
    assert.ok(equivalent(sumOf(lesson.interactive.terms), expression), 'the tiles do not match the expression');
});

test('paint and merge: the merged terms and final expression are right', () => {
    const target = paint.terms.filter(term => term.family === paint.targetFamily);
    assert.ok(equivalent(sumOf(target), paint.mergedTerm), `${sumOf(target)} ≠ ${paint.mergedTerm}`);
    const [left, right] = paint.mergeCalculation.split('=');
    assert.ok(equivalent(left, right), paint.mergeCalculation);
    assert.ok(equivalent(sumOf(paint.terms), paint.finalExpression), `${sumOf(paint.terms)} ≠ ${paint.finalExpression}`);
});

test('sorting trays: each tray adds up to its result', () => {
    for (const tray of trays.trays) {
        const members = trays.terms.filter(term => term.family === tray.family);
        assert.ok(equivalent(sumOf(members), tray.result), `${tray.label}: ${sumOf(members)} ≠ ${tray.result}`);
        const [left, right] = tray.calculation.split('=');
        assert.ok(equivalent(left, right), tray.calculation);
    }
});

test('algebra tiles: zero pairs cancel to the final expression', () => {
    const result = tiles.finalExpression.split('=').at(-1);
    assert.ok(equivalent(`${tiles.positiveCount - tiles.negativeCount}${tiles.letter}`, result), tiles.finalExpression);
    const [left, right] = tiles.finalExpression.split('=');
    assert.ok(equivalent(left, right), tiles.finalExpression);
});
