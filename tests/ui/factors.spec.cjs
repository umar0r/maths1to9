const { test, expect } = require('@playwright/test');
const solve = require('./solvers/factors.cjs');
const { MAIN_ACTION, watchForErrors } = require('./helpers.cjs');
const main = page => page.locator(`${MAIN_ACTION}:visible`);
const prompt = page => page.locator('.question-prompt:visible');
const score = page => page.evaluate(() => window.Maths1to9Lesson.getScore().points);
async function reload(page) { await page.reload({ waitUntil: 'networkidle' }); await expect(main(page)).toBeVisible(); }
for (const width of [1280, 375]) {
    test.describe(`factors ${width}px touch`, () => {
        test.use({ viewport: { width, height: 900 }, hasTouch: true });
        test('all feedback, pictures, saved phases, Back and finished work', async ({ page }) => {
            test.setTimeout(180_000);
            const errors = watchForErrors(page);
            await page.goto('content/factors/', { waitUntil: 'networkidle' });
            await expect(prompt(page)).toHaveCount(0);
            await expect(page.getByText('A factor divides a number exactly, with nothing left over.', { exact: true })).toBeVisible();
            await expect(page.locator('.factors-board:visible circle')).toHaveCount(12);
            await main(page).click();
            const slider = page.getByRole('slider', { name: 'Rows to explore', exact: true });
            await slider.focus(); await slider.press('ArrowRight');
            await expect(slider).toBeFocused();
            await expect(page.getByText('Rows: 4', { exact: true })).toBeVisible();
            await expect(page.locator('.factors-board:visible svg')).toHaveAttribute('aria-label', '24 counters in 4 rows of 6, with 0 left over');
            await reload(page);
            await expect(slider).toHaveValue('4');
            await expect(page.getByText('Rows: 4', { exact: true })).toBeVisible();
            await slider.focus(); await slider.press('End');
            await expect(page.locator('.factors-board:visible svg')).toHaveAttribute('aria-label', '24 counters in 6 rows of 4, with 0 left over');
            await expect(page.getByText('Rows: 6', { exact: true })).toBeVisible();
            await page.screenshot({ path: `/private/tmp/factors-learn-${width}.png`, fullPage: true });
            const visited = new Set();
            const testedNumbers = new Set();
            let customTested = false;
            let builderTested = false;
            for (let step = 0; step < 160; step++) {
                expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
                const animation = await page.locator('.factors-tile:visible').evaluateAll(tiles => tiles.map(tile => {
                    const style = getComputedStyle(tile);
                    return { transform: style.transform, duration: parseFloat(style.animationDuration), delay: parseFloat(style.animationDelay) };
                }));
                for (const tile of animation) {
                    expect(tile.transform).toBe('none');
                    expect(tile.duration + tile.delay).toBeLessThanOrEqual(.5);
                }
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
                        // No factor-pair solution is given with an unanswered card.
                        await expect(page.locator('.question-card:visible .factors-rainbow')).toHaveCount(0);
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
                    } else if (await page.locator('.question-card:visible input[type=text]').count() && !testedNumbers.has(section)) {
                        retried = true;
                        testedNumbers.add(section);
                        await page.locator('.question-card:visible input[type=text]').fill('-999');
                        await reload(page);
                        await expect(page.locator('.question-card:visible input[type=text]')).toHaveValue('-999');
                        await main(page).click();
                        await expect(main(page)).toHaveText('Try again');
                        await reload(page); await expect(main(page)).toHaveText('Try again');
                        await main(page).click();
                    } else if (await page.locator('.question-card:visible input[type=range]').count() && !customTested) {
                        retried = true;
                        customTested = true;
                        const rows = page.getByRole('slider', { name: 'Number of rows', exact: true });
                        await expect(page.locator('.question-card:visible svg')).toHaveAttribute('aria-label', '24 counters');
                        await rows.focus();
                        const before = await rows.boundingBox();
                        await rows.press('End'); await rows.press('ArrowLeft');
                        await expect(rows).toBeFocused();
                        await expect(rows).toHaveValue('5');
                        const after = await rows.boundingBox();
                        expect(Math.abs(before.y - after.y)).toBeLessThan(1);
                        await expect(page.locator('.question-card:visible .factors-leftover')).toHaveCount(4);
                        await reload(page);
                        await expect(rows).toHaveValue('5');
                        await expect(page.locator('.question-card:visible .factors-leftover')).toHaveCount(4);
                        await page.screenshot({ path: `/private/tmp/factors-partial-${width}.png`, fullPage: true });
                        await main(page).click();
                        await expect(main(page)).toHaveText('Try again');
                        await expect(page.locator('.question-feedback:visible')).toContainText('5 rows leave 4 counters over');
                        await reload(page); await expect(main(page)).toHaveText('Try again');
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
            await expect(page.locator('#factors-comparison .retained-results')).toContainText('2nd try');
            const earned = await score(page);
            await reload(page); expect(await score(page)).toBe(earned);
            await page.screenshot({ path: `/private/tmp/factors-finished-${width}.png`, fullPage: true });
            expect(errors).toEqual([]);
        });
    });
}
for (const width of [1280, 375]) {
    test.describe(`factors static ${width}px touch`, () => {
        test.use({ viewport: { width, height: 900 }, hasTouch: true });
        test('factors: static lesson completes and All lessons reaches its homepage', async ({ page }) => {
            test.setTimeout(120_000);
            await page.goto('dist/content/factors/', { waitUntil: 'networkidle' });
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

for (const reducedMotion of ['no-preference', 'reduce']) {
    test.describe('factors tile entrance ' + reducedMotion, () => {
        test.use({ viewport: { width: 375, height: 900 }, hasTouch: true, reducedMotion });
        test('tiles fade briefly in place, with no animation for reduced motion', async ({ page }) => {
            await page.goto('content/factors/', { waitUntil: 'networkidle' });
            async function checkTiles() {
                const styles = await page.locator('.factors-tile:visible').evaluateAll(tiles => tiles.map(tile => {
                    const style = getComputedStyle(tile);
                    return { name: style.animationName, duration: parseFloat(style.animationDuration),
                        transform: style.transform, frames: tile.getAnimations().flatMap(animation => animation.effect.getKeyframes()) };
                }));
                expect(styles.length).toBeGreaterThan(0);
                for (const style of styles) {
                    expect(style.transform).toBe('none');
                    expect(style.duration).toBeLessThanOrEqual(.5);
                    if (reducedMotion === 'reduce') expect(style.name).toBe('none');
                    for (const frame of style.frames) expect(frame.transform || 'none').toBe('none');
                }
            }
            await checkTiles();
            await page.screenshot({ path: `/private/tmp/factors-first-${reducedMotion}-375.png`, fullPage: true });
            for (let screen = 0; screen < 3; screen++) {
                await main(page).click();
                const slider = page.getByRole('slider', { name: 'Rows to explore', exact: true });
                if (await slider.isVisible()) await slider.press('End');
                await checkTiles();
            }
        });
    });
}
