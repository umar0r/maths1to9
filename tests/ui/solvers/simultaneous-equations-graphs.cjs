// Answers every card through real browser input, including the shared graph picker.
const { MAIN_ACTION } = require('../helpers.cjs');
const slug = 'simultaneous-equations-graphs';
const root = page => page.locator('.lesson-section:visible');
async function read(page) {
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    return page.evaluate(async slug => {
        const api = Maths1to9Lesson, T = Simultaneous, id = api.getCurrentSection().id;
        const saved = await Maths1to9Progress.getLessonActivityState(slug, id === 'explanation' ? 'learn' : id);
        const s = saved?.data;
        let q;
        if (id === 'interactive' && s?.screen > 0 && s.screen < T.examples.length) q = T.examples[s.screen];
        else if (id === 'comparison' && s) q = T.checks[s.screen];
        else if (id === 'question-bank' && s?.items?.[s.screen]) {
            const item = s.items[s.screen];
            q = T.generate(item, Maths1to9LessonEngine.seededRandom(item.seed));
        }
        return { id, s, q: q && { input: q.input, answer: q.answer, fields: q.fields, tolerance: q.tolerance, options: q.options, lines: q.lines } };
    }, slug);
}
async function tap(page, point) {
    const board = root(page).locator('[role="application"]').first();
    await board.scrollIntoViewIfNeeded();
    const box = await board.boundingBox();
    const grid = { x: [-5, 3], y: [-2, 9] };
    const at = { x: box.x + box.width * (point[0] - grid.x[0] + 0.8) / 9.6,
        y: box.y + box.height * (grid.y[1] + 0.8 - point[1]) / 12.6 };
    if (await page.evaluate(() => navigator.maxTouchPoints > 0)) await page.touchscreen.tap(at.x, at.y);
    else await page.mouse.click(at.x, at.y);
}
async function solve(page) {
    const { id, s, q } = await read(page);
    if (id === 'explanation') return false;
    if (id === 'interactive' && s.screen === 0 && !s.found) { await tap(page, [-1, 5]); return true; }
    const main = page.locator(`${MAIN_ACTION}:visible`).first();
    if (!q || (await main.textContent()).trim() !== 'Check') return false;
    if (q.input === 'choice') await root(page).getByRole('button', { name: q.options.find(o => o.correct).label, exact: true }).click();
    else {
        const inputs = root(page).locator('.question-card input');
        if (q.fields) for (let i = 0; i < q.fields.length; i++) {
            const answer = q.answer[q.fields[i].id];
            const [n, d = 1] = answer.split('/').map(Number);
            // Check 5 also proves a close reading is accepted instead of requiring the rounded answer.
            const checkReading = id === 'comparison' && s.screen === 4 ? { x: '-1.6', y: '0.7' }[q.fields[i].id] : null;
            await inputs.nth(i).fill(checkReading || (q.tolerance ? String(Number((n / d).toFixed(1))) : answer));
        }
        else await inputs.fill(q.answer);
    }
    await main.click();
    return true;
}
module.exports = solve;
module.exports.read = read;
module.exports.tap = tap;
