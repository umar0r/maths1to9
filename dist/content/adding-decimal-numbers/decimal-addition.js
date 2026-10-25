(() => {
    'use strict';

    const toCents = text => {
        const [whole, decimal = ''] = text.split('.');
        return Number(whole) * 100 + Number(decimal.padEnd(2, '0'));
    };
    const decimalText = cents => `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
    const shortText = number => String(Number(number.toFixed(3)));
    const worked = { a: '14.7', b: '6.82', total: '21.52' };
    const keys = ['hundredths', 'tenths', 'ones', 'tens'];
    const positions = { tens: 1, ones: 2, tenths: 4, hundredths: 5 };
    const option = (label, feedback, correct = false) => ({ label, feedback, correct });

    function cells(text) {
        const [whole, decimal = ''] = text.split('.');
        return [whole.length > 1 ? whole[0] : '', whole.slice(-1), '.', decimal[0] || '', decimal[1] || ''];
    }

    function columnSteps(a, b) {
        const x = toCents(a), y = toCents(b);
        let carry = 0;
        return keys.map((key, index) => {
            const left = Math.floor(x / 10 ** index) % 10;
            const right = Math.floor(y / 10 ** index) % 10;
            const incoming = carry;
            const total = left + right + incoming;
            carry = Math.floor(total / 10);
            return { key, left, right, incoming, total, digit: total % 10, carry };
        });
    }

    function drawGrid(host, a, b, config = {}) {
        const grid = document.createElement('div');
        grid.className = 'decimal-grid';
        grid.setAttribute('role', 'group');
        grid.setAttribute('aria-label', `Place-value columns for ${a} plus ${b}`);
        function row(values, className) {
            const node = document.createElement('div');
            node.className = className;
            for (const value of values) {
                const cell = document.createElement('span');
                cell.textContent = value;
                if (value === '.') cell.className = 'decimal-point';
                node.append(cell);
            }
            grid.append(node);
            return node;
        }
        row(['', 'tens', 'ones', '', 'tenths', 'hundredths', ''], 'decimal-labels');
        const carryRow = row(Array.from({ length: 7 }, (_, index) => {
            const key = Object.keys(positions).find(key => positions[key] === index);
            return config.carries?.[key] || '';
        }), 'decimal-carry');
        row(['', ...cells(a), ''], 'decimal-row');
        const second = row(Array(7).fill(''), 'decimal-row decimal-row--second');
        let answerRow;
        if (config.result) {
            const values = Array.isArray(config.result) ? config.result : cells(config.result);
            answerRow = row(['', ...values, ''], 'decimal-row decimal-row--answer');
        }
        if (config.highlight) {
            const at = positions[config.highlight];
            for (const node of grid.querySelectorAll('.decimal-row')) node.children[at].classList.add('decimal-highlight');
        }
        function move(offset) {
            const values = Array(7).fill('');
            cells(b).forEach((value, index) => { values[index + 1 + offset] = value; });
            [...second.children].forEach((cell, index) => {
                cell.replaceChildren();
                cell.textContent = values[index];
                cell.classList.toggle('decimal-point', values[index] === '.');
            });
            // The plus sign is separate from the digits so a shifted row cannot hide it.
            grid.dataset.offset = String(offset);
        }
        move(config.offset || 0);
        host.append(grid);
        return { grid, carryRow, answerRow, move };
    }

    function alignmentWidget(a, b) {
        return {
            render(host, { value, onChange }) {
                const picture = drawGrid(host, a, b);
                const label = document.createElement('label');
                label.className = 'decimal-slider-label';
                label.textContent = 'Move the second number';
                const input = document.createElement('input');
                input.type = 'range';
                input.min = -1;
                input.max = 1;
                input.step = 1;
                input.setAttribute('aria-label', 'Move the second number');
                input.addEventListener('input', () => {
                    const offset = Number(input.value);
                    picture.move(offset);
                    onChange(offset);
                });
                label.append(input);
                host.append(label);
                return {
                    update({ value, editable }) {
                        input.value = String(value === null ? 1 : value);
                        input.disabled = !editable;
                        picture.move(Number(input.value));
                    },
                    focus() { input.focus(); }
                };
            },
            isEmpty: value => value === null,
            mark: value => ({
                correct: value === 0,
                feedback: value === 0 ? 'The decimal points line up. The same-sized parts are in the same columns.'
                    : 'The decimal points are in different columns. Move the second row so they line up.'
            }),
            answerText: value => value === 0 ? 'Decimal points lined up' : 'Decimal points in different columns'
        };
    }

    function columnWidget(a, b) {
        const steps = columnSteps(a, b);
        const total = toCents(a) + toCents(b);
        const fields = keys.slice(0, total >= 1000 ? 4 : 3);
        const carryTen = steps[2].carry;
        if (carryTen) fields.push('carry');
        function expected(key) { return key === 'carry' ? String(carryTen) : String(steps.find(step => step.key === key).digit); }
        return {
            render(host, { value, onChange }) {
                const picture = drawGrid(host, a, b, { result: ['', '', '.', '', ''] });
                const inputs = {};
                for (const key of fields) {
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.inputMode = 'numeric';
                    input.maxLength = 1;
                    input.autocomplete = 'off';
                    input.tabIndex = key === 'hundredths' ? 0 : -1;
                    input.addEventListener('keydown', event => {
                        if (event.key !== 'Tab') return;
                        const next = fields.indexOf(key) + (event.shiftKey ? -1 : 1);
                        if (next >= 0 && next < fields.length) {
                            event.preventDefault();
                            inputs[fields[next]].focus();
                        } else if (next === fields.length) {
                            event.preventDefault();
                            // Leave the managed digit order for the engine's existing action.
                            const action = document.querySelector('.lesson-controls button.button--primary');
                            if (action && !action.disabled) action.focus();
                            else document.querySelector('.site-logo')?.focus();
                        }
                    });
                    input.setAttribute('aria-label', key === 'carry' ? 'Carry to tens' : `${key[0].toUpperCase() + key.slice(1)} digit`);
                    input.addEventListener('input', () => {
                        onChange(Object.fromEntries(fields.map(field => [field, inputs[field].value])));
                    });
                    inputs[key] = input;
                    const cell = key === 'carry' ? picture.carryRow.children[1] : picture.answerRow.children[positions[key]];
                    if (key === 'carry') {
                        const label = document.createElement('label');
                        label.className = 'decimal-carry-label';
                        label.append('Carry', input);
                        cell.replaceChildren(label);
                    } else cell.replaceChildren(input);
                }
                return {
                    update({ value, editable }) {
                        for (const key of fields) {
                            inputs[key].value = value?.[key] || '';
                            inputs[key].disabled = !editable;
                        }
                    },
                    focus() { inputs[fields[0]].focus(); }
                };
            },
            isEmpty: value => !value || fields.some(key => !String(value[key] ?? '').trim()),
            mark(value) {
                const wrong = fields.find(key => String(value?.[key]) !== expected(key));
                if (!wrong) return { correct: true, feedback: `${a} + ${b} = ${decimalText(total)}. The decimal points stay in the same column.` };
                if (wrong === 'carry') return { correct: false, feedback: `The ones column makes ${steps[2].total} ones. Carry ${carryTen} ten to the tens column.` };
                const step = steps.find(step => step.key === wrong);
                const sum = `${step.left} + ${step.right}${step.incoming ? ` + ${step.incoming}` : ''}`;
                return { correct: false, feedback: `Check the ${wrong}: ${sum} = ${step.total}. Write the digit ${step.digit}.` };
            },
            answerText(value) {
                if (!value) return '';
                return `${total >= 1000 ? value.tens : ''}${value.ones}.${value.tenths}${value.hundredths}`;
            },
            fields, expected
        };
    }

    function examples() {
        return [
            { a: '8.4', b: '2.35', input: 'custom', questionType: 'alignment', prompt: 'Move the second number so the decimal points line up.', widget: alignmentWidget('8.4', '2.35') },
            { a: '8.4', b: '2.35', input: 'number', questionType: 'zero', prompt: 'What digit can you write after the 4 without changing 8.4?', answer: '0',
                feedback: '8.4 = 8.40. The extra zero does not change the value.', rules: [
                    { value: '4', feedback: '8.44 is a different number. A zero at the end keeps 8.4 unchanged.' },
                    { value: '1', feedback: '8.41 is bigger than 8.4. Use a digit that adds no hundredths.' }
                ], fallback: 'Choose a digit that adds no hundredths to 8.4.' },
            { a: '8.40', b: '2.35', input: 'custom', questionType: 'columns', prompt: 'Add 8.40 + 2.35. Start on the right. Write each answer digit, and write any carry in the small box.', widget: columnWidget('8.40', '2.35') },
            { a: '8.4', b: '2.35', input: 'choice', questionType: 'decimal-point', prompt: 'Where should the answer’s decimal point go?', options: [
                option('Directly below the decimal points in the two numbers.', 'The decimal points stay in the same column.', true),
                option('Before the last digit.', 'The last digit may be tenths or hundredths. Use the decimal points above it.'),
                option('In the middle of the answer.', 'The middle depends on the number of digits. Use the decimal-point column.'),
                option('Under the last digits of the two numbers.', 'The last digits may have different place values. The decimal points must line up.')
            ] },
            { a: '3.6', b: '1.25', input: 'custom', questionType: 'alignment', prompt: 'Move the second number so the decimal points line up.', widget: alignmentWidget('3.6', '1.25') },
            { a: '3.60', b: '1.25', input: 'custom', questionType: 'columns', prompt: 'Add 3.60 + 1.25. Start on the right. Write each answer digit.', widget: columnWidget('3.60', '1.25') }
        ];
    }

    function mistakes(a, b) {
        const x = toCents(a), y = toCents(b), sum = x + y;
        const noCarries = keys.reduce((total, key, index) => total + ((Math.floor(x / 10 ** index) % 10 + Math.floor(y / 10 ** index) % 10) % 10) * 10 ** index, 0);
        const candidates = [
            { value: shortText((Number(a.replace('.', '')) + Number(b.replace('.', ''))) / 100), feedback: 'That lines up the last digits instead of the decimal points.' },
            { value: shortText(noCarries / 100), feedback: 'That leaves out a carried digit. Add from right to left and include each carry.' },
            { value: shortText(sum / 1000), feedback: 'The decimal point is one place too far left. Keep it under the decimal points above.' },
            { value: shortText(sum / 10), feedback: 'The decimal point is one place too far right. Keep it under the decimal points above.' },
            { value: String(sum), feedback: 'That leaves out the decimal point. Keep it under the decimal points in the two numbers.' }
        ];
        return candidates.filter((item, index) => Number(item.value) !== sum / 100 && candidates.findIndex(other => other.value === item.value) === index);
    }

    function calculate(a, b, input = 'number', prompt, currency = false) {
        const total = decimalText(toCents(a) + toCents(b));
        const errors = mistakes(a, b);
        const feedback = `${a} + ${b} = ${total}. Line up the decimal points and add from right to left.`;
        const question = { a, b, questionType: 'calculate', input, prompt: prompt || `Work out ${a} + ${b}.`,
            feedback, figure: host => drawGrid(host, a, b) };
        if (input === 'choice') question.options = [
            option(`${currency ? '£' : ''}${total}`, feedback, true),
            ...errors.slice(0, 3).map(error => option(`${currency ? '£' : ''}${error.value}`, error.feedback))
        ];
        else Object.assign(question, { answer: total, rules: errors, fallback: `Line up the decimal points. Add from the hundredths column to the left, including any carried digits.${currency ? ' Leave out the £ sign.' : ''}` });
        return question;
    }

    function checks() {
        return [
            calculate('5.8', '0.34'),
            { questionType: 'explanation', input: 'choice', prompt: 'A student lines up the last digits to add 5.8 and 0.34. Which explanation is right?', options: [
                option('Line up the decimal points. The 8 is tenths and the 4 is hundredths.', 'The last digits have different place values. Line up the decimal points.', true),
                option('Line up the last digits. The 8 and 4 are both ones.', 'The 8 means eight tenths and the 4 means four hundredths. They do not belong in the same column.'),
                option('Line up the first digits. Decimal points do not matter.', 'The first digits can have different place values. The decimal points tell you which columns match.'),
                option('Move each decimal point to the end before adding.', 'Moving a decimal point changes the number. Keep each point in its place.')
            ] },
            calculate('1.75', '0.8', 'number', 'A bottle contains 1.75 litres. Another contains 0.8 litres. How much water is there altogether? Type the number of litres.'),
            calculate('6.75', '2.40', 'choice', 'Work out £6.75 + £2.40.', true),
            calculate('7.48', '3.76')
        ];
    }

    const practiceTypes = ['no-carry', 'carry-tenths', 'carry-ones', 'mixed-places', 'money', 'double-carry'];
    function pick(random) {
        return practiceTypes.map(type => ({ type, seed: window.Maths1to9LessonEngine.randomInt(0, 4294967295, random) }));
    }
    function prepare(question, random) {
        return question.options ? { ...question, options: window.Maths1to9LessonEngine.shuffle(question.options, random) } : { ...question };
    }
    function generate(item, random) {
        const integer = (min, max) => window.Maths1to9LessonEngine.randomInt(min, max, random);
        let x, y;
        if (item.type === 'mixed-places') {
            x = integer(1, 25) * 100 + integer(1, 9);
            y = integer(1, 9) * 100 + integer(1, 9) * 10;
        } else if (item.type === 'money') {
            x = integer(100, 3900); y = integer(100, 3900);
        } else {
            const ones = item.type === 'no-carry' ? [integer(1, 4), integer(1, 4)]
                : item.type === 'carry-tenths' ? [integer(0, 4), integer(1, 4)] : [integer(7, 9), integer(3, 9)];
            let tenths = item.type === 'carry-tenths' ? [integer(6, 9), integer(5, 9)] : [integer(0, 4), integer(0, 4)];
            if (item.type === 'double-carry') {
                const first = integer(1, 9);
                tenths = [first, integer(9 - first, 9)];
            }
            const hundredths = item.type === 'double-carry' ? [integer(6, 9), integer(6, 9)]
                : item.type === 'carry-tenths' ? [integer(0, 9), integer(0, 9)] : [integer(0, 4), integer(0, 4)];
            x = ones[0] * 100 + tenths[0] * 10 + hundredths[0];
            y = ones[1] * 100 + tenths[1] * 10 + hundredths[1];
        }
        if (item.type === 'money') {
            if (x % 10 === 0) x += x === 3900 ? -1 : 1;
            if (y % 10 === 0) y += y === 3900 ? -1 : 1;
        }
        if (x % 100 === 0 && y % 100 === 0) y++;
        const trim = number => decimalText(number).replace(/0+$/, '').replace(/\.$/, '');
        const a = trim(x), b = trim(y);
        const input = ['no-carry', 'carry-ones', 'mixed-places'].includes(item.type) ? 'choice' : 'number';
        const prompt = item.type === 'money' ? `Work out £${a} + £${b}. Leave out the £ sign.` : undefined;
        return prepare({ ...calculate(a, b, input, prompt, item.type === 'money'), questionType: item.type }, random);
    }

    function drawExample(host, question, correct) {
        if (question.input === 'custom') return;
        const a = question.questionType === 'zero' && correct ? decimalText(toCents(question.a)) : question.a;
        drawGrid(host, a, question.b, { result: correct && question.questionType === 'decimal-point' ? decimalText(toCents(question.a) + toCents(question.b)) : undefined });
    }

    window.DecimalAddition = { toCents, decimalText, worked, cells, columnSteps, drawGrid, alignmentWidget, columnWidget,
        examples, mistakes, calculate, checks, practiceTypes, pick, prepare, generate, drawExample };
})();
