const { test, expect } = require('@playwright/test');
const { MAIN_ACTION, watchForErrors, screen, checkScreen } = require('./helpers.cjs');
const solve = require('./solvers/simultaneous-equations-graphs.cjs');
const { read, tap } = solve;

const slug = 'simultaneous-equations-graphs';
const main = page => page.locator(`${MAIN_ACTION}:visible`).first();
const root = page => page.locator('.lesson-section:visible');

async function ready(page) {
    await page.waitForFunction(() => window.Simultaneous && window.Maths1to9Lesson);
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
    test.describe(`simultaneous-equations-graphs ${site || 'PHP'} ${phone ? '375px touch' : 'desktop'}`, () => {
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
                    await expect(root(page).locator('.simultaneous-learn button')).toHaveCount(0);
                    await expect(main(page)).toBeEnabled();
                    const layout = await root(page).locator('.simultaneous-layout').evaluate(el => {
                        const a = el.children[0].getBoundingClientRect(), b = el.children[1].getBoundingClientRect();
                        return { graphRight: a.right, notesLeft: b.left, graphBottom: a.bottom, notesTop: b.top };
                    });
                    if (phone) expect(layout.graphBottom).toBeLessThanOrEqual(layout.notesTop + 1);
                    else expect(layout.graphRight).toBeLessThan(layout.notesLeft);
                }
                if (data.id === 'interactive' && data.s.screen > 0 && data.s.screen < 5 && !phone) {
                    const layout = await root(page).locator('.question-card').evaluate(el => {
                        const graph = el.children[1].getBoundingClientRect(), prompt = el.children[0].getBoundingClientRect();
                        return { graphRight: graph.right, promptLeft: prompt.left };
                    });
                    expect(layout.graphRight).toBeLessThan(layout.promptLeft);
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
            await expect(page.locator('.lesson-card__title').filter({ hasText: /^\s*Solving simultaneous equations using graphs\s*$/ })).toBeVisible();
            expect(errors).toEqual([]);
        });
    });
}

test.describe('simultaneous-equations-graphs phone checks', () => {
    test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
    test('six Learn pictures, animation, Next, reload and reduced motion', async ({ page }) => {
        test.setTimeout(90000);
        const errors = watchForErrors(page);
        await page.goto(`/content/${slug}/`);
        await ready(page);
        const titles = ['One equation, lots of answers.', 'Two equations at once.', 'Where the lines cross.', 'It works in both.', 'The method.', 'Between grid lines.'];
        const work = [3, 2, 2, 2, 4, 3];
        for (let i = 0; i < 6; i++) {
            await expect(root(page).locator('h3').first()).toHaveText(titles[i]);
            await expect(root(page).locator('.simultaneous-learn button')).toHaveCount(0);
            await expect(main(page)).toBeEnabled();
            await expect(root(page).locator('.simultaneous-steps p')).toHaveCount(work[i]);
            await expect(root(page).locator('.simultaneous-key__line')).toHaveCount(i === 0 ? 1 : 2);
            await expect(root(page).locator('.maths-graph__label').filter({ hasText: /^\(/ })).toHaveCount(i === 5 ? 0 : 1);
            await expect(root(page).locator('svg [stroke-dasharray]')).toHaveCount(i >= 2 ? 2 : 0);
            if (i === 5) {
                await expect(root(page).locator('.maths-graph__label').filter({ hasText: /^\(/ })).toHaveCount(0);
                // The point is at the fractional crossing, not the nearest grid point.
                const position = await root(page).locator('svg circle, svg ellipse').evaluateAll(c => c.filter(e => e.getAttribute('fill') !== 'none').map(e => ({ x: +e.getAttribute('cx'), y: +e.getAttribute('cy') })));
                expect(position.length).toBeGreaterThan(0);
                const box = await root(page).locator('[role="application"]').boundingBox();
                expect(position.some(p => Math.abs(p.x / box.width - (4 / 3 + 4.8) / 9.6) < 0.01 && Math.abs(p.y / box.height - (6.8 - 8 / 3) / 11.6) < 0.01)).toBe(true);
            }
            expect(await noSideways(page)).toBe(true);
            await page.locator('.site-logo').scrollIntoViewIfNeeded();
            await page.screenshot({ path: `/tmp/simultaneous-learn-${i + 1}.png`, fullPage: true });
            await reload(page);
            await expect(root(page).locator('.simultaneous-steps p')).toHaveCount(work[i]);
            if (i < 5) await main(page).click();
        }
        await page.getByRole('button', { name: 'Previous screen', exact: true }).click();
        await expect(root(page).locator('.simultaneous-steps p')).toHaveCount(4);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.reload();
        await ready(page);
        await expect(root(page).locator('.simultaneous-steps p')).toHaveCount(4);
        expect(errors).toEqual([]);
    });
    test('Next works mid-animation and reduced motion completes unseen screens immediately', async ({ page }) => {
        await page.goto(`/content/${slug}/`);
        await ready(page);
        await expect(main(page)).toBeEnabled();
        await main(page).click();
        await main(page).click();
        await expect(page).toHaveURL(/#learn-3$/);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await main(page).click();
        await expect(root(page).locator('.simultaneous-steps p')).toHaveCount(2);
    });
    test('Try it taps: each wrong point, reload, right point; keyboard picker too', async ({ page }) => {
        test.setTimeout(120000);
        const errors = watchForErrors(page);
        await page.goto(`/content/${slug}/`);
        await ready(page);
        await until(page, '#try-it-1');
        for (const [point, text] of [[[0, 7], 'on y = 2x + 7 only'], [[0, 4], 'on y = −x + 4 only'], [[1, 1], "isn't on either line"]]) {
            await tap(page, point);
            await expect(root(page).locator('.simultaneous-status')).toContainText(text);
            await expect(main(page)).toBeDisabled();
            await reload(page);
            expect((await read(page)).s.tap).toEqual(point);
        }
        // Reload with a wrong tap, then use the shared keyboard crosshair from (0, 0).
        const board = root(page).locator('[role="application"]');
        await board.focus();
        await board.press('ArrowLeft');
        for (let i = 0; i < 5; i++) await board.press('ArrowUp');
        await board.press('Enter');
        await expect(root(page).locator('.simultaneous-status')).toHaveText('✓ Both lines go through this point.');
        await expect(main(page)).toBeEnabled();
        await reload(page);
        expect((await read(page)).s.found).toBe(true);
        await main(page).click();
        await until(page, '#try-it-5');
        const inputs = root(page).locator('.question-card input');
        await inputs.nth(0).fill('-1'); await inputs.nth(1).fill('2');
        await main(page).click();
        await expect(root(page).locator('.question-feedback.is-visible')).toHaveText('Write x first, then y: x = 2, y = −1.');
        await expect(root(page).locator('svg [stroke-dasharray]')).toHaveCount(2);
        await reload(page);
        await expect(root(page).locator('svg [stroke-dasharray]')).toHaveCount(2);
        await expect(root(page).locator('.maths-graph__label').filter({ hasText: /^\(/ })).toHaveCount(0);
        await main(page).click();
        await solve(page);
        await until(page, '#try-it-6');
        await expect(root(page).locator('.simultaneous-retained')).toHaveCount(5);
        expect(errors).toEqual([]);
    });
    test('tap the right point, wrong then right Practice, practise again twice and reload without changing points', async ({ page }) => {
        test.setTimeout(180000);
        const errors = watchForErrors(page);
        await page.goto(`/content/${slug}/`);
        await ready(page);
        await until(page, '#try-it-1');
        await tap(page, [-1, 5]);
        await expect(main(page)).toBeEnabled();
        await until(page, '#question-bank-question-1');
        const inputs = root(page).locator('.question-card input');
        await inputs.nth(0).fill('9'); await inputs.nth(1).fill('9');
        await main(page).click();
        await expect(main(page)).toHaveText('Try again');
        await reload(page);
        await main(page).click();
        await solve(page);
        await until(page, '#summary');
        const score = await page.evaluate(() => Maths1to9Lesson.getScore());
        await page.getByRole('button', { name: /^Practice,/ }).click();
        for (let session = 2; session <= 3; session++) {
            await page.getByRole('button', { name: 'Practise again', exact: true }).click();
            await reload(page);
            await until(page, '#question-bank-question-7');
            expect((await read(page)).s.session).toBe(session);
            expect(await page.evaluate(() => Maths1to9Lesson.getScore())).toEqual(score);
        }
        await reload(page);
        expect(await page.evaluate(() => Maths1to9Lesson.getScore())).toEqual(score);
        expect(errors).toEqual([]);
    });
});

test('simultaneous-equations-graphs every wrong option and rule displays its own feedback once', async ({ page }) => {
    test.setTimeout(180000);
    const errors = watchForErrors(page);
    await page.goto(`/content/${slug}/`);
    await ready(page);
    const cases = await page.evaluate(() => {
        const T = Simultaneous, E = Maths1to9LessonEngine;
        const definitions = [...T.examples.filter(Boolean), ...T.checks];
        for (let seed = 0; seed < 3; seed++) {
            for (const item of T.pick(E.seededRandom(seed))) definitions.push(T.generate(item, E.seededRandom(item.seed)));
        }
        const tests = [];
        definitions.forEach((definition, index) => {
            (definition.options || []).forEach((option, selected) => {
                if (!option.correct) tests.push({ index, selected, expected: option.feedback });
            });
            (definition.rules || []).forEach(rule => {
                const value = definition.fields
                    ? Object.fromEntries(definition.fields.map(f => [f.id, String(rule.value[f.id] ?? 99)])) : String(rule.value);
                const first = definition.fields ? definition.rules.find(r => Object.entries(r.value).every(([id, v]) => +value[id] === +v)) : rule;
                tests.push({ index, value, expected: first.feedback });
            });
        });
        const host = document.createElement('div'); host.id = 'feedback-fixture';
        document.body.append(host);
        const button = document.createElement('button'); button.id = 'feedback-main'; button.textContent = 'Check fixture';
        document.body.append(button);
        let action, serial = 0;
        button.onclick = () => action.onClick();
        const section = { state: { cards: {} }, update(change) { change(this.state); } };
        window.feedbackFixture = index => E.createQuestion(host, { ...definitions[index], figure: undefined,
            scored: false, sectionId: 'feedback-review', questionId: `feedback-${++serial}` }, section,
        { setSectionAction(id, next) { action = next; }, clearSectionAction() {}, recordAssessment() { throw Error('Unscored fixture'); } });
        return tests;
    });
    for (const item of cases) {
        await page.evaluate(index => window.feedbackFixture(index), item.index);
        const host = page.locator('#feedback-fixture');
        if ('selected' in item) await host.locator('button').nth(item.selected).click();
        else {
            const values = typeof item.value === 'object' ? Object.values(item.value) : [item.value];
            for (let i = 0; i < values.length; i++) await host.locator('input').nth(i).fill(values[i]);
        }
        await page.locator('#feedback-main').click();
        await expect(host.locator('.question-feedback.is-visible')).toHaveCount(1);
        await expect(host.locator('.question-feedback.is-visible')).toHaveText(item.expected);
    }
    expect(cases.length).toBeGreaterThan(90);
    expect(errors).toEqual([]);
});

for (const phone of [false, true]) test.describe(`simultaneous-equations-graphs key, labels and layout ${phone ? 'phone' : 'desktop'}`, () => {
    test.use({ viewport: { width: phone ? 375 : 1280, height: phone ? 812 : 800 }, hasTouch: phone, isMobile: phone });
    test('ten seeded Practice sessions have clear keys and point labels, with no answer marked', async ({ page }) => {
        test.setTimeout(90000);
        const errors = watchForErrors(page);
        await page.goto(`/content/${slug}/`);
        await ready(page);
        const host = await page.evaluate(phone => {
            const fixture = document.createElement('div'); fixture.id = 'graph-fixture';
            fixture.style.cssText = `width:${phone ? 299 : 320}px;max-width:100%;margin:auto;`;
            document.body.append(fixture);
            return fixture.id;
        }, phone);
        for (let seed = 0; seed < 10; seed++) {
            const results = await page.evaluate(seed => {
                const host = document.getElementById('graph-fixture'); host.replaceChildren();
                const T = Simultaneous, E = Maths1to9LessonEngine;
                const cards = T.pick(E.seededRandom(seed)).map(item => T.generate(item, E.seededRandom(item.seed)));
                cards.forEach(card => {
                    const item = document.createElement('section'); host.append(item);
                    const title = document.createElement('p'); title.textContent = card.questionType; item.append(title);
                    card.figure(item);
                });
                return cards.map(card => ({ type: card.questionType, lines: card.lines, equations: card.lines.map(T.equationText) }));
            }, seed);
            const items = page.locator(`#${host} > section`);
            await expect(items).toHaveCount(6);
            for (let i = 0; i < 6; i++) {
                await expect(items.nth(i).locator('.simultaneous-key__line')).toHaveText(results[i].equations);
                await expect(items.nth(i).locator('.simultaneous-key__swatch[aria-hidden="true"]')).toHaveCount(2);
                const graph = items.nth(i).locator('[role="application"]');
                const label = await graph.getAttribute('aria-label');
                expect(results[i].equations.every(e => label.includes(e))).toBe(true);
                await expect(items.nth(i).locator('svg [stroke-dasharray]')).toHaveCount(0);
                await expect(items.nth(i).locator('.maths-graph__label').filter({ hasText: /^\(/ })).toHaveCount(0);
                if (results[i].type === 'both-lines') await expect(items.nth(i).locator('.maths-graph__label').filter({ hasText: /^P$/ })).toHaveCount(1);
                const overlap = await items.nth(i).locator('.maths-graph__label').evaluateAll(labels => {
                    const p = labels.find(l => l.textContent === 'P'); if (!p) return false;
                    const a = p.getBoundingClientRect();
                    return labels.some(l => { if (l === p) return false; const b = l.getBoundingClientRect();
                        return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top; });
                });
                expect(overlap).toBe(false);
                if (results[i].type === 'both-lines') {
                    const clearance = await graph.evaluate((element, lines) => {
                        const surface = element.getBoundingClientRect();
                        const label = [...element.querySelectorAll('.maths-graph__label')].find(e => e.textContent === 'P').getBoundingClientRect();
                        const unitX = (surface.width - 2) / 11.6, unitY = (surface.height - 2) / 11.6;
                        const origin = [surface.left + 1 + 5.8 * unitX, surface.top + 1 + 5.8 * unitY];
                        const centre = [(label.left + label.right) / 2, (label.top + label.bottom) / 2];
                        return lines.map(line => {
                            const length = Math.hypot(unitX, line.m * unitY);
                            const normal = [line.m * unitY / length, unitX / length];
                            const distance = Math.abs((centre[0] - origin[0]) * normal[0] +
                                (centre[1] - (origin[1] - line.c * unitY)) * normal[1]);
                            return distance - label.width / 2 * Math.abs(normal[0]) - label.height / 2 * Math.abs(normal[1]);
                        });
                    }, results[i].lines);
                    expect(Math.min(...clearance), `seed ${seed}: P label clears both lines`).toBeGreaterThanOrEqual(4);
                }
            }
            expect(await noSideways(page)).toBe(true);
            await page.locator(`#${host}`).screenshot({ path: `/tmp/simultaneous-practice-seed-${seed}${phone ? '' : '-desktop'}.png`, style: '.lesson-header { visibility: hidden !important; }' });
        }
        expect(errors).toEqual([]);
    });
});
