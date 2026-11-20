// Solve from the visible operands, independently of the generator's answers.
const cents = text => Math.round(Number(text.replace(/[£,]/g, '').replace('−', '-')) * 100);
const decimal = total => (total / 100).toFixed(2);

module.exports = async function solve(page) {
    const main = page.locator('.lesson-controls button.button--primary:visible');
    if (await main.innerText() !== 'Check' || await main.isEnabled()) return false;
    const slots = page.locator('.decimal-tap-slot:visible');
    if (await slots.count()) {
        const rows = await page.locator('.decimal-column-table:visible tbody tr').evaluateAll(rows => rows.map(row =>
            [...row.cells].map(cell => cell.textContent.trim())));
        const left = rows[rows.length - 3];
        const right = rows[rows.length - 2];
        const a = cents(left.slice(1).join(''));
        const b = cents(right.slice(1).join(''));
        const answer = right[0].includes('−') ? a - b : a + b;
        for (const [index, key] of ['hundredths', 'tenths', 'units', 'tens'].entries()) {
            const slot = page.getByRole('button', { name: `${key[0].toUpperCase() + key.slice(1)} answer digit`, exact: true });
            if (!await slot.count()) continue;
            await slot.click();
            await page.getByRole('button', { name: `Digit ${Math.floor(answer / 10 ** index) % 10}`, exact: true }).click();
        }
        return true;
    }
    const prompt = page.locator('.question-prompt:visible');
    if (!await prompt.count()) return false;
    const text = await prompt.innerText();
    const conceptual = [
        [/^Sam works/, "The 8 is tenths and the 4 is hundredths, so they don't belong in the same column."],
        [/^Why can/, "7.6 has no hundredths, so a 0 there doesn't change it."],
        [/^In 7.60/, 'Write 0 in the tenths and add 1 to the units.'],
        [/^A receipt has/, '2.40 + 1.35 − 0.50']
    ].find(([pattern]) => pattern.test(text));
    if (conceptual) {
        await page.getByRole('button', { name: conceptual[1], exact: true }).click();
        return true;
    }
    const values = (text.match(/\d+(?:\.\d+)?/g) || []).map(cents);
    let answer;
    if (text.startsWith('A bank account')) answer = values[0] - values[1] + values[2];
    else if (text.startsWith('You pay')) answer = values[1] - values[0];
    else if (text.startsWith('A balance')) answer = values[1] - values[0];
    else if (text.includes('□')) answer = values[2] - values[0] - values[1];
    else if (text.startsWith('How much more')) {
        const prices = await page.locator('.decimal-price-list tbody tr').first().locator('td').allTextContents();
        answer = cents(prices[1]) - cents(prices[0]);
    } else if (values.length === 3) answer = values[0] + values[1] - values[2];
    else if (values.length === 2) answer = values[0] - values[1];
    else throw new Error(`Cannot solve decimal question: ${text}`);
    const options = page.locator('.question-card-options:visible button');
    if (await options.count()) {
        for (const option of await options.all()) {
            if (cents(await option.innerText()) === answer) {
                await option.click();
                return true;
            }
        }
        throw new Error(`No option equals ${decimal(answer)}: ${text}`);
    }
    await page.locator('.question-card:visible input[type=text]').fill(decimal(answer));
    return true;
};
