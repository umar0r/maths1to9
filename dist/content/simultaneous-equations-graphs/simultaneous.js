(() => {
    'use strict';

    const GRID = { x: [-5, 5], y: [-5, 5] };
    const LEARN_GRID = { x: [-4, 4], y: [-4, 6] };
    const TRY_GRID = { x: [-5, 3], y: [-2, 9] };
    const number = value => String(Object.is(value, -0) ? 0 : value).replace(/-/g, '−');
    const coordinate = point => `(${point.map(number).join(', ')})`.replace(/ /g, '\u00a0');
    const solution = ([x, y], sign = '=') => `x ${sign} ${number(x)}, y ${sign} ${number(y)}`;
    const onLine = (line, [x, y]) => Math.abs(y - line.m * x - line.c) < 1e-9;

    function fraction(numerator, denominator) {
        const gcd = (a, b) => b ? gcd(b, a % b) : a;
        if (!denominator) throw new RangeError('The lines must have different gradients.');
        if (denominator < 0) { numerator = -numerator; denominator = -denominator; }
        const divisor = gcd(Math.abs(numerator), denominator);
        return { numerator: numerator / divisor || 0, denominator: denominator / divisor };
    }

    function crossing(a, b) {
        const x = fraction(b.c - a.c, a.m - b.m);
        const y = fraction(a.m * x.numerator + a.c * x.denominator, x.denominator);
        return { x: x.numerator / x.denominator, y: y.numerator / y.denominator, exact: { x, y } };
    }

    function equationText({ m, c }) {
        const term = m === 0 ? '' : `${m === 1 ? '' : m === -1 ? '−' : number(m)}x`;
        if (!term) return `y = ${number(c)}`;
        return `y = ${term}${c === 0 ? '' : c > 0 ? ` + ${number(c)}` : ` − ${number(-c)}`}`;
    }

    // Keep each maths expression together, while prose can still wrap naturally.
    const mathText = text => String(text)
        .replace(/ +(?=[=≈+−×])/g, '\u00a0')
        .replace(/([=≈+−×]) +/g, '$1\u00a0')
        .replace(/then y\./g, 'then\u00a0y.');

    function formatCard(config) {
        return {
            ...config, prompt: mathText(config.prompt),
            ...(config.feedback ? { feedback: mathText(config.feedback) } : {}),
            ...(config.fallback ? { fallback: mathText(config.fallback) } : {}),
            ...(config.options ? { options: config.options.map(option => ({
                ...option, label: mathText(option.label), feedback: mathText(option.feedback)
            })) } : {}),
            ...(config.rules ? { rules: config.rules.map(rule => ({ ...rule, feedback: mathText(rule.feedback) })) } : {})
        };
    }

    // Meet the rectangle at its edges. Deduplicate a corner before taking the two ends.
    function lineEnds({ m, c }, grid = GRID) {
        const points = [];
        const add = (x, y) => {
            const epsilon = 1e-9;
            if (x < grid.x[0] - epsilon || x > grid.x[1] + epsilon || y < grid.y[0] - epsilon || y > grid.y[1] + epsilon) return;
            const point = [Math.max(grid.x[0], Math.min(grid.x[1], x)), Math.max(grid.y[0], Math.min(grid.y[1], y))];
            if (!points.some(p => Math.hypot(p[0] - point[0], p[1] - point[1]) < epsilon)) points.push(point);
        };
        grid.x.forEach(x => add(x, m * x + c));
        if (m !== 0) grid.y.forEach(y => add((y - c) / m, y));
        return points.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    }

    function node(tag, text = '', className = '') {
        const element = document.createElement(tag);
        element.textContent = mathText(text);
        element.className = className;
        return element;
    }
    function strongText(text) {
        const p = node('p');
        text.split('**').forEach((part, i) => p.append(i % 2 ? node('strong', part) : document.createTextNode(mathText(part))));
        return p;
    }
    const name = line => line.text || equationText(line);
    const graphLabel = lines => `Coordinate grid with the ${lines.length === 1 ? 'line' : 'lines'} ${lines.map(name).join(' and ')}.`;

    function graph(host, lines, label = graphLabel(lines), grid = GRID) {
        const key = node('div', '', 'simultaneous-key');
        lines.forEach((line, i) => {
            const row = node('span', '', 'simultaneous-key__line');
            const swatch = node('span', '', `simultaneous-key__swatch${i ? ' simultaneous-key__swatch--ink' : ''}`);
            swatch.setAttribute('aria-hidden', 'true');
            row.append(swatch, document.createTextNode(mathText(name(line))));
            key.append(row);
        });
        const surface = node('div');
        host.append(key, surface);
        const board = window.Maths1to9Graph.create(surface, { ...grid, step: { x: 1, y: 1 }, label });
        lines.forEach((line, i) => {
            const ends = lineEnds(line, grid);
            if (ends.length === 2) board.segment(ends[0], ends[1], { tone: i ? 'ink' : 'neutral' });
        });
        return board;
    }
    function guides(board, [x, y]) {
        return {
            x: () => board.segment([x, y], [x, 0], { dash: true, tone: 'ink' }),
            y: () => board.segment([x, y], [0, y], { dash: true, tone: 'ink' })
        };
    }
    const figure = (lines, options = {}) => host => {
        const frame = node('div', '', 'simultaneous-card-graph');
        host.append(frame);
        const board = graph(frame, lines, graphLabel(lines), options.grid || GRID);
        if (options.point) board.point(options.point, { size: 'large', label: options.label, labelSide: options.labelSide || 'below' });
        options.setup?.(board);
        return board;
    };

    function solutionRules(lines, [h, k]) {
        const used = new Set([JSON.stringify({ x: String(h), y: String(k) })]);
        const rules = [];
        function add(values, feedback) {
            const value = Object.fromEntries(Object.entries(values).map(([id, v]) => [id, String(v || 0)]));
            const key = JSON.stringify(value);
            if (used.has(key)) return;
            used.add(key);
            rules.push({ value, feedback });
        }
        if (h !== k) add({ x: k, y: h }, `Write x first, then y: ${solution([h, k])}.`);
        if (h !== 0 && k !== 0) add({ x: -h, y: -k }, 'Check both signs. Left of 0 and below 0 are negative.');
        if (h !== 0) add({ x: -h }, `Check the sign of x. ${h < 0 ? 'Left of 0 is negative.' : 'Right of 0 is positive.'}`);
        if (k !== 0) add({ y: -k }, `Check the sign of y. ${k < 0 ? 'Below 0 is negative.' : 'Above 0 is positive.'}`);
        if (h !== 0) lines.forEach(line => add({ x: 0, y: line.c }, `That's where ${equationText(line)} crosses the y-axis. The solution is where the two lines cross each other.`));
        add({ x: h }, 'x is right. Now go across from the crossing point to the y-axis to read y.');
        add({ y: k }, 'y is right. Now go down or up from the crossing point to the x-axis to read x.');
        return rules;
    }
    function solutionCard(lines) {
        const { x, y } = crossing(...lines);
        return formatCard({
            lines, input: 'number', fractions: true, prompt: `Find the solution of ${lines.map(equationText).join(' and ')}.`,
            fields: [{ id: 'x', label: 'x =' }, { id: 'y', label: 'y =' }],
            answer: { x: String(x), y: String(y) }, rules: solutionRules(lines, [x, y]),
            fallback: 'Find where the two lines cross. Read x on the x-axis, then y on the y-axis.',
            feedback: `Right. ${solution([x, y])} works in both equations.`, figure: figure(lines)
        });
    }
    const choice = (label, feedback, correct = false) => ({ label, feedback, correct });
    function whichOptions(lines) {
        const { x: h, y: k } = crossing(...lines);
        const options = [];
        const add = (point, feedback, correct = false) => {
            const label = solution(point);
            if (!options.some(option => option.label === label)) options.push(choice(label, feedback, correct));
        };
        add([h, k], 'Right. These values work in both equations.', true);
        add([k, h], `x comes first. Read x on the x-axis: ${solution([h, k])}.`);
        add(h === 0 ? [h, -k] : [-h, k], 'Check the signs. Left of 0 and below 0 are negative.');
        for (const line of lines) {
            if (options.length === 4) break;
            add([0, line.c], `That's where ${equationText(line)} crosses the y-axis. It's on one line only.`);
        }
        if (options.length < 4) add([h, -k], 'Check the sign of y. Below 0 is negative.');
        return options.slice(0, 4);
    }
    const estimatePool = [
        [{ m: 2, c: 0 }, { m: -1, c: 4 }],
        [{ m: 1, c: 2 }, { m: -2, c: 0 }],
        [{ m: 2, c: 1 }, { m: -1, c: 3 }],
        [{ m: 2, c: -2 }, { m: -1, c: 2 }],
        [{ m: 1, c: -2 }, { m: -2, c: 3 }]
    ];
    function estimateOptions(lines) {
        const { x, y } = crossing(...lines);
        const point = [x, y].map(v => Number(v.toFixed(1)));
        return [
            choice(solution(point, '≈'), 'Right. The lines cross between grid lines, so we estimate.', true),
            choice(solution([Math.round(x), Math.round(y)], '≈'), "That's the nearest grid point, but the lines don't cross there. Look at where they really cross."),
            choice(solution([...point].reverse(), '≈'), 'x comes first. Read x on the x-axis, then y on the y-axis.'),
            choice(solution([point[0], -point[1]], '≈'), 'Check the signs. Below 0 is negative.')
        ];
    }
    const kinds = ['positive', 'negative-x', 'negative-y', 'on-axis'];
    const typedTypes = ['read-solution'];
    const choiceTypes = ['which-solution', 'estimate', 'both-lines'];

    function makeLines(kind, random) {
        const { randomInt, shuffle } = window.Maths1to9LessonEngine;
        for (;;) {
            let h = randomInt(1, 4, random), k = randomInt(1, 4, random);
            if (kind === 'negative-x') h = -h;
            if (kind === 'negative-y') k = -k;
            if (kind === 'on-axis') {
                if (random() < 0.5) { h = 0; k *= random() < 0.5 ? -1 : 1; }
                else { k = 0; h *= random() < 0.5 ? -1 : 1; }
            }
            const slopes = [randomInt(1, 3, random), -randomInt(1, 3, random)];
            const lines = slopes.map(m => ({ m, c: k - m * h }));
            if (lines.every(line => Math.abs(line.c) <= 8)) return shuffle(lines, random);
        }
    }
    function otherPoint(lines) {
        const cross = crossing(...lines);
        const candidates = [];
        // Two units of room leave space for P and its label, including on a phone.
        for (let i = 0; i < 2; i++) for (let x = -3; x <= 3; x++) {
            const y = lines[i].m * x + lines[i].c;
            if (y < -3 || y > 3 || onLine(lines[1 - i], [x, y]) || Math.hypot(x - cross.x, y - cross.y) < 2) continue;
            const otherY = lines[1 - i].m * x + lines[1 - i].c;
            candidates.push({ point: [x, y], line: lines[i],
                labelSide: otherY > y ? 'below' : 'above',
                room: Math.min(Math.abs(x), Math.abs(y), 5 - Math.abs(x), 5 - Math.abs(y)) });
        }
        candidates.sort((a, b) => b.room - a.room);
        if (!candidates.length) return null;
        const { point, line, labelSide } = candidates[0];
        return { point, line, labelSide };
    }
    function pick(random) {
        const { shuffle, randomInt } = window.Maths1to9LessonEngine;
        const order = shuffle(kinds, random), choices = shuffle(choiceTypes, random);
        const items = [];
        const used = new Set();
        for (let i = 0; i < 3; i++) {
            let lines, key;
            do {
                lines = makeLines(order[i], random);
                key = JSON.stringify([...lines].sort((a, b) => a.m - b.m));
            } while (used.has(key) || lines.some(line => used.has(`${line.m}:${line.c}`)));
            used.add(key);
            lines.forEach(line => used.add(`${line.m}:${line.c}`));
            items.push({ type: 'read-solution', kind: order[i], lines, seed: randomInt(0, 4294967295, random) });
            items.push({ type: choices[i], kind: order[3], seed: randomInt(0, 4294967295, random) });
        }
        return items;
    }
    function generate(item, random) {
        const { shuffle, randomInt } = window.Maths1to9LessonEngine;
        let lines = item.lines || makeLines(item.kind || kinds[randomInt(0, 3, random)], random);
        let config;
        if (item.type === 'read-solution') config = solutionCard(lines);
        if (item.type === 'which-solution') {
            // Some axis crossings repeat a distractor. Pick another allowed pair until four are distinct.
            while (whichOptions(lines).length !== 4) lines = makeLines(item.kind, random);
            config = { input: 'choice', prompt: 'What is the solution?', options: whichOptions(lines), figure: figure(lines) };
        }
        if (item.type === 'estimate') {
            lines = estimatePool[randomInt(0, estimatePool.length - 1, random)];
            config = { input: 'choice', prompt: 'Estimate the solution.', options: estimateOptions(lines), figure: figure(lines) };
        }
        if (item.type === 'both-lines') {
            let marked = otherPoint(lines);
            while (!marked) { lines = makeLines(item.kind, random); marked = otherPoint(lines); }
            const equation = equationText(marked.line);
            config = { input: 'choice', prompt: `Point P is on the line ${equation}. Is P the solution?`,
                point: marked.point, pointLine: marked.line, labelSide: marked.labelSide,
                figure: figure(lines, { point: marked.point, label: 'P', labelSide: marked.labelSide }), options: [
                    choice('No. P is only on one line.', 'Right. The solution must be on both lines.', true),
                    choice('Yes. P is on a line.', `P works in ${equation} only. The solution must work in both equations, so it's where the lines cross.`),
                    choice('Yes. P has whole-number coordinates.', "Whole numbers don't make it the solution. It must be on both lines."),
                    choice('No. The solution is where a line crosses the y-axis.', "That's not it. The solution is where the two lines cross each other.")
                ] };
        }
        return formatCard({ ...config, lines, kind: item.kind, questionType: item.type,
            ...(config.options ? { options: shuffle(config.options, random) } : {}) });
    }
    window.Simultaneous = {
        GRID, LEARN_GRID, TRY_GRID, number, coordinate, solution, crossing, onLine, equationText,
        mathText, formatCard, lineEnds, node, strongText, graphLabel, graph, guides, figure, solutionRules, solutionCard, choice,
        whichOptions, estimateOptions, estimatePool, kinds, typedTypes, choiceTypes, makeLines, otherPoint, pick, generate
    };
})();
