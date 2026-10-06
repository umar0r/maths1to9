// Every lesson in a real browser: loads cleanly, keeps one score circle and
// one main button on every screen it reaches, locks later sections and
// survives a reload. Each test starts with fresh (empty) saved progress.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { MAIN_ACTION, watchForErrors, screen, screenProblems } = require('./helpers.cjs');

const contentDir = path.join(__dirname, '..', '..', 'content');
const lessons = fs.readdirSync(contentDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && !entry.name.startsWith('_'))
    .map(entry => entry.name).sort();
const MAX_STEPS = 60;

// Click through the lesson as far as generic moves allow: press the main
// button when it is enabled, otherwise try each answer or control in turn.
async function walk(page, onScreen) {
    const tried = new Map();
    let lastSignature = '';
    let stuck = 0;
    for (let step = 0; step < MAX_STEPS; step++) {
        const state = await screen(page);
        // Leaving the lesson (e.g. the final "All lessons" button) ends the walk;
        // check this first so the homepage is never judged as a lesson screen.
        if (!/\/content\//.test(page.url())) return { finished: true, state };
        await onScreen(state);
        const main = page.locator(`${MAIN_ACTION}:visible`).first();
        const signature = `${state.hash}|${state.heading}|${state.scores[0]?.text}|${state.mainActions[0]?.text}`;
        stuck = signature === lastSignature ? stuck + 1 : 0;
        lastSignature = signature;
        if (stuck > 12) return { finished: false, state };

        const enabled = await main.isEnabled().catch(() => false);
        const wrongAnswerShown = await page.locator('.question-feedback.is-incorrect:visible, .is-incorrect:visible').count();
        if (enabled && !(wrongAnswerShown && stuck > 0)) {
            await main.click();
        } else {
            // Try the next untried control in the lesson content.
            const controls = page.locator('main button:visible:enabled, main [role="button"]:visible, main input[type="radio"]:visible:enabled')
                .filter({ hasNot: page.locator('nav') });
            const count = await controls.count();
            const done = tried.get(signature) ?? 0;
            let clicked = false;
            for (let i = done; i < count; i++) {
                const control = controls.nth(i);
                const inNavOrFooter = await control.evaluate(el => !!el.closest('nav, .lesson-controls, header'));
                tried.set(signature, i + 1);
                if (inNavOrFooter) continue;
                await control.click({ timeout: 1000 }).catch(() => {});
                clicked = true;
                break;
            }
            if (!clicked) return { finished: false, state };
            if (await main.isEnabled().catch(() => false)) await main.click().catch(() => {});
        }
        await page.waitForTimeout(100);
    }
    return { finished: false, state: await screen(page) };
}

for (const lesson of lessons) {
    test.describe(lesson, () => {
        test('loads without errors or missing files', async ({ page }) => {
            const errors = watchForErrors(page);
            await page.goto(`content/${lesson}/`, { waitUntil: 'networkidle' });
            await expect(page.locator('#lesson-loading')).toHaveCount(0);
            expect(errors).toEqual([]);
        });

        test('every screen has one score circle, one main button and at most one Continue', async ({ page }) => {
            test.setTimeout(180_000);
            const errors = watchForErrors(page);
            await page.goto(`content/${lesson}/`, { waitUntil: 'networkidle' });
            let points = 0, screens = 0;
            // First screen where each rule was broken.
            const broken = new Map();
            const result = await walk(page, state => {
                const check = screenProblems(state, points);
                points = check.points;
                screens++;
                for (const { rule, where } of check.problems) {
                    const key = rule.replace(/\d+/g, 'N');
                    if (!broken.has(key)) broken.set(key, `${rule} (first at ${where})`);
                }
            });
            test.info().annotations.push({ type: 'reached', description: `${screens} screens, ${points} points, ${result.finished ? 'finished the lesson' : `stopped at ${result.state.where}`}` });
            expect([...broken.values()], 'screen rules broken while working through the lesson').toEqual([]);
            expect(errors, 'no errors while working through the lesson').toEqual([]);
        });

        test('later sections are locked at the start', async ({ page }) => {
            await page.goto(`content/${lesson}/`, { waitUntil: 'networkidle' });
            // Section tabs are buttons in most lessons, plain links in some.
            const stages = page.locator('nav .lesson-navigation__button:visible, nav button:visible')
                .filter({ hasNotText: /^\s*Continue\s*$/ });
            const count = await stages.count();
            expect(count, 'the lesson should show its sections').toBeGreaterThan(1);
            const unlocked = [];
            for (let i = 1; i < count; i++) {
                const locked = await stages.nth(i).evaluate(el => el.disabled === true || el.getAttribute('aria-disabled') === 'true');
                if (!locked) unlocked.push(`${i + 1} (${(await stages.nth(i).textContent()).trim()})`);
            }
            expect(unlocked, 'these sections should be locked on a fresh start').toEqual([]);
        });

        test('reloading keeps your place', async ({ page }) => {
            await page.goto(`content/${lesson}/`, { waitUntil: 'networkidle' });
            const main = page.locator(`${MAIN_ACTION}:visible`).first();
            for (let i = 0; i < 2 && await main.isEnabled().catch(() => false); i++) {
                await main.click();
                await page.waitForTimeout(150);
            }
            const before = await screen(page);
            await page.waitForTimeout(300); // let the progress save finish
            await page.reload({ waitUntil: 'networkidle' });
            const after = await screen(page);
            expect(after.hash, 'same section after reload').toBe(before.hash);
            expect(after.heading, 'same screen after reload').toBe(before.heading);
            expect(after.scores[0]?.text, 'same score after reload').toBe(before.scores[0]?.text);
        });
    });
}
