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
            // Only digits take a column. Each number is right-aligned in three.
            const numbers = sam.locator('.decimal-sam-working__digits');
            await expect(numbers.nth(0).locator('.decimal-sam-working__digit')).toHaveText(['', '5', '8']);
            await expect(numbers.nth(1).locator('.decimal-sam-working__digit')).toHaveText(['0', '3', '4']);
            await expect(numbers.nth(2).locator('.decimal-sam-working__digit')).toHaveText(['0', '9', '2']);
            const digit = (row, column) => numbers.nth(row).locator('.decimal-sam-working__digit').nth(column);
            // The 5 sits exactly over the 3, and the 8 exactly over the 4.
            const five = await digit(0, 1).boundingBox();
            const three = await digit(1, 1).boundingBox();
            expect(Math.abs(five.x - three.x)).toBeLessThan(1);
            const eight = await digit(0, 2).boundingBox();
            const four = await digit(1, 2).boundingBox();
            expect(Math.abs(eight.x - four.x)).toBeLessThan(1);
            // The smaller row leaves its first column empty.
            const short = await numbers.nth(0).boundingBox();
            expect(Math.abs(short.width - (await numbers.nth(1).boundingBox()).width)).toBeLessThan(1);
            // A point is a small dot between its own digits, so 5.8's is one column
            // right of the points in 0.34 and 0.92, which line up with each other.
            const points = sam.locator('.decimal-sam-working__point');
            await expect(points).toHaveCount(3);
            const shortPoint = await points.nth(0).boundingBox();
            const longPoint = await points.nth(1).boundingBox();
            const answerPoint = await points.nth(2).boundingBox();
            expect(Math.abs(shortPoint.x - longPoint.x)).toBeGreaterThan(10);
            expect(Math.abs(longPoint.x - answerPoint.x)).toBeLessThan(1);
            expect(shortPoint.width).toBeLessThan(6);
            expect(Math.abs((shortPoint.x + shortPoint.width / 2) - (eight.x + eight.width / 2))).toBeGreaterThan(4);
            await noSidewaysScroll();
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
