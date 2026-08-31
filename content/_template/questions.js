(() => {
    'use strict';

    /*
     * CHANGE: '<slug>-questions', matching the lesson slug.
     */
    const ROOT_ID = 'my-lesson-slug-questions';

    const mounted = new WeakSet();

    /*
     * How many questions must be checked before the lesson's
     * "Finish lesson" button unlocks.
     */
    const QUESTIONS_TO_COMPLETE = 5;

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

    const r = (min, max) =>
        Math.floor(Math.random() * (max - min + 1)) + min;

    const pick = (items) =>
        items[r(0, items.length - 1)];

    function shuffle(items) {
        const copy = [...items];

        for (let index = copy.length - 1; index > 0; index -= 1) {
            const randomIndex = r(0, index);

            [copy[index], copy[randomIndex]] =
                [copy[randomIndex], copy[index]];
        }

        return copy;
    }

    /*
     * Builds the option list from one correct label and a
     * list of [label, feedback] distractors. Duplicates are
     * dropped, so generators must supply distinct values.
     */
    function options(correctLabel, wrongOptions) {
        const unique = new Map([
            [
                correctLabel,
                {
                    label: correctLabel,
                    correct: true,
                    feedback: ''
                }
            ]
        ]);

        wrongOptions.forEach(([label, feedback]) => {
            if (!unique.has(label)) {
                unique.set(label, {
                    label,
                    correct: false,
                    feedback
                });
            }
        });

        return shuffle([...unique.values()].slice(0, 4));
    }

    function make({
        prompt,
        expression,
        correct,
        wrong,
        hint,
        explanation
    }) {
        return {
            prompt,
            expression,
            correctLabel: String(correct),
            answers: options(String(correct), wrong),
            hint,
            explanation
        };
    }

    /*
     * CHANGE: your question generators. Each returns one
     * question via make(). Every distractor should encode a
     * real misconception, with feedback that names it.
     */
    function sampleQuestion() {
        const a = r(2, 9);
        const b = r(2, 9);
        const answer = a + b;

        return make({
            prompt: 'Work out the sum.',
            expression: `<span class="esf-row">${a} + ${b} = ?</span>`,
            correct: answer,

            wrong: [
                [
                    String(a * b),
                    'You multiplied. The question asks for a sum.'
                ],
                [
                    String(answer + 1),
                    'Close. Check your counting.'
                ],
                [
                    String(Math.abs(a - b)),
                    'You subtracted. The question asks for a sum.'
                ]
            ],

            hint: `Start at ${a} and count on ${b}.`,
            explanation: `${a} + ${b} = ${answer}.`
        });
    }

    /*
     * CHANGE: register generators, and optionally stage them
     * so harder types only appear at later question numbers.
     */
    const generators = {
        sample: sampleQuestion
    };

    function pool(questionNumber) {
        return Object.keys(generators);
    }

    function mount(root) {
        if (!root || mounted.has(root)) {
            return;
        }

        mounted.add(root);
        gateSection('question-bank');

        const state = {
            running: false,
            number: 0,
            checked: 0,
            correct: 0,
            previous: '',
            run: 0
        };

        root.innerHTML = `
            <div class="question-bank-controls">
                <button
                    class="button button--primary"
                    type="button"
                    data-start
                >
                    Start practice
                </button>

                <button
                    class="button"
                    type="button"
                    data-stop
                    disabled
                >
                    Stop practice
                </button>
            </div>

            <p data-score aria-live="polite">
                Select Start practice to begin.
            </p>

            <div class="question-list" data-list></div>
        `;

        const start = root.querySelector('[data-start]');
        const stop = root.querySelector('[data-stop]');
        const score = root.querySelector('[data-score]');
        const list = root.querySelector('[data-list]');

        function updateScore() {
            score.textContent =
                `Checked: ${state.checked} | ` +
                `Correct: ${state.correct}`;
        }

        function chooseGenerator() {
            const names = pool(state.number + 1);

            let name = pick(names);

            if (names.length > 1 && name === state.previous) {
                const currentIndex = names.indexOf(name);

                name = names[(currentIndex + 1) % names.length];
            }

            state.previous = name;

            return name;
        }

        function addQuestion() {
            if (!state.running) {
                return;
            }

            const generatorName = chooseGenerator();
            const question = generators[generatorName]();

            state.number += 1;

            const questionNumber = state.number;
            const questionId =
                `question-bank:${state.run}:${questionNumber}`;

            const card = document.createElement('article');

            card.className = 'question-card';

            card.innerHTML = `
                <p class="question-number">
                    Question ${questionNumber}
                </p>

                <p class="question-prompt"></p>

                <div class="esf-expression"></div>

                <button
                    class="button"
                    type="button"
                    data-hint-button
                >
                    Show hint
                </button>

                <p
                    class="esf-hint"
                    data-hint
                    aria-live="polite"
                ></p>

                <div
                    class="question-options"
                    data-options
                    role="radiogroup"
                ></div>

                <p
                    class="question-feedback"
                    data-feedback
                    aria-live="polite"
                ></p>
            `;

            card.querySelector('.question-prompt')
                .textContent = question.prompt;

            card.querySelector('.esf-expression')
                .innerHTML = question.expression;

            const hintButton =
                card.querySelector('[data-hint-button]');

            const hint = card.querySelector('[data-hint]');
            const optionBox = card.querySelector('[data-options]');
            const action = document.createElement('button');
            action.type = 'button';
            action.textContent = 'Check answer';
            action.disabled = true;
            const feedback = card.querySelector('[data-feedback]');

            const optionElements = [];

            const radioName =
                `practice-question-${questionNumber}`;

            hint.textContent = question.hint;

            optionBox.setAttribute(
                'aria-label',
                `Answers for question ${questionNumber}`
            );

            question.answers.forEach((answer) => {
                const label = document.createElement('label');

                label.className = 'question-option';

                const input = document.createElement('input');

                input.type = 'radio';
                input.name = radioName;
                input.value = answer.label;

                const text = document.createElement('span');

                text.textContent = answer.label;

                label.append(input, text);
                optionBox.append(label);

                optionElements.push({ label, input, answer });
            });

            /*
             * One action button, three phases:
             *   answering — "Check answer", disabled until
             *               an option is selected
             *   wrong     — "Try again", resets the question
             *   correct   — "Next question", adds the next card
             */
            let phase = 'answering';
            let marked = false;
            let previousResult = null;

            function setAction(label, enabled) {
                action.textContent = label;
                action.disabled = !enabled;

                window.Maths1to9Lesson
                    ?.useButtonAsSectionAction?.(
                        'question-bank',
                        action
                    );
            }

            function clearMarks() {
                optionElements.forEach(({ label }) => {
                    label.classList.remove(
                        'is-correct',
                        'is-incorrect',
                        'is-correct-answer'
                    );
                });
            }

            hintButton.addEventListener('click', () => {
                const visible =
                    hint.classList.toggle('is-visible');

                hintButton.textContent =
                    visible ? 'Hide hint' : 'Show hint';
            });

            optionElements.forEach(({ input }) => {
                input.addEventListener('change', () => {
                    if (phase === 'correct') {
                        return;
                    }

                    clearMarks();

                    feedback.className = 'question-feedback';
                    feedback.textContent = '';

                    phase = 'answering';
                    setAction('Check answer', true);
                });
            });

            action.addEventListener('click', () => {
                if (phase === 'wrong') {
                    optionElements.forEach(({ input }) => {
                        input.checked = false;
                    });

                    clearMarks();

                    feedback.className = 'question-feedback';
                    feedback.textContent = '';

                    phase = 'answering';
                    setAction('Check answer', false);

                    return;
                }

                if (phase === 'correct') {
                    setAction('Next question', false);
                    addQuestion();

                    return;
                }

                const selected = optionElements.find(
                    ({ input }) => input.checked
                );

                if (!selected) {
                    return;
                }

                clearMarks();

                const isCorrect = selected.answer.correct;

                window.Maths1to9Lesson?.recordAssessment?.({
                    questionType: generatorName,
                    questionId,
                    correct: isCorrect
                });

                if (!marked) {
                    state.checked += 1;

                    if (isCorrect) {
                        state.correct += 1;
                    }
                } else if (previousResult !== isCorrect) {
                    state.correct += isCorrect ? 1 : -1;
                }

                marked = true;
                previousResult = isCorrect;

                updateScore();

                if (state.checked >= QUESTIONS_TO_COMPLETE) {
                    completeSection('question-bank');
                }

                if (isCorrect) {
                    phase = 'correct';

                    selected.label.classList.add('is-correct');

                    optionElements.forEach(({ input }) => {
                        input.disabled = true;
                    });

                    setAction('Next question', true);

                    feedback.className =
                        'question-feedback ' +
                        'is-visible is-correct';

                    feedback.textContent =
                        `Correct. ${question.explanation}`;
                } else {
                    phase = 'wrong';

                    selected.label.classList.add('is-incorrect');

                    setAction('Try again', true);

                    feedback.className =
                        'question-feedback ' +
                        'is-visible is-incorrect';

                    feedback.textContent =
                        selected.answer.feedback ||
                        'Not quite. Try another option.';
                }
            });

            setAction('Check answer', false);

            list.append(card);

            card.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }

        start.addEventListener('click', () => {
            state.running = true;
            state.number = 0;
            state.checked = 0;
            state.correct = 0;
            state.previous = '';
            state.run += 1;

            list.replaceChildren();

            start.disabled = true;
            stop.disabled = false;

            updateScore();
            addQuestion();
        });

        stop.addEventListener('click', () => {
            window.Maths1to9Lesson
                ?.clearSectionAction?.('question-bank');
            if (!state.running) {
                return;
            }

            state.running = false;

            start.disabled = false;
            start.textContent = 'Start again';

            stop.disabled = true;

            const percentage =
                state.checked === 0
                    ? 0
                    : Math.round(
                        (state.correct / state.checked) * 100
                    );

            score.textContent =
                `Practice stopped: ` +
                `${state.correct}/${state.checked} correct ` +
                `(${percentage}%).`;
        });
    }

    window.Maths1to9QuestionBanks ??= {};

    /*
     * CHANGE: key must be the lesson slug.
     */
    window.Maths1to9QuestionBanks['my-lesson-slug'] = mount;

    function tryMount(root = null) {
        const target =
            root || document.getElementById(ROOT_ID);

        if (target) {
            mount(target);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            () => tryMount()
        );
    } else {
        tryMount();
    }

    document.addEventListener(
        'maths1to9:lesson-rendered',
        (event) => {
            tryMount(event.detail?.questionsRoot || null);
        }
    );
})();
