// Maths checks for rounding-and-significant-figures: every rounding in the
// lesson is recomputed exactly, and digits, options and explanations must agree.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readJson, contentDir } = require('./helpers/lessons.cjs');
const { roundToPower, roundSig, withCommas, lessonChecker } = require('./helpers/decimals.cjs');

const folder = 'rounding-and-significant-figures';
const data = readJson(path.join(contentDir, folder, 'lesson.json'));
const { matches } = lessonChecker(path.join(contentDir, folder, 'lesson.js'));
const questions = [...data.guided, ...data.practice, ...data.check];
const decimals = text => (String(text).split('.')[1] || '').length;

// "nearest 10", "2 decimal places", "3 significant figures" -> how to round.
function accuracyIn(text) {
    let m;
    if ((m = text.match(/nearest (\d[\d,]*)/))) return { kind: 'power', power: m[1].replace(/,/g, '').length - 1, phrase: m[0] };
    if ((m = text.match(/nearest whole number/))) return { kind: 'power', power: 0, phrase: m[0] };
    if ((m = text.match(/(\d+) decimal places?/))) return { kind: 'power', power: -Number(m[1]), phrase: m[0] };
    if ((m = text.match(/(\d+) significant figures?/))) return { kind: 'sig', figures: Number(m[1]), phrase: m[0] };
    return null;
}
const round = (number, accuracy) => accuracy.kind === 'sig' ? roundSig(number, accuracy.figures) : roundToPower(number, accuracy.power);
// The number being rounded: the prompt's number that is not part of the accuracy.
function numberIn(prompt, accuracy) {
    const numbers = prompt.replace(accuracy.phrase, '').match(/\d[\d,]*(?:\.\d+)?/g) ?? [];
    return numbers.length === 1 ? numbers[0].replace(/,/g, '') : null;
}
// Index in the number string of the digit to keep, and of the deciding digit.
function keyDigits(number, accuracy) {
    const digitIndexes = [...number].map((c, i) => /\d/.test(c) ? i : -1).filter(i => i >= 0);
    let target;
    if (accuracy.kind === 'sig') {
        const significant = digitIndexes.slice(digitIndexes.findIndex(i => number[i] !== '0'));
        target = significant[accuracy.figures - 1];
    } else {
        const point = number.includes('.') ? number.indexOf('.') : number.length;
        target = accuracy.power >= 0 ? point - 1 - accuracy.power : point - accuracy.power;
    }
    return { target, decider: digitIndexes[digitIndexes.indexOf(target) + 1] };
}
const roundingQuestions = questions
    .map(q => ({ q, accuracy: accuracyIn(q.prompt) }))
    .filter(({ q, accuracy }) => accuracy && !/says/.test(q.prompt))
    .map(({ q, accuracy }) => ({ q, accuracy, number: q.number ?? numberIn(q.prompt, accuracy) }));

test('every rounding question is recognised', () => {
    for (const q of questions.filter(q => !/says/.test(q.prompt))) {
        const found = roundingQuestions.find(r => r.q === q);
        assert.ok(found?.number, `could not read the number and accuracy from "${q.prompt}"`);
    }
});

test('every rounding answer is correct', () => {
    for (const { q, accuracy, number } of roundingQuestions) {
        assert.equal(q.answer.replace(/,/g, ''), round(number, accuracy), q.prompt);
        assert.ok(matches(q, q.answer), `the lesson's checker rejects its own answer: ${q.prompt}`);
    }
});

test('typed answers that need a trailing zero insist on it (places is set)', () => {
    for (const { q } of roundingQuestions.filter(({ q }) => !q.options && /\.\d*0$/.test(q.answer))) {
        assert.equal(q.places, decimals(q.answer), `"${q.prompt}" needs ${q.answer}, but without "places" the answer ${q.answer.replace(/\.?0+$/, '')} is also accepted`);
    }
});

test('each set of options has exactly one correct answer, and no duplicates', () => {
    for (const q of questions.filter(q => q.options)) {
        assert.equal(q.options.filter(option => matches(q, option)).length, 1, `${q.prompt}: ${q.options.join(', ')}`);
        assert.equal(new Set(q.options.map(o => o.replace(/,/g, ''))).size, q.options.length, `duplicate options: ${q.prompt}`);
    }
});

const PLACE_POWERS = { thousands: 3, hundreds: 2, tens: 1, ones: 0, tenths: -1, hundredths: -2, thousandths: -3 };
// The digit of `number` in the place 10^power.
function digitAt(number, power) {
    const point = number.includes('.') ? number.indexOf('.') : number.length;
    return number[power >= 0 ? point - 1 - power : point - power];
}

test('explanations name the right digits', () => {
    for (const { q, accuracy, number } of roundingQuestions) {
        const decider = number[keyDigits(number, accuracy).decider];
        const next = q.explanation.match(/next digit(?: after [^.,]*?)? is (\d)/i) ?? q.explanation.match(/deciding digit is (\d)/i) ?? q.explanation.match(/^(\d) is (?:at least|less than) 5/);
        if (next) assert.equal(next[1], decider, `the deciding digit is ${decider}, the explanation says ${next[1]}: ${q.prompt}`);
        for (const [, place, digit] of q.explanation.matchAll(/The (thousands|hundreds|tens|ones|tenths|hundredths|thousandths) digit(?: in the original number)? is (\d)/g)) {
            assert.equal(digit, digitAt(number, PLACE_POWERS[place]), `the ${place} digit of ${number} is ${digitAt(number, PLACE_POWERS[place])}, the explanation says ${digit}: ${q.prompt}`);
        }
    }
});

test('explanations state the final answer', () => {
    const missing = roundingQuestions
        .filter(({ q }) => ![q.answer, withCommas(q.answer.replace(/,/g, ''))].some(a => q.explanation.includes(a)))
        .map(({ q }) => `"${q.prompt}" (answer ${q.answer})`);
    assert.deepEqual(missing, [], 'these explanations describe the step but never give the answer');
});

test('step-by-step examples point at the right digits', () => {
    for (const q of data.guided) {
        const accuracy = accuracyIn(q.prompt);
        const { target, decider } = keyDigits(q.number, accuracy);
        assert.equal(q.target, target, `digit to keep: ${q.prompt}`);
        assert.equal(q.decider, decider, `deciding digit: ${q.prompt}`);
        const helped = q.decider_help?.match(/is (\d)\./);
        if (helped) assert.equal(helped[1], q.number[q.decider], `decider_help names the wrong digit: ${q.prompt}`);
    }
});

test('learn slides: worked examples and highlighted digits are right', () => {
    for (const item of data.learn) {
        const m = (item.equation ?? '').match(/^([\d,.]+) ≈ ([\d,.]+)\s+\((.+)\)$/);
        if (m) assert.equal(m[2].replace(/,/g, ''), round(m[1].replace(/,/g, ''), accuracyIn(m[3])), item.equation);
        if (item.digits && m) {
            const number = item.digits.map(([, digit]) => digit === '·' ? '.' : digit).join('');
            assert.equal(number, m[1].replace(/,/g, ''), `${item.title}: the digit chart does not show ${m[1]}`);
            const { target, decider } = keyDigits(number, accuracyIn(m[3]));
            assert.deepEqual([item.target, item.decider], [target, decider], `${item.title}: wrong digits highlighted`);
        }
    }
});

test("Amir's claim is wrong and the correct explanation gives the right rounding", () => {
    for (const q of questions.filter(q => /says/.test(q.prompt))) {
        const [, number, claim, spec] = q.prompt.match(/“([\d.]+) rounds to ([\d.]+) (?:at|to) (.+?)\.”/) ?? [];
        assert.ok(number, `could not read Amir's claim: ${q.prompt}`);
        const right = round(number, accuracyIn(spec));
        assert.notEqual(claim, right, `Amir is actually right: ${q.prompt}`);
        assert.ok(q.answer.includes(right), `the correct option should give ${right}: "${q.answer}"`);
    }
});
