/* Time series data and pictures. All graphs use the shared graph wrapper. */
(() => {
    'use strict';

    const GAME = {
        id: 'game', times: Array.from({ length: 12 }, (_, index) => String(index + 1)),
        axisNames: { x: 'Week', y: 'Players (thousands)' },
        values: [10, 15, 25, 20, 30, 35, 30, 40, 45, 40, 50, 55],
        y: [10, 60], step: 5, labelEvery: 2,
        label: "A new game's players each week."
    };
    const GOALS = {
        id: 'goals', times: ['August', 'September', 'October', 'November', 'December',
            'January', 'February', 'March', 'April', 'May'],
        xLabels: { 1: 'A', 2: 'S', 3: 'O', 4: 'N', 5: 'D', 6: 'J', 7: 'F', 8: 'M', 9: 'A', 10: 'M' },
        axisNames: { x: 'Month', y: 'Goals' },
        values: [6, 10, 4, 12, 14, 8, 10, 6, 12, 8], y: [0, 16], step: 2, labelEvery: 1,
        label: "A football club's goals each month."
    };
    const STREAMS = {
        id: 'streams', times: ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'],
        xLabels: { 1: 'J', 2: 'F', 3: 'M', 4: 'A', 5: 'M', 6: 'J',
            7: 'J', 8: 'A', 9: 'S', 10: 'O', 11: 'N', 12: 'D' },
        axisNames: { x: 'Month', y: 'Streams (millions)' },
        values: [2, 4, 3, 6, 5, 8, 7, 10, 9, 11, 10, 12], y: [0, 12], step: 1, labelEvery: 2,
        label: "A singer's streams each month."
    };
    const SALES = {
        id: 'sales', times: ['Q1', 'Q2', 'Q3', 'Q4', 'Q1', 'Q2', 'Q3', 'Q4'],
        xGroups: [{ from: 1, to: 4, text: '2024' }, { from: 5, to: 8, text: '2025' }],
        axisNames: { x: 'Quarter', y: 'Games sold (thousands)' },
        values: [15, 10, 20, 35, 20, 15, 25, 40], y: [10, 40], step: 5, labelEvery: 1,
        label: "A shop's game sales each quarter."
    };

    function element(tag, text = '', className = '') {
        const node = document.createElement(tag);
        node.textContent = text;
        node.className = className;
        return node;
    }

    function note(text) {
        return element('p', text, 'time-series-note');
    }

    function makeGraph(host, context, options = {}) {
        const graphHost = element('div', '', 'time-series-graph');
        host.append(graphHost);
        return window.Maths1to9Graph.create(graphHost, {
            x: [0, context.times.length + 1], y: context.y,
            step: { x: 1, y: context.step },
            labelEvery: { x: 1, y: context.labelEvery },
            xLabels: context.xLabels || Object.fromEntries(context.times.map((time, index) => [index + 1, time])),
            xGroups: context.xGroups || [], axisNames: context.axisNames,
            label: context.label, ...options
        });
    }

    function drawSeries(graph, values, { join = true, labels = {}, segmentTones = {} } = {}) {
        const segments = [];
        if (join) {
            for (let index = 1; index < values.length; index++) {
                segments.push(graph.segment([index, values[index - 1]], [index + 1, values[index]], {
                    tone: segmentTones[index] || 'neutral'
                }));
            }
        }
        const points = values.map((value, index) => graph.point([index + 1, value], {
            size: 'small', tone: 'neutral', coordinates: false, label: labels[index + 1] || null
        }));
        return { points, segments };
    }

    function table(host, context, boldColumn = null) {
        const table = element('table', '', 'lesson-table time-series-table');
        table.setAttribute('aria-label', context.label);
        [context.times, context.values].forEach((values, row) => {
            const tr = element('tr');
            values.forEach((value, index) => {
                const cell = element(row === 0 ? 'th' : 'td', String(value));
                if (row === 0) cell.scope = 'col';
                if (index + 1 === boldColumn) cell.className = 'time-series-table__focus';
                tr.append(cell);
            });
            table.append(tr);
        });
        host.append(table);
        return table;
    }

    const helpers = { GAME, GOALS, STREAMS, SALES, element, note, makeGraph, drawSeries, table };
    if (typeof window !== 'undefined') window.TimeSeries = helpers;
    if (typeof module !== 'undefined') module.exports = helpers;
})();
