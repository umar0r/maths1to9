(() => {
    'use strict';

    const slug = 'indices-basics';

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

    const SUPERSCRIPT_DIGITS = {
        0: '⁰', 1: '¹', 2: '²', 3: '³',
        4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷',
        8: '⁸', 9: '⁹'
    };

    function sup(number) {
        return String(number)
            .split('')
            .map((digit) => SUPERSCRIPT_DIGITS[digit] ?? digit)
            .join('');
    }

    /*
     * Three checkpoints:
     * 1. Build 2 up one factor at a time, then say what index was reached.
     * 2. Read a 6-by-6 grid as the meaning behind "six squared".
     * 3. Resolve the base misconception (4 × 3 vs 4 × 4 × 4).
     *
     * Steps 2 and 3 share one advance/fail flow. Step 1 has its own
     * render because building is a free interaction, not a single choice.
     */
    window.Maths1to9Interactives[slug] =
        async function mountIndicesBuilder(root) {
            if (!root || root.dataset.mounted) {
                return;
            }

            root.dataset.mounted = 'true';

            gateSection('interactive');

            const BASE = 2;
            const MAX_INDEX = 6;

            const defaultChoiceSteps = [
                {
                    id: 'squared-grid',
                    prompt:
                        'This grid shows 6² built from unit squares. How many small squares fill the whole grid?',
                    success:
                        '6² = 6 × 6 = 36 — that’s why we call it "six squared": it’s the number of unit squares that fill a 6-by-6 square.',
                    choices: [
                        {
                            label: '12',
                            feedback:
                                '12 is 6 + 6, one trip around two sides. Count every small square inside the grid, not just the edges.'
                        },
                        {
                            label: '6',
                            feedback:
                                '6 is the length of just one side. Squaring uses that side twice, so count every square inside the grid, not one edge.'
                        },
                        {
                            label: '36',
                            correct: true
                        }
                    ]
                },
                {
                    id: 'misconception',
                    prompt:
                        '4³ — Student A says 4 × 3 = 12. Student B says 4 × 4 × 4 = 64. Who is correct?',
                    success:
                        'Student B is correct. The index tells you how many 4s to multiply together: 4 × 4 × 4 = 64.',
                    choices: [
                        {
                            label: 'Student A',
                            feedback:
                                'Not quite. The index 3 tells us to use three 4s as factors — it does not tell us to multiply 4 by 3.'
                        },
                        {
                            label: 'Student B',
                            correct: true
                        }
                    ]
                }
            ];

            const store = window.Maths1to9Progress;
            let state = await store.getLessonActivityState(slug, 'interactive');
            if (state?.contentVersion !== 1) state = {
                contentVersion: 1, choiceSteps: defaultChoiceSteps, answers: [],
                phase: 'build',
                buildIndex: 1,
                buildChecked: false,
                buildError: '',
                choiceStep: 0,
                successMessage: '',
                errorMessage: '',
                finished: false
            };

            const choiceSteps = state.choiceSteps;
            function save() {
                store.saveLessonActivityState(slug, 'interactive', state);
            }
            function recordAnswer(index, selected, correct) {
                const answer = state.answers[index] ??= { firstCorrect: correct, attempts: [] };
                answer.selected = selected;
                answer.phase = correct ? 'correct' : 'wrong';
                answer.attempts.push({ selected, correct });
            }

            function currentValue(index) {
                return BASE ** index;
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

            function renderBuildStep() {
                const card = createElement('article', 'question-card question-card--bare');

                card.append(
                    createElement(
                        'p',
                        'lesson-eyebrow',
                        'Step 1 of 3'
                    ),
                    createElement(
                        'p',
                        'question-prompt',
                        'Press the button to add one more factor of 2. Watch the index and the value grow.'
                    )
                );

                const factors = Array(state.buildIndex).fill(BASE).join(' × ');
                const value = currentValue(state.buildIndex);

                card.append(
                    createElement(
                        'p',
                        'lx2-formula',
                        `2${sup(state.buildIndex)} = ${factors} = ${value}`
                    )
                );

                if (state.buildIndex < MAX_INDEX) {
                    const button = createElement(
                        'button',
                        'button button--primary',
                        '× 2 again'
                    );

                    button.type = 'button';
                    button.addEventListener('click', () => {
                        state.buildIndex += 1;
                        render();
                    });

                    card.append(button);
                } else if (!state.buildChecked) {
                    card.append(
                        createElement(
                            'p',
                            'question-prompt',
                            `You've built 2${sup(MAX_INDEX)}. What is the index here?`
                        )
                    );

                    const row = createElement('div', 'lx2-chip-row');

                    [
                        { label: String(MAX_INDEX), correct: true },
                        {
                            label: String(BASE),
                            feedback:
                                '2 is the base — the number being multiplied. The index counts how many times it appears.'
                        },
                        {
                            label: String(value),
                            feedback:
                                `${value} is the value — the answer once you multiply it out. The index is how many 2s you pressed.`
                        }
                    ].forEach((choice) => {
                        const chip = createElement(
                            'button',
                            'lx2-chip lx2-chip--value',
                            choice.label
                        );

                        chip.type = 'button';
                        chip.addEventListener('click', () => {
                            recordAnswer(0, choice.label, Boolean(choice.correct));
                            if (choice.correct) {
                                state.buildChecked = true;
                                state.buildError = '';
                                render();
                            } else {
                                state.buildError = choice.feedback;
                                render();
                            }
                        });

                        row.append(chip);
                    });

                    card.append(row);

                    if (state.buildError !== '') {
                        card.append(feedback(state.buildError, false));
                    }
                } else {
                    card.append(
                        feedback(
                            `There are six factors of 2, so the index is ${MAX_INDEX}. Each multiplication added one more factor of 2.`
                        )
                    );

                    const button = createElement(
                        'button',
                        'button button--primary',
                        'Continue'
                    );

                    button.type = 'button';
                    button.addEventListener('click', () => {
                        state.phase = 'choice';
                        render();
                    });

                    card.append(button);
                }

                return card;
            }

            function squaredGrid() {
                const grid = createElement('div', 'indices-grid');

                for (let index = 0; index < 36; index += 1) {
                    grid.append(createElement('span', 'indices-grid__cell'));
                }

                return grid;
            }

            function currentChoiceStep() {
                return choiceSteps[state.choiceStep];
            }

            function advanceChoice() {
                state.successMessage = currentChoiceStep().success;
                state.errorMessage = '';
                state.choiceCorrect = true;
                render();
            }

            function failChoice(message) {
                state.errorMessage = message;
                state.successMessage = '';
                render();
            }

            function renderChoiceStep() {
                if (state.finished) {
                    const card = createElement('article', 'question-card question-card--bare');

                    card.append(createElement('p', 'lx2-formula', `2${sup(state.buildIndex)} = ${Array(state.buildIndex).fill(BASE).join(' × ')} = ${currentValue(state.buildIndex)}`));
                    card.append(squaredGrid());
                    card.append(createElement('p', 'lx2-formula', '6² = 36'));
                    card.append(createElement('p', 'lx2-formula', '4³ = 4 × 4 × 4 = 64'));
                    const statuses = state.answers.map(answer => answer.firstCorrect ? '✓' : '2nd try');
                    card.append(createElement('p', '', statuses.join(' · ')));


                    return card;
                }

                const step = currentChoiceStep();
                const card = createElement('article', 'question-card question-card--bare');

                card.append(
                    createElement(
                        'p',
                        'lesson-eyebrow',
                        `Step ${state.choiceStep + 2} of ${choiceSteps.length + 1}`
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

                if (step.id === 'squared-grid') {
                    card.append(squaredGrid());
                }

                const row = createElement('div', 'lx2-chip-row');

                step.choices.forEach((choice) => {
                    const chip = createElement(
                        'button',
                        'lx2-chip lx2-chip--value',
                        choice.label
                    );

                    chip.type = 'button';
                    chip.disabled = state.choiceCorrect === true;
                    chip.addEventListener('click', () => {
                        recordAnswer(state.choiceStep + 1, choice.label, Boolean(choice.correct));
                        if (choice.correct) {
                            advanceChoice();
                        } else {
                            failChoice(choice.feedback);
                        }
                    });

                    row.append(chip);
                });

                card.append(row);

                if (state.errorMessage !== '') {
                    card.append(feedback(state.errorMessage, false));
                }

                return card;
            }

            function render() {
                save();
                const api = window.Maths1to9Lesson;
                api?.setSectionAction?.('interactive', {
                    label: 'Continue', disabled: true, onClick() {}
                });
                root.replaceChildren();
                root.append(state.phase === 'build' ? renderBuildStep() : renderChoiceStep());
                const localAction = root.querySelector('.button--primary');
                if (localAction) {
                    api?.useButtonAsSectionAction?.('interactive', localAction);
                } else if (state.choiceCorrect && !state.finished) {
                    api?.setSectionAction?.('interactive', {
                        label: 'Continue', onClick() {
                            state.choiceCorrect = false;
                            state.successMessage = '';
                            if (state.choiceStep === choiceSteps.length - 1) {
                                state.finished = true;
                                render();
                                completeSection('interactive');
                                api.clearSectionAction('interactive');
                                api.goToSection('question-bank', { unlock: true });
                            } else {
                                state.choiceStep += 1;
                                render();
                            }
                        }
                    });
                } else if (state.finished) {
                    completeSection('interactive');
                    api?.clearSectionAction?.('interactive');
                }
            }

            render();
        };

    function mountFallback() {
        const root = document.getElementById(`${slug}-interactive`);

        if (root && !root.dataset.mounted) {
            window.Maths1to9Interactives[slug](root);
        }
    }

    document.addEventListener('maths1to9:lesson-rendered', mountFallback);
    document.addEventListener('lesson:rendered', mountFallback);

    mountFallback();
})();
