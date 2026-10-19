const { test, expect } = require('@playwright/test');
const { MAIN_ACTION, watchForErrors } = require('./helpers.cjs');
const slug = 'speed-from-distance-time-graphs';
const main = page => page.locator(`${MAIN_ACTION}:visible`).first();
const board = page => page.locator('.maths-graph__board:visible').first();
const back = page => page.getByRole('button', { name: 'Previous screen', exact: true });
async function ready(page) {
    await page.waitForFunction(() => window.Maths1to9Lesson && window.SpeedJourneys?.checks);
    await main(page).waitFor();
}
async function state(page, key) {
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    return page.evaluate(async ({ slug, key }) => (await Maths1to9Progress.getLessonActivityState(slug, key))?.data, { slug, key });
}
async function reload(page) {
    const hash = new URL(page.url()).hash, label = await main(page).textContent();
    await page.reload(); await ready(page);
    await expect(page).toHaveURL(new RegExp(`${hash}$`)); await expect(main(page)).toHaveText(label);
}
async function pixels(page, positions) {
    await board(page).scrollIntoViewIfNeeded();
    return board(page).evaluate((element, positions) => {
        const b = Object.values(JXG.boards).find(b => b.containerObj === element), r = element.getBoundingClientRect();
        return positions.map(([x, y]) => ({ x: r.left + b.origin.scrCoords[1] + x * b.unitX,
            y: r.top + b.origin.scrCoords[2] - y * b.unitY }));
    }, positions);
}
async function tap(page, position, touch) {
    const [p] = await pixels(page, [position]);
    if (touch) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
}
async function drag(page, from, to, touch) {
    const [a, b] = await pixels(page, [from, to]);
    if (touch) {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [a] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [b] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach();
    } else {
        await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 8 }); await page.mouse.up();
    }
}
async function backAndForward(page) {
    const hash = new URL(page.url()).hash;
    await back(page).click(); await reload(page); await main(page).click();
    await expect(page).toHaveURL(new RegExp(`${hash}$`));
}
async function keyboardPick(page, [t, d]) {
    await board(page).focus();
    for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowLeft');
    for (let i = 0; i < 15; i++) await page.keyboard.press('ArrowDown');
    for (let i = 0; i < t; i++) await page.keyboard.press('ArrowRight');
    for (let i = 0; i < d / 2; i++) await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Enter');
}
async function graphLayout(page) {
    await page.evaluate(() => document.fonts.ready);
    const problems = await page.locator('.maths-graph__board:visible').evaluateAll(elements => elements.flatMap(element => {
        const board = Object.values(JXG.boards).find(b => b.containerObj === element), rect = element.getBoundingClientRect();
        const all = [...element.querySelectorAll('.maths-graph__label')];
        const axes = all.filter(n => /^[0-9]+$/.test(n.textContent) || /^(Time|Distance) \(/.test(n.textContent));
        const errors = [];
        for (const [i, node] of axes.entries()) {
            const a = node.getBoundingClientRect();
            if (a.left < rect.left || a.right > rect.right || a.top < rect.top || a.bottom > rect.bottom) errors.push(`Clipped ${node.textContent}`);
            for (const other of axes.slice(i + 1)) {
                const b = other.getBoundingClientRect();
                if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) errors.push(`${node.textContent} overlaps ${other.textContent}`);
            }
        }
        const pixel = point => [rect.left + board.origin.scrCoords[1] + point.X() * board.unitX,
            rect.top + board.origin.scrCoords[2] - point.Y() * board.unitY];
        const lines = Object.values(board.objects).filter(o => ['line', 'segment', 'arrow'].includes(o.elType) && o.visProp.strokewidth >= 2);
        for (const node of all.filter(n => /^\d+\s+s,|^[ABC]$|^(Lena|Sam):/.test(n.textContent))) {
            const a = node.getBoundingClientRect();
            for (const line of lines) {
                const from = pixel(line.point1), to = pixel(line.point2);
                if (a.right < Math.min(from[0], to[0]) - 1 || a.left > Math.max(from[0], to[0]) + 1 ||
                    a.bottom < Math.min(from[1], to[1]) - 1 || a.top > Math.max(from[1], to[1]) + 1) continue;
                const sides = [[a.left - 1, a.top - 1], [a.right + 1, a.top - 1], [a.left - 1, a.bottom + 1], [a.right + 1, a.bottom + 1]]
                    .map(([x, y]) => (x - from[0]) * (to[1] - from[1]) - (y - from[1]) * (to[0] - from[0]));
                if (Math.min(...sides) <= 0 && Math.max(...sides) >= 0) errors.push(`${node.textContent} touches a line`);
            }
        }
        return errors;
    }));
    expect(problems).toEqual([]);
}
async function capture(page, name) {
    await graphLayout(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (process.env.SPEED_REVIEW_OUTPUT) await page.evaluate(() => window.scrollTo(0, 0));
    if (process.env.SPEED_REVIEW_OUTPUT) await page.screenshot({ path: `${process.env.SPEED_REVIEW_OUTPUT}/${page.viewportSize().width}-${name}.png`, fullPage: true });
}
async function answer(page, definition, order) {
    if (definition.input === 'choice') {
        const correct = definition.options.findIndex(option => option.correct);
        await page.locator('.question-card-options:visible button').nth(order ? order.indexOf(correct) : correct).click();
    } else {
        const inputs = page.locator('.question-card input:visible');
        for (const [i, field] of (definition.fields || [{ id: null }]).entries()) await inputs.nth(i).fill(field.id ? definition.answer[field.id] : definition.answer);
    }
    await main(page).click(); await expect(main(page)).toHaveText('Continue');
}
async function solvePractice(page, wrong = false) {
    const saved = await state(page, 'question-bank');
    const q = await page.evaluate(item => SpeedJourneys.generate(item, Maths1to9LessonEngine.seededRandom(item.seed)), saved.items[saved.screen]);
    if (wrong) {
        if (q.input === 'number') {
            const inputs = page.locator('.question-card input:visible'); for (const input of await inputs.all()) await input.fill('99');
        } else await page.locator('.question-card-options:visible button').nth(q.options.findIndex(option => !option.correct)).click();
        await reload(page); await main(page).click(); await expect(main(page)).toHaveText('Try again'); await reload(page); await main(page).click();
    }
    await answer(page, q); await reload(page); await backAndForward(page); await main(page).click();
}

for (const mode of [{ name: 'desktop', width: 1280, touch: false }, { name: 'phone', width: 375, touch: false }, { name: 'touch', width: 375, touch: true }]) {
    test.describe(mode.name, () => {
        test.use({ viewport: { width: mode.width, height: 1000 }, hasTouch: mode.touch });
        for (const site of ['', '/dist']) test(`${site || 'PHP'} full run, saved work, keyboard, feedback and homepage`, async ({ page }) => {
            test.setTimeout(180_000);
            const errors = watchForErrors(page);
            await page.goto(`${site}/content/${slug}/`); await ready(page);
            const slider = page.getByRole('slider', { name: 'Time (s)', exact: true });
            await slider.focus(); await page.keyboard.press('Home');
            for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowRight');
            await expect(slider).toBeFocused();
            if (mode.name === 'desktop' && site === '') {
                const box = await slider.boundingBox();
                await page.mouse.move(box.x + box.width - 8, box.y + box.height / 2); await page.mouse.down();
                await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await expect(slider).toBeFocused();
                await page.mouse.move(box.x + box.width - 8, box.y + box.height / 2); await page.mouse.up();
            }
            await expect(page.locator('.walker:visible')).toHaveAttribute('aria-label', 'Time: 6\u00a0s · Distance from the start: 12\u00a0m');
            await capture(page, 'learn-1'); await reload(page); await main(page).click();
            await board(page).focus();
            for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
            await reload(page); expect((await state(page, 'learn')).position).toBe(3);
            await drag(page, [3, 6], [1, 2], mode.touch);
            expect((await state(page, 'learn')).position).toBe(1);
            await board(page).focus(); for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
            await expect(page.locator('.speed-working:visible')).toContainText('12 ÷ 6 = 2\u00a0m/s');
            expect((await state(page, 'learn')).visited.sort()).toEqual([0, 1, 2, 3, 4, 5, 6]);
            await expect(page.locator('.maths-graph__description:visible')).toHaveText('6\u00a0s, 12\u00a0m');
            expect(await board(page).evaluate(element => {
                const b = Object.values(JXG.boards).find(b => b.containerObj === element);
                const muted = getComputedStyle(element).getPropertyValue('--border-dark').trim();
                return Object.values(b.objects).filter(o => o.elType === 'point' && o.visProp.visible &&
                    o.X() === 6 && o.Y() === 12 && o.visProp.fillcolor === muted).length;
            })).toBe(0);
            await capture(page, 'learn-2'); await backAndForward(page); await reload(page); await main(page).click();
            const pick = position => mode.name === 'desktop' || mode.name === 'phone' && site === '/dist'
                ? keyboardPick(page, position) : tap(page, position, mode.touch);
            await pick([0, 0]); await expect(page.locator('.question-feedback:visible')).toContainText("That's the start of the whole journey."); await reload(page);
            await pick([10, 26]); await expect(page.locator('.question-feedback:visible')).toContainText("That's the end.");
            await pick([2, 4]); await expect(page.locator('.question-feedback:visible')).toContainText('Tap the start');
            await pick([3, 12]); await expect(page.locator('.question-feedback:visible')).toHaveText('Tap a corner of the highlighted line.');
            await pick([4, 8]); await reload(page);
            await pick([6, 14]); await expect(page.locator('.question-feedback:visible')).toContainText('Tap the end');
            await pick([10, 26]); await page.waitForTimeout(1500);
            await expect(page.locator('.maths-graph__description:visible')).toHaveText('10\u00a0s, 26\u00a0m');
            expect(await board(page).evaluate(element => {
                const b = Object.values(JXG.boards).find(b => b.containerObj === element);
                return Object.values(b.objects).filter(o => o.elType === 'segment' && o.visProp.dash > 0 &&
                    o.point1.X() === 10 && o.point2.X() === 10).every(o => Math.max(o.point1.Y(), o.point2.Y()) <= 8);
            })).toBe(true);
            await capture(page, 'learn-3'); await backAndForward(page); await reload(page); await main(page).click();
            await expect(page.locator('.speed-working:visible')).toHaveText('8\u00a0m in 4\u00a0s: 8 ÷ 4 = 2\u00a0m/s');
            await page.getByRole('button', { name: '4 to 10 s', exact: true }).click(); await capture(page, 'learn-4'); await backAndForward(page); await main(page).click();
            await drag(page, [4, 12], [8, 12], mode.touch); await expect(page.locator('.walker:visible')).toHaveAttribute('aria-label', 'Time: 8\u00a0s · Distance from the start: 12\u00a0m');
            await board(page).focus(); await page.keyboard.press('ArrowLeft');
            await expect(page.locator('.walker:visible')).toHaveAttribute('aria-label', 'Time: 7\u00a0s · Distance from the start: 12\u00a0m');
            await page.keyboard.press('ArrowRight');
            expect(await board(page).evaluate(element => {
                const b = Object.values(JXG.boards).find(b => b.containerObj === element);
                return Object.values(b.objects).filter(o => o.elType === 'segment' && o.visProp.dash > 0 &&
                    o.point1.Y() === 12 && o.point2.Y() === 12).length;
            })).toBe(0);
            await capture(page, 'learn-5'); await backAndForward(page); await reload(page); await main(page).click();
            for (let i = 0; i < 4; i++) {
                const saved = await state(page, 'interactive');
                const definition = await page.evaluate(i => SpeedJourneys.examples[i], i);
                if (mode.touch && i === 0) {
                    await page.locator('.question-card input:visible').fill('0.25'); await reload(page);
                    await main(page).click(); await expect(main(page)).toHaveText('Try again'); await reload(page); await main(page).click();
                }
                await answer(page, definition, saved.order[i]); await capture(page, `try-${i}`); await backAndForward(page); await reload(page);
                await main(page).click();
            }
            await backAndForward(page); await main(page).click();
            for (let i = 0; i < 8; i++) await solvePractice(page, mode.touch && i === 0);
            await capture(page, 'practice-results'); await reload(page);
            const scoreBeforeRepeat = await page.evaluate(() => Maths1to9Lesson.getScore());
            if (mode.touch) {
                for (let session = 0; session < 2; session++) {
                    await page.getByRole('button', { name: 'Practise again', exact: true }).click();
                    for (let i = 0; i < 8; i++) await solvePractice(page);
                    await reload(page); expect(await page.evaluate(() => Maths1to9Lesson.getScore())).toEqual(scoreBeforeRepeat);
                }
                expect((await state(page, 'question-bank')).earlier.length).toBe(2);
            }
            await back(page).click();
            expect(await page.locator('.question-card input:visible').count()).toBe(0); await main(page).click(); await main(page).click();
            for (let i = 0; i < 6; i++) {
                const saved = await state(page, 'comparison');
                const definition = await page.evaluate(i => SpeedJourneys.checks[i], i);
                if (mode.touch && i === 0) {
                    const wrong = definition.options.findIndex(option => !option.correct);
                    await page.locator('.question-card-options:visible button').nth(saved.order[i].indexOf(wrong)).click(); await reload(page);
                    await main(page).click(); await expect(main(page)).toHaveText('Try again'); await reload(page); await main(page).click();
                }
                if (i === 2) {
                    const labels = page.locator('.maths-graph__label:visible');
                    await expect(labels.filter({ hasText: /^Lena: 5\s+s, 20\s+m$/ })).toHaveCount(1);
                    await expect(labels.filter({ hasText: /^Sam: 8\s+s, 24\s+m$/ })).toHaveCount(1);
                    await expect(labels.filter({ hasText: /^0\s+s, 0\s+m$/ })).toHaveCount(0);
                }
                await answer(page, definition, saved.order[i]); await capture(page, `check-${i}`); await backAndForward(page); await reload(page); await main(page).click();
            }
            await expect(main(page)).toHaveText('All lessons'); await backAndForward(page); await capture(page, 'summary'); await reload(page);
            const before = await page.evaluate(slug => Maths1to9Progress.getLessonProgress(slug), slug);
            expect(before.score.points).toBe(before.score.maximumPoints - (mode.touch ? 10 : 0));
            await main(page).click(); await expect(page).toHaveURL(new RegExp(`${site || ''}/$`));
            const algebra = page.locator('.lesson-category').filter({ has: page.getByRole('heading', { name: 'Algebra', exact: true }) });
            await expect(algebra.locator(`a[href*="${slug}"]`)).toContainText('Work out speed from a straight section of a distance–time graph.');
            const placement = await page.evaluate(async slug => {
                const curriculum = await (await fetch('./content/curriculum.json')).json();
                const lessons = curriculum.categories.find(c => c.id === 'algebra').lessons;
                const collection = await (await fetch('./content/collections.json')).json();
                const graphs = collection.collections.find(c => c.id === 'graphs').lessons;
                return { next: lessons[lessons.findIndex(l => l.folder === slug) + 1].folder, graphsNext: graphs[graphs.indexOf(slug) + 1] };
            }, slug);
            expect(placement).toEqual({ next: 'real-life-and-kinematic-graphs', graphsNext: 'real-life-and-kinematic-graphs' });
            expect(errors).toEqual([]);
        });
    });
}

for (const width of [1280, 375]) test(`${width}px every specified misconception rule and wrong option has its own feedback`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width, height: 1000 });
    const errors = watchForErrors(page);
    await page.goto(`/content/${slug}/`); await ready(page);
    const count = await page.evaluate(() => {
        const J = SpeedJourneys, E = Maths1to9LessonEngine;
        const definitions = [...J.examples, ...J.checks,
            ...[...J.typedTypes, ...J.choiceTypes].flatMap(type => [1, 8, 23].map(seed => J.generate({ type, seed }, E.seededRandom(seed))))];
        window.speedFeedbackCases = definitions.flatMap(definition => {
            if (definition.input === 'choice') return definition.options.flatMap((option, index) => option.correct ? [] : [{ definition, option: index, feedback: option.feedback }]);
            return (definition.rules || []).map(rule => {
                let value = rule.value;
                if (definition.fields) {
                    value = Object.fromEntries(definition.fields.map(field => [field.id, '99']));
                    Object.assign(value, rule.value);
                }
                return { definition, value, feedback: rule.feedback };
            });
        });
        const panel = document.createElement('section'); panel.id = 'speed-feedback-review'; panel.className = 'lesson-section';
        panel.style.cssText = 'max-width:700px;margin:16px auto'; document.body.prepend(panel);
        window.showSpeedFeedback = index => {
            panel.replaceChildren();
            const host = document.createElement('div'), button = document.createElement('button');
            button.id = 'feedback-action'; panel.append(host, button);
            const section = { state: {}, update(change) { change(this.state); } };
            const { definition } = speedFeedbackCases[index];
            E.createQuestion(host, { ...definition, sectionId: 'review', questionId: 'review', scored: false }, section, {
                setSectionAction(id, action) { button.textContent = action.label; button.disabled = !!action.disabled; button.onclick = action.onClick; },
                clearSectionAction() {}, recordAssessment() {}
            });
        };
        return speedFeedbackCases.length;
    });
    for (let i = 0; i < count; i++) {
        const exercise = await page.evaluate(i => {
            showSpeedFeedback(i);
            const { definition, value, option, feedback } = speedFeedbackCases[i];
            return { fields: definition.fields, value, option, feedback };
        }, i);
        const panel = page.locator('#speed-feedback-review');
        if (exercise.option !== undefined) await panel.locator('.question-card-options button').nth(exercise.option).click();
        else {
            for (const [j, box] of (await panel.locator('input').all()).entries()) await box.fill(exercise.fields ? exercise.value[exercise.fields[j].id] : exercise.value);
        }
        await panel.locator('#feedback-action').click();
        await expect(panel.locator('.question-feedback')).toHaveText(exercise.feedback);
        await expect(panel.locator('#feedback-action')).toHaveText('Try again');
        await graphLayout(page);
    }
    expect(errors).toEqual([]);
});
