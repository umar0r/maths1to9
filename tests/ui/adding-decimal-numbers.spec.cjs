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
                const slots = page.locator('.decimal-tap-slot:visible');
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
                        for (const slot of await page.locator('.decimal-tap-slot:visible').all()) await expect(slot).toBeDisabled();
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
            expect(earned).toBe(175 - penalty);
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
