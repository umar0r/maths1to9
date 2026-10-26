const { optionLabels } = require('./common.cjs');
// Read each quadratic from the question and find both whole-number solutions
// by trying values, then pick or type them smaller first.
function side(text, x) {
    const js = String(text).replace(/−/g, '-').replace(/×/g, '*').replace(/²/g, '**2')
        .replace(/(\d|\))\s*([x(])/g, '$1*$2').replace(/x\s*\(/g, 'x*(').replace(/x/g, `(${x})`);
    return Function(`return ${js};`)();
}
function solutions(equation) {
    const [left, right] = equation.split(' = ');
    return Array.from({ length: 61 }, (_, i) => i - 30).filter(x => side(left, x) === side(right, x));
}
function equationIn(prompt) {
    let m;
    if ((m = prompt.match(/has factorised (.+? = 0) as/))) return m[1];
    if ((m = prompt.match(/solutions of (.+?) are/))) return m[1];
    if ((m = prompt.match(/, or (.+? = 0)\./))) return m[1];
    return prompt.match(/Solve (.+? = −?\d+)\./)[1];
}
const shown = value => String(value).replace(/-/g, '−');

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
    const [smaller, larger] = solutions(equationIn(prompt));
    const options = card.locator('.question-card-options button');
    if (await options.count()) {
        const answer = `x = ${shown(smaller)} or x = ${shown(larger)}`;
        const labels = await optionLabels(options);
        const index = labels.indexOf(answer);
        if (index < 0) throw new Error(`No option "${answer}" in ${labels.join(' | ')} for: ${prompt}`);
        await options.nth(index).click();
    } else {
        await card.getByLabel('Smaller solution for x').fill(shown(smaller));
        await card.getByLabel('Larger solution for x').fill(shown(larger));
    }
    return true;
}
module.exports = solve;
