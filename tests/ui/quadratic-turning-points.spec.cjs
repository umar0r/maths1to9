const { test, expect } = require('@playwright/test');
const { MAIN_ACTION, watchForErrors, screen, checkScreen } = require('./helpers.cjs');
const solve = require('./solvers/quadratic-turning-points.cjs');
const { read, nudge } = solve;

const slug = 'quadratic-turning-points';
const main = page => page.locator(`${MAIN_ACTION}:visible`).first();
const root = page => page.locator('.lesson-section:visible');

async function ready(page) {
    await page.waitForFunction(() => window.Turning && window.Maths1to9Lesson);
    await root(page).locator('h3').first().waitFor();
}
async function step(page) {
    if (!await solve(page)) await main(page).click();
}
async function until(page, hash) {
    for (let i = 0; i < 200 && !page.url().endsWith(hash); i++) await step(page);
    await expect(page).toHaveURL(new RegExp(`${hash}$`));
}
async function reload(page) {
    const hash = new URL(page.url()).hash;
    const label = await main(page).textContent();
    await page.reload();
    await ready(page);
    await expect(page).toHaveURL(new RegExp(`${hash}$`));
    await expect(main(page)).toHaveText(label);
}
const noSideways = page => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

for (const site of ['', '/dist']) for (const phone of [false, true]) {
    test.describe(`quadratic-turning-points ${site || 'PHP'} ${phone ? '375px touch' : 'desktop'}`, () => {
        test.use({ viewport: { width: phone ? 375 : 1280, height: phone ? 812 : 800 }, hasTouch: phone, isMobile: phone });
        test('full correct run, reloads, back and homepage', async ({ page }) => {
            test.setTimeout(180000);
            const errors = watchForErrors(page);
            await page.goto(`${site}/content/${slug}/`);
            await ready(page);
            let points = 0, prior = '';
            for (let i = 0; i < 300; i++) {
                points = checkScreen(await screen(page), points);
                const hash = new URL(page.url()).hash;
                const data = await read(page);
                if (data.id === 'explanation') {
                    await expect(root(page).locator('.turning-learn button')).toHaveCount(0);
                    await expect(main(page)).toBeEnabled();
                }
                if (hash !== prior) {
                    await reload(page);
                    expect(await noSideways(page)).toBe(true);
                    const back = page.getByRole('button', { name: 'Previous screen', exact: true });
                    if (await back.isVisible()) {
                        await back.click();
                        await main(page).click();
                        await expect(page).toHaveURL(new RegExp(`${hash}$`));
                    }
                    prior = hash;
                }
                if ((await main(page).textContent()).trim() === 'All lessons') break;
                await step(page);
            }
            await expect(main(page)).toHaveText('All lessons');
            const score = await page.evaluate(() => Maths1to9Lesson.getScore());
            expect(score.points).toBe(score.maximumPoints);
            await reload(page);
            await main(page).click();
            await expect(page).toHaveURL(new RegExp(`${site}/$`));
            await expect(page.locator('.lesson-card__title').filter({ hasText: /^\s*Finding the turning point\s*$/ })).toBeVisible();
            expect(errors).toEqual([]);
        });
    });
}

test.describe('phone checks', () => {
    test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

    test('Learn teaches in turn with Next always available, and shows the finished screen on a revisit', async ({ page }) => {
        test.setTimeout(120000);
        const errors = watchForErrors(page);
        await page.goto(`/content/${slug}/`);
        await ready(page);
        const titles = ['Where the curve turns.', 'The lowest point is a minimum.', 'A curve that opens downwards.', 'Shape, not position.', 'Both together.'];
        const labels = [['(1, −2)'], ['(1, −2)'], ['(−2, 3)'], ['(2, −2)'], ['minimum', 'maximum']];
        const label = () => root(page).locator('.maths-graph__label').filter({ hasText: /^\(|^minimum$|^maximum$/ });
        for (let index = 0; index < titles.length; index++) {
            await expect(page).toHaveURL(new RegExp(`#learn-${index + 1}$`));
            await expect(root(page).locator('h3').first()).toHaveText(titles[index]);
            await expect(root(page).locator('.turning-learn button')).toHaveCount(0);
            await expect(main(page)).toBeEnabled();
            await page.waitForTimeout(7500);
            await expect(label()).toHaveText(labels[index].map(text => text.replace(/ /g, ' ')));
            if (index === 1) await expect(root(page).locator('.turning-steps p')).toHaveText(['x = 1', 'y = −2']);
            await page.screenshot({ path: `/tmp/turning-learn-${index + 1}.png`, fullPage: true });
            if (index < titles.length - 1) await main(page).click();
        }
        await expect(main(page)).toHaveText('Continue');
        await page.getByRole('button', { name: 'Previous screen', exact: true }).click();
        await page.reload();
        await ready(page);
        await expect(label()).toHaveText(['(2, −2)']);
        expect(errors).toEqual([]);
    });

    test('Next works mid-animation and reduced motion shows everything at once', async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        const errors = watchForErrors(page);
        await page.goto(`/content/${slug}/`);
        await ready(page);
        await expect(root(page).locator('.maths-graph__label').filter({ hasText: /^\(/ })).toHaveCount(1);
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await main(page).click();
        await main(page).click();
        await expect(page).toHaveURL(/#learn-3$/);
        expect(errors).toEqual([]);
    });

    test('Try it: the dot slides by keyboard and keeps its place on reload; wrong then right answers', async ({ page }) => {
        test.setTimeout(120000);
        const errors = watchForErrors(page);
        await page.goto(`/content/${slug}/`);
        await ready(page);
        await until(page, '#try-it-1');
        await expect(main(page)).toBeDisabled();
        for (let i = 0; i < 4; i++) await nudge(page);
        await expect(root(page).locator('.turning-status')).toHaveText('Going down.');
        const before = (await read(page)).s.dot;
        await page.reload();
        await ready(page);
        expect((await read(page)).s.dot).toEqual(before);
        for (let i = 0; i < 30 && !(await read(page)).s.found; i++) await nudge(page);
        await expect(root(page).locator('.turning-status')).toContainText('This is the turning point.');
        await expect(main(page)).toBeEnabled();
        await main(page).click();
        await expect(page).toHaveURL(/#try-it-2$/);
        await root(page).locator('.question-card input').fill('1');
        await main(page).click();
        await expect(root(page).locator('.question-feedback.is-visible')).toHaveText('Left of 0 is negative: the x-coordinate is −1.');
        await reload(page);
        await main(page).click();
        await root(page).locator('.question-card input').fill('-1');
        await main(page).click();
        await expect(root(page).locator('svg [stroke-dasharray]')).toHaveCount(1);
        await until(page, '#try-it-7');
        await expect(root(page).locator('.turning-retained')).toHaveCount(5);
        expect(errors).toEqual([]);
    });

    test('a wrong Practice answer then the right one, and Practise again keeps the score', async ({ page }) => {
        test.setTimeout(180000);
        const errors = watchForErrors(page);
        await page.goto(`/content/${slug}/`);
        await ready(page);
        await until(page, '#question-bank-question-1');
        const inputs = root(page).locator('.question-card input');
        await inputs.nth(0).fill('9');
        await inputs.nth(1).fill('9');
        await main(page).click();
        await expect(main(page)).toHaveText('Try again');
        await reload(page);
        await main(page).click();
        await solve(page);
        await until(page, '#check-1');
        await until(page, '#summary');
        const score = await page.evaluate(() => Maths1to9Lesson.getScore());
        await page.getByRole('button', { name: /^Practice,/ }).click();
        await page.getByRole('button', { name: 'Practise again', exact: true }).click();
        await reload(page);
        await until(page, '#question-bank-question-6');
        expect(await page.evaluate(() => Maths1to9Lesson.getScore())).toEqual(score);
        expect(errors).toEqual([]);
    });
});

test('every generated wrong option and typed feedback rule shows its own feedback in one box', async ({ page }) => {
    await page.goto(`/content/${slug}/`);
    await ready(page);
    const errors = watchForErrors(page);
    const results = await page.evaluate(() => {
        const T = Turning, E = Maths1to9LessonEngine, host = document.createElement('div');
        document.body.append(host);
        const section = { state: { cards: {} }, update(change) { change(this.state); } };
        let action, serial = 0;
        const api = { setSectionAction(id, next) { action = next; }, clearSectionAction() {}, recordAssessment() { throw new Error('Unscored feedback check'); } };
        const render = config => E.createQuestion(host, { ...config, scored: false, sectionId: 'feedback-review', questionId: `feedback-${++serial}` }, section, api);
        const definitions = [...T.examples.filter(Boolean), ...T.checks];
        for (let seed = 0; seed < 30; seed++) for (const type of [...T.typedTypes, ...T.choiceTypes]) {
            definitions.push(T.generate({ type, trap: seed % 3 === 0 }, E.seededRandom(seed)));
        }
        const outcomes = [];
        for (const definition of definitions) {
            if (definition.options) definition.options.forEach((option, i) => {
                if (option.correct) return;
                const card = render(definition);
                [...host.querySelectorAll('button')].find(button => button.textContent.trim() === option.label.replace(/\u00a0/g, ' ') || button.textContent.trim() === option.label).click();
                action.onClick();
                outcomes.push({ expected: option.feedback, actual: host.querySelector('.question-feedback').textContent,
                    correct: card.result().correct, boxes: host.querySelectorAll('.question-feedback.is-visible').length });
            });
            else for (const rule of definition.rules) {
                const values = definition.fields ? definition.fields.map(f => String(rule.value[f.id] ?? 99)) : [String(rule.value)];
                const first = definition.fields
                    ? definition.rules.find(r => Object.entries(r.value).every(([id, v]) => Number(values[definition.fields.findIndex(f => f.id === id)]) === Number(v)))
                    : rule;
                const card = render(definition);
                host.querySelectorAll('input').forEach((input, i) => { input.value = values[i]; input.dispatchEvent(new Event('input', { bubbles: true })); });
                action.onClick();
                outcomes.push({ expected: first.feedback, actual: host.querySelector('.question-feedback').textContent,
                    correct: card.result().correct, boxes: host.querySelectorAll('.question-feedback.is-visible').length });
            }
        }
        host.remove();
        return outcomes;
    });
    expect(results.length).toBeGreaterThan(150);
    for (const result of results) {
        expect(result.actual).toBe(result.expected);
        expect(result.correct).toBe(false);
        expect(result.boxes).toBe(1);
    }
    expect(errors).toEqual([]);
});
