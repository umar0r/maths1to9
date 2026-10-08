(() => {
    'use strict';

    const slug = 'indices-basics';
    const completionTarget = 8;
    const POWER_RANGE = Object.freeze({
        baseMin: 2, baseMax: 10,
        indexMin: 2, indexMax: 5
    });

    function randomBase() {
        return randomInt(POWER_RANGE.baseMin, POWER_RANGE.baseMax);
    }

    function randomIndex() {
        return randomInt(POWER_RANGE.indexMin, POWER_RANGE.indexMax);
    }

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

    function escapeHtml(value) {
        return String(value).replace(
            /[&<>"']/g,
            (character) => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            })[character]
        );
    }

    function randomInt(minimum, maximum) {
        return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
    }

    function randomItem(items) {
        return items[randomInt(0, items.length - 1)];
    }

    function shuffle(items) {
        const copy = [...items];

        for (let index = copy.length - 1; index > 0; index -= 1) {
            const swapIndex = randomInt(0, index);

            [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
        }

        return copy;
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

    function power(base, index) {
        return `${base}${sup(index)}`;
    }

    function repeated(base, count) {
        return Array(count).fill(base).join(' × ');
    }

    function makeOptions(correct, distractors) {
        const unique = [];

        [correct, ...distractors].forEach((value) => {
            const text = String(value);

            if (!unique.includes(text)) {
                unique.push(text);
            }
        });

        return shuffle(unique.slice(0, 4));
    }

    function identifyPartsQuestion() {
        const base = randomBase();
        const index = randomIndex();
        const value = base ** index;
        const askBase = Math.random() < 0.5;

        return {
            type: 'identify-parts',
            label: 'Identify the parts',
            prompt: askBase
                ? `In ${power(base, index)}, what is the base?`
                : `In ${power(base, index)}, what is the index?`,
            options: askBase
                ? makeOptions(base, [index, value, base + index])
                : makeOptions(index, [base, value, base + index]),
            answer: String(askBase ? base : index),
            explanation: `${power(base, index)} has base ${base} and index ${index}.`
        };
    }

    function expandPowerQuestion() {
        const base = randomBase();
        const index = randomIndex();

        return {
            type: 'expand-power',
            label: 'Expand the power',
            prompt: `Which shows ${power(base, index)} as repeated multiplication?`,
            options: makeOptions(
                repeated(base, index),
                [
                    repeated(base, Math.max(2, index - 1)),
                    repeated(base, index + 1),
                    `${base} × ${index}`
                ]
            ),
            answer: repeated(base, index),
            explanation: `${power(base, index)} means ${index} copies of ${base} multiplied together: ${repeated(base, index)}.`
        };
    }

    function calculatePowerQuestion() {
        const base = randomBase();
        const index = randomIndex();
        const value = base ** index;

        return {
            type: 'calculate-power',
            label: 'Calculate the value',
            prompt: `Calculate ${power(base, index)}.`,
            options: makeOptions(
                value,
                [
                    base * index,
                    base + index,
                    base ** (index - 1)
                ]
            ),
            answer: String(value),
            explanation: `${power(base, index)} = ${repeated(base, index)} = ${value}.`
                + (value !== base * index ? ` It is not ${base} × ${index} = ${base * index}.` : '')
        };
    }

    function writeNotationQuestion() {
        const base = randomBase();
        const count = randomIndex();

        return {
            type: 'write-notation',
            label: 'Write it in index notation',
            prompt: `Which index notation matches ${repeated(base, count)}?`,
            options: makeOptions(
                power(base, count),
                [
                    power(base, Math.max(2, count - 1)),
                    power(count, base),
                    power(base, count + 1)
                ]
            ),
            answer: power(base, count),
            explanation: `${base} appears ${count} times, so the index is ${count}: ${repeated(base, count)} = ${power(base, count)}.`
        };
    }

    function applyPowerQuestion() {
        // Geometry fixes the index at 2 or 3; doubling fixes the base at 2.
        // All freely chosen bases and indices use POWER_RANGE.
        const scenario = randomItem(['square', 'cube', 'doubling']);

        if (scenario === 'square') {
            const side = randomBase();
            const area = side * side;

            return {
                type: 'apply-power',
                label: 'Apply it',
                prompt: `A square rug has side length ${side} m. What is its area?`,
                options: makeOptions(
                    `${area} m²`,
                    [`${side * 4} m²`, `${area} m`, `${side + side} m²`]
                ),
                answer: `${area} m²`,
                explanation: `Area of a square = side² = ${power(side, 2)} = ${side} × ${side} = ${area} m².`
            };
        }

        if (scenario === 'cube') {
            const edge = randomBase();
            const volume = edge ** 3;

            return {
                type: 'apply-power',
                label: 'Apply it',
                prompt: `A cube-shaped storage box has edges of length ${edge} cm. What is its volume?`,
                options: makeOptions(
                    `${volume} cm³`,
                    [`${edge * 3} cm³`, `${volume} cm`, `${edge * edge} cm³`]
                ),
                answer: `${volume} cm³`,
                explanation: `Volume of a cube = edge³ = ${power(edge, 3)} = ${repeated(edge, 3)} = ${volume} cm³.`
            };
        }

        const hours = randomIndex();
        const population = 2 ** hours;

        return {
            type: 'apply-power',
            label: 'Apply it',
            prompt: `A bacteria population doubles every hour, starting from 1. What is the population after ${hours} hours?`,
            options: makeOptions(
                String(population),
                [String(2 * hours), String(hours * hours), String(2 ** (hours - 1))]
            ),
            answer: String(population),
            explanation: `After ${hours} hours the population is ${power(2, hours)} = ${repeated(2, hours)} = ${population}.`
        };
    }

    const generators = [
        identifyPartsQuestion,
        expandPowerQuestion,
        calculatePowerQuestion,
        writeNotationQuestion,
        applyPowerQuestion
    ];

    const generatorsByType = {
        'identify-parts': identifyPartsQuestion,
        'expand-power': expandPowerQuestion,
        'calculate-power': calculatePowerQuestion,
        'write-notation': writeNotationQuestion,
        'apply-power': applyPowerQuestion
    };

    function resultsHtml(history) {
        return `<ol class="retained-results">${history.map(entry => {
            const correct = entry.selected === entry.question.answer;
            const status = entry.firstCorrect ? '✓' : correct ? '2nd try' : 'Incorrect';
            return `<li><div class="retained-result"><span>${escapeHtml(entry.question.prompt)}</span>
                <span class="retained-result__answer"><strong>${escapeHtml(entry.selected)}</strong><span>${status}</span></span></div>
                ${entry.firstCorrect ? '' : `<p class="retained-result__explanation">${escapeHtml(entry.question.explanation)}</p>`}</li>`;
        }).join('')}</ol>`;
    }

    async function mountPractice(root) {
        if (!root || root.dataset.mounted) {
            return;
        }

        root.dataset.mounted = 'true';

        gateSection('question-bank');

        const store = window.Maths1to9Progress;
        let state = await store.getLessonActivityState(slug, 'question-bank');
        if (state?.contentVersion !== 1) state = {
            contentVersion: 1, history: [], firstCorrect: null,
            questionIndex: 0,
            question: null,
            questionId: '',
            selectedAnswer: '',
            phase: 'answer',
            feedback: '',
            correctCount: 0,
            completed: false
        };

        function newQuestion() {
            const generator = state.questionIndex < generators.length
                ? generators[state.questionIndex]
                : randomItem(generators);

            state.question = generator();
            state.questionId = `question-bank:${state.questionIndex + 1}`;
            state.selectedAnswer = '';
            state.phase = 'answer';
            state.feedback = '';
            state.questionIndex += 1;

            render();
        }

        function optionsHtml() {
            return state.question.options.map((option) => {
                let className = 'question-option';

                if (state.phase === 'feedback') {
                    if (option === state.question.answer) {
                        className += ' is-correct-answer';
                    }

                    if (option === state.selectedAnswer && option !== state.question.answer) {
                        className += ' is-incorrect';
                    }
                }

                return `
                    <label class="${className}">
                        <input
                            type="radio"
                            name="indices-answer"
                            value="${escapeHtml(option)}"
                            ${state.selectedAnswer === option ? 'checked' : ''}
                            ${state.phase === 'feedback' ? 'disabled' : ''}
                        >

                        <span>${escapeHtml(option)}</span>
                    </label>
                `;
            }).join('');
        }

        function feedbackHtml() {
            if (state.feedback === '') {
                return '';
            }

            const correct = state.selectedAnswer === state.question.answer;

            return `
                <div class="question-feedback is-visible ${correct ? 'is-correct' : 'is-incorrect'}">
                    ${escapeHtml(state.feedback)}
                </div>
            `;
        }

        function actionConfig() {
            if (state.phase === 'answer') {
                return {
                    label: 'Check answer',
                    disabled: state.selectedAnswer === '',
                    action: 'check'
                };
            }

            return {
                label: state.selectedAnswer === state.question.answer ? 'Next question' : 'Try again',
                disabled: false,
                action: 'next'
            };
        }

        function render() {
            store.saveLessonActivityState(slug, 'question-bank', state);
            if (state.completed) {
                root.innerHTML = '<h3>Your practice results</h3>' + resultsHtml(state.history);
                completeSection('question-bank');
                window.Maths1to9Lesson.clearSectionAction('question-bank');
                return;
            }
            root.innerHTML = `
                <article class="question-card question-card--bare">
                    <p class="question-number">
                        Question ${state.questionIndex} · ${state.correctCount} correct
                    </p>

                    <p class="lesson-eyebrow">${escapeHtml(state.question.label)}</p>

                    <h3 class="question-prompt">${escapeHtml(state.question.prompt)}</h3>

                    <div class="question-options" role="radiogroup" aria-label="Choose your answer">
                        ${optionsHtml()}
                    </div>

                    ${feedbackHtml()}

                    ${
                        state.completed && state.phase === 'feedback'
                            ? `<p>That's ${completionTarget} correct. Keep practising, or use Continue below to move on to Check.</p>`
                            : ''
                    }
                </article>
            `;

            /*
             * Once the target is reached, stop claiming the page's
             * primary action so the shared Continue control (which
             * advances to the Check stage) can take over.
             */
            if (state.completed && state.phase === 'feedback') {
                window.Maths1to9Lesson?.clearSectionAction?.('question-bank');
                return;
            }

            const action = actionConfig();
            const actionButton = document.createElement('button');

            actionButton.type = 'button';
            actionButton.dataset.action = action.action;
            actionButton.textContent = action.label;
            actionButton.disabled = action.disabled;

            bindHandlers(actionButton);

            window.Maths1to9Lesson?.useButtonAsSectionAction?.(
                'question-bank',
                actionButton
            );
        }

        function bindHandlers(actionButton) {
            root.querySelectorAll('input[name="indices-answer"]').forEach((input) => {
                input.addEventListener('change', (event) => {
                    state.selectedAnswer = event.currentTarget.value;
                    render();
                });
            });

            actionButton.addEventListener('click', (event) => {
                const action = event.currentTarget.dataset.action;

                if (action === 'check') {
                    const correct = state.selectedAnswer === state.question.answer;

                    window.Maths1to9Lesson?.recordAssessment?.({
                        questionType: state.question.type,
                        questionId: state.questionId,
                        correct
                    });

                    if (state.firstCorrect === null) state.firstCorrect = correct;
                    const index = state.questionIndex - 1;
                    const saved = state.history[index] ??= { question: state.question, attempts: [] };
                    saved.selected = state.selectedAnswer;
                    saved.firstCorrect = state.firstCorrect;
                    saved.attempts.push({ selected: state.selectedAnswer, correct });
                    state.phase = 'feedback';
                    state.feedback = state.question.explanation;

                    if (correct) {
                        state.correctCount += 1;

                        if (!state.completed && state.correctCount >= completionTarget) {
                            state.completed = true;
                            completeSection('question-bank');
                        }
                    }

                    render();
                    return;
                }

                if (action === 'next') {
                    if (state.selectedAnswer !== state.question.answer) {
                        state.selectedAnswer = '';
                        state.phase = 'answer';
                        state.feedback = '';
                        render();
                        return;
                    }
                    newQuestion();
                }
            });
        }

        if (state.question) render();
        else newQuestion();
    }

    /*
     * The Check stage is a short exit ticket: one question of each
     * type declared in lesson.json's comparison.questions, answered
     * once each in order. It completes after the last one, whatever
     * the result — like a real exit ticket, not a mastery gate.
     */
    async function mountComparison(root) {
        if (!root || root.dataset.mounted) {
            return;
        }

        root.dataset.mounted = 'true';

        gateSection('comparison');

        let types = [];

        try {
            types = JSON.parse(root.dataset.questions || '[]');
        } catch {
            types = [];
        }

        types = types.filter((type) => generatorsByType[type]);

        const store = window.Maths1to9Progress;
        let state = await store.getLessonActivityState(slug, 'comparison');
        if (state?.contentVersion !== 1) state = {
            contentVersion: 1, history: [], firstCorrect: null, types,
            index: 0,
            question: types.length > 0 ? generatorsByType[types[0]]() : null,
            selectedAnswer: '',
            phase: 'answer',
            feedback: '',
            correctCount: 0,
            finished: false
        };

        types = state.types;

        function nextQuestion() {
            state.index += 1;
            state.question = generatorsByType[types[state.index]]();
            state.selectedAnswer = '';
            state.phase = 'answer';
            state.feedback = '';
            state.firstCorrect = null;

            render();
        }

        function optionsHtml() {
            return state.question.options.map((option) => {
                let className = 'question-option';

                if (state.phase === 'feedback') {
                    if (option === state.question.answer) {
                        className += ' is-correct-answer';
                    }

                    if (option === state.selectedAnswer && option !== state.question.answer) {
                        className += ' is-incorrect';
                    }
                }

                return `
                    <label class="${className}">
                        <input
                            type="radio"
                            name="indices-check-answer"
                            value="${escapeHtml(option)}"
                            ${state.selectedAnswer === option ? 'checked' : ''}
                            ${state.phase === 'feedback' ? 'disabled' : ''}
                        >

                        <span>${escapeHtml(option)}</span>
                    </label>
                `;
            }).join('');
        }

        function feedbackHtml() {
            if (state.feedback === '') {
                return '';
            }

            const correct = state.selectedAnswer === state.question.answer;

            return `
                <div class="question-feedback is-visible ${correct ? 'is-correct' : 'is-incorrect'}">
                    ${escapeHtml(state.feedback)}
                </div>
            `;
        }

        function render() {
            store.saveLessonActivityState(slug, 'comparison', state);
            if (types.length === 0) {
                root.innerHTML = '';
                completeSection('comparison');
                return;
            }

            if (state.finished) {
                root.innerHTML = `
                    <article class="question-card question-card--bare">
                        ${resultsHtml(state.history)}
                        <p class="lesson-eyebrow">Check complete</p>
                        <h3 class="question-prompt">
                            ${state.correctCount} out of ${types.length} correct
                        </h3>
                        <p>
                            An index tells you how many times the base is used as a
                            factor — that's the one idea to hold onto before the next lesson.
                        </p>
                    </article>
                `;

                completeSection('comparison');
                window.Maths1to9Lesson?.clearSectionAction?.('comparison');

                return;
            }

            const isLast = state.index === types.length - 1;
            const action = state.phase === 'answer'
                ? { label: 'Check answer', disabled: state.selectedAnswer === '', action: 'check' }
                : { label: isLast ? 'Finish' : 'Next question', disabled: false, action: 'next' };

            root.innerHTML = `
                <article class="question-card question-card--bare">
                    <p class="question-number">
                        Question ${state.index + 1} of ${types.length} · ${state.correctCount} correct
                    </p>

                    <p class="lesson-eyebrow">${escapeHtml(state.question.label)}</p>

                    <h3 class="question-prompt">${escapeHtml(state.question.prompt)}</h3>

                    <div class="question-options" role="radiogroup" aria-label="Choose your answer">
                        ${optionsHtml()}
                    </div>

                    ${feedbackHtml()}
                </article>
            `;

            const actionButton = document.createElement('button');

            actionButton.type = 'button';
            actionButton.dataset.action = action.action;
            actionButton.textContent = action.label;
            actionButton.disabled = action.disabled;

            bindHandlers(actionButton, isLast);

            window.Maths1to9Lesson?.useButtonAsSectionAction?.(
                'comparison',
                actionButton
            );
        }

        function bindHandlers(actionButton, isLast) {
            root.querySelectorAll('input[name="indices-check-answer"]').forEach((input) => {
                input.addEventListener('change', (event) => {
                    state.selectedAnswer = event.currentTarget.value;
                    render();
                });
            });

            actionButton.addEventListener('click', (event) => {
                const action = event.currentTarget.dataset.action;

                if (action === 'check') {
                    const correct = state.selectedAnswer === state.question.answer;

                    window.Maths1to9Lesson?.recordAssessment?.({
                        questionType: state.question.type,
                        questionId: `comparison:${state.index + 1}`,
                        correct
                    });

                    if (state.firstCorrect === null) state.firstCorrect = correct;
                    const index = state.index;
                    const saved = state.history[index] ??= { question: state.question, attempts: [] };
                    saved.selected = state.selectedAnswer;
                    saved.firstCorrect = state.firstCorrect;
                    saved.attempts.push({ selected: state.selectedAnswer, correct });
                    state.phase = 'feedback';
                    state.feedback = state.question.explanation;

                    if (correct) {
                        state.correctCount += 1;
                    }

                    render();
                    return;
                }

                if (action === 'next') {
                    if (isLast) {
                        state.finished = true;
                        completeSection('comparison');
                        render();
                    } else {
                        nextQuestion();
                    }
                }
            });
        }

        document.addEventListener('maths1to9:lesson-complete', () => {
            if (!state.finished) return;
            state.lessonFinished = true;
            store.saveLessonActivityState(slug, 'comparison', state);
        });
        if (state.lessonFinished) window.Maths1to9Lesson.completeLesson();
        render();
    }

    function mountAll() {
        const questionsRoot = document.getElementById(`${slug}-questions`);

        if (questionsRoot && !questionsRoot.dataset.mounted) {
            mountPractice(questionsRoot);
        }

        const comparisonRoot = document.getElementById(`${slug}-comparison`);

        if (comparisonRoot && !comparisonRoot.dataset.mounted && !comparisonRoot.dataset.explorerPending) {
            mountComparison(comparisonRoot);
        }
    }

    document.addEventListener('maths1to9:lesson-rendered', mountAll);
    document.addEventListener('lesson:rendered', mountAll);
    document.addEventListener('indices:check-ready', mountAll);

    mountAll();
})();
