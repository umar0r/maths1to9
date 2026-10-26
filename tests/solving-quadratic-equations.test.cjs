// Maths checks for solving-quadratic-equations: each equation is read from
// the question and its solutions are found again by trying whole numbers.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { loadScript, allStrings, wrongSums } = require('./helpers/lessons.cjs');

const window = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/lesson-engine.js'), 'utf8'),
    { window, document: { body: { dataset: { lessonRenderer: 'custom' } } } });
loadScript(path.join(__dirname, '../content/solving-quadratic-equations/quadratics.js'), [], { window });
const Q = window.QuadraticEquations;
const lesson = JSON.parse(fs.readFileSync(path.join(__dirname, '../content/solving-quadratic-equations/lesson.json'), 'utf8'));
const { seededRandom } = window.Maths1to9LessonEngine;

// Evaluate "x² + 3x − 10", "(x + 2)(x − 5)" or "x(x + 7)" at a whole number.
function side(text, x) {
    const js = String(text).replace(/−/g, '-').replace(/×/g, '*').replace(/²/g, '**2')
        .replace(/(\d|\))\s*([x(])/g, '$1*$2').replace(/x\s*\(/g, 'x*(').replace(/x/g, `(${x})`);
    return Function(`return ${js};`)();
}
// Whole-number solutions of "left = right", found by trying −30 to 30.
function solutions(equation) {
    const [left, right] = equation.split(' = ');
    return Array.from({ length: 61 }, (_, i) => i - 30).filter(x => side(left, x) === side(right, x));
}
function equationIn(prompt) {
    let m;
    if ((m = prompt.match(/has factorised (.+? = 0) as/))) return m[1];
    if ((m = prompt.match(/solutions of (.+?) are/))) return m[1];
    if ((m = prompt.match(/, or (.+? = 0)\./))) return m[1];
    return prompt.match(/Solve (.+? = −?\d+)\./)[1];
}
const roots = label => label.replace(/ only$/, '').split(' or ').map(part => Number(part.replace('x = ', '').replace(/−/g, '-'))).sort((a, b) => a - b);
const signed = text => Number(String(text).replace(/−/g, '-'));

const generated = Q.practiceTypes.flatMap(type => ['choice', 'number'].flatMap(mode =>
    Array.from({ length: 200 }, (_, seed) => ({
        seed, mode, q: Q.generate({ type, mode }, seededRandom(Math.imul(seed + 1, 2654435761) >>> 0))
    }))));
const fixed = [...Q.examples().map(q => ({ seed: 'Try it', q })), ...Q.checks().map(q => ({ seed: 'Check', q }))];
const all = [...generated, ...fixed];
const where = (q, seed) => `${q.prompt} (${seed})`;

test('every Practice type is generated in both modes and mapped to a skill', () => {
    for (const type of Q.practiceTypes) {
        for (const mode of ['choice', 'number']) {
            assert.ok(generated.some(({ q, mode: m }) => q.questionType === type && m === mode && q.input === mode), `${type} ${mode}`);
        }
        assert.ok(lesson.assessment.question_types[type], `${type} has no skill mapping`);
    }
});

test('the answer is both whole-number solutions of the equation in the question', () => {
    for (const { seed, q } of all) {
        const found = solutions(equationIn(q.prompt));
        assert.equal(found.length, 2, `${found} ${where(q, seed)}`);
        assert.deepEqual(q.model.roots, found, where(q, seed));
        if (q.input === 'choice') assert.deepEqual(roots(q.options.find(o => o.correct).label), found, where(q, seed));
        else assert.deepEqual([signed(q.answer.smaller), signed(q.answer.larger)], found, where(q, seed));
        // The factorised form and the zero form are the same equation.
        assert.deepEqual(solutions(q.model.factorised), found, `${q.model.factorised} ${where(q, seed)}`);
        assert.deepEqual(solutions(q.model.zeroForm), found, `${q.model.zeroForm} ${where(q, seed)}`);
    }
});

test('a spot-the-error question shows a pupil answer that really is wrong', () => {
    for (const { seed, q } of all.filter(({ q }) => q.questionType === 'spotError')) {
        const claimed = roots(q.prompt.match(/are (x = .+?)\. Correct/)[1]);
        assert.notDeepEqual(claimed, q.model.roots, where(q, seed));
    }
});

test('the rectangle context has one positive width and a matching area', () => {
    for (const { seed, q } of all.filter(({ q }) => q.questionType === 'contextReject')) {
        const [, add, area] = q.prompt.match(/length \(x \+ (\d+)\) cm\. Its area is (\d+) cm²/).map(Number);
        const width = q.model.roots.find(root => root > 0);
        assert.equal(q.model.roots.filter(root => root > 0).length, 1, where(q, seed));
        assert.equal(width * (width + add), area, where(q, seed));
        assert.match(q.feedback, new RegExp(`width is ${width} cm`), where(q, seed));
    }
});

test('choice questions have four distinct options, one correct, and no wrong option is the full answer', () => {
    for (const { seed, q } of all.filter(({ q }) => q.input === 'choice')) {
        assert.equal(q.options.length, 4, where(q, seed));
        assert.equal(q.options.filter(option => option.correct).length, 1, where(q, seed));
        assert.equal(new Set(q.options.map(option => option.label)).size, 4, where(q, seed));
        assert.equal(new Set(q.options.map(option => option.feedback)).size, 4, where(q, seed));
        for (const option of q.options.filter(o => !o.correct)) {
            assert.notDeepEqual(roots(option.label), q.model.roots, `${option.label} ${where(q, seed)}`);
            if (roots(option.label).length === 1) assert.match(option.label, / only$/, where(q, seed));
        }
    }
});

test('typed questions use two labelled boxes, smaller first, with rules that are wrong', () => {
    for (const { seed, q } of all.filter(({ q }) => q.input === 'number')) {
        assert.deepEqual(q.fields.map(field => field.id), ['smaller', 'larger'], where(q, seed));
        assert.match(q.prompt, /smaller solution first/, where(q, seed));
        assert.ok(signed(q.answer.smaller) < signed(q.answer.larger), where(q, seed));
        for (const rule of q.rules) {
            assert.notDeepEqual([signed(rule.value.smaller), signed(rule.value.larger)], [signed(q.answer.smaller), signed(q.answer.larger)], `${JSON.stringify(rule.value)} ${where(q, seed)}`);
        }
        assert.ok(q.fallback, where(q, seed));
    }
});

test('the worked explanation is right: bracket numbers multiply and add correctly', () => {
    for (const { seed, q } of all) {
        const { roots: [a, b] } = q.model;
        if (q.model.c !== 0) assert.ok(q.feedback.includes(`multiply to ${String(a * b).replace('-', '−')} and add to ${String(-(a + b)).replace('-', '−')}`), where(q, seed));
        assert.deepEqual(wrongSums(q.feedback), [], `${q.feedback} ${where(q, seed)}`);
    }
});

test('text has no broken values and uses proper signs', () => {
    for (const { seed, q } of all) {
        // Answer and rule values are data for the engine, not text pupils read.
        const rules = (q.rules || []).map(rule => ({ ...rule, value: undefined }));
        for (const text of allStrings({ ...q, model: undefined, answer: undefined, rules })) {
            assert.doesNotMatch(text, /\b(?:undefined|NaN|null|Infinity)\b|\[object Object\]/, `${text} ${where(q, seed)}`);
            assert.doesNotMatch(text, /(?:^|[\s(=,])-\d/, `hyphen used as a minus sign in "${text}"`);
        }
    }
});

test('the correct option is not always in the same place after shuffling', () => {
    const positions = new Set(generated.filter(({ q }) => q.input === 'choice').slice(0, 300)
        .map(({ q, seed }) => Q.prepare(q, seededRandom(seed + 7)).options.findIndex(option => option.correct)));
    assert.ok(positions.size > 2, `answer positions: ${[...positions]}`);
});

test('a session has six questions from different types, mixing choice and typed, and repeats from its seed', () => {
    for (let seed = 1; seed <= 200; seed++) {
        const items = Q.pick(seededRandom(seed));
        assert.equal(items.length, lesson.question_bank.session_length ?? 6);
        assert.equal(new Set(items.map(item => item.type)).size, items.length, `seed ${seed}`);
        assert.ok(items.some(item => item.mode === 'choice') && items.some(item => item.mode === 'number'), `seed ${seed}`);
        assert.deepEqual(Q.pick(seededRandom(seed)), items, `seed ${seed} is not repeatable`);
    }
});

test('Try it and Check each mix choice and typed questions', () => {
    for (const set of [Q.examples(), Q.checks()]) {
        assert.ok(set.filter(q => q.input === 'choice').length >= 2);
        assert.ok(set.filter(q => q.input === 'number').length >= 2);
    }
    assert.equal(Q.checks().length, 5);
    assert.ok(Q.examples().length <= 12);
});

test('Learn teaches every method the questions use, and its worked lines are right', () => {
    const learn = Q.learnScreens.flatMap(screen => [screen.title, ...screen.lines, ...(screen.maths || [])]).join(' ').toLowerCase();
    for (const word of ['quadratic', '(−5) × (−5)', 'factoris', 'multiply to make 0', 'one of them is 0', 'opposite sign',
        'make one side 0', 'x = 0', 'difference of two squares', 'width', 'smaller']) {
        assert.ok(learn.includes(word), `Learn never mentions "${word}"`);
    }
    for (const screen of Q.learnScreens) for (const text of [...screen.lines, ...(screen.maths || [])]) assert.deepEqual(wrongSums(text), [], text);
});
