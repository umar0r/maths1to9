// Full runs through the lessons that use the shared lesson engine. Each lesson
// has a solver in ./solvers that answers its puzzles and questions correctly
// first time, so the lesson must finish with every activity done and full marks.
// Screen rules (score circle, one main button, one Continue) are checked on
// every screen and reported together at the end.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { MAIN_ACTION, watchForErrors, screen, screenProblems } = require('./helpers.cjs');

const solversDir = path.join(__dirname, 'solvers');
const lessons = fs.readdirSync(solversDir).filter(f => f.endsWith('.cjs') && f !== 'common.cjs').map(f => f.replace(/\.cjs$/, ''));
const MAX_STEPS = 400;

for (const lesson of lessons) {
    test(`${lesson}: a full correct run completes every activity with full marks`, async ({ page }) => {
        test.setTimeout(240_000);
        const solve = require(path.join(solversDir, `${lesson}.cjs`));
        // Progress is saved under the lesson's slug, which is not always the folder name.
        const dataFile = path.join(__dirname, '..', '..', 'content', lesson, 'lesson.json');
        const slug = (fs.existsSync(dataFile) && JSON.parse(fs.readFileSync(dataFile, 'utf8')).slug) || lesson;
        const errors = watchForErrors(page);
        const memory = {}; // lets a solver remember what it has already done
        await page.goto(`content/${lesson}/`, { waitUntil: 'networkidle' });
        const main = page.locator(`${MAIN_ACTION}:visible`).first();
        const broken = new Map();
        let points = 0, stuck = 0, last = '', progress = null;
        const seen = new Map();

        for (let step = 0; step < MAX_STEPS && /\/content\//.test(page.url()); step++) {
            const state = await screen(page);
            const check = screenProblems(state, points);
            points = check.points;
            for (const { rule, where } of check.problems) {
                const key = rule.replace(/\d+/g, 'N');
                if (!broken.has(key)) broken.set(key, `${rule} (first at ${where})`);
            }
            progress = await page.evaluate(slug => window.Maths1to9Progress?.getLessonProgress?.(slug), slug).catch(() => progress) ?? progress;
            if (process.env.DEBUG_RUN) console.log(step, state.where, JSON.stringify(state.mainActions), state.scores[0]?.label,
                'incomplete:', (progress?.scoreActivities ?? []).filter(a => !a.completed).map(a => a.id).join(',').slice(0, 120));

            // Stuck: the same screen again and again, or a retry loop between two screens.
            const fingerprint = await page.evaluate(() => {
                const text = document.querySelector('main')?.innerText ?? '';
                let hash = 0;
                for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) | 0;
                return hash;
            });
            const signature = `${state.where}|${state.scores[0]?.label}|${JSON.stringify(state.mainActions)}|${fingerprint}`;
            stuck = signature === last ? stuck + 1 : 0;
            last = signature;
            seen.set(signature, (seen.get(signature) ?? 0) + 1);
            // Full marks but the button no longer changes anything: the lesson has no way out.
            if (stuck >= 3 && progress?.score && progress.score.points === progress.score.maximumPoints && state.mainActions.length) {
                (memory.problems ??= []).push(`the last screen's "${state.mainActions[0].text}" button does nothing (${state.where})`);
                break;
            }
            expect(stuck, `stuck at ${state.where} (main button: ${JSON.stringify(state.mainActions)})`).toBeLessThan(6);
            expect(seen.get(signature), `going round in circles at ${state.where} (main button: ${JSON.stringify(state.mainActions)})`).toBeLessThan(8);

            // Endless practice: stop once the lesson says it is finished and everything is done.
            const done = (progress?.scoreActivities ?? []).length > 0 && progress.scoreActivities.every(a => a.completed);
            if (done && /next question|check answer/i.test(state.mainActions[0]?.text ?? '')) {
                test.info().annotations.push({ type: 'note', description: `finished, but the lesson keeps offering "${state.mainActions[0].text}" with no button to end it` });
                break;
            }
            const acted = await solve(page, memory);
            if (acted) { await page.waitForTimeout(120); continue; }
            const mainText = state.mainActions[0]?.text ?? '';
            if (await main.isEnabled().catch(() => false)) {
                if (/^(finish lesson|all lessons|back to lessons)/i.test(mainText)) {
                    // Last button: stop here so the final score can be read on the lesson page.
                    break;
                }
                await main.click();
                await page.waitForTimeout(150);
                continue;
            }
            // No main button and nothing to solve: this is where the lesson ends.
            if (!state.mainActions.length) break;
            // Maybe an animation is running: wait and look again (the stuck check above
            // fails the run if the screen never changes).
            await page.waitForTimeout(800);
        }

        progress = await page.evaluate(slug => window.Maths1to9Progress?.getLessonProgress?.(slug), slug).catch(() => progress) ?? progress;
        expect.soft(progress?.score, progress
            ? `the lesson saves progress for "${slug}" but no score, so points cannot be earned or shown`
            : `no saved progress found for "${slug}", so the score could not be checked`).toBeTruthy();
        const missed = (progress?.scoreActivities ?? []).filter(a => !a.completed || (a.kind === 'answer' && !a.firstCorrect)).map(a => a.id);
        test.info().annotations.push({ type: 'score', description: `${progress?.score?.points} of ${progress?.score?.maximumPoints} points` });
        if (lesson === 'function-machines-find-the-input-2') {
            expect.soft(progress?.score?.maximumPoints, 'Every function-machine question and step must count separately').toBe(360);
        }
        // Report every end-of-run problem together rather than stopping at the first.
        expect.soft(missed, 'activities not completed (or not correct first time) after a full correct run').toEqual([]);
        if (progress?.score) expect.soft(progress.score.points, 'a full correct run should earn full marks').toBe(progress.score.maximumPoints);
        expect.soft([...broken.values()], 'screen rules broken during the run').toEqual([]);
        expect.soft(errors, 'no errors during the run').toEqual([]);
        expect.soft([...new Set(memory.problems ?? [])], 'problems the solver noticed on the way').toEqual([]);
    });
}
