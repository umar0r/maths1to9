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
            { start: 4, steps: 6, direction: -1, sum: '4 − 6', showSum: false, instruction: 'Take 6 away from 4.', startLabel: false }
        ] },
        { title: 'Adding to a negative number', kind: 'journeys', slot: 1,
        heading: 'When you add a positive number, you move right along the number line.', lines: [], journeys: [
            { start: -6, steps: 4, direction: 1, sum: '−6 + 4', showSum: false, tapCue: false, instruction: 'Move the dot 4 places to the right.', result: 'You moved up towards zero but didn\'t reach it, so the answer is still negative.' }
        ] },
        { title: 'Taking away from a negative number', kind: 'journeys', slot: 2,
        heading: 'If you start on a negative number and take away a positive number, you still move left.', lines: [
            'That takes you further below zero, so the answer is more negative.'
        ], journeys: [
            { start: -2, steps: 3, direction: -1, sum: '−2 − 3', showSum: false, tapCue: false, instruction: 'Start at −2 and move 3 steps to the left.' }
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
        heading: 'Another way of looking at it: start with 3 and take away a smaller number each time.', lines: [
            'Watch what happens to the answer.'
        ] },
        { title: 'Take away a negative: add instead', kind: 'method', slot: 0,
        heading: 'So when you take away a negative, you can add instead.', lines: [
            'The take-away sign and the negative sign turn into a plus.'
        ], start: 3, steps: 4, showLine: false },
        { title: 'When the first number is negative', kind: 'method', slot: 1,
        heading: 'It works the same way when the first number is negative.', lines: [
            'Only the two minus signs in the middle turn into a plus. The first number stays exactly as it is.'
        ], start: -8, steps: 3, showSum: false }
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
    function numberLine({ start, position = start, hops = 0, direction = 1, startLabel = true }) {
        const x = value => 30 + (value + 10) * 30;
        const phone = window.matchMedia('(max-width: 600px)').matches;
        const axis = phone ? 210 : 80;
        const height = phone ? 296 : 140;
        let picture = startLabel ?
            `<text class="nn-start-label" x="${x(start)}" y="${phone ? 85 : 24}">start</text>` : '';
        picture += `<path class="nn-axis" d="M 15 ${axis} H 645"/>`;
        for (let value = -10; value <= 10; value++) {
            const tone = value < 0 ? 'nn-negative' : value > 0 ? 'nn-positive' : 'nn-zero';
            picture += `<path class="nn-tick ${tone}" d="M ${x(value)} ${axis - 7} V ${axis + 7}"/>
                <text class="nn-value ${tone}" x="${x(value)}" y="${axis + 36}">${signed(value)}</text>`;
        }
        picture += `<circle class="nn-zero-circle" cx="330" cy="${axis + (phone ? 29 : 31)}" r="12"/>`;
        for (let step = 0; step < hops; step++) {
            const from = x(start + direction * step), to = from + direction * 30;
            picture += `<path class="nn-hop ${direction < 0 ? 'nn-negative' : 'nn-positive'}" d="M ${from} ${axis} Q ${(from + to) / 2} ${phone ? 50 : 37} ${to} ${axis}"/>`;
        }
        // Above the hops: how far the dot has moved.
        if (hops) picture += `<text class="nn-hop-count ${direction < 0 ? 'nn-negative' : 'nn-positive'}" x="${x(start + direction * hops / 2)}" y="${phone ? 118 : 46}">${direction < 0 ? '−' : '+'}${hops}</text>`;
        picture += `<circle class="nn-start-dot" cx="${x(start)}" cy="${axis}" r="6"/>`;
        picture += `<circle class="nn-dot" cx="${x(position)}" cy="${axis}" r="${phone ? 12 : 9}"/>`;
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
                pattern: 1, changed: [false, false], hops: [0, 0]
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
            if (screen.kind === 'journeys') return screen.journeys.every((item, i) =>
                state.journeys[screen.slot][i] === item.steps);
            if (screen.kind === 'pattern') return state.pattern === 6;
            if (screen.showLine === false) return state.changed[screen.slot];
            return state.hops[screen.slot] === screen.steps;
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

        function journey(item, count, onTap) {
            const line = document.createElement('div');
            line.className = `nn-number-line${count === 0 && item.tapCue !== false ? ' nn-awaiting-tap' : ''}`;
            line.innerHTML = numberLine({ ...item, hops: count, position: item.start + count * item.direction });
            root.append(line);
            if (count < item.steps) tapTarget(line, item.instruction, onTap);
            else {
                line.setAttribute('role', 'img');
                line.setAttribute('aria-label', `Start ${signed(item.start)}, ${count} steps ${item.direction < 0 ? 'left' : 'right'}, landing on ${signed(item.start + count * item.direction)}.`);
            }
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
                screen.journeys.forEach((item, i) => {
                    const counts = state.journeys[screen.slot];
                    if (i > 0 && counts[i - 1] < screen.journeys[i - 1].steps) return;
                    if (item.showSum !== false) paragraph(item.sum, 'nn-sum');
                    paragraph(item.instruction, 'nn-instruction');
                    journey(item, counts[i], () => {
                        section.update(state => { state.journeys[screen.slot][i]++; });
                        render();
                    });
                    if (counts[i] === item.steps) {
                        window.NegativeNumbers.correctBox(root, item.result || '', `${item.sum} = ${signed(item.start + item.steps * item.direction)}`);
                    }
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
                    window.NegativeNumbers.correctBox(root, 'Subtracting −2 has the same effect as adding 2.', '3 − (−2) = 3 + 2 = 5');
                }
            } else if (screen.kind === 'pattern') {
                const pattern = document.createElement('div');
                pattern.className = 'nn-pattern';
                for (let i = 0; i < state.pattern; i++) {
                    const subtract = 3 - i;
                    pattern.innerHTML += `<div class="nn-pattern-row ${i > 3 ? 'nn-highlight' : ''}"><span>3 − ${subtract < 0 ? `(${signed(subtract)})` : subtract}</span><span>= ${i}</span><small>${i ? `up ${i}` : ''}</small></div>`;
                }
                root.append(pattern);
                if (state.pattern < 6) {
                    const instruction = document.createElement('p');
                    instruction.className = 'nn-instruction';
                    instruction.textContent = 'Tap to show the next line.';
                    pattern.append(instruction);
                    tapTarget(pattern, 'Tap to show the next line.', () => {
                        section.update(state => { state.pattern++; });
                        render();
                    });
                } else paragraph("Each time you take away 1 less, the answer goes up by 1. Carry on past zero and you're taking away negative numbers, so the answer keeps going up. Taking away negative 2 gives 5, which is the same as 3 + 2.");
            } else {
                const i = screen.slot;
                const changed = state.changed[i] || screen.showSum === false;
                const sum = document.createElement('div');
                sum.className = 'nn-transform nn-sum';
                const original = changed && i === 0 ? `<span>${signed(screen.start)} − (−${screen.steps}) =</span> ` : '';
                sum.innerHTML = `${original}<span>${signed(screen.start)}</span> <span class="nn-transform-signs ${changed ? 'nn-changed' : ''}"><span class="nn-before">− (−</span><span class="nn-after">+</span></span> <span>${screen.steps}<span class="${changed ? 'nn-gone' : ''}">)</span></span>`;
                if (screen.showSum !== false) root.append(sum);
                if (!changed) {
                    const instruction = i === 0 ? 'Tap the two minus signs to turn them into a plus.' : 'Tap the two middle minus signs.';
                    paragraph(instruction, 'nn-instruction');
                    tapTarget(sum.querySelector('.nn-transform-signs'), instruction, () => {
                        section.update(state => { state.changed[i] = true; });
                        // Keep the sum in place while the old signs fade into the plus.
                        render();
                    });
                } else {
                    if (screen.showLine !== false) {
                        const instruction = `Start at ${signed(screen.start)}. Tap the number line to take ${screen.steps} steps right.`;
                        paragraph(instruction, 'nn-instruction');
                        journey({ ...screen, direction: 1, instruction }, state.hops[i], () => {
                            section.update(state => { state.hops[i]++; });
                            render();
                        });
                    }
                    if (complete()) {
                        const reminder = i === 1 ? 'Watch out: a common mistake is to change the −8 into 8 as well, and get 8 + 3 = 11. Only the two signs in the middle change.' : '';
                        window.NegativeNumbers.correctBox(root, reminder, `${signed(screen.start)} − (−${screen.steps}) = ${signed(screen.start)} + ${screen.steps} = ${signed(screen.start + screen.steps)}`);
                    }
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
            version: 3,
            initial: () => ({
                index: 0, screen: 0, furthestScreen: 0, finished: false, cards: {},
                grid: [false, false, false, false], gridLast: null, solved: {}, tried: [],
                seed: window.Maths1to9LessonEngine.randomInt(0, 4294967295)
            }),
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

        function markSolved(number) {
            section.update(state => { state.solved[number] = true; });
            reportProgress();
            render();
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
            if (question.input === 'tap') {
                NN.drawTapSquare(body, question, state.tried, solved(page), key => {
                    if (key === question.square.join(',')) return markSolved(number);
                    section.update(state => { state.tried.push(key); });
                    render();
                });
            } else NN.drawDragToAnswer(body, question, solved(page), () => markSolved(number));
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

        function drawGridPage() {
            const page = document.createElement('div');
            page.className = 'nn-learn';
            root.append(page);
            NN.paragraph(page, 'Tap each square to fill the grid.', 'nn-instruction');
            NN.drawSignGrid(page, state.grid, state.gridLast, square => {
                section.update(state => {
                    state.grid[square] = true;
                    state.gridLast = square;
                });
                render();
            });
            const full = state.grid.every(Boolean);
            if (full) NN.paragraph(page, 'When the two signs are the same, the answer is positive. When they are different, the answer is negative.');
            return full;
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
                else if (!page.question.signs) api.setSectionAction('interactive', {
                    label: 'Next', disabled: !solved(page), onClick: nextPage
                });
            }
            syncHash();
        }

        pages.forEach((page, index) => {
            api.registerHashRoute(`try-it-${index + 1}`, () => {
                if (!api.goToSection('interactive', { moveFocus: false })) {
                    document.dispatchEvent(new CustomEvent('maths1to9:section-change'));
                    return;
                }
                showScreen(Math.min(index, state.furthestScreen));
            });
        });
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        reportProgress();
        render();
        const requested = pages.findIndex((page, index) => initialHash === `#try-it-${index + 1}`);
        if (requested >= 0 && api.goToSection('interactive', { moveFocus: false })) {
            showScreen(Math.min(requested, state.furthestScreen));
        }
    }

    window.Maths1to9Interactives ??= {};
    window.Maths1to9Interactives[SLUG] = mountTryIt;
    document.addEventListener('maths1to9:lesson-rendered', event => {
        if (event.detail?.slug === SLUG) mountLearn();
    });
})();
