// Exact maths and retained form/diagram checks for the shared rounding lesson.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { contentDir, loadScript, allStrings } = require('./helpers/lessons.cjs');
const { roundToPower, roundSig, withCommas } = require('./helpers/decimals.cjs');
const window = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/lesson-engine.js'), 'utf8'), { window, document: { body: { dataset: { lessonRenderer: 'custom' } } } });
const { seededRandom, tidyNumber } = window.Maths1to9LessonEngine;
const folder = path.join(contentDir, 'rounding-and-significant-figures');
const data = JSON.parse(fs.readFileSync(path.join(folder, 'lesson.json')));
const Q = loadScript(path.join(folder, 'rounding.js'), ['roundSig', 'roundToPower', 'rounded', 'keyDigits', 'accuracyText', 'guided', 'examples', 'checks', 'practiceTypes', 'pick', 'generate', 'prepare', 'learnScreens'], { window });
const generated = Q.practiceTypes.flatMap(type => ['choice', 'number'].flatMap(mode => Array.from({ length: 200 }, (_, seed) => Q.generate({ type, mode }, seededRandom(Math.imul(seed, 2654435761) >>> 0)))));
const questions = [...Q.examples(), ...Q.checks(), ...generated];
const answerOf = q => q.answer ?? q.options.find(o => o.correct).label;
const clean = text => text.replace(/,/g, '');
function accuracyIn(text) {
    let m;
    if ((m = text.match(/nearest (\d[\d,]*)/))) return { kind: 'nearest', accuracy: clean(m[1]).length - 1, phrase: m[0] };
    if ((m = text.match(/(\d+) decimal places?/))) return { kind: 'decimal', accuracy: Number(m[1]), phrase: m[0] };
    if ((m = text.match(/(\d+) significant figures?/))) return { kind: 'sig', accuracy: Number(m[1]), phrase: m[0] };
    return null;
}
function expected(number, kind, accuracy) {
    return kind === 'sig' ? roundSig(number, accuracy) : roundToPower(number, kind === 'decimal' ? -accuracy : accuracy);
}
function keyDigits(number, kind, accuracy) {
    const indexes = [...number].map((c, i) => /\d/.test(c) ? i : -1).filter(i => i >= 0);
    const significant = indexes.slice(indexes.findIndex(i => number[i] !== '0'));
    const point = number.includes('.') ? number.indexOf('.') : number.length;
    const target = kind === 'sig' ? significant[accuracy - 1] : kind === 'decimal' ? point + accuracy : point - 1 - accuracy;
    return { target, decider: indexes[indexes.indexOf(target) + 1] };
}

test('rounding-and-significant-figures: every rounding prompt is recognised and gives the right exact answer', () => {
    for (const q of questions.filter(q => q.stage === 'round')) {
        const info = accuracyIn(q.prompt);
        assert.ok(info, q.prompt);
        const numbers = q.prompt.replace(info.phrase, '').match(/\d[\d,]*(?:\.\d+)?/g) || [];
        assert.equal(numbers.length, 1, q.prompt);
        assert.equal(clean(numbers[0]), q.number);
        assert.equal(clean(answerOf(q)), expected(clean(numbers[0]), info.kind, info.accuracy), q.prompt);
        assert.equal(q.kind, info.kind);
        assert.equal(q.accuracy, info.accuracy);
    }
});

test('rounding-and-significant-figures: all choices have four distinct forms, one correct answer and distinct feedback', () => {
    for (const q of questions.filter(q => q.options)) {
        assert.equal(q.options.length, 4, q.prompt);
        assert.equal(q.options.filter(o => o.correct).length, 1, q.prompt);
        assert.equal(new Set(q.options.map(o => o.label)).size, 4, q.prompt);
        assert.equal(new Set(q.options.map(o => o.feedback)).size, 4, q.prompt);
        assert.ok(q.options.every(o => o.feedback));
        if (q.stage === 'round') {
            const answer = expected(q.number, q.kind, q.accuracy);
            assert.equal(q.options.filter(o => tidyNumber(o.label) === answer).length, 1, q.prompt);
            assert.equal(new Set(q.options.map(o => tidyNumber(o.label))).size, 4, q.prompt);
        }
    }
});

test('rounding-and-significant-figures: typed answers keep exact zeros, with rules and a fallback', () => {
    for (const q of questions.filter(q => q.input === 'number')) {
        assert.equal(q.exact, q.kind !== 'nearest');
        assert.ok(q.rules.length && q.fallback && q.feedback);
        for (const rule of q.rules) assert.notEqual(tidyNumber(rule.value), tidyNumber(q.answer), q.prompt);
        if (q.answer.includes('.') && q.answer.endsWith('0')) assert.match(q.prompt, /Keep the zeros? at the end after the decimal point/);
    }
    assert.equal(Q.checks().at(-1).answer, '1.0');
    assert.equal(Q.examples().at(-1).answer, '10.0');
});

test('rounding-and-significant-figures: explanations name the right deciding digit and state the answer', () => {
    for (const q of questions.filter(q => q.stage === 'round')) {
        const { decider } = keyDigits(q.number, q.kind, q.accuracy);
        assert.equal(q.feedback.match(/next digit is (\d)/)[1], q.number[decider], q.prompt);
        assert.ok([answerOf(q), withCommas(clean(answerOf(q)))].some(answer => q.feedback.includes(answer)), q.prompt);
    }
});

test('rounding-and-significant-figures: four guided examples and Learn pictures highlight the right digits', () => {
    assert.equal(Q.guided.length, 4);
    assert.equal(Q.examples().length, 12);
    assert.equal(data.score_activities.filter(a => a.kind === 'guided').length, 12);
    for (const q of questions.filter(q => q.number)) {
        const expected = keyDigits(q.number, q.kind, q.accuracy);
        assert.equal(q.target, expected.target, q.prompt);
        assert.equal(q.decider, expected.decider, q.prompt);
        if (q.stage === 'keep' || q.stage === 'decider') assert.equal(q.options.find(o => o.correct).index, q.stage === 'keep' ? expected.target : expected.decider);
    }
    for (const screen of Q.learnScreens.filter(screen => screen.number)) {
        const positions = Q.keyDigits(screen.number, screen.kind, screen.accuracy);
        const target = keyDigits(screen.number, screen.kind, screen.accuracy);
        assert.equal(positions.target, target.target);
        assert.equal(positions.decider, target.decider);
        for (const equation of screen.equations || []) {
            const match = equation.replace(/ metres/g, '').match(/^([\d,.]+) ≈ ([\d,.]+)$/);
            assert.ok(match, equation);
            assert.equal(clean(match[2]), expected(clean(match[1]), screen.kind, screen.accuracy), equation);
        }
    }
});

test('rounding-and-significant-figures: halfway cases, carrying and direct rounding follow exact half-up rules', () => {
    for (const [number, kind, accuracy, answer] of [
        ['650', 'nearest', 2, '700'], ['5.465', 'decimal', 2, '5.47'], ['9.96', 'decimal', 1, '10.0'],
        ['2.449', 'decimal', 1, '2.4'], ['1.049', 'decimal', 1, '1.0'], ['2748', 'nearest', 2, '2700'],
        ['0.00726', 'sig', 2, '0.0073'], ['0.0045', 'sig', 1, '0.005']
    ]) assert.equal(Q.rounded(number, kind, accuracy), answer);
    assert.equal(Q.roundToPower('18', 2), '0');
    assert.equal(Q.roundToPower('0.004', -2), '0.00');
});

test("rounding-and-significant-figures: Amir's claim is wrong and the explanation corrects it", () => {
    const q = Q.checks().find(q => q.questionType === 'error');
    assert.equal(expected('4.95', 'decimal', 1), '5.0');
    assert.equal(answerOf(q), 'The 5 rounds the tenths up, giving 5.0');
    assert.equal(q.options.length, 4);
    assert.ok(q.options.some(o => o.label.startsWith('Write 5 because') && !o.correct));
});

test('rounding-and-significant-figures: 200 seeds per type and input mode are deterministic and mapped to the three existing skills', () => {
    for (const type of Q.practiceTypes) {
        const skill = /significant/.test(type) ? 'round-significant-figures' : type === 'path-context' ? 'round-in-context' : 'round-decimal-places';
        assert.equal(data.assessment.question_types[type], skill);
        const positions = new Set();
        for (const mode of ['choice', 'number']) for (let seed = 0; seed < 200; seed++) {
            const q = Q.generate({ type, mode }, seededRandom(seed));
            assert.deepEqual(q, Q.generate({ type, mode }, seededRandom(seed)));
            if (q.options) positions.add(q.options.findIndex(o => o.correct));
        }
        assert.ok(positions.size > 1, type);
    }
    for (let seed = 0; seed < 200; seed++) {
        const items = Q.pick(seededRandom(seed));
        assert.equal(items.length, 6);
        assert.equal(items.length, data.question_bank.session_length);
        const qs = items.map(item => Q.generate(item, seededRandom(item.seed)));
        assert.equal(qs.filter(q => q.input === 'choice').length, 3);
        assert.equal(qs.filter(q => q.input === 'number').length, 3);
        assert.deepEqual(new Set(qs.map(q => data.assessment.question_types[q.questionType])), new Set(['round-decimal-places', 'round-significant-figures', 'round-in-context']));
    }
    for (const group of [Q.examples(), Q.checks()]) assert.deepEqual(new Set(group.map(q => q.input)), new Set(['choice', 'number']));
    assert.equal(Q.checks().length, 5);
});

test('rounding-and-significant-figures: wording and input numbers are tidy and style matches significant figures', () => {
    for (const q of generated) assert.doesNotMatch(q.number, /\.\d*0$/);
    for (const text of allStrings([questions, Q.learnScreens])) {
        assert.doesNotMatch(text, /\b1 decimal places\b|\b1 significant figures\b|AQA|Edexcel|OCR/);
        assert.doesNotMatch(text, /\d+\.\d{12,}|\b(?:color|center|recognize|organize)\b/);
    }
    const sigCss = fs.readFileSync(path.join(contentDir, 'significant-figures/lesson.css'), 'utf8');
    assert.ok(fs.readFileSync(path.join(folder, 'lesson.css'), 'utf8').startsWith(sigCss));
    assert.equal(data.navigation.back_button, true);
    assert.deepEqual(data.navigation_stages.map(s => s.label), ['Learn', 'Try it', 'Practice', 'Check']);
    const reference = path.join(__dirname, '../dist/content/rounding-and-significant-figures');
    for (const file of ['lesson.json', 'lesson.css', 'rounding.js', 'interactive.js', 'questions.js']) assert.equal(fs.readFileSync(path.join(reference, file), 'utf8'), fs.readFileSync(path.join(folder, file), 'utf8'), file);
});
