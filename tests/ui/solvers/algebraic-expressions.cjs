const { optionLabels } = require('./common.cjs');
// Read each story, work out the expression as [number, letter, letter²]
// amounts, then pick the matching choice or build it from tiles.
const WORDS = { twice: 2, 'three times': 3, 'four times': 4, 'five times': 5, 'six times': 6, three: 3 };

function target(p) {
    let m;
    if (/multiplied by itself/.test(p)) return [0, 0, 1];
    if ((m = p.match(/Add (\d+), then multiply the whole new amount by (\d+)/))) return [m[1] * m[2], Number(m[2]), 0];
    if ((m = p.match(/(twice|three times|four times|five times|six times) as many\. \w+ has (\d+) more/))) return [Number(m[2]), WORDS[m[1]], 0];
    if ((m = p.match(/has twice Miguel’s p songs\. Josh has (\d+) more/))) return [Number(m[1]), 2, 0];
    if ((m = p.match(/(twice|three times|four times|five times|six times) as many/))) return [0, WORDS[m[1]], 0];
    if ((m = p.match(/You buy (\w+) \w+ and pay (?:a )?£(\d+)/))) return [Number(m[2]), Number(m[1]) || WORDS[m[1]], 0];
    if ((m = p.match(/start with £(\d+)\. Each game costs £(\d+)/i))) return [Number(m[1]), -Number(m[2]), 0];
    if ((m = p.match(/You (gain|lose) (\d+) points/))) return [m[1] === 'gain' ? Number(m[2]) : -Number(m[2]), 1, 0];
    if ((m = p.match(/You use (\d+) of them/))) return [-Number(m[1]), 1, 0];
    if ((m = p.match(/^Write (\d+) lots of/))) return [0, Number(m[1]), 0];
    if ((m = p.match(/writes (\d+) pens at \w+ pounds each/))) return [0, Number(m[1]), 0];
    if ((m = p.match(/“\w add (\d+)”/))) return [Number(m[1]), 1, 0];
    if ((m = p.match(/finds (\d+) more/))) return [Number(m[1]), 1, 0];
    if ((m = p.match(/win (\d+) more/))) return [Number(m[1]), 1, 0];
    if (/Two wins add 3 points each/.test(p)) return [6, 1, 0];
    if ((m = p.match(/Write the number in (\w+) bags/))) return [0, WORDS[m[1]], 0];
    if ((m = p.match(/^Start with \w\. Add (\d+)\.$/))) return [Number(m[1]), 1, 0];
    if (/What expression do you start with/.test(p)) return [0, 1, 0];
    throw new Error(`Unrecognised algebra question: ${p}`);
}

// The usual written form of a target, matching the lesson's choice labels.
function written([constant, linear, square], letter, brackets) {
    if (square) return `${letter}²`;
    const term = linear === 1 ? letter : `${Math.abs(linear)}${letter}`;
    if (brackets) return `${linear}(${letter} + ${constant / linear})`;
    if (linear < 0) return `${constant} − ${term}`;
    if (!constant) return term;
    return `${term} ${constant > 0 ? '+' : '−'} ${Math.abs(constant)}`;
}

// Tiles and typed numbers that build the target.
function build([constant, linear, square], brackets) {
    if (square) return { numbers: [], tiles: ['square'] };
    if (brackets) return { numbers: [linear, constant / linear], tiles: ['A', '(', 'letter', '+', 'B', ')'] };
    if (linear < 0) return { numbers: [constant, -linear], tiles: ['A', '−', 'B', 'letter'] };
    if (linear === 1) return constant ? { numbers: [Math.abs(constant)], tiles: ['letter', constant > 0 ? '+' : '−', 'A'] } : { numbers: [], tiles: ['letter'] };
    return constant ? { numbers: [linear, constant], tiles: ['A', 'letter', '+', 'B'] } : { numbers: [linear], tiles: ['A', 'letter'] };
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
    const goal = target(prompt);
    const brackets = /multiply the whole new amount/.test(prompt);
    const options = card.locator('.question-card-options button');
    if (await options.count()) {
        const letter = (prompt.match(/\b([a-z])\b(?= (?:songs|coins|points|pens|counters|stickers|marbles|cards|goals|pounds)|\. |,| multiplied| \+|$)/) || prompt.match(/lots of ([a-z])/) || [])[1]
            ?? (await optionLabels(options)).join(' ').match(/[a-z]/)[0];
        const answer = written(goal, letter, brackets);
        const labels = await optionLabels(options);
        const index = labels.indexOf(answer);
        if (index < 0) throw new Error(`No option "${answer}" in ${labels.join(' | ')} for: ${prompt}`);
        await options.nth(index).click();
        return true;
    }
    const { numbers, tiles } = build(goal, brackets);
    for (const [index, value] of numbers.entries()) await card.getByLabel(`Number ${index ? 'B' : 'A'}`, { exact: true }).fill(String(value));
    const bank = card.getByRole('group', { name: 'Expression tiles' });
    for (const tile of tiles) {
        const name = tile === 'A' || tile === 'B' ? new RegExp(`^Add number ${tile}:`)
            : tile === 'letter' ? /^Add [a-z] tile$/ : tile === 'square' ? /^Add [a-z]² tile$/ : `Add ${tile} tile`;
        await bank.getByRole('button', { name, exact: typeof name === 'string' }).click();
    }
    return true;
}
module.exports = solve;
