const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { contentDir, loadScript, wrongSums, allStrings } = require('./helpers/lessons.cjs');
const window = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/lesson-engine.js'), 'utf8'), {
    window, document: { body: { dataset: { lessonRenderer: 'custom' } } }
});
const Q = loadScript(path.join(contentDir, 'convert-a-fraction-to-a-percentage/fraction-percentage.js'),
    ['percentage', 'examples', 'checks', 'practiceTypes', 'pick', 'generate'], { window });
const { seededRandom } = window.Maths1to9LessonEngine;
const generated = Q.practiceTypes.flatMap(type => Array.from({ length: 200 }, (_, seed) => Q.generate({ type }, seededRandom(seed))));
const questions = [...Q.examples(), ...Q.checks(), ...generated];
const number = text => Number(text.replace('%', ''));

test('convert-a-fraction-to-a-percentage: every fixed and generated answer is correct', () => {
    for (const question of questions.filter(question => question.n)) {
        const answer = question.stage === 'decimal' ? question.n / question.d : question.n / question.d * 100;
        if (question.input === 'number') assert.equal(Number(question.answer), answer, question.prompt);
        else assert.equal(number(question.options.find(option => option.correct).label), answer, question.prompt);
    }
    assert.equal(Q.checks()[0].options.find(option => option.correct).label, '0.6 is the decimal. Multiply by 100 to get 60%.');
});

test('convert-a-fraction-to-a-percentage: choices have four distinct options and their own feedback', () => {
    for (const question of questions.filter(question => question.options)) {
        assert.equal(question.options.length, 4);
        assert.equal(question.options.filter(option => option.correct).length, 1);
        assert.equal(new Set(question.options.map(option => option.label)).size, 4);
        assert.equal(new Set(question.options.map(option => option.feedback)).size, 4);
        assert.ok(question.options.every(option => option.feedback));
        if (question.n) assert.equal(question.options.filter(option => number(option.label) === question.n / question.d * 100).length, 1);
    }
});

test('convert-a-fraction-to-a-percentage: typed rules describe wrong answers and have a fallback', () => {
    for (const question of questions.filter(question => question.input === 'number')) {
        assert.ok(question.rules.length && question.fallback && question.feedback);
        for (const rule of question.rules) {
            assert.notEqual(Number(rule.value), Number(question.answer));
            assert.ok(rule.feedback);
        }
    }
});

test('convert-a-fraction-to-a-percentage: worked sums and supplied explanations are right', () => {
    for (const question of questions) {
        for (const text of [question.feedback, ...question.options?.map(option => option.feedback) || []].filter(Boolean)) {
            const numeric = text.replace(/(\d+)\/(\d+) = (\d+(?:\.\d+)?)%/g, (sum, n, d, percent) => {
                assert.equal(Number(n) / Number(d) * 100, Number(percent), sum);
                return `${n}/${d} = ${Number(percent) / 100}`;
            });
            assert.deepEqual(wrongSums(numeric), [], text);
        }
    }
    const { screens } = loadScript(path.join(contentDir, 'convert-a-fraction-to-a-percentage/interactive.js'), ['screens']);
    for (const screen of screens) for (const text of screen.lines) assert.deepEqual(wrongSums(text), [], text);
});

test('convert-a-fraction-to-a-percentage: 200 seeds per type are deterministic and mapped to its skill', () => {
    const lesson = JSON.parse(fs.readFileSync(path.join(contentDir, 'convert-a-fraction-to-a-percentage/lesson.json')));
    for (const type of Q.practiceTypes) {
        assert.equal(lesson.assessment.question_types[type], 'fraction-percentage-conversion');
        for (let seed = 0; seed < 200; seed++) assert.deepEqual(Q.generate({ type }, seededRandom(seed)), Q.generate({ type }, seededRandom(seed)));
    }
    for (let seed = 0; seed < 200; seed++) {
        const items = Q.pick(seededRandom(seed));
        assert.equal(items.length, lesson.question_bank.session_length);
        const inputs = new Set(items.map(item => Q.generate(item, seededRandom(item.seed)).input));
        assert.ok(inputs.has('choice') && inputs.has('number'));
    }
    for (const group of [Q.examples(), Q.checks()]) {
        assert.ok(group.some(question => question.input === 'choice'));
        assert.ok(group.some(question => question.input === 'number'));
    }
});

test('convert-a-fraction-to-a-percentage: question text has no untidy numbers or exam-board names', () => {
    for (const text of allStrings(questions)) {
        assert.doesNotMatch(text, /\d+\.\d{5,}/, text);
        assert.doesNotMatch(text, /AQA|Edexcel|OCR/);
    }
});
