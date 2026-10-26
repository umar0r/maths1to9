const { test, expect } = require('@playwright/test');
const solve = require('./solvers/lowest-common-multiple.cjs');
const { MAIN_ACTION, watchForErrors } = require('./helpers.cjs');
const main = page => page.locator(`${MAIN_ACTION}:visible`);
const prompt = page => page.locator('.question-prompt:visible');
const score = page => page.evaluate(() => window.Maths1to9Lesson.getScore().points);
async function reload(page) { await page.reload({ waitUntil: 'networkidle' }); await expect(main(page)).toBeVisible(); }
for (const width of [1280, 375]) {
    test.describe(`lowest-common-multiple ${width}px touch`, () => {
        test.use({ viewport: { width, height: 900 }, hasTouch: true });
        test('all feedback, pictures, saved phases, Back and finished work', async ({ page }) => {
            test.setTimeout(180_000);
            const errors = watchForErrors(page);
            await page.goto('content/lowest-common-multiple/', { waitUntil: 'networkidle' });
            await expect(prompt(page)).toHaveCount(0);
            await expect(page.getByText('A multiple is a number in a times table. These lists show multiples of 4 and 6.', { exact: true })).toBeVisible();
            await expect(page.locator('.lcm-tile.is-largest:visible')).toHaveCount(2);
            if (width === 375) {
                const rows = await page.locator('.lcm-factor-row:visible').evaluateAll(rows => rows.map(row => [...row.children].map(child => child.getBoundingClientRect().top)));
                for (const tops of rows) expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(8);
            }
            await main(page).click();
            await main(page).click();
            const slider = page.getByRole('slider', { name: 'Matched pairs', exact: true });
            await slider.focus(); await slider.press('ArrowRight');
            await expect(slider).toBeFocused();
            await expect(page.getByText('Matched pairs: 1 of 3', { exact: true })).toBeVisible();
            await expect(page.locator('.lcm-zone.shared:visible .lcm-tile')).toHaveCount(1);
            await reload(page);
            await expect(slider).toHaveValue('1');
            await expect(page.getByText('Matched pairs: 1 of 3', { exact: true })).toBeVisible();
            await slider.focus(); await slider.press('End');
            await expect(page.locator('.lcm-zone.shared:visible .lcm-tile')).toHaveCount(3);
            await expect(page.getByText('Matched pairs: 3 of 3', { exact: true })).toBeVisible();
            await page.screenshot({ path: `/private/tmp/lcm-learn-${width}.png`, fullPage: true });
            const visited = new Set();
            const testedNumbers = new Set();
            let customTested = false;
            let builderTested = false;
            for (let step = 0; step < 160; step++) {
                expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
                const url = page.url();
                const previous = page.getByRole('button', { name: 'Previous screen', exact: true });
                if (!visited.has(url) && await previous.isVisible()) {
                    visited.add(url);
                    const points = await score(page);
                    await previous.click(); await main(page).click();
                    await expect(page).toHaveURL(url);
                    expect(await score(page)).toBe(points);
                }
                if (await main(page).innerText() === 'All lessons') break;
                if (await prompt(page).count() && await main(page).innerText() === 'Check') {
                    let retried = false;
                    const section = await page.evaluate(() => window.Maths1to9Lesson.getCurrentSection().id);
                    const options = page.locator('.question-card-options:visible button');
                    if (await options.count()) {
                        retried = true;
                        await expect(options).toHaveCount(4);
                        // No solved diagram is given with an unanswered HCF card.
                        await expect(page.locator('.question-card:visible .lcm-zone.shared .lcm-tile')).toHaveCount(0);
                        await solve(page);
                        const right = await page.locator('.question-card-options:visible button.is-selected').innerText();
                        const labels = await options.allTextContents();
                        const feedbacks = new Set();
                        for (const label of labels.filter(label => label !== right)) {
                            await page.getByRole('button', { name: label, exact: true }).click();
                            await reload(page);
                            await main(page).click();
                            await expect(main(page)).toHaveText('Try again');
                            const feedback = await page.locator('.question-feedback:visible').innerText();
                            feedbacks.add(feedback);
                            await reload(page);
                            await expect(page.locator('.question-feedback:visible')).toHaveText(feedback);
                            await main(page).click();
                        }
                        expect(feedbacks.size).toBe(3);
                    } else if ((await prompt(page).innerText()).startsWith('Choose the tiles') && !builderTested) {
                        retried = true;
                        builderTested = true;
                        const tiles = page.locator('.question-card:visible [data-tile-id]');
                        await expect(tiles.locator('xpath=self::*[@aria-pressed="true"]')).toHaveCount(0);
                        await expect(page.locator('.question-card:visible')).not.toContainText('= 60');
                        const overlap = page.locator('.question-card:visible .lcm-zone.shared [data-tile-id]');
                        await overlap.first().press('Space');
                        await reload(page);
                        await expect(tiles.locator('xpath=self::*[@aria-pressed="true"]')).toHaveCount(1);
                        await main(page).click();
                        await expect(page.locator('.question-feedback:visible')).toContainText('overlap');
                        await reload(page);
                        await expect(main(page)).toHaveText('Try again');
                        await main(page).click();
                    } else if (await page.locator('.question-card:visible input[type=text]').count() && !testedNumbers.has(section)) {
                        retried = true;
                        testedNumbers.add(section);
                        await page.locator('.question-card:visible input[type=text]').fill('0');
                        await reload(page);
                        await expect(page.locator('.question-card:visible input[type=text]')).toHaveValue('0');
                        await main(page).click();
                        await expect(main(page)).toHaveText('Try again');
                        await reload(page); await expect(main(page)).toHaveText('Try again');
                        await main(page).click();
                    } else if (await page.locator('.question-card:visible .lcm-venn').count() && !customTested) {
                        retried = true;
                        customTested = true;
                        await expect(page.locator('.lcm-zone.shared:visible .lcm-tile')).toHaveCount(0);
                        // A pupil can try an incomplete match, then correct it.
                        const first = page.getByRole('button', { name: '2, prime tile 1 of 12', exact: true });
                        await first.click();
                        await page.getByRole('button', { name: '3, prime tile 2 of 30', exact: true }).click();
                        const mismatch = 'Those primes are different. Choose the same prime in both rows.';
                        await expect(page.locator('.lcm-tile-message:visible')).toHaveText(mismatch);
                        await reload(page);
                        await expect(page.locator('.lcm-tile-message:visible')).toHaveText(mismatch);
                        await expect(main(page)).toBeDisabled();
                        await first.focus(); await first.press('Space');
                        await expect(first).toHaveAttribute('aria-pressed', 'true');
                        await reload(page);
                        await expect(first).toHaveAttribute('aria-pressed', 'true');
                        await page.getByRole('button', { name: '2, prime tile 1 of 30', exact: true }).click();
                        await expect(page.locator('.lcm-zone.shared:visible .lcm-tile')).toHaveCount(1);
                        await page.screenshot({ path: `/private/tmp/lcm-partial-${width}.png`, fullPage: true });
                        await main(page).click();
                        await expect(main(page)).toHaveText('Try again');
                        await reload(page); await expect(main(page)).toHaveText('Try again');
                        await main(page).click();
                        await solve.matchPrimes(page);
                        await page.getByLabel('No shared primes', { exact: true }).check();
                        await expect(page.locator('.lcm-zone.shared:visible .lcm-tile')).toHaveCount(0);
                        await main(page).click();
                        await expect(page.locator('.question-feedback:visible')).toHaveText('These numbers share prime factors. Match the same primes in both rows.');
                        await main(page).click();
                    }
                    await solve(page);
                    if (await main(page).innerText() === 'Check') await main(page).click();
                    await expect(main(page)).toHaveText('Continue');
                    if (retried) await expect(page.locator('.question-card:visible')).not.toContainText('Right first time');
                    const earned = await score(page);
                    await reload(page);
                    expect(await score(page)).toBe(earned);
                    await expect(main(page)).toHaveText('Continue');
                }
                await main(page).click();
            }
            await expect(main(page)).toHaveText('All lessons');
            await expect(page.locator('#lowest-common-multiple-comparison .retained-results')).toContainText('2nd try');
            const earned = await score(page);
            await reload(page); expect(await score(page)).toBe(earned);
            await page.screenshot({ path: `/private/tmp/lcm-finished-${width}.png`, fullPage: true });
            expect(errors).toEqual([]);
        });
    });
}
for (const width of [1280, 375]) {
    test.describe(`lowest-common-multiple static ${width}px touch`, () => {
        test.use({ viewport: { width, height: 900 }, hasTouch: true });
        test('lowest-common-multiple: static lesson completes and All lessons reaches its homepage', async ({ page }) => {
            test.setTimeout(120_000);
            await page.goto('dist/content/lowest-common-multiple/', { waitUntil: 'networkidle' });
            for (let step = 0; step < 120; step++) {
                if (await main(page).innerText() === 'All lessons') break;
                if (await solve(page)) continue;
                await main(page).click();
            }
            await expect(main(page)).toHaveText('All lessons');
            await main(page).click(); await expect(page).toHaveURL(/\/dist\/$/);
            expect((await page.request.get(page.url())).ok()).toBe(true);
        });
    });
}
