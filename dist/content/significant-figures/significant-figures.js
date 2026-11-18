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

    // Rounding to a place, copied from the Rounding lesson so the screens and
    // questions moved here work exactly as they did there.
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
        return roundToPower(number, kind === 'decimal' ? -accuracy : accuracy, mode);
    }
    function accuracyText(kind, accuracy) {
        if (kind === 'decimal') return `${accuracy} decimal ${accuracy === 1 ? 'place' : 'places'}`;
        if (accuracy === 0) return 'the nearest whole number';
        if (accuracy === 6) return 'the nearest million';
        return `the nearest ${spaced(String(10 ** accuracy))}`;
    }
    function keyDigits(number, kind, accuracy) {
        const d = digits(number, 1);
        const point = number.includes('.') ? number.indexOf('.') : number.length;
        const power = kind === 'decimal' ? -accuracy : accuracy;
        const target = power >= 0 ? point - 1 - power : point - power;
        return { ...d, target, decider: d.indexes[d.indexes.indexOf(target) + 1] };
    }
    // A round to a place (nearest 1,000, 2 decimal places, the nearest whole
    // number), with the Rounding lesson's mistakes and feedback.
    function placeQuestion(number, kind, accuracy, input = 'number', questionType = kind, customPrompt) {
        number = clean(number);
        const d = keyDigits(number, kind, accuracy);
        const answer = rounded(number, kind, accuracy);
        const next = number[d.decider];
        const feedback = `The next digit is ${next}, so ${Number(next) >= 5 ? 'round up' : 'keep the last digit as it is'}. ${spaced(number)} ≈ ${spaced(answer)}`;
        const wrongAccuracy = kind === 'decimal' ? accuracy + 1 : Math.max(0, accuracy - 1);
        const otherAccuracy = kind === 'decimal' ? Math.max(0, accuracy - 1) : accuracy + 1;
        const wrongKind = kind === 'decimal' && otherAccuracy === 0 ? 'nearest' : kind;
        const mistakes = [
            ...(answer.includes('.') && answer.endsWith('0') ? [[answer.slice(0, -1).replace(/\.$/, ''), 'Keep the final zero after the decimal point. It shows the accuracy asked for.']] : []),
            [rounded(number, kind, accuracy, 'down'), 'That drops the later digits without rounding up. The next digit is 5 or more.'],
            [rounded(number, kind, accuracy, 'up'), 'That rounds up. The next digit is less than 5, so keep the last digit as it is.'],
            ...(!answer.includes('.') && answer.endsWith('0') ? [[answer.replace(/0+$/, ''), 'That drops the zeros that keep the number the right size. Keep those whole-number places.']] : []),
            [rounded(number, kind, wrongAccuracy), `That rounds to a different place. The question asks for ${accuracyText(kind, accuracy)}.`],
            [rounded(number, wrongKind, otherAccuracy), `That uses a different accuracy. Use ${accuracyText(kind, accuracy)}.`],
            [number, 'That leaves the original number unchanged. Round it to the place asked for.']
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

    // The significant figures questions moved here from the Rounding lesson. They keep
    // that lesson's mistakes and feedback, so they work exactly as they did there.
    function sigRoundingQuestion(number, n, input = 'number', questionType = 'round', customPrompt) {
        number = clean(number);
        const d = digits(number, n);
        const answer = round(number, n);
        const next = number[d.decider];
        const feedback = `The next digit is ${next}, so ${Number(next) >= 5 ? 'round up' : 'keep the last digit as it is'}. ${spaced(number)} ≈ ${spaced(answer)}`;
        const mistakes = [
            ...(answer.includes('.') && answer.endsWith('0') ? [[answer.slice(0, -1).replace(/\.$/, ''), 'Keep the final zero after the decimal point. It shows the accuracy asked for.']] : []),
            [round(number, n, 'down'), 'That drops the later digits without rounding up. The next digit is 5 or more.'],
            [round(number, n, 'up'), 'That rounds up. The next digit is less than 5, so keep the last digit as it is.'],
            ...(!answer.includes('.') && answer.endsWith('0') ? [[answer.replace(/0+$/, ''), 'That drops the zeros that keep the number the right size. Keep those whole-number places.']] : []),
            [round(number, n + 1), `That rounds to a different place. The question asks for ${figures(n)}.`],
            ...(n > 1 ? [[round(number, n - 1), `That uses a different accuracy. Use ${figures(n)}.`]] : []),
            [number, 'That leaves the original number unchanged. Round it to the place asked for.'],
            [Number(number).toFixed(n), 'That counts decimal places from the point. Start counting at the first digit that is not zero.']
        ].filter(([value], index, list) => value !== answer && list.findIndex(([other]) => other === value) === index);
        let prompt = customPrompt || `Round ${spaced(number)} to ${figures(n)}.`;
        if (input === 'number' && answer.includes('.') && answer.endsWith('0')) {
            const zeros = answer.match(/0+$/)[0].length > 1 ? 'zeros' : 'zero';
            prompt += ` Keep the ${zeros} at the end after the decimal point.`;
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
    // The one-step examples moved here from the Rounding lesson, word for word.
    const movedExamples = [['6742', 2], ['0.0583', 1], ['304519', 3], ['0.0038264', 3], ['0.61749', 2]];

    function contextStep(questionType, prompt, answer, feedback, rules = []) {
        return {
            stage: 'context', questionType, input: 'number', exact: false,
            prompt, answer, feedback, fallback: feedback,
            rules: rules.map(([value, message]) => ({ value, feedback: message }))
        };
    }

    function countExample() {
        return contextStep('sig-count', 'How many significant figures does 0.250 show?', '3',
            'Start at the 2. The figures are 2, 5 and the final 0, so 3 significant figures.', [
                ['2', 'The final 0 counts. It shows the number is accurate to 3 figures.'],
                ['4', "The 0 before the point doesn't count. Start at the first digit that isn't zero."]
            ]);
    }

    // The two place-rounding examples moved here from the Rounding lesson.
    const placeExamples = [['26.48', 'nearest', 0], ['3.997', 'decimal', 2]];

    const exampleCount = guided.length + movedExamples.length + placeExamples.length + 1;
    function examples() {
        const guidedSteps = guided.flatMap(([number, n, input], index) => [
            digitQuestion(number, n, 'keep'), digitQuestion(number, n, 'decider'), roundingQuestion(number, n, input)
        ].map((question, step) => ({ ...question, example: index + 1, step: step + 1, steps: 3 })));
        const oneStep = [
            ...movedExamples.map(([number, n]) => ({
                ...sigRoundingQuestion(number, n, 'number'), showDigitsAfterAnswer: true
            })),
            countExample(),
            ...placeExamples.map(([number, kind, accuracy]) => ({
                ...placeQuestion(number, kind, accuracy, 'number'), showDigitsAfterAnswer: true
            }))
        ].map((question, index) => ({ ...question, example: guided.length + index + 1, step: 1, steps: 1 }));
        return [...guidedSteps, ...oneStep];
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
            roundingQuestion('30560', 3, 'choice'), roundingQuestion('15.03', 3, 'number', 'trailing-zero'),
            // The three decimal-place checks moved here from the Rounding lesson.
            placeQuestion('12.64', 'decimal', 1, 'choice'),
            { questionType: 'error', input: 'choice', prompt: 'Amir says 4.95 rounds to 4.9 at 1 decimal place. Which explanation corrects him?', options: [
                option('The 5 rounds the tenths up, giving 5.0', 'The hundredths digit is 5. Round up and keep one decimal place.', true),
                option('Keep 4.9 because the tenths digit is already 9', 'A 9 can still round up. The extra 1 carries to the next column.'),
                option('Round to 4 because only whole numbers can be rounded', 'Decimals can be rounded too. Keep the tenths place.'),
                option('Write 5 because the zero after the point does not matter', 'Write 5.0 to show the one decimal place asked for.')
            ] },
            placeQuestion('1.049', 'decimal', 1, 'number', 'context', 'A bottle holds 1.049 litres. Round this directly to 1 decimal place.')
        ];
    }
    const practiceGroups = [
        { kind: 'small', types: ['small-two', 'small-one'] },
        { kind: 'whole', types: ['whole-one', 'whole-two', 'whole-down'] },
        { kind: 'halfway', types: ['halfway', 'inside-zero'] },
        { kind: 'trailing-zero', types: ['trailing-zero'] },
        { kind: 'carry', types: ['carry'] },
        { kind: 'double-round', types: ['double-round'] },
        // The three groups moved here from the Rounding lesson.
        { kind: 'whole-significant', types: ['whole-significant', 'sig-three-zero'] },
        { kind: 'small-significant', types: ['small-significant', 'sig-one-small', 'sig-three-small', 'sig-no-lead'] },
        { kind: 'sig-count', types: ['sig-count'] },
        // The seven types moved here from the Rounding lesson.
        { kind: 'place-rounding', types: ['one-decimal', 'decimal-zero', 'decimal-carry', 'two-decimals', 'whole-number', 'carry-two', 'round-down'] }
    ];
    const practiceTypes = practiceGroups.flatMap(group => group.types);

    function pick(random) {
        const { randomInt, shuffle } = window.Maths1to9LessonEngine;
        const picks = practiceGroups.map(group => ({
            group, type: group.types[randomInt(0, group.types.length - 1, random)]
        }));
        const candidates = shuffle(picks, random);

        // Backtrack if a legal next card would leave no way to place the remaining cards.
        function order(remaining, ordered) {
            if (!remaining.length) return ordered;
            const last = ordered.at(-1)?.group;
            const previous = ordered.at(-2)?.group;
            for (const candidate of remaining) {
                const { group } = candidate;
                if (group === last || (group.kind === last?.kind && group.kind === previous?.kind)) continue;
                const result = order(remaining.filter(item => item !== candidate), [...ordered, candidate]);
                if (result) return result;
            }
            return null;
        }

        return order(candidates, []).map(({ type }, index) => ({
            type, mode: index % 2 === 0 ? 'choice' : 'number', seed: randomInt(0, 4294967295, random)
        }));
    }
    function prepare(question, random) {
        return question.options ? { ...question, options: window.Maths1to9LessonEngine.shuffle(question.options, random) } : { ...question };
    }
    function practiceContext(item, prompt, answer, feedback, mistakes, random) {
        const seen = new Set([answer]);
        const rules = mistakes.filter(([value]) => {
            if (seen.has(value)) return false;
            seen.add(value);
            return true;
        });
        if (item.mode === 'choice' && rules.length === 3) {
            return prepare({
                questionType: item.type, input: 'choice', prompt,
                options: [option(spaced(answer), feedback, true),
                    ...rules.map(([value, message]) => option(spaced(value), message))]
            }, random);
        }
        return contextStep(item.type, prompt, String(answer), feedback,
            rules.map(([value, message]) => [String(value), message]));
    }

    function countSignificantFigures(item, integer, random) {
        const a = integer(1, 9);
        const b = integer(1, 9);
        const firstOnly = 'You have counted only the first significant figure. Count every digit after it as well.';
        const middleZero = 'A zero between significant figures counts too.';
        const point = 'The decimal point is not a digit. Do not count it.';
        const leadingZeros = "Zeros before the first non-zero digit don't count.";
        const patterns = [
            [`0.${a}${b}`, 2, [[1, firstOnly], [3, leadingZeros], [4, point]]],
            [`0.${a}0${b}`, 3, [[1, firstOnly], [2, middleZero], [4, leadingZeros]]],
            [`${a}.0${b}`, 3, [[1, 'Count the digits after the point as well as the ones digit.'], [2, middleZero], [4, point]]],
            [`0.0${a}${b}`, 2, [[1, firstOnly], [3, 'Start at the first non-zero digit, not the first decimal place.'], [4, leadingZeros]]],
            [`${a}0${b}`, 3, [[0, 'Whole numbers have significant figures too.'], [1, firstOnly], [2, middleZero]]]
        ];
        const [number, answer, rules] = patterns[integer(0, patterns.length - 1)];
        return practiceContext(item, `How many significant figures does ${number} show?`, answer,
            `Start at the first digit that isn't zero. ${number} shows ${figures(answer)}.`, rules, random);
    }

    // The round-down question moved here from the Rounding lesson: its prices
    // are decimals.
    function divisionText(total, size) {
        const scaled = total * 1000;
        const truncated = Math.floor(scaled / size) / 1000;
        return `${truncated}${scaled % size ? '…' : '.'}`;
    }

    function roundDownQuestion(item, integer, random) {
        const pounds = integer(10, 40);
        const budget = pounds * 100;
        const prices = Array.from({ length: 77 }, (_, index) => 115 + index * 5)
            .filter(price => budget % price !== 0);
        const price = prices[integer(0, prices.length - 1)];
        const money = pence => `£${(pence / 100).toFixed(2)}`;
        const product = ['pen', 'ticket', 'notebook'][integer(0, 2)];
        const quotient = budget / price;
        const answer = Math.floor(quotient);
        const next = answer + 1;
        return practiceContext(item,
            `You have £${pounds}. Each ${product} costs ${money(price)}. ${pounds} ÷ ${(price / 100).toFixed(2)} = ${divisionText(budget, price)} What is the greatest number you can buy?`,
            answer, `${answer} × ${money(price)} = ${money(answer * price)}. ${next} cost ${money(next * price)}, which is more than £${pounds}.`, [
                [next, `That many cost more than £${pounds}. Round down.`],
                [Math.round(quotient) === answer ? next + 1 : Math.round(quotient), 'Here you always round down, even if the decimal is big.'],
                [Math.round(quotient * 10) / 10, "You can't buy part of one. Give a whole number."]
            ], random);
    }

    function generate(item, random) {
        const { randomInt } = window.Maths1to9LessonEngine;
        const integer = (min, max) => randomInt(min, max, random);
        const nonZeroEnd = value => value % 10 === 0 ? value + 1 : value;
        // A moved question falls back to a typed answer when there are too few wrong choices.
        const moved = (number, n) => {
            const question = sigRoundingQuestion(number, n, item.mode || 'number', item.type);
            if (question.input === 'choice' && question.options.length < 4) return sigRoundingQuestion(number, n, 'number', item.type);
            return prepare(question, random);
        };
        // A moved place-rounding question falls back to a typed answer when there
        // are too few wrong choices, exactly as it did in the Rounding lesson.
        const place = (number, kind, accuracy) => {
            const question = placeQuestion(number, kind, accuracy, item.mode || 'number', item.type);
            if (question.input === 'choice' && question.options.length < 4) return placeQuestion(number, kind, accuracy, 'number', item.type);
            return prepare(question, random);
        };
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
        case 'whole-significant': return moved(String(nonZeroEnd(integer(1001, 8999))), 2);
        case 'small-significant': return moved('0.' + '0'.repeat(integer(1, 3)) + nonZeroEnd(integer(1001, 8999)), 2);
        case 'sig-three-zero': return moved(`${integer(1, 9)}0${integer(0, 9)}${integer(1, 9)}${String(integer(0, 99)).padStart(2, '0')}`, 3);
        case 'sig-one-small': return moved(`0.${'0'.repeat(integer(1, 2))}${integer(1, 9)}${integer(1, 9)}`, 1);
        case 'sig-three-small': return moved(`0.00${nonZeroEnd(integer(10000, 99999))}`, 3);
        case 'sig-no-lead': return moved(`0.${nonZeroEnd(integer(10000, 99999))}`, 2);
        case 'sig-count': return countSignificantFigures(item, integer, random);
        case 'round-down': return roundDownQuestion(item, integer, random);
        case 'one-decimal': return place(`${integer(1, 8)}.${integer(1, 9)}${integer(1, 9)}`, 'decimal', 1);
        case 'decimal-zero': return place(`${integer(1, 8)}.0${integer(1, 4)}`, 'decimal', 1);
        case 'decimal-carry': return place(`9.9${integer(5, 9)}`, 'decimal', 1);
        case 'two-decimals': return place(`${integer(1, 8)}.${integer(1, 9)}${integer(0, 9)}${integer(1, 9)}`, 'decimal', 2);
        case 'whole-number': return place(`${integer(10, 98)}.${integer(1, 9)}${integer(1, 9)}`, 'nearest', 0);
        case 'carry-two': return place(`${integer(1, 8)}.99${integer(5, 9)}`, 'decimal', 2);
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
        { title: 'Use the original number', lines: ['Round the original number each time.', 'To round 2.449 to 2 significant figures, the next digit is 4. Keep 2.4.', "Don't round to 2.45 first. That would then round up to 2.5, which is wrong."], number: '2.449', n: 2, equations: ['2.449 ≈ 2.4'] },
        // The six significant figures screens moved here from the Rounding lesson.
        { title: 'Significant figures', lines: ['Significant figures are the digits that show how accurate a number is. Start at the first digit that is not zero.', 'In 0.004782, keep 4 and 7 for 2 significant figures. The next digit is 8, so round up. Keep the starting zeros.'], number: '0.004782', n: 2, equations: ['0.004782 ≈ 0.0048'] },
        {
            title: 'Rounding to significant figures is rounding to a place.',
            prompt: 'Round 48,672 to 2 significant figures.',
            lines: [
                'Start at the 4. The 2nd significant figure is the 8, in the thousands place.',
                'So this is the same as rounding to the nearest 1,000. The next digit is 6, so round up.',
                'Fill the places after it with zeros so the number stays the right size.'
            ],
            number: '48672', n: 2, tap: 'decider', equations: ['48,672 ≈ 49,000']
        },
        {
            title: 'Zeros at the start of a decimal are not significant.',
            prompt: 'Round 0.0467 to 1 significant figure.',
            lines: [
                'Skip the zeros at the start: the first significant figure is the 4.',
                'The next digit is 6, so the 4 goes up to 5. Keep the zeros at the start.'
            ],
            number: '0.0467', n: 1, tap: 'decider', equations: ['0.0467 ≈ 0.05']
        },
        {
            title: 'A zero between other digits is significant.',
            prompt: 'Round 507,684 to 3 significant figures.',
            lines: [
                'The figures are 5, 0, 7. The 0 counts because it sits between the 5 and the 7.',
                'The next digit is 6, so the 7 goes up to 8. Fill the rest with zeros.'
            ],
            number: '507684', n: 3, tap: 'decider', equations: ['507,684 ≈ 508,000']
        },
        {
            title: 'The 0 before the decimal point is not significant.',
            prompt: 'A calculator shows 0.384726. Round it to 2 significant figures.',
            lines: ["The 0 before the point doesn't count. The figures are 3 and 8. The next digit is 4, so the 8 stays."],
            number: '0.384726', n: 2, tap: 'decider', equations: ['0.384726 ≈ 0.38']
        },
        {
            title: 'A zero at the end of a decimal shows how accurate it is.',
            prompt: "0.73 and 0.730 are the same number, but they don't show the same accuracy.",
            lines: ['0.73 has 2 significant figures. 0.730 has 3: the final 0 counts.'],
            number: '0.730', n: 3, tap: 'last', mark: 'first',
            equations: ['0.730 → 3 significant figures']
        },
        // The seven place-rounding screens moved here from the Rounding lesson.
        { title: "Now let's round 46,728 to the nearest 1,000.", lines: ['46,728 sits between 46,000 and 47,000. Here it is on the number line, counting in hundreds.'], line: true, base: 46000, step: 100, value: 46728, tap: 'end', labels: 'landmarks', notes: {
            digit: 'The hundreds digit is 7. That is 5 or more, so round up.',
            nearest: 'So 46,728 is closer to 47,000.'
        } },
        { title: "Now let's round 3.47 to 1 decimal place.", lines: ['1 decimal place means 1 digit after the decimal point. So 3.47 sits between 3.4 and 3.5. Here it is on the number line, counting in steps of 0.01.'], line: true, base: 3.4, step: 0.01, value: 3.47, tap: 'end', labels: 'landmarks', notes: {
            digit: 'The next digit is 7. That is 5 or more, so round up.',
            nearest: 'So 3.47 is closer to 3.5.'
        } },
        { title: 'When rounding carries', lines: ['To round 9.96 to 1 decimal place, keep the tenths digit, 9. The next digit is 6, so round up.', 'The extra 1 carries to the next column. Keep one digit after the point in the answer.'], number: '9.96', kind: 'decimal', accuracy: 1, equations: ['9.96 ≈ 10.0'] },
        { title: "Now let's round 4.276 to 2 decimal places.", lines: ['2 decimal places means 2 digits after the decimal point. So 4.276 sits between 4.27 and 4.28. Here it is on the number line, counting in steps of 0.001.'], line: true, base: 4.27, step: 0.001, value: 4.276, tap: 'end', labels: 'landmarks', notes: {
            digit: 'The next digit is 6. That is 5 or more, so round up.',
            nearest: 'So 4.276 is closer to 4.28.'
        } },
        {
            title: 'A carry can run through more than one 9.',
            prompt: 'To round 9.996 to 2 decimal places, keep 9.99.',
            lines: [
                'The next digit is 6, so round up.',
                'The last 9 becomes 10, so the carry moves left through each 9. Keep two digits after the point.'
            ],
            number: '9.996', kind: 'decimal', accuracy: 2, tap: 'decider', equations: ['9.996 ≈ 10.00']
        },
        { title: 'Use the original number', lines: ['Round the original number each time.', "To round 2.449 to 1 decimal place, keep 2.4. Don't round to 2.45 first. That would then round up to 2.5, which is wrong."], number: '2.449', kind: 'decimal', accuracy: 1, equations: ['2.449 ≈ 2.4'] },
        {
            title: 'To round to the nearest whole number, look at the tenths digit.',
            prompt: 'To round 18.497 to the nearest whole number, keep the 8 in the ones place.',
            lines: [
                'The next digit is the tenths digit, 4. That is less than 5, so the 8 stays the same.',
                "Don't round to 18.5 first. That would round up to 19, which is wrong."
            ],
            number: '18.497', kind: 'nearest', accuracy: 0, tap: 'decider', equations: ['18.497 ≈ 18']
        }
    ];
    function text(host, tag, value, className) {
        const element = document.createElement(tag);
        element.textContent = value;
        if (className) element.className = className;
        host.append(element);
        return element;
    }
    function drawDigits(host, number, n, marks = 'both', onPick) {
        const d = digits(number, n);
        const row = document.createElement('div');
        row.className = 'significant-digits';
        row.setAttribute('role', onPick ? 'group' : 'img');
        row.setAttribute('aria-label', `Digits of ${spaced(number)}${marks === 'first' ? `; start at ${number[d.first]}` : marks === 'none' ? '' : `; keep ${digitLabel(number, d.target)}${marks === 'both' ? `; next digit ${digitLabel(number, d.decider)}` : ''}`}`);
        for (const [index, digit] of [...number].entries()) {
            const isButton = onPick && digit !== '.';
            const cell = text(row, isButton ? 'button' : 'span', '', digit === '.' ? 'significant-point' : 'significant-digit');
            if (isButton) {
                cell.type = 'button';
                cell.setAttribute('aria-label', digitLabel(number, index));
                cell.addEventListener('click', () => onPick(index));
            } else {
                cell.setAttribute('aria-hidden', 'true');
            }
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
    // A line that starts "Step 1:" shows the step name in bold.
    function stepText(host, tag, value, className) {
        const node = text(host, tag, '', className);
        const match = /^(Step \d+:)\s*(.*)$/.exec(value);
        if (!match) node.textContent = value;
        else {
            text(node, 'strong', match[1]);
            node.append(` ${match[2]}`);
        }
        return node;
    }

    /* Hand-drawn arrows from each note to the thing it talks about, copied from
       the Rounding lesson so the moved screens look the same. Each arrow leaves
       the right end of its note and comes in to its target from straight above
       or below. They are redrawn whenever the layout changes size. */
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
            for (const [note, findTarget, arrowSide] of pairs) {
                const target = findTarget();
                if (!target) continue;
                const targetBox = target.getBoundingClientRect();
                const targetX = targetBox.left + targetBox.width / 2 - origin.left;
                const left = arrowSide ? arrowSide === 'right' : targetX - note.offsetWidth - 48 >= 0;
                const lead = left
                    ? Math.min(targetX - note.offsetWidth - 48, origin.width - note.offsetWidth)
                    : Math.max(0, Math.min(targetX + 48, origin.width - note.offsetWidth));
                if (!arrowSide && note.style.marginLeft !== `${lead}px`) note.style.marginLeft = `${lead}px`;
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

    // A number line from one round number (base) to the next, copied from the
    // Rounding lesson: a grey line, ten equal steps with a tick and a number at
    // each, and a blue dot on the number. With notes, one note points at the
    // digit that decides, one at the number it rounds to.
    function drawLine(host, value, explore, onChange, readOnly, base = 60, notes = null, step = 1, { onPick, wideLabels = false, labels = 'all', valueLabel, showNearest = true } = {}) {
        const format = number => number.toLocaleString('en-GB');
        // Wrap the digit that decides (the ones for step 1, the tens for step 10
        // and so on) so a note's arrow can point at it.
        const marked = number => {
            const shown = format(number);
            // With a step smaller than 1 (0.001), the digit that decides is the
            // last one shown, not a digit above the point.
            let fromEnd = Math.max(0, Math.round(Math.log10(step)));
            for (let i = shown.length - 1; i >= 0; i--) {
                if (!/\d/.test(shown[i])) continue;
                if (fromEnd-- === 0) return `${shown.slice(0, i)}<tspan class="rounding-decider">${shown[i]}</tspan>${shown.slice(i + 1)}`;
            }
            return shown;
        };
        const phone = window.matchMedia('(max-width: 600px)').matches;
        // A step of 0.001 leaves float noise (4.2749999999999995), so every tick
        // is snapped before it is labelled or used as a tap target.
        const tick = mark => Number((base + mark * step).toFixed(6));
        const top = tick(10);
        const edge = wideLabels ? 50 : 30;
        const x = number => edge + (number - base) / (10 * step) * (660 - 2 * edge);
        // A number between two ticks, or on a tick left unlabelled, has no label in the row, so its label sits
        // above the dot, and the line moves down to make room.
        const onTick = (value - base) % (labels === 'all' ? step : 5 * step) === 0;
        const axis = onTick ? 26 : (phone ? 58 : 50);
        const lineHost = notes ? text(host, 'div', '', 'rounding-notes') : host;
        const digitNote = notes && !onTick ? stepText(lineHost, 'p', notes.digit, 'rounding-note rounding-note--above') : null;
        const line = document.createElement('div');
        line.className = 'rounding-line';
        line.setAttribute('role', onPick ? 'group' : 'img');
        let picture = `<path class="rounding-axis" d="M 15 ${axis} H 645"/>`;
        for (let mark = 0; mark <= 10; mark++) {
            // The two round numbers and the halfway number between them stand out.
            const number = tick(mark);
            const landmark = mark % 5 === 0;
            const reach = landmark ? 12 : 7;
            const y = axis + (phone ? 44 : 40);
            const end = number === base || number === top;
            const label = `<text class="rounding-value${landmark ? ' is-landmark' : ''}${wideLabels && !landmark ? ' rounding-value--minor' : ''}" data-value="${number}" x="${x(number)}" y="${y}">${marked(number)}</text>`;
            picture += `<path class="rounding-tick${landmark ? ' is-landmark' : ''}" d="M ${x(number)} ${axis - reach} V ${axis + reach}"/>`;
            if (!landmark && labels !== 'all') continue;
            picture += onPick && end
                ? `<g role="button" tabindex="0" aria-label="${format(number)}" class="rounding-end" data-end="${number}">
                    <rect x="${x(number) - 44}" y="${y - 48}" width="88" height="80" rx="6"/>${label}
                </g>`
                : label;
        }
        if (!onTick) picture += `<text class="rounding-value is-key rounding-value--above" x="${x(value)}" y="${axis - (phone ? 24 : 20)}">${valueLabel ?? marked(value)}</text>`;
        picture += `<circle class="rounding-dot" cx="${x(value)}" cy="${axis}" r="${phone ? 12 : 9}"/>`;
        line.innerHTML = `<svg viewBox="0 0 660 ${axis + (phone ? 54 : 46)}" aria-hidden="${!onPick}">${picture}</svg>`;
        if (onPick) {
            for (const end of line.querySelectorAll('.rounding-end')) {
                const pick = () => onPick(Number(end.dataset.end));
                end.addEventListener('click', pick);
                end.addEventListener('keydown', event => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    pick();
                });
            }
        }
        const dot = line.querySelector('.rounding-dot');
        const label = number => line.querySelector(`.rounding-value[data-value="${number}"]`);
        const nearest = number => number < base + 5 * step ? base : top;
        lineHost.append(line);
        const output = showNearest && !onPick ? text(host, 'p', '', 'significant-equation rounding-line-answer') : null;
        function update(number) {
            dot.setAttribute('cx', x(number));
            line.querySelectorAll('.rounding-value[data-value]').forEach(item => item.classList.toggle('is-key', Number(item.dataset.value) === number));
            if (output) output.textContent = `${format(number)} ≈ ${format(nearest(number))}`;
            const description = `${valueLabel ?? format(number)} on a line from ${format(base)} to ${format(top)}`;
            line.setAttribute('aria-label', output
                ? `${description}; to the nearest ${format(10 * step)} it is ${format(nearest(number))}` : description);
        }
        update(value);
        if (notes) {
            const digit = digitNote || stepText(lineHost, 'p', notes.digit, 'rounding-note rounding-note--digit');
            const nearestNote = stepText(lineHost, 'p', notes.nearest, 'rounding-note rounding-note--nearest');
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
        return line;
    }

    // The digit boxes above a round-to-a-place question, with Keep and Look marked.
    function drawRoundingDigits(host, question, marks = 'both', onPick) {
        const { number } = question;
        const d = question;
        const row = document.createElement('div');
        row.className = 'significant-digits';
        row.setAttribute('role', onPick ? 'group' : 'img');
        row.setAttribute('aria-label', `Digits of ${spaced(number)}${marks === 'first' ? `; start at ${number[d.first]}` : marks === 'none' ? '' : `; keep ${digitLabel(number, d.target)}${marks === 'both' ? `; next digit ${digitLabel(number, d.decider)}` : ''}`}`);
        // Show the thousands commas (48,672) as the number lines do. A comma is
        // a separator, not a box, and it does not shift the digit positions.
        const shown = spaced(number);
        let commas = 0;
        for (const [index, digit] of [...shown].entries()) {
            if (digit === ',') {
                commas++;
                text(row, 'span', ',', 'significant-comma');
                continue;
            }
            const key = index - commas;
            const isButton = onPick && digit !== '.';
            const cell = text(row, isButton ? 'button' : 'span', '', digit === '.' ? 'significant-point' : 'significant-digit');
            if (isButton) {
                cell.type = 'button';
                cell.setAttribute('aria-label', digitLabel(number, key));
                cell.addEventListener('click', () => onPick(key));
            } else {
                cell.setAttribute('aria-hidden', 'true');
            }
            text(cell, 'span', digit);
            if (marks === 'first' && key === d.first) {
                cell.classList.add('is-first');
                text(cell, 'small', 'Start');
            } else if (marks !== 'none' && marks !== 'first' && key === d.target) {
                cell.classList.add('is-keep');
                text(cell, 'small', 'Keep');
            } else if (marks === 'both' && key === d.decider) {
                cell.classList.add('is-look');
                text(cell, 'small', 'Look');
            }
        }
        host.append(row);
        return row;
    }

    function drawLearn(host, index) {
        const screen = learnScreens[index];
        if (screen.line) {
            drawLine(host, screen.value, false, null, false, screen.base, screen.notes, screen.step, {
                wideLabels: screen.tap === 'end', labels: screen.labels
            });
        } else if (screen.kind) {
            drawRoundingDigits(host, { ...screen, ...keyDigits(screen.number, screen.kind, screen.accuracy) }, screen.marks);
        } else {
            drawDigits(host, screen.number, screen.n, screen.mark || 'both');
        }
        for (const equation of screen.equations || []) text(host, 'p', equation, 'significant-equation');
        if (screen.caption) text(host, 'p', screen.caption);
    }
    function drawLearnTap(host, screen, onResult) {
        // A number-line screen: tap the end the number is closer to.
        if (screen.tap === 'end') {
            const top = Number((screen.base + 10 * screen.step).toFixed(6));
            const answer = screen.value < screen.base + 5 * screen.step ? screen.base : top;
            const hint = "Look at the digit after the one you're rounding to. Is it 5 or more?";
            text(host, 'p', `Tap the number ${screen.value.toLocaleString('en-GB')} is closer to.`);
            drawLine(host, screen.value, false, null, false, screen.base, null, screen.step, {
                wideLabels: true, labels: screen.labels, onPick: value => onResult(value === answer, hint)
            });
            return;
        }
        // A round-to-a-place screen: tap the digit that decides.
        if (screen.kind) {
            const d = keyDigits(screen.number, screen.kind, screen.accuracy);
            text(host, 'p', 'Tap the digit that decides.');
            drawRoundingDigits(host, { ...screen, ...d }, 'none',
                index => onResult(index === d.decider, 'Find the last digit you keep, then look one digit to the right.'));
            return;
        }
        const d = digits(screen.number, screen.n);
        const last = screen.tap === 'last';
        const answer = last ? d.target : d.decider;
        const digitHint = 'Find the last digit you keep, then look one digit to the right.';
        const hint = last ? 'A zero at the end of a decimal counts.'
            : "Start counting at the first digit that isn't zero. " + digitHint;
        text(host, 'p', last ? 'Tap the last significant figure.' : 'Tap the digit that decides.');
        drawDigits(host, screen.number, screen.n, 'none', index => onResult(index === answer, hint));
    }
    function drawExample(host, question, correct) {
        // The counting question has no digit picture; the one-step examples show
        // their digits only after the answer.
        if (question.stage === 'context' || (question.showDigitsAfterAnswer && !correct)) return;
        const marks = question.stage === 'keep' ? (correct ? 'keep' : 'none') : question.stage === 'decider' ? (correct ? 'both' : 'keep') : 'both';
        if (question.kind) drawRoundingDigits(host, question, marks);
        else drawDigits(host, question.number, question.n, marks);
        if (correct && question.stage === 'round') {
            const answer = question.kind ? rounded(question.number, question.kind, question.accuracy) : round(question.number, question.n);
            text(host, 'p', `${spaced(question.number)} ≈ ${spaced(answer)}`, 'significant-equation');
        }
    }
    window.SignificantFigures = { round, roundToPower, rounded, digits, keyDigits, place, digitLabel, figures, spaced, roundingQuestion, sigRoundingQuestion, digitQuestion, guided, exampleCount, examples, checks, practiceGroups, practiceTypes, pick, prepare, generate, learnScreens, drawLearn, drawLearnTap, drawExample };
})();
