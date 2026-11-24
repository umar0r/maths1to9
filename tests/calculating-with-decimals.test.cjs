const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { contentDir } = require('./helpers/lessons.cjs');

// Multiplying and dividing decimals: the Practice generator and the Check
// questions. The tap-the-gap widget needs a page, so it's stubbed here: these
// tests check the maths and the questions, not the drawing.
const folder = path.join(contentDir, 'calculating-with-decimals');
const window = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/lesson-engine.js'), 'utf8'), {
    window, document: { body: { dataset: { lessonRenderer: 'custom' } } }
});
const tasks = [];
window.DecimalCalculations = {};
window.PointGap = { pointWidget: task => { tasks.push(task); return { task }; } };
vm.runInNewContext(fs.readFileSync(path.join(folder, 'decimal-calculations.js'), 'utf8'), { window });
const Q = window.DecimalCalculations;
const { seededRandom } = window.Maths1to9LessonEngine;
const lesson = JSON.parse(fs.readFileSync(path.join(folder, 'lesson.json')));

// Exact: "0.0725" with 4 places is 725. No floating-point sums.
const scaled = (text, places) => {
    const clean = text.replace(/£/g, '');
    const [whole, fraction = ''] = clean.split('.');
    assert.ok(fraction.length <= places, `${text} has more than ${places} places`);
    return Number(whole + fraction.padEnd(places, '0'));
};
const afterPoint = text => (text.replace(/£/g, '').split('.')[1] || '').length;

const seeds = [0, 0xffffffff, 0x80000000];
let seed = 0x9e3779b9;
while (seeds.length < 200) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    if (!seeds.includes(seed)) seeds.push(seed);
}

const stagesOf = q => q.stages || [q];
const problems = Q.practiceTypes.flatMap(type => seeds.map(s => ({ type, q: Q.generateProblem(type, seededRandom(s)) })));

test('multiplying and dividing decimals: every Practice kind has an exactly right answer', () => {
    for (const { type, q } of problems) {
        const v = q.values;
        const last = stagesOf(q).at(-1);
        switch (type) {
        case 'multiply-whole-card': assert.equal(scaled(last.answer, 2), v.a * v.n); break;
        case 'divide-whole-card': assert.equal(scaled(last.answer, 2) * v.divisor, v.dividend); break;
        case 'multiply-decimals': assert.equal(scaled(last.answer, 4), v.a * v.b); break;
        case 'known-fact': assert.equal(scaled(last.answer, 2), v.product); break;
        case 'money-multiply': assert.equal(scaled(last.answer, 2), v.p * v.n); break;
        case 'divide-by-decimal': assert.equal(Number(last.answer) * v.c, v.d); break;
        case 'share-the-bill':
            assert.equal(v.answer * v.n, v.total);
            assert.equal(scaled(stagesOf(q)[1].answer, 2), v.answer);
            break;
        case 'meter-bill': assert.equal(scaled(last.answer, 2), v.used * v.c); break;
        case 'times-ten': assert.equal(Number(last.answer), v.answer); break;
        case 'year-cost': assert.equal(scaled(last.answer, 2), v.answer); break;
        case 'divide-difference': assert.equal(scaled(last.answer, 1), v.q); break;
        default: assert.fail(`No answer check for ${type}`);
        }
    }
});

test('multiplying and dividing decimals: choices have one right answer, four different options and their own feedback', () => {
    for (const { q } of problems) {
        for (const stage of stagesOf(q)) {
            if (!stage.options) continue;
            assert.equal(stage.options.length, 4, stage.prompt);
            assert.equal(stage.options.filter(o => o.correct).length, 1, stage.prompt);
            assert.equal(new Set(stage.options.map(o => o.label)).size, 4, stage.prompt);
            assert.equal(new Set(stage.options.map(o => o.feedback)).size, 4, stage.prompt);
            assert.ok(stage.options.every(o => o.feedback), stage.prompt);
            assert.ok(stage.options.every(o => !o.label.includes('−') || /[()]/.test(o.label)), `negative option: ${stage.prompt}`);
        }
        for (const stage of stagesOf(q)) {
            if (!stage.rules) continue;
            assert.ok(stage.feedback && stage.fallback);
            assert.ok(stage.rules.every(r => r.feedback && r.value !== stage.answer));
        }
    }
});

test('multiplying and dividing decimals: divide by a decimal always shows 2 digits after both points', () => {
    for (const { type, q } of problems) {
        if (type !== 'divide-by-decimal') continue;
        const [, a, b] = q.prompt.match(/Work out ([\d.]+) ÷ ([\d.]+)\./);
        assert.equal(afterPoint(a), 2, q.prompt);
        assert.equal(afterPoint(b), 2, q.prompt);
        assert.match(q.options.find(o => o.correct).feedback, /^2 − 2 = 0/);
    }
});

test('multiplying and dividing decimals: tap-the-gap puts the point where the answer has it', () => {
    tasks.length = 0;
    const tapped = problems.flatMap(({ q }) => stagesOf(q).filter(stage => stage.widget));
    assert.ok(tapped.length > 0);
    for (const stage of tapped) {
        const { task } = stage.widget;
        const placed = `${task.digits.slice(0, task.gap)}.${task.digits.slice(task.gap)}`;
        assert.equal(placed.replace(/^\./, '0.'), stage.answer.replace(/£/g, ''), stage.prompt);
        assert.equal(task.digits.length - task.gap, task.count, stage.prompt);
        assert.ok(task.right && task.wrong(0), stage.prompt);
    }
});

test('multiplying and dividing decimals: Practice sessions repeat from the same seed and never put three of a kind in a row', () => {
    for (const s of seeds) {
        const items = Q.pickSteps(seededRandom(s));
        const again = Q.pickSteps(seededRandom(s));
        assert.deepEqual(items, again);
        assert.deepEqual([...new Set(items.map(i => i.type))].sort(), [...Q.practiceTypes].sort());
        const inputs = items.map(item => {
            const q = Q.generateProblem(item.type, seededRandom(item.problemSeed));
            return stagesOf(q)[item.step].input === 'choice' ? 'choice' : 'work';
        });
        inputs.forEach((input, i) => {
            if (i >= 2) assert.ok(!(input === inputs[i - 1] && input === inputs[i - 2]), `three ${input} in a row`);
        });
        items.forEach(item => {
            const first = Q.generateProblem(item.type, seededRandom(item.problemSeed));
            const second = Q.generateProblem(item.type, seededRandom(item.problemSeed));
            assert.equal(first.prompt ?? stagesOf(first)[0].prompt, second.prompt ?? stagesOf(second)[0].prompt);
        });
    }
});

test('multiplying and dividing decimals: every question type maps to the lesson skill', () => {
    for (const type of [...Q.practiceTypes, ...Q.checks().map(c => c.type)]) {
        assert.equal(lesson.assessment.question_types[type], 'decimal-multiply-divide', type);
    }
});

test('multiplying and dividing decimals: Check is five choice questions with one right answer and the right numbers', () => {
    const checks = Q.checks();
    assert.equal(checks.length, 5);
    const rights = checks.map(c => {
        assert.equal(c.options.length, 4, c.prompt);
        assert.equal(c.options.filter(o => o.correct).length, 1, c.prompt);
        assert.equal(new Set(c.options.map(o => o.feedback)).size, 4, c.prompt);
        return c.options.find(o => o.correct).label;
    });
    assert.equal(rights[0], '0.1610');   // 0.46 × 0.35
    assert.equal(rights[1], '15.12');    // 6.3 × 2.4
    assert.equal(rights[3], '0.08');     // 0.24 ÷ 3
    assert.equal(rights[4], '7.8');      // 3.12 ÷ 0.4
    assert.equal(scaled('0.46', 2) * scaled('0.35', 2), scaled(rights[0], 4));
    assert.equal(scaled('6.3', 1) * scaled('2.4', 1), scaled(rights[1], 2));
    assert.equal(scaled(rights[3], 2) * 3, scaled('0.24', 2));
    assert.equal(scaled(rights[4], 1) * scaled('0.4', 1), scaled('3.12', 2));
});
