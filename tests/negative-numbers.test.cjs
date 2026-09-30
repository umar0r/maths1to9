// Maths checks for the negative-numbers lesson (subtracting negatives). The
// questions live in lesson.js; questions.js is not loaded by the page.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { contentDir, loadScript, evaluate, close, wrongSums, allStrings } = require('./helpers/lessons.cjs');

const lesson = loadScript(path.join(contentDir, 'negative-numbers', 'lesson.js'), ['guided', 'practice', 'checkQuestions']);
const questions = [...lesson.guided, ...lesson.practice, ...lesson.checkQuestions];
const isCalculation = text => /^[−\d\s()+−]+$/.test(text);

test('every calculation has the right answer', () => {
    for (const q of questions) {
        const sum = isCalculation(q.prompt) ? q.prompt : q.prompt.match(/writes: (.+?) = /)?.[1];
        if (!sum) continue;
        assert.ok(close(evaluate(q.answer), evaluate(sum)), `${q.id}: ${sum} = ${evaluate(sum)}, answer ${q.answer}`);
    }
});

test('rewrite answers keep the starting number and add the positive', () => {
    for (const q of questions.filter(q => /\+/.test(q.answer) && isCalculation(q.prompt))) {
        const [, start, subtracted] = q.prompt.match(/^(−?\d+) − \(−(\d+)\)$/);
        assert.equal(q.answer, `${start} + ${subtracted}`, `${q.id}: ${q.prompt}`);
    }
});

test('multiple-choice questions have exactly one correct option', () => {
    for (const q of questions.filter(q => q.options)) {
        assert.equal(q.options.filter(option => option === q.answer).length, 1, `${q.id}`);
        assert.equal(new Set(q.options).size, q.options.length, `${q.id}: duplicate options`);
        const sameValue = q.options.filter(option => close(evaluate(option), evaluate(q.prompt)));
        assert.equal(sameValue.length, 1, `${q.id}: options with the right value: ${sameValue.join(', ')}`);
    }
});

test('feedback sums are right', () => {
    for (const q of questions) {
        assert.deepEqual(wrongSums(q.feedback ?? ''), [], `${q.id}: ${q.feedback}`);
    }
});

test('answers and prompts use the proper minus sign', () => {
    for (const q of questions) {
        for (const text of allStrings(q)) assert.doesNotMatch(text, /(?:^|[\s(=])-\d/, `${q.id}: hyphen used as a minus sign in "${text}"`);
    }
});
