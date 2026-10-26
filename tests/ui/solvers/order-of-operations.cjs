// Evaluate only the arithmetic visible in the current card/map row.
const { evaluate, close, num } = require('../../helpers/lessons.cjs');
function answerFor(prompt, choice) {
    if (prompt.startsWith('Which calculation comes first')) return prompt.match(/\(([^()]+)\)/)[1];
    if (prompt.startsWith('Work out just the calculation inside')) return String(evaluate(prompt.match(/\(([^()]+)\)/)[1]));
    if (prompt.startsWith('Amir says')) {
        const expression = prompt.match(/says (.+?) =/)[1];
        const value = evaluate(expression);
        return choice ? `Amir is wrong: the answer is ${value}.` : String(value);
    }
    if (prompt.startsWith('Work out ')) return String(evaluate(prompt.slice('Work out '.length).replace(/\.$/, '')));
    throw new Error(`Unrecognised order-of-operations question: ${prompt}`);
}
async function solve(page) {
    const main = page.locator('.lesson-controls button.button--primary:visible');
    if (await main.innerText() !== 'Check') return false;
    const card = page.locator('.question-card:visible');
    const map = card.locator('.operations-map');
    if (await map.count()) {
        if (await main.isEnabled()) return false;
        for (let index = 0; index < 6; index++) {
            const row = card.locator('.operations-map-row').nth(index);
            const input = row.getByRole('textbox');
            const operation = (await row.locator('.operations-map-answer > span').innerText()).replace(/ =$/, '');
            const expected = evaluate(operation);
            const current = await input.inputValue();
            if (current.trim() && close(num(current), expected)) continue;
            await input.fill(String(expected));
        }
        return true;
    }
    if (await main.isEnabled()) return false;
    const prompt = await card.locator('.question-prompt').innerText();
    const options = card.locator('.question-card-options button');
    const choice = await options.count() > 0;
    const answer = answerFor(prompt, choice);
    if (choice) {
        const labels = await options.allTextContents();
        const target = labels.findIndex(label => label === answer || (!/^Amir|^Which calculation/.test(prompt) && close(num(label), Number(answer))));
        if (target < 0) throw new Error(`No option matches ${answer}: ${labels.join(' | ')}`);
        await options.nth(target).click();
    } else await card.getByRole('textbox').fill(answer);
    return true;
}
module.exports = solve;
