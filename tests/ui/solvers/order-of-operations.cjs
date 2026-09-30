// Solver for order-of-operations. Interactive: tap the highlighted operation,
// then pick its value. Questions: evaluate the expression (brackets first,
// then powers/roots, × ÷, + −) and pick the matching option.
const { section, options, choose } = require('./common.cjs');
const { evaluate, close, num } = require('../../helpers/lessons.cjs');

function answerFor(prompt, expression, labels) {
    let m;
    if (/Which calculation should be completed first/.test(prompt)) return expression.match(/\(([^()]+)\)/)?.[1].trim();
    if ((m = prompt.match(/says (.+?) = (−?\d+)/))) {
        const value = evaluate(m[1]);
        return labels.find(l => new RegExp(`wrong: the answer is ${String(value).replace('-', '−')}\\.`).test(l) || new RegExp(`wrong: the answer is ${value}\\.`).test(l));
    }
    const value = evaluate(expression);
    return labels.find(l => { try { return close(num(l), value); } catch { return false; } });
}

module.exports = async function solve(page) {
    const where = await section(page);
    if (await page.locator('.lesson-controls button:visible').first().isEnabled().catch(() => false)) return false;
    const container = page.locator(`[data-lesson-section="${where}"]`);

    if (where === 'interactive') {
        const selected = container.locator('.order-expression__target.is-selected');
        const answers = container.locator('.order-answer:visible:enabled');
        if (await selected.count() && await answers.count()) {
            const sum = (await selected.last().getAttribute('aria-label')).replace(/\s+/g, ' ').match(/Select (.+) as the next operation/)[1];
            const value = evaluate(sum);
            const values = await answers.evaluateAll(els => els.map(e => e.dataset.answer));
            const match = values.find(v => close(num(v), value));
            if (match === undefined) throw new Error(`no answer tile for ${sum} = ${value} (tiles: ${values.join(', ')})`);
            await container.locator(`.order-answer[data-answer="${match}"]:visible`).first().click();
            return true;
        }
        const ready = container.locator('.order-expression__target.is-ready:visible:enabled');
        if (await ready.count()) { await ready.first().click(); return true; }
        return false;
    }
    if (where === 'question-bank' || where === 'comparison') {
        const labels = (await options(page)).map(o => o.label);
        if (!labels.length) return false;
        const card = container.locator('.ooo-question:visible, .question-card:visible').last();
        const prompt = (await card.locator('.question-prompt').first().innerText()).replace(/\s+/g, ' ');
        const expression = (await card.locator('.ooo-expression').first().innerText().catch(() => '')).replace(/\s+/g, ' ');
        const answer = answerFor(prompt, expression, labels);
        if (!answer) throw new Error(`the solver cannot answer "${prompt}" ${expression} (options: ${labels.join(' | ')})`);
        return choose(page, answer);
    }
    return false;
};
