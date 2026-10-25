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
    const guided = [
        ['2748', 'nearest', 2, 'number'], ['4.276', 'decimal', 2, 'choice'],
        ['0.004782', 'sig', 2, 'choice'], ['9.964', 'decimal', 1, 'number']
    ];
    function examples() {
        return guided.flatMap(([number, kind, accuracy, input]) => [digitQuestion(number, kind, accuracy, 'keep'), digitQuestion(number, kind, accuracy, 'decider'), roundingQuestion(number, kind, accuracy, input)]);
    }
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
        { title: 'What is rounding?', lines: ['Rounding replaces a number with a nearby, simpler number.', 'To round to the nearest 10, choose the closest ten. 67 is closer to 70 than to 60.'], line: true, caption: 'The ≈ sign means about the same as.' },
        { title: 'Which ten is nearest?', lines: ['Move the number along the line. Watch which ten is closest.', '65 is halfway between 60 and 70. At halfway, round up.'], line: true, explore: true },
        { title: 'Look one digit to the right', lines: ['Find the place you are rounding to. Keep that digit, then look at the next digit.', 'For 0, 1, 2, 3 or 4, keep the last digit as it is. For 5, 6, 7, 8 or 9, round up.'], number: '367', kind: 'nearest', accuracy: 1, equations: ['367 ≈ 370'] },
        { title: 'Round to the nearest 100', lines: ['To round 642 to the nearest 100, keep 6 in the hundreds place.', 'The next digit is 4, so keep the 6. Fill the tens and ones places with zeros.'], number: '642', kind: 'nearest', accuracy: 2, equations: ['642 ≈ 600'] },
        { title: 'Whole-number zeros keep the size', lines: ['The same rule works for hundreds and thousands.', 'To round 4,382 to the nearest 1,000, keep 4. The next digit is 3, so 4 stays. Fill the other places with zeros.'], number: '4382', kind: 'nearest', accuracy: 3, equations: ['4,382 ≈ 4,000'], caption: 'Writing just 4 would make the number much too small.' },
        { title: 'Decimal places', lines: ['Decimal places count digits after the decimal point.', 'The first digit after the point is the tenths digit. The second is the hundredths digit.', 'For 2 decimal places, keep 7 in 4.276. The next digit is 6, so round up to 8.'], number: '4.276', kind: 'decimal', accuracy: 2, equations: ['4.276 ≈ 4.28'] },
        { title: 'Keep a final decimal zero', lines: ['To round 3.04 to 1 decimal place, keep the tenths digit, 0.', 'The next digit is 4, so the 0 stays. Write 3.0 to show one digit after the point.'], number: '3.04', kind: 'decimal', accuracy: 1, equations: ['3.04 ≈ 3.0'] },
        { title: 'A short recap of significant figures', lines: ['Significant figures are the digits that show how accurate a number is. Start at the first digit that is not zero.', 'In 0.004782, keep 4 and 7 for 2 significant figures. The next digit is 8, so round up. Keep the starting zeros.'], number: '0.004782', kind: 'sig', accuracy: 2, equations: ['0.004782 ≈ 0.0048'] },
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
    function drawLine(host, value, explore, onChange, readOnly) {
        const line = document.createElement('div');
        line.className = 'rounding-line';
        line.setAttribute('role', 'img');
        const ticks = [60, 65, 70].map(number => {
            const tick = text(line, 'span', '', 'rounding-tick');
            tick.style.left = `${(number - 60) * 10}%`;
            text(tick, 'span', String(number));
            return tick;
        });
        const marker = text(line, 'span', '', 'rounding-marker');
        host.append(line);
        const output = text(host, 'p', '', 'significant-equation');
        function update(number) {
            marker.textContent = number;
            marker.style.left = `${(number - 60) * 10}%`;
            const answer = number < 65 ? 60 : 70;
            ticks[0].classList.toggle('is-nearest', answer === 60);
            ticks[2].classList.toggle('is-nearest', answer === 70);
            output.textContent = `${number} ≈ ${answer}`;
            line.setAttribute('aria-label', `${number} on a line from 60 to 70; nearest ten ${answer}`);
        }
        update(value);
        if (explore) {
            const label = text(host, 'label', 'Move the number from 60 to 70.');
            label.htmlFor = 'number-slider';
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
    function drawLearn(host, index, lineValue, onChange, readOnly) {
        const screen = learnScreens[index];
        if (screen.line) drawLine(host, screen.explore ? lineValue : 67, screen.explore, onChange, readOnly);
        else drawDigits(host, { ...screen, ...keyDigits(screen.number, screen.kind, screen.accuracy) });
        for (const equation of screen.equations || []) text(host, 'p', equation, 'significant-equation');
        if (screen.caption) text(host, 'p', screen.caption);
    }
    function drawExample(host, question, correct) {
        const marks = question.stage === 'keep' ? (correct ? 'keep' : 'none') : question.stage === 'decider' ? (correct ? 'both' : 'keep') : 'both';
        drawDigits(host, question, marks);
        if (correct && question.stage === 'round') text(host, 'p', `${spaced(question.number)} ≈ ${spaced(rounded(question.number, question.kind, question.accuracy))}`, 'significant-equation');
    }
    window.Rounding = { roundSig, roundToPower, rounded, accuracyText, keyDigits, place, digitLabel, roundingQuestion, digitQuestion, guided, examples, checks, practiceTypes, pick, prepare, generate, learnScreens, drawLearn, drawExample };
})();
