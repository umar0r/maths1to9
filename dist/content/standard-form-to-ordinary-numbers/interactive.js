(() => {
    'use strict';

    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;
    const { standardForm, toOrdinary, spaced } = window.StandardFormOrdinary;
    const screens = [
        { title: 'Two ways to write one number', lines: [String.raw`\underbrace{4.2 \times 10^3}_{\text{standard form}} = \underbrace{4200}_{\text{ordinary number}}`], caption: 'Standard form is a short way to write very big or very small numbers. The ordinary number is the same number written without a power of 10.' },
        { title: 'What the index tells you', lines: [String.raw`10^{\overbrace{3}^{\text{index}}} = 10 \times 10 \times 10 = 1000`, String.raw`4.2 \times 10^3 = 4.2 \times 1000`], caption: 'The small raised number is the index. It tells you how many times to multiply by 10.' },
        { title: 'Multiply by 10 three times', direction: 1 },
        { title: 'Negative indices', column: true, caption: 'Each time the index goes down by 1, the value is divided by 10. So a negative index tells you to divide by 10 that many times.' },
        { title: 'Divide by 10 three times', direction: -1 },
        { title: 'An index of 0', column: true, zero: true, lines: [String.raw`4.2 \times 10^0 = 4.2 \times 1 = 4.2`], caption: '10⁰ is 1, so there are no ×10 or ÷10 steps. The number stays the same.' }
    ];

    const examples = [
        { front: '3.6', index: 4, prompt: 'How many times do you multiply 3.6 by 10?', input: 'number', answer: '4', feedback: 'The index is 4: four ×10 steps.', rules: [{ value: '3', feedback: '10⁴ means four ×10 steps.' }], fallback: 'The index is 4, so multiply by 10 four times.' },
        { front: '3.6', index: 4, working: ['3.6', '36', '360', '3600', '?'], prompt: `What is ${standardForm('3.6', 4)} as an ordinary number?`, input: 'number', answer: '36000', feedback: 'Four ×10 steps give 36 000, so 3.6 × 10⁴ = 36 000.', rules: [
            { value: '3600', feedback: "That's three steps. Do one more ×10." },
            { value: '360000', feedback: "That's five steps. The index is 4." },
            { value: '3.6', feedback: "Zeros after the point don't change the number. Multiply by 10 instead." }
        ], fallback: '3600 × 10 = 36 000.' },
        { front: '7.2', index: -3, prompt: 'What do you do at each step?', input: 'choice', options: [
            { label: 'Divide by 10', correct: true, feedback: 'The index is −3, so divide by 10 three times.' },
            { label: 'Multiply by 10', feedback: 'The index is negative, so divide by 10.' }
        ] },
        { front: '7.2', index: -3, working: ['7.2', '0.72', '0.072', '?'], prompt: `What is ${standardForm('7.2', -3)} as an ordinary number?`, input: 'number', answer: '0.0072', feedback: 'Three ÷10 steps give 0.0072: positive, and smaller than 1.', rules: [
            { value: '-0.0072', feedback: 'A negative index makes the number smaller, not negative.' },
            { value: '0.00072', feedback: "That's four steps. The index is −3, so do three." },
            { value: '0.072', feedback: "That's two steps. Divide by 10 once more." },
            { value: '7200', feedback: 'That multiplies. A negative index means divide.' }
        ], fallback: '0.072 ÷ 10 = 0.0072.' },
        { front: '5.06', index: 3, showExpression: true, working: ['5.06', '50.6', '506', '?'], prompt: `What is ${standardForm('5.06', 3)} as an ordinary number?`, input: 'number', answer: '5060', feedback: '506 × 10 = 5060. The 0 stays between the 5 and the 6.', rules: [
            { value: '560', feedback: 'Keep the 0 between the 5 and the 6. It holds a place.' },
            { value: '5600', feedback: 'Keep the 0 between the 5 and the 6. It holds a place.' },
            { value: '50600', feedback: "That's four steps. The index is 3." },
            { value: '506', feedback: "That's two steps. Multiply by 10 once more." }
        ], fallback: '506 × 10 = 5060.' }
    ];

    function sectionEvent(sectionId, name) {
        document.dispatchEvent(new CustomEvent(`maths1to9:section-${name}`, { detail: { sectionId } }));
    }

    function textNode(tag, text, className = '') {
        const node = document.createElement(tag);
        node.textContent = text;
        node.className = className;
        return node;
    }

    function maths(container, expression, className = '') {
        const row = document.createElement('div');
        row.className = `ordinary-maths ${className}`;
        window.katex.render(expression, row, { throwOnError: true, displayMode: true });
        container.append(row);
    }

    function drawChain(container, values, direction) {
        const chain = document.createElement('div');
        chain.className = 'ordinary-chain';
        values.forEach((value, index) => {
            if (index) {
                const arrow = textNode('span', direction > 0 ? '×10' : '÷10', 'ordinary-arrow');
                arrow.append(textNode('span', '→'));
                chain.append(arrow);
            }
            chain.append(textNode('span', value, 'ordinary-box'));
        });
        container.append(chain);
    }

    function drawExampleVisual(container, example, correct) {
        if (!example.working || example.showExpression) container.append(textNode('p', standardForm(example.front, example.index), 'interactive-equation'));
        if (example.working) drawChain(container, example.working.map(value => value === '?' && correct ? spaced(example.answer) : value), Math.sign(example.index));
    }

    function drawColumn(container, zero) {
        [2, 1, 0, -1, -2].forEach((index, row) => {
            if (row) maths(container, String.raw`\mathrel{\downarrow}\,\div 10`, 'ordinary-column-arrow');
            maths(container, `10^{${index}} = ${toOrdinary('1', index)}`, (zero ? index === 0 : index < 0) ? 'ordinary-highlight' : '');
        });
    }

    function drawChart(container, direction, steps, readOnly, onStep) {
        const exponents = direction > 0 ? [3, 2, 1, 0, 'point', -1] : [0, 'point', -1, -2, -3, -4];
        const names = { 3: 'thousands', 2: 'hundreds', 1: 'tens', 0: 'ones', '-1': 'tenths', '-2': 'hundredths', '-3': 'thousandths', '-4': 'ten-thousandths' };
        const chart = document.createElement('div');
        chart.className = 'ordinary-chart';
        chart.setAttribute('role', 'table');
        chart.setAttribute('aria-label', 'Place-value chart');
        const headings = document.createElement('div');
        const digits = document.createElement('div');
        headings.className = digits.className = 'ordinary-chart-row';
        headings.setAttribute('role', 'row');
        digits.setAttribute('role', 'row');
        const highest = direction * steps;
        const lowest = highest - 1;
        exponents.forEach(exponent => {
            const point = exponent === 'point';
            const header = textNode('span', point ? 'point' : toOrdinary('1', exponent));
            header.setAttribute('role', 'columnheader');
            const value = point ? '.' : exponent === highest ? '4' : exponent === lowest ? '2' : exponent <= 0 && exponent > highest || exponent >= 0 && exponent < lowest ? '0' : '';
            const cell = textNode('span', value, value === '0' ? 'ordinary-placeholder' : '');
            cell.setAttribute('role', 'cell');
            if (point) cell.setAttribute('aria-label', 'decimal point');
            else if (value) cell.setAttribute('aria-label', `${value} in the ${names[exponent]} column${value === '0' ? ', placeholder' : ''}`);
            if (point) {
                header.classList.add('ordinary-point');
                cell.classList.add('ordinary-point');
            }
            headings.append(header);
            digits.append(cell);
        });
        chart.append(headings, digits);
        container.append(chart);
        const live = textNode('p', '', 'ordinary-live');
        live.setAttribute('aria-live', 'polite');
        const operation = direction > 0 ? '×10' : '÷10';
        container.append(textNode('p', `${operation} steps: ${steps} of 3`));
        if (!readOnly) {
            const controls = document.createElement('div');
            controls.className = 'ordinary-controls';
            controls.setAttribute('role', 'group');
            controls.setAttribute('aria-label', 'Move the digits');
            for (const move of [1, -1]) {
                const button = textNode('button', move > 0 ? '× 10' : '÷ 10', 'button');
                button.type = 'button';
                button.disabled = steps === 3;
                button.addEventListener('click', () => {
                    if (move !== direction) {
                        live.textContent = direction > 0
                            ? '÷ 10 moves the digits right and makes the number smaller. The index is positive, so multiply.'
                            : '× 10 moves the digits left and makes the number bigger. The index is negative, so divide.';
                    } else onStep();
                });
                controls.append(button);
            }
            container.append(controls);
        }
        const working = Array.from({ length: steps + 1 }, (_, step) => toOrdinary('4.2', direction * step));
        maths(container, working.join(direction > 0 ? String.raw`\xrightarrow{\times 10}` : String.raw`\xrightarrow{\div 10}`), 'ordinary-chart-working');
        if (steps === 1 && direction > 0) live.textContent = 'The 4 now means 4 tens. The 2 now means 2 ones.';
        if (steps === 3) live.textContent = direction > 0
            ? 'Three ×10 steps: 4.2 × 10³ = 4200. The index counts the steps, not the zeros: 4200 has only two zeros.'
            : 'Three ÷10 steps: 4.2 × 10⁻³ = 0.0042. The number gets smaller, but it is not negative.';
        container.append(live);
    }

    async function mountLearn() {
        const root = document.createElement('article');
        document.getElementById('lesson-section-explanation').append(root);
        const api = window.Maths1to9Lesson;
        sectionEvent('explanation', 'gate');
        const section = await api.useSectionState('learn', {
            version: 1,
            initial: () => ({ screen: 0, furthestScreen: 0, finished: false, chartSteps: { 2: 0, 4: 0 } })
        });
        const state = section.state;
        function syncHash() {
            if (api.getCurrentSection().id === 'explanation') api.setSlideHash(`learn-${state.screen + 1}`, { replace: true });
        }
        function showScreen(screen) {
            section.update(state => {
                state.screen = screen;
                state.furthestScreen = Math.max(state.furthestScreen, screen);
                if (screen === screens.length - 1) state.finished = true;
            });
            render();
        }
        function render() {
            const screen = screens[state.screen];
            root.replaceChildren();
            const heading = textNode('h3', screen.title);
            heading.dataset.screenHeading = '';
            root.append(heading);
            const visual = document.createElement('div');
            visual.className = 'ordinary-visual';
            if (state.screen === 1 && state.screen === state.furthestScreen) {
                visual.classList.add('ordinary-build-lines');
            }
            root.append(visual);
            if (screen.column) drawColumn(visual, screen.zero);
            for (const line of screen.lines || []) maths(visual, line);
            if (screen.direction) {
                if (screen.direction < 0) maths(visual, String.raw`4.2 \times 10^{-3}`);
                visual.append(textNode('p', screen.direction > 0 ? 'Press × 10 three times.' : 'Press ÷ 10 three times.'));
                drawChart(visual, screen.direction, state.chartSteps[state.screen], state.screen < state.furthestScreen, () => {
                    const focused = document.activeElement?.textContent;
                    section.update(state => { state.chartSteps[state.screen]++; });
                    render();
                    const row = root.querySelector('.ordinary-chart-row:last-child');
                    for (const cell of row.children) {
                        if (cell.textContent === '4' || cell.textContent === '2') {
                            cell.classList.add(screen.direction > 0 ? 'ordinary-slide-left' : 'ordinary-slide-right');
                        }
                    }
                    const button = [...root.querySelectorAll('.ordinary-controls button')].find(button => button.textContent === focused);
                    if (button && !button.disabled) button.focus();
                });
            }
            if (screen.caption) root.append(textNode('p', screen.caption));
            api.setSectionBack('explanation', state.screen > 0 ? { onClick: () => showScreen(state.screen - 1) } : null);
            if (state.finished) sectionEvent('explanation', 'complete');
            if (state.screen < state.furthestScreen) api.setSectionAction('explanation', { label: 'Next', onClick: () => showScreen(state.screen + 1) });
            else if (state.finished) api.clearSectionAction('explanation');
            else api.setSectionAction('explanation', {
                label: 'Next idea', disabled: Boolean(screen.direction && state.chartSteps[state.screen] < 3),
                onClick: () => showScreen(state.screen + 1)
            });
            syncHash();
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
        const api = window.Maths1to9Lesson;
        sectionEvent('interactive', 'gate');
        api.setSectionAction('interactive', { label: 'Check', disabled: true, onClick() {} });
        const section = await api.useSectionState('interactive', {
            version: 1,
            initial: () => ({ index: 0, screen: 0, furthestScreen: 0, finished: false, cards: {} })
        });
        const state = section.state;

        function syncHash() {
            if (api.getCurrentSection().id === 'interactive') {
                api.setSlideHash(`try-it-${state.screen + 1}`, { replace: true });
            }
        }

        function showScreen(screen) {
            section.update(state => { state.screen = screen; });
            render();
        }

        function reportProgress() {
            const card = state.cards[`example-${state.index + 1}`];
            const completed = state.finished ? examples.length : state.index + Number(card?.correct === true);
            api.setSectionProgress('interactive', completed, examples.length);
        }

        function continueExample() {
            section.update(state => {
                state.index++;
                state.screen = state.index;
                state.furthestScreen = state.screen;
                state.finished = state.index === examples.length;
            });
            render();
        }

        function drawExample(container, index, readOnly) {
            const example = examples[index];
            const visual = document.createElement('div');
            drawExampleVisual(visual, example, state.cards[`example-${index + 1}`]?.correct === true);
            container.append(visual);
            const cardRoot = document.createElement('div');
            container.append(cardRoot);
            api.createQuestion(cardRoot, {
                ...example, sectionId: 'interactive', questionId: `example-${index + 1}`,
                scored: false, readOnly,
                onFeedback(result) {
                    reportProgress();
                    visual.replaceChildren();
                    drawExampleVisual(visual, example, result.correct);
                },
                onContinue: continueExample
            });
        }

        function render() {
            root.replaceChildren();
            const heading = document.createElement('h3');
            heading.dataset.screenHeading = '';
            heading.textContent = state.screen === examples.length ? 'Your completed examples' : `Example ${state.screen + 1}`;
            root.append(heading);
            api.setSectionBack('interactive', state.screen > 0 ? {
                onClick: () => showScreen(state.screen - 1)
            } : null);
            if (state.finished) sectionEvent('interactive', 'complete');
            if (state.screen === examples.length) {
                examples.forEach((example, index) => {
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

        for (let index = 0; index <= examples.length; index++) {
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
        const requested = Array.from({ length: examples.length + 1 }, (_, index) => index)
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
