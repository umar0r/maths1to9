(() => {
    'use strict';

    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;

    const screens = [
        {
            kind: 'intro',
            title: 'When you add or take away decimals, line the numbers up in columns.'
        },
        {
            kind: 'align',
            title: 'To add decimals, line up the decimal points.',
            line: 'Then digits that are worth the same sit in the same column: ones under ones, tenths under tenths.',
            instruction: 'Move 0.48 so its decimal point sits under the one in 7.6.',
            feedback: 'The points line up, so the 6 tenths and the 4 tenths are in the same column.'
        },
        {
            kind: 'zero',
            title: 'You can fill a gap with a zero.',
            line: '7.6 has no hundredths, so 7.6 and 7.60 are the same number.',
            instruction: 'Tap the gap after 7.6.',
            feedback: 'Now both numbers have two digits after the point, so every column has a digit to add.'
        }
    ];

    function element(tag, text = '', className = '') {
        const node = document.createElement(tag);
        node.textContent = text;
        node.className = className;
        return node;
    }

    function drawIntroChart(host) {
        const block = element('div', '', 'decimal-intro-figure');
        const chart = element('div', '', 'decimal-place-chart');
        chart.setAttribute('role', 'img');
        chart.setAttribute('aria-label', '7.6 over 0.48, with a plus sign and the decimal points lined up.');
        const labels = element('div', '', 'decimal-place-chart__labels');
        ['', 'ones', '', 'tenths', 'hundredths'].forEach(label => labels.append(element('span', label)));
        chart.append(labels);
        let gap;
        [['', '7', '.', '6', ''], ['+', '0', '.', '4', '8']].forEach((digits, rowIndex) => {
            const row = element('div', '', 'decimal-place-chart__top');
            digits.forEach((digit, index) => {
                const cell = element('span', digit, index === 0 ? 'decimal-place-chart__space decimal-place-chart__sign'
                    : index === 2 ? 'decimal-place-chart__point' : 'decimal-place-chart__cell');
                if (rowIndex === 0 && index === 4) {
                    gap = cell;
                    gap.dataset.introGap = '';
                }
                row.append(cell);
            });
            chart.append(row);
        });
        const note = element('span', '7.6 is the same as 7.60.', 'decimal-intro-note');
        const svgNs = 'http://www.w3.org/2000/svg';
        const arrow = document.createElementNS(svgNs, 'svg');
        arrow.setAttribute('class', 'decimal-intro-arrow');
        arrow.setAttribute('aria-hidden', 'true');
        block.append(chart, note, arrow);
        host.append(block);

        // Go round the outside of the chart, then enter only the empty box.
        function draw() {
            if (!block.isConnected) { observer.disconnect(); return; }
            const origin = block.getBoundingClientRect();
            const chartBox = chart.getBoundingClientRect();
            const label = note.getBoundingClientRect();
            const box = gap.getBoundingClientRect();
            const sx = label.right - origin.left + 4;
            const sy = label.top + label.height / 2 - origin.top;
            const tx = box.left + box.width / 2 - origin.left;
            const ty = box.top + box.height / 2 - origin.top;
            const outside = chartBox.right - origin.left + 8;
            arrow.setAttribute('viewBox', `0 0 ${origin.width} ${origin.height}`);
            const path = document.createElementNS(svgNs, 'path');
            path.setAttribute('d', `M ${sx} ${sy} Q ${outside} ${sy}, ${outside} ${sy + 16}`
                + ` L ${outside} ${ty - 18} Q ${outside} ${ty}, ${tx} ${ty}`
                + ` M ${tx + 8} ${ty - 5} L ${tx} ${ty} L ${tx + 8} ${ty + 5}`);
            arrow.replaceChildren(path);
        }
        const observer = new ResizeObserver(draw);
        observer.observe(block);
        requestAnimationFrame(draw);
        document.fonts.ready.then(draw);
        return () => observer.disconnect();
    }

    // A leading space lets the wrongly aligned row sit one place to the left.
    // It is not a tens column: neither number needs one.
    function drawLearnChart(host, { aligned, zero, fillGap, alignRow }) {
        const chart = element('div', '', 'decimal-place-chart');
        const labels = element('div', '', 'decimal-place-chart__labels');
        ['', 'ones', '', 'tenths', 'hundredths'].forEach(label => labels.append(element('span', label)));
        chart.append(labels);
        const top = element('div', '', 'decimal-place-chart__top');
        ['', '7', '.', '6', zero ? '0' : ''].forEach((digit, index) => {
            const gap = index === 4 && fillGap && !zero;
            const cell = element(gap ? 'button' : 'span', digit, index === 0 ? 'decimal-place-chart__space'
                : index === 2 ? 'decimal-place-chart__point' : 'decimal-place-chart__cell');
            if (gap) {
                cell.type = 'button';
                cell.classList.add('decimal-place-chart__gap');
                cell.setAttribute('aria-label', 'Gap after 7.6');
                cell.addEventListener('click', fillGap);
            }
            top.append(cell);
        });
        chart.append(top);
        const row = element('div', '', 'decimal-place-chart__moving');
        row.setAttribute('aria-label', '0.48');
        const digits = ['0', '.', '4', '8'].map(digit => {
            const cell = element('span', digit, digit === '.' ? 'decimal-place-chart__point' : 'decimal-place-chart__cell');
            cell.setAttribute('aria-hidden', 'true');
            row.append(cell);
            return cell;
        });
        chart.append(row);
        host.append(chart);
        let position = aligned ? 1 : 0;
        function paint() {
            const pointWidth = parseFloat(getComputedStyle(chart).getPropertyValue('--decimal-point-width'));
            const width = (row.clientWidth - pointWidth) / 4;
            const places = [width * position, width * (1 + position),
                width * (1 + position) + pointWidth, width * (2 + position) + pointWidth];
            digits.forEach((cell, index) => {
                cell.style.left = `${places[index]}px`;
                cell.style.width = `${index === 1 ? pointWidth : width}px`;
            });
        }
        const observer = new ResizeObserver(paint);
        observer.observe(chart);
        paint();
        if (alignRow) {
            row.tabIndex = aligned ? -1 : 0;
            row.setAttribute('role', 'slider');
            row.setAttribute('aria-label', 'Move 0.48');
            row.setAttribute('aria-valuemin', '0');
            row.setAttribute('aria-valuemax', '1');
            row.setAttribute('aria-valuenow', aligned ? '1' : '0');
            row.setAttribute('aria-valuetext', aligned ? 'Decimal points lined up' : 'Last digits lined up');
            row.setAttribute('aria-disabled', String(aligned));
            row.classList.toggle('is-locked', aligned);
            function move(next) {
                if (aligned) return;
                position = Math.max(0, Math.min(1, Math.round(next)));
                paint();
                if (position === 1) alignRow();
            }
            row.addEventListener('keydown', event => {
                if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
                event.preventDefault();
                move(position + (event.key === 'ArrowRight' ? 1 : -1));
            });
            row.addEventListener('pointerdown', event => {
                if (aligned || event.button !== 0) return;
                event.preventDefault();
                row.focus({ preventScroll: true });
                row.setPointerCapture(event.pointerId);
                const startX = event.clientX;
                const startPosition = position;
                const columnWidth = (row.clientWidth - 20) / 4;
                row.classList.add('is-dragging');
                function drag(moveEvent) {
                    position = Math.max(0, Math.min(1, startPosition + (moveEvent.clientX - startX) / columnWidth));
                    paint();
                }
                function end() {
                    row.classList.remove('is-dragging');
                    row.removeEventListener('pointermove', drag);
                    row.removeEventListener('pointerup', end);
                    row.removeEventListener('pointercancel', cancel);
                    move(position);
                }
                function cancel() { position = startPosition; end(); }
                row.addEventListener('pointermove', drag);
                row.addEventListener('pointerup', end);
                row.addEventListener('pointercancel', cancel);
            });
            const controls = element('div', '', 'decimal-row-controls');
            [['←', 'Move 0.48 left', -1], ['→', 'Move 0.48 right', 1]].forEach(([arrow, label, change]) => {
                const button = element('button', arrow, 'decimal-row-move');
                button.type = 'button';
                button.setAttribute('aria-label', label);
                button.disabled = aligned || change < 0;
                button.addEventListener('click', () => move(position + change));
                controls.append(button);
            });
            chart.append(controls);
        }
        return () => observer.disconnect();
    }

    function examples() {
        return window.DecimalAddition.examples();
    }

    function sectionEvent(sectionId, name) {
        document.dispatchEvent(new CustomEvent(`maths1to9:section-${name}`, {
            detail: { sectionId }
        }));
    }

    async function mountLearn() {
        const root = element('article');
        document.getElementById('lesson-section-explanation').append(root);
        const api = window.Maths1to9Lesson;
        sectionEvent('explanation', 'gate');
        const section = await api.useSectionState('learn', {
            version: 6,
            initial: () => ({ screen: 0, furthestScreen: 0, finished: false, aligned: false, zero: false }),
            upgrade: () => null
        });
        const state = section.state;
        let disposeChart = () => {};
        section.save();

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
            const heading = root.querySelector('h3');
            heading.tabIndex = -1;
            heading.focus();
        }

        function render() {
            disposeChart();
            const screen = screens[state.screen];
            api.setSectionReset('explanation', screen.kind === 'intro' ? null : () => {
                section.update(state => {
                    if (screen.kind === 'align') state.aligned = false;
                    else state.zero = false;
                    state.finished = false;
                });
                render();
            });
            const done = screen.kind === 'intro' || (screen.kind === 'align' ? state.aligned : state.zero);
            root.replaceChildren();
            const heading = element('h3', screen.title);
            heading.dataset.screenHeading = '';
            root.append(heading);
            if (screen.line) root.append(element('p', screen.line));
            const picture = element('div');
            root.append(picture);
            if (screen.instruction) root.append(element('p', screen.instruction, 'decimal-learn-instruction'));
            if (screen.kind === 'intro') disposeChart = drawIntroChart(picture);
            else disposeChart = drawLearnChart(picture, {
                aligned: screen.kind === 'zero' || state.aligned,
                zero: screen.kind === 'zero' && state.zero,
                alignRow: screen.kind === 'align' ? () => {
                    section.update(state => { state.aligned = true; });
                    render();
                } : null,
                fillGap: screen.kind === 'zero' ? () => {
                    section.update(state => { state.zero = true; state.finished = true; });
                    render();
                } : null
            });
            if (done && screen.feedback) root.append(window.Maths1to9LessonEngine.createFeedback('explanation', {
                correct: true, text: screen.feedback
            }));
            api.setSectionBack('explanation', state.screen > 0 ? {
                onClick: () => showScreen(state.screen - 1)
            } : null);
            if (state.finished) sectionEvent('explanation', 'complete');
            if (state.screen === screens.length - 1 && done) api.clearSectionAction('explanation');
            else api.setSectionAction('explanation', {
                label: 'Next', disabled: !done, onClick: () => showScreen(state.screen + 1)
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
            window.DecimalAddition.drawExample(visual, example, state.cards[`example-${index + 1}`]?.correct);
            container.append(visual);
            const cardRoot = document.createElement('div');
            container.append(cardRoot);
            function drawAnswer(correct) {
                visual.replaceChildren();
                window.DecimalAddition.drawExample(visual, example, correct);
            }
            api.createQuestion(cardRoot, {
                ...window.DecimalAddition.prepare(example, window.Maths1to9LessonEngine.seededRandom(state.seed + index)), sectionId: 'interactive', questionId: `example-${index + 1}`,
                scored: false, readOnly,
                onReset: () => drawAnswer(false),
                onReplayReset: () => drawAnswer(false),
                onReplayFeedback: result => drawAnswer(result.correct),
                onFeedback(result) {
                    reportProgress();
                    drawAnswer(result.correct);
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
