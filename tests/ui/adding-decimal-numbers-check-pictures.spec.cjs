const { test, expect } = require('@playwright/test');
const solve = require('./solvers/adding-decimal-numbers.cjs');
const { MAIN_ACTION, watchForErrors } = require('./helpers.cjs');
const main = page => page.locator(`${MAIN_ACTION}:visible`);
const back = page => page.getByRole('button', { name: 'Previous screen', exact: true });
const feedback = page => page.locator('.question-feedback:visible');
const prompt = page => page.locator('.question-prompt:visible');

// Walk the lesson with the main button and the solver until reached() is true.
async function walkTo(page, reached) {
    for (let step = 0; step < 200; step++) {
        if (await reached()) return;
        if (await solve(page)) continue;
        await expect(main(page)).toBeEnabled();
        await main(page).click();
    }
    throw Error('Did not reach the requested Check question');
}

for (const width of [1280, 375]) {
    test.describe(`adding-decimal-numbers Check pictures ${width}px`, () => {
        test.use({ viewport: { width, height: 1100 }, hasTouch: width === 375 });
        test('each picture shows on its question and still shows after answering and pressing Back', async ({ page }) => {
            test.setTimeout(180_000);
            const errors = watchForErrors(page);
            const noSidewaysScroll = async () => {
                expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
            };
            await page.goto('content/adding-decimal-numbers/', { waitUntil: 'networkidle' });

            // Check 1: Sam's working, right-aligned.
            await walkTo(page, () => page.url().endsWith('#check-1'));
            await expect(prompt(page)).toHaveText('Sam works out 5.8 + 0.34 like this. What has Sam done wrong?');
            const sam = page.locator('.decimal-sam-working');
            await expect(sam).toBeVisible();
            await expect(sam.locator('figcaption')).toHaveText("Sam's working");
            // Each number is written in one go, with equal-width digits, and the
            // three are right-aligned so their last digits line up.
            const numbers = sam.locator('.decimal-sam-working__number');
            await expect(numbers).toHaveText(['5.8', '0.34', '0.92']);
            expect(await numbers.nth(1).evaluate(node => getComputedStyle(node).fontVariantNumeric)).toContain('tabular-nums');
            // Measure the end of each number's last digit and where its point sits.
            const ink = await page.evaluate(() => [...document.querySelectorAll('.decimal-sam-working__number')].map(run => {
                const text = run.firstChild;
                const glyph = index => {
                    const range = document.createRange();
                    range.setStart(text, index);
                    range.setEnd(text, index + 1);
                    return range.getBoundingClientRect();
                };
                return {
                    point: glyph(text.textContent.indexOf('.')).left,
                    lastDigit: glyph(text.textContent.length - 1).right
                };
            }));
            // The 8 sits over the 4, and the 4 of 0.34 over the 2 of 0.92.
            expect(Math.abs(ink[0].lastDigit - ink[1].lastDigit)).toBeLessThan(1);
            expect(Math.abs(ink[1].lastDigit - ink[2].lastDigit)).toBeLessThan(1);
            // The points do not line up: the one in 5.8 sits further right.
            expect(Math.abs(ink[1].point - ink[2].point)).toBeLessThan(1);
            expect(ink[0].point - ink[1].point).toBeGreaterThan(4);
            // The + keeps a small gap before the 0.
            const gap = await page.evaluate(() => {
                const signs = [...document.querySelectorAll('.decimal-sam-working__sign')];
                const runs = [...document.querySelectorAll('.decimal-sam-working__number')];
                const glyph = (node, index) => {
                    const range = document.createRange();
                    range.setStart(node.firstChild, index);
                    range.setEnd(node.firstChild, index + 1);
                    return range.getBoundingClientRect();
                };
                return glyph(runs[1], 0).left - glyph(signs[1], 0).right;
            });
            expect(gap).toBeGreaterThan(1);
            await noSidewaysScroll();
            // The right answer is now lining up the points, and the old label is gone.
            const options = page.locator('.question-card-options:visible button');
            await expect(options).toHaveCount(4);
            const labels = await options.allTextContents();
            expect(labels).toContain('Sam should have lined up the decimal points.');
            expect(labels).not.toContain("The 8 is tenths and the 4 is hundredths, so they don't belong in the same column.");
            await solve(page);
            await main(page).click();
            await expect(feedback(page)).toBeVisible();
            await main(page).click();
            await expect(page).toHaveURL(/#check-2$/);
            await back(page).click();
            await expect(sam).toBeVisible();
            const locked = page.locator('.question-card-options:visible button');
            for (const option of await locked.all()) await expect(option).toBeDisabled();
            await main(page).click();
            await expect(page).toHaveURL(/#check-2$/);

            // Check 3: the lesson's column table with the tenths lit.
            await walkTo(page, () => page.url().endsWith('#check-3'));
            await expect(prompt(page)).toHaveText('The tenths make 6 + 4 = 10. What do you write?');
            const table = page.locator('.decimal-check-table .digit-column-table');
            await expect(table).toHaveCount(1);
            await expect(table.locator('thead th .digit-column-table__heading')).toHaveText(['units', 'point', 'tenths', 'hundredths']);
            const rows = table.locator('tbody tr');
            await expect(rows.nth(0)).toContainText('7.60');
            await expect(rows.nth(1)).toContainText('+0.48');
            await expect(rows.nth(2).locator('td[data-column="hundredths"]')).toHaveText('8');
            for (const column of ['units', 'tenths']) {
                await expect(rows.nth(2).locator(`td[data-column="${column}"]`)).toHaveText('');
            }
            await expect(table.locator('.is-active-column')).toHaveCount(4);
            await expect(rows.nth(1).locator('td[data-column="tenths"]')).toHaveClass(/is-active-column/);
            await noSidewaysScroll();
            await solve(page);
            await main(page).click();
            await expect(feedback(page)).toBeVisible();
            await main(page).click();
            await expect(page).toHaveURL(/#check-4$/);
            await back(page).click();
            await expect(table).toBeVisible();
            await main(page).click();
            await expect(page).toHaveURL(/#check-4$/);

            // Check 4: the receipt, with no total line.
            await expect(prompt(page)).toHaveText('Which working gives the total to pay?');
            const receipt = page.locator('.decimal-check-receipt');
            await expect(receipt).toBeVisible();
            await expect(receipt.locator('svg')).toHaveAttribute('aria-label',
                'Receipt: Sandwich £2.40, Drink £1.35, Voucher minus £0.50.');
            await expect(receipt).toContainText('Sandwich');
            await expect(receipt).toContainText('£2.40');
            await expect(receipt).toContainText('Drink');
            await expect(receipt).toContainText('£1.35');
            await expect(receipt).toContainText('Voucher');
            await expect(receipt).toContainText('−£0.50');
            await expect(receipt).not.toContainText('Total');
            await noSidewaysScroll();
            await solve(page);
            await main(page).click();
            await expect(feedback(page)).toBeVisible();
            await main(page).click();
            await expect(page).toHaveURL(/#summary$/);
            await back(page).click();
            await expect(receipt).toBeVisible();
            expect(errors).toEqual([]);
        });
    });
}
