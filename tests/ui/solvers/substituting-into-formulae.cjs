// Read the formula and values from each question, work it out, then pick the
// answer with the right unit or place the values and type the result.
const signed = text => Number(String(text).replace(/−/g, '-'));
const shown = value => String(value).replace(/-/g, '−');
const UNITS = { area: 'cm²', perimeter: 'cm', pyramid: 'cm³', speed: 'mph' };

function evaluate(formula, givens) {
    let js = formula.split(' = ')[1].replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/');
    js = js.replace(/[a-z]/g, letter => `(${givens[letter]})`).replace(/²/g, '**2').replace(/³/g, '**3');
    return Function(`return ${js.replace(/(\d|\))\s*\(/g, '$1*(')};`)();
}
function read(prompt) {
    const [, formula, given] = prompt.match(/Use ([A-Za-z] = .+?) when (.+?)\. (?:Find|Replace|What)/);
    const givens = Object.fromEntries([...given.matchAll(/([a-z]) = (−?\d+)/g)].map(([, letter, value]) => [letter, signed(value)]));
    return { givens, answer: evaluate(formula, givens) };
}

async function solve(page, memory = {}) {
    const main = page.locator('.lesson-controls button.button--primary:visible');
    const action = await main.innerText();
    if (action === 'All lessons') {
        const home = new URL('../../', page.url()).pathname;
        await main.click();
        if (new URL(page.url()).pathname !== home) (memory.problems ??= []).push('All lessons did not reach the homepage');
        return true;
    }
    if (action !== 'Check' || await main.isEnabled()) return false;
    const card = page.locator('.question-card:visible');
    const prompt = await card.locator('.question-prompt').innerText();
    const options = card.locator('.question-card-options button');
    if (await options.count()) {
        const labels = (await options.allInnerTexts()).map(label => label.replace(/\s*×\s*$/, '').trim());
        let answer;
        if (/Which part do you work out first/.test(prompt)) answer = labels.find(label => /^\d+ × \d+$/.test(label));
        else if (/What value is given for (\w)/.test(prompt)) answer = String(read(prompt).givens[prompt.match(/given for (\w)/)[1]]);
        else {
            const value = shown(read(prompt).answer);
            const unit = Object.entries(UNITS).find(([word]) => prompt.toLowerCase().includes(word))?.[1];
            answer = labels.some(label => label.startsWith('£')) ? `£${value}` : unit ? `${value} ${unit}` : value;
        }
        const index = labels.indexOf(answer);
        if (index < 0) throw new Error(`No option "${answer}" in ${labels.join(' | ')} for: ${prompt}`);
        await options.nth(index).click();
        return true;
    }
    const { givens, answer } = read(prompt);
    const slots = card.locator('button[data-letter]');
    for (let index = 0; index < await slots.count(); index++) {
        const letter = await slots.nth(index).getAttribute('data-letter');
        await card.getByRole('button', { name: `Value ${shown(givens[letter])}`, exact: true }).click();
        await slots.nth(index).click();
    }
    await card.locator('input[type=text]').fill(shown(answer));
    return true;
}
module.exports = solve;
