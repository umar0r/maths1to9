// Solve from the displayed calculation, rather than inspecting answer flags.
const number = text => Number(text.replace('−', '-'));
const signed = value => String(value).replace('-', '−');

module.exports = async function solve(page) {
    if (await require('../negative-numbers-learn-helper.cjs')(page)) return true;
    const main = page.locator('.lesson-controls button.button--primary:visible');
    if (await main.isEnabled()) return false;
    const prompt = page.locator('.question-prompt:visible');
    if (!await prompt.count()) return false;
    const text = await prompt.innerText();
    if (text.includes('×')) {
        const typed = { 'Work out −6 × 4.': '−24', 'Work out −6 × −3.': '18', 'Find the missing number: ? × −3 = 15.': '−5', 'Sam says −3 × −5 = −15. What is the right answer?': '15' };
        await page.locator('.question-card:visible input[type=text]').fill(typed[text]);
        return true;
    }
    const calculation = text.match(/([−-]?\d+)\s*−\s*\(−(\d+)\)/);
    const options = page.locator('.question-card-options:visible button');
    const understanding = {
        'On a number line, what do + and − tell you to do?': '+ means move right. − means move left.',
        'What happens to the two minus signs when you take away a negative number?': 'They turn into a plus, so you add.',
        'What sign do you get when you multiply a negative number by a positive number?': 'A minus, because the two signs are different.',
        'You start on a negative number and take away a positive number. What happens?': 'You move left, further below zero, so the answer is more negative.',
        'You start on a positive number and take away a bigger number. What happens?': 'You go past zero, so the answer is negative.'
    };
    if (understanding[text]) {
        await page.getByRole('button', { name: understanding[text], exact: true }).click();
    } else if (calculation) {
        const start = number(calculation[1]), amount = Number(calculation[2]);
        if (text.startsWith('Sam writes:')) {
            await page.getByRole('button', { name: `He changed ${signed(start)} to ${signed(-start)}. The answer is ${signed(start + amount)}.`, exact: true }).click();
        } else if (await options.count()) {
            await page.getByRole('button', { name: `${signed(start)} + ${amount}`, exact: true }).click();
        } else {
            await page.locator('.question-card:visible input[type=text]').fill(String(start + amount));
        }
    } else throw new Error(`Cannot solve negative-numbers question: ${text}`);
    return true;
};
