const { test, expect } = require('@playwright/test');
const solve = require('./solvers/adding-decimal-numbers.cjs');
const { MAIN_ACTION, watchForErrors } = require('./helpers.cjs');
const main = page => page.locator(`${MAIN_ACTION}:visible`);
const feedback = page => page.locator('.question-feedback:visible');
const context = page => page.locator('.lesson-section:visible .decimal-practice-context');
const screenshot = async (page, name) => {
    await page.evaluate(() => document.fonts.ready);
    if (name !== 'fix-drag-375') await expect(page.locator('.digit-card-flight')).toHaveCount(0);
    await expect(page.locator('.celebration')).toHaveCount(0);
    if (name !== 'fix-drag-375') {
        await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
        await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
    }
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `/tmp/maths1to9-shots/adding-decimals/${name}.png`, fullPage: true, animations: 'disabled' });
};
async function walkTo(page, reached) {
    for (let step = 0; step < 140; step++) {
        if (await reached()) return;
        if (await solve(page)) continue;
        await expect(main(page)).toBeEnabled();
        await main(page).click();
    }
    throw Error('Did not reach the requested decimal screen');
}
async function start(page) {
    await page.goto('content/adding-decimal-numbers/', { waitUntil: 'networkidle' });
    await page.evaluate(async () => {
        const items = window.DecimalAddition.pickSteps(window.Maths1to9LessonEngine.seededRandom(1503238553));
        await window.Maths1to9Progress.saveLessonActivityState('adding-decimal-numbers', 'question-bank', {
            sharedState: 1, version: 7,
            data: { session: 1, items, index: 0, screen: 0, finished: false, earlier: [], cards: {} }
        });
    });
    await page.reload({ waitUntil: 'networkidle' });
}

for (const width of [1280, 375]) {
    test.describe(`adding-decimal-numbers fixes ${width}px`, () => {
        test.use({ viewport: { width, height: 1100 }, hasTouch: width === 375 });
        test('fresh line-up accepts cards immediately, hands on between rows and drags without easing', async ({ page, context: browserContext }) => {
            test.setTimeout(120_000);
            const errors = watchForErrors(page);
            await start(page);
            await walkTo(page, () => page.url().endsWith('#try-it-3'));
            const field = id => page.locator(`.digit-card-slot[data-slot="${id}"]:visible`);
            await expect(field('a:tens')).toHaveAttribute('aria-pressed', 'true');
            await expect(page.getByRole('button', { name: 'Digit 0', exact: true })).toBeEnabled();
            await screenshot(page, `fix-lineup-start-${width}`);
            await page.getByRole('button', { name: 'Digit 0', exact: true }).click();
            await expect(field('a:tens')).toHaveText('0');
            await expect(field('a:units')).toHaveAttribute('aria-pressed', 'true');
            await page.getByRole('button', { name: 'Digit 5', exact: true }).click();
            await expect(field('a:units')).toHaveText('5');
            await expect(field('a:tenths')).toHaveAttribute('aria-pressed', 'true');
            await expect(page.locator('.digit-card-flight')).toHaveCount(0);
            if (width === 375) await screenshot(page, 'fix-lineup-after-two-taps-375');
            await page.reload({ waitUntil: 'networkidle' });
            await expect(field('a:tenths')).toHaveAttribute('aria-pressed', 'true');
            await expect(field('a:units')).toHaveText('5');
            for (const digit of [3, 0]) await page.getByRole('button', { name: `Digit ${digit}`, exact: true }).click();
            await expect(field('b:tens')).toHaveAttribute('aria-pressed', 'true');
            for (const digit of [1, 2, 4, 6]) await page.getByRole('button', { name: `Digit ${digit}`, exact: true }).click();
            await expect(field('answer:hundredths')).toHaveAttribute('aria-pressed', 'true');
            await page.getByRole('button', { name: 'Digit 6', exact: true }).click();
            await expect(field('answer:tenths')).toHaveAttribute('aria-pressed', 'true');
            // Choosing another column remains possible at every point.
            await field('a:units').click();
            await expect(page.locator('.digit-card-flight')).toHaveCount(0);
            const card = page.getByRole('button', { name: 'Digit 5', exact: true });
            await card.scrollIntoViewIfNeeded();
            const from = await card.boundingBox(), to = await field('a:units').boundingBox();
            const x = from.x + from.width / 2, y = from.y + from.height / 2;
            const tx = to.x + to.width / 2, ty = to.y + to.height / 2;
            const cdp = width === 375 ? await browserContext.newCDPSession(page) : null;
            const pointer = async (type, px, py) => {
                if (cdp) await cdp.send('Input.dispatchTouchEvent', {
                    type: { down: 'touchStart', move: 'touchMove', up: 'touchEnd' }[type],
                    touchPoints: type === 'up' ? [] : [{ x: px, y: py, id: 1 }]
                });
                else if (type === 'down') { await page.mouse.move(px, py); await page.mouse.down(); }
                else if (type === 'move') await page.mouse.move(px, py);
                else await page.mouse.up();
            };
            await pointer('down', x, y);
            for (let step = 1; step <= 10; step++) {
                const px = x + (tx - x) * step / 10, py = y + (ty - y) * step / 10;
                await pointer('move', px, py);
                const ghost = page.locator('.digit-card-flight');
                await expect(ghost).toHaveCSS('transition-duration', '0s');
                // Touch moves are delivered on the browser's next input frame.
                await expect.poll(async () => {
                    const bounds = await ghost.boundingBox();
                    return Math.max(Math.abs(bounds.x + bounds.width / 2 - px), Math.abs(bounds.y + bounds.height / 2 - py));
                }).toBeLessThan(1);
                expect(await ghost.evaluate(node => node.style.transform)).toMatch(/^translate3d\(/);
                if (step === 5 && width === 375) await screenshot(page, 'fix-drag-375');
            }
            await pointer('up', tx, ty);
            await expect(page.locator('.digit-card-flight')).toHaveCount(0);
            await expect(field('a:units')).toHaveText('5');
            await expect(field('answer:tenths')).toHaveAttribute('aria-pressed', 'true');
            expect(errors).toEqual([]);
        });
    });
}

test.describe('adding-decimal-numbers every Practice kind has working space', () => {
    test.use({ viewport: { width: 375, height: 1100 }, hasTouch: true });
    test('all five repaired kinds retain their choices and tables through wrong answers, reload, Back and Reset', async ({ page }) => {
        test.setTimeout(180_000);
        const errors = watchForErrors(page);
        await start(page);
        for (const kind of ['money-in-out', 'change', 'price-difference', 'missing-addend', 'missing-refund']) {
            await walkTo(page, async () => await context(page).count() > 0 && await context(page).getAttribute('data-kind') === kind);
            const stages = kind === 'missing-addend' ? 3 : 2;
            for (let stage = 0; stage < stages; stage++) {
                await expect(context(page)).toHaveAttribute('data-kind', kind);
                await expect(context(page)).toHaveAttribute('data-step', String(stage));
                await expect(page.locator('input[type=text]:visible')).toHaveCount(0);
                await expect(feedback(page)).toHaveCount(0);
                const choices = page.locator('.question-card-options:visible button');
                if (stage === 0) await screenshot(page, `${kind}-step1-375`);
                if (await choices.count()) {
                    await expect(choices).toHaveCount(4);
                    await solve(page);
                    const right = await page.locator('.question-card-options:visible button.is-selected').innerText();
                    const wrong = (await choices.allTextContents()).map((label, index) => ({ label, index })).filter(choice => choice.label !== right);
                    const messages = new Set();
                    for (const { index } of wrong) {
                        await choices.nth(index).click();
                        await expect(feedback(page)).toHaveCount(0);
                        await main(page).click();
                        await expect(main(page)).toHaveText('Try again');
                        const message = await feedback(page).innerText();
                        messages.add(message);
                        await page.reload({ waitUntil: 'networkidle' });
                        await expect(feedback(page)).toHaveText(message);
                        await main(page).click();
                        await expect(choices.nth(index)).toBeDisabled();
                    }
                    expect(messages.size).toBe(3);
                    await solve(page);
                } else {
                    await expect(page.locator('.digit-column-table:visible')).toHaveCount(1);
                    await expect(page.locator('.decimal-written-carry:visible')).toHaveCount(0);
                    if (kind !== 'money-in-out') {
                        await expect(page.locator('.decimal-selected-calculation button')).toHaveCount(4);
                        for (const button of await page.locator('.decimal-selected-calculation button').all()) await expect(button).toBeDisabled();
                    }
                    if (kind === 'price-difference') await expect(page.locator('.decimal-price-list')).toBeVisible();
                    if (kind === 'money-in-out' && stage === 1 || kind === 'missing-addend' && stage === 2) {
                        await expect(page.locator('.digit-column-table:visible tbody tr.is-faded')).toHaveCount(2);
                        await expect(page.locator('.digit-column-table:visible tbody tr.is-blue')).toHaveCount(1);
                        await expect(page.locator('.digit-column-table:visible tbody .digit-column-table__sign').filter({ hasText: '=' })).toHaveCount(2);
                    }
                    await solve(page);
                    const hundredths = page.getByRole('button', { name: 'Hundredths answer digit', exact: true });
                    const digit = Number(await hundredths.innerText());
                    await hundredths.click();
                    await page.getByRole('button', { name: `Digit ${(digit + 1) % 10}`, exact: true }).click();
                    await expect(feedback(page)).toHaveCount(0);
                    await main(page).click();
                    await expect(feedback(page)).toContainText('Check the hundredths:');
                    await expect(hundredths).toHaveClass(/is-incorrect/);
                    await expect(page.getByRole('button', { name: 'Tenths answer digit', exact: true })).toHaveClass(/is-correct/);
                    const retained = await page.locator('.digit-card-slot:visible').allTextContents();
                    await page.reload({ waitUntil: 'networkidle' });
                    await expect(main(page)).toHaveText('Try again');
                    await expect(hundredths).toHaveClass(/is-incorrect/);
                    await main(page).click();
                    expect(await page.locator('.digit-card-slot:visible').allTextContents()).toEqual(retained);
                    await expect(hundredths).toHaveAttribute('aria-pressed', 'true');
                    await expect(page.locator('.digit-card-slot.is-correct:visible')).toHaveCount(0);
                    await solve(page);
                    if (stage === stages - 1) await screenshot(page, `${kind}-table-375`);
                }
                await main(page).click();
                await expect(main(page)).toHaveText('Continue');
                await expect(feedback(page)).toHaveCount(1);
                const text = await feedback(page).innerText();
                await page.reload({ waitUntil: 'networkidle' });
                await expect(feedback(page)).toHaveText(text);
                const points = await page.evaluate(() => window.Maths1to9Lesson.getScore().points);
                await page.getByRole('button', { name: 'Reset card', exact: true }).click();
                await solve(page); await main(page).click();
                expect(await page.evaluate(() => window.Maths1to9Lesson.getScore().points)).toBe(points);
                await main(page).click();
                const next = page.url();
                await page.getByRole('button', { name: 'Previous screen', exact: true }).click();
                await expect(feedback(page)).toBeVisible();
                for (const button of await page.locator('.digit-card-slot:visible, .question-card-options:visible button').all()) await expect(button).toBeDisabled();
                await main(page).click();
                await expect(page).toHaveURL(next);
            }
        }
        expect(errors).toEqual([]);
    });
});

test('adding-decimal-numbers bank growing table at 1280px', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1280, height: 1100 });
    await start(page);
    await walkTo(page, async () => await context(page).count() > 0 && await context(page).getAttribute('data-kind') === 'money-in-out'
        && await context(page).getAttribute('data-step') === '1');
    await solve(page);
    await screenshot(page, 'money-in-out-table-1280');
});

for (const width of [1280, 375]) {
    test.describe(`adding-decimal-numbers retained wrong digits ${width}px`, () => {
        test.use({ viewport: { width, height: 1100 }, hasTouch: width === 375 });
        test('marks every required slot, retains retry digits and fixes the red slots', async ({ page }) => {
            test.setTimeout(120_000);
            const errors = watchForErrors(page);
            await start(page);
            await walkTo(page, () => page.url().endsWith('#try-it-3'));
            await solve(page);
            const slot = id => page.locator(`.digit-card-slot[data-slot="${id}"]:visible`);
            const number = slot('a:units'), answer = slot('answer:hundredths');
            const correctNumber = await number.innerText(), correctAnswer = await answer.innerText();
            await number.click(); await page.keyboard.press('9');
            await answer.click(); await page.keyboard.press(String((Number(correctAnswer) + 1) % 10));
            // Keep the same number of operand digits, but leave a required place
            // empty and put its digit in an unused column instead.
            await slot('a:tenths').click(); await page.keyboard.press('Backspace');
            await slot('a:hundredths').click(); await page.keyboard.press('3');
            await expect(page.locator('.digit-card-slot.is-incorrect:visible')).toHaveCount(0);
            const before = await page.locator('.digit-card-slot:visible').allTextContents();
            await main(page).click();
            await expect(main(page)).toHaveText('Try again');
            for (const id of ['a:units', 'a:tenths', 'a:hundredths', 'answer:hundredths']) {
                await expect(slot(id)).toHaveClass(/is-incorrect/);
                await expect(slot(id)).toHaveAttribute('aria-invalid', 'true');
            }
            await expect(slot('b:units')).toHaveClass(/is-correct/);
            await screenshot(page, `fix-wrong-marked-${width}`);
            await page.reload({ waitUntil: 'networkidle' });
            await expect(slot('a:tenths')).toHaveClass(/is-incorrect/);
            await expect(slot('b:units')).toHaveClass(/is-correct/);
            expect(await page.locator('.digit-card-slot:visible').allTextContents()).toEqual(before);
            await main(page).click();
            expect(await page.locator('.digit-card-slot:visible').allTextContents()).toEqual(before);
            await expect(number).toHaveAttribute('aria-pressed', 'true');
            await expect(page.locator('.digit-card-slot.is-correct:visible')).toHaveCount(0);
            for (const button of await page.locator('.digit-card-slot:visible').all()) await expect(button).toBeEnabled();
            if (width === 375) await screenshot(page, 'fix-wrong-retry-375');
            await page.reload({ waitUntil: 'networkidle' });
            expect(await page.locator('.digit-card-slot:visible').allTextContents()).toEqual(before);
            await expect(number).toHaveAttribute('aria-pressed', 'true');
            await expect(answer).toHaveClass(/is-incorrect/);
            await expect(page.locator('.digit-card-slot.is-correct:visible')).toHaveCount(0);
            await number.click(); await page.keyboard.press('9');
            await expect(number).toHaveClass(/is-incorrect/);
            await number.click(); await page.keyboard.press(correctNumber);
            await expect(number).not.toHaveClass(/is-incorrect/);
            await slot('a:tenths').click(); await page.keyboard.press('3');
            await slot('a:hundredths').click(); await page.keyboard.press('Backspace');
            await answer.click(); await page.keyboard.press(correctAnswer);
            await main(page).click();
            await expect(main(page)).toHaveText('Continue');
            await expect(number).toHaveClass(/is-correct/);
            await expect(answer).toHaveClass(/is-correct/);
            await page.reload({ waitUntil: 'networkidle' });
            await expect(answer).toHaveClass(/is-correct/);
            await page.getByRole('button', { name: 'Reset card', exact: true }).click();
            await expect(page.locator('.digit-card-slot.is-correct:visible, .digit-card-slot.is-incorrect:visible')).toHaveCount(0);
            expect((await page.locator('.digit-card-slot:visible').allTextContents()).every(text => !text)).toBe(true);
            expect(errors).toEqual([]);
        });
    });
}

test('adding-decimal-numbers headings stay in their columns at phone, tablet and desktop widths', async ({ page }) => {
    test.setTimeout(120_000);
    await start(page);
    await walkTo(page, async () => await context(page).count() > 0 && await context(page).getAttribute('data-kind') === 'subtract-exchange');
    for (const width of [375, 768, 1000, 1280]) {
        await page.setViewportSize({ width, height: 1100 });
        await page.evaluate(() => document.fonts.ready);
        const headings = page.locator('.digit-column-table:visible th .digit-column-table__heading');
        await expect.poll(async () => headings.evaluateAll(labels => labels.every(label => {
            const range = document.createRange(); range.selectNodeContents(label);
            const text = range.getBoundingClientRect(), cell = label.parentElement.getBoundingClientRect();
            return range.getClientRects().length === 1 && text.left >= cell.left && text.right <= cell.right;
        }))).toBe(true);
        if (width === 1000) await screenshot(page, 'fix-headings-1000');
    }
});
