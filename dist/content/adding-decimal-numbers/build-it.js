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
                const keys = [...problem.keys].reverse();
                const places = [...keys];
                places.splice(places.length - 2, 0, 'point');
                const rows = [...problem.operands.map((operand, index) => ({
                    id: operand.id, sign: index === 1 ? problem.operator : '',
                    values: Object.fromEntries(places.map(key => [key, key === 'point' ? '.' : {
                        slot: `${operand.id}:${key}`, label: `${index === 0 ? 'First' : 'Second'} number, ${key}`
                    }]))
                })), {
                    id: 'answer', sign: '=', answer: true,
                    values: Object.fromEntries(places.map(key => [key, key === 'point' ? '.' : {
                        slot: `answer:${key}`, label: `Answer, ${key}`, allowed: value => operandsReady(value?.digits)
                    }]))
                }];
                const built = window.Maths1to9DigitCards.columnTable({
                    label: `${problem.a} ${problem.operator} ${problem.b} in place-value columns`,
                    className: `decimal-column-table${problem.tens ? ' decimal-column-table--tens digit-column-table--tens' : ''}`,
                    columns: places.map(id => ({ id, label: id === 'point' ? 'decimal point' : id })), rows
                });
                const chart = element('div', '', 'decimal-place-chart decimal-addition-chart decimal-build-chart digit-card-chart');
                chart.append(built.table);
                host.append(chart);
                view = window.Maths1to9DigitCards.create(host, {
                    slots: built.slots, groups: { answer: { advance: 'left' } }, onChange,
                    onPaint({ active, editable }) { built.update({ activeColumn: editable ? active?.split(':')[1] : null }); }
                });
                return view;
            }
        };
    }

    D.buildProblem = buildProblem;
    D.createBuildWidget = buildWidget;
})();
