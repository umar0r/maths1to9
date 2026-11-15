const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { MAIN_ACTION, watchForErrors } = require('./helpers.cjs');
const solve = require('./solvers/fixtures/parts-lesson.cjs');
const fixture = require('../fixtures/parts-lesson/lesson.json');
const { numericAnswer } = solve;

const route = 'tests/fixtures/parts-lesson/';
const errorsByPage = new WeakMap();
const stageBar = page => page.getByRole('navigation', { name: 'Lesson stages' });
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

async function answerQuestion(page) {
    expect(await solve(page)).toBe(true);
    await main(page).click();
}

async function finishPractice(page, prefix, count, allowedParts, onCorrect = async () => {}) {
    const seen = new Set();
    for (let index = 1; index <= count; index++) {
        await onScreen(page, `${prefix}-${index}`);
        const card = active(page).locator('.question-card');
        const part = await card.getAttribute('data-part');
        expect(allowedParts).toContain(part);
        seen.add(part);
        expect(await solve(page)).toBe(true);
        await expect(main(page)).toHaveText('Check');
        await expect(card.locator('.question-feedback')).toBeHidden();
        await main(page).click();
        const label = prefix === 'practice' && index === count ? 'Start Check' : 'Continue';
        await expect(main(page)).toHaveText(label);
        await expect(card.locator('.question-feedback')).toHaveClass(/question-feedback--bubble.*is-correct/);
        await onCorrect(index, card);
        await main(page).click();
    }
    expect(seen).toEqual(new Set(allowedParts));
}

async function reachPears(page) {
    await finishLearn(page);
    await finishTryIt(page, ['7', '5']);
    await finishPractice(page, 'apples-practice', 3, ['apples']);
    await onScreen(page, 'pears-learn-1');
}

async function checkStageBar(page, labels) {
    const buttons = stageBar(page).getByRole('button', { includeHidden: true });
    await expect(buttons).toHaveText(labels);
    for (const button of await buttons.all()) await expect(button).toBeVisible();
    const geometry = await buttons.evaluateAll(items => ({
        pageWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
        buttons: items.map(button => {
            const { left, right, top, bottom } = button.getBoundingClientRect();
            const text = document.createRange();
            text.selectNodeContents(button);
            const label = text.getBoundingClientRect();
            return { left, right, top, bottom, labelLeft: label.left, labelRight: label.right };
        })
    }));
    expect(geometry.pageWidth).toBe(geometry.viewportWidth);
    for (const [index, button] of geometry.buttons.entries()) {
        expect(button.left).toBeGreaterThanOrEqual(0);
        expect(button.right).toBeLessThanOrEqual(geometry.viewportWidth);
        // The active label uses a slightly different font size at 375 px.
        expect(Math.abs(button.top - geometry.buttons[0].top)).toBeLessThanOrEqual(2);
        expect(Math.abs(button.bottom - geometry.buttons[0].bottom)).toBeLessThanOrEqual(2);
        expect(button.labelLeft).toBeGreaterThanOrEqual(0);
        expect(button.labelRight).toBeLessThanOrEqual(geometry.viewportWidth);
        if (index > 0) {
            const previous = geometry.buttons[index - 1];
            expect(button.left).toBeGreaterThanOrEqual(previous.right - 0.5);
            expect(button.labelLeft).toBeGreaterThan(previous.labelRight);
        }
    }
}

async function captureStageBar(page, name) {
    const directory = process.env.PARTS_SCREENSHOT_DIR;
    if (directory) await page.screenshot({ path: path.join(directory, name), animations: 'disabled' });
}

for (const width of [1280, 375]) {
    test.describe(`parts lesson ${width}px with touch`, () => {
        test.use({ viewport: { width, height: 900 }, hasTouch: true, isMobile: width === 375 });

        test.beforeEach(async ({ page }) => {
            errorsByPage.set(page, watchForErrors(page));
            await page.addInitScript(() => {
                window.sectionEvents = [];
                for (const name of ['gate', 'complete']) {
                    document.addEventListener(`maths1to9:section-${name}`, event => {
                        window.sectionEvents.push({ name, ...event.detail });
                    });
                }
            });
        });

        test.afterEach(({ page }) => {
            expect(errorsByPage.get(page), 'no browser errors during the lesson').toEqual([]);
        });

        test('all eight sections run in part order and use their own hashes', async ({ page }) => {
            await page.goto(route);
            await onScreen(page, 'apples-learn-1');

            await tapFruit(page);
            await onScreen(page, 'apples-learn-2');
            await tapFruit(page);
            await onScreen(page, 'apples-try-it-1');
            await submit(page, '7');
            await main(page).click();
            await onScreen(page, 'apples-try-it-2');
            await submit(page, '5');
            await expect(active(page).locator('.question-feedback')).toHaveClass(/question-feedback--calm/);
            await main(page).click();
            await finishPractice(page, 'apples-practice', 3, ['apples']);
            await onScreen(page, 'pears-learn-1');
            await tapFruit(page);
            await onScreen(page, 'pears-learn-2');
            await tapFruit(page);
            await onScreen(page, 'pears-try-it-1');
            await submit(page, '2');
            await main(page).click();
            await onScreen(page, 'pears-try-it-2');
            await submit(page, '4');
            await main(page).click();
            await finishPractice(page, 'pears-practice', 3, ['pears']);
            await finishPractice(page, 'practice', 4, ['apples', 'pears']);
            await onScreen(page, 'check-1');
            await expect(active(page).locator('.question-card-options button')).toHaveCount(4);
            await answerQuestion(page);
            await main(page).click();
            await onScreen(page, 'check-2');
            await expect(active(page).locator('.question-card-options button')).toHaveCount(4);
            await answerQuestion(page);
            await main(page).click();
            await onScreen(page, 'summary');
            await expect(main(page)).toHaveText('All lessons');

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
            for (let step = 0; step < 7; step++) await back(page).click();
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
            await expect(stageBar(page).getByRole('button', { name: /^Apples,/ })).toBeEnabled();
            await page.goto('about:blank');
            await page.goto(route);
            await onScreen(page, 'pears-learn-2');
            await expect(active(page).getByRole('heading')).toHaveText('Count the pears that are left');
        });

        test('Back across the join restores and locks the last Apples Practice answer', async ({ page }) => {
            await page.goto(route);
            await onScreen(page, 'apples-learn-1');
            await expect(back(page)).toBeDisabled();
            await reachPears(page);
            await expect(back(page)).toBeEnabled();
            await back(page).click();
            await onScreen(page, 'apples-practice-3');
            const prompt = await active(page).getByRole('heading').innerText();
            await expect(answer(page)).toHaveValue(numericAnswer(prompt));
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

        test('the four navigation stages fit and unlock when reached', async ({ page }) => {
            await page.goto(route);
            await onScreen(page, 'apples-learn-1');
            await checkStageBar(page, ['Apples', 'Pears', 'Mix', 'Check']);
            const stage = label => stageBar(page).getByRole('button', { name: new RegExp(`^${label},`) });
            await expect(stage('Apples')).toBeEnabled();
            for (const label of ['Pears', 'Mix', 'Check']) {
                const locked = stage(label);
                await expect(locked).toBeDisabled();
                const box = await locked.boundingBox();
                await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
                await onScreen(page, 'apples-learn-1');
            }

            await finishLearn(page);
            await finishTryIt(page, ['7', '5']);
            await expect(stage('Pears')).toBeDisabled();
            await finishPractice(page, 'apples-practice', 3, ['apples']);
            await expect(stage('Pears')).toBeEnabled();
            await finishLearn(page);
            await onScreen(page, 'pears-try-it-1');
            await expect(stage('Pears')).toHaveAttribute('aria-pressed', 'true');
            await expect(stage('Mix')).toBeDisabled();
            await expect(stage('Check')).toBeDisabled();
            await checkStageBar(page, ['Apples', 'Pears', 'Mix', 'Check']);
            await captureStageBar(page, `stage-bar-pears-try-it-${width}.png`);
            await stage('Apples').tap();
            await onScreen(page, 'apples-learn-2');
            await stage('Pears').tap();
            await onScreen(page, 'pears-learn-2');
        });

        test('Practice and Mix mark after Check and celebrate correctly through the final rocket', async ({ page, baseURL }) => {
            await page.goto(route);
            const shotDir = process.env.PARTS_SCREENSHOT_DIR;
            const capture = async name => {
                if (!shotDir) return;
                // Capture the burst midway through the live animation.
                await page.waitForTimeout(350);
                await page.screenshot({ path: path.join(shotDir, `${name}-${width}.png`) });
            };
            await finishLearn(page);
            await finishTryIt(page, ['7', '5']);
            await finishPractice(page, 'apples-practice', 3, ['apples'], async index => {
                if (index !== 1) return;
                await expect(page.locator('.celebration__piece').first()).toBeAttached();
                await capture('part-practice-confetti');
            });
            await finishLearn(page);
            await finishTryIt(page, ['2', '4']);
            await finishPractice(page, 'pears-practice', 3, ['pears']);
            await finishPractice(page, 'practice', 4, ['apples', 'pears'], async index => {
                if (index === 4) {
                    await expect(page.locator('.celebration__piece').first()).toBeAttached();
                    await capture('last-mix-start-check');
                }
            });
            await onScreen(page, 'check-1');
            await answerQuestion(page);
            await expect(page.locator('.celebration__rocket')).toBeAttached();
            await capture('check-rocket');
            await main(page).click();
            await answerQuestion(page);
            await main(page).click();
            await onScreen(page, 'summary');
            await expect(main(page)).toHaveText('All lessons');
            await main(page).click();
            await expect(page).toHaveURL(baseURL);
        });

        test('Back, replay and reload do not award the same activity twice', async ({ page }) => {
            await page.goto(route);
            await reachPears(page);
            const score = () => page.evaluate(() => window.Maths1to9Lesson.getScore());
            const apples = await score();
            expect(apples.points).toBe(65);
            expect(apples.maximumPoints).toBe(200);
            for (let step = 0; step < 7; step++) await back(page).click();
            await onScreen(page, 'apples-learn-1');
            for (let step = 0; step < 7; step++) await main(page).click();
            await onScreen(page, 'pears-learn-1');
            expect(await score()).toEqual(apples);
            await page.reload();
            await onScreen(page, 'pears-learn-1');
            expect(await score()).toEqual(apples);
        });
    });
}


test.describe('five-part stage bar at 375px with touch', () => {
    test.use({ viewport: { width: 375, height: 900 }, hasTouch: true, isMobile: true });

    test('seven stages use one row without clipping or sideways scroll', async ({ page }) => {
        const errors = watchForErrors(page);
        const lesson = structuredClone(fixture);
        for (const label of ['Plums', 'Figs', 'Grapes']) {
            const part = structuredClone(lesson.parts[0]);
            part.id = label.toLowerCase();
            part.label = label;
            part.interactive.fruit = 'apples';
            lesson.parts.push(part);
        }
        await page.route('**/tests/fixtures/parts-lesson/lesson.json', route => route.fulfill({ json: lesson }));
        await page.goto(route);
        await onScreen(page, 'apples-learn-1');
        // Leave evidence even if the existing style cannot fit all seven.
        await captureStageBar(page, 'stage-bar-seven-375.png');
        await checkStageBar(page, ['Apples', 'Pears', 'Plums', 'Figs', 'Grapes', 'Mix', 'Check']);
        const buttons = stageBar(page).getByRole('button');
        await expect(buttons.nth(0)).toBeEnabled();
        for (const button of (await buttons.all()).slice(1)) await expect(button).toBeDisabled();
        expect(errors).toEqual([]);
    });
});
