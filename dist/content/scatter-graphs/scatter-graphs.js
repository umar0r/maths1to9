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

    function barChart(host, { labels, values, max = 10, axisName, description }) {
        const svgNS = 'http://www.w3.org/2000/svg';
        const width = 320;
        const height = 320;
        const left = 44;
        const right = 306;
        const top = 24;
        const bottom = 262;
        const unit = (bottom - top) / max;
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', description);
        svg.classList.add('scatter-bar-chart');

        function draw(tag, attributes, text = '') {
            const node = document.createElementNS(svgNS, tag);
            Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, String(value)));
            if (text) node.textContent = text;
            svg.append(node);
            return node;
        }

        for (let value = 1; value <= max; value++) {
            const y = bottom - value * unit;
            draw('line', { x1: left, x2: right, y1: y, y2: y, class: 'scatter-bar-chart__grid' });
        }
        draw('line', { x1: left, x2: right, y1: bottom, y2: bottom, class: 'scatter-bar-chart__axis' });
        draw('line', { x1: left, x2: left, y1: bottom, y2: top, class: 'scatter-bar-chart__axis' });
        for (let value = 0; value <= max; value++) {
            draw('text', { x: left - 6, y: bottom - value * unit, class: 'scatter-bar-chart__number' }, String(value));
        }
        draw('text', { x: left, y: top - 8, class: 'scatter-bar-chart__name' }, axisName);

        const slot = (right - left) / values.length;
        const barWidth = Math.min(28, slot - 10);
        values.forEach((value, index) => {
            const centre = left + slot * (index + 0.5);
            draw('rect', { x: centre - barWidth / 2, y: bottom - value * unit, width: barWidth,
                height: value * unit, rx: 2, class: 'scatter-bar-chart__bar' });
            draw('text', { x: centre, y: bottom + 18, class: 'scatter-bar-chart__label' }, labels[index]);
        });

        host.append(svg);
        return svg;
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

    function markScaledPlot(value, { target: [a, b], step }) {
        if (samePoint(value, [a, b])) return { correct: true, feedback: `Across to ${a}, up to ${b}.` };
        if (samePoint(value, [b, a])) return { correct: false, feedback: "That's back to front." };
        return { correct: false, feedback: value?.[0] === a
            ? `One square up is ${step.y}. Count up to ${b}.`
            : `One square across is ${step.x}. Count across to ${a}.` };
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

    const helpers = { pairs, makeGraph, pairTable, barChart, samePoint, markPlot, plotWidget, quantity, markScaledPlot };
    if (typeof module !== 'undefined' && module.exports) module.exports = helpers;
    else window.ScatterGraphs = helpers;
})();
