// Read each machine from the question, undo it box by box, and answer the
// guided steps from their own wording.
const signed = text => Number(String(text).replace(/−/g, '-'));
const shown = value => String(value).replace(/-/g, '−');
const UNDO = { adds: (x, n) => x - n, subtracts: (x, n) => x + n, 'multiplies by': (x, n) => x / n, 'divides by': (x, n) => x * n };
const DO = { '+': (x, n) => x + n, '−': (x, n) => x - n, '×': (x, n) => x * n, '÷': (x, n) => x / n };
const OPPOSITE = { '+': '−', '−': '+', '×': '÷', '÷': '×' };

function inputFor(prompt) {
    const [, steps, output] = prompt.match(/The machine (.+)\. Its output is (−?\d+)\./);
    return steps.split(', then ').reverse().reduce((value, step) => {
        const [, verb, n] = step.match(/^(adds|subtracts|multiplies by|divides by) (\d+)$/);
        return UNDO[verb](value, Number(n));
    }, signed(output));
}

async function answerFor(card, prompt, labels) {
    let m;
    if (/Find the input/.test(prompt)) return shown(inputFor(prompt));
    if ((m = prompt.match(/next box to undo says ([+−×÷]) (\d+)/))) return `${OPPOSITE[m[1]]} ${m[2]}`;
    if ((m = prompt.match(/Work out (−?\d+) ([+−×÷]) (\d+)/))) return shown(DO[m[2]](signed(m[1]), Number(m[3])));
    // Numbers in the machine picture, not in the prompt or the options.
    let picture = await card.innerText();
    for (const text of [prompt, ...labels]) picture = picture.replace(text, ' ');
    // Box labels like "× 4" are operations, not values.
    const pictured = (picture.replace(/[+−×÷]\s*\d+/g, ' ').match(/−?\d+/g) ?? []).map(signed);
    if (/Which number do you start with/.test(prompt)) {
        // Only the output is shown; the input box is still empty.
        return labels.find(label => pictured.includes(signed(label)));
    }
    if ((m = prompt.match(/checks that the input is (−?\d+)/))) {
        // The right check starts at the input, every step is true, and it ends at the output in the picture.
        return labels.find(label => {
            const steps = label.split(', then ').map(step => step.match(/(−?\d+) ([+−×÷]) (\d+) = (−?\d+)/));
            return label.startsWith(`${m[1]} `) && steps.every(([, a, op, b, c]) => DO[op](signed(a), Number(b)) === signed(c))
                && pictured.includes(signed(steps.at(-1)[4]));
        });
    }
    throw new Error(`Unrecognised function machine question: ${prompt}`);
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
    const options = card.locator('.question-card-options button');
    const labels = (await options.allInnerTexts()).map(label => label.replace(/\s*×\s*$/, '').trim());
    const answer = await answerFor(card, prompt, labels);
    if (labels.length) {
        const index = labels.indexOf(answer);
        if (index < 0) throw new Error(`No option "${answer}" in ${labels.join(' | ')} for: ${prompt}`);
        await options.nth(index).click();
    } else await card.locator('input[type=text]').fill(answer);
    return true;
}
module.exports = solve;
