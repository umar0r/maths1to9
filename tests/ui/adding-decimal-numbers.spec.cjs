const { test, expect } = require('@playwright/test');
const solve = require('./solvers/adding-decimal-numbers.cjs');
const { MAIN_ACTION, watchForErrors, goToStage } = require('./helpers.cjs');
const main = page => page.locator(`${MAIN_ACTION}:visible`);
const score = page => page.evaluate(() => window.Maths1to9Lesson.getScore().points);
const back = page => page.getByRole('button', { name: 'Previous screen', exact: true });
const feedback = page => page.locator('.question-feedback:visible');
async function reload(page) {
    await page.reload({ waitUntil: 'networkidle' });
    await expect(main(page)).toBeVisible();
}
async function finishPractice(page) {
    for (let step = 0; step < 80; step++) {
        if (await page.getByRole('button', { name: 'Practise again', exact: true }).isVisible()) return;
        if (await solve(page)) continue;
        await expect(main(page)).toBeEnabled();
        await main(page).click();
    }
    throw Error('Practice did not finish');
}

for (const width of [1280, 375]) {
    test.describe(`adding-decimal-numbers ${width}px with touch`, () => {
        test.use({ viewport: { width, height: 900 }, hasTouch: true });
        test('cards, choices and typing survive reload, locked Back reviews and further Practice', async ({ page }) => {
            test.setTimeout(180_000);
            const errors = watchForErrors(page);
            await page.goto('content/adding-decimal-numbers/', { waitUntil: 'networkidle' });
            await expect(page.getByText("We add and take away decimals when amounts aren't whole numbers.", { exact: true })).toBeVisible();
            const visited = new Set();
            const wrongKinds = new Set();
            let penalty = 0, practiceCount = 0, checkCount = 0;
            for (let step = 0; step < 160; step++) {
                expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
                const label = await main(page).innerText();
                if (label === 'All lessons') break;
                if (label !== 'Check') {
                    await expect(main(page)).toBeEnabled();
                    await main(page).click();
                    continue;
                }
                const section = await page.evaluate(() => window.Maths1to9Lesson.getCurrentSection().id);
                const url = page.url();
                const options = page.locator('.question-card-options:visible button');
                const slots = page.locator('.digit-card-slot:visible');
                const kind = await slots.count() ? 'custom' : await options.count() ? 'choice' : 'number';
                if (!visited.has(url)) {
                    visited.add(url);
                    if (section === 'question-bank') practiceCount++;
                    if (section === 'comparison') checkCount++;
                }
                if (section === 'question-bank') {
                    await expect(feedback(page)).toHaveCount(0);
                    await expect(page.locator('.decimal-written-carry:visible')).toHaveCount(0);
                }
                await solve(page);
                if (section === 'question-bank') await expect(feedback(page)).toHaveCount(0);
                const key = `${section}:${kind}`;
                if (section !== 'interactive' && !wrongKinds.has(key)) {
                    wrongKinds.add(key);
                    penalty += 5;
                    if (kind === 'custom') {
                        const slot = page.getByRole('button', { name: 'Hundredths answer digit', exact: true });
                        const digit = Number(await slot.innerText());
                        await slot.click();
                        await page.getByRole('button', { name: `Digit ${(digit + 1) % 10}`, exact: true }).click();
                    } else if (kind === 'choice') {
                        const right = await page.locator('.question-card-options:visible button.is-selected').innerText();
                        const labels = await options.allTextContents();
                        await page.getByRole('button', { name: labels.find(label => label !== right), exact: true }).click();
                    } else await page.locator('.question-card:visible input[type=text]').fill('99999');
                    await reload(page);
                    await expect(feedback(page)).toHaveCount(0);
                    await main(page).click();
                    await expect(main(page)).toHaveText('Try again');
                    const message = await feedback(page).innerText();
                    await reload(page);
                    await expect(feedback(page)).toHaveText(message);
                    await main(page).click();
                    await solve(page);
                }
                await main(page).click();
                await expect(main(page)).toHaveText('Continue');
                const earned = await score(page);
                await reload(page);
                expect(await score(page)).toBe(earned);
                await expect(main(page)).toHaveText('Continue');
                await expect(page.locator('.retained-answer:visible')).toHaveCount(0);
                await main(page).click();
                if (section !== 'interactive') {
                    const next = page.url();
                    const afterContinue = await score(page);
                    expect(afterContinue).toBe(earned + (section === 'comparison' && /#summary$/.test(next) ? 5 : 0));
                    await back(page).click();
                    await expect(feedback(page)).toBeVisible();
                    if (kind === 'custom') {
                        for (const slot of await page.locator('.digit-card-slot:visible').all()) await expect(slot).toBeDisabled();
                    } else if (kind === 'choice') {
                        await expect(options).toHaveCount(4);
                        for (const option of await options.all()) await expect(option).toBeDisabled();
                    } else await expect(page.locator('.question-card:visible input[type=text]')).toBeDisabled();
                    await main(page).click();
                    await expect(page).toHaveURL(next);
                    expect(await score(page)).toBe(afterContinue);
                }
            }
            expect(practiceCount).toBe(10);
            expect(checkCount).toBe(4);
            await expect(main(page)).toHaveText('All lessons');
            await expect(page.locator('.decimal-learned li')).toHaveCount(4);
            await expect(page.locator('.retained-results:visible, .score-panel:visible')).toHaveCount(0);
            const earned = await score(page);
            expect(earned).toBe(180 - penalty);
            await reload(page);
            expect(await score(page)).toBe(earned);
            await main(page).click();
            await expect(page).toHaveURL(/\/$/);
            expect((await page.request.get(page.url())).ok()).toBe(true);
            await page.goto('content/adding-decimal-numbers/', { waitUntil: 'networkidle' });
            await goToStage(page, 'Practice');
            const evidenceBefore = await page.evaluate(() => window.Maths1to9Progress.getSkillProgress('decimal-add-subtract'));
            for (let session = 0; session < 2; session++) {
                await page.getByRole('button', { name: 'Practise again', exact: true }).click();
                await reload(page);
                await finishPractice(page);
                expect(await score(page)).toBe(earned);
            }
            await expect(page.getByText('Earlier practice 1', { exact: true })).toBeVisible();
            await expect(page.getByText('Earlier practice 2', { exact: true })).toBeVisible();
            const evidenceAfter = await page.evaluate(() => window.Maths1to9Progress.getSkillProgress('decimal-add-subtract'));
            expect(evidenceAfter).not.toEqual(evidenceBefore);
            expect(await page.evaluate(() => window.Maths1to9Lesson.getProgress().finished)).toBe(true);
            expect(errors).toEqual([]);
        });
    });
}

test('adding-decimal-numbers: built static lesson finishes and All lessons reaches its homepage', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('dist/content/adding-decimal-numbers/', { waitUntil: 'networkidle' });
    for (let step = 0; step < 110; step++) {
        if (await main(page).innerText() === 'All lessons') break;
        if (await solve(page)) continue;
        await expect(main(page)).toBeEnabled();
        await main(page).click();
    }
    await expect(main(page)).toHaveText('All lessons');
    const expected = new URL('../../', page.url()).href;
    await main(page).click();
    await expect(page).toHaveURL(expected);
    expect((await page.request.get(expected)).ok()).toBe(true);
});

for (const width of [1280, 375]) {
    test.describe(`adding-decimal-numbers build-it ${width}px`, () => {
        test.use({ viewport: { width, height: 1100 }, hasTouch: true });
        test('placing both operands, padding, retries, saved work and Reset replay', async ({ page }) => {
            test.setTimeout(180_000);
            const errors = watchForErrors(page);
            await page.goto('content/adding-decimal-numbers/', { waitUntil: 'networkidle' });
            // The pictures have to show a take-away whose answer is under 10, with its tens cell
            // left empty, so start Practice from a fixed seed whose second question is one.
            const practicePrompts = await page.evaluate(async () => {
                const engine = window.Maths1to9LessonEngine;
                const items = window.DecimalAddition.pick(engine.seededRandom(1503238553));
                await window.Maths1to9Progress.saveLessonActivityState('adding-decimal-numbers', 'question-bank', {
                    sharedState: 1, version: 5,
                    data: { session: 1, items, index: 0, screen: 0, finished: false, earlier: [], cards: {} }
                });
                return items.map(item => window.DecimalAddition.generate(item, engine.seededRandom(item.seed)).prompt);
            });
            await reload(page);
            const takeAway = practicePrompts[1].match(/\d+(?:\.\d+)?/g).map(Number);
            expect(takeAway[0]).toBeGreaterThanOrEqual(10);
            expect(takeAway[0] - takeAway[1]).toBeLessThan(10);
            for (let step = 0; step < 30 && !page.url().endsWith('#try-it-3'); step++) {
                if (await solve(page)) continue;
                await expect(main(page)).toBeEnabled();
                await main(page).click();
            }
            await expect(page).toHaveURL(/#try-it-3$/);
            const build = page.locator('.decimal-build-chart:visible');
            const put = async (field, digit) => {
                await build.locator(`[data-slot="${field}"]`).click();
                await page.getByRole('button', { name: `Digit ${digit}`, exact: true }).click();
            };
            const shot = async name => {
                await page.evaluate(() => document.fonts.ready);
                // On a phone the feedback and the main button slide up together as a sheet.
                // Waiting for that animation means the screenshot shows them, not an empty bar.
                if (await page.locator('.lesson-controls[data-feedback]').count()) await page.waitForTimeout(400);
                expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
                await page.screenshot({ path: `/tmp/maths1to9-shots/adding-decimals/build-${name}-${width}.png`, fullPage: true });
            };
            await expect(build.locator('.digit-card-slot')).toHaveText(Array(12).fill(''));
            await expect(main(page)).toBeDisabled();
            await expect(feedback(page)).toHaveCount(0);
            // The heading itself says where the digits go; there is no second instruction line.
            await expect(build.locator('.decimal-build-instruction')).toHaveCount(0);
            await expect(page.locator('[data-screen-heading]:visible').first()).toHaveText("Work out 5.3 + 12.46 by putting each digit under the column it's worth.");
            await shot('try3-empty');
            await put('a:units', 5); await put('a:tenths', 3);
            await shot('try3-half');
            await reload(page);
            await expect(build.locator('[data-slot="a:units"]')).toHaveText('5');
            await expect(build.locator('[data-slot="a:tenths"]')).toHaveText('3');
            for (const [key, digit] of Object.entries({ tens: 1, units: 2, tenths: 4, hundredths: 6 })) await put(`b:${key}`, digit);
            await shot('try3-placed');
            await expect(build.locator('[data-slot="a:tens"]')).toHaveText('');
            await expect(build.locator('[data-slot="a:hundredths"]')).toHaveText('');
            for (const [key, digit] of Object.entries({ tens: 1, units: 7, tenths: 7, hundredths: 6 })) await put(`answer:${key}`, digit);
            await put('a:tenths', 9);
            await expect(feedback(page)).toHaveCount(0);
            await main(page).click();
            await expect(main(page)).toHaveText('Try again');
            await expect(feedback(page)).toHaveCount(1);
            await expect(feedback(page)).toHaveText('The 3 in 5.3 is 3 tenths.');
            await reload(page);
            await expect(feedback(page)).toHaveText('The 3 in 5.3 is 3 tenths.');
            await main(page).click();
            await solve(page);
            await main(page).click();
            await expect(feedback(page)).toHaveCount(1);
            await expect(feedback(page)).toHaveText('5.30 + 12.46 = 17.76.');
            await shot('try3-right');
            const earned = await score(page);
            await page.getByRole('button', { name: 'Reset card', exact: true }).click();
            await expect(build.locator('.digit-card-slot')).toHaveText(Array(12).fill(''));
            await solve(page); await main(page).click();
            expect(await score(page)).toBe(earned);
            await reload(page);
            await expect(feedback(page)).toHaveText('5.30 + 12.46 = 17.76.');
            await main(page).click();
            await expect(page).toHaveURL(/#question-bank-question-1$/);
            await solve(page); await main(page).click(); await main(page).click();
            for (const number of [2, 3]) {
                await expect(page).toHaveURL(new RegExp(`#question-bank-question-${number}$`));
                await expect(feedback(page)).toHaveCount(0);
                await expect(build.locator('.digit-card-slot')).toHaveText(Array(await build.locator('.digit-card-slot').count()).fill(''));
                await expect(page.locator('.decimal-written-carry:visible')).toHaveCount(0);
                await shot(`practice${number}-empty`);
                await put('a:units', 1);
                await reload(page);
                await expect(build.locator('[data-slot="a:units"]')).toHaveText('1');
                await expect(feedback(page)).toHaveCount(0);
                await page.getByRole('button', { name: 'Reset card', exact: true }).click();
                await expect(build.locator('[data-slot="a:units"]')).toHaveText('');
                await solve(page);
                await expect(feedback(page)).toHaveCount(0);
                if (number === 2) {
                    const field = build.locator('[data-slot="b:hundredths"]');
                    const right = await field.innerText();
                    await put('b:hundredths', (Number(right) + 1) % 10);
                    await expect(feedback(page)).toHaveCount(0);
                    await main(page).click();
                    await expect(main(page)).toHaveText('Try again');
                    await expect(feedback(page)).toContainText(`${right} hundredth`);
                    await shot('practice2-wrong');
                    await reload(page); await main(page).click(); await solve(page);
                    const answer = build.locator('[data-slot="answer:hundredths"]');
                    await put('answer:hundredths', (Number(await answer.innerText()) + 1) % 10);
                    await expect(feedback(page)).toHaveCount(0);
                    await main(page).click();
                    await expect(feedback(page)).toContainText('Check the hundredths:');
                    await main(page).click(); await solve(page);
                }
                await main(page).click();
                await expect(main(page)).toHaveText('Continue');
                await shot(`practice${number}-checked`);
                if (number === 2) await expect(build.locator('[data-slot="answer:tens"]')).toHaveText('');
                const points = await score(page);
                await reload(page);
                await expect(main(page)).toHaveText('Continue');
                await main(page).click();
                const next = page.url();
                await back(page).click();
                for (const slot of await build.locator('.digit-card-slot').all()) await expect(slot).toBeDisabled();
                await expect(feedback(page)).toBeVisible();
                await main(page).click();
                await expect(page).toHaveURL(next);
                expect(await score(page)).toBe(points);
            }
            expect(errors).toEqual([]);
        });
    });
}

for (const width of [1280, 375]) {
    test.describe(`adding-decimal-numbers shared cards ${width}px`, () => {
        test.use({ viewport: { width, height: 1100 }, hasTouch: width === 375 });
        test('real pointer drags, cancelled drops, fly-in, keyboard and answer advance', async ({ page, context }) => {
            test.setTimeout(180_000);
            const errors = watchForErrors(page);
            const directory = '/tmp/maths1to9-shots/adding-decimals';
            const shot = async name => {
                await page.evaluate(() => document.fonts.ready);
                expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
                await page.screenshot({ path: `${directory}/cards-${name}-${width}.png`, fullPage: true });
            };
            const cdp = width === 375 ? await context.newCDPSession(page) : null;
            const pointer = async (type, x, y) => {
                if (cdp) await cdp.send('Input.dispatchTouchEvent', {
                    type: { down: 'touchStart', move: 'touchMove', up: 'touchEnd' }[type],
                    touchPoints: type === 'up' ? [] : [{ x, y, id: 1 }]
                });
                else if (type === 'down') { await page.mouse.move(x, y); await page.mouse.down(); }
                else if (type === 'move') await page.mouse.move(x, y);
                else await page.mouse.up();
            };
            const drag = async (digit, target, midShot) => {
                const card = page.getByRole('button', { name: `Digit ${digit}`, exact: true });
                await card.scrollIntoViewIfNeeded();
                const from = await card.boundingBox();
                const to = target ? await target.boundingBox() : { x: 3, y: 3, width: 1, height: 1 };
                const x = from.x + from.width / 2, y = from.y + from.height / 2;
                const tx = to.x + to.width / 2, ty = to.y + to.height / 2;
                await pointer('down', x, y);
                for (let step = 1; step <= 10; step++) {
                    await pointer('move', x + (tx - x) * step / 10, y + (ty - y) * step / 10);
                    if (midShot && step === 5) {
                        await expect(page.locator('.digit-card-flight')).toHaveCount(1);
                        await shot(midShot);
                    }
                }
                await pointer('up', tx, ty);
                await expect(page.locator('.digit-card-flight')).toHaveCount(0);
            };
            const advanceTo = async hash => {
                for (let step = 0; step < 45 && !page.url().endsWith(hash); step++) {
                    if (await solve(page)) continue;
                    await expect(main(page)).toBeEnabled();
                    await main(page).click();
                }
                await expect(page).toHaveURL(new RegExp(`${hash}$`));
            };
            await page.goto('content/adding-decimal-numbers/', { waitUntil: 'networkidle' });
            await advanceTo('#try-it-1');
            const hundredths = page.getByRole('button', { name: 'Hundredths answer digit', exact: true });
            const tenths = page.getByRole('button', { name: 'Tenths answer digit', exact: true });
            const beforeScroll = await page.evaluate(() => scrollY);
            await drag(8, hundredths);
            await expect(hundredths).toHaveText('8');
            await expect(tenths).toHaveAttribute('aria-pressed', 'true');
            expect(await page.evaluate(() => scrollY)).toBe(beforeScroll);
            await drag(9, null);
            await expect(hundredths).toHaveText('8');
            await expect(tenths).toHaveText('');
            await tenths.click();
            await page.getByRole('button', { name: 'Digit 0', exact: true }).click();
            // The flight is a real browser animation, not a delayed change to saved work.
            const durations = await page.locator('.digit-card-flight').evaluateAll(nodes => nodes.flatMap(node =>
                node.getAnimations().map(animation => animation.effect.getTiming().duration)));
            expect(durations).toContain(200);
            await expect(page.locator('.digit-card-flight')).toHaveCount(0);
            await shot('try1');
            await reload(page);
            await expect(hundredths).toHaveText('8');
            await expect(tenths).toHaveText('0');
            const units = page.getByRole('button', { name: 'Units answer digit', exact: true });
            await units.focus();
            await page.keyboard.press('8');
            await units.click();
            await page.keyboard.press('Backspace');
            await expect(units).toHaveText('');
            await page.keyboard.press('8');
            await page.emulateMedia({ reducedMotion: 'reduce' });
            await hundredths.click();
            await page.getByRole('button', { name: 'Digit 8', exact: true }).click();
            await expect(page.locator('.digit-card-flight')).toHaveCount(0);
            await page.emulateMedia({ reducedMotion: 'no-preference' });
            await advanceTo('#try-it-2');
            // Try it 2 grows into the second receipt step under the same hash.
            await solve(page); await main(page).click(); await main(page).click();
            await expect(page.locator('.decimal-receipt-voucher-row:visible')).toHaveCount(1);
            await shot('try2-step2');
            await advanceTo('#try-it-3');
            const field = id => page.locator(`.digit-card-slot[data-slot="${id}"]:visible`);
            await drag(5, field('a:units'), 'try3-mid-drag');
            await expect(field('a:units')).toHaveText('5');
            await expect(field('a:units')).toHaveAttribute('aria-pressed', 'true');
            for (const [id, digit] of [['a:tenths', 3], ['b:tens', 1], ['b:units', 2], ['b:tenths', 4], ['b:hundredths', 6]]) {
                await field(id).click();
                await page.getByRole('button', { name: `Digit ${digit}`, exact: true }).click();
                await expect(field(id)).toHaveAttribute('aria-pressed', 'true');
            }
            await field('answer:hundredths').click();
            await page.getByRole('button', { name: 'Digit 6', exact: true }).click();
            await expect(field('answer:tenths')).toHaveAttribute('aria-pressed', 'true');
            await expect(page.locator('.digit-card-flight')).toHaveCount(0);
            await shot('try3-answer-advance');
            await reload(page);
            await expect(field('answer:hundredths')).toHaveText('6');
            await expect(field('answer:tenths')).toHaveAttribute('aria-pressed', 'true');
            await advanceTo('#question-bank-question-2');
            await drag(1, field('a:units'));
            await expect(feedback(page)).toHaveCount(0);
            await shot('practice2');
            await page.getByRole('button', { name: 'Reset card', exact: true }).click();
            await expect(field('a:units')).toHaveText('');
            await solve(page); await main(page).click();
            for (const slot of await page.locator('.digit-card-slot:visible').all()) await expect(slot).toBeDisabled();
            expect(errors).toEqual([]);
        });
    });
}
