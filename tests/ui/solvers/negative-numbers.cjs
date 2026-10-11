// Read the subtraction on screen, rewrite it as addition, and complete each
// number-line or question activity through the lesson's single footer action.
const MODEL_REASON = 'Subtracting a negative number becomes adding the positive number. The starting number stays unchanged.';
const number = value => Number(value.replace('−', '-'));
const signed = value => String(value).replace('-', '−');
const slide = (slider, value) => slider.evaluate((element, position) => {
    element.value = String(position);
    element.dispatchEvent(new Event('input', {bubbles:true}));
}, value);

async function numberLine(root) {
    const slider = root.locator('input[type=range]');
    const plus = root.locator('[data-op="+"]:visible');
    if (await plus.count()) { await plus.click(); return true; }
    const right = root.locator('[data-dir="right"]:visible');
    if (await right.count()) { await right.click(); return true; }
    if (await slider.isDisabled()) return false;
    const text = await root.innerText();
    const start = text.match(/Drag the marker to ([−-]?\d+)/);
    await slide(slider, start ? number(start[1]) : Number(await slider.inputValue()) + 1);
    return true;
}

module.exports = async function solve(page, memory) {
    for (const root of await page.locator('[data-guided-line]:visible').all()) {
        if (await numberLine(root)) return true;
    }
    for (const sign of await page.locator('[data-sign]:visible:enabled').all()) {
        if (await sign.getAttribute('data-sign') !== 'start' && await sign.getAttribute('aria-pressed') !== 'true') {
            await sign.click(); return true;
        }
    }
    const form = page.locator('form[data-question]:visible').first();
    if (await form.count()) {
        const review = form.locator('[data-review="yes"]');
        if (await review.count()) {
            if (await review.getAttribute('aria-pressed') !== 'true') { await review.click(); return true; }
            return false; // The footer confirms the self-check.
        }
        const main = page.locator('.lesson-controls button.button--primary');
        if (await main.isEnabled()) return false;
        const text = await form.innerText();
        const calculation = text.match(/([−-]?\d+)\s*−\s*\(−(\d+)\)/);
        let answer;
        if (calculation) {
            const start = number(calculation[1]), amount = Number(calculation[2]);
            const rewrite = await form.locator('input[type=radio]').count() || /^A\d/.test(await form.locator('..').locator('h2').innerText());
            answer = rewrite ? `${signed(start)} + ${amount}` : signed(start + amount);
        } else {
            const initial = text.match(/temperature is ([−-]?\d+)/);
            const final = text.match(/midday, it is ([−-]?\d+)/);
            if (!initial || !final) throw new Error(`Cannot solve subtraction question: ${text}`);
            answer = String(number(final[1]) - number(initial[1]));
        }
        const radios = form.locator('input[type=radio]');
        if (await radios.count()) await form.locator(`input[value="${answer}"]`).check();
        else await form.locator('input[name=answer]').fill(answer);
        const reason = form.locator('textarea[name=reason]');
        if (await reason.count()) await reason.fill(MODEL_REASON);
        return true;
    }
    const result = page.locator('[data-result]:visible');
    if (await result.count() && !memory.resultChecked) {
        const text = await result.innerText();
        if (!/4 out of 4/.test(text)) (memory.problems ??= []).push(`Perfect answers produced: ${text}`);
        memory.resultChecked = true;
    }
    return false;
};
