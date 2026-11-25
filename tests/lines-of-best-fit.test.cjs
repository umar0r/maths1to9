const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Q = require('../content/lines-of-best-fit/questions.js');
const B = require('../content/lines-of-best-fit/best-fit.js');
const lesson = JSON.parse(fs.readFileSync(
    path.join(__dirname, '../content/lines-of-best-fit/lesson.json'), 'utf8'));

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

/* The line as drawn, so the reading can be checked against it. */
const drawnLine = line => B.lineEquation(line);
const roundTo1 = value => Math.round(value * 10) / 10;

test('lines of best fit: Estimate Practice keeps its order and repeats over 200 seeds', () => {
    for (const seed of seeds) {
        const items = Q.pickPractice('estimate', 3, E.seededRandom(seed), E);
        assert.deepEqual(items.map(item => item.type), ['read-up', 'read-across', 'read-up']);
        assert.deepEqual(plain(items), plain(Q.pickPractice('estimate', 3, E.seededRandom(seed), E)));
        assert.equal(new Set(items.map(item => item.context)).size, 3);
        for (const item of items) {
            assert.ok(B.contextIds.includes(item.context));
            assert.deepEqual(plain(build(item)), plain(build(item)));
        }
    }
});

test('lines of best fit: Trust Practice keeps its order and repeats over 200 seeds', () => {
    for (const seed of seeds) {
        const items = Q.pickPractice('trust', 3, E.seededRandom(seed), E);
        assert.deepEqual(items.map(item => item.type), ['trust-which', 'trust-sort', 'why-unreliable']);
        assert.deepEqual(plain(items), plain(Q.pickPractice('trust', 3, E.seededRandom(seed), E)));
        assert.equal(new Set(items.map(item => item.context)).size, 3);
        for (const item of items) assert.deepEqual(plain(build(item)), plain(build(item)));
    }
});

test('lines of best fit: every read-up asks for a reading clear of a half, typed with 0.5 tolerance', () => {
    for (const seed of seeds) {
        for (const item of Q.pickPractice('estimate', 3, E.seededRandom(seed), E)
            .filter(entry => entry.type === 'read-up')) {
            const card = Q.practiceQuestion(item, E.seededRandom(item.seed), E);
            assert.equal(card.input, 'number');
            assert.equal(card.questionType, 'read-up');
            assert.equal(card.tolerance, 0.5);
            assert.equal(typeof card.answer, 'string');
            assert.ok(card.unit, 'the card has no unit');
            const { m, c } = drawnLine(card.model.right);
            const answer = Number(card.answer);
            assert.equal(answer, roundTo1(m * card.model.x + c), 'the answer is not the line at that x');
            assert.ok(card.model.x >= 2 && card.model.x <= 8, 'the reading is outside 2 to 8');
            assert.ok(answer >= 0 && answer <= 10, 'the reading is off the side axis');
            assert.ok(Math.abs(answer - Math.round(answer * 2) / 2) >= 0.2 - 1e-9,
                `${answer} is within 0.2 of a half`);
            for (const rule of card.rules) assert.ok(rule.feedback.length > 10);
            assert.ok(card.fallback.length > 10);
        }
    }
});

test('lines of best fit: every read-across has four different numbers and the line answers one', () => {
    for (const seed of seeds) {
        for (const item of Q.pickPractice('estimate', 3, E.seededRandom(seed), E)
            .filter(entry => entry.type === 'read-across')) {
            const card = Q.practiceQuestion(item, E.seededRandom(item.seed), E);
            assert.equal(card.input, 'choice');
            assert.equal(card.questionType, 'read-across');
            assert.equal(card.options.length, 4);
            assert.equal(new Set(card.options.map(option => option.label)).size, 4);
            assert.equal(card.options.filter(option => option.correct).length, 1);
            const { m, c } = drawnLine(card.model.right);
            const answer = Math.round((card.model.y - c) / m);
            assert.equal(card.model.answer, answer);
            const right = card.options.find(option => option.correct);
            assert.equal(right.label, String(answer));
            for (const option of card.options) {
                assert.ok(option.feedback.length > 10);
                if (option !== right) assert.ok(!option.feedback.startsWith('Yes.'));
            }
        }
    }
});

test('lines of best fit: trust-which offers one estimate inside the data and three outside it', () => {
    for (const seed of seeds) {
        for (const item of Q.pickPractice('trust', 3, E.seededRandom(seed), E)
            .filter(entry => entry.type === 'trust-which')) {
            const card = Q.practiceQuestion(item, E.seededRandom(item.seed), E);
            assert.equal(card.options.length, 4);
            assert.equal(card.options.filter(option => option.correct).length, 1);
            const { inside, smallest, largest } = card.model;
            assert.ok(inside >= smallest && inside <= largest, 'the right estimate is outside the data');
            assert.equal(new Set(card.model.outside).size, 3);
            for (const value of card.model.outside) {
                assert.ok(value > largest || value < smallest, `${value} is inside the data`);
            }
            const right = card.options.find(option => option.correct);
            assert.ok(right.label.includes(String(inside)));
            assert.ok(right.feedback.startsWith('Yes.'));
        }
    }
});

test('lines of best fit: trust-sort is right only when every card is in its box', () => {
    for (const seed of seeds) {
        for (const item of Q.pickPractice('trust', 3, E.seededRandom(seed), E)
            .filter(entry => entry.type === 'trust-sort')) {
            const card = Q.practiceQuestion(item, E.seededRandom(item.seed), E);
            assert.equal(card.input, 'custom');
            assert.equal(card.questionType, 'trust-sort');
            const { inside, outside, smallest, largest } = card.model;
            assert.equal(inside.length, 2);
            assert.equal(outside.length, 2);
            for (const value of inside) assert.ok(value >= smallest && value <= largest);
            for (const value of outside) assert.ok(value > largest || value < smallest);
            const { widget } = card;
            for (const name of ['render', 'isEmpty', 'mark', 'answerText']) {
                assert.equal(typeof widget[name], 'function', name);
            }
            assert.equal(widget.isEmpty(null), true);
            const placed = {
                placed: {
                    inside: inside.map(value => `inside-${value}`),
                    outside: outside.map(value => `outside-${value}`)
                }
            };
            assert.equal(widget.mark(placed).correct, true);
            const swapped = {
                placed: {
                    inside: [`outside-${outside[0]}`, ...inside.slice(1).map(value => `inside-${value}`)],
                    outside: [`inside-${inside[0]}`, `outside-${outside[1]}`]
                }
            };
            const wrong = widget.mark(swapped);
            assert.equal(wrong.correct, false);
            assert.ok(wrong.feedback.includes(`${smallest}`) && wrong.feedback.includes(`${largest}`));
        }
    }
});

test('lines of best fit: why-unreliable asks about a value past the data, in the spec words', () => {
    for (const seed of seeds) {
        for (const item of Q.pickPractice('trust', 3, E.seededRandom(seed), E)
            .filter(entry => entry.type === 'why-unreliable')) {
            const card = Q.practiceQuestion(item, E.seededRandom(item.seed), E);
            assert.equal(card.questionType, 'why-unreliable');
            assert.equal(card.options.length, 4);
            assert.equal(card.options.filter(option => option.correct).length, 1);
            assert.ok(card.model.outside > card.model.largest);
            assert.ok(card.prompt.includes(`from ${card.model.smallest} to ${card.model.largest}`));
            const right = card.options.find(option => option.correct);
            assert.equal(right.label,
                `${card.model.outside} ${Q.unitWord(card.model.context)} is outside the data. The pattern might not carry on.`);
            assert.equal(right.feedback, 'Yes. There are no points out there to show the pattern.');
            const labels = card.options.map(option => option.label);
            assert.ok(labels.includes(`There's no point at exactly ${card.model.outside} ${Q.unitWord(card.model.context)}.`));
            assert.ok(labels.includes('It would be an outlier.'));
            assert.ok(labels.includes('A line of best fit can never be used to estimate.'));
        }
    }
});

test('lines of best fit: Estimate Try it taps give the spec messages', () => {
    const { estimate } = B.tryIt;
    assert.equal(estimate.headings.length, 2);
    assert.match(estimate.headings[0], /^Estimate the heating used at 7 °C\./);
    assert.match(estimate.headings[1], /^About how many hours of sunshine/);
    const heating = [0, 4];
    assert.deepEqual(plain(B.estimateTap('heating', heating)),
        { done: true, message: 'Yes. The line gives about 4 kWh of heating.' });
    assert.deepEqual(plain(B.estimateTap('heating', [0, 3])),
        { done: false, message: "That's the point at 7 °C. Read from the line, not a point." });
    assert.deepEqual(plain(B.estimateTap('heating', [0, 7])),
        { done: false, message: '7 is the temperature, on the bottom axis. Go up to the line, then across.' });
    assert.deepEqual(plain(B.estimateTap('heating', [0, 6])),
        { done: false, message: 'Go straight up from 7 °C to the line, then straight across to the side axis.' });
    assert.equal(B.estimateTap('heating', [5, 5]).done, false);
    assert.deepEqual(plain(B.estimateTap('sunshine', [4, 0])),
        { done: true, message: 'Yes. The line gives about 4 hours of sunshine.' });
    assert.deepEqual(plain(B.estimateTap('sunshine', [3, 0])),
        { done: false, message: "That's a point. Go across to the line, then down." });
    assert.deepEqual(plain(B.estimateTap('sunshine', [6, 0])),
        { done: false, message: 'Go straight across from 4 boxes to the line, then straight down to the bottom axis.' });
});

test('lines of best fit: Trust Try it sorts four value cards into inside and outside', () => {
    const { trust } = B.tryIt;
    assert.equal(trust.cards.map(card => card.label).join(', '), '3 hours, 7 hours, 15 hours, 20 hours');
    assert.equal(trust.cards.filter(card => card.bin === 'inside').length, 2);
    assert.equal(trust.cards.filter(card => card.bin === 'outside').length, 2);
    assert.equal(trust.slots.length, 2);
    assert.ok(trust.hints.inside.includes('1 to 9 hours'));
    assert.ok(trust.hints.outside.includes('stop at 9 hours'));
    assert.ok(trust.success.includes('3 and 7 hours'));
});

test('lines of best fit: readings come from the drawn line, and clearOfHalf allows 0.2 away', () => {
    assert.equal(B.clearOfHalf(4.5), false);
    assert.equal(B.clearOfHalf(4.4), false);
    assert.equal(B.clearOfHalf(4.2), true);
    assert.equal(B.clearOfHalf(4), false);
    assert.equal(B.clearOfHalf(4.8), true);
    assert.equal(B.clearOfHalf(6.4), false);
    const line = { from: [0, 1], to: [10, 9] };
    assert.deepEqual(plain(B.lineEquation(line)), { m: 0.8, c: 1 });
    const set = { main: revision.set.main, outlier: revision.set.outlier };
    assert.deepEqual(plain(B.dataRange(set)), { smallest: 1, largest: 9 });
    const read = B.reading(set, line, E.seededRandom(3));
    const across = B.acrossReading(set, line, E.seededRandom(3));
    assert.ok(read && read.x >= 2 && read.x <= 8);
    assert.equal(read.value, roundTo1(0.8 * read.x + 1));
    assert.ok(across && across.y >= 0 && across.y <= 10);
    assert.equal(across.x, roundTo1((across.y - 1) / 0.8));
});

test('lines of best fit: the lesson scores both Estimate Try it screens', () => {
    const lesson = JSON.parse(fs.readFileSync(
        path.join(__dirname, '../content/lines-of-best-fit/lesson.json'), 'utf8'));
    const ids = lesson.score_activities.map(activity => activity.id);
    assert.ok(ids.includes('step:interactive--estimate:0'));
    assert.ok(ids.includes('step:interactive--estimate:1'));
    assert.ok(ids.includes('step:interactive--trust:0'));
});

/* Every piece of text a pupil can read on one card. */
function cardText(card) {
    const texts = [card.prompt, card.feedback, card.fallback];
    for (const rule of card.rules || []) texts.push(rule.feedback);
    for (const option of card.options || []) texts.push(option.label, option.feedback);
    return texts.filter(text => typeof text === 'string');
}

function allText(value) {
    if (typeof value === 'string') return [value];
    if (Array.isArray(value)) return value.flatMap(allText);
    if (value && typeof value === 'object') return Object.values(value).flatMap(allText);
    return [];
}

/* The words the lesson never shows: a bracket with a number, "cross" or
   "trend". "Across" is fine. */
function banned(text) {
    if (/\(\s*\d/.test(text)) return `a bracket with a number: ${text}`;
    if (/\bcross\b/i.test(text)) return `the word "cross": ${text}`;
    if (/\btrend\b/i.test(text)) return `the word "trend": ${text}`;
    return null;
}

/* The rules every Practice card must keep, whatever made it. */
function checkCardShape(card) {
    assert.equal(typeof card.prompt, 'string');
    if (card.model?.points) assert.ok(pointsOnGrid(card.model.points), 'a point is off the graph');
    if (card.model?.lines) assert.ok(card.model.lines.every(endsOnGrid), 'a line end is off the graph');
    if (card.model?.right) assert.ok(endsOnGrid(card.model.right), 'the fitted line leaves the graph');
    if (card.input === 'choice') {
        assert.equal(card.options.length, 4, card.questionType);
        assert.equal(new Set(card.options.map(option => option.label)).size, 4, card.questionType);
        assert.equal(card.options.filter(option => option.correct).length, 1, card.questionType);
        for (const option of card.options) {
            assert.ok(option.feedback.length > 10, `${card.questionType}: ${option.label}`);
            assert.notEqual(option.feedback, option.label);
            if (!option.correct) assert.ok(!option.feedback.startsWith('Yes.'), option.feedback);
        }
        return;
    }
    if (card.input === 'number') {
        assert.ok(card.answer !== undefined && card.feedback && card.fallback, card.questionType);
        assert.equal(card.tolerance, 0.5);
        for (const rule of card.rules) {
            assert.ok(Math.abs(Number(rule.value) - Number(card.answer)) >= 0.5 - 1e-9,
                `${card.questionType}: rule ${rule.value} would be marked right`);
            assert.ok(rule.feedback.length > 10);
        }
        assert.equal(new Set(card.rules.map(rule => rule.value)).size, card.rules.length,
            `${card.questionType}: two rules share a value`);
        return;
    }
    assert.equal(card.input, 'custom');
    assert.equal(typeof card.widget.render, 'function');
    assert.equal(typeof card.widget.mark, 'function');
    if (card.questionType === 'draw-best') {
        assert.equal(card.widget.mark(card.model.right).correct, true);
    }
    if (card.questionType === 'trust-sort') {
        assert.equal(card.widget.mark({ placed: {
            inside: card.model.inside.map(value => `inside-${value}`),
            outside: card.model.outside.map(value => `outside-${value}`)
        } }).correct, true);
    }
}

const mixedTypes = ['best-line', 'draw-best', 'outlier-line', 'read-up', 'read-across',
    'trust-which', 'trust-sort', 'why-unreliable'];

/* Section 10: six questions, at least one from each part, at most two of any
   one type, at most two widgets, at least one read-up, and the order rules. */
test('lines of best fit: Mixed Practice follows section 10 over 200 32-bit seeds', () => {
    for (const seed of seeds) {
        const items = Q.pickPractice(null, 6, E.seededRandom(seed), E);
        assert.equal(items.length, 6);
        assert.deepEqual(plain(items), plain(Q.pickPractice(null, 6, E.seededRandom(seed), E)));
        const types = items.map(item => item.type);
        assert.ok(types.every(type => mixedTypes.includes(type)), types.join(', '));
        for (const type of mixedTypes) {
            assert.ok(types.filter(other => other === type).length <= 2, `${type} is asked more than twice`);
        }
        assert.ok(types.filter(type => Q.widgetTypes.includes(type)).length <= 2, 'more than two widgets');
        assert.ok(types.includes('read-up'), 'no read-up');
        for (const part of ['draw', 'ignore', 'estimate', 'trust']) {
            assert.ok(items.some(item => item.part === part), `no ${part} question`);
        }
        assert.ok(Q.validMix(items), 'two widgets in a row or three choices in a row');
        for (const item of items) {
            assert.ok(B.contextIds.includes(item.context), `${item.context} is not one of the three contexts`);
            assert.ok(Number.isInteger(item.seed) && item.seed >= 0 && item.seed <= 0xffffffff);
            if (item.type === 'draw-best') assert.equal(item.outlier, item.part === 'ignore');
            else assert.ok(!Object.hasOwn(item, 'outlier'), 'only draw-best carries an outlier');
        }
    }
});

test('lines of best fit: every Mixed Practice card is made inside its graph', () => {
    let widgets = 0;
    for (const seed of seeds) {
        for (const item of Q.pickPractice(null, 6, E.seededRandom(seed), E)) {
            const card = build(item);
            assert.ok(card.prompt.length > 3);
            checkCardShape(card);
            if (Q.widgetTypes.includes(item.type)) widgets++;
        }
    }
    assert.ok(widgets > 0, 'no widget was ever asked in Mixed Practice');
});

test('lines of best fit: validMix rejects two widgets in a row and three choices in a row', () => {
    const kind = type => ({ type });
    assert.equal(Q.validMix([kind('best-line'), kind('outlier-line'), kind('read-across')]), false);
    assert.equal(Q.validMix([kind('draw-best'), kind('trust-sort')]), false);
    assert.equal(Q.validMix([kind('best-line'), kind('outlier-line'), kind('read-up')]), true);
    assert.equal(Q.validMix([kind('draw-best'), kind('read-up'), kind('trust-sort')]), true);
    assert.equal(Q.validMix([kind('best-line'), kind('best-line'), kind('best-line')]), false);
});

test('lines of best fit: no pupil-facing text has a bracketed number, "cross" or "trend"', () => {
    const texts = [...allText(lesson), ...allText(B.tryIt)];
    for (const result of ['ok', 'short', 'direction', 'high', 'low']) {
        texts.push(B.drawFeedback(result, 'up'), B.ignoreFeedback(result, 'down'));
    }
    for (const seed of seeds.slice(0, 60)) {
        for (const part of ['draw', 'ignore', 'estimate', 'trust']) {
            for (const item of Q.pickPractice(part, 3, E.seededRandom(seed), E)) {
                texts.push(...cardText(build(item)));
            }
        }
        for (const item of Q.pickPractice(null, 6, E.seededRandom(seed), E)) {
            texts.push(...cardText(build(item)));
        }
    }
    for (const text of texts) assert.equal(banned(text), null, banned(text));
});

test('lines of best fit: Check is the five section 10 questions, each option with feedback', () => {
    const { questions, summary } = lesson.comparison;
    assert.equal(questions.length, 5);
    assert.deepEqual(questions.map(question => question.type), ['best-fit-meaning', 'best-fit-graph',
        'best-fit-estimate', 'best-fit-inside', 'best-fit-outside']);
    assert.equal(questions[0].prompt, 'What is a line of best fit?');
    assert.equal(questions[0].correct,
        'A straight line that follows the pattern, through the middle of the points.');
    assert.equal(questions[1].prompt, 'Which graph shows the line of best fit?');
    assert.equal(questions[1].correct, 'B');
    assert.equal(questions[1].picture, 'revision-lines');
    assert.equal(questions[2].prompt,
        'Someone says, "The line of best fit says 3 kWh of heating at 7 °C." Are they right?');
    assert.equal(questions[2].correct, 'No. 3 kWh is a point. The line gives about 4 kWh.');
    assert.equal(questions[2].picture, 'heating-line');
    assert.equal(questions[3].prompt,
        'A scatter graph shows revision from 1 to 9 hours. Why can you trust an estimate for 6 hours?');
    assert.equal(questions[4].prompt,
        'A scatter graph shows temperatures from 1 °C to 9 °C. Someone uses the line of best fit to estimate the heating used at 15 °C. Why might this be unreliable?');
    for (const [index, definition] of questions.entries()) {
        assert.ok(lesson.assessment.question_types[definition.type], `${definition.type} is not mapped to a skill`);
        assert.equal(definition.wrong.length, 3, definition.type);
        const labels = [definition.correct, ...definition.wrong.map(wrong => wrong.label)];
        assert.equal(new Set(labels).size, 4, definition.type);
        for (const wrong of definition.wrong) {
            assert.ok(wrong.feedback.length > 10);
            assert.notEqual(wrong.feedback, wrong.label);
        }
        const card = Q.checkQuestion(definition, E.seededRandom(index + 1), E);
        assert.equal(card.input, 'choice');
        assert.equal(card.questionType, definition.type);
        assert.equal(card.lockedReview, true);
        assert.equal(card.prompt, definition.prompt);
        assert.equal(card.options.length, 4);
        assert.equal(new Set(card.options.map(option => option.label)).size, 4);
        assert.equal(card.options.filter(option => option.correct).length, 1);
        assert.equal(card.options.find(option => option.correct).label, definition.correct);
        assert.equal(card.options.find(option => option.correct).feedback, definition.feedback);
        assert.equal(typeof card.figure === 'function', Boolean(definition.picture), definition.type);
        for (const option of card.options) assert.ok(option.feedback.length > 10);
    }
    assert.deepEqual(summary.points.map(point => point.text), [
        'A line of best fit is a straight line that follows the pattern, through the middle of the points.',
        'About as many points sit above it as below it.',
        'Ignore the outlier when you draw it.',
        'To estimate, go from one axis to the line, then to the other axis. Read the line, not a point.',
        'An estimate inside the data is reliable. Outside the data it may not be, because the pattern might not carry on.'
    ]);
});

test('lines of best fit: read-up gives its named mistakes their own words', () => {
    const seen = { point: 0, bottom: 0 };
    for (const seed of seeds) {
        for (const item of Q.pickPractice('estimate', 3, E.seededRandom(seed), E)
            .filter(entry => entry.type === 'read-up')) {
            const card = build(item);
            assert.equal(card.feedback, `Yes. The line gives about ${card.answer}.`);
            assert.ok(card.fallback.startsWith('Go straight up from'));
            for (const rule of card.rules) {
                if (rule.feedback === "That's a point. Read from the line, not a point.") seen.point++;
                else {
                    assert.match(rule.feedback,
                        /^That's the .+, on the bottom axis\. Go up to the line, then across\.$/);
                    seen.bottom++;
                }
            }
        }
    }
    assert.ok(seen.point > 0, 'the point rule was never used');
    assert.ok(seen.bottom > 0, 'the bottom-axis rule was never used');
});
