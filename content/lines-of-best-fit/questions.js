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

    /* Placeholder Practice and Check: one card about what a line of best fit
       is, so the sections still to be built load and work. */
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
        return Array.from({ length: count }, () => ({ type: 'scaffold', part, seed: seed() }));
    }

    function practiceQuestion(item, random, helpers) {
        if (item.type === 'best-line') return bestLine(item, random, helpers);
        if (item.type === 'outlier-line') return outlierLine(item, random, helpers);
        if (item.type === 'draw-best') return drawBest(item, random, helpers);
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
            scaffoldCard, smallGraphCard
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
