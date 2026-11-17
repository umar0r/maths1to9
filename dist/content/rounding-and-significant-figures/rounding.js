(() => {
    'use strict';

    const option = (label, feedback, correct = false, index) => ({ label, feedback, correct, ...(index !== undefined ? { index } : {}) });
    const clean = text => String(text).replace(/,/g, '');
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
    function roundingQuestion(number, kind, accuracy, input = 'number', questionType = kind, customPrompt) {
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
    function digitQuestion(number, kind, accuracy, stage) {
        const d = keyDigits(number, kind, accuracy);
        const correct = stage === 'keep' ? d.target : d.decider;
        const wrong = [d.target, d.decider, d.first, ...d.indexes].filter((index, i, list) => index !== correct && list.indexOf(index) === i).slice(0, 3);
        return {
            number, kind, accuracy, ...d, stage, input: 'choice',
            questionType: stage === 'keep' ? 'keep-digit' : 'deciding-digit',
            prompt: `Round ${spaced(number)} to ${accuracyText(kind, accuracy)}. ${stage === 'keep' ? 'Which is the last digit to keep?' : 'Which digit comes straight after the digit to keep?'}`,
            options: [option(digitLabel(number, correct), `The ${stage === 'keep' ? 'last digit to keep' : 'next digit'} is ${number[correct]} in the ${place(number, correct)}.`, true, correct),
                ...wrong.map(index => option(digitLabel(number, index),
                    stage === 'keep' ? `The ${place(number, index)} digit is not the last digit to keep. Find the place asked for.`
                        : `The ${place(number, index)} digit is not straight after the digit to keep. Look one digit to the right.`, false, index))]
        };
    }
    function contextStep(questionType, prompt, answer, feedback, rules = []) {
        return {
            stage: 'context', questionType, input: 'number', exact: false,
            prompt, answer, feedback, fallback: feedback,
            rules: rules.map(([value, message]) => ({ value, feedback: message }))
        };
    }

    function containerSteps() {
        const step = (...details) => contextStep('containers', ...details);
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
    function singleStepExamples() {
        return [
            ['53481', 'nearest', 3],
            ['26.48', 'nearest', 0],
            ['3.997', 'decimal', 2]
        ].map(([number, kind, accuracy]) => [{
            ...roundingQuestion(number, kind, accuracy, 'number'), showDigitsAfterAnswer: true
        }]);
    }

    function situationExamples() {
        return [
            ['budget', [
                ['A craft club has £23. Each brush costs £2.80. On a calculator, 23 ÷ 2.80 = 8.214… How much do 9 brushes cost? Give your answer in pounds.',
                    '25.20', '9 × £2.80 = £25.20.', [
                        ['2.80', 'That is one brush. Times it by 9.']
                    ]],
                ['What is the greatest number of brushes the club can buy?',
                    '8', '8 brushes cost £22.40. 9 cost £25.20, too much. So round down to 8.', [
                        ['9', '9 brushes cost £25.20. That is more than £23.'],
                        ['8.214', "You can't buy part of a brush. Give a whole number."]
                    ]]
            ]],
            ['stock-first', [
                ['A workshop needs 38 litres of coolant. It already has 9 litres. How many more litres does it need?',
                    '29', '38 − 9 = 29 litres.', [
                        ['47', "Take the 9 litres away. Don't add them."]
                    ]],
                ['Coolant comes in 4-litre cans. 29 ÷ 4 = 7.25. What is the smallest number of cans needed?',
                    '8', '7 cans give 28 litres. 8 cans give 32 litres, so round up to 8.', [
                        ['7', '7 cans give 28 litres. That is 1 litre short.'],
                        ['10', 'That uses 38 litres. The workshop already has 9.']
                    ]]
            ]],
            ['spend-first', [
                ['A gardener has £30. They buy a watering can for £8.40 and a trowel for £4.75. How much money is left?',
                    '16.85', '£30 − £8.40 − £4.75 = £16.85.', [
                        ['13.15', 'That is what the can and trowel cost. Take it away from £30.']
                    ]],
                ['Compost bags cost £3.20 each. 16.85 ÷ 3.20 = 5.265… How many bags can the gardener buy?',
                    '5', '5 bags cost £16.00. 6 bags cost £19.20, so round down to 5.', [
                        ['6', '6 bags cost £19.20. That is more than £16.85.'],
                        ['9', 'That uses all £30. Some money has already been spent.']
                    ]]
            ]],
            ['leftover', [
                ['A roll holds 9.5 m of cord. How many centimetres is that?',
                    '950', '9.5 × 100 = 950 cm.', [
                        ['95', '1 m is 100 cm, so times by 100.']
                    ]],
                ['Each piece is 80 cm. 950 ÷ 80 = 11.875. How many full pieces can you cut?',
                    '11', '11 × 80 = 880 cm. 12 pieces need 960 cm, so round down to 11.', [
                        ['12', '12 pieces need 960 cm. There is only 950 cm.']
                    ]],
                ['11 pieces use 880 cm. How much cord is left, in centimetres?',
                    '70', '950 − 880 = 70 cm.', [
                        ['0.875', 'That is part of a piece. Work out 950 − 880.'],
                        ['0.7', 'Give your answer in centimetres.']
                    ]]
            ]],
            ['started-block', [
                ['A shop charges £18 for each 3-hour block, and a block you start counts as a whole block. A tool is hired for 7 hours. 7 ÷ 3 = 2.333… How many blocks are charged?',
                    '3', '2 blocks cover 6 hours. The 7th hour starts block 3, so round up to 3.', [
                        ['2', '2 blocks only cover 6 hours. The 7th hour starts a new block.']
                    ]],
                ['What is the charge?', '54', '3 × £18 = £54.', [
                    ['42', 'That charges for part of a block. Charge 3 whole blocks.'],
                    ['36', 'That is only 2 blocks.']
                ]]
            ]],
            ['more-than', [
                ['A stall paid £216 for its stock. Each item sells for £6. 216 ÷ 6 = 36. How much money do 36 sales bring in?',
                    '216', '36 × £6 = £216.'],
                ['What is the least number of items it must sell to get more than £216?',
                    '37', '36 sales bring in £216. One more sale brings the total to £222, so it takes 37 sales.', [
                        ['36', '36 items bring in exactly £216. You need more than that.']
                    ]]
            ]],
            ['change', [
                ['A club has £12.50. Each trophy costs £1.85. 12.50 ÷ 1.85 = 6.756… How many trophies can it buy?',
                    '6', '6 trophies cost £11.10. 7 trophies cost £12.95, so round down to 6.', [
                        ['7', '7 trophies cost £12.95. That is more than £12.50.']
                    ]],
                ['6 trophies cost £11.10. How much change does the club get, in pence?',
                    '140', '£12.50 − £11.10 = £1.40, which is 140p.', [
                        ['1.4', 'That is in pounds. £1.40 is 140p.']
                    ]]
            ]],
            ['doubling', [
                ['Prints cost 85p each. £4 buys 4 prints, which cost £3.40. How many pence are left over?',
                    '60', '400p − 340p = 60p.', [
                        ['0.6', 'Give your answer in pence.']
                    ]],
                ['How many prints can £8 buy? 800 ÷ 85 = 9.411…',
                    '9', '9 prints cost £7.65. 10 prints cost £8.50, so round down to 9.', [
                        ['8', 'Doubling 4 gives 8, but the money left over adds up. 9 prints cost £7.65.']
                    ]]
            ]],
            ['saving', [
                ['Boots cost £64. A voucher takes £10 off. How much do the boots cost now?',
                    '54', '£64 − £10 = £54.', [
                        ['74', "Take the £10 off. Don't add it."]
                    ]],
                ['Lee saves £8 a week. 54 ÷ 8 = 6.75. How many weeks must Lee save?',
                    '7', '6 weeks gives £48. 7 weeks gives £56, so round up to 7.', [
                        ['6', '6 weeks gives £48. That is not enough.'],
                        ['8', 'That forgets the voucher.']
                    ]]
            ]],
            ['full-packets', [
                ['A club has 86 stickers. It packs them in packets of 8. 86 ÷ 8 = 10.75. How many full packets can it make?',
                    '10', '10 packets use 80 stickers. 11 packets need 88, so round down to 10.', [
                        ['11', '11 packets need 88 stickers.']
                    ]],
                ['Each full packet sells for £2.50. How much money does the club get?',
                    '25', '10 × £2.50 = £25.', [
                        ['27.5', 'That sells 11 packets. Only 10 are full.'],
                        ['26.875', "You can't sell part of a packet."]
                    ]]
            ]],
            ['packs-days', [
                ['A studio has £22. A 250 ml bottle of ink costs £4. 22 ÷ 4 = 5.5. How many bottles can it buy?',
                    '5', '5 bottles cost £20. 6 bottles cost £24, so round down to 5.', [
                        ['6', '6 bottles cost £24.']
                    ]],
                ['How many millilitres of ink is that?',
                    '1250', '5 × 250 = 1,250 ml.', [
                        ['1375', 'That counts half a bottle. You can only buy 5.']
                    ]],
                ['The printer uses 125 ml a day. For how many full days will the ink last?',
                    '10', '1,250 ÷ 125 = 10 full days.', [
                        ['11', 'That is 5.5 bottles of ink. Use the 5 bottles bought.']
                    ]]
            ]],
            ['coverage', [
                ['A floor is 62 m². One kit covers 16 m². 62 ÷ 16 = 3.875. How many kits are needed?',
                    '4', '3 kits cover 48 m². 4 kits cover 64 m², so round up to 4.', [
                        ['3', '3 kits cover 48 m². That is not enough.']
                    ]],
                ['The kit really covers only 14 m². 62 ÷ 14 = 4.428… How many kits are needed now?',
                    '5', '4 kits cover 56 m². 5 kits cover 70 m², so round up to 5.', [
                        ['4', '4 kits cover 56 m². That is 6 m² short.']
                    ]]
            ]]
        ].map(([type, steps]) => steps.map(step => contextStep(type, ...step)));
    }

    function exampleGroups() {
        return [containerSteps(), ...singleStepExamples(), ...situationExamples()];
    }
    function examples() {
        return exampleGroups().flatMap((steps, example) => steps.map((question, step) => ({
            ...question, example: example + 1, step: step + 1, steps: steps.length
        })));
    }
    const exampleCount = exampleGroups().length;
    function checks() {
        return [
            roundingQuestion('2748', 'nearest', 2, 'choice', 'context', 'A stadium has 2,748 spectators. Round this to the nearest 100.'),
            roundingQuestion('5.465', 'decimal', 2), roundingQuestion('18.497', 'nearest', 0, 'choice'),
            { questionType: 'error', input: 'choice', prompt: 'Amir says 4.95 rounds to 4.9 at 1 decimal place. Which explanation corrects him?', options: [
                option('The 5 rounds the tenths up, giving 5.0', 'The hundredths digit is 5. Round up and keep one decimal place.', true),
                option('Keep 4.9 because the tenths digit is already 9', 'A 9 can still round up. The extra 1 carries to the next column.'),
                option('Round to 4 because only whole numbers can be rounded', 'Decimals can be rounded too. Keep the tenths place.'),
                option('Write 5 because the zero after the point does not matter', 'Write 5.0 to show the one decimal place asked for.')
            ] },
            roundingQuestion('1.049', 'decimal', 1, 'number', 'context', 'A bottle holds 1.049 litres. Round this directly to 1 decimal place.')
        ];
    }
    const practiceGroups = [
        { kind: 'place', types: ['nearest-ten', 'halfway-hundred', 'nearest-thousand', 'big-hundred', 'big-thousand'] },
        { kind: 'place', types: ['one-decimal', 'two-decimals', 'whole-number'] },
        { kind: 'place', types: ['decimal-zero', 'decimal-carry', 'carry-two'] },
        { kind: 'context', types: ['round-up'] },
        { kind: 'context', types: ['round-down'] },
        { kind: 'context', types: ['full-groups', 'path-context'] }
    ];
    const practiceTypes = practiceGroups.flatMap(group => group.types);

    function pick(random) {
        const { randomInt, shuffle } = window.Maths1to9LessonEngine;
        const picks = practiceGroups.map(group => ({
            group, type: group.types[randomInt(0, group.types.length - 1, random)]
        }));
        // Fill the rest of the session from the same groups, so it still covers
        // whole numbers, decimals and real life.
        for (let extra = picks.length; extra < 10; extra++) {
            const group = practiceGroups[randomInt(0, practiceGroups.length - 1, random)];
            picks.push({ group, type: group.types[randomInt(0, group.types.length - 1, random)] });
        }
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


    function divisionText(total, size) {
        const scaled = total * 1000;
        const truncated = Math.floor(scaled / size) / 1000;
        return `${truncated}${scaled % size ? '…' : '.'}`;
    }

    function generateSituation(item, integer, random) {
        if (item.type === 'round-down') {
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

        const roundUp = item.type === 'round-up';
        const size = roundUp ? integer(12, 30) : integer(6, 12);
        const max = roundUp ? 300 : 200;
        let total = integer(roundUp ? 100 : 40, max);
        if (total % size === 0) total += total === max ? -1 : 1;
        const quotient = total / size;
        const lower = Math.floor(quotient);
        const upper = lower + 1;
        const roundedQuotient = Math.round(quotient * 10) / 10;
        const working = `${total} ÷ ${size} = ${divisionText(total, size)}`;
        if (roundUp) {
            const books = integer(0, 1) === 0;
            const [unit, units, contents] = books ? ['box', 'boxes', 'books'] : ['minibus', 'minibuses', 'people'];
            const setup = books
                ? `There are ${total} books to pack. Each box holds ${size} books.`
                : `A trip needs seats for ${total} people. Each minibus seats ${size}.`;
            return practiceContext(item,
                `${setup} ${working} What is the smallest number of ${units} needed?`, upper,
                `${upper} ${units} hold ${upper} × ${size} = ${upper * size} ${contents}, so all ${total} fit. ${lower} ${units} only hold ${lower * size}.`, [
                    [lower, 'That leaves some with no space. You need one more.'],
                    [Math.round(quotient) === upper ? lower - 1 : Math.round(quotient), 'Here you always round up, even if the decimal is small.'],
                    [roundedQuotient, `You can't have part of a ${unit}. Give a whole number.`]
                ], random);
        }

        return practiceContext(item,
            `A club has ${total} stickers. It packs them in packets of ${size}. ${working} How many full packets can it make?`,
            lower, `${lower} × ${size} = ${lower * size} stickers. That fills ${lower} packets and leaves ${total % size} over.`, [
                [upper, "The last packet wouldn't be full."],
                [total % size, 'That is how many are left over, not the number of packets.'],
                [roundedQuotient, 'Only full packets count. Give a whole number.']
            ], random);
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
        case 'decimal-carry': number = `9.9${integer(5, 9)}`; kind = 'decimal'; accuracy = 1; break;
        case 'big-hundred':
        case 'big-thousand': {
            accuracy = item.type === 'big-hundred' ? 2 : 3;
            const value = integer(10001, 98999);
            const unit = 10 ** accuracy;
            number = String(value % unit === 0 ? value + 1 : value);
            kind = 'nearest';
            break;
        }
        case 'whole-number':
            number = `${integer(10, 98)}.${integer(1, 9)}${integer(1, 9)}`;
            kind = 'nearest'; accuracy = 0; break;
        case 'carry-two':
            number = `${integer(1, 8)}.99${integer(5, 9)}`;
            kind = 'decimal'; accuracy = 2; break;
        case 'round-up':
        case 'round-down':
        case 'full-groups':
            return generateSituation(item, integer, random);
        case 'path-context':
            number = String(nonZeroEnd(integer(111, 989))); kind = 'nearest'; accuracy = 1;
            customPrompt = `A path is ${number} metres long. Round its length to the nearest 10 metres.${item.mode === 'choice' ? '' : ' Type the number of metres.'}`;
            break;
        default: throw new Error(`Unknown rounding type: ${item.type}`);
        }
        const question = roundingQuestion(number, kind, accuracy, item.mode || 'number', item.type, customPrompt);
        if (question.input === 'choice' && question.options.length < 4) {
            return roundingQuestion(number, kind, accuracy, 'number', item.type, customPrompt);
        }
        return prepare(question, random);
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
        { title: 'Look one digit to the right', lines: ['Find the place you are rounding to. Keep that digit, then look at the next digit.', 'For 0, 1, 2, 3 or 4, keep the last digit as it is. For 5, 6, 7, 8 or 9, round up.'], number: '367', kind: 'nearest', accuracy: 1, equations: ['367 ≈ 370'] },
        // Worked step by step: find the digit, put it on a line, look at the next digit, round.
        { title: "Now let's round 48,672 to the nearest 100.", lines: [], line: true, base: 48600, step: 10, value: 48672, labels: 'landmarks', steps: {
            find: 'Step 1: We are rounding to the nearest 100, so find the hundreds digit.',
            found: 'The hundreds digit is 6. So 48,672 is between 48,600 and 48,700.',
            place: 'Step 2: Put 48,672 on a number line from 48,600 to 48,700.'
        }, notes: {
            digit: 'Step 3: Look at the next digit. The tens digit is 7. That is 5 or more, so round up.',
            nearest: 'Step 4: So 48,672 rounds up to 48,700.'
        } },
        { title: "Now let's round 46,728 to the nearest 1,000.", lines: ['46,728 sits between 46,000 and 47,000. Here it is on the number line, counting in hundreds.'], line: true, base: 46000, step: 100, value: 46728, tap: 'end', labels: 'landmarks', notes: {
            digit: 'The hundreds digit is 7. That is 5 or more, so round up.',
            nearest: 'So 46,728 is closer to 47,000.'
        } },
        { title: "Now let's round 4.276 to 2 decimal places.", lines: ['2 decimal places means 2 digits after the decimal point. So 4.276 sits between 4.27 and 4.28. Here it is on the number line, counting in steps of 0.001.'], line: true, base: 4.27, step: 0.001, value: 4.276, tap: 'end', labels: 'landmarks', notes: {
            digit: 'The next digit is 6. That is 5 or more, so round up.',
            nearest: 'So 4.276 is closer to 4.28.'
        } },
        { title: 'When rounding carries', lines: ['To round 9.96 to 1 decimal place, keep the tenths digit, 9. The next digit is 6, so round up.', 'The extra 1 carries to the next column. Keep one digit after the point in the answer.'], number: '9.96', kind: 'decimal', accuracy: 1, equations: ['9.96 ≈ 10.0'] },
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
        },
        { title: 'Rounding in a real situation', lines: ['A path is 248 metres long. Round its length to the nearest 10 metres.', 'The next digit is 8, so round up. Rounding does not change the unit: the length is still in metres.'], number: '248', kind: 'nearest', accuracy: 1, equations: ['248 metres ≈ 250 metres'] },
        {
            title: 'When you need enough of something, round up.',
            lines: [], base: 7, step: 0.1, value: 131 / 18, labels: 'landmarks', tap: 'end', answer: 8,
            context: {
                setup: 'Step 1: There are 131 helmets. Each rack holds 18. On a calculator, 131 ÷ 18 = 7.277…',
                valueLabel: '7.277…',
                question: 'How many racks do you need?',
                hint: '7 racks hold 7 × 18 = 126 helmets. That leaves 5 helmets with no rack.',
                steps: [
                    ['Step 2: 7 racks hold 126 helmets. 5 helmets have no rack.', 7],
                    ['Step 3: So you need 8 racks. 8 racks hold 144, so all 131 fit.', 8]
                ]
            },
            equations: ['8 racks'],
            caption: '7.277… would normally round to 7. Here you round up, because 7 racks are not enough.'
        },
        {
            title: 'When you can only pay for whole ones, round down.',
            lines: [], base: 6, step: 0.1, value: 12.50 / 1.85, labels: 'landmarks', tap: 'end', answer: 6,
            context: {
                setup: 'Step 1: A club has £12.50. Each trophy costs £1.85. On a calculator, 12.50 ÷ 1.85 = 6.756…',
                valueLabel: '6.756…',
                question: 'How many trophies can they buy?',
                hint: '7 trophies cost £12.95. That is more than £12.50.',
                steps: [
                    ['Step 2: 7 trophies cost £12.95. That is too much.', 7],
                    ['Step 3: So they can buy 6. 6 trophies cost £11.10.', 6]
                ]
            },
            equations: ['6 trophies'],
            caption: "6.756… would normally round to 7. Here you round down, because you can't pay for the 7th."
        },
        {
            title: "To find what's left, take away the full groups.",
            lines: [], base: 11, step: 0.1, value: 950 / 80, labels: 'landmarks', tap: 'end', answer: 11,
            context: {
                setup: 'Step 1: A roll has 9.5 m of cord, which is 950 cm. Cut it into 80 cm pieces. On a calculator, 950 ÷ 80 = 11.875',
                valueLabel: '11.875',
                question: 'How many full pieces can you cut?',
                hint: '12 pieces need 960 cm. There is only 950 cm.',
                steps: [
                    ['Step 2: 11 full pieces use 11 × 80 = 880 cm.', 11],
                    ['Step 3: 950 − 880 = 70 cm is left.']
                ]
            },
            equations: ['70 cm left']
        }
    ];
    function text(host, tag, value, className) {
        const node = document.createElement(tag);
        node.textContent = value;
        if (className) node.className = className;
        host.append(node);
        return node;
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
    // Step 1 of a worked example: the number, with the digit you round to
    // picked out and a note pointing at it.
    function drawFindDigit(host, value, step, steps) {
        stepText(host, 'p', steps.find);
        const block = text(host, 'div', '', 'rounding-notes rounding-find');
        const shown = value.toLocaleString('en-GB');
        const number = text(block, 'p', '', 'rounding-big-number');
        number.setAttribute('aria-label', shown);
        // The digit you round to is one place left of the digit that decides.
        let fromEnd = Math.round(Math.log10(step)) + 1;
        let target = null;
        for (let i = shown.length - 1; i >= 0; i--) {
            if (!/\d/.test(shown[i])) continue;
            if (fromEnd-- === 0) { target = i; break; }
        }
        [...shown].forEach((character, i) => {
            const span = text(number, 'span', character, i === target ? 'rounding-keep' : '');
            span.setAttribute('aria-hidden', 'true');
        });
        const note = text(block, 'p', steps.found, 'rounding-note rounding-note--found');
        drawArrows(block, [[note, () => number.querySelector('.rounding-keep')]]);
        stepText(host, 'p', steps.place);
    }
    function drawDigits(host, question, marks = 'both', onPick) {
        const { number } = question;
        const d = question;
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
    // A number line from one round number (base) to the next, drawn like the
    // negative numbers line: a grey line, ten equal steps with a tick and a
    // number at each, and a blue dot on the number. step is 1 for the nearest
    // 10, 10 for the nearest 100 and 100 for the nearest 1000. With notes, one
    // note points at the digit that decides, one at the number it rounds to.
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
    const roadMiles = [67, 342, 65, 2814];

    function roadWidget(start) {
        const base = Math.floor(start / 10) * 10;
        const top = base + 10;
        const halfway = base + 5;
        const nearest = start < halfway ? base : top;
        const format = spaced;
        const x = mile => 30 + (mile - base) * 60;
        const axis = 120;

        return {
            isEmpty: mile => mile !== base && mile !== top,
            answerText: format,
            mark(mile) {
                const correct = mile === nearest;
                let feedback;
                if (start === halfway) {
                    feedback = correct
                        ? `Yes. ${format(start)} is exactly halfway, so we round up. ${format(start)} ≈ ${format(top)} to the nearest 10.`
                        : `${format(start)} is exactly halfway. At halfway we round up, so it goes to ${format(top)}.`;
                } else if (correct) {
                    feedback = `Yes. ${format(start)} is closer to ${format(nearest)}, so ${format(start)} ≈ ${format(nearest)} to the nearest 10.`;
                } else {
                    feedback = `${format(start)} is ${Math.abs(start - mile)} miles from ${format(mile)} but only ${Math.abs(start - nearest)} miles from ${format(nearest)}. Try the other sign.`;
                }
                return { correct, feedback };
            },
            render(host, { onChange }) {
                const line = text(host, 'div', '', 'rounding-line rounding-road');
                let picture = `<path class="rounding-axis" d="M 15 ${axis} H 645"/>`;
                for (let mile = base; mile <= top; mile++) {
                    const landmark = (mile - base) % 5 === 0 ? ' is-landmark' : '';
                    const reach = landmark ? 12 : 7;
                    picture += `<path class="rounding-tick${landmark}" d="M ${x(mile)} ${axis - reach} V ${axis + reach}"/>
                        <text class="rounding-value${landmark}" x="${x(mile)}" y="157">${format(mile)}</text>`;
                }
                picture += `<circle class="rounding-road__start" cx="${x(start)}" cy="${axis}" r="6" fill="#64748b"/>`;
                for (const end of [base, top]) {
                    const label = format(end);
                    const position = x(end);
                    const width = Math.max(50, label.length * 12 + 18);
                    const left = Math.max(2, Math.min(658 - width, position - width / 2));
                    picture += `<g class="rounding-road__sign" transform="translate(0 12)">
                        <path d="M ${position} 30 V ${axis - 24}"/>
                        <rect x="${left}" width="${width}" height="30" rx="4"/>
                        <text class="rounding-value is-landmark" x="${left + width / 2}" y="20">${label}</text>
                    </g>`;
                }
                line.innerHTML = `<svg viewBox="0 0 660 169" role="slider" aria-label="Car position"
                        aria-valuemin="${base}" aria-valuemax="${top}">
                    <g aria-hidden="true">${picture}</g>
                    <g class="rounding-road__car" aria-hidden="true">
                        <rect class="rounding-road__grip" x="-42" y="-58" width="84" height="70" fill="transparent"/>
                        <path d="M -22 -9 V -22 Q -22 -26 -16 -27 L -8 -39 H 10 L 18 -27 Q 24 -26 24 -21 V -9 Z"
                            fill="#287fd1" stroke="#173d67" stroke-width="2"/>
                        <path d="M -12 -27 L -6 -36 H 8 L 14 -27 Z" fill="#dbeafe"/>
                        <circle cx="-13" cy="-9" r="5" fill="#243041"/>
                        <circle cx="15" cy="-9" r="5" fill="#243041"/>
                    </g>
                </svg>`;
                const svg = line.querySelector('svg');
                const car = svg.querySelector('.rounding-road__car');
                let mile = start;
                let editable = false;
                let pointer = null;

                function show(position) {
                    mile = position;
                    car.setAttribute('transform', `translate(${x(mile)} ${axis + 4})`);
                    svg.setAttribute('aria-valuenow', mile);
                    svg.setAttribute('aria-valuetext', `Mile ${format(mile)}`);
                }

                function move(position) {
                    const next = Math.max(base, Math.min(top, position));
                    if (next === mile) return;
                    show(next);
                    onChange(next);
                }

                car.addEventListener('pointerdown', event => {
                    if (!editable || pointer !== null || event.button !== 0) return;
                    event.preventDefault();
                    pointer = event.pointerId;
                    svg.focus({ preventScroll: true });
                    svg.setPointerCapture(pointer);
                });
                svg.addEventListener('pointermove', event => {
                    if (event.pointerId !== pointer) return;
                    const bounds = svg.getBoundingClientRect();
                    const svgX = (event.clientX - bounds.left) / bounds.width * 660;
                    move(base + Math.round((svgX - 30) / 60));
                });
                svg.addEventListener('lostpointercapture', () => { pointer = null; });
                svg.addEventListener('keydown', event => {
                    if (!editable) return;
                    if (['ArrowLeft', 'ArrowDown'].includes(event.key)) {
                        event.preventDefault();
                        move(mile - 1);
                    } else if (['ArrowRight', 'ArrowUp'].includes(event.key)) {
                        event.preventDefault();
                        move(mile + 1);
                    }
                });

                return {
                    update({ value, editable: canMove }) {
                        editable = canMove;
                        svg.tabIndex = canMove ? 0 : -1;
                        svg.setAttribute('aria-disabled', String(!canMove));
                        show(value ?? start);
                    },
                    focus: () => svg.focus({ preventScroll: true })
                };
            }
        };
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
            for (const [note, findTarget, arrowSide] of pairs) {
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
    function drawContextLine(host, screen, onPick) {
        const { context, value, base, step, labels } = screen;
        stepText(host, 'p', context.setup);
        if (onPick) text(host, 'p', context.question);
        const block = text(host, 'div', '', 'rounding-notes rounding-context');
        const line = drawLine(block, value, false, null, false, base, null, step, {
            onPick, wideLabels: true, labels, valueLabel: context.valueLabel, showNearest: false
        });
        if (onPick) return;
        const arrows = [];
        for (const [message, target] of context.steps) {
            const note = stepText(block, 'p', message, 'rounding-context__step');
            if (target !== undefined) {
                arrows.push([note, () => line.querySelector(`.rounding-value[data-value="${target}"]`), target === base ? 'left' : 'right']);
            }
        }
        drawArrows(block, arrows);
    }
    function drawLearnTap(host, screen, onResult) {
        if (screen.tap === 'end') {
            const answer = screen.answer ?? Number(rounded(String(screen.value), 'nearest', Math.log10(10 * screen.step)));
            const hint = screen.context?.hint ?? "Look at the digit after the one you're rounding to. Is it 5 or more?";
            const onPick = value => onResult(value === answer, hint);
            if (screen.context) drawContextLine(host, screen, onPick);
            else {
                text(host, 'p', `Tap the number ${screen.value.toLocaleString('en-GB')} is closer to.`);
                drawLine(host, screen.value, false, null, false, screen.base, null, screen.step, {
                    wideLabels: true, labels: screen.labels, onPick
                });
            }
            return;
        }
        const d = keyDigits(screen.number, screen.kind, screen.accuracy);
        const answer = d.decider;
        text(host, 'p', 'Tap the digit that decides.');
        drawDigits(host, { ...screen, ...d }, 'none', index => onResult(index === answer, 'Find the last digit you keep, then look one digit to the right.'));
    }

    function drawLearn(host, index, lineValue, onChange, readOnly) {
        const screen = learnScreens[index];
        if (screen.roundings) drawRoundings(host, screen.roundings);
        if (screen.steps) drawFindDigit(host, screen.value, screen.step, screen.steps);
        if (screen.context) drawContextLine(host, screen);
        else if (screen.line) drawLine(host, screen.explore ? lineValue : screen.value ?? 67, screen.explore, onChange, readOnly,
            screen.base, screen.notes, screen.step, { wideLabels: screen.tap === 'end', labels: screen.labels });
        else if (screen.number) drawDigits(host, { ...screen, ...keyDigits(screen.number, screen.kind, screen.accuracy) }, screen.marks);
        // A real-life answer sits in the small centred box, like the number-line answers.
        for (const equation of screen.equations || []) text(host, 'p', equation, screen.context ? 'significant-equation rounding-line-answer' : 'significant-equation');
        for (const line of screen.after || []) text(host, 'p', line);
        if (screen.caption) text(host, 'p', screen.caption);
    }
    function drawExample(host, question, correct) {
        if (question.stage === 'context' || (question.showDigitsAfterAnswer && !correct)) return;
        const marks = question.stage === 'keep' ? (correct ? 'keep' : 'none') : question.stage === 'decider' ? (correct ? 'both' : 'keep') : 'both';
        drawDigits(host, question, marks);
        if (correct && question.stage === 'round') text(host, 'p', `${spaced(question.number)} ≈ ${spaced(rounded(question.number, question.kind, question.accuracy))}`, 'significant-equation');
    }
    window.Rounding = { roundToPower, rounded, accuracyText, keyDigits, place, digitLabel, roundingQuestion, digitQuestion, exampleCount, examples, checks, practiceTypes, pick, prepare, generate, learnScreens, drawLearn, drawLearnTap, drawLine, drawExample, roadMiles, roadWidget };
})();
