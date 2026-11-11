const {test, expect} = require('@playwright/test');
const cases = [
    {
        slug: 'place-value',
        expected: Array.from({ length: 5 }, () => ['place-value'])
    },
    {
        slug: 'greater-than-and-less-than',
        expected: [
            ['order-negative-numbers', 'inequality-symbols'],
            ['order-numbers'],
            ['order-numbers'],
            ['inequality-symbols'],
            ['order-negative-numbers']
        ]
    }
];

for (const { slug, expected } of cases) {
    test(`${slug} final check sends each answer to its intended skills`, async ({ page }) => {
        const solve = require(`./solvers/${slug}.cjs`);
        await page.addInitScript(() => {
            window.skillAttempts = [];
            document.addEventListener('maths1to9:skill-attempt', event => window.skillAttempts.push(event.detail));
        });
        await page.goto(`content/${slug}/#comparison`, { waitUntil: 'networkidle' });
        await page.evaluate(() => window.Maths1to9Lesson.goToSection('comparison', { unlock: true }));
        const main = page.locator('.lesson-controls button.button--primary:visible');
        for (const [index, skills] of expected.entries()) {
            await expect(page).toHaveURL(new RegExp(`#check-${index + 1}$`));
            await expect(page.locator('.question-card-options:visible button')).toHaveCount(4);
            const before = await page.evaluate(() => window.skillAttempts.length);
            await solve(page, {});
            await expect(main).toHaveText('Check');
            await expect(main).toBeEnabled();
            await main.click();
            await expect(main).toHaveText('Continue');
            const attempts = await page.evaluate(start => window.skillAttempts.slice(start), before);
            expect(attempts.map(attempt => attempt.skillId)).toEqual(skills);
            expect(attempts.every(attempt => attempt.correct)).toBe(true);
            await main.click();
        }
        const attempts = await page.evaluate(() => window.skillAttempts);
        expect(new Set(attempts.map(attempt => attempt.questionId)).size).toBe(expected.length);
        await expect(main).toHaveText('All lessons');
    });
}

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
