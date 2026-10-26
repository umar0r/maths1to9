(() => {
    'use strict';

    const types = ['digitValue', 'compare', 'order', 'scaledProduct', 'powerOfTen'];
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
    const placeNames = { 3: 'thousands', 2: 'hundreds', 1: 'tens', 0: 'ones', '-1': 'tenths', '-2': 'hundredths', '-3': 'thousandths' };
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
    function generate(item, random) {
        const generators = { digitValue: generateDigitValueQuestion, compare: generateComparisonQuestion, order: generateOrderingQuestion,
            scaledProduct: generateScaledProductQuestion, powerOfTen: generatePowerOfTenQuestion };
        return generators[item.type](random, item.mode || 'choice');
    }
    function pick(random) {
        const E = window.Maths1to9LessonEngine;
        return E.shuffle([{ type: 'digitValue', mode: 'choice' }, { type: 'compare', mode: 'choice' }, { type: 'order', mode: 'custom' },
            { type: 'scaledProduct', mode: 'number' }, { type: 'powerOfTen', mode: 'number' }, { type: 'digitValue', mode: 'number' }], random)
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
                const label = element('label', 'Product', 'pv-product-input');
                const input = element('input');
                input.type = 'text'; input.inputMode = 'decimal'; input.autocomplete = 'off'; input.setAttribute('aria-label', 'Product');
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
        const tens = makeQuestion({ type: 'digitValue', kind: 'locate', mode: 'choice', prompt: 'In 670, which digit is in the tens column?', answer: '7',
            wrong: [['6', '6 is in the hundreds column.'], ['0', '0 is in the ones column.'], ['70', '70 is the value. Give just the digit in the tens column.']],
            feedback: 'The digit 7 is in the tens column. Its value is 70.' });
        const ones = makeQuestion({ type: 'digitValue', kind: 'locate', mode: 'number', prompt: 'In 670, which digit is in the ones column?', answer: '0',
            wrong: [['7', '7 is in the tens column.'], ['6', '6 is in the hundreds column.'], ['670', 'That is the whole number. Give just the ones digit.']],
            feedback: 'The ones digit is 0. Zero holds this place.', fallback: 'The ones column is just to the left of the decimal point, or at the right end of a whole number.' });
        return [tens, ones, digitQuestion('670', 6, 'number'), digitQuestion('46.275', 4, 'choice'), digitQuestion('46.275', 7, 'number'),
            scalingQuestion([1, 1]), scalingQuestion([-1, 1]), scalingQuestion([2, 2])];
    }
    function checks() {
        const number = makeQuestion({ type: 'digitValue', kind: 'compose', mode: 'choice',
            prompt: 'A number has 3 hundreds, 6 ones, 8 tenths and 4 hundredths. What is the number?', answer: '306.84',
            wrong: [['36.84', 'There are 3 hundreds. Keep a zero in the empty tens column.'],
                ['306.084', '8 tenths is 0.8. Put the 8 straight after the decimal point.'],
                ['368.4', 'Keep each digit in its named column. There are no tens.']],
            feedback: '3 hundreds + 6 ones + 8 tenths + 4 hundredths = 306.84' });
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
        return [number, reason, orderingQuestion(['2.8', '2.75', '2.805', '2.79'], 'custom', 'Put these long-jump distances in metres in order from shortest to longest.'), divide, reverse];
    }

    const explorerNumber = '107389.4828';
    const explorerColumns = ['Hundred-thousands', 'Ten-thousands', 'Thousands', 'Hundreds', 'Tens', 'Ones', 'Tenths', 'Hundredths', 'Thousandths', 'Ten-thousandths'];
    const learnScreens = [
        { title: 'A digit has a place and a value', lines: [
            'Place value tells you what each digit is worth. A digit is one of the symbols 0 to 9.',
            'In 670, the 7 is in the tens column. It is worth 7 × 10 = 70. The 0 holds the ones place.'
        ] },
        { title: 'One number, different place values', lines: [
            'Tap a digit to see its column and value. Start with the 9: it is worth 9 ones.',
            'Each place to the left is worth ten times as much. Each place to the right is worth one tenth as much.',
            'Read this number as: one hundred and seven thousand, three hundred and eighty-nine point four eight two eight.'
        ] },
        { title: 'Read decimal places and empty places', lines: [
            'The decimal point separates whole-number places from decimal places. To its right are tenths, hundredths, then thousandths.',
            'In 46.275, the 7 is in the hundredths column. It is worth 7 × 0.01 = 0.07.',
            'Zero holds an empty place. In 307.62, there are 3 hundreds, 0 tens, 7 ones, 6 tenths and 2 hundredths.'
        ] },
        { title: 'Line up the decimal points', lines: [
            'To compare decimals, add zeros at the end so the columns line up. These zeros do not change the value.',
            '0.8 = 0.800. Compare from left to right. The first different column shows that 0.800 < 0.809.',
            '< means “is smaller than”. > means “is greater than”. = means “is equal to”.',
            'To put numbers in order, use the same method. From smallest to largest: 0.405 < 0.450 < 0.500. So 0.405 < 0.45 < 0.5.'
        ] },
        { title: 'Multiply and divide by powers of 10', lines: [
            'Multiplying by 10, 100 or 1,000 moves every digit 1, 2 or 3 columns left. Dividing moves the digits right. The decimal point stays fixed.',
            '38.4 × 100 = 3,840. Going back, 3,840 ÷ 100 = 38.4.',
            'If you are given the result of multiplying by 100, divide by 100 to find the original number.'
        ] },
        { title: 'Change both factors', lines: [
            'A factor is a number in a multiplication. The product is the answer after multiplying.',
            '89 × 54 = 4,806. For 8.9 × 5.4, each factor is divided by 10.',
            'Apply both changes to the product: 4,806 ÷ 10 ÷ 10 = 48.06. Together, that is dividing by 100.'
        ] },
        { title: 'Changes can cancel out', lines: [
            'Start from 89 × 54 = 4,806. Changing 89 to 890 multiplies one factor by 10. Changing 54 to 5.4 divides the other by 10.',
            'The changes cancel out. 4,806 × 10 ÷ 10 = 4,806, so 890 × 5.4 = 4,806.'
        ] },
        { title: 'Track every place you change', lines: [
            'Start from 89 × 54 = 4,806. For 0.89 × 0.54, each factor is divided by 100.',
            'Apply both changes: 4,806 ÷ 100 ÷ 100 = 0.4806. Together, that is dividing by 10,000.',
            'In Try it, move each row until it shows the factor in the question. Then type the product before checking.'
        ] }
    ];
    function numberChart(number, highlighted = -1) {
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
        });
        const figure = element('figure', '', 'pv-chart-block');
        figure.append(element('figcaption', addCommas(number), 'pv-big-number'), chart);
        return figure;
    }
    function digitExplorer(host, section) {
        const digits = explorerNumber.replace('.', '').split('');
        const selected = () => section.state.selected ?? 5;
        const buttons = [];
        const table = element('div', '', 'pv-digit-explorer');
        const detail = element('p', '', 'pv-digit-detail');
        detail.setAttribute('aria-live', 'polite');
        host.append(element('p', addCommas(explorerNumber), 'pv-big-number'), table, detail);
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
    function learnedScaling(host, offsets) {
        const board = element('div', '', 'pv-scaling-board');
        board.append(shiftHeading());
        [89, 54].forEach((factor, index) => {
            board.append(element('p', `${factor} → ${scaleValue(factor, offsets[index])}`, 'pv-row-label'));
            const row = shiftRow(String(factor), { offset: offsets[index], minimum: -1, maximum: 2, label: `Worked factor ${index + 1}` });
            row.node.setAttribute('role', 'img'); row.node.setAttribute('aria-label', `Digits of ${scaleValue(factor, offsets[index])} in place-value columns`);
            board.append(row.node);
        });
        host.append(board, element('p', `${scaleValue(89, offsets[0])} × ${scaleValue(54, offsets[1])} = ${scaleValue(4806, offsets[0] + offsets[1])}`, 'pv-equation'));
    }
    function drawLearn(host, screen, section) {
        if (screen === 0) host.append(numberChart('670', 1), element('p', '7 × 10 = 70', 'pv-equation'));
        else if (screen === 1) digitExplorer(host, section);
        else if (screen === 2) host.append(numberChart('46.275', 3), numberChart('307.62'));
        else if (screen === 3) {
            const row = element('div', '', 'pv-comparison-picture');
            for (const number of ['0.405', '0.450', '0.500']) row.append(element('span', number, 'pv-example-tile'));
            host.append(element('p', '0.800 < 0.809', 'pv-equation'), row);
        } else if (screen === 4) {
            host.append(numberChart('38.4'), element('p', 'Multiply by 100', 'pv-equation'), numberChart('3840'));
        } else learnedScaling(host, [[1, 1], [-1, 1], [2, 2]][screen - 5]);
    }

    Object.assign(window.PlaceValue ??= {}, { types, addCommas, normaliseDecimalAnswer, formatScaledInteger, scaleValue, compareDecimals,
        digitValueWords, digitQuestion, comparisonQuestion, orderingQuestion, scaledProductQuestion, powerOfTenQuestion,
        generate, pick, prepare, examples, checks, learnScreens, drawLearn, orderingWidget, scalingWidget, shiftedCells });
})();
