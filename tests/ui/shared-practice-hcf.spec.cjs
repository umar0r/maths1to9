const { test, expect } = require('@playwright/test');
const solve = require('./solvers/highest-common-factor.cjs');
const { MAIN_ACTION, watchForErrors } = require('./helpers.cjs');
const main = page => page.locator(`${MAIN_ACTION}:visible`);
async function finish(page, stopAtPractice = false) {
    for (let step = 0; step < 150; step++) {
        if (stopAtPractice && await page.getByRole('button', { name: 'Practise again', exact: true }).isVisible()) return;
        if (await main(page).innerText() === 'All lessons') return;
        if (await solve(page)) continue;
        await main(page).click();
    }
    throw new Error('HCF run did not finish');
}
async function skillCount(page) {
    return page.evaluate(async () => (await window.Maths1to9Progress.getSkillProgress('find-hcf'))?.assessedQuestions || 0);
}
for (const width of [1280, 375]) {
    test.describe(`highest-common-factor repeat Practice ${width}px touch`, () => {
        test.use({ viewport: { width, height: 900 }, hasTouch: true });
        test('highest-common-factor: repeat Practice keeps completion, Check, score and session history while adding skill evidence', async ({ page }) => {
            test.setTimeout(180_000);
            const errors = watchForErrors(page);
            await page.goto('content/highest-common-factor/', { waitUntil: 'networkidle' });
            await finish(page);
            await main(page).click();
            await expect(page).not.toHaveURL(/\/content\//);
            await page.goto('content/highest-common-factor/#question-bank', { waitUntil: 'networkidle' });
            const before = await page.evaluate(() => window.Maths1to9Lesson.getProgress());
            const evidence = await skillCount(page);
            const old = await page.evaluate(() => window.Maths1to9Progress.getLessonActivityState('highest-common-factor', 'question-bank'));
            for (let session = 2; session <= 3; session++) {
                await page.getByRole('button', { name: 'Practise again', exact: true }).click();
                await expect(page.getByRole('button', { name: /^Check,/ })).toBeEnabled();
                // A typed retry remains one question's evidence and survives reload.
                if (session === 2) {
                    await solve(page); await main(page).click(); await main(page).click();
                    const input = page.locator('.question-card:visible input[type=text]');
                    await input.fill('0'); await input.press('Enter');
                    await expect(main(page)).toHaveText('Try again');
                    const assessed = await skillCount(page);
                    await page.reload({ waitUntil: 'networkidle' });
                    await expect(main(page)).toHaveText('Try again');
                    expect(await skillCount(page)).toBe(assessed);
                    await main(page).click();
                }
                await finish(page, true);
                await page.reload({ waitUntil: 'networkidle' });
                const progress = await page.evaluate(() => window.Maths1to9Lesson.getProgress());
                expect(progress.score).toEqual(before.score);
                expect(progress.finished).toBe(true);
                const saved = await page.evaluate(() => window.Maths1to9Progress.getLessonActivityState('highest-common-factor', 'question-bank'));
                expect(saved.data.session).toBe(session);
                expect(saved.data.items).not.toEqual(old.data.items);
                await expect.poll(() => skillCount(page)).toBe(evidence + (session - 1) * 6);
                await expect(page.locator('details')).toHaveCount(session - 1);
                await page.getByRole('button', { name: /^Check,/ }).click();
                await expect(main(page)).toHaveText('All lessons');
                await page.getByRole('button', { name: /^Practice,/ }).click();
            }
            expect(errors).toEqual([]);
        });
    });
}
