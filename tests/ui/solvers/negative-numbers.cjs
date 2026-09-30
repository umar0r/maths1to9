// Solver for negative-numbers (subtracting negatives). The lesson has its own
// layout: every question of a stage is on one page with its own Check button,
// number-line tasks, and a Next button to move on. Answers come from lesson.js.
const path = require('node:path');
const { loadScript, contentDir } = require('../../helpers/lessons.cjs');

const lesson = loadScript(path.join(contentDir, 'negative-numbers', 'lesson.js'), ['guided', 'practice', 'checkQuestions'],
    { window: { Maths1to9Progress: { getLessonProgress: async () => null, saveLessonProgress: async () => {} } } });
const questions = Object.fromEntries([...lesson.guided, ...lesson.practice, ...lesson.checkQuestions].map(q => [q.id, q]));
const MODEL_REASON = 'Subtracting a negative number is the same as adding the positive number, so the second minus sign becomes a plus.';

// Move a number-line slider to a value, firing the input event like a drag would.
const slide = (slider, value) => slider.evaluate((el, v) => { el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true })); }, value);

// Finish a guided number line: pick +, start, choose right, then jump one step at a time.
async function numberLine(page, root) {
    const done = await root.locator('[role=status]').innerText().catch(() => '');
    if (/ = .* = /.test(done)) return false;
    const plus = root.locator('[data-op="+"]:visible');
    if (await plus.count()) { await plus.click(); return true; }
    const slider = root.locator('input[type=range]');
    if (await slider.isDisabled()) {
        const right = root.locator('[data-dir="right"]:visible');
        if (await right.count()) { await right.click(); return true; }
        return false;
    }
    const instruction = await root.locator('[data-instruction]').innerText();
    const start = instruction.match(/Drag the marker to (−?\d+)/)?.[1];
    if (start) { await slide(slider, Number(start.replace('−', '-'))); return true; }
    await slide(slider, Number(await slider.inputValue()) + 1);
    return true;
}

module.exports = async function solve(page, memory) {
    memory.submitted ??= new Set();
    // Number lines (learn and guided).
    for (const root of await page.locator('[data-guided-line]:visible').all()) {
        if (await numberLine(page, root)) return true;
    }
    // "Spot what changes": select the two signs that change (never the starting number's).
    for (const sign of await page.locator('[data-sign]:visible').all()) {
        if ((await sign.getAttribute('data-sign')) !== 'start' && (await sign.getAttribute('aria-pressed')) !== 'true') { await sign.click(); return true; }
    }
    // Question forms: answer, explain if asked, check, then self-review.
    for (const form of await page.locator('form[data-question]:visible').all()) {
        const id = await form.getAttribute('data-question');
        const q = questions[id] ?? (id === 'extra' ? { answer: '−4' } : null);
        const review = form.locator('[data-review="yes"]:visible');
        if (await review.count()) { await review.click(); return true; }
        if (memory.submitted.has(id) || !q) continue;
        if (await form.locator('input[type=radio]').count()) {
            await form.locator(`input[type=radio][value="${q.answer}"]`).evaluate(el => { el.checked = true; el.dispatchEvent(new Event('input', { bubbles: true })); });
        }
        else await form.locator('input[name=answer]').fill(q.answer);
        if (await form.locator('textarea[name=reason]').count()) await form.locator('textarea[name=reason]').fill(MODEL_REASON);
        await form.locator('button[type=submit], button:not([type=button])').first().click();
        memory.submitted.add(id);
        return true;
    }
    // Everything on this stage is done: move on.
    const next = page.locator('[data-next]:visible:enabled');
    if (await next.count()) { await next.click(); return true; }
    // Last stage: the lesson's own result should show a perfect score.
    const result = await page.locator('[data-result]:visible').innerText().catch(() => '');
    if (result && !/4 out of 4/.test(result) && !memory.resultChecked) {
        (memory.problems ??= []).push(`after answering everything correctly the result says: "${result.replace(/\s+/g, ' ').slice(0, 120)}"`);
    }
    memory.resultChecked = true;
    return false;
};
