// Maths checks for algebraic-expressions: each story's expression is worked
// out again from the numbers in its wording, every choice is evaluated, and
// the tile widget accepts the right construction and rejects common mistakes.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { loadScript, allStrings, wrongSums } = require('./helpers/lessons.cjs');

const window = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/lesson-engine.js'), 'utf8'),
    { window, document: { body: { dataset: { lessonRenderer: 'custom' } } } });
loadScript(path.join(__dirname, '../content/algebraic-expressions/expressions.js'), [], { window });
const A = window.AlgebraicExpressions;
const lesson = JSON.parse(fs.readFileSync(path.join(__dirname, '../content/algebraic-expressions/lesson.json'), 'utf8'));
const { seededRandom } = window.Maths1to9LessonEngine;
const WORDS = { twice: 2, 'three times': 3, 'four times': 4, 'five times': 5, 'six times': 6, three: 3 };

// Evaluate a written expression in one letter, e.g. "3(n + 2)" or "50 − 4n".
// "n3" (number after the letter) is a notation mistake and has no value here.
function evaluate(label, letter, x) {
    if (new RegExp(`${letter}\\d`).test(label)) return null;
    const js = label.replace(/−/g, '-').replace(/×/g, '*').replace(/²/g, '**2').replace(/³/g, '**3')
        .replace(new RegExp(letter, 'g'), '(x)')
        .replace(/(\d|\))\s*\(/g, '$1*(');
    return Function('x', `return ${js};`)(x);
}
const valueOf = ([constant, linear, square], x) => constant + linear * x + square * x * x;
const agrees = (label, model) => [2, 5, 11].every(x => evaluate(label, model.letter, x) === valueOf(model.target, x));

// The target an independent reader gets from the story's own numbers.
function expected(q) {
    const p = q.prompt;
    let m;
    if (/multiplied by itself/.test(p)) return [0, 0, 1];
    if ((m = p.match(/Add (\d+), then multiply the whole new amount by (\d+)/))) return [m[1] * m[2], Number(m[2]), 0];
    if ((m = p.match(/(twice|three times|four times|five times|six times) as many\. \w+ has (\d+) more/))) return [Number(m[2]), WORDS[m[1]], 0];
    if ((m = p.match(/has twice Miguel’s p songs\. Josh has (\d+) more/))) return [Number(m[1]), 2, 0];
    if ((m = p.match(/(twice|three times|four times|five times|six times) as many/))) return [0, WORDS[m[1]], 0];
    if ((m = p.match(/You buy (\w+) \w+ and pay (?:a )?£(\d+)/))) return [Number(m[2]), Number(m[1]) || WORDS[m[1]], 0];
    if ((m = p.match(/start with £(\d+)\. Each game costs £(\d+)/i))) return [Number(m[1]), -Number(m[2]), 0];
    if ((m = p.match(/You (gain|lose) (\d+) points/))) return [m[1] === 'gain' ? Number(m[2]) : -Number(m[2]), 1, 0];
    if ((m = p.match(/You use (\d+) of them/))) return [-Number(m[1]), 1, 0];
    if ((m = p.match(/^Write (\d+) lots of/))) return [0, Number(m[1]), 0];
    if ((m = p.match(/writes (\d+) pens at \w+ pounds each/))) return [0, Number(m[1]), 0];
    if ((m = p.match(/“\w add (\d+)”/))) return [Number(m[1]), 1, 0];
    if ((m = p.match(/finds (\d+) more/))) return [Number(m[1]), 1, 0];
    if ((m = p.match(/win (\d+) more/))) return [Number(m[1]), 1, 0];
    if (/Two wins add 3 points each/.test(p)) return [6, 1, 0];
    if ((m = p.match(/Write the number in (\w+) bags/))) return [0, WORDS[m[1]], 0];
    if ((m = p.match(/^Start with \w\. Add (\d+)\.$/))) return [Number(m[1]), 1, 0];
    if (/What expression do you start with/.test(p)) return [0, 1, 0];
    throw new Error(`No independent reading for: ${p}`);
}

const generated = A.practiceTypes.flatMap(type => ['choice', 'custom'].flatMap(mode =>
    Array.from({ length: 200 }, (_, seed) => ({
        seed, mode, q: A.generate({ type, mode }, seededRandom(Math.imul(seed + 1, 2654435761) >>> 0))
    }))));
const fixed = [...A.examples().map(q => ({ seed: 'Try it', q })), ...A.checks().map(q => ({ seed: 'Check', q }))];
const all = [...generated, ...fixed];
const where = (q, seed) => `${q.prompt} (${seed})`;

test('every Practice type is generated as a choice and as tiles, and mapped to a skill', () => {
    for (const type of A.practiceTypes) {
        assert.ok(generated.some(({ q, mode }) => q.questionType === type && mode === 'choice' && q.input === 'choice'), `${type} choice`);
        assert.ok(generated.some(({ q, mode }) => q.questionType === type && mode === 'custom' && q.input === 'custom'), `${type} tiles`);
        assert.ok(lesson.assessment.question_types[type], `${type} has no skill mapping`);
    }
});

test('each question targets the expression its story describes', () => {
    for (const { seed, q } of all) assert.deepEqual(q.model.target, expected(q), where(q, seed));
});

test('choice questions: four distinct options, one correct, and only the correct one has the right value in usual notation', () => {
    for (const { seed, q } of all.filter(({ q }) => q.input === 'choice')) {
        assert.equal(q.options.length, 4, where(q, seed));
        assert.equal(q.options.filter(option => option.correct).length, 1, where(q, seed));
        assert.equal(new Set(q.options.map(option => option.label)).size, 4, where(q, seed));
        assert.equal(new Set(q.options.map(option => option.feedback)).size, 4, where(q, seed));
        for (const option of q.options) {
            if (option.correct) assert.ok(agrees(option.label, q.model), `${option.label} ${where(q, seed)}`);
            else if (agrees(option.label, q.model)) {
                // Same value is only wrong when the question asks for the usual short form.
                assert.ok(q.model.usual && /×/.test(option.label), `${option.label} is also right ${where(q, seed)}`);
            }
        }
    }
});

test('tile questions accept the intended construction and show it as written algebra', () => {
    for (const { seed, q } of all.filter(({ q }) => q.input === 'custom')) {
        const right = q.widget.correctValue();
        assert.deepEqual(A.correctValue(q), right);
        assert.equal(q.widget.mark(right).correct, true, where(q, seed));
        assert.deepEqual(A.tileModel(right), q.model.target, where(q, seed));
        assert.equal(q.widget.isEmpty(right), false);
        assert.ok(agrees(q.widget.answerText(right), q.model), `${q.widget.answerText(right)} ${where(q, seed)}`);
        assert.equal(q.widget.isEmpty(null), true);
    }
});

test('tile questions reject the common mistakes', () => {
    for (const { seed, q } of all.filter(({ q }) => q.input === 'custom')) {
        const { kind, numbers, usual } = q.model;
        const nums = { A: String(numbers[0] ?? ''), B: String(numbers[1] ?? '') };
        const wrong = [];
        if (kind === 'multiply') wrong.push(['letter', '+', 'A'], ['letter', 'A']);
        if (kind === 'multiply' && usual) wrong.push(['A', '×', 'letter']);
        if (kind === 'add') wrong.push(['A', 'letter'], ['letter', '−', 'A']);
        if (kind === 'subtract') wrong.push(['A', '−', 'letter'], ['letter', '+', 'A']);
        if (kind === 'twoStep') wrong.push(['A', 'letter'], ['letter', '+', 'B']);
        if (kind === 'brackets') wrong.push(['letter', '+', 'B', '×', 'A'], ['A', 'letter', '+', 'B']);
        if (kind === 'money') wrong.push(['A', '+', 'B', 'letter'], ['B', 'letter', '−', 'A']);
        if (kind === 'square') wrong.push(['letter', '+', 'letter']);
        for (const tokens of wrong) {
            const result = q.widget.mark({ numbers: nums, tokens });
            assert.equal(result.correct, false, `${tokens.join(' ')} accepted ${where(q, seed)}`);
            assert.ok(result.feedback, where(q, seed));
        }
        for (const bad of [null, { numbers: nums, tokens: [] }, { numbers: { A: 'x', B: '' }, tokens: ['A', 'letter'] },
            { numbers: nums, tokens: ['(', 'letter'] }]) {
            assert.equal(q.widget.mark(bad).correct, false, `${JSON.stringify(bad)} ${where(q, seed)}`);
        }
    }
});

test('the tile layouts mean what they say', () => {
    const n = (A_, B_) => ({ A: String(A_), B: String(B_ ?? '') });
    const cases = [
        [['A', 'letter'], n(3), [0, 3, 0]], [['letter', '+', 'A'], n(3), [3, 1, 0]], [['A', '+', 'letter'], n(3), [3, 1, 0]],
        [['A', '−', 'letter'], n(3), [3, -1, 0]], [['A', '(', 'letter', '+', 'B', ')'], n(3, 2), [6, 3, 0]],
        [['letter', '+', 'A', '×', 'B'], n(2, 3), [6, 1, 0]], [['A', '−', 'B', 'letter'], n(50, 4), [50, -4, 0]],
        [['square'], n(''), [0, 0, 1]], [['letter', '×', 'letter'], n(''), [0, 0, 1]]
    ];
    for (const [tokens, numbers, target] of cases) assert.deepEqual(A.tileModel({ numbers, tokens }), target, tokens.join(' '));
    assert.equal(A.tileModel({ numbers: n(3), tokens: ['letter', 'A'] }), null);
    assert.equal(A.expressionText({ numbers: n(3, 2), tokens: ['A', '(', 'letter', '+', 'B', ')'] }, 'n'), '3(n + 2)');
    assert.equal(A.numberValue('−4'), -4);
    assert.equal(A.numberValue('4.5'), null);
});

test('text has no broken values, uses proper signs and its worked sums are right', () => {
    for (const { seed, q } of all) {
        for (const text of allStrings({ ...q, model: undefined, widget: undefined })) {
            assert.doesNotMatch(text, /\b(?:undefined|NaN|null|Infinity)\b|\[object Object\]/, `${text} ${where(q, seed)}`);
            assert.doesNotMatch(text, /(?:^|[\s(=,])-\d|\d\s*-\s*\d/, `hyphen used as a minus sign in "${text}"`);
        }
        const told = [q.prompt, q.feedback, ...(q.options || []).map(option => option.feedback)];
        for (const text of told.filter(Boolean)) assert.deepEqual(wrongSums(text), [], `${text} ${where(q, seed)}`);
    }
});

test('the correct option is not always in the same place after shuffling', () => {
    const positions = new Set(generated.filter(({ q }) => q.input === 'choice').slice(0, 300)
        .map(({ q, seed }) => A.prepare(q, seededRandom(seed + 7)).options.findIndex(option => option.correct)));
    assert.ok(positions.size > 2, `answer positions: ${[...positions]}`);
});

test('a session has six questions from different types, mixing choices and tiles, and repeats from its seed', () => {
    for (let seed = 1; seed <= 200; seed++) {
        const items = A.pick(seededRandom(seed));
        assert.equal(items.length, lesson.question_bank.session_length ?? 6);
        assert.equal(new Set(items.map(item => item.type)).size, items.length, `seed ${seed}`);
        assert.ok(items.some(item => item.mode === 'choice') && items.some(item => item.mode !== 'choice'), `seed ${seed}`);
        assert.deepEqual(A.pick(seededRandom(seed)), items, `seed ${seed} is not repeatable`);
    }
});

test('Try it and Check each mix choices and tile questions', () => {
    for (const set of [A.examples(), A.checks()]) {
        assert.ok(set.filter(q => q.input === 'choice').length >= 2);
        assert.ok(set.filter(q => q.input !== 'choice').length >= 2);
    }
    assert.equal(A.checks().length, 5);
    assert.ok(A.examples().length <= 12);
});

test('Learn teaches every method the questions use, and its sums are right', () => {
    const learn = A.learnScreens.flatMap(screen => [screen.title, ...screen.lines, ...screen.maths]).join(' ').toLowerCase();
    for (const word of ['expression', 'number before the letter', '3n', 'n + 3', 'add the extra', 'once', 'brackets',
        'squared', 'n²', 'take away', 'order matters']) {
        assert.ok(learn.includes(word), `Learn never mentions "${word}"`);
    }
    for (const screen of A.learnScreens) for (const text of [...screen.lines, ...screen.maths]) assert.deepEqual(wrongSums(text), [], text);
});
