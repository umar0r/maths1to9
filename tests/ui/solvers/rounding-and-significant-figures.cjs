// Work from visible prompts, digit positions and an independent exact reference.
const { roundToPower, roundSig, withCommas } = require('../../helpers/decimals.cjs');
const names = {6:'millions',5:'hundred-thousands',4:'ten-thousands',3:'thousands',2:'hundreds',1:'tens',0:'ones','-1':'tenths','-2':'hundredths','-3':'thousandths','-4':'ten-thousandths','-5':'hundred-thousandths','-6':'millionths'};
module.exports = async function solve(page) {
    const slider = page.locator('input[type=range]:visible');
    if (await slider.count() && await slider.isEnabled() && await slider.inputValue() !== '70') {
        await slider.focus();
        await slider.press('End');
        return true;
    }
    // Learn tap screens: tap the end of the line the number rounds to, or the digit asked for.
    const ends = page.locator('.rounding-end:visible');
    const tapDigits = page.locator('.significant-digits[role=group]:visible button');
    if (await ends.count() || await tapDigits.count()) {
        const title = await page.locator('[data-screen-heading]:visible').innerText();
        const pick = await page.evaluate(title => {
            const screen = window.Rounding.learnScreens.find(screen => screen.title === title);
            if (screen.tap === 'end') return { end: Number(window.Rounding.rounded(String(screen.value), 'nearest', Math.log10(10 * screen.step))) };
            const digits = window.Rounding.keyDigits(screen.number, screen.kind, screen.accuracy);
            return { index: screen.tap === 'last' ? digits.target : digits.decider };
        }, title);
        if (pick.end !== undefined) await page.locator(`.rounding-end[data-end="${pick.end}"]:visible`).click();
        else await page.locator('.significant-digits[role=group]:visible').locator(':scope > *').nth(pick.index).click();
        return true;
    }
    // Road game: drive the car to the nearer sign with the arrow keys (halfway rounds up).
    const road = page.locator('.rounding-road svg[aria-disabled="false"]:visible');
    if (await road.count()) {
        const mile = Number(await road.getAttribute('aria-valuenow'));
        const low = Number(await road.getAttribute('aria-valuemin'));
        const target = mile - low >= 5 ? low + 10 : low;
        if (mile !== target && mile !== low && mile !== low + 10) {
            await road.focus();
            for (let i = 0; i < Math.abs(target - mile); i++) await road.press(target > mile ? 'ArrowRight' : 'ArrowLeft');
            return true;
        }
    }
    const main = page.locator('.lesson-controls button.button--primary:visible');
    if (await main.isEnabled()) return false;
    const prompt = page.locator('.question-prompt:visible');
    if (!await prompt.count()) return false;
    const text = await prompt.innerText();
    let answer;
    // Real-life word problems have no rounding phrase to read, so take their answer from the lesson.
    const context = await page.evaluate(prompt => window.Rounding.examples().find(q => q.stage === 'context' && q.prompt === prompt)?.answer, text);
    if (text.startsWith('Amir says')) answer = 'The 5 rounds the tenths up, giving 5.0';
    else if (context) answer = context;
    else {
        let match, kind, accuracy, phrase;
        if ((match = text.match(/nearest million/))) { kind = 'nearest'; accuracy = 6; phrase = match[0]; }
        else if ((match = text.match(/nearest whole number/))) { kind = 'nearest'; accuracy = 0; phrase = match[0]; }
        else if ((match = text.match(/nearest (\d[\d,]*)/))) { kind = 'nearest'; accuracy = match[1].replace(/,/g, '').length - 1; phrase = match[0]; }
        else if ((match = text.match(/(\d+) decimal places?/))) { kind = 'decimal'; accuracy = Number(match[1]); phrase = match[0]; }
        else if ((match = text.match(/(\d+) significant figures?/))) { kind = 'sig'; accuracy = Number(match[1]); phrase = match[0]; }
        else throw new Error(`Cannot read accuracy: ${text}`);
        const named = text.match(/^Round (\d[\d,]*(?:\.\d+)?) to/);
        const values = named ? [named[1]] : text.replace(phrase, '').match(/\d[\d,]*(?:\.\d+)?/g) || [];
        if (values.length !== 1) throw new Error(`Cannot read number: ${text}`);
        const number = values[0].replace(/,/g, '');
        const becomes = text.match(/Type what the (\d) becomes/);
        const next = text.match(/The next digit is (\d)/);
        if (becomes) {
            answer = String(Number(next[1]) >= 5 ? (Number(becomes[1]) + 1) % 10 : Number(becomes[1]));
        } else if (/Which/.test(text)) {
            const indexes = [...number].map((digit, i) => /\d/.test(digit) ? i : -1).filter(i => i >= 0);
            const point = number.includes('.') ? number.indexOf('.') : number.length;
            const significant = indexes.slice(indexes.findIndex(i => number[i] !== '0'));
            let index = kind === 'sig' ? significant[accuracy - 1] : kind === 'decimal' ? point + accuracy : point - 1 - accuracy;
            if (!text.includes('Which is the last digit') && !text.includes('Which digit is in the')) index = indexes[indexes.indexOf(index) + 1];
            const power = point - index - Number(index < point);
            answer = `${number[index]} (${names[power]})`;
        } else answer = kind === 'sig' ? roundSig(number, accuracy) : roundToPower(number, kind === 'decimal' ? -accuracy : accuracy);
    }
    const options = page.locator('.question-card-options:visible button');
    if (await options.count()) {
        if (!/Which|Amir/.test(text)) answer = withCommas(answer);
        await page.getByRole('button', { name: answer, exact: true }).click();
    } else await page.locator('.question-card:visible input[type=text]').fill(answer);
    return true;
};
