const factors = number => {
    const result = [];
    for (let divisor = 2; divisor <= number; divisor++) while (number % divisor === 0) {
        result.push(divisor);
        number /= divisor;
    }
    return result;
};
const indexForm = primes => [...new Set(primes)].map(prime => {
    const count = primes.filter(value => value === prime).length;
    return `${prime}${count > 1 ? [...String(count)].map(digit => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(digit)]).join('') : ''}`;
}).join(' × ');
async function solve(page, memory = {}) {
    const explorer = page.getByRole('slider', { name: 'Tree splits', exact: true });
    if (await explorer.isVisible()) await explorer.press('End');
    const ends = page.locator('#lesson-section-explanation .prime-tree-tap:not(:disabled):visible');
    if (await ends.count()) { await ends.first().click(); return true; }
    const main = page.locator('.lesson-controls button.button--primary:visible');
    const action = await main.innerText();
    if (action === 'All lessons') {
        const home = new URL('../../', page.url()).pathname;
        await main.click();
        if (new URL(page.url()).pathname !== home) (memory.problems ??= []).push('All lessons did not reach the homepage');
        return true;
    }
    if (action !== 'Check') return false;
    const prompt = await page.locator('.question-prompt:visible').innerText();
    if (prompt.startsWith('Build a complete')) {
        let worked = false;
        const card = page.locator('.question-card:visible');
        const first = card.getByLabel('First factor', { exact: true });
        while (await first.isVisible()) {
            const text = await card.locator('.prime-split-panel p').innerText();
            const number = Number(text.match(/Split (\d+)/)[1]);
            const divisor = factors(number)[0];
            await first.fill(String(divisor));
            await card.getByLabel('Second factor', { exact: true }).fill(String(number / divisor));
            worked = true;
        }
        return worked;
    }
    if (prompt.startsWith('Write ')) {
        const number = Number(prompt.match(/Write (\d+)/)[1]);
        const primes = factors(number);
        const distinct = [...new Set(primes)];
        const expected = distinct.map(prime => [String(prime), String(primes.filter(value => value === prime).length)]);
        const card = page.locator('.question-card:visible');
        const rows = card.locator('.prime-count-row');
        if (await rows.count() === expected.length) {
            const actual = await rows.locator('input').evaluateAll(inputs => inputs.map(input => input.value));
            if (JSON.stringify(actual) === JSON.stringify(expected.flat())) return false;
        }
        while (await rows.count() < expected.length) await card.getByRole('button', { name: 'Add a prime', exact: true }).click();
        for (let index = 0; index < expected.length; index++) {
            await card.getByLabel(`Prime in row ${index + 1}`, { exact: true }).fill(expected[index][0]);
            await card.getByLabel(`Count in row ${index + 1}`, { exact: true }).fill(expected[index][1]);
        }
        return true;
    }
    if (await main.isEnabled()) return false;
    let answer;
    if (prompt.includes('What does 3² mean')) answer = '3 × 3';
    else if (prompt.startsWith('Amir writes')) answer = 'No. 9 is not prime, so split it into 3 × 3.';
    else {
        const number = Number(prompt.match(/(?:for|writes|prime:|^)(?: )?(\d+)/)?.[1] || prompt.match(/^(\d+) =/)?.[1]);
        const primes = factors(number);
        if (prompt.startsWith('Find the missing')) answer = String(primes.at(-1));
        else if (prompt.includes('small power')) {
            const prime = Number(prompt.match(/power on (\d+)/)[1]);
            answer = String(primes.filter(value => value === prime).length);
        } else answer = prompt.includes('index form') ? indexForm(primes) : primes.join(' × ');
    }
    const options = page.locator('.question-card-options:visible button');
    if (await options.count()) await options.filter({ hasText: new RegExp(`^${answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }).click();
    else await page.locator('.question-card:visible input[type=text]').fill(answer);
    return true;
}
module.exports = solve;
