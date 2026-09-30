const {test, expect} = require('@playwright/test');
const {MAIN_ACTION} = require('./helpers.cjs');

for (const base of ['content', 'dist/content']) {
    for (const lesson of ['place-value', 'order-of-operations']) {
        test(`${base}/${lesson}: completion keeps a working All lessons footer`, async ({page}) => {
            const solve = require(`./solvers/${lesson}.cjs`);
            await page.goto(`${base}/${lesson}/#comparison`, {waitUntil:'networkidle'});
            const main = page.locator(`${MAIN_ACTION}:visible`);
            const destination = await page.locator('.site-header__back').getAttribute('href');
            const expectedUrl = new URL(destination, page.url()).href;
            for (let step = 0; step < 80; step++) {
                if (await page.evaluate(() => window.Maths1to9Lesson.getProgress().finished)) break;
                if (await solve(page, {})) continue;
                await expect(main).toBeEnabled();
                await main.click();
            }
            expect(await page.evaluate(() => window.Maths1to9Lesson.getProgress().finished)).toBe(true);
            await expect(main).toHaveCount(1);
            await expect(main).toHaveText('All lessons');
            await expect(main).toBeEnabled();
            const score = await page.evaluate(() => window.Maths1to9Lesson.getScore());
            const expectedAnswers = lesson === 'order-of-operations' ? 15 : 5;
            expect(score.answered).toBe(expectedAnswers);
            expect(score.answerPoints).toBe(expectedAnswers * 10);
            await main.click();
            await expect(page).toHaveURL(expectedUrl);
            expect((await page.request.get(expectedUrl)).ok()).toBe(true);
        });
    }
}

test('completion overrides stale actions and remains available when reviewing earlier sections', async ({page}) => {
    await page.goto('content/place-value/#comparison', {waitUntil:'networkidle'});
    await page.evaluate(() => {
        const api = window.Maths1to9Lesson;
        api.setSectionAction('comparison', {label:'Old action', disabled:true, onClick:()=>{throw new Error('Stale action ran');}});
        api.completeLesson();
    });
    const main = page.locator(`${MAIN_ACTION}:visible`);
    await expect(main).toHaveText('All lessons');
    await expect(main).toBeEnabled();
    const score = await page.evaluate(() => window.Maths1to9Lesson.getScore());
    await page.evaluate(() => window.Maths1to9Lesson.goToSection('explanation'));
    await expect(main).toHaveText('All lessons');
    expect(await page.evaluate(() => window.Maths1to9Lesson.getScore())).toEqual(score);
    await main.click();
    await expect(page).not.toHaveURL(/\/content\//);
});
