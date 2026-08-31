(() => {
    'use strict';

    window.Maths1to9Interactives ??= {};

    window.Maths1to9Interactives['solving-linear-equations'] =
        function mountSolvingLinearEquationsInteractive(root) {
            if (!root || root.dataset.linearEquationsMounted === 'true') {
                return;
            }

            root.dataset.linearEquationsMounted = 'true';

            document.dispatchEvent(
                new CustomEvent('maths1to9:section-gate', {
                    detail: {sectionId: 'interactive'}
                })
            );

            const examples = [
                {
                    id: 'taxi',
                    icon: '🚕',
                    name: 'City Taxi',
                    question:
                        'The total taxi fare was £17. How many miles were travelled?',
                    variable: 'm',
                    variableMeaning: 'miles travelled',
                    fixedLabel: 'Base fare',
                    fixedDisplay: '£3',
                    fixed: 3,
                    rateLabel: 'Cost per mile',
                    rateDisplay: '£2',
                    rateUnit: 'per mile',
                    coefficient: 2,
                    totalLabel: 'Total fare',
                    totalDisplay: '£17',
                    total: 17,
                    answer: 7,
                    answerUnit: 'miles',
                    equationStory:
                        'The base fare is £3. Each mile costs £2, so m miles cost 2m. ' +
                        'The base fare plus the mileage makes the £17 total.',
                    answerSentence: 'The journey was 7 miles.'
                },
                {
                    id: 'phone',
                    icon: '📱',
                    name: 'Mobile plan',
                    question:
                        'The total bill was £20. How many extra gigabytes were used?',
                    variable: 'g',
                    variableMeaning: 'extra gigabytes',
                    fixedLabel: 'Line rental',
                    fixedDisplay: '£5',
                    fixed: 5,
                    rateLabel: 'Extra data',
                    rateDisplay: '£3',
                    rateUnit: 'per GB',
                    coefficient: 3,
                    totalLabel: 'Total bill',
                    totalDisplay: '£20',
                    total: 20,
                    answer: 5,
                    answerUnit: 'GB',
                    equationStory:
                        'The line rental is £5. Each extra gigabyte costs £3, so g gigabytes cost 3g. ' +
                        'The line rental plus the extra data makes the £20 bill.',
                    answerSentence: '5 extra gigabytes were used.'
                },
                {
                    id: 'savings',
                    icon: '🐷',
                    name: 'Weekly savings',
                    question:
                        'The total savings were £28. For how many weeks was money saved?',
                    variable: 'w',
                    variableMeaning: 'weeks',
                    fixedLabel: 'Starting balance',
                    fixedDisplay: '£8',
                    fixed: 8,
                    rateLabel: 'Saved each week',
                    rateDisplay: '£4',
                    rateUnit: 'per week',
                    coefficient: 4,
                    totalLabel: 'Total savings',
                    totalDisplay: '£28',
                    total: 28,
                    answer: 5,
                    answerUnit: 'weeks',
                    equationStory:
                        'The jar starts with £8. £4 is saved each week, so w weeks add 4w. ' +
                        'The starting money plus the weekly savings makes the £28 total.',
                    answerSentence: 'Money was saved for 5 weeks.'
                },
                {
                    id: 'tradesperson',
                    icon: '🧰',
                    name: 'Repair invoice',
                    question:
                        'The total invoice was £34. How many hours were worked?',
                    variable: 'h',
                    variableMeaning: 'hours worked',
                    fixedLabel: 'Call-out fee',
                    fixedDisplay: '£10',
                    fixed: 10,
                    rateLabel: 'Hourly rate',
                    rateDisplay: '£6',
                    rateUnit: 'per hour',
                    coefficient: 6,
                    totalLabel: 'Total invoice',
                    totalDisplay: '£34',
                    total: 34,
                    answer: 4,
                    answerUnit: 'hours',
                    equationStory:
                        'The call-out fee is £10. Each hour costs £6, so h hours cost 6h. ' +
                        'The call-out fee plus the hours makes the £34 invoice.',
                    answerSentence: '4 hours were worked.'
                }
            ];

            const state = {
                exampleIndex: 0,
                stepIndex: 0
            };

            function escapeHtml(value) {
                return String(value).replace(/[&<>"']/g, character => ({
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#039;'
                })[character]);
            }

            function currentExample() {
                return examples[state.exampleIndex];
            }

            function reducedTotal(example) {
                return example.total - example.fixed;
            }

            function equationText(example, stage) {
                const middle = reducedTotal(example);

                if (stage <= 1) {
                    return `${example.fixed} + ${example.coefficient}${example.variable} = ${example.total}`;
                }

                if (stage === 2) {
                    return `${example.coefficient}${example.variable} = ${example.total} − ${example.fixed}`;
                }

                if (stage <= 4) {
                    return `${example.coefficient}${example.variable} = ${middle}`;
                }

                if (stage === 5) {
                    return `${example.variable} = ${middle} ÷ ${example.coefficient}`;
                }

                return `${example.variable} = ${example.answer}`;
            }

            function completedEquationText(example, completedStepIndex) {
                const middle = reducedTotal(example);

                const lines = [
                    `${example.fixed} + ${example.coefficient}${example.variable} = ${example.total}`,
                    `${example.coefficient}${example.variable} = ${example.total} − ${example.fixed}`,
                    `${example.coefficient}${example.variable} = ${middle}`,
                    `${example.coefficient}${example.variable} = ${middle}`,
                    `${example.variable} = ${middle} ÷ ${example.coefficient}`,
                    `${example.variable} = ${example.answer}`,
                    `${example.fixed} + ${example.coefficient} × ${example.answer} = ${example.total} ✓`
                ];

                return lines[completedStepIndex] || lines[lines.length - 1];
            }

            function renderContextCard(example) {
                return `
                    <article class="lesson-card linear-context-card">
                        <header class="linear-context-card__header">
                            <span class="linear-context-card__icon" aria-hidden="true">
                                ${escapeHtml(example.icon)}
                            </span>
                            <div>
                                <p class="lesson-card__eyebrow">Example ${state.exampleIndex + 1} of ${examples.length}</p>
                                <h3>${escapeHtml(example.name)}</h3>
                            </div>
                        </header>

                        <p class="linear-context-card__question">
                            ${escapeHtml(example.question)}
                        </p>

                        <dl class="linear-context-card__rows">
                            <div>
                                <dt>${escapeHtml(example.fixedLabel)}</dt>
                                <dd>${escapeHtml(example.fixedDisplay)}</dd>
                            </div>
                            <div>
                                <dt>${escapeHtml(example.rateLabel)}</dt>
                                <dd>
                                    ${escapeHtml(example.rateDisplay)}
                                    <small>${escapeHtml(example.rateUnit)}</small>
                                </dd>
                            </div>
                            <div>
                                <dt>${escapeHtml(example.totalLabel)}</dt>
                                <dd>${escapeHtml(example.totalDisplay)}</dd>
                            </div>
                        </dl>
                    </article>
                `;
            }

            function renderEquation(example, mode) {
                const middle = reducedTotal(example);
                const variable = escapeHtml(example.variable);

                if (mode === 'click-fixed') {
                    return `
                        <div class="linear-equation" aria-label="${escapeHtml(equationText(example, 0))}">
                            <button
                                type="button"
                                class="linear-equation__token is-target"
                                data-guided-action="next"
                            >
                                ${example.fixed}
                            </button>
                            <span>+</span>
                            <span>${example.coefficient}${variable}</span>
                            <span>=</span>
                            <span>${example.total}</span>
                        </div>
                    `;
                }

                if (mode === 'subtract-both') {
                    return `
                        <div class="linear-equation">
                            <span>${example.fixed} + ${example.coefficient}${variable}</span>
                            <button
                                type="button"
                                class="linear-equation__operation is-target"
                                data-guided-action="next"
                            >
                                − ${example.fixed} from both sides
                            </button>
                            <span>=</span>
                            <span>${example.total} − ${example.fixed}</span>
                        </div>
                    `;
                }

                if (mode === 'pick-middle') {
                    return `
                        <div class="linear-equation">
                            <span>${example.coefficient}${variable}</span>
                            <span>=</span>
                            <button
                                type="button"
                                class="linear-equation__token is-target"
                                data-guided-action="next"
                            >
                                ${middle}
                            </button>
                        </div>
                    `;
                }

                if (mode === 'click-coefficient') {
                    return `
                        <div class="linear-equation" aria-label="${escapeHtml(equationText(example, 2))}">
                            <button
                                type="button"
                                class="linear-equation__token is-target"
                                data-guided-action="next"
                            >
                                ${example.coefficient}
                            </button><span>${variable}</span>
                            <span>=</span>
                            <span>${middle}</span>
                        </div>
                    `;
                }

                if (mode === 'divide-both') {
                    return `
                        <div class="linear-equation">
                            <span>${example.coefficient}${variable}</span>
                            <button
                                type="button"
                                class="linear-equation__operation is-target"
                                data-guided-action="next"
                            >
                                ÷ ${example.coefficient} on both sides
                            </button>
                            <span>=</span>
                            <span>${middle} ÷ ${example.coefficient}</span>
                        </div>
                    `;
                }

                if (mode === 'pick-answer') {
                    return `
                        <div class="linear-equation">
                            <span>${variable}</span>
                            <span>=</span>
                            <button
                                type="button"
                                class="linear-equation__token is-target is-answer"
                                data-guided-action="next"
                            >
                                ${example.answer}
                            </button>
                        </div>
                    `;
                }

                return `
                    <div class="linear-equation is-complete">
                        <span>${variable}</span>
                        <span>=</span>
                        <span class="linear-equation__final">${example.answer}</span>
                    </div>
                `;
            }

            function stepData(example) {
                const middle = reducedTotal(example);

                return [
                    {
                        title: 'Turn the story into an equation',
                        instruction:
                            `We need to find ${example.variable}, the number of ${example.variableMeaning}. ` +
                            `${example.equationStory} ` +
                            `That gives the equation ${example.fixed} + ${example.coefficient}${example.variable} = ${example.total}. ` +
                            `We want ${example.variable} on its own, so we deal with the ${example.fixed} first. ` +
                            `Click the highlighted ${example.fixed}.`,
                        mode: 'click-fixed',
                        summary:
                            `The equation is ${example.fixed} + ${example.coefficient}${example.variable} = ${example.total}. ` +
                            `The ${example.fixed} is a fixed amount. We remove it first.`
                    },
                    {
                        title: `Subtract ${example.fixed} from both sides`,
                        instruction:
                            `The ${example.fixed} is added on. To undo adding ${example.fixed}, we subtract ${example.fixed}. ` +
                            `We must do this to both sides to keep the equation balanced. ` +
                            `Click “− ${example.fixed} from both sides”.`,
                        mode: 'subtract-both',
                        summary:
                            `We subtracted ${example.fixed} from both sides. The equation stays balanced.`
                    },
                    {
                        title: `Work out ${example.total} − ${example.fixed}`,
                        instruction:
                            `The right side is now ${example.total} − ${example.fixed}. ` +
                            `Work it out: ${example.total} − ${example.fixed} = ${middle}. ` +
                            `Click ${middle} to write it in.`,
                        mode: 'pick-middle',
                        summary:
                            `The equation is now ${example.coefficient}${example.variable} = ${middle}. ` +
                            `So ${example.coefficient} lots of ${example.variable} make ${middle}.`
                    },
                    {
                        title: `Now undo the ×${example.coefficient}`,
                        instruction:
                            `${example.coefficient}${example.variable} means ${example.variable} multiplied by ${example.coefficient}. ` +
                            `This is the last thing keeping ${example.variable} from being on its own. ` +
                            `Click the highlighted ${example.coefficient}.`,
                        mode: 'click-coefficient',
                        summary:
                            `${example.variable} is multiplied by ${example.coefficient}. We undo that next.`
                    },
                    {
                        title: `Divide both sides by ${example.coefficient}`,
                        instruction:
                            `To undo multiplying by ${example.coefficient}, we divide by ${example.coefficient}. ` +
                            `Again, we do it to both sides. ` +
                            `Click “÷ ${example.coefficient} on both sides”.`,
                        mode: 'divide-both',
                        summary:
                            `We divided both sides by ${example.coefficient}. Now ${example.variable} is on its own.`
                    },
                    {
                        title: `Work out ${middle} ÷ ${example.coefficient}`,
                        instruction:
                            `The right side is now ${middle} ÷ ${example.coefficient}. ` +
                            `Work it out: ${middle} ÷ ${example.coefficient} = ${example.answer}. ` +
                            `Click ${example.answer} to finish the working.`,
                        mode: 'pick-answer',
                        summary:
                            `${example.variable} = ${example.answer}. ${example.answerSentence}`
                    },
                    {
                        title: 'Check the answer',
                        instruction:
                            `Put ${example.answer} back into the original equation: ` +
                            `${example.fixed} + ${example.coefficient} × ${example.answer} = ${example.total} ✓ ` +
                            `The total matches the question, so the answer is right. ` +
                            `Click the button below to continue.`,
                        mode: 'complete',
                        summary:
                            `${example.answerSentence} The check works, so ${example.variable} = ${example.answer} is correct.`,
                        actionLabel:
                            state.exampleIndex === examples.length - 1
                                ? '✓ Finish the guided examples'
                                : '✓ Show the next example'
                    }
                ];
            }

            function renderCompletedCard(step, example, index) {
                return `
                    <article class="lesson-card linear-step-card is-complete">
                        <div class="linear-step-card__number" aria-hidden="true">✓</div>
                        <div>
                            <p class="lesson-card__eyebrow">Step ${index + 1}</p>
                            <h4>${escapeHtml(step.title)}</h4>
                            <p>${escapeHtml(step.summary)}</p>
                            <div class="linear-equation-history">
                                ${escapeHtml(completedEquationText(example, index))}
                            </div>
                        </div>
                    </article>
                `;
            }

            function renderCurrentCard(step, example, index) {
                const action = step.mode === 'complete'
                    ? ''
                    : renderEquation(example, step.mode);

                return `
                    <article class="lesson-card linear-step-card is-current" aria-live="polite">
                        <div class="linear-step-card__number" aria-hidden="true">${index + 1}</div>
                        <div>
                            <p class="lesson-card__eyebrow">Do this now</p>
                            <h4>${escapeHtml(step.title)}</h4>
                            <p>${escapeHtml(step.instruction)}</p>
                            ${action}
                        </div>
                    </article>
                `;
            }

            function renderFinished() {
                return `
                    <div class="linear-finished">
                        <article class="lesson-card">
                            <p class="lesson-card__eyebrow">Guided try complete</p>
                            <h3>You solved all four equations</h3>
                            <p>
                                Each time you used the same two moves.
                                First you subtracted the fixed amount from both sides.
                                Then you divided both sides by the cost of each one.
                            </p>
                        </article>
                    </div>
                `;
            }

            function render() {
                if (state.exampleIndex >= examples.length) {
                    root.innerHTML = renderFinished();
                    window.Maths1to9Lesson
                        ?.clearSectionAction?.('interactive');
                    document.dispatchEvent(
                        new CustomEvent('maths1to9:section-complete', {
                            detail: {sectionId: 'interactive'}
                        })
                    );
                    return;
                }

                const example = currentExample();
                const steps = stepData(example);
                const completed = steps
                    .slice(0, state.stepIndex)
                    .map((step, index) => renderCompletedCard(step, example, index))
                    .join('');

                root.innerHTML = `
                    <div class="linear-guided-interactive">
                        ${renderContextCard(example)}

                        <section class="linear-equation-board" aria-label="Equation working">
                            <p class="lesson-card__eyebrow">Equation</p>
                            <div class="linear-equation-history linear-equation-history--main">
                                ${escapeHtml(equationText(example, state.stepIndex))}
                            </div>
                        </section>

                        <div class="linear-step-stack">
                            ${completed}
                            ${renderCurrentCard(steps[state.stepIndex], example, state.stepIndex)}
                        </div>
                    </div>
                `;

                requestAnimationFrame(() => {
                    root.querySelector('.linear-step-card.is-current')
                        ?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'nearest'
                        });
                });

                const currentStep = steps[state.stepIndex];

                if (currentStep.mode === 'complete') {
                    window.Maths1to9Lesson
                        ?.setSectionAction?.('interactive', {
                            label: currentStep.actionLabel,
                            disabled: false,
                            onClick: advanceGuided
                        });
                } else {
                    window.Maths1to9Lesson
                        ?.clearSectionAction?.('interactive');
                }
            }

            function advanceGuided() {
                const steps = stepData(currentExample());

                if (state.stepIndex < steps.length - 1) {
                    state.stepIndex += 1;
                    render();
                    return;
                }

                state.exampleIndex += 1;
                state.stepIndex = 0;
                render();
            }

            root.addEventListener('click', event => {
                const action = event.target.closest('[data-guided-action]');

                if (!action) {
                    return;
                }

                advanceGuided();
            });

            /*
             * Scoped styles are inserted here so the lesson still uses the
             * shared app.css and does not need a separate per-lesson CSS file.
             */
            if (!document.getElementById('linear-equations-interactive-styles')) {
                const style = document.createElement('style');
                style.id = 'linear-equations-interactive-styles';
                style.textContent = `
                    .linear-guided-interactive { display: grid; gap: 1rem; }
                    .linear-context-card { overflow: hidden; }
                    .linear-context-card__header { display: flex; align-items: center; gap: .8rem; }
                    .linear-context-card__header h3 { margin: 0; }
                    .linear-context-card__icon { font-size: 2rem; }
                    .linear-context-card__question { font-size: 1.08rem; font-weight: 700; }
                    .linear-context-card__rows { margin: 0; }
                    .linear-context-card__rows > div { display: flex; justify-content: space-between; gap: 1rem; padding: .7rem 0; border-top: 1px solid rgba(0,0,0,.1); }
                    .linear-context-card__rows dt { color: var(--muted, #5f6470); }
                    .linear-context-card__rows dd { margin: 0; font-weight: 800; text-align: right; }
                    .linear-context-card__rows small { display: block; font-weight: 600; }
                    .linear-equation-board { padding: 1rem; border: 1px solid rgba(0,0,0,.12); border-radius: 1rem; background: rgba(255,255,255,.72); }
                    .linear-equation-history { font-size: 1.25rem; font-weight: 800; letter-spacing: .02em; }
                    .linear-equation-history--main { font-size: clamp(1.5rem, 5vw, 2.25rem); text-align: center; }
                    .linear-step-stack { display: grid; gap: .85rem; }
                    .linear-step-card { display: grid; grid-template-columns: auto 1fr; gap: .85rem; align-items: start; }
                    .linear-step-card h4 { margin: .1rem 0 .35rem; }
                    .linear-step-card p { margin-top: .25rem; }
                    .linear-step-card.is-complete { opacity: .78; }
                    .linear-step-card__number { display: grid; place-items: center; min-width: 2rem; height: 2rem; border-radius: 999px; background: rgba(24,169,87,.12); color: #118a47; font-weight: 900; }
                    .linear-step-card.is-current .linear-step-card__number { background: rgba(64,104,255,.12); color: #3158d8; }
                    .linear-equation { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: .55rem; margin-top: 1rem; font-size: clamp(1.25rem, 5vw, 1.9rem); font-weight: 850; }
                    .linear-equation__token,
                    .linear-equation__operation { appearance: none; border: 2px solid #3158d8; border-radius: .75rem; background: #fff; color: inherit; padding: .45rem .7rem; font: inherit; font-weight: 900; cursor: pointer; box-shadow: 0 3px 0 rgba(49,88,216,.22); }
                    .linear-equation__operation { font-size: 1rem; color: #2449bd; }
                    .linear-equation__token:hover,
                    .linear-equation__operation:hover { transform: translateY(-1px); }
                    .linear-equation__token:focus-visible,
                    .linear-equation__operation:focus-visible { outline: 3px solid rgba(49,88,216,.28); outline-offset: 3px; }
                    .linear-equation__token.is-answer { border-color: #18a957; color: #118a47; box-shadow: 0 3px 0 rgba(24,169,87,.22); }
                    .linear-equation__final { color: #118a47; border: 2px solid #18a957; border-radius: .65rem; padding: .2rem .55rem; }
                    .linear-finished { display: grid; gap: 1rem; }
                    @media (max-width: 620px) {
                        .linear-context-card__rows > div { align-items: start; }
                        .linear-step-card { grid-template-columns: 1fr; }
                        .linear-step-card__number { width: 2rem; }
                    }
                `;
                document.head.append(style);
            }

            render();
        };
})();
