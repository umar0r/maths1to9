(() => {
    'use strict';

    function element(tag, text = '', className = '') {
        const node = document.createElement(tag);
        node.textContent = text;
        node.className = className;
        return node;
    }

    function svgElement(tag, attributes) {
        const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
        for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
        return node;
    }

    function pairs(number) {
        const result = [];
        for (let divisor = 1; divisor * divisor <= number; divisor++) {
            if (number % divisor === 0) result.push([divisor, number / divisor]);
        }
        return result;
    }

    const factors = number => [...new Set(pairs(number).flat())].sort((a, b) => a - b);
    const list = values => values.join(', ');

    function rowModel(number, rows = null) {
        if (!rows) {
            return {
                width: 280, height: 260, perRow: null, remainder: null,
                positions: Array.from({ length: number }, (_, index) => {
                    const radius = 14 * Math.sqrt(index + .5);
                    const angle = index * 2.39996;
                    return { x: 140 + radius * Math.cos(angle), y: 130 + radius * Math.sin(angle), leftover: false };
                })
            };
        }
        const perRow = Math.floor(number / rows);
        const remainder = number % rows;
        const width = (Math.max(perRow, remainder, 1) + 1) * 24;
        const height = rows * 24 + (remainder ? 66 : 20);
        const positions = Array.from({ length: number }, (_, index) => {
            if (index < rows * perRow) {
                return { x: (width - (perRow - 1) * 24) / 2 + (index % perRow) * 24,
                    y: 20 + Math.floor(index / perRow) * 24, leftover: false };
            }
            return { x: (width - (remainder - 1) * 24) / 2 + (index - rows * perRow) * 24,
                y: 42 + rows * 24, leftover: true };
        });
        return { perRow, remainder, width, height, positions };
    }

    function drawBoard(host, number, rows = null) {
        const model = rowModel(number, rows);
        const board = element('div', '', 'factors-board');
        const svg = svgElement('svg', { viewBox: `0 0 ${model.width} ${model.height}`, role: 'img',
            'aria-label': rows ? `${number} counters in ${rows} rows of ${model.perRow}, with ${model.remainder} left over` : `${number} counters` });
        svg.style.maxWidth = `${model.width}px`;
        for (const point of model.positions) {
            svg.append(svgElement('circle', { cx: point.x, cy: point.y, r: 9,
                class: point.leftover ? 'factors-leftover' : 'factors-dot' }));
        }
        board.append(svg);
        host.append(board);
        return board;
    }

    function drawPairs(host, number, shown = pairs(number)) {
        const panel = element('div', '', 'factors-pairs');
        for (const [first, second] of shown) {
            const row = element('div', '', 'factors-pair-row');
            row.append(element('span', first, 'factors-tile'), element('span', '×'),
                element('span', second, 'factors-tile'), element('span', `= ${number}`));
            panel.append(row);
        }
        host.append(panel);
        const values = [...new Set(shown.flat())].sort((a, b) => a - b);
        if (!values.length) return;
        const figure = element('figure', '', 'factors-rainbow');
        figure.append(element('figcaption', `${shown.length === 1 ? 'A factor pair' : 'Factor pairs'} of ${number}`));
        const svg = svgElement('svg', { viewBox: '0 0 600 150', role: 'img',
            'aria-label': shown.map(pair => pair.join(' and ')).join('; ') });
        const x = value => 35 + values.indexOf(value) * 530 / Math.max(1, values.length - 1);
        const colours = ['#536dfe', '#009b83', '#c87500', '#bd3d88', '#54758c'];
        shown.forEach(([first, second], index) => {
            if (first !== second) svg.append(svgElement('path', { d: `M ${x(first)} 100 Q 300 ${-35 + index * 30} ${x(second)} 100`,
                fill: 'none', stroke: colours[index % colours.length], 'stroke-width': 4 }));
        });
        for (const value of values) {
            svg.append(svgElement('rect', { x: x(value) - 25, y: 104, width: 50, height: 42, rx: 10,
                fill: '#f1f5f9', stroke: '#64748b', 'stroke-width': 2 }));
            const text = svgElement('text', { x: x(value), y: 134, 'text-anchor': 'middle' });
            text.textContent = value;
            svg.append(text);
        }
        figure.append(svg);
        host.append(figure);
    }

    function rowWidget(number) {
        const normalise = value => ({ rows: Number.isInteger(value?.rows) ? value.rows : null });
        return {
            isEmpty(value) { return normalise(value).rows === null; },
            answerText(value) {
                const rows = normalise(value).rows;
                if (!rows || rows < 2 || rows > 6) return '';
                const remainder = number % rows;
                return remainder ? `${rows} rows, with ${remainder} left over` : `${rows} × ${number / rows} = ${number}`;
            },
            mark(value) {
                const rows = normalise(value).rows;
                if (!rows || rows < 2 || rows > 6) return { correct: false, feedback: 'Use between 2 and 6 rows.' };
                const remainder = number % rows;
                return { correct: remainder === 0,
                    feedback: remainder ? `${rows} rows leave ${remainder} counters over. Try a row count that divides ${number} exactly.`
                        : `${rows} × ${number / rows} = ${number}, with nothing left over` };
            },
            render(host, { value, editable, onChange }) {
                let state = normalise(value);
                let canEdit = editable;
                const picture = element('div', '', 'factors-row-picture');
                const label = element('label', '', 'factors-slider');
                const count = element('span');
                const slider = element('input');
                Object.assign(slider, { type: 'range', min: '2', max: '6', step: '1' });
                slider.setAttribute('aria-label', 'Number of rows');
                label.append(count, slider);
                host.append(label, picture);
                function paint() {
                    picture.replaceChildren();
                    drawBoard(picture, number, state.rows);
                    count.textContent = state.rows ? `Rows: ${state.rows}` : 'Choose a number of rows';
                    slider.value = String(state.rows || 2);
                    slider.disabled = !canEdit;
                }
                slider.addEventListener('input', () => {
                    state.rows = Number(slider.value);
                    paint();
                    onChange(state);
                });
                paint();
                return {
                    update(next) { state = normalise(next.value); canEdit = next.editable; paint(); },
                    focus() { slider.focus(); }
                };
            }
        };
    }

    const option = (label, feedback, correct = false) => ({ label: String(label), feedback, correct });
    function numberCard(kind, number, divisor, prompt, answer, wrong, feedback, questionType) {
        const rules = wrong.filter(([value], index, values) => value !== answer && values.findIndex(([other]) => value === other) === index);
        return { kind, number, divisor, questionType, input: 'number', prompt, answer: String(answer), feedback,
            rules: rules.map(([value, feedback]) => ({ value: String(value), feedback })),
            fallback: kind === 'remainder' ? 'Divide the total by the number of rows. Give the number left over.'
                : kind === 'missing' ? 'Divide the total by the first factor to find its partner.'
                    : 'Find every factor pair. List each factor once, then count the numbers.',
            figure: host => drawBoard(host, number) };
    }
    function asChoice(question) {
        return { ...question, input: 'choice', options: [option(question.answer, question.feedback, true),
            ...question.rules.slice(0, 3).map(rule => option(rule.value, rule.feedback))] };
    }

    function countQuestion(number, mode = 'number') {
        const values = factors(number);
        const count = values.length;
        const square = Number.isInteger(Math.sqrt(number));
        const question = numberCard('count', number, null, `How many factors does ${number} have?`, count, [
            [count - 2, 'Include 1 and the number itself.'],
            [pairs(number).length, 'Each pair gives two factors, unless both numbers are the same.'],
            [count + 1, square ? 'Count the equal factor only once.' : 'That counts a number which is not a factor.'],
            [number, 'That is the number itself. Count the numbers that divide it exactly.']
        ], `The ${count} factors are ${list(values)}`, 'factor-count');
        return mode === 'choice' ? asChoice(question) : question;
    }

    function listQuestion(number, mode = 'choice') {
        if (mode === 'number') return { ...countQuestion(number), questionType: 'all-factors' };
        const values = factors(number);
        const missingEnds = values.length > 2 ? values.slice(1, -1) : [number];
        const missingMiddle = values.filter((value, index) => index !== Math.floor(values.length / 2));
        const wrong = [
            [list(missingEnds), 'Include 1 and the number itself.'],
            [list(missingMiddle), 'One factor is missing. Check both numbers from every pair.'],
            [list([number, number * 2, number * 3]), 'Those are multiples from the times table. Factors divide the number exactly.']
        ];
        return { kind: 'list', number, questionType: 'all-factors', input: 'choice', prompt: `Which list contains every factor of ${number}?`,
            options: [option(list(values), `The factors are ${list(values)}`, true), ...wrong.map(([label, feedback]) => option(label, feedback))],
            figure: host => drawBoard(host, number) };
    }

    function missingQuestion(number, divisor, mode = 'number') {
        const answer = number / divisor;
        const question = numberCard('missing', number, divisor, `Find the missing number: ${divisor} × □ = ${number}`, answer, [
            [divisor, 'That repeats the first factor. Divide the total by the first factor.'],
            [number + divisor, 'That adds the two numbers. Divide to find the partner.'],
            [number - divisor, 'That subtracts the first factor. Divide instead.'],
            [number * divisor, 'That multiplies the two numbers. Divide to find the missing factor.']
        ], `${divisor} × ${answer} = ${number}`, 'missing-pair');
        return mode === 'choice' ? asChoice(question) : question;
    }

    function remainderQuestion(number, divisor, mode = 'number') {
        const remainder = number % divisor;
        const feedback = remainder ? `${number} ÷ ${divisor} leaves ${remainder} over, so ${divisor} is not a factor`
            : `${number} ÷ ${divisor} = ${number / divisor}, with nothing left over`;
        if (mode === 'choice') return {
            kind: 'reason', number, divisor, questionType: 'is-factor', input: 'choice',
            prompt: `Which explanation about ${divisor} as a factor of ${number} is right?`,
            options: [
                option('Yes, the division is exact.', remainder ? `${divisor} leaves ${remainder} over, so the division is not exact.` : feedback, remainder === 0),
                option('No, there is a remainder.', remainder ? feedback : `${number} ÷ ${divisor} = ${number / divisor}. Nothing is left over.`, remainder !== 0),
                option(`Yes, it is smaller than ${number}.`, 'Being smaller does not make a number a factor. Check whether the division is exact.'),
                option(`No, factors must be bigger than ${number}.`, 'Factors cannot be bigger than the number. They divide it exactly.')
            ], figure: host => drawBoard(host, number)
        };
        return numberCard('remainder', number, divisor, `How many counters are left over when ${number} counters are put into ${divisor} equal rows?`, remainder, [
            [0, 'There are counters left over. Check the division.'],
            [Math.floor(number / divisor), 'That is the number in each row. Find how many are left over.'],
            [number - divisor, 'That subtracts once. Make all the equal rows first.'],
            [divisor, 'That is the number of rows. Count the counters left over.']
        ], feedback, 'is-factor');
    }

    function squareQuestion(root, mode = 'choice') {
        const number = root * root;
        if (mode === 'number') return { ...countQuestion(number), questionType: 'square-factor' };
        return { kind: 'square', number, divisor: root, input: 'choice', questionType: 'square-factor',
            prompt: `You reach ${root} × ${root} = ${number}. What should you do?`, options: [
                option(`Stop and list ${root} once.`, 'The equal pair gives one number for the factor list.', true),
                option(`Stop and list ${root} twice.`, 'Both numbers are the same. List that factor once.'),
                option('Leave out this pair.', `${root} × ${root} = ${number}, so ${root} is a factor.`),
                option('Keep going and list the pairs again.', 'The pairs have met. More pairs would repeat the ones already found.')
            ], figure: host => drawBoard(host, number) };
    }
    function rowQuestion(number) {
        return { kind: 'rows', number, questionType: 'equal-rows', input: 'custom',
            prompt: `Make ${number} counters into equal rows. Use between 2 and 6 rows, with nothing left over.`, widget: rowWidget(number) };
    }

    function examples() {
        const first = listQuestion(24);
        first.options = [
            option('1, 2, 3, 4, 6, 8, 12, 24', 'Use both numbers from each pair: 1 and 24, 2 and 12, 3 and 8, 4 and 6.', true),
            option('1, 2, 3, 4', 'Those are only the smaller numbers. Each pair has a second number too.'),
            option('1, 2, 3, 4, 5, 6, 8, 12, 24', '5 rows leave 4 over, so 5 is not a factor.'),
            option('1, 2, 3, 4, 8, 12, 24', '4 × 6 = 24. Do not forget 6.')
        ];
        return [first, missingQuestion(24, 4), rowQuestion(24), squareQuestion(4), countQuestion(36), remainderQuestion(24, 5)];
    }
    function checks() {
        const first = listQuestion(28);
        first.questionType = 'check-factors';
        first.options = [
            option('1, 2, 4, 7, 14, 28', 'The pairs are 1 and 28, 2 and 14, 4 and 7.', true),
            option('1, 2, 7, 14, 28', '4 × 7 = 28. The factor 4 is missing.'),
            option('1, 2, 4, 7, 14, 21, 28', '21 does not divide 28 exactly.'),
            option('1, 2, 4, 7, 14', '28 itself is also a factor of 28.')
        ];
        const second = { kind: 'missed-square', number: 16, input: 'choice', questionType: 'check-missing',
            prompt: 'Sam says the factors of 16 are 1, 2, 8 and 16. What has he missed?', options: [
                option('3', '3 does not divide 16 exactly.'), option('4', '4 × 4 = 16. List 4 once.', true),
                option('6', '6 does not divide 16 exactly.'), option('Nothing', 'The equal pair 4 × 4 gives another factor.')
            ], figure: host => drawBoard(host, 16) };
        return [first, second, countQuestion(36), missingQuestion(36, 4), remainderQuestion(20, 6)];
    }

    const types = ['all-factors', 'is-factor', 'square-factor', 'missing-pair', 'equal-rows', 'factor-count'];
    const numbers = [12, 13, 15, 17, 18, 20, 21, 24, 25, 28, 30, 36, 40, 48];
    const rowNumbers = [12, 14, 15, 18, 20, 21, 24, 25, 27, 28, 30, 35, 36];
    function generate(item, random) {
        const { randomInt } = window.Maths1to9LessonEngine;
        const source = item.type === 'equal-rows' ? rowNumbers : numbers;
        const number = source[randomInt(0, source.length - 1, random)];
        const mode = item.mode || 'number';
        let question;
        if (item.type === 'all-factors') question = listQuestion(number, mode);
        else if (item.type === 'is-factor') question = remainderQuestion(number, randomInt(2, 7, random), mode);
        else if (item.type === 'square-factor') question = squareQuestion(randomInt(3, 7, random), mode);
        else if (item.type === 'factor-count') question = countQuestion(number, mode);
        else if (item.type === 'equal-rows' && mode === 'custom') question = rowQuestion(number);
        else {
            const divisors = item.type === 'equal-rows' ? factors(number).filter(value => value >= 2 && value <= 6) : factors(number);
            question = missingQuestion(number, divisors[randomInt(0, divisors.length - 1, random)], mode);
        }
        return { ...question, questionType: item.type };
    }
    function pick(random) {
        return [['all-factors', 'choice'], ['is-factor', 'number'], ['square-factor', 'choice'],
            ['missing-pair', 'number'], ['equal-rows', 'custom'], ['factor-count', 'number']].map(([type, mode]) => ({
            type, mode, seed: window.Maths1to9LessonEngine.randomInt(0, 4294967295, random)
        }));
    }
    const prepare = (question, random) => question.options
        ? { ...question, options: window.Maths1to9LessonEngine.shuffle(question.options, random) } : { ...question };

    const learnScreens = [
        { title: 'What a factor means', lines: [
            'A factor divides a number exactly, with nothing left over.',
            '3 × 4 = 12, so 3 and 4 are a factor pair. A factor pair is two numbers that multiply to make our number.',
            '1 and the number itself are always factors. The factors of 12 are 1, 2, 3, 4, 6 and 12.'
        ] },
        { title: 'Make equal rows', lines: [
            'Move the slider to put 24 counters into rows. Look for rows with nothing left over.',
            'Leftover counters are called the remainder. The number of rows is a factor only when the remainder is 0.'
        ] },
        { title: 'Find every pair', lines: [
            'Start with 1 and the number itself. Try 2, 3, 4 and so on, in order.',
            'To find the other number in a pair, divide the total by the factor you are testing.',
            'For 12, the pairs are 1 × 12, 2 × 6 and 3 × 4. Testing 4 would repeat 3 × 4. Stop when the pairs meet in the middle.',
            'List each factor once. There are six factors of 12.',
            '12, 24 and 36 are multiples of 12, from its times table. They are not the list of factors.'
        ] },
        { title: 'Equal pairs need one copy', lines: [
            'When both numbers in a pair are the same, list that factor once.',
            '4 × 4 = 16 gives one 4 in the factor list. The five factors of 16 are 1, 2, 4, 8 and 16.'
        ] }
    ];
    function drawLearn(host, index, rows = 3, tried = []) {
        if (index === 0) {
            drawBoard(host, 12, 3);
            drawPairs(host, 12, [[3, 4]]);
            const line = element('div', '', 'factors-factor-list');
            for (const factor of factors(12)) line.append(element('span', factor, 'factors-tile is-shared'));
            host.append(line);
        } else if (index === 1) {
            drawBoard(host, 24, rows);
            const model = rowModel(24, rows);
            host.append(element('p', `${rows} rows of ${model.perRow}, with ${model.remainder} left over`, 'factors-formula'));
            const found = tried.filter(value => 24 % value === 0).map(value => [Math.min(value, 24 / value), Math.max(value, 24 / value)]);
            const unique = [...new Map(found.map(pair => [pair.join(','), pair])).values()].sort((a, b) => a[0] - b[0]);
            if (unique.length) {
                host.append(element('h4', 'Pairs found so far'));
                drawPairs(host, 24, unique);
            }
        } else {
            const number = index === 2 ? 12 : 16;
            if (index === 3) drawBoard(host, 16, 4);
            drawPairs(host, number);
            const line = element('div', '', 'factors-factor-list');
            for (const factor of factors(number)) line.append(element('span', factor, `factors-tile${index === 3 && factor === 4 ? ' is-shared' : ''}`));
            host.append(line);
        }
    }

    window.Factors = { pairs, factors, rowModel, drawBoard, drawPairs, rowWidget, countQuestion, listQuestion,
        missingQuestion, remainderQuestion, squareQuestion, rowQuestion, examples, checks, types, generate, pick, prepare, learnScreens, drawLearn };
})();
