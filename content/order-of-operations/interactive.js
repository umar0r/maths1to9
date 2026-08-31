(() => {
    'use strict';

    window.Maths1to9Interactives ??= {};

    window.Maths1to9Interactives['order-of-operations'] =
        function mountOrderOfOperationsInteractive(root) {
            if (!root) {
                return;
            }

    /*
     * This example deliberately includes every part of BIDMAS:
     *
     * B: (3 + 3)
     * I: 2³
     * D: 18 ÷ 6
     * M: 8 × 4
     * A: 3 + 32
     * S: 35 − 5
     *
     * Division/multiplication and addition/subtraction are
     * completed from left to right.
     */
    const example = {
        original: '18 ÷ (3 + 3) + 2³ × 4 − 5',
        answer: '30'
    };

    document.dispatchEvent(
        new CustomEvent('maths1to9:section-gate', {
            detail: { sectionId: 'interactive' }
        })
    );

    const stages = [
        {
            id: 'brackets',
            shortLabel: 'B',
            label: 'Brackets'
        },
        {
            id: 'indices',
            shortLabel: 'I',
            label: 'Indices'
        },
        {
            id: 'divide-multiply',
            shortLabel: 'D / M',
            label: 'Left to right'
        },
        {
            id: 'add-subtract',
            shortLabel: 'A / S',
            label: 'Left to right'
        }
    ];

    /*
     * Only the target shown in each step is rendered as a button.
     * Everything else is plain text, so the student physically
     * cannot select an operation out of order.
     */
    const steps = [
        {
            stage: 'brackets',

            heading: 'BIDMAS starts with brackets',

            bidmasExplanation:
                'The B in BIDMAS stands for brackets. ' +
                'That means we must work out (3 + 3) before ' +
                'touching any other part of the expression.',

            instruction:
                'Click the bracketed calculation. ' +
                'Everything else stays unchanged for now.',

            answerInstruction:
                'Now calculate 3 + 3, then drag or click its answer.',

            successExplanation:
                'The brackets are complete. Next in BIDMAS is I ' +
                'for indices, so we now look for a power.',

            before: '18 ÷ ',
            target: '(3 + 3)',
            after: ' + 2³ × 4 − 5',

            operation: '3 + 3',
            answer: '6',

            options: [
                '4',
                '6',
                '9',
                '12'
            ],

            explanation:
                '3 + 3 = 6, so the brackets are replaced with 6.'
        },

        {
            stage: 'indices',

            heading: 'Next in BIDMAS: indices',

            bidmasExplanation:
                'The brackets are finished, so BIDMAS tells us ' +
                'to deal with indices next. The only index is 2³.',

            instruction:
                'Click 2³. We leave the division, multiplication, ' +
                'addition and subtraction alone for now.',

            answerInstruction:
                '2³ means 2 × 2 × 2. Choose its value.',

            successExplanation:
                'The index is complete. Next come division and ' +
                'multiplication. They have equal priority, so we ' +
                'work from left to right.',

            before: '18 ÷ 6 + ',
            target: '2³',
            after: ' × 4 − 5',

            operation: '2³',
            answer: '8',

            options: [
                '4',
                '6',
                '8',
                '9'
            ],

            explanation:
                '2³ = 2 × 2 × 2 = 8, so 2³ is replaced with 8.'
        },

        {
            stage: 'divide-multiply',

            heading: 'Now division and multiplication',

            bidmasExplanation:
                'In BIDMAS, division and multiplication have the ' +
                'same priority. We read from left to right, so ' +
                '18 ÷ 6 comes before 8 × 4.',

            instruction:
                'Click 18 ÷ 6 because it is the leftmost division ' +
                'or multiplication.',

            answerInstruction:
                'Calculate 18 ÷ 6.',

            successExplanation:
                'The division is complete. We are still in the ' +
                'division and multiplication stage because 8 × 4 remains.',

            before: '',
            target: '18 ÷ 6',
            after: ' + 8 × 4 − 5',

            operation: '18 ÷ 6',
            answer: '3',

            options: [
                '2',
                '3',
                '6',
                '12'
            ],

            explanation:
                '18 ÷ 6 = 3, so 18 ÷ 6 is replaced with 3.'
        },

        {
            stage: 'divide-multiply',

            heading: 'Stay with division and multiplication',

            bidmasExplanation:
                'There is still a multiplication left. We must ' +
                'finish all division and multiplication before ' +
                'moving to addition or subtraction.',

            instruction:
                'Click the remaining multiplication, 8 × 4.',

            answerInstruction:
                'Calculate 8 × 4.',

            successExplanation:
                'Division and multiplication are now complete. ' +
                'Next in BIDMAS come addition and subtraction, ' +
                'again working from left to right.',

            before: '3 + ',
            target: '8 × 4',
            after: ' − 5',

            operation: '8 × 4',
            answer: '32',

            options: [
                '24',
                '28',
                '32',
                '36'
            ],

            explanation:
                '8 × 4 = 32, so 8 × 4 is replaced with 32.'
        },

        {
            stage: 'add-subtract',

            heading: 'Now addition and subtraction',

            bidmasExplanation:
                'Addition and subtraction also have equal priority. ' +
                'We read from left to right, so 3 + 32 comes before − 5.',

            instruction:
                'Click 3 + 32 because it is the leftmost addition ' +
                'or subtraction.',

            answerInstruction:
                'Calculate 3 + 32.',

            successExplanation:
                'The addition is complete. The only operation left ' +
                'is the subtraction.',

            before: '',
            target: '3 + 32',
            after: ' − 5',

            operation: '3 + 32',
            answer: '35',

            options: [
                '29',
                '35',
                '37',
                '40'
            ],

            explanation:
                '3 + 32 = 35, so 3 + 32 is replaced with 35.'
        },

        {
            stage: 'add-subtract',

            heading: 'Finish with subtraction',

            bidmasExplanation:
                'All brackets, indices, division and multiplication ' +
                'are finished. Only 35 − 5 remains.',

            instruction:
                'Click the final subtraction.',

            answerInstruction:
                'Calculate 35 − 5.',

            successExplanation:
                'The expression is complete. Following BIDMAS gives ' +
                'a final answer of 30.',

            before: '',
            target: '35 − 5',
            after: '',

            operation: '35 − 5',
            answer: '30',

            options: [
                '25',
                '30',
                '35',
                '40'
            ],

            explanation:
                '35 − 5 = 30. This is the final answer.'
        }
    ];

    const state = {
        stepIndex: 0,

        /*
         * select-operation:
         * The highlighted operation must be selected.
         *
         * select-answer:
         * The answer tiles become available.
         *
         * correct:
         * The correct answer and explanation are shown.
         *
         * complete:
         * The complete expression and final answer are shown.
         */
        phase: 'select-operation',

        feedback: '',
        feedbackType: ''
    };

    function escapeHtml(value) {
        return String(value).replace(
            /[&<>"']/g,
            character => {
                const entities = {
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#039;'
                };

                return entities[character];
            }
        );
    }

    function getCurrentStep() {
        return steps[state.stepIndex];
    }

    function getCurrentStageIndex() {
        if (state.phase === 'complete') {
            return stages.length;
        }

        return stages.findIndex(stage => {
            return stage.id === getCurrentStep().stage;
        });
    }

    function renderProgress() {
        const currentStageIndex = getCurrentStageIndex();

        return stages
            .map((stage, index) => {
                const classes = [
                    'order-stage'
                ];

                if (index < currentStageIndex) {
                    classes.push('is-complete');
                }

                if (
                    state.phase !== 'complete'
                    && index === currentStageIndex
                ) {
                    classes.push('is-active');
                }

                return `
                    <div class="${classes.join(' ')}">
                        <strong class="order-stage__symbol">
                            ${escapeHtml(stage.shortLabel)}
                        </strong>

                        <span class="order-stage__label">
                            ${escapeHtml(stage.label)}
                        </span>
                    </div>
                `;
            })
            .join('');
    }

    function renderCoach() {
        if (state.phase === 'complete') {
            return `
                <div class="order-coach__meta">
                    <span>
                        Complete
                    </span>

                    <span>
                        ${steps.length} of ${steps.length} steps
                    </span>
                </div>

                <h3 class="order-coach__title">
                    You followed BIDMAS correctly
                </h3>

                <p class="order-coach__text">
                    <strong>BIDMAS:</strong>
                    Brackets first, then indices, then division and
                    multiplication from left to right, followed by
                    addition and subtraction from left to right.
                    <br><br>
                    <strong>Result:</strong>
                    ${escapeHtml(example.original)}
                    = ${escapeHtml(example.answer)}.
                </p>
            `;
        }

        const step = getCurrentStep();

        let actionLabel = 'Your move:';
        let actionText = step.instruction;
        let nextText = '';

        if (state.phase === 'select-answer') {
            actionLabel = 'Calculate:';
            actionText = step.answerInstruction;
        }

        if (state.phase === 'correct') {
            actionLabel = 'What changed:';
            actionText = step.explanation;
            nextText = step.successExplanation;
        }

        return `
            <div class="order-coach__meta">
                <span>
                    Step ${state.stepIndex + 1} of ${steps.length}
                </span>

                <span>
                    ${escapeHtml(
                        stages.find(stage => {
                            return stage.id === step.stage;
                        })?.shortLabel ?? ''
                    )}
                </span>
            </div>

            <h3 class="order-coach__title">
                ${escapeHtml(step.heading)}
            </h3>

            <p class="order-coach__text">
                <strong>BIDMAS:</strong>
                ${escapeHtml(step.bidmasExplanation)}
                <br><br>
                <strong>${escapeHtml(actionLabel)}</strong>
                ${escapeHtml(actionText)}
                ${
                    nextText
                        ? `
                            <br><br>
                            <strong>Next:</strong>
                            ${escapeHtml(nextText)}
                        `
                        : ''
                }
            </p>
        `;
    }

function getExpressionText(step) {
    return [
        step.before,
        step.target,
        step.after
    ].join('');
}

function getHistoryExpressions() {
    let completedCount;

    if (state.phase === 'complete') {
        completedCount = steps.length;
    } else if (state.phase === 'correct') {
        completedCount = state.stepIndex + 1;
    } else {
        completedCount = state.stepIndex;
    }

    return steps
        .slice(0, completedCount)
        .map(getExpressionText);
}

function renderHistoryLines() {
    return getHistoryExpressions()
        .map((expression, index) => {
            return `
                <div
                    class="
                        order-equation-line
                        order-equation-line--history
                    "
                >
                    <span class="order-equation-line__equals">
                        ${index === 0 ? '' : '='}
                    </span>

                    <span class="order-equation-line__expression">
                        ${escapeHtml(expression)}
                    </span>
                </div>
            `;
        })
        .join('');
}

function renderCurrentExpression() {
    if (state.phase === 'complete') {
        return `
            <strong class="order-expression__complete">
                ${escapeHtml(example.answer)}
            </strong>
        `;
    }

    /*
     * Once the current answer is correct, display the rewritten
     * expression that will be used in the next step.
     */
    if (state.phase === 'correct') {
        const isFinalStep =
            state.stepIndex === steps.length - 1;

        if (isFinalStep) {
            return `
                <strong class="order-expression__complete">
                    ${escapeHtml(example.answer)}
                </strong>
            `;
        }

        return escapeHtml(
            getExpressionText(
                steps[state.stepIndex + 1]
            )
        );
    }

    const step = getCurrentStep();

    const targetClasses = [
        'order-expression__target'
    ];

    if (state.phase === 'select-operation') {
        targetClasses.push('is-ready');
    } else {
        targetClasses.push('is-selected');
    }

    const isDisabled =
        state.phase !== 'select-operation';

    return `
        <span>
            ${escapeHtml(step.before)}
        </span>

        <button
            class="${targetClasses.join(' ')}"
            type="button"
            data-action="select-operation"
            aria-label="
                Select ${escapeHtml(step.operation)}
                as the next operation
            "
            ${isDisabled ? 'disabled' : ''}
        >
            ${escapeHtml(step.target)}
        </button>

        <span>
            ${escapeHtml(step.after)}
        </span>
    `;
}

        function renderEquationStack() {
            const historyExpressions =
                getHistoryExpressions();

            const currentClasses = [
                'order-equation-line',
                'order-equation-line--current'
            ];

            if (state.phase === 'correct') {
                currentClasses.push(
                    'is-correct-result'
                );
            }

            if (state.phase === 'complete') {
                currentClasses.push(
                    'is-final-result'
                );
            }

            return `
                <div
                    class="order-equation-stack"
                    aria-live="polite"
                >
                    ${renderHistoryLines()}

                    <div class="${currentClasses.join(' ')}">
                        <span class="order-equation-line__equals">
                            ${
                                historyExpressions.length > 0
                                    ? '='
                                    : ''
                            }
                        </span>

                        <div class="order-equation-line__expression">
                            ${renderCurrentExpression()}
                        </div>
                    </div>
                </div>
            `;
        }

    function renderWorkingArea() {
        if (state.phase === 'complete') {
            return `
                <div class="order-result">
                    <span class="order-result__label">
                        Final answer
                    </span>

                    <div class="order-result__box is-correct">
                        ${escapeHtml(example.answer)}
                    </div>
                </div>
            `;
        }

        const step = getCurrentStep();

        if (state.phase === 'select-operation') {
            return `
                <div class="order-working">
                    <span class="order-working__arrow">
                        ↓
                    </span>

                    <p class="order-working__instruction">
                        Select the highlighted operation first
                    </p>
                </div>
            `;
        }

        if (state.phase === 'select-answer') {
            return `
                <div class="order-working">
                    <span class="order-working__arrow">
                        ↓
                    </span>

                    <div class="order-operation-card">
                        <span class="order-operation-card__label">
                            Calculate
                        </span>

                        <strong>
                            ${escapeHtml(step.operation)}
                        </strong>
                    </div>

                    <span class="order-working__arrow">
                        ↓
                    </span>

                    <div
                        class="order-result__box is-drop-zone"
                        data-drop-zone
                    >
                        Drop or click an answer
                    </div>
                </div>
            `;
        }

        return `
            <div class="order-working">
                <span class="order-working__arrow">
                    ↓
                </span>

                <div class="order-operation-card">
                    <span class="order-operation-card__label">
                        ${escapeHtml(step.operation)}
                    </span>

                    <strong>
                        ${escapeHtml(step.answer)}
                    </strong>
                </div>

                <span class="order-working__arrow">
                    ↓
                </span>

                <div class="order-result__box is-correct">
                    ${escapeHtml(step.answer)}
                </div>
            </div>
        `;
    }

    function renderAnswerBank() {
        if (state.phase === 'complete') {
            return '';
        }

        const answersEnabled =
            state.phase === 'select-answer';

        const options = getCurrentStep().options
            .map(option => {
                return `
                    <button
                        class="order-answer"
                        type="button"
                        data-answer="${escapeHtml(option)}"
                        draggable="${answersEnabled ? 'true' : 'false'}"
                        ${answersEnabled ? '' : 'disabled'}
                    >
                        ${escapeHtml(option)}
                    </button>
                `;
            })
            .join('');

        return `
            <section
                class="
                    order-answer-bank
                    ${answersEnabled ? 'is-active' : 'is-locked'}
                "
            >
                <div class="order-answer-bank__header">
                    <div>
                        <h4>
                            Answer bank
                        </h4>

                        <p>
                            ${
                                answersEnabled
                                    ? 'Drag an answer into the box, or click it.'
                                    : 'Select the highlighted operation to unlock the answers.'
                            }
                        </p>
                    </div>
                </div>

                <div class="order-answer-bank__options">
                    ${options}
                </div>
            </section>
        `;
    }

    function renderFeedback() {
        if (!state.feedback) {
            return '';
        }

        return `
            <div
                class="
                    order-feedback
                    is-${escapeHtml(state.feedbackType)}
                "
                role="status"
                aria-live="polite"
            >
                ${escapeHtml(state.feedback)}
            </div>
        `;
    }

    function render() {
        root.innerHTML = `
            <div class="order-interactive">
                <div class="order-interactive__header">
                    <div>
                        <p class="order-interactive__eyebrow">
                            Guided practice
                        </p>

                        <h3 class="order-interactive__heading">
                            Evaluate the expression
                        </h3>
                    </div>

                    <button
                        class="order-button order-button--secondary"
                        type="button"
                        data-action="restart"
                    >
                        Restart
                    </button>
                </div>

                <div
                    class="order-progress"
                    aria-label="Order of operations"
                >
                    ${renderProgress()}
                </div>

                <p class="order-progress__note">
                    Division and multiplication have equal priority.
                    Addition and subtraction have equal priority.
                    Work from left to right.
                </p>

                <section
                    class="order-coach"
                    aria-live="polite"
                >
                    ${renderCoach()}
                </section>

                <section class="order-board">
                    ${renderEquationStack()}

                    ${renderWorkingArea()}
                </section>

                ${renderAnswerBank()}
                ${renderFeedback()}
            </div>
        `;

        const api = window.Maths1to9Lesson;
        api?.clearSectionAction?.('interactive');

        if (state.phase === 'correct') {
            const isFinalStep =
                state.stepIndex === steps.length - 1;

            api?.setSectionAction?.('interactive', {
                label: isFinalStep
                    ? 'Finish example'
                    : 'Next operation',
                disabled: false,
                onClick: continueToNextStep
            });
        } else if (state.phase === 'complete') {
            document.dispatchEvent(
                new CustomEvent('maths1to9:section-complete', {
                    detail: { sectionId: 'interactive' }
                })
            );

            api?.setSectionAction?.('interactive', {
                label: 'Try again',
                disabled: false,
                onClick: restart
            });
        }

    }

    function selectOperation() {
        if (state.phase !== 'select-operation') {
            return;
        }

        state.phase = 'select-answer';
        state.feedback = '';
        state.feedbackType = '';

        render();
    }

    function submitAnswer(answer) {
        if (state.phase !== 'select-answer') {
            return;
        }

        const step = getCurrentStep();

        if (String(answer) !== step.answer) {
            state.feedbackType = 'incorrect';
            state.feedback =
                `Not quite. Keep the rest of the expression unchanged ` +
                `and calculate ${step.operation}.`;

            render();
            return;
        }

        state.phase = 'correct';
        state.feedbackType = 'correct';
        state.feedback = step.explanation;

        render();
    }

    function continueToNextStep() {
        if (state.phase !== 'correct') {
            return;
        }

        const isFinalStep =
            state.stepIndex === steps.length - 1;

        if (isFinalStep) {
            state.phase = 'complete';
            state.feedbackType = 'correct';
            state.feedback =
                `${example.original} = ${example.answer}.`;

            render();
            return;
        }

        state.stepIndex += 1;
        state.phase = 'select-operation';
        state.feedback = '';
        state.feedbackType = '';

        render();
    }

    function restart() {
        state.stepIndex = 0;
        state.phase = 'select-operation';
        state.feedback = '';
        state.feedbackType = '';

        render();
    }

    root.addEventListener('click', event => {
        const actionElement =
            event.target.closest('[data-action]');

        const answerElement =
            event.target.closest('[data-answer]');

        if (actionElement) {
            const action = actionElement.dataset.action;

            if (action === 'select-operation') {
                selectOperation();
                return;
            }

            if (action === 'continue') {
                continueToNextStep();
                return;
            }

            if (action === 'restart') {
                restart();
                return;
            }
        }

        if (answerElement) {
            submitAnswer(answerElement.dataset.answer);
        }
    });

    root.addEventListener('dragstart', event => {
        const answerElement =
            event.target.closest('[data-answer]');

        if (
            !answerElement
            || state.phase !== 'select-answer'
        ) {
            event.preventDefault();
            return;
        }

        event.dataTransfer.setData(
            'text/plain',
            answerElement.dataset.answer
        );

        event.dataTransfer.effectAllowed = 'move';

        answerElement.classList.add('is-dragging');
    });

    root.addEventListener('dragend', event => {
        event.target
            .closest('[data-answer]')
            ?.classList
            .remove('is-dragging');
    });

    root.addEventListener('dragover', event => {
        const dropZone =
            event.target.closest('[data-drop-zone]');

        if (
            !dropZone
            || state.phase !== 'select-answer'
        ) {
            return;
        }

        event.preventDefault();
        dropZone.classList.add('is-drag-over');
    });

    root.addEventListener('dragleave', event => {
        event.target
            .closest('[data-drop-zone]')
            ?.classList
            .remove('is-drag-over');
    });

    root.addEventListener('drop', event => {
        const dropZone =
            event.target.closest('[data-drop-zone]');

        if (
            !dropZone
            || state.phase !== 'select-answer'
        ) {
            return;
        }

        event.preventDefault();

        dropZone.classList.remove('is-drag-over');

        const answer =
            event.dataTransfer.getData('text/plain');

        submitAnswer(answer);
    });

            render();
        };
})();
