(() => {
    'use strict';

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
    function element(tag, text = '', className = '') {
        const node = document.createElement(tag);
        node.textContent = text;
        node.className = className;
        return node;
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
            render(host, { value, editable, onChange }) {
                let order = normalise(value), canEdit = editable;
                host.append(element('p', 'Tap the numbers from smallest to largest. Tap a filled place to return its number. You can also drag a number into a place.'));
                const pool = element('div', '', 'pv-order-pool');
                pool.setAttribute('role', 'group'); pool.setAttribute('aria-label', 'Numbers to order');
                const slots = element('div', '', 'pv-order-slots');
                slots.setAttribute('role', 'group'); slots.setAttribute('aria-label', 'Smallest to largest');
                const announcement = element('p', '', 'visually-hidden');
                announcement.setAttribute('aria-live', 'polite');
                host.append(pool, slots, announcement);
                function move(number, position) {
                    if (!canEdit || !values.includes(number)) return;
                    order = order.filter(value => value !== number);
                    order.splice(Math.min(position, order.length), 0, number);
                    announcement.textContent = `${number} placed in position ${order.indexOf(number) + 1}`;
                    paint(); onChange(order);
                    (pool.querySelector('button') || slots.querySelector('button'))?.focus();
                }
                function draggable(button, number) {
                    button.draggable = canEdit;
                    button.addEventListener('dragstart', event => event.dataTransfer?.setData('text/plain', number));
                }
                function paint() {
                    pool.replaceChildren(); slots.replaceChildren();
                    for (const number of values.filter(number => !order.includes(number))) {
                        const button = element('button', number, 'pv-order-tile');
                        button.type = 'button'; button.disabled = !canEdit;
                        button.dataset.orderTile = number;
                        button.addEventListener('click', () => move(number, order.length));
                        draggable(button, number); pool.append(button);
                    }
                    values.forEach((unused, index) => {
                        const group = element('div', '', 'pv-order-place');
                        const number = order[index];
                        group.append(element('span', index === 0 ? '1: smallest' : index === values.length - 1 ? '4: largest' : String(index + 1)));
                        const button = element('button', number || 'Empty', 'pv-order-slot');
                        button.type = 'button'; button.disabled = !canEdit;
                        button.setAttribute('aria-label', number ? `${number} in position ${index + 1}. Press to return it.` : `Empty position ${index + 1}`);
                        button.addEventListener('click', () => {
                            if (!canEdit || !number) return;
                            order.splice(index, 1); paint(); onChange(order); pool.querySelector('button')?.focus();
                        });
                        button.addEventListener('dragover', event => { if (canEdit) event.preventDefault(); });
                        button.addEventListener('drop', event => { event.preventDefault(); move(event.dataTransfer?.getData('text/plain'), index); });
                        if (number) draggable(button, number);
                        group.append(button); slots.append(group);
                    });
                }
                paint();
                return {
                    update(next) { order = normalise(next.value); canEdit = next.editable; paint(); },
                    focus() { (pool.querySelector('button') || slots.querySelector('button'))?.focus(); }
                };
            }
        };
    }

    const prepare = (question, random) => question.options
        ? { ...question, options: window.Maths1to9LessonEngine.shuffle(question.options, random) } : { ...question };


    const bank = {
        negativeDecimalGreater: {
            prompt: 'Which number is greater than −0.45?',
            answer: '−0.4',
            feedback: '−0.4 is closer to zero than −0.45, so it is greater.',
            wrong: [
                ['−0.5', "−0.5 is further below zero than −0.45, so it's smaller."],
                ['−0.46', "−0.46 is a little further below zero than −0.45, so it's smaller."],
                ['−0.7', "−0.7 is further left on the number line, so it's smaller."]
            ]
        },
        decimalOrder: {
            prompt: 'Put these in order, smallest first: 0.508, 0.58, 0.5, 0.058',
            answer: '0.058, 0.5, 0.508, 0.58',
            feedback: 'With three decimal places: 0.058 < 0.500 < 0.508 < 0.580.',
            wrong: [
                ['0.5, 0.58, 0.058, 0.508', 'That sorts them by how many digits they have. Write them all with three digits: 0.500, 0.580, 0.058, 0.508.'],
                ['0.58, 0.508, 0.5, 0.058', "That's largest first. The question asks for smallest first."],
                ['0.058, 0.508, 0.5, 0.58', '0.5 = 0.500, which is less than 0.508.']
            ]
        },
        mixedNegativeOrder: {
            prompt: 'Put −7, 4, −3, 0 and 2.5 in order, smallest first',
            answer: '−7, −3, 0, 2.5, 4',
            feedback: '−7 is furthest below zero, so it comes first. Both negatives come before 0.',
            wrong: [
                ['4, 2.5, 0, −3, −7', "That's largest first. The question asks for smallest first."],
                ['−3, −7, 0, 2.5, 4', '−7 is further below zero than −3, so −7 is smaller.'],
                ['0, −3, −7, 2.5, 4', 'Numbers below zero are smaller than 0, so they come before it.']
            ]
        },
        greatestIntegerBelow: {
            mode: 'number',
            prompt: 'A number with no decimal part is less than −3.4. What is the biggest it can be?',
            answer: '−4',
            feedback: '−4 is just below −3.4. The next number with no decimal part is −3, which is too big.',
            wrong: [
                ['−3', "−3 is above −3.4, so it isn't less than −3.4."],
                ['−5', '−5 is less than −3.4, but −4 is bigger and still fits.'],
                ['4', "The number has to be below −3.4, so it's below zero."]
            ],
            fallback: 'Look for the closest number below −3.4 with no decimal part.'
        },
        decimalSign: {
            prompt: 'Which is true?',
            answer: '0.7 > 0.65',
            feedback: '0.7 = 0.70, and 70 hundredths is more than 65 hundredths.',
            wrong: [
                ['0.7 < 0.65', 'Write 0.7 as 0.70. 70 hundredths is more than 65, so 0.7 is bigger.'],
                ['0.7 = 0.65', "0.7 = 0.70, which isn't the same as 0.65."],
                ['0.65 > 0.7', '0.65 has more digits, but 0.7 = 0.70, and 70 is more than 65.']
            ]
        }
    };

    const decimalTypes = ['compare', 'order'];
    const negativeTypes = [
        { type: 'negSymbol', mode: 'choice' },
        { type: 'negCoolest', mode: 'choice' },
        { type: 'negGreatest', mode: 'number' },
        { type: 'negOrder', mode: 'custom' }
    ];

    function generate(item, random) {
        if (bank[item.type]) return makeQuestion({ type: item.type, ...bank[item.type] });
        if (item.type === 'compare') return generateComparisonQuestion(random, item.mode ?? 'choice');
        if (item.type === 'order') return generateOrderingQuestion(random, item.mode ?? 'choice');
        return generateNegative(item, random);
    }

    function spreadModes(items) {
        function arrange(ordered, remaining) {
            if (!remaining.length) return ordered;
            const last = ordered.at(-1)?.mode;
            const repeat = last === ordered.at(-2)?.mode;
            for (const [index, item] of remaining.entries()) {
                if (repeat && item.mode === last) continue;
                const next = arrange([...ordered, item], remaining.filter((unused, position) => position !== index));
                if (next) return next;
            }
            return null;
        }
        return arrange([], items);
    }

    function pick(random) {
        const { randomInt, shuffle } = window.Maths1to9LessonEngine;
        const decimalAndBank = [
            ...decimalTypes.map(type => ({ type, mode: randomInt(0, 1, random) ? 'choice' : 'number' })),
            ...Object.entries(bank).map(([type, question]) => ({ type, mode: question.mode ?? 'choice' }))
        ];
        const session = [
            ...shuffle(negativeTypes, random).slice(0, 2),
            ...shuffle(decimalAndBank, random).slice(0, 6)
        ];
        // Two interruptions are enough to spread out six choice cards. The
        // decimal generators can supply a typed card if a draw needs one.
        const optionalTyped = shuffle(session.filter(item => decimalTypes.includes(item.type)), random);
        while (session.filter(item => item.mode === 'choice').length > 6 || !session.some(item => item.mode === 'number')) {
            const item = optionalTyped.find(item => item.mode === 'choice');
            item.mode = 'number';
        }

        return spreadModes(shuffle(session, random)).map(item => ({ ...item, seed: randomInt(0, 4294967295, random) }));
    }

    function numberLineExample() {
        const numbers = Array.from({ length: 10 }, (_, index) => index - 6);
        const target = -2;
        const expected = numbers.filter(number => number < target);
        const picks = value => Array.isArray(value) ? value : [];

        return {
            questionType: 'negOrder',
            input: 'custom',
            prompt: 'Tap the numbers that are less than −2.',
            widget: {
                isEmpty(value) { return picks(value).length === 0; },
                answerText(value) {
                    return numbers.filter(number => picks(value).includes(number)).map(displayNegative).join(', ');
                },
                mark(value) {
                    const selected = picks(value);
                    if (selected.includes(target)) {
                        return { correct: false, feedback: "−2 isn't less than −2. It's the same number." };
                    }
                    if (selected.some(number => number > target)) {
                        return { correct: false, feedback: 'Numbers to the right of −2 are bigger than −2.' };
                    }
                    if (expected.some(number => !selected.includes(number))) {
                        return { correct: false, feedback: 'Some numbers are missing. Every number to the left of −2 is less than it.' };
                    }
                    return {
                        correct: true,
                        feedback: '−6, −5, −4 and −3 are all to the left of −2. The further left a number is, the smaller it is.'
                    };
                },
                render(host, { value, editable, onChange }) {
                    let selected = picks(value);
                    let canEdit = editable;
                    const line = element('div', '', 'comparison-line');
                    line.setAttribute('role', 'group');
                    line.setAttribute('aria-label', 'Number line from −6 to 3. −2 is marked.');
                    const ticks = numbers.map(number => {
                        const tick = element('button', '', 'comparison-line__number');
                        tick.type = 'button';
                        if (number === target) tick.classList.add('is-target');
                        const mark = element('span', '', 'comparison-line__tick');
                        mark.setAttribute('aria-hidden', 'true');
                        tick.append(mark, element('span', displayNegative(number)));
                        tick.addEventListener('click', () => {
                            if (!canEdit) return;
                            selected = selected.includes(number)
                                ? selected.filter(other => other !== number) : [...selected, number];
                            paint();
                            onChange(selected);
                        });
                        line.append(tick);
                        return { number, tick };
                    });
                    host.append(line);

                    function paint() {
                        for (const { number, tick } of ticks) {
                            tick.setAttribute('aria-pressed', String(selected.includes(number)));
                            tick.disabled = !canEdit;
                        }
                    }

                    paint();
                    return {
                        update(next) {
                            selected = picks(next.value);
                            canEdit = next.editable;
                            paint();
                        },
                        focus() { ticks[0].tick.focus(); }
                    };
                }
            }
        };
    }

    window.NumberComparison = { compareDecimals, decimalTypes, generate, numberLineExample, pick, prepare };
})();
