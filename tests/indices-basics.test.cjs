// Recompute answers from the generated prompts and check each input mode.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { loadScript, num } = require('./helpers/lessons.cjs');
const window = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/lesson-engine.js'), 'utf8'), { window, document: { body: { dataset: { lessonRenderer: 'custom' } } } });
const Q = loadScript(path.join(__dirname, '../content/indices-basics/indices.js'),
    ['types', 'generate', 'pick', 'prepare', 'examples', 'checks', 'learnScreens'], { window });
const { seededRandom } = window.Maths1to9LessonEngine;
const generated = Q.types.flatMap(type => ['choice', 'number'].flatMap(mode => Array.from({ length: 300 }, (_, seed) => ({
    seed, q: Q.generate({ type, mode }, seededRandom(Math.imul(seed, 2654435761) >>> 0))
}))));
const answerOf = q => q.input === 'choice' ? q.options.find(option => option.correct).label : q.answer;
const SUPER = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const toSuper = number => [...String(number)].map(digit => SUPER[Number(digit)]).join('');
const power = text => {
    const [, base, index] = text.match(/(\d+)([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/) ?? [];
    return base && { base: Number(base), index: Number([...index].map(char => SUPER.indexOf(char)).join('')) };
};
const questionsOf = type => generated.filter(({ q }) => q.questionType === type);

test('identifyPartsQuestion: base and index are named correctly', () => {
    for (const { seed, q } of questionsOf('identify-parts')) {
        const p = power(q.prompt);
        assert.equal(answerOf(q), String(q.prompt.includes('index') ? p.index : p.base), `${q.prompt} (seed ${seed})`);
    }
});
test('expandPowerQuestion: the answer repeats the base index times or fills one missing copy', () => {
    for (const { seed, q } of questionsOf('expand-power')) {
        const p = power(q.prompt);
        if (q.input === 'choice') assert.equal(answerOf(q), Array(p.index).fill(p.base).join(' × '), `${q.prompt} (seed ${seed})`);
        else {
            const factors = q.prompt.split(': ')[1].split(' × ');
            assert.equal(factors.length, p.index);
            assert(factors.slice(0, -1).every(factor => Number(factor) === p.base));
            assert.equal(Number(q.answer), p.base);
        }
    }
});
test('calculatePowerQuestion: the value is correct and no distractor equals it', () => {
    for (const { seed, q } of questionsOf('calculate-power')) {
        const p = power(q.prompt);
        const value = p.base ** p.index;
        assert.equal(num(answerOf(q)), value, `${q.prompt} (seed ${seed})`);
        for (const option of q.options || []) if (!option.correct) assert.notEqual(num(option.label), value, `distractor ${option.label} (seed ${seed})`);
    }
});
test('writeNotationQuestion: the notation counts the repeated factors', () => {
    for (const { seed, q } of questionsOf('write-notation')) {
        const text = q.input === 'choice' ? q.prompt.match(/matches (.+)\?/)[1] : q.prompt.match(/Write (.+) in index form/)[1];
        const factors = text.split(' × ');
        assert(factors.every(factor => factor === factors[0]), `${q.prompt} (seed ${seed})`);
        assert.equal(answerOf(q), q.input === 'choice' ? `${factors[0]}${toSuper(factors.length)}` : String(factors.length));
        // A swapped base/index must not accidentally offer an equivalent power.
        for (const option of q.options || []) if (!option.correct) {
            const p = power(option.label);
            if (p) assert.notEqual(p.base ** p.index, Number(factors[0]) ** factors.length);
        }
    }
});
test('applyPowerQuestion: areas, volumes and doubling use the right power and units', () => {
    const scenarios = new Set();
    for (const { seed, q } of questionsOf('apply-power')) {
        scenarios.add(q.scenario);
        const cube = q.prompt.match(/edges of length (\d+) (\w+)/);
        const square = q.prompt.match(/square \w+ has side length (\d+) (\w+)\. What is its area\?/);
        const doubling = q.prompt.match(/doubles every (\w+), starting from (\d+)\. What is the population after (\d+)/);
        let value, unit = '';
        if (cube) { value = Number(cube[1]) ** 3; unit = `${cube[2]}³`; }
        else if (square) { value = Number(square[1]) ** 2; unit = `${square[2]}²`; }
        else if (doubling) value = Number(doubling[2]) * 2 ** Number(doubling[3]);
        else assert.fail(`unrecognised context: ${q.prompt} (seed ${seed})`);
        assert.equal(answerOf(q), `${value}${q.input === 'choice' && unit ? ` ${unit}` : ''}`);
        if (q.input === 'number' && unit) assert(q.prompt.includes(`Give your answer in ${unit}`));
    }
    assert.equal(scenarios.size, 3);
});

test('all generated and fixed choices have four distinct options, one correct and individual feedback', () => {
    for (const q of [...generated.map(({ q }) => q), ...Q.examples(), ...Q.checks()].filter(q => q.options)) {
        assert.equal(q.options.length, 4, q.prompt);
        assert.equal(new Set(q.options.map(option => option.label)).size, 4, q.prompt);
        assert.equal(q.options.filter(option => option.correct).length, 1);
        assert(q.options.every(option => option.feedback.trim()));
        const source = JSON.stringify(q);
        const prepared = Q.prepare(q, seededRandom(77));
        for (const option of prepared.options) assert.equal(option.feedback, q.options.find(original => original.label === option.label).feedback);
        assert.equal(JSON.stringify(q), source);
    }
});
test('typed questions have useful feedback, wrong-answer rules and a fallback', () => {
    for (const q of [...generated.map(({ q }) => q), ...Q.examples(), ...Q.checks()].filter(q => q.input === 'number')) {
        assert(q.feedback && q.fallback && q.rules.length);
        for (const rule of q.rules) { assert(rule.feedback); assert.notEqual(Number(rule.value), Number(q.answer)); }
    }
});
test('six-question sessions are seeded, cover all methods and mix choice and typed answers', () => {
    for (let seed = 0; seed < 200; seed++) {
        const session = Q.pick(seededRandom(seed));
        assert.equal(session.length, 6);
        assert.equal(JSON.stringify(session), JSON.stringify(Q.pick(seededRandom(seed))));
        assert.equal(new Set(session.map(item => item.type)).size, 5);
        assert.equal(session.filter(item => item.mode === 'choice').length, 3);
        assert.equal(session.filter(item => item.mode === 'number').length, 3);
        for (const item of session) {
            assert.deepEqual(Object.keys(item).sort(), ['mode', 'seed', 'type']);
            assert.equal(JSON.stringify(Q.generate(item, seededRandom(item.seed))), JSON.stringify(Q.generate(item, seededRandom(item.seed))));
        }
    }
    for (const questions of [Q.examples(), Q.checks()]) {
        assert(questions.filter(q => q.input === 'choice').length >= 2);
        assert(questions.filter(q => q.input === 'number').length >= 2);
    }
});
test('Learn teaches each question method, the worked powers and the power-of-one rule', () => {
    const text = (JSON.stringify(Q.learnScreens) + fs.readFileSync(path.join(__dirname, '../content/indices-basics/indices.js'), 'utf8').split('const learnScreens =')[1]).toLowerCase();
    for (const keyword of ['base', 'index', 'copies', 'factor', 'missing factor', 'squared', 'cubed', 'area', 'volume', 'doubling', 'index form', 'x¹ = x', '2³', '5²', '6', '10³', '4³', '3²']) assert(text.includes(keyword), keyword);
    for (const [base, index] of [[4, 3], [5, 2], [3, 3], [9, 1], [2, 3], [10, 3]]) {
        const statement = `${base}${toSuper(index)} = ${Array(index).fill(base).join(' × ')} = ${base ** index}`;
        if (index > 1) assert(text.includes(statement) || text.includes(`${base}${toSuper(index)} = ${base ** index}`), statement);
    }
});

// The old generic bank discovery only reads generators declared in questions.js.
// Preserve those checks here now that the generators live in the lesson helper.
const { allStrings, wrongSums } = require('./helpers/lessons.cjs');
const skillMap = JSON.parse(fs.readFileSync(path.join(__dirname, '../content/indices-basics/lesson.json'), 'utf8')).assessment.question_types;
test('indices-basics: every fixed question type still has its skill mapping', () => {
    for (const q of [...Q.examples(), ...Q.checks()]) assert.equal(skillMap[q.questionType], 'positive-integer-powers');
});
for (const type of Q.types) {
    const samples = questionsOf(type);
    test(`${type}: generates 300 seeded questions in each input mode without errors`, () => {
        assert.equal(samples.length, 600);
        assert(samples.every(({ q }) => q.prompt.trim()));
    });
    test(`${type}: has its skill mapping in lesson.json`, () => {
        assert.equal(skillMap[type], 'positive-integer-powers');
        assert(samples.every(({ q }) => q.questionType === type));
    });
    test(`${type}: has exactly one correct, distinct choice`, () => {
        for (const { q } of samples.filter(({ q }) => q.options)) {
            assert.equal(q.options.filter(option => option.correct).length, 1);
            assert.equal(new Set(q.options.map(option => option.label.replace(/\s+/g, ' ').trim())).size, 4);
        }
    });
    test(`${type}: the shared shuffle varies the correct answer's position`, () => {
        const positions = new Set(samples.filter(({ q }) => q.options).map(({ q, seed }) =>
            Q.prepare(q, seededRandom(seed)).options.findIndex(option => option.correct)));
        assert(positions.size > 1);
    });
    test(`${type}: text has no broken values and uses the proper minus sign`, () => {
        for (const { q } of samples) for (const text of allStrings(q)) {
            assert.doesNotMatch(text, /\b(?:undefined|NaN|null|Infinity)\b|\[object Object\]/);
            assert.doesNotMatch(text.replace(/<[^>]*>/g, ''), /(?:^|[\s(=])-\d/);
        }
    });
    test(`${type}: numbers are tidy without floating-point leftovers`, () => {
        for (const { q } of samples) for (const text of allStrings(q)) assert.doesNotMatch(text, /\d\.\d{9,}/);
    });
    test(`${type}: every worked sum in the question and feedback is right`, () => {
        for (const { q } of samples) for (const text of allStrings(q)) assert.deepEqual(wrongSums(text), [], text);
    });
    test(`${type}: explains the answer in both input modes`, () => {
        for (const { q } of samples) {
            assert(q.feedback.trim());
            if (q.options) assert(q.options.every(option => option.feedback.trim()));
        }
    });
}

test('fixed cards and Learn keep every completed worked sum correct', () => {
    for (const text of allStrings([...Q.examples(), ...Q.checks(), ...Q.learnScreens])) {
        // In the missing-factor worked example, substitute the answer given in
        // that same sentence before checking the completed multiplication.
        const missing = text.match(/missing factor is (\d+)/)?.[1];
        const completed = missing ? text.replace(/□/g, missing) : text;
        assert.deepEqual(wrongSums(completed), [], text);
    }
});
