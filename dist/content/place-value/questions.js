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

    function makeQuestion({
        type,
        prompt,
        display = '',
        options = [],
        answer,
        explanation,
        ...extra
    }) {
        return {
            type,
            prompt,
            display,
            options: shuffle(options),
            answer: String(answer),
            explanation,
            ...extra
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

    const DIGIT_WORDS = [
        'zero', 'one', 'two', 'three', 'four',
        'five', 'six', 'seven', 'eight', 'nine'
    ];

    function digitValueWords(digit, exponent) {
        const word = DIGIT_WORDS[digit];
        const tensWords = [
            'zero', 'ten', 'twenty', 'thirty', 'forty',
            'fifty', 'sixty', 'seventy', 'eighty', 'ninety'
        ];
        const names = {
            3: 'thousand',
            2: 'hundred',
            1: 'ten',
            0: '',
            '-1': 'tenth',
            '-2': 'hundredth',
            '-3': 'thousandth'
        };
        const place = names[String(exponent)] || '';

        if (exponent === 0) return word;
        if (exponent === 1) return tensWords[digit];
        if (exponent > 0) return `${word} ${place}`;
        return `${word} ${place}${digit === 1 ? '' : 's'}`;
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

        const answer = digitValueWords(digit, exponent);
        const wordOptions = [...new Set([
            answer,
            digitValueWords(digit, Math.max(-3, exponent - 1)),
            digitValueWords(digit, Math.min(3, exponent + 1)),
            DIGIT_WORDS[digit]
        ])];

        for (let place = -3; wordOptions.length < 4 && place <= 3; place += 1) {
            const option = digitValueWords(digit, place);
            if (!wordOptions.includes(option)) wordOptions.push(option);
        }

        return makeQuestion({
            type: 'Digit value',
            prompt: `In ${number}, which value is represented by the digit ${digit}?`,
            options: wordOptions,
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
        if (randomInt(1, 3) === 1) {
            return generateContextualComparisonQuestion();
        }

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

    function generateContextualComparisonQuestion() {
        const whole = randomInt(2, 12);
        const tenths = randomInt(1, 7);
        const hundredths = randomInt(1, 9);
        const shorter = `${whole}.${tenths}${hundredths}`;
        const longer = `${whole}.${tenths + 1}`;

        if (Math.random() < 0.5) {
            const longerPrice = `${longer}0`;
            const prices = shuffle([shorter, longerPrice]);
            const moreExpensive = prices
                .reduce((current, price) => (
                    Number(price) > Number(current) ? price : current
                ));

            return makeQuestion({
                type: 'Compare decimals',
                prompt: (
                    `One game costs £${prices[0]} and another costs £${prices[1]}. `
                    + 'Which game costs more?'
                ),
                options: prices.map((price) => `£${price}`),
                answer: `£${moreExpensive}`,
                explanation: (
                    `Since £${shorter} < £${longerPrice}, `
                    + `£${longerPrice} costs more.`
                )
            });
        }

        const names = Math.random() < 0.5
            ? ['Zara', 'Maya']
            : ['Maya', 'Zara'];
        const times = [shorter, longer];
        const shorterName = names[times.indexOf(shorter)];

        return makeQuestion({
            type: 'Compare decimals',
            prompt: (
                `${names[0]} finishes a race in ${times[0]} seconds. `
                + `${names[1]} finishes in ${times[1]} seconds. `
                + 'Who has the shorter time?'
            ),
            options: names,
            answer: shorterName,
            explanation: (
                `${longer} = ${longer}0. Since ${shorter} < ${longer}0, `
                + `${shorterName} has the shorter time.`
            )
        });
    }

    function createOrderingQuestion(whole, prompt) {
        const tenth = randomInt(1, 8);

        const exactTenth = (whole * 1000) + (tenth * 100);
        const justBelow = exactTenth - randomInt(1, 9);
        const firstAbove = exactTenth + (randomInt(1, 7) * 10);
        const secondAbove = exactTenth + (randomInt(8, 15) * 10);

        const values = [
            { units: justBelow, display: formatScaledInteger(justBelow, 3, true) },
            { units: exactTenth, display: formatScaledInteger(exactTenth, 3, false) },
            { units: firstAbove, display: formatScaledInteger(firstAbove, 3, false) },
            { units: secondAbove, display: formatScaledInteger(secondAbove, 3, false) }
        ];

        assertOrderingNumberFormat(values.map((item) => item.display));

        const ordered = [...values].sort((first, second) => first.units - second.units);
        const correctOrder = ordered.map((item) => item.display);
        const padded = ordered.map((item) => formatScaledInteger(item.units, 3, true));

        return makeQuestion({
            type: 'Order decimals',
            prompt,
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

    function generateOrderingQuestion() {
        if (randomInt(1, 3) === 1) {
            return createOrderingQuestion(
                randomInt(2, 4),
                'Four pieces of ribbon have these lengths in metres. Put them in order from shortest to longest.'
            );
        }

        // Keep the decimal comparison focused, but vary the size of the
        // whole-number part from decimals below one through to millions.
        // GCSE place value covers decimals and integers of any size.
        const digitLength = randomInt(0, 7);
        const whole = digitLength === 0
            ? 0
            : randomInt(10 ** (digitLength - 1), (10 ** digitLength) - 1);

        return createOrderingQuestion(
            whole,
            'Put these numbers in order from smallest to largest.'
        );
    }

    const UK_DECIMAL_FORMAT = /^-?\d{1,3}(?:,\d{3})*(?:\.\d+)?$/;

    function assertOrderingNumberFormat(values) {
        if (!values.every((value) => UK_DECIMAL_FORMAT.test(value))) {
            throw new Error('Ordering question contains an invalid number format.');
        }
    }

    function runOrderingNumberFormatFuzzCheck() {
        for (let index = 0; index < 250; index += 1) {
            const integer = randomInt(0, 9999999);
            const decimalPlaces = randomInt(1, 3);
            const formatted = formatScaledInteger(
                integer * (10 ** decimalPlaces) + randomInt(0, (10 ** decimalPlaces) - 1),
                decimalPlaces,
                Math.random() < 0.5
            );

            assertOrderingNumberFormat([formatted]);
        }
    }

    runOrderingNumberFormatFuzzCheck();

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

    function createQuestionBag(focusTypes = []) {
        const allTypes = Object.keys(generators);
        const otherTypes = allTypes.filter(
            (type) => type !== 'order'
        );

        const focused = [...new Set(focusTypes)].filter(
            (type) => allTypes.includes(type)
        );

        if (focused.length > 0) {
            const targeted = [];

            while (targeted.length < 10) {
                // Two questions on a weak skill, then one mixed question.
                const choices = targeted.length % 3 === 2
                    ? allTypes
                    : focused;
                targeted.push(randomItem(choices));
            }

            return shuffle(targeted);
        }

        // pop() is used to select the next question, so keep ordering last:
        // every new Practice cycle begins with the hands-on ordering task.
        return [
            ...shuffle(otherTypes),
            'order'
        ];
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

    /* Keep the Final Check's five familiar skills, while varying the values
       each time a student starts a new Check attempt. */
    function createFinalCheckQuestions() {
        const hundreds = randomInt(1, 9);
        const ones = randomInt(1, 9);
        const tenths = randomInt(1, 9);
        const hundredths = randomInt(1, 9);
        const composedNumber = `${hundreds}0${ones}.${tenths}${hundredths}`;

        const smallerTenths = randomInt(2, 7);
        const smallerHundredths = randomInt(1, 9);
        const smallerDecimal = `0.${smallerTenths}${smallerHundredths}`;
        const largerDecimal = `0.${smallerTenths + 1}`;
        const misconceptionReason = (
            `No. ${largerDecimal} = ${largerDecimal}0, and `
            + `${largerDecimal}0 > ${smallerDecimal}.`
        );

        const whole = randomInt(2, 4);
        const orderingTenths = randomInt(1, 7);
        const orderingHundredths = randomInt(1, 8);
        const orderingThousandths = randomInt(1, 9);
        const laterHundredths = randomInt(1, 8);
        const orderAnswer = [
            `${whole}.${orderingTenths}${orderingHundredths}`,
            `${whole}.${orderingTenths}${orderingHundredths}${orderingThousandths}`,
            `${whole}.${orderingTenths + 1}`,
            `${whole}.${orderingTenths + 1}${laterHundredths}`
        ];
        const orderValues = shuffle(orderAnswer);

        let dividedInput = randomInt(120, 980);

        while (dividedInput % 10 === 0) {
            dividedInput = randomInt(120, 980);
        }

        let originalDigits = randomInt(101, 999);

        while (originalDigits % 10 === 0) {
            originalDigits = randomInt(101, 999);
        }

        const originalNumber = (
            `${Math.floor(originalDigits / 10)}.${originalDigits % 10}`
        );
        const multipliedResult = addCommas(String(originalDigits * 10));

        return [
            {
                type: 'number',
                prompt: (
                    `A number has ${hundreds} hundreds, ${ones} ones, `
                    + `${tenths} tenths and ${hundredths} hundredths. `
                    + 'What is the number?'
                ),
                answer: composedNumber,
                explanation: (
                    `There are no tens, so the number is ${hundreds} hundreds, `
                    + `0 tens, ${ones} ones, ${tenths} tenths and `
                    + `${hundredths} hundredths: ${composedNumber}.`
                )
            },
            {
                type: 'misconception',
                prompt: (
                    `Aisha says: “${smallerDecimal} is greater than `
                    + `${largerDecimal} because ${smallerTenths}${smallerHundredths} `
                    + `is greater than ${smallerTenths + 1}.” Is Aisha correct?`
                ),
                decision: 'No',
                reason: misconceptionReason,
                reasons: [
                    misconceptionReason,
                    'No. A number with more decimal digits is always smaller.',
                    `Yes. ${smallerTenths}${smallerHundredths} is greater than ${smallerTenths + 1}.`,
                    'Yes. Hundredths are worth more than tenths.'
                ],
                answer: misconceptionReason,
                explanation: (
                    `Write ${largerDecimal} as ${largerDecimal}0. `
                    + `Then compare ${largerDecimal}0 with ${smallerDecimal}.`
                )
            },
            {
                type: 'order',
                prompt: (
                    'Four pupils recorded these long-jump distances. Put the '
                    + `distances in order from shortest to longest: ${orderValues.join(' m, ')} m.`
                ),
                values: orderValues,
                answer: orderAnswer,
                explanation: (
                    'Write the distances with three decimal places: '
                    + `${orderAnswer.map((value) => padDecimal(value, 3)).join(', ')}.`
                )
            },
            {
                type: 'number',
                prompt: (
                    `A machine divides its input by 10. The input is `
                    + `${dividedInput}. What is the output?`
                ),
                answer: formatScaledInteger(dividedInput, 1),
                explanation: (
                    'Each digit is worth one tenth as much, so '
                    + `${dividedInput} becomes ${formatScaledInteger(dividedInput, 1)}.`
                )
            },
            {
                type: 'number',
                prompt: (
                    `A number is multiplied by 100. The result is `
                    + `${multipliedResult}. What was the original number?`
                ),
                answer: originalNumber,
                explanation: (
                    `Work backwards by dividing by 100. ${multipliedResult} ÷ 100 = `
                    + `${originalNumber}.`
                )
            }
        ];
    }

    function mountFinalCheck(root, questions) {
        gateSection('comparison');
        const refreshQuestions = () => {
            questions.splice(0, questions.length, ...createFinalCheckQuestions());
        };

        refreshQuestions();
        const state = {
            index: 0,
            answers: [],
            showMistakes: false,
            lessonCompleted: false,
            resetOnReturn: false
        };

        function isCorrect(question, answer) {
            if (question.type === 'misconception') {
                return answer.decision === question.decision && answer.reason === question.reason;
            }
            if (question.type === 'order') {
                return answer.order.join('|') === question.answer.join('|');
            }
            return String(answer.value || '').trim() === question.answer;
        }

        function removeCheckIntroduction() {
            const section = root.closest('.lesson-section');

            if (!section) {
                return;
            }

            Array.from(section.children).forEach((child) => {
                if (
                    child.classList.contains('lesson-eyebrow')
                    || child.classList.contains('lesson-section__title')
                    || child.classList.contains('lesson-section__intro')
                ) {
                    child.remove();
                }
            });

            section.removeAttribute('aria-labelledby');
            section.setAttribute('aria-label', 'Place value completion');
        }

        function missedQuestionsHtml() {
            return state.answers
                .map((answer, index) => ({ answer, question: questions[index], index }))
                .filter(({ answer, question }) => !isCorrect(question, answer))
                .map(({ question, index }) => (
                    `<article class="practice-review-item is-incorrect">`
                    + `<p class="practice-review-item__number">Question ${index + 1}</p>`
                    + `<h3>${escapeHtml(question.prompt)}</h3>`
                    + `<p><strong>Answer: ${escapeHtml(
                        Array.isArray(question.answer)
                            ? question.answer.join(' < ')
                            : question.answer
                    )}</strong></p>`
                    + `<p class="practice-review-item__explanation">${escapeHtml(question.explanation)}</p>`
                    + '</article>'
                ))
                .join('');
        }

        function renderRecommendations(container) {
            const recommendationApi = window.Maths1to9Recommendations;

            if (!recommendationApi?.getForLesson) {
                container.innerHTML = '<p class="lesson-completion__empty">You’re up to date.</p>';
                return;
            }

            recommendationApi.getForLesson('place-value')
                .then((lessons) => {
                    if (!Array.isArray(lessons) || lessons.length === 0) {
                        container.innerHTML = '<p class="lesson-completion__empty">You’re up to date.</p>';
                        return;
                    }

                    const card = (lesson, primary = false) => (
                        `<a class="lesson-recommendation-card ${primary ? 'lesson-recommendation-card--primary' : ''}" href="${escapeHtml(lesson.url)}">`
                        + `<span class="lesson-recommendation-card__title">${escapeHtml(lesson.title)}</span>`
                        + (lesson.subtitle
                            ? `<span class="lesson-recommendation-card__subtitle">${escapeHtml(lesson.subtitle)}</span>`
                            : '')
                        + `<span class="lesson-recommendation-card__meta">${escapeHtml(lesson.state.label)}</span>`
                        + `<span class="lesson-recommendation-card__action">${lesson.state.label === 'In progress' ? 'Continue lesson' : 'Start lesson'}</span>`
                        + '</a>'
                    );
                    const primary = lessons[0];
                    const more = lessons.slice(1, 3);

                    container.innerHTML = (
                        '<h3 class="lesson-completion__next-title">Up next</h3>'
                        + card(primary, true)
                        + (more.length > 0
                            ? '<h3 class="lesson-completion__more-title">More lessons to try</h3>'
                                + `<div class="lesson-completion__more">${more.map((lesson) => card(lesson)).join('')}</div>`
                            : '')
                    );
                })
                .catch(() => {
                    container.innerHTML = '<p class="lesson-completion__empty">You’re up to date.</p>';
                });
        }

        function renderReview() {
            const score = state.answers.filter((answer, index) => isCorrect(questions[index], answer)).length;
            const ready = score >= 4;

            removeCheckIntroduction();
            window.Maths1to9Lesson?.clearSectionAction?.('comparison');

            if (ready) {
                root.innerHTML = (
                    '<section class="lesson-completion" aria-label="Place value complete">'
                    + '<div class="lesson-completion__result">'
                    + '<div><h2>Place value complete</h2><p>Nice work — you’re ready to move on.</p></div>'
                    + `<p class="lesson-completion__score">${score}<small>/${questions.length}</small></p>`
                    + '</div>'
                    + '<div class="lesson-completion__recommendations" aria-live="polite">'
                    + '<p class="lesson-completion__loading">Finding your next lesson…</p>'
                    + '</div>'
                    + '<a class="lesson-completion__all-lessons" href="../../">View all lessons</a>'
                    + '</section>'
                );

                renderRecommendations(
                    root.querySelector('.lesson-completion__recommendations')
                );

                if (!state.lessonCompleted) {
                    state.lessonCompleted = true;
                    completeSection('comparison');
                    window.Maths1to9Lesson?.completeLesson?.();
                }

                return;
            }

            root.innerHTML = (
                '<section class="lesson-completion lesson-completion--retry" aria-label="Final check result">'
                + '<div class="lesson-completion__result">'
                + '<div><h2>Practise once more</h2><p>Review the questions you missed, then have another go.</p></div>'
                + `<p class="lesson-completion__score">${score}<small>/${questions.length}</small></p>`
                + '</div>'
                + '<div class="lesson-completion__actions">'
                + '<button class="lesson-completion__review-button" type="button">Review mistakes</button>'
                + '<button class="lesson-completion__practice-button" type="button">Back to practice</button>'
                + '</div>'
                + (state.showMistakes
                    ? `<div class="lesson-completion__mistakes"><h3>Review your answers</h3><div class="practice-review__list">${missedQuestionsHtml()}</div></div>`
                    : '')
                + '</section>'
            );

            root.querySelector('.lesson-completion__review-button')
                ?.addEventListener('click', () => {
                    state.showMistakes = true;
                    renderReview();
                });
            root.querySelector('.lesson-completion__practice-button')
                ?.addEventListener('click', () => {
                    state.index = 0;
                    state.answers = [];
                    state.showMistakes = false;
                    state.resetOnReturn = true;
                    refreshQuestions();
                    window.Maths1to9Lesson?.goToSection?.('question-bank', {
                        moveFocus: true
                    });
                });
        }

        function render() {
            if (state.index >= questions.length) { renderReview(); return; }
            const question = questions[state.index];
            const answer = state.answers[state.index] || { value: '', decision: '', reason: '', order: [] };
            let body = '';
            if (question.type === 'number') {
                body = `<input class="final-check-input" inputmode="decimal" aria-label="Your answer" value="${escapeHtml(answer.value)}">`;
            } else if (question.type === 'misconception') {
                const choices = answer.decision ? question.reasons : ['Yes', 'No'];
                body = `<div class="question-options" role="radiogroup">${choices.map((choice) => `<button class="answer-choice ${choice === (answer.decision || answer.reason) ? 'is-selected' : ''}" type="button" data-final-choice="${escapeHtml(choice)}">${escapeHtml(choice)}</button>`).join('')}</div>`;
            } else {
                body = `<div class="ordering-tile-bank">${question.values.filter((value) => !answer.order.includes(value)).map((value) => `<button class="ordering-tile" type="button" data-final-tile="${escapeHtml(value)}">${escapeHtml(value)}</button>`).join('')}</div><div class="ordering-row"><div class="ordering-slots">${question.values.map((value, index) => `<button class="ordering-slot ${answer.order[index] ? 'is-filled' : ''}" type="button" data-final-slot="${index}">${escapeHtml(answer.order[index] || '')}</button>`).join('')}</div></div>`;
            }
            root.innerHTML = `<article class="question-card question-card--bare"><p class="final-check-count">Question ${state.index + 1} of ${questions.length}</p><p class="question-prompt">${escapeHtml(question.prompt)}</p>${body}</article>`;
            root.querySelector('.final-check-input')?.addEventListener('input', (event) => {
                answer.value = event.target.value;
                state.answers[state.index] = answer;
                window.Maths1to9Lesson?.setSectionAction?.('comparison', {
                    label: 'Next question',
                    disabled: answer.value.trim() === '',
                    onClick: () => {
                        const correct = isCorrect(question, answer);
                        window.Maths1to9Lesson?.recordAssessment?.({ questionType: 'place-value', questionId: `final-check-${state.index + 1}`, correct });
                        state.index += 1;
                        render();
                    }
                });
            });
            root.querySelectorAll('[data-final-choice]').forEach((button) => button.addEventListener('click', () => { if (!answer.decision) answer.decision = button.dataset.finalChoice; else answer.reason = button.dataset.finalChoice; state.answers[state.index] = answer; render(); }));
            root.querySelectorAll('[data-final-tile]').forEach((button) => button.addEventListener('click', () => { answer.order.push(button.dataset.finalTile); state.answers[state.index] = answer; render(); }));
            root.querySelectorAll('[data-final-slot]').forEach((button) => button.addEventListener('click', () => { const value = answer.order[Number(button.dataset.finalSlot)]; if (value) { answer.order = answer.order.filter((item) => item !== value); state.answers[state.index] = answer; render(); } }));
            const complete = question.type === 'misconception' ? Boolean(answer.decision && answer.reason) : question.type === 'order' ? answer.order.length === question.values.length : answer.value.trim() !== '';
            window.Maths1to9Lesson?.setSectionAction?.('comparison', { label: 'Next question', disabled: !complete, onClick: () => { const correct = isCorrect(question, answer); window.Maths1to9Lesson?.recordAssessment?.({ questionType: 'place-value', questionId: `final-check-${state.index + 1}`, correct }); state.index += 1; render(); }});
        }

        document.addEventListener('maths1to9:section-change', (event) => {
            if (
                state.resetOnReturn
                && event.detail?.sectionId === 'comparison'
            ) {
                state.resetOnReturn = false;
                render();
            }
        });

        render();
    }

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

        if (questions[0]?.type) {
            mountFinalCheck(root, questions);
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
                ? 'Continue'
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

    /* ---------- finite practice session ---------- */

    function mountPracticeSession(root) {
        gateSection('question-bank');

        const sessionLength = Math.max(
            1,
            Number(root.dataset.sessionLength) || 10
        );
        const readyScore = Math.min(
            sessionLength,
            Math.max(1, Number(root.dataset.readyScore) || 8)
        );

        const state = {
            bag: createQuestionBag(),
            questions: [],
            currentIndex: -1,
            completionDispatched: false,
            reviewing: false,
            focusTypes: []
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
                correct: false,
                attempts: 0,
                firstAttemptCorrect: null,
                awaitingRetry: false,
                announcement: ''
            });

            state.currentIndex = state.questions.length - 1;
        }

        function currentEntry() {
            return state.questions[state.currentIndex];
        }

        function firstTryCorrectCount() {
            return state.questions.filter(
                (entry) => entry.firstAttemptCorrect === true
            ).length;
        }

        function completedQuestionCount() {
            return state.questions.filter((entry) => (
                entry.checked && !entry.awaitingRetry
            )).length;
        }

        function updateHeaderProgress() {
            const completed = completedQuestionCount();
            const progress = Math.round((completed / sessionLength) * 100);
            const header = document.querySelector('.lesson-header__inner');
            if (!header) return;

            let badge = document.getElementById('practice-session-progress');
            if (!badge) {
                badge = document.createElement('div');
                badge.id = 'practice-session-progress';
                badge.className = 'lesson-header__practice-progress';
                header.append(badge);
            }

            const practiceSection = document.getElementById('lesson-section-question-bank');
            badge.hidden = Boolean(practiceSection?.hidden);
            badge.innerHTML = (
                '<div class="practice-progress-summary">'
                + `<div class="practice-progress-ring" style="--practice-progress: ${progress}%" role="progressbar" aria-label="${completed} of ${sessionLength} questions complete" aria-valuemin="0" aria-valuemax="${sessionLength}" aria-valuenow="${completed}">`
                + `<span>${completed}</span>`
                + '</div>'
                + '</div>'
            );
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
            if (option === entry.question.answer && !entry.awaitingRetry) {
                return 'is-correct-answer';
            }
            return '';
        }

        function reviewHtml() {
            const score = firstTryCorrectCount();
            const ready = score >= readyScore;
            const summary = ready
                ? "You're ready"
                : 'Practise once more';
            const detail = ready
                ? `You got ${score} out of ${sessionLength} correct.`
                : `You got ${score} out of ${sessionLength} correct. Aim for ${readyScore} to be ready.`;
            const answers = state.questions.map((entry, index) => {
                const questionText = [
                    entry.question.prompt,
                    entry.question.display
                ].filter(Boolean).join(' ');
                const answerText = entry.question.interaction === 'order-tiles'
                    ? entry.lastAnswer.replaceAll(' → ', ' < ')
                    : entry.lastAnswer;
                const status = entry.firstAttemptCorrect
                    ? 'Correct first try'
                    : entry.correct
                        ? 'Correct after retry'
                        : 'Practise';
                const statusClass = entry.firstAttemptCorrect
                    ? 'is-correct'
                    : entry.correct
                        ? 'is-recovered'
                        : 'is-incorrect';

                return (
                    `<article class="practice-review-item ${statusClass}">`
                    + `<p class="practice-review-item__number">${status} · Question ${index + 1}</p>`
                    + `<h3>${escapeHtml(questionText)}</h3>`
                    + `<p>Your answer: <strong>${escapeHtml(answerText)}</strong></p>`
                    + (entry.correct ? '' : `<p>Answer: <strong>${escapeHtml(entry.question.interaction === 'order-tiles' ? entry.question.correctOrder.join(' < ') : entry.question.answer)}</strong></p>`)
                    + `<p class="practice-review-item__explanation">${escapeHtml(entry.question.explanation)}</p>`
                    + '</article>'
                );
            }).join('');

            return (
                '<section class="practice-review" aria-label="Practice review">'
                + `<div class="practice-review__score ${ready ? 'is-ready' : ''}">`
                + `<div class="practice-progress-ring practice-progress-ring--complete" style="--practice-progress: ${Math.round((score / sessionLength) * 100)}%"><span>${score}<small>/${sessionLength}</small></span></div>`
                + `<div><h2>${summary}</h2><p>${detail}</p></div>`
                + '</div>'
                + '<h3 class="practice-review__title">Review your answers</h3>'
                + `<div class="practice-review__list">${answers}</div>`
                + '</section>'
            );
        }

        function render() {
            if (state.reviewing) {
                root.innerHTML = reviewHtml();
                updateHeaderProgress();
                window.Maths1to9Lesson?.setSectionAction?.('question-bank', {
                    label: firstTryCorrectCount() >= readyScore
                        ? 'Continue to Check'
                        : 'Practise weak areas',
                    disabled: false,
                    onClick: () => {
                        if (firstTryCorrectCount() >= readyScore) {
                            if (!state.completionDispatched) {
                                state.completionDispatched = true;
                                completeSection('question-bank');
                            }
                            window.Maths1to9Lesson?.goToSection?.('comparison', {
                                unlock: true
                            });
                            return;
                        }
                        restart(true);
                    }
                });
                return;
            }

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

            const orderingTileWidth = isOrdering
                ? Math.min(196, Math.max(112, Math.ceil(
                    Math.max(...question.values.map((value) => value.length)) * 13 + 44
                )))
                : 0;

            const orderingHtml = isOrdering ? `
                <div class="ordering-interaction" style="--ordering-tile-width: ${orderingTileWidth}px">
                <div class="ordering-tile-bank" aria-label="Numbers to order">
                    ${question.values
                        .filter((value) => !entry.order.includes(value))
                        .map((value) => `<button class="ordering-tile" type="button" draggable="true" data-order-tile="${escapeHtml(value)}" data-order-source="pool">${escapeHtml(value)}</button>`)
                        .join('')}
                </div>
                <div class="ordering-row" aria-label="Order numbers from smallest to largest">
                    <div class="ordering-slots">
                        ${question.values.map((value, index) => {
                            const placed = entry.order[index];
                            const caption = index === 0
                                ? 'smallest'
                                : index === question.values.length - 1
                                    ? 'largest'
                                    : '';
                            const slot = placed
                                ? `<button class="ordering-slot is-filled" type="button" draggable="true" data-order-slot="${index}" data-order-tile="${escapeHtml(placed)}" data-order-source="slot" aria-label="${escapeHtml(placed)} in position ${index + 1}. Press to return it to the number pool.">${escapeHtml(placed)}</button>`
                                : `<button class="ordering-slot" type="button" data-order-slot="${index}" aria-label="Empty position ${index + 1}"><span class="ordering-slot__placeholder">${index === entry.order.length ? 'Tap a number' : ''}</span></button>`;
                            const sign = index < question.values.length - 1
                                ? '<span class="ordering-row__inequality" aria-hidden="true">&lt;</span>'
                                : '';
                            return `<div class="ordering-slot-group">${slot}<span class="ordering-row__caption">${caption}</span></div>${sign}`;
                        }).join('')}
                    </div>
                </div>
                <div class="ordering-announcement" aria-live="polite">${escapeHtml(entry.announcement || '')}</div>
                </div>
            ` : '';

            const displayHtml = question.display
                ? `<div class="interactive-equation">${escapeHtml(question.display)}</div>`
                : '';

            const feedbackHtml = entry.awaitingRetry
                ? '<div class="question-feedback is-visible is-incorrect"><strong>Not quite.</strong> Check the place values and try a different answer.</div>'
                : entry.checked
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

            const action = entry.awaitingRetry
                ? 'retry'
                : entry.checked
                    ? 'next'
                    : 'check';
            const orderingSlotCount = isOrdering
                ? question.values.length
                : 0;
            const orderingHasEmptySlots = isOrdering
                && entry.order.length !== orderingSlotCount;
            const actionLabel = action === 'next'
                ? 'Continue'
                : action === 'retry'
                    ? 'Try again'
                    : orderingHasEmptySlots
                        ? `Place all ${orderingSlotCount} to check`
                        : 'Check answer';
            const actionDisabled = action === 'check' && (
                isOrdering
                    ? orderingHasEmptySlots
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
            );

            updateHeaderProgress();

            if (isOrdering) {
                root.querySelectorAll('[data-order-source="pool"]').forEach((tile) => {
                    tile.addEventListener('click', () => {
                        if (entry.checked) return;
                        const value = tile.dataset.orderTile;
                        if (entry.order.length < question.values.length) {
                            entry.announcement = `${value} placed in position ${entry.order.length + 1}.`;
                            entry.order.push(value);
                        }
                        render();
                    });
                });

                root.querySelectorAll('[data-order-tile]').forEach((tile) => {
                    tile.addEventListener('dragstart', (event) => {
                        event.dataTransfer?.setData('text/plain', tile.dataset.orderTile);
                    });
                });

                root.querySelectorAll('[data-order-slot]').forEach((slot) => {
                    slot.addEventListener('click', () => {
                        if (entry.checked) return;
                        const slotIndex = Number(slot.dataset.orderSlot);
                        const value = entry.order[slotIndex];
                        if (!value) return;
                        entry.order.splice(slotIndex, 1);
                        entry.announcement = `${value} returned to the number pool.`;
                        render();
                    });

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
                        entry.announcement = `${value} placed in position ${destination + 1}.`;
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
                            entry.attempts += 1;

                            if (entry.attempts === 1) {
                                entry.firstAttemptCorrect = entry.correct;
                            }

                            entry.awaitingRetry = (
                                entry.attempts === 1 && !entry.correct
                            );

                            if (entry.attempts === 1) {
                                window.Maths1to9Lesson?.recordAssessment?.({
                                    questionType: entry.assessmentType,
                                    questionId: entry.questionId,
                                    correct: entry.correct
                                });
                            }

                            render();
                            return;
                        }

                        if (action === 'retry') {
                            entry.selected = '';
                            entry.order = [];
                            entry.checked = false;
                            entry.awaitingRetry = false;
                            render();
                            return;
                        }

                        if (state.currentIndex < sessionLength - 1) {
                            state.currentIndex += 1;
                        } else {
                            state.reviewing = true;
                        }

                        render();
                    }
                });

        }

        function restart(targeted = false) {
            const missedTypes = state.questions
                .filter((entry) => !entry.firstAttemptCorrect)
                .map((entry) => entry.assessmentType);

            state.focusTypes = targeted ? missedTypes : [];
            state.bag = createQuestionBag(state.focusTypes);
            state.questions = [];
            state.currentIndex = -1;
            state.reviewing = false;
            state.completionDispatched = false;
            while (state.questions.length < sessionLength) {
                addQuestion();
            }
            state.currentIndex = 0;
            render();
        }

        while (state.questions.length < sessionLength) {
            addQuestion();
        }
        state.currentIndex = 0;

        document.addEventListener('maths1to9:section-change', (event) => {
            const badge = document.getElementById('practice-session-progress');
            if (badge) {
                badge.hidden = event.detail?.sectionId !== 'question-bank';
            }
        });

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
            mountPracticeSession(practiceRoot);
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
