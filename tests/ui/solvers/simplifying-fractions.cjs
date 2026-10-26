const { optionLabels } = require('./common.cjs');
// Work out each answer from the visible question and its picture. Explore the
// Learn slider once so the exploration points are earned.
const gcd = (a, b) => b ? gcd(b, a % b) : Math.abs(a);
const tidy = text => String(text).replace(/−/g, '-').replace(/\s+/g, ' ').trim();
const parse = text => {
    const m = tidy(text).match(/^(-?\d+)\/(\d+)$/);
    return m && [Number(m[1]), Number(m[2])];
};
const fractionsIn = text => tidy(text).match(/-?\d+\/\d+/g) ?? [];
const simplest = ([top, bottom]) => [top / gcd(top, bottom), bottom / gcd(top, bottom)];
const same = (x, y) => x && y && x[0] * y[1] === y[0] * x[1];

// An answer is text to type or pick, a test for picking an option, or a
// { top, bottom } pair for the simplest-form boxes.
function answerFor(prompt, picture) {
    let m;
    if ((m = prompt.match(/Which statement about (\S+) and (\S+) is true/))) {
        const [x, y] = [parse(m[1]), parse(m[2])];
        const diff = x[0] * y[1] - y[0] * x[1];
        return `${m[1]} ${diff > 0 ? '>' : diff < 0 ? '<' : '='} ${m[2]}`;
    }
    if ((m = prompt.match(/□\/(\d+)/))) {
        const [given] = fractionsIn(prompt.replace(/□\/\d+/, '')).map(parse);
        return String(given[0] * Number(m[1]) / given[1]);
    }
    if ((m = prompt.match(/equivalent to (\d+)\/(\d+)/))) {
        const given = [Number(m[1]), Number(m[2])];
        return /Type a fraction/.test(prompt) ? `${given[0] * 2}/${given[1] * 2}`
            : label => same(parse(label), given) && tidy(label) !== `${given[0]}/${given[1]}`;
    }
    if (/Which fraction is fully simplified/.test(prompt)) return label => gcd(...parse(label)) === 1;
    if ((m = prompt.match(/divides both (\d+) and (\d+) exactly/))) return label => Number(m[1]) % Number(label) === 0 && Number(m[2]) % Number(label) === 0;
    if ((m = prompt.match(/highest common factor of (\d+) and (\d+)/))) return String(gcd(Number(m[1]), Number(m[2])));
    if ((m = prompt.match(/changes (\d+)\/(\d+) to (\d+)\/(\d+)/))) {
        const [top, bottom, wrongTop, wrongBottom] = m.slice(1).map(Number);
        if (/simplest form/.test(prompt)) return simplest([top, bottom]);
        if (wrongTop === top - 1 && wrongBottom === bottom - 1) return 'They subtracted 1 instead of dividing.';
        if (wrongBottom === bottom) return 'They divided the top but not the bottom.';
        if (top / wrongTop !== bottom / wrongBottom) return 'They divided the top and bottom by different numbers.';
        return 'They stopped before the fraction was fully simplified.';
    }
    if (/fraction of the bar is shaded/.test(prompt)) {
        const [, top, bottom] = picture.match(/(\d+) of (\d+) equal parts shaded/).map(Number);
        return simplest([top, bottom]);
    }
    if ((m = prompt.match(/Write (\d+)\/(\d+) in its simplest form/))) return simplest([Number(m[1]), Number(m[2])]);
    throw new Error(`Unrecognised simplifying fractions question: ${prompt}`);
}

async function solve(page, memory = {}) {
    const slider = page.getByRole('slider', { name: 'Number of splits' });
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
        const text = Array.isArray(answer) ? answer.join('/') : answer;
        const fits = typeof answer === 'function' ? answer : label => tidy(label) === tidy(text);
        const index = labels.findIndex(label => fits(label.replace(/\s*×\s*$/, '')));
        if (index < 0) throw new Error(`No fitting option in ${labels.join(' | ')} for: ${prompt}`);
        await options.nth(index).click();
    } else if (Array.isArray(answer)) {
        await card.getByLabel('Top number').fill(String(answer[0]));
        await card.getByLabel('Bottom number').fill(String(answer[1]));
    } else await card.locator('input[type=text]').fill(answer);
    return true;
}
module.exports = solve;
