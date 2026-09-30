// Solver for fractions-introduction. Learn cards are unscored puzzles, so the
// choices are tried until the › arrow unlocks. Try-it and practice questions
// are worked out from the fraction or diagram shown.
const { section, options, choose } = require('./common.cjs');

const value = text => {
    const m = String(text).trim().replace(/−/g, '-').match(/^(-)?(?:(\d+)\s+)?(\d+)\/(\d+)$/);
    if (!m) return null;
    return (m[1] ? -1 : 1) * (Number(m[2] ?? 0) + Number(m[3]) / Number(m[4]));
};
const fractionsIn = text => text.match(/−?\d+\/\d+/g) ?? [];

// The answer to a question, from its prompt and the HTML of its picture/expression.
function answerFor(prompt, html) {
    const shown = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const fills = [...html.matchAll(/<rect[^>]*fill="([^"]+)"/g)].map(m => m[1]).filter(f => f !== 'none');
    let m;
    if (/What is the denominator of the shaded fraction/.test(prompt)) return String(fills.length);
    if (/What fraction of the shape is shaded/.test(prompt)) return `${fills.filter(f => f !== '#ffffff').length}/${fills.length}`;
    if ((m = prompt.match(/Which number is the (numerator|denominator)/))) {
        const [top, bottom] = shown.split('/');
        return m[1] === 'numerator' ? top.trim() : bottom.trim();
    }
    const classify = text => /^\d+\s+\d+\/\d+$/.test(text) ? 'Mixed number' : value(text) < 1 ? 'Proper fraction' : 'Improper fraction';
    if ((m = prompt.match(/Is (\S+) a proper fraction/))) return classify(m[1]);
    if (/Which name describes this number/.test(prompt)) return classify(shown);
    if (/as a mixed number/.test(prompt)) {
        const [top, bottom] = shown.split('/').map(Number);
        return `${Math.floor(top / bottom)} ${top % bottom}/${bottom}`;
    }
    if (/as an improper fraction/.test(prompt)) {
        const [, whole, top, bottom] = shown.match(/(\d+) (\d+)\/(\d+)/).map(Number);
        return `${whole * bottom + top}/${bottom}`;
    }
    if (/Choose the symbol/.test(prompt)) {
        const [a, b] = fractionsIn(shown).map(value);
        return Math.abs(a - b) < 1e-9 ? '=' : a < b ? '<' : '>';
    }
    if (/Which is the smaller number/.test(prompt)) {
        const [a, b] = fractionsIn(prompt);
        return Math.abs(value(a) - value(b)) < 1e-9 ? 'They are equal' : value(a) < value(b) ? a : b;
    }
    if (/in order from smallest to largest/.test(prompt)) return fractionsIn(shown).sort((a, b) => value(a) - value(b)).join(' < ');
    return null;
}

module.exports = async function solve(page) {
    const where = await section(page);
    const main = page.locator('.lesson-controls button:visible').first();
    const mainEnabled = await main.isEnabled().catch(() => false);

    if (where === 'explanation') {
        const next = page.locator('[data-learn-next]:visible');
        if (await next.isEnabled().catch(() => false)) { await next.click(); return true; }
        if (mainEnabled) return false;
        // Unscored puzzle: try each choice until the arrow unlocks.
        const choices = page.locator('[data-lesson-section="explanation"] button:visible:enabled:not([data-learn-next])');
        const count = await choices.count();
        for (let i = 0; i < count && !(await next.isEnabled().catch(() => false)); i++) await choices.nth(i).click().catch(() => {});
        return count > 0;
    }
    if (where === 'question-bank' && await page.locator('[data-start]:visible:enabled').count()) {
        await page.locator('[data-start]:visible:enabled').click();
        return true;
    }
    if ((where === 'interactive' || where === 'question-bank') && !mainEnabled) {
        const card = page.locator('main .fi-try:visible, main .question-card:visible').last();
        // Practice cards have .question-prompt; the Try-it card's prompt is its first plain <p>.
        const promptLocator = (await card.locator('.question-prompt').count()) ? card.locator('.question-prompt') : card.locator('p:not(.lesson-eyebrow)');
        const prompt = (await promptLocator.first().innerText()).replace(/\s+/g, ' ');
        // Only the fraction or picture itself: practice uses .esf-expression, Try-it uses .fi-visual-row.
        const expression = card.locator('.esf-expression, .fi-visual-row');
        const html = (await expression.count()) ? await expression.first().innerHTML() : '';
        const answer = answerFor(prompt, html);
        if (!answer) throw new Error(`the solver does not recognise this question: "${prompt}"`);
        if (process.env.DEBUG_RUN) console.log('   Q:', prompt, '|', html.replace(/<svg[\s\S]*?<\/svg>/g, '[svg]').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 120), '=>', answer);
        return choose(page, answer);
    }
    return false;
};
