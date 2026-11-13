(() => {
    'use strict';

    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;

    const screens = [
        { title: 'Numbers below zero', kind: 'thermometer',
        heading: 'Negative numbers are numbers below zero.', lines: [
            'You\'ve seen them on a cold day. −3°C is 3 degrees colder than 0°C.',
            'We write a negative number with a minus sign in front. We say −3 as "negative 3".'
        ] },
        { title: 'The number line', kind: 'sideways',
        heading: 'A number line is like a thermometer lying on its side.', lines: [
            'Zero is in the middle. The positive numbers go to the right of zero. The negative numbers go to the left.',
            'Zero itself is neither positive nor negative.'
        ] },
        { title: 'Taking away past zero', kind: 'journeys', slot: 0,
        heading: 'When you take away a positive number, you move left along the number line.', lines: [
            'If you take away more than you started with, you go past zero and end up on a negative number.'
        ], journeys: [
            { start: 4, steps: 6, direction: -1, sum: '4 − 6', showSum: false }
        ] },
        { title: 'Adding to a negative number', kind: 'journeys', slot: 1,
        heading: 'When you add a positive number, you move right along the number line.', lines: [], journeys: [
            { start: -6, steps: 4, direction: 1, sum: '−6 + 4', showSum: false, result: 'Adding 4 to −6 moves you towards zero, but not past it, so the answer is still negative.' }
        ] },
        { title: 'Taking away from a negative number', kind: 'journeys', slot: 2,
        heading: 'If you start on a negative number and take away a positive number, you still move left.', lines: [
            'That takes you further below zero, so the answer is more negative.'
        ], journeys: [
            { start: -2, steps: 3, direction: -1, sum: '−2 − 3', showSum: false }
        ] },
        { title: 'Two minus signs in one sum', kind: 'read',
        heading: 'Sometimes you have to take away a negative number.', lines: [], afterSum: [
            'We read this as \u20183 subtract negative 2\u2019.',
            'The brackets show that −2 is the number we are subtracting.'
        ] },
        { title: 'Removing a fee', kind: 'fee',
        heading: 'Removing a fee puts the money back.', lines: [
            'For example, a £2 bank fee is a negative amount: −£2.',
            'Your balance was £5. The bank took a £2 fee, so your balance fell to £3.'
        ] },
        { title: 'What happens when you take away a negative', kind: 'pattern',
        heading: 'Another way of looking at it: start with 3 and take away a smaller number each time.', lines: [] },
        { title: 'Take away a negative: add instead', kind: 'method', slot: 0,
        heading: 'So when you take away a negative, you can add instead.', lines: [
            'The take-away sign and the negative sign turn into a plus.'
        ], start: 3, steps: 4 }
    ];

    const signed = value => String(value).replace('-', '−');

    // An upright thermometer from −10°C to 10°C, filled up to the level.
    const THERMOMETER = { top: 24, step: 16, tube: 60, height: 410 };
    const thermometerY = value => THERMOMETER.top + (10 - value) * THERMOMETER.step;

    function thermometer(level) {
        const { top, tube, height } = THERMOMETER;
        const bulb = thermometerY(-10) + 34;
        let picture = `<rect class="nn-tube" x="${tube - 11}" y="${top - 14}" width="22" height="${bulb - top}" rx="11"/>
            <circle class="nn-bulb" cx="${tube}" cy="${bulb}" r="22"/>
            <rect class="nn-mercury" x="${tube - 5}" y="${thermometerY(level)}" width="10" height="${bulb - thermometerY(level)}"/>`;
        for (let value = -10; value <= 10; value++) {
            const tone = value < 0 ? 'nn-negative' : value > 0 ? 'nn-positive' : 'nn-zero';
            const y = thermometerY(value);
            picture += `<path class="nn-tick" d="M ${tube + 13} ${y} H ${tube + (value % 5 ? 21 : 27)}"/>
                <text class="nn-value nn-scale ${tone}" x="${tube + 33}" y="${y + 4}">${signed(value)}</text>`;
        }
        picture += `<path class="nn-level" d="M ${tube - 15} ${thermometerY(level)} H ${tube + 15}"/>
            <text class="nn-level-label" x="${tube - 19}" y="${thermometerY(level) + 5}">${signed(level)}°C</text>`;
        return `<svg viewBox="0 0 160 ${height}" aria-hidden="true">${picture}</svg>`;
    }

    // The same thermometer lying on its side: bulb on the left, −10 to 10
    // left to right, with the numbers upright underneath.
    function sidewaysThermometer(level) {
        const phone = window.matchMedia('(max-width: 600px)').matches;
        const x = value => 70 + (value + 10) * 30;
        const tube = 40, bulb = 30;
        const labelY = tube + (phone ? 52 : 40);
        let picture = `<rect class="nn-tube" x="${bulb}" y="${tube - 11}" width="${x(10) + 20 - bulb}" height="22" rx="11"/>
            <circle class="nn-bulb" cx="${bulb}" cy="${tube}" r="22"/>
            <rect class="nn-mercury" x="${bulb}" y="${tube - 5}" width="${x(level) - bulb}" height="10"/>`;
        for (let value = -10; value <= 10; value++) {
            const tone = value < 0 ? 'nn-negative' : value > 0 ? 'nn-positive' : 'nn-zero';
            picture += `<path class="nn-tick" d="M ${x(value)} ${tube + 13} V ${tube + (value % 5 ? 21 : 27)}"/>
                <text class="nn-value nn-scale ${tone}" x="${x(value)}" y="${labelY}">${signed(value)}</text>`;
        }
        picture += `<path class="nn-level" d="M ${x(level)} ${tube - 15} V ${tube + 15}"/>`;
        return `<svg viewBox="0 -20 ${x(10) + 30} ${labelY + 30}" aria-hidden="true">${picture}</svg>`;
    }

    // Every Learn line has the same scale, with all 21 values on one row.
    function numberLine({ start, position = start, hops = 0, direction = 1 }) {
        const x = value => 30 + (value + 10) * 30;
        const phone = window.matchMedia('(max-width: 600px)').matches;
        const axis = phone ? 210 : 80;
        const height = phone ? 296 : 140;
        // "start" and "end" sit above the hops, over the numbers they name.
        const label = (text, value) => `<text class="nn-end-label" x="${x(value)}" y="${phone ? 116 : 44}">${text}</text>`;
        let picture = `<path class="nn-axis" d="M 15 ${axis} H 645"/>`;
        if (hops) picture += label('start', start) + `<g class="nn-end" style="--hop: ${hops}">${label('end', position)}</g>`;
        for (let value = -10; value <= 10; value++) {
            const tone = value < 0 ? 'nn-negative' : value > 0 ? 'nn-positive' : 'nn-zero';
            // In a worked example, the start and the end are the numbers to look at.
            const key = hops && (value === start || value === position) ? ' nn-key' : '';
            picture += `<path class="nn-tick ${tone}" d="M ${x(value)} ${axis - 7} V ${axis + 7}"/>
                <text class="nn-value ${tone}${key}" x="${x(value)}" y="${axis + 36}">${signed(value)}</text>`;
        }
        // Each hop draws in after the one before, so the eye follows the direction.
        for (let step = 0; step < hops; step++) {
            const from = x(start + direction * step), to = from + direction * 30;
            picture += `<path class="nn-hop ${direction < 0 ? 'nn-negative' : 'nn-positive'}" pathLength="1" style="--hop: ${step}" d="M ${from} ${axis} Q ${(from + to) / 2} ${phone ? 50 : 37} ${to} ${axis}"/>`;
        }
        // Above the hops: how far the dot has moved.
        if (hops) picture += `<text style="--hop: ${hops}" class="nn-hop-count ${direction < 0 ? 'nn-negative' : 'nn-positive'}" x="${x(start + direction * hops / 2)}" y="${phone ? 118 : 46}">${direction < 0 ? '−' : '+'}${hops}</text>`;
        picture += `<circle class="nn-start-dot" cx="${x(start)}" cy="${axis}" r="6"/>`;
        picture += `<circle class="nn-dot" style="--hop: ${hops}" cx="${x(position)}" cy="${axis}" r="${phone ? 12 : 9}"/>`;
        return `<svg viewBox="0 0 660 ${height}" aria-hidden="true">${picture}</svg>`;
    }

    function tapTarget(node, label, onTap) {
        node.setAttribute('role', 'button');
        node.setAttribute('aria-label', label);
        node.tabIndex = 0;
        node.addEventListener('click', onTap);
        node.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onTap();
            }
        });
    }

    function examples() {
        const Q = window.NegativeNumbers;
        return [Q.dragTakeNegative(5, 3), Q.dragTakePositive(3, 8), Q.dragTakeNegative(-4, 9), Q.dragAdd(-6, 9)];
    }

    function sectionEvent(sectionId, name) {
        document.dispatchEvent(new CustomEvent(`maths1to9:section-${name}`, {
            detail: { sectionId }
        }));
    }

    async function mountLearn() {
        const root = document.createElement('article');
        root.className = 'nn-learn';
        document.getElementById('lesson-section-explanation').append(root);
        const api = window.Maths1to9Lesson;
        sectionEvent('explanation', 'gate');
        const section = await api.useSectionState('learn', {
            version: 8,
            initial: () => ({
                screen: 0, finished: false, temperature: -3,
                journeys: [[0, 0], [0, 0], [0, 0]], feeRemoved: false,
                pattern: 1, changed: [false]
            }),
            // New screens have moved the later Learn screens along.
            upgrade: () => null
        });
        const state = section.state;
        section.save();

        function paragraph(text, className = '') {
            const node = document.createElement('p');
            node.textContent = text;
            node.className = className;
            root.append(node);
            return node;
        }

        function syncHash() {
            if (api.getCurrentSection().id === 'explanation') {
                api.setSlideHash(`learn-${state.screen + 1}`, { replace: true });
            }
        }

        function showScreen(screen) {
            section.update(state => { state.screen = screen; });
            render();
            root.querySelector('[data-screen-heading]').focus();
        }

        function complete() {
            const screen = screens[state.screen];
            if (['thermometer', 'sideways', 'read'].includes(screen.kind)) return true;
            if (screen.kind === 'fee') return state.feeRemoved;
            if (screen.kind === 'journeys') return true;
            if (screen.kind === 'pattern') return state.pattern === 6;
            return state.changed[screen.slot];
        }

        function actions() {
            api.setSectionBack('explanation', state.screen > 0 ? {
                onClick: () => showScreen(state.screen - 1)
            } : null);
            const last = state.screen === screens.length - 1;
            if (last && complete()) {
                if (!state.finished) section.update(state => { state.finished = true; });
                sectionEvent('explanation', 'complete');
                api.clearSectionAction('explanation');
            } else {
                api.setSectionAction('explanation', {
                    // Only the last screen must be finished, to open Try it.
                    label: 'Next', disabled: last,
                    onClick: () => showScreen(state.screen + 1)
                });
            }
            syncHash();
        }

        // Screen 1: drag the level up and down the thermometer.
        function exploreThermometer() {
            paragraph('Drag the red line up and down the thermometer.', 'nn-instruction');
            const picture = document.createElement('div');
            picture.className = 'nn-thermometer nn-explore';
            picture.tabIndex = 0;
            picture.setAttribute('role', 'application');
            picture.setAttribute('aria-label', 'Drag the level up and down the thermometer, or use the arrow keys.');
            root.append(picture);
            const caption = paragraph('', 'nn-caption');
            caption.setAttribute('aria-live', 'polite');
            function draw() {
                const value = state.temperature;
                picture.innerHTML = thermometer(value);
                caption.textContent = value === 0 ? "It's 0°C. Zero is neither positive nor negative." :
                    `It's ${signed(value)}°C. That's ${Math.abs(value)} degrees ${value < 0 ? 'below' : 'above'} zero, so it's a ${value < 0 ? 'negative' : 'positive'} number.`;
            }
            function move(value) {
                section.update(state => { state.temperature = Math.max(-10, Math.min(10, value)); });
                draw();
            }
            function pointer(event) {
                const box = picture.querySelector('svg').getBoundingClientRect();
                const y = (event.clientY - box.top) / box.height * THERMOMETER.height;
                move(Math.round(10 - (y - THERMOMETER.top) / THERMOMETER.step));
            }
            picture.addEventListener('pointerdown', event => {
                picture.setPointerCapture(event.pointerId);
                pointer(event);
            });
            picture.addEventListener('pointermove', event => {
                if (picture.hasPointerCapture(event.pointerId)) pointer(event);
            });
            picture.addEventListener('keydown', event => {
                if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
                event.preventDefault();
                move(state.temperature + (['ArrowRight', 'ArrowUp'].includes(event.key) ? 1 : -1));
            });
            draw();
        }

        // Screen 2: the same thermometer, lying on its side.
        function showSidewaysThermometer() {
            const picture = document.createElement('div');
            picture.className = 'nn-thermometer nn-side';
            picture.setAttribute('role', 'img');
            picture.setAttribute('aria-label', 'The thermometer lying on its side, from −10 on the left to 10 on the right, showing −3°C.');
            picture.innerHTML = sidewaysThermometer(-3);
            root.append(picture);
        }

        // Learn shows each example already worked out; Try it is where pupils
        // move the dot themselves.
        function journey(item) {
            const end = item.start + item.steps * item.direction;
            const line = document.createElement('div');
            line.className = 'nn-number-line nn-drawn';
            line.innerHTML = numberLine({ ...item, hops: item.steps, position: end });
            line.setAttribute('role', 'img');
            line.setAttribute('aria-label', `Start ${signed(item.start)}, ${item.steps} steps ${item.direction < 0 ? 'left' : 'right'}, landing on ${signed(end)}.`);
            root.append(line);
        }

        function showPattern() {
            const pattern = document.createElement('div');
            pattern.className = 'nn-pattern';
            if (new URLSearchParams(window.location.search).has('preview-reset')) {
                const reset = document.createElement('button');
                reset.type = 'button';
                reset.className = 'lesson-back nn-pattern-reset';
                reset.textContent = 'Reset slide';
                reset.addEventListener('click', () => {
                    section.update(state => { state.pattern = 1; });
                    render();
                    root.querySelector('.nn-pattern-reset').focus({ preventScroll: true });
                });
                root.append(reset);
            }
            root.append(pattern);

            function addRow(answer) {
                const subtract = 3 - answer;
                const row = document.createElement('div');
                row.className = answer >= 4 ? 'nn-pattern-row nn-highlight' : 'nn-pattern-row';
                row.innerHTML = `<span>3 − ${subtract < 0 ? `(${signed(subtract)})` : subtract}</span><span>= ${answer}</span><small>${answer ? `up ${answer}` : ''}</small>`;
                return row;
            }

            for (let answer = 0; answer < state.pattern; answer++) {
                pattern.append(addRow(answer));
            }
            if (complete()) return;

            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'nn-punch-card nn-pattern-card';
            card.textContent = '−1';
            card.setAttribute('aria-label', '−1, show the next sum');
            card.style.gridRow = state.pattern;
            pattern.append(card);
            card.addEventListener('click', () => {
                section.update(state => { state.pattern++; });
                card.before(addRow(state.pattern - 1));
                if (complete()) card.remove();
                else card.style.gridRow = state.pattern;
            });
        }

        function render() {
            const screen = screens[state.screen];
            // Each screen's main idea is its only heading; the Learn section
            // title is hidden in lesson.json.
            root.innerHTML = `<h2 class="lesson-section__title" data-screen-heading tabindex="-1">${screen.heading}</h2>`;
            screen.lines.forEach(text => paragraph(text));
            if (screen.kind === 'thermometer') exploreThermometer();
            else if (screen.kind === 'sideways') showSidewaysThermometer();
            else if (screen.kind === 'journeys') {
                screen.journeys.forEach(item => {
                    if (item.result) paragraph(item.result);
                    if (item.showSum !== false) paragraph(item.sum, 'nn-sum');
                    journey(item);
                });
            } else if (screen.kind === 'read') {
                const sum = document.createElement('div');
                sum.className = 'nn-read-sum';
                sum.innerHTML = '<span>3</span><span class="nn-part nn-selected">−<small>subtract</small></span><span class="nn-part nn-negative nn-selected">(−2)<small>negative 2</small></span>';
                root.append(sum);
                screen.afterSum.forEach(text => paragraph(text));
            } else if (screen.kind === 'fee') {
                const removed = state.feeRemoved;
                const statement = document.createElement('div');
                statement.className = 'nn-statement';
                statement.innerHTML = `<div class="nn-statement-title"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9 12 3l9 6v1H3zM5 11h2v7H5zm6 0h2v7h-2zm6 0h2v7h-2zM3 19h18v2H3z"/></svg>Your bank account</div>
                    <div class="nn-statement-row"><span>Balance</span><span>£5</span></div>
                    <div class="nn-statement-row nn-fee ${removed ? 'nn-fee-removed' : ''}"><span>Fee</span><span>−£2</span></div>
                    <div class="nn-statement-row nn-statement-total"><span>Balance now</span><span>£${removed ? 5 : 3}</span></div>`;
                root.append(statement);
                paragraph('5 + (−2) = 3', 'nn-fee-sum');
                if (!removed) {
                    const instruction = 'The fee was a mistake. Tap the fee to remove it.';
                    paragraph(instruction, 'nn-instruction');
                    tapTarget(statement.querySelector('.nn-fee'), instruction, () => {
                        section.update(state => { state.feeRemoved = true; });
                        render();
                    });
                } else {
                    paragraph('The fee was a mistake. The bank removes it and puts £2 back.');
                    paragraph('3 − (−2) = 5', 'nn-fee-sum');
                    paragraph('Subtracting −2 has the same effect as adding 2.');
                }
            } else if (screen.kind === 'pattern') {
                showPattern();
            } else {
                const i = screen.slot;
                const changed = state.changed[i];
                const sum = document.createElement('div');
                sum.className = 'nn-transform nn-sum';
                const original = changed ? `<span>${signed(screen.start)} − (−${screen.steps}) =</span> ` : '';
                sum.innerHTML = `${original}<span>${signed(screen.start)}</span> <span class="nn-transform-signs ${changed ? 'nn-changed' : ''}"><span class="nn-before">− (−</span><span class="nn-after">+</span></span> <span>${screen.steps}<span class="${changed ? 'nn-gone' : ''}">)</span></span>`;
                root.append(sum);
                if (!changed) {
                    const instruction = 'Tap the two minus signs to turn them into a plus.';
                    paragraph(instruction, 'nn-instruction');
                    tapTarget(sum.querySelector('.nn-transform-signs'), instruction, () => {
                        section.update(state => { state.changed[i] = true; });
                        // Keep the sum in place while the old signs fade into the plus.
                        render();
                    });
                }
            }
            actions();
        }

        screens.forEach((screen, index) => {
            api.registerHashRoute(`learn-${index + 1}`, () => {
                api.goToSection('explanation', { moveFocus: false });
                showScreen(index);
            });
        });
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        const requested = screens.findIndex((screen, index) => initialHash === `#learn-${index + 1}`);
        if (requested >= 0) showScreen(requested);
        else render();
    }

    async function mountTryIt(root) {
        const NN = window.NegativeNumbers;
        // Try it runs: number line examples, the sign grid, then the multiplying
        // examples. The last one goes straight on to Practice.
        const questions = [...examples(), ...NN.multiplyExamples()];
        const firstMultiply = examples().length;
        const questionPages = (from, to) => questions.slice(from, to).map((question, i) => ({ kind: 'question', question, number: from + i }));
        const pages = [
            ...questionPages(0, firstMultiply),
            { kind: 'grid' },
            ...questionPages(firstMultiply, questions.length)
        ];
        const lastPage = pages.length - 1;
        const api = window.Maths1to9Lesson;
        sectionEvent('interactive', 'gate');
        api.setSectionAction('interactive', { label: 'Check', disabled: true, onClick() {} });
        const section = await api.useSectionState('interactive', {
            version: 6,
            initial: () => ({
                index: 0, screen: 0, furthestScreen: 0, finished: false, cards: {},
                solved: {},
                reveal: { part: 0, seen: [[], []], last: null },
                conveyor: { signs: ['+', '+'], seen: [] },
                seed: window.Maths1to9LessonEngine.randomInt(0, 4294967295)
            }),
            // Version 6 changed the multiplying slides, so older saves start again.
            upgrade: () => null
        });
        const state = section.state;
        section.save();

        function syncHash() {
            if (api.getCurrentSection().id === 'interactive') {
                api.setSlideHash(`try-it-${state.screen + 1}`, { replace: true });
            }
        }

        function showScreen(screen) {
            section.update(state => { state.screen = screen; });
            render();
            const heading = root.querySelector('h3');
            heading.tabIndex = -1;
            heading.focus();
        }

        function reportProgress() {
            const done = pages.slice(0, state.index).filter(page => page.kind === 'question').length;
            const page = pages[state.index];
            const current = page.kind === 'question' && solved(page);
            api.setSectionProgress('interactive', state.finished ? questions.length : done + Number(current), questions.length);
        }

        // Dragging and tapping are saved here; typed answers are saved in cards.
        function solved({ number }) {
            return state.solved[number] === true || state.cards[`example-${number + 1}`]?.correct === true;
        }

        function continuePage() {
            if (state.index === lastPage) {
                section.update(state => { state.finished = true; });
                reportProgress();
                sectionEvent('interactive', 'complete');
                api.continueSection();
                return;
            }
            section.update(state => {
                state.index++;
                state.screen = state.index;
                state.furthestScreen = state.screen;
            });
            reportProgress();
            render();
        }

        function markSolved(number, refresh = render) {
            section.update(state => { state.solved[number] = true; });
            reportProgress();
            refresh();
        }

        function drawRevealCards(heading, body, page) {
            const factors = [1, -1];
            const values = [1, 0, -1];
            const reveal = state.reveal;
            const { createFeedback } = window.Maths1to9LessonEngine;
            body.classList.add('nn-reveal');

            const equation = document.createElement('p');
            equation.className = 'nn-reveal__equation';
            equation.setAttribute('aria-live', 'polite');
            const factor = document.createElement('span');
            const slot = document.createElement('span');
            slot.className = 'nn-reveal__slot';
            const answer = document.createElement('span');
            equation.append(factor, slot, ' = ', answer);
            body.append(equation);

            const group = document.createElement('div');
            group.className = 'nn-reveal__cards';
            group.setAttribute('role', 'group');
            group.setAttribute('aria-label', 'Numbers to multiply by');
            body.append(group);

            const lists = document.createElement('div');
            lists.className = 'nn-reveal__lists';
            body.append(lists);
            const rows = factors.map(first => {
                const list = document.createElement('ul');
                list.setAttribute('aria-label', `Multiplying ${signed(first)}`);
                lists.append(list);
                return values.map(value => {
                    const row = document.createElement('li');
                    row.textContent = `${signed(first)} × ${signed(value)} = ${signed(first * value)}`;
                    list.append(row);
                    return row;
                });
            });

            let feedback;
            const buttons = values.map(value => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'button';
                button.textContent = signed(value);
                button.addEventListener('click', () => {
                    if (solved(page)) return;
                    section.update(({ reveal }) => {
                        const seen = reveal.seen[reveal.part];
                        if (!seen.includes(value)) seen.push(value);
                        reveal.last = value;
                        if (reveal.part === 0 && seen.length === values.length) {
                            reveal.part = 1;
                            reveal.last = null;
                        }
                    });
                    if (reveal.seen[1].length === values.length) {
                        markSolved(page.number, () => api.setSectionAction('interactive', {
                            label: 'Next', onClick: nextPage
                        }));
                    }
                    paint();
                });
                group.append(button);
                return button;
            });

            function paint() {
                const { part, seen, last } = reveal;
                const done = solved(page);
                heading.textContent = part === 0 ? page.question.prompt : 'Now tap each card to multiply −1 by it.';
                factor.textContent = `${signed(factors[part])} × `;
                slot.textContent = last === null ? '' : signed(last);
                slot.classList.toggle('is-filled', last !== null);
                answer.textContent = last === null ? '?' : signed(factors[part] * last);
                answer.classList.toggle('is-revealed', last !== null);
                buttons.forEach((button, index) => {
                    const value = values[index];
                    const used = seen[part].includes(value);
                    button.classList.toggle('is-used', used);
                    button.classList.toggle('is-selected', last === value);
                    button.setAttribute('aria-pressed', String(used));
                    button.disabled = done;
                });
                rows.forEach((list, partIndex) => list.forEach((row, index) => {
                    row.hidden = !seen[partIndex].includes(values[index]);
                }));
                if (done && !feedback) {
                    feedback = createFeedback('interactive', { correct: true, text: page.question.feedback });
                    body.append(feedback);
                }
            }
            paint();
        }

        // The sign machine: two punch cards sit in the machine. Tapping a card
        // flips its sign, and the answer's sign rides out along the belt to the
        // tray. The first flip finishes the question; the feedback describes
        // the pair on the cards.
        function drawConveyor(body, page) {
            const times = (left, right) => (left === right ? '+' : '−');
            const word = sign => (sign === '+' ? 'positive' : 'negative');
            const conveyor = state.conveyor;
            const { createFeedback } = window.Maths1to9LessonEngine;
            body.classList.add('nn-conveyor');
            // Saves from before the cards could flip may hold empty signs.
            if (!conveyor.signs.every(Boolean)) {
                section.update(({ conveyor }) => {
                    conveyor.signs = conveyor.signs.map(sign => sign || '+');
                });
            }

            const machine = document.createElement('div');
            machine.className = 'nn-machine';
            machine.innerHTML = `
                <div class="nn-machine__body">
                    <div class="nn-machine__lights"><span></span><span></span><span></span></div>
                    <div class="nn-machine__front" role="group" aria-label="Signs in the machine">
                        <button type="button" class="nn-punch-card"></button>
                        <span class="nn-machine__times">×</span>
                        <button type="button" class="nn-punch-card"></button>
                    </div>
                </div>
                <div class="nn-machine__belt" aria-hidden="true"><span class="nn-machine__token"></span></div>
                <div class="nn-machine__tray" aria-live="polite"></div>`;
            const cards = [...machine.querySelectorAll('.nn-punch-card')];
            const token = machine.querySelector('.nn-machine__token');
            const tray = machine.querySelector('.nn-machine__tray');
            body.append(machine);

            cards.forEach((card, side) => card.addEventListener('click', () => {
                section.update(({ conveyor }) => {
                    conveyor.signs[side] = conveyor.signs[side] === '+' ? '−' : '+';
                    const key = conveyor.signs.join(',');
                    if (!conveyor.seen.includes(key)) conveyor.seen.push(key);
                });
                if (!solved(page)) {
                    markSolved(page.number, () => api.setSectionAction('interactive', {
                        label: 'Next', onClick: nextPage
                    }));
                }
                paint(side);
            }));

            let feedback;
            // `flipped` is the card the pupil has just turned over, if any.
            function paint(flipped = null) {
                const [left, right] = conveyor.signs;
                const answer = times(left, right);
                const shown = conveyor.seen.length > 0;
                cards.forEach((card, side) => {
                    const sign = conveyor.signs[side];
                    card.textContent = sign;
                    card.setAttribute('aria-label', `${side === 0 ? 'First' : 'Second'} card: ${sign === '+' ? 'plus' : 'minus'}. Tap to flip it.`);
                    card.classList.remove('is-flipping');
                    if (side === flipped) {
                        void card.offsetWidth;
                        card.classList.add('is-flipping');
                    }
                });
                machine.classList.toggle('is-running', shown);
                token.textContent = shown ? answer : '';
                token.hidden = !shown;
                tray.textContent = shown ? answer : '';
                tray.setAttribute('aria-label', shown ? `${left} × ${right} = ${answer}` : 'Empty');
                if (flipped !== null) {
                    [token, tray].forEach(node => {
                        node.classList.remove('is-moving');
                        void node.offsetWidth;
                        node.classList.add('is-moving');
                    });
                }
                if (shown) {
                    const reason = left === right
                        ? `The signs are the same, so the answer is ${word(answer)}.`
                        : `The signs are different, so the answer is ${word(answer)}.`;
                    const next = createFeedback('interactive', { correct: true, text: reason });
                    if (feedback) feedback.replaceWith(next);
                    else body.append(next);
                    feedback = next;
                }
            }
            paint();
        }

        // A question the pupil answers by doing, with no Check button.
        function drawHandsOn(container, page) {
            const { question, number } = page;
            const heading = document.createElement('h3');
            heading.dataset.screenHeading = '';
            heading.className = 'question-prompt';
            heading.textContent = question.prompt;
            const body = document.createElement('div');
            body.className = 'nn-learn';
            container.append(heading, body);
            if (question.input === 'reveal') {
                drawRevealCards(heading, body, page);
            } else if (question.input === 'conveyor') {
                drawConveyor(body, page);
            } else NN.drawDragToAnswer(body, question, solved(page), {
                onSolved: () => markSolved(number),
                setAction: action => api.setSectionAction('interactive', action)
            });
        }

        function drawExample(container, page, readOnly) {
            const { question, number } = page;
            if (!question.signs) return drawHandsOn(container, page);
            const prepared = NN.prepare(question, window.Maths1to9LessonEngine.seededRandom(state.seed + number));
            const cardRoot = document.createElement('div');
            container.append(cardRoot);
            api.createQuestion(cardRoot, {
                ...NN.withSignGrid(prepared), sectionId: 'interactive', questionId: `example-${number + 1}`,
                scored: false, readOnly,
                onFeedback: reportProgress,
                onContinue: continuePage
            });
        }

        // The four sign rules. Each word sits in its own pastel box: green
        // for positive, peach for negative.
        function drawGridPage() {
            const page = document.createElement('div');
            page.className = 'nn-learn';
            root.append(page);
            const rules = [
                ['positive', 'positive', 'positive'],
                ['negative', 'negative', 'positive'],
                ['positive', 'negative', 'negative'],
                ['negative', 'positive', 'negative']
            ];
            const list = document.createElement('ul');
            list.className = 'nn-sign-rules';
            for (const [first, second, answer] of rules) {
                const item = document.createElement('li');
                const word = sign => `<span class="nn-sign-word nn-sign-word--${sign}">${sign}</span>`;
                item.className = 'nn-sign-rule';
                item.innerHTML = `${word(first)} × ${word(second)} = ${word(answer)}`;
                list.append(item);
            }
            page.append(list);
            NN.paragraph(page, 'When the two signs are the same, the answer is positive. When they are different, the answer is negative.');
            return true;
        }

        function nextPage() {
            if (state.screen === state.index) continuePage();
            else showScreen(state.screen + 1);
        }

        function render() {
            root.replaceChildren();
            const page = pages[state.screen];
            // The section title is hidden. A question's prompt is its page's only
            // heading; the review and grid pages draw their own.
            if (page.kind !== 'question') {
                const heading = document.createElement('h3');
                heading.dataset.screenHeading = '';
                heading.className = 'lesson-section__title';
                heading.textContent = 'When you multiply, the two signs tell you the sign of the answer.';
                root.append(heading);
            }
            api.setSectionBack('interactive', state.screen > 0 ? {
                onClick: () => showScreen(state.screen - 1)
            } : null);
            if (state.finished) sectionEvent('interactive', 'complete');
            if (page.kind === 'grid') {
                const full = drawGridPage();
                api.setSectionAction('interactive', { label: 'Next', disabled: !full, onClick: nextPage });
            } else {
                const readOnly = state.screen < state.index || state.finished;
                drawExample(root, page, readOnly);
                if (readOnly) api.setSectionAction('interactive', state.screen === lastPage ? {
                    label: 'Continue', onClick: () => api.continueSection()
                } : {
                    label: 'Next', onClick: () => showScreen(state.screen + 1)
                });
                // Unsolved drag questions set their own Check button.
                else if (!page.question.signs && (page.question.input !== 'drag' || solved(page))) api.setSectionAction('interactive', {
                    label: 'Next', disabled: !solved(page), onClick: nextPage
                });
            }
            syncHash();
        }

        // The site isn't open to pupils yet, so a slide link opens any slide,
        // even one not reached yet. Skipped slides stay unanswered.
        function jumpTo(screen) {
            section.update(state => {
                if (screen > state.index) {
                    state.index = screen;
                    state.furthestScreen = screen;
                }
            });
            reportProgress();
            showScreen(screen);
        }

        pages.forEach((page, index) => {
            api.registerHashRoute(`try-it-${index + 1}`, () => {
                if (!api.goToSection('interactive', { moveFocus: false, unlock: true })) {
                    document.dispatchEvent(new CustomEvent('maths1to9:section-change'));
                    return;
                }
                jumpTo(index);
            });
        });
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        reportProgress();
        render();
        const requested = pages.findIndex((page, index) => initialHash === `#try-it-${index + 1}`);
        if (requested >= 0 && api.goToSection('interactive', { moveFocus: false, unlock: true })) {
            jumpTo(requested);
        }
    }

    window.Maths1to9Interactives ??= {};
    window.Maths1to9Interactives[SLUG] = mountTryIt;
    document.addEventListener('maths1to9:lesson-rendered', event => {
        if (event.detail?.slug === SLUG) mountLearn();
    });
})();
