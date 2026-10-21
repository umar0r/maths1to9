(() => {
    'use strict';
    const xs = [-2, -1, 0, 1, 2];
    const number = value => String(value).replace(/-/g, '−');
    const bracket = x => x < 0 ? `(${number(x)})` : number(x);
    const coordinate = point => `(${point.map(number).join(', ')})`;
    const nb = text => text.replace(/ /g, '\u00a0');
    function prose(text) {
        return String(text).replace(/\([−\dxy]+, [−\dxy]+\)/g, nb)
            .replace(/(?:[−\dxy]+²?|\(−\d+\)²?)(?: (?:=|[+−×]) (?:[−\dxy]+²?|\(−\d+\)²?))+/g, nb);
    }
    function prepare(config) {
        const result = { ...config };
        for (const key of ['prompt', 'feedback', 'fallback']) if (result[key]) result[key] = prose(result[key]);
        if (result.options) result.options = result.options.map(option => ({ ...option, label: prose(option.label), feedback: prose(option.feedback) }));
        if (result.rules) result.rules = result.rules.map(rule => ({ ...rule, feedback: prose(rule.feedback) }));
        if (result.fields) result.fields = result.fields.map(field => ({ ...field, label: prose(field.label) }));
        return result;
    }
    const tail = c => c ? ` ${c < 0 ? '−' : '+'} ${number(Math.abs(c))}` : '';
    const valueOf = ({ a, c }, x) => a * x * x + c;
    function quadraticText({ a, c }) {
        return a === -1 ? `y = ${number(c)} − x²` : `y = ${a === 1 ? '' : number(a)}x²${tail(c)}`;
    }
    function workingText({ a, c }, x) {
        const square = `${bracket(x)}²`, squared = number(x * x);
        if (a === 1 && c === 0) return `${square} = ${squared}`;
        if (a === -1) return `${number(c)} − ${square} = ${number(c)} − ${squared} = ${number(valueOf({ a, c }, x))}`;
        const first = `${a === 1 ? '' : `${number(a)} × `}${square}${tail(c)}`;
        const next = `${a === 1 ? '' : `${number(a)} × `}${squared}${tail(c)}`;
        return `${first} = ${next} = ${number(valueOf({ a, c }, x))}`;
    }
    function valueRules(form, x) {
        const { a, c } = form;
        const rules = [], used = new Set([valueOf(form, x)]);
        function add(value, feedback) {
            if (used.has(value)) return;
            used.add(value); rules.push({ value: String(value), feedback });
        }
        if (x < 0) add(-a * x * x + c, `A negative times a negative is positive: ${bracket(x)}² = ${number(x * x)}.`);
        add(a * 2 * x + c, `Squaring isn't doubling. ${bracket(x)}² = ${bracket(x)} × ${bracket(x)} = ${number(x * x)}.`);
        if (a === 2) add((a * x) ** 2 + c, `Square first, then multiply by 2: 2 × ${bracket(x)}² = 2 × ${number(x * x)} = ${number(2 * x * x)}.`);
        if (c) {
            add(a * x * x - c, `Check the sign of the number: ${quadraticText(form)}, so ${c < 0 ? 'subtract' : 'add'} ${Math.abs(c)}.`);
            add(a * x * x, `Don't forget the ${tail(c).trim()}.`);
        }
        if (a === -1) add(x * x + c, `x² is taken away: ${number(c)} − ${number(x * x)} = ${number(valueOf(form, x))}.`);
        return rules;
    }
    const fieldId = x => `x${x}`;
    const answers = (form, values = xs) => Object.fromEntries(values.map(x => [fieldId(x), String(valueOf(form, x))]));
    function tableRules(form, values = xs) {
        const negatives = values.filter(x => x < 0);
        const rules = [];
        if (negatives.length) rules.push({ value: Object.fromEntries(negatives.map(x => [fieldId(x), String(-form.a * x * x + form.c)])),
            feedback: 'A negative times a negative is positive. The y for x = −2 is the same as for x = 2.' });
        rules.push({ value: Object.fromEntries(values.map(x => [fieldId(x), String(form.a * 2 * x + form.c)])),
            feedback: "Squaring isn't doubling. x² means x × x." });
        if (values.includes(0)) rules.push({ value: answers(form, values.filter(x => x !== 0)),
            feedback: `When x = 0, x² = 0, so y is just the number: ${number(form.c)}.` });
        values.filter(x => x !== 0).forEach(x => rules.push({ value: answers(form, values.filter(other => other !== x)),
            feedback: `One box is wrong. Work out that one again: ${workingText(form, x)}` }));
        return rules;
    }
    function plotMark(point, target) {
        const [x, y] = target;
        if (point[0] === x && point[1] === y) return { correct: true, feedback: 'Right.' };
        let feedback;
        if (x !== y && point[0] === y && point[1] === x) feedback = 'Go across first for x, then up or down for y.';
        else if (x !== 0 && point[0] === -x && point[1] === y) feedback = 'Check the x sign. Negative x is to the left of 0.';
        else if (y !== 0 && point[0] === x && point[1] === -y) feedback = 'Check the y sign. Negative y is below 0.';
        else feedback = `Start at (0, 0). Go across to x = ${number(x)}, then ${y > 0 ? 'up' : y < 0 ? 'down' : 'stay on the x-axis'}${y ? ` to y = ${number(y)}` : ''}.`;
        return { correct: false, feedback };
    }
    function node(tag, text = '', className = '') {
        const element = document.createElement(tag);
        element.textContent = prose(text); element.className = className;
        return element;
    }
    function table(form, { filled = xs, highlighted = null, onPick = null, pickable = xs } = {}) {
        const element = node('table', '', 'quadratic-table');
        element.setAttribute('aria-label', `Table of values for ${quadraticText(form)}`);
        for (const axis of ['x', 'y']) {
            const row = node('tr'); const heading = node('th', axis); heading.scope = 'row'; row.append(heading);
            for (const x of xs) {
                const cell = node('td'); cell.dataset.x = x;
                if (x === highlighted) cell.setAttribute('aria-current', 'true');
                if (axis === 'x' || filled.includes(x)) cell.textContent = number(axis === 'x' ? x : valueOf(form, x));
                else {
                    const tappable = onPick && pickable.includes(x);
                    const box = node(tappable ? 'button' : 'span', '', 'quadratic-empty');
                    box.setAttribute('aria-label', `y when x = ${number(x)}`);
                    if (tappable) { box.type = 'button'; box.addEventListener('click', () => onPick(x)); }
                    cell.append(box);
                }
                row.append(cell);
            }
            element.append(row);
        }
        return element;
    }
    function graph(host, form) {
        return window.Maths1to9Graph.create(host, { x: [-4, 4], y: [-5, 6], step: { x: 1, y: 1 },
            label: `Coordinate grid with the points of ${quadraticText(form)}.` });
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
            mark: value => plotMark(value, target),
            answerText: value => `You plotted ${coordinate(value)}.`,
            render(host, { onChange }) {
                host.append(table(form));
                const grid = node('div'); host.append(grid);
                requestAnimationFrame(() => {
                    if (host.isConnected && host.getBoundingClientRect().width) host.querySelector('table').scrollIntoView({ block: 'start' });
                });
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
            fallback: workingText(form, x), feedback: `Right. ${workingText(form, x)}.` };
    }
    // A typed whole number, accepting any of the minus signs a phone keyboard offers; null if it isn't one.
    function readNumber(text) {
        const tidy = String(text ?? '').trim().replace(/[−–]/g, '-');
        return /^-?\d+$/.test(tidy) ? Number(tidy) : null;
    }

    // The table's y cells are the answer boxes. Each value typed appears straight away as a point on the
    // graph beside the table, in a neutral colour, so the pupil sees it land without being told if it's right.
    function tableWidget(form, values = xs, { correctFeedback = 'Right.' } = {}) {
        const given = xs.filter(x => !values.includes(x));
        const target = answers(form, values);
        const rules = tableRules(form, values);
        const fallback = 'Square x first, then the rest. Work each column out on its own.';
        const filled = value => value && values.every(x => readNumber(value[fieldId(x)]) !== null);
        let lastChecked = null;
        return {
            kind: 'table', values, answers: target,
            isEmpty: value => !filled(value),
            mark(value) {
                lastChecked = { ...value };
                if (values.every(x => readNumber(value[fieldId(x)]) === Number(target[fieldId(x)]))) {
                    return { correct: true, feedback: correctFeedback };
                }
                const rule = rules.find(r => Object.entries(r.value).every(([id, v]) => readNumber(value[id]) === Number(v)));
                return { correct: false, feedback: rule ? rule.feedback : fallback };
            },
            answerText: value => `You wrote y = ${values.map(x => number(readNumber(value?.[fieldId(x)]) ?? '?')).join(', ')}.`,
            render(host, { value, onChange }) {
                const layout = node('div', '', 'quadratic-live');
                const tableHost = node('div', '', 'quadratic-live__table');
                const graphHost = node('div', '', 'quadratic-live__graph');
                layout.append(tableHost, graphHost);
                host.append(layout);
                const element = node('table', '', 'quadratic-table');
                element.setAttribute('aria-label', `Table of values for ${quadraticText(form)}`);
                const inputs = {};
                for (const axis of ['x', 'y']) {
                    const row = node('tr');
                    const heading = node('th', axis);
                    heading.scope = 'row';
                    row.append(heading);
                    for (const x of xs) {
                        const cell = node('td');
                        cell.dataset.x = x;
                        if (axis === 'x' || given.includes(x)) cell.textContent = number(axis === 'x' ? x : valueOf(form, x));
                        else {
                            const input = node('input', '', 'quadratic-cell');
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
                given.forEach(x => point(board, [x, valueOf(form, x)]));
                const points = {};
                let curve = null;
                const current = () => Object.fromEntries(values.map(x => [fieldId(x), inputs[x].value.trim()]));
                // Move one point to match its box; nothing else on the graph is redrawn.
                function show(x, tone = 'neutral') {
                    const y = readNumber(inputs[x].value);
                    const visible = y !== null && y >= -5 && y <= 6;
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
                        curve?.remove();
                        curve = null;
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
                        if (phase === 'correct') curve = board.plot(x => valueOf(form, x), { domain: [-2.3, 2.3], tone: 'correct' });
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
        choice('One smooth curve through every point', 'Right.', true),
        choice('Straight lines from dot to dot', "Quadratic graphs curve smoothly. They don't have corners."),
        choice('A curve through the outer points only', 'The curve must go through every point, the lowest one too.'),
        choice('A ruler line from the first point to the last', "That's for straight-line graphs. This one is a curve.")
    ];
    const typedTypes = ['value', 'table', 'plot'], choiceTypes = ['point-on', 'shape', 'join'];
    function pick(random) {
        const { shuffle, randomInt } = window.Maths1to9LessonEngine;
        const varied = random() < 0.5;
        const typed = shuffle(typedTypes, random), choices = shuffle(choiceTypes, random);
        return typed.flatMap((type, i) => [type, choices[i]]).map(type => ({ type, varied, seed: randomInt(0, 4294967295, random) }));
    }
    function generate(item, random) {
        const { randomInt, shuffle } = window.Maths1to9LessonEngine;
        const a = item.varied ? [-1, 2][randomInt(0, 1, random)] : 1;
        const c = a === 1 ? randomInt(-4, 1, random) : a === -1 ? randomInt(1, 4, random) : randomInt(-5, -3, random);
        const form = { a, c }, equation = quadraticText(form);
        const advice = a === 2 ? ' Square x first, then multiply by 2.' : a === -1 ? ` Square x first, then take it away from ${c}.` : '';
        let config;
        if (item.type === 'value') {
            const x = [-3, -2, -1, 1, 2, 3][randomInt(0, 5, random)];
            config = { ...valueCard(form, x), prompt: `For ${equation}, what is y when x = ${number(x)}?${advice}` };
        } else if (item.type === 'table') config = { ...tableCard(form), prompt: `Complete the table for ${equation}.${advice}` };
        else if (item.type === 'plot') {
            const x = xs[randomInt(0, 4, random)];
            config = { input: 'custom', widget: plotWidget(form, x), prompt: `Plot the point for x = ${number(x)}.` };
        } else if (item.type === 'point-on') {
            const form = { a: 1, c: 1 }, x = randomInt(-2, -1, random), y = valueOf(form, x);
            config = { input: 'choice', prompt: 'Which point is on the graph of y = x² + 1?', options: [
                choice(coordinate([x, y]), `Right. ${workingText(form, x)}.`, true),
                choice(coordinate([x, -x * x + 1]), `A negative times a negative is positive: ${bracket(x)}² = ${x * x}, so y = ${y}.`),
                choice(coordinate([x, x * x]), `You squared ${number(x)}, but forgot the + 1.`),
                choice(coordinate([y, x]), `x comes first. When x = ${number(x)}, y = ${y}: the point is ${coordinate([x, y])}.`) ] };
        } else if (item.type === 'shape') config = { input: 'choice', prompt: `What shape is the graph of ${equation}?`, options: [
            choice(a < 0 ? 'An upside-down U' : 'A U shape', a < 0 ? 'Right. x² is taken away, so the curve opens downwards.' : 'x² is added, so it opens upwards.', true),
            choice(a < 0 ? 'A U shape' : 'An upside-down U', a < 0 ? 'x² is taken away here, so the curve is upside down.' : 'x² is added here, so the curve is a U, the right way up.'),
            choice('A straight line', "It has x² in it, so it's a curve, not a straight line.") ] };
        else config = { input: 'choice', prompt: 'Ali plots every point of y = x² − 1 correctly. How should he join them?', options: joinOptions() };
        if (config.options) config.options = shuffle(config.options.filter((option, index, all) => all.findIndex(other => other.label === option.label) === index), random);
        return prepare({ ...config, questionType: item.type });
    }
    window.Quadratics = { prose, prepare, xs, number, bracket, coordinate, nb, valueOf, quadraticText, workingText, valueRules, tableRules,
        plotMark, plotWidget, tableWidget, readNumber, node, table, graph, guides, point, valueCard, tableCard, choice, joinOptions, typedTypes, choiceTypes, pick, generate };
})();
