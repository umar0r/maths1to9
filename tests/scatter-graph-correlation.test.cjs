const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Q = require('../content/scatter-graph-correlation/questions.js');
const C = require('../content/scatter-graph-correlation/correlation.js');
const window = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/lesson-engine.js'), 'utf8'), {
    window, document: { body: { dataset: { lessonRenderer: 'custom' } } }
});
const E = window.Maths1to9LessonEngine;
const lesson = require('../content/scatter-graph-correlation/lesson.json');
const plain = value => JSON.parse(JSON.stringify(value));
const seeds = Array.from({ length: 200 }, (_, index) => Math.imul(index + 1, 2654435761) >>> 0);
const key = point => point.join(',');
const set = points => points.map(key).sort().join('|');
const build = item => Q.practiceQuestion(item, E.seededRandom(item.seed), E);
const widget = type => (Q.widgetTypes.includes(type) ? 'widget' : 'choice');
const inRanges = (value, ranges) => value.every((number, index) =>
    number >= ranges[index][0] && number <= ranges[index][1]);

const orders = {
    type: ['name-type', 'drag-type', 'name-type'],
    strength: ['name-strength', 'drag-strong', 'strongest'],
    describe: ['describe-pattern', 'finish-sentence', 'tend-not-always'],
    cause: ['cause-claim', 'cause-sort', 'cause-reason']
};

for (const part of ['type', 'strength', 'describe', 'cause']) {
    test(`correlation: ${part} Practice repeats from 200 32-bit seeds and keeps its order`, () => {
        for (const seed of seeds) {
            const items = Q.pickPractice(part, 3, E.seededRandom(seed), E);
            assert.equal(items.length, 3);
            assert.deepEqual(plain(items), plain(Q.pickPractice(part, 3, E.seededRandom(seed), E)));
            assert.deepEqual(items.map(item => item.type), orders[part]);
            for (const item of items) {
                assert.ok(Number.isInteger(item.seed) && item.seed >= 0 && item.seed <= 0xffffffff);
                assert.deepEqual(plain(build(item)), plain(build(item)));
            }
            if (part === 'type') {
                assert.notEqual(items[0].direction, items[2].direction);
                assert.ok([1, -1].includes(items[1].direction));
            }
            if (part === 'cause') {
                assert.equal(new Set(items.map(item => item.context)).size, 3);
            }
        }
    });
}

test('correlation: Mixed Practice keeps the section 10 rules over 200 seeds', () => {
    for (const seed of seeds) {
        const items = Q.pickPractice(null, 6, E.seededRandom(seed), E);
        assert.equal(items.length, 6);
        assert.deepEqual(plain(items), plain(Q.pickPractice(null, 6, E.seededRandom(seed), E)));
        const types = items.map(item => item.type);
        assert.equal(new Set(types).size, types.length, 'each chosen type is used once');
        for (const group of Object.values(Q.partTypes)) {
            assert.ok(types.some(type => group.includes(type)), `no card from ${group.join('/')}`);
        }
        const counts = types.reduce((tally, type) => ({ ...tally, [type]: (tally[type] ?? 0) + 1 }), {});
        assert.ok(Object.values(counts).every(count => count <= 2), `a type used ${Math.max(...Object.values(counts))} times`);
        assert.equal(types.filter(type => widget(type) === 'widget').length, 2, 'needs exactly two widgets');
        for (let index = 1; index < types.length; index++) {
            assert.ok(!(widget(types[index]) === 'widget' && widget(types[index - 1]) === 'widget'), 'two widgets in a row');
            if (index > 1) {
                assert.ok(!(widget(types[index]) === 'choice' && widget(types[index - 1]) === 'choice'
                    && widget(types[index - 2]) === 'choice'), 'three choice questions in a row');
            }
        }
        for (const item of items) {
            assert.deepEqual(plain(build(item)), plain(build(item)));
            if (item.type === 'name-strength') {
                assert.ok([1, -1].includes(item.direction));
                assert.ok(['strong', 'weak'].includes(item.strength));
            }
            if (item.type.startsWith('cause-')) assert.ok(item.context >= 0 && item.context <= 3);
        }
    }
});

for (const part of ['type', 'strength', 'describe', 'cause', null]) {
    test(`correlation: ${part || 'Mixed'} cards are sound: graphs, choices and feedback`, () => {
        for (const seed of seeds) {
            for (const item of Q.pickPractice(part, part ? 3 : 6, E.seededRandom(seed), E)) {
                const q = build(item);
                assert.ok(['choice', 'custom'].includes(q.input), 'no typed questions in this lesson');
                assert.equal(typeof q.prompt, 'string');
                assert.ok(!q.prompt.includes('('), `prompt has a unit: ${q.prompt}`);
                if (q.model.points) {
                    const points = q.model.points;
                    assert.equal(new Set(points.map(key)).size, points.length, 'two points in one place');
                    for (const [x, y] of points) {
                        assert.ok(x >= 0 && x <= 10 && y >= 0 && y <= 10, `point ${x},${y} outside the graph`);
                    }
                    const r = C.pearson(points);
                    assert.ok(Math.abs(r) <= 1);
                }
                if (q.input === 'choice') {
                    assert.equal(q.options.length, 4);
                    assert.equal(new Set(q.options.map(option => option.label)).size, 4);
                    assert.equal(q.options.filter(option => option.correct).length, 1);
                    for (const option of q.options) {
                        assert.ok(option.feedback.length > 0);
                        assert.notEqual(option.feedback, option.label);
                        assert.ok(!option.label.includes('('), `option has a unit: ${option.label}`);
                    }
                }
                if (q.input === 'custom') {
                    assert.equal(typeof q.widget.isEmpty, 'function');
                    assert.equal(typeof q.widget.render, 'function');
                    assert.equal(typeof q.widget.mark, 'function');
                    assert.equal(typeof q.widget.answerText, 'function');
                    assert.ok(q.widget.isEmpty(null));
                }
            }
        }
    });
}

test('correlation: pointSet keeps its r rules, including flat halves for no correlation', () => {
    for (const seed of seeds) {
        for (const direction of [1, -1]) {
            for (const strength of ['strong', 'weak']) {
                const found = C.pointSet(E.seededRandom(seed), { direction, strength, count: 9 });
                const r = C.pearson(found.points);
                assert.equal(Math.sign(r), direction);
                if (strength === 'strong') assert.ok(Math.abs(r) >= 0.9);
                else assert.ok(Math.abs(r) >= 0.45 && Math.abs(r) <= 0.75);
                assert.equal(new Set(found.points.map(key)).size, found.points.length);
                for (const [x, y] of found.points) {
                    assert.ok(x >= 1 && x <= 9 && y >= 0 && y <= 10);
                }
            }
        }
        for (const count of [8, 9]) {
            const found = C.pointSet(E.seededRandom(seed), { direction: 0, count });
            const r = C.pearson(found.points);
            assert.ok(Math.abs(r) <= 0.2, `no correlation |r| ${r}`);
            const xs = [...new Set(found.points.map(point => point[0]))].sort((a, b) => a - b);
            const middle = xs[Math.floor(xs.length / 2)];
            for (const half of [found.points.filter(([x]) => x < middle), found.points.filter(([x]) => x > middle)]) {
                if (half.length < 2) continue;
                assert.ok(Math.abs(C.pearson(half)) <= 0.5, 'half of a no-correlation set leans');
            }
        }
    }
});

test('correlation: name cards give the right answer, and each named mistake its own feedback', () => {
    for (const seed of seeds.slice(0, 40)) {
        for (const direction of [1, -1, 0]) {
            const q = build({ type: 'name-type', direction, seed });
            const right = q.options.find(option => option.correct).label;
            assert.equal(right, { 1: 'Positive correlation', '-1': 'Negative correlation', 0: 'No correlation' }[direction]);
            for (const option of q.options) {
                if (option.correct) continue;
                if (option.label === "You can't tell from a scatter graph.") {
                    assert.equal(option.feedback, 'You can. Look at whether the points go up, go down or have no pattern.');
                } else if (direction === 0) {
                    assert.equal(option.feedback, "These points don't go up or down. They're spread all over.");
                } else if (option.label === 'No correlation') {
                    assert.equal(option.feedback, 'There is a pattern: do the points go up or down?');
                } else if (direction === 1) {
                    assert.equal(option.feedback, "These points go up from left to right, so it's positive.");
                } else {
                    assert.equal(option.feedback, "These points go down from left to right, so it's negative.");
                }
            }
        }
    }
});

test('correlation: strength questions mark strong, weak, swapped and no-pattern mistakes', () => {
    for (const seed of seeds.slice(0, 40)) {
        for (const strength of ['strong', 'weak']) {
            const q = build({ type: 'name-strength', direction: 1, strength, seed });
            const right = q.options.find(option => option.correct);
            assert.equal(right.label, `${strength === 'strong' ? 'Strong' : 'Weak'} positive correlation`);
            assert.ok(right.feedback.length > 0);
            const labels = q.options.map(option => option.label);
            const swap = strength === 'strong' ? 'Weak' : 'Strong';
            assert.ok(labels.includes(swap + ' positive correlation'), labels.join(' / '));
            assert.ok(labels.includes((strength === 'strong' ? 'Strong' : 'Weak') + ' negative correlation'), labels.join(' / '));
            assert.ok(labels.includes('No correlation'));
            const no = q.options.find(option => option.label === 'No correlation');
            assert.equal(no.feedback, 'There is a clear pattern going up.');
        }
        const best = build({ type: 'strongest', seed });
        const strong = best.model.graphs.find(graph => graph.role === 'strong positive');
        const others = best.model.graphs.filter(graph => graph.role !== 'strong positive');
        assert.ok(strong && Math.abs(strong.r) > Math.max(...others.map(graph => Math.abs(graph.r))));
        assert.equal(best.options.find(option => option.correct).label,
            'ABCD'[best.model.graphs.indexOf(strong)]);
        assert.equal(best.model.graphs.find(graph => graph.role === 'weak positive').points.length, 9);
    }
});

test('correlation: drag cards mark the right place and each named mistake', () => {
    for (const seed of seeds.slice(0, 40)) {
        for (const direction of [1, -1]) {
            const dragType = build({ type: 'drag-type', direction, seed });
            const [first, second] = dragType.model.targets;
            const starts = direction === 1 ? [1, 1] : [9, 9];
            assert.equal(dragType.widget.mark([[7, starts[0]], [8, starts[1]]]).correct, false);
            assert.equal(dragType.widget.mark([[7, Math.round(first)], [8, Math.round(second)]]).correct, true);
            const wrongEnd = dragType.widget.mark([[7, starts[0]], [8, Math.round(second)]]);
            assert.equal(wrongEnd.correct, false);
            assert.equal(wrongEnd.feedback, direction === 1
                ? 'That point is too low. Positive means the points keep going up.'
                : 'That point is too high. Negative means the points keep going down.');

            const dragStrong = build({ type: 'drag-strong', direction, seed });
            const [x, p] = dragStrong.model.target;
            assert.ok(Math.abs(dragStrong.model.moved[1] - p) >= 4, 'the blue point starts well off the pattern');
            assert.equal(dragStrong.widget.mark([[x, Math.round(p)]]).correct, true);
            const wrong = dragStrong.widget.mark([[x, dragStrong.model.moved[1]]]);
            assert.equal(wrong.correct, false);
            assert.equal(wrong.feedback, 'That point is still a long way from the others. Move it so it fits the pattern.');
        }
    }
});

test('correlation: Describe cards accept both right wordings and reject the wrong pair', () => {
    for (const seed of seeds.slice(0, 40)) {
        for (const direction of [1, -1]) {
            const pattern = build({ type: 'describe-pattern', direction, seed });
            const right = pattern.options.find(option => option.correct);
            const back = pattern.options.find(option => option.label === pattern.model.back);
            assert.ok(right.label, 'describe-pattern needs a right sentence');
            assert.ok(back, 'describe-pattern needs the back-to-front sentence');
            assert.ok(pattern.options.some(option => /is about the same every time\.$/.test(option.label)));
            assert.ok(pattern.options.some(option => option.label.startsWith("There's no link between ")));

            const always = build({ type: 'tend-not-always', direction, seed });
            const alwaysOption = always.options.find(option => option.label === always.model.always);
            assert.ok(alwaysOption, 'tend-not-always needs the always sentence');
            assert.equal(alwaysOption.feedback, 'Not every point fits the pattern, so "always" is wrong.');
            assert.ok(always.options.some(option => option.label === always.model.back));

            const sentence = build({ type: 'finish-sentence', direction, seed });
            const [first, second] = sentence.model.sentence.pairs[0].values;
            assert.equal(sentence.widget.mark([first, second]).correct, true);
            assert.equal(sentence.widget.mark(sentence.model.sentence.pairs[1].values).correct, true);
            const mixed = [first, sentence.model.sentence.gaps[1].find(word => word !== second)];
            const verdict = sentence.widget.mark(mixed);
            assert.equal(verdict.correct, false);
            assert.equal(verdict.feedback, sentence.model.sentence.wrong);
        }
    }
});

test('correlation: Cause cards use the table sentences and mark the cause mistakes', () => {
    for (const seed of seeds.slice(0, 40)) {
        const items = Q.pickPractice('cause', 3, E.seededRandom(seed), E);
        for (const item of items) {
            const context = Q.causeContexts[item.context];
            const q = build(item);
            if (item.type === 'cause-claim') {
                assert.ok(q.options.find(option => option.correct).label
                    .endsWith("tend to go up together, but that doesn't prove one causes the other."));
                const cause = q.options.find(option => option.label === context.cause);
                assert.equal(cause.feedback, "The graph shows they go together. It can't show that one causes the other.");
            }
            if (item.type === 'cause-reason') {
                assert.equal(q.options.find(option => option.correct).label, context.reason);
                assert.ok(q.options.some(option => option.label === context.backwards));
                assert.ok(q.options.some(option => option.label === 'Nothing. One of them must cause the other.'));
            }
            if (item.type === 'cause-sort') {
                const expected = new Set([context.shows[0], context.shows[1], context.cause, context.cantTwo]);
                assert.equal(q.model.cards.length, 4);
                for (const card of q.model.cards) assert.ok(expected.has(card.label), card.label);
                const shows = q.model.cards.filter(card => card.bin === 'shows');
                const cant = q.model.cards.filter(card => card.bin === 'cant');
                assert.equal(shows.length, 2);
                assert.equal(cant.length, 2);
                assert.equal(q.widget.mark({ placed: { shows: shows.map(card => card.id), cant: cant.map(card => card.id) } }).correct, true);
                const swapped = q.widget.mark({ placed: { shows: [shows[0].id, cant[0].id], cant: [shows[1].id, cant[1].id] } });
                assert.equal(swapped.correct, false);
                assert.equal(swapped.feedback,
                    'Two sentences say what the graph shows. The other two say one thing causes the other, which the graph can\'t prove.');
                assert.ok(q.figure, 'cause-sort shows the context graph');
            }
        }
    }
});

test('correlation: Try it ranges accept the spec examples and reject the named mistakes', () => {
    const [positive, negative] = C.tryIt.typeDragScreens;
    assert.deepEqual(positive.ranges, [[5, 9], [6, 10]]);
    assert.ok(inRanges([5, 6], positive.ranges), 'positive accepts 7 to 5 and 8 to 6');
    assert.ok(!inRanges([4, 6], positive.ranges), 'positive rejects 7 to 4');
    assert.deepEqual(negative.ranges, [[1, 5], [0, 4]]);
    assert.ok(inRanges([5, 4], negative.ranges));
    assert.ok(!inRanges([6, 4], negative.ranges));
    assert.equal(positive.tooLow, 'That point is too low. The points go up, so it needs to be higher than the ones to its left.');
    assert.equal(positive.tooHigh, "That's a big jump. Keep it close to the other points.");
    assert.equal(negative.tooHigh, 'That point is too high. The points go down, so it needs to be lower than the ones to its left.');
    assert.equal(negative.tooLow, "That's a big drop. Keep it close to the other points.");

    const strong = C.tryIt.strengthDrag;
    assert.deepEqual(strong.ranges, [[2, 4], [6, 8]]);
    assert.ok(inRanges([2, 6], strong.ranges));
    assert.ok(!inRanges([5, 6], strong.ranges));
    assert.equal(strong.wrong, 'That point is still a long way from the others. Move it so it fits the pattern.');

    const [gardens, cars] = C.tryIt.describeScreens;
    assert.deepEqual(gardens.sentence.pairs[0].values, ['Longer', 'more']);
    assert.deepEqual(gardens.sentence.pairs[1].values, ['Shorter', 'less']);
    assert.equal(C.sentencePair(gardens.sentence, ['Longer', 'less']), null);
    assert.deepEqual(cars.sentence.pairs[0].values, ['Older', 'less']);

    const causeCards = C.tryIt.causeSort.cards;
    assert.equal(causeCards.filter(card => card.bin === 'shows').length, 2);
    assert.equal(causeCards.filter(card => card.bin === 'cant').length, 2);
    assert.equal(C.tryIt.causeSort.slots.length, 2);
    assert.equal(C.tryIt.typeSort.slots.map(slot => slot.id).join(','), 'negative,none,positive');
    assert.equal(C.tryIt.strengthSort.slots.map(slot => slot.id).join(','),
        'strong-positive,weak-negative,weak-positive,strong-negative');
});

test('correlation: Check has five conceptual questions, locked review and the spec pictures', () => {
    assert.equal(lesson.comparison.questions.length, 5);
    assert.equal(lesson.comparison.summary.points.length, 5);
    assert.equal(lesson.comparison.summary.title, "What you've learned");
    const skills = ['recognise-correlation', 'recognise-correlation', 'recognise-correlation',
        'recognise-correlation', 'correlation-not-causation'];
    for (const [index, definition] of lesson.comparison.questions.entries()) {
        const q = Q.checkQuestion(definition, E.seededRandom(index), E);
        assert.equal(q.input, 'choice');
        assert.equal(q.lockedReview, true);
        assert.equal(q.options.length, 4);
        assert.equal(new Set(q.options.map(option => option.label)).size, 4);
        assert.equal(q.options.filter(option => option.correct).length, 1);
        assert.equal(q.options.find(option => option.correct).label, definition.correct);
        assert.ok(q.options.every(option => option.feedback.length > 0));
        assert.equal(lesson.assessment.question_types[q.questionType], skills[index]);
        assert.equal(Boolean(q.figure), [false, true, true, true, false][index]);
    }
    assert.ok(lesson.comparison.questions[4].wrong.some(option =>
        option.label === 'Selling less hot chocolate would stop people buying gloves.'));
    assert.deepEqual(lesson.score_activities.map(activity => activity.id), [
        'step:interactive--type:0', 'step:interactive--type:1', 'step:interactive--type:2',
        'step:interactive--strength:0', 'step:interactive--strength:1',
        'step:interactive--describe:0', 'step:interactive--describe:1', 'step:interactive--cause:0'
    ]);
});
