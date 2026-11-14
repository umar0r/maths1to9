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
    await expect(reset).toBeDisabled();
    await nextSum.click();
    await expect(reset).toBeEnabled();
    await page.reload({ waitUntil: 'networkidle' });
    await expect(reset).toBeEnabled();
    const resetBox = await reset.boundingBox();
    const backBox = await back.boundingBox();
    expect(resetBox.x).toBeGreaterThan(backBox.x + backBox.width);
    expect(resetBox.y).toBeCloseTo(backBox.y);
    for (let i = 0; i < 4; i++) await nextSum.click();
    await expect(rows).toHaveCount(6);
    await reset.click();
    await expect(rows).toHaveCount(1);
    await expect(reset).toBeDisabled();
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
    await expect(reset).toBeDisabled();
    const prompt = await question.locator('.question-prompt').textContent();
    const savedPractice = () => page.evaluate(async () =>
        (await Maths1to9Progress.getLessonActivityState('negative-numbers', 'question-bank'))?.data);
    await expect.poll(savedPractice).toBeDefined();
    const stateBefore = await savedPractice();
    const options = question.getByRole('group', { name: 'Choose an answer' }).getByRole('button');
    const line = question.getByRole('slider', { name: 'Choose an answer on the number line' });
    if (await options.count()) await options.first().click();
    else if (await line.count()) await line.press('Home');
    else await question.locator('input').first().fill('12345');
    await page.locator(`${MAIN_ACTION}:visible`).click();
    const score = await page.evaluate(() => Maths1to9Lesson.getScore());
    await expect(reset).toBeEnabled();
    await reset.click();
    await expect(reset).toBeDisabled();
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

test('Back and Reset always show, greyed out until there is something to do', async ({ page }) => {
    await page.goto('content/place-value/');
    const back = page.getByRole('button', { name: 'Previous screen' });
    const reset = page.getByRole('button', { name: 'Reset card' });
    await expect(back).toBeVisible();
    await expect(back).toBeDisabled();
    await expect(reset).toBeVisible();
    await expect(reset).toBeDisabled();
});
