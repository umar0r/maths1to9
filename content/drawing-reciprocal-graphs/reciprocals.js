(() => {
    'use strict';
    const xs = [-2, -1, -0.5, 0.5, 1, 2];
    const number = value => String(value).replace(/-/g, '−');
    const bracket = x => x < 0 ? `(${number(x)})` : number(x);
    const coordinate = point => `(${point.map(number).join(', ')})`;
    const nb = text => text.replace(/ /g, '\u00a0');
    function prose(text) {
        return String(text).replace(/\([−\d.xy]+, [−\d.xy]+\)/g, nb)
            .replace(/(?:[−\d.xy/]+|\(−[\d.]+\))(?: (?:=|÷|[+−×]) (?:[−\d.xy/]+|\(−[\d.]+\)))+/g, nb);
    }
    function prepare(config) {
        const result = { ...config };
        for (const key of ['prompt', 'feedback', 'fallback']) if (result[key]) result[key] = prose(result[key]);
        if (result.options) result.options = result.options.map(option => ({ ...option, label: prose(option.label), feedback: prose(option.feedback) }));
        if (result.rules) result.rules = result.rules.map(rule => ({ ...rule, feedback: prose(rule.feedback) }));
        if (result.fields) result.fields = result.fields.map(field => ({ ...field, label: prose(field.label) }));
        return result;
    }
    const reciprocalText = k => 'y = ' + k + '/x';
    function valueOf(k, x) {
        if (x === 0) throw new RangeError('Do not divide by zero.');
        return k / x;
    }
    const workingText = (k, x) => k + ' ÷ ' + bracket(x) + ' = ' + number(valueOf(k, x));
    const curveDomains = k => [[k / 4, 4], [-4, -k / 4]];
    function drawCurves(board, k, options = {}) {
        return curveDomains(k).map(domain => board.plot(x => valueOf(k, x), { ...options, domain }));
    }
    function valueRules(k, x) {
        const rules = [], used = new Set([valueOf(k, x)]);
        function add(value, feedback) {
            if (used.has(value)) return;
            used.add(value);
            rules.push({ value: String(value), feedback });
        }
        add(x / k, "That's the wrong way round. " + reciprocalText(k) + ' means ' + k + ' ÷ ' + bracket(x) + ', not ' + bracket(x) + ' ÷ ' + k + '.');
        add(k * x, "That's multiplying. " + reciprocalText(k) + ' means divide: ' + workingText(k, x) + '.');
        add(-valueOf(k, x), 'Check the sign. ' + k + ' divided by a negative is negative; by a positive, positive.');
        add(0, k + ' ÷ ' + bracket(x) + " isn't 0. It's " + number(valueOf(k, x)) + ': close to 0, but not 0.');
        return rules;
    }
    const fieldId = x => 'x' + x;
    const answers = (k, values = xs) => Object.fromEntries(values.map(x => [fieldId(x), String(valueOf(k, x))]));
    function tableRules(k, values = xs) {
        return [
            { value: Object.fromEntries(values.map(x => [fieldId(x), String(x / k)])),
                feedback: 'Divide ' + k + ' by x, not x by ' + k + '.' },
            { matches: value => values.filter(x => x < 0).every(x => readNumber(value[fieldId(x)]) > 0),
                feedback: 'A negative x gives a negative y: ' + workingText(k, -2) + '.' },
            ...values.map(x => ({ value: answers(k, values.filter(other => other !== x)),
                feedback: 'One box is wrong. Work out that one again: ' + workingText(k, x) }))
        ];
    }
    function plotMark(point, target) {
        const [x, y] = target;
        if (point[0] === x && point[1] === y) return { correct: true, feedback: 'Right.' };
        let feedback;
        if (x !== y && point[0] === y && point[1] === x) feedback = 'Go across first for x, then up or down for y.';
        else if (x !== 0 && point[0] === -x && point[1] === y) feedback = 'Check the x sign. Negative x is to the left of 0.';
        else if (y !== 0 && point[0] === x && point[1] === -y) feedback = 'Check the y sign. Negative y is below 0.';
        else if (point[0] === x && Math.abs(point[1] - y) === 0.5 ||
            point[1] === y && Math.abs(point[0] - x) === 0.5) {
            feedback = 'Each faint line is a half. 0.5 is halfway between 0 and 1.';
        }
        else feedback = `Start at (0, 0). Go across to x = ${number(x)}, then ${y > 0 ? 'up' : y < 0 ? 'down' : 'stay on the x-axis'}${y ? ` to y = ${number(y)}` : ''}.`;
        return { correct: false, feedback };
    }
    function node(tag, text = '', className = '') {
        const element = document.createElement(tag);
        element.textContent = prose(text); element.className = className;
        return element;
    }
    function table(form, { values = xs, filled = values, highlighted = null } = {}) {
        const element = node('table', '', 'reciprocal-table');
        element.setAttribute('aria-label', `Table of values for ${reciprocalText(form)}`);
        for (const axis of ['x', 'y']) {
            const row = node('tr'); const heading = node('th', axis); heading.scope = 'row'; row.append(heading);
            for (const x of values) {
                const cell = node('td'); cell.dataset.x = x;
                if (x === highlighted) cell.setAttribute('aria-current', 'true');
                if (axis === 'x' || filled.includes(x)) cell.textContent = number(axis === 'x' ? x : valueOf(form, x));
                else {
                    const box = node('span', '', 'reciprocal-empty');
                    box.setAttribute('aria-label', 'y when x = ' + number(x));
                    cell.append(box);
                }
                row.append(cell);
            }
            element.append(row);
        }
        return element;
    }
    function graph(host, form) {
        return window.Maths1to9Graph.create(host, { x: [-4, 4], y: [-4, 4], step: { x: 1, y: 1 }, subdivide: { x: 2, y: 2 },
            label: `Coordinate grid with the points of ${reciprocalText(form)}.` });
    }
    function guides(board, [x, y]) {
        return [board.segment([0, 0], [x, 0], { dash: true, tone: 'muted' }),
            board.segment([x, 0], [x, y], { dash: true, tone: 'muted' })];
    }
    function point(board, position, tone = 'neutral', coordinates = false) {
        return board.point(position, { size: 'large', coordinates, tone, labelSide: position[0] < 0 ? 'left' : 'right' });
    }
    function plotWidget(form, x) {
        const target = [x, valueOf(form, x)];
        return {
            isEmpty: value => value === null,
            mark(value) {
                const result = plotMark(value, target);
                return { ...result, feedback: prose(result.feedback) };
            },
            answerText: value => prose(`You plotted ${coordinate(value)}.`),
            render(host, { onChange }) {
                host.append(table(form));
                const grid = node('div'); host.append(grid);
                // Leave room for the card's point-naming prompt above the table.
                document.fonts.ready.then(() => requestAnimationFrame(() => {
                    if (host.isConnected && host.getBoundingClientRect().width) {
                        host.querySelector('table').scrollIntoView({ block: 'start', behavior: 'instant' });
                    }
                }));
                const board = graph(grid, form);
                xs.filter(other => other !== x).forEach(other => point(board, [other, valueOf(form, other)]));
                let picker = null, shown = [];
                function clear() { picker?.stop(); picker = null; shown.forEach(item => item.remove()); shown = []; }
                function start() {
                    picker = board.pick({ onPick(value) {
                        clear(); shown = [point(board, value, 'neutral', true)]; onChange(value); start();
                    } });
                }
                return {
                    update({ value, editable, phase }) {
                        clear(); board.setEditable(editable);
                        if (value) shown.push(point(board, value, phase === 'wrong' ? 'incorrect' : phase === 'correct' ? 'correct' : 'neutral', phase !== 'correct'));
                        if (phase === 'wrong') shown.push(...guides(board, target));
                        if (editable && phase === 'answer') start();
                    },
                    focus() { grid.querySelector('[role="application"]')?.focus(); }
                };
            }
        };
    }
    function valueCard(form, x) {
        return { input: 'number', fractions: true, answer: String(valueOf(form, x)), rules: valueRules(form, x),
            fallback: 'Divide ' + form + ' by x: ' + workingText(form, x), feedback: `Right. ${workingText(form, x)}.` };
    }
    // Accept a signed decimal; invalid or incomplete text has no numeric value.
    function readNumber(text) {
        const tidy = String(text ?? '').trim().replace(/[−–]/g, '-');
        return /^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(tidy) && Number.isFinite(Number(tidy)) ? Number(tidy) : null;
    }

    // The table's y cells are the answer boxes. Each value typed appears straight away as a point on the
    // graph beside the table, in a neutral colour, so the pupil sees it land without being told if it's right.
    function tableWidget(form, values = xs, { correctFeedback = 'Right.' } = {}) {

        const target = answers(form, values);
        const rules = tableRules(form, values);
        const fallback = 'Divide ' + form + ' by each x. Negative x gives negative y.';
        const filled = value => value && values.every(x => readNumber(value[fieldId(x)]) !== null);
        let lastChecked = null;
        return {
            kind: 'table', values, answers: target,
            isEmpty: value => !filled(value),
            mark(value) {
                lastChecked = { ...value };
                if (values.every(x => readNumber(value[fieldId(x)]) === Number(target[fieldId(x)]))) {
                    return { correct: true, feedback: prose(correctFeedback) };
                }
                const rule = rules.find(r => r.matches ? r.matches(value) : Object.entries(r.value).every(([id, v]) => readNumber(value[id]) === Number(v)));
                return { correct: false, feedback: prose(rule ? rule.feedback : fallback) };
            },
            answerText: value => `You wrote y = ${values.map(x => number(readNumber(value?.[fieldId(x)]) ?? '?')).join(', ')}.`,
            render(host, { value, onChange }) {
                const layout = node('div', '', 'reciprocal-live');
                const tableHost = node('div', '', 'reciprocal-live__table');
                const graphHost = node('div', '', 'reciprocal-live__graph');
                layout.append(tableHost, graphHost);
                host.append(layout);
                const element = node('table', '', 'reciprocal-table');
                element.setAttribute('aria-label', `Table of values for ${reciprocalText(form)}`);
                const inputs = {};
                for (const axis of ['x', 'y']) {
                    const row = node('tr');
                    const heading = node('th', axis);
                    heading.scope = 'row';
                    row.append(heading);
                    for (const x of values) {
                        const cell = node('td');
                        cell.dataset.x = x;
                        if (axis === 'x') cell.textContent = number(axis === 'x' ? x : valueOf(form, x));
                        else {
                            const input = node('input', '', 'reciprocal-cell');
                            Object.assign(input, { type: 'text', inputMode: 'text', autocomplete: 'off', spellcheck: false });
                            input.setAttribute('autocapitalize', 'off');
                            input.setAttribute('autocorrect', 'off');
                            input.setAttribute('aria-label', `y when x = ${number(x)}`);
                            inputs[x] = input;
                            cell.append(input);
                        }
                        row.append(cell);
                    }
                    element.append(row);
                }
                tableHost.append(element);
                const board = graph(graphHost, form);
                const points = {};
                let curves = [];
                const current = () => Object.fromEntries(values.map(x => [fieldId(x), inputs[x].value.trim()]));
                // Move one point to match its box; nothing else on the graph is redrawn.
                function show(x, tone = 'neutral') {
                    const y = readNumber(inputs[x].value);
                    const visible = y !== null && y >= -4 && y <= 4 && Number.isInteger(x * 2) && Number.isInteger(y * 2);
                    if (!visible) { points[x]?.remove(); delete points[x]; return; }
                    if (points[x]) points[x].update({ value: [x, y], tone });
                    else points[x] = point(board, [x, y], tone);
                }
                function highlight(x) {
                    element.querySelectorAll('[aria-current]').forEach(cell => cell.removeAttribute('aria-current'));
                    if (x !== null) element.querySelectorAll(`[data-x="${x}"]`).forEach(cell => cell.setAttribute('aria-current', 'true'));
                }
                values.forEach(x => {
                    inputs[x].addEventListener('input', () => { show(x); onChange(current()); });
                    inputs[x].addEventListener('focus', () => highlight(x));
                    inputs[x].addEventListener('blur', () => highlight(null));
                });
                function fill(value) {
                    values.forEach(x => { inputs[x].value = value?.[fieldId(x)] ?? ''; show(x); });
                }
                fill(value);
                return {
                    update({ value, editable, phase }) {
                        curves.forEach(item => item.remove());
                        curves = [];
                        if (phase === 'wrong' && value) lastChecked = { ...value };
                        // After Try again, keep the boxes that were right and empty only the wrong ones.
                        if (phase === 'answer' && !value && lastChecked) {
                            const kept = Object.fromEntries(values.map(x => [fieldId(x),
                                readNumber(lastChecked[fieldId(x)]) === Number(target[fieldId(x)]) ? number(readNumber(lastChecked[fieldId(x)])) : '']));
                            lastChecked = null;
                            fill(kept);
                            onChange(kept);
                        } else fill(value);
                        values.forEach(x => {
                            inputs[x].readOnly = !editable;
                            // Once checked, show the pupil's number with a proper minus sign, as the shared boxes do.
                            const typed = readNumber(inputs[x].value);
                            if (phase !== 'answer' && typed !== null) inputs[x].value = number(typed);
                            const right = readNumber(inputs[x].value) === Number(target[fieldId(x)]);
                            const tone = phase === 'answer' ? 'neutral' : right ? 'correct' : 'incorrect';
                            inputs[x].classList.toggle('is-correct', phase !== 'answer' && right);
                            inputs[x].classList.toggle('is-incorrect', phase !== 'answer' && !right);
                            show(x, tone);
                        });
                        if (phase === 'correct') curves = drawCurves(board, form, { tone: 'correct' });
                    },
                    focus() {
                        (values.map(x => inputs[x]).find(input => !input.value) || inputs[values[0]]).focus();
                    }
                };
            }
        };
    }
    function tableCard(form, values = xs, options = {}) {
        return { input: 'custom', widget: tableWidget(form, values, options) };
    }
    const choice = (label, feedback, correct = false) => ({ label, feedback, correct });
    const joinOptions = () => [
        choice('Two separate smooth curves, one on each side', 'Right.', true),
        choice('One curve through every point', "There's no point where x = 0, so the curve can't cross the middle."),
        choice('Straight lines from dot to dot', "Reciprocal graphs curve smoothly. They don't have corners."),
        choice('Curves that run on to touch the axes', 'The curves get closer to the axes, but never touch them.')
    ];
    const joinLabels = ['Two separate smooth curves', 'One curve, joined across the middle', 'Straight lines, dot to dot', 'Curves that touch the axes'];
    const joinFeedback = [
        '✓ Two smooth curves, one on each side. They never meet.',
        "There's no point where x = 0. Keep the two curves apart.",
        "The graph doesn't have corners, and it doesn't cross the middle. Use two smooth curves.",
        'The curves get closer to the axes but never touch them. 1 ÷ x is never 0.'
    ];
    function joinDrawing(board, k, index) {
        const points = xs.map(x => [x, valueOf(k, x)]);
        const tone = index === 0 ? 'correct' : 'incorrect';
        if (index === 2) return points.slice(1).map((point, i) => board.segment(points[i], point, { tone }));
        if (index === 3) return [
            ...[[0.5, 2], [-2, -0.5]].map(domain => board.plot(x => 1 / x, { domain, tone })),
            ...[[[2, 0.5], [4, 0]], [[0.5, 2], [0, 4]], [[-2, -0.5], [-4, 0]], [[-0.5, -2], [0, -4]]]
                .map(([from, to]) => board.segment(from, to, { tone }))
        ];
        const curves = drawCurves(board, k, { tone });
        if (index === 1) curves.push(board.segment([-0.5, -2], [0.5, 2], { tone }));
        return curves;
    }
    function biggerCard() {
        return { input: 'choice', prompt: 'On the right-hand curve, what happens to y as x gets bigger?', options: [
            choice('y gets smaller, closer and closer to 0.', 'Right. 1 ÷ 2 = 0.5, 1 ÷ 4 = 0.25, 1 ÷ 100 = 0.01.', true),
            choice('y gets bigger.', 'Look at the curve: it goes down as you move right. 1 ÷ 4 = 0.25 is less than 1 ÷ 2 = 0.5.'),
            choice('y reaches 0 at x = 4.', '1 ÷ 4 = 0.25, not 0. y gets closer to 0, but never reaches it.'),
            choice('y stays the same.', '1 ÷ 1 = 1 but 1 ÷ 2 = 0.5. y changes as x changes.')
        ] };
    }
    const typedTypes = ['value', 'table', 'plot'], choiceTypes = ['point-on', 'at-zero', 'negative', 'bigger', 'join'];
    const tableSets = k => k === 2 ? [[-4, -2, -1, 1, 2, 4]] : [xs, [-4, -1, -0.25, 0.25, 1, 4]];
    function pick(random) {
        const { shuffle, randomInt } = window.Maths1to9LessonEngine;
        const k = randomInt(0, 2, random) === 0 ? 2 : 1;
        const typed = shuffle(typedTypes, random), choices = shuffle(choiceTypes, random).slice(0, 3);
        return typed.flatMap((type, i) => [type, choices[i]]).map(type => ({
            type, k, seed: randomInt(0, 4294967295, random)
        }));
    }
    function generate(item, random) {
        const { randomInt, shuffle } = window.Maths1to9LessonEngine;
        const choose = values => values[randomInt(0, values.length - 1, random)];
        const k = item.k || 1;
        let config;
        if (item.type === 'value') {
            const x = choose(k === 1 ? [-4, -2, -1, -0.5, -0.25, 0.25, 0.5, 1, 2, 4] : [-4, -2, -1, -0.5, 0.5, 1, 2, 4]);
            config = { ...valueCard(k, x), prompt: 'For ' + reciprocalText(k) + ', what is y when x = ' + number(x) + '?' + (k === 2 ? ' This time, divide 2 by x.' : '') };
        } else if (item.type === 'table') config = { ...tableCard(k, choose(tableSets(k))), prompt: 'Complete the table for ' + reciprocalText(k) + '.' };
        else if (item.type === 'plot') {
            const x = choose(xs);
            config = { input: 'custom', widget: plotWidget(k, x), prompt: 'Plot the point for x = ' + number(x) + '.' };
        } else if (item.type === 'point-on') {
            const x = choose([2, 4, 0.5]), y = 1 / x;
            config = { input: 'choice', prompt: 'Which point is on the graph of y = 1/x?', options: [
                choice(coordinate([x, y]), 'Right. ' + workingText(1, x) + '.', true),
                choice(coordinate([x, x]), "That's " + number(x) + ' ÷ 1. y = 1/x means ' + workingText(1, x) + '.'),
                choice(coordinate([-x, y]), 'A negative x gives a negative y: ' + workingText(1, -x) + '.'),
                choice('(0, 0)', "There's no point where x = 0. 1 ÷ 0 has no answer.")
            ] };
        } else if (item.type === 'at-zero') config = { input: 'choice', prompt: 'What is y when x = 0 on the graph of y = 1/x?', options: [
            choice("There isn't one. 1 ÷ 0 has no answer.", "Right. That's why the graph never touches the y-axis.", true),
            choice('y = 0', "1 ÷ 0 isn't 0. No number times 0 makes 1, so there's no answer."),
            choice('y = 1', "1 ÷ 1 = 1, but here x = 0. You can't divide by 0."),
            choice('y = 10', "The curve gets very steep near x = 0, but it never reaches it. There's no point at x = 0.")
        ] };
        else if (item.type === 'negative') config = { input: 'choice', prompt: 'On the graph of y = 1/x, x is negative. What can you say about y?', options: [
            choice('y is negative too.', "Right. 1 ÷ (−2) = −0.5. That's the bottom-left curve.", true),
            choice('y is positive.', '1 divided by a negative is negative: 1 ÷ (−2) = −0.5.'),
            choice('y is 0.', '1 ÷ x is never 0. It gets close to 0, but never reaches it.'),
            choice('y is the same as x.', 'Only at (−1, −1). At x = −2, y = −0.5.')
        ] };
        else if (item.type === 'bigger') config = biggerCard();
        else config = { input: 'choice', prompt: 'Sam plots every point of y = 1/x correctly. How should Sam join them?', options: joinOptions() };
        if (config.options) config.options = shuffle(config.options, random);
        return prepare({ ...config, questionType: item.type });
    }
    window.Reciprocals = { prose, prepare, xs, number, bracket, coordinate, nb, valueOf, reciprocalText, workingText,
        curveDomains, drawCurves, valueRules, tableRules, plotMark, plotWidget, tableWidget, readNumber, node, table,
        graph, guides, point, valueCard, tableCard, choice, joinOptions, joinLabels, joinFeedback,
        joinDrawing, biggerCard, typedTypes, choiceTypes, tableSets, pick, generate };
})();
