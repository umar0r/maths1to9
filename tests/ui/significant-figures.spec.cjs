const { test, expect } = require('@playwright/test');
const solve = require('./solvers/significant-figures.cjs');
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
    test.describe(`significant-figures ${width}px with touch`, () => {
        test.use({ viewport: { width, height: 900 }, hasTouch: true });
        test('new work survives retries, reloads, Back and two more Practice sessions', async ({ page }) => {
            test.setTimeout(180_000);
            const errors = watchForErrors(page);
            await page.goto('content/significant-figures/', { waitUntil: 'networkidle' });
            await expect(prompt(page)).toHaveCount(0);
            await expect(page.getByText('Significant figures are the digits that show how accurate a number is.', { exact: true })).toBeVisible();
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
            expect(earned).toBe(190 - penalty);
            await reload(page); // finished
            expect(await score(page)).toBe(earned);
            await expect(page.locator('#significant-figures-comparison .retained-results')).toContainText('2nd try');
            await goBackAndForward(page);
            await mainAction(page).click();
            await expect(page).toHaveURL(/\/$/);
            expect((await page.request.get(page.url())).ok()).toBe(true);
            await page.goto('content/significant-figures/', { waitUntil: 'networkidle' });
            await page.locator('.lesson-navigation__button[data-stage-index="2"]').click();
            const evidenceBefore = await page.evaluate(() => window.Maths1to9Progress.getSkillProgress('round-significant-figures'));
            for (let session = 0; session < 2; session++) {
                await page.getByRole('button', { name: 'Practise again', exact: true }).click();
                await reload(page);
                await finishQuestions(page);
                expect(await score(page)).toBe(earned);
            }
            await expect(page.getByText('Earlier practice 1', { exact: true })).toBeVisible();
            await expect(page.getByText('Earlier practice 2', { exact: true })).toBeVisible();
            expect(await page.evaluate(() => window.Maths1to9Lesson.getProgress().finished)).toBe(true);
            const evidenceAfter = await page.evaluate(() => window.Maths1to9Progress.getSkillProgress('round-significant-figures'));
            expect(evidenceAfter).not.toEqual(evidenceBefore);
            expect(errors).toEqual([]);
            await page.screenshot({ path: `/private/tmp/significant-figures-${width}.png`, fullPage: true });
        });
    });
}

test('significant-figures: built static lesson finishes and All lessons reaches its homepage', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('dist/content/significant-figures/', { waitUntil: 'networkidle' });
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
    test(`significant-figures ${width}px: highlights teach first and guided answers stay hidden`, async ({ browser }) => {
        const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: true });
        const page = await context.newPage();
        await page.goto('content/significant-figures/', { waitUntil: 'networkidle' });
        await expect(prompt(page)).toHaveCount(0);
        await expect(page.locator('.significant-digit.is-first:visible')).toContainText('2');
        await expect(page.locator('.significant-digit.is-look:visible')).toHaveCount(0);
        await page.screenshot({ path: `/private/tmp/significant-learn-${width}.png`, fullPage: true });
        for (let index = 1; index < 9; index++) {
            await mainAction(page).click();
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
            if (index === 5 || index === 6 || index === 8) await page.screenshot({ path: `/private/tmp/significant-learn-${index + 1}-${width}.png`, fullPage: true });
        }
        await mainAction(page).click();
        await expect(page.getByRole('heading', { name: 'Example 1 of 4 · Step 1 of 3', exact: true })).toBeVisible();
        await expect(page.locator('.significant-digit.is-keep:visible')).toHaveCount(0);
        await expect(page.locator('.significant-digit.is-look:visible')).toHaveCount(0);
        await expect(page.locator('.question-card-options:visible button')).toHaveCount(4);
        await solve(page);
        await mainAction(page).click();
        await expect(page.locator('.significant-digit.is-keep:visible')).toContainText('2');
        await expect(page.locator('.significant-digit.is-look:visible')).toHaveCount(0);
        await mainAction(page).click();
        await expect(page.locator('.significant-digit.is-look:visible')).toHaveCount(0);
        await solve(page);
        await mainAction(page).click();
        await expect(page.locator('.significant-digit.is-look:visible')).toContainText('8');
        await mainAction(page).click();
        await expect(page.locator('.significant-equation:visible')).toHaveCount(0);
        await page.screenshot({ path: `/private/tmp/significant-try-${width}.png`, fullPage: true });
        await solve(page);
        await mainAction(page).click();
        await expect(page.locator('.significant-equation:visible')).toHaveText('0.0283 ≈ 0.03');
        await mainAction(page).click();
        for (let card = 0; card < 9; card++) {
            await expect(page.locator('.significant-equation:visible')).toHaveCount(0);
            await expect(page.locator('.significant-digit.is-keep:visible')).toHaveCount(card % 3 === 0 ? 0 : 1);
            await expect(page.locator('.significant-digit.is-look:visible')).toHaveCount(card % 3 === 2 ? 1 : 0);
            if (card === 5 || card === 8) await page.screenshot({ path: `/private/tmp/significant-guided-${card}-${width}.png`, fullPage: true });
            if (card === 8) {
                await expect(page.getByRole('heading', { name: 'Example 4 of 4 · Step 3 of 3', exact: true })).toBeVisible();
                await expect(prompt(page)).toContainText('Keep the zero at the end after the decimal point.');
                await page.locator('.question-card:visible input[type=text]').fill('15');
                await mainAction(page).click();
                await expect(mainAction(page)).toHaveText('Try again');
                await mainAction(page).click();
            }
            await solve(page);
            await mainAction(page).click();
            await expect(mainAction(page)).toHaveText('Continue');
            await mainAction(page).click();
        }
        await expect(page.getByRole('heading', { name: 'Your completed examples', exact: true })).toBeVisible();
        await context.close();
    });

    test(`significant-figures ${width}px: typed answers keep exactly the required decimal zero`, async ({ browser }) => {
        test.setTimeout(180_000);
        const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: true });
        const page = await context.newPage();
        await page.goto('content/significant-figures/', { waitUntil: 'networkidle' });
        for (let step = 0; step < 150; step++) {
            const section = await page.evaluate(() => window.Maths1to9Lesson.getCurrentSection().id);
            if (section === 'comparison' && await prompt(page).count() && (await prompt(page).innerText()).includes('15.03')) break;
            if (await solve(page)) continue;
            await mainAction(page).click();
        }
        await expect(prompt(page)).toContainText('Keep the zero at the end after the decimal point.');
        for (const wrong of ['15', '15.00']) {
            await page.locator('.question-card:visible input[type=text]').fill(wrong);
            await mainAction(page).click();
            await expect(mainAction(page)).toHaveText('Try again');
            await reload(page);
            await expect(mainAction(page)).toHaveText('Try again');
            await mainAction(page).click();
        }
        await page.locator('.question-card:visible input[type=text]').fill('15.0');
        await mainAction(page).click();
        await expect(mainAction(page)).toHaveText('Continue');
        await reload(page);
        await mainAction(page).click();
        await expect(page.locator('#significant-figures-comparison .retained-results')).toContainText('15.0');
        await expect(page.locator('#significant-figures-comparison .retained-results')).toContainText('2nd try');
        expect(await score(page)).toBe(185);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({ path: `/private/tmp/significant-summary-${width}.png`, fullPage: true });
        await context.close();
    });
}
