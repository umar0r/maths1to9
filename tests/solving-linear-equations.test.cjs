// Maths checks for solving-linear-equations: every equation is read from the
// question and solved again independently, and the answer must make it true.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { loadScript, allStrings, wrongSums } = require('./helpers/lessons.cjs');

const window = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/lesson-engine.js'), 'utf8'),
    { window, document: { body: { dataset: { lessonRenderer: 'custom' } } } });
loadScript(path.join(__dirname, '../content/solving-linear-equations/equations.js'), [], { window });
const L = window.LinearEquations;
const lesson = JSON.parse(fs.readFileSync(path.join(__dirname, '../content/solving-linear-equations/lesson.json'), 'utf8'));
const { seededRandom } = window.Maths1to9LessonEngine;

// Evaluate one side such as "3(x + 2) + 4", "x ÷ 4" or "3 + 2x" at a value of x.
function side(text, x) {
    const js = String(text).replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/')
        .replace(/(\d)\s*([a-z(])/g, '$1*$2').replace(/[a-z]/g, `(${x})`);
    return Function(`return ${js};`)();
}
// A linear equation f(x) = c has x = (c − f(0)) / (f(1) − f(0)).
function solve(equation) {
    const [left, right] = equation.split(' = ');
    const c = side(right, 0), f0 = side(left, 0), f1 = side(left, 1);
    return (c - f0) / (f1 - f0);
}
const fraction = text => {
    const m = String(text).replace(/−/g, '-').match(/^(-?\d+)\/(\d+)$/);
    return m ? Number(m[1]) / Number(m[2]) : Number(String(text).replace(/−/g, '-'));
};
const equationIn = prompt => prompt.match(/Solve (.+ = −?\d+)\./)[1];
const answerOf = q => q.input === 'choice' ? q.options.find(option => option.correct).label : q.answer;

const generated = L.practiceTypes.flatMap(type => ['choice', 'number'].flatMap(mode =>
    Array.from({ length: 200 }, (_, seed) => ({
        seed, mode, q: L.generate({ type, mode }, seededRandom(Math.imul(seed + 1, 2654435761) >>> 0))
    }))));
const fixed = [...L.examples().map(q => ({ seed: 'Try it', q })), ...L.checks().map(q => ({ seed: 'Check', q }))];
const all = [...generated, ...fixed];
const solveCards = all.filter(({ q }) => q.task === 'solve');
const where = (q, seed) => `${q.prompt} (${seed})`;

test('every Practice type is generated in both modes and mapped to a skill', () => {
    for (const type of L.practiceTypes) {
        for (const mode of ['choice', 'number']) {
            assert.ok(generated.some(({ q, mode: m }) => q.questionType === type && m === mode && q.input === mode), `${type} ${mode}`);
        }
        assert.ok(lesson.assessment.question_types[type], `${type} has no skill mapping`);
    }
});

test('the answer solves the equation written in the question, and is a whole number', () => {
    for (const { seed, q } of solveCards) {
        const x = solve(equationIn(q.prompt));
        assert.ok(Number.isInteger(x) && x !== 0, `x = ${x} ${where(q, seed)}`);
        assert.equal(fraction(answerOf(q)), x, where(q, seed));
        const [left, right] = equationIn(q.prompt).split(' = ');
        assert.equal(side(left, x), side(right, 0), `does not balance ${where(q, seed)}`);
        if (q.questionType === 'costStory' || q.model.params.storyId) assert.ok(x > 0, `a story needs a positive answer ${where(q, seed)}`);
    }
});

test('the worked feedback ends at the answer and its check line is true', () => {
    for (const { seed, q } of solveCards) {
        const x = solve(equationIn(q.prompt));
        assert.equal(q.model.steps.at(-1).equation, `${q.model.letter} = ${String(x).replace(/-/g, '−')}`, where(q, seed));
        assert.deepEqual(wrongSums(q.model.check), [], `${q.model.check} ${where(q, seed)}`);
        // Every step is the same equation rearranged: it has the same solution.
        for (const step of q.model.steps) {
            if (/[a-z]/.test(step.equation.split(' = ')[1])) continue;
            assert.equal(solve(step.equation.replace(/^([a-z]) = (.+)$/, '$1 = $2')), x, `${step.equation} ${where(q, seed)}`);
        }
    }
});

test('choice questions have four distinct options, one correct, and no wrong option solves the equation', () => {
    for (const { seed, q } of all.filter(({ q }) => q.input === 'choice')) {
        assert.equal(q.options.length, 4, where(q, seed));
        assert.equal(q.options.filter(option => option.correct).length, 1, where(q, seed));
        assert.equal(new Set(q.options.map(option => option.label)).size, 4, where(q, seed));
        assert.equal(new Set(q.options.map(option => option.feedback)).size, 4, where(q, seed));
        if (q.task !== 'solve') continue;
        const x = solve(equationIn(q.prompt));
        for (const option of q.options.filter(o => !o.correct)) assert.notEqual(fraction(option.label), x, `${option.label} ${where(q, seed)}`);
    }
});

test('typed questions accept fractions, and their mistake rules are wrong', () => {
    for (const { seed, q } of solveCards.filter(({ q }) => q.input === 'number')) {
        assert.equal(q.fractions, true, where(q, seed));
        assert.ok(q.fallback, where(q, seed));
        const x = solve(equationIn(q.prompt));
        for (const rule of q.rules) assert.notEqual(fraction(rule.value), x, `rule ${rule.value} ${where(q, seed)}`);
    }
});

test('the story and balance cards are right', () => {
    const [form, undo] = L.examples();
    assert.equal(form.options.find(o => o.correct).label, '3 + 2x = 17');
    assert.equal(solve('3 + 2x = 17'), 7);
    for (const option of form.options.filter(o => !o.correct)) assert.notEqual(solve(option.label), 7, option.label);
    assert.equal(undo.options.find(o => o.correct).label, 'Subtract 3 from both sides.');
    for (const story of L.stories) {
        const x = solve(L.storyModel(story).equation);
        assert.ok(Number.isInteger(x) && x > 0, story.id);
        assert.equal(story.fixed + story.coefficient * x, story.total, story.id);
    }
});

test('text has no broken values, uses proper signs and its worked sums are right', () => {
    for (const { seed, q } of all) {
        for (const text of allStrings({ ...q, model: undefined })) {
            assert.doesNotMatch(text, /\b(?:undefined|NaN|null|Infinity)\b|\[object Object\]/, `${text} ${where(q, seed)}`);
            assert.doesNotMatch(text, /(?:^|[\s(=,])-\d/, `hyphen used as a minus sign in "${text}"`);
        }
    }
});

test('the correct option is not always in the same place after shuffling', () => {
    const positions = new Set(generated.filter(({ q }) => q.input === 'choice').slice(0, 300)
        .map(({ q, seed }) => window.Maths1to9LessonEngine.shuffle(q.options, seededRandom(seed + 7)).findIndex(option => option.correct)));
    assert.ok(positions.size > 2, `answer positions: ${[...positions]}`);
});

test('a session has six questions from different types, mixing choice and typed, and repeats from its seed', () => {
    for (let seed = 1; seed <= 200; seed++) {
        const items = L.pick(seededRandom(seed));
        assert.equal(items.length, lesson.question_bank.session_length ?? 6);
        assert.equal(new Set(items.map(item => item.type)).size, items.length, `seed ${seed}`);
        assert.ok(items.some(item => item.mode === 'choice') && items.some(item => item.mode === 'number'), `seed ${seed}`);
        assert.deepEqual(L.pick(seededRandom(seed)), items, `seed ${seed} is not repeatable`);
    }
});

test('Try it and Check each mix choice and typed questions, and Check covers one-step, two-step and brackets', () => {
    for (const set of [L.examples(), L.checks()]) {
        assert.ok(set.filter(q => q.input === 'choice').length >= 2);
        assert.ok(set.filter(q => q.input === 'number').length >= 2);
    }
    assert.equal(L.checks().length, 5);
    assert.ok(L.examples().length <= 12);
    const types = L.checks().map(q => q.questionType);
    assert.ok(types.includes('subtract') && types.includes('twoStepAdd') && types.some(type => type.startsWith('brackets')), types.join());
});

test('Learn teaches every method the questions use, and its worked lines are right', () => {
    const learn = L.learnScreens.flatMap(screen => [screen.title, ...screen.lines, ...screen.maths]).join(' ').toLowerCase();
    for (const word of ['equation', 'unknown', 'solving', 'both sides', 'opposite operation', 'divide both sides',
        'multiply both sides', 'brackets', 'check']) {
        assert.ok(learn.includes(word), `Learn never mentions "${word}"`);
    }
    for (const screen of L.learnScreens) {
        for (const text of [...screen.lines, ...screen.maths]) {
            if (/not x \+ 6|would break/.test(text)) continue; // named mistakes
            assert.deepEqual(wrongSums(text), [], text);
        }
    }
});
