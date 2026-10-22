const { test, expect } = require('@playwright/test');
const { MAIN_ACTION, watchForErrors, screen, checkScreen } = require('./helpers.cjs');
const solve = require('./solvers/drawing-cubic-graphs.cjs');
const { read, tapPoint } = solve;
const slug = 'drawing-cubic-graphs';
const main = page => page.locator(`${MAIN_ACTION}:visible`).first();
const root = page => page.locator('.lesson-section:visible');
async function ready(page) {
    await page.waitForFunction(() => window.Cubics && window.Maths1to9Lesson);
    await root(page).locator('h3').first().waitFor();
}
async function step(page) { if (!await solve(page)) await main(page).click(); }
async function until(page, hash) {
    for (let i = 0; i < 200 && !page.url().endsWith(hash); i++) await step(page);
    await expect(page).toHaveURL(new RegExp(`${hash}$`));
}
async function reload(page) {
    const hash = new URL(page.url()).hash, label = await main(page).textContent();
    await page.reload(); await ready(page);
    await expect(page).toHaveURL(new RegExp(`${hash}$`));
    await expect(main(page)).toHaveText(label);
}
async function phoneFit(page) {
    await page.evaluate(() => document.fonts.ready);
    const board = root(page).locator('.maths-graph__board');
    const prompt = root(page).locator('.question-prompt, .cubic-plot-prompt');
    await expect.poll(async () => {
        const b = await board.boundingBox(), p = await prompt.boundingBox();
        return b.y >= 60 && b.y + b.height <= 812 && p.y >= 60 && p.y + p.height <= 812;
    }).toBe(true);
    const b = await board.boundingBox(), p = await prompt.boundingBox();
    expect(b.y).toBeGreaterThanOrEqual(60);
    expect(p.y).toBeGreaterThanOrEqual(60);
    expect(p.y + p.height).toBeLessThanOrEqual(812);
}

test.describe('cubic early phone fit', () => {
    test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
    test('drawing-cubic-graphs plotting prompt and whole board fit together', async ({ page }) => {
        const errors = watchForErrors(page);
        await page.goto(`/content/${slug}/`); await ready(page); await until(page, '#try-it-3');
        await phoneFit(page);
        await page.screenshot({ path: '/tmp/cubic-phone-fit.png' });
        expect(errors).toEqual([]);
    });
});

for (const site of ['', '/dist']) for (const phone of [false, true]) test.describe(`cubic ${site || 'PHP'} ${phone ? '375px touch' : 'desktop'}`, () => {
    test.use({ viewport: { width: phone ? 375 : 1280, height: phone ? 812 : 800 }, hasTouch: phone, isMobile: phone });
    test('drawing-cubic-graphs full correct run, every section reload and homepage', async ({ page }) => {
        test.setTimeout(180000);
        const errors = watchForErrors(page);
        await page.goto(`${site}/content/${slug}/`); await ready(page);
        let points = 0, prior = '';
        for (let i = 0; i < 220; i++) {
            points = checkScreen(await screen(page), points);
            const hash = new URL(page.url()).hash, data = await read(page);
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
            if (data.id === 'explanation') {
                const layout = root(page).locator('.cubic-layout');
                if (!phone && hash === '#learn-1') {
                    const figure = await layout.locator('.cubic-figure').boundingBox();
                    const notes = await layout.locator('.cubic-notes').boundingBox();
                    expect(figure.x + figure.width).toBeLessThan(notes.x);
                    await page.screenshot({ path: `/tmp/cubic-desktop${site ? '-dist' : ''}.png`, fullPage: true });
                }
                await expect(root(page).locator('.cubic-learn button')).toHaveCount(0);
                await expect(main(page)).toBeEnabled();
            }
            expect(await root(page).locator('.maths-graph__label').filter({ hasText: /^\(/ }).count()).toBeLessThanOrEqual(1);
            if (hash !== prior) {
                await reload(page);
                if (phone && (hash === '#try-it-3' || data.q?.input === 'custom' && data.q?.widget?.kind !== 'table')) await phoneFit(page);
                if (await page.getByRole('button', { name: 'Previous screen', exact: true }).isVisible()) {
                    await page.getByRole('button', { name: 'Previous screen', exact: true }).click();
                    await main(page).click(); await expect(page).toHaveURL(new RegExp(`${hash}$`));
                }
                prior = hash;
            }
            if ((await main(page).textContent()).trim() === 'All lessons') break;
            await step(page);
        }
        await expect(main(page)).toHaveText('All lessons');
        const score = await page.evaluate(() => Maths1to9Lesson.getScore());
        expect(score.points).toBe(score.maximumPoints);
        await reload(page); await main(page).click();
        await expect(page).toHaveURL(new RegExp(`${site}/$`));
        const titles = await page.locator('.lesson-card__title').allTextContents();
        expect(titles.map(t => t.trim())).toContain('Drawing cubic graphs');
        expect(titles.map(t => t.trim())).not.toContain('Drawing reciprocal graphs');
        expect(titles.map(t => t.trim())).not.toContain('Recognising graph types');
        expect(titles.findIndex(t => t.trim() === 'Drawing cubic graphs')).toBeGreaterThan(titles.findIndex(t => t.trim() === 'Finding the turning point'));
        expect(errors).toEqual([]);
    });
});

test.describe('cubic phone details', () => {
    test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
    test('drawing-cubic-graphs six Learn screens, immediate Next, finished pictures and reduced motion', async ({ page }) => {
        const errors = watchForErrors(page);
        await page.goto(`/content/${slug}/`); await ready(page);
        const titles = ['This is a cubic graph.', 'Each point comes from the equation.', 'A negative cubed stays negative.',
            'A table keeps it tidy.', 'Join with a smooth curve.', 'Add a number after cubing.'];
        for (let i = 0; i < 6; i++) {
            await expect(root(page).locator('h3').first()).toHaveText(titles[i]);
            await expect(root(page).locator('.cubic-learn button')).toHaveCount(0);
            await expect(main(page)).toBeEnabled();
            await page.waitForTimeout(4200);
            if (i === 1) await expect(root(page).locator('.cubic-steps p')).toHaveText(['x = 2', '2³ = 2 × 2 × 2 = 8', 'So the point is (2, 8).']);
            if (i === 2) await expect(root(page).locator('.cubic-steps p')).toHaveText(['(−2)³ = (−2) × (−2) × (−2)', '= 4 × (−2) = −8']);
            if (i === 3) await expect(root(page).locator('table tr').last()).toHaveText('y−8−1018');
            if (i === 4) {
                await expect(root(page).locator('.cubic-wrong')).toBeEmpty();
                await expect(root(page).locator('.cubic-right')).toHaveText('✓ One smooth curve through every point.');
            }
            if (i === 5) await expect(root(page).locator('.cubic-steps p')).toHaveText(['x = 2', '2³ + 1 = 8 + 1 = 9']);
            await page.screenshot({ path: `/tmp/cubic-learn-${i + 1}.png`, fullPage: true });
            if (i < 5) await main(page).click();
        }
        await reload(page);
        await expect(root(page).locator('.cubic-steps p')).toHaveCount(2);
        await page.getByRole('button', { name: 'Previous screen', exact: true }).click();
        await expect(root(page).locator('.cubic-right')).toHaveText('✓ One smooth curve through every point.');
        await page.goto(`/content/${slug}/?reduced=1`);
        // The saved visit is already instant; reset only this test profile for a fresh reduced-motion run.
        await page.evaluate(() => localStorage.clear());
        await page.emulateMedia({ reducedMotion: 'reduce' }); await page.reload(); await ready(page);
        await main(page).click(); await expect(root(page).locator('.cubic-steps p')).toHaveCount(3);
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await main(page).click(); await main(page).click();
        await expect(page).toHaveURL(/#learn-4$/);
        expect(errors).toEqual([]);
    });

    test('drawing-cubic-graphs wrong taps, guides, odd keyboard point, reload and four joins', async ({ page }) => {
        test.setTimeout(120000);
        const errors = watchForErrors(page);
        await page.goto(`/content/${slug}/`); await ready(page); await until(page, '#try-it-3');
        const dashed = () => root(page).locator('svg [stroke-dasharray]');
        // A swapped point is off this grid; its pure marking case is covered in unit tests.
        for (const [point, message] of [
            [[2, -7], 'Check the x sign.'], [[-2, 7], 'Check the y sign.'],
            [[-2, -8], 'Count carefully:'], [[3, 4], 'Start at (0, 0).']
        ]) {
            await tapPoint(page, point);
            await expect(root(page).locator('.maths-graph__description')).toContainText(message);
            expect(await dashed().count()).toBeGreaterThan(0);
        }
        await tapPoint(page, [-2, -7]); expect(await dashed().count()).toBe(0);
        await tapPoint(page, [0, -1]);
        await expect(root(page).locator('.maths-graph__description')).toContainText('Go across first');
        expect(await dashed().count()).toBeGreaterThan(0);
        await tapPoint(page, [-1, 0]); expect(await dashed().count()).toBe(0); await reload(page);
        expect((await read(page)).s.plotted).toEqual([[-2, -7], [-1, 0]]);
        const board = root(page).locator('[role="application"]');
        await board.press('ArrowUp'); await board.press('Enter');
        expect((await read(page)).s.plotted).toHaveLength(3);
        await tapPoint(page, [1, 2]); await tapPoint(page, [2, 9]);
        await until(page, '#try-it-4');
        for (const [label, message] of [
            ['Straight lines, dot to dot', "The graph doesn't have corners."],
            ['One ruler line from first to last', 'A ruler line misses'],
            ['A U-shaped curve', "That's the shape of a quadratic graph."]
        ]) {
            await root(page).getByRole('button', { name: label, exact: true }).tap();
            await expect(root(page).locator('.question-feedback')).toContainText(message);
            await expect(root(page).getByRole('button', { name: label, exact: true })).toHaveClass(/is-selected is-incorrect/);
            await page.screenshot({ animations: 'disabled', path: `/tmp/cubic-join-${label.startsWith('Straight') ? 'dots' : label.startsWith('One') ? 'ruler' : 'u'}.png`, fullPage: true });
        }
        await root(page).getByRole('button', { name: 'A smooth S-shaped curve', exact: true }).tap();
        await reload(page);
        await expect(root(page).getByRole('button', { name: 'A smooth S-shaped curve', exact: true })).toBeDisabled();
        await expect(root(page).locator('.question-feedback.is-correct')).toHaveCount(1);
        expect(errors).toEqual([]);
    });
});

test('drawing-cubic-graphs Practice plot retry, retained boxes and two extra sessions preserve points', async ({ page }) => {
    test.setTimeout(180000);
    const errors = watchForErrors(page);
    await page.goto(`/content/${slug}/`); await ready(page); await until(page, '#try-it-2');
    const cells = root(page).locator('.cubic-cell');
    for (const [i, value] of ['0', '1', '99', '9'].entries()) await cells.nth(i).fill(value);
    await main(page).click(); await reload(page);
    await expect(root(page).locator('.question-feedback')).toContainText('One box is wrong');
    await main(page).click();
    await expect(cells.nth(0)).toHaveValue('0');
    await expect(cells.nth(2)).toHaveValue('');
    await solve(page);
    await until(page, '#question-bank-question-1');
    for (let i = 0; i < 30; i++) {
        const { q } = await read(page);
        if (q?.input === 'custom' && q.widget?.kind !== 'table') break;
        await step(page);
    }
    await tapPoint(page, [3, 10]); await reload(page); await main(page).click();
    await expect(main(page)).toHaveText('Try again'); await reload(page);
    expect(await root(page).locator('svg [stroke-dasharray]').count()).toBeGreaterThan(0);
    await main(page).click(); await solve(page); await reload(page);
    await until(page, '#question-bank-question-7'); await main(page).click();
    await until(page, '#check-1');
    for (const input of await root(page).getByRole('textbox').all()) await input.fill('99');
    await main(page).click(); await reload(page); await main(page).click(); await solve(page);
    await until(page, '#summary');
    const score = await page.evaluate(() => Maths1to9Lesson.getScore());
    await page.getByRole('button', { name: /^Practice,/ }).click();
    for (let session = 2; session <= 3; session++) {
        await page.getByRole('button', { name: 'Practise again', exact: true }).click();
        await reload(page); await until(page, '#question-bank-question-7');
        expect(await page.evaluate(() => Maths1to9Lesson.getScore())).toEqual(score);
    }
    await reload(page);
    expect((await read(page)).s).toMatchObject({ session: 3 });
    expect((await read(page)).s.earlier).toHaveLength(2);
    expect(errors).toEqual([]);
});

test('drawing-cubic-graphs every wrong option and number rule shows its own feedback once', async ({ page }) => {
    await page.goto(`/content/${slug}/`); await ready(page);
    const errors = watchForErrors(page);
    const outcomes = await page.evaluate(() => {
        const Q = Cubics, E = Maths1to9LessonEngine, host = document.createElement('div');
        document.body.append(host);
        const section = { state: { cards: {} }, update(change) { change(this.state); } };
        let action, serial = 0;
        const api = { setSectionAction(id, next) { action = next; }, clearSectionAction() {}, recordAssessment() { throw new Error('Unscored fixture'); } };
        const render = config => E.createQuestion(host, { ...config, scored: false, sectionId: 'feedback-review', questionId: `feedback-${++serial}` }, section, api);
        const definitions = [...Q.examples.filter(Boolean), ...Q.checks];
        for (let seed = 0; seed < 20; seed++) for (const type of [...Q.typedTypes, ...Q.choiceTypes]) definitions.push(Q.generate({ type }, E.seededRandom(seed)));
        for (const a of [1, 2]) for (const c of [-3, 0, 1]) for (const x of [-3, -2, -1, 0, 1, 2, 3]) definitions.push(Q.prepare(Q.valueCard({ a, c }, x)));
        const results = [];
        for (const definition of definitions) {
            if (definition.input === 'custom') continue;
            if (definition.options) for (let i = 0; i < definition.options.length; i++) {
                const option = definition.options[i]; if (option.correct) continue;
                const card = render(definition);
                host.querySelectorAll('button')[i].click(); action.onClick();
                results.push({ expected: option.feedback, actual: host.querySelector('.question-feedback').textContent,
                    correct: card.result().correct, boxes: host.querySelectorAll('.question-feedback.is-visible').length });
            } else for (const rule of definition.rules) {
                const card = render(definition), input = host.querySelector('input');
                input.value = String(rule.value); input.dispatchEvent(new Event('input', { bubbles: true })); action.onClick();
                results.push({ expected: rule.feedback, actual: host.querySelector('.question-feedback').textContent,
                    correct: card.result().correct, boxes: host.querySelectorAll('.question-feedback.is-visible').length });
            }
        }
        const form = { a: 1, c: 1 };
        const right = Object.fromEntries(Q.xs.map(x => [`x${x}`, String(Q.valueOf(form, x))]));
        const tables = [
            { ...right, 'x-2': '9', 'x-1': '2' },
            Object.fromEntries(Q.xs.map(x => [`x${x}`, String(x * x + 1)])),
            { ...right, x0: '99' },
            ...[-2, -1, 1, 2].map(x => ({ ...right, [`x${x}`]: '99' })),
            Object.fromEntries(Q.xs.map(x => [`x${x}`, '99']))
        ];
        for (const values of tables) {
            const config = Q.tableCard(form), expected = config.widget.mark(values).feedback;
            const card = render(config);
            host.querySelectorAll('input').forEach((input, i) => {
                input.value = values[`x${Q.xs[i]}`]; input.dispatchEvent(new Event('input', { bubbles: true }));
            });
            action.onClick();
            results.push({ expected, actual: host.querySelector('.question-feedback').textContent,
                correct: card.result().correct, boxes: host.querySelectorAll('.question-feedback.is-visible').length });
        }
        host.remove(); return results;
    });
    expect(outcomes.length).toBeGreaterThan(300);
    for (const outcome of outcomes) {
        expect(outcome.actual).toBe(outcome.expected);
        expect(outcome.correct).toBe(false);
        expect(outcome.boxes).toBe(1);
    }
    expect(errors).toEqual([]);
});
