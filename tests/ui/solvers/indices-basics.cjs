// Work out each answer from the visible question. Explore the Learn slider once.
const SUPER = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const power = text => {
    const match = text.match(/(\d+)([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/);
    return match && { base: Number(match[1]), index: Number([...match[2]].map(char => SUPER.indexOf(char)).join('')) };
};
const toSuper = number => [...String(number)].map(digit => SUPER[Number(digit)]).join('');
function answerFor(prompt, choice) {
    const p = power(prompt);
    let match;
    if (/what is the index/.test(prompt)) return String(p.index);
    if (/what is the base/.test(prompt)) return String(p.base);
    if (prompt.startsWith('Which shows the copies')) return Array(p.index).fill(p.base).join(' × ');
    if (prompt.startsWith('Find the missing factor')) return String(p.base);
    if (prompt.startsWith('Calculate')) return String(p.base ** p.index);
    if (prompt.startsWith('This grid')) return '36';
    if (prompt.includes('Student A says')) return 'Student B';
    if ((match = prompt.match(/matches (.+)\?/))) {
        const factors = match[1].split(' × ');
        return `${factors[0]}${toSuper(factors.length)}`;
    }
    if ((match = prompt.match(/Write (.+) in index form/))) return String(match[1].split(' × ').length);
    if ((match = prompt.match(/edges of length (\d+) (\w+)/))) return `${Number(match[1]) ** 3}${choice ? ` ${match[2]}³` : ''}`;
    if ((match = prompt.match(/side length (\d+) (\w+)\. What is its area/))) return `${Number(match[1]) ** 2}${choice ? ` ${match[2]}²` : ''}`;
    if ((match = prompt.match(/starting from (\d+)\. What is the population after (\d+)/))) return String(Number(match[1]) * 2 ** Number(match[2]));
    throw new Error(`Unrecognised indices question: ${prompt}`);
}
async function solve(page, memory = {}) {
    const slider = page.getByRole('slider', { name: 'Index', exact: true });
    if (await slider.isVisible() && !memory.explored) {
        await page.getByLabel('Base', { exact: true }).selectOption('3');
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
    const prompt = await page.locator('.question-prompt:visible').innerText();
    const options = page.locator('.question-card-options:visible button');
    const choice = await options.count() > 0;
    const answer = answerFor(prompt, choice);
    if (choice) await options.filter({ hasText: new RegExp(`^${answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }).click();
    else await page.locator('.question-card:visible input[type=text]').fill(answer);
    return true;
}
module.exports = solve;
