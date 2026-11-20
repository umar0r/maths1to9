(() => {
    'use strict';

    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;

    const screens = [
        {
            kind: 'why',
            title: "We add and take away decimals when amounts aren't whole numbers.",
            pictures: true
        },
        {
            kind: 'intro',
            title: 'Adding and subtracting decimals works just like whole numbers.',
            line: "Let's add 7.6 and 0.48 by lining the numbers up in columns."
        }
    ];

    function element(tag, text = '', className = '') {
        const node = document.createElement(tag);
        node.textContent = text;
        node.className = className;
        return node;
    }

    function drawUsePictures(host) {
        const pictures = [
            {
                label: 'Money',
                description: 'Receipt: Drink £1.85, Sandwich £3.49, Total £5.34.',
                drawing: `<path d="M18 9H162V127L153 136L144 127L135 136L126 127L117 136L108 127L99 136L90 127L81 136L72 127L63 136L54 127L45 136L36 127L27 136L18 127Z" fill="#fffbeb" stroke="#cbd5e1" stroke-width="2"/>
                    <text x="29" y="41" font-size="16.5">Drink £1.85</text>
                    <text x="29" y="66" font-size="16.5">Sandwich £3.49</text>
                    <path d="M29 81H151" stroke="#64748b" stroke-width="1.5"/>
                    <text x="29" y="108" font-size="17" font-weight="800">Total £5.34</text>`
            },
            {
                label: 'Fuel',
                description: 'Petrol pump display: 32.45 litres and £45.10.',
                drawing: `<path d="M139 43C164 43 165 60 165 80V109C165 125 144 125 144 108V89" fill="none" stroke="#475569" stroke-width="6" stroke-linecap="round"/>
                    <path d="M151 31L166 44L161 58L149 47Z" fill="#475569"/>
                    <rect x="17" y="13" width="124" height="121" rx="10" fill="#e2e8f0" stroke="#64748b" stroke-width="2"/>
                    <rect x="26" y="28" width="106" height="62" rx="5" fill="#172b3b"/>
                    <text x="79" y="52" text-anchor="middle" font-size="16" fill="#a7f3d0">32.45 litres</text>
                    <text x="79" y="77" text-anchor="middle" font-size="20" font-weight="800" fill="#a7f3d0">£45.10</text>
                    <path d="M28 134H131" stroke="#64748b" stroke-width="5" stroke-linecap="round"/>`
            },
            {
                label: 'Measurements',
                description: 'Room blueprint: 4.25 metres by 3.6 metres.',
                drawing: `<defs><pattern id="decimal-room-grid" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M12 0H0V12" fill="none" stroke="white" stroke-opacity=".22" stroke-width="1"/></pattern></defs>
                    <rect x="9" y="9" width="162" height="132" rx="8" fill="#1d4ed8"/>
                    <rect x="9" y="9" width="162" height="132" rx="8" fill="url(#decimal-room-grid)"/>
                    <path d="M44 29H144V106H44Z M94 106V85 M94 85A21 21 0 0 1 115 106" fill="none" stroke="white" stroke-width="2"/>
                    <text x="94" y="130" text-anchor="middle" font-size="18" fill="white">4.25 m</text>
                    <text x="28" y="72" text-anchor="middle" transform="rotate(-90 28 72)" font-size="18" fill="white">3.6 m</text>`
            },
            {
                label: 'Science',
                description: 'Carbon periodic-table tile: C, 12.011.',
                drawing: `<rect x="30" y="9" width="120" height="132" rx="8" fill="#dcfce7" stroke="#86efac" stroke-width="2"/>
                    <text x="90" y="90" text-anchor="middle" font-size="76" font-weight="800" fill="#166534">C</text>
                    <text x="90" y="121" text-anchor="middle" font-size="22" fill="#166534">12.011</text>`
            }
        ];
        const grid = element('div', '', 'decimal-uses');
        pictures.forEach(picture => {
            const figure = element('figure');
            const drawing = element('div', '', 'decimal-use-picture');
            drawing.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 150" role="img" aria-label="${picture.description}">${picture.drawing}</svg>`;
            figure.append(drawing, element('figcaption', picture.label));
            grid.append(figure);
        });
        host.append(grid);
    }

    function columnTable({ zero = false, fillGap = null, moving = false } = {}) {
        const table = element('table', '', 'decimal-column-table');
        table.setAttribute('aria-label', '7.6 plus 0.48 in place-value columns');
        const head = element('thead');
        const headings = element('tr');
        headings.append(element('td', '', 'decimal-column-table__gutter'));
        ['units', 'decimal point', 'tenths', 'hundredths'].forEach(label => {
            const cell = element('th', label);
            cell.scope = 'col';
            headings.append(cell);
        });
        head.append(headings);
        const body = element('tbody');
        let topCells, bottomCells, bottomRow, sign;
        [['7', '.', '6', zero ? '0' : ''], ['0', '.', '4', '8']].forEach((digits, rowIndex) => {
            const row = element('tr');
            const gutter = element('td', '', 'decimal-column-table__gutter');
            if (rowIndex === 1) {
                sign = element('span', '+', 'decimal-column-table__sign');
                gutter.append(sign);
                bottomRow = row;
            }
            row.append(gutter);
            const cells = digits.map((digit, index) => {
                const cell = element('td');
                const gap = rowIndex === 0 && index === 3 && fillGap && !zero;
                const value = element(gap ? 'button' : 'span', moving && rowIndex === 1 ? '' : digit, gap ? 'decimal-table-gap' : 'decimal-table-digit');
                if (gap) {
                    value.type = 'button';
                    value.setAttribute('aria-label', 'Gap after 7.6');
                    value.addEventListener('click', fillGap);
                    cell.classList.add('decimal-column-table__tap');
                }
                cell.append(value);
                row.append(cell);
                return cell;
            });
            if (rowIndex === 0) topCells = cells;
            else bottomCells = cells;
            body.append(row);
        });
        table.append(head, body);
        return { table, topCells, bottomCells, bottomRow, sign };
    }

    function drawIntroChart(host) {
        const block = element('div', '', 'decimal-intro-figure');
        const built = columnTable();
        const chart = built.table;
        const gap = built.topCells[3];
        gap.dataset.introGap = '';
        const note = element('span', '7.6 is the same as 7.60.', 'decimal-intro-note');
        const svgNs = 'http://www.w3.org/2000/svg';
        const arrow = document.createElementNS(svgNs, 'svg');
        arrow.setAttribute('class', 'decimal-intro-arrow');
        arrow.setAttribute('aria-hidden', 'true');
        block.append(chart, note, arrow);
        host.append(block);

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

    function drawLearnChart(host, { aligned, zero, fillGap, alignRow }) {
        const chart = element('div', '', 'decimal-place-chart');
        const built = columnTable({ zero, fillGap, moving: Boolean(alignRow) });
        chart.append(built.table);
        host.append(chart);
        if (!alignRow) return () => {};

        // The table stays put. Only the four characters in its second row move.
        const row = element('div', '', 'decimal-table-moving');
        const digits = ['0', '.', '4', '8'].map(digit => {
            const cell = element('span', digit, 'decimal-table-moving__digit');
            cell.setAttribute('aria-hidden', 'true');
            row.append(cell);
            return cell;
        });
        chart.append(row);
        let position = aligned ? 1 : 0;
        function paint() {
            const origin = chart.getBoundingClientRect();
            const bottom = built.bottomRow.getBoundingClientRect();
            const width = built.bottomCells[0].getBoundingClientRect().width;
            row.style.top = `${bottom.top - origin.top}px`;
            row.style.width = `${built.table.getBoundingClientRect().width}px`;
            row.style.height = `${bottom.height}px`;
            digits.forEach((cell, index) => {
                cell.style.left = `${width * (index + position)}px`;
                cell.style.width = `${width}px`;
            });
            built.sign.style.left = `${4 + (width / 2 - 4) * position}px`;
        }
        const observer = new ResizeObserver(paint);
        observer.observe(chart);
        paint();
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
            const columnWidth = built.bottomCells[0].getBoundingClientRect().width;
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
            version: 12,
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
            const information = screen.kind === 'why' || screen.kind === 'intro';
            api.setSectionReset('explanation', information ? null : () => {
                section.update(state => {
                    if (screen.kind === 'align') state.aligned = false;
                    else state.zero = false;
                    state.finished = false;
                });
                render();
            });
            const done = information || (screen.kind === 'align' ? state.aligned : state.zero);
            if (information && state.screen === screens.length - 1 && !state.finished) {
                section.update(state => { state.finished = true; });
            }
            root.replaceChildren();
            const heading = element('h3', screen.title);
            heading.dataset.screenHeading = '';
            root.append(heading);
            if (screen.line) root.append(element('p', screen.line));
            if (screen.pictures) {
                drawUsePictures(root);
                disposeChart = () => {};
            } else {
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
            }
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
