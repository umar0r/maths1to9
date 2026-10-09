// Substitute the displayed values, calculate the resulting expression and
// choose the answer with the appropriate unit. No correctness markers are read.
const {section, choose} = require('./common.cjs');
const {evaluate, close} = require('../../helpers/lessons.cjs');

module.exports = async function solve(page) {
    const where = await section(page);
    if (!['interactive','question-bank'].includes(where)) return false;
    const main = page.locator('.lesson-controls button:visible').first();
    if (await main.isEnabled()) return false;
    const container = page.locator(`[data-lesson-section="${where}"]`);
    if (where === 'interactive') {
        const text = (await container.innerText()).replace(/\s+/g,' ');
        const value = Number(text.match(/s = (\d+)/)?.[1]);
        const formula = text.match(/C = (\d+) \+ (\d+)s/);
        if (!formula || !Number.isFinite(value)) throw new Error(`Cannot read the cinema formula: ${text}`);
        const slot = container.locator('[data-role="slot"]');
        if (await slot.count()) {
            await container.getByRole('button',{name:String(value),exact:true}).click();
            await container.locator('[data-role="slot"]').click();
            return true;
        }
        const prompt = await container.locator('.question-prompt').innerText();
        const result = Number(formula[1]) + Number(formula[2]) * value;
        let answer;
        if (/What value are you given/.test(prompt)) answer = String(value);
        else if (/Which part do you work out first/.test(prompt)) answer = `${formula[2]} × ${value}`;
        else if (/What is the value/.test(prompt)) answer = String(result);
        else if (/with its unit/.test(prompt)) answer = `£${result}`;
        else throw new Error(`Cannot solve walkthrough step: ${prompt}`);
        await container.getByRole('button',{name:answer,exact:true}).click();
        return true;
    }
    const card = container.locator('.question-card').first();
    const givens = {};
    for (const chip of await card.locator('.lx2-chip-row').first().locator('.lx2-chip').allTextContents()) {
        const match = chip.replace(/\s+/g,' ').trim().match(/^([a-z]) = ([−-]?\d+(?:\.\d+)?)$/i);
        if (match) givens[match[1]] = match[2];
    }
    for (const slot of await card.locator('[data-slot]').all()) {
        const letter = (await slot.innerText()).match(/[a-z]/)?.[0];
        if (!letter) continue; // Already replaced on an earlier solver turn.
        if (givens[letter] === undefined) throw new Error(`No given value for ${letter}`);
        const index = await slot.getAttribute('data-slot');
        await card.locator(`[data-tile="${givens[letter]}"]`).click();
        await container.locator(`[data-slot="${index}"]`).click();
        return true;
    }
    const calculation = card.locator('.worked-example .lx2-formula');
    if (!(await calculation.count())) return false;
    const expression = (await calculation.innerText()).split('=')[1].trim();
    const answer = evaluate(expression);
    const text = await card.innerText();
    const unit = /area of a rectangle/i.test(text) ? 'cm²'
        : /perimeter of a rectangle/i.test(text) ? 'cm'
        : /volume of a pyramid/i.test(text) ? 'cm³'
        : /speed equals/i.test(text) ? 'mph' : '';
    const options = await card.locator('input[type=radio]').evaluateAll(elements=>elements.map(element=>element.value));
    const chosen = options.find(option=>{
        if (unit && !option.endsWith(` ${unit}`)) return false;
        const numeric = option.replace(/^[a-z]\s*=\s*/i,'').replace(/^£/,'').replace(/\s+(?:cm[²³]?|mph|miles)$/,'').replace('−','-');
        return close(Number(numeric),answer);
    });
    if (chosen === undefined) throw new Error(`No answer with the right value and unit for ${expression}: ${options.join(' | ')}`);
    return choose(page,chosen);
};
