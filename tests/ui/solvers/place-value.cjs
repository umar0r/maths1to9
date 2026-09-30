// Solver for place-value: method digit taps and product sliders come from
// lesson.json; practice questions are worked out from the screen.
const { lessonData, num, section, sectionText, options, choose, setSlider } = require('./common.cjs');

const data = lessonData('place-value');
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const TENS = ['', 'ten', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const PLACES = { 3: 'thousand', 2: 'hundred', '-1': 'tenth', '-2': 'hundredth', '-3': 'thousandth' };
const valueInWords = (digit, power) => power === 0 ? WORDS[digit] : power === 1 ? TENS[digit]
    : `${WORDS[digit]} ${PLACES[power]}${power < 0 && digit !== 1 ? 's' : ''}`;

// Exact decimals as digit strings.
const exact = t => { const [w, f = ''] = String(t).replace(/,/g, '').split('.'); return { d: BigInt(w + f), p: f.length }; };
const format = ({ d, p }) => {
    const s = d.toString().padStart(p + 1, '0');
    const whole = (p ? s.slice(0, -p) : s).replace(/\B(?=(\d{3})+$)/g, ',');
    const frac = (p ? s.slice(-p) : '').replace(/0+$/, '');
    return whole + (frac ? '.' + frac : '');
};

function practiceAnswer(text) {
    let m;
    if ((m = text.match(/In ([\d,.]+), which value is represented by the digit (\d)/))) {
        const n = m[1].replace(/,/g, ''), point = n.includes('.') ? n.indexOf('.') : n.length, at = n.indexOf(m[2]);
        return valueInWords(Number(m[2]), at < point ? point - at - 1 : point - at);
    }
    if ((m = text.match(/(\d+(?:\.\d+)?) \? (\d+(?:\.\d+)?)/))) return num(m[1]) < num(m[2]) ? '<' : '>';
    if ((m = text.match(/(\w+) finishes a race in (\d+(?:\.\d+)?) seconds\. (\w+) finishes in (\d+(?:\.\d+)?) seconds/))) return num(m[2]) < num(m[4]) ? m[1] : m[3];
    if ((m = text.match(/One game costs £(\d+(?:\.\d+)?) and another costs £(\d+(?:\.\d+)?)/))) return `£${num(m[1]) > num(m[2]) ? m[1] : m[2]}`;
    if ((m = text.match(/what is ([\d.,]+) × ([\d.,]+)\?/))) {
        const [a, b] = [exact(m[1]), exact(m[2])];
        return format({ d: a.d * b.d, p: a.p + b.p });
    }
    if ((m = text.match(/What is ([\d.,]+) ([×÷]) ([\d,]+)\?/))) {
        const x = exact(m[1]), zeros = m[3].replace(/,/g, '').length - 1;
        return format(m[2] === '×' ? { d: x.d * 10n ** BigInt(zeros), p: x.p } : { d: x.d, p: x.p + zeros });
    }
    return null;
}

// Final check questions are randomised, so work each one out from its wording.
function finalCheckAnswer(text) {
    let m;
    if ((m = text.match(/has (\d) hundreds, (\d) ones, (\d) tenths and (\d) hundredths/))) {
        return { type: 'number', answer: `${m[1]}0${m[2]}.${m[3]}${m[4]}` };
    }
    if ((m = text.match(/divides its input by 10\. The input is ([\d,]+)/))) {
        return { type: 'number', answer: format({ d: BigInt(m[1].replace(/,/g, '')), p: 1 }) };
    }
    if ((m = text.match(/multiplied by 100\. The result is ([\d,]+)\. What was the original number/))) {
        return { type: 'number', answer: format({ d: BigInt(m[1].replace(/,/g, '')), p: 2 }) };
    }
    if ((m = text.match(/“(0\.\d+) is greater than (0\.\d) because/))) {
        // Leila is wrong: the shorter decimal is bigger once zeros are added.
        return { type: 'choices', answers: ['No', `No. ${m[2]} = ${m[2]}0, and ${m[2]}0 > ${m[1]}.`] };
    }
    return null;
}

// Tap the tiles in order, smallest first.
// Practice uses data-order-tile; the final check uses data-final-tile.
async function orderTiles(page) {
    for (const [tile, pool] of [['data-order-tile', '[data-order-source="pool"]'], ['data-final-tile', '']]) {
        const selector = `[${tile}]${pool}:visible`;
        const tiles = await page.locator(selector).evaluateAll((els, attr) => els.map(e => e.getAttribute(attr)), tile);
        if (!tiles.length) continue;
        for (const value of [...tiles].sort((a, b) => num(a) - num(b))) {
            await page.locator(`[${tile}="${value}"]${pool}:visible`).first().click();
        }
        return true;
    }
    return false;
}

module.exports = async function solve(page, memory) {
    const where = await section(page);
    const main = page.locator('.lesson-controls button:visible').first();
    const waiting = !(await main.isEnabled().catch(() => false));

    if (where === 'interactive' && !memory.explored) {
        // Exploring the digits earns the explore points.
        await page.locator('[data-digit-index]:visible').first().click();
        memory.explored = true;
        return true;
    }
    if (where === 'method' && waiting) {
        const prompt = await sectionText(page);
        const example = data.method.guided_examples.find(e => prompt.includes(e.prompt) && prompt.includes(e.digits.join(' ')))
            ?? data.method.guided_examples.find(e => prompt.includes(e.prompt));
        await page.locator(`.place-value-method__digit[data-digit-index="${example.correct_index}"]:visible`).first().click();
        return true;
    }
    if (where === 'product-interactive' && waiting) {
        const text = await sectionText(page);
        const example = data.product_interactive.examples.find(e => text.includes(e.question));
        for (const [row, target] of example.target_offsets.entries()) {
            await setSlider(page, page.locator(`[data-role="product-digit-row"][data-row-index="${row}"]:visible`).first(), target);
        }
        return true;
    }
    if ((where === 'question-bank' || where === 'comparison') && waiting) {
        if (await orderTiles(page)) return true;
        const text = await sectionText(page);
        const final = finalCheckAnswer(text);
        if (final?.type === 'number') {
            await page.locator('main input:not([type="radio"]):visible').first().fill(final.answer);
            return true;
        }
        if (final?.type === 'choices') {
            for (const answer of final.answers) {
                if ((await options(page)).some(o => o.label === answer)) await choose(page, answer);
            }
            return true;
        }
        const answer = practiceAnswer(text);
        if (answer && (await options(page)).length) return choose(page, answer);
    }
    return false;
};
