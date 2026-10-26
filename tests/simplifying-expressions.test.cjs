// Maths checks for simplifying-expressions: every expression in a question
// and every answer is evaluated at several letter values, so a simplified
// answer must have exactly the same value as the expression it came from.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { loadScript, allStrings, wrongSums } = require('./helpers/lessons.cjs');

const window = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/lesson-engine.js'), 'utf8'),
    { window, document: { body: { dataset: { lessonRenderer: 'custom' } } } });
loadScript(path.join(__dirname, '../content/simplifying-expressions/algebra.js'), [], { window });
const S = window.SimplifyingExpressions;
const lesson = JSON.parse(fs.readFileSync(path.join(__dirname, '../content/simplifying-expressions/lesson.json'), 'utf8'));
const { seededRandom } = window.Maths1to9LessonEngine;

// Evaluate written algebra like "3x + 2y − x + 4" or "3a² × 2a" with letter values.
const POWERS = { '²': 2, '³': 3, '⁴': 4, '⁵': 5, '⁶': 6 };
function evaluate(text, values) {
    const js = String(text).replace(/−/g, '-').replace(/×/g, '*')
        .replace(/[a-z]/g, letter => `(${values[letter]})`)
        .replace(/\)([²³⁴⁵⁶])/g, (_, power) => `**${POWERS[power]})`).replace(/\((-?\d+)\*\*/g, '(($1)**')
        .replace(/(\d|\))\s*\(/g, '$1*(');
    return Function(`return ${js};`)();
}
const POINTS = [{ a: 2, b: 3, e: 5, m: 7, x: 3, y: 4 }, { a: -3, b: 2, e: -1, m: 4, x: 5, y: -2 }, { a: 5, b: 7, e: 3, m: -2, x: -4, y: 6 }];
const same = (left, right) => POINTS.every(values => evaluate(left, values) === evaluate(right, values));
const expressionOf = q => q.model.expression;

const generated = S.practiceTypes.flatMap(type => ['choice', 'custom'].flatMap(mode =>
    Array.from({ length: 200 }, (_, seed) => ({
        seed, mode, q: S.generate({ type, mode }, seededRandom(Math.imul(seed + 1, 2654435761) >>> 0))
    }))));
const fixed = [...S.examples().map(q => ({ seed: 'Try it', q })), ...S.checks().map(q => ({ seed: 'Check', q }))];
const all = [...generated, ...fixed];
const where = (q, seed) => `${q.prompt} (${seed})`;

test('every Practice type is generated as a choice and as an activity, and mapped to a skill', () => {
    for (const type of S.practiceTypes) {
        assert.ok(generated.some(({ q, mode }) => q.questionType === type && mode === 'choice' && q.input === 'choice'), `${type} choice`);
        assert.ok(generated.some(({ q, mode }) => q.questionType === type && mode === 'custom' && q.input === 'custom'), `${type} activity`);
        assert.ok(lesson.assessment.question_types[type], `${type} has no skill mapping`);
    }
});

test('the question shows the expression the model describes, and the answer has the same value', () => {
    for (const { seed, q } of all) {
        assert.ok(q.prompt.includes(expressionOf(q)), where(q, seed));
        assert.ok(same(q.model.answer, expressionOf(q)), `${q.model.answer} ≠ ${expressionOf(q)} ${where(q, seed)}`);
        if (q.model.kind === 'sum') {
            // Fully collected: one term per letter part at most.
            const families = q.model.answer.replace(/−/g, '+').split('+').map(term => term.trim()).filter(Boolean).map(term => term.replace(/^\d+/, '') || 'number');
            assert.equal(new Set(families).size, families.length, `${q.model.answer} is not fully collected ${where(q, seed)}`);
        }
    }
});

test('choice questions: four distinct options, one correct, and every wrong option has a different value', () => {
    for (const { seed, q } of all.filter(({ q }) => q.input === 'choice')) {
        assert.equal(q.options.length, 4, where(q, seed));
        assert.equal(q.options.filter(option => option.correct).length, 1, where(q, seed));
        assert.equal(new Set(q.options.map(option => option.label)).size, 4, where(q, seed));
        assert.equal(new Set(q.options.map(option => option.feedback)).size, 4, where(q, seed));
        for (const option of q.options) {
            // "2a + 3" is already simplified, so its right answer repeats the question.
            assert.equal(same(option.label, expressionOf(q)), option.correct, `${option.label} ${where(q, seed)}`);
        }
    }
});

test('activities accept their correct value, show it as the simplified answer, and reject mistakes', () => {
    for (const { seed, q } of all.filter(({ q }) => q.input === 'custom')) {
        const { widget, model } = q;
        const right = widget.correctValue();
        assert.deepEqual(S.correctValue(q), right);
        assert.equal(widget.mark(right).correct, true, `${model.widgetKind} ${where(q, seed)}`);
        assert.equal(widget.isEmpty(right), false, where(q, seed));
        assert.equal(widget.mark(null).correct, false, where(q, seed));
        const shown = widget.answerText(right);
        // The paint activity collects only one group, so it shows just that group's total.
        const expected = model.widgetKind === 'paint' ? S.termText(model.sums[model.targetFamily], model.targetFamily) : model.answer;
        assert.ok(shown.includes(expected) || same(shown, expected), `${shown} vs ${expected} ${where(q, seed)}`);
        const off = text => String(Number(String(text).replace(/−/g, '-')) + 1);
        if (model.widgetKind === 'coefficients') {
            for (const family of model.families) {
                assert.equal(widget.mark({ coefficients: { ...right.coefficients, [family]: off(right.coefficients[family]) } }).correct, false, `${family} ${where(q, seed)}`);
            }
            const negative = model.families.find(family => model.sums[family] < 0);
            if (negative) assert.equal(widget.mark({ coefficients: { ...right.coefficients, [negative]: String(-model.sums[negative]) } }).correct, false, where(q, seed));
        } else if (model.widgetKind === 'paint') {
            assert.equal(widget.mark({ ...right, coefficient: off(right.coefficient) }).correct, false, where(q, seed));
            assert.equal(widget.mark({ ...right, selected: model.terms.map(term => term.id) }).correct, false, `selecting every term ${where(q, seed)}`);
            assert.equal(widget.mark({ ...right, selected: right.selected.slice(0, 1) }).correct, false, `selecting one term ${where(q, seed)}`);
        } else if (model.widgetKind === 'sort') {
            const [first] = model.terms;
            const other = model.families.find(family => family !== first.family);
            assert.equal(widget.mark({ ...right, placements: { ...right.placements, [first.id]: other } }).correct, false, where(q, seed));
            assert.equal(widget.mark({ ...right, coefficients: { ...right.coefficients, [first.family]: off(right.coefficients[first.family]) } }).correct, false, where(q, seed));
        } else if (model.widgetKind === 'zero') {
            assert.equal(widget.mark({ ...right, coefficient: off(right.coefficient) }).correct, false, where(q, seed));
            if (model.positiveCount > 1 && right.pairs.length) {
                assert.equal(widget.mark({ ...right, pairs: [['positive-0', 'positive-1'], ...right.pairs.slice(1)] }).correct, false, `same-sign pair ${where(q, seed)}`);
            }
            if (right.pairs.length > 1) {
                assert.equal(widget.mark({ ...right, pairs: right.pairs.slice(1) }).correct, false, `pairs missing ${where(q, seed)}`);
                assert.equal(widget.mark({ ...right, pairs: [right.pairs[0], right.pairs[0], ...right.pairs.slice(2)] }).correct, false, `tile used twice ${where(q, seed)}`);
            }
            assert.equal(Number(right.coefficient), model.positiveCount - model.negativeCount);
        } else if (model.widgetKind === 'product') {
            assert.equal(widget.mark({ ...right, coefficient: off(right.coefficient) }).correct, false, where(q, seed));
            assert.equal(widget.mark({ ...right, power: model.leftPower * model.rightPower === model.power ? model.power + 1 : model.leftPower * model.rightPower }).correct, false, where(q, seed));
            assert.equal(widget.mark({ ...right, coefficient: String(model.leftCoefficient + model.rightCoefficient) }).correct,
                model.leftCoefficient + model.rightCoefficient === model.coefficient, where(q, seed));
        } else assert.fail(`unknown activity ${model.widgetKind}`);
    }
});

test('zero pairs: the tiles shown match the expression', () => {
    for (const { seed, q } of all.filter(({ q }) => q.model.widgetKind === 'zero')) {
        const tiles = S.zeroTiles(q.model);
        assert.equal(tiles.length, q.model.positiveCount + q.model.negativeCount, where(q, seed));
        assert.equal(q.model.sums[q.model.letter], q.model.positiveCount - q.model.negativeCount, where(q, seed));
    }
});

test('text has no broken values, uses proper signs and its worked sums are right', () => {
    for (const { seed, q } of all) {
        for (const text of allStrings({ ...q, model: undefined, widget: undefined })) {
            assert.doesNotMatch(text, /\b(?:undefined|NaN|null|Infinity)\b|\[object Object\]/, `${text} ${where(q, seed)}`);
            assert.doesNotMatch(text, /(?:^|[\s(=,])-\d/, `hyphen used as a minus sign in "${text}"`);
        }
        for (const text of [q.feedback, ...(q.options || []).filter(o => o.correct).map(o => o.feedback)].filter(Boolean)) {
            assert.deepEqual(wrongSums(text), [], `${text} ${where(q, seed)}`);
        }
    }
});

test('the correct option is not always in the same place after shuffling', () => {
    const positions = new Set(generated.filter(({ q }) => q.input === 'choice').slice(0, 300)
        .map(({ q, seed }) => S.prepare(q, seededRandom(seed + 7)).options.findIndex(option => option.correct)));
    assert.ok(positions.size > 2, `answer positions: ${[...positions]}`);
});

test('a session has six questions from different types, mixing choices and activities, and repeats from its seed', () => {
    for (let seed = 1; seed <= 200; seed++) {
        const items = S.pick(seededRandom(seed));
        assert.equal(items.length, lesson.question_bank.session_length ?? 6);
        assert.equal(new Set(items.map(item => item.type)).size, items.length, `seed ${seed}`);
        assert.ok(items.some(item => item.mode === 'choice') && items.some(item => item.mode !== 'choice'), `seed ${seed}`);
        assert.deepEqual(S.pick(seededRandom(seed)), items, `seed ${seed} is not repeatable`);
    }
});

test('Try it and Check each mix choices and activities', () => {
    for (const set of [S.examples(), S.checks()]) {
        assert.ok(set.filter(q => q.input === 'choice').length >= 2);
        assert.ok(set.filter(q => q.input !== 'choice').length >= 2);
    }
    assert.equal(S.checks().length, 5);
    assert.ok(S.examples().length <= 12);
});

test('Learn teaches every method the questions use, and its worked lines are right', () => {
    const learn = S.learnScreens.flatMap(screen => [screen.title, ...screen.lines, ...screen.maths]).join(' ').toLowerCase();
    for (const word of ['term', 'like terms', 'coefficient', 'same value', 'x = 1x', 'number terms', 'zero pair',
        'power', 'a × a', 'a²', 'factor']) {
        assert.ok(learn.includes(word), `Learn never mentions "${word}"`);
    }
    // Every "expression = simplified" line in Learn must keep its value.
    for (const screen of S.learnScreens) {
        for (const line of screen.maths) {
            const sides = line.split(' = ');
            if (sides.length < 2 || sides.some(side => /[^a-z0-9²³⁴\s+−×]/i.test(side))) continue;
            for (let i = 1; i < sides.length; i++) assert.ok(same(sides[0], sides[i]), `Learn: ${line}`);
        }
        for (const text of screen.lines) assert.deepEqual(wrongSums(text), [], text);
    }
});
