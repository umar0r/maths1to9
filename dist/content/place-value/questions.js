(() => {
    'use strict';

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

    /* ---------- helpers ---------- */

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

    function addCommas(value) {
        const parts = String(value).split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return parts.join('.');
    }

    function formatScaledInteger(integer, decimalPlaces, keepTrailingZeros = false) {
        const negative = integer < 0;
        let digits = String(Math.abs(integer));

        if (decimalPlaces === 0) {
            const result = addCommas(digits);
            return negative ? `-${result}` : result;
        }

        digits = digits.padStart(decimalPlaces + 1, '0');
        const splitAt = digits.length - decimalPlaces;
        const whole = addCommas(digits.slice(0, splitAt));
        let decimal = digits.slice(splitAt);

        if (!keepTrailingZeros) {
            decimal = decimal.replace(/0+$/, '');
        }

        const result = decimal === '' ? whole : `${whole}.${decimal}`;
        return negative ? `-${result}` : result;
    }

    // Scale an integer by 10^(-places): positive places divide, negative multiply.
    function scaleValue(integer, places) {
        if (places >= 0) {
            return formatScaledInteger(integer, places);
        }
        return addCommas(String(integer * (10 ** -places)));
    }

    function numericNudge(text, step) {
        const value = Number(String(text).replace(/,/g, ''));
        if (!Number.isFinite(value)) {
            return `${text} (${step})`;
        }
        const scaled = Number((value * (10 ** step)).toPrecision(12));
        return addCommas(String(scaled));
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

    function splitDecimal(value) {
        const [whole = '0', decimal = ''] = String(value).split('.');
        return { whole, decimal };
    }

    function padDecimal(value, places) {
        const parts = splitDecimal(value);
        return `${parts.whole}.${parts.decimal.padEnd(places, '0')}`;
    }

    const PLACE_NAMES_AFTER_POINT = ['tenths', 'hundredths', 'thousandths', 'ten-thousandths'];

    function comparisonExplanation(left, right) {
        const leftParts = splitDecimal(left);
        const rightParts = splitDecimal(right);

        const places = Math.max(leftParts.decimal.length, rightParts.decimal.length);
        const leftPadded = padDecimal(left, places);
        const rightPadded = padDecimal(right, places);

        if (Number(leftParts.whole) !== Number(rightParts.whole)) {
            const symbol = Number(left) > Number(right) ? '>' : '<';
            return `Compare the ones first. ${leftParts.whole} ${symbol} ${rightParts.whole}.`;
        }

        const leftDigits = splitDecimal(leftPadded).decimal;
        const rightDigits = splitDecimal(rightPadded).decimal;

        let index = 0;
        while (index < places && leftDigits[index] === rightDigits[index]) {
            index += 1;
        }

        const symbol = Number(leftDigits[index]) > Number(rightDigits[index]) ? '>' : '<';

        return (
            `Write the numbers as ${leftPadded} and ${rightPadded}. `
            + `The first different column is the ${PLACE_NAMES_AFTER_POINT[index]}. `
            + `${leftDigits[index]} ${symbol} ${rightDigits[index]}.`
        );
    }

    function completedComparisonExplanation(left, right, answer) {
        const places = Math.max(
            splitDecimal(left).decimal.length,
            splitDecimal(right).decimal.length
        );
        const leftPadded = padDecimal(left, places);
        const rightPadded = padDecimal(right, places);
        const equivalences = [];

        if (leftPadded !== left) {
            equivalences.push(`${left} = ${leftPadded}.`);
        }

        if (rightPadded !== right) {
            equivalences.push(`${right} = ${rightPadded}.`);
        }

        return (
            `${equivalences.join(' ')} Since ${leftPadded} ${answer} `
            + `${rightPadded}, the correct symbol is ${answer}.`
        ).trim();
    }

    /* ---------- question generators ---------- */

    function generateDigitValueQuestion() {
        const wholeLength = randomInt(2, 4);
        const decimalLength = randomInt(1, 3);
        const totalLength = wholeLength + decimalLength;

        const digits = shuffle(['1', '2', '3', '4', '5', '6', '7', '8', '9'])
            .slice(0, totalLength);

        const whole = digits.slice(0, wholeLength).join('');
        const decimal = digits.slice(wholeLength).join('');
        const number = `${addCommas(whole)}.${decimal}`;

        const targetIndex = randomInt(0, totalLength - 1);
        const digit = Number(digits[targetIndex]);

        const exponent = targetIndex < wholeLength
            ? wholeLength - targetIndex - 1
            : -(targetIndex - wholeLength + 1);

        const placeNames = {
            3: 'thousands',
            2: 'hundreds',
            1: 'tens',
            0: 'ones',
            '-1': 'tenths',
            '-2': 'hundredths',
            '-3': 'thousandths'
        };

        function valueAt(placeExponent) {
            if (placeExponent >= 0) {
                return addCommas(String(digit * (10 ** placeExponent)));
            }
            return formatScaledInteger(digit, Math.abs(placeExponent), true);
        }

        const answer = valueAt(exponent);

        return makeQuestion({
            type: 'Digit value',
            prompt: `In ${number}, what is the value of the digit ${digit}?`,
            options: uniqueOptions(answer, [
                valueAt(exponent + 1),
                valueAt(exponent - 1),
                valueAt(exponent + 2),
                String(digit)
            ]),
            answer,
            explanation: (
                `${digit} is in the ${placeNames[String(exponent)]} column. `
                + `Its value is ${answer}.`
            )
        });
    }

    // Comparisons are built in thousandths (3 decimal places), the deepest
    // column GCSE questions use.
    function generateComparisonQuestion() {
        const whole = randomInt(0, 5);
        const shortPlaces = randomInt(1, 2);
        const shortFraction = randomInt(10 ** (shortPlaces - 1), (10 ** shortPlaces) - 1);

        const shortDisplay = (
            `${whole}.${String(shortFraction).padStart(shortPlaces, '0')}`
        );

        const shortUnits = (whole * 1000) + (shortFraction * (10 ** (3 - shortPlaces)));

        const direction = Math.random() < 0.5 ? -1 : 1;
        const longUnits = shortUnits + (direction * randomInt(1, 9));
        const longDisplay = formatScaledInteger(longUnits, 3, true);

        let left = shortDisplay;
        let right = longDisplay;
        let leftUnits = shortUnits;
        let rightUnits = longUnits;

        if (Math.random() < 0.5) {
            [left, right] = [right, left];
            [leftUnits, rightUnits] = [rightUnits, leftUnits];
        }

        const answer = leftUnits > rightUnits ? '>' : '<';

        return makeQuestion({
            type: 'Compare decimals',
            prompt: 'Which symbol makes this statement true?',
            display: `${left} ? ${right}`,
            options: ['>', '<'],
            answer,
            explanation: (
                `${left} ${answer} ${right}. `
                + comparisonExplanation(left, right)
            )
        });
    }

    function generateOrderingQuestion() {
        const whole = randomInt(0, 3);
        const tenth = randomInt(1, 8);

        const exactTenth = (whole * 1000) + (tenth * 100);
        const justBelow = exactTenth - randomInt(1, 9);
        const firstAbove = exactTenth + (randomInt(1, 7) * 10);
        const secondAbove = exactTenth + (randomInt(8, 15) * 10);

        const values = [
            { units: justBelow, display: formatScaledInteger(justBelow, 3, true) },
            { units: exactTenth, display: `${whole}.${tenth}` },
            { units: firstAbove, display: formatScaledInteger(firstAbove, 3, false) },
            { units: secondAbove, display: formatScaledInteger(secondAbove, 3, false) }
        ];

        const ordered = [...values].sort((first, second) => first.units - second.units);
        const correctOrder = ordered.map((item) => item.display);
        const padded = ordered.map((item) => formatScaledInteger(item.units, 3, true));

        return makeQuestion({
            type: 'Order decimals',
            prompt: 'Put these decimals in order from smallest to largest.',
            interaction: 'order-tiles',
            values: shuffle(values.map((item) => item.display)),
            correctOrder,
            answer: correctOrder.join(' → '),
            explanation: (
                `Add zeros so every decimal has the same number of decimal places: ${padded.join(', ')}. `
                + 'Now compare the digits from left to right.'
            )
        });
    }

    // Positive places divide a factor by 10^places, negative places multiply.
    // The combos cover scaling down, scaling up, and the two cancelling out.
    const SCALED_PRODUCT_COMBOS = [
        [1, 0], [0, 1], [1, 1], [2, 0], [0, 2], [2, 1], [1, 2],
        [-1, 0], [0, -1], [-1, 1], [1, -1]
    ];

    function trackText(original, scaled, places) {
        if (places === 0) {
            return `${original} stays the same.`;
        }
        const factor = addCommas(String(10 ** Math.abs(places)));
        const symbol = places > 0 ? '÷' : '×';
        return `${original} → ${scaled} is ${symbol}${factor}.`;
    }

    function generateScaledProductQuestion() {
        const first = randomInt(11, 89);
        const second = randomInt(12, 79);
        const product = first * second;

        const [firstPlaces, secondPlaces] = randomItem(SCALED_PRODUCT_COMBOS);
        const totalPlaces = firstPlaces + secondPlaces;

        const scaledFirst = scaleValue(first, firstPlaces);
        const scaledSecond = scaleValue(second, secondPlaces);
        const answer = scaleValue(product, totalPlaces);

        let combined;
        if (totalPlaces === 0) {
            combined = (
                'The ×10 and ÷10 cancel out, so the answer stays the same: '
                + `${addCommas(String(product))}.`
            );
        } else if (totalPlaces > 0) {
            const factor = addCommas(String(10 ** totalPlaces));
            combined = (
                `Overall the answer is divided by ${factor}. `
                + `${addCommas(String(product))} ÷ ${factor} = ${answer}.`
            );
        } else {
            const factor = addCommas(String(10 ** -totalPlaces));
            combined = (
                `Overall the answer is multiplied by ${factor}. `
                + `${addCommas(String(product))} × ${factor} = ${answer}.`
            );
        }

        return makeQuestion({
            type: 'Scale a multiplication',
            prompt: (
                `Given that ${first} × ${second} = ${addCommas(String(product))}, `
                + `what is ${scaledFirst} × ${scaledSecond}?`
            ),
            options: uniqueOptions(answer, [
                scaleValue(product, totalPlaces + 1),
                scaleValue(product, totalPlaces - 1),
                scaleValue(product, totalPlaces + 2),
                addCommas(String(product))
            ]),
            answer,
            explanation: (
                `${trackText(first, scaledFirst, firstPlaces)} `
                + `${trackText(second, scaledSecond, secondPlaces)} `
                + combined
            )
        });
    }

    function generatePowerOfTenQuestion() {
        const digits = randomInt(101, 99999);
        const originalPlaces = randomInt(0, 3);
        const placesMoved = randomInt(1, 3);
        const divide = Math.random() < 0.5;
        const power = 10 ** placesMoved;

        const original = formatScaledInteger(digits, originalPlaces);

        function shift(movement) {
            const newPlaces = originalPlaces + movement;
            if (newPlaces >= 0) {
                return formatScaledInteger(digits, newPlaces);
            }
            return formatScaledInteger(digits * (10 ** Math.abs(newPlaces)), 0);
        }

        const movement = divide ? placesMoved : -placesMoved;
        const answer = shift(movement);

        return makeQuestion({
            type: 'Powers of 10',
            prompt: `What is ${original} ${divide ? '÷' : '×'} ${addCommas(String(power))}?`,
            options: uniqueOptions(answer, [
                shift(-movement),
                shift(divide ? placesMoved + 1 : -(placesMoved + 1)),
                shift(divide ? Math.max(0, placesMoved - 1) : -Math.max(0, placesMoved - 1))
            ]),
            answer,
            explanation: (
                `${divide ? 'Dividing' : 'Multiplying'} by ${addCommas(String(power))} `
                + `moves every digit ${placesMoved} `
                + `${placesMoved === 1 ? 'column' : 'columns'} `
                + `${divide ? 'right' : 'left'}. `
                + `The answer is ${answer}.`
            )
        });
    }

    const generators = {
        digitValue: generateDigitValueQuestion,
        compare: generateComparisonQuestion,
        order: generateOrderingQuestion,
        scaledProduct: generateScaledProductQuestion,
        powerOfTen: generatePowerOfTenQuestion
    };

    function createQuestionBag() {
        return shuffle(Object.keys(generators));
    }

    /* ---------- place value chart ---------- */

    function getComparisonChart(question) {
        const left = splitDecimal(question.left);
        const right = splitDecimal(question.right);
        const places = Math.max(left.decimal.length, right.decimal.length);

        const labels = ['Ones', 'Tenths', 'Hundredths', 'Thousandths', 'Ten-thousandths']
            .slice(0, places + 1);

        function digits(value) {
            const parts = splitDecimal(value);
            return [
                parts.whole.slice(-1) || '0',
                ...parts.decimal.padEnd(places, '0').slice(0, places)
            ];
        }

        const template = `110px repeat(${labels.length}, minmax(92px, 1fr))`;

        function cell(content, extraClass = '') {
            return (
                `<div class="place-value-cell ${extraClass}">`
                + `${escapeHtml(content)}</div>`
            );
        }

        function row(label, values) {
            const cells = values.map((digit, index) => cell(
                digit,
                `place-value-cell--digit${index === 1 ? ' place-value-cell--decimal-start' : ''}`
            )).join('');

            return (
                `<div class="place-value-row" style="grid-template-columns: ${template};">`
                + cell(label, 'place-value-cell--row-label')
                + cells
                + '</div>'
            );
        }

        const headingCells = labels.map((label, index) => cell(
            label,
            `place-value-cell--heading${index === 1 ? ' place-value-cell--decimal-start' : ''}`
        )).join('');

        return (
            '<div class="place-value-chart-wrapper">'
            + `<div class="place-value-chart" style="min-width: ${110 + (labels.length * 105)}px;">`
            + `<div class="place-value-row" style="grid-template-columns: ${template};">`
            + cell('', 'place-value-cell--heading')
            + headingCells
            + '</div>'
            + row(question.left, digits(question.left))
            + row(question.right, digits(question.right))
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

        gateSection('comparison');

        const state = {
            index: 0,
            selected: '',
            checked: false,
            completedCorrectly: new Set(),
            completionDispatched: false
        };

        function render() {
            const question = questions[state.index];
            const correct = state.selected === question.answer;
            const isLast = state.index === questions.length - 1;

            const options = question.answer === '='
                ? ['<', '>', '=']
                : ['<', '>'];
            const optionsHtml = options.map((option) => {
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
                    + '<input type="radio" name="fixed-comparison-answer"'
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
                        completedComparisonExplanation(
                            question.left,
                            question.right,
                            question.answer
                        )
                    )
                    + '</div>'
                    + getComparisonChart(question)
                )
                : '';

            const buttonLabel = state.checked
                ? (isLast ? 'Start again' : 'Next comparison')
                : 'Check answer';

            const buttonDisabled = !state.checked && state.selected === ''
                ? ' disabled'
                : '';

            root.innerHTML = (
                '<article class="question-card question-card--bare">'
                + `<p class="question-prompt">Select ${question.answer === '=' ? '<, > or =' : '< or >'} to make the statement correct.</p>`
                + '<div class="interactive-equation">'
                + `${escapeHtml(question.left)} ${escapeHtml(state.selected || '□')} ${escapeHtml(question.right)}`
                + '</div>'
                + '<div class="question-options" role="radiogroup" aria-label="Select a comparison symbol">'
                + optionsHtml
                + '</div>'
                + feedbackHtml
                + '</article>'
            );

            root.querySelectorAll('input[name="fixed-comparison-answer"]').forEach((input) => {
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

                            if (state.selected === question.answer) {
                                state.completedCorrectly.add(
                                    state.index
                                );

                                if (
                                    !state.completionDispatched
                                    && state.completedCorrectly.size
                                        === questions.length
                                ) {
                                    state.completionDispatched = true;
                                    completeSection('comparison');
                                }
                            }
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
        gateSection('question-bank');

        const state = {
            bag: createQuestionBag(),
            questions: [],
            currentIndex: -1,
            completionDispatched: false
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
                order: [],
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
            const isOrdering = question.interaction === 'order-tiles';

            if (isOrdering && !Array.isArray(entry.order)) {
                entry.order = [];
            }

            if (isOrdering) {
                entry.selected = entry.order.join(' → ');
            }

            const correct = entry.selected === question.answer;

            const optionsHtml = !isOrdering ? question.options.map((option) => (
                `<label class="question-option ${optionClass(option, entry)}">`
                + '<input type="radio" name="place-value-practice-answer"'
                + ` value="${escapeHtml(option)}"`
                + `${entry.selected === option ? ' checked' : ''}`
                + `${entry.checked ? ' disabled' : ''}>`
                + `<span>${escapeHtml(option)}</span>`
                + '</label>'
            )).join('') : '';

            const orderingHtml = isOrdering ? `
                <div class="ordering-tile-bank" aria-label="Unordered decimals">
                    ${question.values
                        .filter((value) => !entry.order.includes(value))
                        .map((value) => `<button class="ordering-tile" type="button" draggable="true" data-order-tile="${escapeHtml(value)}" data-order-source="pool">${escapeHtml(value)}</button>`)
                        .join('')}
                </div>
                <div class="ordering-row" aria-label="Order decimals from smallest to largest">
                    <span class="ordering-row__label">Smallest</span>
                    <span class="ordering-row__arrow" aria-hidden="true">→</span>
                    <div class="ordering-slots">
                        ${question.values.map((value, index) => {
                            const placed = entry.order[index];
                            return `<div class="ordering-slot ${placed ? 'is-filled' : ''}" data-order-slot="${index}">${placed ? `<button class="ordering-tile" type="button" draggable="true" data-order-tile="${escapeHtml(placed)}" data-order-source="slot">${escapeHtml(placed)}</button>` : `<span>${index + 1}</span>`}</div>`;
                        }).join('')}
                    </div>
                    <span class="ordering-row__arrow" aria-hidden="true">→</span>
                    <span class="ordering-row__label">Largest</span>
                </div>
            ` : '';

            const displayHtml = question.display
                ? `<div class="interactive-equation">${escapeHtml(question.display)}</div>`
                : '';

            const feedbackHtml = entry.checked
                ? (
                    isOrdering
                    ? (
                        `<div class="question-feedback is-visible ${correct ? 'is-correct' : 'is-incorrect'}">`
                        + `<strong>${correct ? 'Correct.' : 'Not quite.'}</strong> `
                        + (correct
                            ? `<p class="ordering-answer">${escapeHtml(question.correctOrder.join(' < '))}</p>${escapeHtml(question.explanation)}`
                            : 'Add zeros to make the decimal places line up, then compare again.')
                        + '</div>'
                    )
                    : (
                    `<div class="question-feedback is-visible ${correct ? 'is-correct' : 'is-incorrect'}">`
                    + `<strong>${correct ? 'Correct.' : 'Not quite.'}</strong> `
                    + escapeHtml(question.explanation)
                    + '</div>'
                    )
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
            const actionDisabled = action === 'check' && (
                isOrdering
                    ? entry.order.length !== question.values.length
                    : entry.selected === ''
            );

            root.innerHTML = (
                '<article class="question-card question-card--bare">'
                + `<p class="question-prompt">${escapeHtml(question.prompt)}</p>`
                + displayHtml
                + (isOrdering
                    ? orderingHtml
                    : '<div class="question-options" role="radiogroup" aria-label="Choose an answer">' + optionsHtml + '</div>')
                + feedbackHtml
                + '</article>'
                + historyHtml()
            );

            if (isOrdering) {
                root.querySelectorAll('[data-order-tile]').forEach((tile) => {
                    tile.addEventListener('click', () => {
                        if (entry.checked) return;
                        const value = tile.dataset.orderTile;
                        if (tile.dataset.orderSource === 'slot') {
                            entry.order = entry.order.filter((item) => item !== value);
                        } else if (entry.order.length < question.values.length) {
                            entry.order.push(value);
                        }
                        render();
                    });

                    tile.addEventListener('dragstart', (event) => {
                        event.dataTransfer?.setData('text/plain', tile.dataset.orderTile);
                    });
                });

                root.querySelectorAll('[data-order-slot]').forEach((slot) => {
                    slot.addEventListener('dragover', (event) => event.preventDefault());
                    slot.addEventListener('drop', (event) => {
                        event.preventDefault();
                        if (entry.checked) return;
                        const value = event.dataTransfer?.getData('text/plain');
                        if (!value || !question.values.includes(value)) return;
                        const currentIndex = entry.order.indexOf(value);
                        if (currentIndex !== -1) entry.order.splice(currentIndex, 1);
                        const destination = Math.min(Number(slot.dataset.orderSlot), entry.order.length);
                        entry.order.splice(destination, 0, value);
                        render();
                    });
                });
            } else {
                root.querySelectorAll('input[name="place-value-practice-answer"]').forEach((input) => {
                    input.addEventListener('change', (event) => {
                        entry.selected = event.currentTarget.value;
                        render();
                    });
                });
            }

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

                            if (
                                entry.correct
                                && !state.completionDispatched
                            ) {
                                state.completionDispatched = true;
                                completeSection('question-bank');
                            }

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

    /* ---------- mounting ----------
       The lesson engine renders the mount points after fetching
       lesson.json, so this script must wait for that render. It
       mounts on the engine's maths1to9:lesson-rendered event, and also tries
       immediately in case the DOM is already present (static pages).
       The data-mounted guard makes mounting idempotent. */

    function mountAll() {
        const fixedRoot = document.getElementById(
            'place-value-comparison'
        );

        if (fixedRoot && !fixedRoot.dataset.mounted) {
            fixedRoot.dataset.mounted = 'true';
            mountFixedComparisons(fixedRoot);
        }

        const practiceRoot = document.getElementById(
            'place-value-questions'
        );

        if (practiceRoot && !practiceRoot.dataset.mounted) {
            practiceRoot.dataset.mounted = 'true';
            mountInfinitePractice(practiceRoot);
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
