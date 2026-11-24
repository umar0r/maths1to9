(() => {
    'use strict';

    const grids = { x: [0, 10], y: [0, 10], step: { x: 1, y: 1 } };

    /* The fixed point sets: eight points that make the pattern, and the last
       point, which doesn't fit it. */
    const sets = {
        REVISION: {
            main: [[1, 2], [2, 3], [3, 3], [4, 5], [5, 5], [6, 6], [7, 7], [9, 8]],
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
            label: 'Scatter graph of hours of revision and test marks.',
            pair: '8 hours of revision and a mark of 2'
        },
        sunshine: {
            direction: 1,
            set: sets.SUNSHINE,
            axisNames: { x: 'Hours of sunshine', y: 'Ice creams sold (boxes)' },
            label: 'Scatter graph of hours of sunshine and ice creams sold.',
            pair: '7 hours of sunshine and 1 box sold'
        },
        heating: {
            direction: -1,
            set: sets.HEATING,
            axisNames: { x: 'Outdoor temperature (°C)', y: 'Heating used (kWh)' },
            label: 'Scatter graph of outdoor temperature and heating used.',
            pair: '9 °C and 7 kWh of heating'
        }
    };

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

    const helpers = {
        sets, contexts, makeGraph, fullGraph, samePoint, note, sentence, ask, reason
    };

    if (typeof module !== 'undefined' && module.exports) module.exports = helpers;
    else window.Outliers = helpers;
})();
