// Answers Finding the turning point correctly first time.
const { MAIN_ACTION } = require('../helpers.cjs');

const slug = 'quadratic-turning-points';
const root = page => page.locator('.lesson-section:visible');

// The current section, its saved state and, on a question screen, the card's definition.
async function read(page) {
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    return page.evaluate(async slug => {
        const api = Maths1to9Lesson, T = Turning, id = api.getCurrentSection().id;
        const saved = await Maths1to9Progress.getLessonActivityState(slug, id === 'explanation' ? 'learn' : id);
        const s = saved?.data;
        let q;
        if (id === 'interactive' && s && s.screen > 0 && s.screen < T.examples.length) q = T.examples[s.screen];
        else if (id === 'comparison' && s) q = T.checks[s.screen];
        else if (id === 'question-bank' && s?.items?.[s.screen]) {
            const item = s.items[s.screen];
            q = T.generate(item, Maths1to9LessonEngine.seededRandom(item.seed));
        }
        return { id, s, q: q && { input: q.input, answer: q.answer, fields: q.fields, options: q.options } };
    }, slug);
}

// Move the sliding dot one step with the keyboard.
async function nudge(page, key = 'ArrowRight') {
    const board = root(page).locator('[role="application"]').first();
    await board.focus();
    await board.press(key);
}

async function solve(page) {
    const { id, s, q } = await read(page);
    // Learn has nothing to answer: the main button moves on.
    if (id === 'explanation') return false;
    if (id === 'interactive' && s.screen === 0 && !s.found) {
        await nudge(page);
        return true;
    }
    const main = page.locator(`${MAIN_ACTION}:visible`).first();
    if (!q || (await main.textContent()).trim() !== 'Check') return false;
    if (q.input === 'choice') {
        await root(page).getByRole('button', { name: q.options.find(option => option.correct).label, exact: true }).click();
    } else {
        const inputs = root(page).locator('.question-card input');
        if (q.fields) for (let i = 0; i < q.fields.length; i++) await inputs.nth(i).fill(q.answer[q.fields[i].id]);
        else await inputs.fill(q.answer);
    }
    await main.click();
    return true;
}

module.exports = solve;
module.exports.read = read;
module.exports.nudge = nudge;
