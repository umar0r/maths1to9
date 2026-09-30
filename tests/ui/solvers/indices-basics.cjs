// Solver for indices-basics: tries the power explorer once, and works out each
// question (base, index, expansion, value, notation, context) from its prompt.
const { section, options, choose } = require('./common.cjs');

const SUPER = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const toSuper = n => [...String(n)].map(d => SUPER[d]).join('');
const power = text => {
    const m = text.match(/(\d+)([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/);
    return m && { base: Number(m[1]), index: Number([...m[2]].map(c => SUPER.indexOf(c)).join('')) };
};

function answerFor(prompt) {
    let m;
    const p = power(prompt);
    if (/what is the index/.test(prompt)) return String(p.index);
    if (/what is the base/.test(prompt)) return String(p.base);
    if (/as repeated multiplication/.test(prompt)) return Array(p.index).fill(p.base).join(' × ');
    if (/^Calculate/.test(prompt)) return String(p.base ** p.index);
    if ((m = prompt.match(/matches ((\d+)(?: × \2)*)\?/))) return `${m[2]}${toSuper(m[1].split(' × ').length)}`;
    if ((m = prompt.match(/edges of length (\d+) (\w+)/))) return `${Number(m[1]) ** 3} ${m[2]}³`;
    if ((m = prompt.match(/side length (\d+) (\w+)\. What is its area/))) return `${Number(m[1]) ** 2} ${m[2]}²`;
    if ((m = prompt.match(/starting from (\d+)\. What is the population after (\d+)/))) return String(Number(m[1]) * 2 ** Number(m[2]));
    return null;
}

module.exports = async function solve(page, memory) {
    const where = await section(page);
    if (where === 'comparison' && !memory.explored && await page.locator('[data-base]:visible').count()) {
        // Try the explorer: change the base and move the index slider.
        await page.locator('[data-base]:visible').selectOption('3');
        await page.locator('#power-index').evaluate(slider => { slider.value = '4'; slider.dispatchEvent(new Event('input', { bubbles: true })); });
        memory.explored = true;
        return true;
    }
    if (await page.locator('.lesson-controls button:visible').first().isEnabled().catch(() => false)) return false;
    if (where === 'interactive') {
        // Checks on the power just built or shown, e.g. "You've built 2⁶. What is the index here?"
        // or "The grid shows 6² … How many small squares fill the whole grid?"
        const text = (await page.locator('[data-lesson-section="interactive"]').innerText()).replace(/\s+/g, ' ');
        const question = text.match(/([^.?!]*\?)[^?]*$/)?.[1]?.trim() ?? '';
        const before = text.slice(0, text.lastIndexOf(question));
        const powers = [...before.matchAll(/\d+[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g)].map(m => power(m[0]));
        const shown = powers.at(-1);
        if (!question || !shown) return false;
        // "4³ — Student A says 4 × 3 = 12. Student B says 4 × 4 × 4 = 64. Who is correct?"
        if (/Who is correct/.test(question)) {
            const value = shown.base ** shown.index;
            const right = [...text.matchAll(/(Student \w+) says [^=]+= (\d+)/g)].find(m => Number(m[2]) === value)?.[1];
            if (!right) throw new Error(`no student gives ${value}: "${text.slice(-160)}"`);
            await page.locator('[data-lesson-section="interactive"] button:visible:enabled', { hasText: right }).first().click();
            return true;
        }
        const answer = /index/i.test(question) ? shown.index
            : /base/i.test(question) ? shown.base
            : /how many|value|worth|equal|total/i.test(question) ? shown.base ** shown.index : null;
        if (answer === null) throw new Error(`the solver cannot answer "${question}"`);
        const button = page.locator('[data-lesson-section="interactive"] button:visible:enabled', { hasText: new RegExp(`^\\s*${answer}\\s*$`) });
        if (!(await button.count())) return false;
        await button.first().click();
        return true;
    }
    if (where !== 'question-bank' && where !== 'comparison') return false;
    const prompt = (await page.locator('main .question-prompt:visible, main legend:visible').last().innerText().catch(() => '')).replace(/\s+/g, ' ');
    const answer = answerFor(prompt);
    const labels = (await options(page)).map(o => o.label);
    if (!labels.length) return false; // e.g. the results summary
    if (!answer) throw new Error(`the solver cannot answer "${prompt}" (options: ${labels.join(' | ')})`);
    return choose(page, answer);
};
