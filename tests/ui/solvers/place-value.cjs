// Read each answer from the visible card and manipulate its input controls.
const num = text => Number(String(text).replace(/,/g, '').replace(/−/g, '-'));
const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const tens = ['', 'ten', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const places = { 3: 'thousand', 2: 'hundred', '-1': 'tenth', '-2': 'hundredth', '-3': 'thousandth' };
const valueWords = (digit, exponent) => exponent === 0 ? words[digit] : exponent === 1 ? tens[digit]
    : `${words[digit]} ${places[exponent]}${exponent < 0 && digit !== 1 ? 's' : ''}`;
const exact = value => { const [whole, fraction = ''] = String(value).replace(/,/g, '').split('.'); return { digits: BigInt(whole + fraction), places: fraction.length }; };
const format = ({ digits, places }) => {
    const text = digits.toString().padStart(places + 1, '0');
    const whole = (places ? text.slice(0, -places) : text).replace(/\B(?=(\d{3})+$)/g, ',');
    const decimal = (places ? text.slice(-places) : '').replace(/0+$/, '');
    return whole + (decimal ? `.${decimal}` : '');
};
const shift = (value, power) => power >= 0 ? { digits: value.digits * 10n ** BigInt(power), places: value.places }
    : { digits: value.digits, places: value.places - power };
function answerFor(prompt, choice) {
    let match;
    if ((match = prompt.match(/In ([\d,.]+), which digit is in the (tens|ones) column/))) {
        const whole = match[1].replace(/,/g, '').split('.')[0];
        return whole.at(match[2] === 'tens' ? -2 : -1);
    }
    if ((match = prompt.match(/In ([\d,.]+), what is the value of the digit (\d)/))) {
        const number = match[1].replace(/,/g, ''), point = number.includes('.') ? number.indexOf('.') : number.length, index = number.indexOf(match[2]);
        const exponent = index < point ? point - index - 1 : point - index;
        return choice ? valueWords(Number(match[2]), exponent) : format(shift(exact(match[2]), exponent));
    }
    if ((match = prompt.match(/what is ([\d.,]+) × ([\d.,]+)\?/))) {
        const first = exact(match[1]), second = exact(match[2]);
        return format({ digits: first.digits * second.digits, places: first.places + second.places });
    }
    if ((match = prompt.match(/What is ([\d.,]+) ([×÷]) ([\d,]+)\?/))) {
        const zeros = match[3].replace(/,/g, '').length - 1;
        return format(shift(exact(match[1]), match[2] === '×' ? zeros : -zeros));
    }
    const checkAnswers = {
        "Asha says the 8 in 5,382 is worth 8. What's wrong?": "The 8 is in the tens column, so it's worth 80.",
        'In 4.37, what is the 3 worth?': '3 tenths, which is 0.3.',
        'Which is bigger, 0.6 or 0.58, and why?': '0.6, because 0.6 = 0.60, and 60 hundredths is more than 58.',
        'What happens to the digits when you multiply a number by 10?': 'Each digit moves one column to the left.',
        '384 × 2 = 768. Which change keeps the answer at 768?': 'Divide 384 by 10 and multiply 2 by 10. The two changes cancel out.'
    };
    if (checkAnswers[prompt]) return checkAnswers[prompt];
    throw new Error(`Unrecognised place-value question: ${prompt}`);
}
async function solve(page, memory = {}) {
    const explorer = page.locator('#lesson-section-explanation .pv-digit-row:visible');
    if (await explorer.count() && !memory.explored) { await explorer.first().click(); memory.explored = true; return true; }
    const main = page.locator('.lesson-controls button.button--primary:visible');
    const action = await main.innerText();
    if (action !== 'Check') return false;
    const card = page.locator('.question-card:visible');
    const prompt = await card.locator('.question-prompt').innerText();
    const words = card.locator('.pv-words__keys');
    if (await words.count()) {
        for (const digit of '6453009') await words.getByRole('button', { name: digit, exact: true }).click();
        return false;
    }
    const flips = card.locator('.pv-flip__card');
    if (await flips.count()) {
        for (let index = 0; index < await flips.count(); index++) await flips.nth(index).click();
        return false;
    }
    const build = card.locator('.pv-build__pool');
    if (await build.count()) {
        for (const digit of ['7', '6', '0']) await build.getByRole('button', { name: digit, exact: true }).click();
        return false;
    }
    if (await card.locator('.pv-paper').count()) {
        await card.getByRole('button', { name: 'Multiply the top number by 10' }).click();
        return false;
    }
    if (await card.locator('.pv-shift').count()) {
        const row = card.locator('.pv-shift__row');
        await row.focus();
        await row.press('ArrowLeft');
        await row.press('ArrowLeft');
        return false;
    }
    if (await card.getByLabel('Product', { exact: true }).count()) {
        const [, first, second, targetFirst, targetSecond] = prompt.match(/Given that (\d+) × (\d+) = [\d,]+, work out ([\d.,]+) × ([\d.,]+)\./);
        const targetValues = [targetFirst, targetSecond];
        const answer = format({ digits: exact(targetFirst).digits * exact(targetSecond).digits, places: exact(targetFirst).places + exact(targetSecond).places });
        const input = card.getByLabel('Product', { exact: true });
        let moved = false;
        for (const [index, original] of [first, second].entries()) {
            const row = card.getByRole('slider', { name: `Move number ${index + 1}`, exact: true });
            const target = [-1, 0, 1, 2].find(offset => num(original) / 10 ** offset === num(targetValues[index]));
            if (Number(await row.getAttribute('aria-valuenow')) === target) continue;
            await row.press('Home');
            for (let step = 0; step < Math.abs(target); step++) await row.press(target > 0 ? 'ArrowRight' : 'ArrowLeft');
            moved = true;
        }
        if (await input.inputValue() !== answer) { await input.fill(answer); return true; }
        return moved;
    }
    if (await main.isEnabled()) return false;
    const options = card.locator('.question-card-options button');
    const choice = await options.count() > 0;
    const answer = answerFor(prompt, choice);
    if (choice) await options.filter({ hasText: new RegExp(`^${answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }).click();
    else await card.locator('input[type=text]').fill(answer);
    return true;
}
module.exports = solve;
