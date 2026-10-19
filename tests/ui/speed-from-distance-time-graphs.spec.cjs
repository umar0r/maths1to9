const { test, expect } = require('@playwright/test');
const { MAIN_ACTION, watchForErrors } = require('./helpers.cjs');
const slug = 'speed-from-distance-time-graphs';
const main = page => page.locator(`${MAIN_ACTION}:visible`).first();
const board = page => page.locator('.maths-graph__board:visible').first();
const back = page => page.getByRole('button', { name: 'Previous screen', exact: true });
async function ready(page) {
    await page.waitForFunction(() => window.Maths1to9Lesson && window.SpeedJourneys?.checks);
    await main(page).waitFor();
}
async function state(page, key) {
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    return page.evaluate(async ({ slug, key }) => (await Maths1to9Progress.getLessonActivityState(slug, key))?.data, { slug, key });
}
async function reload(page) {
    const hash = new URL(page.url()).hash, label = await main(page).textContent();
    await page.reload(); await ready(page);
    await expect(page).toHaveURL(new RegExp(`${hash}$`)); await expect(main(page)).toHaveText(label);
}
async function pixels(page, positions) {
    await board(page).scrollIntoViewIfNeeded();
    return board(page).evaluate((element, positions) => {
        const b = Object.values(JXG.boards).find(b => b.containerObj === element), r = element.getBoundingClientRect();
        return positions.map(([x, y]) => ({ x: r.left + b.origin.scrCoords[1] + x * b.unitX,
            y: r.top + b.origin.scrCoords[2] - y * b.unitY }));
    }, positions);
}
async function tap(page, position, touch) {
    const [p] = await pixels(page, [position]);
    if (touch) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
}
async function drag(page, from, to, touch) {
    const [a, b] = await pixels(page, [from, to]);
    if (touch) {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [a] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [b] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach();
    } else {
        await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 8 }); await page.mouse.up();
    }
}
async function capture(page, name) {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (process.env.SPEED_REVIEW_OUTPUT) await page.evaluate(() => window.scrollTo(0, 0));
    if (process.env.SPEED_REVIEW_OUTPUT) await page.screenshot({ path: `${process.env.SPEED_REVIEW_OUTPUT}/${page.viewportSize().width}-${name}.png`, fullPage: true });
}
async function answer(page, definition, order) {
    if (definition.input === 'choice') {
        const correct = definition.options.findIndex(option => option.correct);
        await page.locator('.question-card-options:visible button').nth(order ? order.indexOf(correct) : correct).click();
    } else {
        const inputs = page.locator('.question-card input:visible');
        for (const [i, field] of (definition.fields || [{ id: null }]).entries()) await inputs.nth(i).fill(field.id ? definition.answer[field.id] : definition.answer);
    }
    await main(page).click(); await expect(main(page)).toHaveText('Continue');
}
async function solvePractice(page, wrong = false) {
    const saved = await state(page, 'question-bank');
    const q = await page.evaluate(item => SpeedJourneys.generate(item, Maths1to9LessonEngine.seededRandom(item.seed)), saved.items[saved.screen]);
    if (wrong) {
        if (q.input === 'number') {
            const inputs = page.locator('.question-card input:visible'); for (const input of await inputs.all()) await input.fill('99');
        } else await page.locator('.question-card-options:visible button').nth(q.options.findIndex(option => !option.correct)).click();
        await reload(page); await main(page).click(); await expect(main(page)).toHaveText('Try again'); await reload(page); await main(page).click();
    }
    await answer(page, q); await reload(page); await main(page).click();
}

for (const mode of [{ name: 'desktop', width: 1280, touch: false }, { name: 'phone', width: 375, touch: false }, { name: 'touch', width: 375, touch: true }]) {
    test.describe(mode.name, () => {
        test.use({ viewport: { width: mode.width, height: 1000 }, hasTouch: mode.touch });
        for (const site of ['', '/dist']) test(`${site || 'PHP'} full run, saved work, keyboard, feedback and homepage`, async ({ page }) => {
            test.setTimeout(180_000);
            const errors = watchForErrors(page);
            await page.goto(`${site}/content/${slug}/`); await ready(page);
            const slider = page.getByRole('slider', { name: 'Time (s)', exact: true });
            await slider.focus(); await page.keyboard.press('Home');
            for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowRight');
            await expect(slider).toBeFocused(); await expect(page.locator('.walker:visible')).toHaveAttribute('aria-label', 'Time: 6\u00a0s · Distance from the start: 12\u00a0m');
            await capture(page, 'learn-1'); await reload(page); await main(page).click();
            await board(page).focus();
            for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
            await reload(page); expect((await state(page, 'learn')).position).toBe(3);
            await drag(page, [3, 6], [1, 2], mode.touch);
            expect((await state(page, 'learn')).position).toBe(1);
            await board(page).focus(); for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
            await expect(page.locator('.speed-working:visible')).toContainText('12 ÷ 6 = 2\u00a0m/s');
            await capture(page, 'learn-2'); await reload(page); await main(page).click();
            await tap(page, [0, 0], mode.touch); await expect(page.locator('.question-feedback:visible')).toContainText("That's the start of the whole journey.");
            await tap(page, [10, 26], mode.touch); await expect(page.locator('.question-feedback:visible')).toContainText("That's the end.");
            await tap(page, [2, 4], mode.touch); await expect(page.locator('.question-feedback:visible')).toContainText('Tap the start');
            await tap(page, [3, 12], mode.touch); await expect(page.locator('.question-feedback:visible')).toHaveText('Tap a corner of the highlighted line.');
            await tap(page, [4, 8], mode.touch); await reload(page);
            await tap(page, [6, 14], mode.touch); await expect(page.locator('.question-feedback:visible')).toContainText('Tap the end');
            await tap(page, [10, 26], mode.touch); await page.waitForTimeout(1500);
            await capture(page, 'learn-3'); await reload(page); await main(page).click();
            await expect(page.locator('.speed-working:visible')).toHaveText('8\u00a0m in 4\u00a0s: 8 ÷ 4 = 2\u00a0m/s');
            await page.getByRole('button', { name: '4 to 10 s', exact: true }).click(); await capture(page, 'learn-4'); await main(page).click();
            await drag(page, [4, 12], [8, 12], mode.touch); await expect(page.locator('.walker:visible')).toHaveAttribute('aria-label', 'Time: 8\u00a0s · Distance from the start: 12\u00a0m');
            await capture(page, 'learn-5'); await reload(page); await main(page).click();
            for (let i = 0; i < 4; i++) {
                const saved = await state(page, 'interactive');
                const definition = await page.evaluate(i => SpeedJourneys.examples[i], i);
                await answer(page, definition, saved.order[i]); await capture(page, `try-${i}`); await reload(page);
                await main(page).click();
            }
            await main(page).click();
            for (let i = 0; i < 8; i++) await solvePractice(page, mode.touch && i === 0);
            await capture(page, 'practice-results'); await reload(page);
            const scoreBeforeRepeat = await page.evaluate(() => Maths1to9Lesson.getScore());
            if (mode.touch) {
                for (let session = 0; session < 2; session++) {
                    await page.getByRole('button', { name: 'Practise again', exact: true }).click();
                    for (let i = 0; i < 8; i++) await solvePractice(page);
                    await reload(page); expect(await page.evaluate(() => Maths1to9Lesson.getScore())).toEqual(scoreBeforeRepeat);
                }
                expect((await state(page, 'question-bank')).earlier.length).toBe(2);
            }
            await back(page).click();
            expect(await page.locator('.question-card input:visible').count()).toBe(0); await main(page).click(); await main(page).click();
            for (let i = 0; i < 6; i++) {
                const saved = await state(page, 'comparison');
                const definition = await page.evaluate(i => SpeedJourneys.checks[i], i);
                await answer(page, definition, saved.order[i]); await capture(page, `check-${i}`); await reload(page); await main(page).click();
            }
            await expect(main(page)).toHaveText('All lessons'); await capture(page, 'summary'); await reload(page);
            const before = await page.evaluate(slug => Maths1to9Progress.getLessonProgress(slug), slug);
            expect(before.score.points).toBe(before.score.maximumPoints - (mode.touch ? 5 : 0));
            await main(page).click(); await expect(page).toHaveURL(new RegExp(`${site || ''}/$`)); expect(errors).toEqual([]);
        });
    });
}
