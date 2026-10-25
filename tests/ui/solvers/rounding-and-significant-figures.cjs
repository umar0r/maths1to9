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
    const main = page.locator('.lesson-controls button.button--primary:visible');
    if (await main.isEnabled()) return false;
    const prompt = page.locator('.question-prompt:visible');
    if (!await prompt.count()) return false;
    const text = await prompt.innerText();
    let answer;
    if (text.startsWith('Amir says')) answer = 'The 5 rounds the tenths up, giving 5.0';
    else {
        let match, kind, accuracy, phrase;
        if ((match = text.match(/nearest (\d[\d,]*)/))) { kind = 'nearest'; accuracy = match[1].replace(/,/g, '').length - 1; phrase = match[0]; }
        else if ((match = text.match(/(\d+) decimal places?/))) { kind = 'decimal'; accuracy = Number(match[1]); phrase = match[0]; }
        else if ((match = text.match(/(\d+) significant figures?/))) { kind = 'sig'; accuracy = Number(match[1]); phrase = match[0]; }
        else throw new Error(`Cannot read accuracy: ${text}`);
        const values = text.replace(phrase, '').match(/\d[\d,]*(?:\.\d+)?/g) || [];
        if (values.length !== 1) throw new Error(`Cannot read number: ${text}`);
        const number = values[0].replace(/,/g, '');
        if (/Which/.test(text)) {
            const indexes = [...number].map((digit, i) => /\d/.test(digit) ? i : -1).filter(i => i >= 0);
            const point = number.includes('.') ? number.indexOf('.') : number.length;
            const significant = indexes.slice(indexes.findIndex(i => number[i] !== '0'));
            let index = kind === 'sig' ? significant[accuracy - 1] : kind === 'decimal' ? point + accuracy : point - 1 - accuracy;
            if (!text.includes('Which is the last digit')) index = indexes[indexes.indexOf(index) + 1];
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
