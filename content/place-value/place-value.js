(() => {
    'use strict';

    // The Practice question types (comparing and ordering moved to the Greater than and less than lesson).
    const types = ['digitValue', 'scaledProduct', 'powerOfTen', 'wordsToFigures', 'digitCards', 'digitCount', 'closestNumber', 'numberLine'];
    const addCommas = value => {
        const [whole, fraction] = String(value).split('.');
        return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (fraction === undefined ? '' : `.${fraction}`);
    };
    function normaliseDecimalAnswer(value) {
        const tidy = window.Maths1to9LessonEngine.tidyNumber(value);
        if (tidy === null) return null;
        const negative = tidy.startsWith('-');
        const [whole, fraction = ''] = tidy.replace(/^-/, '').split('.');
        const integer = whole.replace(/^0+(?=\d)/, '') || '0';
        const decimal = fraction.replace(/0+$/, '');
        return (negative && (integer !== '0' || decimal) ? '-' : '') + integer + (decimal ? `.${decimal}` : '');
    }
    function formatScaledInteger(integer, places, keepTrailingZeros = false) {
        let digits = String(integer);
        if (places < 0) return Number(integer) === 0 ? '0' : addCommas(digits + '0'.repeat(-places));
        digits = digits.padStart(places + 1, '0');
        const whole = places ? digits.slice(0, -places) : digits;
        let fraction = places ? digits.slice(-places) : '';
        if (!keepTrailingZeros) fraction = fraction.replace(/0+$/, '');
        return addCommas(whole + (fraction ? `.${fraction}` : ''));
    }
    const scaleValue = (integer, places) => formatScaledInteger(integer, places);
    function exactParts(value) {
        const text = normaliseDecimalAnswer(value);
        if (text === null) return null;
        const [whole, fraction = ''] = text.split('.');
        return { digits: BigInt(whole + fraction), places: fraction.length };
    }
    function compareDecimals(left, right) {
        const a = exactParts(left), b = exactParts(right);
        const first = a.digits * 10n ** BigInt(b.places), second = b.digits * 10n ** BigInt(a.places);
        return first < second ? -1 : first > second ? 1 : 0;
    }
    const padDecimal = (value, places = 3) => {
        const [whole, fraction = ''] = String(value).split('.');
        return `${whole}.${fraction.padEnd(places, '0')}`;
    };
    const digitWords = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
    const tensWords = ['', 'ten', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    const placeNames = { 3: 'thousands', 2: 'hundreds', 1: 'tens', 0: 'units', '-1': 'tenths', '-2': 'hundredths', '-3': 'thousandths' };
    function digitValueWords(digit, exponent) {
        if (exponent === 0) return digitWords[digit];
        if (exponent === 1) return tensWords[digit];
        const place = placeNames[exponent].replace(/s$/, '');
        return `${digitWords[digit]} ${place}${exponent < 0 && digit !== 1 ? 's' : ''}`;
    }
    const option = (label, feedback, correct = false) => ({ label: String(label), feedback, correct });
    const keyFor = value => normaliseDecimalAnswer(value) ?? String(value);
    function makeQuestion({ type, mode = 'choice', prompt, answer, wrong, feedback, fallback, ...details }) {
        const candidates = wrong.filter(([label], index, list) => keyFor(label) !== keyFor(answer)
            && list.findIndex(([other]) => keyFor(other) === keyFor(label)) === index);
        const result = { ...details, questionType: type, input: mode, prompt, feedback };
        if (mode === 'choice') result.options = [option(answer, feedback, true), ...candidates.slice(0, 3).map(([label, message]) => option(label, message))];
        else Object.assign(result, { answer: String(answer), tolerance: 0,
            rules: candidates.map(([value, feedback]) => ({ value: String(value), feedback })), fallback });
        return result;
    }
    function digitQuestion(number, digit, mode = 'choice') {
        const plain = number.replace(/,/g, '');
        const point = plain.includes('.') ? plain.indexOf('.') : plain.length;
        const position = plain.indexOf(String(digit));
        const exponent = position < point ? point - position - 1 : point - position;
        const otherPlaces = [0, exponent - 1, exponent + 1, -3, -2, -1, 1, 2, 3].filter(place => place >= -3 && place <= 3 && place !== exponent);
        const value = place => mode === 'choice' ? digitValueWords(digit, place) : scaleValue(digit, -place);
        return makeQuestion({ type: 'digitValue', mode, number, digit, exponent, kind: 'digit',
            prompt: `In ${number}, what is the value of the digit ${digit}?`, answer: value(exponent),
            wrong: otherPlaces.map(place => [value(place), place === 0 ? 'That is the digit itself. Its column tells you what it is worth.'
                : `That uses the ${placeNames[place]} column. Read the digit's actual column.`]),
            feedback: `${digit} is in the ${placeNames[exponent]} column. Its value is ${scaleValue(digit, -exponent)}.`,
            fallback: 'Find the column. Multiply the digit by the value of one place in that column.' });
    }
    function generateDigitValueQuestion(random, mode) {
        const E = window.Maths1to9LessonEngine;
        const wholeLength = E.randomInt(2, 4, random), decimalLength = E.randomInt(1, 3, random);
        const digits = E.shuffle(['1', '2', '3', '4', '5', '6', '7', '8', '9'], random).slice(0, wholeLength + decimalLength);
        const number = `${addCommas(digits.slice(0, wholeLength).join(''))}.${digits.slice(wholeLength).join('')}`;
        return digitQuestion(number, Number(digits[E.randomInt(0, digits.length - 1, random)]), mode);
    }
    function comparisonQuestion(left, right, mode = 'choice', scenario = 'direct', names = ['Zara', 'Maya']) {
        if (scenario === 'games') { left = padDecimal(left, 2); right = padDecimal(right, 2); }
        const comparison = compareDecimals(left, right);
        const symbol = comparison < 0 ? '<' : comparison > 0 ? '>' : '=';
        const smaller = comparison < 0 ? left : right, bigger = comparison > 0 ? left : right;
        let prompt, answer, wrong;
        if (scenario === 'race') {
            const winner = comparison < 0 ? names[0] : names[1];
            prompt = `${names[0]} finishes a race in ${left} seconds. ${names[1]} finishes in ${right} seconds. `
                + (mode === 'choice' ? 'Who has the shorter time?' : 'What is the shorter time, in seconds?');
            answer = mode === 'choice' ? winner : smaller;
            wrong = mode === 'choice' ? [[names.find(name => name !== winner), 'That is the longer time. The shorter time is the smaller number.'],
                ['They have the same time.', 'The times have different values. Line up the decimal places.'],
                ['You cannot compare these times.', 'Add zeros to the end if needed. Then compare the columns.']]
                : [[bigger, 'That is the longer time. Choose the smaller number.'],
                    [smaller.replace('.', ''), 'Keep the decimal point in its place.'], [bigger.replace('.', ''), 'Do not remove the decimal point.']];
        } else if (scenario === 'games') {
            prompt = `One game costs £${left} and another costs £${right}. `
                + (mode === 'choice' ? 'Which game costs more?' : 'What is the higher price, in pounds?');
            answer = mode === 'choice' ? `£${bigger}` : bigger;
            wrong = mode === 'choice' ? [[`£${smaller}`, 'That is the lower price. Compare the pounds first, then the decimal places.'],
                ['They cost the same.', 'The prices have different values. Add a zero if it helps you compare.'],
                ['You cannot compare these prices.', 'Both prices are in pounds. Line up the decimal points.']]
                : [[smaller, 'That is the lower price. Choose the greater number.'],
                    [bigger.replace('.', ''), 'Keep the decimal point. The price is in pounds.'], [smaller.replace('.', ''), 'Do not remove the decimal point.']];
        } else {
            prompt = mode === 'choice' ? `Which comparison of ${left} and ${right} is correct?`
                : `Which is greater: ${left} or ${right}? Type the number.`;
            answer = mode === 'choice' ? `${left} ${symbol} ${right}` : bigger;
            wrong = mode === 'choice' ? [
                [`${left} ${symbol === '<' ? '>' : '<'} ${right}`, 'That sign points the wrong way. Compare the first column that is different.'],
                [`${left} = ${right}`, 'These numbers are not equal. Line up the decimal places.'],
                ['These numbers cannot be compared.', 'Extra zeros at the end do not change a decimal. Add them, then compare.']
            ] : [[smaller, 'That is the smaller number. Compare from left to right.'],
                [bigger.replace('.', ''), 'The decimal point must stay in place.'], [smaller.replace('.', ''), 'Keep the decimal point when you write the number.']];
        }
        return makeQuestion({ type: 'compare', mode, scenario, left, right, names, symbol, kind: 'compare', prompt, answer, wrong,
            feedback: `${padDecimal(left)} ${symbol} ${padDecimal(right)}`,
            fallback: 'Line up the decimal points. Add zeros at the end, then compare from left to right.' });
    }
    function generateComparisonQuestion(random, mode) {
        const E = window.Maths1to9LessonEngine;
        if (E.randomInt(1, 3, random) === 1) {
            const whole = E.randomInt(2, 12, random), tenth = E.randomInt(1, 7, random), hundredth = E.randomInt(1, 9, random);
            const pair = E.shuffle([`${whole}.${tenth}${hundredth}`, `${whole}.${tenth + 1}`], random);
            return comparisonQuestion(...pair, mode, E.randomInt(0, 1, random) ? 'race' : 'games', E.shuffle(['Zara', 'Maya'], random));
        }
        const whole = E.randomInt(0, 5, random), places = E.randomInt(1, 2, random);
        const fraction = E.randomInt(10 ** (places - 1), 10 ** places - 1, random);
        const short = `${whole}.${fraction}`;
        const units = whole * 1000 + fraction * 10 ** (3 - places);
        const long = formatScaledInteger(units + (E.randomInt(0, 1, random) ? 1 : -1) * E.randomInt(1, 9, random), 3, true);
        return comparisonQuestion(...E.shuffle([short, long], random), mode);
    }
    function orderingQuestion(values, mode = 'custom', prompt = 'Put these numbers in order from smallest to largest.') {
        const ordered = [...values].sort(compareDecimals);
        const feedback = `From smallest to largest: ${ordered.join(' < ')}`;
        const base = { questionType: 'order', input: mode, kind: 'order', values, correctOrder: ordered, prompt: mode === 'custom' ? prompt : `${prompt} ${values.join('; ')}`, feedback };
        if (mode === 'custom') return { ...base, widget: orderingWidget(values) };
        if (mode === 'number') return makeQuestion({ type: 'order', mode, kind: 'order', values, correctOrder: ordered,
            prompt: `Which number is smallest? ${values.join('; ')}`, answer: ordered[0], feedback,
            wrong: ordered.slice(1).map(number => [number, 'There is a smaller number. Add zeros and compare the columns.']),
            fallback: 'Line up the decimal points and compare from left to right. Give just the smallest number.' });
        const wrong = [
            [[...ordered].reverse(), 'That goes from largest to smallest.'],
            [[ordered[0], ordered[2], ordered[1], ordered[3]], 'Compare the two middle numbers one column at a time.'],
            [[ordered[1], ordered[0], ordered[2], ordered[3]], 'Compare the first two numbers again. Add zeros to line up the decimal places.'],
            [[ordered[0], ordered[1], ordered[3], ordered[2]], 'Compare the last two numbers again. Start on the left.']
        ];
        return { ...base, options: [option(ordered.join(' → '), feedback, true), ...wrong.slice(0, 3).map(([order, message]) => option(order.join(' → '), message))] };
    }
    function generateOrderingQuestion(random, mode) {
        const E = window.Maths1to9LessonEngine;
        const context = E.randomInt(1, 3, random) === 1;
        const length = E.randomInt(0, 7, random);
        const whole = context ? E.randomInt(2, 4, random) : length ? E.randomInt(10 ** (length - 1), 10 ** length - 1, random) : 0;
        const exact = whole * 1000 + E.randomInt(1, 8, random) * 100;
        const units = [exact - E.randomInt(1, 9, random), exact, exact + E.randomInt(1, 7, random) * 10, exact + E.randomInt(8, 15, random) * 10];
        const values = E.shuffle(units.map(value => formatScaledInteger(value, 3)), random);
        return orderingQuestion(values, mode, context ? 'Put these ribbon lengths in metres in order from shortest to longest.' : undefined);
    }
    const productOffsets = [[1, 0], [0, 1], [1, 1], [2, 0], [0, 2], [2, 1], [1, 2], [-1, 0], [0, -1], [-1, 1], [1, -1]];
    function scaledProductQuestion(first, second, offsets, mode = 'number') {
        const product = first * second, total = offsets[0] + offsets[1];
        const answer = scaleValue(product, total);
        return makeQuestion({ type: 'scaledProduct', mode, kind: 'product', first, second, offsets,
            prompt: `Given that ${first} × ${second} = ${addCommas(product)}, what is ${scaleValue(first, offsets[0])} × ${scaleValue(second, offsets[1])}?`,
            answer, wrong: [
                [scaleValue(product, total + 1), 'That makes the product ten times too small. Track both changes.'],
                [scaleValue(product, total - 1), 'That makes the product ten times too large. Track both changes.'],
                [scaleValue(product, total + 2), 'Too many places have been changed. Combine the changes to both factors.'],
                [addCommas(product), 'The product stays the same only when the two changes cancel out.']
            ], feedback: `${scaleValue(first, offsets[0])} × ${scaleValue(second, offsets[1])} = ${answer}`,
            fallback: 'Track the change to each factor. Apply both changes to the known product.' });
    }
    function generateScaledProductQuestion(random, mode) {
        const E = window.Maths1to9LessonEngine;
        return scaledProductQuestion(E.randomInt(11, 89, random), E.randomInt(12, 79, random), productOffsets[E.randomInt(0, productOffsets.length - 1, random)], mode);
    }
    function powerOfTenQuestion(digits, originalPlaces, movement, mode = 'number') {
        const answer = scaleValue(digits, originalPlaces + movement);
        return makeQuestion({ type: 'powerOfTen', mode, kind: 'power', digits, originalPlaces, movement,
            prompt: `What is ${scaleValue(digits, originalPlaces)} ${movement > 0 ? '÷' : '×'} ${addCommas(10 ** Math.abs(movement))}?`,
            answer, wrong: [
                [scaleValue(digits, originalPlaces - movement), 'That moves the digits in the opposite direction.'],
                [scaleValue(digits, originalPlaces + movement + (movement > 0 ? 1 : -1)), 'That moves the digits one place too far.'],
                [scaleValue(digits, originalPlaces + movement - (movement > 0 ? 1 : -1)), 'That moves the digits one place too few.']
            ], feedback: `${scaleValue(digits, originalPlaces)} ${movement > 0 ? '÷' : '×'} ${addCommas(10 ** Math.abs(movement))} = ${answer}`,
            fallback: 'Multiplying moves every digit left. Dividing moves every digit right. Count one place for each zero.' });
    }
    function generatePowerOfTenQuestion(random, mode) {
        const E = window.Maths1to9LessonEngine;
        return powerOfTenQuestion(E.randomInt(101, 99999, random), E.randomInt(0, 3, random), E.randomInt(1, 3, random) * (E.randomInt(0, 1, random) ? 1 : -1), mode);
    }
    const displayNegative = value => String(value).replace('-', '−');
    function negativeValues(random) {
        const E = window.Maths1to9LessonEngine;
        const negatives = E.shuffle(Array.from({ length: 12 }, (_, i) => -i - 1), random).slice(0, 2);
        const positive = E.randomInt(1, 9, random);
        const remaining = Array.from({ length: 22 }, (_, i) => i - 12).filter(n => !negatives.includes(n) && n !== positive);
        return E.shuffle([...negatives, positive, remaining[E.randomInt(0, remaining.length - 1, random)]], random);
    }
    function negativeOrderQuestion(values, prompt = 'Put these numbers in order from smallest to largest.') {
        const written = values.map(displayNegative);
        const question = orderingQuestion(written, 'custom', prompt);
        const originalMark = question.widget.mark;
        question.widget.mark = value => {
            const result = originalMark(value);
            return result.correct ? result : { ...result, feedback: 'Start with the number furthest left on the number line. Numbers closer to 0 are greater than numbers further below 0.' };
        };
        return { ...question, questionType: 'negOrder' };
    }
    function negativeSymbolQuestion(a, b) {
        const left = displayNegative(a), right = displayNegative(b), sign = a < b ? '<' : '>';
        return { questionType: 'negSymbol', input: 'choice', prompt: 'Which is correct?', values: [a, b],
            options: [
                option(`${left} ${sign} ${right}`, `${displayNegative(Math.min(a, b))} is further left on the number line.`, true),
                option(`${left} ${sign === '<' ? '>' : '<'} ${right}`, 'That compares the numbers without their minus signs. On a number line, the number further left is smaller.'),
                option(`${left} = ${right}`, 'These are different numbers. One is further left on the number line.'),
                option("You can't compare negative numbers", 'You can. The number further left on the number line is smaller.')
            ] };
    }
    function generateNegative(item, random) {
        const E = window.Maths1to9LessonEngine;
        const values = negativeValues(random);
        if (item.type === 'negOrder') return negativeOrderQuestion(values);
        if (item.type === 'negSymbol') {
            const pair = values.filter(n => n < 0).slice(0, 2);
            return negativeSymbolQuestion(pair[0], pair[1]);
        }
        if (item.type === 'negCoolest') {
            const sorted = [...values].sort((a, b) => a - b), answer = sorted[0];
            const nearestNegative = sorted.filter(n => n < 0).at(-1), largest = sorted.at(-1);
            const remaining = sorted.find(n => ![answer, nearestNegative, largest].includes(n));
            return makeQuestion({ type: item.type, mode: 'choice', values,
                prompt: `Here are four temperatures: ${values.map(n => `${displayNegative(n)} °C`).join(', ')}. Which is the coldest?`,
                answer: displayNegative(answer),
                wrong: [
                    [displayNegative(nearestNegative), 'That has the smallest number after the minus sign, but it is closest to 0. The further below 0, the colder.'],
                    [displayNegative(largest), 'That is the warmest. The coldest is the lowest number.'],
                    [displayNegative(remaining), 'There is a number further left on the number line. Look for the one furthest below 0.']
                ], feedback: `${displayNegative(answer)} °C is the coldest. It is the lowest temperature.` });
        }
        const decimal = random() < 0.5;
        const first = E.randomInt(1, decimal ? 9 : 12, random);
        const others = Array.from({ length: decimal ? 9 : 12 }, (_, i) => i + 1).filter(n => n !== first);
        const second = others[E.randomInt(0, others.length - 1, random)];
        const pair = [first, second].map(n => -n / (decimal ? 10 : 1));
        const answer = Math.max(...pair), smaller = Math.min(...pair);
        return makeQuestion({ type: 'negGreatest', mode: 'number', values: pair,
            prompt: `Which is greater: ${displayNegative(pair[0])} or ${displayNegative(pair[1])}? Type the number.`,
            answer: displayNegative(answer), wrong: [
                [displayNegative(smaller), 'That one is further below 0, so it is smaller. Choose the number closer to 0.'],
                [displayNegative(-answer), 'Keep the minus sign. Both numbers are below 0.']
            ], feedback: `${displayNegative(answer)} is greater. It is further right on the number line.`,
            fallback: 'On a number line, the greater number is further right.' });
    }
    function negativeNumberLine(host) {
        const ns = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('viewBox', '0 0 360 95');
        svg.setAttribute('class', 'pv-negative-line');
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', 'Number line from minus eight to four. Marked points: minus seven, minus two, zero and three.');
        function node(tag, attrs) {
            const element = document.createElementNS(ns, tag);
            for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, String(value));
            svg.append(element);
            return element;
        }
        node('line', { x1: 20, y1: 40, x2: 340, y2: 40, stroke: '#26344d', 'stroke-width': 2 });
        for (let value = -8; value <= 4; value++) {
            const x = 24 + (value + 8) * 26;
            node('line', { x1: x, y1: 35, x2: x, y2: 45, stroke: '#26344d' });
            const label = node('text', { x, y: 65, 'text-anchor': 'middle', fill: '#26344d', 'font-size': 13 });
            label.textContent = displayNegative(value);
            if ([-7, -2, 0, 3].includes(value)) node('circle', { cx: x, cy: 40, r: 4, fill: '#2769c5' });
        }
        host.append(svg);
    }
    /* Practice questions in the style of past exam papers (our own wording and numbers). */
    const teenWords = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    function wordsUnderHundred(n) {
        if (n < 10) return digitWords[n];
        if (n < 20) return teenWords[n - 10];
        return tensWords[Math.floor(n / 10)] + (n % 10 ? `-${digitWords[n % 10]}` : '');
    }
    function wordsUnderThousand(n) {
        const hundreds = Math.floor(n / 100), rest = n % 100;
        if (!hundreds) return wordsUnderHundred(rest);
        return `${digitWords[hundreds]} hundred${rest ? ` and ${wordsUnderHundred(rest)}` : ''}`;
    }
    /* 6040009 → "six million, forty thousand and nine" (British style, up to 9,999,999). */
    function numberToWords(n) {
        const millions = Math.floor(n / 1e6), thousands = Math.floor(n / 1000) % 1000, rest = n % 1000;
        const groups = [];
        if (millions) groups.push(`${wordsUnderThousand(millions)} million`);
        if (thousands) groups.push(`${wordsUnderThousand(thousands)} thousand`);
        let text = groups.join(', ');
        if (rest) text = groups.length ? `${text}${rest < 100 ? ' and ' : ', '}${wordsUnderThousand(rest)}` : wordsUnderThousand(rest);
        return text;
    }
    function generateWordsToFiguresQuestion(random, mode) {
        const E = window.Maths1to9LessonEngine;
        const millions = E.randomInt(2, 9, random);
        const thousandShapes = [() => E.randomInt(2, 9, random) * 10, () => E.randomInt(2, 9, random) * 100, () => E.randomInt(1, 9, random) * 100 + E.randomInt(1, 9, random)];
        const restShapes = [() => E.randomInt(1, 9, random), () => E.randomInt(2, 9, random) * 10, () => E.randomInt(1, 9, random) * 100 + E.randomInt(1, 9, random)];
        const thousands = thousandShapes[E.randomInt(0, 2, random)]();
        const rest = restShapes[E.randomInt(0, 2, random)]();
        const number = millions * 1e6 + thousands * 1000 + rest;
        const words = numberToWords(number);
        const digits = String(number);
        const dropped = Number(digits.replace('0', ''));
        const spoken = Number(`${millions}${thousands}${rest}`);
        const noMillions = number - millions * 1e6;
        const shifted = thousands < 100 ? millions * 1e6 + thousands * 10000 + rest : millions * 1e6 + thousands * 1000 + rest * 10;
        return makeQuestion({ type: 'wordsToFigures', mode, kind: 'words', number,
            prompt: mode === 'choice' ? `Which number is ${words}?` : `Write ${words} in figures.`,
            answer: addCommas(number), wrong: [
                [addCommas(spoken), 'That writes each part next to the next one. Every column needs a digit, so empty columns need a 0.'],
                [addCommas(dropped), 'That number has a digit missing. Every empty column needs a 0.'],
                [addCommas(shifted), 'One part is in the wrong columns. Check the place value of each part of the words.'],
                [addCommas(noMillions), 'That leaves out the millions.']
            ],
            feedback: `${words.charAt(0).toUpperCase()}${words.slice(1)} is ${addCommas(number)}. Empty columns hold a 0.`,
            fallback: 'Write each part in its own columns: millions, then thousands, then hundreds, tens and units. Put a 0 in any empty column.' });
    }
    function arrangements(digits) {
        if (digits.length <= 1) return [digits.join('')];
        return digits.flatMap((digit, index) => arrangements(digits.filter((_, other) => other !== index)).map(rest => digit + rest));
    }
    function generateDigitCardsQuestion(random) {
        const E = window.Maths1to9LessonEngine;
        const even = [2, 4, 6, 8][E.randomInt(0, 3, random)];
        const odds = E.shuffle([1, 3, 5, 7, 9], random).slice(0, 2);
        const digits = E.shuffle([0, even, ...odds], random).map(String);
        const all = arrangements(digits).sort();
        const valid = all.filter(text => text[0] !== '0');
        const smallestEven = random() < 0.5;
        const list = `${digits.slice(0, 3).join(', ')} and ${digits[3]}`;
        if (smallestEven) {
            const evens = valid.filter(text => Number(text) % 2 === 0);
            const answer = evens[0];
            return makeQuestion({ type: 'digitCards', kind: 'cards', digits,
                prompt: `Use each of the digits ${list} once to make a four-digit number. What is the smallest even number you can make?`,
                answer, wrong: [
                    [valid[0], `${valid[0]} is smaller, but it is odd. An even number ends in 0, 2, 4, 6 or 8.`],
                    [all.find(text => text[0] === '0' && Number(text) % 2 === 0), 'A four-digit number cannot start with 0. That is only a three-digit number.'],
                    [evens[1], `${evens[1]} is even, but ${answer} is smaller.`],
                    [valid.find(text => Number(text) % 2 === 1), 'That number is odd. An even number ends in 0, 2, 4, 6 or 8.'],
                    [evens[2], `${evens[2]} is even, but ${answer} is smaller. Put the smallest digits on the left.`]
                ],
                feedback: `An even number ends in 0, 2, 4, 6 or 8, and a four-digit number cannot start with 0. The smallest is ${answer}.` });
        }
        const odd = valid.filter(text => Number(text) % 2 === 1);
        const answer = odd.at(-1);
        return makeQuestion({ type: 'digitCards', kind: 'cards', digits,
            prompt: `Use each of the digits ${list} once to make a four-digit number. What is the largest odd number you can make?`,
            answer, wrong: [
                [valid.at(-1), `${valid.at(-1)} is larger, but it is even. An odd number ends in 1, 3, 5, 7 or 9.`],
                [odd.at(-2), `${odd.at(-2)} is odd, but ${answer} is larger. Put the biggest digits on the left.`],
                [odd[0], `${odd[0]} is the smallest odd number you can make, not the largest.`],
                [valid.filter(text => Number(text) % 2 === 0).at(-1), 'That number is even. An odd number ends in 1, 3, 5, 7 or 9.'],
                [odd.at(-3), `${odd.at(-3)} is odd, but ${answer} is larger. Put the biggest digits on the left.`]
            ],
            feedback: `An odd number ends in 1, 3, 5, 7 or 9. Put the biggest digits on the left: the largest is ${answer}.` });
    }
    function generateDigitCountQuestion(random) {
        const E = window.Maths1to9LessonEngine;
        const length = E.randomInt(2, 4, random), zeros = E.randomInt(1, 3, random);
        const multiplier = addCommas(10 ** zeros);
        const example = E.randomInt(10 ** (length - 1), 10 ** length - 1, random);
        const answer = length + zeros;
        return makeQuestion({ type: 'digitCount', kind: 'count', length, zeros,
            prompt: `A whole number has ${length} digits. It is multiplied by ${multiplier}. How many digits does the answer have?`,
            answer, wrong: [
                [length, 'That is how many digits it had before. Multiplying by 10, 100 or 1,000 makes the number longer.'],
                [answer - 1, `Multiplying by ${multiplier} moves every digit ${zeros} column${zeros > 1 ? 's' : ''} left, so it adds ${zeros} digit${zeros > 1 ? 's' : ''}.`],
                [answer + 1, `That adds one digit too many. ${multiplier} has ${zeros} zero${zeros > 1 ? 's' : ''}.`],
                [answer + 2, `That adds too many digits. ${multiplier} has ${zeros} zero${zeros > 1 ? 's' : ''}.`]
            ],
            feedback: `Multiplying by ${multiplier} moves every digit ${zeros} column${zeros > 1 ? 's' : ''} left, so the answer has ${answer} digits. For example, ${addCommas(example)} × ${multiplier} = ${addCommas(example * 10 ** zeros)}.` });
    }
    function generateClosestNumberQuestion(random) {
        const E = window.Maths1to9LessonEngine;
        for (;;) {
            const digits = E.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], random).slice(0, 3).map(String);
            const target = E.randomInt(2, 8, random) * 100;
            const byDistance = arrangements(digits).map(Number).sort((a, b) => Math.abs(a - target) - Math.abs(b - target));
            if (Math.abs(byDistance[0] - target) === Math.abs(byDistance[1] - target)) continue;
            const answer = byDistance[0];
            const describe = value => `${value} is ${Math.abs(value - target)} ${value < target ? 'below' : 'above'} ${target}`;
            return makeQuestion({ type: 'closestNumber', kind: 'closest', digits, target,
                prompt: `Use ${digits[0]}, ${digits[1]} and ${digits[2]} once each to make a three-digit number. Which number is closest to ${target}?`,
                answer, wrong: [byDistance[1], byDistance[2], byDistance[5]].map(value => [value, `${describe(value)}. ${answer} is closer.`]),
                feedback: `${describe(answer)}. No other number you can make is closer.` });
        }
    }
    /* Reading a point between two whole numbers. Only the ends are labelled, so
       pupils first work out what one gap is worth. */
    function generateNumberLineQuestion(random, mode) {
        const E = window.Maths1to9LessonEngine;
        const left = E.randomInt(1, 9, random), gaps = [4, 5, 10][E.randomInt(0, 2, random)];
        const step = 1 / gaps, tick = E.randomInt(2, gaps - 1, random);
        const at = count => String(Number((left + count * step).toFixed(2)));
        const answer = at(tick);
        const stepText = String(Number(step.toFixed(2)));
        const wrong = [
            [at(tick - 1), `That is one gap too few. Count the gaps from ${left}, not the marks.`],
            [at(tick + 1), `That is one gap too many. Count the gaps from ${left} to P.`],
            [String(left + 1), `${left + 1} is the labelled end. P is before it.`],
            [at(gaps - tick), `That counts from ${left + 1}. Count the gaps from ${left}, on the left.`],
            [String(Number((left + tick * step / 10).toFixed(3))), `Each gap is ${stepText}, not ${String(Number((step / 10).toFixed(3)))}.`]
        ];
        if (gaps !== 10) wrong.unshift([String(Number((left + tick * 0.1).toFixed(2))), `There are ${gaps} gaps, not 10, so each gap is ${stepText}, not 0.1.`]);
        const question = makeQuestion({ type: 'numberLine', mode, left, gaps, tick,
            prompt: mode === 'choice' ? 'What number is at P on the number line?' : 'What number is at P on the number line? Type the number.',
            answer, wrong,
            feedback: `There are ${gaps} gaps between ${left} and ${left + 1}, so each gap is ${stepText}. P is ${tick} gaps after ${left}, so it is ${answer}.`,
            fallback: `Count the gaps between ${left} and ${left + 1}. Share 1 between them to find what one gap is worth.` });
        return { ...question, figure: host => numberLineFigure(host, left, gaps, tick) };
    }
    function numberLineFigure(host, left, gaps, tick) {
        const ns = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('viewBox', '0 0 360 90');
        svg.setAttribute('class', 'pv-negative-line');
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', `Number line from ${left} to ${left + 1} with ${gaps} equal gaps. P is at mark ${tick} after ${left}.`);
        function node(tag, attrs, text) {
            const element = document.createElementNS(ns, tag);
            for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, String(value));
            if (text !== undefined) element.textContent = text;
            svg.append(element);
            return element;
        }
        const x = count => 30 + count * (300 / gaps);
        node('line', { x1: 20, y1: 50, x2: 340, y2: 50, stroke: '#26344d', 'stroke-width': 2 });
        for (let count = 0; count <= gaps; count++) {
            const end = count === 0 || count === gaps;
            node('line', { x1: x(count), y1: end ? 42 : 45, x2: x(count), y2: end ? 58 : 55, stroke: '#26344d', 'stroke-width': end ? 2 : 1.5 });
        }
        node('text', { x: x(0), y: 78, 'text-anchor': 'middle', fill: '#26344d', 'font-size': 15 }, String(left));
        node('text', { x: x(gaps), y: 78, 'text-anchor': 'middle', fill: '#26344d', 'font-size': 15 }, String(left + 1));
        node('path', { d: `M${x(tick)} 40 l-6 -10 h12 z`, fill: '#2769c5' });
        node('text', { x: x(tick), y: 22, 'text-anchor': 'middle', fill: '#2769c5', 'font-size': 15, 'font-weight': 700 }, 'P');
        host.append(svg);
    }
    function generate(item, random) {
        if (item.type.startsWith('neg')) return prepare(generateNegative(item, random), random);
        const generators = { digitValue: generateDigitValueQuestion, compare: generateComparisonQuestion, order: generateOrderingQuestion,
            scaledProduct: generateScaledProductQuestion, powerOfTen: generatePowerOfTenQuestion,
            wordsToFigures: generateWordsToFiguresQuestion, digitCards: generateDigitCardsQuestion,
            digitCount: generateDigitCountQuestion, closestNumber: generateClosestNumberQuestion,
            numberLine: generateNumberLineQuestion };
        return generators[item.type](random, item.mode || 'choice');
    }
    /* Every session has the five exam-style questions and six place value questions, in a random order.
       Comparing and ordering (including negatives) are taught in the Greater than and less than lesson. */
    function pick(random) {
        const E = window.Maths1to9LessonEngine;
        const original = [{ type: 'digitValue', mode: 'choice' }, { type: 'digitValue', mode: 'number' },
            { type: 'scaledProduct', mode: 'choice' }, { type: 'scaledProduct', mode: 'number' },
            { type: 'powerOfTen', mode: 'choice' }, { type: 'powerOfTen', mode: 'number' }];
        // Half choice, half typed: words to figures and the number line take one each.
        const wordsTyped = E.randomInt(0, 1, random) === 1;
        const examStyle = [{ type: 'wordsToFigures', mode: wordsTyped ? 'number' : 'choice' }, { type: 'digitCards', mode: 'choice' },
            { type: 'digitCount', mode: 'number' }, { type: 'closestNumber', mode: 'choice' },
            { type: 'numberLine', mode: wordsTyped ? 'choice' : 'number' }];
        return E.shuffle([...original, ...examStyle], random)
            .map(item => ({ ...item, seed: E.randomInt(0, 4294967295, random) }));
    }
    const prepare = (question, random) => question.options
        ? { ...question, options: window.Maths1to9LessonEngine.shuffle(question.options, random) } : { ...question };

    function element(tag, text = '', className = '') {
        const node = document.createElement(tag);
        node.textContent = text;
        node.className = className;
        return node;
    }
    function tapCardsWidget(numbers, target, { inRow = false, tip = 'Add zeros so both have the same number of digits, then compare.' } = {}) {
        const isBelow = number => compareDecimals(number, target) < 0;
        const expected = numbers.filter(isBelow);
        const normalise = value => Array.isArray(value) ? [...value] : [];
        return {
            isEmpty(value) { return normalise(value).length === 0; },
            answerText(value) { return normalise(value).join(', '); },
            mark(value) {
                const chosen = normalise(value);
                const wrongPick = chosen.find(number => !isBelow(number));
                const missed = expected.find(number => !chosen.includes(number));
                if (wrongPick !== undefined) {
                    if (wrongPick === target) {
                        return { correct: false, feedback: `${target} is not less than ${target}. They are the same number.` };
                    }
                    if (compareDecimals(wrongPick, target) === 0) {
                        return { correct: false, feedback: `${wrongPick} is the same as ${target}, so it is not less than ${target}.` };
                    }
                    return { correct: false, feedback: `${wrongPick} is bigger than ${target}. ${tip}` };
                }
                if (missed !== undefined) {
                    return { correct: false, feedback: `${missed} is less than ${target} too. ${tip}` };
                }
                return { correct: true, feedback: `${expected.slice(0, -1).join(', ')} and ${expected.at(-1)} are all less than ${target}.` };
            },
            render(host, { value, editable, onChange }) {
                let chosen = normalise(value), canEdit = editable;
                const grid = element('div', '', inRow ? 'pv-tap-cards pv-tap-cards--row' : 'pv-tap-cards');
                grid.setAttribute('role', 'group');
                grid.setAttribute('aria-label', 'Numbers to choose from');
                host.append(grid);
                const cards = numbers.map(number => {
                    const card = element('button', number, 'pv-tap-card');
                    card.type = 'button';
                    card.addEventListener('click', () => {
                        if (!canEdit) return;
                        chosen = chosen.includes(number) ? chosen.filter(other => other !== number) : [...chosen, number];
                        paint();
                        onChange(chosen);
                    });
                    grid.append(card);
                    return card;
                });
                function paint() {
                    cards.forEach((card, index) => {
                        card.setAttribute('aria-pressed', String(chosen.includes(numbers[index])));
                        card.disabled = !canEdit;
                    });
                }
                paint();
                return {
                    update(next) { chosen = normalise(next.value); canEdit = next.editable; paint(); },
                    focus() { cards[0]?.focus(); }
                };
            }
        };
    }
    /* Pupils put the digits 6, 7 and 0 into the hundreds, tens and units slots to make the biggest number.
       A tap sends a card to the next empty slot (or back again); on desktop the cards can also be dragged.
       Each placed digit shows what it is worth. */
    function biggestNumberWidget() {
        const digits = ['6', '7', '0'];
        const columns = [{ name: 'hundreds', size: 100 }, { name: 'tens', size: 10 }, { name: 'units', size: 1 }];
        const normalise = value => Array.isArray(value) && value.length === columns.length ? [...value] : [null, null, null];
        const worth = (digit, column) => String(Number(digit) * columns[column].size);
        return {
            isEmpty(value) { return normalise(value).includes(null); },
            answerText(value) { return normalise(value).join(''); },
            mark(value) {
                const placed = normalise(value);
                if (placed[0] !== '7') {
                    return { correct: false, feedback: 'Put the biggest digit, 7, in the hundreds column. That is where a digit is worth the most.' };
                }
                if (placed[1] !== '6') {
                    return { correct: false, feedback: '6 is bigger than 0, so the 6 goes in the tens column.' };
                }
                return { correct: true, feedback: '7 is the biggest digit, so it goes in the hundreds column, where it is worth the most. 760 is the biggest number you can make.' };
            },
            render(host, { value, editable, onChange }) {
                let placed = normalise(value), canEdit = editable, justDragged = false;
                const block = element('div', '', 'pv-build');
                const slotRow = element('div', '', 'pv-build__slots');
                const slots = columns.map(column => {
                    const slot = element('div', '', 'pv-build__slot');
                    const holder = element('div', '', 'pv-build__holder');
                    const worthLine = element('span', '', 'pv-build__worth');
                    slot.append(element('span', column.name, 'pv-build__label'), holder, worthLine);
                    slotRow.append(slot);
                    return { holder, worthLine };
                });
                const pool = element('div', '', 'pv-build__pool');
                pool.setAttribute('role', 'group');
                pool.setAttribute('aria-label', 'Digit cards');
                const chips = digits.map(digit => {
                    const chip = element('button', digit, 'pv-chip');
                    chip.type = 'button';
                    chip.dataset.digit = digit;
                    chip.addEventListener('click', () => {
                        if (justDragged) { justDragged = false; return; }
                        if (!canEdit) return;
                        const from = placed.indexOf(digit);
                        if (from !== -1) placed[from] = null;
                        else if (placed.includes(null)) placed[placed.indexOf(null)] = digit;
                        else return;
                        commit();
                    });
                    chip.addEventListener('pointerdown', event => startDrag(event, chip, digit));
                    return chip;
                });
                block.append(slotRow, pool);
                host.append(block);

                function commit() {
                    const before = new Map(chips.map(chip => [chip, chip.getBoundingClientRect()]));
                    paint();
                    slideFrom(before);
                    onChange([...placed]);
                }
                /* Each card glides from where it was to where it now sits. */
                function slideFrom(before) {
                    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
                    chips.forEach(chip => {
                        const was = before.get(chip), now = chip.getBoundingClientRect();
                        const dx = was.left - now.left, dy = was.top - now.top;
                        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
                        chip.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.2, .8, .2, 1)' });
                    });
                }
                function holderAt(x, y) {
                    return slots.findIndex(({ holder }) => {
                        const box = holder.getBoundingClientRect();
                        return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
                    });
                }
                /* Mouse dragging. Touch keeps to taps, so the page still scrolls normally on phones. */
                function startDrag(event, chip, digit) {
                    if (!canEdit || event.pointerType === 'touch' || event.button !== 0) return;
                    const startX = event.clientX, startY = event.clientY;
                    let dragging = false, target = -1;
                    const move = moveEvent => {
                        const dx = moveEvent.clientX - startX, dy = moveEvent.clientY - startY;
                        if (!dragging && Math.hypot(dx, dy) < 6) return;
                        dragging = true;
                        chip.classList.add('is-dragging');
                        chip.style.transform = `translate(${dx}px, ${dy}px)`;
                        target = holderAt(moveEvent.clientX, moveEvent.clientY);
                        slots.forEach(({ holder }, index) => holder.classList.toggle('is-target', index === target));
                    };
                    const end = () => {
                        chip.removeEventListener('pointermove', move);
                        chip.removeEventListener('pointerup', end);
                        chip.removeEventListener('pointercancel', end);
                        slots.forEach(({ holder }) => holder.classList.remove('is-target'));
                        if (!dragging) return;
                        justDragged = true;
                        setTimeout(() => { justDragged = false; }, 0);
                        const before = new Map(chips.map(other => [other, other.getBoundingClientRect()]));
                        chip.classList.remove('is-dragging');
                        chip.style.transform = '';
                        const from = placed.indexOf(digit);
                        if (target !== -1) {
                            const displaced = placed[target];
                            placed[target] = digit;
                            if (from !== -1 && from !== target) placed[from] = displaced;
                        } else if (from !== -1) {
                            placed[from] = null;
                        }
                        paint();
                        slideFrom(before);
                        onChange([...placed]);
                    };
                    chip.setPointerCapture(event.pointerId);
                    chip.addEventListener('pointermove', move);
                    chip.addEventListener('pointerup', end);
                    chip.addEventListener('pointercancel', end);
                }
                function paint() {
                    slots.forEach(({ holder, worthLine }, index) => {
                        const digit = placed[index];
                        holder.classList.toggle('is-filled', digit !== null);
                        worthLine.textContent = digit === null ? ' ' : `worth ${worth(digit, index)}`;
                        if (digit !== null) holder.append(chips[digits.indexOf(digit)]);
                    });
                    chips.forEach((chip, index) => {
                        const column = placed.indexOf(digits[index]);
                        if (column === -1) pool.append(chip);
                        chip.disabled = !canEdit;
                        chip.setAttribute('aria-label', column === -1 ? digits[index] : `${digits[index]} in the ${columns[column].name} column. Tap to take it back.`);
                    });
                    pool.hidden = !placed.includes(null);
                }
                paint();
                return {
                    update(next) { placed = normalise(next.value); canEdit = next.editable; paint(); },
                    focus() { chips.find(chip => !chip.disabled)?.focus(); }
                };
            }
        };
    }
    /* A row of place-value cards whose digits pupils move left or right, one column at a time.
       ← and → buttons sit beside the row (under it on phones); a mouse can also drag the digits,
       and the arrow keys work when the row has focus. A 0 fills any empty column between the
       first digit and the units column. moves > 0 means the digits moved left (× 10 each time). */
    function shiftCards({ digits, minMoves, maxMoves, label, describe, onMove }) {
        const EMPTY_CARD = ' ';
        const headings = ['thousands', 'hundreds', 'tens', 'units', 'tenths'];
        const onesColumn = 3;
        let moves = 0, canEdit = false;
        const node = element('div', '', 'pv-shift');
        const row = element('div', '', 'pv-number-chart pv-shift__row');
        row.setAttribute('role', 'slider');
        row.setAttribute('aria-label', `${label} Use the arrow keys to move the digits.`);
        row.setAttribute('aria-valuemin', String(minMoves));
        row.setAttribute('aria-valuemax', String(maxMoves));
        const slots = headings.map((heading, index) => {
            if (index === 4) {
                const pointCard = element('div', '', 'pv-number-column');
                pointCard.append(element('span', 'decimal point'), element('strong', '.'));
                row.append(pointCard);
            }
            const card = element('div', '', 'pv-number-column');
            const slot = element('strong', EMPTY_CARD);
            card.append(element('span', heading), slot);
            row.append(card);
            return slot;
        });
        /* Measured on the card, which never moves, not on the digit, which may be mid-slide. */
        const centreOf = slot => {
            const box = slot.parentElement.getBoundingClientRect();
            return box.left + box.width / 2;
        };
        const controls = element('div', '', 'pv-shift__controls');
        /* The same chunky ← ×10 and ÷10 → buttons as the 4.5 × 2.3 playground. */
        const moveButton = (arrow, side, change) => {
            const multiply = change > 0;
            const button = element('button', '', `pv-shift__move pv-shift__move--${side} pv-play__button pv-play__button--${multiply ? 'multiply' : 'divide'}`);
            button.append(element('span', arrow, 'pv-play__arrow'), element('span', multiply ? '×10' : '÷10'));
            button.type = 'button';
            button.setAttribute('aria-label', `${multiply ? 'Multiply' : 'Divide'} by 10: move the digits one column ${side}`);
            button.addEventListener('click', () => moveTo(moves + change));
            controls.append(button);
            return button;
        };
        const left = moveButton('←', 'left', 1);
        const right = moveButton('→', 'right', -1);
        node.append(row, controls);

        function moveTo(next) {
            next = Math.max(minMoves, Math.min(maxMoves, next));
            if (!canEdit || next === moves) return;
            const startPoints = digits.map(item => centreOf(slots[item.column - moves]));
            moves = next;
            paint();
            slideFrom(startPoints);
            onMove(moves);
        }
        function slideFrom(startPoints) {
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
            digits.forEach((item, index) => {
                const slot = slots[item.column - moves];
                const distance = startPoints[index] - centreOf(slot);
                slot.animate([{ transform: `translateX(${distance}px)` }, { transform: 'none' }], { duration: 250, easing: 'ease-out' });
            });
        }
        row.addEventListener('keydown', event => {
            if (event.key === 'ArrowLeft') moveTo(moves + 1);
            else if (event.key === 'ArrowRight') moveTo(moves - 1);
            else return;
            event.preventDefault();
        });
        /* Mouse dragging: the digits snap to whichever columns the pointer has dragged them to.
           Touch is left alone so the page still scrolls; phones use the arrow buttons. */
        row.addEventListener('pointerdown', event => {
            if (!canEdit || event.pointerType === 'touch' || event.button !== 0) return;
            const lastDigit = digits[digits.length - 1];
            const startCentre = centreOf(slots[lastDigit.column - moves]);
            const startX = event.clientX;
            row.setPointerCapture(event.pointerId);
            row.classList.add('is-dragging');
            const move = moveEvent => {
                const x = startCentre + moveEvent.clientX - startX;
                let nearest = 0;
                slots.forEach((slot, index) => {
                    if (Math.abs(centreOf(slot) - x) < Math.abs(centreOf(slots[nearest]) - x)) nearest = index;
                });
                moveTo(lastDigit.column - nearest);
            };
            const end = () => {
                row.classList.remove('is-dragging');
                row.removeEventListener('pointermove', move);
                row.removeEventListener('pointerup', end);
                row.removeEventListener('pointercancel', end);
            };
            row.addEventListener('pointermove', move);
            row.addEventListener('pointerup', end);
            row.addEventListener('pointercancel', end);
        });
        function paint() {
            slots.forEach(slot => { slot.textContent = EMPTY_CARD; });
            digits.forEach(item => { slots[item.column - moves].textContent = item.digit; });
            const firstDigit = digits[0].column - moves;
            slots.forEach((slot, index) => {
                if (index > firstDigit && index <= onesColumn && slot.textContent === EMPTY_CARD) slot.textContent = '0';
            });
            /* An empty tenths card shows 0, so 3,840 reads 3840.0 and every card has a digit. */
            if (slots[onesColumn + 1].textContent === EMPTY_CARD) slots[onesColumn + 1].textContent = '0';
            row.setAttribute('aria-valuenow', String(moves));
            row.setAttribute('aria-valuetext', describe(moves));
            row.tabIndex = canEdit ? 0 : -1;
            row.classList.toggle('is-editable', canEdit);
            left.disabled = !canEdit || moves === maxMoves;
            right.disabled = !canEdit || moves === minMoves;
        }
        return {
            node,
            set(nextMoves, editable) { moves = nextMoves; canEdit = editable; paint(); },
            focus() { row.focus(); }
        };
    }
    /* 38.4 × 100: pupils move the digits of 38.4 two columns left. */
    function timesHundredWidget() {
        const results = ['38.4', '384', '3,840'];
        const normalise = value => Number.isInteger(value) && value >= 0 && value <= 2 ? value : 0;
        return {
            isEmpty(value) { return normalise(value) === 0; },
            answerText(value) { return results[normalise(value)]; },
            mark(value) {
                if (normalise(value) === 2) {
                    return { correct: true, feedback: 'Every digit moved two columns to the left. The 0 fills the empty units column. 38.4 × 100 = 3,840.' };
                }
                return { correct: false, feedback: 'You moved the digits one column. That is × 10. To multiply by 100, move them two columns.' };
            },
            render(host, { value, editable, onChange }) {
                const shift = shiftCards({
                    digits: [{ digit: '3', column: 2 }, { digit: '8', column: 3 }, { digit: '4', column: 4 }],
                    minMoves: 0, maxMoves: 2, label: 'Digits of 38.4.',
                    describe: moves => `The digits show ${results[moves]}`,
                    onMove: onChange
                });
                host.append(shift.node);
                shift.set(normalise(value), editable);
                return {
                    update(next) { shift.set(normalise(next.value), next.editable); },
                    focus() { shift.focus(); }
                };
            }
        };
    }
    /* A playground for 4.5 × 2.3 = 10.35 in place-value columns from ten-thousands to ten-thousandths, styled like the tables on Learn slides 6 to 8.
       Each number can be multiplied or divided by 10 as often as pupils like (×10 moves its digits
       a column left, ÷10 a column right). The buttons only stop when a digit would fall off the
       edge of the table. Pupils use the buttons beside each row or drag a row with a mouse. Any exploring counts: there is no wrong answer. */
    function placeValuePlayground() {
        /* Each number is its digits and how many of them come after the point: 4.5 is 45 with 1. */
        const rows = [
            { name: 'top', digits: 45, places: 1 },
            { name: 'bottom', digits: 23, places: 1 }
        ];
        const product = { digits: 1035, places: 2 };
        const headings = ['ten-thousands', 'thousands', 'hundreds', 'tens', 'units', 'tenths', 'hundredths', 'thousandths', 'ten-thousandths'];
        const onesColumn = 4;
        const decimalColumns = headings.length - onesColumn - 1;
        const feedback = 'Multiply one number by 10 and the answer is 10 times bigger. Divide one by 10 and the answer is 10 times smaller. Do one of each and they cancel out.';
        const showing = (row, moves) => scaleValue(row.digits, row.places - moves);
        const answer = moves => scaleValue(product.digits, product.places - (moves.top + moves.bottom));
        /* A number fits when its whole part reaches no further left than the first column
           and its decimals no further right than the last. */
        const fitsTable = text => {
            const [whole, fraction = ''] = text.replace(/,/g, '').split('.');
            return whole.length <= onesColumn + 1 && fraction.length <= decimalColumns;
        };
        const fits = moves => fitsTable(showing(rows[0], moves.top)) && fitsTable(showing(rows[1], moves.bottom)) && fitsTable(answer(moves));
        const normalise = value => {
            const pick = side => Number.isInteger(value?.[side]) ? value[side] : 0;
            const moves = { top: pick('top'), bottom: pick('bottom'), tried: value?.tried === true };
            return fits(moves) ? moves : { top: 0, bottom: 0, tried: moves.tried };
        };
        const canMove = (moves, name, change) => fits({ ...moves, [name]: moves[name] + change });
        const sentence = moves => `${showing(rows[0], moves.top)} × ${showing(rows[1], moves.bottom)} = ${answer(moves)}`;
        return {
            checkLabel: 'Continue',
            isEmpty(value) { return !normalise(value).tried; },
            answerText(value) { return sentence(normalise(value)); },
            mark() { return { correct: true, feedback }; },
            render(host, { value, editable, onChange }) {
                let moves = normalise(value), canEdit = editable;
                const play = element('div', '', 'pv-play');
                const sheet = element('div', '', 'pv-paper');
                sheet.setAttribute('role', 'img');
                /* The column names are the table's own top row, so they always line up with the digits. */
                sheet.append(element('span', '', 'pv-paper__cell pv-paper__sign'));
                headings.forEach((heading, index) => {
                    const cell = element('span', '', 'pv-paper__cell pv-paper__box pv-paper__heading is-top');
                    cell.append(element('span', heading));
                    if (index === 0) cell.classList.add('is-first');
                    if (index === headings.length - 1) cell.classList.add('is-last');
                    sheet.append(cell);
                });
                const lines = ['top', 'bottom', 'answer'].map(kind => {
                    sheet.append(element('span', { bottom: '×', answer: '=' }[kind] ?? '', 'pv-paper__cell pv-paper__sign'));
                    const cells = headings.map((heading, index) => {
                        const cell = element('span', '', 'pv-paper__cell pv-paper__box');
                        if (index === 0) cell.classList.add('is-first');
                        if (index === headings.length - 1) cell.classList.add('is-last');
                        if (index === onesColumn) cell.classList.add('has-point');
                        if (kind === 'answer') cell.classList.add('is-ruled', 'is-bottom');
                        else cell.dataset.row = kind;
                        sheet.append(cell);
                        return cell;
                    });
                    return { kind, cells };
                });
                /* Wide screens: ×10 sits left of each row and ÷10 right of it, with the badge after.
                   Phones have no room beside the table, so a second set sits underneath it.
                   Only one set is ever shown; the other is display: none. */
                const leftSide = element('div', '', 'pv-play__left');
                const rightSide = element('div', '', 'pv-play__right');
                const phone = element('div', '', 'pv-play__phone');
                const controls = rows.map(row => ({ name: row.name, multiply: [], divide: [] }));
                leftSide.append(element('span'));
                rightSide.append(element('span'));
                const button = (control, kind) => {
                    const multiply = kind === 'multiply';
                    const node = element('button', '', `pv-shift__move pv-play__button pv-play__button--${kind}`);
                    node.append(element('span', multiply ? '←' : '→', 'pv-play__arrow'), element('span', multiply ? '×10' : '÷10'));
                    node.type = 'button';
                    node.setAttribute('aria-label', `${multiply ? 'Multiply' : 'Divide'} the ${control.name} number by 10`);
                    node.addEventListener('click', () => moveTo(control.name, moves[control.name] + (multiply ? 1 : -1)));
                    control[kind].push(node);
                    return node;
                };
                controls.forEach(control => {
                    const leftCell = element('div', '', 'pv-play__controls');
                    leftCell.append(button(control, 'multiply'));
                    leftSide.append(leftCell);
                    const rightCell = element('div', '', 'pv-play__controls');
                    rightCell.append(button(control, 'divide'));
                    rightSide.append(rightCell);
                    const phoneLine = element('div', '', 'pv-play__controls');
                    phoneLine.append(element('span', `${control.name === 'top' ? 'Top' : 'Bottom'} number`, 'pv-play__label'),
                        button(control, 'multiply'), button(control, 'divide'));
                    phone.append(phoneLine);
                });
                play.append(leftSide, sheet, rightSide, phone);
                host.append(play);

                function moveTo(name, target) {
                    /* Step towards the target one column at a time, stopping at the table's edge. */
                    let next = moves[name];
                    const step = Math.sign(target - next);
                    while (next !== target && canMove({ ...moves, [name]: next }, name, step)) next += step;
                    if (!canEdit || next === moves[name]) return;
                    const change = next - moves[name];
                    moves = { ...moves, [name]: next, tried: true };
                    paint();
                    slide(name, change);
                    slide('answer', change);
                    onChange({ ...moves });
                }
                /* Digits glide sideways from where they were. */
                function slide(kind, change) {
                    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
                    const line = lines.find(item => item.kind === kind);
                    const step = line.cells[1].getBoundingClientRect().left - line.cells[0].getBoundingClientRect().left;
                    line.cells.filter(cell => cell.textContent).forEach(cell => {
                        cell.animate([{ transform: `translateX(${change * step}px)` }, { transform: 'none' }], { duration: 250, easing: 'ease-out' });
                    });
                }
                /* Writes a number into the boxes, lined up on the units column. */
                function fill(kind, text) {
                    const [whole, fraction = ''] = text.replace(/,/g, '').split('.');
                    const line = lines.find(item => item.kind === kind);
                    line.cells.forEach((cell, index) => {
                        const position = index - (onesColumn - whole.length + 1);
                        const digit = index <= onesColumn ? whole[position] : fraction[index - onesColumn - 1];
                        cell.textContent = digit ?? '';
                    });
                }
                function paint() {
                    fill('top', showing(rows[0], moves.top));
                    fill('bottom', showing(rows[1], moves.bottom));
                    fill('answer', answer(moves));
                    controls.forEach(({ name, multiply, divide }) => {
                        multiply.forEach(node => { node.disabled = !canEdit || !canMove(moves, name, 1); });
                        divide.forEach(node => { node.disabled = !canEdit || !canMove(moves, name, -1); });
                    });
                    sheet.setAttribute('aria-label', sentence(moves));
                    sheet.classList.toggle('is-editable', canEdit);
                }
                /* Mouse dragging: drag a number's digits along its row, one column at a time.
                   Touch is left alone so the page still scrolls; phones use the arrows. */
                sheet.addEventListener('pointerdown', event => {
                    const name = event.target.dataset?.row;
                    if (!canEdit || !name || event.pointerType === 'touch' || event.button !== 0) return;
                    const line = lines.find(item => item.kind === name);
                    const step = line.cells[1].getBoundingClientRect().left - line.cells[0].getBoundingClientRect().left;
                    const startX = event.clientX, startMoves = moves[name];
                    sheet.setPointerCapture(event.pointerId);
                    sheet.classList.add('is-dragging');
                    const move = moveEvent => moveTo(name, startMoves - Math.round((moveEvent.clientX - startX) / step));
                    const end = () => {
                        sheet.classList.remove('is-dragging');
                        sheet.removeEventListener('pointermove', move);
                        sheet.removeEventListener('pointerup', end);
                        sheet.removeEventListener('pointercancel', end);
                    };
                    sheet.addEventListener('pointermove', move);
                    sheet.addEventListener('pointerup', end);
                    sheet.addEventListener('pointercancel', end);
                });
                paint();
                return {
                    update(next) { moves = normalise(next.value); canEdit = next.editable; paint(); },
                    focus() { controls[0].multiply.find(node => node.offsetParent)?.focus(); }
                };
            }
        };
    }
    /* 46.275 as a row of digit cards. Tapping a card turns it over to show its column and
       what the digit is worth (tens / 40). Tap again to turn it back. Check unlocks once every
       card has been turned at least once. */
    function flipCardsWidget() {
        const cards = [
            { digit: '4', column: 'tens', worth: '40' },
            { digit: '6', column: 'units', worth: '6' },
            { digit: '2', column: 'tenths', worth: '0.2' },
            { digit: '7', column: 'hundredths', worth: '0.07' },
            { digit: '5', column: 'thousandths', worth: '0.005' }
        ];
        const pointAfter = 1;
        const normalise = value => ({
            open: Array.isArray(value?.open) ? cards.map((card, index) => value.open[index] === true) : cards.map(() => false),
            seen: Array.isArray(value?.seen) ? cards.map((card, index) => value.seen[index] === true) : cards.map(() => false)
        });
        const feedback = 'In 46.275, the 4 is worth 40, the 6 is worth 6, the 2 is worth 0.2, the 7 is worth 0.07 and the 5 is worth 0.005.';
        return {
            checkLabel: 'Continue',
            isEmpty(value) { return normalise(value).seen.includes(false); },
            answerText() { return '40 + 6 + 0.2 + 0.07 + 0.005 = 46.275'; },
            mark() { return { correct: true, feedback }; },
            render(host, { value, editable, onChange }) {
                let state = normalise(value), canEdit = editable;
                const row = element('div', '', 'pv-flip');
                row.setAttribute('role', 'group');
                row.setAttribute('aria-label', 'The digits of 46.275. Tap a card to turn it over.');
                const buttons = cards.map((card, index) => {
                    const button = element('button', '', 'pv-flip__card');
                    button.type = 'button';
                    const inner = element('span', '', 'pv-flip__inner');
                    const front = element('span', card.digit, 'pv-flip__face pv-flip__front');
                    const back = element('span', '', 'pv-flip__face pv-flip__back');
                    back.append(element('span', card.column, 'pv-flip__column'), element('strong', card.worth, 'pv-flip__worth'));
                    inner.append(front, back);
                    button.append(inner);
                    button.addEventListener('click', () => {
                        if (!canEdit) return;
                        state.open[index] = !state.open[index];
                        state.seen[index] = true;
                        paint();
                        onChange({ open: [...state.open], seen: [...state.seen] });
                    });
                    row.append(button);
                    if (index === pointAfter) row.append(element('span', '.', 'pv-flip__point'));
                    return button;
                });
                host.append(row);
                function paint() {
                    buttons.forEach((button, index) => {
                        const card = cards[index];
                        button.classList.toggle('is-open', state.open[index]);
                        button.setAttribute('aria-pressed', String(state.open[index]));
                        button.setAttribute('aria-label', state.open[index] ? `${card.digit}: ${card.column}, worth ${card.worth}` : `${card.digit}. Tap to see what it is worth.`);
                        button.disabled = !canEdit;
                    });
                }
                paint();
                return {
                    update(next) { state = normalise(next.value); canEdit = next.editable; paint(); },
                    focus() { buttons[0].focus(); }
                };
            }
        };
    }
    /* "Six million, four hundred and fifty-three thousand and nine" in figures. Pupils tap a
       column box (or let it move on by itself) and tap blue digit buttons to fill it. The words
       for the column being filled light up like a highlighter pen; the hundreds and tens have no
       words, which is the clue that they hold 0. */
    function wordsToFiguresWidget() {
        const columns = ['millions', 'hundred-thousands', 'ten-thousands', 'thousands', 'hundreds', 'tens', 'units'];
        const answer = '6453009';
        /* Each piece of the words, with the column it belongs to (null for joining words). */
        const pieces = [
            ['six million', 0], [', ', null], ['four hundred', 1], [' and ', null], ['fifty', 2], ['-', null],
            ['three thousand', 3], [' and ', null], ['nine', 6]
        ];
        const normalise = value => Array.isArray(value) && value.length === columns.length
            ? value.map(digit => /^\d$/.test(digit ?? '') ? digit : null)
            : columns.map(() => null);
        return {
            isEmpty(value) { return normalise(value).includes(null); },
            answerText(value) { return normalise(value).map(digit => digit ?? '_').join(''); },
            mark(value) {
                const digits = normalise(value);
                if (digits[0] !== '6') return { correct: false, feedback: 'Six million means a 6 in the millions column.' };
                if (digits.slice(1, 4).join('') !== '453') {
                    return { correct: false, feedback: 'Four hundred and fifty-three thousand means 4, 5 and 3 in the hundred-thousands, ten-thousands and thousands columns.' };
                }
                if (digits[4] !== '0' || digits[5] !== '0') {
                    return { correct: false, feedback: 'The words have no hundreds and no tens, so put a 0 in each of those columns.' };
                }
                if (digits[6] !== '9') return { correct: false, feedback: '"And nine" means a 9 in the units column.' };
                return { correct: true, feedback: 'Six million, four hundred and fifty-three thousand and nine is 6,453,009. There are no hundreds or tens, so they are 0.' };
            },
            render(host, { value, editable, onChange }) {
                let digits = normalise(value), canEdit = editable;
                let active = Math.max(0, digits.indexOf(null));
                const block = element('div', '', 'pv-words');
                const words = element('p', '', 'pv-words__text');
                const spans = pieces.map(([text, column]) => {
                    const span = element('span', text);
                    if (column !== null) span.classList.add('pv-words__piece');
                    words.append(span);
                    return { span, column };
                });
                const play = element('div', '', 'pv-play pv-play--words');
                const sheet = element('div', '', 'pv-paper');
                sheet.style.gridTemplateColumns = `repeat(${columns.length}, var(--col))`;
                sheet.setAttribute('role', 'group');
                sheet.setAttribute('aria-label', 'The number in figures. Tap a box to choose it.');
                columns.forEach((name, index) => {
                    const cell = element('span', '', 'pv-paper__cell pv-paper__box pv-paper__heading is-top');
                    cell.append(element('span', name));
                    if (index === 0) cell.classList.add('is-first');
                    if (index === columns.length - 1) cell.classList.add('is-last');
                    sheet.append(cell);
                });
                const boxes = columns.map((name, index) => {
                    const box = element('button', '', 'pv-paper__cell pv-paper__box pv-words__box is-bottom');
                    box.type = 'button';
                    if (index === 0) box.classList.add('is-first');
                    if (index === columns.length - 1) box.classList.add('is-last');
                    box.addEventListener('click', () => {
                        if (!canEdit) return;
                        active = index;
                        paint();
                    });
                    sheet.append(box);
                    return box;
                });
                play.append(sheet);
                const keys = element('div', '', 'pv-words__keys');
                keys.setAttribute('role', 'group');
                keys.setAttribute('aria-label', 'Digits');
                const keyButtons = '0123456789'.split('').map(digit => {
                    const key = element('button', digit, 'pv-shift__move pv-play__button pv-words__key');
                    key.type = 'button';
                    key.addEventListener('click', () => {
                        if (!canEdit) return;
                        digits[active] = digit;
                        const next = digits.indexOf(null);
                        active = next === -1 ? active : next;
                        paint();
                        onChange([...digits]);
                    });
                    keys.append(key);
                    return key;
                });
                block.append(words, play, keys);
                host.append(block);
                function paint() {
                    boxes.forEach((box, index) => {
                        box.textContent = digits[index] ?? '';
                        box.classList.toggle('is-active', canEdit && index === active);
                        box.disabled = !canEdit;
                        box.setAttribute('aria-label', `${columns[index]}: ${digits[index] ?? 'empty'}`);
                    });
                    spans.forEach(({ span, column }) => span.classList.toggle('is-lit', canEdit && column === active));
                    keyButtons.forEach(key => { key.disabled = !canEdit; });
                }
                paint();
                return {
                    update(next) {
                        digits = normalise(next.value);
                        canEdit = next.editable;
                        active = Math.max(0, digits.indexOf(null));
                        paint();
                    },
                    focus() { boxes[active].focus(); }
                };
            }
        };
    }
    function orderingWidget(values) {
        const expected = [...values].sort(compareDecimals);
        const normalise = value => Array.isArray(value) ? [...value] : [];
        return {
            isEmpty(value) { return normalise(value).length !== values.length; },
            answerText(value) { return normalise(value).join(' → '); },
            mark(value) {
                const order = normalise(value);
                const correct = order.length === expected.length && order.every((number, index) => number === expected[index]);
                return { correct, feedback: correct ? `From smallest to largest: ${expected.join(' < ')}`
                    : 'Line up the decimal points. Add zeros at the end and compare from left to right.' };
            },
            /* A row of dashed slots (smallest on the left) inside a white box, and a grey tray of
               blue number cards below. Tapping a card in the tray sends it to the next empty slot;
               tapping a placed card sends it back. Cards glide between the two, and can also be
               dragged onto a slot. */
            render(host, { value, editable, onChange }) {
                let order = normalise(value), canEdit = editable;
                const frame = element('div', '', 'pv-order-frame');
                const slots = element('div', '', 'pv-order-slots');
                slots.setAttribute('role', 'group'); slots.setAttribute('aria-label', 'Smallest to largest');
                frame.append(slots);
                const pool = element('div', '', 'pv-order-pool');
                pool.setAttribute('role', 'group'); pool.setAttribute('aria-label', 'Numbers to order');
                const announcement = element('p', '', 'visually-hidden');
                announcement.setAttribute('aria-live', 'polite');
                host.append(frame, pool, announcement);
                const holders = values.map((unused, index) => {
                    if (index) slots.append(element('span', ',', 'pv-order-comma'));
                    const holder = element('div', '', 'pv-order-slot');
                    if (index === 0) holder.append(element('span', 'smallest', 'pv-order-hint'));
                    if (index === values.length - 1) holder.append(element('span', 'largest', 'pv-order-hint'));
                    holder.addEventListener('dragover', event => { if (canEdit) event.preventDefault(); });
                    holder.addEventListener('drop', event => { event.preventDefault(); move(event.dataTransfer?.getData('text/plain'), index); });
                    slots.append(holder);
                    return holder;
                });
                const cards = new Map(values.map(number => {
                    const card = element('button', number, 'pv-order-card');
                    card.type = 'button';
                    card.addEventListener('click', () => {
                        if (!canEdit) return;
                        if (order.includes(number)) {
                            order = order.filter(other => other !== number);
                            announcement.textContent = `${number} back in the tray`;
                            commit();
                        } else move(number, order.length);
                    });
                    card.addEventListener('dragstart', event => event.dataTransfer?.setData('text/plain', number));
                    return [number, card];
                }));
                function move(number, position) {
                    if (!canEdit || !values.includes(number)) return;
                    order = order.filter(other => other !== number);
                    order.splice(Math.min(position, order.length), 0, number);
                    announcement.textContent = `${number} placed in position ${order.indexOf(number) + 1}`;
                    commit();
                }
                function commit() {
                    const before = new Map([...cards].map(([number, card]) => [number, card.getBoundingClientRect()]));
                    paint();
                    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                        for (const [number, card] of cards) {
                            const was = before.get(number), now = card.getBoundingClientRect();
                            const dx = was.left - now.left, dy = was.top - now.top;
                            if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
                                card.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.2, .8, .2, 1)' });
                            }
                        }
                    }
                    onChange([...order]);
                }
                function paint() {
                    holders.forEach((holder, index) => {
                        const number = order[index];
                        holder.classList.toggle('is-filled', Boolean(number));
                        holder.setAttribute('aria-label', number ? `Position ${index + 1}: ${number}` : `Position ${index + 1}: empty`);
                        if (number) holder.append(cards.get(number));
                    });
                    for (const number of values) {
                        const card = cards.get(number);
                        if (!order.includes(number)) pool.append(card);
                        card.disabled = !canEdit;
                        card.draggable = canEdit;
                    }
                    pool.classList.toggle('is-empty', order.length === values.length);
                }
                paint();
                return {
                    update(next) { order = normalise(next.value); canEdit = next.editable; paint(); },
                    focus() { (pool.querySelector('button') || slots.querySelector('button'))?.focus(); }
                };
            }
        };
    }

    const shiftColumns = ['1,000', '100', '10', '1', '0.1', '0.01', '0.001'];
    const onesIndex = 3;
    function shiftedCells(digits, offset) {
        const cells = Array(shiftColumns.length).fill('');
        const start = onesIndex - digits.length + 1 + offset;
        [...digits].forEach((digit, index) => { if (start + index >= 0 && start + index < cells.length) cells[start + index] = digit; });
        const first = cells.findIndex(Boolean), last = cells.findLastIndex(Boolean);
        if (last >= 0 && last < onesIndex) for (let index = last + 1; index <= onesIndex; index++) cells[index] = '0';
        if (first > onesIndex) for (let index = onesIndex; index < first; index++) cells[index] = '0';
        return cells;
    }
    function shiftRow(digits, { offset = 0, minimum = -1, maximum = 2, label, editable = false, onChange = () => {} }) {
        let current = offset, canEdit = editable, startX = null;
        const row = element('div', '', 'pv-shift-row');
        row.setAttribute('role', 'slider'); row.setAttribute('aria-label', label);
        row.setAttribute('aria-valuemin', String(minimum)); row.setAttribute('aria-valuemax', String(maximum));
        row.tabIndex = canEdit ? 0 : -1;
        const digitNodes = [];
        const cells = shiftColumns.map((column, index) => {
            const cell = element('span', '', 'pv-shift-cell');
            if (index === onesIndex + 1) cell.classList.add('pv-decimal-start');
            const digit = element('span', '', 'pv-moving-digit');
            digitNodes.push(digit); cell.append(digit);
            row.append(cell); return cell;
        });
        function paint() {
            const values = shiftedCells(digits, current);
            digitNodes.forEach((digit, index) => { digit.textContent = values[index]; digit.style.transform = ''; });
            row.setAttribute('aria-valuenow', String(current));
            row.setAttribute('aria-valuetext', scaleValue(Number(digits), current));
            row.setAttribute('aria-disabled', String(!canEdit));
            row.tabIndex = canEdit ? 0 : -1;
        }
        function move(offset) {
            if (!canEdit) return;
            current = Math.max(minimum, Math.min(maximum, offset)); paint(); onChange(current);
        }
        row.addEventListener('keydown', event => {
            if (!canEdit || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            move(event.key === 'Home' ? 0 : event.key === 'End' ? maximum : current + (event.key === 'ArrowRight' ? 1 : -1));
        });
        row.addEventListener('pointerdown', event => {
            if (!canEdit) return;
            startX = event.clientX; row.setPointerCapture(event.pointerId); row.focus();
        });
        row.addEventListener('pointermove', event => {
            if (startX === null || !canEdit) return;
            const width = row.getBoundingClientRect().width / shiftColumns.length;
            const distance = Math.max(-width * .9, Math.min(width * .9, event.clientX - startX));
            digitNodes.forEach(digit => { digit.style.transform = `translateX(${distance}px)`; });
        });
        function finish(event, cancelled = false) {
            if (startX === null) return;
            const distance = event.clientX - startX;
            startX = null;
            if (row.hasPointerCapture(event.pointerId)) row.releasePointerCapture(event.pointerId);
            const threshold = Math.max(20, row.getBoundingClientRect().width / shiftColumns.length * .3);
            if (!cancelled && Math.abs(distance) >= threshold) move(current + (distance > 0 ? 1 : -1));
            else paint();
        }
        row.addEventListener('pointerup', event => finish(event));
        row.addEventListener('pointercancel', event => finish(event, true));
        paint();
        return { node: row, update(offset, editable) { current = offset; canEdit = editable; paint(); } };
    }
    function shiftHeading() {
        const row = element('div', '', 'pv-shift-heading');
        shiftColumns.forEach((column, index) => {
            const cell = element('span', column);
            if (index === onesIndex + 1) cell.className = 'pv-decimal-start';
            row.append(cell);
        });
        return row;
    }
    function scalingWidget(first, second, targets) {
        const answer = scaleValue(first * second, targets[0] + targets[1]);
        const normalise = value => ({ offsets: [...(value?.offsets || [0, 0])], answer: String(value?.answer || '') });
        return {
            isEmpty(value) { return normalise(value).answer.trim() === ''; },
            answerText(value) {
                const state = normalise(value);
                return `${scaleValue(first, state.offsets[0])} × ${scaleValue(second, state.offsets[1])} = ${state.answer}`;
            },
            mark(value) {
                const state = normalise(value);
                const wrongRow = targets.findIndex((target, index) => state.offsets[index] !== target);
                if (wrongRow >= 0) return { correct: false, feedback: `The ${wrongRow === 0 ? 'first' : 'second'} row should show ${scaleValue(wrongRow === 0 ? first : second, targets[wrongRow])}. Check its place-value columns.` };
                const correct = normaliseDecimalAnswer(state.answer) !== null && normaliseDecimalAnswer(state.answer) === normaliseDecimalAnswer(answer);
                return { correct, feedback: correct ? `${scaleValue(first, targets[0])} × ${scaleValue(second, targets[1])} = ${answer}`
                    : 'Track the change to each factor. Apply both changes to the known product.' };
            },
            render(host, { value, editable, onChange }) {
                let state = normalise(value), canEdit = editable;
                host.append(element('p', 'Move the digits until both rows show the factors in the question. Drag left or right, or use the arrow keys. Then type the product.'));
                const board = element('div', '', 'pv-scaling-board');
                board.append(shiftHeading());
                const labels = [];
                const rows = [first, second].map((factor, index) => {
                    const label = element('p', '', 'pv-row-label'); labels.push(label); board.append(label);
                    const row = shiftRow(String(factor), { offset: state.offsets[index], minimum: Math.min(0, targets[index]), maximum: Math.max(0, targets[index]),
                        label: `Move number ${index + 1}`, editable: canEdit,
                        onChange(offset) { state.offsets[index] = offset; paint(); onChange(state); } });
                    board.append(row.node); return row;
                });
                const label = element('label', '', 'pv-product-input');
                const input = element('input');
                input.type = 'text'; input.inputMode = 'decimal'; input.autocomplete = 'off'; input.setAttribute('aria-label', 'Product');
                input.placeholder = 'Type your answer';
                input.addEventListener('input', () => { state.answer = input.value; onChange(state); });
                label.append(input); host.append(board, label);
                function paint() {
                    rows.forEach((row, index) => {
                        row.update(state.offsets[index], canEdit);
                        labels[index].textContent = `Number ${index + 1}: ${scaleValue(index === 0 ? first : second, state.offsets[index])}`;
                    });
                    if (input.value !== state.answer) input.value = state.answer;
                    input.disabled = !canEdit;
                }
                paint();
                return { update(next) { state = normalise(next.value); canEdit = next.editable; paint(); }, focus() { if (canEdit) rows[0].node.focus(); } };
            }
        };
    }

    function scalingQuestion(targets) {
        return { input: 'custom', questionType: 'scaledProduct', kind: 'scaling', first: 89, second: 54, targets,
            prompt: `Given that 89 × 54 = 4,806, work out ${scaleValue(89, targets[0])} × ${scaleValue(54, targets[1])}.`,
            widget: scalingWidget(89, 54, targets) };
    }
    function examples() {
        const biggest = { questionType: 'digitValue', input: 'custom', kind: 'build',
            prompt: 'Make the biggest number you can with 6, 7 and 0.',
            feedback: '7 is the biggest digit, so it goes in the hundreds column, where it is worth the most. 760 is the biggest number you can make.', widget: biggestNumberWidget() };
        const timesHundred = { questionType: 'powerOfTen', input: 'custom', kind: 'move', prompt: 'Work out 38.4 × 100.',
            feedback: 'Every digit moved two columns to the left. The 0 fills the empty units column. 38.4 × 100 = 3,840.', widget: timesHundredWidget() };
        const playground = { questionType: 'scaledProduct', input: 'custom', kind: 'explore',
            prompt: '4.5 × 2.3 = 10.35.\nMultiply or divide either number by 10. Watch the answer.',
            feedback: 'Multiply one number by 10 and the answer is 10 times bigger. Divide one by 10 and the answer is 10 times smaller. Do one of each and they cancel out.',
            widget: placeValuePlayground() };
        const flipCards = { questionType: 'digitValue', input: 'custom', kind: 'flip', prompt: 'Tap each card in 46.275 to see what its digit is worth.',
            feedback: 'In 46.275, the 4 is worth 40, the 6 is worth 6, the 2 is worth 0.2, the 7 is worth 0.07 and the 5 is worth 0.005.', widget: flipCardsWidget() };
        const wordsToFigures = { questionType: 'digitValue', input: 'custom', kind: 'words',
            prompt: 'Write this number in figures.',
            feedback: 'Six million, four hundred and fifty-three thousand and nine is 6,453,009. There are no hundreds or tens, so they are 0.', widget: wordsToFiguresWidget() };
        const lessThanWhole = { questionType: 'compare', input: 'custom', kind: 'select', prompt: 'Tap the numbers that are less than 7.',
            feedback: '3, 4, 5 and 6 are all less than 7.',
            widget: tapCardsWidget(['3', '4', '5', '6', '7', '8', '9'], '7', { inRow: true, tip: 'Every card to the left of 7 is less than 7.' }) };
        const lessThan = { questionType: 'compare', input: 'custom', kind: 'select', prompt: 'Tap the numbers that are less than 0.8.',
            feedback: '0.75, 0.08 and 0.79 are all less than 0.8.', widget: tapCardsWidget(['0.75', '0.9', '0.08', '0.805', '0.79', '0.80'], '0.8') };
        return [biggest, timesHundred, playground, flipCards, wordsToFigures];
    }
    function checks() {
        const number = makeQuestion({ type: 'digitValue', kind: 'compose', mode: 'choice',
            prompt: 'A number has 3 hundreds, 6 units, 8 tenths and 4 hundredths. What is the number?', answer: '306.84',
            wrong: [['36.84', 'There are 3 hundreds. Keep a zero in the empty tens column.'],
                ['306.084', '8 tenths is 0.8. Put the 8 straight after the decimal point.'],
                ['368.4', 'Keep each digit in its named column. There are no tens.']],
            feedback: '3 hundreds + 6 units + 8 tenths + 4 hundredths = 306.84' });
        const reason = { input: 'choice', questionType: 'compare', kind: 'reason',
            prompt: 'Leila says: “0.67 is greater than 0.7 because 67 is greater than 7.” Is Leila correct?', options: [
                option('No. 0.7 = 0.70, and 0.70 > 0.67.', 'Seven tenths is greater than six tenths.', true),
                option('No. A number with more decimal digits is always smaller.', 'The number of decimal digits does not decide which value is larger.'),
                option('Yes. 67 > 7.', '67 hundredths is 0.67. Compare it with 70 hundredths, not 7 hundredths.'),
                option('Yes. Hundredths are worth more than tenths.', 'One hundredth is smaller than one tenth.')
            ] };
        const divide = powerOfTenQuestion(438, 0, 1);
        divide.prompt = 'A machine divides its input by 10. The input is 438. What is the output?';
        const reverse = powerOfTenQuestion(4270, 0, 2);
        reverse.prompt = 'A number is multiplied by 100. The result is 4,270. What was the original number?';
        const E = window.Maths1to9LessonEngine;
        const words = generateWordsToFiguresQuestion(E.seededRandom(11), 'choice');
        const digitCount = generateDigitCountQuestion(E.seededRandom(5));
        return [number, words, divide, digitCount, reverse];
    }

    const explorerNumber = '107389.4828';
    const explorerColumns = ['Hundred-thousands', 'Ten-thousands', 'Thousands', 'Hundreds', 'Tens', 'Units', 'Tenths', 'Hundredths', 'Thousandths', 'Ten-thousandths'];
    const learnScreens = [
        { title: 'Place value tells you what each digit is worth.', lines: [
            'A digit is one of the symbols 0 to 9.',
            'In 670, the 6 is in the hundreds column. It is worth 6 × 100 = 600. The 7 is in the tens column. It is worth 7 × 10 = 70. The 0 is in the units column.'
        ] },
        { title: 'A digit’s position decides its value.', lines: [] },
        { title: 'Digits after the decimal point are less than one.', lines: [] },
        { title: 'A longer decimal is not always bigger.', lines: [
            '0.75 looks bigger than 0.8 because it has more digits. It isn’t.',
            'Add a zero to the end so both have the same number of digits. 0.8 = 0.80. The zero does not change the value.'
        ] },
        { title: 'Multiplying by 10 moves each digit one column\u00a0left.', lines: [
            'Each column is worth ten times the one on its right.'
        ] },
        { title: 'Dividing by 10 moves each digit one column\u00a0right.', lines: [
            'Each column is worth one tenth of the one on its left.'
        ] },
        { title: 'Changes can cancel out', lines: [
            '384 × 2 = 768.',
            'Now divide 384 by 10 and multiply 2 by 10. You get 38.4 and 20. Multiply them, and the answer is still 768.'
        ] }
    ];
    function numberChart(number, highlighted = -1, showPoint = false, showCaption = true) {
        const digits = number.replace('.', '').split('');
        const point = number.includes('.') ? number.indexOf('.') : number.length;
        const chart = element('div', '', 'pv-number-chart');
        chart.setAttribute('role', 'img'); chart.setAttribute('aria-label', `Place-value columns for ${number}`);
        digits.forEach((digit, index) => {
            const exponent = point - index - 1;
            const place = placeNames[exponent] || explorerColumns[5 - exponent];
            const cell = element('div', '', `pv-number-column${highlighted === index ? ' is-highlighted' : ''}`);
            cell.append(element('span', place), element('strong', digit));
            chart.append(cell);
            if (showPoint && exponent === 0) {
                const pointCell = element('div', '', 'pv-number-column');
                pointCell.append(element('span', 'decimal point'), element('strong', '.'));
                chart.append(pointCell);
            }
        });
        const figure = element('figure', '', 'pv-chart-block');
        if (showCaption) figure.append(element('figcaption', addCommas(number), 'pv-big-number'));
        figure.append(chart);
        return figure;
    }
    /* Shows 38.4 × 10 = 384 (or 384 ÷ 10 = 38.4) as a table of place-value columns,
       with an arrow beside the two rows. The 4 is highlighted in both. */
    function timesTenTable(divide = false) {
        const small = { cells: ['', '3', '8', '.', '4'], highlighted: 4 };
        const large = { cells: ['3', '8', '4', '.', ''], highlighted: 2 };
        return placeTable(divide ? [large, small] : [small, large], divide ? '÷ 10' : '× 10',
            divide ? '384 ÷ 10 = 38.4' : '38.4 × 10 = 384');
    }
    /* A place-value table with two rows. With an arrow, the step label sits beside an arrow from the top row
       to the bottom row. Without one, the step label is a sign beside the bottom row, as in a written sum. */
    function placeTable(rows, step, sum, arrowed = true) {
        const headings = ['hundreds', 'tens', 'units', 'decimal point', 'tenths'];
        const table = element('table', '', 'pv-times-table');
        table.setAttribute('aria-label', `${sum}, shown in place-value columns`);
        const head = element('tr');
        head.append(element('td', '', 'pv-times-table__arrow'));
        headings.forEach(heading => head.append(element('th', heading)));
        table.append(head);
        rows.forEach((row, rowIndex) => {
            const line = element('tr');
            if (!arrowed) {
                line.append(element('td', rowIndex === rows.length - 1 ? step : '', 'pv-times-table__arrow pv-times-table__sign'));
            } else if (rowIndex === 0) {
                const arrow = element('td', '', 'pv-times-table__arrow');
                arrow.rowSpan = rows.length;
                arrow.innerHTML = `<div><span>${step}</span><svg viewBox="0 0 40 96" aria-hidden="true"><path d="M36 6C8 18 8 72 28 86" /><path d="M18 88 31 88 28 74" /></svg></div>`;
                line.append(arrow);
            }
            row.cells.forEach((cell, index) => line.append(element('td', cell, [row.highlighted === index ? 'is-highlighted' : '', index === 0 ? 'pv-times-table__first' : ''].join(' ').trim())));
            table.append(line);
        });
        return table;
    }
    /* The 46.275 cards with hand-drawn arrows from three labels up to the 2, 7 and 5.
       The arrows are redrawn whenever the layout changes size. */
    function arrowedChart() {
        const notes = [
            { text: 'the 2 is worth 0.2', card: 3 },
            { text: 'the 7 is worth 0.07', card: 4 },
            { text: 'the 5 is worth 0.005', card: 5 }
        ];
        const block = element('div', '', 'pv-notes');
        const chart = numberChart('46.275', 3, true, false);
        const labels = element('div', '', 'pv-notes__labels');
        const spans = notes.map(note => labels.appendChild(element('span', note.text)));
        const svgNs = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNs, 'svg');
        svg.setAttribute('class', 'pv-notes__arrows');
        svg.setAttribute('aria-hidden', 'true');
        block.append(chart, labels, svg);

        function draw() {
            if (!block.isConnected) { observer.disconnect(); return; }
            const cards = chart.querySelectorAll('.pv-number-column');
            /* Sit the labels just left of the first card they point to, so every arrow starts clear of the text. */
            labels.style.marginLeft = '0px';
            const firstCard = cards[notes[0].card].getBoundingClientRect();
            const room = firstCard.left - block.getBoundingClientRect().left - labels.offsetWidth - 20;
            labels.style.marginLeft = `${Math.max(0, room)}px`;
            const origin = block.getBoundingClientRect();
            svg.setAttribute('width', origin.width);
            svg.setAttribute('height', origin.height);
            svg.replaceChildren();
            notes.forEach((note, index) => {
                const card = cards[note.card].getBoundingClientRect();
                const label = spans[index].getBoundingClientRect();
                const tx = card.left + card.width / 2 - origin.left, ty = card.bottom - origin.top + 6;
                const sx = label.right - origin.left + 8, sy = label.top + label.height / 2 - origin.top;
                const path = document.createElementNS(svgNs, 'path');
                path.setAttribute('d', `M ${sx} ${sy} C ${sx + (tx - sx) * 0.55} ${sy + 3}, ${tx + 2} ${sy - (sy - ty) * 0.35}, ${tx} ${ty}`
                    + ` M ${tx - 6} ${ty + 9} L ${tx} ${ty} L ${tx + 6} ${ty + 8}`);
                svg.append(path);
            });
        }
        const observer = new ResizeObserver(() => draw());
        observer.observe(block);
        requestAnimationFrame(draw);
        return block;
    }
    function tapDigitCards(host, section) {
        const digits = '670'.split('');
        const selected = () => section.state.firstCard ?? 1;
        const chart = element('div', '', 'pv-number-chart');
        chart.setAttribute('role', 'group');
        chart.setAttribute('aria-label', 'The digits of 670');
        const equation = element('p', '', 'pv-equation');
        equation.setAttribute('aria-live', 'polite');
        const figure = element('figure', '', 'pv-chart-block');
        figure.append(chart);
        host.append(figure, equation);

        const cards = digits.map((digit, index) => {
            const card = element('button', '', 'pv-number-column pv-number-column--tap');
            card.type = 'button';
            card.append(element('span', placeNames[2 - index]), element('strong', digit));
            card.addEventListener('click', () => {
                section.update(state => { state.firstCard = index; });
                paint();
            });
            chart.append(card);
            return card;
        });

        function paint() {
            const index = selected();
            cards.forEach((card, cardIndex) => {
                card.classList.toggle('is-highlighted', cardIndex === index);
                card.setAttribute('aria-pressed', String(cardIndex === index));
            });
            const digit = Number(digits[index]);
            const place = 10 ** (2 - index);
            equation.textContent = `${digit} × ${place} = ${digit * place}`;
        }
        paint();
    }
    function digitExplorer(host, section) {
        const digits = explorerNumber.replace('.', '').split('');
        const selected = () => section.state.selected ?? 5;
        const buttons = [];
        const table = element('div', '', 'pv-digit-explorer');
        const detail = element('p', '', 'pv-digit-detail');
        detail.setAttribute('aria-live', 'polite');
        const rules = element('ul');
        rules.append(
            element('li', 'Each place to the left is worth ten times as much.'),
            element('li', 'Each place to the right is worth one tenth as much.')
        );
        host.append(
            table,
            detail,
            element('p', addCommas(explorerNumber), 'pv-big-number'),
            element('p', 'Tap a digit to see its column and value.'),
            rules
        );
        digits.forEach((digit, index) => {
            const value = scaleValue(Number(digit), index - 5);
            const button = element('button', '', 'pv-digit-row');
            button.type = 'button';
            button.setAttribute('aria-label', `${digit} in the ${explorerColumns[index].toLowerCase()} column`);
            button.append(element('span', explorerColumns[index]), element('strong', digit), element('span', value));
            function choose() {
                section.update(state => { state.selected = index; });
                window.Maths1to9Lesson.recordActivity({ id: 'place-value:explore', kind: 'explore' });
                paint();
            }
            button.addEventListener('click', choose); button.addEventListener('focus', choose);
            table.append(button); buttons.push(button);
        });
        function paint() {
            buttons.forEach((button, index) => button.setAttribute('aria-pressed', String(index === selected())));
            const index = selected(), digit = Number(digits[index]);
            detail.textContent = `${digit} is in the ${explorerColumns[index].toLowerCase()} column. ${digit} × ${scaleValue(1, index - 5)} = ${scaleValue(digit, index - 5)}${digit === 0 ? '. Zero holds this place.' : ''}`;
        }
        paint();
    }
    function drawLearn(host, screen, section) {
        if (screen === 0) tapDigitCards(host, section);
        else if (screen === 1) digitExplorer(host, section);
        else if (screen === 2) host.append(arrowedChart());
        else if (screen === 3) {
            const compare = element('div', '', 'pv-compare');
            compare.append(numberChart('0.80', -1, true, false), numberChart('0.75', -1, true, false));
            host.append(compare, element('p', 'Now compare the digits from left to right. The first digit that is different decides it. 8 tenths is more than 7 tenths.'));
        } else if (screen === 4) {
            host.append(timesTenTable(), element('p', 'The decimal point stays where it is.'));
        } else if (screen === 5) {
            host.append(timesTenTable(true), element('p', 'The decimal point stays where it is.'));
        } else if (screen === 6) {
            host.append(
                placeTable([{ cells: ['', '3', '8', '.', '4'] }, { cells: ['', '2', '0', '.', '0'] }], '×', '38.4 × 20', false),
                element('p', '38.4 × 20 = 768', 'pv-equation'));
        }
    }

    Object.assign(window.PlaceValue ??= {}, { negativeValues, generateNegative, negativeOrderQuestion, negativeSymbolQuestion, types, addCommas, normaliseDecimalAnswer, formatScaledInteger, scaleValue, compareDecimals,
        digitValueWords, digitQuestion, comparisonQuestion, orderingQuestion, scaledProductQuestion, powerOfTenQuestion,
        generate, pick, prepare, examples, checks, learnScreens, drawLearn, orderingWidget, scalingWidget, shiftedCells });
})();
