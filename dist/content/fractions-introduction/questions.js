(() => {
    'use strict';

    const ROOT_ID = 'fractions-introduction-questions';

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

    const coin = () => Math.random() < 0.5;

    function gcd(a, b) {
        a = Math.abs(a);
        b = Math.abs(b);

        while (b) {
            [a, b] = [b, a % b];
        }

        return a || 1;
    }

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

    /* ---------- display helpers ---------- */

    function injectStyles() {
        if (document.getElementById('fractions-introduction-question-styles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'fractions-introduction-question-styles';
        style.textContent = `
            .fi-q-big {
                font-size: clamp(1.5rem, 3.4vw, 2.1rem);
                font-weight: 800;
                letter-spacing: .02em;
            }

            .fi-q-neg {
                color: #9f1239;
            }

            .fi-q-bar {
                display: block;
                width: 100%;
                max-width: 360px;
                height: auto;
                margin: 6px auto 0;
            }

            .fi-q-bar rect {
                vector-effect: non-scaling-stroke;
            }
        `;

        document.head.append(style);
    }

    function big(text, negative) {
        return `<span class="fi-q-big ${negative ? 'fi-q-neg' : ''}">${text}</span>`;
    }

    function fr(n, d) {
        return `${n}/${d}`;
    }

    function mixed(w, n, d) {
        return `${w} ${n}/${d}`;
    }

    function barSvg(numerator, denominator) {
        const barWidth = 300;
        const barHeight = 70;
        const cellWidth = barWidth / denominator;
        const cells = [];

        for (let index = 0; index < denominator; index += 1) {
            const shaded = index < numerator;

            cells.push(
                '<rect'
                + ` x="${(index * cellWidth).toFixed(2)}" y="0"`
                + ` width="${cellWidth.toFixed(2)}" height="${barHeight}"`
                + ` fill="${shaded ? '#62c5bc' : '#ffffff'}"`
                + ' stroke="#1f2937" stroke-width="1.5" />'
            );
        }

        return (
            `<svg class="fi-q-bar" viewBox="0 0 ${barWidth} ${barHeight}"`
            + ` width="${barWidth}" height="${barHeight}" role="img"`
            + ` aria-label="${numerator} of ${denominator} equal parts shaded">`
            + cells.join('')
            + `<rect x="0" y="0" width="${barWidth}" height="${barHeight}" rx="6"`
            + ' fill="none" stroke="#111827" stroke-width="3" />'
            + '</svg>'
        );
    }

    /* value of a signed fraction */
    const val = (n, d, sign) => (sign || 1) * (n / d);

    /* ---------- generators ---------- */

    function nameThePart() {
        const d = pick([4, 5, 6, 8, 9, 10, 12]);
        const n = r(1, d - 1);
        const askDenominator = coin();
        const correct = askDenominator ? d : n;
        const other = askDenominator ? n : d;

        return make({
            prompt: `Which number is the ${askDenominator ? 'denominator' : 'numerator'}?`,
            expression: big(fr(n, d)),
            correct,

            wrong: [
                [
                    String(other),
                    `That is the ${askDenominator ? 'numerator' : 'denominator'} — the ${askDenominator ? 'top' : 'bottom'} number.`
                ],
                [
                    String(n + d),
                    'That is the two numbers added together, not one of them.'
                ],
                [
                    String(d + 1),
                    'That number is not part of this fraction.'
                ]
            ],

            hint: askDenominator
                ? 'The denominator is written below the line.'
                : 'The numerator is written above the line.',

            explanation: askDenominator
                ? `The bottom number is the denominator, so it is ${d}. It shows the whole is cut into ${d} equal parts.`
                : `The top number is the numerator, so it is ${n}. It counts how many parts are taken.`
        });
    }

    function shadedFraction() {
        let d = pick([3, 4, 5, 6, 7, 8]);
        let n = r(1, d - 1);

        while (gcd(n, d) !== 1) {
            d = pick([3, 4, 5, 6, 7, 8]);
            n = r(1, d - 1);
        }

        return make({
            prompt: 'What fraction of the shape is shaded?',
            expression: barSvg(n, d),
            correct: fr(n, d),

            wrong: [
                [
                    fr(d, n),
                    'That is upside down. The denominator is the number of equal parts in the whole.'
                ],
                [
                    fr(n, n + d),
                    'The denominator is the total equal parts in the whole, not shaded plus unshaded counted twice.'
                ],
                [
                    fr(d - n, d),
                    'That is the unshaded fraction. The question asks for the shaded part.'
                ]
            ],

            hint: 'Numerator = shaded parts. Denominator = all equal parts in the whole.',
            explanation: `${n} parts are shaded out of ${d} equal parts, so the shaded fraction is ${fr(n, d)}.`
        });
    }

    function classifyFraction() {
        const kind = pick(['proper', 'improper', 'mixed']);
        let display;
        let correct;

        if (kind === 'proper') {
            const d = pick([3, 4, 5, 6, 7, 8]);
            const n = r(1, d - 1);
            display = fr(n, d);
            correct = 'Proper fraction';
        } else if (kind === 'improper') {
            const d = pick([2, 3, 4, 5, 6]);
            const n = d + r(1, d + 2);
            display = fr(n, d);
            correct = 'Improper fraction';
        } else {
            const d = pick([2, 3, 4, 5, 6]);
            const w = r(1, 4);
            const n = r(1, d - 1);
            display = mixed(w, n, d);
            correct = 'Mixed number';
        }

        const feedback = {
            'Proper fraction': 'A proper fraction has a numerator smaller than its denominator, with no whole number beside it.',
            'Improper fraction': 'An improper fraction is a single fraction whose numerator is equal to or larger than its denominator.',
            'Mixed number': 'A mixed number is a whole number written next to a proper fraction.'
        };

        return make({
            prompt: 'Which name describes this number?',
            expression: big(display),
            correct,

            wrong: Object.keys(feedback)
                .filter((label) => label !== correct)
                .map((label) => [label, feedback[label]]),

            hint: 'Compare the top with the bottom, and check whether a whole number is written beside it.',
            explanation: `${display} is ${correct === 'Improper fraction' ? 'an improper fraction' : correct === 'Mixed number' ? 'a mixed number' : 'a proper fraction'}.`
        });
    }

    function improperToMixed() {
        const d = pick([2, 3, 4, 5, 6]);
        const w = r(1, 3);
        const rem = r(1, d - 1);
        const n = w * d + rem;

        return make({
            prompt: 'Write this improper fraction as a mixed number.',
            expression: big(fr(n, d)),
            correct: mixed(w, rem, d),

            wrong: [
                [
                    mixed(w, d, rem),
                    'The remainder goes on top and the denominator stays on the bottom.'
                ],
                [
                    mixed(rem, w, d),
                    'The whole number is how many times the denominator fits, not the remainder.'
                ],
                [
                    mixed(w + 1, rem, d),
                    `Check the division: ${n} ÷ ${d} = ${w} remainder ${rem}.`
                ]
            ],

            hint: `Work out ${n} ÷ ${d}. The quotient is the whole number; the remainder stays over ${d}.`,
            explanation: `${n} ÷ ${d} = ${w} remainder ${rem}, so ${fr(n, d)} = ${mixed(w, rem, d)}.`
        });
    }

    function mixedToImproper() {
        const d = pick([2, 3, 4, 5, 6]);
        const w = r(1, 4);
        const rem = r(1, d - 1);
        const n = w * d + rem;

        return make({
            prompt: 'Write this mixed number as an improper fraction.',
            expression: big(mixed(w, rem, d)),
            correct: fr(n, d),

            wrong: [
                [
                    fr(w + rem, d),
                    `Multiply the whole number by the denominator first: ${w} × ${d} = ${w * d}, then add ${rem}.`
                ],
                [
                    fr(n, w * d),
                    'The denominator does not change when converting a mixed number.'
                ],
                [
                    fr(w * rem, d),
                    `Multiply the whole number by the denominator, not by the numerator: ${w} × ${d} + ${rem}.`
                ]
            ],

            hint: `Multiply: ${w} × ${d}, then add ${rem}. Keep the denominator ${d}.`,
            explanation: `${w} × ${d} + ${rem} = ${n}, so ${mixed(w, rem, d)} = ${fr(n, d)}.`
        });
    }

    function chooseInequality() {
        let an;
        let ad;
        let bn;
        let bd;

        do {
            ad = pick([2, 3, 4, 5, 6]);
            bd = pick([2, 3, 4, 5, 6, 8]);
            an = r(1, ad);
            bn = r(1, bd);
        } while (an === ad && bn === bd);

        const left = an / ad;
        const right = bn / bd;
        const correct = left < right ? '<' : left > right ? '>' : '=';

        const feedback = {
            '<': `${fr(an, ad)} is smaller, so the sign should open towards ${fr(bn, bd)}.`,
            '>': `${fr(an, ad)} is larger, so the sign should open towards ${fr(an, ad)}.`,
            '=': 'These fractions are only equal if they have the same value after using a common denominator.'
        };

        const common = ad * bd;

        return make({
            prompt: `Choose the symbol that makes this true:  ${fr(an, ad)} □ ${fr(bn, bd)}`,
            expression: big(`${fr(an, ad)}  □  ${fr(bn, bd)}`),
            correct,

            wrong: ['<', '>', '=']
                .filter((symbol) => symbol !== correct)
                .map((symbol) => [symbol, feedback[symbol]]),

            hint: `Use the common denominator ${common}: ${fr(an * bd, common)} and ${fr(bn * ad, common)}.`,
            explanation: `${fr(an, ad)} = ${fr(an * bd, common)} and ${fr(bn, bd)} = ${fr(bn * ad, common)}, so ${fr(an, ad)} ${correct} ${fr(bn, bd)}.`
        });
    }

    function compareNegative() {
        let an;
        let ad;
        let bn;
        let bd;

        do {
            ad = pick([2, 3, 4, 5, 6]);
            bd = pick([2, 3, 4, 5, 6]);
            an = r(1, ad - 1);
            bn = r(1, bd - 1);
        } while (an / ad === bn / bd);

        const aLabel = `−${fr(an, ad)}`;
        const bLabel = `−${fr(bn, bd)}`;
        const smaller = (an / ad) > (bn / bd) ? aLabel : bLabel;
        const bigger = smaller === aLabel ? bLabel : aLabel;

        return make({
            prompt: `Which is the smaller number:  ${aLabel}  or  ${bLabel}?`,
            expression: big(`${aLabel}   ${bLabel}`, true),
            correct: smaller,

            wrong: [
                [
                    bigger,
                    'For negatives, the number further to the left on the number line is smaller.'
                ],
                [
                    'They are equal',
                    'The two fractions have different values, so they sit at different points.'
                ]
            ],

            hint: 'The negative that is further from zero is the smaller number.',
            explanation: `${smaller} is further to the left of zero, so ${smaller} < ${bigger}.`
        });
    }

    function orderThree() {
        const sources = [
            { n: 1, d: 2, s: 1 },
            { n: 3, d: 4, s: 1 },
            { n: 2, d: 5, s: 1 },
            { n: 5, d: 4, s: 1 },
            { n: 1, d: 4, s: -1 },
            { n: 3, d: 4, s: -1 },
            { n: 1, d: 2, s: -1 }
        ];

        const chosen = shuffle(sources).slice(0, 3);
        const labelOf = (f) => (f.s < 0 ? `−${fr(f.n, f.d)}` : fr(f.n, f.d));

        const ascending = [...chosen]
            .sort((a, b) => val(a.n, a.d, a.s) - val(b.n, b.d, b.s))
            .map(labelOf);

        const correct = ascending.join(' < ');
        const reversed = [...ascending].reverse().join(' < ');
        const swapped = [ascending[1], ascending[0], ascending[2]].join(' < ');

        return make({
            prompt: 'Which list is in order from smallest to largest?',
            expression: big(shuffle(chosen).map(labelOf).join('   ')),
            correct,

            wrong: [
                [
                    reversed,
                    'That is largest to smallest. The question asks for smallest first.'
                ],
                [
                    swapped,
                    'Check the first two: a common denominator or the number line shows which is smaller.'
                ]
            ],

            hint: 'Any negative fraction is smaller than any positive one. Place the rest with a common denominator.',
            explanation: `In order from smallest: ${correct}.`
        });
    }

    const generators = {
        nameThePart,
        shadedFraction,
        classifyFraction,
        improperToMixed,
        mixedToImproper,
        chooseInequality,
        compareNegative,
        orderThree
    };

    function pool(questionNumber) {
        if (questionNumber <= 2) {
            return ['nameThePart', 'shadedFraction', 'classifyFraction'];
        }

        if (questionNumber <= 4) {
            return [
                'nameThePart',
                'shadedFraction',
                'classifyFraction',
                'improperToMixed',
                'mixedToImproper'
            ];
        }

        return Object.keys(generators);
    }

    function mount(root) {
        if (!root || mounted.has(root)) {
            return;
        }

        mounted.add(root);
        injectStyles();
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

    window.Maths1to9QuestionBanks['fractions-introduction'] = mount;

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
