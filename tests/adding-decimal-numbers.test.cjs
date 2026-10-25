// Keep exact decimal arithmetic, column, hint and answer-check coverage on the new content.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { contentDir, loadScript, wrongSums, allStrings } = require('./helpers/lessons.cjs');
const { exact, equal } = require('./helpers/decimals.cjs');
const window = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/lesson-engine.js'), 'utf8'), {
    window, document: { body: { dataset: { lessonRenderer: 'custom' } } }
});
const Q = loadScript(path.join(contentDir, 'adding-decimal-numbers/decimal-addition.js'),
    ['worked', 'cells', 'columnSteps', 'alignmentWidget', 'columnWidget', 'examples', 'checks', 'practiceTypes', 'generate', 'pick'], { window });
const { seededRandom } = window.Maths1to9LessonEngine;
const { screens } = loadScript(path.join(contentDir, 'adding-decimal-numbers/interactive.js'), ['screens']);
const generated = Q.practiceTypes.flatMap(type => Array.from({ length: 200 }, (_, seed) => Q.generate({ type }, seededRandom(seed))));
const questions = [...Q.examples(), ...Q.checks(), ...generated];
function sum(a, b) {
    const x = exact(a), y = exact(b);
    const places = Math.max(x.places, y.places);
    return { digits: x.digits * 10n ** BigInt(places - x.places) + y.digits * 10n ** BigInt(places - y.places), places };
}
const numeric = text => text.replace('£', '');

test('adding-decimal-numbers: every fixed and generated addition is right', () => {
    for (const question of questions.filter(question => question.a && !['alignment', 'columns', 'zero', 'decimal-point'].includes(question.questionType))) {
        const answer = question.input === 'choice' ? numeric(question.options.find(option => option.correct).label) : question.answer;
        assert.ok(equal(sum(question.a, question.b), exact(answer)), question.prompt);
    }
});

test('adding-decimal-numbers: operands and totals fit the tens-to-hundredths chart', () => {
    for (const question of questions.filter(question => question.a)) {
        for (const number of [question.a, question.b]) {
            const [whole, fractional = ''] = number.split('.');
            assert.ok(whole.length <= 2 && fractional.length <= 2);
            assert.equal(Q.cells(number).length, 5);
        }
        const total = Number(question.a) + Number(question.b);
        assert.ok(total < 100);
    }
});

test('adding-decimal-numbers: column widgets expect every digit from right to left', () => {
    for (const [a, b] of [['8.40', '2.35'], ['3.60', '1.25']]) {
        const widget = Q.columnWidget(a, b);
        const total = sum(a, b);
        const scaled = total.digits * 10n ** BigInt(2 - total.places);
        const digits = String(scaled).padStart(3, '0').split('').reverse();
        const keys = ['hundredths', 'tenths', 'ones', 'tens'].slice(0, digits.length);
        assert.deepEqual(Array.from(widget.fields.filter(key => key !== 'carry')), keys);
        keys.forEach((key, index) => assert.equal(widget.expected(key), digits[index]));
    }
});

test('adding-decimal-numbers: column hints use the correct operands and carries', () => {
    for (const [a, b] of [['14.70', '6.82'], ['8.40', '2.35'], ['3.60', '1.25']]) {
        const x = String(exact(a).digits).padStart(4, '0').split('').reverse();
        const y = String(exact(b).digits).padStart(4, '0').split('').reverse();
        let carry = 0;
        Q.columnSteps(a, b).forEach((step, index) => {
            assert.equal(step.left, Number(x[index]));
            assert.equal(step.right, Number(y[index]));
            assert.equal(step.incoming, carry);
            const total = Number(x[index]) + Number(y[index]) + carry;
            assert.equal(step.total, total);
            assert.equal(step.digit, total % 10);
            carry = Math.floor(total / 10);
            assert.equal(step.carry, carry);
        });
    }
});

test('adding-decimal-numbers: Learn keeps the correct worked example and estimate', () => {
    assert.equal(Q.worked.a, '14.7');
    assert.equal(Q.worked.b, '6.82');
    assert.ok(equal(sum(Q.worked.a, Q.worked.b), exact(Q.worked.total)));
    const text = screens.flatMap(screen => screen.lines).join(' ');
    assert.match(text, /14\.70 \+ 6\.82 = 21\.52/);
    assert.match(text, /about 15 and .*about 7.*near 22/);
    assert.equal(15 + 7, 22);
    assert.deepEqual(wrongSums(text), []);
});

test('adding-decimal-numbers: Check totals, context and replacement explanation match', () => {
    const checks = Q.checks();
    assert.equal(checks.length, 5);
    assert.equal(checks[0].answer, '6.14');
    assert.equal(checks[2].answer, '2.55');
    assert.match(checks[2].prompt, /contains 1\.75 litres\. Another contains 0\.8 litres/);
    assert.match(checks[3].prompt, /£6\.75 \+ £2\.40/);
    assert.equal(checks[3].options.find(option => option.correct).label, '£9.15');
    assert.equal(checks[4].answer, '11.24');
    assert.match(checks[1].options.find(option => option.correct).label, /8 is tenths and the 4 is hundredths/);
    for (const question of questions) {
        for (const text of [question.feedback, ...question.options?.map(option => option.feedback) || []].filter(Boolean)) assert.deepEqual(wrongSums(text), [], text);
    }
});

test('adding-decimal-numbers: widget checks accept right work, reject misalignment and wrong digits', () => {
    for (const [a, b] of [['8.40', '2.35'], ['3.60', '1.25']]) {
        const alignment = Q.alignmentWidget(a, b);
        assert.equal(alignment.isEmpty(null), true);
        assert.equal(alignment.isEmpty(0), false);
        assert.equal(alignment.mark(0).correct, true);
        assert.equal(alignment.mark(1).correct, false);
        assert.equal(alignment.mark(-1).correct, false);
        const widget = Q.columnWidget(a, b);
        const values = Object.fromEntries(widget.fields.map(key => [key, widget.expected(key)]));
        assert.equal(widget.isEmpty(values), false);
        assert.equal(widget.mark(values).correct, true);
        assert.ok(equal(exact(widget.answerText(values)), sum(a, b)));
        for (const key of widget.fields) {
            assert.equal(widget.mark({ ...values, [key]: String((Number(values[key]) + 1) % 10) }).correct, false);
            assert.equal(widget.isEmpty({ ...values, [key]: '' }), true);
            assert.ok(widget.mark({ ...values, [key]: '9' }).feedback);
        }
    }
});

test('adding-decimal-numbers: choices are four distinct values with one correct answer and specific feedback', () => {
    for (const question of questions.filter(question => question.input === 'choice')) {
        assert.equal(question.options.length, 4);
        assert.equal(question.options.filter(option => option.correct).length, 1);
        assert.equal(new Set(question.options.map(option => option.label)).size, 4);
        assert.equal(new Set(question.options.map(option => option.feedback)).size, 4);
        if (question.a && question.questionType !== 'decimal-point') {
            assert.equal(question.options.filter(option => equal(exact(numeric(option.label)), sum(question.a, question.b))).length, 1);
        }
    }
});

test('adding-decimal-numbers: typed questions have correct mistake rules and fallback', () => {
    for (const question of questions.filter(question => question.input === 'number')) {
        assert.ok(question.rules.length && question.fallback);
        for (const rule of question.rules) {
            assert.notEqual(Number(rule.value), Number(question.answer));
            assert.ok(rule.feedback);
        }
    }
});

test('adding-decimal-numbers: 200 seeds per type are deterministic, mapped and mixed', () => {
    const lesson = JSON.parse(fs.readFileSync(path.join(contentDir, 'adding-decimal-numbers/lesson.json')));
    for (const type of Q.practiceTypes) {
        assert.equal(lesson.assessment.question_types[type], 'decimal-add-subtract');
        for (let seed = 0; seed < 200; seed++) assert.deepEqual(JSON.parse(JSON.stringify(Q.generate({ type }, seededRandom(seed)))), JSON.parse(JSON.stringify(Q.generate({ type }, seededRandom(seed)))));
    }
    const picked = Q.pick(seededRandom(7));
    assert.equal(picked.length, 6);
    assert.deepEqual(new Set(picked.map(item => Q.generate(item, seededRandom(item.seed)).input)), new Set(['choice', 'number']));
    assert.ok(Q.examples().some(question => question.input === 'number'));
    assert.ok(Q.examples().some(question => question.input === 'choice'));
    for (const text of allStrings(questions)) assert.doesNotMatch(text, /\d+\.\d{4,}/, text);
});
