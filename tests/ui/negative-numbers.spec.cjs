const { test, expect } = require('@playwright/test');
const solve = require('./solvers/negative-numbers.cjs');
const { MAIN_ACTION, watchForErrors } = require('./helpers.cjs');

const score = page => page.evaluate(() => window.Maths1to9Lesson.getScore().points);
const mainAction = page => page.locator(`${MAIN_ACTION}:visible`);
const back = page => page.getByRole('button', { name: 'Previous screen', exact: true });
const prompt = page => page.locator('.question-prompt:visible');

async function reload(page) {
    await page.reload({ waitUntil: 'networkidle' });
    await expect(mainAction(page)).toBeVisible();
}

async function goBackAndForward(page) {
    if (!await back(page).isVisible()) return;
    const url = page.url();
    const points = await score(page);
    await back(page).click();
    await expect(mainAction(page)).toBeEnabled();
    await mainAction(page).click();
    await expect(page).toHaveURL(url);
    expect(await score(page)).toBe(points);
}

async function finishQuestions(page) {
    for (let step = 0; step < 100; step++) {
        if (await page.getByRole('button', { name: 'Practise again', exact: true }).isVisible()) return;
        if (await solve(page)) continue;
        await expect(mainAction(page)).toBeEnabled();
        await mainAction(page).click();
    }
    throw new Error('Practice did not finish');
}

for (const width of [1280, 375]) {
    test.describe(`negative-numbers ${width}px with touch`, () => {
        test.use({ viewport: { width, height: 900 }, hasTouch: true });
        test('the Practice number line and typed answer stay in sync', async ({ page }) => {
            await page.goto('content/negative-numbers/#question-bank-question-1', { waitUntil: 'networkidle' });
            await page.evaluate(() => window.Maths1to9Lesson.goToSection('question-bank', { unlock: true }));
            const sum = (await prompt(page).innerText()).match(/^Work out (\d+) − (\d+)\.$/);
            expect(sum).not.toBeNull();
            const start = Number(sum[1]);
            const answer = start - Number(sum[2]);
            const line = page.getByRole('slider', { name: 'Choose an answer on the number line' });
            const input = page.getByRole('textbox', { name: 'Your answer' });
            const tapNumber = async number => {
                const min = Number(await line.getAttribute('aria-valuemin'));
                const max = Number(await line.getAttribute('aria-valuemax'));
                const track = line.locator('.negative-track');
                const box = await track.boundingBox();
                const options = { position: { x: box.width * (number - min) / (max - min), y: 40 } };
                if (width === 375) await track.tap(options);
                else await track.click(options);
            };

            await expect(line).toBeVisible();
            await expect(mainAction(page)).toBeDisabled();
            await tapNumber(start);
            await expect(input).toHaveValue(String(start));
            await mainAction(page).click();
            await expect(mainAction(page)).toHaveText('Try again');
            await mainAction(page).click();
            await expect(input).toHaveValue('');
            await input.fill(String(answer));
            await expect(line).toHaveAttribute('aria-valuenow', String(answer));
            await reload(page);
            await expect(input).toHaveValue(String(answer));
            await expect(line).toHaveAttribute('aria-valuenow', String(answer));
            await input.clear();
            await tapNumber(answer);
            await expect(input).toHaveValue(String(answer).replace('-', '−'));
            await mainAction(page).click();
            await expect(mainAction(page)).toHaveText('Continue');
        });

        test('the sideways Practice thermometer is the answer control', async ({ page }) => {
            await page.goto('content/negative-numbers/', { waitUntil: 'networkidle' });
            await page.evaluate(() => window.Maths1to9Lesson.goToSection('question-bank', { unlock: true }));
            for (let step = 0; step < 20 && !(await prompt(page).innerText()).startsWith('It is '); step++) {
                if (!await solve(page)) await mainAction(page).click();
            }
            const sum = (await prompt(page).innerText()).match(/^It is −(\d+)°C.* goes up by (\d+)°C/);
            expect(sum).not.toBeNull();
            const start = -Number(sum[1]);
            const answer = start + Number(sum[2]);
            const thermometer = page.getByRole('slider', { name: 'Set the temperature' });
            await expect(page.getByRole('textbox', { name: 'Your answer' })).toHaveCount(0);
            await expect(thermometer).toHaveClass(/nn-side/);
            await expect(thermometer.locator('.nn-side-level-label')).toHaveText(`${String(start).replace('-', '−')}°C`);
            await expect(mainAction(page)).toBeDisabled();

            const marker = await thermometer.locator('.nn-level').boundingBox();
            const [first, second] = await Promise.all([0, 1].map(index =>
                thermometer.locator('.nn-tick').nth(index).boundingBox()));
            const pixelsPerDegree = second.x - first.x;
            const x = marker.x;
            const y = marker.y + marker.height / 2;
            await page.mouse.move(x, y);
            await page.mouse.down();
            await page.mouse.move(x, y - 2 * pixelsPerDegree, { steps: 5 });
            await expect(thermometer).toHaveAttribute('aria-valuenow', String(start + 2));
            await page.mouse.move(x, y - pixelsPerDegree, { steps: 5 });
            await page.mouse.up();
            await expect(thermometer).toHaveAttribute('aria-valuenow', String(start + 1));
            await mainAction(page).click();
            await expect(mainAction(page)).toHaveText('Try again');
            await mainAction(page).click();
            await expect(thermometer).toBeFocused();
            await expect(mainAction(page)).toBeDisabled();

            const resetMarker = await thermometer.locator('.nn-level').boundingBox();
            await page.mouse.move(resetMarker.x, y);
            await page.mouse.down();
            await page.mouse.move(resetMarker.x + (answer - start) * pixelsPerDegree, y, { steps: 8 });
            await page.mouse.up();
            await expect(thermometer).toHaveAttribute('aria-valuenow', String(answer));
            await reload(page);
            await expect(thermometer).toHaveAttribute('aria-valuenow', String(answer));
            await mainAction(page).click();
            await expect(mainAction(page)).toHaveText('Continue');
        });

        test('new work survives retries, reloads, Back and two more Practice sessions', async ({ page }) => {
            test.setTimeout(180_000);
            const errors = watchForErrors(page);
            await page.goto('content/negative-numbers/', { waitUntil: 'networkidle' });
            await expect(prompt(page)).toHaveCount(0);
            await expect(page.getByRole('heading', { name: 'Negative numbers are numbers below zero.', exact: true })).toBeVisible();
            const tested = new Set();
            let penalty = 0;
            const visited = new Set();
            for (let step = 0; step < 160; step++) {
                if (await require('./negative-numbers-learn-helper.cjs')(page)) continue;
                const url = page.url();
                if (!visited.has(url)) {
                    await goBackAndForward(page);
                    visited.add(url);
                }
                expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
                const button = mainAction(page);
                if (await button.innerText() === 'All lessons') break;
                const slider = page.locator('input[type=range]:visible');
                for (const control of await slider.all()) {
                    await control.focus();
                    await control.press('End');
                    await reload(page);
                    await expect(page.getByLabel(await control.getAttribute('aria-label'), { exact: true })).toHaveValue(await control.getAttribute('max'));
                }
                // Drag questions say Check too, but have no options or box to
                // type in; the solver moves the dot and the loop presses Check.
                const answerable = await page.locator('.question-card:visible input[type=text], .question-card-options:visible button').count();
                if (await prompt(page).count() && await button.innerText() === 'Check' && answerable) {
                    const section = await page.evaluate(() => window.Maths1to9Lesson.getCurrentSection().id);
                    const options = page.locator('.question-card-options:visible button');
                    const kind = await options.count() ? 'choice' : 'number';
                    const key = `${section}:${kind}`;
                    if (kind === 'choice' || !tested.has(key)) {
                        if (section !== 'interactive') penalty += 5;
                        tested.add(key);
                        await solve(page);
                        if (kind === 'choice') {
                            await expect(options).toHaveCount(4);
                            const rightLabel = await page.locator('.question-card-options:visible button.is-selected').innerText();
                            const labels = await options.allTextContents();
                            const feedbacks = new Set();
                            for (const label of labels.filter(label => label !== rightLabel)) {
                                await page.getByRole('button', { name: label, exact: true }).click();
                                await reload(page); // answering, with the selected wrong option
                                await button.click();
                                await expect(button).toHaveText('Try again');
                                const feedback = await page.locator('.question-feedback:visible').innerText();
                                feedbacks.add(feedback);
                                await reload(page); // wrong
                                await expect(page.locator('.question-feedback:visible')).toHaveText(feedback);
                                await button.click();
                            }
                            expect(feedbacks.size).toBe(3);
                        } else {
                            await page.locator('.question-card:visible input[type=text]').fill('999');
                            await reload(page); // answering, with typed input
                            await expect(page.locator('.question-card:visible input[type=text]')).toHaveValue('999');
                            await button.click();
                            await expect(button).toHaveText('Try again');
                            await reload(page);
                            await expect(button).toHaveText('Try again');
                            await button.click();
                        }
                        await solve(page);
                        await button.click();
                        if (section === 'interactive') {
                            // Try it goes straight on after a right answer.
                            await expect(page).not.toHaveURL(url);
                            const earned = await score(page);
                            await reload(page);
                            expect(await score(page)).toBe(earned);
                            continue;
                        }
                        await expect(button).toHaveText('Continue');
                        const earned = await score(page);
                        await reload(page); // correct after a retry
                        expect(await score(page)).toBe(earned);
                        await expect(button).toHaveText('Continue');
                        await expect(page.locator('.question-card:visible')).not.toContainText('Right first time');
                        await button.click();
                        continue;
                    }
                    await solve(page);
                }
                // The sign machine keeps Next locked until a card is flipped.
                if (await page.locator('.nn-punch-card:visible').count() && !await button.isEnabled()) {
                    await solve(page);
                    continue;
                }
                await expect(button).toBeEnabled();
                await button.click();
            }
            await expect(mainAction(page)).toHaveText('All lessons');
            const earned = await score(page);
            expect(penalty).toBe(70);
            expect(earned).toBe(260 - penalty); // the engine plans 260
            await reload(page); // finished
            expect(await score(page)).toBe(earned);
            await expect(page.locator('#negative-numbers-comparison .retained-results')).toContainText('2nd try');
            await goBackAndForward(page);
            await mainAction(page).click();
            await expect(page).toHaveURL(/\/$/);
            expect((await page.request.get(page.url())).ok()).toBe(true);
            await page.goto('content/negative-numbers/', { waitUntil: 'networkidle' });
            await page.locator('.lesson-navigation__button[data-stage-index="2"]').click();
            const evidenceBefore = await page.evaluate(() => window.Maths1to9Progress.getSkillProgress('calculate-negative-numbers'));
            for (let session = 0; session < 2; session++) {
                await page.getByRole('button', { name: 'Practise again', exact: true }).click();
                await reload(page);
                await finishQuestions(page);
                expect(await score(page)).toBe(earned);
            }
            await expect(page.getByText('Earlier practice 1', { exact: true })).toBeVisible();
            await expect(page.getByText('Earlier practice 2', { exact: true })).toBeVisible();
            expect(await page.evaluate(() => window.Maths1to9Lesson.getProgress().finished)).toBe(true);
            const evidenceAfter = await page.evaluate(() => window.Maths1to9Progress.getSkillProgress('calculate-negative-numbers'));
            expect(evidenceAfter).not.toEqual(evidenceBefore);
            expect(errors).toEqual([]);
            await page.screenshot({ path: `/private/tmp/negative-numbers-${width}.png`, fullPage: true });
        });
    });
}

test('negative-numbers: the old last Try it link keeps earlier work and leads to Practice', async ({ page }) => {
    await page.goto('content/negative-numbers/#try-it-8', { waitUntil: 'networkidle' });
    await expect(prompt(page)).toHaveText('Tap each card to multiply 1 by it.');
    await solve(page);
    await expect(mainAction(page)).toBeEnabled();
    const points = await score(page);

    await page.evaluate(async () => {
        const progress = window.Maths1to9Progress;
        const saved = await progress.getLessonActivityState('negative-numbers', 'interactive');
        await progress.saveLessonActivityState('negative-numbers', 'interactive', {
            ...saved,
            version: 7,
            data: { ...saved.data, index: 8, screen: 8, furthestScreen: 8 }
        });
    });
    // Use a full load so the legacy state is read again.
    await page.goto('content/negative-numbers/?legacy=1#try-it-9', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/#try-it-8$/);
    await expect(prompt(page)).toHaveText('Now tap each card to multiply −1 by it.');
    await expect(mainAction(page)).toBeEnabled();
    expect(await score(page)).toBe(points);
    await mainAction(page).click();
    await expect.poll(() => page.evaluate(() => window.Maths1to9Lesson.getCurrentSection().id)).toBe('question-bank');
});

test('negative-numbers: built static lesson finishes and All lessons reaches its homepage', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('dist/content/negative-numbers/', { waitUntil: 'networkidle' });
    for (let step = 0; step < 160; step++) {
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

for (const width of [1280, 375]) {
    test(`negative-numbers ${width}px: number lines reveal only completed movement and label key values`, async ({ browser }) => {
        const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: true });
        const page = await context.newPage();
        await page.goto('content/negative-numbers/', { waitUntil: 'networkidle' });
        // Finish the new Learn pictures before checking the unchanged Try it line.
        for (let step = 0; step < 80 && new URL(page.url()).hash.startsWith('#learn-'); step++) {
            if (await solve(page)) continue;
            await mainAction(page).click();
        }
        // Example 1: the question comes first, and there's nothing to choose.
        await expect(page.locator('.question-card-options:visible button')).toHaveCount(0);
        const heading = await prompt(page).boundingBox();
        const line = page.locator('.negative-line--movable:visible');
        expect(heading.y).toBeLessThan((await line.boundingBox()).y);
        await expect(line).toHaveAttribute('aria-label', /The dot is on 5/);
        await expect(mainAction(page)).toBeDisabled();
        // Going the wrong way doesn't finish it, and the dot is saved.
        await line.focus();
        await line.press('ArrowLeft');
        await expect(page.locator('.negative-hop:visible')).toHaveCount(1);
        await expect(page.locator('.negative-hop-count:visible')).toHaveText('−1');
        await expect(page.locator('.question-feedback.is-incorrect:visible')).toHaveText('You went left. Taking away a negative is the same as adding, so go right.');
        await page.reload({ waitUntil: 'networkidle' });
        await expect(page.locator('.negative-line--movable:visible')).toHaveAttribute('aria-label', /The dot is on 4/);
        // Once the dot has moved, the main button is Check.
        await expect(mainAction(page)).toHaveText('Check');
        await expect(mainAction(page)).toBeEnabled();
        // Dragging onto the answer clears the hint; Check then finishes it.
        const box = await page.locator('.negative-track:visible').boundingBox();
        await page.mouse.move(box.x + box.width * 14 / 20, box.y + 40);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width * 18 / 20, box.y + 40, { steps: 6 });
        await page.mouse.up();
        await expect(page.locator('.question-feedback.is-incorrect:visible')).toHaveCount(0);
        await expect(page.locator('.negative-line--solved:visible')).toHaveCount(0);
        await mainAction(page).click();
        await expect(page.locator('.negative-line--solved:visible')).toHaveCount(1);
        await expect(page.locator('.negative-hop-count:visible')).toHaveText('+3');
        await expect(page.locator('.question-feedback.is-correct:visible')).toContainText('Correct. Taking away −3 is the same as adding 3, so you moved 3 places right.');
        await expect(page.locator('.question-feedback.is-correct:visible .nn-box-sum')).toHaveText('5 − (−3) = 5 + 3 = 8');
        await expect(mainAction(page)).toBeEnabled();
        await page.reload({ waitUntil: 'networkidle' });
        await expect(page.locator('.negative-line--solved:visible')).toHaveCount(1);
        await page.screenshot({ path: `/private/tmp/negative-line-try-${width}.png`, fullPage: true });
        await context.close();
    });
}
