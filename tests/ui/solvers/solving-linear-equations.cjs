// Read each equation from the question and solve it; build the story
// equation from the story's numbers.
function side(text, x) {
    const js = String(text).replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/')
        .replace(/(\d)\s*([a-z(])/g, '$1*$2').replace(/[a-z]/g, `(${x})`);
    return Function(`return ${js};`)();
}
function solve(equation) {
    const [left, right] = equation.split(' = ');
    const c = side(right, 0), f0 = side(left, 0), f1 = side(left, 1);
    return (c - f0) / (f1 - f0);
}
const shown = value => String(value).replace(/-/g, '−');

function answerFor(prompt) {
    let m;
    if ((m = prompt.match(/Solve (.+ = −?\d+)\./))) return shown(solve(m[1]));
    if ((m = prompt.match(/charges £(\d+), plus £(\d+) for each \w+\. The total fare is £(\d+)/)) && /Which equation/.test(prompt)) {
        return `${m[1]} + ${m[2]}x = ${m[3]}`;
    }
    if ((m = prompt.match(/removes the added (\d+)/))) return `Subtract ${m[1]} from both sides.`;
    throw new Error(`Unrecognised equation question: ${prompt}`);
}

async function solveStep(page, memory = {}) {
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
    const answer = answerFor(prompt);
    const options = card.locator('.question-card-options button');
    if (await options.count()) {
        const labels = (await options.allInnerTexts()).map(label => label.replace(/\s*×\s*$/, '').trim());
        const index = labels.indexOf(answer);
        if (index < 0) throw new Error(`No option "${answer}" in ${labels.join(' | ')} for: ${prompt}`);
        await options.nth(index).click();
    } else await card.locator('input[type=text]').fill(answer);
    return true;
}
module.exports = solveStep;
