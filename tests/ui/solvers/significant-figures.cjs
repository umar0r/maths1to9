// Solve from the displayed number, requested accuracy and option labels.
const withCommas = text => {
    const [whole, fraction] = text.split('.');
    return whole.replace(/\B(?=(\d{3})+$)/g, ',') + (fraction !== undefined ? '.' + fraction : '');
};
function roundSig(text, n) {
    const clean = text.replace(/,/g, '');
    const [whole, fraction = ''] = clean.split('.');
    const mantissa = BigInt(whole + fraction);
    if (mantissa === 0n) throw new Error(`Cannot round zero: ${text}`);
    const length = mantissa.toString().length;
    const drop = length - n;
    let kept, place = drop - fraction.length;
    if (drop > 0) {
        const unit = 10n ** BigInt(drop);
        kept = mantissa / unit;
        if ((mantissa % unit) * 2n >= unit) kept++;
        if (kept.toString().length > n) { kept /= 10n; place++; }
    } else {
        kept = mantissa;
    }
    if (place >= 0) return (kept * 10n ** BigInt(place)).toString();
    const digits = kept.toString().padStart(-place + 1, '0');
    return digits.slice(0, place) + '.' + digits.slice(place);
}
module.exports = async function solve(page) {
    // Learn tap screens: tap the digit that decides, or the last significant figure.
    const tapDigits = page.locator('.significant-digits[role=group]:visible button');
    if (await tapDigits.count()) {
        const title = await page.locator('[data-screen-heading]:visible').innerText();
        const index = await page.evaluate(title => {
            const screen = window.SignificantFigures.learnScreens.find(screen => screen.title === title);
            const digits = window.SignificantFigures.digits(screen.number, screen.n);
            return screen.tap === 'last' ? digits.target : digits.decider;
        }, title);
        await page.locator('.significant-digits[role=group]:visible').locator(':scope > *').nth(index).click();
        return true;
    }
    const main = page.locator('.lesson-controls button.button--primary:visible');
    if (await main.isEnabled()) return false;
    const prompt = page.locator('.question-prompt:visible');
    if (!await prompt.count()) return false;
    const text = await prompt.innerText();
    let answer;
    if (text.startsWith('Amir says')) answer = 'Start at 2. Keep 2 and 8. The next digit is 3, so the answer is 0.028';
    else if (text.startsWith('How many significant figures does')) {
        // Start at the first digit that is not zero and count every digit after it.
        const shown = [...text.match(/does ([\d.]+) show/)[1].replace('.', '')];
        answer = String(shown.slice(shown.findIndex(digit => digit !== '0')).length);
    } else {
        const match = text.match(/^Round ([\d,.]+) to (\d+) significant figures?/);
        if (!match) throw new Error(`Cannot solve significant figures question: ${text}`);
        const number = match[1].replace(/,/g, '');
        const n = Number(match[2]);
        if (/Which/.test(text)) {
            const indexes = [...number].map((digit, i) => /\d/.test(digit) ? i : -1).filter(i => i >= 0);
            const start = indexes.findIndex(i => number[i] !== '0');
            const index = indexes[start + n - Number(text.includes('Which is the last digit'))];
            const point = number.includes('.') ? number.indexOf('.') : number.length;
            const power = point - index - Number(index < point);
            const names = {6:'millions',5:'hundred-thousands',4:'ten-thousands',3:'thousands',2:'hundreds',1:'tens',0:'ones','-1':'tenths','-2':'hundredths','-3':'thousandths','-4':'ten-thousandths','-5':'hundred-thousandths','-6':'millionths'};
            answer = `${number[index]} (${names[power]})`;
        } else answer = roundSig(number, n);
    }
    const options = page.locator('.question-card-options:visible button');
    if (await options.count()) {
        if (/^Round/.test(text) && !/Which/.test(text)) answer = withCommas(answer);
        await page.getByRole('button', { name: answer, exact: true }).click();
    } else await page.locator('.question-card:visible input[type=text]').fill(answer);
    return true;
};
