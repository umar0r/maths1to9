(() => {
    'use strict';
    const xs = [-2, -1, 0, 1, 2];
    const number = value => String(value).replace(/-/g, '−');
    const bracket = x => x < 0 ? `(${number(x)})` : number(x);
    const coordinate = point => `(${point.map(number).join(', ')})`;
    const nb = text => text.replace(/ /g, '\u00a0');
    function prose(text) {
        return String(text).replace(/\([−\dxy]+, [−\dxy]+\)/g, nb)
            .replace(/(?:[−\dxy]+³?|\(−\d+\)³?)(?: (?:=|[+−×]) (?:[−\dxy]+³?|\(−\d+\)³?))+/g, nb);
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
    const valueOf = ({ a, c }, x) => a * x ** 3 + c;
    const cubicText = ({ a, c }) => `y = ${a === 1 ? '' : number(a)}x³${tail(c)}`;
    function workingText({ a, c }, x) {
        const cube = `${bracket(x)}³`, cubed = x ** 3;
        if (a === 1 && c === 0) return `${cube} = ${number(cubed)}`;
        const first = `${a === 1 ? '' : `${number(a)} × `}${cube}${tail(c)}`;
        const next = `${a === 1 ? number(cubed) : `${number(a)} × ${bracket(cubed)}`}${tail(c)}`;
        return `${first} = ${next} = ${number(valueOf({ a, c }, x))}`;
    }
    function plotDomain({ a, c }) {
        return [Math.max(-2.3, Math.cbrt((-10 - c) / a)), Math.min(2.3, Math.cbrt((10 - c) / a))];
    }
    function valueRules(form, x) {
        const { a, c } = form;
        const rules = [], used = new Set([valueOf(form, x)]);
        function add(value, feedback) {
            if (used.has(value)) return;
            used.add(value);
            rules.push({ value: String(value), feedback });
        }
        const cube = `${bracket(x)}³`, times = `${bracket(x)} × ${bracket(x)} × ${bracket(x)}`;
        if (x < 0) add(-a * x ** 3 + c, `A negative cubed stays negative: ${cube} = ${number(x ** 3)}.`);
        add(a * 3 * x + c, `Cubing isn't multiplying by 3. ${cube} = ${times} = ${number(x ** 3)}.`);
        add(a * x ** 2 + c, `That's squaring. Cubing is three lots: ${times} = ${number(x ** 3)}.`);
        if (a === 2) add((a * x) ** 3 + c, `Cube first, then multiply by 2: 2 × ${cube} = 2 × ${bracket(x ** 3)} = ${number(2 * x ** 3)}.`);
        if (a === 1 && c) add((x + c) ** 3, `Cube first, then ${c < 0 ? 'subtract' : 'add'} ${Math.abs(c)}. Don't ${c < 0 ? 'subtract' : 'add'} ${Math.abs(c)} before cubing.`);
        if (c) {
            add(a * x ** 3 - c, `Check the sign of the number: ${cubicText(form)}, so ${c < 0 ? 'subtract' : 'add'} ${Math.abs(c)}.`);
            add(a * x ** 3, `Don't forget the ${tail(c).trim()}.`);
        }
        return rules;
    }
    const fieldId = x => `x${x}`;
    const answers = (form, values = xs) => Object.fromEntries(values.map(x => [fieldId(x), String(valueOf(form, x))]));
    function tableRules(form, values = xs) {
        const negatives = values.filter(x => x < 0);
        const rules = [];
        if (negatives.length) rules.push({ value: Object.fromEntries(negatives.map(x => [fieldId(x), String(-form.a * x ** 3 + form.c)])),
            feedback: 'A negative cubed stays negative. The y for x = −2 is not the same as for x = 2.' });
        rules.push({ value: Object.fromEntries(values.map(x => [fieldId(x), String(form.a * x ** 2 + form.c)])),
            feedback: "That's squaring. Cube means x × x × x." });
        if (values.includes(0)) rules.push({ value: answers(form, values.filter(x => x !== 0)),
            feedback: `When x = 0, x³ = 0, so y is just the number: ${number(form.c)}.` });
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
        else if (Math.abs(y % 2) === 1 && point[0] === x && Math.abs(point[1] - y) === 1) {
            feedback = `Count carefully: the y-axis goes up in 2s. y = ${number(y)} is on the faint line between ${number(y - 1)} and ${number(y + 1)}.`;
        }
        else feedback = `Start at (0, 0). Go across to x = ${number(x)}, then ${y > 0 ? 'up' : y < 0 ? 'down' : 'stay on the x-axis'}${y ? ` to y = ${number(y)}` : ''}.`;
        return { correct: false, feedback };
    }
    function node(tag, text = '', className = '') {
        const element = document.createElement(tag);
        element.textContent = prose(text); element.className = className;
        return element;
    }
    function table(form, { filled = xs, highlighted = null, onPick = null, pickable = xs } = {}) {
        const element = node('table', '', 'cubic-table');
        element.setAttribute('aria-label', `Table of values for ${cubicText(form)}`);
        for (const axis of ['x', 'y']) {
            const row = node('tr'); const heading = node('th', axis); heading.scope = 'row'; row.append(heading);
            for (const x of xs) {
                const cell = node('td'); cell.dataset.x = x;
                if (x === highlighted) cell.setAttribute('aria-current', 'true');
                if (axis === 'x' || filled.includes(x)) cell.textContent = number(axis === 'x' ? x : valueOf(form, x));
                else {
                    const tappable = onPick && pickable.includes(x);
                    const box = node(tappable ? 'button' : 'span', '', 'cubic-empty');
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
        return window.Maths1to9Graph.create(host, { x: [-3, 3], y: [-10, 10], step: { x: 1, y: 2 }, subdivide: { x: 1, y: 2 },
            label: `Coordinate grid with the points of ${cubicText(form)}.` });
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
        const fallback = 'Cube x first, then the rest. Work each column out on its own.';
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
                const rule = rules.find(r => Object.entries(r.value).every(([id, v]) => readNumber(value[id]) === Number(v)));
                return { correct: false, feedback: prose(rule ? rule.feedback : fallback) };
            },
            answerText: value => `You wrote y = ${values.map(x => number(readNumber(value?.[fieldId(x)]) ?? '?')).join(', ')}.`,
            render(host, { value, onChange }) {
                const layout = node('div', '', 'cubic-live');
                const tableHost = node('div', '', 'cubic-live__table');
                const graphHost = node('div', '', 'cubic-live__graph');
                layout.append(tableHost, graphHost);
                host.append(layout);
                const element = node('table', '', 'cubic-table');
                element.setAttribute('aria-label', `Table of values for ${cubicText(form)}`);
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
                            const input = node('input', '', 'cubic-cell');
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
                    const visible = y !== null && y >= -10 && y <= 10;
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
                        if (phase === 'correct') curve = board.plot(x => valueOf(form, x), { domain: plotDomain(form), tone: 'correct' });
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
        choice('Draw one smooth curve through every point.', 'Right.', true),
        choice('Use a ruler line from the first point to the last.', "That's for straight-line graphs. This one is a curve."),
        choice('Draw a U shape through the points.', 'A U shape is a quadratic graph. A cubic graph is an S shape.'),
        choice('Nothing. Straight lines are fine.', "Cubic graphs curve smoothly. They don't have corners.")
    ];
    const joinLabels = ['A smooth S-shaped curve', 'Straight lines, dot to dot', 'One ruler line from first to last', 'A U-shaped curve'];
    const joinFeedback = [
        '✓ The curve goes through all five points and bends smoothly in the middle.',
        "The graph doesn't have corners. Cubic graphs curve smoothly between the points.",
        'A ruler line misses (−1, 0), (0, 1) and (1, 2). The curve must go through every point.',
        "That's the shape of a quadratic graph. These points go from bottom left to top right, so the curve can't turn back up."
    ];
    function joinDrawing(board, form, index) {
        const points = xs.map(x => [x, valueOf(form, x)]);
        const tone = index === 0 ? 'correct' : 'incorrect';
        if (index === 1) return points.slice(1).map((p, i) => board.segment(points[i], p, { tone }));
        if (index === 2) return [board.segment(points[0], points[4], { tone })];
        if (index === 3) {
            const edge = Math.min(2.3, Math.sqrt((10 - form.c) / 2));
            return [board.plot(x => form.c + 2 * x ** 2, { domain: [-edge, edge], tone })];
        }
        return [board.plot(x => valueOf(form, x), { domain: plotDomain(form), tone })];
    }
    const typedTypes = ['value', 'table', 'plot'], choiceTypes = ['cube', 'point-on', 'shape', 'crosses'];
    function pick(random) {
        const { shuffle, randomInt } = window.Maths1to9LessonEngine;
        const typed = shuffle(typedTypes, random), choices = shuffle(choiceTypes, random).slice(0, 3);
        return typed.flatMap((type, i) => [type, choices[i]]).map((type, index) => ({
            type, nonZero: index === 0, seed: randomInt(0, 4294967295, random)
        }));
    }
    function generate(item, random) {
        const { randomInt, shuffle } = window.Maths1to9LessonEngine;
        const choose = values => values[randomInt(0, values.length - 1, random)];
        const a = item.type === 'value' ? choose([1, 2]) : 1;
        const c = choose((a === 2 ? [-3, -2, -1, 0, 1, 2, 3] : [-2, -1, 0, 1, 2]).filter(c => !item.nonZero || c !== 0));
        const form = { a, c }, equation = cubicText(form);
        let config;
        if (item.type === 'value') {
            const x = choose([-3, -2, -1, 2, 3]);
            config = { ...valueCard(form, x), prompt: `For ${equation}, what is y when x = ${number(x)}?${a === 2 ? ' Cube x first, then multiply by 2.' : ''}` };
        } else if (item.type === 'table') config = { ...tableCard(form), prompt: `Complete the table for ${equation}.` };
        else if (item.type === 'plot') {
            const x = choose(xs);
            config = { input: 'custom', widget: plotWidget(form, x), prompt: `Plot the point for x = ${number(x)}.` };
        } else if (item.type === 'cube') {
            const x = choose([-3, -2, 2]), cube = x ** 3;
            const times = `${bracket(x)} × ${bracket(x)} × ${bracket(x)}`;
            const end = `${x * x} × ${bracket(x)} = ${number(cube)}`;
            config = { input: 'choice', prompt: `What is ${bracket(x)}³?`, options: [
                choice(number(cube), `Right. ${times} = ${end}.`, true),
                choice(number(-cube), x < 0 ? `A negative cubed stays negative: ${end}.` : 'A positive cubed is positive.'),
                choice(number(3 * x), `Cubing isn't multiplying by 3. It's ${times}.`),
                choice(number(x * x), `That's squaring. Cube means three lots: ${end}.`) ] };
        } else if (item.type === 'point-on') {
            const x = choose([-2, -1]);
            const form = { a: 1, c: choose([-2, -1, 1, 2].filter(c => x !== -1 || c !== -2)) };
            const y = valueOf(form, x);
            config = { input: 'choice', prompt: `Which point is on the graph of ${cubicText(form)}?`, options: [
                choice(coordinate([x, y]), `Right. ${workingText(form, x)}.`, true),
                choice(coordinate([x, -(x ** 3) + form.c]), `A negative cubed stays negative: ${bracket(x)}³ = ${number(x ** 3)}, so y = ${number(y)}.`),
                choice(coordinate([x, x ** 3]), `You cubed ${number(x)}, but forgot the ${tail(form.c).trim()}.`),
                choice(coordinate([y, x]), `x comes first. When x = ${number(x)}, y = ${number(y)}: the point is ${coordinate([x, y])}.`) ] };
        } else if (item.type === 'shape') config = { input: 'choice', prompt: `What shape is the graph of ${equation}?`, options: [
            choice('A stretched S shape', "Right. It has x³, so it's a cubic graph.", true),
            choice('A U shape', 'A U shape is a quadratic graph, with x². This has x³.'),
            choice('A straight line', "It has x³, so it's a curve, not a straight line."),
            choice('An upside-down U', "The curve doesn't come back down. As x gets bigger, x³ keeps getting bigger.") ] };
        else {
            const c = choose([-2, -1, 1, 2]), form = { a: 1, c };
            config = { input: 'choice', prompt: `Where does the graph of ${cubicText(form)} cross the y-axis?`, options: [
                choice(coordinate([0, c]), `Right. When x = 0, y = 0³${tail(c)} = ${number(c)}.`, true),
                choice(coordinate([0, 0]), `A cubic graph doesn't have to go through (0, 0). When x = 0, y = ${number(c)}.`),
                choice(coordinate([c, 0]), `x comes first. On the y-axis x = 0, so the point is ${coordinate([0, c])}.`),
                choice(coordinate([0, -c]), `Check the sign: ${cubicText(form)}, so y = ${number(c)}.`) ] };
        }
        if (config.options) config.options = shuffle(config.options, random);
        return prepare({ ...config, questionType: item.type });
    }
    window.Cubics = { prose, prepare, xs, number, bracket, coordinate, nb, valueOf, cubicText, workingText,
        plotDomain, valueRules, tableRules, plotMark, plotWidget, tableWidget, readNumber, node, table,
        graph, guides, point, valueCard, tableCard, choice, joinOptions, joinLabels, joinFeedback,
        joinDrawing, typedTypes, choiceTypes, pick, generate };
})();
