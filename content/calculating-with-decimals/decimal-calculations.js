(() => {
    'use strict';

    const Calc = window.DecimalCalculations;
    // Look up engine helpers when called: the engine loads after this file.
    const engine = () => window.Maths1to9LessonEngine;
    const integer = (low, high, random) => engine().randomInt(low, high, random);
    const element = (...args) => Calc.element(...args);
    const practiceTypes = ['multiply-whole-card', 'money-multiply', 'divide-whole-card',
        'multiply-decimals', 'known-fact', 'divide-by-decimal', 'share-the-bill',
        'meter-bill', 'times-ten', 'year-cost', 'divide-difference'];
    const choiceTypes = new Set(['money-multiply', 'divide-by-decimal', 'meter-bill', 'divide-difference']);
    // Two kinds take two screens with the same numbers: they share one seed.
    const twoStepTypes = new Set(['share-the-bill', 'multiply-decimals']);
    const stepCount = type => twoStepTypes.has(type) ? 2 : 1;

    // All amounts are integers with an explicit number of decimal places.
    function decimal(value, places = 2, trim = true) {
        const sign = value < 0 ? '−' : '';
        const digits = String(Math.abs(value)).padStart(places + 1, '0');
        if (!places) return sign + digits;
        const whole = digits.slice(0, -places);
        const fraction = trim ? digits.slice(-places).replace(/0+$/, '') : digits.slice(-places);
        return sign + whole + (fraction ? `.${fraction}` : '');
    }
    const money = cents => `£${decimal(cents, 2, false)}`;
    const option = (label, value, feedback, correct = false) => ({ label, value, feedback, correct });
    const moneyOption = (value, feedback, correct = false) => option(money(value), value, feedback, correct);
    const noZero = (low, high, random) => {
        let value;
        do { value = integer(low, high, random); } while (String(value).includes('0'));
        return value;
    };

    function validOptions(question) {
        return (question.stages || [question]).every(stage => !stage.options || (
            stage.options.length === 4 && stage.options.filter(option => option.correct).length === 1 &&
            new Set(stage.options.map(option => option.value ?? option.label)).size === 4 &&
            new Set(stage.options.map(option => option.label)).size === 4
        ));
    }

    function mixed(order) {
        const inputs = order.flatMap(type => Array.from({ length: stepCount(type) },
            (_, step) => choiceTypes.has(type) && step === 0 ? 'choice' : 'work'));
        return inputs.every((input, index) => index < 2 || input !== inputs[index - 1] || input !== inputs[index - 2]);
    }

    function pickSteps(random) {
        let order;
        do { order = engine().shuffle(practiceTypes, random); } while (!mixed(order));
        return order.flatMap((type, parent) => {
            const problemSeed = integer(0, 4294967295, random);
            return Array.from({ length: stepCount(type) }, (_, step) => ({
                type, parent, step, problemSeed, seed: integer(0, 4294967295, random)
            }));
        });
    }

    function tableWidget(model) {
        let view;
        return {
            keepValueOnRetry: true,
            render(host, { value, editable, onChange }) {
                const built = model.build(host);
                view = window.Maths1to9DigitCards.create(host, {
                    slots: built.slots, groups: model.groups || { answer: { advance: model.direction, wrap: false } },
                    active: model.order.find(id => !model.optional.includes(id)), value, editable, onChange,
                    onPaint({ value, active, editable, phase }) {
                        built.update({ activeColumn: editable && active ? active.split(':')[1] : null });
                        built.paint?.(!editable && phase !== 'answer', editable && active ? active.split(':')[1] : null);
                        // In Practice, carries never reveal whether a digit is right
                        // while the pupil works. They appear only after Check.
                        for (const id of model.optional) {
                            built.slots.find(slot => slot.id === id).element.classList.toggle('decimal-empty-leading-answer',
                                !editable && value?.digits?.[id] === undefined);
                        }
                    }
                });
                return view;
            },
            reset() { view?.update({ value: null, editable: true, phase: 'answer' }); },
            replayFeedback(result) { view?.update({ value: result.value, editable: false, phase: result.correct ? 'correct' : 'wrong' }); },
            isEmpty(value) { return !value || model.order.some(id => !model.optional.includes(id) && value.digits?.[id] === undefined); },
            mark(value) {
                const actual = id => value?.digits?.[id] ?? (model.optional.includes(id) ? '0' : undefined);
                const firstWrong = model.order.find(id => actual(id) !== model.expected[id]);
                const marks = Object.fromEntries(model.order.filter(id => value?.digits?.[id] !== undefined || !model.optional.includes(id))
                    .map(id => [id, actual(id) === model.expected[id] ? 'right' : 'wrong']));
                return { correct: !firstWrong, feedback: firstWrong ? model.errors[firstWrong] : model.feedback,
                    value: window.Maths1to9DigitCards.markedValue(value, marks) };
            },
            answerText(value) {
                return (model.currency ? '£' : '') + model.answer.map(id => id === '.' ? '.' : value?.digits?.[id] || '').join('');
            }
        };
    }

    function carryNode(cell, value) {
        const carry = element('span', `+${value}`, 'decimal-written-carry');
        carry.hidden = true;
        cell.classList.add('decimal-written-carry-cell');
        cell.append(carry);
        return carry;
    }

    function multiplyTable(a, n, feedback) {
        const answer = a * n;
        const keys = [...(answer >= 1000 ? ['tens'] : []), 'units', 'point', 'tenths', 'hundredths'];
        const digitKeys = keys.filter(key => key !== 'point');
        const answerDigits = String(answer).padStart(digitKeys.length, '0');
        const original = String(a).padStart(digitKeys.length, '0');
        const expected = Object.fromEntries(digitKeys.map((key, index) => [`answer:${key}`, answerDigits[index]]));
        const order = [...digitKeys].reverse().map(key => `answer:${key}`);
        const errors = {}, carries = {};
        let carry = 0;
        [...digitKeys].reverse().forEach(key => {
            const digit = Number(original[digitKeys.indexOf(key)]);
            const total = digit * n + carry;
            errors[`answer:${key}`] = `Check the ${key}: ${digit} × ${n}${carry ? ` + ${carry}` : ''} = ${total}.`
                + (total >= 10 ? ` Write ${total % 10} and carry ${Math.floor(total / 10)}.` : '');
            carries[key] = carry;
            carry = Math.floor(total / 10);
        });
        const model = {
            expected, order, optional: [], direction: 'left', feedback,
            answer: keys.map(key => key === 'point' ? '.' : `answer:${key}`), errors,
            build(host) {
                const carryNodes = [];
                const built = window.Maths1to9DigitCards.columnTable({
                    label: `${decimal(a, 2, false)} times ${n} in columns`,
                    className: keys.length > 4 ? 'digit-column-table--wide' : '',
                    columns: keys.map(id => ({ id, label: id, ariaLabel: id === 'point' ? 'decimal point' : id })),
                    rows: [
                        { id: 'a', values: Object.fromEntries(keys.map(key => [key, key === 'point' ? '.'
                            : key === 'tens' && a < 1000 ? '' : original[digitKeys.indexOf(key)]])) },
                        { id: 'b', sign: '×', values: { units: String(n) } },
                        { id: 'answer', answer: true, values: Object.fromEntries(keys.map(key => [key,
                            key === 'point' ? '.' : { slot: `answer:${key}`, label: `${key} answer digit` }])) }
                    ],
                    cellExtra(cell, { row, column }) {
                        if (row.id === 'a' && carries[column.id]) carryNodes.push(carryNode(cell, carries[column.id]));
                    }
                });
                const chart = element('div', '', `digit-card-chart${keys.length > 4 ? ' digit-card-chart--wide' : ''}`);
                chart.append(built.table); host.append(chart);
                return { ...built, paint(checked) { carryNodes.forEach(node => { node.hidden = !checked; }); } };
            }
        };
        return { input: 'custom', widget: tableWidget(model), answer: decimal(answer, 2, false),
            values: { a, n, answer }, cardProblem: model };
    }

    // Long multiplication on paper: row a, row × b, one working row for each
    // digit of b, then the answer row under the line. Carries sit beside the
    // digit they are added to, as in Try it 1.
    function longMultiplyTable(a, b, feedback) {
        const unitsDigit = b % 10, tensDigit = Math.floor(b / 10);
        const firstPartial = a * unitsDigit, secondPartial = a * tensDigit * 10, product = a * b;
        const places = ['thousands', 'hundreds', 'tens', 'units'];
        const digits = value => String(value).split('').reverse().map(Number);
        const columns = places.slice(-String(product).length);
        const wide = columns.length > 3;
        const columnAt = position => columns[columns.length - 1 - position];
        const slotId = (row, column) => `${row}:${column}`;
        const expected = {}, errors = {}, order = [], carries = {};

        function addCarry(row, position, value) {
            const column = columnAt(position);
            if (!column) return;
            carries[row] = carries[row] || {};
            carries[row][column] = value;
        }

        function addSlot(row, column, digit, label, error) {
            const id = slotId(row, column);
            expected[id] = digit;
            order.push(id);
            errors[id] = error;
            return { slot: id, label: `${label}, ${column} digit` };
        }

        // One working row: a times a single digit, shifted left by `shift` places.
        function workingRow(row, multiplier, shift, note) {
            const values = {}, label = note;
            if (shift) values[columnAt(0)] = addSlot(row, columnAt(0), '0', label,
                `Check ${label}: write 0 in the units first.`);
            let carry = 0;
            digits(a).forEach((digit, position) => {
                const total = digit * multiplier + carry;
                const written = total % 10, next = Math.floor(total / 10);
                const column = columnAt(position + shift);
                values[column] = addSlot(row, column, String(written), label,
                    `Check ${label}: ${digit} × ${multiplier}${carry ? ` + ${carry}` : ''} = ${total}`
                    + (next ? `, write ${written} and carry ${next}.` : `, write ${written}.`));
                if (next) addCarry(row, position + shift + 1, next);
                carry = next;
            });
            if (carry) {
                const column = columnAt(digits(a).length + shift);
                values[column] = addSlot(row, column, String(carry), label,
                    `Check ${label}: write the carried ${carry} in the ${column}.`);
            }
            return { ...values, note };
        }

        function answerRow() {
            const values = {}, ids = [];
            const firstDigits = digits(firstPartial), secondDigits = digits(secondPartial);
            let carry = 0;
            for (let position = 0; position < columns.length; position++) {
                const top = firstDigits[position] || 0, bottom = secondDigits[position] || 0;
                const total = top + bottom + carry;
                const written = total % 10, next = Math.floor(total / 10);
                const column = columnAt(position);
                values[column] = addSlot('answer', column, String(written), 'Answer',
                    `Check the answer row: ${top} + ${bottom}${carry ? ` + ${carry}` : ''} = ${total}`
                    + (next ? `, write ${written} and carry ${next}.` : `.`));
                ids.push(slotId('answer', column));
                if (next && position + 1 < columns.length) addCarry('answer', position + 1, next);
                carry = next;
            }
            return { values, ids };
        }

        const printed = value => Object.fromEntries([...String(value)].map((digit, index) =>
            [columnAt(String(value).length - 1 - index), digit]));
        const firstRow = workingRow('first', unitsDigit, 0, `${a} × ${unitsDigit}`);
        const secondRow = workingRow('second', tensDigit, 1, `${a} × ${tensDigit * 10}`);
        const answer = answerRow();
        const model = {
            expected, order, optional: [], direction: 'left', feedback, errors,
            groups: {
                first: { advance: 'left', wrap: false, next: 'second' },
                second: { advance: 'left', wrap: false, next: 'answer' },
                answer: { advance: 'left' }
            },
            answer: [...answer.ids].reverse(),
            build(host) {
                const carryNodes = [];
                const built = window.Maths1to9DigitCards.columnTable({
                    label: `${a} times ${b} in long multiplication`,
                    className: `${wide ? 'digit-column-table--wide ' : ''}decimal-long-multiplication`,
                    columns: [...columns.map(id => ({ id, label: id })), { id: 'note', label: '' }],
                    rows: [
                        { id: 'a', values: printed(a) },
                        { id: 'b', sign: '×', values: printed(b) },
                        { id: 'first', values: firstRow },
                        { id: 'second', values: secondRow },
                        { id: 'answer', answer: true, values: answer.values }
                    ],
                    cellExtra(cell, { row, column }) {
                        const carried = carries[row.id]?.[column.id];
                        if (carried) carryNodes.push(carryNode(cell, carried));
                    }
                });
                const chart = element('div', '',
                    `digit-card-chart${wide ? ' digit-card-chart--wide' : ''} decimal-long-chart`);
                chart.append(built.table);
                host.append(chart);
                return { ...built, paint(checked) { carryNodes.forEach(node => { node.hidden = !checked; }); } };
            }
        };
        return { input: 'custom', widget: tableWidget(model), answer: String(product),
            values: { a, b, product }, cardProblem: model };
    }

    function divideTable(dividend, divisor, feedback, currency = false) {
        const text = decimal(dividend, 2, false);
        const expected = {}, errors = {}, carries = {}, order = [], optional = [];
        let remainder = 0, leading = true;
        [...text].forEach((digit, index) => {
            if (digit === '.') return;
            const id = `answer:${index}`;
            const top = remainder * 10 + Number(digit);
            if (remainder) carries[String(index)] = String(remainder);
            const quotient = Math.floor(top / divisor);
            remainder = top % divisor;
            expected[id] = String(quotient);
            order.push(id);
            if (leading && quotient === 0) optional.push(id);
            else leading = false;
            errors[id] = optional.includes(id) ? `The ${top} is less than ${divisor}. Leave that box empty or put 0 there.`
                : `Check the ${top}: ${top} ÷ ${divisor} = ${quotient}${remainder ? `, remainder ${remainder}` : ''}.`;
        });
        const model = {
            expected, errors, order, optional, direction: 'right', feedback, currency,
            answer: [...text].map((digit, index) => digit === '.' ? '.' : `answer:${index}`),
            build(host) {
                const built = window.Maths1to9DigitCards.shortDivision({ divisor, dividend: text });
                const chart = element('div', '', 'digit-card-chart');
                chart.append(built.table); host.append(chart);
                return { ...built, paint(checked, activeColumn) { built.update({ activeColumn, carries: checked ? carries : {} }); } };
            }
        };
        return { input: 'custom', widget: tableWidget(model), answer: decimal(dividend / divisor, 2, false),
            values: { dividend, divisor, answer: dividend / divisor }, cardProblem: model };
    }

    function generateProblem(type, random) {
        let question;
        do {
            if (type === 'multiply-whole-card') {
                const a = noZero(105, 995, random), n = integer(3, 9, random), result = a * n;
                question = { ...multiplyTable(a, n, `${decimal(a, 2, false)} × ${n} = ${decimal(result, 2, false)}.`),
                    prompt: `Work out ${decimal(a, 2, false)} × ${n}.` };
            } else if (type === 'money-multiply') {
                const p = 115 + 5 * integer(0, 76, random), n = integer(3, 9, random), answer = n * p;
                const item = ['folder', 'pen', 'cake', 'ticket'][integer(0, 3, random)];
                question = { input: 'choice', prompt: `One ${item} costs ${money(p)}. How much do ${n} ${item}s cost?`,
                    answer: decimal(answer, 2, false), values: { p, n, answer }, options: [
                        moneyOption(answer, `${n} × ${money(p)} = ${money(answer)}.`, true),
                        moneyOption(p + n * 100, `You added ${n}. Find ${n} lots of the price.`),
                        moneyOption(Math.floor(p / 100) * 100 * n + p % 100, `Times the pence by ${n} too.`),
                        moneyOption(answer * 100, "That's the answer in pence. Change it to pounds.")
                    ] };
            } else if (type === 'divide-whole-card') {
                const divisor = integer(2, 9, random), answer = integer(112, 999, random), dividend = answer * divisor;
                question = { ...divideTable(dividend, divisor, `${decimal(dividend, 2, false)} ÷ ${divisor} = ${decimal(answer, 2, false)}.`),
                    prompt: `Work out ${decimal(dividend, 2, false)} ÷ ${divisor}.` };
            } else if (type === 'multiply-decimals') {
                const a = noZero(12, 89, random), b = noZero(12, 89, random), answer = a * b;
                const table = { ...longMultiplyTable(a, b, `${a} × ${b} = ${answer}.`),
                    prompt: `Work out ${decimal(a)} × ${decimal(b)}.` };
                const typed = { input: 'number', prompt: `${a} × ${b} = ${answer}. Now work out ${decimal(a)} × ${decimal(b)}.`,
                    answer: decimal(answer, 4), values: { a, b, answer },
                    feedback: `${a} × ${b} = ${answer}, and there are 4 digits after the points.`,
                    rules: [
                        { value: decimal(answer, 3), feedback: 'Count the digits after the points again. There are 4.' }
                    ],
                    fallback: 'Take the points out, multiply, then count 4 digits from the end.' };
                question = { stages: [table, typed], values: { a, b, answer } };
            } else if (type === 'known-fact') {
                const a = integer(12, 89, random), b = integer(12, 89, random), product = a * b;
                const x = decimal(a, 1, false), y = decimal(b, 1, false), answer = decimal(product, 2, false);
                question = { input: 'number', prompt: `${a} × ${b} = ${product}. Work out ${x} × ${y}.`, answer, values: { a, b, product },
                    feedback: `${x} × ${y} has 2 digits after the points, so it's ${answer}.`, rules: [
                        { value: decimal(product, 1), feedback: 'Count the digits after the points in both numbers. There are 2.' },
                        { value: decimal(product, 3), feedback: "That's 3 digits after the point. There are only 2." }
                    ], fallback: 'Take the points out, multiply, then count 2 digits from the end.' };
            } else if (type === 'divide-by-decimal') {
                const q = integer(12, 80, random), c = integer(2, 9, random), d = q * c;
                question = { input: 'choice', prompt: `Work out ${decimal(d)} ÷ ${decimal(c)}.`, answer: String(q), values: { q, c, d }, options: [
                    option(String(q), q * 10000, `Multiply both by 100: ${d} ÷ ${c} = ${q}.`, true),
                    option(decimal(q, 2), q * 100, "You don't need to change the answer back. It stays the same."),
                    option(decimal(q, 1), q * 1000, 'Move both points the same number of places.'),
                    option(decimal(q * c * c, 4), q * c * c, "That's multiplying. The question asks you to divide.")
                ] };
            } else if (type === 'share-the-bill') {
                const n = integer(4, 8, random), answer = integer(500, 2500, random), total = n * answer;
                const f = integer(Math.floor(total / 2), Math.floor(total * 4 / 5), random), g = total - f;
                const selection = { input: 'choice', prompt: `${n} friends spend ${money(f)} on food and ${money(g)} on drinks. They share the bill equally. How much does each friend pay?`,
                    answer: decimal(answer, 2, false), options: [
                        option(`(${money(f)} + ${money(g)}) ÷ ${n}`, total, 'Add the food and drinks first, then share.', true),
                        option(`${money(f)} + ${money(g)} ÷ ${n}`, f * n + g, 'That only shares the drinks. Add them first.'),
                        option(`(${money(f)} − ${money(g)}) ÷ ${n}`, f - g, 'The friends pay for both, so add them.'),
                        option(`(${money(f)} + ${money(g)}) × ${n}`, total * n * n, 'Sharing means dividing.')
                    ] };
                const table = { ...divideTable(total, n, `Each friend pays ${money(answer)}.`, true),
                    prompt: `${money(f)} + ${money(g)} = ${money(total)}. Work out ${money(total)} ÷ ${n}.` };
                question = { stages: [selection, table], values: { n, answer, total, f, g } };
            } else if (type === 'meter-bill') {
                const first = integer(1000, 9000, random), used = integer(12, 48, random) * 10;
                const second = first + used, c = integer(12, 25, random), answer = used * c;
                question = { input: 'choice', prompt: `A meter reads ${first} units, then ${second} units. Each unit used costs ${c}p. What is the bill?`,
                    answer: decimal(answer, 2, false), values: { first, second, used, c, answer }, options: [
                        moneyOption(answer, `${used} units × ${c}p = ${answer}p = ${money(answer)}.`, true),
                        moneyOption((first + second) * c, "Take the first reading from the second, don't add them."),
                        moneyOption(answer * 100, "That's the bill in pence. Divide by 100."),
                        moneyOption(second * c, `${second} includes old units. Only pay for the difference.`)
                    ] };
            } else if (type === 'times-ten') {
                const a = integer(11, 99, random), power = integer(1, 2, random), factor = 10 ** power;
                const original = decimal(a, 1, false), answer = a * 10 ** (power - 1);
                question = { input: 'number', prompt: `Eli writes ${factor} × ${original} = ${original}${'0'.repeat(power)}. What should the answer be?`,
                    answer: String(answer), values: { a, factor, answer },
                    feedback: `Times ${factor} makes every digit worth ${factor} times more: ${answer}.`, rules: [
                        { value: original, feedback: "A 0 on the end after the point doesn't change the number." },
                        { value: decimal(a, power + 1), feedback: "That's dividing. Multiplying makes it bigger." }
                    ], fallback: `Times ${factor} makes every digit worth ${factor} times more: ${answer}.` };
            } else if (type === 'year-cost') {
                const a = 250 + 50 * integer(0, 6, random), b = integer(6, 9, random) * 100, m = integer(2, 4, random);
                const answer = m * a + (12 - m) * b;
                question = { input: 'number', prompt: `A club costs ${money(a)} a month for the first ${m} months, then ${money(b)} a month for the rest of the year. How much is it for the year?`,
                    answer: decimal(answer, 2, false), values: { a, b, m, answer },
                    feedback: `${m} × ${money(a)} + ${12 - m} × ${money(b)} = ${money(answer)}.`, rules: [
                        { value: decimal(12 * b), feedback: `The first ${m} months cost less.` },
                        { value: decimal(m * a + 12 * b), feedback: `That counts the first ${m} months twice.` }
                    ], fallback: `Work out the first ${m} months, then the other ${12 - m} months.` };
            } else if (type === 'divide-difference') {
                const c = integer(12, 18, random), q = integer(101, 299, random), b = integer(12, 249, random);
                if (q % 10 === 0 || c * q % 10 === 0) continue;
                const difference = c * q, a = difference + b * 10, answer = decimal(q, 1, false);
                const numerator = a * c - b * 1000, denominator = 1000 * c;
                // Dividing first: a − b ÷ c, to 2 decimal places.
                const wrongOrder = decimal(Math.round(Math.abs(numerator) * 100 / denominator) * Math.sign(numerator), 2);
                question = { input: 'choice', prompt: `Work out (${decimal(a, 3, false)} − ${decimal(b, 2, false)}) ÷ ${decimal(c, 2, false)}.`,
                    answer, values: { a, b, c, q, difference }, options: [
                        option(answer, q, `${decimal(a, 3, false)} − ${decimal(b, 2, false)} = ${decimal(difference, 3, false)}, then ${decimal(difference, 3, false)} ÷ ${decimal(c, 2, false)} = ${answer}.`, true),
                        option(decimal(q, 2), q * 100, 'Move both points the same number of places.'),
                        option(String(q), q * 10, 'You moved one point more places than the other. Move both the same.'),
                        option(wrongOrder, q * 1000, 'Work out the top first, then divide.')
                    ] };
            } else throw new Error(`Unknown decimal question type: ${type}`);
        } while (!question || !validOptions(question));
        return question;
    }

    function generateStep(item, random) {
        const problem = generateProblem(item.type, engine().seededRandom(item.problemSeed));
        const definition = (problem.stages || [problem])[item.step];
        return { ...definition, questionType: item.type,
            options: definition.options ? engine().shuffle(definition.options, random) : undefined,
            figure(host) {
                host.dataset.kind = item.type;
                host.dataset.step = String(item.step);
                host.dataset.problem = String(item.parent + 1);
                window.Maths1to9Lesson.setSectionPosition('question-bank', `Question ${item.parent + 1} of 11`);
            }
        };
    }

    function aliWorking(host) {
        const figure = element('figure', '', 'decimal-ali-working');
        figure.append(element('figcaption', "Ali's working"));
        const drawing = element('div');
        drawing.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 110" fill="var(--text)" font-family="inherit" role="img" aria-label="Ali's working: 8.4 divided by 3, with 28 above the line and no point.">
            <path d="M43 103V49H149" fill="none" stroke="#64748b" stroke-width="2"/>
            <g font-size="28" font-weight="700" text-anchor="middle"><text x="21" y="88">3</text><text x="76" y="36">2</text><text x="127" y="36">8</text><text x="76" y="88">8</text><text x="101" y="88">.</text><text x="127" y="88">4</text></g>
        </svg>`;
        figure.append(drawing); host.append(figure);
    }

    function checks() {
        return [
            { type: 'count-digits', prompt: '46 × 35 = 1610. Where does the point go in 0.46 × 0.35?', options: [
                { label: '0.1610', correct: true, feedback: '0.46 × 0.35 has 4 digits after the points, so the answer has 4 too.' },
                { label: '16.10', feedback: "That's only 2 digits after the point. Count the digits in both numbers." },
                { label: '1.610', feedback: "That's 3 digits after the point. There are 4." },
                { label: '161.0', feedback: "That's 1 digit after the point. There are 4." }
            ] },
            { type: 'known-fact-check', prompt: '63 × 24 = 1512. What is 6.3 × 2.4?', options: [
                { label: '15.12', correct: true, feedback: '6.3 × 2.4 has 2 digits after the points, so 15.12.' },
                { label: '151.2', feedback: "That's only 1 digit after the point. Count both numbers." },
                { label: '1.512', feedback: "That's 3 digits after the point. There are only 2." },
                { label: '1512', feedback: 'You need to put the point back.' }
            ] },
            { type: 'fill-zeros', prompt: 'Why is 0.3 × 0.2 = 0.06, not 0.6?', options: [
                { label: '3 × 2 = 6, and the answer needs 2 digits after the point, so you write 0.06.', correct: true, feedback: 'Right. The 0 fills the gap so there are 2 digits after the point.' },
                { label: '0.6 is right. You only count the digits in one number.', feedback: 'Count the digits after the point in both numbers.' },
                { label: 'You always add a 0 when you multiply decimals.', feedback: 'The 0 is only there to make 2 digits after the point.' },
                { label: 'Multiplying always makes numbers smaller, so 0.6 is too big.', feedback: 'Not always: 4 × 3 = 12 is bigger. The 0 is there so the answer has 2 digits after the point.' }
            ] },
            { type: 'point-straight-up', prompt: 'Ali works out 8.4 ÷ 3 like this. What has Ali done wrong?', figure: aliWorking, options: [
                { label: 'The point should go above the point in 8.4, making 2.8.', correct: true, feedback: 'Right. When you divide by a whole number, the point goes straight up.' },
                { label: 'Nothing. 8.4 ÷ 3 = 28.', feedback: '28 × 3 is 84, not 8.4. The answer needs a point.' },
                { label: 'Ali should have divided 3 by 8.4.', feedback: "8.4 ÷ 3 means 8.4 shared into 3, so Ali divided the right way round." },
                { label: 'The answer should be 0.28.', feedback: '0.28 × 3 is 0.84. Put the point right above the point in 8.4.' }
            ] },
            { type: 'scale-divisor', prompt: 'Which gives the same answer as 2.7 ÷ 0.06?', options: [
                { label: '270 ÷ 6', correct: true, feedback: 'Both numbers are 100 times bigger, so the answer stays the same.' },
                { label: '2.7 ÷ 6', feedback: "You changed 0.06 but not 2.7. Change both the same way." },
                { label: '27 ÷ 6', feedback: '2.7 was times 10 but 0.06 was times 100. Change both the same way.' },
                { label: '0.027 ÷ 6', feedback: 'The point in 2.7 moved the wrong way. Move both to the right.' }
            ] }
        ];
    }

    Object.assign(Calc, { decimal, money, practiceTypes, pickSteps, generateProblem, generateStep, checks });
})();
