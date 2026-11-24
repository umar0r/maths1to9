(() => {
    'use strict';

    const grids = { x: [0, 10], y: [0, 10], step: { x: 1, y: 1 } };

    /* The fixed point sets: eight points that make the pattern, and the last
       point, which doesn't fit it. */
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

    /* The three examples the whole lesson uses, the same three as lessons 1
       and 2. Direction 1 goes up, −1 goes down. */
    const contexts = {
        revision: {
            direction: 1,
            set: sets.REVISION,
            axisNames: { x: 'Hours of revision', y: 'Test mark' },
            axisWords: { x: 'hours of revision', y: 'test mark' },
            ask: {
                x: 'How many hours of revision does the outlier show?',
                y: 'What test mark does the outlier show?'
            },
            label: 'Scatter graph of hours of revision and test marks.',
            words([x, y]) {
                return `${x}${x === 1 ? ' hour' : ' hours'} of revision and a mark of ${y}`;
            }
        },
        sunshine: {
            direction: 1,
            set: sets.SUNSHINE,
            axisNames: { x: 'Hours of sunshine', y: 'Ice creams sold (boxes)' },
            axisWords: { x: 'hours of sunshine', y: 'boxes of ice cream' },
            ask: {
                x: 'How many hours of sunshine does the outlier show?',
                y: 'How many boxes of ice cream does the outlier show?'
            },
            label: 'Scatter graph of hours of sunshine and ice creams sold.',
            words([x, y]) {
                return `${x}${x === 1 ? ' hour' : ' hours'} of sunshine and ${y} ${y === 1 ? 'box' : 'boxes'} sold`;
            }
        },
        heating: {
            direction: -1,
            set: sets.HEATING,
            axisNames: { x: 'Outdoor temperature (°C)', y: 'Heating used (kWh)' },
            axisWords: { x: 'temperature', y: 'heating' },
            ask: {
                x: 'What temperature does the outlier show? Give it in °C.',
                y: 'How much heating does the outlier show? Give it in kWh.'
            },
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

    /* One full graph of a context. The points a screen talks about are blue,
       and `blueSize` is 'large' unless the screen wants them small; every
       other point is small and grey. A point can carry a text label. */
    function fullGraph(host, { context, blue = [], blueSize = 'large', labels = [], label = '' }) {
        const boardHost = element('div', '', 'outliers-graph');
        host.append(boardHost);
        const board = makeGraph(boardHost, {
            ...grids, axisNames: context.axisNames, label: label || context.label
        });
        const all = [...context.set.main, context.set.outlier];
        all.forEach(point => {
            const isBlue = blue.some(other => samePoint(other, point));
            const text = labels.find(entry => samePoint(entry.point, point))?.text ?? null;
            const options = {
                size: isBlue ? blueSize : 'small',
                tone: isBlue ? 'neutral' : 'muted',
                coordinates: false
            };
            if (text) options.label = text;
            board.point(point, options);
        });
        board.setEditable(false);
        return board;
    }

    /* One full graph of a set the generator made: every point looks the
       same, and some can carry a letter. */
    function graphPoints(host, { set, context, labels = [], label = '' }) {
        const boardHost = element('div', '', 'outliers-graph');
        host.append(boardHost);
        const board = makeGraph(boardHost, {
            ...grids, axisNames: context.axisNames, label: label || context.label
        });
        [...set.main, set.outlier].forEach(point => {
            const text = labels.find(entry => samePoint(entry.point, point))?.text ?? null;
            const options = { size: 'small', tone: 'neutral', coordinates: false };
            if (text) options.label = text;
            board.point(point, options);
        });
        board.setEditable(false);
        return board;
    }

    function note(text) {
        return element('p', text, 'outliers-note');
    }

    function sentence(text) {
        const node = element('p', '', 'outliers-sentence');
        const strong = document.createElement('strong');
        strong.textContent = text;
        node.append(strong);
        return node;
    }

    /* A question the pupil is asked about a graph, in a plain box. */
    function ask(text) {
        return element('p', text, 'outliers-ask');
    }

    /* One reason for an outlier, with its lead in bold. */
    function reason(lead, text) {
        const node = element('p', '', 'outliers-reason');
        const strong = document.createElement('strong');
        strong.textContent = lead;
        node.append(strong, document.createTextNode(` ${text}`));
        return node;
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

    /* The Practice card that asks the pupil to tap the outlier. Nothing is
       marked until Check, when the point they tapped turns green or red. */
    function tapOutlierWidget({ context, set, label }) {
        return {
            isEmpty: value => !Array.isArray(value),
            render(host, { value, editable, onChange }) {
                const boardHost = element('div', '', 'outliers-graph');
                host.append(boardHost);
                const board = makeGraph(boardHost, { ...grids, axisNames: context.axisNames, label });
                const points = [...set.main, set.outlier];
                const items = points.map(point => [point, board.point(point, {
                    size: 'small', tone: 'neutral', coordinates: false
                })]);
                let chosen = Array.isArray(value) ? [...value] : null;
                let canEdit = editable;
                let phase = 'answer';

                function paint() {
                    items.forEach(([point, item]) => {
                        const isChosen = Boolean(chosen) && samePoint(chosen, point);
                        const isOutlier = samePoint(point, set.outlier);
                        if (phase === 'answer') {
                            item.update({ size: isChosen ? 'large' : 'small', tone: 'neutral' });
                        } else if (isChosen) {
                            item.update({ size: 'large', tone: phase === 'correct' ? 'correct' : 'incorrect' });
                        } else if (isOutlier && phase !== 'correct') {
                            // They missed it, so the right point shows green.
                            item.update({ size: 'large', tone: 'correct' });
                        } else {
                            item.update({ size: 'small', tone: 'neutral' });
                        }
                    });
                    board.setEditable(canEdit);
                }

                if (canEdit) {
                    board.pick({ label, onPick(position) {
                        if (!canEdit) return;
                        const match = points.find(point => samePoint(point, position));
                        if (!match) return;
                        chosen = [...match];
                        board.describe(`You tapped the point for ${context.words(chosen)}.`);
                        paint();
                        onChange([...chosen]);
                    } });
                }
                paint();
                return {
                    update({ value: next, editable: nextEditable = false, phase: nextPhase = 'answer' }) {
                        canEdit = nextEditable === true && nextPhase === 'answer';
                        phase = nextPhase;
                        if (Array.isArray(next)) chosen = [...next];
                        else if (nextPhase === 'answer') chosen = null;
                        paint();
                    },
                    focus() { boardHost.querySelector('.maths-graph__board')?.focus(); }
                };
            },
            mark(value) {
                const correct = Array.isArray(value) && samePoint(value, set.outlier);
                return {
                    correct,
                    feedback: correct
                        ? "Yes. That's the point that doesn't fit the pattern."
                        : 'That point fits the pattern. The outlier is the one away from the others.'
                };
            },
            answerText: value => `You tapped the point for ${context.words(value)}.`
        };
    }

    const helpers = {
        sets, contexts, contextIds, makeGraph, fullGraph, graphPoints, samePoint,
        note, sentence, ask, reason, pearson, pointSet, outlierSet, keepsRule,
        highestOf, lowestOf, tapOutlierWidget
    };

    if (typeof module !== 'undefined' && module.exports) module.exports = helpers;
    else window.Outliers = helpers;
})();
