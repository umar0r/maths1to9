(() => {
    'use strict';

    const D = window.DecimalAddition;
    const element = (tag, text = '', className = '') => {
        const node = document.createElement(tag);
        node.textContent = text;
        node.className = className;
        return node;
    };
    const worth = { tens: 'ten', units: 'unit', tenths: 'tenth', hundredths: 'hundredth' };

    function buildProblem(a, b, operator, hints = false) {
        const left = Math.round(Number(a) * 100), right = Math.round(Number(b) * 100);
        const answer = operator === '+' ? left + right : left - right;
        const tens = Math.max(left, right, answer) >= 1000;
        const keys = ['hundredths', 'tenths', 'units', ...(tens ? ['tens'] : [])];
        const row = D.cardProblem(left, right, operator, false, a, b, tens);
        const operands = [['a', a, left], ['b', b, right]].map(([id, text, cents]) => {
            const [whole, decimal = ''] = text.split('.');
            const fields = Object.fromEntries(keys.map((key, place) => [key, {
                digit: String(Math.floor(cents / 10 ** place) % 10),
                required: key === 'units' || key === 'tens' && whole.length > 1
                    || key === 'tenths' && decimal.length > 0 || key === 'hundredths' && decimal.length > 1
            }]));
            return { id, text, fields, count: whole.length + decimal.length };
        });
        const required = operands.flatMap(operand => keys.filter(key => operand.fields[key].required).map(key => `${operand.id}:${key}`));
        const answerDigits = Object.fromEntries(keys.map((key, place) => [key, String(Math.floor(answer / 10 ** place) % 10)]));
        function placementHint(operand, key, digits) {
            const field = operand.fields[key], actual = digits?.[`${operand.id}:${key}`];
            if (field.required && actual === field.digit || !field.required && (actual === undefined || actual === '0')) return '';
            let place = key, digit = field.digit;
            if (!field.required) {
                place = keys.find(candidate => operand.fields[candidate].required && operand.fields[candidate].digit === actual);
                if (!place) return `${operand.text} has no ${key}. Leave that box empty or put 0.`;
                digit = actual;
            }
            return `The ${digit} in ${operand.text} is ${digit} ${worth[place]}${digit === '1' ? '' : 's'}.`;
        }
        function misplaced(digits) {
            for (const operand of operands) for (const key of [...keys].reverse()) {
                const message = placementHint(operand, key, digits);
                if (message) return message;
            }
            return '';
        }
        return { a, b, operator, answer, tens, keys, operands, required, answerDigits, hints, row, misplaced, placementHint,
            feedback: `${(left / 100).toFixed(2)} ${operator} ${(right / 100).toFixed(2)} = ${(answer / 100).toFixed(2)}.` };
    }

    function buildWidget(problem) {
        let view;
        const operandsReady = digits => problem.operands.every(operand =>
            problem.keys.filter(key => digits?.[`${operand.id}:${key}`] !== undefined).length >= operand.count);
        // A blank answer cell counts as a 0 only in a leading place the answer
        // does not use. Every other answer column needs a digit, even a 0.
        const optionalAnswer = key => key === 'tens' && problem.answer < 1000;
        const answerDigit = (digits, key) => digits?.[`answer:${key}`] ?? (optionalAnswer(key) ? '0' : undefined);
        return {
            reset() { view?.update({ value: null, editable: true, phase: 'answer' }); },
            replayFeedback(result) { view?.update({ value: result.value, editable: false, phase: result.correct ? 'correct' : 'wrong' }); },
            isEmpty(value) {
                const digits = value?.digits;
                return !operandsReady(digits) || problem.keys.some(key =>
                    digits?.[`answer:${key}`] === undefined && !optionalAnswer(key));
            },
            mark(value) {
                const placement = problem.misplaced(value?.digits);
                if (placement) return { correct: false, feedback: placement };
                const digits = Object.fromEntries(problem.keys.map(key => [key, answerDigit(value?.digits, key)]));
                const error = problem.row.mark(digits);
                return { correct: !error, feedback: error || problem.feedback };
            },
            answerText(value) {
                const digits = value?.digits || {};
                return `${problem.tens ? digits['answer:tens'] || '' : ''}${digits['answer:units'] || ''}.${digits['answer:tenths'] || ''}${digits['answer:hundredths'] || ''}`;
            },
            render(host, { onChange }) {
                let value = null, editable = true, phase = 'answer';
                const { table } = D.columnTable({ a: problem.a, b: problem.b, operator: problem.operator, tens: problem.tens });
                const keys = [...problem.keys].reverse();
                const places = [...keys];
                places.splice(places.length - 2, 0, 'point');
                const body = table.querySelector('tbody');
                const slots = {}, columns = [];
                problem.operands.forEach((operand, index) => {
                    const row = body.rows[index];
                    places.forEach((key, column) => {
                        const cell = row.cells[column + 1];
                        cell.dataset.column = key;
                        if (key !== 'point') addSlot(cell, `${operand.id}:${key}`, `${index === 0 ? 'First' : 'Second'} number, ${key}`);
                        columns.push({ cell, key });
                    });
                });
                const answer = element('tr', '', 'decimal-addition-answer');
                const gutter = element('td', '', 'decimal-column-table__gutter');
                gutter.append(element('span', '=', 'decimal-column-table__sign'));
                answer.append(gutter);
                places.forEach(key => {
                    const cell = element('td');
                    cell.dataset.column = key;
                    if (key === 'point') cell.append(element('span', '.', 'decimal-table-digit'));
                    else addSlot(cell, `answer:${key}`, `Answer, ${key}`);
                    columns.push({ cell, key });
                    answer.append(cell);
                });
                body.append(answer);
                const chart = element('div', '', 'decimal-place-chart decimal-addition-chart decimal-build-chart');
                chart.append(table);
                host.append(chart);
                const tray = element('div', '', 'decimal-digit-keys');
                tray.setAttribute('role', 'group');
                tray.setAttribute('aria-label', 'Number cards');
                const cards = Array.from({ length: 10 }, (_, digit) => {
                    const card = element('button', String(digit), 'decimal-digit-key');
                    card.type = 'button';
                    card.setAttribute('aria-label', `Digit ${digit}`);
                    card.addEventListener('click', () => choose(String(digit)));
                    tray.append(card);
                    return card;
                });
                host.append(tray);
                function addSlot(cell, field, label) {
                    const slot = element('button', '', 'decimal-tap-slot');
                    slot.type = 'button';
                    slot.dataset.buildField = field;
                    slot.setAttribute('aria-label', label);
                    slot.addEventListener('click', () => {
                        if (!editable || field.startsWith('answer:') && !operandsReady(value?.digits)) return;
                        value ||= { digits: {}, active: null };
                        value.active = field;
                        save();
                    });
                    cell.replaceChildren(slot);
                    slots[field] = slot;
                }
                function paint() {
                    const active = value?.active, digits = value?.digits || {};
                    Object.entries(slots).forEach(([field, slot]) => {
                        slot.textContent = digits[field] ?? '';
                        slot.disabled = !editable || field.startsWith('answer:') && !operandsReady(digits);
                        slot.classList.toggle('is-filled', digits[field] !== undefined);
                        slot.classList.toggle('is-highlighted', editable && active === field);
                        slot.setAttribute('aria-pressed', String(editable && active === field));
                    });
                    columns.forEach(({ cell, key }) => cell.classList.toggle('is-active-column', editable && active?.split(':')[1] === key));
                    cards.forEach(card => { card.disabled = !editable || !active; });
                }
                function save() { onChange(value); paint(); }
                function choose(digit) {
                    if (!editable || !value?.active) return;
                    value.digits[value.active] = digit;
                    save();
                }
                host.addEventListener('keydown', event => {
                    if (/^[0-9]$/.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey) {
                        event.preventDefault(); choose(event.key);
                    } else if (['Backspace', 'Delete'].includes(event.key) && editable && value?.active) {
                        event.preventDefault(); delete value.digits[value.active]; save();
                    }
                });
                view = {
                    update(next) {
                        value = next.value ? JSON.parse(JSON.stringify(next.value)) : null;
                        editable = next.editable; phase = next.phase; paint();
                    },
                    focus() { slots[value?.active || `a:${keys[0]}`]?.focus(); }
                };
                return view;
            }
        };
    }

    D.buildProblem = buildProblem;
    D.createBuildWidget = buildWidget;
})();
