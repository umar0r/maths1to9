(() => {
    'use strict';

    const slug = 'substituting-into-formulae';

    window.Maths1to9Interactives ??= {};

    function gateSection(sectionId) {
        document.dispatchEvent(
            new CustomEvent('maths1to9:section-gate', {
                detail: { sectionId }
            })
        );
    }

    function completeSection(sectionId) {
        document.dispatchEvent(
            new CustomEvent('maths1to9:section-complete', {
                detail: { sectionId }
            })
        );
    }

    function createElement(tagName, className = '', text = '') {
        const element = document.createElement(tagName);

        if (className !== '') {
            element.className = className;
        }

        if (text !== '') {
            element.textContent = text;
        }

        return element;
    }

    /*
     * One walkthrough of Find → Replace → Calculate → Check.
     *
     * Flow rules:
     * - Every step asks for exactly one decision.
     * - A correct decision advances the step immediately. There are
     *   no Continue buttons inside this component; the lesson
     *   engine's own Continue (released by section-complete at the
     *   end) is the only flow button on the page.
     * - A wrong decision stays on the step and explains the error.
     */
    window.Maths1to9Interactives[slug] =
        function mountSubstitutionWalkthrough(root) {
            if (!root || root.dataset.mounted) {
                return;
            }

            root.dataset.mounted = 'true';

            gateSection('interactive');

            const methodStages = [
                'Find',
                'Replace',
                'Calculate',
                'Check'
            ];

            /*
             * Internal steps. Steps 2 and 3 both belong to the
             * Calculate stage of the method trail.
             */
            const steps = [
                {
                    id: 'find',
                    methodIndex: 0,
                    prompt: 'What value are you given for s?',
                    success:
                        'You found it: s = 4. That is the value to substitute.',
                    choices: [
                        {
                            label: '5',
                            feedback:
                                '5 is the fixed ticket cost. It is already a number in the formula. Look for the value given for the letter s.'
                        },
                        {
                            label: '2',
                            feedback:
                                '2 is the cost of one snack. It is already a number in the formula. Look for the value given for the letter s.'
                        },
                        {
                            label: '4',
                            correct: true
                        }
                    ]
                },
                {
                    id: 'replace',
                    methodIndex: 1,
                    prompt:
                        'Replace s with 4. Drag the 4 into the letter space, or tap 4 and then tap s.',
                    success:
                        'Every letter is replaced. The formula is now a calculation: C = 5 + 2 × 4.'
                },
                {
                    id: 'first-op',
                    methodIndex: 2,
                    prompt:
                        'C = 5 + 2 × 4. Which part do you work out first?',
                    success:
                        '2 × 4 = 8. BIDMAS: multiplication before addition.',
                    choices: [
                        {
                            label: '5 + 2',
                            feedback:
                                'Not first. BIDMAS puts multiplication before addition. Adding first gives 7 × 4 = 28, which is wrong.'
                        },
                        {
                            label: '2 × 4',
                            correct: true
                        }
                    ]
                },
                {
                    id: 'add',
                    methodIndex: 2,
                    prompt: 'C = 5 + 8. What is the value of C?',
                    success: 'C = 13.',
                    choices: [
                        {
                            label: '13',
                            correct: true
                        },
                        {
                            label: '40',
                            feedback:
                                'That is 5 × 8. The multiplication is already done. This step is an addition: 5 + 8.'
                        },
                        {
                            label: '12',
                            feedback:
                                'Check the addition again: 5 + 8.'
                        }
                    ]
                },
                {
                    id: 'check',
                    methodIndex: 3,
                    prompt:
                        'Last step: check the answer and give it with its unit. How much does the cinema visit cost?',
                    success:
                        'You used Find → Replace → Calculate → Check. The cinema visit costs £13.',
                    choices: [
                        {
                            label: '£13',
                            correct: true
                        },
                        {
                            label: '13p',
                            feedback:
                                'The prices in the question are in pounds, not pence.'
                        },
                        {
                            label: '£28',
                            feedback:
                                '£28 comes from adding before multiplying. Your working shows C = 13.'
                        }
                    ]
                }
            ];

            const state = {
                step: 0,
                successMessage: '',
                errorMessage: '',
                tileSelected: false,
                finished: false
            };

            function currentStep() {
                return steps[state.step];
            }

            function currentMethodIndex() {
                return state.finished
                    ? methodStages.length
                    : currentStep().methodIndex;
            }

            function advance() {
                state.successMessage = currentStep().success;
                state.errorMessage = '';
                state.tileSelected = false;

                if (state.step === steps.length - 1) {
                    state.finished = true;
                    completeSection('interactive');
                } else {
                    state.step += 1;
                }

                render();
            }

            function fail(message) {
                state.errorMessage = message;
                state.successMessage = '';
                render();
            }

            function methodTrail() {
                const row = createElement('div', 'lx2-chip-row');
                const activeIndex = currentMethodIndex();

                methodStages.forEach((stage, index) => {
                    const chip = createElement(
                        'span',
                        'lx2-chip',
                        stage
                    );

                    if (index < activeIndex) {
                        chip.classList.add('is-found');
                    }

                    if (index === activeIndex) {
                        chip.classList.add('is-armed');
                    }

                    row.append(chip);

                    if (index < methodStages.length - 1) {
                        row.append(
                            createElement('span', 'lx2-arrow', '→')
                        );
                    }
                });

                return row;
            }

            function workingSoFar() {
                const card = createElement('div', 'lx2-card');

                card.append(
                    createElement(
                        'p',
                        'lx2-context',
                        'A cinema visit costs £5, plus £2 for each snack. You buy 4 snacks.'
                    ),
                    createElement('p', 'lx2-formula', 'C = 5 + 2s')
                );

                const given = createElement('p', 'lx2-chip', 's = 4');

                if (state.step >= 1 || state.finished) {
                    given.classList.add('is-found');
                }

                card.append(given);

                const lines = [
                    { minStep: 2, text: 'C = 5 + 2 × 4' },
                    { minStep: 3, text: 'C = 5 + 8' },
                    { minStep: 4, text: 'C = 13' }
                ];

                lines.forEach((line) => {
                    if (state.step >= line.minStep || state.finished) {
                        card.append(
                            createElement(
                                'p',
                                'lx2-live-line',
                                line.text
                            )
                        );
                    }
                });

                if (state.finished) {
                    card.append(
                        createElement(
                            'p',
                            'lx2-live-line',
                            'The cinema visit costs £13.'
                        )
                    );
                }

                return card;
            }

            function feedback(text, correct = true) {
                return createElement(
                    'p',
                    `question-feedback is-visible ${
                        correct ? 'is-correct' : 'is-incorrect'
                    }`,
                    text
                );
            }

            function choiceChips(card, step) {
                const row = createElement('div', 'lx2-chip-row');

                step.choices.forEach((choice) => {
                    const chip = createElement(
                        'button',
                        'lx2-chip lx2-chip--value',
                        choice.label
                    );

                    chip.type = 'button';

                    chip.addEventListener('click', () => {
                        if (choice.correct) {
                            advance();
                        } else {
                            fail(choice.feedback);
                        }
                    });

                    row.append(chip);
                });

                card.append(row);
            }

            function replaceStep(card, step) {
                const formula = createElement('div', 'lx2-formula');

                formula.append(
                    document.createTextNode('C = 5 + 2 × ')
                );

                const slot = createElement('button', 'button', 's');

                slot.type = 'button';
                slot.dataset.role = 'slot';
                formula.append(slot);

                const tile = createElement(
                    'button',
                    'lx2-chip lx2-chip--value',
                    '4'
                );

                tile.type = 'button';
                tile.draggable = true;
                tile.dataset.role = 'tile';

                if (state.tileSelected) {
                    tile.classList.add('is-armed');
                }

                tile.addEventListener('click', () => {
                    state.tileSelected = !state.tileSelected;
                    render();
                });

                tile.addEventListener('dragstart', (event) => {
                    event.dataTransfer.setData('text/plain', '4');
                });

                slot.addEventListener('click', () => {
                    if (state.tileSelected) {
                        advance();
                    }
                });

                slot.addEventListener('dragover', (event) => {
                    event.preventDefault();
                });

                slot.addEventListener('drop', (event) => {
                    event.preventDefault();

                    if (
                        event.dataTransfer.getData('text/plain') ===
                        '4'
                    ) {
                        advance();
                    }
                });

                card.append(formula, tile);
            }

            function render() {
                removeBackButton();
                root.replaceChildren();

                root.append(methodTrail(), workingSoFar());

                if (state.finished) {
                    root.append(feedback(state.successMessage));
                    removeBackButton();
                    return;
                }

                const step = currentStep();

                const card = createElement(
                    'article',
                    'worked-example'
                );

                card.append(
                    createElement(
                        'p',
                        'lesson-eyebrow',
                        `${methodStages[step.methodIndex]} · Step ${
                            step.methodIndex + 1
                        } of 4`
                    )
                );

                if (state.successMessage !== '') {
                    card.append(feedback(state.successMessage));
                }

                card.append(
                    createElement(
                        'p',
                        'question-prompt',
                        step.prompt
                    )
                );

                if (step.id === 'replace') {
                    replaceStep(card, step);
                } else {
                    choiceChips(card, step);
                }

                if (state.errorMessage !== '') {
                    card.append(
                        feedback(state.errorMessage, false)
                    );
                }

                root.append(card);
                removeBackButton();
            }

            render();
        };

    function mountFallback() {
        const root = document.getElementById(
            `${slug}-interactive`
        );

        if (root && !root.dataset.mounted) {
            window.Maths1to9Interactives[slug](root);
        }
    }

    document.addEventListener(
        'maths1to9:lesson-rendered',
        mountFallback
    );

    document.addEventListener('lesson:rendered', mountFallback);

    mountFallback();
})();
