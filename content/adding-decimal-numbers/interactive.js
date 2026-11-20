(() => {
    'use strict';

    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;

    const screens = [
        {
            kind: 'why',
            title: "We add and take away decimals when amounts aren't whole numbers.",
            line: "Here are some places in real life where you'll see decimals.",
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
        const headerFill = 'color-mix(in srgb, var(--primary) 25%, #fff)';
        const frame = '<rect x="9" y="9" width="162" height="132" rx="6" fill="none" stroke="var(--primary)" stroke-width="2" vector-effect="non-scaling-stroke"/>';
        function header(title) {
            return `<path d="M15 9H165Q171 9 171 15V41H9V15Q9 9 15 9Z" fill="${headerFill}"/>
                <text x="20" y="31" font-size="18" font-weight="800">${title}</text>`;
        }
        const receiptEdge = 'M15 9H151L171 29V136Q164.25 144 157.5 136T144 136T130.5 136T117 136T103.5 136T90 136T76.5 136T63 136T49.5 136T36 136T22.5 136T9 136V15Q9 9 15 9Z';
        const pictures = [
            {
                label: 'Money',
                description: 'Receipt: Drink £1.85, Sandwich £3.49, Total £5.34.',
                drawing: `<defs><clipPath id="decimal-receipt-clip"><path d="${receiptEdge}"/></clipPath></defs>
                    <path d="${receiptEdge}" fill="#f8fafc"/>
                    <g clip-path="url(#decimal-receipt-clip)">${header('Receipt')}</g>
                    <path d="M151 9V29H171Z" fill="var(--primary-dark)"/>
                    <text x="20" y="66" font-size="16.5">Drink</text>
                    <text x="160" y="66" text-anchor="end" font-size="16.5">£1.85</text>
                    <text x="20" y="91" font-size="16.5">Sandwich</text>
                    <text x="160" y="91" text-anchor="end" font-size="16.5">£3.49</text>
                    <path d="M20 99H160" stroke="#94a3b8" stroke-width="1"/>
                    <text x="20" y="116" font-size="17" font-weight="800">Total</text>
                    <text x="160" y="116" text-anchor="end" font-size="17" font-weight="800">£5.34</text>
                    <path d="${receiptEdge}" fill="none" stroke="var(--primary)" stroke-width="2" vector-effect="non-scaling-stroke"/>`
            },
            {
                label: 'Fuel',
                description: 'Petrol pump display: 32.45 litres and £45.10.',
                drawing: `<rect x="9" y="9" width="162" height="132" rx="6" fill="#f8fafc"/>
                    ${header('Petrol pump')}
                    <text x="20" y="77" font-size="16">Litres</text>
                    <text x="160" y="77" text-anchor="end" font-size="16">32.45</text>
                    <text x="20" y="113" font-size="16">Cost</text>
                    <text x="160" y="113" text-anchor="end" font-size="20" font-weight="800">£45.10</text>
                    ${frame}`
            },
            {
                label: 'Measurements',
                description: 'Room blueprint: 4.25 metres by 3.6 metres.',
                drawing: `<defs><pattern id="decimal-room-grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M10 0H0V10" fill="none" stroke="var(--primary)" stroke-opacity=".18" stroke-width="1"/></pattern></defs>
                    <rect x="9" y="9" width="162" height="132" rx="6" fill="#f8fafc"/>
                    ${header('Room plan')}
                    <rect x="10" y="42" width="160" height="94" fill="url(#decimal-room-grid)"/>
                    <path d="M49 55H153V108H49Z M99 108V90 M99 90A18 18 0 0 1 117 108" fill="none" stroke="var(--primary)" stroke-width="2" vector-effect="non-scaling-stroke"/>
                    <text x="101" y="131" text-anchor="middle" font-size="18">4.25 m</text>
                    <text x="29" y="83" text-anchor="middle" transform="rotate(-90 29 83)" font-size="18">3.6 m</text>
                    ${frame}`
            },
            {
                label: 'Science',
                description: 'Carbon periodic-table tile: C, 12.011.',
                drawing: `<rect x="9" y="9" width="162" height="132" rx="6" fill="#f8fafc"/>
                    ${header('Carbon')}
                    <text x="90" y="105" text-anchor="middle" font-size="76" font-weight="800">C</text>
                    <text x="90" y="131" text-anchor="middle" font-size="22">12.011</text>
                    ${frame}`
            }
        ];
        const grid = element('div', '', 'decimal-uses');
        pictures.forEach(picture => {
            const figure = element('figure');
            const drawing = element('div', '', 'decimal-use-picture');
            drawing.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 150" fill="var(--text)" font-family="inherit" role="img" aria-label="${picture.description}">${picture.drawing}</svg>`;
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

    function drawAdditionChart(host) {
        const chart = element('div', '', 'decimal-place-chart decimal-addition-chart');
        const { table, topCells } = columnTable({ zero: true });
        const carry = element('span', '+1', 'decimal-written-carry');
        carry.setAttribute('aria-label', 'Carried 1');
        carry.hidden = true;
        topCells[0].classList.add('decimal-written-carry-cell');
        const answer = element('tr', '', 'decimal-addition-answer');
        const slots = {};
        answer.append(element('td', '', 'decimal-column-table__gutter'));
        ['units', 'point', 'tenths', 'hundredths'].forEach(key => {
            const cell = element('td');
            if (key === 'point') cell.append(element('span', '.', 'decimal-table-digit'));
            else {
                const button = element('button', '', 'decimal-tap-slot');
                button.type = 'button';
                button.setAttribute('aria-label', `${key[0].toUpperCase() + key.slice(1)} answer digit`);
                slots[key] = button;
                cell.append(button);
            }
            answer.append(cell);
        });
        table.querySelector('tbody').append(answer);
        const columns = [];
        ['units', 'point', 'tenths', 'hundredths'].forEach((key, index) => {
            table.querySelectorAll('tr').forEach(row => {
                const cell = row.children[index + 1];
                cell.dataset.column = key;
                columns.push(cell);
            });
        });
        // Keep the written carry positioned above the units digit.
        chart.append(table, carry);
        host.append(chart);
        function positionCarry() {
            if (!chart.isConnected) { observer.disconnect(); return; }
            const origin = chart.getBoundingClientRect();
            const units = topCells[0].getBoundingClientRect();
            carry.style.left = `${units.left - origin.left + units.width / 2}px`;
            carry.style.top = `${units.top - origin.top + 1.6}px`;
        }
        const observer = new ResizeObserver(positionCarry);
        observer.observe(chart);
        requestAnimationFrame(positionCarry);
        document.fonts.ready.then(positionCarry);
        return { slots, carry, columns };
    }

    function additionCardsWidget() {
        const order = ['hundredths', 'tenths', 'units'];
        let view;
        return {
            reset() { view?.update({ value: null, editable: true, phase: 'answer' }); },
            replayFeedback(result) {
                view?.update({ value: result.value, editable: false, phase: result.correct ? 'correct' : 'wrong' });
            },
            render(host, { onChange }) {
                let digits = {}, active = order[0], editable = true;
                const { slots, carry, columns } = drawAdditionChart(host);
                Object.entries(slots).forEach(([key, button]) => {
                    button.addEventListener('click', () => {
                        if (!editable) return;
                        delete digits[key];
                        active = key;
                        save();
                    });
                });
                const keys = element('div', '', 'decimal-digit-keys');
                keys.setAttribute('role', 'group');
                keys.setAttribute('aria-label', 'Number cards');
                const cards = Array.from({ length: 10 }, (_, digit) => {
                    const button = element('button', String(digit), 'decimal-digit-key');
                    button.type = 'button';
                    button.setAttribute('aria-label', `Digit ${digit}`);
                    button.addEventListener('click', () => choose(String(digit)));
                    keys.append(button);
                    return button;
                });
                host.append(keys);
                function paint() {
                    Object.entries(slots).forEach(([key, button]) => {
                        button.textContent = digits[key] ?? '';
                        button.disabled = !editable;
                        const selected = editable && key === active;
                        button.classList.toggle('is-highlighted', selected);
                        button.classList.toggle('is-filled', digits[key] !== undefined);
                        button.closest('td').classList.toggle('is-highlighted', selected);
                        button.setAttribute('aria-pressed', String(selected));
                    });
                    columns.forEach(cell => {
                        cell.classList.toggle('is-active-column', editable && Boolean(active) && cell.dataset.column === active);
                    });
                    carry.hidden = digits.tenths !== '0';
                    cards.forEach(button => { button.disabled = !editable || !active; });
                }
                function save() {
                    onChange({ digits: { ...digits }, active });
                    paint();
                }
                function choose(digit) {
                    if (!editable || !active) return;
                    const index = order.indexOf(active);
                    digits[active] = digit;
                    active = order.slice(index + 1).find(key => digits[key] === undefined)
                        || order.find(key => digits[key] === undefined) || null;
                    save();
                }
                host.addEventListener('keydown', event => {
                    if (/^[0-9]$/.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey) {
                        event.preventDefault();
                        choose(event.key);
                    }
                });
                view = {
                    update(next) {
                        digits = { ...(next.value?.digits || {}) };
                        active = next.value ? next.value.active : order[0];
                        editable = next.editable;
                        paint();
                    },
                    focus() { slots[active || order[0]].focus(); }
                };
                return view;
            },
            isEmpty: value => !value || order.some(key => value.digits?.[key] === undefined),
            mark(value) {
                const error = markAddition(value.digits);
                return { correct: !error, feedback: error || '7.60 + 0.48 = 8.08.' };
            },
            answerText: value => value ? `${value.digits?.units || ''}.${value.digits?.tenths || ''}${value.digits?.hundredths || ''}` : ''
        };
    }

    function markAddition(value) {
        if (value.hundredths !== '8') return 'Check the hundredths: 0 + 8 = 8.';
        if (value.tenths !== '0') return 'Check the tenths: 6 + 4 = 10. Write 0 and carry 1.';
        if (value.units !== '8') return 'Check the units: 7 + 0 + the carried 1 = 8.';
        return '';
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
            version: 15,
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
            version: 6,
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
            if (index === 0) {
                const widget = additionCardsWidget();
                const cardRoot = element('div');
                container.append(cardRoot);
                api.createQuestion(cardRoot, {
                    sectionId: 'interactive', questionId: 'example-1',
                    questionType: 'column-addition', input: 'custom', scored: false,
                    prompt: '', widget, readOnly, lockedReview: true,
                    autoContinue: false,
                    onReset: () => widget.reset(),
                    onReplayReset: () => widget.reset(),
                    onReplayFeedback: result => widget.replayFeedback(result),
                    onFeedback: reportProgress,
                    onContinue: continueExample
                });
                return;
            }
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
            heading.textContent = state.screen === 0 ? 'Work out 7.6 + 0.48.'
                : state.screen === questions.length ? 'Your completed examples' : `Example ${state.screen + 1}`;
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
