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

async function lineGeometry(page) {
    return page.evaluate(() => {
        const line = [...document.querySelectorAll('.rounding-tryit .rounding-line')].find(node => node.getClientRects().length);
        return { base: Number(line.dataset.base), step: Number(line.dataset.step), edge: Number(line.dataset.edge) };
    });
}

// Where a value sits across a 660-wide line, as a point on the page.
async function pointOnLine(page, value) {
    const box = await page.locator('.rounding-tryit .rounding-line svg').first().boundingBox();
    const { base, step, edge } = await lineGeometry(page);
    return { x: box.x + (edge + (value - base) / (10 * step) * (660 - 2 * edge)) / 660 * box.width, y: box.y + box.height / 2 };
}

async function tapLine(page, value) {
    const point = await pointOnLine(page, value);
    await page.mouse.click(point.x, point.y);
    await page.waitForTimeout(150);
}

for (const width of [1280, 375]) {
    test.describe(`rounding-and-significant-figures Try it ${width}px with touch`, () => {
        test.use({ viewport: { width, height: 900 }, hasTouch: true });

        test('two hands-on slides: tap the digit and the line, then the minibuses', async ({ page }) => {
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
            await expect(page.locator('.rounding-tryit .significant-digit.is-keep')).toContainText('Keep');
            await expect(page.locator('.rounding-tryit .significant-digit.is-keep > span').first()).toHaveText('4');
            await expect(page.locator('.rounding-tryit .significant-digit.is-look')).toContainText('Look');
            await expect(page.locator('.rounding-tryit .significant-digit.is-look > span').first()).toHaveText('8');
            await expect(page.getByText('Tap where 53,481 goes on the line.', { exact: true })).toBeVisible();

            // Step 2: any tap away from 53,481 does nothing at all.
            await tapLine(page, 53405);
            await expect(page.locator('.rounding-tryit .rounding-dot')).toHaveCount(0);
            await expect(page.locator('.significant-equation:visible')).toHaveCount(0);
            await expect(mainAction(page)).toBeDisabled();

            // Reload keeps the step exactly as it was left.
            await reloadToSlide(page, SLIDE_A);
            await expect(page.locator('.rounding-tryit .significant-digit.is-keep')).toHaveCount(1);
            await expect(page.locator('.rounding-tryit .rounding-line')).toHaveCount(1);
            await expect(page.locator('.rounding-tryit .rounding-dot')).toHaveCount(0);

            // A tap within reach of the number puts the dot on the line, and it rounds.
            await tapLine(page, 53481);
            await expect(page.locator('.rounding-tryit .rounding-dot')).toHaveCount(1);
            await expect(page.locator('.rounding-tryit .rounding-value--above')).toHaveText('53,481');
            await expect(page.getByText('The next digit is 8. That is 5 or more, so round up.', { exact: true })).toBeVisible();
            await expect(page.getByText('So 53,481 is closer to 53,500.', { exact: true })).toBeVisible();
            await expect(page.locator('.significant-equation:visible')).toHaveText('53,481 ≈ 53,500');
            // The step's instruction goes once there is nothing left to do, so no
            // arrow has a line of words to cross at phone width.
            await expect(page.getByText('Tap where 53,481 goes on the line.', { exact: true })).toHaveCount(0);
            await expect(mainAction(page)).toBeEnabled();
            await noSidewaysScroll(page);
            const afterSlideA = await score(page);
            await reloadToSlide(page, SLIDE_A);
            await expect(page.locator('.rounding-tryit .rounding-dot')).toHaveCount(1);
            expect(await score(page)).toBe(afterSlideA);

            // Back then forward keeps the finished slide.
            await mainAction(page).click();
            await expect(heading(page)).toHaveText(SLIDE_B);
            await back(page).click();
            await expect(heading(page)).toHaveText(SLIDE_A);
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
    // The bottle question is typed, so its answer is known exactly.
    for (let step = 0; step < 400; step++) {
        if (await prompt(page).count() && (await prompt(page).innerText()).includes('1.049')) break;
        if (await solve(page)) continue;
        await mainAction(page).click();
    }
    await expect(prompt(page)).toContainText('1.049');
    await page.locator('.question-card:visible input[type=text]').fill('1');
    await mainAction(page).click();
    await expect(mainAction(page)).toHaveText('Try again');
    await reload(page);
    await goToStage(page, 'Check');
    await expect(mainAction(page)).toHaveText('Try again');
    await mainAction(page).click();
    await page.locator('.question-card:visible input[type=text]').fill('1.0');
    await mainAction(page).click();
    await expect(mainAction(page)).toHaveText('Continue');
    await mainAction(page).click();
    await expect(page.locator('#rounding-and-significant-figures-comparison .retained-results')).toContainText('1.0');
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
