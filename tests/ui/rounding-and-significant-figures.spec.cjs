const { test, expect } = require('@playwright/test');
const solve = require('./solvers/rounding-and-significant-figures.cjs');
const { MAIN_ACTION, watchForErrors, goToStage } = require('./helpers.cjs');

const score = page => page.evaluate(() => window.Maths1to9Lesson.getScore().points);
const maximum = page => page.evaluate(() => window.Maths1to9Lesson.getScore().maximumPoints);
const mainAction = page => page.locator(`${MAIN_ACTION}:visible`);
const back = page => page.getByRole('button', { name: 'Previous screen', exact: true });
const heading = page => page.locator('[data-screen-heading]:visible');
const prompt = page => page.locator('.question-prompt:visible');

const SLIDE_A = 'Round 53,481 to the nearest 100.';
const SLIDE_LINE = "Let's put 53,481 on a number line.";
const SLIDE_B = 'When you need enough of something, round up.';

async function reload(page) {
    await page.waitForTimeout(250); // let the saved state write itself
    await page.reload({ waitUntil: 'networkidle' });
    await expect(mainAction(page)).toBeVisible();
}

// A reload opens the lesson at its first section, so come back to Try it the
// way a pupil would and check the slide is exactly as it was left.
async function reloadToSlide(page, title) {
    await reload(page);
    const stage = page.getByRole('button', { name: /^Try it,/ });
    if (await stage.isVisible()) await stage.click();
    else await page.evaluate(() => { location.hash = 'try-it'; });
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
}

async function noSidewaysScroll(page) {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

async function reachSlide(page, title) {
    for (let step = 0; step < 90; step++) {
        if (await page.getByRole('heading', { name: title, exact: true }).isVisible()) return;
        if (await solve(page)) continue;
        await mainAction(page).click();
    }
    throw new Error(`never reached "${title}"`);
}

for (const width of [1280, 375]) {
    test.describe(`rounding-and-significant-figures Try it ${width}px with touch`, () => {
        test.use({ viewport: { width, height: 900 }, hasTouch: true });

        test('three hands-on slides: tap the digit, then the half of the line, then the minibuses', async ({ page }) => {
            test.setTimeout(180_000);
            const errors = watchForErrors(page);
            await page.goto('content/rounding-and-significant-figures/', { waitUntil: 'networkidle' });
            await reachSlide(page, SLIDE_A);

            // Slide A, step 1: five digit cards in one row, with no commas.
            await expect(heading(page)).toHaveText(SLIDE_A);
            await expect(page.locator('.rounding-tryit .significant-digit')).toHaveCount(5);
            await expect(page.locator('.rounding-tryit .significant-comma')).toHaveCount(0);
            const first = await page.locator('.rounding-tryit .significant-digit').first().boundingBox();
            const last = await page.locator('.rounding-tryit .significant-digit').last().boundingBox();
            expect(Math.abs(first.y - last.y)).toBeLessThan(2);
            await expect(page.getByText('Tap the hundreds digit.', { exact: true })).toBeVisible();
            await expect(mainAction(page)).toHaveText('Next');
            await expect(mainAction(page)).toBeDisabled();
            await noSidewaysScroll(page);

            // A wrong tap only shows the hint.
            await page.locator('.rounding-tryit .significant-digit').nth(0).click();
            await expect(page.locator('.question-feedback:visible')).toHaveText('The hundreds digit is the third from the right.');
            await expect(page.locator('.rounding-tryit .significant-digit.is-keep')).toHaveCount(0);
            await expect(page.locator('.rounding-tryit .rounding-line')).toHaveCount(0);
            await expect(mainAction(page)).toBeDisabled();

            // The right tap labels the digit to keep and the digit to look at.
            await page.locator('.rounding-tryit .significant-digit').nth(2).click();
            await expect(page.locator('.rounding-tryit .significant-digit.is-keep')).toContainText('Round');
            await expect(page.locator('.rounding-tryit .significant-digit.is-keep > span').first()).toHaveText('4');
            await expect(page.locator('.rounding-tryit .significant-digit.is-look')).toContainText('Decides');
            await expect(page.locator('.rounding-tryit .significant-digit.is-look > span').first()).toHaveText('8');
            // One thing per slide: two notes explain Round and Decides, and there is no line yet.
            await expect(page.getByText('Round: the 4 is the hundreds digit. This is the digit we round.', { exact: true })).toBeVisible();
            await expect(page.getByText('Decides: the 8 is 5 or more, so the 4 rounds up to 5.', { exact: true })).toBeVisible();
            await expect(page.locator('.rounding-tryit .rounding-line')).toHaveCount(0);
            await expect(mainAction(page)).toBeEnabled();
            await reloadToSlide(page, SLIDE_A);
            await expect(page.locator('.rounding-tryit .significant-digit.is-keep')).toHaveCount(1);
            await mainAction(page).click();

            // The line slide: the wrong half gives a hint and no dot.
            await expect(heading(page)).toHaveText(SLIDE_LINE);
            await expect(page.getByText('Tap which half of the line 53,481 goes on?', { exact: true })).toBeVisible();
            await expect(mainAction(page)).toBeDisabled();
            await page.locator('.rounding-tryit .rounding-half-button[data-half="lower"]').click();
            await expect(page.locator('.rounding-tryit .rounding-dot')).toHaveCount(0);
            await expect(page.getByText('The halfway point is 53,450. 53,481 is more than that.', { exact: true })).toBeVisible();
            await expect(page.locator('.significant-equation:visible')).toHaveCount(0);
            await expect(mainAction(page)).toBeDisabled();
            await reloadToSlide(page, SLIDE_LINE);
            await expect(page.locator('.rounding-tryit .rounding-dot')).toHaveCount(0);

            // The right half puts the dot on the line, and it rounds.
            await page.locator('.rounding-tryit .rounding-half-button[data-half="upper"]').click();
            await expect(page.locator('.rounding-tryit .rounding-half-button')).toHaveCount(0);
            await expect(page.locator('.rounding-tryit .rounding-dot')).toHaveCount(1);
            await expect(page.locator('.rounding-tryit .rounding-value--above')).toHaveText('53,481');
            await expect(page.getByText('The next digit is 8. That is 5 or more, so round up.', { exact: true })).toBeVisible();
            await expect(page.getByText('So 53,481 is closer to 53,500.', { exact: true })).toBeVisible();
            await expect(page.locator('.significant-equation:visible')).toHaveText('53,481 ≈ 53,500');
            // The instruction goes once there is nothing left to do, so no
            // arrow has a line of words to cross at phone width.
            await expect(page.getByText('Tap which half of the line 53,481 goes on?', { exact: true })).toHaveCount(0);
            await expect(mainAction(page)).toBeEnabled();
            await noSidewaysScroll(page);
            const afterLine = await score(page);
            await reloadToSlide(page, SLIDE_LINE);
            await expect(page.locator('.rounding-tryit .rounding-dot')).toHaveCount(1);
            expect(await score(page)).toBe(afterLine);

            // Back then forward keeps the finished slide.
            await mainAction(page).click();
            await expect(heading(page)).toHaveText(SLIDE_B);
            await back(page).click();
            await expect(heading(page)).toHaveText(SLIDE_LINE);
            await expect(page.locator('.significant-equation:visible')).toHaveText('53,481 ≈ 53,500');
            await mainAction(page).click();

            // Slide B: the minibuses. A wrong tap gives the hint; 9 is right.
            await expect(heading(page)).toHaveText(SLIDE_B);
            await expect(page.getByText('How many minibuses do you need?', { exact: true })).toBeVisible();
            await expect(mainAction(page)).toHaveText('Continue');
            await expect(mainAction(page)).toBeDisabled();
            await page.locator('.rounding-end[data-end="8"]:visible').click();
            await expect(page.locator('.question-feedback:visible')).toHaveText('8 minibuses seat 8 × 16 = 128 pupils. That leaves 3 pupils with no seat.');
            await expect(mainAction(page)).toBeDisabled();
            await page.locator('.rounding-end[data-end="9"]:visible').click();
            await expect(page.getByText('9 minibuses', { exact: true })).toBeVisible();
            await expect(page.getByText('8.1875 would normally round to 8. Here you round up, because 8 minibuses are not enough.', { exact: true })).toBeVisible();
            await noSidewaysScroll(page);
            await reloadToSlide(page, SLIDE_B);
            await expect(page.getByText('9 minibuses', { exact: true })).toBeVisible();
            await expect(mainAction(page)).toBeEnabled();
            await mainAction(page).click();

            // The last slide goes straight on to Practice, with no summary page.
            await expect.poll(() => page.evaluate(() => window.Maths1to9Lesson.getCurrentSection().id)).toBe('question-bank');
            expect(errors).toEqual([]);
        });
    });
}

test('rounding-and-significant-figures: the whole lesson can be finished with a perfect score', async ({ page }) => {
    test.setTimeout(420_000);
    const errors = watchForErrors(page);
    await page.goto('content/rounding-and-significant-figures/', { waitUntil: 'networkidle' });
    for (let step = 0; step < 400; step++) {
        if (await mainAction(page).innerText() === 'All lessons') break;
        if (await solve(page)) continue;
        await expect(mainAction(page)).toBeEnabled();
        await mainAction(page).click();
    }
    await expect(mainAction(page)).toHaveText('All lessons');
    await noSidewaysScroll(page);
    expect(await score(page)).toBe(await maximum(page));
    // The final button reaches the homepage.
    const expected = new URL('../../', page.url()).href;
    await mainAction(page).click();
    await expect(page).toHaveURL(expected);
    expect((await page.request.get(expected)).ok()).toBe(true);
    expect(errors).toEqual([]);
});

test('rounding-and-significant-figures: a retried Check answer is kept and marked as a second try', async ({ page }) => {
    test.setTimeout(420_000);
    await page.goto('content/rounding-and-significant-figures/', { waitUntil: 'networkidle' });
    // The nearest-million question is the last Check card: get it wrong first.
    for (let step = 0; step < 400; step++) {
        if (await prompt(page).count() && (await prompt(page).innerText()).includes('2,681,450')) break;
        if (await solve(page)) continue;
        await mainAction(page).click();
    }
    await expect(prompt(page)).toContainText('2,681,450');
    const options = page.locator('.question-card-options:visible button');
    await options.filter({ hasNotText: /^3,000,000$/ }).first().click();
    await mainAction(page).click();
    await expect(mainAction(page)).toHaveText('Try again');
    await reload(page);
    await goToStage(page, 'Check');
    await expect(mainAction(page)).toHaveText('Try again');
    await mainAction(page).click();
    await page.getByRole('button', { name: '3,000,000', exact: true }).click();
    await mainAction(page).click();
    await expect(mainAction(page)).toHaveText('Continue');
    await mainAction(page).click();
    await expect(page.locator('#rounding-and-significant-figures-comparison .retained-results')).toContainText('3,000,000');
    await expect(page.locator('#rounding-and-significant-figures-comparison .retained-results')).toContainText('2nd try');
    expect(await score(page)).toBe(await maximum(page) - 5);
});

test('rounding-and-significant-figures: built static lesson finishes and All lessons reaches its homepage', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto('dist/content/rounding-and-significant-figures/', { waitUntil: 'networkidle' });
    for (let step = 0; step < 400; step++) {
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
