const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Q = require('../content/lines-of-best-fit/questions.js');
const B = require('../content/lines-of-best-fit/best-fit.js');

const window = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/lesson-engine.js'), 'utf8'), {
    window, document: { body: { dataset: { lessonRenderer: 'custom' } } }
});
const E = window.Maths1to9LessonEngine;

const seeds = Array.from({ length: 200 }, (_, index) => Math.imul(index + 1, 2654435761) >>> 0);
const build = item => Q.practiceQuestion(item, E.seededRandom(item.seed), E);
const plain = value => JSON.parse(JSON.stringify(value));
const lineKey = line => `${line.from.join(',')}-${line.to.join(',')}`;
const endsOnGrid = line => [line.from, line.to]
    .every(([x, y]) => x >= 0 && x <= 10 && y >= 0 && y <= 10);
const pointsOnGrid = points => points.every(([x, y]) => x >= 0 && x <= 10 && y >= 0 && y <= 10);

const revision = B.contexts.revision;
const sunshine = B.contexts.sunshine;
const heating = B.contexts.heating;
const revisionFit = B.leastSquares(revision.set.main);
const heatingFit = B.leastSquares(heating.set.main);

test('lines of best fit: judgeLine calls the three fixed lines ok', () => {
    assert.equal(B.judgeLine(B.lines.REVISION_LINE, revision.set.main, revisionFit), 'ok');
    assert.equal(B.judgeLine(B.lines.SUNSHINE_LINE, sunshine.set.main,
        B.leastSquares(sunshine.set.main)), 'ok');
    assert.equal(B.judgeLine({ from: [0, 10], to: [10, 1] }, heating.set.main, heatingFit), 'ok');
});

test('lines of best fit: judgeLine names a pulled line, and a line that is too short', () => {
    // Heating: the outlier is 9 °C and 7 kWh. This line is pulled up to it.
    const pulled = { from: [0, 10], to: [10, 3] };
    assert.equal(B.judgeLine(pulled, heating.set.main, heatingFit, heating.set.outlier), 'pulled');
    assert.equal(B.judgeLine({ from: [0, 1], to: [5, 5] }, revision.set.main, revisionFit), 'short');
});

test('lines of best fit: judgeLine names the wrong way round, too high and too low', () => {
    assert.equal(B.judgeLine({ from: [0, 9], to: [10, 1] }, revision.set.main, revisionFit), 'direction');
    assert.equal(B.judgeLine({ from: [0, 1], to: [10, 9.6] }, heating.set.main, heatingFit), 'direction');
    assert.equal(B.judgeLine({ from: [0, 3], to: [10, 11] }, revision.set.main, revisionFit), 'high');
    assert.equal(B.judgeLine({ from: [0, -1], to: [10, 7] }, revision.set.main, revisionFit), 'low');
});

test('lines of best fit: every fitLine passes judgeLine as ok over 200 32-bit seeds', () => {
    const sample = E.seededRandom(0x4c4f4246);
    for (const seed of seeds) {
        const random = E.seededRandom(seed);
        for (const context of B.contextIds) {
            const set = B.outlierSet(E.seededRandom(Math.floor(sample() * 2 ** 32)), context);
            const fitted = B.fitLine(random, set);
            assert.equal(fitted.result, 'ok', `${context}, seed ${seed}`);
            assert.ok(endsOnGrid(fitted.line), `${context}'s line leaves the graph`);
            assert.equal(B.judgeLine(fitted.line, set.main, fitted.fit, set.outlier), 'ok');
        }
        const loose = B.pointSet(random, { direction: 1, strength: 'strong', count: 9 });
        const fitted = B.fitLine(random, loose);
        assert.equal(fitted.result, 'ok', `loose set, seed ${seed}`);
        assert.ok(endsOnGrid(fitted.line));
    }
});

test('lines of best fit: Draw Practice keeps its order and repeats over 200 seeds', () => {
    for (const seed of seeds) {
        const items = Q.pickPractice('draw', 3, E.seededRandom(seed), E);
        assert.equal(items.length, 3);
        assert.deepEqual(plain(items), plain(Q.pickPractice('draw', 3, E.seededRandom(seed), E)));
        assert.deepEqual(items.map(item => item.type), ['best-line', 'draw-best', 'best-line']);
        assert.notEqual(items[0].context, items[2].context);
        for (const item of items) {
            assert.ok(B.contextIds.includes(item.context));
            assert.ok(Number.isInteger(item.seed) && item.seed >= 0 && item.seed <= 0xffffffff);
            assert.deepEqual(plain(build(item)), plain(build(item)));
        }
    }
});

test('lines of best fit: Ignore Practice keeps its order and repeats over 200 seeds', () => {
    for (const seed of seeds) {
        const items = Q.pickPractice('ignore', 3, E.seededRandom(seed), E);
        assert.deepEqual(items.map(item => item.type), ['outlier-line', 'draw-best', 'outlier-line']);
        assert.notEqual(items[0].context, items[2].context);
        assert.equal(items[1].outlier, true);
        for (const item of items) assert.ok(B.contextIds.includes(item.context));
    }
});

test('lines of best fit: every best-line card has four different lines and one right answer', () => {
    for (const seed of seeds) {
        for (const item of Q.pickPractice('draw', 3, E.seededRandom(seed), E)
            .filter(entry => entry.type === 'best-line')) {
            const card = Q.practiceQuestion(item, E.seededRandom(item.seed), E);
            assert.equal(card.prompt, 'Which graph shows the line of best fit?');
            assert.equal(card.options.length, 4);
            assert.equal(card.options.map(option => option.label).join(''), 'ABCD');
            assert.equal(card.options.filter(option => option.correct).length, 1);
            for (const option of card.options) {
                assert.ok(option.feedback.length > 10);
                assert.notEqual(option.feedback, option.label);
            }
            const lines = card.model.lines;
            assert.equal(lines.length, 4);
            assert.equal(new Set(lines.map(lineKey)).size, 4, 'two of the four lines are the same');
            assert.ok(lines.every(endsOnGrid));
            assert.ok(pointsOnGrid(card.model.points));
            const right = lines[card.model.correctIndex];
            assert.equal(card.options[card.model.correctIndex].label, 'ABCD'[card.model.correctIndex]);
            const fit = B.leastSquares(card.model.points);
            assert.equal(B.judgeLine(right, card.model.points, fit), 'ok');
        }
    }
});

test('lines of best fit: every outlier-line card has four different lines and one right answer', () => {
    for (const seed of seeds) {
        for (const item of Q.pickPractice('ignore', 3, E.seededRandom(seed), E)
            .filter(entry => entry.type === 'outlier-line')) {
            const card = Q.practiceQuestion(item, E.seededRandom(item.seed), E);
            assert.equal(card.options.length, 4);
            assert.equal(card.options.filter(option => option.correct).length, 1);
            const lines = card.model.lines;
            assert.equal(new Set(lines.map(lineKey)).size, 4, 'two of the four lines are the same');
            assert.ok(lines.every(endsOnGrid));
            const right = lines[card.model.correctIndex];
            assert.equal(card.options[card.model.correctIndex].label, 'ABCD'[card.model.correctIndex]);
            const fit = B.leastSquares(card.model.main);
            assert.equal(B.judgeLine(right, card.model.main, fit, card.model.outlierPoint), 'ok');
        }
    }
});

test('lines of best fit: draw-best marks the fitted line right and a pulled line wrong', () => {
    const item = { type: 'draw-best', context: 'heating', outlier: true, seed: 7 };
    const card = build(item);
    assert.equal(card.input, 'custom');
    assert.equal(card.prompt, 'Draw a line of best fit.');
    for (const name of ['render', 'isEmpty', 'mark', 'answerText']) {
        assert.equal(typeof card.widget[name], 'function', name);
    }
    assert.equal(card.widget.isEmpty(null), true);
    assert.equal(card.widget.mark(card.model.right).correct, true);
    assert.equal(card.widget.mark(card.model.right).feedback,
        'Yes. Your line ignores the outlier and follows the other points.');
    const pulled = card.widget.mark({ from: [0, 10], to: [10, 3] });
    assert.equal(pulled.correct, false);
    assert.equal(pulled.feedback,
        'Your line has been pulled towards the outlier. Ignore it and go through the middle of the other points.');
    assert.equal(card.widget.mark({ from: [0, 1], to: [2, 1] }).feedback,
        'Make your line reach across all the points.');
    assert.equal(card.widget.mark({ from: [0, 1], to: [10, 9] }).feedback,
        'The points go down, so your line must go down too.');
});

test('lines of best fit: Draw says what each wrong line needs, in the spec words', () => {
    assert.equal(B.drawFeedback('ok'), 'Yes. Your line follows the pattern, through the middle of the points.');
    assert.equal(B.drawFeedback('short'), 'Make your line reach across all the points.');
    assert.equal(B.drawFeedback('direction', 'up'), 'The points go up, so your line must go up too.');
    assert.equal(B.drawFeedback('high'), 'Most points are below your line. Move it down to the middle.');
    assert.equal(B.drawFeedback('low'), 'Most points are above your line. Move it up to the middle.');
    assert.equal(B.ignoreFeedback('pulled'),
        'Your line has been pulled towards the outlier. Ignore it and go through the middle of the other points.');
    assert.equal(B.ignoreFeedback('direction', 'down'), 'The points go down, so your line must go down too.');
});
