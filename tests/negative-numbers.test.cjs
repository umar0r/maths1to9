// Check the rewritten lesson's real content and seeded generators.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { contentDir, loadScript, evaluate, close, wrongSums, allStrings } = require('./helpers/lessons.cjs');
const window = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/lesson-engine.js'), 'utf8'), {
    window, document: { body: { dataset: { lessonRenderer: 'custom' } } }
});
const Q = loadScript(path.join(contentDir, 'negative-numbers/negative-numbers.js'),
    ['rewrite', 'calculate', 'checks', 'generate', 'pick', 'practiceTypes', 'dragTakeNegative', 'dragTakePositive', 'dragAdd'], { window });
window.NegativeNumbers = Q;
const { screens, examples } = loadScript(path.join(contentDir, 'negative-numbers/interactive.js'), ['screens', 'examples'], { window });
const fixed = [...examples(), ...Q.checks()];
const { seededRandom } = window.Maths1to9LessonEngine;
const types = [...new Set(Q.practiceTypes)];
const generated = types.flatMap(type => Array.from({ length: 200 }, (_, seed) => Q.generate({ type }, seededRandom(seed))));
const questions = [...fixed, ...generated];
const answer = question => question.input === 'choice' ? question.options.find(option => option.correct).label : question.answer;

function verifyMaths(question) {
    const expected = question.expected ?? question.start + question.amount;
    if (question.input === 'number') assert.equal(evaluate(question.answer), expected, question.prompt);
    else if (question.questionType.startsWith('rewrite')) {
        assert.equal(answer(question), `${String(question.start).replace('-', '−')} + ${question.amount}`);
        assert.equal(evaluate(answer(question)), expected);
        assert.equal(question.options.filter(option => close(evaluate(option.label), expected)).length, 1);
    } else if (question.questionType.startsWith('multiply')) {
        assert.equal(evaluate(answer(question)), expected);
    } else if (question.prompt.startsWith('Sam writes:')) {
        assert.ok(answer(question).endsWith(`The answer is ${String(expected).replace('-', '−')}.`));
    }
}

test('negative-numbers: every fixed and generated calculation has the right answer', () => {
    questions.forEach(verifyMaths);
    assert.equal(Q.checks().length, 5);
    assert.equal(answer(Q.checks()[1]), 'They turn into a plus, so you add.');
    assert.equal(answer(Q.checks()[2]), 'A minus, because the two signs are different.');
});

test('negative-numbers: every choice has four distinct options and one correct answer', () => {
    for (const question of questions.filter(question => question.input === 'choice')) {
        assert.equal(question.options.length, 4, question.prompt);
        assert.equal(question.options.filter(option => option.correct).length, 1, question.prompt);
        assert.equal(new Set(question.options.map(option => option.label)).size, 4, question.prompt);
        assert.equal(new Set(question.options.map(option => option.feedback)).size, 4, question.prompt);
        assert.ok(question.options.every(option => option.feedback.trim()));
    }
});

test('negative-numbers: Practice mixes the kinds of sum and never runs three alike', () => {
    const family = type => type.startsWith('multiply') ? 'multiply' : type.startsWith('rewrite') || type === 'cross-zero' || type === 'error' ? 'take-negative' : type;
    const families = Q.practiceTypes.map(family);
    assert.ok(new Set(families).size >= 5, families.join(' | '));
    families.forEach((kind, i) => assert.ok(!(kind === families[i + 1] && kind === families[i + 2]), kind));
});

test('negative-numbers: exam-style questions have the right answers', () => {
    const sums = label => label.split(' and ').map(sum => (sum.match(/[−-]?\d+/g) || []).map(evaluate));
    for (const question of generated.filter(question => question.questionType === 'either-way')) {
        for (const option of question.options) {
            const pair = sums(option.label);
            const right = pair.every(([a, b, c]) => a + b === c) && pair.some(s => s[2] > 0) && pair.some(s => s[2] < 0);
            assert.equal(right, option.correct, option.label);
        }
    }
    for (const question of generated.filter(question => question.prompt.startsWith('Find the missing number: ? +'))) {
        const [amount, total] = question.prompt.match(/[−-]?\d+/g).map(evaluate);
        assert.equal(evaluate(question.answer) + amount, total, question.prompt);
    }
    for (const question of generated.filter(question => question.prompt.includes('falls by'))) {
        const [start, fall, rise] = question.prompt.match(/[−-]?\d+/g).map(evaluate);
        assert.equal(evaluate(question.answer), start - fall + rise, question.prompt);
    }
});

test('negative-numbers: rewrite answers keep the starting number and add the positive', () => {
    questions.filter(question => question.questionType.startsWith('rewrite')).forEach(verifyMaths);
});

test('negative-numbers: worked sums and feedback sums are right', () => {
    for (const question of questions) {
        for (const text of [question.feedback, question.fallback, ...question.options?.map(option => option.feedback) || []].filter(Boolean)) {
            assert.deepEqual(wrongSums(text), [], text);
        }
    }
    for (const screen of screens) for (const line of screen.lines) assert.deepEqual(wrongSums(line), [], line);
});

test('negative-numbers: prompts, answers and feedback use proper minus signs', () => {
    for (const text of allStrings([questions, screens])) assert.doesNotMatch(text, /(?:^|[\s(=])-\d/, text);
});

test('negative-numbers: typed mistakes have feedback and never match the right answer', () => {
    for (const question of questions.filter(question => question.input === 'number')) {
        assert.ok(question.fallback && question.rules.length);
        for (const rule of question.rules) {
            assert.notEqual(evaluate(rule.value), evaluate(question.answer), question.prompt);
            assert.ok(rule.feedback);
        }
    }
});

test('negative-numbers: 200 seeds of every type are deterministic and mapped to the skill', () => {
    const lesson = JSON.parse(fs.readFileSync(path.join(contentDir, 'negative-numbers/lesson.json')));
    for (const type of types) {
        assert.equal(lesson.assessment.question_types[type], 'calculate-negative-numbers');
        for (let seed = 0; seed < 200; seed++) {
            assert.deepEqual(Q.generate({ type }, seededRandom(seed)), Q.generate({ type }, seededRandom(seed)));
        }
    }
    for (let seed = 0; seed < 200; seed++) {
        const items = Q.pick(seededRandom(seed));
        assert.equal(items.length, lesson.question_bank.session_length);
        const inputs = new Set(items.map(item => Q.generate(item, seededRandom(item.seed)).input));
        assert.ok(inputs.has('choice') && inputs.has('number'));
    }
    assert.ok(examples().every(question => question.input !== 'choice'));
    // No run of three of the same kind of sum, and a mix of kinds overall.
    const kinds = examples().map(question => question.prompt.replace(/[−\d]+/g, 'n').replace(/\(n\)/, '(−n)'));
    assert.ok(new Set(kinds).size >= 3, kinds.join(' | '));
    kinds.forEach((kind, i) => assert.ok(!(kind === kinds[i + 1] && kind === kinds[i + 2]), kind));
    assert.ok(Q.checks().some(question => question.input === 'choice'));
    assert.ok(Q.checks().every(question => question.input === 'choice'));
});
