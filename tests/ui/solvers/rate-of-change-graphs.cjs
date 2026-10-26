const { optionLabels } = require('./common.cjs');
// Read the graph from the board's accessible name ("0 weeks: 4 cm; 2 weeks:
// 8 cm; …") and the stretch of time from the question, work out the answer,
// then pick it or type it.
function corners(label) {
    return [...label.matchAll(/(\d+) \w+: £?(\d+)/g)].map(([, t, v]) => [Number(t), Number(v)]);
}
function valueAt(points, time) {
    for (let i = 1; i < points.length; i++) {
        const [t1, v1] = points[i - 1], [t2, v2] = points[i];
        if (time >= t1 && time <= t2) return v1 + (time - t1) * (v2 - v1) / (t2 - t1);
    }
    throw new Error(`time ${time} is off the graph`);
}
const stretchIn = text => { const m = /(\d+) to (?:\w+ )?(\d+)/.exec(text); return m && [Number(m[1]), Number(m[2])]; };
const rateOf = (points, [from, to]) => (valueAt(points, to) - valueAt(points, from)) / (to - from);
function steepest(points) {
    const parts = points.slice(1).map((point, i) => [points[i][0], point[0]]);
    return parts.reduce((a, b) => (Math.abs(rateOf(points, b)) > Math.abs(rateOf(points, a)) ? b : a));
}

function chooseOption(prompt, labels, points) {
    const stretch = stretchIn(prompt);
    const sameStretch = target => labels.findIndex(label => { const s = stretchIn(label); return s && s[0] === target[0] && s[1] === target[1]; });
    if (/fastest/.test(prompt)) return sameStretch(steepest(points));
    if (/stay the same\?/.test(prompt)) {
        const parts = points.slice(1).map((point, i) => [points[i][0], point[0]]);
        return sameStretch(parts.find(part => rateOf(points, part) === 0));
    }
    if (/How many \w+ pass/.test(prompt)) return labels.indexOf(String(stretch[1] - stretch[0]));
    if (/Why\?/.test(prompt)) return labels.findIndex(label => /equally steep/.test(label));
    if (/flat/.test(prompt)) {
        const value = valueAt(points, stretch[0]);
        return labels.findIndex(label => label.includes(String(value)) && /\b0\b/.test(label));
    }
    if (/What happens to/.test(prompt)) {
        const rate = rateOf(points, stretch);
        const word = rate > 0 ? 'increasing' : rate < 0 ? 'decreasing' : 'staying the same';
        return labels.findIndex(label => label.includes(word));
    }
    throw new Error(`no rule for: ${prompt}`);
}
function typedAnswer(prompt, points) {
    const at = /at (?:week|minute|month|hour) (\d+)\?/.exec(prompt);
    if (at) return valueAt(points, Number(at[1]));
    const stretch = stretchIn(prompt);
    if (/rate|each (week|minute|month|hour)/.test(prompt)) return Math.abs(rateOf(points, stretch));
    return Math.abs(valueAt(points, stretch[1]) - valueAt(points, stretch[0]));
}

async function solve(page, memory = {}) {
    const main = page.locator('.lesson-controls button.button--primary:visible');
    const action = await main.innerText();
    if (action === 'All lessons') {
        const home = new URL('../../', page.url()).pathname;
        await main.click();
        if (new URL(page.url()).pathname !== home) (memory.problems ??= []).push('All lessons did not reach the homepage');
        return true;
    }
    if (action !== 'Check' || await main.isEnabled()) return false;
    const card = page.locator('.question-card:visible');
    const prompt = (await card.locator('.question-prompt').innerText()).replace(/\s+/g, ' ').trim();
    const points = corners(await card.locator('[aria-label*=" graph. "]').first().getAttribute('aria-label'));
    if (points.length < 3) throw new Error(`could not read the graph for: ${prompt}`);
    const options = card.locator('.question-card-options button');
    if (await options.count()) {
        const labels = await optionLabels(options);
        const index = chooseOption(prompt, labels, points);
        if (index < 0) throw new Error(`no right option in ${labels.join(' | ')} for: ${prompt}`);
        await options.nth(index).click();
        return true;
    }
    await card.locator('input').first().fill(String(typedAnswer(prompt, points)));
    return true;
}
module.exports = solve;
