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
const permutations = items => items.length <= 1 ? [items.join('')]
    : items.flatMap((item, index) => permutations(items.filter((_, other) => other !== index)).map(rest => item + rest));
/* Reads "six million, forty thousand and nine" back into 6040009, independently of the lesson code. */
function numberFromWords(text) {
    const small = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
        thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40,
        fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
    let total = 0, current = 0;
    for (const word of text.replace(/[,-]/g, ' ').split(/\s+/).filter(item => item && item !== 'and')) {
        if (word in small) current += small[word];
        else if (word === 'hundred') current *= 100;
        else if (word === 'thousand') { total += current * 1000; current = 0; }
        else if (word === 'million') { total += current * 1e6; current = 0; }
    }
    return total + current;
}
function answerFor(prompt, choice) {
    let match;
    if (prompt.startsWith('Here are four temperatures:')) {
        return String(Math.min(...Array.from(prompt.matchAll(/([−-]?\d+) °C/g), m => num(m[1])))).replace('-', '−');
    }
    if (prompt === 'Which is correct?') return null;
    if ((match = prompt.match(/Which is greater: ([−-]?[\d.]+) or ([−-]?[\d.]+)\?/))) {
        return num(match[1]) > num(match[2]) ? match[1] : match[2];
    }
    if ((match = prompt.match(/In ([\d,.]+), which digit is in the (tens|ones) column/))) {
        const whole = match[1].replace(/,/g, '').split('.')[0];
        return whole.at(match[2] === 'tens' ? -2 : -1);
    }
    if ((match = prompt.match(/In ([\d,.]+), what is the value of the digit (\d)/))) {
        const number = match[1].replace(/,/g, ''), point = number.includes('.') ? number.indexOf('.') : number.length, index = number.indexOf(match[2]);
        const exponent = index < point ? point - index - 1 : point - index;
        return choice ? valueWords(Number(match[2]), exponent) : format(shift(exact(match[2]), exponent));
    }
    if ((match = prompt.match(/Which comparison of ([\d,.]+) and ([\d,.]+) is correct/))) return `${match[1]} ${num(match[1]) < num(match[2]) ? '<' : '>'} ${match[2]}`;
    if ((match = prompt.match(/Which is greater: ([\d,.]+) or ([\d,.]+)\?/))) return num(match[1]) > num(match[2]) ? match[1] : match[2];
    if ((match = prompt.match(/(\w+) finishes a race in (\d+(?:\.\d+)?) seconds\. (\w+) finishes in (\d+(?:\.\d+)?) seconds/))) {
        return choice ? num(match[2]) < num(match[4]) ? match[1] : match[3] : num(match[2]) < num(match[4]) ? match[2] : match[4];
    }
    if ((match = prompt.match(/One game costs £(\d+(?:\.\d+)?) and another costs £(\d+(?:\.\d+)?)/))) {
        const higher = num(match[1]) > num(match[2]) ? match[1] : match[2];
        return choice ? `£${higher}` : higher;
    }
    if ((match = prompt.match(/what is ([\d.,]+) × ([\d.,]+)\?/))) {
        const first = exact(match[1]), second = exact(match[2]);
        return format({ digits: first.digits * second.digits, places: first.places + second.places });
    }
    if ((match = prompt.match(/What is ([\d.,]+) ([×÷]) ([\d,]+)\?/))) {
        const zeros = match[3].replace(/,/g, '').length - 1;
        return format(shift(exact(match[1]), match[2] === '×' ? zeros : -zeros));
    }
    if ((match = prompt.match(/has (\d) hundreds, (\d) ones, (\d) tenths and (\d) hundredths/))) return `${match[1]}0${match[2]}.${match[3]}${match[4]}`;
    if (prompt.startsWith('Leila says')) return 'No. 0.7 = 0.70, and 0.70 > 0.67.';
    if ((match = prompt.match(/divides its input by 10\. The input is ([\d,]+)/))) return format(shift(exact(match[1]), -1));
    if ((match = prompt.match(/multiplied by 100\. The result is ([\d,]+)\. What was the original number/))) return format(shift(exact(match[1]), -2));
    if ((match = prompt.match(/^(?:Which number is |Write )(.+?)(?:\?| in figures\.)$/))) return format({ digits: BigInt(numberFromWords(match[1])), places: 0 });
    if ((match = prompt.match(/digits (\d), (\d), (\d) and (\d) once to make a four-digit number\. What is the (smallest even|largest odd)/))) {
        const made = permutations(match.slice(1, 5)).filter(text => text[0] !== '0');
        const smallestEven = match[5] === 'smallest even';
        const wanted = made.filter(text => Number(text) % 2 === (smallestEven ? 0 : 1)).sort();
        return smallestEven ? wanted[0] : wanted.at(-1);
    }
    if ((match = prompt.match(/has (\d) digits\. It is multiplied by ([\d,]+)\./))) return String(Number(match[1]) + match[2].replace(/,/g, '').length - 1);
    if ((match = prompt.match(/Use (\d), (\d) and (\d) once each to make a three-digit number\. Which number is closest to (\d+)\?/))) {
        const target = Number(match[4]);
        return permutations(match.slice(1, 4)).sort((a, b) => Math.abs(a - target) - Math.abs(b - target))[0];
    }
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
    const pool = card.locator('.pv-order-pool');
    if (await pool.count()) {
        const values = await pool.locator('button').allTextContents();
        for (const value of values.sort((a, b) => num(a) - num(b))) await pool.getByRole('button', { name: value, exact: true }).click();
        return values.length > 0;
    }
    const tapCards = card.locator('.pv-tap-cards');
    if (await tapCards.count()) {
        const target = num(prompt.match(/less than (\d+(?:\.\d+)?)/)[1]);
        const buttons = tapCards.locator('button');
        for (let index = 0; index < await buttons.count(); index++) {
            const button = buttons.nth(index);
            if (num(await button.innerText()) < target && await button.getAttribute('aria-pressed') !== 'true') await button.click();
        }
        return false;
    }
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
    // The number line question: read the picture's description, not the lesson's answer.
    if (prompt.startsWith('What number is at P on the number line?')) {
        const label = await card.locator('svg[role=img]').getAttribute('aria-label');
        const [, left, gaps, tick] = label.match(/from (\d+) to \d+ with (\d+) equal gaps\. P is at mark (\d+)/).map(Number);
        const value = String(Number((left + tick / gaps).toFixed(2)));
        if (choice) await options.filter({ hasText: new RegExp(`^${value.replace('.', '\\.')}$`) }).click();
        else await card.locator('input[type=text]').fill(value);
        return true;
    }
    let answer = answerFor(prompt, choice);
    if (answer === null) {
        const labels = await options.allTextContents();
        answer = labels.find(label => {
            const m = label.match(/^([−-]?[\d.]+) ([<>]) ([−-]?[\d.]+)$/);
            return m && (m[2] === '<' ? num(m[1]) < num(m[3]) : num(m[1]) > num(m[3]));
        });
    }
    if (choice) await options.filter({ hasText: new RegExp(`^${answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }).click();
    else await card.locator('input[type=text]').fill(answer);
    return true;
}
module.exports = solve;
