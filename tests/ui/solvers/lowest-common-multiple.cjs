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
async function chooseTiles(page) {
    const buttons = page.getByRole('button', { name: /^\d+, (left|shared|right) tile \d+ for the LCM$/ }).filter({ visible: true });
    const unselected = buttons.locator('xpath=self::*[@aria-pressed="false"]');
    const count = await unselected.count();
    for (let index = count - 1; index >= 0; index--) await unselected.nth(index).click();
    return count > 0;
}
async function solve(page) {
    const slider = page.getByRole('slider', { name: 'Matched pairs', exact: true });
    if (await slider.isVisible()) await slider.press('End');
    const main = page.locator('.lesson-controls button.button--primary:visible');
    if (await main.innerText() !== 'Check') return false;
    const prompt = page.locator('.question-prompt:visible');
    if (!await prompt.count()) return false;
    const text = await prompt.innerText();
    if (text.startsWith('Choose the tiles') && await main.innerText() === 'Check') return chooseTiles(page);
    if (await main.isEnabled()) return false;
    if (text.startsWith('Match all')) { await matchPrimes(page); return true; }
    const pair = text.match(/LCM of (\d+) and (\d+)/)?.slice(1).map(Number)
        || [...text.matchAll(/\b(\d+) =/g)].slice(0, 2).map(match => Number(match[1]));
    let [a, b] = pair;
    while (b) [a, b] = [b, a % b];
    const answer = pair[0] * pair[1] / a;
    const options = page.locator('.question-card-options:visible button');
    if (await options.count()) {
        const labels = await options.allTextContents();
        const correct = labels.findIndex(label => Number(label.match(/= (\d+)\.?$/)?.[1] || label) === answer);
        if (correct < 0) throw new Error(`No visible LCM choice matches ${answer}: ${labels.join(', ')}`);
        await options.nth(correct).click();
    } else await page.locator('.question-card:visible input[type=text]').fill(String(answer));
    return true;
}
solve.matchPrimes = matchPrimes;
solve.chooseTiles = chooseTiles;
module.exports = solve;
