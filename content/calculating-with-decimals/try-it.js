(() => {
    'use strict';

    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;
    const { element, button, drawHops } = window.DecimalCalculations;
    const cards = window.Maths1to9DigitCards;
    const places = ['thousands', 'hundreds', 'tens', 'units'];

    function writtenCarry(cell, text) {
        const carry = element('span', text, 'decimal-written-carry');
        carry.setAttribute('aria-label', `Carried ${text}`);
        carry.hidden = true;
        cell.classList.add('decimal-written-carry-cell');
        cell.append(carry);
        return carry;
    }

    function longMultiplication(host) {
        const expected = {
            'first:hundreds': '4', 'first:tens': '9', 'first:units': '6',
            'second:thousands': '2', 'second:hundreds': '4', 'second:tens': '8', 'second:units': '0',
            'answer:thousands': '2', 'answer:hundreds': '9', 'answer:tens': '7', 'answer:units': '6'
        };
        const order = ['first:units', 'first:tens', 'first:hundreds',
            'second:units', 'second:tens', 'second:hundreds', 'second:thousands',
            'answer:units', 'answer:tens', 'answer:hundreds', 'answer:thousands'];
        const errors = [
            'Check 62 × 8: 2 × 8 = 16, write 6 and carry 1.',
            'Check 62 × 8: 6 × 8 + 1 = 49, write 9 and carry 4.',
            'Check 62 × 8: write the carried 4 in the hundreds.',
            'Check 62 × 40: write 0 in the units first.',
            'Check 62 × 40: 2 × 4 = 8. Write the 8 in the tens.',
            'Check 62 × 40: 6 × 4 = 24, write 4 and carry 2.',
            'Check 62 × 40: write the carried 2 in the thousands.',
            'Check the answer row: 6 + 0 = 6.',
            'Check the answer row: 9 + 8 = 17, write 7 and carry 1.',
            'Check the answer row: 4 + 4 + 1 = 9.',
            'Check the answer row: 0 + 2 = 2.'
        ];
        const values = (row, keys) => Object.fromEntries(keys.map(column => [column,
            { slot: `${row}:${column}`, label: `${row === 'first' ? '62 times 8' : row === 'second' ? '62 times 40' : 'Answer'}, ${column} digit` }]));
        const carryNodes = {};
        const built = cards.columnTable({
            label: '62 times 48 in long multiplication',
            className: 'digit-column-table--wide decimal-long-multiplication',
            columns: [...places.map(id => ({ id, label: id })), { id: 'note', label: '' }],
            rows: [
                { id: 'a', values: { tens: '6', units: '2' } },
                { id: 'b', sign: '×', values: { tens: '4', units: '8' } },
                { id: 'first', values: { ...values('first', places.slice(1)), note: '62 × 8' } },
                { id: 'second', values: { ...values('second', places), note: '62 × 40' } },
                { id: 'answer', answer: true, values: values('answer', places) }
            ],
            cellExtra(cell, { row, column }) {
                if (row.id === 'first' && column.id === 'tens') carryNodes.firstTens = writtenCarry(cell, '+1');
                if (row.id === 'first' && column.id === 'hundreds') carryNodes.firstHundreds = writtenCarry(cell, '+4');
                if (row.id === 'second' && column.id === 'thousands') carryNodes.secondThousands = writtenCarry(cell, '+2');
                if (row.id === 'answer' && column.id === 'hundreds') carryNodes.sum = writtenCarry(cell, '+1');
            }
        });
        const chart = element('div', '', 'digit-card-chart digit-card-chart--wide decimal-long-chart');
        chart.append(built.table);
        host.append(chart);
        return {
            built, expected, order, errors, answer: places.map(id => `answer:${id}`), active: 'first:units',
            groups: { first: { advance: 'left', wrap: false, next: 'second' },
                second: { advance: 'left', wrap: false, next: 'answer' }, answer: { advance: 'left' } },
            feedback: '62 × 8 = 496 and 62 × 40 = 2480, so 62 × 48 = 2976.',
            paint(value) {
                const digits = value?.digits || {};
                carryNodes.firstTens.hidden = digits['first:units'] !== '6';
                carryNodes.firstHundreds.hidden = digits['first:tens'] !== '9';
                carryNodes.secondThousands.hidden = digits['second:hundreds'] !== '4';
                carryNodes.sum.hidden = digits['answer:tens'] !== '7';
            }
        };
    }

    function shortDivision(host, decimalDivisor) {
        const dividend = decimalDivisor ? '110.7' : '9.36';
        const divisor = decimalDivisor ? '9' : '4';
        const built = cards.shortDivision({ divisor, dividend });
        const chart = element('div', '', 'digit-card-chart');
        chart.append(built.table);
        host.append(chart);
        const expected = decimalDivisor ? { 'answer:0': '0', 'answer:1': '1', 'answer:2': '2', 'answer:4': '3' }
            : { 'answer:0': '2', 'answer:2': '3', 'answer:3': '4' };
        const order = Object.keys(expected);
        return {
            built, expected, order,
            answer: [...dividend].map((digit, index) => digit === '.' ? '.' : `answer:${index}`),
            optional: decimalDivisor ? ['answer:0'] : [],
            active: decimalDivisor ? 'answer:1' : 'answer:0',
            groups: { answer: { advance: 'right', wrap: false } },
            errors: decimalDivisor ? [
                'The first 1 is less than 9. Leave that box empty or put 0 there.',
                'Check the 11: 11 ÷ 9 = 1, remainder 2.',
                'Check the 20: 20 ÷ 9 = 2, remainder 2.',
                'Check the 27: 27 ÷ 9 = 3.'
            ] : [
                'Check the 9: 9 ÷ 4 = 2, remainder 1.',
                'Check the 13: 13 ÷ 4 = 3, remainder 1.',
                'Check the 16: 16 ÷ 4 = 4.'
            ],
            feedback: decimalDivisor ? '110.7 ÷ 9 = 12.3, so 11.07 ÷ 0.9 = 12.3.' : '9.36 ÷ 4 = 2.34.',
            paint(value, activeColumn) {
                const digits = value?.digits || {};
                const carries = decimalDivisor ? {
                    '1': digits['answer:0'] === undefined || digits['answer:0'] === '0' ? '1' : '',
                    '2': digits['answer:1'] === '1' ? '2' : '',
                    '4': digits['answer:1'] === '1' && digits['answer:2'] === '2' ? '2' : ''
                } : {
                    '2': digits['answer:0'] === '2' ? '1' : '',
                    '3': digits['answer:0'] === '2' && digits['answer:2'] === '3' ? '1' : ''
                };
                built.update({ activeColumn, carries });
            }
        };
    }

    function receiptMultiplication(host) {
        const columns = ['units', 'point', 'tenths', 'hundredths'];
        const expected = { 'answer:units': '4', 'answer:tenths': '3', 'answer:hundredths': '5' };
        const carryNodes = {};
        const built = cards.columnTable({
            label: '1.45 times 3 in columns',
            columns: columns.map(id => ({ id, label: id, ariaLabel: id === 'point' ? 'decimal point' : id })),
            rows: [
                { id: 'a', values: { units: '1', point: '.', tenths: '4', hundredths: '5' } },
                { id: 'b', sign: '×', values: { units: '3' } },
                { id: 'answer', answer: true, values: Object.fromEntries(columns.map(id => [id,
                    id === 'point' ? '.' : { slot: `answer:${id}`, label: `${id} answer digit` }])) }
            ],
            cellExtra(cell, { row, column }) {
                if (row.id === 'a' && ['units', 'tenths'].includes(column.id)) carryNodes[column.id] = writtenCarry(cell, '+1');
            }
        });
        const chart = element('div', '', 'digit-card-chart decimal-receipt-chart');
        chart.append(built.table);
        host.append(chart);
        return {
            built, expected, order: ['answer:hundredths', 'answer:tenths', 'answer:units'],
            answer: ['answer:units', '.', 'answer:tenths', 'answer:hundredths'],
            active: 'answer:hundredths', groups: { answer: { advance: 'left' } },
            errors: [
                'Check the hundredths: 5 × 3 = 15, write 5 and carry 1.',
                'Check the tenths: 4 × 3 + 1 = 13, write 3 and carry 1.',
                'Check the units: 1 × 3 + 1 = 4.'
            ],
            feedback: '3 × £1.45 = £4.35.',
            paint(value) {
                const digits = value?.digits || {};
                carryNodes.tenths.hidden = digits['answer:hundredths'] !== '5';
                carryNodes.units.hidden = digits['answer:hundredths'] !== '5' || digits['answer:tenths'] !== '3';
            }
        };
    }

    function tableWidget(build) {
        let model, view;
        const normalized = value => Object.fromEntries(model.order.map(id => [id,
            value?.digits?.[id] ?? (model.optional?.includes(id) ? '0' : undefined)]));
        return {
            keepValueOnRetry: true,
            render(host, { value, editable, onChange }) {
                model = build(host);
                view = cards.create(host, {
                    slots: model.built.slots, groups: model.groups, active: model.active, value, editable, onChange,
                    onPaint({ value, active, editable }) {
                        const activeColumn = editable && active ? active.split(':')[1] : null;
                        model.built.update({ activeColumn });
                        model.paint(value, activeColumn);
                        // Optional leading zeros belong to this answer's marking rule.
                        // Keep the shared slot in place while hiding its empty locked view.
                        for (const id of model.optional || []) {
                            const slot = model.built.slots.find(slot => slot.id === id);
                            slot.element.classList.toggle('decimal-empty-leading-answer', !editable && value?.digits?.[id] === undefined);
                        }
                    }
                });
                return view;
            },
            reset() { view?.update({ value: null, editable: true, phase: 'answer' }); },
            replayFeedback(result) { view?.update({ value: result.value, editable: false, phase: result.correct ? 'correct' : 'wrong' }); },
            isEmpty(value) { return !value || model.order.some(id => value.digits?.[id] === undefined && !model.optional?.includes(id)); },
            mark(value) {
                const digits = normalized(value);
                const wrong = model.order.findIndex(id => digits[id] !== model.expected[id]);
                const marks = Object.fromEntries(model.order.filter(id => value?.digits?.[id] !== undefined || !model.optional?.includes(id))
                    .map(id => [id, digits[id] === model.expected[id] ? 'right' : 'wrong']));
                return { correct: wrong < 0, feedback: wrong < 0 ? model.feedback : model.errors[wrong],
                    value: cards.markedValue(value, marks) };
            },
            answerText(value) { return model.answer.map(id => id === '.' ? '.' : value?.digits?.[id] || '').join(''); }
        };
    }

    function productText(gap) {
        if (gap === 0) return '0.2976';
        if (gap === 4) return '2976';
        return `${'2976'.slice(0, gap)}.${'2976'.slice(gap)}`;
    }

    function pointWidget() {
        let value = null, editable = true, host, onChange, dispose = () => {};
        function paint() {
            dispose();
            host.replaceChildren();
            const picture = element('div', '', 'decimal-number-picture');
            const row = element('div', '', 'decimal-big-number');
            const correct = value?.gap === 1 && !editable;
            row.classList.toggle('is-complete', correct);
            if (value?.gap === 0) row.append(element('span', '0', 'decimal-digit'));
            const gaps = [], digits = [];
            for (let index = 0; index <= 4; index++) {
                const selected = value?.gap === index;
                const gap = button(selected ? '.' : '', `Put the point in 2976 at gap ${index + 1}`, () => {
                    if (!editable) return;
                    value = { gap: index, wrongGap: value?.gap === index ? value.wrongGap : null };
                    onChange(value);
                    paint();
                });
                gap.disabled = !editable;
                gap.classList.toggle('is-placed', selected);
                if (value?.wrongGap === index) gap.classList.add('answer-choice', 'is-incorrect');
                else if (correct && selected) gap.classList.add('answer-choice', 'is-correct');
                gaps.push(gap);
                row.append(gap);
                if (index < 4) {
                    const digit = element('span', '2976'[index], 'decimal-digit');
                    digits.push(digit);
                    row.append(digit);
                }
            }
            picture.append(row);
            host.append(picture);
            dispose = drawHops(picture, correct ? [1, 2, 3].map((count, index) => ({
                from: gaps[index + 1], to: digits[index + 1], label: String(count)
            })) : []);
        }
        return {
            keepValueOnRetry: true,
            render(container, options) {
                host = container; onChange = options.onChange;
                return { update(next) { value = next.value; editable = next.editable; paint(); } };
            },
            isEmpty: value => value?.gap == null,
            mark(value) {
                const correct = value.gap === 1;
                return { correct, feedback: correct
                    ? '62 × 48 = 2976. 6.2 × 0.48 has 3 digits after the points, so 6.2 × 0.48 = 2.976.'
                    : `That gives ${productText(value.gap)}, with ${4 - value.gap} digits after the point. 6.2 × 0.48 has 3.`,
                    value: { ...value, wrongGap: correct ? null : value.gap } };
            },
            answerText: value => value?.gap == null ? '' : productText(value.gap)
        };
    }

    function scaleWidget() {
        let value = null, editable = true, host, onChange, dispose = () => {};
        function paint() {
            dispose();
            host.replaceChildren();
            const moves = value?.moves || 0;
            const fraction = element('div', '', 'decimal-fraction');
            const hops = [];
            ['11.07', '0.9'].forEach((number, rowIndex) => {
                const moved = rowIndex === 0 ? moves === 2 : moves >= 1;
                const active = editable && (rowIndex === 1 ? moves === 0 : moves === 1);
                const row = element('div', '', 'decimal-fraction-row');
                const digits = number.replace('.', ''), original = number.indexOf('.'), target = original + 1;
                const digitNodes = [], gapNodes = [];
                for (let index = 0; index <= digits.length; index++) {
                    const pointHere = index === (moved ? target : original);
                    const gap = button(pointHere && !(moved && rowIndex === 1) ? '.' : '',
                        `Move the point in ${number} to gap ${index + 1}`, () => {
                            if (!active) return;
                            value = index === target ? { moves: moves + 1, wrong: null }
                                : { moves, wrong: { row: rowIndex, gap: index } };
                            onChange(value);
                            paint();
                        });
                    gap.disabled = !active;
                    gap.classList.toggle('is-placed', pointHere);
                    if (value?.wrong?.row === rowIndex && value.wrong.gap === index) gap.classList.add('answer-choice', 'is-incorrect');
                    gapNodes.push(gap);
                    row.append(gap);
                    if (index < digits.length) {
                        const digit = element('span', moved && rowIndex === 1 && index === 0 ? '' : digits[index], 'decimal-digit');
                        digitNodes.push(digit);
                        row.append(digit);
                    }
                }
                if (moved && rowIndex === 1) row.classList.add('is-nine');
                fraction.append(row);
                if (moved) hops.push({ from: gapNodes[original], to: digitNodes[original], label: '× 10' });
            });
            host.append(fraction);
            if (moves < 2) host.append(element('p', moves === 0 ? 'Move the point in 0.9 one place to the right.'
                : 'Now move the point in 11.07 one place too.', 'decimal-learn-instruction'));
            dispose = drawHops(fraction, hops);
        }
        return {
            keepValueOnRetry: true,
            render(container, options) {
                host = container; onChange = options.onChange;
                return { update(next) { value = next.value; editable = next.editable; paint(); } };
            },
            isEmpty: value => !value || (value.moves < 2 && !value.wrong),
            mark(value) {
                return { correct: value.moves === 2, feedback: value.moves === 2
                    ? '11.07 ÷ 0.9 is the same as 110.7 ÷ 9. Now you can use short division.'
                    : 'Move it one place to the right, the same as the other number.', value };
            },
            answerText: value => value?.moves === 2 ? '110.7 ÷ 9' : value?.moves === 1 ? '11.07 ÷ 9' : '11.07 ÷ 0.9'
        };
    }

    function drawReceipt(host, correct) {
        const receipt = element('div', '', 'decimal-receipt');
        const edge = 'M15 9H270L291 30V220Q284.25 228 277.5 220T264 220T250.5 220T237 220T223.5 220T210 220T196.5 220T183 220T169.5 220T156 220T142.5 220T129 220T115.5 220T102 220T88.5 220T75 220T61.5 220T48 220T34.5 220T21 220Q15 212 9 220V15Q9 9 15 9Z';
        receipt.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 235" fill="var(--text)" font-family="inherit" role="img" aria-label="Receipt: 3 × Notebook £1.45. Total ${correct ? '£4.35' : 'blank'}.">
            <defs><clipPath id="multiply-task-receipt-clip"><path d="${edge}"/></clipPath></defs><path d="${edge}" fill="#f8fafc"/>
            <g clip-path="url(#multiply-task-receipt-clip)"><rect x="9" y="9" width="282" height="38" fill="color-mix(in srgb, var(--primary) 25%, #fff)"/><text x="24" y="36" font-size="21" font-weight="800">Receipt</text></g><path d="M270 9V30H291Z" fill="var(--primary-dark)"/>
            <text x="24" y="92" font-size="18">3 × Notebook</text><text x="276" y="92" text-anchor="end" font-size="18">£1.45</text><path d="M24 139H276" stroke="#94a3b8"/>
            <text x="24" y="170" font-size="20" font-weight="800">Total</text><text data-total x="276" y="170" text-anchor="end" font-size="20" font-weight="800"></text><path data-blank d="M210 173H276" stroke="#94a3b8"/>
            <path d="${edge}" fill="none" stroke="var(--primary)" stroke-width="2" vector-effect="non-scaling-stroke"/>
        </svg>`;
        host.append(receipt);
        function update(correct) {
            receipt.querySelector('[data-total]').textContent = correct ? '£4.35' : '';
            receipt.querySelector('[data-blank]').style.display = correct ? 'none' : '';
            receipt.querySelector('svg').setAttribute('aria-label', `Receipt: 3 × Notebook £1.45. Total ${correct ? '£4.35' : 'blank'}.`);
        }
        update(correct);
        return { update };
    }

    const problems = [
        { id: 'long-multiplication', hash: 'try-it-1', title: 'Work out 6.2 × 0.48.', widget: () => tableWidget(longMultiplication) },
        { id: 'product-point', hash: 'try-it-1-step-2', title: 'Work out 6.2 × 0.48.',
            line: '62 × 48 = 2976. Tap where the point goes.', widget: pointWidget },
        { id: 'divide-whole', hash: 'try-it-2', title: 'Work out 9.36 ÷ 4.', widget: () => tableWidget(host => shortDivision(host, false)) },
        { id: 'scale-divisor', hash: 'try-it-3', title: 'Work out 11.07 ÷ 0.9.', widget: scaleWidget },
        { id: 'divide-scaled', hash: 'try-it-3-step-2', title: 'Work out 11.07 ÷ 0.9.', widget: () => tableWidget(host => shortDivision(host, true)) },
        { id: 'receipt', hash: 'try-it-4', title: 'Work out the total on this receipt.', widget: () => tableWidget(receiptMultiplication), receipt: true }
    ];

    async function mountTryIt(root) {
        const api = window.Maths1to9Lesson;
        document.dispatchEvent(new CustomEvent('maths1to9:section-gate', { detail: { sectionId: 'interactive' } }));
        api.setSectionAction('interactive', { label: 'Check', disabled: true, onClick() {} });
        const section = await api.useSectionState('interactive', {
            version: 2,
            initial: () => ({ index: 0, screen: 0, furthestScreen: 0, finished: false, cards: {} }),
            upgrade: () => null
        });
        const state = section.state;
        function syncHash() {
            if (api.getCurrentSection().id === 'interactive') api.setSlideHash(problems[state.screen].hash, { replace: true });
        }
        function show(screen) {
            section.update(state => { state.screen = screen; });
            render();
            const heading = root.querySelector('[data-screen-heading]');
            heading.tabIndex = -1;
            heading.focus();
        }
        function reportProgress() {
            const completed = state.finished ? problems.length : state.index + Number(state.cards[problems[state.index]?.id]?.correct === true);
            api.setSectionProgress('interactive', completed, problems.length);
        }
        function leaveTryIt() {
            api.completeSection('interactive');
            api.continueSection();
        }
        function continueExample() {
            section.update(state => {
                state.index = state.screen + 1;
                state.finished = state.index === problems.length;
                if (!state.finished) {
                    state.screen = state.index;
                    state.furthestScreen = Math.max(state.furthestScreen, state.screen);
                }
            });
            render();
            if (state.finished) leaveTryIt();
        }
        function render() {
            root.replaceChildren();
            const problem = problems[state.screen], widget = problem.widget();
            let receipt;
            const cardRoot = element('div');
            root.append(cardRoot);
            api.setSectionBack('interactive', state.screen > 0 ? { onClick: () => show(state.screen - 1) } : null);
            const readOnly = state.screen < state.index;
            function reset() { widget.reset?.(); receipt?.update(false); }
            function replay(result) { widget.replayFeedback?.(result); receipt?.update(result.correct); }
            api.createQuestion(cardRoot, {
                sectionId: 'interactive', questionId: problem.id, prompt: problem.title,
                input: 'custom', widget, scored: false, readOnly, lockedReview: true, autoContinue: false,
                figure: problem.receipt ? (host, { replay }) => {
                    receipt = drawReceipt(host, !replay && state.cards[problem.id]?.correct === true);
                } : problem.line ? host => host.append(element('p', problem.line)) : undefined,
                onReset: reset, onReplayReset: reset, onReplayFeedback: replay,
                onFeedback(result) { reportProgress(); receipt?.update(result.correct); },
                onContinue: continueExample
            });
            if (state.finished) api.completeSection('interactive');
            if (readOnly) api.setSectionAction('interactive', state.screen === problems.length - 1
                ? { label: 'Continue', onClick: leaveTryIt }
                : { label: 'Next', onClick: () => show(state.screen + 1) });
            syncHash();
        }
        problems.forEach((problem, index) => api.registerHashRoute(problem.hash, () => {
            if (api.goToSection('interactive', { moveFocus: false })) show(Math.min(index, state.furthestScreen));
        }));
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        reportProgress();
        render();
        const requested = problems.findIndex(problem => initialHash === `#${problem.hash}`);
        if (requested >= 0 && api.goToSection('interactive', { moveFocus: false })) show(Math.min(requested, state.furthestScreen));
    }

    window.Maths1to9Interactives ??= {};
    window.Maths1to9Interactives[SLUG] = mountTryIt;
    document.addEventListener('maths1to9:lesson-rendered', event => {
        if (event.detail?.slug !== SLUG) return;
        // Stage 3 will supply these questions. Finishing Try it still enters
        // Practice directly, where its main Check stays disabled for now.
        for (const sectionId of ['question-bank', 'comparison']) {
            document.dispatchEvent(new CustomEvent('maths1to9:section-gate', { detail: { sectionId } }));
            window.Maths1to9Lesson.setSectionAction(sectionId, { label: 'Check', disabled: true, onClick() {} });
        }
    });
})();
