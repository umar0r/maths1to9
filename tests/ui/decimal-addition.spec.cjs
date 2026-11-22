const { test, expect } = require('@playwright/test');
const solve = require('./solvers/adding-decimal-numbers.cjs');
const { MAIN_ACTION, watchForErrors } = require('./helpers.cjs');
const main = page => page.locator(`${MAIN_ACTION}:visible`);
const points = page => page.evaluate(() => window.Maths1to9Lesson.getScore().points);
async function advance(page, target) {
    for (let step = 0; step < 150; step++) {
        if (target && await page.evaluate(id => window.Maths1to9Lesson.getCurrentSection().id === id, target)) return;
        if (await main(page).innerText() === 'All lessons') return;
        if (await solve(page)) continue;
        await expect(main(page)).toBeEnabled();
        await main(page).click();
    }
    throw Error('Decimal lesson did not reach the requested screen');
}

test('adding-decimal-numbers: approved journey earns full marks and keeps four navigation anchors', async ({ page }) => {
    test.setTimeout(120_000);
    const errors = watchForErrors(page);
    await page.goto('content/adding-decimal-numbers/', { waitUntil: 'networkidle' });
    expect(await points(page)).toBe(0);
    await expect(page.locator('.lesson-navigation__button')).toHaveCount(4);
    await expect(page.locator('.decimal-uses svg')).toHaveCount(4);
    await advance(page, 'interactive');
    for (const hash of ['try-it-1', 'try-it-2', 'try-it-2-step-2', 'try-it-3']) {
        await expect(page).toHaveURL(new RegExp(`#${hash}$`));
        await solve(page);
        await main(page).click();
        await expect(main(page)).toHaveText('Continue');
        await main(page).click();
    }
    await expect(page).toHaveURL(/#question-bank-question-1$/);
    await advance(page);
    await expect(page.locator('.decimal-learned li')).toHaveCount(4);
    await expect(page.locator('.retained-results:visible, .score-panel:visible')).toHaveCount(0);
    expect(await points(page)).toBe(240);
    await page.reload({ waitUntil: 'networkidle' });
    expect(await points(page)).toBe(240);
    await main(page).click();
    await expect(page).toHaveURL(/\/$/);
    expect(errors).toEqual([]);
});

test('adding-decimal-numbers: mobile keyboard cards save partial work, retry and Reset replay', async ({ browser }) => {
    test.setTimeout(120_000);
    const context = await browser.newContext({ viewport: { width: 375, height: 844 }, hasTouch: true });
    try {
        const page = await context.newPage();
        await page.goto('content/adding-decimal-numbers/', { waitUntil: 'networkidle' });
        await advance(page, 'interactive');
        const slot = page.getByRole('button', { name: 'Hundredths answer digit', exact: true });
        await slot.focus();
        await slot.press('9');
        await page.reload({ waitUntil: 'networkidle' });
        await expect(slot).toHaveText('9');
        const reset = page.getByRole('button', { name: 'Reset card', exact: true });
        await reset.click();
        await expect(page.locator('.digit-card-slot:visible')).toHaveText(['', '', '']);
        await slot.focus();
        await slot.press('9');
        await slot.press('0');
        await slot.press('8');
        await main(page).click();
        await expect(page.locator('.question-feedback:visible')).toContainText('hundredths');
        await page.reload({ waitUntil: 'networkidle' });
        await expect(main(page)).toHaveText('Try again');
        await main(page).click();
        await solve(page);
        await main(page).click();
        const earned = await points(page);
        await expect(main(page)).toHaveText('Continue');
        await reset.click();
        await solve(page);
        await main(page).click();
        expect(await points(page)).toBe(earned);
        await page.reload({ waitUntil: 'networkidle' });
        await expect(slot).toHaveText('8');
        expect(await points(page)).toBe(earned);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    } finally { await context.close(); }
});

test('adding-decimal-numbers: Check keeps four locked options and saves a corrected retry', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('content/adding-decimal-numbers/', { waitUntil: 'networkidle' });
    await advance(page, 'comparison');
    const wrong = page.getByRole('button', { name: 'The 8 and the 4 are both units.', exact: true });
    await expect(page.locator('.question-card-options:visible button')).toHaveCount(4);
    await expect(page.locator('.question-feedback:visible')).toHaveCount(0);
    await wrong.click();
    await expect(page.locator('.question-feedback:visible')).toHaveCount(0);
    await main(page).click();
    await expect(main(page)).toHaveText('Try again');
    await page.reload({ waitUntil: 'networkidle' });
    await expect(main(page)).toHaveText('Try again');
    await main(page).click();
    await solve(page);
    await main(page).click();
    await main(page).click();
    await page.getByRole('button', { name: 'Previous screen', exact: true }).click();
    await expect(page.locator('.question-card-options:visible button')).toHaveCount(4);
    await expect(page.locator('.question-card-options:visible button:enabled')).toHaveCount(0);
    await expect(page.locator('.question-feedback:visible')).toBeVisible();
    await main(page).click();
    await advance(page);
    await expect(page.locator('.decimal-learned li')).toHaveCount(4);
    expect(await points(page)).toBe(235);
    await page.reload({ waitUntil: 'networkidle' });
    expect(await points(page)).toBe(235);
});
