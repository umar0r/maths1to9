const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { loadScript, allStrings, wrongSums } = require('./helpers/lessons.cjs');
const window = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/lesson-engine.js'), 'utf8'), { window, document: { body: { dataset: { lessonRenderer: 'custom' } } } });
const Q = loadScript(path.join(__dirname, '../content/place-value/place-value.js'),
    ['types', 'generate', 'pick', 'prepare', 'examples', 'checks', 'learnScreens', 'shiftedCells', 'scalingWidget', 'orderingWidget', 'formatScaledInteger'], { window });
const { seededRandom } = window.Maths1to9LessonEngine;
const samples = Q.types.flatMap(type => ['choice', 'number', ...(type === 'order' ? ['custom'] : [])].flatMap(mode => Array.from({ length: 300 }, (_, seed) => ({ seed,
    q: Q.generate({ type, mode }, seededRandom(Math.imul(seed, 2654435761) >>> 0))
}))));
const questionsOf = type => samples.filter(({ q }) => q.questionType === type);
const answerOf = q => q.input === 'choice' ? q.options.find(option => option.correct).label : q.answer;
const num = text => Number(String(text).replace(/,/g, ''));

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

test('digitValue: each digit appears once and its value is correct in words and numbers', () => {
    for (const { seed, q } of questionsOf('digitValue')) {
        const [, number, digit] = q.prompt.match(/In ([\d,.]+), what is the value of the digit (\d)/);
        const plain = number.replace(/,/g, '');
        assert.equal(plain.split(digit).length - 1, 1, `ambiguous digit ${seed}`);
        const point = plain.includes('.') ? plain.indexOf('.') : plain.length, at = plain.indexOf(digit);
        const exponent = at < point ? point - at - 1 : point - at;
        assert.equal(answerOf(q), q.input === 'choice' ? valueInWords(Number(digit), exponent) : format(shift(toExact(digit), exponent)), q.prompt);
    }
});
test('compare: direct comparisons, race winners and prices are correct in both modes', () => {
    const contexts = new Set();
    for (const { q } of questionsOf('compare')) {
        contexts.add(q.scenario);
        const [left, right] = [num(q.left), num(q.right)];
        assert.notEqual(left, right);
        let expected;
        if (q.scenario === 'direct') expected = q.input === 'choice' ? `${q.left} ${left < right ? '<' : '>'} ${q.right}` : left > right ? q.left : q.right;
        else if (q.scenario === 'race') {
            const match = q.prompt.match(/^(\w+) finishes a race in ([\d.]+) seconds\. (\w+) finishes in ([\d.]+) seconds/);
            assert(match);
            expected = q.input === 'choice' ? num(match[2]) < num(match[4]) ? match[1] : match[3] : num(match[2]) < num(match[4]) ? match[2] : match[4];
        } else {
            const match = q.prompt.match(/One game costs £(\d+(?:\.\d+)?) and another costs £(\d+(?:\.\d+)?)/);
            assert(match);
            const higher = num(match[1]) > num(match[2]) ? match[1] : match[2];
            expected = q.input === 'choice' ? `£${higher}` : higher;
        }
        assert.equal(answerOf(q), expected, q.prompt);
    }
    assert.equal(contexts.size, 3);
});
test('order: unique values are sorted exactly and all three answer modes are correct', () => {
    for (const { q } of questionsOf('order')) {
        const sorted = [...q.values].sort((a, b) => num(a) - num(b));
        assert.deepEqual(Array.from(q.correctOrder), sorted);
        assert.equal(new Set(q.values.map(num)).size, 4);
        for (const value of q.values) assert.match(value, /^\d{1,3}(?:,\d{3})*(?:\.\d+)?$/);
        if (q.input === 'custom') {
            assert.equal(q.widget.mark(sorted).correct, true);
            assert.equal(q.widget.answerText(sorted), sorted.map(value => format(toExact(value))).join(' → '));
            assert.equal(q.widget.mark([...sorted].reverse()).correct, false);
            assert.equal(q.widget.mark([sorted[0], sorted[0], ...sorted.slice(2)]).correct, false);
            assert.equal(q.widget.isEmpty(sorted.slice(1)), true);
        } else assert.equal(answerOf(q), q.input === 'choice' ? sorted.join(' → ') : sorted[0]);
    }
});
test('scaledProduct: the given fact and changed product are exact, with no equivalent distractor', () => {
    for (const { q } of questionsOf('scaledProduct')) {
        const [, a, b, product, c, d] = q.prompt.match(/Given that ([\d.,]+) × ([\d.,]+) = ([\d.,]+), what is ([\d.,]+) × ([\d.,]+)\?/);
        assert.equal(format(times(toExact(a), toExact(b))), product, q.prompt);
        const expected = format(times(toExact(c), toExact(d)));
        assert.equal(answerOf(q), expected, q.prompt);
        for (const option of q.options || []) if (!option.correct) assert.notEqual(num(option.label), num(expected));
    }
});
test('powerOfTen: multiplication and division by 10, 100 and 1,000 are exact', () => {
    for (const { q } of questionsOf('powerOfTen')) {
        const [, number, operation, factor] = q.prompt.match(/What is ([\d.,]+) ([×÷]) ([\d,]+)\?/);
        const zeros = factor.replace(/,/g, '').length - 1;
        const expected = format(shift(toExact(number), operation === '×' ? zeros : -zeros));
        assert.equal(answerOf(q), expected, q.prompt);
        for (const option of q.options || []) if (!option.correct) assert.notEqual(num(option.label), num(expected));
    }
});
test('all fixed and generated choices have four distinct options and their own feedback', () => {
    for (const q of [...samples.map(({ q }) => q), ...Q.examples(), ...Q.checks()].filter(q => q.options)) {
        assert.equal(q.options.length, 4, q.prompt);
        assert.equal(new Set(q.options.map(option => option.label)).size, 4);
        assert.equal(q.options.filter(option => option.correct).length, 1);
        assert(q.options.every(option => option.feedback.trim()));
    }
});
test('typed cards preserve exact decimal values and have misconception rules and matching hints', () => {
    for (const q of [...samples.map(({ q }) => q), ...Q.examples(), ...Q.checks()].filter(q => q.input === 'number')) {
        assert.equal(q.tolerance, 0);
        assert(q.feedback && q.fallback && q.rules.length);
        for (const rule of q.rules) { assert(rule.feedback); assert.notEqual(num(rule.value), num(q.answer)); }
    }
});
test('sessions contain six seeded items, all five types and mixed answer modes', () => {
    for (let seed = 0; seed < 200; seed++) {
        const session = Q.pick(seededRandom(seed));
        assert.equal(session.length, 6);
        assert.equal(new Set(session.map(item => item.type)).size, 5);
        assert.equal(session.filter(item => item.mode === 'choice').length, 2);
        assert.equal(session.filter(item => item.mode === 'number').length, 3);
        assert.equal(session.filter(item => item.mode === 'custom').length, 1);
        assert.equal(JSON.stringify(session), JSON.stringify(Q.pick(seededRandom(seed))));
        for (const item of session) {
            assert.deepEqual(Object.keys(item).sort(), ['mode', 'seed', 'type']);
            assert.equal(JSON.stringify(Q.generate(item, seededRandom(item.seed))), JSON.stringify(Q.generate(item, seededRandom(item.seed))));
        }
    }
    for (const questions of [Q.examples(), Q.checks()]) {
        assert(questions.filter(q => q.input === 'choice').length >= 2);
        assert(questions.filter(q => q.input !== 'choice').length >= 2);
    }
});
test('scaling cards check both row positions and the exact typed product', () => {
    for (const targets of [[1, 1], [-1, 1], [2, 2]]) {
        const widget = Q.scalingWidget(89, 54, targets);
        const answer = format(shift(toExact('4806'), -targets.reduce((a, b) => a + b, 0)));
        assert.equal(widget.mark({ offsets: targets, answer }).correct, true);
        assert.equal(widget.mark({ offsets: targets, answer: `${answer.replace(/,/g, '')}0` }).correct, answer.includes('.'));
        assert.equal(widget.mark({ offsets: [0, 0], answer }).correct, false);
        assert.equal(widget.mark({ offsets: targets, answer: '4,806abc' }).correct, false);
        assert.equal(widget.isEmpty({ offsets: targets, answer: '' }), true);
    }
});
test('shifted rows retain digits and fixed ones/decimal columns for every requested move', () => {
    for (const [digits, targets] of [['89', [-1, 0, 1, 2]], ['54', [-1, 0, 1, 2]]]) for (const offset of targets) {
        const cells = Q.shiftedCells(digits, offset);
        assert.equal(cells.length, 7);
        const whole = cells.slice(0, 4).map(value => value || '0').join('');
        const decimal = cells.slice(4).map(value => value || '0').join('');
        assert.equal(format(toExact(`${whole}.${decimal}`)), format(shift(toExact(digits), -offset)));
    }
});
test('number formatting fuzz checks now run in tests instead of on every page load', () => {
    const random = seededRandom(381);
    const E = window.Maths1to9LessonEngine;
    for (let seed = 0; seed < 250; seed++) {
        const integer = E.randomInt(0, 9999999, random), places = E.randomInt(1, 3, random);
        const value = integer * 10 ** places + E.randomInt(0, 10 ** places - 1, random);
        for (const keepZeros of [false, true]) {
            const formatted = Q.formatScaledInteger(value, places, keepZeros);
            assert.match(formatted, /^\d{1,3}(?:,\d{3})*(?:\.\d+)?$/);
            assert.equal(format(toExact(formatted)), format({ digits: BigInt(value), places }));
        }
    }
});
test('Learn has eight screens and teaches every question method before it is asked', () => {
    assert.equal(Q.learnScreens.length, 8);
    const text = JSON.stringify(Q.learnScreens).toLowerCase();
    for (const keyword of ['digit', 'column', 'zero', 'tenths', 'hundredths', 'thousandths', 'compare', 'order', 'decimal point stays fixed', 'divide by 100', 'factor', 'product', 'cancel', '10,000']) assert(text.includes(keyword), keyword);
    for (const line of allStrings(Q.learnScreens)) assert.deepEqual(wrongSums(line), [], line);
});

// Preserve the generic checks whose old questions.js discovery no longer applies.
const skillMap = JSON.parse(fs.readFileSync(path.join(__dirname, '../content/place-value/lesson.json'), 'utf8')).assessment.question_types;
test('place-value: every fixed question type still has its skill mapping', () => {
    for (const q of [...Q.examples(), ...Q.checks()]) assert(q.questionType in skillMap);
});
for (const type of Q.types) {
    const generated = questionsOf(type);
    test(`${type}: generates seeded questions without errors`, () => assert(generated.length >= 600));
    test(`${type}: has a skill mapping in lesson.json`, () => assert(type in skillMap));
    test(`${type}: has exactly one correct distinct answer`, () => {
        for (const { q } of generated.filter(({ q }) => q.options)) {
            assert.equal(q.options.filter(option => option.correct).length, 1);
            assert.equal(new Set(q.options.map(option => option.label.trim().replace(/\s+/g, ' '))).size, 4);
        }
    });
    test(`${type}: shared shuffling varies the answer position and preserves feedback`, () => {
        const positions = new Set();
        for (const { q, seed } of generated.filter(({ q }) => q.options)) {
            const source = JSON.stringify(q), prepared = Q.prepare(q, seededRandom(seed));
            positions.add(prepared.options.findIndex(option => option.correct));
            for (const option of prepared.options) assert.equal(option.feedback, q.options.find(original => original.label === option.label).feedback);
            assert.equal(JSON.stringify(q), source);
        }
        assert(positions.size > 1);
    });
    test(`${type}: text has no broken values and uses the proper minus sign`, () => {
        for (const { q } of generated) for (const text of allStrings(q)) {
            assert.doesNotMatch(text, /\b(?:undefined|NaN|null|Infinity)\b|\[object Object\]/);
            assert.doesNotMatch(text.replace(/<[^>]*>/g, ''), /(?:^|[\s(=])-\d/);
        }
    });
    test(`${type}: numbers are tidy without floating-point leftovers`, () => {
        for (const { q } of generated) for (const text of allStrings(q)) assert.doesNotMatch(text, /\d\.\d{9,}/);
    });
    test(`${type}: every completed worked sum is right`, () => {
        for (const { q } of generated) for (const text of allStrings(q)) assert.deepEqual(wrongSums(text), [], text);
    });
    test(`${type}: explains the answer in every mode`, () => {
        for (const { q } of generated) {
            assert(q.feedback.trim());
            if (q.options) assert(q.options.every(option => option.feedback.trim()));
        }
    });
}
