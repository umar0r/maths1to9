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

    /* One line of plain text under a graph. */
    function note(text) {
        return element('p', text, 'best-fit-note');
    }

    const helpers = {
        grids, sets, lines, contexts, contextIds,
        element, samePoint, makeGraph, lineValue, scatterGraph, note
    };

    if (typeof module !== 'undefined' && module.exports) module.exports = helpers;
    else window.LinesOfBestFit = helpers;
})();
