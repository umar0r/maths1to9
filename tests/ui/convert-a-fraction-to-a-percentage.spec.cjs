const { test, expect } = require('@playwright/test');
const solve = require('./solvers/convert-a-fraction-to-a-percentage.cjs');
const { MAIN_ACTION, watchForErrors } = require('./helpers.cjs');

const score = page => page.evaluate(() => window.Maths1to9Lesson.getScore().points);
const mainAction = page => page.locator(`${MAIN_ACTION}:visible`);
const back = page => page.getByRole('button', { name: 'Previous screen', exact: true });
const prompt = page => page.locator('.question-prompt:visible');

async function reload(page) {
    await page.reload({ waitUntil: 'networkidle' });
    await expect(mainAction(page)).toBeVisible();
}

async function goBackAndForward(page) {
    if (!await back(page).isVisible()) return;
    const url = page.url();
    const points = await score(page);
    await back(page).click();
    await expect(mainAction(page)).toBeEnabled();
    await mainAction(page).click();
    await expect(page).toHaveURL(url);
    expect(await score(page)).toBe(points);
}

async function finishQuestions(page) {
    for (let step = 0; step < 100; step++) {
        if (await page.getByRole('button', { name: 'Practise again', exact: true }).isVisible()) return;
        if (await solve(page)) continue;
        await expect(mainAction(page)).toBeEnabled();
        await mainAction(page).click();
    }
    throw new Error('Practice did not finish');
}

for (const width of [1280, 375]) {
    test.describe(`convert-a-fraction-to-a-percentage ${width}px with touch`, () => {
        test.use({ viewport: { width, height: 900 }, hasTouch: true });
        test('new work survives retries, reloads, Back and two more Practice sessions', async ({ page }) => {
            test.setTimeout(180_000);
            const errors = watchForErrors(page);
            await page.goto('content/convert-a-fraction-to-a-percentage/', { waitUntil: 'networkidle' });
            await expect(prompt(page)).toHaveCount(0);
            await expect(page.getByText('A percentage tells you how many parts there are out of 100.', { exact: true })).toBeVisible();
            const tested = new Set();
            let penalty = 0;
            const visited = new Set();
            for (let step = 0; step < 160; step++) {
                const url = page.url();
                if (!visited.has(url)) {
                    await goBackAndForward(page);
                    visited.add(url);
                }
                expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
                const button = mainAction(page);
                if (await button.innerText() === 'All lessons') break;
                const slider = page.locator('input[type=range]:visible');
                for (const control of await slider.all()) {
                    await control.focus();
                    await control.press('End');
                    await reload(page);
                    await expect(page.getByLabel(await control.getAttribute('aria-label'), { exact: true })).toHaveValue(await control.getAttribute('max'));
                }
                if (await prompt(page).count() && await button.innerText() === 'Check') {
                    const section = await page.evaluate(() => window.Maths1to9Lesson.getCurrentSection().id);
                    const options = page.locator('.question-card-options:visible button');
                    const kind = await options.count() ? 'choice' : 'number';
                    const key = `${section}:${kind}`;
                    if (kind === 'choice' || !tested.has(key)) {
                        if (section !== 'interactive') penalty += 5;
                        tested.add(key);
                        await solve(page);
                        if (kind === 'choice') {
                            await expect(options).toHaveCount(4);
                            const rightLabel = await page.locator('.question-card-options:visible button.is-selected').innerText();
                            const labels = await options.allTextContents();
                            const feedbacks = new Set();
                            for (const label of labels.filter(label => label !== rightLabel)) {
                                await page.getByRole('button', { name: label, exact: true }).click();
                                await reload(page); // answering, with the selected wrong option
                                await button.click();
                                await expect(button).toHaveText('Try again');
                                const feedback = await page.locator('.question-feedback:visible').innerText();
                                feedbacks.add(feedback);
                                await reload(page); // wrong
                                await expect(page.locator('.question-feedback:visible')).toHaveText(feedback);
                                await button.click();
                            }
                            expect(feedbacks.size).toBe(3);
                        } else {
                            await page.locator('.question-card:visible input[type=text]').fill('999');
                            await reload(page); // answering, with typed input
                            await expect(page.locator('.question-card:visible input[type=text]')).toHaveValue('999');
                            await button.click();
                            await expect(button).toHaveText('Try again');
                            await reload(page);
                            await expect(button).toHaveText('Try again');
                            await button.click();
                        }
                        await solve(page);
                        await button.click();
                        await expect(button).toHaveText('Continue');
                        const earned = await score(page);
                        await reload(page); // correct after a retry
                        expect(await score(page)).toBe(earned);
                        await expect(button).toHaveText('Continue');
                        await expect(page.locator('.question-card:visible')).not.toContainText('Right first time');
                        await button.click();
                        continue;
                    }
                    await solve(page);
                }
                await expect(button).toBeEnabled();
                await button.click();
            }
            await expect(mainAction(page)).toHaveText('All lessons');
            const earned = await score(page);
            expect(penalty).toBe(35);
            expect(earned).toBe(140 - penalty);
            await reload(page); // finished
            expect(await score(page)).toBe(earned);
            await expect(page.locator('#convert-a-fraction-to-a-percentage-comparison .retained-results')).toContainText('2nd try');
            await goBackAndForward(page);
            await mainAction(page).click();
            await expect(page).toHaveURL(/\/$/);
            expect((await page.request.get(page.url())).ok()).toBe(true);
            await page.goto('content/convert-a-fraction-to-a-percentage/', { waitUntil: 'networkidle' });
            await page.locator('.lesson-navigation__button[data-stage-index="2"]').click();
            const evidenceBefore = await page.evaluate(() => window.Maths1to9Progress.getSkillProgress('fraction-percentage-conversion'));
            for (let session = 0; session < 2; session++) {
                await page.getByRole('button', { name: 'Practise again', exact: true }).click();
                await reload(page);
                await finishQuestions(page);
                expect(await score(page)).toBe(earned);
            }
            await expect(page.getByText('Earlier practice 1', { exact: true })).toBeVisible();
            await expect(page.getByText('Earlier practice 2', { exact: true })).toBeVisible();
            expect(await page.evaluate(() => window.Maths1to9Lesson.getProgress().finished)).toBe(true);
            const evidenceAfter = await page.evaluate(() => window.Maths1to9Progress.getSkillProgress('fraction-percentage-conversion'));
            expect(evidenceAfter).not.toEqual(evidenceBefore);
            expect(errors).toEqual([]);
            await page.screenshot({ path: `/private/tmp/convert-a-fraction-to-a-percentage-${width}.png`, fullPage: true });
        });
    });
}

test('convert-a-fraction-to-a-percentage: built static lesson finishes and All lessons reaches its homepage', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('dist/content/convert-a-fraction-to-a-percentage/', { waitUntil: 'networkidle' });
    for (let step = 0; step < 100; step++) {
        if (await mainAction(page).innerText() === 'All lessons') break;
        if (await solve(page)) continue;
        await mainAction(page).click();
    }
    await expect(mainAction(page)).toHaveText('All lessons');
    const expected = new URL('../../', page.url()).href;
    await mainAction(page).click();
    await expect(page).toHaveURL(expected);
    expect((await page.request.get(expected)).ok()).toBe(true);
});

for (const width of [1280, 375]) {
    test(`convert-a-fraction-to-a-percentage ${width}px: worked fractions and answers appear at the right time`, async ({ browser }) => {
        const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: true });
        const page = await context.newPage();
        await page.goto('content/convert-a-fraction-to-a-percentage/', { waitUntil: 'networkidle' });
        await expect(page.locator('.percentage-grid:visible span')).toHaveCount(100);
        await expect(page.locator('.percentage-grid:visible .is-shaded')).toHaveCount(25);
        await page.screenshot({ path: `/private/tmp/fraction-percentage-grid-${width}.png`, fullPage: true });
        await expect(page.locator('.fraction-equation:visible')).toContainText('25%');
        await mainAction(page).click();
        await expect(page.getByText('The numerator is the top number. The denominator is the bottom number.', { exact: true })).toBeVisible();
        await expect(page.locator('.fraction-equation:visible').last()).toHaveText('5 ÷ 16 = 0.3125');
        await mainAction(page).click();
        await expect(page.locator('.fraction-equation:visible').last()).toContainText('31.25%');
        await expect(page.locator('.fraction-equation:visible').first()).toHaveText('0.3125 × 100 = 31.25');
        await page.screenshot({ path: `/private/tmp/fraction-percentage-learn-${width}.png`, fullPage: true });
        await mainAction(page).click();
        await expect(page.locator('.fraction-equation:visible')).not.toContainText('0.375');
        await solve(page);
        await mainAction(page).click();
        await expect(page.locator('.fraction-equation:visible')).toContainText('0.375');
        await mainAction(page).click();
        await expect(page.locator('.fraction-equation:visible')).not.toContainText('37.5%');
        await solve(page);
        await mainAction(page).click();
        await expect(page.locator('.fraction-equation:visible')).toContainText('37.5%');
        await page.screenshot({ path: `/private/tmp/fraction-percentage-try-${width}.png`, fullPage: true });
        await context.close();
    });
}
