(() => {
    'use strict';

    const grids = { x: [0, 10], y: [0, 10], step: { x: 1, y: 1 } };

    /* The fixed point sets: eight points that make the pattern, and the last
       point, which doesn't fit it. The same sets as lessons 1 to 3. */
    const sets = {
        REVISION: {
            main: [[1, 1], [2, 3], [3, 3], [4, 5], [5, 5], [6, 6], [7, 7], [9, 8]],
            outlier: [8, 2]
        },
        SUNSHINE: {
            main: [[1, 1], [2, 2], [3, 4], [4, 4], [5, 5], [6, 6], [8, 8], [9, 9]],
            outlier: [7, 1]
        },
        HEATING: {
            main: [[1, 9], [2, 8], [3, 8], [4, 6], [5, 6], [6, 5], [7, 3], [8, 3]],
            outlier: [9, 7]
        }
    };

    /* The line of best fit for each set, fitted to the eight points without
       the outlier. Every screen draws the same three lines. */
    const lines = {
        REVISION_LINE: { from: [0, 1], to: [10, 9] },
        SUNSHINE_LINE: { from: [0, 0], to: [10, 10] },
        HEATING_LINE: { from: [0, 9.6], to: [10, 1.6] }
    };

    /* The three examples the whole lesson uses. Direction 1 goes up, −1 goes
       down. `line` is that set's line of best fit. */
    const contexts = {
        revision: {
            direction: 1,
            set: sets.REVISION,
            line: lines.REVISION_LINE,
            axisNames: { x: 'Hours of revision', y: 'Test mark' },
            axisWords: { x: 'hours of revision', y: 'test mark' },
            label: 'Scatter graph of hours of revision and test marks.',
            words([x, y]) {
                return `${x}${x === 1 ? ' hour' : ' hours'} of revision and a mark of ${y}`;
            }
        },
        sunshine: {
            direction: 1,
            set: sets.SUNSHINE,
            line: lines.SUNSHINE_LINE,
            axisNames: { x: 'Hours of sunshine', y: 'Ice creams sold (boxes)' },
            axisWords: { x: 'hours of sunshine', y: 'boxes of ice cream' },
            label: 'Scatter graph of hours of sunshine and ice creams sold.',
            words([x, y]) {
                return `${x}${x === 1 ? ' hour' : ' hours'} of sunshine and ${y} ${y === 1 ? 'box' : 'boxes'} sold`;
            }
        },
        heating: {
            direction: -1,
            set: sets.HEATING,
            line: lines.HEATING_LINE,
            axisNames: { x: 'Outdoor temperature (°C)', y: 'Heating used (kWh)' },
            axisWords: { x: 'temperature', y: 'heating' },
            label: 'Scatter graph of outdoor temperature and heating used.',
            words([x, y]) {
                return `${x} °C and ${y} kWh of heating`;
            }
        }
    };

    const contextIds = ['revision', 'sunshine', 'heating'];

    function element(tag, text = '', className = '') {
        const node = document.createElement(tag);
        node.textContent = text;
        node.className = className;
        return node;
    }

    function samePoint(first, second) {
        return first[0] === second[0] && first[1] === second[1];
    }

    /* Every graph in the lesson is drawn here, so they all look the same. */
    function makeGraph(host, { x = grids.x, y = grids.y, step = grids.step, labelEvery = 1,
        axisNames = null, label = '' } = {}) {
        const options = { x, y, step, labelEvery, label };
        if (axisNames) options.axisNames = axisNames;
        return window.Maths1to9Graph.create(host, options);
    }

    /* The y the line is at for a given x. */
    function lineValue(line, x) {
        const [fromX, fromY] = line.from;
        const [toX, toY] = line.to;
        const value = fromY + ((toY - fromY) / (toX - fromX)) * (x - fromX);
        return Math.round(value * 100) / 100;
    }

    function average(values) {
        return values.reduce((sum, value) => sum + value, 0) / values.length;
    }

    /* Pearson's r: close to 1 is a strong rise, close to −1 a strong fall,
       and close to 0 no pattern. */
    function pearson(points) {
        const meanX = average(points.map(point => point[0]));
        const meanY = average(points.map(point => point[1]));
        let cross = 0;
        let spreadX = 0;
        let spreadY = 0;
        points.forEach(([x, y]) => {
            cross += (x - meanX) * (y - meanY);
            spreadX += (x - meanX) ** 2;
            spreadY += (y - meanY) ** 2;
        });
        if (spreadX === 0 || spreadY === 0) return 0;
        return cross / Math.sqrt(spreadX * spreadY);
    }

    function keepsRule(direction, strength, r) {
        if (direction === 0) return Math.abs(r) <= 0.2;
        if (Math.sign(r) !== direction) return false;
        return strength === 'strong' ? Math.abs(r) >= 0.9
            : Math.abs(r) >= 0.45 && Math.abs(r) <= 0.75;
    }

    function errorsFor(strength) {
        return strength === 'strong' ? [-1, 0, 1] : [-3, -2, -1, 0, 1, 2, 3];
    }

    /* A "none" set must not look like a hill or a valley: each half of it,
       either side of the middle x, has to be flat too. */
    function flatHalves(points) {
        const xs = [...new Set(points.map(point => point[0]))].sort((first, second) => first - second);
        const middle = xs[Math.floor(xs.length / 2)];
        const left = points.filter(([x]) => x < middle);
        const right = points.filter(([x]) => x > middle);
        const flat = half => half.length < 2 || Math.abs(pearson(half)) <= 0.5;
        return flat(left) && flat(right);
    }

    /* A set of points that shows the asked pattern: direction 1 rises,
       −1 falls and 0 has no pattern. Returns the points, their r, and the
       slope and start used, so a question can work out the pattern's own y. */
    function pointSet(random, { direction, strength = 'strong', count = 8 }) {
        const pick = (min, max) => min + Math.floor(random() * (max - min + 1));
        for (let attempt = 0; attempt < 5000; attempt++) {
            const xs = [];
            while (xs.length < count) {
                const x = pick(1, 9);
                if (!xs.includes(x)) xs.push(x);
            }
            xs.sort((first, second) => first - second);
            if (direction === 0) {
                const points = xs.map(x => [x, pick(1, 9)]);
                const r = pearson(points);
                if (keepsRule(0, strength, r) && flatHalves(points)) {
                    return { points, r, m: null, c: null };
                }
                continue;
            }
            const m = [0.7, 0.8, 0.9, 1][pick(0, 3)];
            const lined = xs.map(x => direction * m * x);
            const lowest = Math.ceil(-Math.min(...lined));
            const highest = Math.floor(10 - Math.max(...lined));
            if (highest < lowest) continue;
            const c = pick(lowest, highest);
            const errors = errorsFor(strength);
            const points = xs.map(x => [x, Math.max(0, Math.min(10,
                Math.round(c + direction * m * x + errors[pick(0, errors.length - 1)])))]);
            if (new Set(points.map(point => point.join(','))).size !== count) continue;
            const r = pearson(points);
            if (keepsRule(direction, strength, r)) return { points, r, m, c };
        }
        throw new Error(`No points with ${strength} correlation in that direction.`);
    }

    function highestOf(points) {
        return points.reduce((best, point) => (point[1] > best[1] ? point : best));
    }

    function lowestOf(points) {
        return points.reduce((best, point) => (point[1] < best[1] ? point : best));
    }

    /* A graph from a context with one point taken out and put far away from
       the pattern: nine x values, eight that follow it and one that doesn't. */
    function outlierSet(random, contextId) {
        const context = contexts[contextId];
        const direction = context.direction;
        const pick = (min, max) => min + Math.floor(random() * (max - min + 1));
        for (let attempt = 0; attempt < 5000; attempt++) {
            const pattern = pointSet(random, { direction, strength: 'strong', count: 9 });
            const { m, c } = pattern;
            const xs = [3, 4, 5, 6, 7, 8];
            for (let index = xs.length - 1; index > 0; index--) {
                const other = pick(0, index);
                [xs[index], xs[other]] = [xs[other], xs[index]];
            }
            for (const x of xs) {
                const p = c + direction * m * x;
                const lowest = direction === 1 ? 0 : Math.ceil(p + 5);
                const highest = direction === 1 ? Math.floor(p - 5) : 10;
                if (lowest > highest) continue;
                const y = pick(lowest, highest);
                if (y === x) continue;
                const main = pattern.points.filter(point => point[0] !== x);
                if (main.length !== 8) continue;
                if (!keepsRule(direction, 'strong', pearson(main))) continue;
                return {
                    main,
                    outlier: [x, y],
                    c,
                    m,
                    highest: highestOf(main),
                    lowest: lowestOf(main)
                };
            }
        }
        throw new Error(`No outlier set for ${contextId}.`);
    }

    /* The main group of a set made either by pointSet (points) or by
       outlierSet (main, with the outlier apart). */
    function mainOf(set) {
        return set.main ?? set.points;
    }

    /* The least-squares line through some points: y = c + m x. */
    function leastSquares(points) {
        const n = points.length;
        const sumX = points.reduce((sum, [x]) => sum + x, 0);
        const sumY = points.reduce((sum, [, y]) => sum + y, 0);
        const sumXY = points.reduce((sum, [x, y]) => sum + x * y, 0);
        const sumXX = points.reduce((sum, [x]) => sum + x * x, 0);
        const bottom = n * sumXX - sumX * sumX;
        const m = bottom === 0 ? 0 : (n * sumXY - sumX * sumY) / bottom;
        const c = (sumY - m * sumX) / n;
        return { m, c };
    }

    function fitValue(fit, x) {
        return fit.c + fit.m * x;
    }

    /* Two whole-number grid points on a line y = c + m x, from x = 0 to
       x = 10. An end that would leave the graph is replaced by the point
       where the line meets 0 or 10, rounded. */
    function gridLine(fit) {
        const edgeX = y => Math.max(0, Math.min(10, Math.round((y - fit.c) / fit.m)));
        let from = [0, Math.round(fit.c)];
        let to = [10, Math.round(fitValue(fit, 10))];
        if (from[1] < 0 || from[1] > 10) from = [edgeX(from[1] > 10 ? 10 : 0), from[1] > 10 ? 10 : 0];
        if (to[1] < 0 || to[1] > 10) to = [edgeX(to[1] > 10 ? 10 : 0), to[1] > 10 ? 10 : 0];
        return { from, to };
    }

    /* The line drawn for Practice: fitted to the main group by least squares
       and rounded to two grid points. `result` is what judgeLine makes of it,
       so the caller can make a new set when it isn't ok. */
    function fitLine(random, set) {
        const points = mainOf(set);
        const fit = leastSquares(points);
        const line = gridLine(fit);
        return { line, fit, result: judgeLine(line, points, fit, set.outlier ?? null) };
    }

    /* Mark a line the pupil drew. `points` is the main group, `fit` its
       least-squares line, and `outlier` the point to ignore, if the graph
       shows one. Returns the first thing that is wrong, or 'ok'. */
    function judgeLine(line, points, fit, outlier = null) {
        const xs = points.map(point => point[0]);
        const xmin = Math.min(...xs);
        const xmax = Math.max(...xs);
        const lowEnd = Math.min(line.from[0], line.to[0]);
        const highEnd = Math.max(line.from[0], line.to[0]);
        if (!(lowEnd <= xmin + 1 && highEnd >= xmax - 1)) return 'short';
        const rise = line.to[1] - line.from[1];
        const run = line.to[0] - line.from[0];
        const slope = run === 0 ? null : rise / run;
        if (slope === null || slope === 0 || Math.sign(slope) !== Math.sign(fit.m)) return 'direction';
        if (outlier) {
            const drawn = Math.abs(lineValue(line, outlier[0]) - outlier[1]);
            const fitted = Math.abs(fitValue(fit, outlier[0]) - outlier[1]);
            if (drawn <= fitted - 1) return 'pulled';
        }
        for (const x of [xmin, xmax]) {
            const above = lineValue(line, x) - fitValue(fit, x);
            if (above > 1) return 'high';
            if (above < -1) return 'low';
        }
        return 'ok';
    }

    /* The way the points go, for the message a wrong line gets. */
    function way(context) {
        return context.direction === 1 ? 'up' : 'down';
    }

    /* What a drawn line is told when it is wrong. The same words for every
       part that asks for a line. */
    function drawFeedback(result, direction = 'up') {
        switch (result) {
            case 'ok': return 'Yes. Your line follows the pattern, through the middle of the points.';
            case 'short': return 'Make your line reach across all the points.';
            case 'direction': return `The points go ${direction}, so your line must go ${direction} too.`;
            case 'high': return 'Most points are below your line. Move it down to the middle.';
            case 'low': return 'Most points are above your line. Move it up to the middle.';
            default: return 'Draw one straight line through the middle of the points.';
        }
    }

    /* The Ignore part adds one mistake of its own. */
    function ignoreFeedback(result, direction = 'down') {
        if (result === 'ok') return 'Yes. Your line ignores the outlier and follows the other points.';
        if (result === 'pulled') return 'Your line has been pulled towards the outlier. Ignore it and go through the middle of the other points.';
        return drawFeedback(result, direction);
    }

    /* One graph of a context: every point the same, or the outlier grey when
       the screen names it, and the line of best fit when the screen has one
       drawn already. `x` and `labelEvery` are for the one screen that goes
       past 10 on the bottom axis. */
    function scatterGraph(host, { context, line = null, outlier = false, outlierMuted = false,
        labels = [], x = grids.x, y = grids.y, labelEvery = 1, label = '' }) {
        const boardHost = element('div', '', 'best-fit-graph');
        host.append(boardHost);
        const board = makeGraph(boardHost, {
            x, y, labelEvery, axisNames: context.axisNames, label: label || context.label
        });
        const points = outlier ? [...context.set.main, context.set.outlier] : [...context.set.main];
        points.forEach(point => {
            const text = labels.find(entry => samePoint(entry.point, point))?.text ?? null;
            const grey = outlierMuted && samePoint(point, context.set.outlier);
            const options = {
                size: 'small',
                tone: grey ? 'muted' : 'neutral',
                coordinates: false
            };
            if (text) options.label = text;
            board.point(point, options);
        });
        if (line) board.segment(line.from, line.to, { tone: 'ink' });
        board.setEditable(false);
        return board;
    }

    /* A small graph for a choice answer: no axis names, a number every
       fifth place, and one line. */
    function miniGraph(host, { points, line = null, caption = null, label = '' }) {
        const figure = element('figure', '', 'best-fit-mini');
        const boardHost = element('div', '', 'best-fit-mini__board');
        figure.append(boardHost);
        if (caption) figure.append(element('figcaption', caption));
        host.append(figure);
        const board = makeGraph(boardHost, {
            ...grids, labelEvery: 5, axisNames: { x: '', y: '' }, label: label || caption || 'Scatter graph'
        });
        points.forEach(point => board.point(point, { size: 'small', tone: 'neutral', coordinates: false }));
        if (line) board.segment(line.from, line.to, { tone: 'ink' });
        board.setEditable(false);
        return board;
    }

    function smallGraphs(host, items) {
        const row = element('div', '', 'best-fit-mini-graphs');
        host.append(row);
        return items.map(item => miniGraph(row, item));
    }

    /* The Practice card that asks the pupil to draw the line. Nothing is
       marked until Check, when their line turns green or red and, if it is
       wrong, the right line shows dashed. */
    function drawBestWidget({ context, set, fit, right, resultText, label }) {
        return {
            isEmpty: value => value === null,
            render(host, { value, editable, onChange }) {
                const boardHost = element('div', '', 'best-fit-graph');
                host.append(boardHost);
                const board = makeGraph(boardHost, {
                    ...grids, axisNames: context.axisNames, label
                });
                const points = set.outlier ? [...set.main, set.outlier] : [...set.points];
                points.forEach(point => board.point(point, {
                    size: 'small', tone: 'neutral', coordinates: false
                }));
                const tool = board.drawLine({
                    line: value,
                    minLength: 2,
                    tone: () => 'neutral',
                    onChange
                });
                board.setEditable(editable);
                let dashed = null;
                return {
                    update({ value, editable, phase }) {
                        const judged = value ? judgeLine(value, mainOf(set), fit, set.outlier ?? null) : null;
                        const right = judged === 'ok';
                        tool.update({
                            value,
                            tone: phase === 'answer' ? 'neutral' : right ? 'correct' : 'incorrect'
                        });
                        dashed?.remove();
                        dashed = null;
                        if (phase !== 'answer' && value && !right) {
                            dashed = board.segment(right.from, right.to,
                                { dash: true, tone: 'ink', label: 'Line of best fit' });
                        }
                        board.setEditable(editable && phase === 'answer');
                    },
                    focus() {
                        host.querySelector('.maths-graph__board')?.focus();
                    }
                };
            },
            mark(value) {
                const result = judgeLine(value, mainOf(set), fit, set.outlier ?? null);
                return { correct: result === 'ok', feedback: resultText(result) };
            },
            answerText() {
                return 'You drew a line of best fit.';
            }
        };
    }

    /* One line of plain text under a graph. */
    function note(text) {
        return element('p', text, 'best-fit-note');
    }

    const helpers = {
        grids, sets, lines, contexts, contextIds,
        element, samePoint, makeGraph, lineValue, average, pearson, keepsRule,
        pointSet, outlierSet, highestOf, lowestOf, mainOf,
        leastSquares, fitValue, gridLine, fitLine, judgeLine,
        way, drawFeedback, ignoreFeedback,
        scatterGraph, miniGraph, smallGraphs, drawBestWidget, note
    };

    if (typeof module !== 'undefined' && module.exports) module.exports = helpers;
    else window.LinesOfBestFit = helpers;
})();
