// Solver for adding-decimal-numbers. Continue is always enabled here (it checks
// the answer), so the solver fills in the right answer first: line up the
// decimal points, type each digit or total, choose the reason, and in the
// check write the explanation and tick the self-review.
const { exact, show } = require('../../helpers/decimals.cjs');

const sumOf = (a, b) => {
    const [x, y] = [exact(a), exact(b)];
    const places = Math.max(x.places, y.places);
    const lift = v => v.digits * 10n ** BigInt(places - v.places);
    return show({ digits: lift(x) + lift(y), places }, 2);
};
const COLUMN = { hundredths: 0, tenths: 1, ones: 2, tens: 3 };

// Set an input to a value; true if it had to change (so the runner waits a step).
async function fill(locator, value) {
    if ((await locator.inputValue()) === value) return false;
    await locator.fill(value);
    return true;
}

module.exports = async function solve(page) {
    // 1. Line up the decimal points: move each movable row until its offset is 0.
    for (const row of await page.locator('.movable:visible').all()) {
        const offset = Number(await row.getAttribute('aria-valuenow'));
        if (offset !== 0) {
            await row.focus();
            await page.keyboard.press(offset > 0 ? 'ArrowLeft' : 'ArrowRight');
            return true;
        }
    }
    const heading = (await page.locator('main h2:visible').first().innerText().catch(() => '')).replace(/£/g, '');
    const [, a, b] = heading.match(/([\d.]+) \+ ([\d.]+)/) ?? [];

    // 2. Step-by-step inputs.
    const guided = page.locator('#guided-input:visible');
    if (await guided.count()) {
        const label = await page.locator('label[for="guided-input"]').innerText();
        if (await guided.evaluate(el => el.tagName === 'SELECT')) {
            if ((await guided.inputValue()) === 'aligned') return false;
            await guided.selectOption('aligned');
            return true;
        }
        if (/write after the 4/.test(label)) return fill(guided, '0');
        const column = label.match(/Enter the (\w+) digit/)?.[1];
        if (column && a) {
            const digits = [...sumOf(a, b).replace('.', '')].reverse();
            return fill(guided, digits[COLUMN[column]]);
        }
    }

    // 3. Practice and check totals. Each input belongs to a working block with its own sum.
    for (const input of await page.locator('input[data-answer]:visible:enabled').all()) {
        const block = page.locator(`[data-work="${await input.getAttribute('data-answer')}"]`);
        const numbers = (await block.innerText()).match(/\d+\.\d+|\d+/g);
        const rows = await block.locator('.decimal-row').evaluateAll(rs => rs.map(r => r.innerText.replace(/\s+/g, '')));
        const total = sumOf(rows[0] ?? numbers[0], rows[1] ?? numbers[1]);
        if (await fill(input, total)) return true;
    }

    // 4. The check's written explanation, then the self-review tick.
    const reason = page.locator('#reason:visible:enabled');
    if (await reason.count() && await fill(reason, 'The last digits are different place values: 8 is tenths and 4 is hundredths. Line up the decimal points so tenths add to tenths.')) return true;
    const review = page.locator('#reason-review:visible');
    if (await review.count() && !(await review.isChecked())) { await review.check(); return true; }
    return false;
};
