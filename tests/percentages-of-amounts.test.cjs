// Maths checks for percentages-of-amounts: every percentage in the lesson is
// recomputed exactly (no floats), including worked examples and step answers.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readJson, contentDir, evaluate, close, wrongSums, allStrings } = require('./helpers/lessons.cjs');
const { exact, show, equal, times, percentOf, lessonChecker } = require('./helpers/decimals.cjs');

const folder = 'percentages-of-amounts';
const data = readJson(path.join(contentDir, folder, 'lesson.json'));
const { matches } = lessonChecker(path.join(contentDir, folder, 'lesson.js'));
const assessed = [...data.practice, ...data.check];
const steps = data.guided.flatMap(example => example.steps ?? []);

// What a question asks, worked out from its wording: the exact expected answer.
function expectedAnswer(prompt) {
    let m;
    if ((m = prompt.match(/Write (\d+(?:\.\d+)?)% as a decimal/)) || (m = prompt.match(/Which decimal is (\d+(?:\.\d+)?)%/))) {
        return show({ ...exact(m[1]), places: exact(m[1]).places + 2 });
    }
    if ((m = prompt.match(/Write (\d*\.\d+) as a percentage/))) return show(times(exact(m[1]), exact('100')));
    if ((m = prompt.match(/Which fraction equals (\d+)%/))) return { fractionOf: Number(m[1]) / 100 };
    // "Find 35% of 160", "Use a multiplier to find 18% of 650", "40% of 35 club members",
    // "A full battery holds 3200 mAh. How much charge is 85%", "A £90 coat has 20% off".
    const percents = [...prompt.matchAll(/(\d+(?:\.\d+)?)%/g)].map(x => x[1]);
    const others = [...prompt.replace(/\d+(?:\.\d+)?%/g, '').matchAll(/£?(\d+(?:\.\d+)?)/g)].map(x => x[1]);
    if (percents.length === 1 && others.length === 1) return show(percentOf(percents[0], others[0]));
    return null;
}
const fractionValue = text => { const [a, b] = text.split('/').map(Number); return a / b; };
const gcd = (a, b) => b ? gcd(b, a % b) : a;

test('every practice and check question is recognised', () => {
    for (const q of assessed.filter(q => !/statement explains/.test(q.prompt))) {
        assert.ok(expectedAnswer(q.prompt), `could not work out what "${q.prompt}" asks; add a pattern for it`);
    }
});

test('every practice and check answer is correct', () => {
    for (const q of assessed) {
        const expected = expectedAnswer(q.prompt);
        if (!expected) continue;
        if (expected.fractionOf) {
            assert.ok(close(fractionValue(q.answer), expected.fractionOf), `${q.prompt}: ${q.answer}`);
            const [a, b] = q.answer.split('/').map(Number);
            assert.equal(gcd(a, b), 1, `${q.answer} is not in its simplest form`);
        } else {
            assert.ok(equal(exact(q.answer), exact(expected)), `${q.prompt}: expected ${expected}, answer ${q.answer}`);
        }
        assert.ok(matches(q, q.answer), `the lesson's checker rejects its own answer: ${q.prompt}`);
    }
});

test('each set of options has exactly one correct answer, and no duplicates', () => {
    for (const q of [...assessed, ...steps].filter(q => q.options)) {
        assert.equal(q.options.filter(option => option === q.answer || matches(q, option)).length, 1, `${q.prompt}: ${q.options.join(', ')}`);
        assert.equal(new Set(q.options).size, q.options.length, `duplicate options: ${q.prompt}`);
    }
});

test('the "which statement explains" answer gives the right decimal and its working adds up', () => {
    for (const q of assessed.filter(q => /statement explains (\d+)%/.test(q.prompt))) {
        const percent = q.prompt.match(/explains (\d+)%/)[1];
        const decimal = expectedAnswer(`Write ${percent}% as a decimal`);
        assert.match(q.answer, new RegExp(`= ${decimal.replace('.', '\\.')}\\b`), `${q.prompt}: should give ${decimal}`);
        assert.deepEqual(wrongSums(q.answer), [], q.answer);
        for (const option of q.options.filter(option => option !== q.answer)) {
            assert.ok(!new RegExp(`= ${decimal.replace('.', '\\.')}\\b`).test(option.split('because')[0]), `distractor also gives ${decimal}: ${option}`);
        }
    }
});

test('learn slides: every percentage chain equals the same amount', () => {
    for (const item of data.learn) {
        for (const chain of (item.equation ?? '').split('·').map(part => part.trim()).filter(Boolean)) {
            const [first, ...rest] = chain.split('=').map(part => part.trim());
            const of = first.match(/^(\d+(?:\.\d+)?)% of £?(\d+(?:\.\d+)?)/);
            const percent = first.match(/^(\d+(?:\.\d+)?)%$/);
            const target = of ? Number(show(percentOf(of[1], of[2]))) : percent ? Number(percent[1]) / 100 : null;
            if (target === null) continue;
            for (const part of rest) {
                const value = evaluate(part.replace(/£|\s?(?:g|kg|ml|cm|m)\b/g, ''));
                assert.ok(close(value, target), `${chain}: "${part}" is ${value}, not ${target}`);
            }
        }
    }
});

test('step-by-step examples: working lines and final steps give the right amount', () => {
    for (const example of data.guided) {
        const total = show(percentOf(String(example.percent), String(example.whole)));
        for (const row of example.rows ?? []) {
            assert.ok(close(evaluate(row.calculation), Number(row.answer)), `${example.prompt} / ${row.label}: ${row.calculation} ≠ ${row.answer}`);
            assert.ok(equal(exact(row.answer), percentOf(String(row.percent), String(example.whole))), `${example.prompt} / ${row.label}: ${row.percent}% of ${example.whole} is not ${row.answer}`);
        }
        if (example.rows) assert.equal(example.rows.at(-1).answer, total, `${example.prompt}: the last working line should be the answer ${total}`);
        const lastStep = example.steps?.at(-1);
        if (lastStep) assert.ok(equal(exact(lastStep.answer), exact(total)), `${example.prompt}: the last step answer ${lastStep.answer} should be ${total}`);
        assert.ok(example.prompt.includes(`${example.percent}%`) && example.prompt.includes(String(example.whole)), `${example.prompt}: does not match percent ${example.percent} and whole ${example.whole}`);
    }
});

test('every worked sum in the steps and explanations adds up', () => {
    const wrong = allStrings([data.guided, data.practice, data.check]).flatMap(text => wrongSums(text).map(sum => `${sum}  (in "${text}")`));
    assert.deepEqual(wrong, []);
});
