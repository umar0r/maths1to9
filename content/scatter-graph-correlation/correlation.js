(() => {
    'use strict';

    const grids = { x: [0, 10], y: [0, 10], step: { x: 1, y: 1 } };

    const sets = {
        positiveLearning: [[1, 2], [2, 3], [3, 3], [4, 5], [5, 5], [6, 7], [7, 7], [8, 9]],
        negativeLearning: [[1, 9], [2, 8], [3, 8], [4, 6], [5, 5], [6, 4], [7, 3], [8, 2]],
        noneLearning: [[1, 6], [2, 2], [3, 8], [4, 4], [5, 9], [6, 1], [7, 6], [8, 3]],
        revision: [[1, 2], [2, 3], [3, 3], [4, 5], [5, 4], [6, 6], [7, 7], [8, 8], [9, 8]],
        heating: [[1, 9], [2, 8], [3, 8], [4, 6], [5, 6], [6, 5], [7, 3], [8, 3], [9, 2]],
        shoeSize: [[1, 5], [2, 8], [3, 2], [4, 7], [5, 4], [6, 9], [7, 3], [8, 6], [9, 4]],
        strongPositive: [[1, 1], [2, 2], [3, 4], [4, 4], [5, 5], [6, 7], [7, 7], [8, 8], [9, 9]],
        weakPositive: [[1, 4], [2, 1], [3, 5], [4, 2], [5, 7], [6, 3], [7, 8], [8, 5], [9, 9]],
        iceCreamSunburn: [[1, 1], [2, 3], [3, 2], [4, 4], [5, 5], [6, 5], [7, 7], [8, 8], [9, 8]]
    };

    /* Every graph in the lesson is drawn here, so they all look the same.
       Small graphs leave out the axis names and label 0, 5 and 10 only. */
    function makeGraph(host, { x = grids.x, y = grids.y, step = grids.step, labelEvery = 1,
        axisNames = null, label = '' } = {}) {
        const options = { x, y, step, labelEvery, label };
        if (axisNames) options.axisNames = axisNames;
        return window.Maths1to9Graph.create(host, options);
    }

    function fullGraph(host, { points, axisNames, label, big = [] }) {
        const boardHost = document.createElement('div');
        boardHost.className = 'correlation-graph';
        host.append(boardHost);
        const board = makeGraph(boardHost, { ...grids, axisNames, label });
        const isBig = point => big.some(other => other[0] === point[0] && other[1] === point[1]);
        points.forEach(point => board.point(point, {
            size: isBig(point) ? 'large' : 'small',
            tone: big.length > 0 && !isBig(point) ? 'muted' : 'neutral',
            coordinates: false
        }));
        board.setEditable(false);
        return board;
    }

    function smallGraphs(host, items) {
        const row = document.createElement('div');
        row.className = items.length === 2
            ? 'correlation-mini-graphs correlation-mini-graphs--pair'
            : 'correlation-mini-graphs';
        host.append(row);
        return items.map(item => {
            const figure = document.createElement('figure');
            figure.className = 'correlation-mini';
            const boardHost = document.createElement('div');
            boardHost.className = 'correlation-mini__board';
            figure.append(boardHost);
            const caption = document.createElement('figcaption');
            caption.textContent = item.caption;
            figure.append(caption);
            row.append(figure);
            // Empty axis names reserve the room the numbers need, so nothing is clipped
            // in a graph this small.
            const board = makeGraph(boardHost, { ...grids, labelEvery: 5,
                axisNames: { x: '', y: '' }, label: item.label || item.caption });
            item.points.forEach(point => board.point(point, {
                size: 'small', tone: 'neutral', coordinates: false
            }));
            board.setEditable(false);
            return board;
        });
    }

    function note(text) {
        const node = document.createElement('p');
        node.className = 'correlation-note';
        node.textContent = text;
        return node;
    }

    function sentence(text) {
        const node = document.createElement('p');
        node.className = 'correlation-sentence';
        const strong = document.createElement('strong');
        strong.textContent = text;
        node.append(strong);
        return node;
    }

    const helpers = { sets, makeGraph, fullGraph, smallGraphs, note, sentence };

    if (typeof module !== 'undefined' && module.exports) module.exports = helpers;
    else window.Correlation = helpers;
})();
