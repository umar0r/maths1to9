const {test, expect} = require('@playwright/test');
const solve = require('./solvers/place-value.cjs');

test('place-value final check sends each answer to its intended skills', async ({page}) => {
    await page.addInitScript(() => {
        window.skillAttempts = [];
        document.addEventListener('maths1to9:skill-attempt', e => window.skillAttempts.push(e.detail));
    });
    await page.goto('content/place-value/#comparison', {waitUntil:'networkidle'});
    const next = page.getByRole('button', {name:'Next question', exact:true});
    for (let i = 1; i <= 5; i++) {
        await expect(page.locator('.final-check-count')).toHaveText(`Question ${i} of 5`);
        await solve(page, {});
        await expect(next).toBeEnabled();
        await next.click();
    }
    const attempts = await page.evaluate(() => window.skillAttempts);
    expect(attempts.map(a=>a.skillId)).toEqual([
        'place-value', 'order-numbers', 'inequality-symbols', 'order-numbers', 'place-value', 'place-value'
    ]);
    expect(attempts.every(a=>a.correct)).toBe(true);
    expect(new Set(attempts.map(a=>a.questionId)).size).toBe(5);
});

test('unknown assessment types are rejected with a warning before scoring', async ({page}) => {
    await page.goto('content/place-value/', {waitUntil:'networkidle'});
    const warnings = [];
    page.on('console', message => { if (message.type() === 'warning') warnings.push(message.text()); });
    const accepted = await page.evaluate(() => window.Maths1to9Lesson.recordAssessment({
        questionType:'unmapped-type', questionId:'final-check-1', correct:true
    }));
    expect(accepted).toBe(false);
    expect(warnings.some(w=>w.includes('unmapped-type') && w.includes('no skill mapping'))).toBe(true);
});
