const { test, expect } = require('@playwright/test');
const solve = require('./solvers/pie-charts.cjs');
const { MAIN_ACTION, watchForErrors } = require('./helpers.cjs');

const score = page => page.evaluate(() => window.Maths1to9Lesson.getScore().points);
const mainAction = page => page.locator(`${MAIN_ACTION}:visible`);
const back = page => page.getByRole('button', { name: 'Previous screen', exact: true });
const prompt = page => page.locator('.question-prompt:visible');
const drawing = page => page.locator('.question-card:visible .pie-drawing-widget');

async function dragHandle(page, from, to) {
    const svg = drawing(page).locator('.pie-drawing-svg');
    await svg.scrollIntoViewIfNeeded();
    const box = await svg.boundingBox();
    const at = angle => ({
        x: box.x + (170 + 112 * Math.sin(angle * Math.PI / 180)) / 340 * box.width,
        y: box.y + (170 - 112 * Math.cos(angle * Math.PI / 180)) / 340 * box.height
    });
    const start = at(from), end = at(to);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 12 });
    await page.mouse.up();
}

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
    test.describe(`pie-charts ${width}px with touch`, () => {
        test.use({ viewport: { width, height: 900 }, hasTouch: true });
        test('new work survives retries, reloads, Back and two more Practice sessions', async ({ page }) => {
            test.setTimeout(180_000);
            const errors = watchForErrors(page);
            await page.goto('content/pie-charts/', { waitUntil: 'networkidle' });
            await expect(prompt(page)).toHaveCount(0);
            await expect(page.getByText('A pie chart shows a group as slices of a circle. A sector is one slice of the pie.', { exact: true })).toBeVisible();
            const tested = new Set();
            let penalty = 0;
            const visited = new Set();
            for (let step = 0; step < 160; step++) {
                const url = page.url();
                if (!visited.has(url)) {
                    await goBackAndForward(page);
                    visited.add(url);
                }
                expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
                const button = mainAction(page);
                if (await button.innerText() === 'All lessons') break;
                if (await prompt(page).count() && await button.innerText() === 'Check') {
                    const section = await page.evaluate(() => window.Maths1to9Lesson.getCurrentSection().id);
                    const options = page.locator('.question-card-options:visible button');
                    const kind = await options.count() ? 'choice' : await page.locator('.pie-drawing-widget:visible').count() ? 'custom' : 'number';
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
                        } else if (kind === 'custom') {
                            const data = await solve.readTable(page);
                            const total = data.reduce((sum, row) => sum + row.count, 0);
                            const wrong = data.map(row => row.count * 360 / total);
                            wrong[0]++; wrong[1]--;
                            await solve.fillChart(page, wrong);
                            await reload(page);
                            await expect(drawing(page).getByLabel(`${data[0].name} angle (°)`, { exact: true })).toHaveValue(String(wrong[0]));
                            await button.click();
                            await expect(button).toHaveText('Try again');
                            const feedback = await page.locator('.question-feedback:visible').innerText();
                            await reload(page);
                            await expect(page.locator('.question-feedback:visible')).toHaveText(feedback);
                            await expect(drawing(page).getByLabel(`${data[0].name} angle (°)`, { exact: true })).toBeDisabled();
                            await button.click();
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
                await expect(button).toBeEnabled();
                await button.click();
            }
            await expect(mainAction(page)).toHaveText('All lessons');
            const earned = await score(page);
            expect(penalty).toBe(50);
            expect(earned).toBe(205 - penalty);
            await reload(page); // finished
            expect(await score(page)).toBe(earned);
            await expect(page.locator('#pie-charts-comparison .retained-results')).toContainText('2nd try');
            await goBackAndForward(page);
            await mainAction(page).click();
            await expect(page).toHaveURL(/\/$/);
            expect((await page.request.get(page.url())).ok()).toBe(true);
            await page.goto('content/pie-charts/', { waitUntil: 'networkidle' });
            await page.locator('.lesson-navigation__button[data-stage-index="2"]').click();
            const evidenceBefore = await page.evaluate(() => window.Maths1to9Progress.getSkillProgress('construct-pie-charts'));
            for (let session = 0; session < 2; session++) {
                await page.getByRole('button', { name: 'Practise again', exact: true }).click();
                await reload(page);
                await finishQuestions(page);
                expect(await score(page)).toBe(earned);
            }
            await expect(page.getByText('Earlier practice 1', { exact: true })).toBeVisible();
            await expect(page.getByText('Earlier practice 2', { exact: true })).toBeVisible();
            expect(await page.evaluate(() => window.Maths1to9Lesson.getProgress().finished)).toBe(true);
            const evidenceAfter = await page.evaluate(() => window.Maths1to9Progress.getSkillProgress('construct-pie-charts'));
            expect(evidenceAfter).not.toEqual(evidenceBefore);
            expect(errors).toEqual([]);
            await page.screenshot({ path: `/private/tmp/pie-charts-${width}.png`, fullPage: true });
        });
    });
}

test('pie-charts: built static lesson finishes and All lessons reaches its homepage', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('dist/content/pie-charts/', { waitUntil: 'networkidle' });
    for (let step = 0; step < 100; step++) {
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
    test(`pie-charts ${width}px: drawing works by drag, typing and keyboard and retains every phase`, async ({ browser }) => {
        test.setTimeout(120_000);
        const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: true });
        const page = await context.newPage();
        const errors = watchForErrors(page);
        await page.goto('content/pie-charts/', { waitUntil: 'networkidle' });
        await expect(prompt(page)).toHaveCount(0);
        await expect(page.locator('.pie-people:visible span')).toHaveCount(12);
        await page.screenshot({ path: `/private/tmp/pie-learn-total-${width}.png`, fullPage: true });
        for (let index = 1; index < 7; index++) {
            await mainAction(page).click();
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
            if (index === 2) {
                for (const line of ['360° ÷ 12 pupils = 30° for each pupil', 'Blue: 3 × 30° = 90°', 'Green: 9 × 30° = 270°', 'Both ways give the same angle.']) {
                    await expect(page.getByText(line, { exact: true })).toBeVisible();
                }
            }
            if (index === 2 || index === 4) await page.screenshot({ path: `/private/tmp/pie-learn-${index + 1}-${width}.png`, fullPage: true });
        }
        await mainAction(page).click();
        for (let step = 0; step < 20; step++) {
            if (await page.locator('.pie-drawing-widget:visible').count()) break;
            if (await solve(page)) continue;
            await mainAction(page).click();
        }
        await expect(page.getByRole('heading', { name: 'Step 5 of 7', exact: true })).toBeVisible();
        await expect(mainAction(page)).toBeDisabled();
        const svg = page.locator('.pie-drawing-svg:visible');
        for (const path of await svg.locator('path').all()) await expect(path).toHaveAttribute('d', '');
        await svg.scrollIntoViewIfNeeded();
        await page.screenshot({ path: `/private/tmp/pie-widget-empty-${width}.png`, fullPage: true });
        await dragHandle(page, 0, 90);
        await expect(drawing(page).getByLabel('Blue angle (°)', { exact: true })).toHaveValue('90');
        await expect(mainAction(page)).toBeDisabled(); // other angles are still blank
        await reload(page);
        await expect(drawing(page).getByLabel('Blue angle (°)', { exact: true })).toHaveValue('90');
        const handle = drawing(page).getByRole('slider', { name: 'Blue slice angle', exact: true });
        await handle.focus();
        await handle.press('ArrowRight');
        await expect(handle).toBeFocused();
        await expect(drawing(page).getByLabel('Blue angle (°)', { exact: true })).toHaveValue('91');
        await handle.press('ArrowLeft');
        await handle.press('Shift+ArrowRight');
        await expect(drawing(page).getByLabel('Blue angle (°)', { exact: true })).toHaveValue('100');
        await handle.press('Shift+ArrowLeft');
        await expect(drawing(page).getByLabel('Blue angle (°)', { exact: true })).toHaveValue('90');
        await dragHandle(page, 90, 180);
        await expect(drawing(page).getByLabel('Blue angle (°)', { exact: true })).toHaveValue('180');
        await drawing(page).getByLabel('Slice to change', { exact: true }).selectOption('1');
        await dragHandle(page, 180, 270);
        await expect(drawing(page).getByLabel('Green angle (°)', { exact: true })).toHaveValue('90');
        await drawing(page).getByLabel('Slice to change', { exact: true }).selectOption('2');
        await dragHandle(page, 270, 360);
        await expect(drawing(page).getByLabel('Red angle (°)', { exact: true })).toHaveValue('90');
        await drawing(page).getByLabel('Slice to change', { exact: true }).selectOption('1');
        await drawing(page).getByRole('slider', { name: 'Green slice angle', exact: true }).press('Home');
        await expect(drawing(page).getByLabel('Green angle (°)', { exact: true })).toHaveValue('0');
        await reload(page);
        await expect(drawing(page).getByLabel('Slice to change', { exact: true })).toHaveValue('1');
        await solve.fillChart(page, [180, 80, 100]); // still 360, but two slices are wrong
        await mainAction(page).click();
        await expect(mainAction(page)).toHaveText('Try again');
        await expect(page.locator('.question-feedback:visible')).toContainText('Green');
        await expect(drawing(page).getByLabel('Green angle (°)', { exact: true })).toHaveAttribute('aria-invalid', 'true');
        await reload(page);
        await expect(drawing(page).getByLabel('Green angle (°)', { exact: true })).toHaveValue('80');
        await expect(drawing(page).getByLabel('Green angle (°)', { exact: true })).toBeDisabled();
        await mainAction(page).click();
        await expect(drawing(page).getByLabel('Blue angle (°)', { exact: true })).toHaveValue('');
        await solve.fillChart(page);
        await mainAction(page).click();
        await expect(mainAction(page)).toHaveText('Continue');
        await reload(page);
        await expect(drawing(page).getByLabel('Blue angle (°)', { exact: true })).toHaveValue('180');
        await expect(drawing(page).getByLabel('Green angle (°)', { exact: true })).toHaveValue('90');
        await expect(drawing(page).getByLabel('Red angle (°)', { exact: true })).toHaveValue('90');
        await expect(page.locator('.pie-angle-sum:visible')).toHaveText('Total of angles entered: 360°');
        await page.screenshot({ path: `/private/tmp/pie-widget-complete-${width}.png`, fullPage: true });
        await mainAction(page).click();
        for (let step = 0; step < 12; step++) {
            if (await page.getByRole('heading', { name: 'Your completed work', exact: true }).isVisible()) break;
            if (await solve(page)) continue;
            await mainAction(page).click();
        }
        await expect(page.getByRole('heading', { name: 'Your completed work', exact: true })).toBeVisible();
        await expect(page.locator('.pie-drawing-widget:visible')).toHaveCount(1);
        await goBackAndForward(page);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        expect(errors).toEqual([]);
        await context.close();
    });
}

for (const path of ['', 'dist/']) {
    test(`pie-charts: ${path || 'PHP'} homepage lists the lesson in Statistics`, async ({ page }) => {
        await page.goto(path || './', { waitUntil: 'networkidle' });
        const statistics = page.locator('#statistics');
        await expect(statistics.getByRole('heading', { name: 'Statistics', exact: true })).toBeVisible();
        const link = statistics.locator('a.lesson-card[href="content/pie-charts/"]');
        await expect(link).toContainText('Pie charts');
        await expect(link).toContainText('Draw a pie chart from a table, and read numbers from one.');
        await expect(link).toHaveAttribute('data-skills', 'construct-pie-charts,interpret-pie-charts');
        await link.click();
        await expect(page).toHaveURL(/content\/pie-charts\/#learn-1$/);
        await expect(page.getByRole('heading', { name: 'Find the total', exact: true })).toBeVisible();
    });
}
