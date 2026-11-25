const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Q = require('../content/scatter-graph-outliers/questions.js');
const O = require('../content/scatter-graph-outliers/outliers.js');

const window = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/lesson-engine.js'), 'utf8'), {
    window, document: { body: { dataset: { lessonRenderer: 'custom' } } }
});
const E = window.Maths1to9LessonEngine;
const lesson = require('../content/scatter-graph-outliers/lesson.json');

const plain = value => JSON.parse(JSON.stringify(value));
const seeds = Array.from({ length: 200 }, (_, index) => Math.imul(index + 1, 2654435761) >>> 0);
const key = point => point.join(',');
const build = item => Q.practiceQuestion(item, E.seededRandom(item.seed), E);
const orders = {
    spot: ['which-outlier', 'tap-outlier', 'which-outlier'],
    read: ['read-value', 'which-pair', 'read-value'],
    reason: ['reason-choice', 'reason-sort', 'reason-choice'],
    ignore: ['ignore-type', 'ignore-sort', 'ignore-reply']
};
const pupilText = question => [
    question.prompt,
    ...(question.options || []).flatMap(option => [option.label, option.feedback]),
    question.feedback || '',
    question.fallback || ''
].join(' ');

for (const part of ['spot', 'read', 'reason', 'ignore']) {
    test(`outliers: ${part} Practice keeps its order and repeats from 200 32-bit seeds`, () => {
        for (const seed of seeds) {
            const items = Q.pickPractice(part, 3, E.seededRandom(seed), E);
            assert.equal(items.length, 3);
            assert.deepEqual(plain(items), plain(Q.pickPractice(part, 3, E.seededRandom(seed), E)));
            assert.deepEqual(items.map(item => item.type), orders[part]);
            for (const item of items) {
                assert.ok(Number.isInteger(item.seed) && item.seed >= 0 && item.seed <= 0xffffffff);
                assert.ok(O.contextIds.includes(item.context));
                assert.deepEqual(plain(build(item)), plain(build(item)));
            }
            if (part === 'spot') assert.notEqual(items[0].context, items[2].context);
            if (part === 'reason') assert.notEqual(items[0].context, items[2].context);
            if (part === 'read') {
                assert.notEqual(items[0].context, items[2].context);
                assert.notEqual(items[0].axis, items[2].axis);
            }
            if (part === 'ignore') {
                assert.notEqual(items[0].context, items[2].context);
                assert.notEqual(items[1].context, items[0].context);
                assert.notEqual(items[1].context, items[2].context);
                assert.ok(['revision', 'sunshine'].includes(items[1].context));
            }
        }
    });
}

test('outliers: Mixed Practice keeps the section 10 rules over 200 seeds', () => {
    for (const seed of seeds) {
        const items = Q.pickMixed(6, E.seededRandom(seed), E);
        assert.equal(items.length, 6);
        assert.deepEqual(plain(items), plain(Q.pickMixed(6, E.seededRandom(seed), E)));
        const types = items.map(item => item.type);
        for (const group of Object.values(Q.partTypes)) {
            assert.ok(types.some(type => group.includes(type)), `no card from ${group.join('/')}`);
        }
        const counts = types.reduce((tally, type) => ({ ...tally, [type]: (tally[type] ?? 0) + 1 }), {});
        assert.ok(Object.values(counts).every(count => count <= 2), 'a type is used more than twice');
        assert.equal(types.filter(type => Q.typeInfo[type].widget).length, 2, 'needs exactly two hands-on cards');
        assert.ok(types.includes('read-value'), 'needs a typed card');
        for (let index = 1; index < types.length; index++) {
            assert.ok(!(Q.typeInfo[types[index]].widget && Q.typeInfo[types[index - 1]].widget), 'two hands-on in a row');
            if (index > 1) {
                assert.ok(!(Q.typeInfo[types[index]].choice && Q.typeInfo[types[index - 1]].choice
                    && Q.typeInfo[types[index - 2]].choice), 'three choice cards in a row');
            }
        }
        for (const item of items) {
            assert.ok(O.contextIds.includes(item.context));
            assert.deepEqual(plain(build(item)), plain(build(item)));
        }
    }
});

for (const part of ['spot', 'read', 'reason', 'ignore', null]) {
    test(`outliers: ${part || 'Mixed'} cards are sound: graphs, choices and feedback`, () => {
        for (const seed of seeds.slice(0, 60)) {
            for (const item of Q.pickPractice(part, part ? 3 : 6, E.seededRandom(seed), E)) {
                const question = build(item);
                assert.equal(typeof question.prompt, 'string');
                assert.ok(question.prompt.length > 0);
                const text = pupilText(question);
                assert.ok(!/\(\d/.test(text), `bracketed numbers: ${text}`);
                assert.ok(!/\bcross\b/i.test(text), `"cross" in ${text}`);
                assert.ok(!/\btrend\b/i.test(text), `"trend" in ${text}`);
                if (question.input === 'choice') {
                    assert.equal(question.options.length, 4);
                    assert.equal(new Set(question.options.map(option => option.label)).size, 4);
                    assert.equal(question.options.filter(option => option.correct).length, 1);
                    for (const option of question.options) {
                        assert.ok(option.feedback.length > 0);
                        assert.notEqual(option.feedback, option.label);
                    }
                }
                if (question.input === 'custom') {
                    for (const method of ['isEmpty', 'render', 'mark', 'answerText']) {
                        assert.equal(typeof question.widget[method], 'function', `widget has no ${method}`);
                    }
                    assert.ok(question.widget.isEmpty(null));
                }
                if (question.questionType === 'read-value') {
                    assert.match(question.answer, /^\d+$/);
                    assert.ok(question.feedback.length > 0);
                    assert.ok(question.fallback.length > 0);
                    assert.ok(Array.isArray(question.rules));
                }
            }
        }
    });
}

test('outliers: outlierSet keeps the section 5 rules over 200 seeds', () => {
    for (const seed of seeds) {
        for (const id of O.contextIds) {
            const context = O.contexts[id];
            const set = O.outlierSet(E.seededRandom(seed), id);
            const [x, y] = set.outlier;
            assert.equal(set.main.length, 8);
            const r = O.pearson(set.main);
            assert.equal(Math.sign(r), context.direction);
            assert.ok(Math.abs(r) >= 0.9, `main r ${r}`);
            const pattern = set.c + context.direction * set.m * x;
            const gap = context.direction === 1 ? pattern - y : y - pattern;
            assert.ok(gap >= 5, `outlier is ${gap} from the pattern`);
            assert.notEqual(x, y);
            assert.ok(x >= 3 && x <= 8);
            for (const [px, py] of [...set.main, set.outlier]) {
                assert.ok(px >= 0 && px <= 10 && py >= 0 && py <= 10, `point ${px},${py} outside the graph`);
            }
            assert.equal(new Set([...set.main, set.outlier].map(key)).size, 9);
            assert.ok(set.main.some(point => key(point) === key(set.highest)));
            assert.ok(set.main.some(point => key(point) === key(set.lowest)));
            assert.ok(set.highest[1] >= set.lowest[1]);
        }
    }
});

test('outliers: which-outlier letters name the four kinds of point', () => {
    const tips = {
        outlier: "Yes. It's the one point that doesn't fit the pattern.",
        highest: 'That point is high, but it fits the pattern.',
        lowest: 'That point is low, but it fits the pattern.',
        middle: 'That point sits in the main group. Look for the one away from the others.'
    };
    for (const seed of seeds.slice(0, 60)) {
        for (const id of O.contextIds) {
            const question = build({ type: 'which-outlier', context: id, seed });
            // The engine shuffles in its own realm, so compare as text.
            assert.equal(question.options.map(option => option.label).join(','), 'A,B,C,D');
            const roles = question.model.roles;
            assert.equal(roles.length, 4);
            assert.equal(new Set(roles.map(role => key(role.point))).size, 4);
            assert.equal(roles.map(role => role.role).sort().join(','), 'highest,lowest,middle,outlier');
            roles.forEach((role, index) => {
                const option = question.options[index];
                assert.equal(option.correct, role.role === 'outlier');
                assert.equal(option.feedback, tips[role.role]);
            });
            assert.equal(question.options.find(option => option.correct).label,
                'ABCD'[roles.findIndex(role => role.role === 'outlier')]);
        }
    }
});

test('outliers: read-value asks for one axis and names each mistake', () => {
    for (const seed of seeds.slice(0, 60)) {
        for (const id of O.contextIds) {
            const context = O.contexts[id];
            for (const axis of ['x', 'y']) {
                const question = build({ type: 'read-value', context: id, axis, seed });
                const set = question.model.set;
                const [x, y] = set.outlier;
                const answer = axis === 'x' ? x : y;
                const other = axis === 'x' ? y : x;
                assert.equal(question.answer, String(answer));
                assert.equal(question.feedback, `Yes. The outlier shows ${context.words([x, y])}.`);
                const swapped = question.rules.find(rule => rule.value === String(other));
                assert.ok(swapped, 'no rule for the other axis value');
                assert.match(swapped.feedback, /This question asks for the /);
                assert.ok(swapped.feedback.includes(context.axisWords[axis]));
                assert.ok(question.fallback.includes(axis === 'x' ? 'down to the bottom axis' : 'across to the side axis'));
            }
        }
    }
});

test('outliers: which-pair offers the outlier, the swapped pair and two fitting points', () => {
    for (const seed of seeds.slice(0, 60)) {
        for (const id of O.contextIds) {
            const context = O.contexts[id];
            const question = build({ type: 'which-pair', context: id, seed });
            const set = question.model.set;
            const [x, y] = set.outlier;
            const labels = question.options.map(option => option.label);
            assert.equal(new Set(labels).size, 4);
            assert.ok(labels.includes(context.words([x, y])));
            assert.ok(labels.includes(context.words([y, x])));
            const right = question.options.find(option => option.correct);
            assert.equal(right.label, context.words([x, y]));
            assert.equal(right.feedback, "Yes. That's the point away from the others.");
            const swapped = question.options.find(option => option.label === context.words([y, x]));
            assert.equal(swapped.feedback, 'Those numbers are the wrong way round. Read the bottom axis first.');
        }
    }
});

test('outliers: reason cards use the table, and both reason sorts mark the right bins', () => {
    const goes = { revision: 'up', sunshine: 'up', heating: 'down' };
    for (const seed of seeds.slice(0, 60)) {
        for (const id of O.contextIds) {
            const table = O.reasonSets[id];
            const choice = build({ type: 'reason-choice', context: id, seed });
            const right = choice.options.find(option => option.correct);
            assert.ok([...table.unusual, ...table.wrong].includes(right.label));
            assert.equal(right.feedback, "Yes. That could explain one point that doesn't fit.");
            const backwards = choice.options.find(option => option.label === {
                revision: 'Revising more makes your mark go down.',
                sunshine: 'Sunny days make people buy fewer ice creams.',
                heating: 'Warmer days make people use more heating.'
            }[id]);
            assert.ok(backwards, 'no pattern-turned-round option');
            assert.equal(backwards.feedback,
                `One point can't change the pattern. The other points still go ${goes[id]}.`);
            assert.ok(choice.options.some(option => option.label === 'All the other points must be wrong.'));
            assert.ok(choice.options.some(option => option.label === 'There must be no correlation.'));

            const sort = build({ type: 'reason-sort', context: id, seed });
            assert.deepEqual(sort.model.cards.map(card => card.label),
                [table.unusual[0], table.unusual[1], table.wrong[0], table.wrong[1]]);
            const unusual = sort.model.cards.filter(card => card.bin === 'unusual');
            const wrong = sort.model.cards.filter(card => card.bin === 'wrong');
            assert.equal(unusual.length, 2);
            assert.equal(wrong.length, 2);
            assert.equal(sort.widget.mark({
                placed: { unusual: unusual.map(card => card.id), wrong: wrong.map(card => card.id) }
            }).correct, true);
            const mixed = sort.widget.mark({
                placed: { unusual: [unusual[0].id, wrong[0].id], wrong: [unusual[1].id, wrong[1].id] }
            });
            assert.equal(mixed.correct, false);
            assert.equal(mixed.feedback,
                'Two reasons mean something unusual really happened. The other two mean the data was written down wrong.');
        }
    }
});

test('outliers: Ignore cards swap their words for heating and mark the right graphs', () => {
    for (const seed of seeds.slice(0, 60)) {
        for (const id of O.contextIds) {
            const negative = O.contexts[id].direction === -1;
            const word = negative ? 'negative' : 'positive';
            const goes = negative ? 'down' : 'up';

            const type = build({ type: 'ignore-type', context: id, seed });
            const right = type.options.find(option => option.correct);
            assert.equal(right.label, `${negative ? 'Negative' : 'Positive'} correlation`);
            assert.equal(right.feedback, `Yes. Ignore the outlier: the other points go ${goes}.`);
            assert.ok(type.options.some(option => option.label === 'No correlation'));
            assert.ok(type.options.some(option => option.label === "You can't tell, because of the outlier."));

            const reply = build({ type: 'ignore-reply', context: id, seed });
            const yes = reply.options.find(option => option.correct);
            assert.equal(yes.label, `Ignore the outlier. The other points still show ${word} correlation.`);
            assert.equal(yes.feedback, "Yes. One point that doesn't fit can't stop the pattern.");
            assert.equal(reply.options.find(option => option.label === 'They\'re right. An outlier means there is no correlation.').feedback,
                `One point can't stop a pattern. The other points still go ${goes}.`);
            assert.ok(reply.options.some(option => option.label
                === `Ignoring the outlier leaves ${negative ? 'positive' : 'negative'} correlation.`));

            const sort = build({ type: 'ignore-sort', context: id === 'heating' ? 'revision' : id, seed });
            const contexts = sort.model.contexts;
            assert.equal(contexts.length, 2);
            assert.ok(contexts.includes('heating'));
            assert.ok(['revision', 'sunshine'].includes(contexts.find(context => context !== 'heating')));
            assert.deepEqual(sort.widget.mark({ placed: { positive: ['positive'], negative: ['negative'] } }).correct, true);
            assert.equal(sort.widget.mark({ placed: { positive: ['negative'], negative: ['positive'] } }).correct, false);
            assert.equal(sort.widget.mark({ placed: { positive: ['none'], negative: [] } }).correct, false);
            assert.equal(sort.widget.mark({ placed: { positive: ['positive'], negative: ['negative'] } }).feedback,
                'Ignore the outlier, and the pattern of the others tells you the correlation.');
        }
    }
});

test('outliers: tap-outlier marks the right point and every other one', () => {
    for (const seed of seeds.slice(0, 40)) {
        const question = build({ type: 'tap-outlier', context: 'heating', seed });
        const set = question.model.set;
        const right = question.widget.mark(set.outlier);
        assert.equal(right.correct, true);
        assert.equal(right.feedback, "Yes. That's the point that doesn't fit the pattern.");
        const wrong = question.widget.mark(set.highest);
        assert.equal(wrong.correct, false);
        assert.equal(wrong.feedback, 'That point fits the pattern. The outlier is the one away from the others.');
        assert.equal(question.widget.answerText(set.outlier),
            `You tapped the point for ${O.contexts.heating.words(set.outlier)}.`);
        assert.ok(question.widget.isEmpty(null));
        assert.ok(!question.widget.isEmpty(set.outlier));
    }
});

test('outliers: Try it answers and words match the spec', () => {
    assert.deepEqual(O.tryIt.spot.answer, [9, 7]);
    assert.deepEqual(O.tryIt.spot.wrong, [8, 3]);
    assert.ok(O.sets.HEATING.main.some(point => key(point) === key(O.tryIt.spot.wrong)), 'the wrong tap is a real point');
    assert.deepEqual(O.tryIt.spot.answer, O.sets.HEATING.outlier);
    assert.equal(O.tryIt.spot.right, 'Yes. The other points go down, but this one sits far above them.');
    assert.equal(O.tryIt.spot.fitsPattern, 'That point fits the pattern. Find the one away from the others.');
    assert.equal(O.tryIt.spot.offPoint, "There's no point there. Tap one of the points.");

    // Try it 2: the far point is real but still fits the pattern.
    assert.deepEqual(O.tryIt.spot.second.extra, [10, 10]);
    assert.deepEqual(O.tryIt.spot.second.answer, [8, 2]);
    assert.deepEqual(O.tryIt.spot.second.answer, O.sets.REVISION.outlier);
    assert.ok(!O.sets.REVISION.main.some(point => key(point) === key(O.tryIt.spot.second.extra)),
        'the extra point is not already in the revision set');
    assert.equal(O.tryIt.spot.second.right,
        'Yes. This pupil revised for 8 hours but only got 2 marks. The pupil who revised for 10 hours is far away too, but fits the pattern.');
    assert.equal(O.tryIt.spot.second.farPoint,
        "That point is far from the others, but it still fits the pattern. More revision, higher mark. Find the point that doesn't fit.");
    assert.equal(O.tryIt.spot.second.fitsPattern, 'That point fits the pattern. Find the one away from the others.');
    assert.equal(O.tryIt.spot.second.offPoint, "There's no point there. Tap one of the points.");

    assert.equal(O.tryIt.read.sunshine.bottom, 7);
    assert.equal(O.tryIt.read.sunshine.side, 1);
    assert.deepEqual([O.tryIt.read.sunshine.bottom, O.tryIt.read.sunshine.side], O.sets.SUNSHINE.outlier);
    assert.equal(O.tryIt.read.heating.side, 7);
    assert.equal(O.tryIt.read.heating.wrongSide, 9);
    assert.match(O.tryIt.read.heating.otherAxis, /temperature, on the bottom axis/);
    assert.equal(O.tryIt.read.heating.right, 'Yes. The outlier shows 7 kWh of heating.');
    assert.deepEqual(O.tryIt.read.headings, [
        'Find the outlier. Tap the bottom axis right under it.',
        'How much heating does the outlier show? Tap the number on the side axis.'
    ]);
    assert.equal(O.tryIt.read.hints.bottomAxis, 'Tap on the bottom axis, the line along the bottom.');
    assert.equal(O.tryIt.read.hints.sideAxis, 'Tap on the side axis, the line up the left.');

    assert.equal(O.reasonCards('sunshine').length, 4);
    assert.equal(O.reasonSlots().length, 2);
    assert.equal(O.ignoreCards.length, 3);
    assert.equal(O.ignoreHint('sunshine', 'none'), "One outlier doesn't stop the pattern. Ignore it and look at the other points.");
    assert.equal(O.ignoreHint('sunshine', 'negative'), 'Ignore the outlier. The other points go up.');
    assert.equal(O.ignoreHint('heating', 'positive'), 'Ignore the outlier. The other points go down.');
});

test('outliers: Check has five conceptual questions, locked review and the spec pictures', () => {
    assert.equal(lesson.comparison.questions.length, 5);
    assert.equal(lesson.comparison.summary.points.length, 5);
    assert.equal(lesson.comparison.summary.title, "What you've learned");
    const meaning = lesson.comparison.questions[0];
    assert.deepEqual(meaning.wrong.map(entry => entry.label), [
        'The highest point on the graph.',
        'A point far away from the other points.',
        'A point that shows there is no correlation.'
    ]);
    assert.equal(meaning.wrong[1].feedback,
        "A point can be far from the others and still fit the pattern. An outlier is the one that doesn't fit.");
    const pictures = ['', 'sunshine', 'revision', '', 'heating'];
    for (const [index, definition] of lesson.comparison.questions.entries()) {
        const question = Q.checkQuestion(definition, E.seededRandom(index), E);
        assert.equal(question.input, 'choice');
        assert.equal(question.lockedReview, true);
        assert.equal(question.options.length, 4);
        assert.equal(new Set(question.options.map(option => option.label)).size, 4);
        assert.equal(question.options.filter(option => option.correct).length, 1);
        assert.equal(question.options.find(option => option.correct).label, definition.correct);
        assert.ok(question.options.every(option => option.feedback.length > 0));
        assert.equal(lesson.assessment.question_types[question.questionType], 'scatter-outliers');
        assert.equal(Boolean(question.figure), Boolean(pictures[index]), `question ${index + 1} picture`);
    }
    assert.deepEqual(lesson.score_activities.map(activity => activity.id), [
        'step:interactive--spot:0', 'step:interactive--spot:1',
        'step:interactive--read:0', 'step:interactive--read:1',
        'step:interactive--reason:0', 'step:interactive--ignore:0'
    ]);
    assert.ok(lesson.score_activities.every(activity => activity.kind === 'guided'));
    assert.deepEqual(lesson.parts.map(part => part.id), ['spot', 'read', 'reason', 'ignore']);
    assert.equal(lesson.question_bank.session_length, 6);
    assert.ok(lesson.parts.every(part => part.question_bank.session_length === 3));
});
