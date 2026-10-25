// Recompute fixed and generated percentages independently, including worked sums.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { contentDir, loadScript, wrongSums, allStrings, evaluate, close } = require('./helpers/lessons.cjs');
const { exact, show, equal, percentOf } = require('./helpers/decimals.cjs');
const window = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/lesson-engine.js'), 'utf8'), {
    window, document: { body: { dataset: { lessonRenderer: 'custom' } } }
});
const Q = loadScript(path.join(contentDir, 'percentages-of-amounts/percentage-amounts.js'),
    ['examples', 'checks', 'practiceTypes', 'pick', 'generate', 'learnScreens'], { window });
const { seededRandom } = window.Maths1to9LessonEngine;
const generated = Q.practiceTypes.flatMap(type => ['choice', 'number'].flatMap(mode =>
    Array.from({ length: 200 }, (_, seed) => Q.generate({ type, mode }, seededRandom(seed)))));
const questions = [...Q.examples(), ...Q.checks(), ...generated];
const lesson = JSON.parse(fs.readFileSync(path.join(contentDir, 'percentages-of-amounts/lesson.json')));
const answerOf = q => q.answer ?? q.options.find(option => option.correct).label;
const numericValue = text => Number(text.replace('%', ''));
const fractionValue = text => text.split('/').map(Number).reduce((a, b) => a / b);
const gcd = (a, b) => b ? gcd(b, a % b) : a;

function expected(prompt) {
    let m;
    if ((m = prompt.match(/Write (\d+(?:\.\d+)?)% as a decimal/))) return Number(m[1]) / 100;
    if ((m = prompt.match(/Write (\d+(?:\.\d+)?) as a percentage/))) return Number(m[1]) * 100;
    if ((m = prompt.match(/fraction.*?(\d+)%/))) return { fraction: Number(m[1]) / 100 };
    if ((m = prompt.match(/one quarter of (\d+)/))) return Number(m[1]) / 4;
    if (/Which statement/.test(prompt)) return { explanation: true };
    if ((m = prompt.match(/Which calculation finds (\d+)% of £(\d+)/))) return { operation: `${Number(m[1]) / 100} × ${m[2]}` };
    const p = prompt.match(/(\d+)%/)[1];
    const others = [...prompt.replace(/\d+%/g, '').matchAll(/\d+(?:\.\d+)?/g)].map(m => m[0]);
    assert.equal(others.length, 1, prompt);
    return Number(show(percentOf(p, others[0])));
}

test('percentages-of-amounts: every fixed and generated question has the right answer', () => {
    for (const q of questions) {
        const value = expected(q.prompt);
        if (value.explanation) {
            assert.equal(answerOf(q), '3% = 0.03 because 3 ÷ 100 = 0.03');
        } else if (value.operation) {
            assert.equal(answerOf(q), value.operation);
        } else if (value.fraction) {
            assert.equal(fractionValue(answerOf(q)), value.fraction, q.prompt);
            const [a, b] = answerOf(q).split('/').map(Number);
            assert.equal(gcd(a, b), 1, q.prompt);
        } else {
            assert.ok(close(numericValue(answerOf(q)), value), `${q.prompt}: ${answerOf(q)} should be ${value}`);
            if (q.whole && q.percent && q.questionType !== 'percent-fraction') {
                assert.ok(equal(exact(answerOf(q)), percentOf(String(q.percent), String(q.whole))), q.prompt);
            }
        }
    }
});

test('percentages-of-amounts: all choices have four distinct options, one correct answer and distinct feedback', () => {
    for (const q of questions.filter(q => q.options)) {
        assert.equal(q.options.length, 4, q.prompt);
        assert.equal(q.options.filter(o => o.correct).length, 1, q.prompt);
        assert.equal(new Set(q.options.map(o => o.label)).size, 4, q.prompt);
        assert.equal(new Set(q.options.map(o => o.feedback)).size, 4, q.prompt);
        assert.ok(q.options.every(o => o.feedback), q.prompt);
        const value = expected(q.prompt);
        if (typeof value === 'number') assert.equal(q.options.filter(o => close(numericValue(o.label), value)).length, 1, q.prompt);
        if (value.fraction) assert.equal(q.options.filter(o => close(fractionValue(o.label), value.fraction)).length, 1, q.prompt);
    }
});

test('percentages-of-amounts: typed mistakes are wrong and have feedback and a fallback', () => {
    for (const q of questions.filter(q => q.input === 'number')) {
        assert.ok(q.rules.length && q.fallback && q.feedback, q.prompt);
        assert.ok(q.rules.every(rule => !close(Number(rule.value), Number(q.answer)) && rule.feedback), q.prompt);
    }
});

test('percentages-of-amounts: 200 seeds per type are deterministic and mapped to the existing skills', () => {
    for (const type of Q.practiceTypes) {
        assert.equal(lesson.assessment.question_types[type], /^(percent-decimal|decimal-percent|percent-fraction)$/.test(type) ? 'percentage-as-operator' : 'percentage-of-amount');
        for (const mode of ['choice', 'number']) for (let seed = 0; seed < 200; seed++) {
            assert.deepEqual(Q.generate({ type, mode }, seededRandom(seed)), Q.generate({ type, mode }, seededRandom(seed)));
        }
    }
    for (let seed = 0; seed < 200; seed++) {
        const items = Q.pick(seededRandom(seed));
        assert.equal(items.length, 6);
        assert.equal(items.length, lesson.question_bank.session_length);
        const inputs = items.map(item => Q.generate(item, seededRandom(item.seed)).input);
        assert.equal(inputs.filter(input => input === 'choice').length, 3);
        assert.equal(inputs.filter(input => input === 'number').length, 3);
    }
    assert.equal(Q.checks().length, 5);
    for (const group of [Q.examples(), Q.checks()]) assert.deepEqual(new Set(group.map(q => q.input)), new Set(['choice', 'number']));
});

test('percentages-of-amounts: displayed Learn chains and all correct worked sums add up', () => {
    for (const screen of Q.learnScreens) for (let chain of screen.equations || []) {
        chain = chain.replace(/^\d+%: /, '').replace(/£|\s?(?:g|kg)\b/g, '');
        const parts = chain.split(' = ');
        const first = parts[0];
        const of = first.match(/^(\d+)% of (\d+)/);
        const p = first.match(/^(\d+)%$/);
        const target = of ? Number(show(percentOf(of[1], of[2]))) : p ? Number(p[1]) / 100 : evaluate(first);
        for (const expression of parts.slice(1)) assert.ok(close(evaluate(expression), target), chain);
    }
    for (const q of questions) {
        const texts = [q.feedback, ...q.options?.map(o => o.feedback) || []].filter(Boolean);
        for (const text of texts) {
            const cleaned = text.replace(/(\d+(?:\.\d+)?)%/g, (_, p) => String(Number(p) / 100));
            assert.deepEqual(wrongSums(cleaned), [], text);
        }
    }
    for (const q of Q.examples().filter(q => q.whole && q.questionType !== 'percent-fraction' && q.questionType !== 'operation')) {
        assert.ok(equal(exact(answerOf(q)), percentOf(String(q.percent), String(q.whole))), q.prompt);
    }
});

test('percentages-of-amounts: prompts have no padded decimals and preserve the key misconception checks', () => {
    for (const q of questions) {
        assert.doesNotMatch(q.prompt, /\d+\.\d*0\b|Enter the number only|using a multiplier/);
        for (const text of allStrings(q)) assert.doesNotMatch(text, /\d+\.\d{5,}|AQA|Edexcel|OCR/);
    }
    assert.equal(Q.examples()[0].options.find(o => o.label === '1/5').feedback, 'One fifth is 20%. Three quarters make 75%.');
    assert.ok(Q.examples()[2].rules.some(rule => rule.value === '0.7467'));
    const seven = Q.generate({ type: 'percent-decimal', mode: 'choice' }, () => 6 / 99);
    assert.equal(seven.percent, 7);
    assert.ok(seven.options.some(o => o.label === '0.7' && !o.correct));
});
