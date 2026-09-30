const {test, expect} = require('@playwright/test');
const {MAIN_ACTION} = require('./helpers.cjs');
const gated = [
    ['fractions-introduction', 'explanation'],
    ['simplifying-fractions', 'explanation'],
    ['simplifying-expressions', 'explanation'],
    ['function-machines-find-the-input-2', 'interactive'],
    ['solving-linear-equations', 'interactive'],
    ['solving-quadratic-equations', 'interactive']
];
for (const [lesson, section] of gated) {
    test(`${lesson}: an unanswered gated activity keeps one disabled footer action`, async ({page}) => {
        await page.goto(`content/${lesson}/#${section}`, {waitUntil:'networkidle'});
        const main = page.locator(`${MAIN_ACTION}:visible`);
        await expect(main).toHaveCount(1);
        await expect(main).toBeDisabled();
        const before = await page.evaluate(() => window.Maths1to9Lesson.getProgress());
        await main.evaluate(button => button.click());
        const after = await page.evaluate(() => window.Maths1to9Lesson.getProgress());
        expect(after.currentSectionId).toBe(before.currentSectionId);
        expect(after.score).toEqual(before.score);
    });
}
for (const lesson of ['fractions-introduction', 'simplifying-fractions']) {
    test(`${lesson}: the shared footer advances every ready Learn card`, async ({page}) => {
        await page.goto(`content/${lesson}/#explanation`, {waitUntil:'networkidle'});
        const main = page.locator(`${MAIN_ACTION}:visible`);
        const section = page.locator('[data-lesson-section="explanation"]');
        for (let slide = 1; slide <= 4; slide++) {
            await expect(section.locator('[class$="local-nav__label"]')).toHaveText(`${slide} of 5`);
            for (let attempt = 0; attempt < 20 && await main.isDisabled(); attempt++) {
                const choices = section.locator('button:visible:enabled:not([data-learn-next])');
                await expect(choices.first()).toBeVisible();
                const count = await choices.count();
                await choices.nth(attempt % count).click();
            }
            await expect(main).toHaveText('Next idea');
            await expect(main).toBeEnabled();
            await main.click();
        }
        await expect(section.locator('[class$="local-nav__label"]')).toHaveText('5 of 5');
        await expect(main).toHaveText('Continue');
        await expect(main).toBeEnabled();
        await main.click();
        expect(await page.evaluate(() => window.Maths1to9Lesson.getCurrentSection().id)).not.toBe('explanation');
    });
}
test('simplifying-fractions: the shared footer advances Method steps', async ({page}) => {
    await page.goto('content/simplifying-fractions/#method', {waitUntil:'networkidle'});
    const main = page.locator(`${MAIN_ACTION}:visible`);
    for (let step = 1; step < 4; step++) {
        await expect(main).toHaveText('Next step');
        await main.click();
    }
    await expect(main).toHaveText('Continue');
    await expect(main).toBeEnabled();
});
