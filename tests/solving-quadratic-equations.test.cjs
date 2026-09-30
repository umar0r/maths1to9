// Maths checks for solving-quadratic-equations: solutions are substituted
// back into the equation, and factorisations are expanded and compared.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { questionsOf, evaluate, close } = require('./helpers/lessons.cjs');

const folder = 'solving-quadratic-equations';
const SAMPLE_X = [-7.5, -2.25, 0.5, 3.75, 11];

// "lhs = rhs" as a function f(x) = lhs − rhs.
const equation = text => {
    const [lhs, rhs] = text.split('=');
    return x => evaluate(lhs, { x }) - evaluate(rhs, { x });
};
// Two expressions are the same polynomial if they agree at several points.
const samePolynomial = (a, b) => SAMPLE_X.every(x => close(evaluate(a, { x }), evaluate(b, { x })));
// "x = 2 or x = −7" -> [2, -7]; null if the option is not a list of solutions.
const solutions = text => /^x = −?\d+(?: or x = −?\d+)?$/.test(text)
    ? text.split(' or ').map(part => evaluate(part.replace('x =', ''))) : null;
const sameSet = (a, b) => a.length === b.length && [...a].sort((p, q) => p - q).every((v, i) => close(v, [...b].sort((p, q) => p - q)[i]));
// Roots of a quadratic f(x) = x² + bx + c, found from three values of f.
const roots = f => {
    const c = f(0), a = (f(1) + f(-1)) / 2 - c, b = (f(1) - f(-1)) / 2;
    const d = Math.sqrt(b * b - 4 * a * c);
    return [...new Set([(-b - d) / (2 * a), (-b + d) / (2 * a)].map(r => Math.round(r * 1e9) / 1e9))];
};

for (const type of ['squareEqualsNumber', 'monicReady', 'rearrangeToZero', 'factoriseThenSolve', 'commonFactor', 'bothSolutionsFromBrackets', 'notFinished']) {
    test(`${type}: the answer gives every solution and no other option does`, () => {
        for (const { seed, q, raw } of questionsOf(folder, type)) {
            const f = equation(raw.display);
            const expected = roots(f);
            const answer = solutions(q.answer);
            assert.ok(answer, `answer "${q.answer}" is not a list of solutions (seed ${seed})`);
            assert.ok(sameSet(answer, expected), `${raw.display}: solutions are ${expected.join(' and ')}, answer ${q.answer} (seed ${seed})`);
            for (const option of q.options.filter(option => option !== q.answer)) {
                const values = solutions(option);
                if (values) assert.ok(!sameSet(values, expected), `distractor ${option} is also correct for ${raw.display} (seed ${seed})`);
            }
            if (type === 'notFinished') {
                const [, original, factorised] = q.prompt.match(/^(.+?) factorises to (.+?)\./);
                assert.ok(samePolynomial(original.split('=')[0], factorised.split('=')[0]), `${original} does not factorise to ${factorised} (seed ${seed})`);
            }
        }
    });
}

test('setFactorsZero: the answer sets each bracket equal to zero', () => {
    for (const { seed, q, raw } of questionsOf(folder, 'setFactorsZero')) {
        const brackets = [...raw.display.matchAll(/\(([^()]+)\)/g)].map(m => m[1]);
        assert.equal(q.answer, brackets.map(b => `${b} = 0`).join(' and '), `${raw.display} (seed ${seed})`);
    }
});

test("spotError: the student's factorisation is wrong and the correction is right", () => {
    for (const { seed, q } of questionsOf(folder, 'spotError')) {
        const [, quadratic, attempt] = q.prompt.match(/factorises (.+?) as (.+?)\. What is wrong/);
        const correction = q.answer.match(/(\(x[^)]*\)\(x[^)]*\))/)?.[1];
        assert.ok(correction, `the answer should show the correct brackets: "${q.answer}" (seed ${seed})`);
        assert.ok(!samePolynomial(quadratic, attempt), `${attempt} is actually correct for ${quadratic} (seed ${seed})`);
        assert.ok(samePolynomial(quadratic, correction), `${correction} does not expand to ${quadratic} (seed ${seed})`);
    }
});

test('contextReject: the factorised equation matches the rectangle and the width is the positive solution', () => {
    for (const { seed, q } of questionsOf(folder, 'contextReject')) {
        const [, extra, area, factorised] = q.prompt.match(/length \(x \+ (\d+)\) cm\. Its area is (\d+) cm²\. This gives (.+?) = 0\./);
        assert.ok(samePolynomial(`x(x + ${extra}) − ${area}`, factorised), `x(x + ${extra}) = ${area} does not give ${factorised} = 0 (seed ${seed})`);
        const positive = roots(x => evaluate(factorised, { x })).filter(r => r > 0);
        assert.equal(positive.length, 1, `(seed ${seed})`);
        assert.equal(q.answer, `x = ${positive[0]}`, `${q.prompt} (seed ${seed})`);
    }
});
