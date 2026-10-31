(() => {
    'use strict';

    const NB = ' ';
    const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
    const ratio = (...parts) => parts.join(`${NB}:${NB}`);
    // A ratio never breaks across two lines.
    const keepTogether = text => (typeof text === 'string' ? text.replace(/ : /g, `${NB}:${NB}`) : text);
    const capital = text => text[0].toUpperCase() + text.slice(1);
    const number = value => String(Math.round(value * 1e10) / 1e10);
    const option = (label, feedback, correct = false) => ({ label: String(label), feedback, correct });
    const mistake = (value, feedback) => ({ value: typeof value === 'number' ? number(value) : value, feedback });
    const pair = (first, second) => ({ first: String(first), second: String(second) });
    const practiceTypes = ['two-part-typed', 'three-part-typed', 'find-one-part', 'one-part-choice', 'which-calc', 'amount-choice'];

    // Every amount when one part of the ratio is known.
    function scale(parts, knownIndex, knownAmount) {
        const one = knownAmount / parts[knownIndex];
        return parts.map(part => part * one);
    }

    const learnScreens = ([
        {
            title: 'A part can be any size',
            lines: ['A ratio counts parts. A part can be any size. If every part is the same size, the mix stays the same.'],
            maths: ['blue : red = 5 : 3', '5 × 4 = 20', '3 × 4 = 12'],
            slider: 'Each part is worth', min: 1, max: 12, start: 4
        },
        {
            title: 'Find one part, then multiply',
            lines: [
                'Blue : red = 5 : 3. You have 60 ml of blue. How much red keeps the same shade?',
                'Find what one part is worth. Then multiply every part by it. Check by dividing back.'
            ],
            maths: ['60 ÷ 5 = 12', '3 × 12 = 36', '60 ÷ 12 = 5', '36 ÷ 12 = 3'],
            slider: 'Show the steps', min: 1, max: 4, start: 1
        },
        {
            title: 'Match the amount to its part',
            lines: [
                'Red roses : white roses = 4 : 7. There are 21 white roses.',
                'The amount you know might be the second thing. Divide by the number of parts for that thing.'
            ],
            maths: ['21 ÷ 7 = 3', '4 × 3 = 12'],
            callout: "Don't work out 21 ÷ 4. The 21 roses are white, and white is 7 parts.",
            slider: 'Show the steps', min: 1, max: 3, start: 1
        },
        {
            title: 'Three parts work the same way',
            lines: [
                'Nuts : raisins : seeds = 2 : 3 : 1. There are 12 g of raisins.',
                'However many parts there are, use the same value for every part.'
            ],
            maths: ['12 ÷ 3 = 4', '2 × 4 = 8', '1 × 4 = 4'],
            slider: 'Show the steps', min: 1, max: 3, start: 1
        },
        {
            title: "Don't multiply by the amount",
            lines: [
                'Cement : sand : gravel = 1 : 2 : 4. A builder uses 6 kg of sand.',
                '6 kg is the amount for 2 parts, not for 1. Always find one part first.'
            ],
            maths: ['6 ÷ 2 = 3', '1 × 3 = 3', '4 × 3 = 12'],
            slider: 'Show', min: 0, max: 1, start: 0
        }
    ]).map(screen => ({
        ...screen,
        lines: screen.lines.map(keepTogether),
        callout: keepTogether(screen.callout)
    }));

    function sliderText(screen, value) {
        if (screen === 0) return `Each part is worth: ${value} ml`;
        if (screen === 4) return `Show: ${value === 0 ? "Sam's way" : 'the right way'}`;
        return `Step ${value} of ${learnScreens[screen].max}`;
    }

    function card(questionType, parts, known, asked, config) {
        const tidy = { ...config };
        for (const key of ['prompt', 'feedback', 'fallback']) if (config[key] !== undefined) tidy[key] = keepTogether(config[key]);
        if (config.options) tidy.options = config.options.map(o => ({ ...o, label: keepTogether(o.label), feedback: keepTogether(o.feedback) }));
        if (config.rules) tidy.rules = config.rules.map(r => ({ ...r, feedback: keepTogether(r.feedback) }));
        return { questionType, ratio: parts, known: { index: known[0], amount: known[1] }, asked, ...tidy };
    }

    const typed = (questionType, parts, known, asked, inputLabel, config) =>
        card(questionType, parts, known, asked, { input: 'number', inputLabel, ...config });

    function examples() {
        const juice = 'Juice : water = 2 : 5. There are 6 cups of juice.';
        const flour = 'Flour : sugar = 3 : 2. There are 12 spoons of flour.';
        const roses = 'Red roses : white roses = 4 : 7. There are 21 white roses.';
        return [
            card('try-1', [2, 5], [0, 6], 'match', {
                input: 'choice', prompt: `${juice} Which part is the 6 cups?`, options: [
                    option('Juice: 2 parts', 'The 6 cups are juice, and juice is 2 parts.', true),
                    option('Water: 5 parts', 'The 6 cups are juice. Juice is 2 parts.'),
                    option('All 7 parts', '6 cups is only the juice, not the whole drink.'),
                    option('1 part', '6 cups is all the juice. Juice is 2 parts.')
                ]
            }),
            card('try-2', [2, 5], [0, 6], 'one-part', {
                input: 'choice', prompt: `${juice} Juice is 2 parts = 6 cups. What is 1 part worth?`, options: [
                    option('3 cups', '6 ÷ 2 = 3 cups', true),
                    option('12 cups', "That's 6 × 2. Divide to share 6 cups between 2 parts."),
                    option('4 cups', "That's 6 − 2. Divide: 6 ÷ 2."),
                    option('8 cups', "That's 6 + 2. Divide: 6 ÷ 2.")
                ]
            }),
            typed('try-3', [2, 5], [0, 6], 'amount', 'Cups of water', {
                prompt: `${juice} Water is 5 parts. 1 part is 3 cups. How many cups of water?`,
                answer: '15', rules: [
                    mistake(30, "That's 5 × 6. Multiply by one part, 3 cups."),
                    mistake(21, "That's juice and water together. Just the water: 5 × 3."),
                    mistake(8, 'Multiply, don\'t add: 5 × 3.')
                ],
                fallback: 'Water is 5 parts. Work out 5 × 3.',
                feedback: '5 × 3 = 15 cups. Check: 6 ÷ 3 = 2 and 15 ÷ 3 = 5. Back to 2 : 5 ✓'
            }),
            card('try-4', [3, 2], [0, 12], 'one-part', {
                input: 'choice', prompt: `${flour} What is 1 part worth?`, options: [
                    option('4 spoons', 'Flour is 3 parts. 12 ÷ 3 = 4 spoons', true),
                    option('36 spoons', "That's 12 × 3. Divide: 12 ÷ 3."),
                    option('6 spoons', "That's 12 ÷ 2. The 12 spoons are flour, and flour is 3 parts."),
                    option('9 spoons', "That's 12 − 3. Divide: 12 ÷ 3.")
                ]
            }),
            typed('try-5', [3, 2], [0, 12], 'amount', 'Spoons of sugar', {
                prompt: `${flour} How many spoons of sugar?`,
                answer: '8', rules: [
                    mistake(24, "That's 2 × 12. Multiply by one part, 4."),
                    mistake(20, "That's flour and sugar together. Just the sugar: 2 × 4."),
                    mistake(11, 'Taking away 1 keeps the gap, not the ratio. Find one part: 12 ÷ 3 = 4.')
                ],
                fallback: 'Find one part: 12 ÷ 3 = 4. Sugar is 2 parts.',
                feedback: '2 × 4 = 8 spoons. Check: 12 ÷ 4 = 3 and 8 ÷ 4 = 2. Back to 3 : 2 ✓'
            }),
            typed('try-6', [4, 7], [1, 21], 'one-part', 'Roses in 1 part', {
                prompt: `${roses} What is 1 part worth?`,
                answer: '3', rules: [
                    mistake(5.25, "That's 21 ÷ 4. The 21 roses are white, and white is 7 parts."),
                    mistake(147, "That's 21 × 7. Divide: 21 ÷ 7."),
                    mistake(14, "That's 21 − 7. Divide: 21 ÷ 7.")
                ],
                fallback: 'White is 7 parts. Work out 21 ÷ 7.',
                feedback: 'White is 7 parts. 21 ÷ 7 = 3 roses'
            }),
            typed('try-7', [4, 7], [1, 21], 'amount', 'Red roses', {
                prompt: `${roses} How many red roses?`,
                answer: '12', rules: [
                    mistake(84, "That's 4 × 21. Multiply by one part, 3."),
                    mistake(33, "That's all the roses. Just the red: 4 × 3."),
                    mistake(21, '21 is the white roses. Red is 4 parts of 3.'),
                    mistake(18, 'Taking away 3 keeps the gap, not the ratio. Red is 4 × 3.')
                ],
                fallback: '1 part is 3 roses. Red is 4 parts.',
                feedback: '4 × 3 = 12 roses. Check: 12 ÷ 3 = 4 and 21 ÷ 3 = 7. Back to 4 : 7 ✓'
            }),
            card('try-8', [1, 2, 4], [1, 10], 'amount', {
                input: 'number', fractions: true,
                fields: [{ id: 'first', label: 'Cement (kg)' }, { id: 'second', label: 'Gravel (kg)' }],
                prompt: 'Cement : sand : gravel = 1 : 2 : 4. There are 10 kg of sand. How much cement and how much gravel?',
                answer: pair(5, 20), rules: [
                    mistake(pair(10, 40), 'You multiplied by 10. But 10 kg is 2 parts. 1 part = 10 ÷ 2 = 5 kg.'),
                    mistake(pair(5, 40), 'Cement is right. Gravel is 4 parts: 4 × 5.'),
                    mistake(pair(20, 80), 'Divide to find one part: 10 ÷ 2 = 5 kg.')
                ],
                fallback: 'Sand is 2 parts = 10 kg. So 1 part = 10 ÷ 2 = 5 kg.',
                feedback: '1 part = 5 kg. Cement 1 × 5 = 5 kg. Gravel 4 × 5 = 20 kg. Check: 5 ÷ 5 = 1, 10 ÷ 5 = 2 and 20 ÷ 5 = 4. Back to 1 : 2 : 4 ✓'
            })
        ];
    }

    function checks() {
        return [
            typed('check-1', [2, 9], [0, 6], 'amount', 'Litres of water', {
                bankId: 'ratio-problems-01',
                prompt: 'Squash and water are mixed in the ratio 2 : 9. How many litres of water are needed for 6 litres of squash?',
                answer: '27', rules: [
                    mistake(54, "That's 9 × 6. Find one part first: 6 ÷ 2 = 3."),
                    mistake(33, "That's squash and water together. Just the water: 9 × 3."),
                    mistake(13, 'Adding keeps the gap, not the ratio. 1 part = 6 ÷ 2 = 3.')
                ],
                fallback: 'Squash is 2 parts. Find one part: 6 ÷ 2.',
                feedback: '1 part = 6 ÷ 2 = 3 litres. Water = 9 × 3 = 27 litres'
            }),
            card('check-2', [1, 2, 4], [1, 6], 'mistake', {
                input: 'choice',
                prompt: 'Cement : sand : gravel = 1 : 2 : 4. A builder uses 6 kg of sand. Sam says the gravel is 4 × 6 = 24 kg. What has Sam done wrong?', options: [
                    option('6 kg is 2 parts, not 1. 1 part is 3 kg, so the gravel is 12 kg.', 'Right. Find one part first.', true),
                    option('Nothing. Gravel is 4 parts, so 4 × 6 = 24 kg.', "Then sand would be 2 × 6 = 12 kg. But it's 6 kg."),
                    option('He should add: 6 + 4 = 10 kg.', "Adding doesn't keep the ratio. Find one part, then multiply."),
                    option('He should divide: 6 ÷ 4 = 1.5 kg.', 'Gravel is the biggest part, so it must be more than the sand.')
                ]
            }),
            typed('check-3', [3, 5, 6], [1, 40], 'amount', "Cara's money (£)", {
                bankId: 'ratio-problems-03',
                prompt: 'Ali, Ben and Cara get prize money in the ratio 3 : 5 : 6. Ben gets £40. How much does Cara get?',
                answer: '48', rules: [
                    mistake(240, "That's 6 × 40. Find one part first: 40 ÷ 5 = 8."),
                    mistake(80, "That divides by Ali's 3. Ben gets £40, and Ben is 5 parts."),
                    mistake(41, 'Adding keeps the gap, not the ratio. 1 part = 40 ÷ 5 = £8.')
                ],
                fallback: 'Ben is 5 parts. Find one part: 40 ÷ 5.',
                feedback: '1 part = 40 ÷ 5 = £8. Cara gets 6 × 8 = £48'
            }),
            card('check-4', [3, 4], [0, 9], 'amount', {
                input: 'choice',
                prompt: 'Blue : yellow = 3 : 4 makes a green paint. Jo has 9 tins of blue. How many tins of yellow does Jo need?', options: [
                    option('12', '1 part = 9 ÷ 3 = 3 tins. Yellow = 4 × 3 = 12', true),
                    option('10', 'That adds 1, the gap between 3 and 4. Multiply instead: 1 part = 3 tins.'),
                    option('36', "That's 4 × 9. Find one part first: 9 ÷ 3."),
                    option('21', "That's blue and yellow together.")
                ]
            }),
            card('check-5', [5, 2, 1], [0, 150], 'amount', {
                input: 'number', fractions: true,
                fields: [{ id: 'first', label: 'Butter (g)' }, { id: 'second', label: 'Sugar (g)' }],
                prompt: 'Flour : butter : sugar = 5 : 2 : 1. Mia uses 150 g of flour. How much butter and how much sugar does she need?',
                answer: pair(60, 30), rules: [
                    mistake(pair(300, 150), 'You multiplied by 150. But 150 g is 5 parts. 1 part = 150 ÷ 5 = 30 g.'),
                    mistake(pair(60, 150), 'Butter is right. Sugar is 1 part: 30 g.')
                ],
                fallback: 'Flour is 5 parts. Find one part: 150 ÷ 5.',
                feedback: '1 part = 150 ÷ 5 = 30 g. Butter 2 × 30 = 60 g. Sugar 1 × 30 = 30 g'
            })
        ];
    }

    function prepare(question, random) {
        return question.options ? { ...question, options: window.Maths1to9LessonEngine.shuffle(question.options, random) } : { ...question };
    }

    function pick(random) {
        const { shuffle, randomInt } = window.Maths1to9LessonEngine;
        return shuffle(practiceTypes.map(type => ({ type, seed: randomInt(0, 4294967295, random) })), random);
    }

    // Amounts with a unit ("60 ml of blue paint") or counted things ("21 white roses").
    const measured = (things, unit) => ({
        things, amount: n => `${n} ${unit}`,
        have: (i, n) => `You have ${n} ${unit} of ${things[i]}.`,
        ask: i => `How many ${unit} of ${things[i]} are needed?`,
        label: i => `${capital(things[i])} (${unit})`
    });
    const counted = things => ({
        things, amount: n => String(n),
        have: (i, n) => `There are ${n} ${things[i]}.`,
        ask: i => `How many ${things[i]} are there?`,
        label: i => capital(things[i])
    });
    const twoPartContexts = [
        measured(['blue paint', 'red paint'], 'ml'),
        measured(['juice', 'water'], 'cups'),
        measured(['flour', 'sugar'], 'g'),
        counted(['red roses', 'white roses']),
        measured(['cement', 'sand'], 'kg')
    ];
    const threePartContexts = [
        measured(['cement', 'sand', 'gravel'], 'kg'),
        measured(['nuts', 'raisins', 'seeds'], 'g'),
        counted(['red beads', 'blue beads', 'green beads'])
    ];

    // Wrong values a pupil could type: positive, whole or one decimal place,
    // and different from the answer and from each other.
    function cleanRules(answer, rules) {
        const used = new Set([number(answer)]);
        return rules.filter(rule => {
            const value = Number(rule.value);
            if (!(value > 0) || Math.abs(value * 10 - Math.round(value * 10)) > 1e-7 || used.has(rule.value)) return false;
            used.add(rule.value);
            return true;
        });
    }

    function generate(item, random) {
        const { randomInt } = window.Maths1to9LessonEngine;
        const int = (a, b) => randomInt(a, b, random);
        const choose = values => values[int(0, values.length - 1)];
        const type = item.type;
        if (!practiceTypes.includes(type)) throw new TypeError(`Unknown scaling question type: ${type}`);
        const threeParts = type === 'three-part-typed' || (type === 'find-one-part' && int(0, 1) === 1);
        for (;;) {
            let parts;
            if (threeParts) {
                parts = [int(1, 6), int(1, 6), int(1, 6)];
                if (new Set(parts).size === 1 || gcd(gcd(parts[0], parts[1]), parts[2]) !== 1) continue;
            } else {
                parts = [int(1, 9), int(1, 9)];
                if (parts[0] === parts[1] || gcd(parts[0], parts[1]) !== 1) continue;
            }
            const context = choose(threeParts ? threePartContexts : twoPartContexts);
            const u = int(2, 12);
            const knownIndex = int(0, parts.length - 1);
            let askedIndex = int(0, parts.length - 2);
            if (askedIndex >= knownIndex) askedIndex++;
            const n = parts[knownIndex], m = parts[askedIndex], K = n * u;
            // A known amount of 1 part would give the answer away.
            if (n === m || n === 1) continue;
            const known = context.things[knownIndex], asked = context.things[askedIndex];
            const answer = m * u;
            const setup = `${capital(context.things.join(' : '))} = ${parts.join(' : ')}. ${context.have(knownIndex, K)}`;
            const onePart = `1 part = ${K} ÷ ${n} = ${u}`;
            const working = `${onePart}. ${capital(asked)} = ${m} × ${u} = ${answer}`;
            const meta = [parts, [knownIndex, K]];

            if (type === 'two-part-typed' || type === 'three-part-typed') {
                const rules = cleanRules(answer, [
                    mistake(m * K, `That multiplies by ${K}. Find one part first: ${K} ÷ ${n} = ${u}.`),
                    mistake(K / m * n, `That divides by the wrong number. The ${known} is ${n} parts, so divide by ${n}.`),
                    mistake(K + (m - n), 'Adding keeps the gap, not the ratio. Find one part, then multiply.'),
                    ...(parts.length === 2 ? [mistake(K + answer, `That's the ${known} and the ${asked} together.`)] : [])
                ]);
                if (rules.length < 2) continue;
                return prepare(typed(type, ...meta, 'amount', context.label(askedIndex), {
                    ...(type === 'two-part-typed' ? {} : { bankId: 'ratio-problems-03' }),
                    prompt: `${setup} ${context.ask(askedIndex)}`, answer: number(answer), rules,
                    fallback: `The ${known} is ${n} parts. Find one part: ${K} ÷ ${n}.`, feedback: working
                }), random);
            }
            if (type === 'find-one-part') {
                const other = parts.find((part, index) => index !== knownIndex && part !== n);
                const rules = cleanRules(u, [
                    mistake(K * n, `Divide, don't multiply: ${K} ÷ ${n}.`),
                    mistake(K - n, `Divide, don't take away: ${K} ÷ ${n}.`),
                    mistake(K / other, `Divide by the parts for the ${known}: ${n}.`)
                ]);
                if (rules.length < 2) continue;
                return prepare(typed(type, ...meta, 'one-part', 'Amount in 1 part', {
                    prompt: `${setup} What is 1 part worth?`, answer: number(u), rules,
                    fallback: `The ${known} is ${n} parts. Work out ${K} ÷ ${n}.`, feedback: `The ${known} is ${n} parts. ${onePart}`
                }), random);
            }
            if (type === 'one-part-choice') {
                const values = [u, K * n, K - n, K + n];
                if (new Set(values).size !== 4) continue;
                return prepare(card(type, ...meta, 'one-part', {
                    input: 'choice', prompt: `${setup} What is 1 part worth?`, options: [
                        option(context.amount(u), `The ${known} is ${n} parts. ${onePart}`, true),
                        option(context.amount(K * n), `That's ${K} × ${n}. Divide: ${K} ÷ ${n}.`),
                        option(context.amount(K - n), `That's ${K} − ${n}. Divide: ${K} ÷ ${n}.`),
                        option(context.amount(K + n), `That's ${K} + ${n}. Divide: ${K} ÷ ${n}.`)
                    ]
                }), random);
            }
            if (type === 'which-calc') {
                return prepare(card(type, ...meta, 'working', {
                    bankId: 'proportion-and-unitary-method-02', input: 'choice',
                    prompt: `${setup} Which calculation gives the ${asked}?`, options: [
                        option(`${K} ÷ ${n} × ${m}`, `${onePart}. Then multiply by ${m}, the parts for the ${asked}.`, true),
                        option(`${K} × ${m}`, 'That multiplies by the whole amount. Find one part first.'),
                        option(`${K} ÷ ${m} × ${n}`, `That divides by the wrong number. The ${known} is ${n} parts.`),
                        option(`${K} ÷ ${n + m} × ${m}`, `${K} is only the ${known}, not the total. Divide by its own parts, ${n}.`)
                    ]
                }), random);
            }
            const values = [answer, m * K, K + (m - n), K + answer];
            if (new Set(values).size !== 4) continue;
            return prepare(card(type, ...meta, 'amount', {
                input: 'choice', prompt: `${setup} ${context.ask(askedIndex)}`, options: [
                    option(context.amount(answer), working, true),
                    option(context.amount(m * K), `That multiplies by ${K}. Find one part first: ${K} ÷ ${n}.`),
                    option(context.amount(K + (m - n)), 'Adding keeps the gap, not the ratio. Multiply instead.'),
                    option(context.amount(K + answer), `That's the ${known} and the ${asked} together.`)
                ]
            }), random);
        }
    }

    function node(tag, text = '', className = '') {
        const element = document.createElement(tag);
        element.textContent = text;
        if (className) element.className = className;
        return element;
    }

    // One row of equal blocks per thing, as in "Understanding and simplifying ratio".
    function drawBar(host, rows, columns, caption = '') {
        const figure = node('figure', '', 'ratio-bar');
        if (caption) figure.append(node('figcaption', caption));
        for (const row of rows) {
            const line = node('div', '', 'ratio-row');
            const name = node('span', row.name, 'ratio-row__name');
            if (row.amount) name.append(node('small', row.amount, row.mark ? `is-${row.mark}` : ''));
            const track = node('div', '', 'ratio-blocks');
            track.style.setProperty('--columns', columns);
            track.setAttribute('role', 'img');
            track.setAttribute('aria-label', row.label);
            for (let index = 0; index < row.count; index++) {
                track.append(node('span', row.value ?? '?', `ratio-block is-${row.kind}${row.value === undefined ? ' is-unknown' : ''}`));
            }
            line.append(name, track);
            figure.append(line);
        }
        host.append(figure);
    }

    function row(name, kind, count, value, amount, mark) {
        const label = `${name}: ${count} ${count === 1 ? 'part' : 'parts'}${value === undefined ? ', not known yet' : ` of ${value}`}${amount ? `, ${amount}` : ''}`;
        return { name, kind, count, value: value === undefined ? undefined : String(value), amount, mark, label };
    }

    function drawLearnPicture(host, screen, value) {
        host.replaceChildren();
        // Each sum, with its unit, stays on one line.
        const sums = text => text.replace(/\d+(?: [÷×+−=] \d+)+(?: (?:ml|g|kg|roses))?/g, sum => sum.replace(/ /g, NB));
        const add = (text, className = 'ratio-working') => host.append(node('p', sums(keepTogether(text)), className));
        if (screen === 0) {
            drawBar(host, [
                row('Blue', 'blue', 5, value, `${5 * value} ml`),
                row('Red', 'red', 3, value, `${3 * value} ml`)
            ], 5, `Each block is ${value} ml`);
            add(`5 × ${value} = ${5 * value} ml of blue`);
            add(`3 × ${value} = ${3 * value} ml of red`);
            add(value === 1 ? '5 : 3 is the ratio itself.' : `${5 * value} : ${3 * value} is still 5 : 3, so it's the same shade.`, 'ratio-note');
        } else if (screen === 1) {
            drawBar(host, [
                row('Blue', 'blue', 5, value >= 2 ? 12 : undefined, '60 ml'),
                row('Red', 'red', 3, value >= 3 ? 12 : undefined, value >= 3 ? '36 ml' : '? ml')
            ], 5);
            if (value === 1) add('Blue is 5 parts, and those 5 parts make 60 ml.', 'ratio-note');
            if (value >= 2) add('Blue is 5 parts. 1 part = 60 ÷ 5 = 12 ml');
            if (value >= 3) add('Red is 3 parts: 3 × 12 = 36 ml');
            if (value === 4) add('Check: 60 ÷ 12 = 5 and 36 ÷ 12 = 3. Back to 5 : 3 ✓', 'ratio-note');
        } else if (screen === 2) {
            drawBar(host, [
                row('Red', 'red', 4, value >= 3 ? 3 : undefined, value >= 3 ? '12 roses' : '? roses'),
                row('White', 'plain', 7, value >= 2 ? 3 : undefined, '21 roses')
            ], 7);
            if (value === 1) add('White is 7 parts, and those 7 parts are 21 roses.', 'ratio-note');
            if (value >= 2) add('White is 7 parts. 1 part = 21 ÷ 7 = 3 roses');
            if (value >= 3) add('Red is 4 parts: 4 × 3 = 12 roses');
        } else if (screen === 3) {
            drawBar(host, [
                row('Nuts', 'orange', 2, value >= 3 ? 4 : undefined, value >= 3 ? '8 g' : '? g'),
                row('Raisins', 'purple', 3, value >= 2 ? 4 : undefined, '12 g'),
                row('Seeds', 'teal', 1, value >= 3 ? 4 : undefined, value >= 3 ? '4 g' : '? g')
            ], 3);
            if (value === 1) add('Raisins are 3 parts, and those 3 parts are 12 g.', 'ratio-note');
            if (value >= 2) add('Raisins are 3 parts. 1 part = 12 ÷ 3 = 4 g');
            if (value >= 3) {
                add('Nuts: 2 × 4 = 8 g');
                add('Seeds: 1 × 4 = 4 g');
            }
        } else {
            const each = value === 0 ? 6 : 3;
            drawBar(host, [
                row('Cement', 'teal', 1, each, `${each} kg`),
                row('Sand', 'orange', 2, each, `${2 * each} kg ${value === 0 ? '✗' : '✓'}`, value === 0 ? 'wrong' : 'right'),
                row('Gravel', 'purple', 4, each, `${4 * each} kg`)
            ], 4, `Each block is ${each} kg`);
            if (value === 0) {
                add("Sam's way: every part is 6 kg.", 'ratio-note');
                add("Sand would be 2 × 6 = 12 kg, but it's 6 kg ✗");
            } else {
                add('Sand is 2 parts. 1 part = 6 ÷ 2 = 3 kg');
                add('Cement: 1 × 3 = 3 kg');
                add('Gravel: 4 × 3 = 12 kg');
                add('Sand is 2 × 3 = 6 kg ✓', 'ratio-note');
            }
        }
    }

    window.ScalingRatio = {
        scale, learnScreens, sliderText, examples, practiceTypes, pick, generate, checks, prepare, node, drawLearnPicture
    };
})();
