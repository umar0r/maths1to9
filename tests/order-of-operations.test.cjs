const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { loadScript, evaluate, num, close, allStrings, wrongSums } = require('./helpers/lessons.cjs');
const window = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/lesson-engine.js'), 'utf8'), { window, document: { body: { dataset: { lessonRenderer: 'custom' } } } });
const Q = loadScript(path.join(__dirname, '../content/order-of-operations/operations.js'),
    ['types', 'generate', 'pick', 'prepare', 'examples', 'checks', 'learnScreens', 'mapWidget', 'mapAnswers', 'mapOperation', 'mapExpression', 'workedExpressions'], { window });
const { seededRandom } = window.Maths1to9LessonEngine;
const samples = Q.types.flatMap(type => ['choice', 'number'].flatMap(mode => Array.from({ length: 300 }, (_, seed) => ({ seed,
    q: Q.generate({ type, mode }, seededRandom(Math.imul(seed, 2654435761) >>> 0))
}))));
const questionsOf = type => samples.filter(({ q }) => q.questionType === type);
const answerOf = q => q.input === 'choice' ? q.options.find(option => option.correct).label : q.answer;
const numericTypes = ['multiplyBeforeAdd', 'divideBeforeSubtract', 'divideMultiplyLeftToRight', 'addSubtractLeftToRight',
    'brackets', 'powers', 'roots', 'hiddenMultiplication', 'reciprocal', 'negativeNumbers', 'groupedDivision'];

// Work strictly left to right, ignoring the order of operations (the mistake Amir makes).
function leftToRight(text) {
    const tokens = text.replace(/−/g, '-').match(/\d+|[-+×÷]/g);
    let value = Number(tokens[0]);
    for (let i = 1; i < tokens.length; i += 2) {
        const next = Number(tokens[i + 1]);
        value = { '+': value + next, '-': value - next, '×': value * next, '÷': value / next }[tokens[i]];
    }
    return value;
}

for (const type of numericTypes) {
    test(`${type}: every answer is independently evaluated and no distractor equals it`, () => {
        for (const { seed, q } of questionsOf(type)) {
            const value = evaluate(q.expression);
            assert(close(num(answerOf(q)), value), `${q.expression} seed ${seed}`);
            for (const option of q.options || []) if (!option.correct) assert(!close(num(option.label), value), `${q.expression}: ${option.label}`);
        }
    });
}
test('firstOperationQuestion: the chosen operation is inside the brackets and its typed value is correct', () => {
    for (const { q } of questionsOf('firstOperationQuestion')) {
        const bracket = q.expression.match(/\(([^()]+)\)/)?.[1].trim();
        assert(bracket);
        assert.equal(answerOf(q), q.input === 'choice' ? bracket : String(evaluate(bracket)));
    }
});
test("errorSpotting: Amir gives the left-to-right result and the answer gives the true value", () => {
    for (const { q } of questionsOf('errorSpotting')) {
        const [, expression, claim] = q.prompt.match(/says (.+?) = (−?\d+) because/) || [];
        assert(expression, q.prompt);
        assert.equal(leftToRight(expression), num(claim));
        const expected = evaluate(expression);
        assert.notEqual(expected, num(claim));
        if (q.input === 'choice') assert.match(answerOf(q), new RegExp(`wrong: the answer is ${expected}\\.`));
        else assert.equal(Number(q.answer), expected);
    }
});
test('all fixed and generated choices have four distinct answers and individual feedback', () => {
    for (const q of [...samples.map(({ q }) => q), ...Q.examples(), ...Q.checks()].filter(q => q.options)) {
        assert.equal(q.options.length, 4, q.prompt);
        assert.equal(new Set(q.options.map(option => option.label)).size, 4);
        assert.equal(q.options.filter(option => option.correct).length, 1);
        assert(q.options.every(option => option.feedback.trim()));
        assert(q.options.every(option => option.feedback !== 'Recheck the order of operations.'));
    }
});
test('typed cards have exact comparisons, specific mistake rules and a fallback', () => {
    for (const q of [...samples.map(({ q }) => q), ...Q.examples(), ...Q.checks()].filter(q => q.input === 'number')) {
        assert.equal(q.tolerance, 0);
        assert(q.feedback && q.fallback && q.rules.length);
        for (const rule of q.rules) { assert(rule.feedback); assert.notEqual(num(rule.value), num(q.answer)); }
    }
});
test('six-question seeded sessions use six different types and three choices plus three typed answers', () => {
    const seen = new Set();
    for (let seed = 0; seed < 200; seed++) {
        const session = Q.pick(seededRandom(seed));
        assert.equal(session.length, 6);
        assert.equal(new Set(session.map(item => item.type)).size, 6);
        assert.equal(session.filter(item => item.mode === 'choice').length, 3);
        assert.equal(session.filter(item => item.mode === 'number').length, 3);
        assert.equal(JSON.stringify(session), JSON.stringify(Q.pick(seededRandom(seed))));
        for (const item of session) {
            seen.add(item.type);
            assert.deepEqual(Object.keys(item).sort(), ['mode', 'seed', 'type']);
            assert.equal(JSON.stringify(Q.generate(item, seededRandom(item.seed))), JSON.stringify(Q.generate(item, seededRandom(item.seed))));
        }
    }
    assert.equal(seen.size, 13);
    for (const questions of [Q.examples(), Q.checks()]) {
        assert(questions.filter(q => q.input === 'choice').length >= 2);
        assert(questions.filter(q => q.input !== 'choice').length >= 2);
    }
});
test('the retained six-step calculation map evaluates every step and keeps pupil values', () => {
    const values = Array.from(Q.mapAnswers);
    const widget = Q.mapWidget();
    for (let index = 0; index < values.length; index++) {
        assert.equal(evaluate(Q.mapOperation(index, values)), Number(values[index]));
        assert.equal(evaluate(Q.mapExpression(index, values)), 30);
        assert.equal(widget.isEmpty(values.slice(0, index)), true);
    }
    assert.equal(widget.isEmpty(values), false);
    assert.equal(widget.mark(values).correct, true);
    for (let index = 0; index < values.length; index++) {
        const wrong = [...values]; wrong[index] = String(Number(wrong[index]) + 1);
        const before = JSON.stringify(wrong);
        assert.equal(widget.mark(wrong).correct, false);
        assert(widget.mark(wrong).feedback.trim());
        assert.equal(JSON.stringify(wrong), before);
    }
    assert.equal(widget.mark(values.map(value => `${value}.00`)).correct, true);
    assert.equal(widget.mark(['6.000000000000000001', ...values.slice(1)]).correct, false);
    assert(Q.mapExpression(1, ['60']).includes('18 ÷ 60'));
    assert(widget.answerText(['60', ...values.slice(1)]).includes('3 + 3 = 60'));
});
test('Learn explains every BIDMAS letter, left-to-right groups and every additional method before questions', () => {
    assert.equal(Q.learnScreens.length, 8);
    const text = JSON.stringify(Q.learnScreens).toLowerCase();
    for (const keyword of ['b stands for brackets', 'i stands for indices', 'd stands for division', 'm stands for multiplication',
        'a stands for addition', 's stands for subtraction', 'left to right', 'small raised', 'square root', 'number beside a bracket',
        'fraction', 'negative', 'subtracting a negative', 'both parts', 'rewrite']) assert(text.includes(keyword), keyword);
    for (const expression of Q.workedExpressions) assert.equal(evaluate(expression), 11);
    for (const text of allStrings(Q.learnScreens)) assert.deepEqual(wrongSums(text), [], text);
});

// Preserve all generic bank checks after moving generators into the helper.
const skillMap = JSON.parse(fs.readFileSync(path.join(__dirname, '../content/order-of-operations/lesson.json'), 'utf8')).assessment.question_types;
test('order-of-operations: every fixed question type maps to its intended skill', () => {
    for (const q of [...Q.examples(), ...Q.checks()]) assert.equal(skillMap[q.questionType], 'order-of-operations');
});
for (const type of Q.types) {
    const generated = questionsOf(type);
    test(`${type}: generates 300 seeds in each input mode without errors`, () => assert.equal(generated.length, 600));
    test(`${type}: has its skill mapping in lesson.json`, () => assert.equal(skillMap[type], 'order-of-operations'));
    test(`${type}: has exactly one correct distinct choice`, () => {
        for (const { q } of generated.filter(({ q }) => q.options)) {
            assert.equal(q.options.filter(option => option.correct).length, 1);
            assert.equal(new Set(q.options.map(option => option.label.replace(/\s+/g, ' ').trim())).size, 4);
        }
    });
    test(`${type}: shared shuffle varies correct positions and retains each option's feedback`, () => {
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
    test(`${type}: every completed worked sum is correct`, () => {
        for (const { q } of generated) for (const text of allStrings(q)) assert.deepEqual(wrongSums(text), [], text);
    });
    test(`${type}: explains answers in both modes`, () => {
        for (const { q } of generated) { assert(q.feedback.trim()); if (q.options) assert(q.options.every(option => option.feedback.trim())); }
    });
}
