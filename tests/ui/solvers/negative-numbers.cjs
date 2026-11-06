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
        const choices = { 'Work out −6 × 4.': '−24', 'Which square gives the sign of −8 × −2?': '− row, − column', 'Sam says −3 × −5 = −15. What is the right answer?': '15' };
        const typed = { 'Work out −6 × −3.': '18', 'Find the missing number: ? × −3 = 15.': '−5' };
        if (typed[text]) await page.locator('.question-card:visible input[type=text]').fill(typed[text]);
        else await page.getByRole('button', { name: choices[text], exact: true }).click();
        return true;
    }
    const calculation = text.match(/([−-]?\d+)\s*−\s*\(−(\d+)\)/);
    const options = page.locator('.question-card-options:visible button');
    if (/temperature/.test(text)) {
        const start = number(text.match(/temperature is ([−-]?\d+)/)[1]);
        const end = number(text.match(/midday, it is ([−-]?\d+)/)[1]);
        await page.getByRole('button', { name: `${signed(end)} − (${signed(start)}) = ${end - start}°C`, exact: true }).click();
    } else if (text.startsWith('A student writes:')) {
        await page.getByRole('button', { name: 'Subtracting −7 means adding 7. The answer is 3.', exact: true }).click();
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
