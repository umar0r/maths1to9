// Phone checks for every lesson with a solver, at 375 px wide. One run per
// lesson checks the things a pupil on a phone would notice:
// - no screen scrolls sideways;
// - the first multiple-choice card in each section gives feedback for a
//   wrong answer, offers Try again, and can then be answered correctly;
// - going Back from a Practice question and Next again keeps the score;
// - no JavaScript errors or failed requests.
// The solver answers everything else correctly, as in engine-runs.spec.cjs.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { MAIN_ACTION, watchForErrors, screen } = require('./helpers.cjs');

const solversDir = path.join(__dirname, 'solvers');
const lessons = fs.readdirSync(solversDir).filter(f => f.endsWith('.cjs') && f !== 'common.cjs').map(f => f.replace(/\.cjs$/, ''));
const MAX_STEPS = 400;

test.use({ viewport: { width: 375, height: 812 }, hasTouch: true });

const sectionOf = page => page.evaluate(() => window.Maths1to9Lesson?.getCurrentSection?.()?.id ?? '').catch(() => '');
const scoreOf = page => page.evaluate(() => window.Maths1to9Lesson?.getScore?.()?.points ?? null).catch(() => null);

for (const lesson of lessons) {
    test(`${lesson}: at 375 px every screen fits, a wrong answer can be put right, and Back keeps the score`, async ({ page }) => {
        test.setTimeout(240_000);
        const solve = require(path.join(solversDir, `${lesson}.cjs`));
        const errors = watchForErrors(page);
        const memory = {};
        const problems = new Set();
        const retried = new Set();
        let backChecked = false, wrongChecked = 0, openChoices = 0, last = '', stuck = 0;
        await page.goto(`content/${lesson}/`, { waitUntil: 'networkidle' });
        const main = page.locator(`${MAIN_ACTION}:visible`).first();

        for (let step = 0; step < MAX_STEPS && /\/content\//.test(page.url()); step++) {
            const state = await screen(page);
            if (process.env.DEBUG_RUN) console.log(step, state.where, JSON.stringify(state.mainActions));
            const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
            if (overflow > 1) problems.add(`scrolls sideways by ${overflow}px at ${state.where}`);

            const signature = `${state.where}|${JSON.stringify(state.mainActions)}|${await page.evaluate(() => document.querySelector('main')?.innerText.length)}`;
            stuck = signature === last ? stuck + 1 : 0;
            last = signature;
            expect(stuck, `stuck at ${state.where}`).toBeLessThan(6);

            const mainText = state.mainActions[0]?.text ?? '';
            const card = page.locator('.question-card:visible').first();
            const options = card.locator('.question-card-options button');

            // Back then Next from an unanswered Practice question, once per lesson.
            if (!backChecked && /question-bank-question-[2-9]/.test(state.hash) && mainText === 'Check' && state.mainActions[0]?.disabled) {
                const back = page.getByRole('button', { name: 'Previous screen' });
                if (await back.isVisible().catch(() => false)) {
                    const before = await scoreOf(page);
                    await back.click();
                    await expect(main, `Back should show Next at ${state.where}`).toHaveText('Next');
                    await main.click();
                    await expect(page).toHaveURL(new RegExp(`${state.hash}$`));
                    expect(await scoreOf(page), `Back and Next changed the score at ${state.where}`).toBe(before);
                    backChecked = true;
                    continue;
                }
            }

            // Wrong then right, on the first unanswered choice card of each section.
            const section = await sectionOf(page);
            if (mainText === 'Check' && state.mainActions[0]?.disabled && !retried.has(section) && await options.count() >= 2) {
                const acted = await solve(page, memory);
                const pressed = await options.evaluateAll(buttons => buttons.findIndex(b => b.getAttribute('aria-pressed') === 'true'));
                const wrong = await options.evaluateAll((buttons, right) =>
                    buttons.findIndex((b, i) => i !== right && !b.disabled), pressed);
                // Some older solvers press Check themselves; then the card is already answered.
                const stillOpen = (await main.innerText().catch(() => '')) === 'Check' && await main.isEnabled().catch(() => false);
                if (stillOpen) openChoices++;
                if (acted && pressed >= 0 && wrong >= 0 && stillOpen) {
                    retried.add(section);
                    await options.nth(wrong).click();
                    await main.click();
                    await expect(main, `wrong answer should offer Try again at ${state.where}`).toHaveText('Try again');
                    const feedback = card.locator('.question-feedback.is-incorrect');
                    await expect(feedback, `no feedback for a wrong answer at ${state.where}`).toBeVisible();
                    expect((await feedback.innerText()).trim().length, `empty feedback at ${state.where}`).toBeGreaterThan(5);
                    await main.click();
                    await solve(page, memory);
                    await main.click();
                    await expect(main, `the right answer after a retry should be accepted at ${state.where}`).toHaveText(/Continue|Next|All lessons/);
                    wrongChecked++;
                }
                continue;
            }

            const acted = await solve(page, memory);
            if (acted) { await page.waitForTimeout(120); continue; }
            if (await main.isEnabled().catch(() => false)) {
                if (/^(finish lesson|all lessons|back to lessons)/i.test(mainText)) break;
                await main.click();
                await page.waitForTimeout(150);
                continue;
            }
            if (!state.mainActions.length) break;
            await page.waitForTimeout(800);
        }

        test.info().annotations.push({ type: 'checks', description: `${wrongChecked} wrong-then-right cards; Back ${backChecked ? 'checked' : 'not reached'}`
            + (openChoices ? '' : '; this solver submits its own answers, so wrong answers are left to the lesson\'s own spec') });
        expect.soft([...problems], 'layout problems at 375 px').toEqual([]);
        expect.soft(errors, 'no errors during the run').toEqual([]);
        if (openChoices) expect.soft(wrongChecked, 'at least one wrong-then-right card was tried').toBeGreaterThan(0);
    });
}
