(() => {
    'use strict';

    const signed = number => String(number).replace('-', '−');
    const equation = (start, amount) => `${signed(start)} − (−${amount})`;
    const working = (start, amount) => `${equation(start, amount)} = ${signed(start)} + ${amount} = ${signed(start + amount)}.`;
    const option = (label, feedback, correct = false) => ({ label, feedback, correct });

    function rewrite(start, amount) {
        return {
            start, amount, questionType: 'rewrite', input: 'choice',
            prompt: `Which calculation means the same as ${equation(start, amount)}?`,
            options: [
                option(`${signed(start)} + ${amount}`, 'Keep the starting number. Subtracting a negative becomes addition.', true),
                option(`${signed(start)} − ${amount}`, `That keeps the subtraction. Subtracting a negative means adding: ${signed(start)} + ${amount}.`),
                option(`${signed(-start)} + ${amount}`, `That changes the starting number. Keep ${signed(start)} and write ${signed(start)} + ${amount}.`),
                option(`${signed(-start)} − ${amount}`, `That changes the starting number and keeps subtraction. Write ${signed(start)} + ${amount}.`)
            ]
        };
    }

    function calculate(start, amount) {
        const answer = start + amount;
        const mistakes = [
            { value: signed(start - amount), feedback: 'You subtracted instead of adding the positive number.' },
            { value: signed(-start + amount), feedback: 'You changed the sign of the starting number. Keep it unchanged.' },
            { value: signed(-answer), feedback: 'Check the sign of your answer. Count right from the starting number.' }
        ].filter((rule, index, rules) => Number(rule.value.replace('−', '-')) !== answer && rules.findIndex(other => other.value === rule.value) === index);
        return {
            start, amount, questionType: 'calculate', input: 'number',
            prompt: `Work out ${equation(start, amount)}.`, answer: signed(answer),
            feedback: working(start, amount), rules: mistakes,
            fallback: `Keep ${signed(start)} and add ${amount}. Count ${amount} spaces to the right.`
        };
    }

    // Practice sums that aren't taking away a negative. Each lists its real
    // mistakes; rules that land on the answer are dropped.
    function typedSum(start, amount, prompt, feedback, mistakes, fallback) {
        const answer = signed(start + amount);
        const seen = new Set([answer]);
        const rules = mistakes.map(([value, text]) => ({ value: signed(value), feedback: text })).filter(rule => {
            if (seen.has(rule.value)) return false;
            seen.add(rule.value);
            return true;
        });
        return { start, amount, questionType: 'calculate', input: 'number', prompt, answer, feedback, rules, fallback };
    }

    function takePositive(start, amount) {
        const answer = start - amount;
        return typedSum(start, -amount, `Work out ${signed(start)} − ${amount}.`,
            `${signed(start)} − ${amount} = ${signed(answer)}. Taking away moves you left.`,
            [[-answer, 'Check the sign of your answer. You move left, so where do you land?'],
                [start + amount, 'That adds them. Taking away moves you left.']],
            `Start at ${signed(start)} and count ${amount} places left.`);
    }

    function addNegative(start, amount) {
        const answer = start - amount;
        return typedSum(start, -amount, `Work out ${signed(start)} + (−${amount}).`,
            `${signed(start)} + (−${amount}) = ${signed(start)} − ${amount} = ${signed(answer)}.`,
            [[start + amount, 'Adding a negative is the same as taking away, so move left.'],
                [-answer, 'Check the sign of your answer. You move left, so where do you land?']],
            `Adding a negative is the same as taking away. Count ${amount} places left from ${signed(start)}.`);
    }

    const signReason = same => `The signs are ${same ? 'the same, so the answer is positive' : 'different, so the answer is negative'}.`;

    // Multiplying sums. `signs` are the row and column to find on the sign table.
    // Exam-style questions. Temperatures give the same sums a real setting.
    function temperatureRise(start, amount) {
        const answer = start + amount;
        return typedSum(start, amount,
            `It is ${signed(start)}°C. The temperature goes up by ${amount}°C. What is the temperature now, in °C?`,
            `${signed(start)} + ${amount} = ${signed(answer)}. Going up moves you right.`,
            [[start - amount, 'That takes away. Going up means adding, so move right.'],
                [-answer, 'Check the sign of your answer. Did you go past zero?']],
            `Start at ${signed(start)} and count ${amount} places right.`);
    }

    // Two steps, so the line is not shown: it would only show one move.
    function temperatureTwoSteps(start, fall, rise) {
        const answer = start - fall + rise;
        return {
            ...typedSum(start, rise - fall,
                `It is ${start}°C. The temperature falls by ${fall}°C, then goes up by ${rise}°C. What is the temperature now, in °C?`,
                `${start} − ${fall} = ${signed(start - fall)}, then ${signed(start - fall)} + ${rise} = ${signed(answer)}.`,
                [[start + fall + rise, 'A fall means the temperature goes down, so take it away.'],
                    [start - fall - rise, 'Going up means adding, so the second step moves right.'],
                    [-answer, 'Check the sign of your answer. Did you go past zero?']],
                `First work out ${start} − ${fall}. Then add ${rise}.`),
            noLine: true
        };
    }

    function missingAdd(amount, total) {
        const answer = total - amount;
        return {
            ...typedSum(0, answer, `Find the missing number: ? + ${amount} = ${signed(total)}.`,
                `${signed(answer)} + ${amount} = ${signed(total)}. To find it, work out ${signed(total)} − ${amount} = ${signed(answer)}.`,
                [[total + amount, `That adds ${amount}. To undo adding ${amount}, take ${amount} away.`],
                    [-answer, 'Check the sign of your answer. Put it back in the sum to check it.']],
                `Undo the adding: work out ${signed(total)} − ${amount}.`),
            noLine: true
        };
    }

    function eitherWay(amount, small, big, otherSmall, otherBig) {
        const sum = start => `${signed(-start)} + ${amount} = ${signed(amount - start)}`;
        return {
            questionType: 'either-way', input: 'choice', amount,
            prompt: `Adding ${amount} to a negative number can give a positive answer or a negative answer. Which pair of sums shows this?`,
            options: [
                option(`${sum(small)} and ${sum(big)}`, `Right. One answer is positive and the other is negative.`, true),
                option(`${sum(small)} and ${sum(otherSmall)}`, 'Both of these answers are positive. You need one positive and one negative.'),
                option(`${sum(big)} and ${sum(otherBig)}`, 'Both of these answers are negative. You need one positive and one negative.'),
                option(`${signed(-small)} + ${amount} = ${signed(small - amount)} and ${signed(-big)} + ${amount} = ${signed(big - amount)}`,
                    `Check the sums. ${signed(-small)} + ${amount} = ${signed(amount - small)}, because adding moves you right.`)
            ]
        };
    }

    function multiplyDifferent(size, other) {
        const answer = -size * other;
        return {
            questionType: 'multiply', input: 'choice', signs: ['−', '+'], expected: answer,
            prompt: `Work out −${size} × ${other}.`,
            options: [
                option(signed(answer), `${size} × ${other} = ${size * other}. ${signReason(false)}`, true),
                option(String(-answer), `${signReason(false)}`),
                option(signed(other - size), `That adds −${size} and ${other}. This question multiplies them.`),
                option(signed(-size - other), `That takes ${other} away from −${size}. This question multiplies them.`)
            ]
        };
    }

    function multiplySame(size, other) {
        const answer = size * other;
        return {
            questionType: 'multiply', input: 'number', signs: ['−', '−'], expected: answer,
            prompt: `Work out −${size} × −${other}.`, answer: String(answer),
            feedback: `${size} × ${other} = ${answer}. ${signReason(true)}`,
            rules: [
                { value: signed(-answer), feedback: signReason(true) },
                { value: signed(-size - other), feedback: `That adds −${size} and −${other}. This question multiplies them.` }
            ],
            fallback: `Work out ${size} × ${other}, then use the signs to find the sign of the answer.`
        };
    }

    // Exam-style Practice questions from the question bank.
    // Multiplying two negative decimals. Work in tenths so the answer is exact.
    function decimalMultiply(size, other) {
        const answer = Math.round(size * 10 * other) / 10;
        const added = Math.round((size + other) * 10) / 10;
        return {
            questionType: 'multiply', input: 'number', signs: ['−', '−'], expected: answer,
            prompt: `Work out (−${size}) × (−${other}).`, answer: String(answer),
            feedback: `${size} × ${other} = ${answer}. ${signReason(true)}`,
            rules: [
                { value: signed(-answer), feedback: signReason(true) },
                { value: signed(-added), feedback: `That adds −${size} and −${other}. This question multiplies them.` },
                { value: String(added), feedback: `That adds ${size} and ${other}. Multiply them instead.` }
            ].filter(rule => rule.value !== String(answer)),
            fallback: `Work out ${size} × ${other}, then use the signs to find the sign of the answer.`
        };
    }

    // Dividing follows the same sign rule as multiplying.
    function dividePair(size, divisor) {
        const total = size * divisor;
        const rule = 'Dividing works like multiplying: the same signs give a positive answer, different signs give a negative answer.';
        return {
            questionType: 'divide-pair', input: 'choice',
            prompt: `Work out −${total} ÷ −${divisor}, then −${total} ÷ ${divisor}. Which pair of answers is right?`,
            options: [
                option(`${size}, then −${size}`, `Right. −${total} ÷ −${divisor} = ${size}, because the signs are the same. −${total} ÷ ${divisor} = −${size}, because they are different.`, true),
                option(`−${size}, then ${size}`, `That's the wrong way round. ${rule}`),
                option(`${size}, then ${size}`, `The second answer should be negative. −${total} and ${divisor} have different signs.`),
                option(`−${size}, then −${size}`, `The first answer should be positive. −${total} and −${divisor} have the same sign.`)
            ]
        };
    }

    function squareNegative(size) {
        return {
            questionType: 'square-negative', input: 'choice',
            prompt: `n = −${size}. What is n²? (n² means n × n.)`,
            options: [
                option(String(size * size), `Right. −${size} × −${size} = ${size * size}. ${signReason(true)}`, true),
                option(`−${size * size}`, `n² is −${size} × −${size}. ${signReason(true)}`),
                option(`−${2 * size}`, `That doubles −${size}. n² means −${size} × −${size}, not −${size} × 2.`),
                option(String(2 * size), `That's 2 × ${size}. n² means −${size} × −${size}.`)
            ]
        };
    }

    // The number halfway between a negative and a positive number. Multiple
    // choice, so Practice is half choice and half typed.
    function halfway(low, high) {
        const answer = (low + high) / 2;
        const right = `Right. ${signed(low)} + ${high} = ${signed(low + high)}, and ${signed(low + high)} ÷ 2 = ${signed(answer)}.`;
        const wrong = [
            [(high - low) / 2, `That's half the distance from ${signed(low)} to ${high}. Now count that far right from ${signed(low)}.`],
            [-answer, `Check the sign. ${signed(low)} + ${high} = ${signed(low + high)}, and half of that is ${signed(answer)}.`],
            [low + high, `That's ${signed(low)} + ${high}. Halve it to find the middle.`],
            [(low - high) / 2, `That's half the distance, counted the wrong way. Add ${signed(low)} and ${high}, then halve it.`],
            [answer + 1, `Check your adding: ${signed(low)} + ${high} = ${signed(low + high)}. Half of that is ${signed(answer)}.`]
        ].filter(([value], index, list) => value !== answer && list.findIndex(([other]) => other === value) === index).slice(0, 3);
        return {
            questionType: 'halfway', input: 'choice', expected: answer,
            prompt: `What number is exactly halfway between ${signed(low)} and ${high}?`,
            options: [option(signed(answer), right, true), ...wrong.map(([value, feedback]) => option(signed(value), feedback))]
        };
    }

    function alwaysPositive() {
        return {
            questionType: 'always-positive', input: 'choice',
            prompt: 'p and q are different positive numbers. n is a negative number. Which of these is always positive?',
            options: [
                option('p − n', 'Right. Taking away a negative is the same as adding, so p − n is p plus a positive number.', true),
                option('p + n', 'This can be positive or negative. It depends on which is bigger: p or the size of n.'),
                option('p − q', 'This is negative when q is bigger than p.'),
                option('p ÷ n', 'A positive number divided by a negative number is always negative.')
            ]
        };
    }

    // Try it's drag questions. `amount` is how far the dot moves: minus means left.
    function dragQuestion(start, amount, sum, working, correct, wrongWay) {
        const answer = signed(start + amount);
        return {
            start, amount, questionType: 'drag', input: 'drag',
            prompt: `Work out ${sum}.`, answer, feedback: `${working}.`, working, correct, wrongWay
        };
    }

    const dragTakeNegative = (start, amount) => dragQuestion(start, amount, equation(start, amount),
        `${equation(start, amount)} = ${signed(start)} + ${amount} = ${signed(start + amount)}`,
        `Correct. Taking away −${amount} is the same as adding ${amount}, so you moved ${amount} places right.`,
        'You went left. Taking away a negative is the same as adding, so go right.');

    const dragTakePositive = (start, amount) => dragQuestion(start, -amount, `${signed(start)} − ${amount}`,
        `${signed(start)} − ${amount} = ${signed(start - amount)}`,
        `Correct. Taking away ${amount} moves you ${amount} places left.`,
        'You went right. Taking away a positive number moves you left.');

    const dragAdd = (start, amount) => dragQuestion(start, amount, `${signed(start)} + ${amount}`,
        `${signed(start)} + ${amount} = ${signed(start + amount)}`,
        `Correct. Adding ${amount} moves you ${amount} places right.`,
        'You went left. Adding a positive number moves you right.');

    function error(start, amount) {
        return {
            start, amount, questionType: 'error', input: 'choice',
            prompt: `Sam writes: ${equation(start, amount)} = ${signed(-start)} + ${amount} = ${-start + amount}. What has Sam done wrong?`,
            options: [
                option(`He changed ${signed(start)} to ${signed(-start)}. The answer is ${signed(start + amount)}.`, 'The starting number stays unchanged. Only subtracting a negative changes to addition.', true),
                option(`He should subtract ${amount}. The answer is ${signed(start - amount)}.`, 'Subtracting a negative becomes addition, so add the positive number.'),
                option('Nothing. His working is right.', 'He changed the starting number. Keep its minus sign.'),
                option(`His answer has the wrong sign. It should be ${signed(start - amount)}.`, 'The mistake happens earlier: he changed the starting number, not just the final sign.')
            ]
        };
    }

    // The multiplying questions in Try it.
    function multiplyExamples() {
        return [
            {
                questionType: 'multiply', input: 'conveyor',
                prompt: 'Tap a card to flip its sign. See what comes out of the machine.'
            },
            {
                questionType: 'multiply', input: 'number', signs: ['−', '−'],
                prompt: 'Work out −6 × −3.',
                rule: 'Negative × negative = positive. The same signs give a positive answer.', answer: '18',
                feedback: '6 × 3 = 18. The signs are the same, so the answer is positive.',
                rules: [
                    { value: '−18', feedback: 'The signs are the same, so the answer is positive.' },
                    { value: '−9', feedback: 'That adds −6 and −3. This question multiplies them.' }
                ],
                fallback: 'Work out 6 × 3, then use the grid to find the sign.'
            },
            {
                questionType: 'multiply', input: 'reveal',
                prompt: 'Tap each card to multiply 1 by it.',
                feedback: 'Multiplying by −1 swaps the sign. 1 becomes −1, and −1 becomes 1. So −1 × −1 = 1.'

            }
        ];
    }

    // Check tests understanding, not working out: one question per key point.
    function checks() {
        const understanding = (prompt, options) => ({ questionType: 'understanding', input: 'choice', prompt, options });
        return [
            understanding('On a number line, what do + and − tell you to do?', [
                option('+ means move right. − means move left.', 'Right. Adding moves you right and taking away moves you left.', true),
                option('+ means move left. − means move right.', 'That is the wrong way round. Numbers get bigger as you go right, so adding moves you right.'),
                option('+ and − both mean move right.', 'They go opposite ways. Taking away moves you left.'),
                option('They only tell you if the answer is positive or negative.', 'They also tell you which way to move: + goes right and − goes left.')
            ]),
            understanding('What happens to the two minus signs when you take away a negative number?', [
                option('They turn into a plus, so you add.', 'Right. Taking away a negative is the same as adding.', true),
                option('They stay as they are, so you take away more.', 'Taking away a negative does the opposite of taking away, so you add.'),
                option('They cancel out, so you ignore the number.', 'You still use the number. The two signs turn into a plus, so you add it.'),
                option('They turn into a plus, and the first number changes sign too.', 'The first number stays exactly as it is. Only the two signs change.')
            ]),
            {
                ...understanding('The table shows the sign of the answer when you multiply. What goes in the empty square?', [
                    option('+, because the two signs are the same.', 'Right. − × − has two signs the same, so the answer is positive.', true),
                    option('−, because both signs are negative.', 'Two negatives don\'t give a negative here. The signs are the same, so the answer is positive.'),
                    option('−, because the square next to it is −.', 'Each square only depends on its own row and column. − and − are the same, so it is +.'),
                    option('It depends which numbers you multiply.', 'The size of the numbers doesn\'t change the sign. The same signs always give +.')
                ]),
                figure: drawTableWithGap
            },
            understanding('You start on a negative number and take away a positive number. What happens?', [
                option('You move left, further below zero, so the answer is more negative.', 'Right. Taking away moves you left, away from zero.', true),
                option('You move right, towards zero.', 'Taking away a positive number always moves you left.'),
                option('The two minus signs make a plus, so you add.', 'That only happens when you take away a negative number. Here you take away a positive one.'),
                option('You stop at zero, because you can\'t go any lower.', 'Numbers carry on below zero, so you keep moving left.')
            ]),
            understanding('You start on a positive number and take away a bigger number. What happens?', [
                option('You go past zero, so the answer is negative.', 'Right. You move left, past zero, and land on a negative number.', true),
                option('You stop at zero, because you can\'t go below it.', 'The number line carries on below zero, so you keep moving left.'),
                option('You move right, because the number is bigger.', 'Taking away always moves you left, however big the number is.'),
                option('The answer stays positive, so you swap the numbers round.', 'You can\'t swap the numbers in a take-away. You go past zero, so the answer is negative.')
            ])
        ];
    }

    // A fixed mix, so the same kind of sum never comes three times in a row.
    const practiceTypes = [
        'take-positive', 'cross-zero', 'rewrite-positive', 'temperature-rise',
        'add-two-negatives', 'multiply-different', 'missing-add', 'divide-pair',
        'multiply-same', 'temperature-two-steps', 'square-negative', 'either-way',
        'decimal-multiply', 'halfway', 'always-positive', 'error'
    ];

    function pick(random) {
        const { randomInt } = window.Maths1to9LessonEngine;
        return practiceTypes.map(type => ({ type, seed: randomInt(0, 4294967295, random) }));
    }

    function prepare(question, random) {
        return question.options
            ? { ...question, options: window.Maths1to9LessonEngine.shuffle(question.options, random) }
            : { ...question };
    }

    function generate(item, random) {
        const { randomInt } = window.Maths1to9LessonEngine;
        const integer = (min, max) => randomInt(min, max, random);
        let question;
        if (item.type === 'take-positive') {
            const start = integer(1, 9);
            question = takePositive(start, start + integer(1, 9));
        } else if (item.type === 'add-two-negatives') {
            question = addNegative(-integer(1, 12), integer(1, 12));
        } else if (item.type === 'temperature-rise') {
            question = temperatureRise(-integer(2, 15), integer(3, 25));
        } else if (item.type === 'temperature-two-steps') {
            const start = integer(2, 12);
            question = temperatureTwoSteps(start, start + integer(1, 10), integer(1, 9));
        } else if (item.type === 'missing-add') {
            question = missingAdd(integer(2, 15), -integer(1, 15));
        } else if (item.type === 'either-way') {
            const amount = integer(4, 9);
            const small = integer(1, amount - 1);
            const big = amount + integer(1, 8);
            let otherSmall = integer(1, amount - 2);
            if (otherSmall >= small) otherSmall++;
            let otherBig = amount + integer(1, 7);
            if (otherBig >= big) otherBig++;
            question = eitherWay(amount, small, big, otherSmall, otherBig);
        } else if (item.type === 'multiply-different') {
            question = multiplyDifferent(integer(3, 9), integer(2, 9));
        } else if (item.type === 'decimal-multiply') {
            question = decimalMultiply([0.5, 1.5, 2.5, 3.5][integer(0, 3)], integer(2, 8));
        } else if (item.type === 'divide-pair') {
            question = dividePair(integer(3, 9), integer(3, 9));
        } else if (item.type === 'square-negative') {
            question = squareNegative(integer(3, 9));
        } else if (item.type === 'halfway') {
            // An even total, not zero, so the middle is a whole number that isn't 0.
            const low = -integer(2, 20);
            let high = integer(1, 15);
            if ((low + high) % 2 !== 0) high += 1;
            if (low + high === 0) high += 2;
            question = halfway(low, high);
        } else if (item.type === 'always-positive') {
            question = alwaysPositive();
        } else if (item.type === 'multiply-same') {
            question = multiplySame(integer(2, 9), integer(2, 9));
        } else if (item.type.startsWith('rewrite')) {
            const magnitude = integer(1, 15);
            // Different magnitudes keep even the numerical values of all four choices distinct.
            let amount = integer(1, 14);
            if (amount === magnitude) amount = 15;
            question = rewrite(item.type === 'rewrite-positive' ? magnitude : -magnitude, amount);
        } else if (item.type === 'error') {
            const magnitude = integer(4, 15);
            question = error(-magnitude, integer(1, magnitude - 1));
        } else {
            let start = integer(1, 15);
            let amount = integer(1, 15);
            if (item.type === 'cross-zero') {
                start = -integer(1, 12);
                amount = -start + integer(1, 12);
            }
            if (item.type === 'stay-negative') {
                start = -integer(2, 20);
                amount = integer(1, -start - 1);
            }
            if (item.type === 'zero') {
                start = -integer(1, 20);
                amount = -start;
            }
            question = calculate(start, amount);
        }
        return prepare({ ...question, questionType: item.type }, random);
    }

    function paragraph(host, text, className = '') {
        const node = document.createElement('p');
        node.textContent = text;
        node.className = className;
        host.append(node);
        return node;
    }

    // Long lines only label every fifth number, so the labels stay readable.
    function labelClass(value, start, end, showJourney, range) {
        if (value === start || (showJourney && value === end)) return value % 2 ? 'negative-key-tick' : '';
        if (range > 20) {
            const closeToStart = Math.abs(value - start) < 3;
            return value % 5 || closeToStart ? 'negative-no-label' : '';
        }
        return value % 2 ? 'negative-small-tick' : '';
    }

    function drawHops(start, value, min, max) {
        const direction = value < start ? -1 : 1;
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('negative-hops');
        svg.setAttribute('viewBox', `0 0 ${max - min} 10`);
        svg.setAttribute('preserveAspectRatio', 'none');
        svg.setAttribute('aria-hidden', 'true');
        for (let step = 0; step < Math.abs(value - start); step++) {
            const from = start - min + step * direction;
            const hop = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            hop.setAttribute('class', `negative-hop ${direction < 0 ? 'negative-hop--left' : 'negative-hop--right'}`);
            hop.setAttribute('d', `M ${from} 10 Q ${from + direction / 2} -8 ${from + direction} 10`);
            svg.append(hop);
        }
        return svg;
    }

    // The shared feedback box, drawn by the engine so it matches every other
    // lesson. Any working goes in here, on its own line, never in a separate
    // box underneath. Learn passes 'explanation'; Try it passes 'interactive'.
    function feedbackBox(host, sectionId, options) {
        const box = window.Maths1to9LessonEngine.createFeedback(sectionId, options);
        host.append(box);
        return box;
    }

    function correctBox(host, text, sum, sectionId = 'explanation') {
        const box = feedbackBox(host, sectionId, { correct: true, text });
        if (sum) {
            const working = document.createElement('span');
            working.className = 'nn-box-sum';
            working.textContent = sum;
            box.append(working);
        }
        return box;
    }

    function drawLine(host, start, end, position = start, showJourney = true, range = {}) {
        const min = range.min ?? Math.min(-10, start);
        const max = range.max ?? Math.max(10, end);
        const line = document.createElement('div');
        line.className = 'negative-line';
        line.setAttribute('role', 'img');
        const track = document.createElement('div');
        track.className = 'negative-track';
        const ticks = document.createElement('div');
        ticks.className = 'negative-ticks';
        for (let value = min; value <= max; value++) {
            const tick = document.createElement('span');
            tick.style.left = `${(value - min) / (max - min) * 100}%`;
            tick.textContent = signed(value);
            tick.className = value === 0 ? 'negative-zero' : labelClass(value, start, end, showJourney, max - min);
            ticks.append(tick);
        }
        const hops = document.createElement('div');
        hops.className = 'negative-hops-layer';
        const moved = document.createElement('span');
        moved.className = 'negative-hop-count';
        const reading = document.createElement('span');
        reading.className = 'negative-dot-value';
        const marker = document.createElement('span');
        marker.className = 'negative-marker';
        marker.setAttribute('aria-hidden', 'true');
        track.append(hops, moved, marker, ticks, reading);
        line.append(track);
        host.append(line);
        function update(value) {
            marker.style.left = `${(value - min) / (max - min) * 100}%`;
            const shown = showJourney || range.hops ? value : start;
            const steps = shown - start;
            hops.replaceChildren(drawHops(start, shown, min, max));
            // Above the hops: how far they've moved. Below the line: where they are.
            moved.textContent = steps ? `${steps > 0 ? '+' : '−'}${Math.abs(steps)}` : '';
            moved.className = `negative-hop-count ${steps < 0 ? 'negative-hop-count--left' : ''}`;
            moved.style.left = `${((start + shown) / 2 - min) / (max - min) * 100}%`;
            reading.textContent = showJourney || range.hops ? signed(shown) : '';
            reading.style.left = `${(shown - min) / (max - min) * 100}%`;
            line.setAttribute('aria-label', showJourney
                ? `Number line from ${signed(min)} to ${signed(max)}. Start ${signed(start)}, move right to ${signed(value)}. Marker ${signed(value)}.`
                : `Number line from ${signed(min)} to ${signed(max)}. Starting marker ${signed(start)}.`);
        }
        update(position);
        return update;
    }

    function slider(host, label, min, max, value, onInput) {
        const wrapper = document.createElement('label');
        wrapper.className = 'negative-slider';
        const caption = document.createElement('span');
        const input = document.createElement('input');
        input.type = 'range';
        input.min = min;
        input.max = max;
        input.step = 1;
        input.value = value;
        input.setAttribute('aria-label', label);
        const updateLabel = () => { caption.textContent = `${label}: ${signed(Number(input.value))}`; };
        updateLabel();
        input.addEventListener('input', () => { updateLabel(); onInput(Number(input.value)); });
        wrapper.append(caption, input);
        host.append(wrapper);
        return input;
    }

    function drawJourney(host, section) {
        const state = section.state;
        const update = drawLine(host, 3, 7, 3 + state.jumps);
        const trail = paragraph(host, '', 'negative-equation');
        function show(jumps) {
            update(3 + jumps);
            trail.textContent = Array.from({ length: jumps + 1 }, (_, i) => signed(3 + i)).join(' → ');
        }
        show(state.jumps);
        slider(host, 'Spaces moved right', 0, 4, state.jumps, jumps => {
            section.update(saved => { saved.jumps = jumps; });
            show(jumps);
        });
    }

    function drawExplore(host, section) {
        const state = section.state;
        const picture = document.createElement('div');
        const sum = paragraph(host, '', 'negative-equation');
        const update = () => {
            picture.replaceChildren();
            drawLine(picture, state.start, state.start + state.amount, state.start + state.amount);
            sum.textContent = working(state.start, state.amount).replace(/\.$/, '');
        };
        slider(host, 'Starting number', -10, 2, state.start, start => {
            section.update(saved => { saved.start = start; });
            update();
        });
        slider(host, 'Positive amount to add', 1, 8, state.amount, amount => {
            section.update(saved => { saved.amount = amount; });
            update();
        });
        host.append(picture);
        update();
    }

    function drawAnswerLine(host, question, correct) {
        drawLine(host, question.start, question.start + question.amount, correct ? question.start + question.amount : question.start, Boolean(correct));
    }

    // Where the pupil left the dot, so a reload doesn't lose it.
    function savedDot(question) {
        try {
            const value = window.localStorage.getItem(`negative-numbers-dot:${question.prompt}`);
            return value === null ? question.start : Number(value);
        } catch {
            return question.start;
        }
    }

    function saveDot(question, value) {
        try {
            window.localStorage.setItem(`negative-numbers-dot:${question.prompt}`, String(value));
        } catch {
            // The dot still works; it just won't survive a reload.
        }
    }

    // A number line whose dot the pupil can drag while working out the answer.
    // Only the typed answer is marked, so moving the dot is never checked.
    function drawMovableLine(host, question, { hint = 'Drag the dot to help you work it out.', onRelease } = {}) {
        paragraph(host, hint, 'negative-drag-hint');
        const end = question.start + question.amount;
        const { min, max } = lineRange(question);
        const update = drawLine(host, question.start, end, question.start, false, { min, max, hops: true });
        const line = host.querySelector('.negative-line');
        const track = line.querySelector('.negative-track');
        let value = question.start;
        function show(next) {
            value = Math.max(min, Math.min(max, next));
            update(value);
            line.setAttribute('aria-label', `Number line from ${signed(min)} to ${signed(max)}. The dot is on ${signed(value)}. Use the arrow keys to move it.`);
        }
        function move(next) {
            show(next);
            saveDot(question, value);
        }
        function pointer(event) {
            const box = track.getBoundingClientRect();
            move(Math.round(min + (event.clientX - box.left) / box.width * (max - min)));
        }
        line.classList.add('negative-line--movable');
        line.dataset.answer = end;
        line.setAttribute('role', 'application');
        line.tabIndex = 0;
        line.addEventListener('pointerdown', event => {
            line.setPointerCapture(event.pointerId);
            pointer(event);
        });
        line.addEventListener('pointermove', event => {
            if (line.hasPointerCapture(event.pointerId)) pointer(event);
        });
        line.addEventListener('pointerup', () => onRelease?.(value));
        line.addEventListener('keydown', event => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
            event.preventDefault();
            move(value + (event.key === 'ArrowRight' ? 1 : -1));
            onRelease?.(value);
        });
        show(savedDot(question));
    }

    // Room to go either way, so a wrong turn can be seen too.
    function lineRange({ start, amount }) {
        const steps = Math.abs(amount);
        return { min: Math.min(-10, start - steps), max: Math.max(10, start + steps) };
    }

    function drawFinishedLine(host, question) {
        const end = question.start + question.amount;
        drawLine(host, question.start, end, end, true, lineRange(question));
    }

    // A short nudge for wherever the dot was left; nothing while it's on the start.
    function dragHint(question, value) {
        const { start, amount, wrongWay } = question;
        const moved = (value - start) * Math.sign(amount);
        const steps = Math.abs(amount);
        if (moved === 0) return '';
        if (moved < 0) return wrongWay;
        if (moved > steps) return `That's too far. You only need to move ${steps} places ${amount < 0 ? 'left' : 'right'}.`;
        return `That's the right way. You need to move ${steps} places in total.`;
    }

    // Try it: the pupil drags the dot and presses Check. A hint shows while
    // the dot is off the answer; nothing shows when it sits on the answer,
    // so Check is what tells them they're right.
    function drawDragToAnswer(host, question, solved, { onSolved, setAction }) {
        const end = question.start + question.amount;
        if (solved) {
            drawFinishedLine(host, question);
            host.querySelector('.negative-line').classList.add('negative-line--solved');
            correctBox(host, question.correct, question.working, 'interactive');
            return;
        }
        let value = savedDot(question);
        let hint;
        const showHint = () => {
            hint.textContent = value === end ? '' : dragHint(question, value);
            hint.classList.toggle('is-visible', hint.textContent !== '');
        };
        const askToCheck = () => setAction({
            label: 'Check',
            disabled: value === question.start,
            onClick: () => {
                if (value === end) onSolved();
                else showHint();
            }
        });
        drawMovableLine(host, question, {
            hint: 'Drag the dot to the answer.',
            onRelease: released => {
                value = released;
                showHint();
                askToCheck();
            }
        });
        hint = feedbackBox(host, 'interactive', { correct: false, visible: false });
        showHint();
        askToCheck();
    }

    // Remembers a wrong answer, so a reload still shows the line.
    function wrongBefore(question) {
        try {
            return window.localStorage.getItem(`negative-numbers-wrong:${question.prompt}`) === '1';
        } catch {
            return false;
        }
    }

    function rememberWrong(question, wrong) {
        try {
            if (wrong) window.localStorage.setItem(`negative-numbers-wrong:${question.prompt}`, '1');
            else window.localStorage.removeItem(`negative-numbers-wrong:${question.prompt}`);
        } catch {
            // The line still appears; it just won't survive a reload.
        }
    }

    // Keeps a question's figure hidden until the first wrong answer.
    function revealAfterWrong(config, question) {
        let figureHost;
        return {
            ...config,
            figure(host, options) {
                figureHost = host;
                host.hidden = !options.readOnly && !wrongBefore(question);
                config.figure(host, options);
            },
            onFeedback(result) {
                config.onFeedback?.(result);
                rememberWrong(question, !result.correct);
                if (!result.correct) figureHost.hidden = false;
            }
        };
    }

    // Typed "work out" questions get the number line above them. A finished
    // question just shows the hops from the start to the answer.
    function withMovableLine(question, { afterWrongAnswer = false } = {}) {
        if (question.input !== 'number' || question.signs || question.noLine) return question;
        const config = {
            ...question,
            figure(host, { readOnly }) {
                if (readOnly) drawFinishedLine(host, question);
                else drawMovableLine(host, question);
            }
        };
        return afterWrongAnswer ? revealAfterWrong(config, question) : config;
    }

    // The sign grid: row sign, column sign and the sign of the answer.
    const SIGN_GRID = [
        { row: '+', column: '+', answer: '+', sum: '2 × 3 = 6' },
        { row: '+', column: '−', answer: '−', sum: '2 × −3 = −6' },
        { row: '−', column: '+', answer: '−', sum: '−2 × 3 = −6' },
        { row: '−', column: '−', answer: '+', sum: '−2 × −3 = 6' }
    ];

    function drawGrid(host, cell) {
        const grid = document.createElement('div');
        grid.className = 'nn-sign-grid';
        grid.innerHTML = '<span class="nn-grid-label">×</span><span class="nn-grid-label">+</span><span class="nn-grid-label">−</span>';
        SIGN_GRID.forEach((square, i) => {
            if (i % 2 === 0) grid.insertAdjacentHTML('beforeend', `<span class="nn-grid-label">${square.row}</span>`);
            grid.append(cell(square, i));
        });
        host.append(grid);
    }

    const gridColour = square => `nn-grid-${square.answer === '+' ? 'plus' : 'minus'}`;

    // Check: the sign table, filled in apart from the − × − square.
    function drawTableWithGap(host) {
        drawGrid(host, (square, i) => {
            const cell = document.createElement('span');
            const gap = square.row === '−' && square.column === '−';
            cell.className = `nn-grid-cell ${gap ? 'nn-grid-last' : gridColour(square)}`;
            cell.textContent = gap ? '?' : square.answer;
            if (gap) cell.setAttribute('aria-label', 'empty square, − row and − column');
            return cell;
        });
    }

    // The sign table. The chosen row is red and the chosen column blue, so the
    // square where they cross turns purple.
    function signTable(row, column) {
        const tint = (inRow, inColumn) => {
            if (inRow && inColumn) return ' class="nn-table-both"';
            if (inRow) return ' class="nn-table-row"';
            return inColumn ? ' class="nn-table-column"' : '';
        };
        const line = sign => `<tr><th scope="row"${tint(sign === row, false)}>${sign}</th>
            ${['+', '−'].map(top => {
                const square = SIGN_GRID.find(item => item.row === sign && item.column === top);
                return `<td${tint(sign === row && top === column, sign === row && top === column)}>${square.answer}</td>`;
            }).join('')}</tr>`;
        return `<caption class="visually-hidden">Signs when you multiply</caption>
            <thead><tr><th scope="col">×</th><th scope="col"${tint(false, column === '+')}>+</th><th scope="col"${tint(false, column === '−')}>−</th></tr></thead>
            <tbody>${line('+')}${line('−')}</tbody>`;
    }

    // A small table beside a multiplying question, with its signs coloured.
    function withSignGrid(question, { afterWrongAnswer = false } = {}) {
        const config = {
            ...question,
            figure(host) {
                const table = document.createElement('table');
                table.className = 'nn-sign-table';
                table.innerHTML = signTable(...question.signs);
                host.append(table);
                if (question.rule) paragraph(host, question.rule, 'nn-grid-rule');
            }
        };
        return afterWrongAnswer ? revealAfterWrong(config, question) : config;
    }

    window.NegativeNumbers = {
        signed, paragraph, correctBox, equation, working, rewrite, calculate, checks,
        dragTakeNegative, dragTakePositive, dragAdd,
        practiceTypes, pick, prepare, generate, drawLine, drawJourney, drawExplore, drawAnswerLine, withMovableLine,
        multiplyExamples, withSignGrid, drawDragToAnswer
    };
})();
