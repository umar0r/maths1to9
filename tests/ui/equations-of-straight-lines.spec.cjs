const { test, expect } = require('@playwright/test');
const { MAIN_ACTION, watchForErrors, screen, checkScreen } = require('./helpers.cjs');
const solve = require('./solvers/equations-of-straight-lines.cjs');
const slug = 'equations-of-straight-lines';
const main = page => page.locator(`${MAIN_ACTION}:visible`).first();
const root = page => page.locator('.lesson-section:visible');
const back = page => page.getByRole('button', { name: 'Previous screen', exact: true });
const norm = text => text.replace(/\u00a0/g, ' ');
async function ready(page) {
    await page.waitForFunction(() => window.StraightLineEquations && window.Maths1to9Lesson);
    await root(page).locator('h3').first().waitFor();
}
async function state(page, key = 'learn') {
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    return page.evaluate(async ({ slug, key }) => (await Maths1to9Progress.getLessonActivityState(slug, key))?.data, { slug, key });
}
async function reload(page) {
    const hash = new URL(page.url()).hash, action = await main(page).textContent();
    await page.reload(); await ready(page);
    await expect(page).toHaveURL(new RegExp(`${hash}$`)); await expect(main(page)).toHaveText(action);
}
async function layout(page, name) {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), name).toBe(true);
    const boxes = root(page).locator('.question-card input');
    if (await boxes.count() === 2) {
        const a = await boxes.nth(0).boundingBox(), b = await boxes.nth(1).boundingBox();
        expect(Math.abs(a.y - b.y)).toBeLessThan(2);
        await expect(boxes.nth(0)).toHaveAttribute('inputmode', 'text');
    }
    if (process.env.EQUATIONS_REVIEW_OUTPUT) await page.screenshot({ path: `${process.env.EQUATIONS_REVIEW_OUTPUT}/${page.viewportSize().width}-${name}.png`, fullPage: true });
}
async function advanceLearn(page, stop = 7) {
    for (let steps = 0; steps < 45 && new URL(page.url()).hash !== `#learn-${stop}`; steps++) {
        if (!await solve(page)) await main(page).click();
    }
    await expect(page).toHaveURL(new RegExp(`#learn-${stop}$`));
}
async function labelCollisions(page) {
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const collisions = await root(page).locator('.maths-graph__board').evaluate(element => {
        const board = Object.values(JXG.boards).find(board => board.containerObj === element);
        const rect = element.getBoundingClientRect();
        const px = ([x, y]) => [rect.left + board.origin.scrCoords[1] + x * board.unitX, rect.top + board.origin.scrCoords[2] - y * board.unitY];
        const all = [...element.querySelectorAll('.maths-graph__label')];
        const labels = all.filter(label => label.textContent.includes('('));
        const lines = [[px([-5, -7]), px([5, 13]), 'line'], [px([-5, 0]), px([5, 0]), 'x-axis'], [px([0, -4]), px([0, 10]), 'y-axis']];
        return labels.flatMap(label => {
            const a = label.getBoundingClientRect();
            const overlaps = all.filter(other => other !== label).filter(other => {
                const b = other.getBoundingClientRect(); return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
            }).map(other => `${label.textContent} overlaps ${other.textContent}`);
            return overlaps.concat(lines.filter(([from, to]) => {
                const sides = [[a.left, a.top], [a.right, a.top], [a.left, a.bottom], [a.right, a.bottom]].map(([x, y]) => (x - from[0]) * (to[1] - from[1]) - (y - from[1]) * (to[0] - from[0]));
                return Math.min(...sides) <= 0 && Math.max(...sides) >= 0;
            }).map(line => `${label.textContent} overlaps ${line[2]}`));
        });
    });
    expect(collisions).toEqual([]);
}

for (const site of ['', '/dist']) for (const phone of [false, true]) {
    test.describe(`equations-of-straight-lines ${site || 'PHP'} ${phone ? '375px touch' : 'desktop'}`, () => {
        test.use({ viewport: { width: phone ? 375 : 1280, height: 1000 }, hasTouch: phone, isMobile: phone });
        test('full correct run, both line orders, every screen back and reload, labels and homepage', async ({ page }) => {
            test.setTimeout(180_000);
            const errors = watchForErrors(page);
            await page.goto(`${site}/content/${slug}/`); await ready(page);
            const lineLabels = ['2y\u00a0=\u00a04x\u00a0+\u00a06', 'y\u00a0=\u00a02x\u00a0+\u00a03'];
            for (const label of phone ? lineLabels.reverse() : lineLabels) {
                const control = root(page).getByRole('button', { name: label, exact: true });
                if (phone) await control.tap(); else await control.click();
            }
            const lines = await page.evaluate(() => Object.values(JXG.boards).flatMap(b => Object.values(b.objects)).filter(o => o.elType === 'line').map(o => o.stdform));
            expect(lines.length).toBe(2); expect(lines[0]).toEqual(lines[1]);
            let points = 0, previousHash = '';
            for (let step = 0; step < 160; step++) {
                const hash = new URL(page.url()).hash;
                points = checkScreen(await screen(page), points);
                if (hash !== previousHash) {
                    await reload(page); await layout(page, hash.slice(1));
                    if (await back(page).isVisible()) {
                        await back(page).click(); await expect(main(page)).toBeEnabled(); await main(page).click();
                        await expect(page).toHaveURL(new RegExp(`${hash}$`));
                    }
                    previousHash = hash;
                }
                if (hash === '#learn-7' && (await state(page)).sides.length < 2) {
                    for (const label of ['Left side: 2y', 'Right side: 4x + 6']) {
                        const tile = root(page).getByRole('button', { name: label, exact: true });
                        if (phone) await tile.tap();
                        else { await tile.focus(); await tile.press(label.startsWith('Left') ? 'Enter' : 'Space'); }
                    }
                    continue;
                }
                if (hash === '#learn-6' && (await state(page)).choices[5]?.correct) await labelCollisions(page);
                if ((await main(page).textContent()).trim() === 'All lessons') break;
                if (!await solve(page)) await main(page).click();
            }
            await expect(main(page)).toHaveText('All lessons');
            const score = await page.evaluate(() => Maths1to9Lesson.getScore());
            expect(score.points).toBe(score.maximumPoints);
            await reload(page); await expect(main(page)).toHaveText('All lessons');
            await main(page).click(); await expect(page).toHaveURL(new RegExp(`${site}/$`));
            await expect(page.locator('.lesson-card__title').filter({ hasText: /^\s*Using y = mx \+ c\s*$/ })).toBeVisible();
            await expect(page.locator('.lesson-card__title').filter({ hasText: /^\s*Parallel lines\s*$/ })).toHaveCount(0);
            await expect(page.locator('.lesson-card__title').filter({ hasText: /^\s*Finding the equation of a line\s*$/ })).toHaveCount(0);
            expect(errors).toEqual([]);
        });
    });
}

test('equations-of-straight-lines workbench wrong operations, keyboard, both two-step orders and mid-step reload', async ({ page }) => {
    const errors = watchForErrors(page);
    await page.setViewportSize({ width: 375, height: 1000 });
    await page.goto(`/content/${slug}/`); await ready(page); await advanceLearn(page, 3);
    await root(page).getByRole('button', { name: '− 3 from both sides', exact: true }).click();
    await expect(root(page).locator('.question-feedback:visible')).toContainText('That gives y − 6');
    await root(page).getByRole('button', { name: '÷ 3 both sides', exact: true }).click();
    await expect(root(page).locator('.question-feedback:visible')).toContainText("y isn't multiplied");
    expect((await state(page)).steps[2]).toEqual([]); await reload(page);
    await expect(root(page).locator('.question-feedback.is-visible')).toHaveCount(0);
    await root(page).getByRole('button', { name: '+ 3 to both sides', exact: true }).click();
    await expect(root(page).locator('.workbench-equation').first()).toHaveText('y − 3 + 3 = 2x + 3');
    await solve(page); await main(page).click();
    for (const label of ['× 2 both sides', '− 2 from both sides']) {
        await root(page).getByRole('button', { name: label, exact: true }).click(); await expect(root(page).locator('.question-feedback:visible')).toContainText('divide by 2');
    }
    const divide = root(page).getByRole('button', { name: '÷ 2 both sides', exact: true });
    await divide.focus(); await page.keyboard.press('Enter');
    await expect(root(page).locator('.workbench-equation').first()).toHaveText('2y ÷ 2 = 4x ÷ 2 + 6 ÷ 2');
    await solve(page); await main(page).click();
    await root(page).getByRole('button', { name: '+ 4 to both sides', exact: true }).click();
    await expect(root(page).locator('.question-feedback:visible')).toContainText('2y + 8');
    await root(page).getByRole('button', { name: '÷ 2 both sides', exact: true }).click();
    await expect(root(page).locator('.workbench-equation').first()).toHaveText('2y ÷ 2 + 4 ÷ 2 = 6x ÷ 2');
    await reload(page); await expect(root(page).locator('.workbench-result')).toHaveText('y + 2 = 3x');
    await root(page).getByRole('button', { name: '+ 2 to both sides', exact: true }).click();
    await expect(root(page).locator('.question-feedback:visible')).toContainText('y + 4');
    await root(page).getByRole('button', { name: '− 2 from both sides', exact: true }).click();
    await expect(root(page).locator('.workbench-result').last()).toHaveText('y = 3x − 2 ✓');
    await expect(root(page).getByRole('button', { name: '+ 2 to both sides', exact: true })).toBeDisabled();
    await expect(root(page).getByRole('button', { name: '− 2 from both sides', exact: true })).toBeDisabled();
    await layout(page, 'two-step-divide-first');
    await back(page).click(); await main(page).click(); await reload(page);
    await expect(root(page).locator('.workbench-result')).toHaveCount(2);
    // A fresh lesson runs subtraction first; the other full runs also use this order.
    await page.evaluate(() => localStorage.clear()); await page.goto(`/content/${slug}/`); await ready(page); await advanceLearn(page, 5);
    await root(page).getByRole('button', { name: '− 4 from both sides', exact: true }).click(); await reload(page);
    await expect(root(page).locator('.workbench-result')).toHaveText('2y = 6x − 4');
    await expect(root(page).getByRole('button', { name: '+ 4 to both sides', exact: true })).toBeDisabled();
    await expect(root(page).getByRole('button', { name: '− 4 from both sides', exact: true })).toBeDisabled();
    await expect(root(page).getByRole('button', { name: '÷ 2 both sides', exact: true })).toBeEnabled();
    await root(page).getByRole('button', { name: '÷ 2 both sides', exact: true }).click();
    await expect(root(page).locator('.workbench-equation').nth(2)).toHaveText('2y ÷ 2 = 6x ÷ 2 − 4 ÷ 2');
    await layout(page, 'two-step-subtract-first');
    for (const divideFirst of [false, true]) {
        await page.evaluate(() => localStorage.clear());
        await page.goto(`/content/${slug}/`); await ready(page); await advanceLearn(page, 5);
        const press = async name => {
            const control = root(page).getByRole('button', { name, exact: true });
            await control.focus(); await control.press('Enter');
        };
        if (divideFirst) await press('÷ 2 both sides');
        await press(`− ${divideFirst ? 2 : 4} from both sides`);
        for (const sign of ['+', '−']) await expect(root(page).getByRole('button', {
            name: `${sign} ${divideFirst ? 2 : 4} ${sign === '+' ? 'to' : 'from'} both sides`, exact: true
        })).toBeDisabled();
        if (!divideFirst) {
            await expect(root(page).getByRole('button', { name: '÷ 2 both sides', exact: true })).toBeEnabled();
            await press('÷ 2 both sides');
        }
        await expect(root(page).locator('.workbench-result').last()).toHaveText('y = 3x − 2 ✓');
    }
    expect(errors).toEqual([]);
});

test('equations-of-straight-lines partial answers, reload phases, repeated Practice and skill evidence', async ({ page }) => {
    test.setTimeout(180_000);
    const errors = watchForErrors(page);
    await page.setViewportSize({ width: 375, height: 1000 });
    await page.goto(`/content/${slug}/`); await ready(page);
    for (let step = 0; step < 100 && !/#question-bank-question-1$/.test(page.url()); step++) {
        if (!await solve(page)) await main(page).click();
    }
    await expect(page).toHaveURL(/#question-bank-question-1$/);
    const answer = await page.evaluate(async slug => {
        const s = (await Maths1to9Progress.getLessonActivityState(slug, 'question-bank')).data;
        return StraightLineEquations.generate(s.items[0], Maths1to9LessonEngine.seededRandom(s.items[0].seed)).answer;
    }, slug);
    const values = Object.values(answer), inputs = root(page).locator('.question-card input');
    const wrong = values[1] === '39' ? '38' : '39';
    const checkedFirst = values[0].replace(/-/g, '−');
    await expect(inputs).toHaveCount(2);
    await inputs.nth(0).fill(values[0]); await inputs.nth(1).fill(wrong); await layout(page, 'practice-partial');
    await reload(page); await expect(inputs.nth(0)).toHaveValue(values[0]); await expect(inputs.nth(1)).toHaveValue(wrong);
    await main(page).click(); await expect(main(page)).toHaveText('Try again'); await reload(page);
    await main(page).click(); await expect(inputs).toHaveCount(2);
    // Checked answers display the shared card's Unicode minus, and Try again retains that text.
    await expect(inputs.nth(0)).toHaveValue(checkedFirst); await expect(inputs.nth(1)).toHaveValue(wrong);
    await expect(inputs.nth(1)).toBeFocused();
    await inputs.nth(1).fill(values[1]); await main(page).click(); await expect(main(page)).toHaveText('Continue'); await reload(page);
    for (let step = 0; step < 75 && !/#question-bank-question-9$/.test(page.url()); step++) {
        if (!await solve(page)) await main(page).click();
    }
    await expect(root(page).locator('.retained-result__answer').first()).toContainText('2nd try');
    await main(page).click();
    for (let step = 0; step < 45 && !/#summary$/.test(page.url()); step++) {
        if (!await solve(page)) await main(page).click();
    }
    expect((await state(page, 'comparison')).finished).toBe(true);
    await page.getByRole('button', { name: /^Practice,/ }).click();
    const before = await page.evaluate(() => Maths1to9Lesson.getScore());
    const first = await state(page, 'question-bank');
    for (let session = 2; session <= 3; session++) {
        await page.getByRole('button', { name: 'Practise again', exact: true }).click();
        await reload(page);
        for (let step = 0; step < 70 && !/#question-bank-question-9$/.test(page.url()); step++) {
            if (!await solve(page)) await main(page).click();
        }
        expect(await page.evaluate(() => Maths1to9Lesson.getScore())).toEqual(before);
    }
    await reload(page);
    const last = await state(page, 'question-bank');
    expect((await state(page, 'comparison')).finished).toBe(true);
    expect(last.session).toBe(3); expect(last.earlier).toHaveLength(2); expect(last.items).not.toEqual(first.items);
    await expect(root(page).locator('details')).toHaveCount(2);
    const skill = await page.evaluate(() => Maths1to9Progress.getSkillProgress('use-y-mx-c'));
    expect(skill.assessedQuestions).toBeGreaterThanOrEqual(24);
    expect(errors).toEqual([]);
});

test('equations-of-straight-lines all wrong choices and every feedback rule use the shared card', async ({ page }) => {
    await page.goto(`/content/${slug}/`); await ready(page);
    const errors = watchForErrors(page);
    const results = await page.evaluate(() => {
        const E = StraightLineEquations, engine = Maths1to9LessonEngine;
        const host = document.createElement('div'); document.body.append(host);
        let action, serial = 0;
        const section = { state: { cards: {} }, update(change) { change(this.state); } };
        const api = { setSectionAction(id, next) { action = next; }, clearSectionAction() {}, recordAssessment() { throw new Error('Feedback review must not score'); } };
        const render = config => engine.createQuestion(host, { ...config, scored: false, sectionId: 'feedback-review', questionId: `review-${++serial}` }, section, api);
        const fill = values => [...host.querySelectorAll('input')].forEach((input, index) => { input.value = values[index]; input.dispatchEvent(new Event('input', { bubbles: true })); });
        const definitions = [...E.examples, ...E.checks];
        for (const type of E.choiceTypes) for (let seed = 0; seed < 30; seed++) definitions.push(E.generate({ type, seed }, engine.seededRandom(seed)));
        for (const form of [
            { k: 1, d: 0, p: -3, q: 7, reordered: true }, { k: 1, d: 4, p: 3, q: 0 },
            { k: 2, d: 0, p: 4, q: 6 }, { k: 2, d: 4, p: 6, q: 0 }, { k: 2, d: -4, p: -6, q: 0 }
        ]) definitions.push(E.typed(form));
        for (const point of [[3, 5], [3, 6], [3, -5], [2, 2]]) definitions.push(E.pointCard({ k: 2, d: 0, p: 4, q: -2 }, point));
        const results = [];
        for (const definition of definitions) {
            if (definition.input === 'choice') for (const option of definition.options.filter(o => !o.correct)) {
                const card = render(definition);
                host.querySelectorAll('button')[definition.options.indexOf(option)].click(); action.onClick();
                results.push({ expected: option.feedback, actual: host.querySelector('.question-feedback').textContent, correct: card.result().correct });
            }
            else for (const rule of definition.rules) {
                const values = definition.fields.map(field => rule.value[field.id] ?? '39');
                const first = definition.rules.find(candidate => Object.entries(candidate.value).every(([id, value]) => Number(values[definition.fields.findIndex(f => f.id === id)]) === Number(value)));
                const card = render(definition); fill(values); action.onClick();
                results.push({ expected: first.feedback, actual: host.querySelector('.question-feedback').textContent, correct: card.result().correct });
            }
        }
        host.remove(); return results;
    });
    expect(results.length).toBeGreaterThan(300);
    for (const result of results) { expect(result.actual).toBe(result.expected); expect(result.correct).toBe(false); }
    // Learn uses its own unscored buttons and saves rejected choices.
    for (const screen of [2, 3, 4, 6]) {
        await advanceLearn(page, screen);
        if (screen < 5) await solve(page);
        const options = await page.evaluate(screen => StraightLineEquations.learnChoices[screen - 1].options, screen);
        for (const option of options.filter(option => !option.correct)) {
            const control = root(page).getByRole('button', { name: option.label, exact: true });
            await control.click(); await expect(control).toBeDisabled();
            await expect(root(page).locator('.question-feedback.is-visible').last()).toHaveText(`✗ ${option.feedback}`);
            await reload(page); await expect(control).toBeDisabled();
        }
        await solve(page);
    }
    expect(errors).toEqual([]);
});
