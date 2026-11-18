// Work from what is on screen: the visible words, the digit positions in the
// lesson data, the number lines and an independent exact reference.
const { roundToPower, roundSig, withCommas } = require('../../helpers/decimals.cjs');

const clean = text => String(text).replace(/[,£\s]/g, '');
const numberOf = text => Number(clean(text));

// Where a value sits across a 660-wide line drawn with a margin at each end.
const acrossLine = (line, value) => (line.edge + (value - line.base) / (10 * line.step) * (660 - 2 * line.edge)) / 660;

// A real mouse drag: pointer events, so the same path a finger takes.
async function dragTo(page, from, to) {
    const box = await from.boundingBox();
    const startX = box.x + box.width / 2, startY = box.y + box.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 10, startY + 10, { steps: 4 });
    await page.mouse.move(to.x, to.y, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(250);
}

// Try it's two hands-on slides: tap the digit, then tap the line or drag the
// cards into place. Returns true when it did something.
async function solveTryIt(page) {
    const info = await page.evaluate(() => {
        const slide = [...document.querySelectorAll('.rounding-tryit')].find(node => node.getClientRects().length);
        if (!slide) return null;
        const heading = [...document.querySelectorAll('[data-screen-heading]')]
            .find(node => node.getClientRects().length)?.textContent.trim() ?? '';
        const data = window.Rounding.tryIt.slides.find(item => item.title === heading);
        const digits = data?.digits ? window.Rounding.keyDigits(data.digits, 'nearest', data.accuracy) : null;
        const line = slide.querySelector('.rounding-line');
        return {
            keep: digits ? digits.target : null,
            labels: data?.labels ?? null,
            digitButtons: slide.querySelectorAll('.significant-digits[role=group] button').length,
            line: line ? data?.line ?? null : null,
            half: data?.line ? (data.line.value >= data.line.base + 5 * data.line.step ? 'upper' : 'lower') : null,
            dot: Boolean(slide.querySelector('.rounding-dot')),
            slots: [...slide.querySelectorAll('.tryit-slot')].map(slot => ({
                index: Number(slot.dataset.slot), filled: slot.classList.contains('is-filled')
            })),
            cards: [...slide.querySelectorAll('.tryit-card')].map(card => Number(card.dataset.value))
        };
    });
    if (!info) return false;

    // Step 1: the digit that decides.
    if (info.digitButtons) {
        await page.locator('.rounding-tryit .significant-digits[role=group] button').nth(info.keep).click();
        return true;
    }
    if (!info.line || info.dot) return false;

    // Slide one: tap the half of the line the number goes in.
    if (!info.labels) {
        await page.locator(`.rounding-tryit .rounding-half-button[data-half="${info.half}"]`).click();
        return true;
    }

    // Slide two: the three labels first, then the number itself.
    const empty = info.slots.find(slot => !slot.filled);
    if (empty) {
        const value = Number(clean(info.labels[empty.index]));
        const target = await page.locator(`.rounding-tryit .tryit-slot[data-slot="${empty.index}"]`).boundingBox();
        await dragTo(page, page.locator(`.rounding-tryit .tryit-card[data-value="${value}"]`),
            { x: target.x + target.width / 2, y: target.y + target.height / 2 });
        return true;
    }
    if (info.cards.includes(info.line.value)) {
        const box = await page.locator('.rounding-tryit .rounding-line svg').first().boundingBox();
        await dragTo(page, page.locator(`.rounding-tryit .tryit-card[data-value="${info.line.value}"]`),
            { x: box.x + acrossLine(info.line, info.line.value) * box.width, y: box.y + box.height / 2 });
        return true;
    }
    return false;
}

// A real-life question: work the answer out from its own words.
function situationAnswer(text) {
    const path = text.match(/nearest (\d[\d,]*)/);
    const metres = text.match(/(\d[\d,]*)\s*metres/);
    if (path && metres) return roundToPower(clean(metres[1]), clean(path[1]).length - 1);
    const sum = text.match(/(\d[\d,]*(?:\.\d+)?)\s*÷\s*(\d[\d,]*(?:\.\d+)?)/);
    if (!sum) return null;
    const total = numberOf(sum[1]);
    const size = numberOf(sum[2]);
    if (!total || !size) return null;
    if (/smallest|needed|at least|least/i.test(text)) return String(Math.ceil(total / size));
    if (/full|greatest|can buy|can cut|can make/i.test(text)) return String(Math.floor(total / size));
    return null;
}

module.exports = async function solve(page) {
    // Try it's intro: move the number along the line.
    const slider = page.locator('input[type=range]:visible');
    if (await slider.count() && await slider.isEnabled() && await slider.inputValue() !== '70') {
        await slider.focus();
        await slider.press('End');
        return true;
    }

    if (await page.locator('.rounding-tryit:visible').count()) return solveTryIt(page);

    // Learn tap screens: tap the end of the line the number rounds to, or the digit asked for.
    const ends = page.locator('.rounding-end:visible');
    const tapDigits = page.locator('.significant-digits[role=group]:visible button');
    if (await ends.count() || await tapDigits.count()) {
        const title = await page.locator('[data-screen-heading]:visible').innerText();
        const pick = await page.evaluate(title => {
            const screen = [...window.Rounding.learnScreens, ...window.Rounding.tryIt.slides].find(screen => screen.title === title);
            // Real-life screens say which end they round to (here you round up, not to the nearest).
            if (screen.tap === 'end') return { end: screen.answer ?? Number(window.Rounding.rounded(String(screen.value), 'nearest', Math.log10(10 * screen.step))) };
            const digits = window.Rounding.keyDigits(screen.number, screen.kind, screen.accuracy);
            return { index: screen.tap === 'last' ? digits.target : digits.decider };
        }, title);
        if (pick.end !== undefined) await page.locator(`.rounding-end[data-end="${pick.end}"]:visible`).click();
        else await page.locator('.significant-digits[role=group]:visible').locator(':scope > *').nth(pick.index).click();
        return true;
    }

    const main = page.locator('.lesson-controls button.button--primary:visible');
    if (await main.isEnabled()) return false;
    const prompt = page.locator('.question-prompt:visible');
    if (!await prompt.count()) return false;
    const text = await prompt.innerText();
    let answer;
    if (text.startsWith('Amir says')) answer = 'The 5 rounds the tenths up, giving 5.0';
    else if (text.startsWith('Which steps')) answer = await page.evaluate(() => window.Rounding.checks()
        .find(q => q.questionType === 'method').options.find(o => o.correct).label);
    else {
        let match, kind, accuracy, phrase;
        if ((match = text.match(/nearest million/))) { kind = 'nearest'; accuracy = 6; phrase = match[0]; }
        else if ((match = text.match(/nearest whole number/))) { kind = 'nearest'; accuracy = 0; phrase = match[0]; }
        else if ((match = text.match(/nearest (\d[\d,]*)/))) { kind = 'nearest'; accuracy = match[1].replace(/,/g, '').length - 1; phrase = match[0]; }
        else if ((match = text.match(/(\d+) decimal places?/))) { kind = 'decimal'; accuracy = Number(match[1]); phrase = match[0]; }
        else if ((match = text.match(/(\d+) significant figures?/))) { kind = 'sig'; accuracy = Number(match[1]); phrase = match[0]; }
        else {
            answer = situationAnswer(text);
            if (answer === null) throw new Error(`Cannot read accuracy: ${text}`);
        }
        if (answer === undefined) {
            // Take the rounding phrase out first, so "1 decimal place" is never
            // mistaken for the number being rounded.
            const values = text.replace(phrase, ' ').match(/\d[\d,]*(?:\.\d+)?/g) || [];
            if (values.length !== 1) throw new Error(`Cannot read number: ${text}`);
            const number = clean(values[0]);
            answer = kind === 'sig' ? roundSig(number, accuracy) : roundToPower(number, kind === 'decimal' ? -accuracy : accuracy);
        }
    }
    const options = page.locator('.question-card-options:visible button');
    if (await options.count()) {
        if (!/Amir|Which steps/.test(text)) answer = withCommas(answer);
        await page.getByRole('button', { name: answer, exact: true }).click();
    } else await page.locator('.question-card:visible input[type=text]').fill(answer);
    return true;
};
