// Solve from the visible prime tiles and question text.
async function matchPrimes(page) {
    for (let step = 0; step < 20; step++) {
        const tiles = page.getByRole('button', { name: /^\d+, prime tile \d+ of \d+$/ }).filter({ visible: true });
        const labels = await tiles.evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')));
        let found;
        for (let a = 0; a < labels.length; a++) for (let b = a + 1; b < labels.length; b++) {
            const left = labels[a].match(/^(\d+), prime tile \d+ of (\d+)/);
            const right = labels[b].match(/^(\d+), prime tile \d+ of (\d+)/);
            if (left[1] === right[1] && left[2] !== right[2]) found = [labels[a], labels[b]];
        }
        if (!found) {
            const check = page.locator('.lesson-controls button.button--primary:visible');
            if (!await check.isEnabled()) await page.getByLabel('No shared primes', { exact: true }).check();
            return;
        }
        await page.getByRole('button', { name: found[0], exact: true }).click();
        await page.getByRole('button', { name: found[1], exact: true }).click();
    }
    throw new Error('Could not finish matching primes');
}
async function solve(page) {
    const slider = page.getByRole('slider', { name: 'Matched pairs', exact: true });
    if (await slider.isVisible()) {
        await slider.press('End');
    }
    const main = page.locator('.lesson-controls button.button--primary:visible');
    if (await main.isEnabled()) return false;
    const prompt = page.locator('.question-prompt:visible');
    if (!await prompt.count()) return false;
    const text = await prompt.innerText();
    if (text.startsWith('Match all')) { await matchPrimes(page); return true; }
    let answer;
    if (text.includes('Maya')) answer = 'No. The HCF is 2 × 2 × 3 = 12.';
    else if (text.includes('Sam')) answer = 'Take out the 3. HCF = 8';
    else {
        const pair = text.match(/HCF of (\d+) and (\d+)/).slice(1).map(Number);
        let [a, b] = pair;
        while (b) [a, b] = [b, a % b];
        answer = String(a);
    }
    if (await page.locator('.question-card-options:visible button').count()) await page.getByRole('button', { name: answer, exact: true }).click();
    else await page.locator('.question-card:visible input[type=text]').fill(answer);
    return true;
}
solve.matchPrimes = matchPrimes;
module.exports = solve;
