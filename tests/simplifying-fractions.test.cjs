// Maths checks for simplifying-fractions: fractions are read from the
// question's HTML and every answer is recomputed.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { questionsOf, plain, fraction, gcd, close } = require('./helpers/lessons.cjs');

const folder = 'simplifying-fractions';

// Fractions drawn as esf-frac spans, in order: [{ top, bottom }], with "?" kept as null.
function fractionsIn(html) {
    const parts = html.split(/esf-frac__(top|bottom)/);
    const found = [];
    for (let i = 1; i < parts.length; i += 2) {
        const text = plain(parts[i + 1].replace(/^[^>]*>/, '').replace(/<[^>]*$/, '')).match(/^\?|^\d+/)?.[0];
        const value = text === '?' ? null : Number(text);
        if (parts[i] === 'top') found.push({ top: value });
        else found[found.length - 1].bottom = value;
    }
    return found;
}
const valueOf = f => f.top / f.bottom;
const isSimplest = f => gcd(f.top, f.bottom) === 1;
const others = q => q.options.filter(option => option !== q.answer);

test('equivalentGap and reverseGap: the missing number makes the fractions equal', () => {
    for (const type of ['equivalentGap', 'reverseGap']) {
        for (const { seed, q, raw } of questionsOf(folder, type)) {
            const [a, b] = fractionsIn(raw.expression);
            const filled = [a, b].map(f => ({ top: f.top ?? Number(q.answer), bottom: f.bottom ?? Number(q.answer) }));
            assert.ok(close(valueOf(filled[0]), valueOf(filled[1])), `${type}: ${JSON.stringify([a, b])} with ${q.answer} (seed ${seed})`);
            for (const option of others(q)) {
                const tried = [a, b].map(f => ({ top: f.top ?? Number(option), bottom: f.bottom ?? Number(option) }));
                assert.ok(!close(valueOf(tried[0]), valueOf(tried[1])), `${type}: distractor ${option} also works (seed ${seed})`);
            }
        }
    }
});

test('spotEquivalent: only the answer is equivalent to the fraction shown', () => {
    for (const { seed, q, raw } of questionsOf(folder, 'spotEquivalent')) {
        const [shown] = fractionsIn(raw.expression);
        assert.ok(close(fraction(q.answer).value, valueOf(shown)), `${q.answer} ≠ ${shown.top}/${shown.bottom} (seed ${seed})`);
        for (const option of others(q)) {
            assert.ok(!close(fraction(option).value, valueOf(shown)), `distractor ${option} is also equivalent (seed ${seed})`);
        }
    }
});

test('simplifyOneStep and simplifyFully: the answer is the same value in its simplest form', () => {
    for (const type of ['simplifyOneStep', 'simplifyFully']) {
        for (const { seed, q, raw } of questionsOf(folder, type)) {
            const [shown] = fractionsIn(raw.expression);
            const answer = fraction(q.answer);
            assert.ok(close(answer.value, valueOf(shown)), `${type}: ${shown.top}/${shown.bottom} ≠ ${q.answer} (seed ${seed})`);
            assert.ok(isSimplest(answer), `${type}: ${q.answer} is not fully simplified (seed ${seed})`);
            for (const option of others(q)) {
                const f = fraction(option);
                assert.ok(!(close(f.value, valueOf(shown)) && isSimplest(f)), `${type}: distractor ${option} is also correct (seed ${seed})`);
            }
        }
    }
});

test('fullySimplified: only the answer cannot be simplified', () => {
    for (const { seed, q } of questionsOf(folder, 'fullySimplified')) {
        assert.ok(isSimplest(fraction(q.answer)), `${q.answer} can be simplified (seed ${seed})`);
        for (const option of others(q)) assert.ok(!isSimplest(fraction(option)), `distractor ${option} is also fully simplified (seed ${seed})`);
    }
});

test('validDivisor: only the answer divides both numbers', () => {
    for (const { seed, q, raw } of questionsOf(folder, 'validDivisor')) {
        const [shown] = fractionsIn(raw.expression);
        const divides = d => shown.top % d === 0 && shown.bottom % d === 0;
        assert.ok(divides(Number(q.answer)), `${q.answer} does not divide ${shown.top} and ${shown.bottom} (seed ${seed})`);
        for (const option of others(q)) assert.ok(!divides(Number(option)), `distractor ${option} also divides both (seed ${seed})`);
    }
});

test("spotTheMistake: the pupil's working matches the prompt and the stated mistake is real", () => {
    for (const { seed, q, raw } of questionsOf(folder, 'spotTheMistake')) {
        const [before, after] = fractionsIn(raw.expression);
        const divided = q.prompt.match(/divides (\d+) by (\d+) and (\d+) by (\d+)/);
        if (divided) {
            const [, top, byTop, bottom, byBottom] = divided.map(Number);
            assert.deepEqual([top, bottom], [before.top, before.bottom], `prompt and picture disagree (seed ${seed})`);
            assert.deepEqual([top / byTop, bottom / byBottom], [after.top, after.bottom], `the working does not follow the prompt (seed ${seed})`);
        }
        if (/different numbers/.test(q.answer)) {
            assert.ok(!close(valueOf(before), valueOf(after)), `the answer says the value changed, but it did not (seed ${seed})`);
        }
        const stillDivides = q.answer.match(/still divide by (\d+)/);
        if (stillDivides) {
            assert.ok(close(valueOf(before), valueOf(after)), `the value changed, so this is not just "not fully simplified" (seed ${seed})`);
            const d = Number(stillDivides[1]);
            assert.ok(after.top % d === 0 && after.bottom % d === 0, `${after.top}/${after.bottom} does not divide by ${d} (seed ${seed})`);
        }
    }
});

test('shadedFraction: the answer is the shaded part of the bar in simplest form', () => {
    for (const { seed, q, raw } of questionsOf(folder, 'shadedFraction')) {
        const cells = (raw.expression.match(/class="esf-bar__cell[ "]/g) ?? []).length;
        const shaded = (raw.expression.match(/esf-bar__cell--shaded/g) ?? []).length;
        const [, said, total] = raw.expression.match(/aria-label="(\d+) of (\d+) equal parts shaded"/) ?? [];
        assert.deepEqual([Number(said), Number(total)], [shaded, cells], `screen-reader label disagrees with the picture (seed ${seed})`);
        const answer = fraction(q.answer);
        assert.ok(close(answer.value, shaded / cells) && isSimplest(answer), `${shaded}/${cells} shaded, answer ${q.answer} (seed ${seed})`);
    }
});

test('equalOrNot: Yes exactly when the fractions are equal', () => {
    for (const { seed, q, raw } of questionsOf(folder, 'equalOrNot')) {
        const [a, b] = fractionsIn(raw.expression);
        assert.equal(q.answer, close(valueOf(a), valueOf(b)) ? 'Yes' : 'No', `${a.top}/${a.bottom} and ${b.top}/${b.bottom} (seed ${seed})`);
    }
});
