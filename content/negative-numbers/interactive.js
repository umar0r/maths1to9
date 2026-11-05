(() => {
    'use strict';

    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;

    const screens = [
        { title: 'Numbers below zero', lines: [
            'Negative numbers are numbers below zero. You\'ve already seen them on a cold day: −3°C is 3 degrees colder than 0°C. We write a negative number with a minus sign in front, and we say it as "negative 3".',
            'On this number line, zero sits in the middle. The positive numbers go to the right of zero, and the negative numbers go to the left. Zero itself is neither positive nor negative.'
        ] },
        { title: 'Taking away past zero', lines: [
            'When you take away a positive number, you move left along the number line. If you take away more than you started with, you go past zero and end up on a negative number.'
        ], journeys: [
            { start: 4, steps: 6, direction: -1, sum: '4 − 6', instruction: 'Start at 4. Taking away 6 means 6 steps to the left. Tap the number line to take each step.', result: 'You went past zero and landed on −2.' },
            { start: 2, steps: 5, direction: -1, sum: '2 − 5', instruction: 'Your turn. Tap the number line to take 5 steps left.' }
        ] },
        { title: 'Adding to a negative number', lines: [
            'When you add a positive number, you move right along the number line. If you start on a negative number, adding moves you back up towards zero, and sometimes past it.'
        ], journeys: [
            { start: -6, steps: 4, direction: 1, sum: '−6 + 4', instruction: 'Start at −6. Adding 4 means 4 steps to the right. Tap the number line to take each step.', result: 'You moved up towards zero but didn\'t reach it, so the answer is still negative.' },
            { start: -3, steps: 7, direction: 1, sum: '−3 + 7', instruction: 'Your turn. Tap the number line to take 7 steps right.', result: 'This time you went past zero, so the answer is positive.' }
        ] },
        { title: 'Taking away from a negative number', lines: [
            'If you start on a negative number and take away a positive number, you still move left. That takes you further below zero, so the answer is more negative.'
        ], journeys: [
            { start: -2, steps: 3, direction: -1, sum: '−2 − 3', instruction: 'Start at −2. Taking away 3 means 3 steps to the left. Tap the number line to take each step.' },
            { start: -4, steps: 5, direction: -1, sum: '−4 − 5', instruction: 'Your turn. Tap the number line to take 5 steps left.' }
        ] },
        { title: 'Two minus signs in one sum', lines: [
            'Sometimes you have to take away a negative number, like 3 take away negative 2. We write it as 3 − (−2). The bracket keeps the negative 2 together, so the two minus signs don\'t run into each other.'
        ] },
        { title: 'What happens when you take away a negative', lines: [
            'Start with 3 and take away a smaller number each time. Watch what happens to the answer.'
        ] },
        { title: 'Take away a negative: add instead', lines: [
            'So when you take away a negative, you can add instead. The take-away sign and the negative sign turn into a plus.'
        ], start: 3, steps: 4 },
        { title: 'When the first number is negative', lines: [
            'It works the same way when the first number is negative. Only the two minus signs in the middle turn into a plus. The first number stays exactly as it is.'
        ], start: -8, steps: 3 }
    ];

    const signed = value => String(value).replace('-', '−');

    // Every Learn line has the same scale. Two label rows keep all 21 values
    // readable on phones without hiding the odd numbers.
    function numberLine({ start, position = start, hops = 0, direction = 1, explore = false, pixelWidth = 660 }) {
        const x = value => 30 + (value + 10) * 30;
        const phone = window.matchMedia('(max-width: 600px)').matches;
        const axis = phone ? 180 : 80;
        const labelOffset = axis - 80;
        const height = phone ? 300 : 185;
        // Keep the draggable marker 22 px wide, with a hit area larger than 44 px,
        // regardless of how much the SVG scales to fit the card.
        const svgScale = 660 / (pixelWidth || (phone ? window.innerWidth - 36 : 660));
        const markerRadius = explore ? 11 * svgScale : (phone ? 12 : 9);
        let picture = explore ? `<rect class="nn-negative-shade" x="20" y="${axis - 15}" width="290" height="30" rx="5"/>
            <rect class="nn-positive-shade" x="350" y="${axis - 15}" width="290" height="30" rx="5"/>
            <text class="nn-negative" x="165" y="${phone ? 60 : 30}">negative numbers</text>
            <text class="nn-positive" x="495" y="${phone ? 60 : 30}">positive numbers</text>` :
            `<text class="nn-start-label" x="${x(start)}" y="${phone ? 55 : 24}">start</text>`;
        picture += `<path class="nn-axis" d="M 15 ${axis} H 645"/>`;
        for (let value = -10; value <= 10; value++) {
            const tone = value < 0 ? 'nn-negative' : value > 0 ? 'nn-positive' : 'nn-zero';
            const y = (Math.abs(value) % 2 ? 162 : 116) + labelOffset;
            picture += `<path class="nn-tick ${tone}" d="M ${x(value)} ${axis - 7} V ${axis + 7}"/>
                <text class="nn-value ${tone}" x="${x(value)}" y="${y}">${signed(value)}</text>`;
        }
        picture += `<circle class="nn-zero-circle" cx="330" cy="${axis + 28}" r="16"/>`;
        for (let step = 0; step < hops; step++) {
            const from = x(start + direction * step), to = from + direction * 30;
            picture += `<path class="nn-hop ${direction < 0 ? 'nn-negative' : 'nn-positive'}" d="M ${from} ${axis} Q ${(from + to) / 2} ${phone ? 20 : 37} ${to} ${axis}"/>`;
        }
        if (!explore) picture += `<circle class="nn-start-dot" cx="${x(start)}" cy="${axis}" r="6"/>`;
        picture += `<circle class="nn-dot" cx="${x(position)}" cy="${axis}" r="${markerRadius}"/>`;
        if (explore) picture += `<circle class="nn-drag-target" cx="${x(position)}" cy="${axis}" r="${23 * svgScale}" fill="transparent"/>`;
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
        return [Q.rewrite(5, 3), Q.calculate(-2, 6), Q.rewrite(-7, 3), Q.calculate(-4, 9)];
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
            version: 2,
            initial: () => ({
                screen: 0, furthestScreen: 0, finished: false, marker: 0,
                journeys: [[0, 0], [0, 0], [0, 0]], labels: [false, false],
                pattern: 0, changed: [false, false], hops: [0, 0]
            }),
            // The previous four Learn screens have been replaced entirely.
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
            section.update(state => {
                state.screen = screen;
                state.furthestScreen = Math.max(state.furthestScreen, screen);
            });
            render();
            root.querySelector('h3').focus();
        }

        function complete() {
            if (state.screen === 0) return true;
            if (state.screen <= 3) return screens[state.screen].journeys.every((item, i) =>
                state.journeys[state.screen - 1][i] === item.steps);
            if (state.screen === 4) return state.labels.every(Boolean);
            if (state.screen === 5) return state.pattern === 6;
            return state.hops[state.screen - 6] === screens[state.screen].steps;
        }

        function actions() {
            api.setSectionBack('explanation', state.screen > 0 ? {
                onClick: () => showScreen(state.screen - 1)
            } : null);
            if (state.screen === 7 && complete()) {
                if (!state.finished) section.update(state => { state.finished = true; });
                sectionEvent('explanation', 'complete');
                api.clearSectionAction('explanation');
            } else {
                api.setSectionAction('explanation', {
                    label: 'Next', disabled: !complete(),
                    onClick: () => showScreen(state.screen + 1)
                });
            }
            syncHash();
        }

        function explore() {
            const line = document.createElement('div');
            line.className = 'nn-number-line nn-explore';
            line.tabIndex = 0;
            line.setAttribute('role', 'application');
            line.setAttribute('aria-label', 'Drag the marker along the number line, or use the arrow keys.');
            root.append(line);
            const caption = paragraph('', 'nn-caption');
            caption.setAttribute('aria-live', 'polite');
            function draw() {
                const value = state.marker;
                line.innerHTML = numberLine({ start: 0, position: value, explore: true, pixelWidth: line.clientWidth });
                caption.textContent = value === 0 ? "You're on 0. Zero is neither positive nor negative." :
                    `You're on ${signed(value)}. That's ${Math.abs(value)} to the ${value < 0 ? 'left' : 'right'} of zero, so it's a ${value < 0 ? 'negative' : 'positive'} number.`;
            }
            function move(value) {
                section.update(state => { state.marker = Math.max(-10, Math.min(10, value)); });
                draw();
            }
            function pointer(event) {
                const box = line.getBoundingClientRect();
                move(Math.round(((event.clientX - box.left) / box.width * 660 - 30) / 30 - 10));
            }
            line.addEventListener('pointerdown', event => {
                line.setPointerCapture(event.pointerId);
                pointer(event);
            });
            line.addEventListener('pointermove', event => {
                if (line.hasPointerCapture(event.pointerId)) pointer(event);
            });
            line.addEventListener('keydown', event => {
                if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
                event.preventDefault();
                move(state.marker + (['ArrowRight', 'ArrowUp'].includes(event.key) ? 1 : -1));
            });
            draw();
        }

        function journey(item, count, onTap) {
            const line = document.createElement('div');
            line.className = `nn-number-line${count === 0 ? ' nn-awaiting-tap' : ''}`;
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
            root.innerHTML = `<h3 data-screen-heading tabindex="-1">${screen.title}</h3>`;
            screen.lines.forEach(text => paragraph(text));
            if (state.screen === 0) explore();
            else if (screen.journeys) {
                screen.journeys.forEach((item, i) => {
                    const counts = state.journeys[state.screen - 1];
                    if (i > 0 && counts[i - 1] < screen.journeys[i - 1].steps) return;
                    paragraph(item.sum, 'nn-sum');
                    paragraph(item.instruction, 'nn-instruction');
                    journey(item, counts[i], () => {
                        section.update(state => { state.journeys[state.screen - 1][i]++; });
                        render();
                    });
                    if (counts[i] === item.steps) {
                        if (item.result) paragraph(item.result);
                        paragraph(`${item.sum} = ${signed(item.start + item.steps * item.direction)}`, 'nn-working');
                    }
                });
            } else if (state.screen === 4) {
                paragraph('Tap each part of the sum to see what it means.', 'nn-instruction');
                const sum = document.createElement('div');
                sum.className = 'nn-read-sum';
                sum.innerHTML = `<span>3</span><span class="nn-part ${state.labels[0] ? 'nn-selected' : ''}" data-part="0">−<small>${state.labels[0] ? 'take away' : ''}</small></span><span class="nn-part nn-negative ${state.labels[1] ? 'nn-selected' : ''}" data-part="1">(−2)<small>${state.labels[1] ? 'the number negative 2' : ''}</small></span>`;
                root.append(sum);
                sum.querySelectorAll('[data-part]').forEach(node => {
                    const i = Number(node.dataset.part);
                    if (!state.labels[i]) tapTarget(node, i === 0 ? 'Take-away sign' : 'The number negative 2', () => {
                        section.update(state => { state.labels[i] = true; });
                        render();
                    });
                });
            } else if (state.screen === 5) {
                const pattern = document.createElement('div');
                pattern.className = 'nn-pattern';
                for (let i = 0; i < state.pattern; i++) {
                    const subtract = 3 - i;
                    pattern.innerHTML += `<div class="nn-pattern-row ${i > 3 ? 'nn-highlight' : ''}"><span>3 − ${subtract < 0 ? `(${signed(subtract)})` : subtract}</span><span>= ${i}</span><small>${i ? 'up 1' : ''}</small></div>`;
                }
                const instruction = document.createElement('p');
                instruction.className = 'nn-instruction';
                instruction.textContent = 'Tap to show the next line.';
                pattern.append(instruction);
                root.append(pattern);
                if (state.pattern < 6) tapTarget(pattern, 'Tap to show the next line.', () => {
                    section.update(state => { state.pattern++; });
                    render();
                });
                else paragraph("Each time you take away 1 less, the answer goes up by 1. Carry on past zero and you're taking away negative numbers, so the answer keeps going up. Taking away negative 2 gives 5, which is the same as 3 + 2.");
            } else {
                const i = state.screen - 6;
                const changed = state.changed[i];
                const sum = document.createElement('div');
                sum.className = 'nn-transform nn-sum';
                sum.innerHTML = `<span>${signed(screen.start)}</span> <span class="nn-transform-signs ${changed ? 'nn-changed' : ''}"><span class="nn-before">− (−</span><span class="nn-after">+</span></span> <span>${screen.steps}<span class="${changed ? 'nn-gone' : ''}">)</span></span>`;
                root.append(sum);
                if (!changed) {
                    const instruction = state.screen === 6 ? 'Tap the two minus signs to turn them into a plus.' : 'Tap the two middle minus signs.';
                    paragraph(instruction, 'nn-instruction');
                    tapTarget(sum.querySelector('.nn-transform-signs'), instruction, () => {
                        section.update(state => { state.changed[i] = true; });
                        // Keep the sum in place while the old signs fade into the plus.
                        render();
                    });
                } else {
                    const instruction = `${state.screen === 6 ? 'Now start' : 'Start'} at ${signed(screen.start)}. Tap the number line to take ${screen.steps} steps right.`;
                    paragraph(instruction, 'nn-instruction');
                    journey({ ...screen, direction: 1, instruction }, state.hops[i], () => {
                        section.update(state => { state.hops[i]++; });
                        render();
                    });
                    if (complete()) {
                        paragraph(`${signed(screen.start)} − (−${screen.steps}) = ${signed(screen.start)} + ${screen.steps} = ${signed(screen.start + screen.steps)}`, 'nn-working');
                        if (i === 1) paragraph('Watch out: a common mistake is to change the −8 into 8 as well, and get 8 + 3 = 11. Only the two signs in the middle change.', 'nn-warning');
                    }
                }
            }
            actions();
        }

        screens.forEach((screen, index) => {
            api.registerHashRoute(`learn-${index + 1}`, () => {
                api.goToSection('explanation', { moveFocus: false });
                showScreen(Math.min(index, state.furthestScreen));
            });
        });
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        const requested = screens.findIndex((screen, index) => initialHash === `#learn-${index + 1}`);
        if (requested >= 0) showScreen(Math.min(requested, state.furthestScreen));
        else render();
    }

    async function mountTryIt(root) {
        const questions = examples();
        const api = window.Maths1to9Lesson;
        sectionEvent('interactive', 'gate');
        api.setSectionAction('interactive', { label: 'Check', disabled: true, onClick() {} });
        const section = await api.useSectionState('interactive', {
            version: 1,
            initial: () => ({
                index: 0, screen: 0, furthestScreen: 0, finished: false, cards: {},
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
            const card = state.cards[`example-${state.index + 1}`];
            const completed = state.finished ? questions.length : state.index + Number(card?.correct === true);
            api.setSectionProgress('interactive', completed, questions.length);
        }

        function continueExample() {
            section.update(state => {
                state.index++;
                state.screen = state.index;
                state.furthestScreen = state.screen;
                state.finished = state.index === questions.length;
            });
            render();
        }

        function drawExample(container, index, readOnly) {
            const example = questions[index];
            const visual = document.createElement('div');
            window.NegativeNumbers.drawAnswerLine(visual, example, state.cards[`example-${index + 1}`]?.correct);
            container.append(visual);
            const cardRoot = document.createElement('div');
            container.append(cardRoot);
            api.createQuestion(cardRoot, {
                ...window.NegativeNumbers.prepare(example, window.Maths1to9LessonEngine.seededRandom(state.seed + index)), sectionId: 'interactive', questionId: `example-${index + 1}`,
                scored: false, readOnly,
                onFeedback(result) {
                    reportProgress();
                    visual.replaceChildren();
                    window.NegativeNumbers.drawAnswerLine(visual, example, result.correct);
                },
                onContinue: continueExample
            });
        }

        function render() {
            root.replaceChildren();
            const heading = document.createElement('h3');
            heading.dataset.screenHeading = '';
            heading.textContent = state.screen === questions.length ? 'Your completed examples' : `Example ${state.screen + 1}`;
            root.append(heading);
            api.setSectionBack('interactive', state.screen > 0 ? {
                onClick: () => showScreen(state.screen - 1)
            } : null);
            if (state.finished) sectionEvent('interactive', 'complete');
            if (state.screen === questions.length) {
                questions.forEach((example, index) => {
                    const completed = document.createElement('article');
                    root.append(completed);
                    drawExample(completed, index, true);
                });
                api.clearSectionAction('interactive');
            } else {
                const readOnly = state.screen < state.index;
                drawExample(root, state.screen, readOnly);
                if (readOnly) api.setSectionAction('interactive', {
                    label: 'Next', onClick: () => showScreen(state.screen + 1)
                });
            }
            syncHash();
        }

        for (let index = 0; index <= questions.length; index++) {
            api.registerHashRoute(`try-it-${index + 1}`, () => {
                if (!api.goToSection('interactive', { moveFocus: false })) {
                    document.dispatchEvent(new CustomEvent('maths1to9:section-change'));
                    return;
                }
                showScreen(Math.min(index, state.furthestScreen));
            });
        }
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        reportProgress();
        render();
        const requested = Array.from({ length: questions.length + 1 }, (_, index) => index)
            .find(index => initialHash === `#try-it-${index + 1}`);
        if (requested !== undefined && api.goToSection('interactive', { moveFocus: false })) {
            showScreen(Math.min(requested, state.furthestScreen));
        }
    }

    window.Maths1to9Interactives ??= {};
    window.Maths1to9Interactives[SLUG] = mountTryIt;
    document.addEventListener('maths1to9:lesson-rendered', event => {
        if (event.detail?.slug === SLUG) mountLearn();
    });
})();
