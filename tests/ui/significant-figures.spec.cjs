const { test, expect } = require('@playwright/test');
const solve = require('./solvers/significant-figures.cjs');
const { MAIN_ACTION, watchForErrors, checkThenMoveOn, goToStage } = require('./helpers.cjs');

const score = page => page.evaluate(() => window.Maths1to9Lesson.getScore().points);
const maximum = page => page.evaluate(() => window.Maths1to9Lesson.getScore().maximumPoints);
const mainAction = page => page.locator(`${MAIN_ACTION}:visible`);
const back = page => page.getByRole('button', { name: 'Previous screen', exact: true });
const prompt = page => page.locator('.question-prompt:visible');
const tapTarget = page => page.locator('.significant-digits[role=group]:visible, .rounding-end:visible');

async function reload(page) {
    await page.reload({ waitUntil: 'networkidle' });
    await expect(mainAction(page)).toBeVisible();
}

async function goBackAndForward(page) {
    if (!await back(page).isEnabled()) return;
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
            for (let step = 0; step < 220; step++) {
                const url = page.url();
                if (!visited.has(url)) {
                    await goBackAndForward(page);
                    visited.add(url);
                }
                expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
                const button = mainAction(page);
                if (await button.innerText() === 'All lessons') break;
                if (await tapTarget(page).count()) {
                    await solve(page);
                    if (await button.isEnabled()) await button.click();
                    continue;
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
                            const kept = page.locator('.question-card:visible input[type=text]');
                            await expect(kept).toHaveValue('999');
                            await expect(kept).toHaveAttribute('aria-invalid', 'true');
                            await expect(kept).toBeFocused();
                        }
                        await solve(page);
                        await button.click();
                        if (section === 'interactive') {
                            // Try it goes straight on after a right answer.
                            await expect(page).not.toHaveURL(url);
                            const earned = await score(page);
                            await reload(page);
                            expect(await score(page)).toBe(earned);
                            continue;
                        }
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
            expect(penalty).toBe(55);
            expect(earned).toBe(await maximum(page) - penalty);
            await reload(page); // finished
            expect(await score(page)).toBe(earned);
            await expect(page.locator('#significant-figures-comparison .retained-results')).toContainText('2nd try');
            await goBackAndForward(page);
            await mainAction(page).click();
            await expect(page).toHaveURL(/\/$/);
            expect((await page.request.get(page.url())).ok()).toBe(true);
            await page.goto('content/significant-figures/', { waitUntil: 'networkidle' });
            await goToStage(page, 'Practice');
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
    for (let step = 0; step < 200; step++) {
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
        // 15 screens of its own, then the 7 moved from the Rounding lesson, which ask for a tap.
        for (let screen = 0; screen < 22; screen++) {
            if (await tapTarget(page).count()) await solve(page);
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
            if (screen === 5 || screen === 6 || screen === 8) await page.screenshot({ path: `/private/tmp/significant-learn-${screen + 1}-${width}.png`, fullPage: true });
            await mainAction(page).click();
        }
        await expect(page.getByRole('heading', { name: 'Example 1 of 12 · Step 1 of 3', exact: true })).toBeVisible();
        await expect(page.locator('.significant-digit.is-keep:visible')).toHaveCount(0);
        await expect(page.locator('.significant-digit.is-look:visible')).toHaveCount(0);
        await expect(page.locator('.question-card-options:visible button')).toHaveCount(4);
        await solve(page);
        await checkThenMoveOn(page, async () => {
            await expect(page.locator('.significant-digit.is-keep:visible')).toContainText('2');
            await expect(page.locator('.significant-digit.is-look:visible')).toHaveCount(0);
        });
        await expect(page.locator('.significant-digit.is-look:visible')).toHaveCount(0);
        await solve(page);
        await checkThenMoveOn(page, () => expect(page.locator('.significant-digit.is-look:visible')).toContainText('8'));
        await expect(page.locator('.significant-equation:visible')).toHaveCount(0);
        await page.screenshot({ path: `/private/tmp/significant-try-${width}.png`, fullPage: true });
        await solve(page);
        await checkThenMoveOn(page, () => expect(page.locator('.significant-equation:visible')).toHaveText('0.0283 ≈ 0.03'));
        // The rest of the four guided examples: three steps each.
        for (let card = 0; card < 9; card++) {
            await expect(page.locator('.significant-equation:visible')).toHaveCount(0);
            await expect(page.locator('.significant-digit.is-keep:visible')).toHaveCount(card % 3 === 0 ? 0 : 1);
            await expect(page.locator('.significant-digit.is-look:visible')).toHaveCount(card % 3 === 2 ? 1 : 0);
            if (card === 5 || card === 8) await page.screenshot({ path: `/private/tmp/significant-guided-${card}-${width}.png`, fullPage: true });
            if (card === 8) {
                await expect(page.getByRole('heading', { name: 'Example 4 of 12 · Step 3 of 3', exact: true })).toBeVisible();
                await expect(prompt(page)).toContainText('Keep the zero at the end after the decimal point.');
                await page.locator('.question-card:visible input[type=text]').fill('15');
                await mainAction(page).click();
                await expect(mainAction(page)).toHaveText('Try again');
                await mainAction(page).click();
            }
            await solve(page);
            await checkThenMoveOn(page);
        }
        // Then the one-step examples moved from the Rounding lesson: the digits appear
        // only after the answer, and the counting question has no digit picture at all.
        for (let example = 5; example <= 12; example++) {
            await expect(page.getByRole('heading', { name: `Example ${example} of 12 · Step 1 of 1`, exact: true })).toBeVisible();
            await expect(page.locator('.significant-digit:visible')).toHaveCount(0);
            if (example === 6) await page.screenshot({ path: `/private/tmp/significant-moved-${width}.png`, fullPage: true });
            await solve(page);
            if (example === 10) {
                await checkThenMoveOn(page);
                continue;
            }
            await checkThenMoveOn(page, () => expect(page.locator('.significant-digit.is-keep:visible')).toHaveCount(1));
        }
        // No completed-examples page: the last example goes straight on to Practice.
        await expect.poll(() => page.evaluate(() => window.Maths1to9Lesson.getCurrentSection().id)).toBe('question-bank');
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
        // The three checks moved from Rounding come after 15.03.
        for (let step = 0; step < 20 && !await page.locator('#significant-figures-comparison .retained-results:visible').count(); step++) {
            if (await solve(page)) continue;
            await mainAction(page).click();
        }
        await expect(page.locator('#significant-figures-comparison .retained-results')).toContainText('15.0');
        await expect(page.locator('#significant-figures-comparison .retained-results')).toContainText('2nd try');
        expect(await score(page)).toBe(await maximum(page) - 5);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({ path: `/private/tmp/significant-summary-${width}.png`, fullPage: true });
        await context.close();
    });
}
