const { test, expect } = require('@playwright/test');
const solve = require('./solvers/rounding-and-significant-figures.cjs');
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
    test.describe(`rounding-and-significant-figures ${width}px with touch`, () => {
        test.use({ viewport: { width, height: 900 }, hasTouch: true });
        test('new work survives retries, reloads, Back and two more Practice sessions', async ({ page }) => {
            test.setTimeout(180_000);
            const errors = watchForErrors(page);
            await page.goto('content/rounding-and-significant-figures/', { waitUntil: 'networkidle' });
            await expect(prompt(page)).toHaveCount(0);
            await expect(page.getByText('Rounding replaces a number with a nearby, simpler number.', { exact: true })).toBeVisible();
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
                if (await slider.count() && await slider.isEnabled()) {
                    await slider.focus();
                    await slider.press('End');
                    await reload(page);
                    await expect(slider).toHaveValue('70');
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
            expect(earned).toBe(195 - penalty);
            await reload(page); // finished
            expect(await score(page)).toBe(earned);
            await expect(page.locator('#rounding-and-significant-figures-comparison .retained-results')).toContainText('2nd try');
            await goBackAndForward(page);
            await mainAction(page).click();
            await expect(page).toHaveURL(/\/$/);
            expect((await page.request.get(page.url())).ok()).toBe(true);
            await page.goto('content/rounding-and-significant-figures/', { waitUntil: 'networkidle' });
            await page.locator('.lesson-navigation__button[data-stage-index="2"]').click();
            const evidenceBefore = await page.evaluate(() => window.Maths1to9Progress.getSkillProgress('round-decimal-places'));
            for (let session = 0; session < 2; session++) {
                await page.getByRole('button', { name: 'Practise again', exact: true }).click();
                await reload(page);
                await finishQuestions(page);
                expect(await score(page)).toBe(earned);
            }
            await expect(page.getByText('Earlier practice 1', { exact: true })).toBeVisible();
            await expect(page.getByText('Earlier practice 2', { exact: true })).toBeVisible();
            expect(await page.evaluate(() => window.Maths1to9Lesson.getProgress().finished)).toBe(true);
            const evidenceAfter = await page.evaluate(() => window.Maths1to9Progress.getSkillProgress('round-decimal-places'));
            expect(evidenceAfter).not.toEqual(evidenceBefore);
            expect(errors).toEqual([]);
            await page.screenshot({ path: `/private/tmp/rounding-and-significant-figures-${width}.png`, fullPage: true });
        });
    });
}

test('rounding-and-significant-figures: built static lesson finishes and All lessons reaches its homepage', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('dist/content/rounding-and-significant-figures/', { waitUntil: 'networkidle' });
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
    test(`rounding-and-significant-figures ${width}px: slider moves the number and saves the halfway case without losing focus`, async ({ browser }) => {
        const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: true });
        const page = await context.newPage();
        await page.goto('content/rounding-and-significant-figures/', { waitUntil: 'networkidle' });
        await expect(prompt(page)).toHaveCount(0);
        await expect(page.locator('.rounding-marker:visible')).toHaveText('67');
        await expect(page.locator('.significant-equation:visible')).toHaveText('67 ≈ 70');
        await page.screenshot({ path: `/private/tmp/rounding-learn-${width}.png`, fullPage: true });
        await mainAction(page).click();
        await expect(mainAction(page)).toBeDisabled();
        const slider = page.getByRole('slider', { name: 'Number on the line' });
        await slider.focus();
        for (let number = 60; number <= 70; number++) {
            await slider.press(number === 60 ? 'Home' : 'ArrowRight');
            await expect(slider).toBeFocused();
            await expect(slider).toHaveValue(String(number));
            await expect(page.locator('.rounding-marker:visible')).toHaveText(String(number));
            await expect(page.locator('.significant-equation:visible')).toHaveText(`${number} ≈ ${number < 65 ? 60 : 70}`);
            expect(await score(page)).toBe(5);
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
            if (number === 65) {
                await page.screenshot({ path: `/private/tmp/rounding-halfway-${width}.png`, fullPage: true });
                await reload(page);
                await expect(slider).toHaveValue('65');
                await expect(page.locator('.rounding-marker:visible')).toHaveText('65');
                await slider.focus();
            }
        }
        await reload(page);
        await expect(slider).toHaveValue('70');
        expect(await score(page)).toBe(5);
        await expect(mainAction(page)).toBeEnabled();
        await context.close();
    });

    test(`rounding-and-significant-figures ${width}px: consistent digit pictures reveal each answer only after checking`, async ({ browser }) => {
        const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: true });
        const page = await context.newPage();
        await page.goto('content/rounding-and-significant-figures/', { waitUntil: 'networkidle' });
        for (let index = 1; index < 11; index++) {
            await mainAction(page).click();
            if (index === 1) await solve(page);
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
            if ([5, 7, 9].includes(index)) await page.screenshot({ path: `/private/tmp/rounding-learn-${index + 1}-${width}.png`, fullPage: true });
        }
        await mainAction(page).click();
        await expect(page.getByRole('heading', { name: 'Example 1 of 4 · Step 1 of 3', exact: true })).toBeVisible();
        for (let card = 0; card < 12; card++) {
            await expect(page.locator('.significant-equation:visible')).toHaveCount(0);
            await expect(page.locator('.significant-digit.is-keep:visible')).toHaveCount(card % 3 === 0 ? 0 : 1);
            await expect(page.locator('.significant-digit.is-look:visible')).toHaveCount(card % 3 === 2 ? 1 : 0);
            if (card === 11) {
                await expect(prompt(page)).toContainText('Keep the zero at the end after the decimal point.');
                await page.screenshot({ path: `/private/tmp/rounding-guided-zero-${width}.png`, fullPage: true });
                await page.locator('.question-card:visible input[type=text]').fill('10');
                await mainAction(page).click();
                await expect(mainAction(page)).toHaveText('Try again');
                await mainAction(page).click();
            }
            if (card === 2) await page.locator('.question-card:visible input[type=text]').fill('2,700.0');
            else await solve(page);
            await mainAction(page).click();
            await expect(mainAction(page)).toHaveText('Continue');
            if (card % 3 === 2) await expect(page.locator('.significant-equation:visible')).toHaveCount(1);
            await mainAction(page).click();
        }
        await expect(page.getByRole('heading', { name: 'Your completed examples', exact: true })).toBeVisible();
        await expect(page.locator('.significant-digits:visible')).toHaveCount(12);
        await context.close();
    });

    test(`rounding-and-significant-figures ${width}px: bottle answer requires exactly one decimal place`, async ({ browser }) => {
        test.setTimeout(180_000);
        const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: true });
        const page = await context.newPage();
        await page.goto('content/rounding-and-significant-figures/', { waitUntil: 'networkidle' });
        for (let step = 0; step < 150; step++) {
            const section = await page.evaluate(() => window.Maths1to9Lesson.getCurrentSection().id);
            if (section === 'comparison' && await prompt(page).count() && (await prompt(page).innerText()).includes('1.049')) break;
            if (await solve(page)) continue;
            await mainAction(page).click();
        }
        await expect(prompt(page)).toContainText('Keep the zero at the end after the decimal point.');
        for (const wrong of ['1', '1.00']) {
            await page.locator('.question-card:visible input[type=text]').fill(wrong);
            await mainAction(page).click();
            await expect(mainAction(page)).toHaveText('Try again');
            await reload(page);
            await expect(mainAction(page)).toHaveText('Try again');
            await mainAction(page).click();
        }
        await page.locator('.question-card:visible input[type=text]').fill('1.0');
        await mainAction(page).click();
        await expect(mainAction(page)).toHaveText('Continue');
        await reload(page);
        await mainAction(page).click();
        await expect(page.locator('#rounding-and-significant-figures-comparison .retained-results')).toContainText('1.0');
        await expect(page.locator('#rounding-and-significant-figures-comparison .retained-results')).toContainText('2nd try');
        expect(await score(page)).toBe(190);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await context.close();
    });
}
