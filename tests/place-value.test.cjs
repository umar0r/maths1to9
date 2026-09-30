// Maths checks for place-value question generators. Decimals are handled
// as exact digit strings so no floating-point rounding can hide an error.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { questionsOf, num } = require('./helpers/lessons.cjs');

const folder = 'place-value';

// Exact decimals: { digits: BigInt, places } <-> "1,234.5".
const toExact = text => {
    const [whole, fraction = ''] = String(text).replace(/,/g, '').split('.');
    return { digits: BigInt(whole + fraction), places: fraction.length };
};
const format = ({ digits, places }) => {
    let s = digits.toString().padStart(places + 1, '0');
    let whole = places ? s.slice(0, -places) : s, fraction = places ? s.slice(-places) : '';
    fraction = fraction.replace(/0+$/, '');
    whole = whole.replace(/\B(?=(\d{3})+$)/g, ',');
    return whole + (fraction ? '.' + fraction : '');
};
const times = (a, b) => ({ digits: a.digits * b.digits, places: a.places + b.places });
const shift = (a, powerOfTen) => powerOfTen >= 0
    ? { digits: a.digits * 10n ** BigInt(powerOfTen), places: a.places }
    : { digits: a.digits, places: a.places - powerOfTen };

const PLACES = { 3: 'thousand', 2: 'hundred', 1: 'ten', 0: '', '-1': 'tenth', '-2': 'hundredth', '-3': 'thousandth' };
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const TENS = { 1: 'ten', 2: 'twenty', 3: 'thirty', 4: 'forty', 5: 'fifty', 6: 'sixty', 7: 'seventy', 8: 'eighty', 9: 'ninety' };
function valueInWords(digit, power) {
    if (power === 0) return WORDS[digit];
    if (power === 1) return TENS[digit];
    return `${WORDS[digit]} ${PLACES[power]}${power < 0 && digit !== 1 ? 's' : ''}`;
}

test('digitValue: the digit appears once and its value is named correctly', () => {
    for (const { seed, q } of questionsOf(folder, 'digitValue')) {
        const [, number, digit] = q.prompt.match(/In ([\d,.]+), which value is represented by the digit (\d)/);
        const plainNumber = number.replace(/,/g, '');
        assert.equal(plainNumber.split(digit).length - 1, 1, `the digit ${digit} appears more than once in ${number}, so the question is ambiguous (seed ${seed})`);
        const point = plainNumber.includes('.') ? plainNumber.indexOf('.') : plainNumber.length;
        const at = plainNumber.indexOf(digit);
        const powerOfTen = at < point ? point - at - 1 : point - at;
        assert.equal(q.answer, valueInWords(Number(digit), powerOfTen), `${q.prompt} (seed ${seed})`);
    }
});

test('compare: the symbol or the named winner is right', () => {
    for (const { seed, q, raw } of questionsOf(folder, 'compare')) {
        if (raw.display) {
            const [a, b] = raw.display.split(' ? ').map(num);
            assert.equal(q.answer, a < b ? '<' : a > b ? '>' : '=', `${raw.display} (seed ${seed})`);
            continue;
        }
        const race = q.prompt.match(/^(\w+) finishes a race in ([\d.]+) seconds\. (\w+) finishes in ([\d.]+) seconds\. Who has the shorter time\?$/);
        const games = q.prompt.match(/^One game costs £([\d.]+) and another costs £([\d.]+)\. Which game costs more\?$/);
        if (race) {
            const [, first, a, second, b] = race;
            assert.notEqual(num(a), num(b), `a tie: ${q.prompt} (seed ${seed})`);
            assert.equal(q.answer, num(a) < num(b) ? first : second, `${q.prompt} (seed ${seed})`);
        } else if (games) {
            const [, a, b] = games.map(num);
            assert.notEqual(a, b, `a tie: ${q.prompt} (seed ${seed})`);
            assert.ok(q.answer.includes(games[a > b ? 1 : 2]), `${q.prompt} answered "${q.answer}" (seed ${seed})`);
        } else {
            assert.fail(`unrecognised compare question, add a check for it: "${q.prompt}" (seed ${seed})`);
        }
    }
});

test('order: the answer is the numbers from smallest to largest', () => {
    for (const { seed, raw } of questionsOf(folder, 'order')) {
        const sorted = [...raw.values].sort((a, b) => num(a) - num(b));
        assert.deepEqual(raw.correctOrder, sorted, `(seed ${seed})`);
        assert.equal(raw.answer, sorted.map(v => format(toExact(v))).join(' → '), `(seed ${seed})`);
        assert.equal(new Set(raw.values.map(num)).size, raw.values.length, `two values are equal, so the order is ambiguous (seed ${seed})`);
    }
});

test('scaledProduct: the given fact is true and the answer is the exact product', () => {
    for (const { seed, q } of questionsOf(folder, 'scaledProduct')) {
        const [, a, b, product, c, d] = q.prompt.match(/Given that ([\d.,]+) × ([\d.,]+) = ([\d.,]+), what is ([\d.,]+) × ([\d.,]+)\?/);
        assert.equal(format(times(toExact(a), toExact(b))), product, `the given fact is wrong: ${q.prompt} (seed ${seed})`);
        const expected = format(times(toExact(c), toExact(d)));
        assert.equal(q.answer, expected, `${q.prompt} (seed ${seed})`);
        for (const option of q.options.filter(option => option !== q.answer)) assert.notEqual(num(option), num(expected), `distractor ${option} (seed ${seed})`);
    }
});

test('powerOfTen: multiplying and dividing by 10, 100 and 1,000 is exact', () => {
    for (const { seed, q } of questionsOf(folder, 'powerOfTen')) {
        const [, number, operation, factor] = q.prompt.match(/What is ([\d.,]+) ([×÷]) ([\d,]+)\?/);
        const zeros = factor.replace(/,/g, '').length - 1;
        const expected = format(shift(toExact(number), operation === '×' ? zeros : -zeros));
        assert.equal(q.answer, expected, `${q.prompt} (seed ${seed})`);
        for (const option of q.options.filter(option => option !== q.answer)) assert.notEqual(num(option), num(expected), `distractor ${option} (seed ${seed})`);
    }
});
