const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Q = require('../content/scatter-graphs/questions.js');
const S = require('../content/scatter-graphs/scatter-graphs.js');
const window = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/lesson-engine.js'), 'utf8'), {
    window, document: { body: { dataset: { lessonRenderer: 'custom' } } }
});
const E = window.Maths1to9LessonEngine;
const lesson = require('../content/scatter-graphs/lesson.json');
const plain = value => JSON.parse(JSON.stringify(value));
const seeds = Array.from({ length: 200 }, (_, index) => Math.imul(index + 1, 2654435761) >>> 0);
const key = point => point.join(',');
const set = points => points.map(key).sort().join('|');
const build = item => Q.practiceQuestion(item, E.seededRandom(item.seed), E);
const rule = (question, value) => question.rules.find(rule => Number(rule.value) === value)?.feedback || question.fallback;

for (const part of ['read', 'plot', 'scales', null]) {
    test(`scatter graphs: ${part || 'Mix'} repeats from 200 32-bit seeds and follows its order rules`, () => {
        for (const seed of seeds) {
            const count = part ? 3 : 6;
            const items = Q.pickPractice(part, count, E.seededRandom(seed), E);
            assert.equal(items.length, count);
            assert.deepEqual(plain(items), plain(Q.pickPractice(part, count, E.seededRandom(seed), E)));
            assert.equal(new Set(items.map(item => item.type)).size, count);
            for (const item of items) {
                assert.ok(Number.isInteger(item.seed) && item.seed >= 0 && item.seed <= 0xffffffff);
                assert.deepEqual(plain(build(item)), plain(build(item)));
            }
            if (part === 'plot') assert.equal(items[1].type, 'pick-point');
            if (part) assert.deepEqual(plain(items.map(item => item.type)).sort(), [...Q.practiceTypes[part]].sort());
            else {
                const types = items.map(item => item.type);
                for (const group of Object.values(Q.practiceTypes)) assert.ok(types.some(type => group.includes(type)));
                assert.ok(types.indexOf('which-graph') > 0 && types.indexOf('which-graph') < count - 1);
                const inputs = items.map(item => build(item).input);
                for (let i = 1; i < count; i++) {
                    assert.ok(inputs[i] !== 'custom' || inputs[i - 1] !== 'custom');
                    if (i > 1) assert.ok(inputs[i] !== inputs[i - 1] || inputs[i] !== inputs[i - 2]);
                }
            }
        }
    });
    test(`scatter graphs: ${part || 'Mix'} has sound graphs, sensible axes and four distinct choices`, () => {
        for (const seed of seeds) for (const item of Q.pickPractice(part, part ? 3 : 6, E.seededRandom(seed), E)) {
            const q = build(item), m = q.model, g = m.graph;
            assert.equal(lesson.assessment.question_types[q.questionType], 'scatter-graphs');
            const groups = m.graphs || [m.points];
            for (const points of groups) {
                assert.equal(new Set(points.map(key)).size, points.length);
                for (const [x, y] of points) {
                    assert.ok(x >= g.step.x && x <= g.x[1]);
                    assert.ok(y >= g.step.y && y <= g.y[1]);
                    assert.equal(x % g.step.x, 0); assert.equal(y % g.step.y, 0);
                }
            }
            if (m.target) {
                assert.ok(m.target[0] >= g.step.x && m.target[0] <= g.x[1]);
                assert.ok(m.target[1] >= g.step.y && m.target[1] <= g.y[1]);
                assert.equal(m.target[0] % g.step.x, 0); assert.equal(m.target[1] % g.step.y, 0);
            }
            if (g.axisNames?.x === 'Hours of sunshine') {
                assert.deepEqual(plain(g.x), [0, 10]); assert.equal(g.step.x, 1);
            }
            if (g.axisNames?.x === 'Temperature (°C)') {
                assert.ok([2, 5, 10].includes(g.step.x));
                assert.deepEqual(plain(g.x), [0, g.step.x * 10]);
            }
            if (q.input === 'choice') {
                assert.equal(q.options.length, 4);
                assert.equal(new Set(q.options.map(option => option.label)).size, 4);
                assert.equal(q.options.filter(option => option.correct).length, 1);
                assert.ok(q.options.every(option => option.feedback.length > 0));
            }
            if (q.input === 'number') {
                assert.ok(Number.isInteger(Number(q.answer)));
                assert.ok(q.rules.every(rule => Number(rule.value) !== Number(q.answer)));
                assert.ok(q.feedback && q.fallback);
            }
            assert.doesNotMatch(q.prompt, /\b1 (hours|marks|rainy days|accidents|shots|goals|boxes)\b/);
        }
    });
}

test('scatter graphs: Read answers and each named mistake agree with the axes', () => {
    for (const type of Q.practiceTypes.read) for (const seed of seeds) {
        const q = build({ type, seed }), [a, b] = q.model.target;
        assert.notEqual(a, b);
        assert.equal(q.model.points.filter(point => point[0] === a).length, 1);
        if (type === 'read-pair') {
            const option = q.options.find(option => option.correct);
            assert.deepEqual(option.label.match(/\d+/g).map(Number), [a, b]);
            if (q.model.graph.axisNames.x === 'Shots on target') {
                // Football: goals are never more than shots, so the mistakes
                // move one square up, down or across instead of swapping.
                assert.ok(1 <= b && b < a && a <= 9);
                assert.equal(q.prompt, 'The blue point is one player. How many shots on target and goals did they have?');
                assert.equal(q.options.length, 4);
                assert.equal(new Set(q.options.map(choice => choice.label)).size, 4);
                for (const choice of q.options) {
                    const [x, y] = choice.label.match(/\d+/g).map(Number);
                    assert.ok(y <= x, choice.label);
                }
                const expected = [
                    [`${S.quantity(a, 'shots')} and ${S.quantity(b, 'goals')}`, `Down to ${a}, across to ${b}.`],
                    [`${S.quantity(a, 'shots')} and ${S.quantity(b + 1, 'goals')}`, "That's one square too high. Count up the side again from 0."],
                    [`${S.quantity(a, 'shots')} and ${S.quantity(b - 1, 'goals')}`, "That's one square too low. Count up the side again from 0."],
                    [`${S.quantity(a + 1, 'shots')} and ${S.quantity(b, 'goals')}`, 'Go straight down. Count the bottom axis again from 0.']
                ];
                for (const [label, feedback] of expected) {
                    assert.equal(q.options.find(choice => choice.label === label)?.feedback, feedback, label);
                }
            } else {
                const swapped = q.options.find(choice => choice.label.match(/\d+/g).map(Number).join(',') === `${b},${a}`);
                assert.equal(swapped.feedback, "That's back to front. Go down to the bottom axis first.");
            }
        } else if (type === 'read-up') {
            assert.equal(Number(q.answer), b);
            assert.equal(q.feedback, `Up from ${a} to the point, then across to ${b}.`);
            assert.equal(rule(q, a), `${a} is on the bottom axis. Go straight up to the point, then across to the side axis.`);
            for (const off of [b - 1, b + 1]) if (off !== a) assert.equal(rule(q, off), 'Count the side axis again from 0.');
        } else {
            assert.equal(q.model.points.filter(point => point[1] === b).length, 1);
            assert.equal(Number(q.answer), a);
            assert.equal(q.feedback, `Across from ${b} to the point, then down to ${a}.`);
            assert.equal(rule(q, b), `${b} is on the side axis. Go straight across to the point, then down to the bottom axis.`);
            for (const off of [a - 1, a + 1]) if (off !== b) assert.equal(rule(q, off), 'Count the bottom axis again from 0.');
        }
    }
});

test('scatter graphs: Plot marking recognises correct, swapped, one-square and existing points', () => {
    const target = [4, 7];
    const mark = value => S.markPlot(value, { target, existing: [4, 2] });
    assert.deepEqual(mark(target), { correct: true, feedback: 'Across to 4, up to 7.' });
    assert.equal(mark([7, 4]).feedback, "That's back to front. The first number, 4, goes across.");
    for (const point of [[3, 7], [5, 7], [4, 6], [4, 8]]) assert.equal(mark(point).feedback, 'Count the squares again from 0.');
    assert.equal(mark([4, 2]).feedback, "That's the point that's already there. This pair goes up to 7, so it needs its own point.");
    assert.equal(mark([1, 1]).feedback, 'Go across to 4 first, then up to 7.');
    for (const type of Q.practiceTypes.plot) for (const seed of seeds) {
        const q = build({ type, seed }), [a, b] = q.model.target;
        if (q.input === 'custom') {
            assert.equal(q.widget.mark([a, b]).correct, true);
            assert.equal(q.widget.mark([b, a]).correct, false);
            if (q.model.existing) {
                assert.equal(q.model.existing[0], a); assert.ok(Math.abs(q.model.existing[1] - b) >= 2);
                assert.ok(q.widget.mark(q.model.existing).feedback.includes("already there"));
            }
        } else {
            const index = q.options.findIndex(option => option.correct);
            assert.deepEqual(q.model.points[index], [a, b]);
            assert.ok(q.model.points.every(point => point.every(value => value >= 1 && value <= 9)));
            if (type === 'pick-point' && q.model.graph.axisNames.x === 'Shots on target') {
                // Football: one square too low instead of the made-up [b, b].
                assert.ok(2 <= b && b <= a - 2);
                const low = q.options.find(option => option.feedback === 'That one is one square too low. Count up again.');
                assert.ok(low);
                assert.deepEqual(q.model.points[q.options.indexOf(low)], [a, b - 1]);
                assert.ok(!q.options.some(option => option.feedback.includes('the number that goes up')));
            }
        }
    }
});

test('scatter graphs: Scales marking uses values, not square counts, and plot targets test unlabelled lines', () => {
    for (const type of Q.practiceTypes.scales) for (const seed of seeds) {
        const q = build({ type, seed }), m = q.model, g = m.graph;
        if (type === 'square-worth') assert.equal(Number(q.options.find(option => option.correct).label), g.step[m.axis]);
        else if (type === 'plot-scaled') {
            const [a, b] = m.target;
            assert.ok((a / g.step.x) % g.labelEvery.x !== 0 || (b / g.step.y) % g.labelEvery.y !== 0);
            assert.equal(q.widget.mark([a, b]).correct, true);
            assert.equal(q.widget.mark([a, b + g.step.y]).feedback, `One square up is ${g.step.y}. Count up to ${b}.`);
            assert.equal(q.widget.mark([a + g.step.x, b]).feedback, `One square across is ${g.step.x}. Count across to ${a}.`);
        } else {
            const [a, b] = m.target;
            assert.equal(Number(q.answer), b);
            assert.equal(rule(q, b / g.step.y), `That's the number of squares. One square is worth ${g.step.y}.`);
            assert.equal(q.feedback, `Across from ${a} to the point, then count the squares: ${b}.`);
        }
    }
    assert.equal(S.markScaledPlot([20, 10], { target: [10, 20], step: { x: 5, y: 10 } }).feedback, "That's back to front.");
});

test('scatter graphs: 500 seeds give every plot-scaled target a point a pupil can tap', () => {
    // The browser run taps the target's pixel in a 1280 x 720 window on a graph
    // that is at most 440 px wide. With ten squares on each axis the board is
    // 440 x 464 px, so every grid point is on screen and the tap lands on it.
    // A fixed 0 to 40 bottom axis was only 4 squares wide at step 10: that board
    // was 1034 px tall and a target low on it sat below the window.
    const many = Array.from({ length: 500 }, (_, index) => Math.imul(index + 1, 2654435761) >>> 0);
    for (const seed of many) {
        const q = build({ type: 'plot-scaled', seed }), m = q.model, g = m.graph;
        const [a, b] = m.target;
        assert.equal((g.x[1] - g.x[0]) / g.step.x, 10);
        assert.equal((g.y[1] - g.y[0]) / g.step.y, 10);
        assert.deepEqual(plain(g.x), [0, g.step.x * 10]);
        assert.deepEqual(plain(g.y), [0, g.step.y * 10]);
        // The target is a grid point strictly inside the axes, never on an edge.
        assert.equal(a % g.step.x, 0);
        assert.equal(b % g.step.y, 0);
        assert.ok(a > g.x[0] && a < g.x[1], `${a} across`);
        assert.ok(b > g.y[0] && b < g.y[1], `${b} up`);
        // The solver reads the two numbers off the prompt and taps that point.
        assert.deepEqual((q.prompt.match(/\d+/g) || []).map(Number), [a, b]);
        assert.equal(q.widget.mark([a, b]).correct, true);
    }
});

test('scatter graphs: the four which-graph diagrams show the table and the three specified mistakes', () => {
    for (const seed of seeds) {
        const q = build({ type: 'which-graph', seed }), m = q.model;
        assert.equal(new Set(m.graphs.map(set)).size, 4);
        for (const [index, option] of q.options.entries()) {
            const points = m.graphs[index];
            if (option.correct) assert.equal(set(points), set(m.pairs));
            else if (option.feedback.startsWith('These are back')) assert.equal(set(points), set(m.pairs.map(([x, y]) => [y, x])));
            else if (option.feedback.startsWith('The up numbers')) {
                const ys = m.pairs.map(point => point[1]).sort((a, b) => a - b);
                assert.equal(set(points), set(m.pairs.map(([x], i) => [x, ys[i]])));
            } else {
                const changed = points.filter((point, i) => key(point) !== key(m.pairs[i]));
                assert.equal(changed.length, 1);
                const index = points.indexOf(changed[0]);
                const [x, y] = changed[0], [a, b] = m.pairs[index];
                assert.ok(Math.abs(x - a) + Math.abs(y - b) >= 3);
                assert.ok(x === a || y === b);
                assert.ok(!m.pairs.some(point => key(point) === key(changed[0])));
                assert.equal(option.feedback, 'One point is in the wrong place. Check each point against its column.');
            }
        }
    }
});

test('scatter graphs: Check has five conceptual choices, locked review and the two pictures', () => {
    assert.equal(lesson.comparison.questions.length, 5);
    assert.equal(lesson.comparison.summary.points.length, 5);
    for (const [index, definition] of lesson.comparison.questions.entries()) {
        const q = Q.checkQuestion(definition, E.seededRandom(index), E);
        assert.equal(q.input, 'choice'); assert.equal(q.lockedReview, true);
        assert.equal(q.options.length, 4); assert.equal(q.options.filter(option => option.correct).length, 1);
        assert.equal(new Set(q.options.map(option => option.label)).size, 4);
        assert.equal(Boolean(q.figure), index === 1 || index === 4);
        assert.equal(lesson.assessment.question_types[q.questionType], 'scatter-graphs');
    }
});

test('scatter graphs: football goals never beat shots on target, anywhere in the lesson', () => {
    for (const [part, count] of [['read', 3], ['plot', 3], ['scales', 3], [null, 6]]) {
        for (const seed of seeds) for (const item of Q.pickPractice(part, count, E.seededRandom(seed), E)) {
            const q = build(item);
            if (q.model?.graph?.axisNames?.x !== 'Shots on target') continue;
            const points = [...(q.model.points || [])];
            if (q.model.target) points.push(q.model.target);
            if (q.model.existing) points.push(q.model.existing);
            for (const [x, y] of points) assert.ok(y <= x, `${part} ${q.questionType}: ${x} shots and ${y} goals`);
            if (q.input === 'choice') for (const option of q.options) {
                const numbers = (option.label.match(/\d+/g) || []).map(Number);
                if (numbers.length === 2) assert.ok(numbers[1] <= numbers[0], option.label);
                assert.ok(!/back to front: \d+ across/.test(option.feedback) || numbers[1] <= numbers[0]);
            }
        }
    }
});

test('scatter graphs: every read-pair prompt names its own context and no pupil reads "big point"', () => {
    const prompts = new Map();
    const strings = new Set();
    for (const seed of seeds) for (const part of ['read', 'plot', 'scales', null]) {
        for (const item of Q.pickPractice(part, part ? 3 : 6, E.seededRandom(seed), E)) {
            const q = build(item);
            strings.add(q.prompt);
            if (q.feedback) strings.add(q.feedback);
            if (q.fallback) strings.add(q.fallback);
            for (const option of q.options || []) strings.add(`${option.label} ${option.feedback}`);
            for (const rule of q.rules || []) strings.add(rule.feedback);
            if (item.type === 'read-pair') prompts.set(q.model.graph.axisNames.x, q.prompt);
        }
    }
    assert.equal(prompts.get('Hours of revision'),
        'The blue point is one pupil. How many hours did they revise, and what mark did they get?');
    assert.equal(prompts.get('Rainy days'),
        'The blue point is one week. How many rainy days and road accidents were there?');
    assert.equal(prompts.get('Shots on target'),
        'The blue point is one player. How many shots on target and goals did they have?');
    for (const text of strings) assert.doesNotMatch(text, /big point/i, text);
    for (const file of ['questions.js', 'interactive.js', 'lesson.json']) {
        const source = fs.readFileSync(path.join(__dirname, '../content/scatter-graphs', file), 'utf8');
        assert.doesNotMatch(source, /big point/i, file);
    }
});
