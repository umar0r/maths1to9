(() => {
    'use strict';

    const option = (label, feedback, correct = false, index) => ({ label, feedback, correct, ...(index !== undefined ? { index } : {}) });
    const clean = text => String(text).replace(/,/g, '');
    const figures = n => `${n} significant ${n === 1 ? 'figure' : 'figures'}`;
    const spaced = text => {
        const [whole, fraction] = String(text).split('.');
        return whole.replace(/\B(?=(\d{3})+$)/g, ',') + (fraction !== undefined ? '.' + fraction : '');
    };

    function digits(number, n) {
        const text = clean(number);
        const indexes = [...text].map((digit, index) => /\d/.test(digit) ? index : -1).filter(index => index >= 0);
        const start = indexes.findIndex(index => text[index] !== '0');
        const significant = indexes.slice(start);
        return { first: significant[0], target: significant[n - 1], decider: significant[n], significant, indexes };
    }

    // Round from the original digits. Keep decimal zeros that show the accuracy.
    function roundSig(number, n, mode = 'nearest') {
        const [whole, fraction = ''] = clean(number).split('.');
        const all = whole + fraction;
        const first = all.search(/[1-9]/);
        if (first < 0) throw new Error('Use a positive, non-zero number.');
        const significant = all.slice(first);
        let kept = significant.slice(0, n).padEnd(n, '0');
        let power = whole.length - first - n;
        const next = Number(significant[n] || '0');
        if (mode === 'up' || (mode === 'nearest' && next >= 5)) {
            kept = String(Number(kept) + 1);
            if (kept.length > n) {
                kept = kept.slice(0, n);
                power++;
            }
        }
        if (power >= 0) return kept + '0'.repeat(power);
        const point = kept.length + power;
        return point <= 0 ? '0.' + '0'.repeat(-point) + kept : kept.slice(0, point) + '.' + kept.slice(point);
    }

    function place(number, index) {
        const text = clean(number);
        const point = text.includes('.') ? text.indexOf('.') : text.length;
        const power = index < point ? point - index - 1 : point - index;
        return {
            6: 'millions', 5: 'hundred-thousands', 4: 'ten-thousands', 3: 'thousands',
            2: 'hundreds', 1: 'tens', 0: 'ones', '-1': 'tenths', '-2': 'hundredths',
            '-3': 'thousandths', '-4': 'ten-thousandths', '-5': 'hundred-thousandths', '-6': 'millionths'
        }[power];
    }
    const digitLabel = (number, index) => `${clean(number)[index]} (${place(number, index)})`;

    function roundToPower(number, power, mode = 'nearest') {
        const [whole, fraction = ''] = clean(number).split('.');
        const integer = BigInt(whole + fraction);
        const drop = fraction.length + power;
        let kept;
        if (drop <= 0) kept = integer * 10n ** BigInt(-drop);
        else {
            const unit = 10n ** BigInt(drop);
            kept = integer / unit;
            if (mode === 'up' || (mode === 'nearest' && (integer % unit) * 2n >= unit)) kept++;
        }
        if (power >= 0) return kept === 0n ? '0' : String(kept) + '0'.repeat(power);
        const places = -power;
        const result = String(kept).padStart(places + 1, '0');
        return result.slice(0, -places) + '.' + result.slice(-places);
    }
    function rounded(number, kind, accuracy, mode = 'nearest') {
        return kind === 'sig' ? roundSig(number, accuracy, mode) : roundToPower(number, kind === 'decimal' ? -accuracy : accuracy, mode);
    }
    function accuracyText(kind, accuracy) {
        if (kind === 'sig') return figures(accuracy);
        if (kind === 'decimal') return `${accuracy} decimal ${accuracy === 1 ? 'place' : 'places'}`;
        return `the nearest ${spaced(String(10 ** accuracy))}`;
    }
    function keyDigits(number, kind, accuracy) {
        if (kind === 'sig') return digits(number, accuracy);
        const d = digits(number, 1);
        const point = number.includes('.') ? number.indexOf('.') : number.length;
        const power = kind === 'decimal' ? -accuracy : accuracy;
        const target = power >= 0 ? point - 1 - power : point - power;
        return { ...d, target, decider: d.indexes[d.indexes.indexOf(target) + 1] };
    }
    function roundingQuestion(number, kind, accuracy, input = 'number', questionType = kind, customPrompt) {
        number = clean(number);
        const d = keyDigits(number, kind, accuracy);
        const answer = rounded(number, kind, accuracy);
        const next = number[d.decider];
        const feedback = `The next digit is ${next}, so ${Number(next) >= 5 ? 'round up' : 'keep the last digit as it is'}. ${spaced(number)} ≈ ${spaced(answer)}`;
        const wrongAccuracy = kind === 'sig' ? accuracy + 1 : kind === 'decimal' ? accuracy + 1 : Math.max(0, accuracy - 1);
        const otherAccuracy = kind === 'sig' ? Math.max(1, accuracy - 1) : kind === 'decimal' ? Math.max(0, accuracy - 1) : accuracy + 1;
        const wrongKind = kind === 'decimal' && otherAccuracy === 0 ? 'nearest' : kind;
        const mistakes = [
            ...(answer.includes('.') && answer.endsWith('0') ? [[answer.slice(0, -1), 'Keep the final zero after the decimal point. It shows the accuracy asked for.']] : []),
            [rounded(number, kind, accuracy, 'down'), 'That drops the later digits without rounding up. The next digit is 5 or more.'],
            [rounded(number, kind, accuracy, 'up'), 'That rounds up. The next digit is less than 5, so keep the last digit as it is.'],
            ...(!answer.includes('.') && answer.endsWith('0') ? [[answer.replace(/0+$/, ''), 'That drops the zeros that keep the number the right size. Keep those whole-number places.']] : []),
            [rounded(number, kind, wrongAccuracy), `That rounds to a different place. The question asks for ${accuracyText(kind, accuracy)}.`],
            [rounded(number, wrongKind, otherAccuracy), `That uses a different accuracy. Use ${accuracyText(kind, accuracy)}.`],
            [number, 'That leaves the original number unchanged. Round it to the place asked for.'],
            ...(kind === 'sig' ? [[Number(number).toFixed(accuracy), 'That counts decimal places from the point. Start counting at the first digit that is not zero.']] : [])
        ].filter(([value], index, list) => value !== answer && list.findIndex(([other]) => other === value) === index);
        let prompt = customPrompt || `Round ${spaced(number)} to ${accuracyText(kind, accuracy)}.`;
        if (input === 'number' && answer.includes('.') && answer.endsWith('0')) {
            const zeros = answer.match(/0+$/)[0].length > 1 ? 'zeros' : 'zero';
            prompt += ` Keep the ${zeros} at the end after the decimal point.`;
        }
        const question = { number, kind, accuracy, ...d, stage: 'round', questionType, input, prompt, feedback, exact: kind !== 'nearest' };
        if (input === 'choice') question.options = [option(spaced(answer), feedback, true), ...mistakes.slice(0, 3).map(([value, message]) => option(spaced(value), message))];
        else {
            question.answer = answer;
            question.rules = mistakes.map(([value, message]) => ({ value, feedback: message }));
            question.fallback = feedback;
        }
        return question;
    }
    function digitQuestion(number, kind, accuracy, stage) {
        const d = keyDigits(number, kind, accuracy);
        const correct = stage === 'keep' ? d.target : d.decider;
        const wrong = [d.target, d.decider, d.first, ...d.indexes].filter((index, i, list) => index !== correct && list.indexOf(index) === i).slice(0, 3);
        return {
            number, kind, accuracy, ...d, stage, input: 'choice',
            questionType: kind === 'sig' ? `sig-${stage}` : stage === 'keep' ? 'keep-digit' : 'deciding-digit',
            prompt: `Round ${spaced(number)} to ${accuracyText(kind, accuracy)}. ${stage === 'keep' ? 'Which is the last digit to keep?' : 'Which digit comes straight after the digit to keep?'}`,
            options: [option(digitLabel(number, correct), `The ${stage === 'keep' ? 'last digit to keep' : 'next digit'} is ${number[correct]} in the ${place(number, correct)}.`, true, correct),
                ...wrong.map(index => option(digitLabel(number, index),
                    stage === 'keep' ? `The ${place(number, index)} digit is not the last digit to keep. Find the place asked for.`
                        : `The ${place(number, index)} digit is not straight after the digit to keep. Look one digit to the right.`, false, index))]
        };
    }
    // Step 3 of the first example: decide what happens to your digit.
    function decideQuestion(number, kind, accuracy) {
        const d = keyDigits(number, kind, accuracy);
        const digit = number[d.target];
        const next = number[d.decider];
        const up = Number(next) >= 5;
        const changed = String((Number(digit) + 1) % 10);
        const answer = up ? changed : digit;
        const feedback = up ? `${next} is 5 or more, so the ${digit} goes up to ${changed}.` : `${next} is less than 5, so the ${digit} stays the same.`;
        return {
            number, kind, accuracy, ...d, stage: 'decide', input: 'number', questionType: 'decide-digit',
            prompt: `Round ${spaced(number)} to ${accuracyText(kind, accuracy)}. The next digit is ${next}. Is it 5 or more? Type what the ${digit} becomes.`,
            answer, feedback, fallback: feedback, exact: kind !== 'nearest',
            rules: [
                [up ? digit : changed, up ? `${next} counts as 5 or more, so the ${digit} has to go up.` : `${next} is less than 5, so the ${digit} stays the same.`],
                [String((Number(digit) + 9) % 10), 'Your digit never goes down. It either stays the same or goes up by 1.'],
                ['0', 'Your digit does not become 0. The digits after it do.']
            ].filter(([value]) => value !== answer).map(([value, message]) => ({ value, feedback: message }))
        };
    }
    // Each example: [number, kind, accuracy, last step input, extras].
    // The first example walks through every step, including the decision.
    const guided = [
        ['345', 'nearest', 1, 'number', { decide: true, prompts: {
            keep: 'Round 345 to the nearest 10. First, find your digit. Which digit is in the tens place?',
            decider: 'Round 345 to the nearest 10. Now look at the next digit. Which digit comes straight after the 4?'
        } }],
        ['2748', 'nearest', 2, 'number'], ['4.276', 'decimal', 2, 'choice'],
        ['0.004782', 'sig', 2, 'choice'], ['9.964', 'decimal', 1, 'number']
    ];
    // The last example: a real situation where you must round up, even when
    // the answer would normally round down. The pupil finds that out step by step.
    function containerSteps() {
        const step = (prompt, answer, feedback, rules) => ({
            stage: 'context', questionType: 'containers', input: 'number', exact: false,
            prompt, answer, feedback, fallback: feedback,
            rules: rules.map(([value, message]) => ({ value, feedback: message }))
        });
        return [
            step('There are 131 helmets to store. Each rack holds 18 helmets. On a calculator, 131 ÷ 18 = 7.277… Round 7.277… to the nearest whole number.',
                '7', '7.277… is closer to 7 than to 8, so it rounds to 7.', [
                    ['8', 'The tenths digit is 2. That is less than 5, so round down to 7.'],
                    ['7.3', 'That has one decimal place. Round to the nearest whole number.']
                ]),
            step('7 racks hold 7 × 18 = 126 helmets. How many of the 131 helmets have no rack?',
                '5', '131 − 126 = 5. So 5 helmets have no rack.', [
                    ['126', '126 helmets fit in the racks. Take 126 away from 131.'],
                    ['257', 'Take 126 away from 131. Don\'t add them.']
                ]),
            step('What is the smallest number of racks needed for all 131 helmets?',
                '8', '8 racks hold 8 × 18 = 144 helmets, so all 131 fit. Here you round up to 8, even though 7.277… rounds to 7.', [
                    ['7', '7 racks leave 5 helmets with no rack. You need one more rack.'],
                    ['9', '8 racks hold 144 helmets. That is already enough.'],
                    ['7.277', 'You can\'t have part of a rack. Give a whole number.']
                ])
        ];
    }
    function examples() {
        const digitExamples = guided.flatMap(([number, kind, accuracy, input, extras = {}], example) => {
            const steps = [
                digitQuestion(number, kind, accuracy, 'keep'),
                digitQuestion(number, kind, accuracy, 'decider'),
                ...(extras.decide ? [decideQuestion(number, kind, accuracy)] : []),
                roundingQuestion(number, kind, accuracy, input)
            ];
            return steps.map((question, step) => ({
                ...question,
                ...(extras.prompts?.[question.stage] ? { prompt: extras.prompts[question.stage] } : {}),
                example: example + 1, step: step + 1, steps: steps.length
            }));
        });
        const steps = containerSteps();
        return [...digitExamples, ...steps.map((question, step) => ({
            ...question, example: guided.length + 1, step: step + 1, steps: steps.length
        }))];
    }
    const exampleCount = guided.length + 1;
    function checks() {
        return [
            roundingQuestion('2748', 'nearest', 2, 'choice', 'context', 'A stadium has 2,748 spectators. Round this to the nearest 100.'),
            roundingQuestion('5.465', 'decimal', 2), roundingQuestion('0.00726', 'sig', 2),
            { questionType: 'error', input: 'choice', prompt: 'Amir says 4.95 rounds to 4.9 at 1 decimal place. Which explanation corrects him?', options: [
                option('The 5 rounds the tenths up, giving 5.0', 'The hundredths digit is 5. Round up and keep one decimal place.', true),
                option('Keep 4.9 because the tenths digit is already 9', 'A 9 can still round up. The extra 1 carries to the next column.'),
                option('Round to 4 because only whole numbers can be rounded', 'Decimals can be rounded too. Keep the tenths place.'),
                option('Write 5 because the zero after the point does not matter', 'Write 5.0 to show the one decimal place asked for.')
            ] },
            roundingQuestion('1.049', 'decimal', 1, 'number', 'context', 'A bottle holds 1.049 litres. Round this directly to 1 decimal place.')
        ];
    }
    const practiceTypes = ['nearest-ten', 'halfway-hundred', 'nearest-thousand', 'one-decimal', 'two-decimals', 'decimal-zero', 'whole-significant', 'small-significant', 'decimal-carry', 'path-context'];
    function pick(random) {
        const { randomInt } = window.Maths1to9LessonEngine;
        const groups = [['nearest-ten', 'halfway-hundred', 'nearest-thousand'], ['one-decimal', 'two-decimals'], ['decimal-zero', 'decimal-carry'], ['whole-significant', 'small-significant'], ['path-context'], practiceTypes];
        return groups.map((group, index) => ({ type: group[randomInt(0, group.length - 1, random)], mode: [0, 2, 5].includes(index) ? 'choice' : 'number', seed: randomInt(0, 4294967295, random) }));
    }
    function prepare(question, random) {
        return question.options ? { ...question, options: window.Maths1to9LessonEngine.shuffle(question.options, random) } : { ...question };
    }
    function generate(item, random) {
        const integer = (a, b) => window.Maths1to9LessonEngine.randomInt(a, b, random);
        const nonZeroEnd = value => value % 10 === 0 ? value + 1 : value;
        let number, kind, accuracy, customPrompt;
        switch (item.type) {
        case 'nearest-ten': number = String(nonZeroEnd(integer(12, 98))); kind = 'nearest'; accuracy = 1; break;
        case 'halfway-hundred': number = String(integer(2, 8) * 100 + 50); kind = 'nearest'; accuracy = 2; break;
        case 'nearest-thousand': number = String(nonZeroEnd(integer(1001, 9899))); kind = 'nearest'; accuracy = 3; break;
        case 'one-decimal': number = `${integer(1, 8)}.${integer(1, 9)}${integer(1, 9)}`; kind = 'decimal'; accuracy = 1; break;
        case 'two-decimals': number = `${integer(1, 8)}.${integer(1, 9)}${integer(0, 9)}${integer(1, 9)}`; kind = 'decimal'; accuracy = 2; break;
        case 'decimal-zero': number = `${integer(1, 8)}.0${integer(1, 4)}`; kind = 'decimal'; accuracy = 1; break;
        case 'whole-significant': number = String(nonZeroEnd(integer(1001, 8999))); kind = 'sig'; accuracy = 2; break;
        case 'small-significant': number = '0.' + '0'.repeat(integer(1, 3)) + nonZeroEnd(integer(1001, 8999)); kind = 'sig'; accuracy = 2; break;
        case 'decimal-carry': number = `9.9${integer(5, 9)}`; kind = 'decimal'; accuracy = 1; break;
        case 'path-context':
            number = String(nonZeroEnd(integer(111, 989))); kind = 'nearest'; accuracy = 1;
            customPrompt = `A path is ${number} metres long. Round its length to the nearest 10 metres.${item.mode === 'choice' ? '' : ' Type the number of metres.'}`;
            break;
        default: throw new Error(`Unknown rounding type: ${item.type}`);
        }
        return prepare(roundingQuestion(number, kind, accuracy, item.mode || 'number', item.type, customPrompt), random);
    }
    const learnScreens = [
        { title: 'Rounding means finding a simpler number that is close to the one you have.', lines: ['You can round whole numbers or decimals. The ≈ sign means "is about".'], roundings: [
            { label: 'To the nearest 10', from: '38', to: '40' },
            { label: 'To the nearest 100', from: '461', to: '500' },
            { label: 'To 2 decimal places', from: '3.147', to: '3.15' }
        ] },
        { title: "Let's start by rounding 67 to the nearest 10.", lines: ['67 sits between 60 and 70. Here it is on the number line.'], line: true, notes: {
            digit: 'The ones digit is 7. That is 5 or more, so round up.',
            nearest: 'So 67 is closer to 70.'
        } },
        { title: "Now let's round 342 to the nearest 10.", lines: ['342 sits between 340 and 350. Here it is on the number line.'], line: true, base: 340, value: 342, notes: {
            digit: 'The ones digit is 2. That is less than 5, so round down.',
            nearest: 'So 342 is closer to 340.'
        } },
        { title: 'Bigger numbers work the same way.', lines: ['Say we want to round 3,486 to the nearest 10. Here it is on a number line.'], line: true, base: 3480, value: 3486, notes: {
            digit: 'The ones digit is 6. That is 5 or more, so round up.',
            nearest: 'So 3,486 is closer to 3,490.'
        } },
        { title: 'Look one digit to the right', lines: ['Find the place you are rounding to. Keep that digit, then look at the next digit.', 'For 0, 1, 2, 3 or 4, keep the last digit as it is. For 5, 6, 7, 8 or 9, round up.'], number: '367', kind: 'nearest', accuracy: 1, equations: ['367 ≈ 370'] },
        { title: "Now let's round 642 to the nearest 100.", lines: ['642 sits between 600 and 700. Here it is on the number line, counting in tens.'], line: true, base: 600, step: 10, value: 642, notes: {
            digit: 'The tens digit is 4. That is less than 5, so round down.',
            nearest: 'So 642 is closer to 600.'
        } },
        { title: "Now let's round 48,672 to the nearest 100.", lines: ['48,672 sits between 48,600 and 48,700. Here it is on the number line, counting in tens.'], line: true, base: 48600, step: 10, value: 48672, notes: {
            digit: 'The tens digit is 7. That is 5 or more, so round up.',
            nearest: 'So 48,672 is closer to 48,700.'
        } },
        { title: "Now let's round 4,682 to the nearest 1,000.", lines: ['4,682 sits between 4,000 and 5,000. Here it is on the number line, counting in hundreds.'], line: true, base: 4000, step: 100, value: 4682, notes: {
            digit: 'The hundreds digit is 6. That is 5 or more, so round up.',
            nearest: 'So 4,682 is closer to 5,000.'
        }, caption: 'Keep the zeros. Writing just 5 would make the number much too small.' },
        { title: 'Decimal places', lines: ['Decimal places count digits after the decimal point.', 'The first digit after the point is the tenths digit. The second is the hundredths digit.', 'For 2 decimal places, keep 7 in 4.276. The next digit is 6, so round up to 8.'], number: '4.276', kind: 'decimal', accuracy: 2, equations: ['4.276 ≈ 4.28'] },
        { title: 'Keep a final decimal zero', lines: ['To round 3.04 to 1 decimal place, keep the tenths digit, 0.', 'The next digit is 4, so the 0 stays. Write 3.0 to show one digit after the point.'], number: '3.04', kind: 'decimal', accuracy: 1, equations: ['3.04 ≈ 3.0'] },
        { title: 'Significant figures', lines: ['Significant figures are the digits that show how accurate a number is. Start at the first digit that is not zero.', 'In 0.004782, keep 4 and 7 for 2 significant figures. The next digit is 8, so round up. Keep the starting zeros.'], number: '0.004782', kind: 'sig', accuracy: 2, equations: ['0.004782 ≈ 0.0048'] },
        { title: 'When rounding carries', lines: ['To round 9.96 to 1 decimal place, keep the tenths digit, 9. The next digit is 6, so round up.', 'The extra 1 carries to the next column. Keep one digit after the point in the answer.'], number: '9.96', kind: 'decimal', accuracy: 1, equations: ['9.96 ≈ 10.0'] },
        { title: 'Use the original number', lines: ['Round the original number each time.', "To round 2.449 to 1 decimal place, keep 2.4. Don't round to 2.45 first. That would then round up to 2.5, which is wrong."], number: '2.449', kind: 'decimal', accuracy: 1, equations: ['2.449 ≈ 2.4'] },
        { title: 'Rounding in a real situation', lines: ['A path is 248 metres long. Round its length to the nearest 10 metres.', 'The next digit is 8, so round up. Rounding does not change the unit: the length is still in metres.'], number: '248', kind: 'nearest', accuracy: 1, equations: ['248 metres ≈ 250 metres'] }
    ];
    function text(host, tag, value, className) {
        const node = document.createElement(tag);
        node.textContent = value;
        if (className) node.className = className;
        host.append(node);
        return node;
    }
    function drawDigits(host, question, marks = 'both') {
        const { number } = question;
        const d = question;
        const row = document.createElement('div');
        row.className = 'significant-digits';
        row.setAttribute('role', 'img');
        row.setAttribute('aria-label', `Digits of ${spaced(number)}${marks === 'first' ? `; start at ${number[d.first]}` : marks === 'none' ? '' : `; keep ${digitLabel(number, d.target)}${marks === 'both' ? `; next digit ${digitLabel(number, d.decider)}` : ''}`}`);
        for (const [index, digit] of [...number].entries()) {
            const cell = text(row, 'span', '', digit === '.' ? 'significant-point' : 'significant-digit');
            cell.setAttribute('aria-hidden', 'true');
            text(cell, 'span', digit);
            if (marks === 'first' && index === d.first) {
                cell.classList.add('is-first');
                text(cell, 'small', 'Start');
            } else if (marks !== 'none' && marks !== 'first' && index === d.target) {
                cell.classList.add('is-keep');
                text(cell, 'small', 'Keep');
            } else if (marks === 'both' && index === d.decider) {
                cell.classList.add('is-look');
                text(cell, 'small', 'Look');
            }
        }
        host.append(row);
    }
    // A number line from one round number (base) to the next, drawn like the
    // negative numbers line: a grey line, ten equal steps with a tick and a
    // number at each, and a blue dot on the number. step is 1 for the nearest
    // 10, 10 for the nearest 100 and 100 for the nearest 1000. With notes, one
    // note points at the digit that decides, one at the number it rounds to.
    function drawLine(host, value, explore, onChange, readOnly, base = 60, notes = null, step = 1) {
        const format = number => number.toLocaleString('en-GB');
        // Wrap the digit that decides (the ones for step 1, the tens for step 10
        // and so on) so a note's arrow can point at it.
        const marked = number => {
            const shown = format(number);
            let fromEnd = Math.round(Math.log10(step));
            for (let i = shown.length - 1; i >= 0; i--) {
                if (!/\d/.test(shown[i])) continue;
                if (fromEnd-- === 0) return `${shown.slice(0, i)}<tspan class="rounding-decider">${shown[i]}</tspan>${shown.slice(i + 1)}`;
            }
            return shown;
        };
        const phone = window.matchMedia('(max-width: 600px)').matches;
        const top = base + 10 * step;
        const x = number => 30 + (number - base) / step * 60;
        // A number between two ticks has no label in the row, so its label sits
        // above the dot, and the line moves down to make room.
        const onTick = (value - base) % step === 0;
        const axis = onTick ? 26 : (phone ? 58 : 50);
        const lineHost = notes ? text(host, 'div', '', 'rounding-notes') : host;
        const digitNote = notes && !onTick ? text(lineHost, 'p', notes.digit, 'rounding-note rounding-note--above') : null;
        const line = document.createElement('div');
        line.className = 'rounding-line';
        line.setAttribute('role', 'img');
        let picture = `<path class="rounding-axis" d="M 15 ${axis} H 645"/>`;
        for (let mark = 0; mark <= 10; mark++) {
            // The two round numbers and the halfway number between them stand out.
            const number = base + mark * step;
            const landmark = mark % 5 === 0;
            const reach = landmark ? 12 : 7;
            picture += `<path class="rounding-tick${landmark ? ' is-landmark' : ''}" d="M ${x(number)} ${axis - reach} V ${axis + reach}"/>
                <text class="rounding-value${landmark ? ' is-landmark' : ''}" data-value="${number}" x="${x(number)}" y="${axis + (phone ? 44 : 40)}">${marked(number)}</text>`;
        }
        if (!onTick) picture += `<text class="rounding-value is-key rounding-value--above" x="${x(value)}" y="${axis - (phone ? 24 : 20)}">${marked(value)}</text>`;
        picture += `<circle class="rounding-dot" cx="${x(value)}" cy="${axis}" r="${phone ? 12 : 9}"/>`;
        line.innerHTML = `<svg viewBox="0 0 660 ${axis + (phone ? 54 : 46)}" aria-hidden="true">${picture}</svg>`;
        const dot = line.querySelector('.rounding-dot');
        const label = number => line.querySelector(`.rounding-value[data-value="${number}"]`);
        const nearest = number => number < base + 5 * step ? base : top;
        lineHost.append(line);
        const output = text(host, 'p', '', 'significant-equation rounding-line-answer');
        function update(number) {
            dot.setAttribute('cx', x(number));
            line.querySelectorAll('.rounding-value[data-value]').forEach(item => item.classList.toggle('is-key', Number(item.dataset.value) === number));
            output.textContent = `${format(number)} ≈ ${format(nearest(number))}`;
            line.setAttribute('aria-label', `${format(number)} on a line from ${format(base)} to ${format(top)}; to the nearest ${format(10 * step)} it is ${format(nearest(number))}`);
        }
        update(value);
        if (notes) {
            const digit = digitNote || text(lineHost, 'p', notes.digit, 'rounding-note rounding-note--digit');
            const nearestNote = text(lineHost, 'p', notes.nearest, 'rounding-note rounding-note--nearest');
            const valueLabel = onTick ? () => label(value) : () => line.querySelector('.rounding-value--above');
            drawArrows(lineHost, [
                [digit, () => valueLabel().querySelector('.rounding-decider')],
                [nearestNote, () => label(nearest(value))]
            ]);
        }
        if (explore) {
            const sliderLabel = text(host, 'label', 'Move the number from 60 to 70.');
            sliderLabel.htmlFor = 'number-slider';
            const slider = document.createElement('input');
            Object.assign(slider, { id: 'number-slider', type: 'range', min: '60', max: '70', step: '1', value: String(value), disabled: readOnly });
            slider.setAttribute('aria-label', 'Number on the line');
            slider.addEventListener('input', () => {
                const number = Number(slider.value);
                onChange(number);
                update(number);
            });
            host.append(slider);
        }
    }
    /* Hand-drawn arrows from each note to the thing it talks about, like the arrows
       in the place-value lesson. Each arrow leaves the right end of its note and comes
       in to its target from straight above or below. They are redrawn whenever the
       layout changes size. */
    function drawArrows(block, pairs) {
        const svgNs = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNs, 'svg');
        svg.setAttribute('class', 'rounding-notes__arrows');
        svg.setAttribute('aria-hidden', 'true');
        block.append(svg);
        function draw() {
            if (!block.isConnected) { observer.disconnect(); return; }
            const origin = block.getBoundingClientRect();
            svg.setAttribute('width', origin.width);
            svg.setAttribute('height', origin.height);
            svg.replaceChildren();
            for (const [note, findTarget] of pairs) {
                const target = findTarget();
                if (!target) continue;
                // Keep each note just left of what it points at, so its arrow
                // curves down onto the target instead of running in flat from
                // far away on a wide screen.
                // When there is no room on the left (a number near the start of
                // the line), the note sits to the right and its arrow leaves
                // from the note's left end instead.
                const targetBox = target.getBoundingClientRect();
                const targetX = targetBox.left + targetBox.width / 2 - origin.left;
                const left = targetX - note.offsetWidth - 48 >= 0;
                const lead = left
                    ? Math.min(targetX - note.offsetWidth - 48, origin.width - note.offsetWidth)
                    : Math.max(0, Math.min(targetX + 48, origin.width - note.offsetWidth));
                if (note.style.marginLeft !== `${lead}px`) note.style.marginLeft = `${lead}px`;
                const from = note.getBoundingClientRect();
                const to = target.getBoundingClientRect();
                const down = to.top > from.top;
                const sx = (left ? from.right - origin.left + 8 : from.left - origin.left - 8), sy = from.top + from.height / 2 - origin.top;
                const tx = to.left + to.width / 2 - origin.left;
                const ty = (down ? to.top - 4 : to.bottom + 4) - origin.top;
                const tip = down ? -1 : 1;
                const path = document.createElementNS(svgNs, 'path');
                path.setAttribute('d', `M ${sx} ${sy} C ${sx + (tx - sx) * 0.55} ${sy + 3}, ${tx + 2} ${sy + (ty - sy) * 0.65}, ${tx} ${ty}`
                    + ` M ${tx - 6} ${ty + 9 * tip} L ${tx} ${ty} L ${tx + 6} ${ty + 8 * tip}`);
                svg.append(path);
            }
        }
        const observer = new ResizeObserver(() => draw());
        observer.observe(block);
        requestAnimationFrame(draw);
    }
    function drawRoundings(host, roundings) {
        const list = document.createElement('ul');
        list.className = 'rounding-examples';
        for (const item of roundings) {
            const card = document.createElement('li');
            card.className = 'rounding-example';
            card.setAttribute('aria-label', `${item.from} rounded ${item.label.toLowerCase()} is ${item.to}`);
            text(card, 'span', item.label, 'rounding-example__label');
            const sum = document.createElement('span');
            sum.className = 'rounding-example__sum';
            sum.setAttribute('aria-hidden', 'true');
            text(sum, 'span', item.from, 'rounding-example__from');
            text(sum, 'span', '≈', 'rounding-example__sign');
            text(sum, 'span', item.to, 'rounding-example__to');
            card.append(sum);
            list.append(card);
        }
        host.append(list);
    }
    function drawLearn(host, index, lineValue, onChange, readOnly) {
        const screen = learnScreens[index];
        if (screen.roundings) drawRoundings(host, screen.roundings);
        if (screen.line) drawLine(host, screen.explore ? lineValue : screen.value ?? 67, screen.explore, onChange, readOnly, screen.base, screen.notes, screen.step);
        else if (screen.number) drawDigits(host, { ...screen, ...keyDigits(screen.number, screen.kind, screen.accuracy) });
        for (const equation of screen.equations || []) text(host, 'p', equation, 'significant-equation');
        for (const line of screen.after || []) text(host, 'p', line);
        if (screen.caption) text(host, 'p', screen.caption);
    }
    function drawExample(host, question, correct) {
        if (question.stage === 'context') return;
        const marks = question.stage === 'keep' ? (correct ? 'keep' : 'none') : question.stage === 'decider' ? (correct ? 'both' : 'keep') : 'both';
        drawDigits(host, question, marks);
        if (correct && question.stage === 'round') text(host, 'p', `${spaced(question.number)} ≈ ${spaced(rounded(question.number, question.kind, question.accuracy))}`, 'significant-equation');
    }
    window.Rounding = { roundSig, roundToPower, rounded, accuracyText, keyDigits, place, digitLabel, roundingQuestion, digitQuestion, guided, exampleCount, examples, checks, practiceTypes, pick, prepare, generate, learnScreens, drawLearn, drawLine, drawExample };
})();
