(() => {
    'use strict';

    const pairs = [[1, 3], [2, 2], [4, 5], [5, 4], [7, 7], [8, 9]];

    function makeGraph(host, { x, y, step, labelEvery, axisNames, label }) {
        return window.Maths1to9Graph.create(host, { x, y, step, labelEvery, axisNames, label });
    }

    function pairTable(host, { rows, values, selected = null, onPick = null }) {
        const table = document.createElement('div');
        table.className = 'scatter-pair-table';
        table.style.gridTemplateColumns = `minmax(3.5rem, 1.3fr) repeat(${values.length}, minmax(0, 1fr))`;
        table.setAttribute('role', onPick ? 'group' : 'table');
        table.setAttribute('aria-label', onPick ? 'Choose a column from the table' : 'Pairs of numbers');
        const headings = document.createElement('div');
        headings.className = 'scatter-pair-table__headings';
        rows.forEach(text => {
            const cell = document.createElement('span');
            cell.textContent = text;
            headings.append(cell);
        });
        table.append(headings);
        values.forEach((pair, index) => {
            const column = document.createElement(onPick ? 'button' : 'div');
            column.className = 'scatter-pair-table__column';
            if (onPick) {
                column.type = 'button';
                column.setAttribute('aria-label', `${pair[0]} ${rows[0]}, ${pair[1]} ${rows[1]}`);
                column.setAttribute('aria-pressed', String(index === selected));
                column.addEventListener('click', () => onPick(index));
            }
            if (index === selected) column.classList.add('is-selected');
            pair.forEach(value => {
                const cell = document.createElement('span');
                cell.textContent = String(value);
                column.append(cell);
            });
            table.append(column);
        });
        host.append(table);
        return table;
    }

    function quantity(number, word) {
        const singular = {
            hours: 'hour', marks: 'mark', 'rainy days': 'rainy day', accidents: 'accident',
            shots: 'shot', goals: 'goal', boxes: 'box', 'ice creams': 'ice cream',
            'hours of sunshine': 'hour of sunshine',
            'boxes of ice creams': 'box of ice creams'
        };
        return `${number} ${number === 1 ? singular[word] || word : word}`;
    }

    function samePoint(left, right) {
        return Boolean(left && right && left[0] === right[0] && left[1] === right[1]);
    }

    function markPlot(value, { target: [a, b], existing = null }) {
        if (samePoint(value, [a, b])) return { correct: true, feedback: `Across to ${a}, up to ${b}.` };
        if (samePoint(value, existing)) return { correct: false,
            feedback: `That's the point that's already there. This pair goes up to ${b}, so it needs its own point.` };
        if (samePoint(value, [b, a])) return { correct: false,
            feedback: `That's back to front. The first number, ${a}, goes across.` };
        if (value && Math.abs(value[0] - a) + Math.abs(value[1] - b) === 1) {
            return { correct: false, feedback: 'Count the squares again from 0.' };
        }
        return { correct: false, feedback: `Go across to ${a} first, then up to ${b}.` };
    }

    function plotWidget({ graph: options, points, target, existing = null, words, table = null, mark = null }) {
        return {
            render(host, { value, editable, onChange }) {
                if (table) pairTable(host, table);
                const graphHost = document.createElement('div');
                graphHost.className = 'scatter-graph-host';
                host.append(graphHost);
                const graph = makeGraph(graphHost, options);
                points.forEach(point => graph.point(point, { size: 'small', tone: 'neutral', coordinates: false }));
                let picked = null;
                let picker = null;
                let arrows = [];
                function update({ value, editable, phase = 'answer' }) {
                    picker?.stop();
                    picker = null;
                    picked?.remove();
                    picked = null;
                    arrows.forEach(arrow => arrow.remove());
                    arrows = [];
                    graph.setEditable(editable);
                    if (value) {
                        picked = graph.point(value, { size: 'large', coordinates: false,
                            tone: phase === 'answer' ? 'neutral' : phase === 'correct' ? 'correct' : 'incorrect' });
                        graph.describe(`You plotted ${quantity(value[0], words.x)} and ${quantity(value[1], words.y)}.`);
                        if (phase === 'correct') {
                            arrows.push(graph.arrow([0, 0], [value[0], 0], { dash: true, tone: 'ink' }));
                            arrows.push(graph.arrow([value[0], 0], value, { dash: true, tone: 'ink' }));
                        }
                    } else graph.describe('');
                    if (editable) picker = graph.pick({ label: 'Tap where the point goes.', onPick(position) {
                        picked?.remove();
                        picked = graph.point(position, { size: 'large', tone: 'neutral', coordinates: false });
                        graph.describe(`You plotted ${quantity(position[0], words.x)} and ${quantity(position[1], words.y)}.`);
                        onChange(position);
                    } });
                }
                update({ value, editable });
                return { update, focus() { graphHost.querySelector('[role="application"]').focus(); } };
            },
            isEmpty: value => value === null,
            mark: value => mark ? mark(value) : markPlot(value, { target, existing }),
            answerText: value => value ? `You plotted ${quantity(value[0], words.x)} and ${quantity(value[1], words.y)}.` : ''
        };
    }

    const helpers = { pairs, makeGraph, pairTable, samePoint, markPlot, plotWidget, quantity };
    if (typeof module !== 'undefined' && module.exports) module.exports = helpers;
    else window.ScatterGraphs = helpers;
})();
