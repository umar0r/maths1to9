const { test, expect } = require('@playwright/test');
const { MAIN_ACTION } = require('./helpers.cjs');

test('Reset restarts one Learn card and survives reload at phone width', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 900 });
    await page.goto('content/negative-numbers/#learn-8');
    const reset = page.getByRole('button', { name: 'Reset card' });
    const back = page.getByRole('button', { name: 'Previous screen' });
    const nextSum = page.getByRole('button', { name: '−1, show the next sum' });
    const rows = page.locator('.nn-pattern-row');
    await expect(nextSum).toBeVisible();
    await expect(reset).toBeHidden();
    await nextSum.click();
    await expect(reset).toBeVisible();
    await page.reload({ waitUntil: 'networkidle' });
    await expect(reset).toBeVisible();
    const resetBox = await reset.boundingBox();
    const backBox = await back.boundingBox();
    expect(resetBox.x).toBeGreaterThan(backBox.x + backBox.width);
    expect(resetBox.y).toBeCloseTo(backBox.y);
    for (let i = 0; i < 4; i++) await nextSum.click();
    await expect(rows).toHaveCount(6);
    await reset.click();
    await expect(rows).toHaveCount(1);
    await expect(reset).toBeHidden();
    await page.reload({ waitUntil: 'networkidle' });
    await expect(rows).toHaveCount(1);
    await expect(nextSum).toBeVisible();
});

test('Reset keeps the seeded question and its first-attempt evidence', async ({ page }) => {
    await page.goto('content/negative-numbers/');
    await expect(page.locator('.nn-learn:visible [data-screen-heading]')).toBeVisible();
    // Open Practice directly to exercise a seeded question.
    await page.evaluate(() => Maths1to9Lesson.goToSection('question-bank', { unlock: true }));
    const question = page.locator('#lesson-section-question-bank .question-card:visible');
    await expect(question).toBeVisible();
    const reset = page.getByRole('button', { name: 'Reset card' });
    await expect(reset).toBeHidden();
    const prompt = await question.locator('.question-prompt').textContent();
    const savedPractice = () => page.evaluate(async () =>
        (await Maths1to9Progress.getLessonActivityState('negative-numbers', 'question-bank'))?.data);
    await expect.poll(savedPractice).toBeDefined();
    const stateBefore = await savedPractice();
    const options = question.getByRole('group', { name: 'Choose an answer' }).getByRole('button');
    if (await options.count()) await options.first().click();
    else await question.locator('input').first().fill('12345');
    await page.locator(`${MAIN_ACTION}:visible`).click();
    const score = await page.evaluate(() => Maths1to9Lesson.getScore());
    await expect(reset).toBeVisible();
    await reset.click();
    await expect(reset).toBeHidden();
    await expect(question.locator('.question-prompt')).toHaveText(prompt);
    await expect(question.locator('.question-feedback.is-visible')).toHaveCount(0);
    await expect(page.locator(`${MAIN_ACTION}:visible`)).toBeDisabled();
    expect(await page.evaluate(() => Maths1to9Lesson.getScore())).toEqual(score);
    const questionId = `question-bank:${stateBefore.session}:1`;
    await expect.poll(async () => (await savedPractice()).cards[questionId]).toMatchObject({
        firstCorrect: expect.any(Boolean)
    });
    const stateAfter = await savedPractice();
    expect(stateAfter.items).toEqual(stateBefore.items);
    expect(stateAfter.screen).toBe(stateBefore.screen);
});
