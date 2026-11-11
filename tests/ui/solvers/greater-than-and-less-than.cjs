// Work out generated answers from the visible question and its controls.
const num = text => Number(String(text).replace(/,/g, '').replace(/−/g, '-'));
const checkAnswers = {
    'Mia writes −3 < −9. What has she done wrong?': 'The wide side should face −3, because −3 is bigger.',
    'Ben says 0.35 is bigger than 0.4 because it has more digits. Is he right?': 'No. 0.4 = 0.40, and 40 hundredths is more than 35 hundredths.',
    'A pen costs £3.05 and a pencil case costs £3.50. Which sentence is true?': 'The pen is cheaper, because 0 tenths is less than 5 tenths.',
    'A balance scale tips down on the left. What does that tell you?': 'The left side is heavier, so left > right.',
    'Which is less, 0 or −100?': "−100, because it's further left on the number line."
};

function isTrueComparison(label) {
    const match = label.match(/^([−-]?[\d,.]+) ([<>=]) ([−-]?[\d,.]+)$/);
    if (!match) return false;
    const left = num(match[1]), right = num(match[3]);
    return match[2] === '<' ? left < right : match[2] === '>' ? left > right : left === right;
}

function isIncreasing(label) {
    const parts = label.split(/ → |, /).map(num);
    return parts.length > 1 && parts.every((value, index) => index === 0 || value > parts[index - 1]);
}

function answerFor(prompt, choices) {
    if (checkAnswers[prompt]) return checkAnswers[prompt];
    if (prompt.startsWith('Which comparison') || prompt === 'Which is true?' || prompt === 'Which is correct?') {
        return choices.find(isTrueComparison);
    }
    if (prompt.startsWith('Put ')) return choices.find(isIncreasing);
    let match;
    if ((match = prompt.match(/^Which is greater: (.+) or (.+)\? Type the number\.$/))) {
        return num(match[1]) > num(match[2]) ? match[1] : match[2];
    }
    if ((match = prompt.match(/^Which number is smallest\? (.+)$/))) {
        return match[1].split('; ').sort((left, right) => num(left) - num(right))[0];
    }
    if ((match = prompt.match(/^Which number is greater than (.+)\?$/))) {
        return choices.find(label => num(label) > num(match[1]));
    }
    if ((match = prompt.match(/^A number with no decimal part is less than ([−\d.]+)\./))) {
        return String(Math.ceil(num(match[1])) - 1);
    }
    if ((match = prompt.match(/(\w+) finishes a race in ([\d.]+) seconds\. (\w+) finishes in ([\d.]+) seconds/))) {
        const first = num(match[2]) < num(match[4]);
        return choices.length ? match[first ? 1 : 3] : match[first ? 2 : 4];
    }
    if ((match = prompt.match(/One game costs £(\d+(?:\.\d+)?) and another costs £(\d+(?:\.\d+)?)/))) {
        const price = num(match[1]) > num(match[2]) ? match[1] : match[2];
        return choices.length ? `£${price}` : price;
    }
    if (prompt.startsWith('Here are four temperatures:')) return [...choices].sort((left, right) => num(left) - num(right))[0];
    throw new Error(`Unrecognised comparison question: ${prompt}`);
}

async function solve(page) {
    const main = page.locator('.lesson-controls button.button--primary:visible');
    if (await main.innerText() !== 'Check') return false;
    const card = page.locator('.question-card:visible');
    const prompt = await card.locator('.question-prompt').innerText();
    const tiles = card.locator('.pv-tap-cards button, .comparison-line button');
    if (await tiles.count()) {
        const target = num(prompt.match(/less than ([−\d.]+)/)[1].replace(/\.$/, ''));
        for (const tile of await tiles.all()) {
            const pressed = await tile.getAttribute('aria-pressed') === 'true';
            if (pressed !== (num(await tile.innerText()) < target)) await tile.click();
        }
        return false;
    }
    const sign = card.locator('.balance-equation__sign');
    if (await sign.count()) {
        if (await sign.innerText() !== '>') await sign.click();
        return false;
    }
    const tags = card.locator('.price-tags');
    if (await tags.count()) {
        const cheapest = tags.getByRole('button', { name: '£1.09', exact: true });
        if (await cheapest.getAttribute('aria-pressed') !== 'true') await cheapest.click();
        return false;
    }
    const people = card.locator('.people-balance__choices');
    if (await people.count()) {
        const heavier = people.getByRole('button', { name: 'Sam 46.5 kg', exact: true });
        if (await heavier.getAttribute('aria-pressed') !== 'true') await heavier.click();
        return false;
    }
    const pool = card.locator('.pv-order-pool');
    if (await pool.count()) {
        const values = await pool.locator('button').allTextContents();
        for (const value of values.sort((left, right) => num(left) - num(right))) {
            await pool.getByRole('button', { name: value, exact: true }).click();
        }
        return values.length > 0;
    }
    if (await main.isEnabled()) return false;
    const options = card.locator('.question-card-options button');
    const choices = await options.allTextContents();
    const answer = answerFor(prompt, choices);
    if (answer === undefined) throw new Error(`No answer found for "${prompt}" in ${JSON.stringify(choices)}`);
    if (choices.length) await options.and(card.getByRole('button', { name: answer, exact: true })).click();
    else await card.locator('input[type=text]').fill(answer);
    return true;
}

module.exports = solve;
