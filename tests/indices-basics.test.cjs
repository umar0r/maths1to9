// Maths checks for indices-basics: base, index and value are read from the
// prompt and every answer is recomputed.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { questionsOf, num } = require('./helpers/lessons.cjs');

const folder = 'indices-basics';
const SUPER = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const fromSuper = text => Number([...text].map(c => SUPER.indexOf(c)).join(''));
const toSuper = n => [...String(n)].map(d => SUPER[d]).join('');
const power = text => {
    const [, base, index] = text.match(/(\d+)([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/) ?? [];
    return base && { base: Number(base), index: fromSuper(index) };
};
const others = q => q.options.filter(option => option !== q.answer);

test('identifyPartsQuestion: base and index are named correctly', () => {
    for (const { seed, q } of questionsOf(folder, 'identifyPartsQuestion')) {
        const p = power(q.prompt);
        assert.equal(q.answer, String(q.prompt.includes('index') ? p.index : p.base), `${q.prompt} (seed ${seed})`);
    }
});

test('expandPowerQuestion: the answer repeats the base index times', () => {
    for (const { seed, q } of questionsOf(folder, 'expandPowerQuestion')) {
        const p = power(q.prompt);
        assert.equal(q.answer, Array(p.index).fill(p.base).join(' × '), `${q.prompt} (seed ${seed})`);
    }
});

test('calculatePowerQuestion: the value is correct and no distractor equals it', () => {
    for (const { seed, q } of questionsOf(folder, 'calculatePowerQuestion')) {
        const p = power(q.prompt);
        const value = p.base ** p.index;
        assert.equal(num(q.answer), value, `${q.prompt} (seed ${seed})`);
        for (const option of others(q)) assert.notEqual(num(option), value, `distractor ${option} (seed ${seed})`);
    }
});

test('writeNotationQuestion: the notation counts the repeated factors', () => {
    for (const { seed, q } of questionsOf(folder, 'writeNotationQuestion')) {
        const factors = q.prompt.match(/matches (.+)\?/)[1].split(' × ');
        assert.ok(factors.every(f => f === factors[0]), `${q.prompt} (seed ${seed})`);
        assert.equal(q.answer, `${factors[0]}${toSuper(factors.length)}`, `${q.prompt} (seed ${seed})`);
    }
});

test('applyPowerQuestion: areas, volumes and doubling use the right power and units', () => {
    for (const { seed, q } of questionsOf(folder, 'applyPowerQuestion')) {
        const cube = q.prompt.match(/edges of length (\d+) (\w+)/);
        const square = q.prompt.match(/square \w+ has side length (\d+) (\w+)\. What is its area\?/);
        const doubling = q.prompt.match(/doubles every (\w+), starting from (\d+)\. What is the population after (\d+)/);
        if (cube) {
            assert.equal(q.answer, `${Number(cube[1]) ** 3} ${cube[2]}³`, `${q.prompt} (seed ${seed})`);
        } else if (square) {
            assert.equal(q.answer, `${Number(square[1]) ** 2} ${square[2]}²`, `${q.prompt} (seed ${seed})`);
        } else if (doubling) {
            assert.equal(num(q.answer), Number(doubling[2]) * 2 ** Number(doubling[3]), `${q.prompt} (seed ${seed})`);
        } else {
            assert.fail(`unrecognised context, add a check for it: "${q.prompt}" (seed ${seed})`);
        }
    }
});
