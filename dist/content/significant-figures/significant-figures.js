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
    function round(number, n, mode = 'nearest') {
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

    function roundingQuestion(number, n, input = 'number', questionType = 'round') {
        number = clean(number);
        const answer = round(number, n);
        const d = digits(number, n);
        const next = number[d.decider];
        const feedback = `The next digit is ${next}, so ${Number(next) >= 5 ? 'round up' : 'keep the last digit as it is'}. ${spaced(number)} ≈ ${spaced(answer)}`;
        const missingZeros = answer.includes('.') ? null : answer.replace(/0+$/, '');
        const mistakes = [
            ...(answer.includes('.') && answer.endsWith('0') ? [[answer.slice(0, -1), `Keep the final zero after the decimal point to show ${figures(n)}.`]] : []),
            [round(number, n, 'down'), 'That drops the later digits without rounding up. The next digit is 5 or more.'],
            [round(number, n, 'up'), 'That rounds up. The next digit is less than 5, so keep the last digit as it is.'],
            ...(missingZeros ? [[missingZeros, 'That drops the zeros that keep the number the right size. Keep those whole-number places.']] : []),
            [round(number, n + 1), `That keeps too many significant figures. Keep ${n}.`],
            ...(n > 1 ? [[round(number, n - 1), `That keeps too few significant figures. Keep ${n}.`]] : []),
            [Number(number).toFixed(n), 'That counts decimal places from the point. Start counting at the first digit that is not zero.'],
            ...(answer === '10' ? [['10.0', 'The extra decimal zero shows three significant figures. This answer needs two.']] : [])
        ].filter(([value], index, list) => value !== answer && list.findIndex(([other]) => other === value) === index);
        let prompt = `Round ${spaced(number)} to ${figures(n)}.`;
        if (input === 'number' && answer.includes('.') && answer.endsWith('0')) {
            prompt += ' Keep the zero at the end after the decimal point.';
        }
        const question = { number, n, ...d, stage: 'round', questionType, input, prompt, feedback, exact: true };
        if (input === 'choice') question.options = [option(spaced(answer), feedback, true), ...mistakes.slice(0, 3).map(([value, message]) => option(spaced(value), message))];
        else {
            question.answer = answer;
            question.rules = mistakes.map(([value, message]) => ({ value, feedback: message }));
            question.fallback = feedback;
        }
        return question;
    }

    function digitQuestion(number, n, stage) {
        const d = digits(number, n);
        const correct = stage === 'keep' ? d.target : d.decider;
        const candidates = stage === 'keep'
            ? [d.significant[n - 2], d.decider, d.first - 1, d.first, ...d.indexes]
            : [d.target, d.first, d.significant[n + 1], ...d.indexes];
        const wrong = candidates.filter((index, i, list) => index !== undefined && d.indexes.includes(index) && index !== correct && list.indexOf(index) === i).slice(0, 3);
        const feedback = stage === 'keep'
            ? `The last digit to keep is ${number[correct]} in the ${place(number, correct)}. Count ${figures(n)} from ${number[d.first]}.`
            : `The next digit is ${number[correct]} in the ${place(number, correct)}. It comes straight after the digit to keep.`;
        return {
            number, n, ...d, stage, questionType: stage === 'keep' ? 'keep-digit' : 'deciding-digit', input: 'choice',
            prompt: `Round ${spaced(number)} to ${figures(n)}. ${stage === 'keep' ? 'Which is the last digit to keep?' : 'Which digit comes straight after the digit to keep?'}`,
            options: [option(digitLabel(number, correct), feedback, true, correct), ...wrong.map(index => option(digitLabel(number, index),
                stage === 'keep'
                    ? (index < d.first ? `The zero in the ${place(number, index)} is before the first significant figure. Start at ${number[d.first]}.`
                        : `The ${place(number, index)} digit is number ${d.significant.indexOf(index) + 1} when you count from the first significant figure. Count to ${n}.`)
                    : `The ${place(number, index)} digit is not straight after the digit to keep. Look one digit to the right of ${number[d.target]}.`, false, index))]
        };
    }
    const guided = [
        ['0.0283', 1, 'choice'], ['147921', 2, 'number'],
        ['9.964', 2, 'choice'], ['15.03', 3, 'number']
    ];
    function examples() {
        return guided.flatMap(([number, n, input]) => [digitQuestion(number, n, 'keep'), digitQuestion(number, n, 'decider'), roundingQuestion(number, n, input)]);
    }
    function checks() {
        return [
            { questionType: 'error', input: 'choice', prompt: 'Amir says 0.0283 to 2 significant figures is 0.03. Which explanation corrects him?',
                options: [
                    option('Start at 2. Keep 2 and 8. The next digit is 3, so the answer is 0.028', 'Count from 2. Keep two significant figures, then use the next digit.', true),
                    option('Count two digits after the point. The answer is 0.03', 'That counts decimal places. Significant figures start at the first digit that is not zero.'),
                    option('Count the starting zeros. The answer is 0.00', 'Zeros before the first digit that is not zero do not count.'),
                    option('Keep 2 and 8, then round up to 0.029', 'The next digit is 3. It is less than 5, so do not round up.')
                ] },
            roundingQuestion('0.00726', 2), roundingQuestion('147921', 2),
            roundingQuestion('30560', 3, 'choice'), roundingQuestion('15.03', 3, 'number', 'trailing-zero')
        ];
    }
    const practiceTypes = ['small-two', 'whole-one', 'halfway', 'whole-two', 'small-one', 'inside-zero', 'trailing-zero', 'whole-down', 'carry', 'double-round'];
    function pick(random) {
        const { randomInt } = window.Maths1to9LessonEngine;
        const groups = [['small-two', 'small-one'], ['whole-one', 'whole-two', 'whole-down'], ['halfway', 'inside-zero'], ['trailing-zero'], ['carry'], ['double-round']];
        return groups.map((group, i) => ({ type: group[randomInt(0, group.length - 1, random)], mode: i % 2 === 0 ? 'choice' : 'number', seed: randomInt(0, 4294967295, random) }));
    }
    function prepare(question, random) {
        return question.options ? { ...question, options: window.Maths1to9LessonEngine.shuffle(question.options, random) } : { ...question };
    }
    function generate(item, random) {
        const { randomInt } = window.Maths1to9LessonEngine;
        const integer = (min, max) => randomInt(min, max, random);
        const nonZeroEnd = value => value % 10 === 0 ? value + 1 : value;
        let number, n;
        switch (item.type) {
        case 'small-two': number = '0.' + '0'.repeat(integer(1, 3)) + nonZeroEnd(integer(1001, 8999)); n = 2; break;
        case 'whole-one': number = String(integer(12, 98)); n = 1; break;
        case 'halfway': number = String(integer(2, 8) * 100 + 50); n = 1; break;
        case 'whole-two': number = String(nonZeroEnd(integer(1001, 8999))); n = 2; break;
        case 'small-one': number = '0.' + '0'.repeat(integer(1, 3)) + nonZeroEnd(integer(11, 89)); n = 1; break;
        case 'inside-zero': number = `${integer(1, 8)}0${integer(5, 9)}`; n = 2; break;
        case 'trailing-zero': number = `${integer(10, 89)}.0${integer(1, 4)}`; n = 3; break;
        case 'whole-down': number = `${integer(1, 9)}${integer(1, 8)}${integer(0, 4)}${integer(1, 9)}`; n = 2; break;
        case 'carry': number = ['9.96', '9.97', '99.6', '0.0996', '0.9996'][integer(0, 4)]; n = 2; break;
        case 'double-round': number = `${integer(1, 8)}.${integer(1, 8)}49`; n = 2; break;
        default: throw new Error(`Unknown significant figures type: ${item.type}`);
        }
        return prepare(roundingQuestion(number, n, item.mode || 'number', item.type), random);
    }

    const learnScreens = [
        { title: 'What is a significant figure?', lines: ['Significant figures are the digits that show how accurate a number is.', 'Start at the first digit that is not zero. Count from left to right.'], number: '0.00283', n: 1, mark: 'first', caption: 'Start at 2. The significant figures here are 2, 8 and 3. The zeros before 2 do not count.' },
        { title: 'The next digit decides', lines: ['To round to 2 significant figures, count 2 and 8. Keep 8 as the last digit.', 'The deciding digit is the digit straight after it. Here it is 3. If it is 4 or less, keep the last digit as it is.'], number: '0.0283', n: 2, equations: ['0.0283 ≈ 0.028'] },
        { title: 'Round up for 5 or more', lines: ['The deciding digit is 7. It is 5 or more, so round the 4 up to 5.', 'Keep the starting zeros in the answer. They keep the number the right size.'], number: '0.0047', n: 1, equations: ['0.0047 ≈ 0.005'] },
        { title: 'A zero between other digits counts', lines: ['In 30,560, count 3, 0 and 5 as the first three significant figures.', 'The next digit is 6, so round 5 up to 6. Fill the last two whole-number places with zeros.'], number: '30560', n: 3, equations: ['30,560 ≈ 30,600'] },
        { title: 'Significant figures or decimal places?', lines: ['Decimal places count digits after the decimal point. Significant figures start at the first digit that is not zero.', '0.0283 has four decimal places and three significant figures.'], number: '0.0283', n: 1, equations: ['0.0283 ≈ 0.03  (1 significant figure)'] },
        { title: 'Keep the number the right size', lines: ['To round 5,480,217 to 2 significant figures, keep 5 and 4.', 'The next digit is 8, so round up. Fill the remaining whole-number places with zeros.'], number: '5480217', n: 2, equations: ['5,480,217 ≈ 5,500,000'], caption: '55 is much too small. The zeros keep the answer close to the original number.' },
        { title: 'Sometimes a final zero matters', lines: ['To round 15.03 to 3 significant figures, keep 1, 5 and 0.', 'The next digit is 3, so the 0 stays. Keep that zero after the decimal point to show three significant figures.'], number: '15.03', n: 3, equations: ['15.03 ≈ 15.0'], caption: '15 and 15.0 have the same value. Here, 15.0 shows the three significant figures asked for.' },
        { title: 'Take care when rounding a 9', lines: ['To round 9.96 to 2 significant figures, keep both 9s. The next digit is 6, so round up.', 'The extra 1 carries to the next column. Write 10 for this answer. An extra decimal zero would show three significant figures.'], number: '9.96', n: 2, equations: ['9.96 ≈ 10'] },
        { title: 'Use the original number', lines: ['Round the original number each time.', 'To round 2.449 to 2 significant figures, the next digit is 4. Keep 2.4.', "Don't round to 2.45 first. That would then round up to 2.5, which is wrong."], number: '2.449', n: 2, equations: ['2.449 ≈ 2.4'] }
    ];
    function text(host, tag, value, className) {
        const element = document.createElement(tag);
        element.textContent = value;
        if (className) element.className = className;
        host.append(element);
        return element;
    }
    function drawDigits(host, number, n, marks = 'both') {
        const d = digits(number, n);
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
    function drawLearn(host, index) {
        const screen = learnScreens[index];
        drawDigits(host, screen.number, screen.n, screen.mark || 'both');
        for (const equation of screen.equations || []) text(host, 'p', equation, 'significant-equation');
        if (screen.caption) text(host, 'p', screen.caption);
    }
    function drawExample(host, question, correct) {
        const marks = question.stage === 'keep' ? (correct ? 'keep' : 'none') : question.stage === 'decider' ? (correct ? 'both' : 'keep') : 'both';
        drawDigits(host, question.number, question.n, marks);
        if (correct && question.stage === 'round') {
            text(host, 'p', `${spaced(question.number)} ≈ ${spaced(round(question.number, question.n))}`, 'significant-equation');
        }
    }
    window.SignificantFigures = { round, digits, place, digitLabel, figures, spaced, roundingQuestion, digitQuestion, guided, examples, checks, practiceTypes, pick, prepare, generate, learnScreens, drawLearn, drawExample };
})();
