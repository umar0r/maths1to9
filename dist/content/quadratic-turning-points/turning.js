(() => {
    'use strict';

    // Graphs are y = a(x − h)² + k with a = 1 (a U, minimum) or a = −1 (an upside-down U, maximum).
    // Pupils never see the equation: they read the graph.
    const GRID = { x: [-5, 5], y: [-5, 6] };

    const number = value => String(value).replace(/-/g, '−');
    const nb = text => String(text).replace(/ /g, ' ');
    const coordinate = point => nb(`(${point.map(number).join(', ')})`);
    const valueOf = ({ a, h, k }, x) => a * (x - h) ** 2 + k;
    const kind = form => form.a === 1 ? 'minimum' : 'maximum';
    const turningPoint = form => [form.h, form.k];
    const insideGrid = y => y >= GRID.y[0] && y <= GRID.y[1];

    function node(tag, text = '', className = '') {
        const element = document.createElement(tag);
        element.textContent = text;
        element.className = className;
        return element;
    }

    // Text with **bold** parts, for Learn's key words.
    function strongText(text) {
        const paragraph = node('p');
        String(text).split('**').forEach((part, index) => {
            paragraph.append(index % 2 ? node('strong', part) : document.createTextNode(part));
        });
        return paragraph;
    }

    // The x-values where the curve stays inside the grid, so it never runs into the frame.
    function domain(form) {
        const reach = Math.sqrt(form.a === 1 ? GRID.y[1] - form.k : form.k - GRID.y[0]);
        return [Math.max(GRID.x[0], form.h - reach), Math.min(GRID.x[1], form.h + reach)];
    }

    function graph(host, forms, label) {
        const board = window.Maths1to9Graph.create(host, { ...GRID, step: { x: 1, y: 1 }, label });
        forms.forEach(form => board.plot(x => valueOf(form, x), { domain: domain(form) }));
        return board;
    }

    function shapeLabel(form) {
        return `Coordinate grid with ${form.a === 1 ? 'a U-shaped' : 'an upside-down U-shaped'} curve.`;
    }

    // Points along the curve for the sliding dot, every quarter unit, inside the grid.
    function positions(form) {
        const list = [];
        for (let x = GRID.x[0]; x <= GRID.x[1]; x += 0.25) {
            const y = valueOf(form, x);
            if (insideGrid(y)) list.push([x, y]);
        }
        return list;
    }

    // The turning point, labelled below a minimum and above a maximum.
    function markTurningPoint(board, form, { label = true, text = null, tone = 'neutral', side = null } = {}) {
        return board.point(turningPoint(form), {
            size: 'large', tone,
            coordinates: label && !text,
            label: label && text ? text : undefined,
            labelSide: side || (form.a === 1 ? 'below' : 'above')
        });
    }

    function guides(board, [x, y]) {
        return {
            x: () => board.segment([x, y], [x, 0], { dash: true, tone: 'ink' }),
            y: () => board.segment([x, y], [0, y], { dash: true, tone: 'ink' })
        };
    }

    // A figure for a question card: the graph only, no guides or labels.
    const figure = form => host => {
        const frame = node('div', '', 'turning-card-graph');
        host.append(frame);
        graph(frame, [form], shapeLabel(form));
    };

    function turningRules(form) {
        const { h, k } = form;
        // A rule naming both fields is skipped when it is the answer; any rule is skipped when an earlier one is the same.
        const used = new Set([JSON.stringify({ x: h, y: k })]);
        const rules = [];
        function add(value, feedback) {
            const key = JSON.stringify(value);
            if (used.has(key)) return;
            used.add(key);
            rules.push({ value: Object.fromEntries(Object.entries(value).map(([id, v]) => [id, String(v)])), feedback });
        }
        if (h !== k) add({ x: k, y: h }, `Write the x-coordinate first, then the y-coordinate: ${coordinate([h, k])}.`);
        if (h !== 0 && k !== 0) add({ x: -h, y: -k }, 'Check both signs. Left of 0 and below 0 are negative.');
        if (h !== 0) add({ x: -h }, `Check the x sign. ${h < 0 ? 'Left of 0 is negative.' : 'Right of 0 is positive.'}`);
        if (k !== 0) add({ y: -k }, `Check the y sign. ${k < 0 ? 'Below 0 is negative.' : 'Above 0 is positive.'}`);
        if (h !== 0 && insideGrid(valueOf(form, 0))) {
            add({ x: 0, y: valueOf(form, 0) }, "That's where the curve crosses the y-axis. The turning point is where the curve turns.");
        }
        add({ x: h }, 'The x-coordinate is right. Now read y: go across from the point to the y-axis.');
        add({ y: k }, 'The y-coordinate is right. Now read x: go down or up from the point to the x-axis.');
        return rules;
    }

    function pointCard(form, prompt = 'Write the coordinates of the turning point.') {
        return {
            input: 'number', fractions: true, prompt,
            fields: [{ id: 'x', label: 'x-coordinate' }, { id: 'y', label: 'y-coordinate' }],
            answer: { x: String(form.h), y: String(form.k) },
            rules: turningRules(form),
            fallback: 'Find where the curve turns. Read x on the x-axis, then y on the y-axis.',
            feedback: `Right. The turning point is ${coordinate(turningPoint(form))}.`,
            figure: figure(form)
        };
    }

    const choice = (label, feedback, correct = false) => ({ label, feedback, correct });

    function typeOptions(form) {
        const { k } = form;
        if (form.a === 1) return [
            choice('Minimum', "Right. It's the lowest point on the curve.", true),
            choice('Maximum', "A maximum is the highest point. This curve's turning point is its lowest point."
                + (k > 0 ? " Being above the x-axis doesn't make it a maximum." : ''))
        ];
        return [
            choice('Maximum', "Right. It's the highest point on the curve.", true),
            choice('Minimum', "A minimum is the lowest point. This curve's turning point is its highest point."
                + (k < 0 ? " Being below the x-axis doesn't make it a minimum." : ''))
        ];
    }

    function whichOptions(form, random) {
        const { h, k } = form;
        const options = [choice(coordinate([h, k]), 'Right.', true)];
        if (h !== k) options.push(choice(coordinate([k, h]), `x comes first, then y: ${coordinate([h, k])}.`));
        const flipX = h !== 0 && (k === 0 || random() < 0.5);
        if (h !== 0 || k !== 0) {
            options.push(choice(coordinate(flipX ? [-h, k] : [h, -k]), 'Check the signs. Left of 0 and below 0 are negative.'));
        }
        const crossing = valueOf(form, 0);
        if (h !== 0 && insideGrid(crossing)) {
            options.push(choice(coordinate([0, crossing]), "That's where the curve crosses the y-axis. The turning point is where it turns."));
        }
        return options;
    }

    function whyOptions(form) {
        const { h, k } = form;
        const highest = form.a === -1;
        const options = [
            choice(`It's the ${highest ? 'highest' : 'lowest'} point on the curve.`, 'Right.', true),
            choice(`It's ${k >= 0 ? 'above' : 'below'} the x-axis.`,
                "Where it sits doesn't decide it. Look at the shape: is it the highest or lowest point?")
        ];
        if (h !== 0) {
            options.push(choice(`Its x-coordinate is ${h > 0 ? 'positive' : 'negative'}.`,
                "The coordinates don't decide it. Look at the shape of the curve."));
        }
        return options;
    }

    function unique(options) {
        return options.filter((option, index) => options.findIndex(other => other.label === option.label) === index);
    }

    // A form for Practice. `trap` asks for a minimum above the x-axis or a maximum below it.
    function makeForm(random, trap) {
        const { randomInt } = window.Maths1to9LessonEngine;
        for (;;) {
            const a = random() < 0.5 ? 1 : -1;
            const h = randomInt(-3, 3, random);
            const k = a === 1 ? randomInt(trap ? 1 : -4, 2, random) : randomInt(-2, trap ? -1 : 4, random);
            if (h === k || (h === 0 && k === 0)) continue;
            return { a, h, k };
        }
    }

    const typedTypes = ['read-point'];
    const choiceTypes = ['type', 'which-point', 'why'];

    // Six cards, typed first, alternating. One card (chosen by seed) uses a "position trap" form.
    function pick(random) {
        const { shuffle, randomInt } = window.Maths1to9LessonEngine;
        const choices = shuffle(choiceTypes, random);
        const trapAt = randomInt(0, 5, random);
        const items = [];
        for (let i = 0; i < 3; i++) {
            items.push({ type: 'read-point' }, { type: choices[i] });
        }
        return items.map((item, index) => ({ ...item, trap: index === trapAt, seed: randomInt(0, 4294967295, random) }));
    }

    function generate(item, random) {
        const { shuffle } = window.Maths1to9LessonEngine;
        const form = makeForm(random, item.trap);
        let config;
        if (item.type === 'read-point') config = pointCard(form);
        else {
            const options = item.type === 'type' ? typeOptions(form)
                : item.type === 'which-point' ? whichOptions(form, random) : whyOptions(form);
            const prompt = item.type === 'type' ? 'Is the turning point a minimum or a maximum?'
                : item.type === 'which-point' ? 'Which point is the turning point?'
                : `How can you tell the turning point is a ${kind(form)}?`;
            config = { input: 'choice', prompt, options: shuffle(unique(options), random), figure: figure(form) };
        }
        return { ...config, form, questionType: item.type };
    }

    window.Turning = {
        GRID, number, nb, coordinate, valueOf, kind, turningPoint, node, strongText, graph, shapeLabel,
        positions, markTurningPoint, guides, figure, turningRules, pointCard, choice, typeOptions,
        whichOptions, whyOptions, unique, makeForm, typedTypes, choiceTypes, pick, generate
    };
})();
