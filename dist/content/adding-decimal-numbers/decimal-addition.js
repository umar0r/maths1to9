(() => {
    'use strict';

    const practiceTypes = [
        'add-different-lengths', 'subtract-exchange', 'add-build',
        'subtract-card', 'money-in-out', 'change', 'money-card',
        'price-difference', 'missing-addend', 'missing-refund'
    ];
    const decimalText = cents => (cents / 100).toFixed(2).replace(/\.?0+$/, '');
    const oneDecimal = cents => (cents / 100).toFixed(1).replace(/\.0$/, '');
    const money = cents => `${cents < 0 ? '−' : ''}£${(Math.abs(cents) / 100).toFixed(2)}`;
    const option = (label, feedback, correct = false) => ({ label, feedback, correct });

    function prepare(question, random) {
        return question.options ? { ...question, options: window.Maths1to9LessonEngine.shuffle(question.options, random) } : question;
    }

    function pick(random) {
        return practiceTypes.map(type => ({ type, seed: window.Maths1to9LessonEngine.randomInt(0, 4294967295, random) }));
    }

    const placeNames = ['hundredths', 'tenths', 'units', 'tens', 'hundreds', 'thousands'];
    function answerPlaces(a, b, answer, forceTens = false) {
        const length = Math.max(forceTens ? 4 : 3, String(Math.max(a, b, answer)).length);
        return placeNames.slice(0, length);
    }

    function columnSteps(a, b, operator, tens = false) {
        let incoming = 0;
        return (Array.isArray(tens) ? tens : answerPlaces(a, b, operator === '+' ? a + b : a - b, tens)).map((key, index) => {
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

    function cardProblem(a, b, operator, currency = false, leftText = decimalText(a), rightText = decimalText(b), forceTens = false) {
        const answer = operator === '+' ? a + b : a - b;
        const keys = Array.isArray(forceTens) ? forceTens : answerPlaces(a, b, answer, forceTens);
        const tens = keys.includes('tens');
        const steps = columnSteps(a, b, operator, keys);
        const nextColumn = Object.fromEntries(placeNames.map((key, index) => [key, placeNames[index + 1]]));
        return {
            a: leftText, b: rightText, operator, tens, keys,
            answerDigits: Object.fromEntries(steps.map(step => [step.key, String(step.digit)])),
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

    function sumChoice(type, prompt, terms, mistakes, currency, text = currency ? money : decimalText) {
        const label = parts => parts.map((part, index) => typeof part === 'number' ? text(part, index, parts) : part).join(' ');
        const evaluate = parts => {
            let result = parts[0];
            for (let index = 1; index < parts.length; index += 2) {
                result += (parts[index] === '+' ? 1 : -1) * parts[index + 1];
            }
            return result;
        };
        return {
            questionType: type, input: 'choice', prompt,
            options: [
                { ...option(label(terms), 'Right. Use this calculation in the table.', true), value: evaluate(terms) },
                ...mistakes.map(([parts, feedback]) => ({ ...option(label(parts), feedback), value: evaluate(parts) }))
            ]
        };
    }

    function workedQuestion(type, prompt, calculations, selection = null, currency = false, figure) {
        const tables = calculations.map(([a, b, operator], index) => {
            const result = operator === '+' ? a + b : a - b;
            const text = currency ? value => (value / 100).toFixed(2) : decimalText;
            const problem = cardProblem(a, b, operator, currency, text(a), text(b));
            if (index) {
                const [left, right, sign] = calculations[index - 1];
                problem.previous = { a: text(left), b: text(right), operator: sign, answer: text(a) };
                // Use one width throughout the growing table.
                problem.keys = answerPlaces(left, right, Math.max(a, b, result));
                problem.tens = problem.keys.includes('tens');
                const originalMark = cardProblem(a, b, operator, currency, text(a), text(b), problem.keys);
                problem.mark = originalMark.mark;
            }
            const widget = window.DecimalAddition.createCardWidget(problem);
            return {
                questionType: type, input: 'custom', prompt, widget, cardProblem: problem,
                answer: decimalText(result), figure,
                onReset: () => widget.reset(), onReplayReset: () => widget.reset(),
                onReplayFeedback: outcome => widget.replayFeedback(outcome)
            };
        });
        if (tables.length > 1) {
            const text = currency ? money : decimalText;
            tables.at(-1).cardProblem.feedback = calculations.map(([a, b, operator]) =>
                `${text(a)} ${operator} ${text(b)} = ${text(operator === '+' ? a + b : a - b)}`).join(', then ') + '.';
        }
        const stages = [...(selection ? [selection] : []), ...tables];
        return { ...tables.at(-1), stages, selection };
    }

    function uniqueAnswers(question) {
        return (question.stages || [question]).every(stage => !stage.options ||
            new Set(stage.options.map(item => item.value ?? item.label)).size === stage.options.length);
    }

    function stageCount(type) {
        if (type === 'money-in-out') return 2;
        if (type === 'missing-addend') return 3;
        return ['change', 'price-difference', 'missing-refund'].includes(type) ? 2 : 1;
    }

    function pickSteps(random) {
        return pick(random).flatMap((problem, parent) => Array.from({ length: stageCount(problem.type) }, (_, step) => ({
            type: problem.type, seed: window.Maths1to9LessonEngine.randomInt(0, 4294967295, random),
            problemSeed: problem.seed, parent, step
        })));
    }

    function selectedCalculation(host, selection) {
        const group = document.createElement('div');
        group.className = 'decimal-selected-calculation';
        group.setAttribute('role', 'group');
        group.setAttribute('aria-label', 'Chosen calculation');
        selection.options.forEach(choice => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `button${choice.correct ? ' is-correct' : ''}`;
            button.disabled = true;
            button.setAttribute('aria-pressed', String(choice.correct));
            button.textContent = choice.label;
            group.append(button);
        });
        host.append(group);
    }

    function generateStep(item) {
        const random = window.Maths1to9LessonEngine.seededRandom(item.problemSeed);
        const problem = generate(item, random);
        const stage = (problem.stages || [problem])[item.step];
        const figure = stage.figure || problem.figure;
        return { ...stage, figure(host) {
            host.classList.add('decimal-practice-context');
            host.dataset.kind = item.type;
            host.dataset.step = String(item.step);
            host.dataset.problem = String(item.parent + 1);
            window.Maths1to9Lesson.setSectionPosition('question-bank', `Question ${item.parent + 1} of 10`);
            figure?.(host);
            if (problem.selection && stage.input !== 'choice') selectedCalculation(host, problem.selection);
        } };
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

    // Check 1: Sam's working as a pupil writes it on paper, every character
    // in a cell of its own, so the last digits line up and the points do not.
    function drawSamWorking(host) {
        const figure = document.createElement('figure');
        figure.className = 'decimal-sam-working';
        const working = document.createElement('div');
        working.className = 'decimal-sam-working__grid';
        working.setAttribute('role', 'img');
        working.setAttribute('aria-label', 'Sam wrote 5.8 and 0.34 with their last digits lined up, and answered 0.92.');
        function row(sign, cells) {
            const signCell = document.createElement('span');
            signCell.className = 'decimal-sam-working__sign';
            signCell.textContent = sign;
            working.append(signCell);
            for (const text of cells) {
                const cell = document.createElement('span');
                cell.textContent = text;
                working.append(cell);
            }
        }
        row('', ['', '5', '.', '8']);
        row('+', ['0', '.', '3', '4']);
        const line = document.createElement('span');
        line.className = 'decimal-sam-working__line';
        working.append(line);
        row('', ['0', '.', '9', '2']);
        const caption = document.createElement('figcaption');
        caption.textContent = "Sam's working";
        figure.append(caption, working);
        host.append(figure);
    }

    // Check 3: the lesson's own column table, read-only, with the tenths
    // lit as the column being worked on.
    function drawCarryTable(host) {
        const chart = document.createElement('div');
        chart.className = 'decimal-place-chart decimal-check-table';
        const columns = ['units', 'point', 'tenths', 'hundredths'];
        const built = window.Maths1to9DigitCards.columnTable({
            label: '7.60 plus 0.48 in place-value columns',
            className: 'decimal-column-table',
            columns: columns.map(id => ({ id, label: id === 'point' ? 'point' : id, ariaLabel: id === 'point' ? 'decimal point' : id })),
            rows: [
                { id: 'a', values: { units: '7', point: '.', tenths: '6', hundredths: '0' } },
                { id: 'b', sign: '+', values: { units: '0', point: '.', tenths: '4', hundredths: '8' } },
                { id: 'answer', sign: '=', answer: true, values: { units: '', point: '.', tenths: '', hundredths: '8' } }
            ]
        });
        chart.append(built.table);
        host.append(chart);
        built.update({ activeColumn: 'tenths' });
    }

    // Check 4: a small receipt in Try it's art style, with no total line.
    function drawCheckReceipt(host) {
        const receipt = document.createElement('div');
        receipt.className = 'decimal-check-receipt';
        const edge = 'M15 9H270L291 30V168Q284.25 176 277.5 168T264 168T250.5 168T237 168T223.5 168T210 168T196.5 168T183 168T169.5 168T156 168T142.5 168T129 168T115.5 168T102 168T88.5 168T75 168T61.5 168T48 168T34.5 168T21 168Q15 160 9 168V15Q9 9 15 9Z';
        receipt.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 184" fill="var(--text)" font-family="inherit" role="img" aria-label="Receipt: Sandwich £2.40, Drink £1.35, Voucher minus £0.50.">
            <defs><clipPath id="decimal-check-receipt-clip"><path d="${edge}"/></clipPath></defs>
            <path d="${edge}" fill="#f8fafc"/>
            <g clip-path="url(#decimal-check-receipt-clip)"><rect x="9" y="9" width="282" height="38" fill="color-mix(in srgb, var(--primary) 25%, #fff)"/>
                <text x="24" y="36" font-size="21" font-weight="800">Receipt</text></g>
            <path d="M270 9V30H291Z" fill="var(--primary-dark)"/>
            <text x="24" y="78" font-size="18">Sandwich</text><text x="276" y="78" text-anchor="end" font-size="18">£2.40</text>
            <text x="24" y="108" font-size="18">Drink</text><text x="276" y="108" text-anchor="end" font-size="18">£1.35</text>
            <text x="24" y="138" font-size="18">Voucher</text><text x="276" y="138" text-anchor="end" font-size="18">−£0.50</text>
            <path d="${edge}" fill="none" stroke="var(--primary)" stroke-width="2" vector-effect="non-scaling-stroke"/>
        </svg>`;
        host.append(receipt);
    }

    function generate(item, random) {
        const integer = (min, max) => window.Maths1to9LessonEngine.randomInt(min, max, random);
        const nonZeroEnd = value => value % 10 === 0 ? value + 1 : value;
        const twoPlaces = () => nonZeroEnd(integer(11, 999));
        const onePlace = () => nonZeroEnd(integer(11, 399)) * 10;
        const price = () => integer(50, 999);
        for (let attempt = 0; attempt < 500; attempt++) {
            let question;
            if (item.type === 'add-different-lengths') {
                const a = onePlace(), b = twoPlaces();
                if (b % 10 === 0) continue;
                question = cardQuestion(item.type, a, b, '+', false, oneDecimal(a), decimalText(b));
            } else if (item.type === 'subtract-exchange' || item.type === 'add-build') {
                const a = onePlace(), b = twoPlaces();
                if (item.type === 'subtract-exchange' && (a <= b || b % 10 === 0) || item.type === 'add-build' && a < 1000) continue;
                const operator = item.type === 'subtract-exchange' ? '−' : '+';
                const problem = window.DecimalAddition.buildProblem(oneDecimal(a), decimalText(b), operator);
                const widget = window.DecimalAddition.createBuildWidget(problem);
                question = {
                    questionType: item.type, input: 'custom', prompt: `Work out ${oneDecimal(a)} ${operator} ${decimalText(b)}.`,
                    answer: decimalText(problem.answer), values: { a, b }, buildProblem: problem, widget,
                    onReset: () => widget.reset(), onReplayReset: () => widget.reset(), onReplayFeedback: result => widget.replayFeedback(result)
                };
            } else if (item.type === 'subtract-card') {
                const a = twoPlaces(), b = twoPlaces();
                if (Math.floor(a / 100) <= Math.floor(b / 100) || Math.floor(a / 10) % 10 >= Math.floor(b / 10) % 10 || a % 10 < b % 10) continue;
                question = cardQuestion(item.type, a, b, '−', false, decimalText(a), decimalText(b));
            } else if (item.type === 'money-in-out') {
                const balance = integer(10000, 99999), payment = integer(2000, 19999), refund = integer(500, 4999);
                if (balance <= payment) continue;
                const subtotal = balance - payment;
                const prompt = `A bank account has ${money(balance)}. A payment of ${money(payment)} goes out, then a refund of ${money(refund)} comes in. How much is in the account now?`;
                question = workedQuestion(item.type, prompt, [[balance, payment, '−'], [subtotal, refund, '+']], null, true);
                question.values = { balance, payment, refund };
            } else if (item.type === 'change') {
                const cost = price();
                const notes = [500, 1000, 2000].filter(note => note > cost);
                const paid = notes[integer(0, notes.length - 1)];
                const note = `£${paid / 100}`;
                const prompt = `You pay for a ${money(cost)} magazine with a ${note} note. How much change do you get?`;
                const selection = sumChoice(item.type, prompt, [paid, '−', cost], [
                    [[cost, '−', paid], `Take the price away from the ${note}, not the other way round.`],
                    [[paid, '+', cost], "Change is what's left, so take away."],
                    [[paid, '−', cost * 10], `The price is ${money(cost)}, not ${money(cost * 10)}.`]
                ], true, (value, index, parts) => value === paid && (index === 0 || parts[0] === cost) ? note : money(value));
                question = workedQuestion(item.type, prompt, [[paid, cost, '−']], selection, true);
                question.values = { cost, paid };
            } else if (item.type === 'money-card') {
                const a = price(), b = price();
                if (!columnSteps(a, b, '+', a + b >= 1000).some(step => step.outgoing)) continue;
                question = cardQuestion(item.type, a, b, '+', true, decimalText(a), decimalText(b));
            } else if (item.type === 'price-difference') {
                const northSmall = integer(50, 899), northLarge = integer(northSmall + 1, 999);
                const southSmall = integer(50, 899), southLarge = integer(southSmall + 1, 999);
                const prices = { northSmall, northLarge, southSmall, southLarge };
                const prompt = 'How much more is a large parcel than a small parcel at North?';
                const selection = sumChoice(item.type, prompt, [northLarge, '−', northSmall], [
                    [[northSmall, '−', northLarge], 'Take the small price away from the large price, not the other way round.'],
                    [[southLarge, '−', southSmall], 'That uses South. The question asks for North.'],
                    [[northLarge, '+', northSmall], 'Find how much more, so take the small price away from the large price.']
                ], true);
                const figure = host => drawPrices(host, prices);
                selection.figure = figure;
                question = workedQuestion(item.type, prompt, [[northLarge, northSmall, '−']], selection, true, figure);
                question.values = prices;
            } else if (item.type === 'missing-addend') {
                const a = twoPlaces(), b = onePlace();
                const total = integer(Math.ceil((a + b) / 100) + 1, Math.ceil((a + b) / 100) + 9) * 100;
                const answer = total - a - b;
                if (answer < 11 || answer > 999) continue;
                const prompt = `${decimalText(a)} + ${oneDecimal(b)} + □ = ${decimalText(total)}. What is the missing number?`;
                const selection = sumChoice(item.type, prompt, [total, '−', a, '−', b], [
                    [[total, '−', a], `You also need to take away ${oneDecimal(b)}.`],
                    [[total, '−', b], `You also need to take away ${decimalText(a)}.`],
                    [[total, '+', a, '+', b], `Take the two known numbers away from ${decimalText(total)}, rather than adding them.`]
                ], false);
                question = workedQuestion(item.type, prompt, [[total, a, '−'], [total - a, b, '−']], selection);
                question.values = { a, b, total };
            } else if (item.type === 'missing-refund') {
                const balance = integer(1000, 9999), refund = integer(500, 4999);
                const after = balance + refund;
                const prompt = `A balance is ${money(balance)}. One refund comes in and the balance becomes ${money(after)}. How much was the refund?`;
                const selection = sumChoice(item.type, prompt, [after, '−', balance], [
                    [[balance, '−', after], 'Take the old balance away from the new balance, not the other way round.'],
                    [[after, '+', balance], 'Find how much was added, so take the old balance away from the new balance.'],
                    [[after, '−', Math.round(balance / 10)], `The old balance is ${money(balance)}, not ${money(Math.round(balance / 10))}.`]
                ], true);
                question = workedQuestion(item.type, prompt, [[after, balance, '−']], selection, true);
                question.values = { balance, refund, after };
            } else throw new TypeError(`Unknown decimal question kind: ${item.type}`);
            if (uniqueAnswers(question)) {
                if (question.stages) {
                    question.stages = question.stages.map(stage => prepare(stage, random));
                    question.selection = question.stages.find(stage => stage.input === 'choice') || null;
                    return question;
                }
                return prepare(question, random);
            }
        }
        throw new Error(`Could not make distinct answers for ${item.type}.`);
    }

    function checks() {
        return [
            {
                questionType: 'line-up-points', input: 'choice',
                prompt: 'Sam works out 5.8 + 0.34 like this. What has Sam done wrong?',
                figure: drawSamWorking,
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
                questionType: 'carry-one', input: 'choice', prompt: 'The tenths make 6 + 4 = 10. What do you write?',
                figure: drawCarryTable,
                options: [
                    option('Write 0 in the tenths and add 1 to the units.', 'Right. 10 tenths make 1 unit.', true),
                    option('Write 10 in the tenths.', 'Each column holds one digit. 10 tenths make 1 unit.'),
                    option('Write 1 in the tenths and add 0 to the units.', 'The other way round: write the 0 and add the 1 to the units.'),
                    option('Write 0 and forget the 1.', 'Then the answer is 1 too small.')
                ]
            },
            {
                questionType: 'receipt-operations', input: 'choice',
                prompt: 'Which working gives the total to pay?',
                figure: drawCheckReceipt,
                options: [
                    option('2.40 + 1.35 − 0.50', 'Right. Add the items, then take off the voucher.', true),
                    option('2.40 + 1.35 + 0.50', 'The voucher comes off, so take it away.'),
                    option('2.40 − 1.35 − 0.50', 'The drink is bought, so add it.'),
                    option('2.40 + 1.35', "Don't forget to take off the voucher.")
                ]
            }
        ];
    }

    window.DecimalAddition = { decimalText, money, oneDecimal, columnSteps, cardProblem, practiceTypes, pick, pickSteps, generate, generateStep, prepare, checks };
})();
