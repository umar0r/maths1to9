// Maths checks for function machines: every input is worked out again from
// the machine and output written in the question, by undoing each box.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { loadScript, allStrings, wrongSums } = require('./helpers/lessons.cjs');

const window = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/lesson-engine.js'), 'utf8'),
    { window, document: { body: { dataset: { lessonRenderer: 'custom' } } } });
loadScript(path.join(__dirname, '../content/function-machines-find-the-input-2/machines.js'), [], { window });
const F = window.FunctionMachines;
const lesson = JSON.parse(fs.readFileSync(path.join(__dirname, '../content/function-machines-find-the-input-2/lesson.json'), 'utf8'));
const { seededRandom } = window.Maths1to9LessonEngine;
const signed = text => Number(String(text).replace(/−/g, '-'));

const DO = { adds: (x, n) => x + n, subtracts: (x, n) => x - n, 'multiplies by': (x, n) => x * n, 'divides by': (x, n) => x / n };
const UNDO = { adds: (x, n) => x - n, subtracts: (x, n) => x + n, 'multiplies by': (x, n) => x / n, 'divides by': (x, n) => x * n };
// "The machine multiplies by 2, then adds 7. Its output is 25. Find the input."
function readMachine(prompt) {
    const [, steps, output] = prompt.match(/The machine (.+)\. Its output is (−?\d+)\./);
    const boxes = steps.split(', then ').map(step => {
        const [, verb, value] = step.match(/^(adds|subtracts|multiplies by|divides by) (\d+)$/);
        return { verb, value: Number(value) };
    });
    const input = boxes.slice().reverse().reduce((value, box) => UNDO[box.verb](value, box.value), signed(output));
    return { boxes, output: signed(output), input };
}

const generated = F.practiceTypes.flatMap(type => ['choice', 'number'].flatMap(mode =>
    Array.from({ length: 200 }, (_, seed) => ({
        seed, mode, q: F.generate({ type, mode }, seededRandom(Math.imul(seed + 1, 2654435761) >>> 0))
    }))));
const fixed = [...F.examples().map(q => ({ seed: 'Try it', q })), ...F.checks().map(q => ({ seed: 'Check', q }))];
const all = [...generated, ...fixed];
const inputCards = all.filter(({ q }) => /Find the input/.test(q.prompt));
const answerOf = q => q.input === 'choice' ? q.options.find(option => option.correct).label : q.answer;
const where = (q, seed) => `${q.prompt} (${seed})`;

test('every Practice type is generated in both modes and mapped to a skill', () => {
    for (const type of F.practiceTypes) {
        for (const mode of ['choice', 'number']) {
            assert.ok(generated.some(({ q, mode: m }) => q.questionType === type && m === mode && q.input === mode), `${type} ${mode}`);
        }
        assert.ok(lesson.assessment.question_types[type], `${type} has no skill mapping`);
    }
});

test('the input is found by undoing each box in reverse order, and running forwards gives the output', () => {
    for (const { seed, q } of inputCards) {
        const { boxes, output, input } = readMachine(q.prompt);
        assert.ok(Number.isInteger(input), `input ${input} is not whole ${where(q, seed)}`);
        assert.equal(signed(answerOf(q)), input, where(q, seed));
        let value = input;
        for (const box of boxes) {
            value = DO[box.verb](value, box.value);
            assert.ok(Number.isInteger(value), `a step gives ${value} ${where(q, seed)}`);
        }
        assert.equal(value, output, where(q, seed));
    }
});

test('choice questions have four distinct options, one correct, each with its own feedback', () => {
    for (const { seed, q } of all.filter(({ q }) => q.input === 'choice')) {
        assert.equal(q.options.length, 4, where(q, seed));
        assert.equal(q.options.filter(option => option.correct).length, 1, where(q, seed));
        assert.equal(new Set(q.options.map(option => option.label)).size, 4, where(q, seed));
        assert.equal(new Set(q.options.map(option => option.feedback)).size, 4, where(q, seed));
    }
});

test('typed questions have mistake rules that are wrong, and a fallback', () => {
    for (const { seed, q } of all.filter(({ q }) => q.input === 'number')) {
        assert.ok(q.fallback, where(q, seed));
        for (const rule of q.rules) assert.notEqual(signed(rule.value), signed(q.answer), `rule ${rule.value} ${where(q, seed)}`);
    }
});

test('the wrong inputs come from real mistaken routes', () => {
    for (const { seed, q } of inputCards.filter(({ q }) => q.input === 'choice').slice(0, 400)) {
        const { boxes, output } = readMachine(q.prompt);
        const forwards = boxes.reduce((value, box) => DO[box.verb](value, box.value), output);
        const oppositeSameOrder = boxes.reduce((value, box) => UNDO[box.verb](value, box.value), output);
        const routes = [forwards, oppositeSameOrder, output];
        // Every wrong option is one of the named routes, or a single wrong operation in the backwards route.
        for (const option of q.options.filter(o => !o.correct)) {
            const value = signed(option.label);
            assert.ok(Number.isInteger(value), `${option.label} ${where(q, seed)}`);
            assert.notEqual(value, readMachine(q.prompt).input, where(q, seed));
            assert.ok(option.feedback.length > 20, where(q, seed));
            if (/forwards from the output/.test(option.feedback)) assert.equal(value, routes[0], where(q, seed));
            if (/original order/.test(option.feedback)) assert.equal(value, routes[1], where(q, seed));
            if (/That is the output/.test(option.feedback)) assert.equal(value, routes[2], where(q, seed));
        }
    }
});

test('guided steps: the undo operation, each backwards step and the forwards check are right', () => {
    const [start, undo1, step1, undo2, step2, check] = F.examples();
    assert.equal(answerOf(start), '28');
    for (const [card, box, opposite] of [[undo1, '× 4', '÷ 4'], [undo2, '− 3', '+ 3']]) {
        assert.ok(card.prompt.includes(box), card.prompt);
        assert.equal(answerOf(card), opposite);
    }
    for (const card of [step1, step2]) {
        const [, a, op, b] = card.prompt.match(/Work out (−?\d+) ([+−×÷]) (\d+)/);
        const value = { '+': signed(a) + Number(b), '−': signed(a) - Number(b), '×': signed(a) * Number(b), '÷': signed(a) / Number(b) }[op];
        assert.equal(signed(card.answer), value, card.prompt);
    }
    assert.deepEqual([step1.answer, step2.answer].map(signed), [7, 10]);
    const chain = answerOf(check);
    assert.ok(chain.startsWith('10 ') && chain.endsWith('= 28'), chain);
    assert.deepEqual(wrongSums(chain), []);
    for (const option of check.options) assert.deepEqual(wrongSums(option.label), [], option.label);
});

test('text has no broken values, uses proper signs and its worked sums are right', () => {
    for (const { seed, q } of all) {
        for (const text of allStrings({ ...q, model: undefined })) {
            assert.doesNotMatch(text, /\b(?:undefined|NaN|null|Infinity)\b|\[object Object\]/, `${text} ${where(q, seed)}`);
            assert.doesNotMatch(text, /(?:^|[\s(=,])-\d/, `hyphen used as a minus sign in "${text}"`);
        }
        for (const text of [q.feedback, ...(q.options || []).filter(o => o.correct).map(o => o.feedback)].filter(Boolean)) {
            assert.deepEqual(wrongSums(text), [], `${text} ${where(q, seed)}`);
        }
    }
});

test('the correct option is not always in the same place after shuffling', () => {
    const positions = new Set(generated.filter(({ q }) => q.input === 'choice').slice(0, 300)
        .map(({ q, seed }) => F.prepare(q, seededRandom(seed + 7)).options.findIndex(option => option.correct)));
    assert.ok(positions.size > 2, `answer positions: ${[...positions]}`);
});

test('a session has six questions from different types, mixing choice and typed, and repeats from its seed', () => {
    for (let seed = 1; seed <= 200; seed++) {
        const items = F.pick(seededRandom(seed));
        assert.equal(items.length, lesson.question_bank.session_length ?? 6);
        assert.equal(new Set(items.map(item => item.type)).size, items.length, `seed ${seed}`);
        assert.ok(items.some(item => item.mode === 'choice') && items.some(item => item.mode === 'number'), `seed ${seed}`);
        assert.deepEqual(F.pick(seededRandom(seed)), items, `seed ${seed} is not repeatable`);
    }
});

test('Try it and Check each mix choice and typed questions', () => {
    for (const set of [F.examples(), F.checks()]) {
        assert.ok(set.filter(q => q.input === 'choice').length >= 2);
        assert.ok(set.filter(q => q.input === 'number').length >= 2);
    }
    assert.equal(F.checks().length, 5);
    assert.ok(F.examples().length <= 12);
});

test('Learn teaches working backwards with opposite operations in reverse order, and its sums are right', () => {
    const learn = F.learnScreens.flatMap(screen => [screen.title, ...screen.lines, ...screen.maths]).join(' ').toLowerCase();
    for (const word of ['input', 'output', 'opposite', 'inverse', 'reverse order', 'undo the last box first',
        'divide by 3 to undo × 3', 'multiply by 3 to undo ÷ 3', 'check forwards']) {
        assert.ok(learn.includes(word), `Learn never mentions "${word}"`);
    }
    for (const screen of F.learnScreens) for (const text of [...screen.lines, ...screen.maths]) assert.deepEqual(wrongSums(text), [], text);
});
