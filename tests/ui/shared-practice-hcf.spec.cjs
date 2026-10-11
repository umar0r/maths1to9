const { test, expect } = require('@playwright/test');
const { MAIN_ACTION, watchForErrors } = require('./helpers.cjs');

const main = page => page.locator(`${MAIN_ACTION}:visible`);
async function matchPrimes(page) {
    for (let step = 0; step < 10; step++) {
        const tiles = await page.getByRole('button', { name: /^\d+, prime tile \d+ of \d+$/ }).all();
        const labels = await Promise.all(tiles.map(tile => tile.getAttribute('aria-label')));
        const values = labels.map(label => label.match(/^(\d+), prime tile \d+ of (\d+)$/).slice(1));
        let pair;
        for (let a = 0; a < values.length; a++) for (let b = a + 1; b < values.length; b++) {
            if (values[a][0] === values[b][0] && values[a][1] !== values[b][1]) pair = [tiles[a], tiles[b]];
        }
        if (!pair) break;
        await pair[0].click();
        await pair[1].click();
    }
    await expect(main(page)).toHaveText('Done matching');
    await main(page).click();
}
async function hcfQuestion(page, wrong = false) {
    const label = await page.locator('.hcf-venn:visible').getAttribute('aria-label');
    const pair = label.match(/of (\d+) and (\d+)/).slice(1).map(Number);
    let [a, b] = pair;
    while (b) [a, b] = [b, a % b];
    await matchPrimes(page);
    const input = page.getByRole('textbox', { name: 'HCF =', exact: true });
    if (wrong) {
        await input.fill('0');
        await input.press('Enter');
        await expect(main(page)).toHaveText('Try again');
        const assessed = await skillCount(page, 'find-hcf');
        await page.reload({ waitUntil: 'networkidle' });
        await expect(main(page)).toHaveText('Try again');
        await expect.poll(() => skillCount(page, 'find-hcf')).toBe(assessed);
        await main(page).click();
    }
    await input.fill(String(a));
    await input.press('Enter');
    await expect(main(page)).toHaveText('Continue');
    await main(page).click();
    if (wrong) await expect.poll(() => skillCount(page, 'find-hcf')).toBe(1);
}
async function skillCount(page, skill) {
    const record = await page.evaluate(skill => window.Maths1to9Progress.getSkillProgress(skill), skill);
    return record?.assessedQuestions || 0;
}

test('HCF repeat Practice keeps completion, Check, score and session history while adding skill evidence', async ({ page }) => {
    const errors = watchForErrors(page);
    await page.goto('content/highest-common-factor/', { waitUntil: 'networkidle' });
    for (let step = 0; step < 10; step++) {
        if (await main(page).innerText() === 'Continue') break;
        await main(page).click();
    }
    await expect(main(page)).toHaveText('Continue');
    await main(page).click();
    await matchPrimes(page);
    await page.getByRole('button', { name: '30', exact: true }).click();
    await main(page).click();
    await main(page).click();
    await matchPrimes(page);
    await page.getByRole('spinbutton').fill('20');
    await page.getByRole('spinbutton').press('Enter');
    await main(page).click();
    await main(page).click();
    for (let index = 0; index < 5; index++) await hcfQuestion(page, index === 0);
    await main(page).click();
    for (const answer of [/^No\. Both have two 2s/, /^Take out the 3/, /^1$/, /^10$/]) {
        await page.getByRole('button', { name: answer }).click();
        await main(page).click();
        await main(page).click();
    }
    await expect(main(page)).toHaveText('All lessons');
    await main(page).click();
    await expect(page).not.toHaveURL(/\/content\//);
    await page.goto('content/highest-common-factor/#question-bank', { waitUntil: 'networkidle' });
    const before = await page.evaluate(() => window.Maths1to9Lesson.getProgress());
    const evidence = await skillCount(page, 'find-hcf');
    const oldState = await page.evaluate(() => window.Maths1to9Progress.getLessonActivityState('highest-common-factor', 'question-bank'));
    for (let session = 2; session <= 3; session++) {
        await page.getByRole('button', { name: 'Practise again', exact: true }).click();
        await expect(page.getByRole('button', { name: /^Check,/ })).toBeEnabled();
        for (let index = 0; index < 5; index++) {
            await hcfQuestion(page);
            if (index === 0) await page.reload({ waitUntil: 'networkidle' });
        }
        const progress = await page.evaluate(() => window.Maths1to9Lesson.getProgress());
        expect(progress.score).toEqual(before.score);
        expect(progress.finished).toBe(true);
        const saved = await page.evaluate(() => window.Maths1to9Progress.getLessonActivityState('highest-common-factor', 'question-bank'));
        expect(saved.data.session).toBe(session);
        expect(saved.data.seed).not.toBe(oldState.data.seed);
        await expect.poll(() => skillCount(page, 'find-hcf')).toBe(evidence + (session - 1) * 5);
        await expect(page.locator('details')).toHaveCount(session - 1);
        await page.getByRole('button', { name: /^Check,/ }).click();
        await expect(main(page)).toHaveText('All lessons');
        await page.getByRole('button', { name: /^Practice,/ }).click();
    }
    expect(errors).toEqual([]);
});

