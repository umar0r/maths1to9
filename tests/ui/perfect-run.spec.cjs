// A perfect run through the custom lessons (learn / step by step / practise /
// check). Practice and check answers come from lesson.json, so every one is
// right first time and the lesson must finish on full marks.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { MAIN_ACTION, watchForErrors, screen, checkScreen } = require('./helpers.cjs');

const contentDir = path.join(__dirname, '..', '..', 'content');
const customLessons = fs.readdirSync(contentDir).filter(folder => {
    const page = path.join(contentDir, folder, 'index.php');
    const data = path.join(contentDir, folder, 'lesson.json');
    return fs.existsSync(page) && fs.readFileSync(page, 'utf8').includes('data-lesson-renderer="custom"')
        && fs.existsSync(data) && Array.isArray(JSON.parse(fs.readFileSync(data, 'utf8')).practice);
});
// Compare answers the way the lessons do: ignore commas, spaces and minus style.
const same = (a, b) => String(a).replace(/[,\s]/g, '').replace(/−/g, '-') === String(b).replace(/[,\s]/g, '').replace(/−/g, '-');

for (const lesson of customLessons) {
    test(`${lesson}: a perfect run finishes with full marks`, async ({ page }) => {
        test.setTimeout(120_000);
        const data = JSON.parse(fs.readFileSync(path.join(contentDir, lesson, 'lesson.json'), 'utf8'));
        const assessed = [...data.practice, ...data.check];
        const errors = watchForErrors(page);
        await page.goto(`content/${lesson}/`, { waitUntil: 'networkidle' });
        const main = page.locator(`${MAIN_ACTION}:visible`).first();
        let points = 0;
        // Click the option that matches an answer from lesson.json.
        const choose = async answer => {
            const choices = page.locator('[data-choice]:visible');
            const labels = await choices.allTextContents();
            const index = labels.findIndex(label => same(label, answer));
            expect(index, `no option matches the answer ${answer} (options: ${labels.join(', ')})`).toBeGreaterThanOrEqual(0);
            await choices.nth(index).click();
        };

        for (let step = 0; step < 400 && /\/content\//.test(page.url()); step++) {
            const state = await screen(page);
            points = checkScreen(state, points);
            if (await page.locator('.rounding-finish').count()) break;
            const counter = await page.evaluate(() => document.querySelector('.rounding-counter')?.textContent ?? '');
            const prompt = await page.evaluate(() => document.querySelector('h2')?.textContent.replace(/\s+/g, ' ').trim() ?? '');
            if (process.env.DEBUG_RUN) console.log(step, counter.trim(), '|', prompt, '|', JSON.stringify(state.mainActions));
            const question = /^Question/.test(counter) ? assessed.find(q => q.prompt.replace(/\s+/g, ' ') === prompt) : null;
            const example = /^Example/.test(counter) ? data.guided.find(g => g.prompt.replace(/\s+/g, ' ') === prompt) : null;

            // Explore slides earn points for trying the slider.
            await page.locator('input[type="range"]:visible').evaluateAll(sliders => sliders.forEach(slider => {
                slider.value = String(Number(slider.value) === Number(slider.max) ? slider.min : Number(slider.value) + 1);
                slider.dispatchEvent(new Event('input', { bubbles: true }));
            }));
            const sectors = page.locator('[data-sector]:visible');
            if (await sectors.count() && !(await page.locator('[data-sector][aria-disabled="true"]').count())) {
                // Percentages: colour 15 of the 20 sectors (75%), then check.
                for (let i = 0; i < 15; i++) await page.locator(`[data-sector="${i}"]`).click();
                await main.click();
            } else if (question && await main.isDisabled()) {
                // Practice or check: answer correctly first time.
                if (await page.locator('[data-choice]:visible').count()) {
                    await choose(question.answer);
                } else {
                    await page.locator('#rounding-answer').fill(question.answer);
                }
                await main.click();
            } else if (example && await main.isDisabled()) {
                // Step by step: answer each step from lesson.json.
                const stepNumber = Number(counter.match(/Step (\d+)/)?.[1] ?? 0);
                if (example.rows && await page.locator('[data-working]').count()) {
                    for (const [i, row] of example.rows.entries()) await page.locator(`[data-working="${i}"]`).fill(row.answer);
                } else if (example.steps) {
                    await choose(example.steps[stepNumber - 1].answer);
                } else if (stepNumber < 3) {
                    // Tap the digit to keep, then the deciding digit.
                    await page.locator(`[data-choice="${stepNumber === 1 ? example.target : example.decider}"]`).click();
                } else {
                    await choose(example.answer);
                }
                await main.click();
            } else {
                await main.click();
            }
            await page.waitForTimeout(50);
        }

        const finish = await page.locator('.rounding-finish').textContent();
        const [, earned, maximum] = finish.match(/earned (\d+) \/ (\d+) points/) ?? [];
        expect(Number(earned), `finished with ${earned} of ${maximum} points`).toBe(Number(maximum));
        expect(finish, 'the lesson should say it is complete').toMatch(/complete/i);
        expect(points, 'the score circle should match the final score').toBe(Number(earned));
        const lastButton = (await screen(page)).mainActions[0]?.text;
        expect(lastButton, 'the final slide button should say where it goes, like the other lessons').toBe('All lessons');
        expect(errors).toEqual([]);
    });
}
