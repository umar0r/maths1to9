// Solver for simplifying-fractions. Learn puzzles and Try-it questions are
// unscored, so options are tried in turn; practice questions are worked out
// from the fractions drawn in the question.
const { section, options, choose } = require('./common.cjs');

const gcd = (a, b) => b ? gcd(b, a % b) : Math.abs(a);
const close = (a, b) => Math.abs(a - b) < 1e-9;
const parse = text => { const [a, b] = String(text).split('/').map(Number); return { top: a, bottom: b, value: a / b }; };

// Fractions drawn with esf-frac spans, in order; "?" becomes null.
function fractionsIn(html) {
    const parts = html.split(/esf-frac__(top|bottom)/);
    const found = [];
    for (let i = 1; i < parts.length; i += 2) {
        const text = parts[i + 1].replace(/^[^>]*>/, '').replace(/<[^>]*$/, '').replace(/<[^>]*>/g, ' ').trim().match(/^\?|^\d+/)?.[0];
        const v = text === '?' ? null : Number(text);
        if (parts[i] === 'top') found.push({ top: v }); else found[found.length - 1].bottom = v;
    }
    return found;
}

// The answer label (or a test for the right option) for a practice question.
function practiceAnswer(prompt, html, labels) {
    const fr = fractionsIn(html);
    const cells = (html.match(/class="esf-bar__cell[ "]/g) ?? []).length;
    const shaded = (html.match(/esf-bar__cell--shaded/g) ?? []).length;
    const simplest = (top, bottom) => { const g = gcd(top, bottom); return `${top / g}/${bottom / g}`; };
    if (/Complete the equivalent fraction/.test(prompt)) {
        const [a, b] = fr;
        const known = a.top !== null && a.bottom !== null ? a : b, gap = known === a ? b : a;
        return String(gap.top === null ? known.top / known.bottom * gap.bottom : gap.top * known.bottom / known.top);
    }
    if (/equivalent to this one/.test(prompt)) return labels.find(l => close(parse(l).value, fr[0].top / fr[0].bottom));
    if (/simplest form|Simplify this fraction fully/.test(prompt) && fr.length) return simplest(fr[0].top, fr[0].bottom);
    if (/What fraction of the bar is shaded/.test(prompt)) return simplest(shaded, cells);
    if (/Which fraction is fully simplified/.test(prompt)) return labels.find(l => gcd(parse(l).top, parse(l).bottom) === 1);
    if (/divides the numerator and the denominator exactly/.test(prompt)) return labels.find(l => fr[0].top % Number(l) === 0 && fr[0].bottom % Number(l) === 0);
    if (/show the same amount/.test(prompt)) return close(fr[0].top / fr[0].bottom, fr[1].top / fr[1].bottom) ? 'Yes' : 'No';
    if (/What is wrong|What mistake/.test(prompt)) {
        // Work out what the pupil actually did from the two fractions.
        const [before, after] = fr;
        const pick = pattern => labels.find(l => pattern.test(l));
        if (before.top - after.top === before.bottom - after.bottom && before.top !== after.top) return pick(/subtracted/);
        if (after.bottom === before.bottom && after.top !== before.top) return pick(/top but not the bottom/);
        if (after.top === before.top && after.bottom !== before.bottom) return pick(/bottom but not the top/);
        if (!close(before.top / before.bottom, after.top / after.bottom)) return pick(/different numbers/);
        if (gcd(after.top, after.bottom) > 1) return pick(/not fully simplified/);
        return pick(/^Nothing/);
    }
    return null;
}

module.exports = async function solve(page, memory) {
    const where = await section(page);
    const main = page.locator('.lesson-controls button:visible').first();
    const mainText = (await main.innerText().catch(() => '')).trim();
    const mainEnabled = await main.isEnabled().catch(() => false);
    const container = page.locator(`[data-lesson-section="${where}"]`);

    // Learn and Method cards: move on with the › arrow once it unlocks.
    for (const next of ['[data-learn-next]', '[data-method-next]']) {
        const arrow = container.locator(`${next}:visible`);
        if (await arrow.count() && await arrow.isEnabled()) { await arrow.click(); return true; }
    }
    if (where === 'explanation' && !mainEnabled) {
        // Unscored puzzle: try the next choice.
        const choices = await container.locator('button:visible:enabled:not([data-learn-next])').all();
        memory.hook = (memory.hook ?? -1) + 1;
        if (choices.length) { await choices[memory.hook % choices.length].click(); return true; }
    }
    if (where === 'interactive' && !mainEnabled) {
        // Unscored Try-it: try each option; the runner presses Check / Try again.
        const question = (await container.innerText()).slice(0, 200);
        memory.tried ??= {};
        memory.tried[question] = (memory.tried[question] ?? -1) + 1;
        const all = await options(page);
        if (all.length) { await all[memory.tried[question] % all.length].locator.click(); return true; }
    }
    if (where === 'question-bank') {
        const start = page.locator('[data-start]:visible:enabled');
        if (await start.count()) { await start.click(); return true; }
        if (mainEnabled || /try again/i.test(mainText)) return false;
        const card = page.locator('main .question-card:visible').last();
        const prompt = (await card.locator('.question-prompt').innerText()).replace(/\s+/g, ' ');
        const html = await card.innerHTML();
        const labels = (await options(page)).map(o => o.label);
        const answer = practiceAnswer(prompt, html, labels);
        if (!answer) throw new Error(`the solver cannot answer "${prompt}" (options: ${labels.join(' | ')})`);
        return choose(page, answer);
    }
    return false;
};
