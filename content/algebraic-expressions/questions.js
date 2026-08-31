(() => {
    'use strict';

    /*
     * Question bank for "Writing algebraic expressions".
     *
     * One skill only: translating words and situations into an
     * algebraic expression, with correct notation. No solving,
     * no substitution, no simplifying.
     *
     * Structure follows the existing working banks (place-value,
     * negative-numbers): the lesson engine renders the
     * `<slug>-questions` mount point and fires
     * maths1to9:lesson-rendered; this script mounts one current
     * question at a time and drives Check / Try again / Next
     * question through the shared footer via
     * Maths1to9Lesson.setSectionAction(). Skill ids live only in
     * lesson.json (assessment.question_types); this file emits
     * the generator name as questionType. Recording an attempt
     * is delegated entirely to Maths1to9Lesson.recordAssessment().
     */

    const ROOT_ID = 'algebraic-expressions-questions';
    const SECTION_ID = 'question-bank';
    const mounted = new WeakSet();

    /*
     * The lesson's "Finish lesson" button stays locked until this
     * many different questions have been checked.
     */
    const QUESTIONS_TO_COMPLETE = 3;

    const MINUS = '−';
    const TIMES = '×';

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

            [copy[index], copy[swapIndex]] =
                [copy[swapIndex], copy[index]];
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

    /*
     * Build the answer list: the correct label first, then
     * distractors as [label, feedback]. Duplicate labels are
     * dropped, so every generator supplies distinct values.
     */
    function buildOptions(correctLabel, wrongs) {
        const seen = new Set([correctLabel]);
        const options = [
            { label: correctLabel, correct: true, feedback: '' }
        ];

        for (const [label, feedback] of wrongs) {
            if (seen.has(label)) {
                continue;
            }

            seen.add(label);
            options.push({ label, correct: false, feedback });

            if (options.length === 4) {
                break;
            }
        }

        return shuffle(options);
    }

    function make({ type, prompt, display = '', correct, wrongs, explanation }) {
        return {
            type,
            prompt,
            display,
            answerLabel: String(correct),
            options: buildOptions(String(correct), wrongs),
            explanation
        };
    }

    const TIMES_WORDS = {
        2: 'twice',
        3: 'three times',
        4: 'four times',
        5: 'five times'
    };

    /* 1. Multiplying a variable ---------------------------------- */

    function multiplyVariable() {
        const setups = [
            { a: 'Sam', b: 'Amir', noun: 'coins', letter: 'c' },
            { a: 'Priya', b: 'Leah', noun: 'points', letter: 'p' },
            { a: 'Josh', b: 'Dan', noun: 'cards', letter: 'd' },
            { a: 'Mia', b: 'Kai', noun: 'goals', letter: 'g' },
            { a: 'Ella', b: 'Theo', noun: 'songs', letter: 's' }
        ];

        const setup = randomItem(setups);
        const k = randomItem([2, 3, 4, 5]);
        const word = TIMES_WORDS[k];
        const { a, b, noun, letter } = setup;

        return make({
            type: 'Multiply a variable',
            prompt:
                `${a} has ${word} as many ${noun} as ${b}. ` +
                `${b} has ${letter} ${noun}. ` +
                `Write an expression for the number of ${noun} ${a} has.`,
            correct: `${k}${letter}`,
            wrongs: [
                [
                    `${letter} + ${k}`,
                    `Adding ${k} would give ${a} just ${k} more ${noun}. ` +
                    `"${word} as many" means multiply ${letter} by ${k}.`
                ],
                [
                    `${letter}${k}`,
                    `In algebra the number is written before the letter, ` +
                    `so this should be ${k}${letter}.`
                ],
                [
                    `${k} ${MINUS} ${letter}`,
                    `${a} has more ${noun} than ${b}, not fewer, ` +
                    `and the letter stands for a number, so multiply: ${k}${letter}.`
                ],
                [
                    `${k} + ${letter}`,
                    `"${word} as many" means ${k} lots of ${letter}, ` +
                    `which is ${k}${letter}, not ${k} + ${letter}.`
                ]
            ],
            explanation:
                `"${word} as many" as ${letter} means ${k} ${TIMES} ${letter}, ` +
                `written ${k}${letter}.`
        });
    }

    /* 2. Adding or subtracting a fixed amount ------------------- */

    function addFixedAmount() {
        const mode = randomItem(['add', 'subtract']);

        if (mode === 'add') {
            const setups = [
                { who: 'A football team', letter: 't', unit: 'points' },
                { who: 'A song', letter: 'r', unit: 'streams' },
                { who: 'Aisha', letter: 'v', unit: 'video views' }
            ];
            const setup = randomItem(setups);
            const n = randomItem([3, 5, 6, 8, 10]);
            const { who, letter, unit } = setup;

            return make({
                type: 'Add a fixed amount',
                prompt:
                    `${who} has ${letter} ${unit}. ` +
                    `Then ${n} more ${unit} are added. ` +
                    `Write an expression for the new total.`,
                correct: `${letter} + ${n}`,
                wrongs: [
                    [
                        `${n}${letter}`,
                        `"${n} more" means add ${n} once. ` +
                        `${n}${letter} would mean ${n} lots of ${letter}.`
                    ],
                    [
                        `${letter} ${MINUS} ${n}`,
                        `The total goes up by ${n}, so use +, not ${MINUS}.`
                    ],
                    [
                        `${n} ${MINUS} ${letter}`,
                        `Start from the ${letter} ${unit} already there ` +
                        `and add ${n}: ${letter} + ${n}.`
                    ]
                ],
                explanation:
                    `Start with ${letter} and gain ${n} more, ` +
                    `so the total is ${letter} + ${n}.`
            });
        }

        const setups = [
            { letter: 'm', unit: 'pounds', act: 'spend' },
            { letter: 'k', unit: 'pounds', act: 'give away' },
            { letter: 'w', unit: 'sweets', act: 'eat' }
        ];
        const setup = randomItem(setups);
        const n = randomItem([2, 3, 4, 5, 7]);
        const { letter, unit, act } = setup;

        return make({
            type: 'Subtract a fixed amount',
            prompt:
                `You have ${letter} ${unit}. You ${act} ${n} ${unit}. ` +
                `Write an expression for how many ${unit} are left.`,
            correct: `${letter} ${MINUS} ${n}`,
            wrongs: [
                [
                    `${n} ${MINUS} ${letter}`,
                    `This is ${n} take away the ${unit}, the wrong way round. ` +
                    `Start from ${letter} and take ${n} away: ${letter} ${MINUS} ${n}.`
                ],
                [
                    `${letter} + ${n}`,
                    `Losing ${n} ${unit} makes the amount smaller, ` +
                    `so use ${MINUS}, not +.`
                ],
                [
                    `${n}${letter}`,
                    `${n} ${unit} are removed once. Subtract ${n}; ` +
                    `do not multiply by ${n}.`
                ]
            ],
            explanation:
                `Start with ${letter} and take ${n} away, ` +
                `giving ${letter} ${MINUS} ${n}. Order matters here.`
        });
    }

    /* 3. Two-step expressions (e.g. 3p + 5) --------------------- */

    function twoStep() {
        const setups = [
            { start: 'Miguel', mid: 'Adam', end: 'Josh', noun: 'songs', letter: 'p' },
            { start: 'Ravi', mid: 'Beth', end: 'Cara', noun: 'points', letter: 'q' },
            { start: 'Omar', mid: 'Lily', end: 'Zed', noun: 'coins', letter: 'w' }
        ];
        const setup = randomItem(setups);
        const k = randomItem([2, 3, 4]);
        const n = randomItem([5, 6, 10, 20, 30]);
        const { start, mid, end, noun, letter } = setup;

        return make({
            type: 'Two-step expression',
            prompt:
                `${start} has ${letter} ${noun}. ` +
                `${mid} has ${TIMES_WORDS[k]} as many ${noun} as ${start}. ` +
                `${end} has ${n} more ${noun} than ${mid}. ` +
                `Write an expression for the number of ${noun} ${end} has.`,
            correct: `${k}${letter} + ${n}`,
            wrongs: [
                [
                    `${k}${letter}`,
                    `That is how many ${noun} ${mid} has. ` +
                    `${end} has ${n} more than ${mid}, so add ${n}.`
                ],
                [
                    `${letter} + ${n}`,
                    `You skipped the "${TIMES_WORDS[k]} as many" step. ` +
                    `${mid} has ${k}${letter}, then ${end} has ${n} more.`
                ],
                [
                    `${k + n}${letter}`,
                    `Do not add ${k} and ${n}. ${k} multiplies ${letter}; ` +
                    `${n} is added on afterwards: ${k}${letter} + ${n}.`
                ],
                [
                    `${n}${letter} + ${k}`,
                    `The numbers are the wrong way round. ${k} is the multiplier ` +
                    `and ${n} is added on.`
                ]
            ],
            explanation:
                `${mid} has ${k}${letter} ${noun}. ${end} has ${n} more, ` +
                `so ${end} has ${k}${letter} + ${n}.`
        });
    }

    /* 4. Correct algebraic notation ---------------------------- */

    function notation() {
        const k = randomItem([2, 3, 4, 5, 6]);
        const letter = randomItem(['n', 'x', 'y', 'a', 'p', 't']);

        return make({
            type: 'Correct notation',
            prompt:
                `Which of these is the correct way to write ` +
                `"${k} lots of ${letter}" in algebra?`,
            correct: `${k}${letter}`,
            wrongs: [
                [
                    `${k} × ${letter}`,
                    `This has the right value, but in algebra we do not ` +
                    `write the × sign. Write ${k}${letter}.`
                ],
                [
                    `${letter}${k}`,
                    `The number is written before the letter, ` +
                    `so this should be ${k}${letter}.`
                ],
                [
                    `${letter} + ${k}`,
                    `"${k} lots of ${letter}" means ${letter} multiplied by ${k}. ` +
                    `${letter} + ${k} means ${k} added to ${letter}.`
                ],
                [
                    `${letter} ÷ ${k}`,
                    `That means ${letter} shared into ${k} parts, not ${k} lots of ${letter}.`
                ]
            ],
            explanation:
                `A number written next to a letter means multiply, ` +
                `with the number first: ${k}${letter} means ${k} × ${letter}.`
        });
    }

    /* 5. Order-sensitive situations (x - 7 vs 7 - x) ----------- */

    function orderSensitive() {
        const setups = [
            { who: 'Tom', letter: 'n', noun: 'sweets', act: 'gives away' },
            { who: 'Sara', letter: 'b', noun: 'stickers', act: 'uses' },
            { who: 'Leo', letter: 'h', noun: 'chips', act: 'eats' }
        ];
        const setup = randomItem(setups);
        const n = randomItem([4, 5, 6, 7, 9]);
        const { who, letter, noun, act } = setup;

        return make({
            type: 'Order matters',
            prompt:
                `${who} has ${letter} ${noun}. ${who} ${act} ${n} of them. ` +
                `Write an expression for how many ${noun} ${who} has left.`,
            correct: `${letter} ${MINUS} ${n}`,
            wrongs: [
                [
                    `${n} ${MINUS} ${letter}`,
                    `This means ${n} take away ${who}'s ${noun}, the wrong way round. ` +
                    `${who} starts with ${letter} and loses ${n}.`
                ],
                [
                    `${letter} + ${n}`,
                    `${who} loses ${noun}, so the number goes down. Use ${MINUS}, not +.`
                ],
                [
                    `${n}${letter}`,
                    `${who} removes ${n} ${noun} once. Subtract ${n}; do not multiply.`
                ]
            ],
            explanation:
                `${who} starts with ${letter} and ${n} are taken away, ` +
                `so ${letter} ${MINUS} ${n}. ${n} ${MINUS} ${letter} would be the other way round.`
        });
    }

    /* 6. Match the story to an expression --------------------- */

    function matchStory() {
        const setups = [
            { item: 'song', letter: 's', many: 'songs', fee: 'membership fee' },
            { item: 'burger', letter: 'b', many: 'burgers', fee: 'delivery charge' },
            { item: 'game', letter: 'g', many: 'games', fee: 'entry fee' }
        ];
        const setup = randomItem(setups);
        const k = randomItem([2, 3, 4]);
        const n = randomItem([2, 3, 5]);
        const { item, letter, many, fee } = setup;

        return make({
            type: 'Match the story',
            prompt:
                `One ${item} costs £${letter}. ` +
                `A person buys ${k} ${many} and pays a £${n} ${fee} once. ` +
                `Which expression gives the total cost in pounds?`,
            correct: `${k}${letter} + ${n}`,
            wrongs: [
                [
                    `${k}${letter}`,
                    `That is only the cost of the ${many}. Add the £${n} ${fee}.`
                ],
                [
                    `${letter} + ${n}`,
                    `${k} ${many} are bought, so the ${item} cost is ${k}${letter}, not ${letter}.`
                ],
                [
                    `${k}(${letter} + ${n})`,
                    `The £${n} ${fee} is paid once, not once per ${item}. ` +
                    `Add it after multiplying: ${k}${letter} + ${n}.`
                ],
                [
                    `${k + n}${letter}`,
                    `Do not add ${k} and ${n}. ${n} is a fixed charge in pounds, ` +
                    `not extra ${many}.`
                ]
            ],
            explanation:
                `${k} ${many} cost ${k}${letter} pounds. The £${n} ${fee} is added once, ` +
                `giving ${k}${letter} + ${n}.`
        });
    }

    /* 7. Spot the mistake ------------------------------------- */

    function spotMistake() {
        const variant = randomItem(['orderWrong', 'addVsMultiply', 'foundMore']);

        if (variant === 'orderWrong') {
            const k = randomItem([3, 4, 5, 6]);
            const letter = randomItem(['p', 'g', 'b']);

            return make({
                type: 'Spot the mistake',
                prompt:
                    `Leah writes the cost of ${k} pens at £${letter} each as ${letter}${k}. ` +
                    `What is the mistake?`,
                correct:
                    `The number is written before the letter: it should be ${k}${letter}.`,
                wrongs: [
                    [
                        `There is no mistake; ${letter}${k} is correct.`,
                        `In algebra the number goes first, so ${k} pens at £${letter} ` +
                        `each is ${k}${letter}.`
                    ],
                    [
                        `It should be ${letter} + ${k}.`,
                        `${k} pens at £${letter} each means ${k} × ${letter} = ${k}${letter}, ` +
                        `not ${letter} + ${k}.`
                    ],
                    [
                        `It should be ${k} ${MINUS} ${letter}.`,
                        `Buying ${k} pens means multiplying by ${k}, not subtracting.`
                    ]
                ],
                explanation:
                    `${k} lots of ${letter} is written with the number first: ${k}${letter}.`
            });
        }

        if (variant === 'addVsMultiply') {
            const letter = randomItem(['x', 'n', 'y']);

            return make({
                type: 'Spot the mistake',
                prompt:
                    `Aran says that "${letter} add 3" can be written as 3${letter}. ` +
                    `What is the mistake?`,
                correct:
                    `3${letter} means 3 lots of ${letter}. "${letter} add 3" is ${letter} + 3.`,
                wrongs: [
                    [
                        `There is no mistake; they are the same.`,
                        `They are different. If ${letter} = 5, then ${letter} + 3 = 8 ` +
                        `but 3${letter} = 15.`
                    ],
                    [
                        `It should be ${letter}3.`,
                        `We do not write ${letter}3. "${letter} add 3" is ${letter} + 3.`
                    ],
                    [
                        `It should be ${letter} ${MINUS} 3.`,
                        `"add 3" means + 3, not ${MINUS} 3.`
                    ]
                ],
                explanation:
                    `Putting a number in front of a letter means multiply, ` +
                    `so 3${letter} is not the same as ${letter} + 3.`
            });
        }

        const letter = randomItem(['m', 'c', 'k']);
        const n = randomItem([4, 5, 6]);

        return make({
            type: 'Spot the mistake',
            prompt:
                `Sam has ${letter} marbles and finds ${n} more. ` +
                `Sam writes the total as ${n}${letter}. What is the mistake?`,
            correct:
                `${n}${letter} means ${n} lots of ${letter}. Finding ${n} more is ${letter} + ${n}.`,
            wrongs: [
                [
                    `Nothing is wrong.`,
                    `Finding ${n} more gives ${letter} + ${n}. ${n}${letter} would be ` +
                    `${n} times as many marbles.`
                ],
                [
                    `It should be ${letter} ${MINUS} ${n}.`,
                    `Finding more marbles increases the total, so add.`
                ],
                [
                    `It should be ${n} + ${letter} + ${n}.`,
                    `Sam finds ${n} extra marbles once. The total is ${letter} + ${n}.`
                ]
            ],
            explanation:
                `"${n} more" is added once, so the total is ${letter} + ${n}, not ${n}${letter}.`
        });
    }

    const generators = {
        multiplyVariable,
        addFixedAmount,
        twoStep,
        notation,
        orderSensitive,
        matchStory,
        spotMistake
    };

    /*
     * Light progression: gentler translation types first, the
     * notation-check and spot-the-mistake types once a few
     * questions are done, then everything.
     */
    function pool(questionNumber) {
        if (questionNumber <= 2) {
            return ['multiplyVariable', 'addFixedAmount'];
        }

        if (questionNumber <= 4) {
            return [
                'multiplyVariable',
                'addFixedAmount',
                'notation',
                'orderSensitive'
            ];
        }

        if (questionNumber <= 6) {
            return [
                'addFixedAmount',
                'twoStep',
                'orderSensitive',
                'matchStory'
            ];
        }

        if (questionNumber <= 8) {
            return ['twoStep', 'notation', 'matchStory', 'spotMistake'];
        }

        return Object.keys(generators);
    }

    function mount(root) {
        if (!root || mounted.has(root)) {
            return;
        }

        mounted.add(root);
        root.dataset.mounted = 'true';
        gateSection(SECTION_ID);

        const state = {
            run:
                `${Date.now().toString(36)}-` +
                Math.random().toString(36).slice(2, 8),
            number: 0,
            answered: 0,
            correct: 0,
            firstTryCorrect: 0,
            completed: false,
            finished: false,
            practised: {},
            bag: [],
            lastType: '',
            entry: null
        };

        function nextType() {
            const upcoming = state.number;

            if (state.bag.length === 0) {
                state.bag = shuffle(pool(upcoming));
            }

            let type = state.bag.pop();

            if (type === state.lastType && state.bag.length > 0) {
                state.bag.unshift(type);
                type = state.bag.pop();
            }

            state.lastType = type;

            return type;
        }

        function addQuestion() {
            state.number += 1;

            const type = nextType();

            state.entry = {
                type,
                question: generators[type](),
                questionId:
                    `${SECTION_ID}:${state.run}:${state.number}`,
                selected: '',
                checked: false,
                correct: false,
                countedAnswer: false,
                countedCorrect: false
            };

            render();
        }

        function render() {
            if (state.finished) {
                return;
            }

            const entry = state.entry;
            const question = entry.question;
            const isCorrect =
                entry.checked && entry.selected === question.answerLabel;

            const optionsHtml = question.options.map((option, index) => {
                let className = 'question-option';

                if (entry.checked) {
                    if (option.label === question.answerLabel) {
                        className += ' is-correct-answer';
                    }

                    if (option.label === entry.selected) {
                        className += option.correct
                            ? ' is-correct'
                            : ' is-incorrect';
                    }
                }

                const inputId = `${ROOT_ID}-q${state.number}-o${index}`;

                return (
                    `<label class="${className}" for="${inputId}">` +
                    `<input type="radio" id="${inputId}" ` +
                    `name="${ROOT_ID}-answer" ` +
                    `value="${escapeHtml(option.label)}"` +
                    (entry.selected === option.label ? ' checked' : '') +
                    (entry.checked ? ' disabled' : '') +
                    '>' +
                    `<span>${escapeHtml(option.label)}</span>` +
                    '</label>'
                );
            }).join('');

            const displayHtml = question.display
                ? `<div class="interactive-equation">${escapeHtml(question.display)}</div>`
                : '';

            let feedbackHtml = '';

            if (entry.checked) {
                const selectedOption = question.options.find(
                    (option) => option.label === entry.selected
                );

                const detail = isCorrect
                    ? escapeHtml(question.explanation)
                    : (
                        `${escapeHtml(selectedOption ? selectedOption.feedback : '')} ` +
                        `${escapeHtml(question.explanation)}`
                    ).trim();

                feedbackHtml =
                    `<div class="question-feedback is-visible ` +
                    `${isCorrect ? 'is-correct' : 'is-incorrect'}">` +
                    `<strong>${isCorrect ? 'Correct.' : 'Not quite.'}</strong> ` +
                    detail +
                    '</div>';
            }

            root.innerHTML =
                '<article class="question-card">' +
                `<p class="question-number">Question ${state.number} ` +
                `· ${state.correct} correct from ${state.answered} answered</p>` +
                `<p class="lesson-eyebrow">${escapeHtml(question.type)}</p>` +
                `<p class="question-prompt">${escapeHtml(question.prompt)}</p>` +
                displayHtml +
                `<div class="question-options" role="radiogroup" ` +
                `aria-label="Answer options for question ${state.number}">` +
                optionsHtml +
                '</div>' +
                feedbackHtml +
                '</article>';

            root
                .querySelectorAll(`input[name="${ROOT_ID}-answer"]`)
                .forEach((input) => {
                    input.addEventListener('change', (event) => {
                        if (entry.checked) {
                            return;
                        }

                        entry.selected = event.currentTarget.value;
                        render();
                    });
                });

            const phase = entry.checked
                ? (isCorrect ? 'next' : 'retry')
                : 'check';

            const label = phase === 'next'
                ? 'Next question'
                : phase === 'retry'
                    ? 'Try again'
                    : 'Check answer';

            const disabled = phase === 'check' && entry.selected === '';

            window.Maths1to9Lesson?.setSectionAction?.(SECTION_ID, {
                label,
                disabled,
                onClick: () => {
                    if (phase === 'check') {
                        if (entry.selected === '') {
                            return;
                        }

                        entry.checked = true;
                        entry.correct =
                            entry.selected === question.answerLabel;

                        if (!entry.countedAnswer) {
                            state.answered += 1;
                            entry.countedAnswer = true;
                            state.practised[question.type] = true;

                            if (entry.correct) {
                                state.firstTryCorrect += 1;
                            }
                        }

                        if (entry.correct && !entry.countedCorrect) {
                            state.correct += 1;
                            entry.countedCorrect = true;
                        } else if (!entry.correct && entry.countedCorrect) {
                            state.correct -= 1;
                            entry.countedCorrect = false;
                        }

                        window.Maths1to9Lesson?.recordAssessment?.({
                            questionType: entry.type,
                            questionId: entry.questionId,
                            correct: entry.correct
                        });

                        /*
                         * "Finish lesson" unlocks only after enough
                         * different questions have been checked, right
                         * or wrong.
                         */
                        if (
                            !state.completed &&
                            state.answered >= QUESTIONS_TO_COMPLETE
                        ) {
                            state.completed = true;
                            completeSection(SECTION_ID);
                        }

                        render();
                        return;
                    }

                    if (phase === 'retry') {
                        entry.selected = '';
                        entry.checked = false;
                        render();
                        return;
                    }

                    addQuestion();
                }
            });
        }

        /*
         * When the pupil presses "Finish lesson" in the shared footer,
         * the engine dispatches maths1to9:lesson-complete. Stop handing
         * out questions, take our action out of the footer and show a
         * short summary in place of the question card.
         */
        function finishPractice() {
            if (state.finished) {
                return;
            }

            state.finished = true;
            window.Maths1to9Lesson?.clearSectionAction?.(SECTION_ID);
            renderSummary();
        }

        function renderSummary() {
            const practised = Object.keys(state.practised);
            const practisedHtml = practised.length > 0
                ? '<aside class="lesson-key-points">' +
                  '<h3>What you practised</h3><ul>' +
                  practised
                      .map((name) => `<li>${escapeHtml(name)}</li>`)
                      .join('') +
                  '</ul></aside>'
                : '';

            root.innerHTML =
                '<article class="question-card">' +
                '<p class="question-number">Practice complete</p>' +
                `<p class="question-prompt">You checked ${state.answered} ` +
                `question${state.answered === 1 ? '' : 's'} and got ` +
                `${state.firstTryCorrect} right on the first try. ` +
                'Your progress has been saved.</p>' +
                practisedHtml +
                '<p><a class="button button--primary" ' +
                'href="../../index.php">Back to all lessons</a></p>' +
                '</article>';
        }

        document.addEventListener(
            'maths1to9:lesson-complete',
            finishPractice
        );

        addQuestion();
    }

    function mountAll() {
        const root = document.getElementById(ROOT_ID);

        if (root && !root.dataset.mounted) {
            mount(root);
        }
    }

    document.addEventListener('maths1to9:lesson-rendered', mountAll);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mountAll);
    } else {
        mountAll();
    }
})();
