// Solve from the displayed fraction or division, never from internal answer flags.
const tidy = value => String(Number(value.toFixed(4)));
module.exports = async function solve(page) {
    const main = page.locator('.lesson-controls button.button--primary:visible');
    if (await main.isEnabled()) return false;
    const prompt = page.locator('.question-prompt:visible');
    if (!await prompt.count()) return false;
    const text = await prompt.innerText();
    if (text.startsWith('A student writes')) {
        await page.getByRole('button', { name: '0.6 is the decimal. Multiply by 100 to get 60%.', exact: true }).click();
        return true;
    }
    const fraction = text.match(/(\d+)\/(\d+)/);
    const division = text.match(/(\d+) ÷ (\d+)/);
    const match = fraction || division;
    if (!match) throw new Error(`Cannot solve fraction-percentage question: ${text}`);
    const decimal = Number(match[1]) / Number(match[2]);
    const answer = tidy(/percentage/.test(text) ? decimal * 100 : decimal);
    const options = page.locator('.question-card-options:visible button');
    if (await options.count()) await page.getByRole('button', { name: `${answer}%`, exact: true }).click();
    else await page.locator('.question-card:visible input[type=text]').fill(answer);
    return true;
};
