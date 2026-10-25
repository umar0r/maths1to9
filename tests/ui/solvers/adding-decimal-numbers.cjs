// Read the addition and fill the shared cards and lesson-owned column widgets.
const cents = text => {
    const [whole, decimal = ''] = text.split('.');
    return Number(whole) * 100 + Number(decimal.padEnd(2, '0'));
};
const decimal = total => `${Math.floor(total / 100)}.${String(total % 100).padStart(2, '0')}`;

module.exports = async function solve(page) {
    const main = page.locator('.lesson-controls button.button--primary:visible');
    if (await main.isEnabled()) return false;
    const prompt = page.locator('.question-prompt:visible');
    if (!await prompt.count()) return false;
    const text = await prompt.innerText();
    const slider = page.locator('input[type=range][aria-label="Move the second number"]:visible');
    if (await slider.isVisible()) {
        await slider.focus();
        await slider.press('Home');
        await slider.press('ArrowRight');
        return true;
    }
    if (text.startsWith('What digit')) {
        await page.locator('.question-card:visible input[type=text]').fill('0');
        return true;
    }
    if (text.startsWith('Where should')) {
        await page.getByRole('button', { name: 'Directly below the decimal points in the two numbers.', exact: true }).click();
        return true;
    }
    if (text.startsWith('A student lines up')) {
        await page.getByRole('button', { name: 'Line up the decimal points. The 8 is tenths and the 4 is hundredths.', exact: true }).click();
        return true;
    }
    const numbers = text.replace(/£/g, '').match(/\d+(?:\.\d+)?/g);
    if (!numbers || numbers.length < 2) throw new Error(`Cannot solve decimal addition: ${text}`);
    const [a, b] = numbers;
    const total = cents(a) + cents(b);
    const columns = page.locator('.question-card:visible input[aria-label="Hundredths digit"]');
    if (await columns.isVisible()) {
        for (const [index, name] of ['Hundredths', 'Tenths', 'Ones', 'Tens'].entries()) {
            const input = page.locator(`.question-card:visible input[aria-label="${name} digit"]`);
            if (await input.count()) await input.fill(String(Math.floor(total / 10 ** index) % 10));
        }
        const carry = page.locator('.question-card:visible input[aria-label="Carry to tens"]');
        if (await carry.count()) {
            const incoming = Math.floor((cents(a) % 100 + cents(b) % 100) / 100);
            await carry.fill(String(Math.floor((Math.floor(cents(a) / 100) % 10 + Math.floor(cents(b) / 100) % 10 + incoming) / 10)));
        }
    } else if (await page.locator('.question-card-options:visible button').count()) {
        await page.getByRole('button', { name: `${text.includes('£') ? '£' : ''}${decimal(total)}`, exact: true }).click();
    } else await page.locator('.question-card:visible input[type=text]').fill(decimal(total));
    return true;
};
