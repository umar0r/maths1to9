// Read the expression from each question, collect its terms by letter part,
// then pick the option with the same value or work the activity.
const POWERS = { '²': 2, '³': 3, '⁴': 4, '⁵': 5, '⁶': 6 };
const POINTS = [{ a: 2, b: 3, e: 5, m: 7, x: 3, y: 4 }, { a: -3, b: 2, e: -1, m: 4, x: 5, y: -2 }];
function evaluate(text, values) {
    const js = String(text).replace(/−/g, '-').replace(/×/g, '*')
        .replace(/[a-z]/g, letter => `(${values[letter]})`)
        .replace(/\)([²³⁴⁵⁶])/g, (_, power) => `**${POWERS[power]})`).replace(/\((-?\d+)\*\*/g, '(($1)**')
        .replace(/(\d|\))\s*\(/g, '$1*(');
    return Function(`return ${js};`)();
}
const same = (left, right) => POINTS.every(values => evaluate(left, values) === evaluate(right, values));

// "4a + 5 − 2a" -> [{ coefficient: 4, family: 'a' }, { coefficient: 5, family: 'number' }, …]
function termsOf(expression) {
    return expression.replace(/ − /g, ' + −').split(' + ').map(text => {
        const [, sign, digits, family] = text.trim().match(/^(−?)(\d*)(.*)$/);
        const size = digits ? Number(digits) : 1;
        return { text: text.trim(), coefficient: sign ? -size : size, family: family || 'number' };
    });
}
const familyOf = text => termsOf(text.replace(/\s*·.*$/, ''))[0].family;
function sumsOf(terms) {
    const sums = {};
    for (const term of terms) sums[term.family] = (sums[term.family] || 0) + term.coefficient;
    return sums;
}
const shown = value => String(value).replace(/-/g, '−');

async function fillTotals(card, sums) {
    for (const input of await card.locator('input[type=text]').all()) {
        const label = await input.evaluate(node => node.closest('label')?.textContent?.trim() ?? '');
        const family = label === 'Number part' ? 'number' : label.replace('Number in front of ', '');
        await input.fill(shown(sums[family] ?? 0));
    }
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
    const prompt = await card.locator('.question-prompt').innerText();
    const expression = prompt.match(/(?:Simplify|In|terms in) (.+?)(?:\. |, select|\.$)/)[1];
    const options = card.locator('.question-card-options button');
    if (await options.count()) {
        const labels = (await options.allInnerTexts()).map(label => label.replace(/\s*×\s*$/, '').trim());
        const index = labels.findIndex(label => same(label, expression));
        if (index < 0) throw new Error(`No option equal to ${expression} in ${labels.join(' | ')}`);
        await options.nth(index).click();
        return true;
    }
    if (/ × /.test(expression)) {
        // Product: multiply the numbers and add the powers.
        const [left, right] = expression.split(' × ').map(part => {
            const [, digits, letter, power] = part.match(/^(\d*)([a-z])([²³⁴⁵⁶]?)$/);
            return { coefficient: digits ? Number(digits) : 1, letter, power: power ? POWERS[power] : 1 };
        });
        await card.getByLabel('Number part').fill(String(left.coefficient * right.coefficient));
        const power = left.power + right.power;
        const name = `${left.letter}${power === 1 ? '' : Object.keys(POWERS).find(key => POWERS[key] === power)}`;
        await card.getByRole('group', { name: 'Choose the letter part' }).getByRole('button', { name, exact: true }).click();
        return true;
    }
    const terms = termsOf(expression), sums = sumsOf(terms);
    let m;
    if ((m = prompt.match(/select the (\S+) terms/))) {
        const row = card.getByRole('group', { name: 'Select matching terms' });
        for (const button of await row.getByRole('button').all()) {
            if (familyOf(await button.innerText()) === m[1]) await button.click();
        }
        await fillTotals(card, sums);
        return true;
    }
    if (/Sort the terms/.test(prompt)) {
        for (const button of await card.locator('button[data-term-id]').all()) {
            const family = familyOf(await button.innerText());
            await button.click();
            await card.getByRole('button', { name: `Place selected term in ${family} tray`, exact: true }).click();
        }
        await fillTotals(card, sums);
        return true;
    }
    if (/Make zero pairs/.test(prompt)) {
        const positives = await card.locator('button[data-tile-id^="positive-"]').count();
        const negatives = await card.locator('button[data-tile-id^="negative-"]').count();
        for (let i = 0; i < Math.min(positives, negatives); i++) {
            await card.locator(`button[data-tile-id="positive-${i}"]`).click();
            await card.locator(`button[data-tile-id="negative-${i}"]`).click();
        }
        await fillTotals(card, sums);
        return true;
    }
    await fillTotals(card, sums);
    return true;
}
module.exports = solve;
