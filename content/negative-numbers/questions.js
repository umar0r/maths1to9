(() => {
    'use strict';

    /* ---------- helpers ---------- */

    const MINUS = '\u2212';

    function randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
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

    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, (character) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        })[character]);
    }

    function formatSigned(value) {
        return value < 0 ? `${MINUS}${Math.abs(value)}` : String(value);
    }

    function formatBracketed(value) {
        return value < 0 ? `(${formatSigned(value)})` : String(value);
    }

    function formatTemperature(value) {
        return `${formatSigned(value)}°C`;
    }

    function toNumber(text) {
        return Number(
            String(text)
                .replace(/°C/g, '')
                .replace(new RegExp(MINUS, 'g'), '-')
                .replace(/,/g, '')
        );
    }

    function numericNudge(text, step) {
        const hasUnit = String(text).includes('°C');
        const value = toNumber(text);

        if (!Number.isFinite(value)) {
            return `${text} (${step})`;
        }

        const nudged = value + step;
        return hasUnit ? formatTemperature(nudged) : formatSigned(nudged);
    }

    function uniqueOptions(correct, distractors, count = 4) {
        const options = [];

        [correct, ...distractors].forEach((value) => {
            const text = String(value);
            if (!options.includes(text)) {
                options.push(text);
            }
        });

        let step = 1;
        while (options.length < count) {
            const value = numericNudge(correct, step);
            if (!options.includes(value)) {
                options.push(value);
            }
            step += 1;
        }

        return shuffle(options.slice(0, count));
    }

    function makeQuestion({ type, prompt, display = '', options, answer, explanation }) {
        return {
            type,
            prompt,
            display,
            options: shuffle(options),
            answer: String(answer),
            explanation
        };
    }

    /* ---------- question generators ---------- */

    function generateOrderingQuestion() {
        // Distinct absolute values, so the "ignore the signs"
        // misconception order is always different from the answer.
        const sizes = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).slice(0, 4);

        const values = sizes.map((size, index) => (
            index < 2 ? -size : (index === 2 ? size : (Math.random() < 0.5 ? size : -size))
        ));

        const ordered = [...values].sort((first, second) => first - second);
        const correctOrder = ordered.map(formatSigned);
        const answer = correctOrder.join(' → ');

        // Misconception distractor: ignore the signs and order by
        // the digits alone ("7 is bigger than 2, so −7 is bigger").
        const ignoreSigns = [...values]
            .sort((first, second) => Math.abs(first) - Math.abs(second))
            .map(formatSigned)
            .join(' → ');

        const descending = [...correctOrder].reverse().join(' → ');

        const swapFirst = [...correctOrder];
        [swapFirst[0], swapFirst[1]] = [swapFirst[1], swapFirst[0]];

        const swapLast = [...correctOrder];
        [swapLast[2], swapLast[3]] = [swapLast[3], swapLast[2]];

        return makeQuestion({
            type: 'Order negative numbers',
            prompt: 'Which option puts these numbers in order from smallest to biggest?',
            display: shuffle(values.map(formatSigned)).join(', '),
            options: uniqueOptions(answer, [
                ignoreSigns,
                swapFirst.join(' → '),
                swapLast.join(' → '),
                descending
            ]),
            answer,
            explanation: (
                'Picture the number line. Further left means smaller. '
                + `The order is ${answer}.`
            )
        });
    }

    function generateTemperatureQuestion() {
        if (Math.random() < 0.5) {
            // A rise or fall from a starting temperature.
            const start = randomInt(-9, 5);
            const change = randomInt(3, 12);
            const falls = Math.random() < 0.5;
            const result = falls ? start - change : start + change;

            const answer = formatTemperature(result);

            return makeQuestion({
                type: 'Temperature',
                prompt: (
                    `The temperature is ${formatTemperature(start)}. `
                    + `It ${falls ? 'falls' : 'rises'} by ${change}°C. `
                    + 'What is the new temperature?'
                ),
                options: uniqueOptions(answer, [
                    formatTemperature(falls ? start + change : start - change),
                    formatTemperature(-result),
                    formatTemperature(change - start)
                ]),
                answer,
                explanation: (
                    `${falls ? 'Falling' : 'Rising'} means `
                    + `${falls ? 'subtracting' : 'adding'}. `
                    + `Start at ${formatSigned(start)} and move ${change} `
                    + `${falls ? 'left' : 'right'} on the number line. `
                    + `${formatSigned(start)} ${falls ? MINUS : '+'} ${change} = ${answer}.`
                )
            });
        }

        // The difference between a night and a midday temperature.
        const night = randomInt(-9, -2);
        const midday = randomInt(1, 12);
        const difference = midday - night;
        const answer = `${difference}°C`;

        return makeQuestion({
            type: 'Temperature',
            prompt: (
                `At night the temperature is ${formatTemperature(night)}. `
                + `By midday it is ${formatTemperature(midday)}. `
                + 'By how many degrees does the temperature rise?'
            ),
            options: uniqueOptions(answer, [
                `${Math.abs(midday - Math.abs(night))}°C`,
                `${midday + night}°C`,
                `${difference + 2}°C`
            ]),
            answer,
            explanation: (
                `Count from ${formatSigned(night)} up to ${midday}. `
                + `It is ${Math.abs(night)} steps up to zero, `
                + `then ${midday} more steps. `
                + `${Math.abs(night)} + ${midday} = ${difference}.`
            )
        });
    }

    function generateAddSubtractQuestion() {
        const first = randomInt(2, 9);
        const second = randomInt(2, 9);

        const forms = [
            {
                // a − (−b): the classic double sign.
                text: `${first} ${MINUS} (${MINUS}${second})`,
                value: first + second,
                doubleSign: true,
                tidied: `${first} + ${second}`,
                trap: first - second
            },
            {
                // a + (−b): plus and minus together.
                text: `${first} + (${MINUS}${second})`,
                value: first - second,
                doubleSign: true,
                tidied: `${first} ${MINUS} ${second}`,
                trap: first + second
            },
            {
                // −a − (−b): double sign with a negative start.
                text: `${MINUS}${first} ${MINUS} (${MINUS}${second})`,
                value: -first + second,
                doubleSign: true,
                tidied: `${MINUS}${first} + ${second}`,
                trap: -first - second
            },
            {
                // −a − b: no double sign, keep moving left.
                text: `${MINUS}${first} ${MINUS} ${second}`,
                value: -first - second,
                doubleSign: false,
                start: -first,
                move: second,
                movesRight: false,
                trap: -(first - second)
            },
            {
                // −a + b: no double sign, move right.
                text: `${MINUS}${first} + ${second}`,
                value: -first + second,
                doubleSign: false,
                start: -first,
                move: second,
                movesRight: true,
                trap: -(first + second)
            }
        ];

        const form = randomItem(forms);
        const answer = formatSigned(form.value);

        const explanation = form.doubleSign
            ? (
                'Tidy the signs first. '
                + 'Same signs act like +. Different signs act like −. '
                + `So ${form.text} becomes ${form.tidied} = ${answer}.`
            )
            : (
                `Start at ${formatSigned(form.start)}. `
                + `${form.movesRight ? 'Adding' : 'Subtracting'} ${form.move} `
                + `moves you ${form.move} steps ${form.movesRight ? 'right' : 'left'}. `
                + `You land on ${answer}.`
            );

        return makeQuestion({
            type: 'Add and subtract',
            prompt: `Work out ${form.text}`,
            options: uniqueOptions(answer, [
                formatSigned(form.trap),
                formatSigned(-form.value),
                formatSigned(form.value + (Math.random() < 0.5 ? 1 : -1))
            ]),
            answer,
            explanation
        });
    }

    function generateMultiplyDivideQuestion() {
        const multiply = Math.random() < 0.5;
        const first = randomInt(2, 9);
        const second = randomInt(2, 9);

        // At least one number is negative.
        const signCombo = randomItem([
            [-1, 1],
            [1, -1],
            [-1, -1]
        ]);

        let leftValue;
        let rightValue;
        let size;

        if (multiply) {
            leftValue = first * signCombo[0];
            rightValue = second * signCombo[1];
            size = first * second;
        } else {
            leftValue = first * second * signCombo[0];
            rightValue = second * signCombo[1];
            size = first;
        }

        const positive = signCombo[0] === signCombo[1];
        const value = positive ? size : -size;
        const answer = formatSigned(value);
        const symbol = multiply ? '×' : '÷';

        return makeQuestion({
            type: 'Multiply and divide',
            prompt: (
                `Work out ${formatSigned(leftValue)} ${symbol} `
                + `${formatBracketed(rightValue)}`
            ),
            options: uniqueOptions(answer, [
                formatSigned(-value),
                formatSigned(positive ? size + second : -(size + second)),
                formatSigned(multiply ? size - second : size + 1)
            ]),
            answer,
            explanation: (
                `${multiply ? 'Multiply' : 'Divide'} the numbers first: `
                + `${Math.abs(leftValue)} ${symbol} ${Math.abs(rightValue)} = ${size}. `
                + `The signs are ${positive ? 'the same' : 'different'}, `
                + `so the answer is ${positive ? 'positive' : 'negative'}: ${answer}.`
            )
        });
    }

    // Exam-style embedded question: negatives inside substitution,
    // the format GCSE papers actually use at the grade 4–5 boundary.
    function generateSubstitutionQuestion() {
        const coefficient = randomInt(2, 5);
        const r = -randomInt(2, 5);
        const q = randomInt(1, 9);

        const product = coefficient * r;

        const templates = [
            {
                expression: `${coefficient}r ${MINUS} q`,
                value: product - q,
                working: (
                    `Substitute: ${coefficient} × ${formatBracketed(r)} ${MINUS} ${q}. `
                    + `Multiply first: different signs, so ${coefficient} × ${formatBracketed(r)} = ${formatSigned(product)}. `
                    + `Then ${formatSigned(product)} ${MINUS} ${q} = ${formatSigned(product - q)}.`
                ),
                traps: [product + q, -product - q, Math.abs(product) - q]
            },
            {
                expression: `${coefficient}r + q`,
                value: product + q,
                working: (
                    `Substitute: ${coefficient} × ${formatBracketed(r)} + ${q}. `
                    + `Multiply first: different signs, so ${coefficient} × ${formatBracketed(r)} = ${formatSigned(product)}. `
                    + `Then ${formatSigned(product)} + ${q} = ${formatSigned(product + q)}.`
                ),
                traps: [product - q, -product + q, Math.abs(product) + q]
            },
            {
                expression: `q ${MINUS} ${coefficient}r`,
                value: q - product,
                working: (
                    `Substitute: ${q} ${MINUS} ${coefficient} × ${formatBracketed(r)}. `
                    + `Multiply first: ${coefficient} × ${formatBracketed(r)} = ${formatSigned(product)}. `
                    + `Now tidy the signs: ${q} ${MINUS} ${formatBracketed(product)} becomes ${q} + ${Math.abs(product)} = ${formatSigned(q - product)}.`
                ),
                traps: [q + product, -(q - product), q - Math.abs(product)]
            }
        ];

        const template = randomItem(templates);
        const answer = formatSigned(template.value);

        return makeQuestion({
            type: 'Exam style: substitution',
            prompt: (
                `Work out the value of ${template.expression} `
                + `when r = ${formatSigned(r)} and q = ${q}`
            ),
            options: uniqueOptions(
                answer,
                template.traps.map(formatSigned)
            ),
            answer,
            explanation: template.working
        });
    }

    const generators = {
        order: generateOrderingQuestion,
        temperature: generateTemperatureQuestion,
        addSubtract: generateAddSubtractQuestion,
        multiplyDivide: generateMultiplyDivideQuestion,
        substitution: generateSubstitutionQuestion
    };

    function createQuestionBag() {
        return shuffle(Object.keys(generators));
    }

    /* ---------- number line chart ---------- */

    function getNumberLineChart(question) {
        const left = Number(question.left);
        const right = Number(question.right);

        const low = Math.min(left, right, 0) - 1;
        const high = Math.max(left, right, 0) + 1;

        const values = [];
        for (let value = low; value <= high; value += 1) {
            values.push(value);
        }

        const template = `110px repeat(${values.length}, minmax(44px, 1fr))`;

        function cell(content, extraClass = '') {
            return (
                `<div class="place-value-cell ${extraClass}">`
                + `${escapeHtml(content)}</div>`
            );
        }

        function markerRow(label, target) {
            const cells = values.map((value) => cell(
                value === target ? '●' : '',
                `place-value-cell--digit${value === 0 ? ' place-value-cell--decimal-start' : ''}`
            )).join('');

            return (
                `<div class="place-value-row" style="grid-template-columns: ${template};">`
                + cell(label, 'place-value-cell--row-label')
                + cells
                + '</div>'
            );
        }

        const headingCells = values.map((value) => cell(
            formatSigned(value),
            `place-value-cell--heading${value === 0 ? ' place-value-cell--decimal-start' : ''}`
        )).join('');

        return (
            '<div class="place-value-chart-wrapper">'
            + `<div class="place-value-chart" style="min-width: ${110 + (values.length * 48)}px;">`
            + `<div class="place-value-row" style="grid-template-columns: ${template};">`
            + cell('', 'place-value-cell--heading')
            + headingCells
            + '</div>'
            + markerRow(formatSigned(left), left)
            + markerRow(formatSigned(right), right)
            + '</div>'
            + '</div>'
        );
    }

    /* ---------- fixed comparison activity ---------- */

    function mountFixedComparisons(root) {
        let questions = [];

        try {
            questions = JSON.parse(root.dataset.questions || '[]');
        } catch (error) {
            questions = [];
        }

        if (!Array.isArray(questions) || questions.length === 0) {
            root.textContent = 'The comparison activity could not be loaded.';
            return;
        }

        const state = {
            index: 0,
            selected: '',
            checked: false
        };

        function render() {
            const question = questions[state.index];
            const correct = state.selected === question.answer;
            const isLast = state.index === questions.length - 1;

            const leftText = formatSigned(Number(question.left));
            const rightText = formatSigned(Number(question.right));

            const optionsHtml = ['>', '<'].map((option) => {
                let className = '';

                if (state.checked) {
                    if (option === question.answer) {
                        className = 'is-correct-answer';
                    }
                    if (option === state.selected) {
                        className = correct ? 'is-correct' : 'is-incorrect';
                    }
                }

                return (
                    `<label class="question-option ${className}">`
                    + '<input type="radio" name="negative-comparison-answer"'
                    + ` value="${escapeHtml(option)}"`
                    + `${state.selected === option ? ' checked' : ''}`
                    + `${state.checked ? ' disabled' : ''}>`
                    + `<span>${escapeHtml(option)}</span>`
                    + '</label>'
                );
            }).join('');

            const feedbackHtml = state.checked
                ? (
                    `<div class="question-feedback is-visible ${correct ? 'is-correct' : 'is-incorrect'}">`
                    + `<strong>${correct ? 'Correct.' : 'Not quite.'}</strong> `
                    + escapeHtml(
                        `${leftText} ${question.answer} ${rightText}. `
                        + question.explanation
                    )
                    + '</div>'
                    + getNumberLineChart(question)
                )
                : '';

            const buttonLabel = state.checked
                ? (isLast ? 'Start again' : 'Next comparison')
                : 'Check answer';

            const buttonDisabled = !state.checked && state.selected === ''
                ? ' disabled'
                : '';

            root.innerHTML = (
                '<article class="question-card">'
                + `<p class="question-number">Comparison ${state.index + 1} of ${questions.length}</p>`
                + '<p class="question-prompt">Choose the symbol that makes this true.</p>'
                + '<div class="interactive-equation">'
                + `${escapeHtml(leftText)} ${escapeHtml(state.selected || '?')} ${escapeHtml(rightText)}`
                + '</div>'
                + '<div class="question-options" role="radiogroup" aria-label="Choose greater than or less than">'
                + optionsHtml
                + '</div>'
                + feedbackHtml
                + '</article>'
            );

            root.querySelectorAll('input[name="negative-comparison-answer"]').forEach((input) => {
                input.addEventListener('change', (event) => {
                    state.selected = event.currentTarget.value;
                    render();
                });
            });

            window.Maths1to9Lesson
                ?.setSectionAction?.('comparison', {
                    label: buttonLabel,
                    disabled: buttonDisabled !== '',
                    onClick: () => {
                        if (!state.checked) {
                            state.checked = true;
                        } else {
                            state.index =
                                (state.index + 1) % questions.length;
                            state.selected = '';
                            state.checked = false;
                        }

                        render();
                    }
                });
        }

        render();
    }

    /* ---------- infinite practice ---------- */

    function mountInfinitePractice(root) {
        const state = {
            bag: createQuestionBag(),
            questions: [],
            currentIndex: -1
        };

        function addQuestion() {
            if (state.bag.length === 0) {
                state.bag = createQuestionBag();
            }

            const type = state.bag.pop();

            state.questions.push({
                question: generators[type](),
                assessmentType: type,
                questionId:
                    `question-bank:${state.questions.length + 1}`,
                selected: '',
                checked: false,
                answered: false,
                lastAnswer: '',
                correct: false
            });

            state.currentIndex = state.questions.length - 1;
        }

        function currentEntry() {
            return state.questions[state.currentIndex];
        }

        function answeredCount() {
            return state.questions.filter((entry) => entry.answered).length;
        }

        function correctCount() {
            return state.questions.filter((entry) => entry.answered && entry.correct).length;
        }

        function optionClass(option, entry) {
            if (!entry.checked) {
                return '';
            }
            if (option === entry.question.answer && option === entry.selected) {
                return 'is-correct';
            }
            if (option === entry.selected) {
                return 'is-incorrect';
            }
            if (option === entry.question.answer) {
                return 'is-correct-answer';
            }
            return '';
        }

        function historyHtml() {
            const previous = state.questions
                .map((entry, index) => ({
                    entry,
                    index
                }))
                .filter(({ entry, index }) => (
                    entry.answered
                    && index !== state.currentIndex
                ))
                .reverse();

            if (previous.length === 0) {
                return '';
            }

            const cards = previous.map(({
                entry,
                index
            }) => {
                const questionText = [
                    entry.question.prompt,
                    entry.question.display
                ]
                    .filter(Boolean)
                    .join(' ')
                    .replace(/\s+/g, ' ')
                    .trim();

                const resultClass = entry.correct
                    ? 'is-correct'
                    : 'is-incorrect';

                const resultText = entry.correct
                    ? 'Correct'
                    : 'Wrong';

                const correctAnswerHtml = entry.correct
                    ? ''
                    : `
                        <p>
                            Correct answer:
                            <strong>
                                ${escapeHtml(
                                    entry.question.answer
                                )}
                            </strong>
                        </p>
                    `;

                return `
                    <article class="worked-example">
                        <p class="worked-example__number">
                            Question ${index + 1}
                            · ${resultText}
                        </p>

                        <h3 class="worked-example__title">
                            ${escapeHtml(questionText)}
                        </h3>

                        <div
                            class="
                                question-feedback
                                is-visible
                                ${resultClass}
                            "
                        >
                            <p>
                                Your answer:
                                <strong>
                                    ${escapeHtml(
                                        entry.lastAnswer
                                    )}
                                </strong>
                            </p>

                            ${correctAnswerHtml}
                        </div>

                        <div class="question-answer-row">
                            <button
                                class="button"
                                type="button"
                                data-history-index="${index}"
                            >
                                Open question
                            </button>
                        </div>
                    </article>
                `;
            }).join('');

            return `
                <details class="question-history">
                    <summary class="button">
                        Previous questions
                        (${previous.length})
                    </summary>

                    <div class="worked-example-list">
                        ${cards}
                    </div>
                </details>
            `;
        }

        function render() {
            const entry = currentEntry();
            const question = entry.question;
            const correct = entry.selected === question.answer;

            const optionsHtml = question.options.map((option) => (
                `<label class="question-option ${optionClass(option, entry)}">`
                + '<input type="radio" name="negative-numbers-practice-answer"'
                + ` value="${escapeHtml(option)}"`
                + `${entry.selected === option ? ' checked' : ''}`
                + `${entry.checked ? ' disabled' : ''}>`
                + `<span>${escapeHtml(option)}</span>`
                + '</label>'
            )).join('');

            const displayHtml = question.display
                ? `<div class="interactive-equation">${escapeHtml(question.display)}</div>`
                : '';

            const feedbackHtml = entry.checked
                ? (
                    `<div class="question-feedback is-visible ${correct ? 'is-correct' : 'is-incorrect'}">`
                    + `<strong>${correct ? 'Correct.' : 'Not quite.'}</strong> `
                    + escapeHtml(question.explanation)
                    + '</div>'
                )
                : '';

            const action = entry.checked
                ? (correct ? 'next' : 'retry')
                : 'check';
            const actionLabel = action === 'next'
                ? 'Next question'
                : action === 'retry'
                    ? 'Try again'
                    : 'Check answer';
            const actionDisabled =
                action === 'check' && entry.selected === '';

            root.innerHTML = (
                '<article class="question-card">'
                + '<p class="question-number">'
                + `Question ${state.currentIndex + 1} · ${correctCount()} correct from ${answeredCount()} answered`
                + '</p>'
                + `<p class="lesson-eyebrow">${escapeHtml(question.type)}</p>`
                + `<p class="question-prompt">${escapeHtml(question.prompt)}</p>`
                + displayHtml
                + '<div class="question-options" role="radiogroup" aria-label="Choose an answer">'
                + optionsHtml
                + '</div>'
                + feedbackHtml
                + '</article>'
                + historyHtml()
            );

            root.querySelectorAll('input[name="negative-numbers-practice-answer"]').forEach((input) => {
                input.addEventListener('change', (event) => {
                    entry.selected = event.currentTarget.value;
                    render();
                });
            });

            window.Maths1to9Lesson
                ?.setSectionAction?.('question-bank', {
                    label: actionLabel,
                    disabled: actionDisabled,
                    onClick: () => {
                        if (action === 'check') {
                            if (entry.selected === '') {
                                return;
                            }

                            entry.checked = true;
                            entry.answered = true;
                            entry.lastAnswer = entry.selected;
                            entry.correct =
                                entry.selected === question.answer;

                            window.Maths1to9Lesson?.recordAssessment?.({
                                questionType: entry.assessmentType,
                                questionId: entry.questionId,
                                correct: entry.correct
                            });

                            render();
                            return;
                        }

                        if (action === 'retry') {
                            entry.selected = '';
                            entry.checked = false;
                            render();
                            return;
                        }

                        if (
                            state.currentIndex <
                            state.questions.length - 1
                        ) {
                            state.currentIndex += 1;
                        } else {
                            addQuestion();
                        }

                        render();
                    }
                });

            root.querySelectorAll('[data-history-index]').forEach((button) => {
                button.addEventListener('click', () => {
                    state.currentIndex = Number(button.dataset.historyIndex);
                    render();
                });
            });

        }

        addQuestion();
        render();
    }

    /* ---------- mounting ---------- */

    function mountAll() {
        const fixedRoot = document.getElementById(
            'negative-comparison-questions'
        );

        if (fixedRoot && !fixedRoot.dataset.mounted) {
            fixedRoot.dataset.mounted = 'true';
            mountFixedComparisons(fixedRoot);
        }

        const practiceRoot = document.getElementById(
            'negative-numbers-practice'
        );

        if (practiceRoot && !practiceRoot.dataset.mounted) {
            practiceRoot.dataset.mounted = 'true';
            mountInfinitePractice(practiceRoot);
        }
    }

    document.addEventListener(
        'negative-numbers:roots-ready',
        mountAll
    );

    document.addEventListener(
        'maths1to9:lesson-rendered',
        mountAll
    );

    document.addEventListener(
        'lesson:rendered',
        mountAll
    );

    const mountObserver = new MutationObserver(mountAll);
    mountObserver.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    mountAll();
})();
