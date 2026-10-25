const { test, expect } = require('@playwright/test');
const solve = require('./solvers/adding-decimal-numbers.cjs');
const { MAIN_ACTION, watchForErrors } = require('./helpers.cjs');
const main = page => page.locator(`${MAIN_ACTION}:visible`);
const points = page => page.evaluate(() => window.Maths1to9Lesson.getScore().points);

async function advance(page, target) {
    for (let step = 0; step < 150; step++) {
        if (target && await page.evaluate(id => window.Maths1to9Lesson.getCurrentSection().id === id, target)) return;
        if (await main(page).innerText() === 'All lessons') return;
        if (page.url().endsWith('#learn-6')) {
            await page.screenshot({ path: `/private/tmp/decimal-learn-${page.viewportSize().width}.png`, fullPage: true });
        }
        if (await solve(page)) continue;
        await expect(main(page)).toBeEnabled();
        await main(page).click();
    }
    throw new Error('Decimal addition did not reach the requested screen');
}

test('adding-decimal-numbers: decimal addition journey, scoring and four anchors', async ({ page }) => {
    test.setTimeout(120_000);
    const errors = watchForErrors(page);
    await page.goto('content/adding-decimal-numbers/', { waitUntil: 'networkidle' });
    expect(await points(page)).toBe(0);
    await expect(page.locator('.lesson-navigation__button')).toHaveCount(4);
    await expect(page.locator('.decimal-labels:visible')).toHaveText('tensonestenthshundredths');
    await advance(page, 'interactive');
    const expectedHashes = ['try-it-1', 'try-it-2', 'try-it-3', 'try-it-4', 'try-it-5', 'try-it-6'];
    for (const hash of expectedHashes) {
        await expect(page).toHaveURL(new RegExp(`#${hash}$`));
        if (hash === 'try-it-3' || hash === 'try-it-6') {
            await page.screenshot({ path: `/private/tmp/decimal-columns-${hash}.png`, fullPage: true });
            const digit = page.getByLabel('Hundredths digit', { exact: true });
            await digit.fill('5');
            await page.reload({ waitUntil: 'networkidle' });
            await expect(page.getByLabel('Hundredths digit', { exact: true })).toHaveValue('5');
        }
        await solve(page);
        await main(page).click();
        await expect(main(page)).toHaveText('Continue');
        await main(page).click();
    }
    await expect(page.locator('#adding-decimal-numbers-interactive')).toContainText('10.75');
    await expect(page.locator('#adding-decimal-numbers-interactive')).toContainText('4.85');
    await main(page).click();
    let moneyDraft;
    for (let question = 0; question < 6; question++) {
        await solve(page);
        if (question === 4) {
            const input = page.locator('.question-card:visible input[type=text]');
            moneyDraft = `${await input.inputValue()}0`;
            await input.fill(moneyDraft); // A trailing zero is an equivalent number.
        }
        await main(page).click();
        await main(page).click();
    }
    await expect(page.locator('#lesson-section-question-bank .retained-results > li')).toHaveCount(6);
    await expect(page.locator('#lesson-section-question-bank .retained-results')).toContainText(moneyDraft);
    await main(page).click();
    await expect(page.getByRole('checkbox')).toHaveCount(0); // No self-assessment checkbox.
    await advance(page);
    await expect(main(page)).toHaveText('All lessons');
    expect(await points(page)).toBe(160);
    await page.reload({ waitUntil: 'networkidle' });
    expect(await points(page)).toBe(160);
    await main(page).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto('content/adding-decimal-numbers/', { waitUntil: 'networkidle' });
    await page.locator('.lesson-navigation__button[data-stage-index="2"]').click();
    await expect(page.locator('#lesson-section-question-bank .retained-results > li')).toHaveCount(6);
    expect(await points(page)).toBe(160);
    await expect(main(page)).toHaveCount(1);
    expect(errors).toEqual([]);
});

test('adding-decimal-numbers: mobile keyboard alignment and supported feedback', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 375, height: 844 }, hasTouch: true });
    const page = await context.newPage();
    await page.goto('content/adding-decimal-numbers/', { waitUntil: 'networkidle' });
    await advance(page, 'interactive');
    const before = await points(page);
    const slider = page.locator('input[type=range][aria-label="Move the second number"]:visible');
    await slider.focus();
    await slider.press('Home');
    await main(page).click();
    await expect(page.locator('.question-feedback:visible')).toContainText('decimal points');
    await page.reload({ waitUntil: 'networkidle' });
    await expect(main(page)).toHaveText('Try again');
    await main(page).click();
    await slider.focus();
    await slider.press('ArrowLeft');
    await main(page).click();
    expect(await points(page) - before).toBe(5);
    await page.reload({ waitUntil: 'networkidle' });
    expect(await points(page) - before).toBe(5);
    await main(page).click();
    await solve(page);
    await main(page).click();
    await main(page).click();
    const hundredths = page.locator('.question-card:visible input[aria-label="Hundredths digit"]');
    await hundredths.focus();
    await hundredths.fill('5');
    await hundredths.press('Tab');
    await expect(page.locator('.question-card:visible input[aria-label="Tenths digit"]')).toBeFocused();
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('.question-card:visible input[aria-label="Hundredths digit"]')).toHaveValue('5');
    await solve(page);
    const carry = page.locator('.question-card:visible input[aria-label="Carry to tens"]');
    await carry.focus();
    await carry.press('Tab');
    await expect(main(page)).toBeFocused();
    await main(page).press('Enter');
    await expect(main(page)).toHaveText('Continue');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: '/private/tmp/decimal-addition-mobile.png', fullPage: true });
    await context.close();
});

test('adding-decimal-numbers: final check withholds answers and allows a corrected retry', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('content/adding-decimal-numbers/', { waitUntil: 'networkidle' });
    await advance(page, 'comparison');
    await expect(page.locator('#adding-decimal-numbers-comparison')).not.toContainText('6.14');
    await page.locator('.question-card:visible input[type=text]').fill('1');
    await main(page).click();
    await expect(main(page)).toHaveText('Try again');
    await page.reload({ waitUntil: 'networkidle' });
    await expect(main(page)).toHaveText('Try again');
    await main(page).click();
    await solve(page);
    await main(page).click();
    await main(page).click();
    await advance(page);
    await expect(page.locator('#adding-decimal-numbers-comparison .retained-results > li')).toHaveCount(5);
    await expect(page.locator('#adding-decimal-numbers-comparison .retained-results > li').first()).toContainText('2nd try');
    expect(await points(page)).toBe(155);
    await page.reload({ waitUntil: 'networkidle' });
    expect(await points(page)).toBe(155);
});
