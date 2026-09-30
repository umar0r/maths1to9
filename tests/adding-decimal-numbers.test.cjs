// Maths checks for adding-decimal-numbers. The questions, worked examples and
// hints live in lesson.js, so they are loaded from there and recomputed exactly.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { contentDir, read, loadScript, plain, wrongSums } = require('./helpers/lessons.cjs');
const { exact, show, equal } = require('./helpers/decimals.cjs');

const file = path.join(contentDir, 'adding-decimal-numbers', 'lesson.js');
const source = read(file);
// An empty progress store, so the lesson starts fresh instead of "restoring" a stub.
const emptyStore = { getLessonProgress: async () => null, saveLessonProgress: async () => {} };
const lesson = loadScript(file, ['questions', 'learn', 'review', 'answer', 'assess'], { window: { Maths1to9Progress: emptyStore } });
const { questions } = lesson;
const sum = (a, b) => {
    const [x, y] = [exact(a), exact(b)];
    const places = Math.max(x.places, y.places);
    const lift = v => v.digits * 10n ** BigInt(places - v.places);
    return { digits: lift(x) + lift(y), places };
};
// Column digits right to left (hundredths, tenths, ones, tens) of a 2-decimal number.
const columns = text => [...exact(text).digits.toString().padStart(3, '0')].reverse().join('').slice(0, 4).split('');
const array = pattern => JSON.parse(source.match(pattern)[1].replace(/'/g, '"'));

test('every question adds up correctly', () => {
    for (const [a, b, total] of questions) {
        assert.ok(equal(sum(a, b), exact(total)), `${a} + ${b} = ${show(sum(a, b))}, not ${total}`);
    }
});

test('every number fits the place-value grid (tens, ones, tenths, hundredths)', () => {
    for (const number of questions.flat()) {
        const [whole, fraction = ''] = number.split('.');
        assert.ok(whole.length <= 2 && fraction.length <= 2, `${number} does not fit the 2-digit whole, 2-decimal grid, so digits would be lost`);
    }
});

test('step-by-step examples expect the right digits, right to left', () => {
    const expected = source.match(/const expected=i===0\?(\[[^\]]+\]):(\[[^\]]+\])/);
    assert.ok(expected, 'could not find the expected digits in lesson.js');
    [expected[1], expected[2]].forEach((list, i) => {
        const digits = JSON.parse(list.replace(/'/g, '"'));
        const total = show({ ...exact(questions[i][2]) }, 2).replace('.', '');
        const fromColumns = [...total].reverse();
        assert.deepEqual(digits, fromColumns.slice(0, digits.length), `example ${i + 1} (${questions[i][0]} + ${questions[i][1]}) expects ${digits.join(', ')}`);
        assert.equal(digits.length, total.replace(/^0+(?=\d)/, '').length, `example ${i + 1} should ask for every digit of ${questions[i][2]}`);
    });
});

test('step-by-step hints add the right column digits', () => {
    const hints = source.match(/feedback\(\(i===0\?(\[[^\]]+\]):(\[[^\]]+\])\)/);
    assert.ok(hints, 'could not find the step hints in lesson.js');
    const places = { hundredths: 0, tenths: 1, ones: 2 };
    [hints[1], hints[2]].forEach((list, i) => {
        const [a, b] = questions[i].slice(0, 2).map(n => show(exact(n), 2));
        for (const hint of JSON.parse(list.replace(/'/g, '"'))) {
            const m = hint.match(/Check the (hundredths|tenths|ones): (\d) \+ (\d)/);
            if (!m) continue;
            const column = places[m[1]];
            const digit = n => [...n.replace('.', '')].reverse()[column];
            assert.deepEqual([m[2], m[3]], [digit(a), digit(b)], `example ${i + 1} hint "${hint}": the ${m[1]} digits of ${a} and ${b} are ${digit(a)} and ${digit(b)}`);
        }
    });
});

test('the worked example on the learn slide is right, step by step', () => {
    const text = plain(lesson.learn());
    assert.match(text, /Add 14\.7 \+ 6\.82/);
    assert.ok(equal(sum('14.7', '6.82'), exact('21.52')), '14.7 + 6.82 = 21.52');
    assert.match(text, /21\.52/, 'the grid should show 21.52');
    assert.deepEqual(wrongSums(text), [], 'a step in the worked example does not add up');
    // The sense check: about 15 + about 7 = about 22.
    const [, x, y, z] = text.match(/about (\d+) and .*? is about (\d+)\. An answer near (\d+)/) ?? [];
    assert.equal(Number(x) + Number(y), Number(z), 'the estimate does not add up');
});

test('the check review and model answers add up and match the questions', () => {
    const text = plain(lesson.review());
    assert.deepEqual(wrongSums(text), [], 'a sum in the check review does not add up');
    for (const i of [6, 7]) {
        const [a, b, total] = questions[i];
        assert.match(text, new RegExp(`${show(exact(a), 2).replace('.', '\\.')} \\+ ${show(exact(b), 2).replace('.', '\\.')} = ${total.replace('.', '\\.')}`), `review should show ${a} + ${b} = ${total}`);
    }
});

test('question wording matches the data', () => {
    assert.match(source, new RegExp(`Work out ${questions[6][0]} \\+ ${questions[6][1]}`), 'check question 1 text');
    assert.match(source, new RegExp(`contains ${questions[7][0]} litres\\. Another contains ${questions[7][1]} litres`), 'check question 3 text');
    assert.match(source, new RegExp(`'£${questions[5][0]} \\+ £${questions[5][1]}'`), 'the money question text');
    assert.match(source, new RegExp(`'£${questions[5][2]}'`), 'the money question answer text');
    assert.match(source, new RegExp(`add ${questions[6][0]} and ${questions[6][1]}`), 'the explain-the-mistake question');
});

test('the answer checker accepts right answers and rejects misaligned or wrong ones', () => {
    questions.forEach(([a, b, total], i) => {
        const entry = lesson.answer(i);
        Object.assign(entry, { offset: 0, value: total });
        assert.equal(lesson.assess(i), true, `${a} + ${b}: ${total} with the decimal points lined up should be accepted`);
        Object.assign(entry, { offset: 1, value: total });
        assert.equal(lesson.assess(i), false, `${a} + ${b}: a misaligned layout should not be accepted`);
        Object.assign(entry, { offset: 0, value: show(sum(total, '0.1')) });
        assert.equal(lesson.assess(i), false, `${a} + ${b}: a wrong total should not be accepted`);
    });
    const money = lesson.answer(5);
    Object.assign(money, { offset: 0, value: `£${questions[5][2]}` });
    assert.equal(lesson.assess(5), true, 'the money answer should accept a £ sign');
});
