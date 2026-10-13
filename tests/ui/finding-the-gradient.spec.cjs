const { test, expect } = require('@playwright/test');
const { MAIN_ACTION, watchForErrors } = require('./helpers.cjs');
const slug = 'finding-the-gradient';
const main = page => page.locator(`${MAIN_ACTION}:visible`);
const input = page => page.locator('.question-card input:visible');
const board = page => page.locator('.maths-graph__board:visible').first();
const back = page => page.getByRole('button', { name: 'Previous screen', exact: true });
const plain = text => text.replace(/\s/g, ' ');

async function deterministicPractice(page) {
    // Fix only the question seeds; JSXGraph still needs its normal random IDs.
    await page.addInitScript(() => {
        Object.defineProperty(window, 'Maths1to9LessonEngine', { configurable: true, set(engine) {
            const randomInt = engine.randomInt;
            let index = 0;
            engine.randomInt = (min, max, random) => min === 0 && max === 4294967295
                ? [100, 2000, 300, 400, 500, 600][index++ % 6] : randomInt(min, max, random);
            Object.defineProperty(window, 'Maths1to9LessonEngine', { value: engine, writable: true, configurable: true });
        } });
    });
}

async function state(page, key) {
    return page.evaluate(async ({ slug, key }) => (await window.Maths1to9Progress.getLessonActivityState(slug, key))?.data, { slug, key });
}
async function reload(page) {
    const hash = new URL(page.url()).hash;
    await page.reload();
    await main(page).waitFor();
    await expect(page).toHaveURL(new RegExp(`${hash.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
}
async function pointer(page, from, to, touch = false) {
    const surface = board(page);
    await surface.scrollIntoViewIfNeeded();
    const points = await surface.evaluate((element, points) => {
        const b = Object.values(window.JXG.boards).find(b => b.containerObj === element);
        const rect = element.getBoundingClientRect();
        return points.map(([x, y]) => ({ x: rect.left + element.clientLeft + b.origin.scrCoords[1] + x * b.unitX,
            y: rect.top + element.clientTop + b.origin.scrCoords[2] - y * b.unitY }));
    }, [from, to]);
    if (touch) {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [points[0]] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [points[1]] });
        return { release: async () => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach(); } };
    }
    await page.mouse.move(points[0].x, points[0].y);
    await page.mouse.down();
    await page.mouse.move(points[1].x, points[1].y, { steps: 5 });
    return { release: () => page.mouse.up() };
}
async function draw(page, from, to, touch = false) {
    const gesture = await pointer(page, from, to, touch);
    await gesture.release();
}
async function tapLine(page, from, to, touch) {
    await board(page).scrollIntoViewIfNeeded();
    for (const point of [from, to]) {
        const position = await board(page).evaluate((element, [x, y]) => {
            const b = Object.values(window.JXG.boards).find(b => b.containerObj === element), r = element.getBoundingClientRect();
            return [r.left + element.clientLeft + b.origin.scrCoords[1] + x * b.unitX,
                r.top + element.clientTop + b.origin.scrCoords[2] - y * b.unitY];
        }, point);
        if (touch) await page.touchscreen.tap(...position);
        else await page.mouse.click(...position);
    }
}
async function keys(page, list) {
    await board(page).focus();
    for (const key of list) await page.keyboard.press(key);
}
async function stroke(page) {
    return board(page).evaluate(element => {
        const b = Object.values(window.JXG.boards).find(b => b.containerObj === element);
        return Object.values(b.objects).filter(o => o.elType === 'segment' && o.visProp.strokewidth === 4 && o.visProp.visible).at(-1)?.visProp.strokecolor;
    });
}
async function colour(page, name) {
    return board(page).evaluate((element, name) => getComputedStyle(element).getPropertyValue(name).trim(), name);
}
async function answer(page, value) {
    await input(page).fill(value);
    await input(page).press('Enter');
    await expect(main(page)).toHaveText('Continue');
}
async function backForward(page) {
    const before = await page.evaluate(() => window.Maths1to9Lesson.getScore());
    await back(page).click();
    await expect(main(page)).toHaveText('Next');
    await reload(page);
    await expect(input(page)).toHaveCount(0);
    await main(page).click();
    expect(await page.evaluate(() => window.Maths1to9Lesson.getScore())).toEqual(before);
}

async function previousSection(page) {
    const hash = new URL(page.url()).hash;
    const score = await page.evaluate(() => window.Maths1to9Lesson.getScore());
    await back(page).click();
    await expect(main(page)).toHaveText('Continue');
    await reload(page);
    await main(page).click();
    expect(new URL(page.url()).hash).toBe(hash);
    expect(await page.evaluate(() => window.Maths1to9Lesson.getScore())).toEqual(score);
}

async function labelsClear(page) {
    const problems = await board(page).evaluate(element => {
        const b = Object.values(window.JXG.boards).find(b => b.containerObj === element), rect = element.getBoundingClientRect();
        const nodes = [...element.querySelectorAll('.maths-graph__label')];
        const labels = nodes.filter(n => /^\(|\d+ (?:right|up|down)/.test(n.textContent));
        const numeric = nodes.filter(n => /^[−\d]+$/.test(n.textContent));
        const pixel = p => [rect.left + element.clientLeft + b.origin.scrCoords[1] + p.X() * b.unitX,
            rect.top + element.clientTop + b.origin.scrCoords[2] - p.Y() * b.unitY];
        const lines = Object.values(b.objects).filter(o => ['line', 'segment', 'arrow'].includes(o.elType) && o.visProp.strokewidth >= 2);
        const problems = [];
        const overlap = (a, c) => a.left < c.right + 1 && a.right > c.left - 1 && a.top < c.bottom + 1 && a.bottom > c.top - 1;
        for (const [index, node] of labels.entries()) {
            const a = node.getBoundingClientRect();
            for (const other of [...numeric, ...labels.slice(index + 1)]) {
                if (overlap(a, other.getBoundingClientRect())) problems.push(`${node.textContent} overlaps ${other.textContent}`);
            }
            for (const line of lines) {
                const from = pixel(line.point1), to = pixel(line.point2);
                if (line.elType !== 'line' && (a.right < Math.min(from[0], to[0]) - 2 || a.left > Math.max(from[0], to[0]) + 2 ||
                    a.bottom < Math.min(from[1], to[1]) - 2 || a.top > Math.max(from[1], to[1]) + 2)) continue;
                const sides = [[a.left - 1, a.top - 1], [a.right + 1, a.top - 1], [a.left - 1, a.bottom + 1], [a.right + 1, a.bottom + 1]]
                    .map(([x, y]) => (x - from[0]) * (to[1] - from[1]) - (y - from[1]) * (to[0] - from[0]));
                if (Math.min(...sides) <= 0 && Math.max(...sides) >= 0) problems.push(`${node.textContent} touches a line`);
            }
        }
        return problems;
    });
    expect(problems).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width);
    for (const expression of await page.locator('.gradient-maths:visible').all()) {
        expect(await expression.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    }
}
async function noAnswerLeak(page, marked = false) {
    await expect(board(page)).not.toHaveAttribute('aria-label', /gradient/i);
    expect(await board(page).evaluate(element => {
        const b = Object.values(window.JXG.boards).find(b => b.containerObj === element);
        return Object.values(b.objects).filter(o => o.visProp.strokewidth === 3 && o.visProp.lastarrow).length;
    })).toBe(0);
    await expect(page.locator('.maths-graph__description:visible')).not.toContainText(/gradient\s*(?:is|=)/i);
    if (!marked) expect(await board(page).evaluate(element => {
        const b = Object.values(window.JXG.boards).find(b => b.containerObj === element);
        return Object.values(b.objects).filter(o => o.elType === 'point' && o.visProp.visible).length;
    })).toBe(0);
}
async function learnThrough(page, touch, revisits) {
    for (let index = 0; index < 7; index++) {
        await expect(page).toHaveURL(new RegExp(`#learn-${index + 1}$`));
        if (index === 2) {
            await draw(page, [2, -1], [3, 1], touch);
            await keys(page, ['ArrowUp']);
            expect((await state(page, 'learn')).position).toEqual([4, 3]);
            await reload(page);
            expect((await state(page, 'learn')).position).toEqual([4, 3]);
            await expect(page.locator('#lesson-section-explanation')).toContainText('A straight line has the same gradient all the way along.');
            for (const key of ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowLeft']) {
                await keys(page, [key]);
                await labelsClear(page);
            }
            await keys(page, ['ArrowUp', 'ArrowUp']);
        }
        await page.waitForTimeout(800);
        await labelsClear(page);
        if (index === 6) {
            const geometry = await board(page).evaluate(element => {
                const b = Object.values(window.JXG.boards).find(b => b.containerObj === element);
                return { error: Math.abs(b.unitX - 2 * b.unitY), text: element.textContent };
            });
            expect(geometry.error).toBeLessThan(0.2);
            expect(geometry.text).toContain('12');
        }
        if (revisits) {
            await reload(page);
            if (index > 0) await backForward(page);
        }
        await main(page).click();
    }
}
async function finishTriangle(page, touch, revisit) {
    await expect(page).toHaveURL(/#try-it-1$/);
    if (revisit) await previousSection(page);
    await draw(page, [1, -2], [4, -2], touch);
    await expect(page).toHaveURL(/#try-it-1-up$/);
    await reload(page);
    expect((await state(page, 'interactive')).horizontal).toEqual({ from: [1, -2], to: [4, -2] });
    if (revisit) await backForward(page);
    await keys(page, [...Array(4).fill('ArrowRight'), ...Array(2).fill('ArrowDown'), 'Enter', ...Array(6).fill('ArrowUp')]);
    expect(await stroke(page)).toBe(await colour(page, '--primary'));
    await page.keyboard.press('Enter');
    await expect(main(page)).toBeEnabled();
    await expect(main(page)).toHaveText('Next');
    await reload(page);
    expect((await state(page, 'interactive')).vertical).toEqual({ from: [4, -2], to: [4, 4] });
    await main(page).click();
}
async function tryCards(page, revisits) {
    for (const [index, value] of ['3', '6', '2', '1/2', '−1/2', '8', '4'].entries()) {
        if (revisits) await reload(page);
        await input(page).fill(value);
        if (revisits) { await reload(page); await expect(input(page)).toHaveValue(value); }
        await input(page).press('Enter');
        await expect(main(page)).toHaveText('Continue');
        if (index === 2) await labelsClear(page);
        if (revisits) { await reload(page); await backForward(page); }
        await main(page).click();
    }
    await expect(page).toHaveURL(/#try-it-5$/);
    await reload(page);
    if (revisits) await backForward(page);
    await main(page).click();
}
async function practice(page, { wrong = false, decimal = false, revisits = false } = {}) {
    for (let index = 0; index < 6; index++) {
        const saved = await state(page, 'question-bank');
        const value = await page.evaluate(({ item }) => {
            const G = window.FindingGradient;
            return G.fraction(...['p', 'q'].map(key => G.generate(item, window.Maths1to9LessonEngine.seededRandom(item.seed))[key]));
        }, { item: saved.items[index] });
        await noAnswerLeak(page);
        if (wrong && index === 1) {
            expect(value).toBe('1/2');
            await input(page).fill('17/19');
            await input(page).press('Enter');
            await expect(main(page)).toHaveText('Try again');
            await reload(page);
            await expect(main(page)).toHaveText('Try again');
            await main(page).click();
        }
        const typed = index === 1 && wrong ? '2/4' : index === 1 && decimal ? '0.5' : value;
        if (index === 1 && decimal) expect(value).toBe('1/2');
        await input(page).fill(typed);
        if (revisits) {
            await reload(page);
            if (index === 0) await previousSection(page);
            await expect(input(page)).toHaveValue(typed);
        }
        await input(page).press('Enter');
        await expect(main(page)).toHaveText('Continue');
        if (revisits) {
            await reload(page);
            if (index > 0) await backForward(page);
        }
        await main(page).click();
    }
    await reload(page);
    if (revisits) await backForward(page);
}
async function checkQuestions(page, revisits, start = 0) {
    for (let index = start; index < 5; index++) {
        if (index === 0 || index === 3 || index === 4) {
            await noAnswerLeak(page);
            if (index === 3) {
                const scale = await board(page).evaluate(element => {
                    const b = Object.values(window.JXG.boards).find(b => b.containerObj === element);
                    return { error: Math.abs(2 * b.unitX - b.unitY), labels: element.textContent };
                });
                expect(scale.error).toBeLessThan(0.2);
                expect(scale.labels).toContain('12');
            }
            await input(page).fill(['3/2', null, null, '1/2', '0'][index]);
        } else {
            if (index === 1) await noAnswerLeak(page, true);
            await page.getByRole('button', { name: index === 1 ? /^The line goes down/ : /^Yes\. 2 ÷ 4/ }).click();
        }
        if (revisits) {
            await reload(page);
            if (index === 0) await previousSection(page);
            if (index === 1 || index === 2) await expect(page.locator('.question-card-options:visible .is-selected')).toHaveCount(1);
        }
        await main(page).click();
        await expect(main(page)).toHaveText('Continue');
        if (revisits) { await reload(page); if (index > 0) await backForward(page); }
        await main(page).click();
    }
    await expect(main(page)).toHaveText('All lessons');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width);
    await reload(page);
    if (revisits) await backForward(page);
}
async function repeatTwice(page) {
    const before = await page.evaluate(() => window.Maths1to9Lesson.getProgress());
    const evidence = await page.evaluate(async () => (await window.Maths1to9Progress.getSkillProgress('calculate-gradient')).assessedQuestions);
    await page.getByRole('button', { name: /^Practice,/ }).click();
    for (let session = 2; session <= 3; session++) {
        await page.getByRole('button', { name: 'Practise again', exact: true }).click();
        await practice(page, { decimal: session === 2 });
        expect((await state(page, 'question-bank')).session).toBe(session);
        await expect(page.locator('details:visible')).toHaveCount(session - 1);
        const progress = await page.evaluate(() => window.Maths1to9Lesson.getProgress());
        expect(progress.score).toEqual(before.score);
        expect(progress.finished).toBe(true);
        expect(await page.evaluate(async () => (await window.Maths1to9Progress.getSkillProgress('calculate-gradient')).assessedQuestions))
            .toBe(evidence + (session - 1) * 6);
        await page.getByRole('button', { name: /^Check,/ }).click();
        await expect(main(page)).toHaveText('All lessons');
        if (session < 3) await page.getByRole('button', { name: /^Practice,/ }).click();
    }
}
const modes = [
    { name: 'desktop', viewport: { width: 1280, height: 1000 } },
    { name: '375px', viewport: { width: 375, height: 1000 } },
    { name: 'touch', viewport: { width: 375, height: 1000 }, hasTouch: true, isMobile: true }
];
for (const mode of modes) {
    test.describe(mode.name, () => {
        test.use({ viewport: mode.viewport, hasTouch: mode.hasTouch || false, isMobile: mode.isMobile || false });
        for (const site of ['', '/dist']) {
            test(`${site || 'PHP'}: full correct run, saved work, navigation and completion`, async ({ page }) => {
                test.setTimeout(240_000);
                const errors = watchForErrors(page);
                await deterministicPractice(page);
                await page.goto(`${site}/content/${slug}/`);
                await board(page).waitFor();
                const maximum = await page.evaluate(() => window.Maths1to9Lesson.getScore().maximumPoints);
                await learnThrough(page, mode.hasTouch, site === '');
                await finishTriangle(page, mode.hasTouch, site === '');
                await tryCards(page, site === '');
                await practice(page, { revisits: site === '' });
                await main(page).click();
                await checkQuestions(page, site === '');
                const progress = await page.evaluate(() => window.Maths1to9Lesson.getProgress());
                expect(progress.score.points).toBe(maximum);
                expect(progress.scoreActivities.filter(activity => !activity.completed)).toEqual([]);
                if (site === '') {
                    await main(page).click();
                    await expect(page).toHaveURL(/\/$/);
                    await page.goto(`/content/${slug}/#question-bank`);
                    await main(page).waitFor();
                    await repeatTwice(page);
                }
                await main(page).click();
                await expect(page).toHaveURL(new RegExp(`${site || ''}/$`));
                const cards = page.locator('a[href*="finding-the-gradient"]');
                await expect(cards.first()).toContainText('Finding the gradient');
                const algebra = page.locator('.lesson-category').filter({ has: page.getByRole('heading', { name: 'Algebra', exact: true }) });
                const titles = (await algebra.locator('.lesson-card__title').allTextContents()).map(text => text.trim());
                const position = titles.indexOf('Finding the gradient');
                expect(position).toBeGreaterThanOrEqual(0);
                expect(titles[position - 1]).toBe('Horizontal and vertical lines');
                expect(titles).not.toContain('Gradient and intercept');
                const curriculum = await page.evaluate(async () => (await fetch('./content/curriculum.json')).json());
                const configuredAlgebra = curriculum.categories.find(category => category.id === 'algebra').lessons.map(lesson => lesson.folder);
                expect(configuredAlgebra[configuredAlgebra.indexOf(slug) + 1]).toBe('gradient-and-intercept');
                const collections = await page.evaluate(async () => (await fetch('./content/collections.json')).json());
                const graphs = collections.collections.find(collection => collection.id === 'graphs').lessons;
                expect(graphs[graphs.indexOf(slug) + 1]).toBe('gradient-and-intercept');
                expect(graphs.indexOf(slug)).toBeGreaterThan(graphs.indexOf('horizontal-and-vertical-lines'));
                expect(errors).toEqual([]);
            });
        }
    });
}

async function arrowCount(page) {
    return board(page).evaluate(element => {
        const b = Object.values(window.JXG.boards).find(b => b.containerObj === element);
        return Object.values(b.objects).filter(o => o.visProp.strokewidth === 3 && o.visProp.lastarrow).length;
    });
}
for (const mode of modes) {
    test.describe(`${mode.name} detailed checks`, () => {
        test.use({ viewport: mode.viewport, hasTouch: mode.hasTouch || false, isMobile: mode.isMobile || false });
        test('Try it 1 has no feedback box until the first line is released', async ({ page }) => {
            const errors = watchForErrors(page);
            await page.emulateMedia({ reducedMotion: 'reduce' });
            await page.goto(`/content/${slug}/`);
            await board(page).waitFor();
            for (let i = 0; i < 7; i++) await main(page).click();
            await expect(page).toHaveURL(/#try-it-1$/);
            const feedback = page.locator('#lesson-section-interactive .question-feedback');
            await expect(feedback).toBeHidden();
            await expect(feedback).toHaveText('');
            await reload(page);
            await expect(feedback).toBeHidden();
            const gesture = await pointer(page, [1, -2], [3, -2], mode.hasTouch);
            await expect(feedback).toBeHidden();
            await gesture.release();
            await expect(feedback).toBeVisible();
            await expect(feedback).toHaveText('Keep going until you’re directly below (4, 4).');
            expect(errors).toEqual([]);
        });
        test('Learn 3 remains draggable on revisits and after finishing Learn', async ({ page }) => {
            const errors = watchForErrors(page);
            await page.emulateMedia({ reducedMotion: 'reduce' });
            await page.goto(`/content/${slug}/`);
            await board(page).waitFor();
            for (let i = 0; i < 3; i++) await main(page).click();
            await expect(page).toHaveURL(/#learn-4$/);
            await back(page).click();
            await expect(page).toHaveURL(/#learn-3$/);
            await draw(page, [2, -1], [3, 1], mode.hasTouch);
            expect((await state(page, 'learn')).position).toEqual([3, 1]);
            await keys(page, ['ArrowUp']);
            expect((await state(page, 'learn')).position).toEqual([4, 3]);
            await reload(page);
            expect((await state(page, 'learn')).position).toEqual([4, 3]);
            for (let i = 0; i < 5; i++) await main(page).click();
            await expect(page).toHaveURL(/#try-it-1$/);
            await back(page).click();
            for (let i = 0; i < 4; i++) await back(page).click();
            await expect(page).toHaveURL(/#learn-3$/);
            const before = await page.evaluate(() => window.Maths1to9Lesson.getScore());
            await draw(page, [4, 3], [5, 5], mode.hasTouch);
            expect((await state(page, 'learn')).position).toEqual([5, 5]);
            await keys(page, ['ArrowLeft']);
            expect((await state(page, 'learn')).position).toEqual([4, 3]);
            await reload(page);
            expect((await state(page, 'learn')).position).toEqual([4, 3]);
            expect(await page.evaluate(() => window.Maths1to9Lesson.getScore())).toEqual(before);
            await labelsClear(page);
            expect(errors).toEqual([]);
        });
        test('timed arrows, reduced motion, every triangle feedback and scratch helpers', async ({ page }) => {
            test.setTimeout(180_000);
            const errors = watchForErrors(page);
            await deterministicPractice(page);
            await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
            await page.clock.pauseAt(new Date('2026-01-02T00:00:00Z'));
            await page.goto(`/content/${slug}/`, { waitUntil: 'domcontentloaded' });
            await board(page).waitFor();
            expect(await arrowCount(page)).toBe(0);
            await page.clock.runFor(300);
            expect(await arrowCount(page)).toBe(1);
            await page.clock.runFor(500);
            expect(await arrowCount(page)).toBe(2);
            await page.clock.resume();
            await page.emulateMedia({ reducedMotion: 'reduce' });
            await page.evaluate(() => localStorage.clear());
            await page.reload();
            await board(page).waitFor();
            expect(await arrowCount(page)).toBe(2);
            for (let i = 0; i < 7; i++) await main(page).click();
            const feedback = page.locator('#lesson-section-interactive .question-feedback:visible');
            const cases = [
                { vertical: false, from: [1, -2], to: [4, 4], text: 'That’s the line itself. Draw across first, then up.' },
                { vertical: false, from: [1, -2], to: [3, -2], text: 'Keep going until you’re directly below (4, 4).' },
                { vertical: false, from: [1, -2], to: [5, -2], text: 'Stop directly below (4, 4).' },
                { vertical: false, from: [0, -2], to: [3, -2], text: 'Start at the left point, (1, −2).' },
                { vertical: false, from: [1, -2], to: [3, 0], text: 'Draw straight across, keeping the same height as (1, −2).' }
            ];
            for (const row of cases) {
                const gesture = await pointer(page, row.from, row.to, mode.hasTouch);
                expect(await stroke(page)).toBe(await colour(page, '--primary'));
                await gesture.release();
                await expect(feedback).toHaveText(row.text);
                expect(await stroke(page)).toBe(await colour(page, '--error-dark'));
            }
            await reload(page);
            await expect(feedback).toHaveText(cases.at(-1).text);
            await draw(page, [4, -2], [1, -2], mode.hasTouch);
            await expect(page).toHaveURL(/#try-it-1-up$/);
            await expect(feedback).toHaveText('✓ That’s the horizontal change.');
            for (const row of [
                { from: [1, -2], to: [4, 4], text: 'That’s the line itself. Draw up from (4, −2).' },
                { from: [4, -2], to: [4, 2], text: 'Keep going up to (4, 4).' },
                { from: [4, -2], to: [4, 5], text: 'Stop at (4, 4).' },
                { from: [4, 0], to: [4, 3], text: 'Start where your horizontal line ended, (4, −2).' },
                { from: [4, -2], to: [3, 0], text: 'Draw straight up from (4, −2).' }
            ]) {
                const gesture = await pointer(page, row.from, row.to, mode.hasTouch);
                expect(await stroke(page)).toBe(await colour(page, '--primary'));
                await gesture.release();
                await expect(feedback).toHaveText(row.text);
            }
            await draw(page, [4, 4], [4, -2], mode.hasTouch);
            await expect(feedback).toHaveText('✓ That’s the vertical change.');
            await expect(main(page)).toBeEnabled();
            await main(page).click();
            for (const value of ['3', '6', '2']) { await answer(page, value); await main(page).click(); }
            await expect(page).toHaveURL(/#try-it-2$/);
            await labelsClear(page);
            await draw(page, [1, 1], [5, 3], mode.hasTouch);
            expect(await board(page).evaluate(element => {
                const b = Object.values(window.JXG.boards).find(b => b.containerObj === element);
                return Object.values(b.objects).filter(o => o.visProp.dash === 2).length;
            })).toBe(2);
            await expect(page.locator('.maths-graph__description:visible')).toHaveText('Your helper triangle is shown.');
            await draw(page, [1, 1], [4, 4], mode.hasTouch);
            await expect(page.locator('.maths-graph__description:visible')).toHaveText('Start and end on the line, where it crosses grid corners.');
            await tapLine(page, [1, 1], [5, 3], mode.hasTouch);
            await expect(page.locator('.maths-graph__description:visible')).toHaveText('Your helper triangle is shown.');
            await reload(page);
            expect(await board(page).evaluate(element => {
                const b = Object.values(window.JXG.boards).find(b => b.containerObj === element);
                return Object.values(b.objects).filter(o => o.visProp.dash === 2).length;
            })).toBe(0);
            for (const value of ['1/2', '−1/2']) { await answer(page, value); await main(page).click(); }
            await input(page).fill('4');
            await input(page).press('Enter');
            await expect(page.locator('.question-feedback:visible')).toHaveText('That’s 4 squares. Each square up is 2 units.');
            await reload(page);
            await expect(main(page)).toHaveText('Try again');
            await main(page).click();
            for (const value of ['8', '4']) { await answer(page, value); await main(page).click(); }
            await main(page).click();
            await practice(page, { wrong: true, revisits: true });
            const saved = await state(page, 'question-bank');
            expect(saved.cards['question-bank:1:2'].value).toBe('2/4');
            expect(saved.cards['question-bank:1:2'].firstCorrect).toBe(false);
            await expect(page.locator('.retained-results:visible')).toContainText('2nd try');
            await main(page).click();
            await input(page).fill('2/3');
            await input(page).press('Enter');
            await expect(main(page)).toHaveText('Try again');
            await expect(page.locator('.question-feedback:visible')).toHaveText('Divide the vertical change by the horizontal change.');
            await reload(page);
            await previousSection(page);
            await expect(main(page)).toHaveText('Try again');
            await main(page).click();
            await answer(page, '1.5');
            await reload(page);
            await main(page).click();
            await checkQuestions(page, true, 1);
            const score = await page.evaluate(() => window.Maths1to9Lesson.getScore());
            expect(score.points).toBe(score.maximumPoints - 10);
            if (mode.hasTouch) await main(page).tap();
            else await main(page).click();
            await expect(page).toHaveURL(/\/$/);
            expect(errors).toEqual([]);
        });
        test('every generated misconception rule shows its feedback through a real question card', async ({ page }) => {
            test.setTimeout(180_000);
            const errors = watchForErrors(page);
            await page.goto(`/content/${slug}/`);
            await board(page).waitFor();
            const cases = await page.evaluate(() => {
                const G = window.FindingGradient, E = window.Maths1to9LessonEngine;
                const seen = new Set(), cases = [];
                for (const type of G.types) {
                    for (let i = 0; i < 1000; i++) {
                        const graph = G.generate({ type }, E.seededRandom(Math.imul(i, 2654435761) >>> 0));
                        const key = `${type}:${graph.p}/${graph.q}`;
                        if (!seen.has(key)) { seen.add(key); cases.push({ graph, rules: G.wrongAnswerRules(graph) }); }
                    }
                }
                document.getElementById('lesson-app').hidden = true;
                const host = document.createElement('section');
                host.id = 'rule-test';
                host.style.cssText = 'width:min(440px, calc(100vw - 32px));margin:auto';
                document.body.append(host);
                return cases;
            });
            expect(cases).toHaveLength(21);
            let checked = 0;
            for (const item of cases) {
                for (const rule of item.rules) {
                    await page.evaluate(({ graph, id }) => {
                        const root = document.getElementById('rule-test');
                        root.replaceChildren();
                        const card = document.createElement('div'), button = document.createElement('button');
                        root.append(card, button);
                        button.id = 'rule-check';
                        const section = { state: {}, update(change) { change(this.state); } };
                        window.Maths1to9LessonEngine.createQuestion(card, {
                            ...window.FindingGradient.question(graph), sectionId: 'comparison', questionId: `rule-${id}`, scored: false
                        }, section, {
                            setSectionAction(key, action) { button.textContent = action.label; button.disabled = action.disabled; button.onclick = action.onClick; },
                            clearSectionAction() { button.onclick = null; }
                        });
                    }, { graph: item.graph, id: checked++ });
                    await page.locator('#rule-test input').fill(rule.value);
                    await page.locator('#rule-check').click();
                    await expect(page.locator('#rule-test .question-feedback')).toHaveText(rule.feedback);
                    await expect(page.locator('#rule-check')).toHaveText('Try again');
                }
            }
            expect(checked).toBeGreaterThan(30);
            expect(errors).toEqual([]);
        });
    });
}
