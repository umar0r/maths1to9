const { MAIN_ACTION } = require('../helpers.cjs');

function numericAnswer(prompt) {
    const match = /(\d+) ([+−]) (\d+)$/.exec(prompt);
    if (!match) throw new Error(`Cannot solve the parts fixture question "${prompt}".`);
    const [, a, operation, b] = match;
    return String(operation === '+' ? Number(a) + Number(b) : Number(a) - Number(b));
}

async function solve(page) {
    if (await page.locator(`${MAIN_ACTION}:visible`).isEnabled()) return false;
    const learn = page.locator('.lesson-explanation:visible').getByRole('button', { name: /^(Add|Take away) / });
    if (await learn.count()) {
        await learn.click();
        return true;
    }
    const prompt = page.locator('.question-prompt:visible');
    if (!await prompt.count()) return false;

    const question = await prompt.innerText();
    const answer = question.startsWith('How do you find the total') ? 'Add both groups.'
        : question.startsWith('Some pears are taken away.') ? 'Count the pears that are left.'
        : numericAnswer(question);
    const choices = page.locator('.question-card-options:visible');
    if (await choices.count()) await choices.getByRole('button', { name: answer, exact: true }).click();
    else await page.locator('.question-card:visible input').fill(answer);
    return true;
}

module.exports = solve;
module.exports.numericAnswer = numericAnswer;
