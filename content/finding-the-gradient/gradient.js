(() => {
    'use strict';
    const graphs = window.Maths1to9Graph;
    const fallback = 'Pick two points where the line crosses grid corners. Count across, then up or down, and divide.';
    const types = ['positive-whole', 'positive-fraction', 'negative-whole', 'negative-fraction', 'flat', 'scale'];
    const gradients = {
        'positive-whole': [[1, 1], [2, 1], [3, 1]],
        'positive-fraction': [[1, 2], [1, 3], [1, 4], [2, 3], [3, 2]],
        'negative-whole': [[-1, 1], [-2, 1], [-3, 1]],
        'negative-fraction': [[-1, 2], [-1, 3], [-1, 4], [-2, 3], [-3, 2]],
        flat: [[0, 1]], scale: [[1, 1], [2, 1], [3, 1], [-2, 1]]
    };

    function fraction(p, q) {
        if (q === 0) throw new RangeError('A fraction needs a non-zero denominator.');
        if (q < 0) { p = -p; q = -q; }
        let a = Math.abs(p), b = q;
        while (b) [a, b] = [b, a % b];
        p /= a;
        q /= a;
        return (q === 1 ? String(p) : `${p}/${q}`).replace('-', '−');
    }

    function valueKey(value) {
        const text = String(value).replace(/−/g, '-');
        if (text.includes('/')) {
            const [p, q] = text.split('/').map(Number);
            return fraction(p, q);
        }
        const digits = text.split('.')[1]?.length || 0;
        return fraction(Number(text.replace('.', '')), 10 ** digits);
    }

    function wrongAnswerRules({ p, q, step }) {
        const rules = [];
        const used = new Set([fraction(p, q)]);
        function add(value, feedback) {
            const key = valueKey(value);
            if (used.has(key)) return;
            used.add(key);
            rules.push({ value, feedback });
        }
        if (p !== 0) {
            add(fraction(q, p), 'Divide the vertical change by the horizontal change.');
            add(fraction(-p, q), 'Read from left to right. Does the line rise or fall?');
        }
        if (step) {
            add(fraction(p * step.x, q * step.y), 'Check how many units each square stands for on the axes.');
        }
        if (q === 3) {
            for (const places of [1, 2]) {
                const scale = 10 ** places;
                const rounded = Math.floor((2 * Math.abs(p) * scale + q) / (2 * q));
                const digits = String(rounded).padStart(places + 1, '0');
                const text = `${p < 0 ? '−' : ''}${digits.slice(0, -places)}.${digits.slice(-places)}`;
                add(text, 'Close, but that’s rounded. Write it as a fraction, like 1/3.');
            }
        }
        return rules;
    }

    function changeLabels(from, to) {
        const across = to[0] - from[0];
        const vertical = to[1] - from[1];
        return { across: `${across} right`, vertical: `${Math.abs(vertical)} ${vertical < 0 ? 'down' : 'up'}` };
    }

    function definition(p, q, a, b, step) {
        return { p, q, a, b, m: p / q, c: a[1] - p * a[0] / q, ...(step ? { step } : {}) };
    }

    function onLine(point, graph) {
        return (point[1] - graph.a[1]) * graph.q === (point[0] - graph.a[0]) * graph.p;
    }

    function setup(host, graph, { marked = true, readOnly = false } = {}) {
        const options = {
            label: graph.label || `Coordinate grid. A straight line through ${graphs.formatPoint(graph.a)} and ${graphs.formatPoint(graph.b)}.`
        };
        if (graph.step) {
            options.x = graph.step.x === 2 ? [-12, 12] : [-6, 6];
            options.y = graph.step.y === 2 ? [-12, 12] : [-6, 6];
            options.step = graph.step;
        }
        const board = graphs.create(host, options);
        board.line({ m: graph.m, c: graph.c });
        if (marked) {
            board.point(graph.a, { size: 'large', coordinates: true, labelSide: 'left' });
            board.point(graph.b, { size: 'large', coordinates: true, labelSide: 'above' });
        }
        board.setEditable(!readOnly);
        return board;
    }

    function arrows(board, from, to, settings = {}) {
        const labels = changeLabels(from, to);
        const corner = [to[0], from[1]];
        const across = board.arrow(from, corner, { tone: 'ink', label: labels.across, ...settings });
        const vertical = to[1] === from[1] ? null
            : board.arrow(corner, to, { tone: 'ink', label: labels.vertical });
        return { across, vertical };
    }

    function helper(board, graph, host) {
        const instruction = document.createElement('p');
        instruction.textContent = 'Draw from one point on the line to another to see the triangle.';
        host.append(instruction);
        let legs = [];
        const tool = board.drawLine({
            extend: false, minLength: 1, movable: false, tone: () => 'neutral',
            onChange(line) {
                legs.forEach(leg => leg.remove());
                legs = [];
                if (!line) return;
                if (!onLine(line.from, graph) || !onLine(line.to, graph)) {
                    tool.set(null);
                    board.describe('Start and end on the line, where it crosses grid corners.');
                    return;
                }
                const [from, to] = [line.from, line.to].sort((a, b) => a[0] - b[0]);
                const corner = [to[0], from[1]];
                legs.push(board.segment(from, corner, { tone: 'ink', dash: true }));
                if (to[1] !== from[1]) legs.push(board.segment(corner, to, { tone: 'ink', dash: true }));
                board.describe('Your helper triangle is shown.');
            }
        });
    }

    function figure(graph, { marked = true, scratch = true } = {}) {
        return (host, { readOnly }) => {
            const board = setup(host, graph, { marked, readOnly });
            if (scratch && !readOnly) helper(board, graph, host);
        };
    }

    function correctFeedback({ p, q }) {
        if (p === 0) return 'Right. The line is flat, so its gradient is 0.';
        const direction = p < 0 ? 'down' : 'up';
        return `Right. The line goes ${direction} ${Math.abs(p)} for every ${q} across${p < 0 ? ', so the gradient is negative.' : '.'}`;
    }

    function generate(item, random) {
        const pick = values => values[Math.floor(random() * values.length)];
        const [p, q] = pick(gradients[item.type]);
        const step = item.type === 'scale' ? { x: 1, y: 2 } : null;
        const yLimit = step ? 10 : 5;
        const candidates = [];
        for (let x = -5; x <= 5; x++) {
            for (let y = -yLimit; y <= yLimit; y += step?.y || 1) {
                if (p === 0 && y === 0) continue;
                for (let k = 1; k * q <= 10; k++) {
                    const b = [x + k * q, y + k * p];
                    if (k * q < 2 || b[0] > 5 || Math.abs(b[1]) > yLimit || (step && b[1] % step.y !== 0)) continue;
                    candidates.push(definition(p, q, [x, y], b, step));
                }
            }
        }
        return pick(candidates);
    }

    function question(graph, extra = {}) {
        return {
            input: 'number', fractions: true, prompt: 'Work out the gradient of the line.',
            answer: fraction(graph.p, graph.q), rules: wrongAnswerRules(graph), fallback,
            feedback: correctFeedback(graph), figure: figure(graph, { marked: false }), ...extra
        };
    }

    window.FindingGradient = { fraction, wrongAnswerRules, changeLabels, definition,
        onLine, setup, arrows, figure, generate, question, types, fallback };
})();
