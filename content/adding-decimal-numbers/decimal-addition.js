(() => {
    'use strict';

    const practiceTypes = [
        'add-different-lengths', 'subtract-exchange', 'add-then-subtract',
        'subtract-card', 'money-in-out', 'change', 'money-card',
        'price-difference', 'missing-addend', 'missing-refund'
    ];
    const decimalText = cents => `${cents < 0 ? '-' : ''}${Math.floor(Math.abs(cents) / 100)}.${String(Math.abs(cents) % 100).padStart(2, '0')}`;
    const oneDecimal = cents => (cents / 100).toFixed(1);
    const money = cents => `${cents < 0 ? '−' : ''}£${decimalText(Math.abs(cents))}`;
    const option = (label, feedback, correct = false) => ({ label, feedback, correct });

    function prepare(question, random) {
        return question.options ? { ...question, options: window.Maths1to9LessonEngine.shuffle(question.options, random) } : question;
    }

    function pick(random) {
        return practiceTypes.map(type => ({ type, seed: window.Maths1to9LessonEngine.randomInt(0, 4294967295, random) }));
    }

    function columnSteps(a, b, operator, tens = false) {
        let incoming = 0;
        return ['hundredths', 'tenths', 'units', ...(tens ? ['tens'] : [])].map((key, index) => {
            const left = Math.floor(a / 10 ** index) % 10;
            const right = Math.floor(b / 10 ** index) % 10;
            if (operator === '+') {
                const total = left + right + incoming;
                const step = { key, left, right, incoming, total, digit: total % 10, outgoing: Math.floor(total / 10) };
                incoming = step.outgoing;
                return step;
            }
            const reduced = left - incoming;
            const outgoing = Number(reduced < right);
            const available = reduced + 10 * outgoing;
            const step = { key, left, right, incoming, outgoing, available, digit: available - right };
            incoming = outgoing;
            return step;
        });
    }

    function cardProblem(a, b, operator, currency = false, leftText = decimalText(a), rightText = decimalText(b)) {
        const answer = operator === '+' ? a + b : a - b;
        const tens = answer >= 1000;
        const steps = columnSteps(a, b, operator, tens);
        const nextColumn = { hundredths: 'tenths', tenths: 'units', units: 'tens' };
        return {
            a: leftText, b: rightText, operator, tens,
            showCarry: () => false,
            feedback: `${currency ? money(a) : leftText} ${operator} ${currency ? money(b) : rightText} = ${currency ? money(answer) : decimalText(answer)}.`,
            mark(value) {
                const wrong = steps.find(step => value?.[step.key] !== String(step.digit));
                if (!wrong) return '';
                if (operator === '+') {
                    const sum = `${wrong.left} + ${wrong.right}${wrong.incoming ? ' + the carried 1' : ''}`;
                    return `Check the ${wrong.key}: ${sum} = ${wrong.total}.${wrong.outgoing ? ` Write ${wrong.digit} and carry 1.` : ''}`;
                }
                if (wrong.outgoing) {
                    return `Check the ${wrong.key}: you can't take ${wrong.right} from ${wrong.left - wrong.incoming}, so take 1 from the ${nextColumn[wrong.key]}. ${wrong.available} − ${wrong.right} = ${wrong.digit}.`;
                }
                return `Check the ${wrong.key}: ${wrong.left}${wrong.incoming ? ' − 1' : ''} − ${wrong.right} = ${wrong.digit}.`;
            }
        };
    }

    function cardQuestion(type, a, b, operator, currency, leftText, rightText) {
        const answer = operator === '+' ? a + b : a - b;
        const problem = cardProblem(a, b, operator, currency, leftText, rightText);
        const widget = window.DecimalAddition.createCardWidget(problem);
        return {
            questionType: type, input: 'custom',
            prompt: `Work out ${currency ? money(a) : leftText} ${operator} ${currency ? money(b) : rightText}.`,
            answer: decimalText(answer), widget,
            onReset: () => widget.reset(),
            onReplayReset: () => widget.reset(),
            onReplayFeedback: result => widget.replayFeedback(result),
            values: { a, b, operator }, cardProblem: problem
        };
    }

    function choiceQuestion(type, prompt, answer, errors, currency = false, figure) {
        const label = currency ? money : decimalText;
        return {
            questionType: type, input: 'choice', prompt, answer: decimalText(answer), figure,
            options: [option(label(answer), '', true), ...errors.map(error => option(label(error.value), error.feedback))]
        };
    }

    function numberQuestion(type, prompt, answer, errors, feedback, fallback) {
        return {
            questionType: type, input: 'number', prompt, answer: decimalText(answer), feedback,
            rules: errors.map(error => ({ value: decimalText(error.value), feedback: error.feedback })),
            fallback
        };
    }

    function smallerFromLarger(a, b) {
        let answer = 0;
        for (let place = 1; place <= Math.max(a, b); place *= 10) {
            answer += Math.abs(Math.floor(a / place) % 10 - Math.floor(b / place) % 10) * place;
        }
        return answer;
    }

    function uniqueAnswers(question) {
        const values = question.options ? question.options.map(item => Number(item.label.replace(/[£]/g, '').replace('−', '-')))
            : [Number(question.answer), ...(question.rules || []).map(rule => Number(rule.value))];
        return new Set(values).size === values.length;
    }

    function drawPrices(host, prices) {
        const table = document.createElement('table');
        table.className = 'decimal-price-list';
        const caption = document.createElement('caption');
        caption.textContent = 'A price list';
        table.append(caption);
        const head = document.createElement('thead');
        const headings = document.createElement('tr');
        for (const title of ['Depot', 'Small parcel', 'Large parcel']) {
            const cell = document.createElement('th');
            cell.scope = 'col';
            cell.textContent = title;
            headings.append(cell);
        }
        head.append(headings);
        const body = document.createElement('tbody');
        for (const [name, small, large] of [['North', prices.northSmall, prices.northLarge], ['South', prices.southSmall, prices.southLarge]]) {
            const row = document.createElement('tr');
            const label = document.createElement('th');
            label.scope = 'row';
            label.textContent = name;
            row.append(label);
            for (const value of [small, large]) {
                const cell = document.createElement('td');
                cell.textContent = money(value);
                row.append(cell);
            }
            body.append(row);
        }
        table.append(head, body);
        host.append(table);
    }

    function generate(item, random) {
        const integer = (min, max) => window.Maths1to9LessonEngine.randomInt(min, max, random);
        const twoPlaces = () => integer(11, 999);
        const onePlace = () => integer(11, 399) * 10;
        const price = () => integer(50, 999);
        for (let attempt = 0; attempt < 500; attempt++) {
            let question;
            if (item.type === 'add-different-lengths') {
                const a = onePlace(), b = twoPlaces();
                if (b % 10 === 0) continue;
                question = cardQuestion(item.type, a, b, '+', false, oneDecimal(a), decimalText(b));
            } else if (item.type === 'subtract-exchange') {
                const a = onePlace(), b = twoPlaces();
                if (a <= b || b % 10 === 0) continue;
                const answer = a - b;
                question = choiceQuestion(item.type, `Work out ${oneDecimal(a)} − ${decimalText(b)}.`, answer, [
                    { value: smallerFromLarger(a, b), feedback: "Don't take the smaller digit from the larger in each column. If the top digit is too small, take 1 from the column on its left." },
                    { value: a + b, feedback: 'You added. This question asks you to take away.' },
                    { value: answer + 10, feedback: 'Taking 1 tenth gives 10 hundredths. Remember to take that 1 off the tenths.' }
                ]);
                question.options[0].feedback = `${oneDecimal(a)} − ${decimalText(b)} = ${decimalText(answer)}.`;
                question.values = { a, b };
            } else if (item.type === 'add-then-subtract') {
                const a = onePlace(), b = twoPlaces(), c = onePlace();
                if (a + b <= c) continue;
                question = numberQuestion(item.type, `Work out ${oneDecimal(a)} + ${decimalText(b)} − ${oneDecimal(c)}.`, a + b - c, [
                    { value: a + b + c, feedback: `You added ${oneDecimal(c)} instead of taking it away.` },
                    { value: a - b - c, feedback: `You took away both numbers. Add ${decimalText(b)}.` },
                    { value: a + b - c / 10, feedback: `Write ${oneDecimal(c)} as ${decimalText(c)}, not ${decimalText(c / 10)}.` }
                ], `${oneDecimal(a)} + ${decimalText(b)} = ${decimalText(a + b)}. Then ${decimalText(a + b)} − ${oneDecimal(c)} = ${decimalText(a + b - c)}.`, 'Add the first two numbers, then take away the third.');
                question.values = { a, b, c };
            } else if (item.type === 'subtract-card') {
                const a = twoPlaces(), b = twoPlaces();
                if (Math.floor(a / 100) <= Math.floor(b / 100) || Math.floor(a / 10) % 10 >= Math.floor(b / 10) % 10 || a % 10 < b % 10) continue;
                question = cardQuestion(item.type, a, b, '−', false, decimalText(a), decimalText(b));
            } else if (item.type === 'money-in-out') {
                const balance = integer(10000, 99999), payment = integer(2000, 19999), refund = integer(500, 4999);
                if (balance <= payment) continue;
                const answer = balance - payment + refund;
                question = choiceQuestion(item.type, `A bank account has ${money(balance)}. A payment of ${money(payment)} goes out, then a refund of ${money(refund)} comes in. How much is in the account now?`, answer, [
                    { value: balance - payment, feedback: 'This stops before the refund. Add the refund to the balance.' },
                    { value: balance + payment + refund, feedback: 'The payment goes out, so take it away.' },
                    { value: balance - payment - refund, feedback: 'The refund comes in, so add it.' }
                ], true);
                question.options[0].feedback = `${money(balance)} − ${money(payment)} + ${money(refund)} = ${money(answer)}.`;
                question.values = { balance, payment, refund };
            } else if (item.type === 'change') {
                const cost = price();
                const notes = [500, 1000, 2000].filter(note => note > cost);
                const paid = notes[integer(0, notes.length - 1)];
                question = numberQuestion(item.type, `You pay for a ${money(cost)} magazine with a ${money(paid).replace('.00', '')} note. How much change do you get? Leave out the £ sign.`, paid - cost, [
                    { value: smallerFromLarger(paid, cost), feedback: 'If the top digit is too small, take 1 from the column on its left.' },
                    { value: paid + cost, feedback: 'Take the price away from the note. Do not add them.' }
                ], `${money(paid)} − ${money(cost)} = ${money(paid - cost)}.`, 'Take the price away from the note.');
                question.values = { cost, paid };
            } else if (item.type === 'money-card') {
                const a = price(), b = price();
                if (!columnSteps(a, b, '+', a + b >= 1000).some(step => step.outgoing)) continue;
                question = cardQuestion(item.type, a, b, '+', true, decimalText(a), decimalText(b));
            } else if (item.type === 'price-difference') {
                const northSmall = integer(50, 899), northLarge = integer(northSmall + 1, 999);
                const southSmall = integer(50, 899), southLarge = integer(southSmall + 1, 999);
                const prices = { northSmall, northLarge, southSmall, southLarge };
                const answer = northLarge - northSmall;
                question = choiceQuestion(item.type, 'How much more is a large parcel than a small parcel at North?', answer, [
                    { value: southLarge - southSmall, feedback: 'That uses South. The question asks for North.' },
                    { value: northLarge + northSmall, feedback: 'Find how much more, so take the small price away from the large price.' },
                    { value: answer * 10, feedback: 'That answer is ten times too big. Line up the decimal points.' }
                ], true, host => drawPrices(host, prices));
                question.options[0].feedback = `${money(northLarge)} − ${money(northSmall)} = ${money(answer)}.`;
                question.values = prices;
            } else if (item.type === 'missing-addend') {
                const a = twoPlaces(), b = onePlace();
                const total = integer(Math.ceil((a + b) / 100) + 1, Math.ceil((a + b) / 100) + 9) * 100;
                const answer = total - a - b;
                if (answer < 11 || answer > 999) continue;
                const totalText = String(total / 100);
                question = numberQuestion(item.type, `${decimalText(a)} + ${oneDecimal(b)} + □ = ${totalText}. What is the missing number?`, answer, [
                    { value: total - a, feedback: `You also need to take away ${oneDecimal(b)}.` },
                    { value: total - b, feedback: `You also need to take away ${decimalText(a)}.` },
                    { value: a + b, feedback: 'That is the total of the two numbers you know. Find how much is still needed.' },
                    { value: total + a + b, feedback: `Take the two known numbers away from ${totalText}, rather than adding them.` }
                ], `${decimalText(a)} + ${oneDecimal(b)} = ${decimalText(a + b)}. Then ${totalText} − ${decimalText(a + b)} = ${decimalText(answer)}.`, 'Add the two known numbers, then take their total away from the number on the right.');
                question.values = { a, b, total };
            } else if (item.type === 'missing-refund') {
                const balance = integer(1000, 9999), refund = integer(500, 4999);
                const after = balance + refund;
                question = numberQuestion(item.type, `A balance is ${money(balance)}. One refund comes in and the balance becomes ${money(after)}. How much was the refund? Leave out the £ sign.`, refund, [
                    { value: balance + after, feedback: 'Take the old balance away from the new balance. Do not add them.' },
                    { value: refund * 10, feedback: 'That answer is ten times too big. Line up the decimal points.' },
                    { value: -refund, feedback: 'The balance goes up. The refund is a positive amount.' }
                ], `${money(after)} − ${money(balance)} = ${money(refund)}.`, 'Take the old balance away from the new balance.');
                question.values = { balance, refund, after };
            } else throw new TypeError(`Unknown decimal question kind: ${item.type}`);
            if (uniqueAnswers(question)) return prepare(question, random);
        }
        throw new Error(`Could not make distinct answers for ${item.type}.`);
    }

    function checks() {
        return [
            {
                questionType: 'line-up-points', input: 'choice',
                prompt: 'Sam works out 5.8 + 0.34 by lining up the last digits. What has Sam done wrong?',
                options: [
                    option("The 8 is tenths and the 4 is hundredths, so they don't belong in the same column.", 'Right. Line up the decimal points instead.', true),
                    option('The 8 and the 4 are both units.', "The 8 is 8 tenths and the 4 is 4 hundredths. They're worth different amounts."),
                    option('Nothing. You always line up the last digits.', 'That only works when both numbers have the same number of decimal places.'),
                    option('Sam should have lined up the first digits.', 'First digits can be worth different amounts too. Line up the decimal points.')
                ]
            },
            {
                questionType: 'zeros-fill-gaps', input: 'choice', prompt: 'Why can you write 7.6 as 7.60?',
                options: [
                    option("7.6 has no hundredths, so a 0 there doesn't change it.", 'Right.', true),
                    option('A zero is worth nothing anywhere in a number.', 'Not true: 7.06 is a different number from 7.6.'),
                    option("You can't: 7.60 is a bigger number.", '7.60 is the same size: 7 units and 6 tenths.'),
                    option('Every decimal must have two digits after the point.', 'No. The zero just helps the columns line up.')
                ]
            },
            {
                questionType: 'carry-one', input: 'choice', prompt: 'In 7.60 + 0.48 the tenths make 6 + 4 = 10. What do you do?',
                options: [
                    option('Write 0 in the tenths and add 1 to the units.', 'Right. 10 tenths make 1 unit.', true),
                    option('Write 10 in the tenths.', 'Each column holds one digit. 10 tenths make 1 unit.'),
                    option('Write 1 in the tenths and add 0 to the units.', 'The other way round: write the 0 and add the 1 to the units.'),
                    option('Write 0 and forget the 1.', 'Then the answer is 1 too small.')
                ]
            },
            {
                questionType: 'receipt-operations', input: 'choice',
                prompt: 'A receipt has a sandwich for £2.40, a drink for £1.35 and a voucher for £0.50 off. Which working gives the total?',
                options: [
                    option('2.40 + 1.35 − 0.50', 'Right. Add the items, then take off the voucher.', true),
                    option('2.40 + 1.35 + 0.50', 'The voucher comes off, so take it away.'),
                    option('2.40 − 1.35 − 0.50', 'The drink is bought, so add it.'),
                    option('2.40 + 1.35', "Don't forget to take off the voucher.")
                ]
            }
        ];
    }

    window.DecimalAddition = { decimalText, money, oneDecimal, columnSteps, cardProblem, practiceTypes, pick, generate, prepare, checks };
})();
