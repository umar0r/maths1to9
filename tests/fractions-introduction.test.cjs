// Maths checks for fractions-introduction: answers are recomputed from the
// fraction or diagram the student sees, and feedback must not state untruths.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { questionsOf, plain, fraction, close } = require('./helpers/lessons.cjs');

const folder = 'fractions-introduction';
const fractionsIn = html => html.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(part => /^−?\d+\/\d+$/.test(part));

test('nameThePart: numerator is the top number, denominator the bottom', () => {
    for (const { seed, q, raw } of questionsOf(folder, 'nameThePart')) {
        const f = fraction(plain(raw.expression));
        const part = q.prompt.includes('numerator') ? f.top : f.bottom;
        assert.equal(q.answer, String(part), `${q.prompt} ${plain(raw.expression)} (seed ${seed})`);
    }
});

test('shadedFraction: the answer matches the shaded parts in the picture', () => {
    for (const { seed, q, raw } of questionsOf(folder, 'shadedFraction')) {
        const fills = [...raw.expression.matchAll(/<rect[^>]*fill="([^"]+)"/g)].map(m => m[1]).filter(fill => fill !== 'none');
        const shaded = fills.filter(fill => fill !== '#ffffff').length;
        const [, said, total] = raw.expression.match(/aria-label="(\d+) of (\d+) equal parts shaded"/) ?? [];
        assert.equal(Number(said), shaded, `screen-reader label says ${said} shaded, picture shows ${shaded} (seed ${seed})`);
        assert.equal(Number(total), fills.length, `screen-reader label says ${total} parts, picture shows ${fills.length} (seed ${seed})`);
        assert.equal(q.answer, `${shaded}/${fills.length}`, `(seed ${seed})`);
    }
});

test('classifyFraction: proper, improper and mixed are named correctly', () => {
    for (const { seed, q, raw } of questionsOf(folder, 'classifyFraction')) {
        const text = plain(raw.expression);
        const f = fraction(text);
        const expected = /^\d+\s/.test(text) ? 'Mixed number' : f.top < f.bottom ? 'Proper fraction' : 'Improper fraction';
        assert.equal(q.answer, expected, `${text} (seed ${seed})`);
    }
});

test('improperToMixed: the mixed number has the same value, a proper fraction part and the same denominator', () => {
    for (const { seed, q, raw } of questionsOf(folder, 'improperToMixed')) {
        const given = fraction(plain(raw.expression)), answer = fraction(q.answer);
        assert.ok(close(given.value, answer.value), `${plain(raw.expression)} ≠ ${q.answer} (seed ${seed})`);
        assert.ok(answer.top < answer.bottom && answer.whole >= 1, `${q.answer} is not a mixed number (seed ${seed})`);
        assert.equal(answer.bottom, given.bottom, `${q.answer}: denominator changed (seed ${seed})`);
        for (const option of q.options.filter(option => option !== q.answer)) {
            assert.ok(!close(fraction(option).value, given.value), `distractor ${option} also equals ${plain(raw.expression)} (seed ${seed})`);
        }
    }
});

test('mixedToImproper: the improper fraction has the same value and denominator', () => {
    for (const { seed, q, raw } of questionsOf(folder, 'mixedToImproper')) {
        const given = fraction(plain(raw.expression)), answer = fraction(q.answer);
        assert.ok(close(given.value, answer.value), `${plain(raw.expression)} ≠ ${q.answer} (seed ${seed})`);
        assert.equal(answer.bottom, given.bottom, `${q.answer}: denominator changed (seed ${seed})`);
        for (const option of q.options.filter(option => option !== q.answer)) {
            assert.ok(!close(fraction(option).value, given.value), `distractor ${option} also equals ${plain(raw.expression)} (seed ${seed})`);
        }
    }
});

test('chooseInequality: the symbol is right and wrong-answer feedback never states a false comparison', () => {
    for (const { seed, q, raw } of questionsOf(folder, 'chooseInequality')) {
        const [a, b] = fractionsIn(raw.expression);
        const [x, y] = [fraction(a).value, fraction(b).value];
        const expected = close(x, y) ? '=' : x < y ? '<' : '>';
        assert.equal(q.answer, expected, `${a} ${expected} ${b} (seed ${seed})`);
        for (const option of raw.answers.filter(option => !option.correct)) {
            const claim = option.feedback.match(/^(\S+) is (smaller|larger)/);
            if (!claim) continue;
            const claimed = fraction(claim[1]).value, other = claim[1] === a ? y : x;
            const isTrue = claim[2] === 'smaller' ? claimed < other : claimed > other;
            assert.ok(isTrue, `feedback for "${option.label}" says "${option.feedback}" but ${a} ${expected} ${b} (seed ${seed})`);
        }
    }
});

test('compareNegative: the answer is the smaller number', () => {
    for (const { seed, q, raw } of questionsOf(folder, 'compareNegative')) {
        const [a, b] = fractionsIn(raw.expression);
        const [x, y] = [fraction(a).value, fraction(b).value];
        const expected = close(x, y) ? 'They are equal' : x < y ? a : b;
        assert.equal(q.answer, expected, `smaller of ${a} and ${b} (seed ${seed})`);
    }
});

test('orderThree: the answer lists the same three numbers from smallest to largest', () => {
    for (const { seed, q, raw } of questionsOf(folder, 'orderThree')) {
        const shown = fractionsIn(raw.expression);
        const listed = q.answer.split(' < ');
        assert.deepEqual([...listed].sort(), [...shown].sort(), `${q.answer} uses different numbers from ${shown.join(', ')} (seed ${seed})`);
        const values = listed.map(f => fraction(f).value);
        assert.ok(values.every((v, i) => i === 0 || values[i - 1] < v), `${q.answer} is not in order (seed ${seed})`);
    }
});
