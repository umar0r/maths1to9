// Solve from the displayed calculation, rather than inspecting answer flags.
const number = text => Number(text.replace('−', '-'));
const signed = value => String(value).replace('-', '−');

module.exports = async function solve(page) {
    if (await require('../negative-numbers-learn-helper.cjs')(page)) return true;
    const main = page.locator('.lesson-controls button.button--primary:visible');
    if (await main.isEnabled()) return false;
    // The sign-rule gaps: a tapped card fills the next gap if it's the
    // right sign, so tapping each card in turn fills them all.
    const signCards = page.locator('.nn-sign-card:visible');
    if (await signCards.count()) {
        for (let tap = 0; tap < 16 && await page.locator('.nn-sign-gap:visible').count(); tap++) {
            await signCards.nth(tap % await signCards.count()).click();
        }
        return true;
    }
    const prompt = page.locator('.question-prompt:visible');
    if (!await prompt.count()) return false;
    const text = await prompt.innerText();
    // The sign machine: flipping one card is enough.
    if (text.startsWith('Tap a card to flip its sign')) {
        await page.locator('.nn-punch-card:visible').first().click();
        return true;
    }
    const options2 = page.locator('.question-card-options:visible button');
    const line = page.getByRole('slider', { name: 'Choose an answer on the number line' });
    const give = async value => {
        if (await options2.count()) await page.getByRole('button', { name: signed(value), exact: true }).click();
        else if (await line.isVisible()) {
            const min = Number(await line.getAttribute('aria-valuemin'));
            const max = Number(await line.getAttribute('aria-valuemax'));
            const track = line.locator('.negative-track');
            const { x, y, width } = await track.boundingBox();
            const box = await line.boundingBox();
            await line.click({ position: { x: x - box.x + width * (value - min) / (max - min), y: y - box.y + 40 } });
        } else await page.locator('.question-card:visible input[type=text]').fill(signed(value));
    };
    const numbers = (text.match(/[−-]?\d+/g) || []).map(number);
    const choose = name => page.getByRole('button', { name, exact: true }).click().then(() => true);
    // Question-bank Practice questions.
    let match;
    if ((match = text.match(/^Work out \(−([\d.]+)\) × \(−([\d.]+)\)\.$/))) { await give(Math.round(Number(match[1]) * 10 * Number(match[2])) / 10); return true; }
    if ((match = text.match(/^Work out −(\d+) ÷ −(\d+), then/))) return choose(`${match[1] / match[2]}, then −${match[1] / match[2]}`);
    if ((match = text.match(/^Work out \(−(\d+)\) × \(−\1\)\./))) return choose(String(match[1] * match[1]));
    if (text === 'Which of these has a positive answer?') {
        const right = (await options2.allTextContents()).find(label => /^\d+ − \(−\d+\)$/.test(label.trim()));
        return choose(right.trim());
    }
    if (text.startsWith('What number is exactly halfway between')) { await give((numbers[0] + numbers[1]) / 2); return true; }
    if (text.includes('×')) {
        if (text.includes('? ×')) await give(numbers[1] / numbers[0]);
        else await give(numbers[0] * numbers[1]);
        return true;
    }
    const thermometer = page.getByRole('slider', { name: 'Set the temperature' });
    if (await thermometer.isVisible()) {
        const answer = numbers[0] + numbers[1];
        const current = Number(await thermometer.getAttribute('aria-valuenow'));
        await thermometer.focus();
        for (let step = 0; step < Math.abs(answer - current); step++) {
            await thermometer.press(answer > current ? 'ArrowUp' : 'ArrowDown');
        }
        return true;
    }
    if (text.startsWith('It is ')) {
        const [start, first, second] = numbers;
        await give(text.includes('falls') ? start - first + second : start + first);
        return true;
    }
    if (text.includes('? +')) { await give(numbers[1] - numbers[0]); return true; }
    if (text.startsWith('Adding ')) {
        const labels = await options2.allInnerTexts();
        const right = labels.find(label => {
            const sums = label.split(' and ').map(sum => (sum.match(/[−-]?\d+/g) || []).map(number));
            return sums.every(([a, b, c]) => a + b === c) && sums.some(s => s[2] > 0) && sums.some(s => s[2] < 0);
        });
        await page.getByRole('button', { name: right, exact: true }).click();
        return true;
    }
    if (/^Work out [−-]?\d+ − \d+\.$/.test(text)) { await give(numbers[0] - numbers[1]); return true; }
    if (/^Work out [−-]?\d+ \+ \d+\.$/.test(text)) { await give(numbers[0] + numbers[1]); return true; }
    if (/^Work out [−-]?\d+ \+ \(−\d+\)\.$/.test(text)) { await give(numbers[0] + numbers[1]); return true; }
    const calculation = text.match(/([−-]?\d+)\s*−\s*\(−(\d+)\)/);
    const options = page.locator('.question-card-options:visible button');
    const understanding = {
        'On a number line, what do + and − tell you to do?': '+ means move right. − means move left.',
        'What happens to the two minus signs when you take away a negative number?': 'They turn into a plus, so you add.',
        'What sign do you get when you multiply a negative number by a positive number?': 'A minus, because the two signs are different.',
        'The table shows the sign of the answer when you multiply. What goes in the empty square?': '+, because the two signs are the same.',
        'You start on a negative number and take away a positive number. What happens?': 'You move left, further below zero, so the answer is more negative.',
        'You start on a positive number and take away a bigger number. What happens?': 'You go past zero, so the answer is negative.'
    };
    if (understanding[text]) {
        await page.getByRole('button', { name: understanding[text], exact: true }).click();
    } else if (calculation) {
        const start = number(calculation[1]), amount = Number(calculation[2]);
        if (text.startsWith('Sam writes:')) {
            await page.getByRole('button', { name: `He changed ${signed(start)} to ${signed(-start)}. The answer is ${signed(start + amount)}.`, exact: true }).click();
        } else if (await options.count()) {
            await page.getByRole('button', { name: `${signed(start)} + ${amount}`, exact: true }).click();
        } else {
            await give(start + amount);
        }
    } else throw new Error(`Cannot solve negative-numbers question: ${text}`);
    return true;
};
