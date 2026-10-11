const { test, expect } = require('@playwright/test');
const { MAIN_ACTION, watchForErrors } = require('./helpers.cjs');
const solveAlgebra = require('./solvers/algebraic-expressions.cjs');
const main = page => page.locator(`${MAIN_ACTION}:visible`);
async function skillCount(page, skill) {
    const record = await page.evaluate(skill => window.Maths1to9Progress.getSkillProgress(skill), skill);
    return record?.assessedQuestions || 0;
}

test('algebraic repeat Practice restores saved questions, freezes points and retains skill evidence', async ({ page }) => {
    const errors = watchForErrors(page);
    await page.goto('content/algebraic-expressions/#question-bank', { waitUntil: 'networkidle' });
    for (let index = 0; index < 10; index++) {
        await solveAlgebra(page);
        await main(page).click();
        await main(page).click();
    }
    const before = await page.evaluate(() => window.Maths1to9Lesson.getProgress());
    const algebraEvidence = async () => (await skillCount(page, 'write-expressions')) + (await skillCount(page, 'use-algebraic-notation'));
    await expect.poll(algebraEvidence).toBe(10);
    const evidence = await algebraEvidence();
    for (let session = 2; session <= 3; session++) {
        await page.getByRole('button', { name: 'Practise again', exact: true }).click();
        for (let index = 0; index < 10; index++) {
            if (index === 0) {
                const prompt = await page.locator('.question-prompt:visible').innerText();
                await page.reload({ waitUntil: 'networkidle' });
                await expect(page.locator('.question-prompt:visible')).toHaveText(prompt);
            }
            await solveAlgebra(page);
            await main(page).click();
            await main(page).click();
        }
        const progress = await page.evaluate(() => window.Maths1to9Lesson.getProgress());
        expect(progress.score).toEqual(before.score);
        expect(progress.finished).toBe(true);
        await expect.poll(algebraEvidence).toBe(evidence + (session - 1) * 10);
        await expect(page.locator('details')).toHaveCount(session - 1);
        await expect(main(page)).toHaveText('All lessons');
    }
    await main(page).click();
    await expect(page).not.toHaveURL(/\/content\//);
    expect(errors).toEqual([]);
});
