const { optionLabels } = require('./common.cjs');
// Work out each answer from the visible question and its picture. Explore the
// Learn slider once so the exploration points are earned.
const gcd = (a, b) => b ? gcd(b, a % b) : Math.abs(a);
const tidy = text => String(text).replace(/−/g, '-').replace(/\s+/g, ' ').trim();
function parse(text) {
    const m = tidy(text).match(/^(-)?(?:(\d+) )?(\d+)\/(\d+)$/);
    if (!m) return null;
    const bottom = Number(m[4]);
    return [(Number(m[2] || 0) * bottom + Number(m[3])) * (m[1] ? -1 : 1), bottom];
}
const less = (a, b) => a[0] * b[1] < b[0] * a[1];
const fractionsIn = text => tidy(text).match(/-?(?:\d+ )?\d+\/\d+/g) ?? [];

function answerFor(prompt, picture) {
    let m;
    if ((m = prompt.match(/What is the (numerator|denominator) of (\d+)\/(\d+)/))) return m[1] === 'numerator' ? m[2] : m[3];
    if (/fraction of the whole is shaded/.test(prompt)) {
        const [, d, n] = picture.match(/split into (\d+) equal parts; (\d+) parts? shaded/);
        return `${n}/${d}`;
    }
    if (/What fraction is left/.test(prompt)) {
        const [, d, n] = picture.match(/cut into (\d+) equal slices, with (\d+) slices left/);
        return `${n}/${d}`;
    }
    if ((m = prompt.match(/How is (.+) written\?/))) {
        if (/^\d+ \d+\/\d+$/.test(tidy(m[1]))) return 'Mixed number';
        const [top, bottom] = parse(m[1]);
        return top < bottom ? 'Proper fraction' : 'Improper fraction';
    }
    if ((m = prompt.match(/How many complete wholes are there in (.+)\?/))) {
        const [top, bottom] = parse(m[1]);
        return String(Math.floor(top / bottom));
    }
    if ((m = prompt.match(/Write (\d+)\/(\d+) as a mixed number/))) {
        const [top, bottom] = [Number(m[1]), Number(m[2])];
        return `${Math.floor(top / bottom)} ${top % bottom}/${bottom}`;
    }
    if ((m = prompt.match(/(\d+)\/(\d+) = (\d+) □\/\d+/))) return String(Number(m[1]) - Number(m[3]) * Number(m[2]));
    if ((m = prompt.match(/Write (\d+) (\d+)\/(\d+) as an improper fraction/))) return `${Number(m[1]) * Number(m[3]) + Number(m[2])}/${m[3]}`;
    if ((m = prompt.match(/(\d+) (\d+)\/(\d+) = □\/\d+/))) return String(Number(m[1]) * Number(m[3]) + Number(m[2]));
    const shown = fractionsIn(prompt);
    const values = shown.map(parse);
    if (/Which is greater/.test(prompt)) return less(values[0], values[1]) ? shown[1] : shown[0];
    if (/Which comparison/.test(prompt)) {
        const sign = less(values[0], values[1]) ? '<' : less(values[1], values[0]) ? '>' : '=';
        return `${shown[0]} ${sign} ${shown[1]}`;
    }
    if (/Which is smaller/.test(prompt)) return less(values[0], values[1]) ? shown[0] : shown[1];
    const order = shown.map((text, index) => ({ text, value: values[index] }))
        .sort((x, y) => (less(x.value, y.value) ? -1 : less(y.value, x.value) ? 1 : 0)).map(entry => entry.text);
    if (/in order, smallest first/.test(prompt)) return order.join(' < ');
    if (/Which is smallest/.test(prompt)) return order[0];
    throw new Error(`Unrecognised fractions question: ${prompt}`);
}

async function solve(page, memory = {}) {
    const slider = page.getByRole('slider', { name: 'Equal parts in one whole' });
    if (!memory.explored && await slider.isVisible()) {
        await slider.press('End');
        memory.explored = true;
    }
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
    const prompt = await card.locator('.question-prompt').innerText();
    const picture = (await card.locator('svg[aria-label]').first().getAttribute('aria-label').catch(() => null)) ?? '';
    const answer = answerFor(prompt, picture);
    const options = card.locator('.question-card-options button');
    if (await options.count()) {
        const labels = await optionLabels(options);
        const index = labels.findIndex(label => tidy(label) === tidy(answer));
        if (index < 0) throw new Error(`No option "${answer}" in ${labels.join(' | ')} for: ${prompt}`);
        await options.nth(index).click();
    } else await card.locator('input[type=text]').fill(answer.replace(/-/g, '−'));
    return true;
}
module.exports = solve;
