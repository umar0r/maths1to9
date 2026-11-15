const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { MAIN_ACTION } = require('./helpers.cjs');

const route = 'tests/fixtures/parts-lesson/';
const active = page => page.locator('.lesson-section:visible');
const main = page => page.locator(`${MAIN_ACTION}:visible`);
const back = page => page.getByRole('button', { name: 'Previous screen' });
const reset = page => page.getByRole('button', { name: 'Reset card' });
const answer = page => active(page).getByRole('textbox', { name: 'Your answer' });
const onScreen = (page, hash) => expect(page).toHaveURL(new RegExp(`#${hash}$`));

async function tapFruit(page) {
    await active(page).getByRole('button', { name: /^(Add|Take away) / }).click();
    await main(page).click();
}

async function finishLearn(page) {
    await tapFruit(page);
    await tapFruit(page);
}

async function submit(page, value) {
    await answer(page).fill(value);
    await main(page).click();
    await expect(answer(page)).toBeDisabled();
}

async function finishTryIt(page, values) {
    for (const value of values) {
        await submit(page, value);
        await main(page).click();
    }
}

async function reachPears(page) {
    await finishLearn(page);
    await finishTryIt(page, ['7', '5']);
    await onScreen(page, 'pears-learn-1');
}

for (const width of [1280, 375]) {
    test.describe(`parts lesson ${width}px with touch`, () => {
        test.use({ viewport: { width, height: 900 }, hasTouch: true, isMobile: width === 375 });

        test.beforeEach(async ({ page }) => {
            await page.addInitScript(() => {
                window.sectionEvents = [];
                for (const name of ['gate', 'complete']) {
                    document.addEventListener(`maths1to9:section-${name}`, event => {
                        window.sectionEvents.push({ name, ...event.detail });
                    });
                }
            });
        });

        test('Learn and Try it run in part order, followed by Check', async ({ page }) => {
            await page.goto(route);
            await onScreen(page, 'apples-learn-1');
            const shots = process.env.PARTS_SCREENSHOT_DIR;
            if (shots) await page.screenshot({ path: path.join(shots, `apples-learn-1-${width}.png`), animations: 'disabled' });

            await tapFruit(page);
            await onScreen(page, 'apples-learn-2');
            await tapFruit(page);
            await onScreen(page, 'apples-try-it-1');
            await submit(page, '7');
            await main(page).click();
            await onScreen(page, 'apples-try-it-2');
            await submit(page, '5');
            await main(page).click();
            await onScreen(page, 'pears-learn-1');
            await tapFruit(page);
            await onScreen(page, 'pears-learn-2');
            await tapFruit(page);
            await onScreen(page, 'pears-try-it-1');
            if (shots) await page.screenshot({ path: path.join(shots, `pears-try-it-1-${width}.png`), animations: 'disabled' });
            await submit(page, '2');
            await main(page).click();
            await onScreen(page, 'pears-try-it-2');
            await submit(page, '4');
            await main(page).click();
            await onScreen(page, 'check-1');
            await expect(active(page).getByRole('heading', { name: 'Check' })).toBeVisible();

            const details = await page.evaluate(() => ({
                section: window.Maths1to9Lesson.getSection('interactive--pears'),
                events: window.sectionEvents
            }));
            expect(details.section).toEqual({
                id: 'interactive--pears', kind: 'interactive', part: 'pears',
                config: { hide_eyebrow: true, hide_heading: true }
            });
            for (const name of ['gate', 'complete']) {
                expect(details.events).toContainEqual({ name, sectionId: 'interactive--pears', kind: 'interactive', part: 'pears' });
            }
        });

        test('the two Try it sections restore answers independently', async ({ page }) => {
            await page.goto(route);
            await reachPears(page);
            await finishLearn(page);
            await submit(page, '2');
            await page.reload();
            await onScreen(page, 'pears-try-it-1');
            await expect(answer(page)).toHaveValue('2');
            for (let step = 0; step < 4; step++) await back(page).click();
            await onScreen(page, 'apples-try-it-1');
            await expect(answer(page)).toHaveValue('7');

            await page.goto(`${route}#pears-try-it-1`);
            await onScreen(page, 'pears-try-it-1');
            await expect(answer(page)).toHaveValue('2');
            const saves = await page.evaluate(async () => {
                const get = key => window.Maths1to9Progress.getLessonActivityState('parts-lesson', key);
                return [(await get('interactive:apples')).data.cards['example-1'].value,
                    (await get('interactive:pears')).data.cards['example-1'].value];
            });
            expect(saves).toEqual(['7', '2']);
        });

        test('reload and opening the lesson again resume Pears Learn screen 2', async ({ page }) => {
            await page.goto(route);
            await reachPears(page);
            await tapFruit(page);
            await onScreen(page, 'pears-learn-2');
            await page.reload();
            await onScreen(page, 'pears-learn-2');
            await expect(active(page).getByRole('heading')).toHaveText('Count the pears that are left');
            await expect(page.getByRole('button', { name: /Apples Learn/ })).toBeEnabled();
            await page.goto('about:blank');
            await page.goto(route);
            await onScreen(page, 'pears-learn-2');
            await expect(active(page).getByRole('heading')).toHaveText('Count the pears that are left');
        });

        test('Back across the join restores the last Apples Try it answer', async ({ page }) => {
            await page.goto(route);
            await onScreen(page, 'apples-learn-1');
            await expect(back(page)).toBeDisabled();
            await reachPears(page);
            await expect(back(page)).toBeEnabled();
            await back(page).click();
            await onScreen(page, 'apples-try-it-2');
            await expect(answer(page)).toHaveValue('5');
            await expect(answer(page)).toBeDisabled();
            await expect(back(page)).toBeEnabled();
        });

        test('Reset changes only the visible Pears Try it card', async ({ page }) => {
            await page.goto(route);
            await reachPears(page);
            await finishLearn(page);
            await submit(page, '2');
            await main(page).click();
            await answer(page).fill('4');
            await back(page).click();
            await onScreen(page, 'pears-try-it-1');
            await reset(page).click();
            await expect(answer(page)).toHaveValue('');
            await expect(answer(page)).toBeEnabled();
            await page.goto(`${route}#pears-try-it-2`);
            await onScreen(page, 'pears-try-it-2');
            await expect(answer(page)).toHaveValue('4');
            await page.goto(`${route}#apples-try-it-1`);
            await onScreen(page, 'apples-try-it-1');
            await expect(answer(page)).toHaveValue('7');
        });

        test('deep links to Pears Try it respect section locks', async ({ page }) => {
            await page.goto(`${route}#pears-try-it-1`);
            await onScreen(page, 'apples-learn-1');
            await expect(active(page).getByRole('heading')).toHaveText('Adding puts groups together');
            await reachPears(page);
            await page.goto(`${route}#pears-try-it-1`);
            await onScreen(page, 'pears-learn-1');
            await finishLearn(page);
            await onScreen(page, 'pears-try-it-1');
            await page.goto(`${route}#apples-learn-1`);
            await onScreen(page, 'apples-learn-1');
            await page.goto(`${route}#pears-try-it-1`);
            await onScreen(page, 'pears-try-it-1');
            await expect(active(page).getByRole('heading')).toHaveText('How many pears are left? 5 − 3');
        });
    });
}
