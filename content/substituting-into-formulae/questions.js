(() => {
    'use strict';

    const slug = 'substituting-into-formulae';
    const completionTarget = 8;

    function gateSection(sectionId) {
        document.dispatchEvent(
            new CustomEvent(
                'maths1to9:section-gate',
                {
                    detail: { sectionId }
                }
            )
        );
    }

    function completeSection(sectionId) {
        document.dispatchEvent(
            new CustomEvent(
                'maths1to9:section-complete',
                {
                    detail: { sectionId }
                }
            )
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
        return Math.floor(
            Math.random() *
            (maximum - minimum + 1)
        ) + minimum;
    }

    function randomItem(items) {
        return items[
            randomInt(0, items.length - 1)
        ];
    }

    function shuffle(items) {
        const copy = [...items];

        for (
            let index = copy.length - 1;
            index > 0;
            index -= 1
        ) {
            const swapIndex = randomInt(
                0,
                index
            );

            [
                copy[index],
                copy[swapIndex]
            ] = [
                copy[swapIndex],
                copy[index]
            ];
        }

        return copy;
    }

    function formatNumber(value) {
        return String(value).replace(
            '-',
            '−'
        );
    }

    function normaliseNumber(value) {
        return String(value)
            .replace(/−/g, '-')
            .trim();
    }

    function slot(
        letter,
        options = {}
    ) {
        return {
            type: 'slot',
            letter,
            prefix: options.prefix || '',
            suffix: options.suffix || '',
            brackets:
                options.brackets === true
        };
    }

    function makeTiles(values, distractors) {
        const unique = [];

        [
            ...values,
            ...distractors
        ].forEach((value) => {
            const text =
                formatNumber(value);

            if (!unique.includes(text)) {
                unique.push(text);
            }
        });

        return shuffle(unique);
    }

    function makeOptions(
        correct,
        distractors
    ) {
        const unique = [];

        [
            correct,
            ...distractors
        ].forEach((value) => {
            const text = String(value);

            if (!unique.includes(text)) {
                unique.push(text);
            }
        });

        return shuffle(
            unique.slice(0, 4)
        );
    }

    function singleLetterQuestion() {
        const fixed = randomInt(3, 8);
        const coefficient = randomInt(2, 5);
        const value = randomInt(2, 7);
        const answer =
            fixed + coefficient * value;

        return {
            label: 'One letter',
            prompt:
                'Replace c with its value.',
            context:
                'A game costs a fixed amount, plus a charge for each credit.',
            formula:
                `P = ${fixed} + ${coefficient}c`,
            givens: {
                c: value
            },
            parts: [
                `P = ${fixed} + ${coefficient} × `,
                slot('c')
            ],
            tiles: makeTiles(
                [value],
                [fixed, coefficient]
            ),
            substituted:
                `P = ${fixed} + ${coefficient} × ${value}`,
            answer:
                `P = ${answer}`,
            options: makeOptions(
                `P = ${answer}`,
                [
                    `P = ${fixed + coefficient + value}`,
                    `P = ${fixed * coefficient}`,
                    `P = ${answer + coefficient}`
                ]
            ),
            explanation:
                `${coefficient} × ${value} = `
                + `${coefficient * value}. `
                + `Then add ${fixed}.`
        };
    }

    function hiddenMultiplicationQuestion() {
        const entry = randomInt(4, 9);
        const price = randomInt(2, 5);
        const snacks = randomInt(2, 7);
        const answer =
            entry + price * snacks;

        return {
            label: 'Hidden multiplication',
            prompt:
                'Replace s with its value.',
            context:
                `Entry costs £${entry}. Each snack costs £${price}.`,
            formula:
                `C = ${entry} + ${price}s`,
            givens: {
                s: snacks
            },
            parts: [
                `C = ${entry} + ${price} × `,
                slot('s')
            ],
            tiles: makeTiles(
                [snacks],
                [entry, price]
            ),
            substituted:
                `C = ${entry} + ${price} × ${snacks}`,
            answer:
                `£${answer}`,
            options: makeOptions(
                `£${answer}`,
                [
                    `£${entry + price + snacks}`,
                    `£${entry * price}`,
                    `£${answer + price}`
                ]
            ),
            explanation:
                `${price}s means ${price} × s. `
                + `The total is £${answer}.`
        };
    }

    function areaQuestion() {
        const length = randomInt(3, 10);
        const width = randomInt(2, 9);
        const answer =
            length * width;

        return {
            label: 'Two letters',
            prompt:
                'Replace l and w with their values.',
            context:
                'Find the area of a rectangle.',
            formula:
                'A = lw',
            givens: {
                l: length,
                w: width
            },
            parts: [
                'A = ',
                slot('l'),
                ' × ',
                slot('w')
            ],
            tiles: makeTiles(
                [length, width],
                [length + width, 2]
            ),
            substituted:
                `A = ${length} × ${width}`,
            answer:
                `A = ${answer} cm²`,
            options: makeOptions(
                `A = ${answer} cm²`,
                [
                    `A = ${length + width} cm²`,
                    `A = ${2 * (length + width)} cm`,
                    `A = ${answer} cm`
                ]
            ),
            explanation:
                `${length} × ${width} = ${answer}. `
                + `Area uses square units.`
        };
    }

    function perimeterQuestion() {
        const length = randomInt(4, 10);
        const width = randomInt(2, 8);
        const answer =
            2 * length + 2 * width;

        return {
            label: 'Two letters',
            prompt:
                'Replace l and w with their values.',
            context:
                'Find the perimeter of a rectangle.',
            formula:
                'P = 2l + 2w',
            givens: {
                l: length,
                w: width
            },
            parts: [
                'P = 2 × ',
                slot('l'),
                ' + 2 × ',
                slot('w')
            ],
            tiles: makeTiles(
                [length, width],
                [2, length + width]
            ),
            substituted:
                `P = 2 × ${length} + 2 × ${width}`,
            answer:
                `P = ${answer} cm`,
            options: makeOptions(
                `P = ${answer} cm`,
                [
                    `P = ${length + width} cm`,
                    `P = ${length * width} cm²`,
                    `P = ${answer} cm²`
                ]
            ),
            explanation:
                `Calculate both multiplications, `
                + `then add. Perimeter uses cm.`
        };
    }

    function repeatedLetterQuestion() {
        const x = randomInt(2, 6);
        const coefficient = randomInt(2, 5);
        const answer =
            x * x + coefficient * x;

        return {
            label: 'Repeated letter',
            prompt:
                'Replace both copies of x.',
            context:
                'The same value is used twice.',
            formula:
                `y = x² + ${coefficient}x`,
            givens: {
                x
            },
            parts: [
                'y = ',
                slot(
                    'x',
                    { suffix: '²' }
                ),
                ` + ${coefficient} × `,
                slot('x')
            ],
            tiles: makeTiles(
                [x],
                [coefficient, x * x]
            ),
            substituted:
                `y = ${x}² + ${coefficient} × ${x}`,
            answer:
                `y = ${answer}`,
            options: makeOptions(
                `y = ${answer}`,
                [
                    `y = ${x + coefficient * x}`,
                    `y = ${x * x + coefficient}`,
                    `y = ${x * x * coefficient}`
                ]
            ),
            explanation:
                `Replace every copy of x. `
                + `${x}² = ${x * x}.`
        };
    }

    function bracketQuestion() {
        const x = randomInt(2, 5);
        const inside =
            2 * x - 1;
        const answer =
            x * inside;

        return {
            label: 'Brackets',
            prompt:
                'Replace both copies of x and keep the bracket.',
            context:
                'Work inside the bracket before multiplying.',
            formula:
                'y = x(2x − 1)',
            givens: {
                x
            },
            parts: [
                'y = ',
                slot('x'),
                ' × (2 × ',
                slot('x'),
                ' − 1)'
            ],
            tiles: makeTiles(
                [x],
                [2, 1, inside]
            ),
            substituted:
                `y = ${x} × (2 × ${x} − 1)`,
            answer:
                `y = ${answer}`,
            options: makeOptions(
                `y = ${answer}`,
                [
                    `y = ${inside}`,
                    `y = ${2 * x * x - 1}`,
                    `y = ${x * (2 * x + 1)}`
                ]
            ),
            explanation:
                `Inside the bracket, `
                + `2 × ${x} − 1 = ${inside}.`
        };
    }

    function powerQuestion() {
        const length = randomInt(3, 8);
        const height = randomItem(
            [6, 9, 12, 15, 18, 21, 24]
        );
        const answer =
            length * length * height / 3;

        return {
            label: 'Power',
            prompt:
                'Replace l and h. Keep the square on l.',
            context:
                'Find the volume of a pyramid.',
            formula:
                'V = l²h ÷ 3',
            givens: {
                l: length,
                h: height
            },
            parts: [
                'V = ',
                slot(
                    'l',
                    { suffix: '²' }
                ),
                ' × ',
                slot('h'),
                ' ÷ 3'
            ],
            tiles: makeTiles(
                [length, height],
                [3, length * length]
            ),
            substituted:
                `V = ${length}² × ${height} ÷ 3`,
            answer:
                `V = ${answer} cm³`,
            options: makeOptions(
                `V = ${answer} cm³`,
                [
                    `V = ${length * height / 3} cm³`,
                    `V = ${answer} cm`,
                    `V = ${length * length * height} cm³`
                ]
            ),
            explanation:
                `l² becomes ${length}². `
                + `Volume uses cubic units.`
        };
    }

    function negativeQuestion() {
        const coefficient = randomInt(2, 5);
        const constant = randomInt(5, 12);
        const n = -randomInt(2, 5);
        const answer =
            coefficient * n + constant;

        return {
            label: 'Negative value',
            prompt:
                'Replace n and keep its negative sign.',
            context:
                'A negative value goes inside brackets.',
            formula:
                `m = ${coefficient}n + ${constant}`,
            givens: {
                n
            },
            parts: [
                `m = ${coefficient} × `,
                slot(
                    'n',
                    { brackets: true }
                ),
                ` + ${constant}`
            ],
            tiles: makeTiles(
                [n],
                [Math.abs(n), coefficient, constant]
            ),
            substituted:
                `m = ${coefficient} × (${formatNumber(n)}) + ${constant}`,
            answer:
                `m = ${answer}`,
            options: makeOptions(
                `m = ${answer}`,
                [
                    `m = ${coefficient * Math.abs(n) + constant}`,
                    `m = ${coefficient + n + constant}`,
                    `m = ${answer - constant}`
                ]
            ),
            explanation:
                `Keep ${formatNumber(n)} inside brackets. `
                + `${coefficient} × (${formatNumber(n)}) `
                + `is ${formatNumber(coefficient * n)}.`
        };
    }

    function negativePowerQuestion() {
        const x = -randomInt(2, 5);
        const coefficient = randomInt(2, 4);
        const answer =
            x * x + coefficient * x;

        return {
            label: 'Negative value and a power',
            prompt:
                'Replace both copies of x. Use brackets.',
            context:
                'The brackets keep the negative sign with the number.',
            formula:
                `y = x² + ${coefficient}x`,
            givens: {
                x
            },
            parts: [
                'y = ',
                slot(
                    'x',
                    {
                        suffix: '²',
                        brackets: true
                    }
                ),
                ` + ${coefficient} × `,
                slot(
                    'x',
                    { brackets: true }
                )
            ],
            tiles: makeTiles(
                [x],
                [Math.abs(x), coefficient, x * x]
            ),
            substituted:
                `y = (${formatNumber(x)})² + `
                + `${coefficient} × (${formatNumber(x)})`,
            answer:
                `y = ${answer}`,
            options: makeOptions(
                `y = ${answer}`,
                [
                    `y = ${-(x * x) + coefficient * x}`,
                    `y = ${x * x + coefficient * Math.abs(x)}`,
                    `y = ${x + coefficient * x}`
                ]
            ),
            explanation:
                `(${formatNumber(x)})² = ${x * x}. `
                + `Keep the sign in both replacements.`
        };
    }

    function divisionQuestion() {
        const time = randomInt(2, 6);
        const speed = randomInt(8, 25);
        const distance =
            time * speed;

        return {
            label: 'Division',
            prompt:
                'Replace d and t with their values.',
            context:
                'Speed equals distance divided by time.',
            formula:
                'v = d ÷ t',
            givens: {
                d: distance,
                t: time
            },
            parts: [
                'v = ',
                slot('d'),
                ' ÷ ',
                slot('t')
            ],
            tiles: makeTiles(
                [distance, time],
                [speed, distance + time]
            ),
            substituted:
                `v = ${distance} ÷ ${time}`,
            answer:
                `v = ${speed} mph`,
            options: makeOptions(
                `v = ${speed} mph`,
                [
                    `v = ${distance * time} mph`,
                    `v = ${distance - time} mph`,
                    `v = ${speed} miles`
                ]
            ),
            explanation:
                `${distance} ÷ ${time} = ${speed}.`
        };
    }

    const generators = [
        singleLetterQuestion,
        hiddenMultiplicationQuestion,
        areaQuestion,
        perimeterQuestion,
        repeatedLetterQuestion,
        bracketQuestion,
        powerQuestion,
        negativeQuestion,
        negativePowerQuestion,
        divisionQuestion
    ];

    function mountPractice(root) {
        if (!root || root.dataset.mounted) {
            return;
        }

        root.dataset.mounted = 'true';

        gateSection('question-bank');

        const state = {
            questionIndex: 0,
            question: null,
            questionId: '',
            placements: [],
            selectedTile: '',
            phase: 'replace',
            feedback: '',
            selectedAnswer: '',
            correctCount: 0,
            completed: false,
            history: []
        };

        function newQuestion() {
            const generator =
                state.questionIndex <
                generators.length
                    ? generators[
                        state.questionIndex
                    ]
                    : randomItem(generators);

            state.question = generator();
            state.questionId =
                `question-bank:${state.questionIndex + 1}`;
            state.placements = Array(
                state.question.parts.filter(
                    (part) => (
                        part &&
                        typeof part === 'object' &&
                        part.type === 'slot'
                    )
                ).length
            ).fill(null);

            state.selectedTile = '';
            state.phase = 'replace';
            state.feedback = '';
            state.selectedAnswer = '';
            state.questionIndex += 1;

            render();
        }

        function slots() {
            return state.question.parts.filter(
                (part) => (
                    part &&
                    typeof part === 'object' &&
                    part.type === 'slot'
                )
            );
        }

        function expectedValue(index) {
            return normaliseNumber(
                state.question.givens[
                    slots()[index].letter
                ]
            );
        }

        function replacementCorrect() {
            return state.placements.every(
                (value, index) => (
                    value !== null &&
                    normaliseNumber(value) ===
                    expectedValue(index)
                )
            );
        }

        function allFilled() {
            return state.placements.every(
                (value) => value !== null
            );
        }

        function displayPlacedValue(
            slotData,
            value
        ) {
            const displayed =
                formatNumber(value);

            return (
                slotData.brackets
                    ? `(${displayed})`
                    : displayed
            ) + slotData.suffix;
        }

        function formulaHtml() {
            let slotIndex = 0;

            return state.question.parts.map(
                (part) => {
                    if (
                        typeof part === 'string'
                    ) {
                        return escapeHtml(part);
                    }

                    const currentIndex =
                        slotIndex;

                    slotIndex += 1;

                    const value =
                        state.placements[
                            currentIndex
                        ];

                    let className =
                        'button';

                    if (
                        state.phase ===
                        'replace-wrong' &&
                        value !== null
                    ) {
                        className += (
                            normaliseNumber(value) ===
                            expectedValue(
                                currentIndex
                            )
                                ? ' is-correct'
                                : ' is-incorrect'
                        );
                    }

                    const text =
                        value === null
                            ? part.letter +
                                part.suffix
                            : displayPlacedValue(
                                part,
                                value
                            );

                    return `
                        <button
                            class="${className}"
                            type="button"
                            data-slot="${currentIndex}"
                        >
                            ${escapeHtml(text)}
                        </button>
                    `;
                }
            ).join('');
        }

        function givenHtml() {
            return Object.entries(
                state.question.givens
            ).map(([letter, value]) => `
                <span class="lx2-chip">
                    ${escapeHtml(letter)}
                    =
                    ${escapeHtml(
                        formatNumber(value)
                    )}
                </span>
            `).join('');
        }

        function tilesHtml() {
            return state.question.tiles.map(
                (tile) => `
                    <button
                        class="lx2-chip lx2-chip--value ${
                            state.selectedTile === tile
                                ? 'is-armed'
                                : ''
                        }"
                        type="button"
                        draggable="true"
                        data-tile="${escapeHtml(tile)}"
                    >
                        ${escapeHtml(tile)}
                    </button>
                `
            ).join('');
        }

        function optionsHtml() {
            if (
                state.phase !== 'calculate' &&
                state.phase !== 'answer-wrong' &&
                state.phase !== 'complete'
            ) {
                return '';
            }

            return `
                <div class="worked-example">
                    <p class="question-prompt">
                        Calculate the number-only expression.
                    </p>

                    <p class="lx2-formula">
                        ${escapeHtml(
                            state.question.substituted
                        )}
                    </p>

                    <div class="question-options">
                        ${state.question.options.map(
                            (option) => {
                                let className =
                                    'question-option';

                                if (
                                    state.phase ===
                                    'answer-wrong'
                                ) {
                                    if (
                                        option ===
                                        state.question.answer
                                    ) {
                                        className +=
                                            ' is-correct-answer';
                                    }

                                    if (
                                        option ===
                                        state.selectedAnswer
                                    ) {
                                        className +=
                                            ' is-incorrect';
                                    }
                                }

                                if (
                                    state.phase ===
                                    'complete' &&
                                    option ===
                                    state.question.answer
                                ) {
                                    className +=
                                        ' is-correct';
                                }

                                return `
                                    <label
                                        class="${className}"
                                    >
                                        <input
                                            type="radio"
                                            name="substitution-answer"
                                            value="${escapeHtml(option)}"
                                            ${
                                                state.selectedAnswer ===
                                                option
                                                    ? 'checked'
                                                    : ''
                                            }
                                            ${
                                                state.phase ===
                                                'complete'
                                                    ? 'disabled'
                                                    : ''
                                            }
                                        >

                                        <span>
                                            ${escapeHtml(option)}
                                        </span>
                                    </label>
                                `;
                            }
                        ).join('')}
                    </div>
                </div>
            `;
        }

        function feedbackHtml() {
            if (state.feedback === '') {
                return '';
            }

            const correct =
                state.phase ===
                    'replace-correct' ||
                state.phase ===
                    'complete';

            return `
                <div
                    class="
                        question-feedback
                        is-visible
                        ${
                            correct
                                ? 'is-correct'
                                : 'is-incorrect'
                        }
                    "
                >
                    ${escapeHtml(
                        state.feedback
                    )}
                </div>
            `;
        }

        function actionConfig() {
            if (state.phase === 'replace') {
                return {
                    label:
                        'Check substitution',
                    disabled: !allFilled(),
                    action: 'check-replace'
                };
            }

            if (
                state.phase ===
                'replace-wrong'
            ) {
                return {
                    label: 'Try again',
                    disabled: false,
                    action: 'retry-replace'
                };
            }

            if (
                state.phase ===
                'replace-correct'
            ) {
                return {
                    label: 'Continue',
                    disabled: false,
                    action: 'continue'
                };
            }

            if (state.phase === 'calculate') {
                return {
                    label: 'Check answer',
                    disabled:
                        state.selectedAnswer === '',
                    action: 'check-answer'
                };
            }

            if (
                state.phase ===
                'answer-wrong'
            ) {
                return {
                    label: 'Try again',
                    disabled: false,
                    action: 'retry-answer'
                };
            }

            return {
                label: 'Next question',
                disabled: false,
                action: 'next'
            };
        }

        function historyHtml() {
            if (
                state.history.length === 0
            ) {
                return '';
            }

            return `
                <details class="question-history">
                    <summary class="button">
                        Previous questions
                        (${state.history.length})
                    </summary>

                    <div class="worked-example-list">
                        ${[...state.history]
                            .reverse()
                            .map((entry) => `
                                <article class="worked-example">
                                    <p class="worked-example__number">
                                        ${escapeHtml(entry.label)}
                                    </p>

                                    <h3 class="worked-example__title">
                                        ${escapeHtml(entry.formula)}
                                    </h3>

                                    <ol class="worked-example__steps">
                                        <li>
                                            ${escapeHtml(entry.substituted)}
                                        </li>
                                        <li>
                                            ${escapeHtml(entry.answer)}
                                        </li>
                                    </ol>
                                </article>
                            `).join('')}
                    </div>
                </details>
            `;
        }

        function render() {
            const action =
                actionConfig();

            root.innerHTML = `
                <article class="question-card">
                    <p class="question-number">
                        Question ${state.questionIndex}
                        · ${state.correctCount} correct
                    </p>

                    <p class="lesson-eyebrow">
                        ${escapeHtml(
                            state.question.label
                        )}
                    </p>

                    <h3 class="worked-example__title">
                        ${escapeHtml(
                            state.question.prompt
                        )}
                    </h3>

                    <p>
                        ${escapeHtml(
                            state.question.context
                        )}
                    </p>

                    <p class="lx2-formula">
                        ${escapeHtml(
                            state.question.formula
                        )}
                    </p>

                    <div class="lx2-chip-row">
                        ${givenHtml()}
                    </div>

                    <p class="question-prompt">
                        Drag each value into its letter space.
                        You can also tap a value and then tap a space.
                    </p>

                    <div class="lx2-formula">
                        ${formulaHtml()}
                    </div>

                    <div class="lx2-chip-row">
                        ${tilesHtml()}
                    </div>

                    ${optionsHtml()}
                    ${feedbackHtml()}
                </article>

                ${historyHtml()}
            `;

            const actionButton =
                document.createElement('button');

            actionButton.type = 'button';
            actionButton.dataset.action = action.action;
            actionButton.textContent = action.label;
            actionButton.disabled = action.disabled;

            bindHandlers(actionButton);

            window.Maths1to9Lesson
                ?.useButtonAsSectionAction?.(
                    'question-bank',
                    actionButton
                );
        }

        function placeValue(
            slotIndex,
            value
        ) {
            if (
                state.phase !== 'replace' &&
                state.phase !==
                    'replace-wrong'
            ) {
                return;
            }

            state.placements[
                slotIndex
            ] = value;

            state.selectedTile = '';
            state.phase = 'replace';
            state.feedback = '';

            render();
        }

        function bindHandlers(actionButton) {
            root.querySelectorAll(
                '[data-tile]'
            ).forEach((tile) => {
                const value =
                    tile.dataset.tile;

                tile.addEventListener(
                    'click',
                    () => {
                        state.selectedTile =
                            state.selectedTile ===
                            value
                                ? ''
                                : value;

                        render();
                    }
                );

                tile.addEventListener(
                    'dragstart',
                    (event) => {
                        event.dataTransfer
                            .setData(
                                'text/plain',
                                value
                            );
                    }
                );
            });

            root.querySelectorAll(
                '[data-slot]'
            ).forEach((slotElement) => {
                const slotIndex = Number(
                    slotElement.dataset.slot
                );

                slotElement.addEventListener(
                    'click',
                    () => {
                        if (
                            state.selectedTile !== ''
                        ) {
                            placeValue(
                                slotIndex,
                                state.selectedTile
                            );
                        } else if (
                            state.placements[
                                slotIndex
                            ] !== null
                        ) {
                            state.placements[
                                slotIndex
                            ] = null;

                            state.phase = 'replace';
                            state.feedback = '';

                            render();
                        }
                    }
                );

                slotElement.addEventListener(
                    'dragover',
                    (event) => {
                        event.preventDefault();
                    }
                );

                slotElement.addEventListener(
                    'drop',
                    (event) => {
                        event.preventDefault();

                        placeValue(
                            slotIndex,
                            event.dataTransfer
                                .getData(
                                    'text/plain'
                                )
                        );
                    }
                );
            });

            root.querySelectorAll(
                'input[name="substitution-answer"]'
            ).forEach((input) => {
                input.addEventListener(
                    'change',
                    (event) => {
                        state.selectedAnswer =
                            event.currentTarget
                                .value;

                        if (
                            state.phase ===
                            'answer-wrong'
                        ) {
                            state.phase =
                                'calculate';
                            state.feedback = '';
                        }

                        render();
                    }
                );
            });

            actionButton.addEventListener(
                'click',
                (event) => {
                    const action =
                        event.currentTarget
                            .dataset.action;

                    if (
                        action ===
                        'check-replace'
                    ) {
                        const correct = replacementCorrect();

                        window.Maths1to9Lesson?.recordAssessment?.({
                            questionType: 'replace-values',
                            questionId: state.questionId,
                            correct
                        });

                        if (correct) {
                            state.phase =
                                'replace-correct';

                            state.feedback =
                                'Correct. Every letter has been replaced.';
                        } else {
                            state.phase =
                                'replace-wrong';

                            state.feedback =
                                'Not quite. Check which value belongs to each letter.';
                        }

                        render();
                        return;
                    }

                    if (
                        action ===
                        'retry-replace'
                    ) {
                        state.placements =
                            state.placements.map(
                                (value, index) => (
                                    value !== null &&
                                    normaliseNumber(
                                        value
                                    ) ===
                                    expectedValue(
                                        index
                                    )
                                        ? value
                                        : null
                                )
                            );

                        state.phase =
                            'replace';

                        state.feedback = '';
                        render();
                        return;
                    }

                    if (
                        action ===
                        'continue'
                    ) {
                        state.phase =
                            'calculate';

                        state.feedback = '';
                        render();
                        return;
                    }

                    if (
                        action ===
                        'check-answer'
                    ) {
                        if (
                            state.selectedAnswer ===
                            state.question.answer
                        ) {
                            state.phase =
                                'complete';

                            state.feedback =
                                state.question
                                    .explanation;

                            state.correctCount += 1;

                            state.history.push({
                                label:
                                    state.question.label,
                                formula:
                                    state.question.formula,
                                substituted:
                                    state.question
                                        .substituted,
                                answer:
                                    state.question.answer
                            });

                            if (
                                !state.completed &&
                                state.correctCount >=
                                completionTarget
                            ) {
                                state.completed = true;

                                completeSection(
                                    'question-bank'
                                );
                            }
                        } else {
                            state.phase =
                                'answer-wrong';

                            state.feedback =
                                state.question
                                    .explanation;
                        }

                        render();
                        return;
                    }

                    if (
                        action ===
                        'retry-answer'
                    ) {
                        state.phase =
                            'calculate';

                        state.selectedAnswer =
                            '';

                        state.feedback = '';
                        render();
                        return;
                    }

                    if (
                        action === 'next'
                    ) {
                        newQuestion();
                    }
                }
            );
        }

        newQuestion();
    }

    function mountAll() {
        const root =
            document.getElementById(
                `${slug}-questions`
            );

        if (
            root &&
            !root.dataset.mounted
        ) {
            mountPractice(root);
        }
    }

    document.addEventListener(
        'maths1to9:lesson-rendered',
        mountAll
    );

    document.addEventListener(
        'lesson:rendered',
        mountAll
    );

    mountAll();
})();
