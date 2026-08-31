(() => {
    'use strict';

    const LEARN_ROOT_ID = 'function-machine-learn';
    const TRY_ROOT_ID = 'function-machine-try-it';
    const TRY_SECTION_ID = 'interactive';

    function gateSection(sectionId) {
        document.dispatchEvent(new CustomEvent('maths1to9:section-gate', {
            detail: { sectionId }
        }));
    }

    function completeSection(sectionId) {
        document.dispatchEvent(new CustomEvent('maths1to9:section-complete', {
            detail: { sectionId }
        }));
    }

    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, (character) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        })[character]);
    }

    function parseConfig(root) {
        try {
            return JSON.parse(root.dataset.config || '{}');
        } catch (error) {
            console.error('The function machine data is not valid JSON.', error);
            return {};
        }
    }

    function shuffle(items) {
        const copy = [...items];
        for (let index = copy.length - 1; index > 0; index -= 1) {
            const swapIndex = Math.floor(Math.random() * (index + 1));
            [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
        }
        return copy;
    }

    function animateIn(element, options = {}) {
        if (!element || typeof window.gsap === 'undefined') {
            return;
        }

        window.gsap.fromTo(element, {
            opacity: 0,
            y: options.y ?? 12
        }, {
            opacity: 1,
            y: 0,
            duration: options.duration ?? 0.35,
            ease: 'power2.out'
        });
    }

    function boxHtml(text, kind = 'value', label = '') {
        const isOperation = kind === 'operation';
        const isReverse = kind === 'reverse';
        const border = isOperation ? '#677087' : '#5664D2';
        const background = isOperation ? '#FFFFFF' : isReverse ? '#F1F4FF' : '#EEF2FF';

        return `
            <div style="min-width:84px;text-align:center;">
                <div style="border:3px solid ${border};background:${background};border-radius:16px;padding:14px 18px;font-size:1.45rem;font-weight:800;line-height:1;white-space:nowrap;">
                    ${escapeHtml(text)}
                </div>
                ${label ? `<div style="margin-top:7px;font-size:.85rem;font-weight:700;">${escapeHtml(label)}</div>` : ''}
            </div>
        `;
    }

    function machineGraphic(config) {
        const values = Array.isArray(config.values) ? config.values : [];
        const operations = Array.isArray(config.operations) ? config.operations : [];
        const labels = Array.isArray(config.labels) ? config.labels : [];
        const arrow = config.direction === 'backwards' ? '←' : '→';
        const operationKind = config.direction === 'backwards' ? 'reverse' : 'operation';
        const parts = [];

        values.forEach((value, index) => {
            parts.push(boxHtml(value, value === '?' ? 'unknown' : 'value', labels[index] || ''));

            if (index < operations.length) {
                parts.push(`<div aria-hidden="true" style="font-size:1.8rem;font-weight:900;line-height:1;">${arrow}</div>`);
                parts.push(boxHtml(operations[index], operationKind));
                parts.push(`<div aria-hidden="true" style="font-size:1.8rem;font-weight:900;line-height:1;">${arrow}</div>`);
            }
        });

        return `
            <div class="interactive-equation" style="overflow-x:auto;">
                <div role="img" aria-label="${escapeHtml(config.ariaLabel || 'Function machine')}" style="display:flex;align-items:center;gap:12px;width:max-content;min-width:100%;justify-content:center;padding:12px 6px;">
                    ${parts.join('')}
                </div>
                ${config.caption ? `<p style="margin:10px 0 0;text-align:center;font-weight:700;">${escapeHtml(config.caption)}</p>` : ''}
            </div>
        `;
    }

    function progressMachineGraphic(config) {
        const values = Array.isArray(config.values) ? config.values.map(String) : [];
        const operations = Array.isArray(config.operations) ? config.operations : [];
        const solvedRows = Array.isArray(config.solvedRows) ? config.solvedRows : [];
        const labels = Array.isArray(config.labels) ? config.labels : [];
        const solvedCount = Math.min(solvedRows.length, operations.length);
        const lastValueIndex = values.length - 1;
        const revealFrom = Math.max(0, lastValueIndex - solvedCount);
        const newestReversedOperation = operations.length - solvedCount;
        const parts = [];

        values.forEach((value, index) => {
            const shownValue = index >= revealFrom ? value : '?';
            parts.push(boxHtml(shownValue, shownValue === '?' ? 'unknown' : 'value', labels[index] || ''));

            if (index >= operations.length) {
                return;
            }

            const isReversed = index >= operations.length - solvedCount;
            const solvedRowIndex = operations.length - 1 - index;
            const operationText = isReversed
                ? solvedRows[solvedRowIndex].reverse
                : operations[index];
            const arrow = isReversed ? '←' : '→';
            const isNewest = isReversed && index === newestReversedOperation;

            parts.push(`
                <div
                    ${isNewest ? 'data-new-reverse="true"' : ''}
                    style="display:flex;align-items:center;gap:12px;"
                >
                    <div aria-hidden="true" style="font-size:1.8rem;font-weight:900;line-height:1;">${arrow}</div>
                    ${boxHtml(operationText, isReversed ? 'reverse' : 'operation')}
                    <div aria-hidden="true" style="font-size:1.8rem;font-weight:900;line-height:1;">${arrow}</div>
                </div>
            `);
        });

        return `
            <div class="interactive-equation" style="overflow-x:auto;">
                <div role="img" aria-label="${escapeHtml(config.ariaLabel || 'Function machine changing from forwards to backwards')}" style="display:flex;align-items:center;gap:12px;width:max-content;min-width:100%;justify-content:center;padding:12px 6px;">
                    ${parts.join('')}
                </div>
            </div>
        `;
    }

    function reverseTable(rows, currentRow = null, revealCurrent = false) {
        const body = [];

        rows.forEach((row) => {
            body.push(`
                <tr data-solved-row>
                    <td><strong>${escapeHtml(row.machine)}</strong></td>
                    <td><strong>${escapeHtml(row.reverse)}</strong></td>
                    <td>${escapeHtml(row.working)}</td>
                </tr>
            `);
        });

        if (currentRow) {
            body.push(`
                <tr data-current-row>
                    <td style="padding:12px 14px;border-bottom:1px solid #e7ebf4;"><strong>${escapeHtml(currentRow.machine_operation)}</strong></td>
                    <td style="padding:12px 14px;border-bottom:1px solid #e7ebf4;">${revealCurrent ? `<strong>${escapeHtml(currentRow.reverse_operation)}</strong>` : '?'}</td>
                    <td style="padding:12px 14px;border-bottom:1px solid #e7ebf4;">${revealCurrent ? escapeHtml(currentRow.calculation) : '?'}</td>
                </tr>
            `);
        }

        if (body.length === 0) {
            return '';
        }

        return `
            <aside class="lesson-key-points">
                <h4>Working backwards</h4>
                <p>The machine says one operation. You use the reverse operation.</p>
                <div style="overflow-x:auto;">
                    <table style="width:100%;min-width:520px;border-collapse:separate;border-spacing:0;border:2px solid #dfe5f2;border-radius:14px;overflow:hidden;">
                        <thead>
                            <tr>
                                <th scope="col" style="padding:12px 14px;text-align:left;background:#f5f7ff;border-bottom:2px solid #dfe5f2;">Machine says</th>
                                <th scope="col" style="padding:12px 14px;text-align:left;background:#f5f7ff;border-bottom:2px solid #dfe5f2;">You do</th>
                                <th scope="col" style="padding:12px 14px;text-align:left;background:#f5f7ff;border-bottom:2px solid #dfe5f2;">Working</th>
                            </tr>
                        </thead>
                        <tbody>${body.join('')}</tbody>
                    </table>
                </div>
            </aside>
        `;
    }

    function paragraphsHtml(paragraphs) {
        return (Array.isArray(paragraphs) ? paragraphs : [])
            .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
            .join('');
    }

    function pairedGraphicsHtml(items) {
        return (Array.isArray(items) ? items : []).map((item) => `
            <section style="margin-top:18px;">
                <h4>${escapeHtml(item.label || '')}</h4>
                ${machineGraphic({
                    values: item.values,
                    operations: item.operations,
                    direction: item.direction,
                    ariaLabel: `${item.label || ''} function machine`
                })}
            </section>
        `).join('');
    }

    function learnBlockHtml(block, index) {
        const graphic = block.graphic
            ? machineGraphic({
                values: block.graphic.values,
                operations: block.graphic.operations,
                labels: block.graphic.labels,
                caption: block.graphic.caption,
                ariaLabel: block.title
            })
            : '';

        const table = Array.isArray(block.reverse_rows)
            ? reverseTable(block.reverse_rows)
            : '';

        const paired = pairedGraphicsHtml(block.paired_graphics);

        const bigIdea = Array.isArray(block.big_idea)
            ? `
                <aside class="lesson-key-points">
                    <h4>Big idea</h4>
                    ${block.big_idea.map((line) => `<p><strong>${escapeHtml(line)}</strong></p>`).join('')}
                </aside>
            `
            : '';

        return `
            <article class="worked-example" data-learn-block="${index}" style="width:100%;max-width:none;break-inside:avoid;">
                <h3 class="worked-example__title">${escapeHtml(block.title || '')}</h3>
                ${paragraphsHtml(block.paragraphs)}
                ${graphic}
                ${table}
                ${paired}
                ${bigIdea}
            </article>
        `;
    }

    function mountLearn(root) {
        if (!root || root.dataset.mounted === 'true') {
            return;
        }

        root.dataset.mounted = 'true';
        const config = parseConfig(root);
        const blocks = Array.isArray(config.blocks) ? config.blocks : [];

        root.innerHTML = `
            <p class="lesson-eyebrow">${escapeHtml(config.eyebrow || 'Learn')}</p>
            <h2 class="lesson-section__title">${escapeHtml(config.title || 'What a function machine does')}</h2>
            <div data-learn-stack style="display:flex;flex-direction:column;gap:1.25rem;width:100%;">
                ${blocks.map(learnBlockHtml).join('')}
            </div>
        `;
    }

    function mountTryIt(root) {
        if (!root || root.dataset.mounted === 'true') {
            return;
        }

        root.dataset.mounted = 'true';
        gateSection(TRY_SECTION_ID);

        const config = parseConfig(root);
        const steps = Array.isArray(config.steps) ? config.steps : [];
        const operations = Array.isArray(config.operations)
            ? config.operations.map((operation) => operation.label)
            : [];
        const completion = config.completion || {};

        const state = {
            stepIndex: 0,
            selected: '',
            correct: false,
            wrong: false,
            startValue: '',
            solvedRows: []
        };

        function visibleValues() {
            const values = ['?', '?', String(config.output)];

            if (state.solvedRows.length >= 1) {
                values[1] = String(config.middle_values?.[0] ?? 7);
            }

            if (state.solvedRows.length >= 2) {
                values[0] = String(config.input);
            }

            return values;
        }

        function finish() {
            root.innerHTML = `
                <article class="worked-example">
                    <p class="worked-example__number">${escapeHtml(completion.eyebrow || 'Try it complete')}</p>
                    <h3 class="worked-example__title">${escapeHtml(completion.title || 'The input is 10')}</h3>
                    ${progressMachineGraphic({
                        values: [String(config.input), String(config.middle_values?.[0] ?? 7), String(config.output)],
                        operations,
                        solvedRows: state.solvedRows,
                        labels: ['Input', '', 'Output'],
                        ariaLabel: 'Completed backwards function machine'
                    })}
                    ${reverseTable(state.solvedRows)}
                    <div class="question-feedback is-visible is-correct">
                        <strong>Check:</strong> ${escapeHtml(completion.check || '')}
                    </div>
                </article>
            `;

            completeSection(TRY_SECTION_ID);
            animateIn(root.firstElementChild);
        }

        function render() {
            const step = steps[state.stepIndex];
            if (!step) {
                finish();
                return;
            }

            const currentRow = step.machine_operation ? step : null;
            const options = shuffle(step.options || []).map((option) => `
                <button
                    class="button${state.selected === option && state.correct ? ' button--primary' : ''}"
                    type="button"
                    data-answer="${escapeHtml(option)}"
                    ${state.correct ? 'disabled' : ''}
                >
                    ${escapeHtml(option)}
                </button>
            `).join('');

            const feedback = state.wrong
                ? '<div class="question-feedback is-visible is-incorrect">Not quite. Look at the machine and work backwards.</div>'
                : state.correct
                    ? `<div class="question-feedback is-visible is-correct"><strong>Correct.</strong> ${escapeHtml(step.feedback || '')}</div>`
                    : '';


            root.innerHTML = `
                <article class="worked-example">
                    <p class="worked-example__number">${escapeHtml(config.eyebrow || 'Try it')} · Step ${state.stepIndex + 1} of ${steps.length}</p>
                    <h3 class="worked-example__title">${escapeHtml(config.title || 'Find the missing input')}</h3>
                    ${state.stepIndex === 0 ? `<p>${escapeHtml(config.intro || '')}</p>` : ''}
                    ${progressMachineGraphic({
                        values: [String(config.input), String(config.middle_values?.[0] ?? 7), String(config.output)],
                        operations,
                        solvedRows: state.solvedRows,
                        labels: ['Input', '', 'Output'],
                        ariaLabel: 'Find the missing input by reversing one step at a time'
                    })}
                    ${reverseTable(state.solvedRows, currentRow, state.correct)}
                    <p class="question-prompt">${escapeHtml(step.prompt || '')}</p>
                    <div class="question-options" role="group" aria-label="Choose an answer">
                        ${options}
                    </div>
                    ${feedback}
                </article>
            `;

            animateIn(root.firstElementChild);
            const newlyReversed = root.querySelector('[data-new-reverse="true"]');
            if (newlyReversed && typeof window.gsap !== 'undefined') {
                window.gsap.fromTo(newlyReversed, { opacity: 0, x: 18 }, {
                    opacity: 1,
                    x: 0,
                    duration: 0.4,
                    ease: 'power2.out'
                });
            }

            root.querySelectorAll('[data-answer]').forEach((button) => {
                button.addEventListener('click', () => {
                    if (state.correct) {
                        return;
                    }

                    const selected = button.dataset.answer || '';
                    state.selected = selected;
                    state.correct = selected === step.answer;
                    state.wrong = !state.correct;
                    render();

                    if (!state.correct) {
                        return;
                    }

                    window.setTimeout(() => {
                        if (step.start_value) {
                            state.startValue = step.start_value;
                        }

                        if (step.machine_operation) {
                            state.solvedRows.push({
                                machine: step.machine_operation,
                                reverse: step.reverse_operation,
                                working: step.calculation
                            });
                        }

                        state.stepIndex += 1;
                        state.selected = '';
                        state.correct = false;
                        state.wrong = false;
                        render();
                    }, 700);
                });
            });

        }

        if (steps.length === 0) {
            root.textContent = 'The Try It activity could not be loaded.';
            completeSection(TRY_SECTION_ID);
            return;
        }

        render();
    }

    function mountAll() {
        mountLearn(document.getElementById(LEARN_ROOT_ID));
        mountTryIt(document.getElementById(TRY_ROOT_ID));
    }

    document.addEventListener('function-machines:roots-ready', mountAll);
    document.addEventListener('maths1to9:lesson-rendered', mountAll);
    document.addEventListener('lesson:rendered', mountAll);

    const observer = new MutationObserver(mountAll);
    observer.observe(document.documentElement, { childList: true, subtree: true });

    mountAll();
})();
