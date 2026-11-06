(() => {
    'use strict';

    const signed = number => String(number).replace('-', '−');
    const equation = (start, amount) => `${signed(start)} − (−${amount})`;
    const working = (start, amount) => `${equation(start, amount)} = ${signed(start)} + ${amount} = ${signed(start + amount)}.`;
    const option = (label, feedback, correct = false) => ({ label, feedback, correct });

    function rewrite(start, amount) {
        return {
            start, amount, questionType: 'rewrite', input: 'choice',
            prompt: `Which calculation means the same as ${equation(start, amount)}?`,
            options: [
                option(`${signed(start)} + ${amount}`, 'Keep the starting number. Subtracting a negative becomes addition.', true),
                option(`${signed(start)} − ${amount}`, `That keeps the subtraction. Subtracting a negative means adding: ${signed(start)} + ${amount}.`),
                option(`${signed(-start)} + ${amount}`, `That changes the starting number. Keep ${signed(start)} and write ${signed(start)} + ${amount}.`),
                option(`${signed(-start)} − ${amount}`, `That changes the starting number and keeps subtraction. Write ${signed(start)} + ${amount}.`)
            ]
        };
    }

    function calculate(start, amount) {
        const answer = start + amount;
        const mistakes = [
            { value: signed(start - amount), feedback: 'You subtracted instead of adding the positive number.' },
            { value: signed(-start + amount), feedback: 'You changed the sign of the starting number. Keep it unchanged.' },
            { value: signed(-answer), feedback: 'Check the sign of your answer. Count right from the starting number.' }
        ].filter((rule, index, rules) => Number(rule.value.replace('−', '-')) !== answer && rules.findIndex(other => other.value === rule.value) === index);
        return {
            start, amount, questionType: 'calculate', input: 'number',
            prompt: `Work out ${equation(start, amount)}.`, answer: signed(answer),
            feedback: working(start, amount), rules: mistakes,
            fallback: `Keep ${signed(start)} and add ${amount}. Count ${amount} spaces to the right.`
        };
    }

    function error(start, amount) {
        return {
            start, amount, questionType: 'error', input: 'choice',
            prompt: `Sam writes: ${equation(start, amount)} = ${signed(-start)} + ${amount} = ${-start + amount}. What has Sam done wrong?`,
            options: [
                option(`He changed ${signed(start)} to ${signed(-start)}. The answer is ${signed(start + amount)}.`, 'The starting number stays unchanged. Only subtracting a negative changes to addition.', true),
                option(`He should subtract ${amount}. The answer is ${signed(start - amount)}.`, 'Subtracting a negative becomes addition, so add the positive number.'),
                option('Nothing. His working is right.', 'He changed the starting number. Keep its minus sign.'),
                option(`His answer has the wrong sign. It should be ${signed(start - amount)}.`, 'The mistake happens earlier: he changed the starting number, not just the final sign.')
            ]
        };
    }

    // The multiplying questions in Try it, each with the signs to find on the grid.
    function multiplyExamples() {
        return [
            {
                questionType: 'multiply', input: 'number', signs: ['−', '+'],
                prompt: 'Work out −6 × 4.', answer: '−24',
                feedback: '6 × 4 = 24. The signs are different, so the answer is negative.',
                rules: [
                    { value: '24', feedback: 'The signs are different, so the answer is negative, not positive.' },
                    { value: '−2', feedback: 'That adds −6 and 4. This question multiplies them.' },
                    { value: '−10', feedback: 'That takes 4 away from −6. This question multiplies them.' }
                ],
                fallback: 'Work out 6 × 4, then use the table to find the sign.'
            },
            {
                questionType: 'multiply', input: 'number', signs: ['−', '−'],
                prompt: 'Work out −6 × −3.', answer: '18',
                feedback: '6 × 3 = 18. The signs are the same, so the answer is positive.',
                rules: [
                    { value: '−18', feedback: 'The signs are the same, so the answer is positive.' },
                    { value: '−9', feedback: 'That adds −6 and −3. This question multiplies them.' }
                ],
                fallback: 'Work out 6 × 3, then use the grid to find the sign.'
            },
            {
                questionType: 'multiply', input: 'tap', square: ['−', '−'],
                prompt: 'Tap the square that gives the sign of −8 × −2.',
                feedback: 'Both numbers are negative, so use the − row and the − column.',
                wrong: {
                    '+,+': 'Both numbers are negative, so neither one is on a + line.',
                    '+,−': '−8 is negative, so it goes on the − row, not the + row.',
                    '−,+': '−2 is negative, so it goes on the − column, not the + column.'
                }
            },
            {
                questionType: 'multiply', input: 'number', signs: [null, '−'],
                prompt: 'Find the missing number: ? × −3 = 15.', answer: '−5',
                feedback: '−5 × −3 = 15. The answer is positive, so both signs must be the same.',
                rules: [{ value: '5', feedback: '5 × −3 = −15. The signs need to be the same to get a positive answer.' }],
                fallback: '15 ÷ 3 = 5. Then use the grid to find the sign.'
            },
            {
                questionType: 'multiply', input: 'number', signs: ['−', '−'],
                prompt: 'Sam says −3 × −5 = −15. What is the right answer?', answer: '15',
                feedback: 'The signs are the same, so the answer is positive.',
                rules: [
                    { value: '−15', feedback: 'That is Sam\'s answer. The signs are the same, so it should be positive.' },
                    { value: '−8', feedback: 'That adds −3 and −5. This question multiplies them.' }
                ],
                fallback: 'Work out 3 × 5, then use the table to find the sign.'
            }
        ];
    }

    // Check tests understanding, not working out: one question per key point.
    function checks() {
        const understanding = (prompt, options) => ({ questionType: 'understanding', input: 'choice', prompt, options });
        return [
            understanding('On a number line, what do + and − tell you to do?', [
                option('+ means move right. − means move left.', 'Right. Adding moves you right and taking away moves you left.', true),
                option('+ means move left. − means move right.', 'That is the wrong way round. Numbers get bigger as you go right, so adding moves you right.'),
                option('+ and − both mean move right.', 'They go opposite ways. Taking away moves you left.'),
                option('They only tell you if the answer is positive or negative.', 'They also tell you which way to move: + goes right and − goes left.')
            ]),
            understanding('What happens to the two minus signs when you take away a negative number?', [
                option('They turn into a plus, so you add.', 'Right. Taking away a negative is the same as adding.', true),
                option('They stay as they are, so you take away more.', 'Taking away a negative does the opposite of taking away, so you add.'),
                option('They cancel out, so you ignore the number.', 'You still use the number. The two signs turn into a plus, so you add it.'),
                option('They turn into a plus, and the first number changes sign too.', 'The first number stays exactly as it is. Only the two signs change.')
            ]),
            understanding('What sign do you get when you multiply a negative number by a positive number?', [
                option('A minus, because the two signs are different.', 'Right. Different signs give a negative answer.', true),
                option('A plus, because one of the numbers is positive.', 'One positive number isn\'t enough. The signs are different, so the answer is negative.'),
                option('A plus, because two signs make a plus.', 'Only two signs that are the same make a plus. These are different.'),
                option('It depends which number is bigger.', 'The size doesn\'t matter when you multiply. Different signs always give a negative answer.')
            ]),
            understanding('You start on a negative number and take away a positive number. What happens?', [
                option('You move left, further below zero, so the answer is more negative.', 'Right. Taking away moves you left, away from zero.', true),
                option('You move right, towards zero.', 'Taking away a positive number always moves you left.'),
                option('The two minus signs make a plus, so you add.', 'That only happens when you take away a negative number. Here you take away a positive one.'),
                option('You stop at zero, because you can\'t go any lower.', 'Numbers carry on below zero, so you keep moving left.')
            ]),
            understanding('You start on a positive number and take away a bigger number. What happens?', [
                option('You go past zero, so the answer is negative.', 'Right. You move left, past zero, and land on a negative number.', true),
                option('You stop at zero, because you can\'t go below it.', 'The number line carries on below zero, so you keep moving left.'),
                option('You move right, because the number is bigger.', 'Taking away always moves you left, however big the number is.'),
                option('The answer stays positive, so you swap the numbers round.', 'You can\'t swap the numbers in a take-away. You go past zero, so the answer is negative.')
            ])
        ];
    }

    const practiceTypes = [
        'rewrite-positive', 'rewrite-negative', 'rewrite-positive', 'rewrite-negative',
        'calculate-positive', 'calculate-positive', 'cross-zero', 'stay-negative',
        'cross-zero', 'zero', 'error'
    ];

    function pick(random) {
        const { randomInt } = window.Maths1to9LessonEngine;
        return practiceTypes.map(type => ({ type, seed: randomInt(0, 4294967295, random) }));
    }

    function prepare(question, random) {
        return question.options
            ? { ...question, options: window.Maths1to9LessonEngine.shuffle(question.options, random) }
            : { ...question };
    }

    function generate(item, random) {
        const { randomInt } = window.Maths1to9LessonEngine;
        const integer = (min, max) => randomInt(min, max, random);
        let question;
        if (item.type.startsWith('rewrite')) {
            const magnitude = integer(1, 15);
            // Different magnitudes keep even the numerical values of all four choices distinct.
            let amount = integer(1, 14);
            if (amount === magnitude) amount = 15;
            question = rewrite(item.type === 'rewrite-positive' ? magnitude : -magnitude, amount);
        } else if (item.type === 'error') {
            const magnitude = integer(4, 15);
            question = error(-magnitude, integer(1, magnitude - 1));
        } else {
            let start = integer(1, 15);
            let amount = integer(1, 15);
            if (item.type === 'cross-zero') {
                start = -integer(1, 12);
                amount = -start + integer(1, 12);
            }
            if (item.type === 'stay-negative') {
                start = -integer(2, 20);
                amount = integer(1, -start - 1);
            }
            if (item.type === 'zero') {
                start = -integer(1, 20);
                amount = -start;
            }
            question = calculate(start, amount);
        }
        return prepare({ ...question, questionType: item.type }, random);
    }

    function paragraph(host, text, className = '') {
        const node = document.createElement('p');
        node.textContent = text;
        node.className = className;
        host.append(node);
        return node;
    }

    // Long lines only label every fifth number, so the labels stay readable.
    function labelClass(value, start, end, showJourney, range) {
        if (value === start || (showJourney && value === end)) return value % 2 ? 'negative-key-tick' : '';
        if (range > 20) {
            const closeToStart = Math.abs(value - start) < 3;
            return value % 5 || closeToStart ? 'negative-no-label' : '';
        }
        return value % 2 ? 'negative-small-tick' : '';
    }

    function drawHops(start, value, min, max) {
        const direction = value < start ? -1 : 1;
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('negative-hops');
        svg.setAttribute('viewBox', `0 0 ${max - min} 10`);
        svg.setAttribute('preserveAspectRatio', 'none');
        svg.setAttribute('aria-hidden', 'true');
        for (let step = 0; step < Math.abs(value - start); step++) {
            const from = start - min + step * direction;
            const hop = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            hop.setAttribute('class', `negative-hop ${direction < 0 ? 'negative-hop--left' : 'negative-hop--right'}`);
            hop.setAttribute('d', `M ${from} 10 Q ${from + direction / 2} -8 ${from + direction} 10`);
            svg.append(hop);
        }
        return svg;
    }

    function drawLine(host, start, end, position = start, showJourney = true, range = {}) {
        const min = range.min ?? Math.min(-10, start);
        const max = range.max ?? Math.max(10, end);
        const line = document.createElement('div');
        line.className = 'negative-line';
        line.setAttribute('role', 'img');
        const track = document.createElement('div');
        track.className = 'negative-track';
        const ticks = document.createElement('div');
        ticks.className = 'negative-ticks';
        for (let value = min; value <= max; value++) {
            const tick = document.createElement('span');
            tick.style.left = `${(value - min) / (max - min) * 100}%`;
            tick.textContent = signed(value);
            tick.className = value === 0 ? 'negative-zero' : labelClass(value, start, end, showJourney, max - min);
            ticks.append(tick);
        }
        const hops = document.createElement('div');
        hops.className = 'negative-hops-layer';
        const moved = document.createElement('span');
        moved.className = 'negative-hop-count';
        const reading = document.createElement('span');
        reading.className = 'negative-dot-value';
        const marker = document.createElement('span');
        marker.className = 'negative-marker';
        marker.setAttribute('aria-hidden', 'true');
        track.append(hops, moved, marker, ticks, reading);
        line.append(track);
        host.append(line);
        function update(value) {
            marker.style.left = `${(value - min) / (max - min) * 100}%`;
            const shown = showJourney || range.hops ? value : start;
            const steps = shown - start;
            hops.replaceChildren(drawHops(start, shown, min, max));
            // Above the hops: how far they've moved. Below the line: where they are.
            moved.textContent = steps ? `${steps > 0 ? '+' : '−'}${Math.abs(steps)}` : '';
            moved.className = `negative-hop-count ${steps < 0 ? 'negative-hop-count--left' : ''}`;
            moved.style.left = `${((start + shown) / 2 - min) / (max - min) * 100}%`;
            reading.textContent = showJourney || range.hops ? signed(shown) : '';
            reading.style.left = `${(shown - min) / (max - min) * 100}%`;
            line.setAttribute('aria-label', showJourney
                ? `Number line from ${signed(min)} to ${signed(max)}. Start ${signed(start)}, move right to ${signed(value)}. Marker ${signed(value)}.`
                : `Number line from ${signed(min)} to ${signed(max)}. Starting marker ${signed(start)}.`);
        }
        update(position);
        return update;
    }

    function slider(host, label, min, max, value, onInput) {
        const wrapper = document.createElement('label');
        wrapper.className = 'negative-slider';
        const caption = document.createElement('span');
        const input = document.createElement('input');
        input.type = 'range';
        input.min = min;
        input.max = max;
        input.step = 1;
        input.value = value;
        input.setAttribute('aria-label', label);
        const updateLabel = () => { caption.textContent = `${label}: ${signed(Number(input.value))}`; };
        updateLabel();
        input.addEventListener('input', () => { updateLabel(); onInput(Number(input.value)); });
        wrapper.append(caption, input);
        host.append(wrapper);
        return input;
    }

    function drawJourney(host, section) {
        const state = section.state;
        const update = drawLine(host, 3, 7, 3 + state.jumps);
        const trail = paragraph(host, '', 'negative-equation');
        function show(jumps) {
            update(3 + jumps);
            trail.textContent = Array.from({ length: jumps + 1 }, (_, i) => signed(3 + i)).join(' → ');
        }
        show(state.jumps);
        slider(host, 'Spaces moved right', 0, 4, state.jumps, jumps => {
            section.update(saved => { saved.jumps = jumps; });
            show(jumps);
        });
    }

    function drawExplore(host, section) {
        const state = section.state;
        const picture = document.createElement('div');
        const sum = paragraph(host, '', 'negative-equation');
        const update = () => {
            picture.replaceChildren();
            drawLine(picture, state.start, state.start + state.amount, state.start + state.amount);
            sum.textContent = working(state.start, state.amount).replace(/\.$/, '');
        };
        slider(host, 'Starting number', -10, 2, state.start, start => {
            section.update(saved => { saved.start = start; });
            update();
        });
        slider(host, 'Positive amount to add', 1, 8, state.amount, amount => {
            section.update(saved => { saved.amount = amount; });
            update();
        });
        host.append(picture);
        update();
    }

    function drawAnswerLine(host, question, correct) {
        drawLine(host, question.start, question.start + question.amount, correct ? question.start + question.amount : question.start, Boolean(correct));
    }

    // Where the pupil left the dot, so a reload doesn't lose it.
    function savedDot(question) {
        try {
            const value = window.localStorage.getItem(`negative-numbers-dot:${question.prompt}`);
            return value === null ? question.start : Number(value);
        } catch {
            return question.start;
        }
    }

    function saveDot(question, value) {
        try {
            window.localStorage.setItem(`negative-numbers-dot:${question.prompt}`, String(value));
        } catch {
            // The dot still works; it just won't survive a reload.
        }
    }

    // A number line whose dot the pupil can drag while working out the answer.
    // Only the typed answer is marked, so moving the dot is never checked.
    function drawMovableLine(host, question, { hint = 'Drag the dot to help you work it out.', onRelease } = {}) {
        paragraph(host, hint, 'negative-drag-hint');
        const end = question.start + question.amount;
        // Leave room to go the wrong way, so that mistake can be seen too.
        const min = Math.min(-10, question.start - question.amount);
        const max = Math.max(10, end);
        const update = drawLine(host, question.start, end, question.start, false, { min, max, hops: true });
        const line = host.querySelector('.negative-line');
        const track = line.querySelector('.negative-track');
        let value = question.start;
        function show(next) {
            value = Math.max(min, Math.min(max, next));
            update(value);
            line.setAttribute('aria-label', `Number line from ${signed(min)} to ${signed(max)}. The dot is on ${signed(value)}. Use the arrow keys to move it.`);
        }
        function move(next) {
            show(next);
            saveDot(question, value);
        }
        function pointer(event) {
            const box = track.getBoundingClientRect();
            move(Math.round(min + (event.clientX - box.left) / box.width * (max - min)));
        }
        line.classList.add('negative-line--movable');
        line.setAttribute('role', 'application');
        line.tabIndex = 0;
        line.addEventListener('pointerdown', event => {
            line.setPointerCapture(event.pointerId);
            pointer(event);
        });
        line.addEventListener('pointermove', event => {
            if (line.hasPointerCapture(event.pointerId)) pointer(event);
        });
        line.addEventListener('pointerup', () => onRelease?.(value));
        line.addEventListener('keydown', event => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
            event.preventDefault();
            move(value + (event.key === 'ArrowRight' ? 1 : -1));
            onRelease?.(value);
        });
        show(savedDot(question));
    }

    function drawFinishedLine(host, question) {
        const end = question.start + question.amount;
        drawLine(host, question.start, end, end, true, {
            min: Math.min(-10, question.start - question.amount),
            max: Math.max(10, end)
        });
    }

    // Try it: the pupil drags the dot, and landing on the answer finishes it.
    function drawDragToAnswer(host, question, solved, onSolved) {
        const end = question.start + question.amount;
        if (solved) {
            drawFinishedLine(host, question);
            host.querySelector('.negative-line').classList.add('negative-line--solved');
            paragraph(host, working(question.start, question.amount).replace(/\.$/, ''), 'nn-working');
            return;
        }
        drawMovableLine(host, question, {
            hint: 'Drag the dot to the answer.',
            onRelease: value => { if (value === end) onSolved(); }
        });
    }

    // Remembers a wrong answer, so a reload still shows the line.
    function wrongBefore(question) {
        try {
            return window.localStorage.getItem(`negative-numbers-wrong:${question.prompt}`) === '1';
        } catch {
            return false;
        }
    }

    function rememberWrong(question, wrong) {
        try {
            if (wrong) window.localStorage.setItem(`negative-numbers-wrong:${question.prompt}`, '1');
            else window.localStorage.removeItem(`negative-numbers-wrong:${question.prompt}`);
        } catch {
            // The line still appears; it just won't survive a reload.
        }
    }

    // Typed "work out" questions get the number line above them. A finished
    // question just shows the hops from the start to the answer. With
    // afterWrongAnswer, the line stays hidden until the first wrong answer.
    function withMovableLine(question, { afterWrongAnswer = false } = {}) {
        if (question.input !== 'number' || question.signs) return question;
        let lineHost;
        return {
            ...question,
            figure(host, { readOnly }) {
                lineHost = host;
                host.hidden = afterWrongAnswer && !readOnly && !wrongBefore(question);
                if (readOnly) drawFinishedLine(host, question);
                else drawMovableLine(host, question);
            },
            onFeedback(result) {
                question.onFeedback?.(result);
                if (!afterWrongAnswer) return;
                rememberWrong(question, !result.correct);
                if (!result.correct) lineHost.hidden = false;
            }
        };
    }

    // The sign grid: row sign, column sign and the sign of the answer.
    const SIGN_GRID = [
        { row: '+', column: '+', answer: '+', sum: '2 × 3 = 6' },
        { row: '+', column: '−', answer: '−', sum: '2 × −3 = −6' },
        { row: '−', column: '+', answer: '−', sum: '−2 × 3 = −6' },
        { row: '−', column: '−', answer: '+', sum: '−2 × −3 = 6' }
    ];

    function drawGrid(host, cell) {
        const grid = document.createElement('div');
        grid.className = 'nn-sign-grid';
        grid.innerHTML = '<span class="nn-grid-label">×</span><span class="nn-grid-label">+</span><span class="nn-grid-label">−</span>';
        SIGN_GRID.forEach((square, i) => {
            if (i % 2 === 0) grid.insertAdjacentHTML('beforeend', `<span class="nn-grid-label">${square.row}</span>`);
            grid.append(cell(square, i));
        });
        host.append(grid);
    }

    const gridColour = square => `nn-grid-${square.answer === '+' ? 'plus' : 'minus'}`;

    // The grid pupils fill in, one tap per square.
    function drawSignGrid(host, filled, last, onTap) {
        drawGrid(host, (square, i) => {
            const cell = document.createElement('span');
            cell.className = `nn-grid-cell ${filled[i] ? gridColour(square) : ''} ${last === i ? 'nn-grid-last' : ''}`;
            cell.textContent = filled[i] ? square.answer : '?';
            if (!filled[i]) {
                cell.setAttribute('role', 'button');
                cell.setAttribute('aria-label', `${square.row} times ${square.column}`);
                cell.tabIndex = 0;
                cell.addEventListener('click', () => onTap(i));
                cell.addEventListener('keydown', event => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    onTap(i);
                });
            }
            return cell;
        });
        if (last !== null) paragraph(host, SIGN_GRID[last].sum, 'nn-grid-sum');
    }

    // The sign table. The chosen row is red and the chosen column blue, so the
    // square where they cross turns purple.
    function signTable(row, column) {
        const tint = (inRow, inColumn) => {
            if (inRow && inColumn) return ' class="nn-table-both"';
            if (inRow) return ' class="nn-table-row"';
            return inColumn ? ' class="nn-table-column"' : '';
        };
        const line = sign => `<tr><th scope="row"${tint(sign === row, false)}>${sign}</th>
            ${['+', '−'].map(top => {
                const square = SIGN_GRID.find(item => item.row === sign && item.column === top);
                return `<td${tint(sign === row, top === column)}>${square.answer}</td>`;
            }).join('')}</tr>`;
        return `<caption class="visually-hidden">Signs when you multiply</caption>
            <thead><tr><th scope="col">×</th><th scope="col"${tint(false, column === '+')}>+</th><th scope="col"${tint(false, column === '−')}>−</th></tr></thead>
            <tbody>${line('+')}${line('−')}</tbody>`;
    }

    // A small table beside a multiplying question, with its signs coloured.
    function withSignGrid(question) {
        return {
            ...question,
            figure(host) {
                const table = document.createElement('table');
                table.className = 'nn-sign-table';
                table.innerHTML = signTable(...question.signs);
                host.append(table);
            }
        };
    }

    // Try it: the pupil taps a square. A wrong square colours its row and
    // column and explains why; the right one finishes the question.
    function drawTapSquare(host, question, tried, solved, onTap) {
        const last = tried.at(-1);
        const picked = solved ? question.square : last?.split(',') || [];
        const table = document.createElement('table');
        table.className = 'nn-sign-table';
        table.innerHTML = signTable(...picked);
        host.append(table);
        if (!solved) {
            table.querySelectorAll('tbody td').forEach((cell, i) => {
                const { row, column } = SIGN_GRID[i];
                const key = `${row},${column}`;
                if (tried.includes(key)) return;
                cell.setAttribute('role', 'button');
                cell.setAttribute('aria-label', `${row} row, ${column} column`);
                cell.tabIndex = 0;
                cell.addEventListener('click', () => onTap(key));
                cell.addEventListener('keydown', event => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    onTap(key);
                });
            });
        }
        if (solved) paragraph(host, question.feedback, 'nn-working nn-working--wrap');
        else if (last) paragraph(host, question.wrong[last], 'nn-warning');
    }

    window.NegativeNumbers = {
        signed, paragraph, equation, working, rewrite, calculate, checks,
        practiceTypes, pick, prepare, generate, drawLine, drawJourney, drawExplore, drawAnswerLine, withMovableLine,
        multiplyExamples, drawSignGrid, withSignGrid, drawDragToAnswer, drawTapSquare
    };
})();
