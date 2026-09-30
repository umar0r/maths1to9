// Solver for solving-quadratic-equations. The walkthrough marks its right
// choices (data-correct="true"); question-bank answers are worked out by
// substituting solutions back into the equation shown.
const { section, options, choose } = require('./common.cjs');
const { evaluate, close } = require('../../helpers/lessons.cjs');

const SAMPLE_X = [-7.5, -2.25, 0.5, 3.75, 11];
const samePolynomial = (a, b) => SAMPLE_X.every(x => close(evaluate(a, { x }), evaluate(b, { x })));
const lhsMinusRhs = equation => { const [l, r] = equation.split('='); return x => evaluate(l, { x }) - evaluate(r, { x }); };
const roots = f => {
    const c = f(0), a = (f(1) + f(-1)) / 2 - c, b = (f(1) - f(-1)) / 2, d = Math.sqrt(b * b - 4 * a * c);
    return [...new Set([(-b - d) / (2 * a), (-b + d) / (2 * a)].map(r => Math.round(r * 1e9) / 1e9))];
};
const solutions = text => /^x = −?\d+(?: or x = −?\d+)?$/.test(text) ? text.split(' or ').map(p => evaluate(p.replace('x =', ''))) : null;
const sameSet = (a, b) => a.length === b.length && [...a].sort((p, q) => p - q).every((v, i) => close(v, [...b].sort((p, q) => p - q)[i]));

function answerFor(prompt, equation, labels) {
    let m;
    if ((m = prompt.match(/factorises (.+?) as (.+?)\. What is wrong/))) {
        return labels.find(l => { const f = l.match(/(\(x[^)]*\)\(x[^)]*\))/)?.[1]; return f && samePolynomial(m[1], f); });
    }
    if ((m = prompt.match(/length \(x \+ (\d+)\) cm\. Its area is (\d+) cm²\. This gives (.+?) = 0\./))) {
        const positive = roots(x => evaluate(m[3], { x })).filter(r => r > 0);
        return `x = ${positive[0]}`;
    }
    if (/Which two equations come next/.test(prompt)) {
        return [...equation.matchAll(/\(([^()]+)\)/g)].map(b => `${b[1]} = 0`).join(' and ');
    }
    // Everything else: pick the option listing exactly the solutions.
    const expected = roots(lhsMinusRhs(equation || prompt.match(/^(.+? = 0)/)?.[1] || ''));
    return labels.find(l => { const s = solutions(l); return s && sameSet(s, expected); });
}

module.exports = async function solve(page) {
    const where = await section(page);
    if (await page.locator('.lesson-controls button:visible').first().isEnabled().catch(() => false)) return false;
    if (where === 'interactive') {
        const right = page.locator('[data-lesson-section="interactive"] [data-correct="true"]:visible:enabled');
        if (await right.count()) { await right.first().click(); return true; }
        return false;
    }
    if (where === 'question-bank') {
        const card = page.locator('main .question-card:visible').last();
        const prompt = (await card.locator('.question-prompt').innerText()).replace(/\s+/g, ' ');
        const equation = (await card.locator('.interactive-equation').innerText().catch(() => '')).replace(/\s+/g, ' ');
        const labels = (await options(page)).map(o => o.label);
        const answer = answerFor(prompt, equation, labels);
        if (!answer) throw new Error(`the solver cannot answer "${prompt}" ${equation} (options: ${labels.join(' | ')})`);
        return choose(page, answer);
    }
    return false;
};
