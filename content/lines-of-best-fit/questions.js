(() => {
    'use strict';

    const slug = typeof document === 'undefined' ? 'lines-of-best-fit' : document.body.dataset.lessonId;
    const B = typeof module !== 'undefined' && module.exports ? require('./best-fit.js') : window.LinesOfBestFit;

    const letters = ['A', 'B', 'C', 'D'];

    function lineKey(line) {
        return `${line.from.join(',')}-${line.to.join(',')}`;
    }

    /* Four different lines: the right one and three that are not. */
    function fourLines(right, wrongs) {
        const lines = [right, ...wrongs];
        return new Set(lines.map(lineKey)).size === lines.length;
    }

    function onGrid(line) {
        return [line.from, line.to].every(([x, y]) => x >= 0 && x <= 10 && y >= 0 && y <= 10);
    }

    /* The word for a value on the bottom axis: hours, or degrees. */
    function unitWord(contextId) {
        return contextId === 'heating' ? '°C' : 'hours';
    }

    /* An outlierSet and its line of best fit, made until the line passes
       judgeLine as ok. */
    function fittedSet(contextId, random) {
        for (let attempt = 0; attempt < 300; attempt++) {
            const set = B.outlierSet(random, contextId);
            const fitted = B.fitLine(random, set);
            if (fitted.result === 'ok') return { set, fitted };
        }
        throw new Error(`No fitted set for ${contextId}.`);
    }

    /* The choice card that shows four small graphs, A to D, with one line on
       each. `entries` are in A, B, C, D order. */
    function smallGraphCard(prompt, questionType, entries, points, extra = {}) {
        return {
            input: 'choice', questionType, prompt,
            options: entries.map((entry, index) => ({
                label: letters[index], correct: Boolean(entry.correct), feedback: entry.feedback
            })),
            model: {
                lines: entries.map(entry => entry.line),
                correctIndex: entries.findIndex(entry => entry.correct),
                points,
                ...extra
            },
            figure(host) {
                B.smallGraphs(host, entries.map((entry, index) => ({
                    points,
                    line: entry.line,
                    caption: letters[index],
                    label: `Graph ${letters[index]}, with one straight line.`
                })));
            }
        };
    }

    /* Draw Practice, choice: which of four graphs shows the line of best fit?
       The others are the right line moved out of the middle, the same line
       turned round, and a flat line at the points' average height. */
    function bestLine(item, random, helpers) {
        const context = B.contexts[item.context];
        const direction = B.way(context);
        const other = direction === 'up' ? 'down' : 'up';
        let set;
        let entries;
        for (let attempt = 0; attempt < 200; attempt++) {
            set = B.pointSet(random, { direction: context.direction, strength: 'strong', count: 9 });
            const fitted = B.fitLine(random, set);
            if (fitted.result !== 'ok') continue;
            const right = fitted.line;
            const [fromX, fromY] = right.from;
            const [toX, toY] = right.to;
            const lifted = { from: [fromX, fromY + 3], to: [toX, toY + 3] };
            const lowered = { from: [fromX, fromY - 3], to: [toX, toY - 3] };
            const canLift = onGrid(lifted);
            const canLower = onGrid(lowered);
            if (!canLift && !canLower) continue;
            const moved = canLift ? lifted : lowered;
            const turned = { from: [fromX, toY], to: [toX, fromY] };
            const height = Math.round(B.average(set.points.map(([, y]) => y)));
            const flat = { from: [0, height], to: [10, height] };
            if (![moved, turned, flat].every(onGrid)) continue;
            if (!fourLines(right, [moved, turned, flat])) continue;
            entries = [
                { line: right, correct: true,
                    feedback: 'Yes. It follows the pattern, through the middle of the points.' },
                { line: moved,
                    feedback: `Most points are ${canLift ? 'below' : 'above'} that line. A line of best fit goes through the middle.` },
                { line: turned,
                    feedback: `The points go ${direction}, but that line goes ${other}.` },
                { line: flat,
                    feedback: `That line is flat, but the points go ${direction}.` }
            ];
            break;
        }
        if (!entries) throw new Error(`No four lines for ${item.context}.`);
        const card = smallGraphCard('Which graph shows the line of best fit?', 'best-line',
            helpers.shuffle(entries, random), set.points, { context: item.context });
        return card;
    }

    /* Ignore Practice, choice: which of four graphs shows the line of best
       fit? The others are pulled towards the outlier, drawn through the
       outlier, and the right line turned round. */
    function outlierLine(item, random, helpers) {
        const context = B.contexts[item.context];
        const direction = B.way(context);
        const other = direction === 'up' ? 'down' : 'up';
        let set;
        let entries;
        for (let attempt = 0; attempt < 300; attempt++) {
            set = B.outlierSet(random, item.context);
            const fitted = B.fitLine(random, set);
            if (fitted.result !== 'ok') continue;
            const right = fitted.line;
            const pulled = B.gridLine(B.leastSquares([...set.main, set.outlier]));
            const leftmost = set.main.reduce((best, point) => (point[0] < best[0] ? point : best));
            const [fromX, fromY] = leftmost;
            const [outX, outY] = set.outlier;
            if (outX === fromX) continue;
            const slope = (outY - fromY) / (outX - fromX);
            const through = B.gridLine({ m: slope, c: fromY - slope * fromX });
            const turned = { from: [right.from[0], right.to[1]], to: [right.to[0], right.from[1]] };
            if (!fourLines(right, [pulled, through, turned])) continue;
            if (![pulled, through, turned].every(onGrid)) continue;
            entries = [
                { line: right, correct: true,
                    feedback: 'Yes. It ignores the outlier and follows the other points.' },
                { line: pulled, feedback: 'That line has been pulled towards the outlier. Ignore it.' },
                { line: through, feedback: 'That line goes through the outlier. Ignore it and use the other points.' },
                { line: turned,
                    feedback: `The points go ${direction}, but that line goes ${other}.` }
            ];
            break;
        }
        if (!entries) throw new Error(`No four lines for ${item.context}.`);
        return smallGraphCard('Which graph shows the line of best fit?', 'outlier-line',
            helpers.shuffle(entries, random), [...set.main, set.outlier],
            { context: item.context, main: set.main, outlierPoint: set.outlier });
    }

    /* Practice, widget: draw the line of best fit. Marked with judgeLine,
       with the right line shown dashed when the pupil's line is wrong. */
    function drawBest(item, random, helpers) {
        const context = B.contexts[item.context];
        const direction = B.way(context);
        const withOutlier = Boolean(item.outlier);
        let set;
        let fitted;
        for (let attempt = 0; attempt < 300; attempt++) {
            set = withOutlier
                ? B.outlierSet(random, item.context)
                : B.pointSet(random, { direction: context.direction, strength: 'strong', count: 9 });
            fitted = B.fitLine(random, set);
            if (fitted.result === 'ok') break;
            fitted = null;
        }
        if (!fitted) throw new Error(`No line of best fit for ${item.context}.`);
        return {
            input: 'custom',
            questionType: 'draw-best',
            prompt: 'Draw a line of best fit.',
            model: {
                points: B.mainOf(set),
                outlier: set.outlier ?? null,
                right: fitted.line,
                fit: fitted.fit
            },
            widget: B.drawBestWidget({
                context,
                set,
                fit: fitted.fit,
                right: fitted.line,
                label: withOutlier
                    ? 'Scatter graph of outdoor temperature and heating used, for drawing a line of best fit.'
                    : `Scatter graph of ${context.axisWords.x} and ${context.axisWords.y}, for drawing a line of best fit.`,
                resultText: result => (withOutlier
                    ? B.ignoreFeedback(result, direction)
                    : B.drawFeedback(result, direction))
            })
        };
    }

    /* One graph of a set with its line, for a choice card or a typed card. */
    function fittedFigure(context, set, line) {
        return host => B.scatterGraph(host, {
            context,
            outlier: true,
            line,
            label: `${context.label.slice(0, -1)}, with the line of best fit.`
        });
    }

    /* Estimate Practice, typed: read the line up at an x, then across. */
    function readUp(item, random, helpers) {
        const context = B.contexts[item.context];
        let set;
        let fitted;
        let read;
        for (let attempt = 0; attempt < 300; attempt++) {
            ({ set, fitted } = fittedSet(item.context, random));
            read = B.reading(set, fitted.line, random);
            if (read) break;
        }
        if (!read) throw new Error(`No reading inside the data for ${item.context}.`);
        const answer = read.value;
        const rules = [];
        const point = set.main.find(([x]) => x === read.x);
        if (point && Math.abs(point[1] - answer) >= 0.5) {
            rules.push({
                value: String(point[1]),
                feedback: "That's a point. Read from the line, not a point."
            });
        }
        if (Math.abs(read.x - answer) >= 0.5) {
            rules.push({
                value: String(read.x),
                feedback: `That's the ${context.axisWords.x}, on the bottom axis. Go up to the line, then across.`
            });
        }
        return {
            input: 'number',
            questionType: 'read-up',
            prompt: `Use the line of best fit to estimate the ${context.yWords} for ${context.xPhrase(read.x)}.`,
            answer: String(answer),
            tolerance: 0.5,
            unit: context.unit,
            feedback: `Yes. The line gives about ${answer}.`,
            rules,
            fallback: `Go straight up from ${read.x} to the line, then straight across to the side axis.`,
            model: { context: item.context, x: read.x, answer, points: [...set.main, set.outlier], right: fitted.line },
            figure: fittedFigure(context, set, fitted.line)
        };
    }

    /* Estimate Practice, choice: read the line across at a y, then down. */
    function readAcross(item, random, helpers) {
        const context = B.contexts[item.context];
        let set;
        let fitted;
        let read;
        let options = null;
        for (let attempt = 0; attempt < 300 && !options; attempt++) {
            ({ set, fitted } = fittedSet(item.context, random));
            read = B.acrossReading(set, fitted.line, random);
            if (!read) continue;
            const right = Math.round(read.x);
            const alongTheBottom = Math.round(B.fitValue(B.lineEquation(fitted.line), read.y));
            const choices = [];
            const used = new Set();
            const add = (value, feedback) => {
                if (!Number.isInteger(value) || value < 0 || value > 10) return;
                if (used.has(value)) return;
                used.add(value);
                choices.push({ label: String(value), feedback });
            };
            add(right, 'Yes. Across to the line, then down.');
            add(read.y, "That's the number you started with. Go across to the line, then down to the bottom axis.");
            add(alongTheBottom, 'You started on the bottom axis. Start on the side axis and go across.');
            add(right + 2, 'Go straight across to the line, then straight down.');
            add(right - 2, 'Go straight across to the line, then straight down.');
            if (choices.length !== 4) continue;
            options = choices.map(choice => ({
                ...choice,
                correct: choice.label === String(right)
            }));
        }
        if (!options) throw new Error(`No four options for ${item.context}.`);
        return {
            input: 'choice',
            questionType: 'read-across',
            prompt: `Use the line of best fit to estimate the ${context.axisWords.x} for ${context.yPhrase(read.y)}.`,
            options: helpers.shuffle(options, random),
            model: { context: item.context, y: read.y, answer: Math.round(read.x), points: [...set.main, set.outlier], right: fitted.line },
            figure: fittedFigure(context, set, fitted.line)
        };
    }

    /* Trust Practice, choice: which estimate is inside the data? */
    function trustWhich(item, random, helpers) {
        const { set, fitted } = fittedSet(item.context, random);
        const range = B.dataRange(set);
        const word = unitWord(item.context);
        const inside = Math.min(range.largest - 1, Math.max(range.smallest + 1,
            Math.floor((range.smallest + range.largest) / 2)));
        const outside = helpers.shuffle(B.outsideValues(item.context), random).slice(0, 3);
        const options = [
            { label: `An estimate for ${inside} ${word}`, correct: true,
                feedback: `Yes. ${inside} ${word} is inside the data.` },
            ...outside.map(value => ({
                label: `An estimate for ${value} ${word}`,
                feedback: `${value} ${word} is outside the data. The points stop at ${range.largest} ${word}.`
            }))
        ];
        return {
            input: 'choice',
            questionType: 'trust-which',
            prompt: 'Which estimate is the most reliable?',
            options: helpers.shuffle(options, random),
            model: {
                context: item.context, inside, outside,
                smallest: range.smallest, largest: range.largest,
                points: [...set.main, set.outlier], right: fitted.line
            },
            figure: fittedFigure(B.contexts[item.context], set, fitted.line)
        };
    }

    /* Trust Practice, widget: sort four new values into inside and outside. */
    function trustSort(item, random, helpers) {
        const context = B.contexts[item.context];
        const { set, fitted } = fittedSet(item.context, random);
        const range = B.dataRange(set);
        const word = unitWord(item.context);
        const inside = [];
        for (let attempt = 0; attempt < 200 && inside.length < 2; attempt++) {
            const value = helpers.randomInt(range.smallest, range.largest, random);
            if (!inside.includes(value)) inside.push(value);
        }
        if (inside.length < 2) throw new Error(`No two values inside the data for ${item.context}.`);
        const outside = helpers.shuffle(B.outsideValues(item.context), random).slice(0, 2);
        const cards = helpers.shuffle([
            ...inside.map(value => ({ id: `inside-${value}`, label: `${value} ${word}`, bin: 'inside' })),
            ...outside.map(value => ({ id: `outside-${value}`, label: `${value} ${word}`, bin: 'outside' }))
        ], random);
        const slots = B.tryIt.trust.slots;
        return {
            input: 'custom',
            questionType: 'trust-sort',
            prompt: 'Can you trust these estimates? Sort them.',
            model: { context: item.context, inside, outside, smallest: range.smallest, largest: range.largest },
            widget: B.sortValuesWidget({
                cards,
                slots,
                draw: host => B.scatterGraph(host, {
                    context,
                    outlier: true,
                    line: fitted.line,
                    label: `${context.label.slice(0, -1)}, with the line of best fit.`
                }),
                success: `Yes. The points go from ${range.smallest} to ${range.largest} ${word}, so values between them are inside the data.`,
                wrong: `The points go from ${range.smallest} to ${range.largest}. Values between them are inside the data.`
            })
        };
    }

    /* Trust Practice, choice: why an estimate outside the data is unreliable. */
    function whyUnreliable(item, random, helpers) {
        const context = B.contexts[item.context];
        const { set } = fittedSet(item.context, random);
        const range = B.dataRange(set);
        const word = unitWord(item.context);
        const outside = helpers.shuffle(B.outsideValues(item.context), random)[0];
        const options = [
            { label: `${outside} ${word} is outside the data. The pattern might not carry on.`, correct: true,
                feedback: 'Yes. There are no points out there to show the pattern.' },
            { label: `There's no point at exactly ${outside} ${word}.`,
                feedback: "Inside the data there's often no point either. The problem is that it's outside the data." },
            { label: 'It would be an outlier.',
                feedback: "An outlier is a point that doesn't fit. This is about where the data stops." },
            { label: 'A line of best fit can never be used to estimate.',
                feedback: 'It can. Inside the data, estimates are reliable.' }
        ];
        return {
            input: 'choice',
            questionType: 'why-unreliable',
            prompt: `A scatter graph shows ${context.axisWords.x} from ${range.smallest} to ${range.largest} ${word}. Someone uses the line of best fit to estimate the ${context.yWords} for ${outside} ${word}. Why might this be unreliable?`,
            options: helpers.shuffle(options, random),
            model: { context: item.context, outside, smallest: range.smallest, largest: range.largest }
        };
    }

    /* Placeholder Check: one card about what a line of best fit is, so the
       Check section still loads and works. The real five come next stage. */
    function scaffoldCard() {
        return {
            input: 'choice',
            questionType: 'best-line',
            prompt: 'What is a line of best fit?',
            feedback: 'Yes. About as many points sit above it as below it.',
            options: [
                {
                    label: 'A straight line that follows the pattern, through the middle of the points.',
                    feedback: 'Yes. About as many points sit above it as below it.',
                    correct: true
                },
                {
                    label: 'A line that joins every point, dot to dot.',
                    feedback: "A line of best fit is one straight line. It doesn't join the dots."
                },
                {
                    label: 'A line from the first point to the last point.',
                    feedback: "It doesn't have to go through any point. It goes through the middle of them all."
                },
                {
                    label: 'A straight line that must start at 0.',
                    feedback: "It doesn't have to start at 0. It just follows the points."
                }
            ]
        };
    }

    function pickPractice(part, count, random, helpers) {
        const seed = () => helpers.randomInt(0, 0xffffffff, random);
        if (part === 'draw') {
            const [first, second] = helpers.shuffle([...B.contextIds], random);
            return [
                { type: 'best-line', context: first, seed: seed() },
                { type: 'draw-best', context: second, seed: seed() },
                { type: 'best-line', context: second === first ? B.contextIds[2] : second, seed: seed() }
            ].slice(0, count);
        }
        if (part === 'ignore') {
            const [first, second] = helpers.shuffle([...B.contextIds], random);
            return [
                { type: 'outlier-line', context: first, seed: seed() },
                { type: 'draw-best', context: second, outlier: true, seed: seed() },
                { type: 'outlier-line', context: second === first ? B.contextIds[2] : second, seed: seed() }
            ].slice(0, count);
        }
        if (part === 'estimate' || part === 'trust') {
            const [first, second, third] = helpers.shuffle([...B.contextIds], random);
            const types = part === 'estimate'
                ? ['read-up', 'read-across', 'read-up']
                : ['trust-which', 'trust-sort', 'why-unreliable'];
            return [
                { type: types[0], context: first, seed: seed() },
                { type: types[1], context: second, seed: seed() },
                { type: types[2], context: third, seed: seed() }
            ].slice(0, count);
        }
        return Array.from({ length: count }, () => ({ type: 'scaffold', part, seed: seed() }));
    }

    function practiceQuestion(item, random, helpers) {
        if (item.type === 'best-line') return bestLine(item, random, helpers);
        if (item.type === 'outlier-line') return outlierLine(item, random, helpers);
        if (item.type === 'draw-best') return drawBest(item, random, helpers);
        if (item.type === 'read-up') return readUp(item, random, helpers);
        if (item.type === 'read-across') return readAcross(item, random, helpers);
        if (item.type === 'trust-which') return trustWhich(item, random, helpers);
        if (item.type === 'trust-sort') return trustSort(item, random, helpers);
        if (item.type === 'why-unreliable') return whyUnreliable(item, random, helpers);
        if (item.type === 'scaffold') {
            const card = scaffoldCard();
            return { ...card, options: helpers.shuffle(card.options, random) };
        }
        throw new Error(`No practice card for ${item.type}.`);
    }

    function checkQuestion(random, { shuffle }) {
        const card = scaffoldCard();
        return { ...card, options: shuffle(card.options, random) };
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            pickPractice, practiceQuestion, bestLine, outlierLine, drawBest,
            readUp, readAcross, trustWhich, trustSort, whyUnreliable,
            scaffoldCard, smallGraphCard, fittedSet, unitWord
        };
        return;
    }

    window.Maths1to9QuestionSets ??= {};
    window.Maths1to9QuestionSets[slug] = async api => {
        const helpers = window.Maths1to9LessonEngine;
        for (const { id } of api.getSections()) {
            const section = api.getSection(id);
            const { kind, part, config } = section;
            if (kind !== 'question-bank' && kind !== 'comparison') continue;
            const host = document.getElementById(helpers.questionSetContainerId(slug, id));
            if (!host) continue;
            if (kind === 'question-bank') {
                await api.runQuestionSet(id, {
                    version: 1, count: config.session_length, upgrade: () => null,
                    pick: random => pickPractice(part, config.session_length, random, helpers),
                    question: (item, random) => practiceQuestion(item, random, helpers)
                });
                continue;
            }
            const { questions } = config;
            await api.runQuestionSet(id, {
                version: 1, count: questions.length, heading: 'Check results', upgrade: () => null,
                pick: () => questions.map((_, index) => ({ type: String(index), seed: index })),
                question: (item, random) => checkQuestion(random, helpers)
            });
        }
    };
})();
