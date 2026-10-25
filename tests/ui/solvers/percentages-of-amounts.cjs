// Solve only from the pupil-visible prompt and labels.
const tidy = value => String(Number(value.toFixed(4)));
const gcd = (a, b) => b ? gcd(b, a % b) : a;
module.exports = async function solve(page) {
    const main = page.locator('.lesson-controls button.button--primary:visible');
    if (await main.isEnabled()) return false;
    const prompt = page.locator('.question-prompt:visible');
    if (!await prompt.count()) return false;
    const text = await prompt.innerText();
    let match, answer;
    if (text.startsWith('Which statement')) answer = '3% = 0.03 because 3 ÷ 100 = 0.03';
    else if ((match = text.match(/Which calculation finds (\d+)% of £(\d+)/))) answer = `${tidy(Number(match[1]) / 100)} × ${match[2]}`;
    else if ((match = text.match(/fraction.*?(\d+)%/))) {
        const p = Number(match[1]);
        answer = `${p / gcd(p, 100)}/${100 / gcd(p, 100)}`;
    } else if ((match = text.match(/Write (\d+(?:\.\d+)?)% as a decimal/))) answer = tidy(Number(match[1]) / 100);
    else if ((match = text.match(/Write (\d+(?:\.\d+)?) as a percentage/))) answer = tidy(Number(match[1]) * 100);
    else if ((match = text.match(/one quarter of (\d+)/))) answer = tidy(Number(match[1]) / 4);
    else {
        const p = text.match(/(\d+)%/);
        const wholes = [...text.replace(/\d+%/g, '').matchAll(/\d+(?:\.\d+)?/g)];
        if (!p || wholes.length !== 1) throw new Error(`Cannot solve percentage question: ${text}`);
        answer = tidy(Number(p[1]) * Number(wholes[0][0]) / 100);
    }
    const options = page.locator('.question-card-options:visible button');
    if (await options.count()) {
        if (/Write .* as a percentage/.test(text)) answer += '%';
        await page.getByRole('button', { name: answer, exact: true }).click();
    }
    else await page.locator('.question-card:visible input[type=text]').fill(answer);
    return true;
};
