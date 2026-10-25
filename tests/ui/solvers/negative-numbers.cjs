// Solve from the displayed calculation, rather than inspecting answer flags.
const number = text => Number(text.replace('−', '-'));
const signed = value => String(value).replace('-', '−');

module.exports = async function solve(page) {
    const main = page.locator('.lesson-controls button.button--primary:visible');
    if (await main.isEnabled()) return false;
    const prompt = page.locator('.question-prompt:visible');
    if (!await prompt.count()) return false;
    const text = await prompt.innerText();
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
