const {test, expect} = require('@playwright/test');
const {MAIN_ACTION} = require('./helpers.cjs');

for (const lesson of ['algebraic-expressions', 'fractions-introduction', 'simplifying-fractions']) {
    for (const retry of [false, true]) {
        test(`${lesson}: ten-question practice has a fixed maximum and finishes${retry ? ' after a retry' : ''}`, async ({page}) => {
            const solve = require(`./solvers/${lesson}.cjs`);
            await page.goto(`content/${lesson}/#question-bank`, {waitUntil:'networkidle'});
            const maximum = await page.evaluate(() => window.Maths1to9Lesson.getScore().maximumPoints);
            const reserved = await page.evaluate(() => window.Maths1to9Lesson.getProgress().scoreActivities.filter(a => a.kind === 'answer'));
            expect(reserved).toHaveLength(10);
            expect(reserved.every(a=>!a.completed)).toBe(true);
            const start = page.locator('[data-start]');
            if (await start.count()) await start.click();
            const main = page.locator(`${MAIN_ACTION}:visible`);
            for (let n = 1; n <= 10; n++) {
                await expect(page.locator('[data-lesson-section="question-bank"] .question-number')).toContainText(`Question ${n} of 10`);
                await solve(page, {});
                if (retry && n === 10) {
                    await page.locator('[data-lesson-section="question-bank"] label').filter({has:page.locator('input[type="radio"]:not(:checked)')}).first().click();
                    await main.click();
                    await expect(main).toHaveText('Try again');
                    await main.click();
                    await solve(page, {});
                }
                await expect(main).toHaveText('Check answer');
                await main.click();
                await expect(main).toHaveText(n === 10 ? 'Finish lesson' : 'Next question');
                expect(await page.evaluate(() => window.Maths1to9Lesson.getScore().maximumPoints)).toBe(maximum);
                if (n < 10) await main.click();
            }
            const answers = await page.evaluate(() => window.Maths1to9Lesson.getProgress().scoreActivities.filter(a=>a.kind==='answer'));
            expect(answers).toHaveLength(10);
            expect(answers.every(a=>a.completed && a.correct)).toBe(true);
            expect(answers.filter(a=>a.firstCorrect)).toHaveLength(retry ? 9 : 10);
            await main.click();
            await expect(page.getByRole('link', {name:'Back to all lessons', exact:true})).toBeVisible();
            expect(await page.evaluate(() => window.Maths1to9Lesson.getProgress().finished)).toBe(true);
            expect(await page.evaluate(() => window.Maths1to9Lesson.getScore().answerPoints)).toBe(retry ? 95 : 100);
            await page.getByRole('link', {name:'Back to all lessons', exact:true}).click();
            await expect(page).not.toHaveURL(/\/content\//);
            await page.goto(`content/${lesson}/#question-bank`, {waitUntil:'networkidle'});
            expect(await page.evaluate(() => window.Maths1to9Lesson.getScore().maximumPoints)).toBe(maximum);
            expect(await page.evaluate(() => window.Maths1to9Lesson.getScore().answerPoints)).toBe(retry ? 95 : 100);
        });
    }
}

for (const lesson of ['fractions-introduction', 'simplifying-fractions']) {
    test(`${lesson}: stopping and restarting does not add score slots`, async ({page}) => {
        const solve = require(`./solvers/${lesson}.cjs`);
        await page.goto(`content/${lesson}/#question-bank`, {waitUntil:'networkidle'});
        const maximum = await page.evaluate(() => window.Maths1to9Lesson.getScore().maximumPoints);
        for (let run = 0; run < 2; run++) {
            await page.locator('[data-start]').click();
            await solve(page, {});
            await page.locator(`${MAIN_ACTION}:visible`).click();
            await expect(page.locator(`${MAIN_ACTION}:visible`)).toHaveText('Next question');
            expect(await page.evaluate(() => window.Maths1to9Lesson.getScore().maximumPoints)).toBe(maximum);
            expect(await page.evaluate(() => window.Maths1to9Lesson.getScore().answered)).toBe(1);
            await page.locator('[data-stop]').click();
        }
    });
}
