(() => {
    'use strict';

    // Rounds away float noise, so 1 + 4.5 / 100 shows as 1.045.
    const number = value => String(Number(value.toPrecision(12)));
    const round = (value, places = 2) => Math.round(value * 10 ** places + 1e-9) / 10 ** places;
    const multiplier = (rate, direction = 'up') => Number(number(direction === 'up' ? 1 + rate / 100 : 1 - rate / 100));
    const option = (label, feedback, correct = false) => ({ label: String(label), feedback, correct });
    const mistake = (value, feedback) => ({ value: number(value), feedback });
    const POWERS = ['', '', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹', '¹⁰', '¹¹', '¹²'];
    const practiceTypes = ['simple-interest', 'simple-choice', 'compound-total', 'compound-interest', 'depreciation', 'growth-count'];
    const CHOICE_TYPES = ['simple-choice', 'compound-interest', 'depreciation'];

    // The amount after the years. Simple interest only ever adds a share of the start.
    function total(start, method, direction, rates) {
        if (method === 'simple') return start + rates.reduce((sum, rate) => sum + start * rate / 100, 0);
        return rates.reduce((amount, rate) => amount * multiplier(rate, direction), start);
    }

    // 12000 → "12 000"; 7369.5 → "7369.50"; whole amounts keep no pence.
    function amount(value, money = true) {
        const rounded = round(value);
        const text = money && !Number.isInteger(rounded) ? rounded.toFixed(2) : number(rounded);
        const [whole, pence] = text.split('.');
        const grouped = whole.length > 4 ? whole.replace(/\B(?=(\d{3})+$)/g, ' ') : whole;
        return pence === undefined ? grouped : `${grouped}.${pence}`;
    }
    const pounds = value => `£${amount(value)}`;
    const power = (base, times) => times === 1 ? number(base) : `${number(base)}${POWERS[times]}`;

    const learnScreens = [
        {
            title: 'Money that grows',
            lines: ['You put £1000 in a savings account. Each year, the bank adds some extra money. This extra money is called interest.',
                'The bank tells you the interest rate as a percentage. You can use a calculator.'],
            maths: ['5% of £1000 = £50', 'After 1 year, you have £1050.'],
            slider: 'Interest rate', min: 1, max: 10, step: 1, start: 5, unit: '%'
        },
        {
            title: 'Simple interest: the same every year',
            lines: ['With simple interest, you only get interest on the money you put in.',
                'So you get the same amount every year. 5% of £1000 is £50, every year.'],
            maths: ['£50 × 3 = £150 interest', '£1000 + £150 = £1150'],
            slider: 'Years', min: 0, max: 5, step: 1, start: 3
        },
        {
            title: 'Compound interest: interest on interest',
            lines: ['With compound interest, the interest goes into your account. Next year, you get interest on that too. So the interest gets bigger every year.',
                "It's the same as the last lesson: times by 1.05 once for each year."],
            maths: ['1000 × 1.05 × 1.05 × 1.05', '1000 × 1.05³ = £1157.63'],
            callout: 'Round only at the end.',
            slider: 'Years', min: 0, max: 5, step: 1, start: 3
        },
        {
            title: 'Simple or compound?',
            lines: ['Here is £1000 at 5% interest, worked out both ways.',
                'Compound interest always ends up ahead. The longer you leave the money, the bigger the gap.'],
            maths: ['Simple: £1500', 'Compound: £1628.89', 'Compound gives £128.89 more.'],
            slider: 'Years', min: 1, max: 10, step: 1, start: 10
        },
        {
            title: 'The total or just the interest?',
            lines: ['£2000 is saved for 3 years at 8% compound interest.',
                'Read the question carefully. Does it ask for the total in the account, or just the interest?',
                'Interest = total − the money you put in.'],
            maths: ['2000 × 1.08³ = £2519.42', '2519.42 − 2000 = £519.42'],
            slider: 'Show the steps', min: 1, max: 2, step: 1, start: 1
        },
        {
            title: 'Things that lose value',
            lines: ['A phone costs £800. It loses 20% of its value every year.',
                'Some things lose value every year, like cars and phones. This is called depreciation. It works the same way: 20% off each year means times by 0.8 each year.'],
            maths: ['800 × 0.8² = £512'],
            callout: 'Count the years carefully. From the start of 2022 to the start of 2025 is 3 years, not 4.',
            slider: 'Years', min: 0, max: 4, step: 1, start: 2
        }
    ];

    const same = (rate, years) => Array(years).fill(rate);

    function card(questionType, about, config) {
        const labels = { money: 'Pounds (no £ sign)', count: 'Answer' };
        const { label = 'money', ...rest } = config;
        return {
            questionType, ...about,
            ...(config.input === 'number' ? { inputLabel: labels[label], tolerance: label === 'money' ? 0.01 : 0.5 } : {}),
            ...rest
        };
    }

    function examples() {
        return [
            card('try-1', { start: 1800, method: 'simple', direction: 'up', rates: [4.5], asked: 'interest' }, {
                bankId: 'growth-decay-and-interest-01', input: 'number',
                prompt: '£1800 is in a savings account. It earns 4.5% simple interest each year. How much interest does it earn in one year?',
                answer: '81', rules: [
                    mistake(1881, "That's the total. The question asks for the interest only."),
                    mistake(8.1, '4.5% is 0.045, not 0.0045.'),
                    mistake(810, '4.5% is 0.045, not 0.45.')
                ], fallback: 'Find 4.5% of £1800: 1800 × 0.045.', feedback: '4.5% of £1800 = 1800 × 0.045 = £81'
            }),
            card('try-2', { start: 600, method: 'simple', direction: 'up', rates: same(3, 4), asked: 'interest' }, {
                input: 'choice', prompt: '£600 earns 3% simple interest each year. How much interest does it earn in 4 years?', options: [
                    option('£72', '3% of £600 is £18 a year. £18 × 4 = £72.', true),
                    option('£18', "That's only one year. Times it by 4."),
                    option('£672', "That's the total in the account. The question asks for the interest only."),
                    option('£75.31', "That's compound interest. Simple interest is the same £18 every year.")
                ]
            }),
            card('try-3', { start: 2000, method: 'simple', direction: 'up', rates: same(5, 3), asked: 'interest' }, {
                bankId: 'growth-decay-and-interest-03', input: 'number',
                prompt: '£2000 earns 5% simple interest each year. How much interest does it earn in 3 years?',
                answer: '300', rules: [
                    mistake(2300, "That's the total. The question asks for the interest only."),
                    mistake(315.25, "That's compound interest. Simple interest is the same £100 every year."),
                    mistake(100, "That's only one year. Times it by 3.")
                ], fallback: 'Find 5% of £2000. You get that every year.', feedback: '5% of £2000 is £100 a year. £100 × 3 = £300'
            }),
            card('try-4', { start: 3600, method: 'simple', direction: 'up', rates: same(2.5, 4), asked: 'total' }, {
                bankId: 'growth-decay-and-interest-04', input: 'choice',
                prompt: '£3600 earns 2.5% simple interest each year. How much is in the account after 4 years?', options: [
                    option('£3960', '2.5% of £3600 is £90 a year. £90 × 4 = £360, and £3600 + £360 = £3960.', true),
                    option('£3690', "That's only one year of interest. Add all 4 years."),
                    option('£360', "That's only the interest. Add the £3600 you put in."),
                    option('£3973.73', "That's compound interest. Simple interest is the same £90 every year.")
                ]
            }),
            card('try-5', { start: 1250, method: 'compound', direction: 'up', rates: same(4, 2), asked: 'total' }, {
                bankId: 'growth-decay-and-interest-02', input: 'number',
                prompt: '£1250 is saved at 4% compound interest. How much is in the account after 2 years?',
                answer: '1352', rules: [
                    mistake(1350, "That's simple interest: £50 twice. Compound interest gives interest on the interest too."),
                    mistake(1300, "That's only one year. Times by 1.04 again."),
                    mistake(102, "That's only the interest. The question asks how much is in the account.")
                ], fallback: 'Times by 1.04 once for each year: 1250 × 1.04².', feedback: '1250 × 1.04² = £1352. Year 2 earns interest on the interest too.'
            }),
            card('try-6', { start: 3000, method: 'compound', direction: 'up', rates: same(4, 3), asked: 'total' }, {
                input: 'number', prompt: '£3000 is saved at 4% compound interest. How much is in the account after 3 years?',
                answer: '3374.59', rules: [
                    mistake(3360, "That's simple interest. With compound interest, times by 1.04 once for each year."),
                    mistake(3120, "That's only one year. Use 1.04³ for 3 years."),
                    mistake(374.59, "That's only the interest. The question asks how much is in the account.")
                ], fallback: 'Times by 1.04 once for each year: 3000 × 1.04³.', feedback: '3000 × 1.04³ = £3374.59'
            }),
            card('try-7', { start: 2000, method: 'compound', direction: 'up', rates: same(3, 2), asked: 'interest' }, {
                input: 'number', prompt: '£2000 is saved at 3% compound interest for 2 years. How much interest does it earn?',
                answer: '121.8', rules: [
                    mistake(2121.8, "That's the total in the account. Take away the £2000 you put in."),
                    mistake(120, "That's simple interest. With compound interest, times by 1.03²."),
                    mistake(60, "That's only one year. There are 2 years.")
                ], fallback: 'Find the total first: 2000 × 1.03². Then take away £2000.',
                feedback: '2000 × 1.03² = £2121.80. £2121.80 − £2000 = £121.80'
            }),
            card('try-8', { start: 2400, method: 'compound', direction: 'down', rates: same(15, 3), asked: 'total' }, {
                bankId: 'growth-decay-and-interest-06', input: 'choice',
                prompt: 'A projector is worth £2400. It loses 15% of its value each year. What is it worth after 3 years?', options: [
                    option('£1473.90', '85% is left each year. 2400 × 0.85³ = £1473.90.', true),
                    option('£1320', "That takes 45% off in one go. Each year's 15% comes off a smaller value."),
                    option('£926.10', "That's how much value it lost. The question asks what it's worth."),
                    option('£3650.10', 'That times by 1.15, which makes it go up. It loses value, so use 0.85.')
                ]
            }),
            card('try-9', { start: 1800, method: 'compound', direction: 'up', rates: same(8, 3), asked: 'total' }, {
                bankId: 'growth-decay-and-interest-05', input: 'number', label: 'count',
                prompt: 'A wood has 1800 pairs of birds. The number goes up by 8% each year. How many pairs are there after 3 years? Round to the nearest whole number.',
                answer: '2267', rules: [
                    mistake(2232, "That adds 24% in one go. Each year's 8% is 8% of a bigger number."),
                    mistake(467, "That's only how many more there are. The question asks how many there are."),
                    mistake(2100, "That's only 2 years. Use 1.08³ for 3 years.")
                ], fallback: 'Times by 1.08 once for each year: 1800 × 1.08³.', feedback: '1800 × 1.08³ = 2267.48, so about 2267 pairs.'
            }),
            card('try-10', { start: 400, method: 'compound', direction: 'up', rates: same(5, 3), asked: 'total' }, {
                bankId: 'growth-decay-and-interest-13', input: 'choice',
                prompt: 'At the start of 2022, a painting is worth £400. Its value goes up by 5% each year. What is it worth at the start of 2025?', options: [
                    option('£463.05', 'From 2022 to 2025 is 3 years. 400 × 1.05³ = £463.05.', true),
                    option('£486.20', "That's 4 years. From the start of 2022 to the start of 2025 is 3 years."),
                    option('£460', "That's simple: £20 three times. Each year's 5% is 5% of a bigger value."),
                    option('£420', "That's only one year. There are 3 years.")
                ]
            })
        ];
    }

    function checks() {
        return [
            card('check-1', { start: 5000, method: 'compound', direction: 'up', rates: same(1.2, 3), asked: 'interest' }, {
                bankId: 'growth-decay-and-interest-09', input: 'number',
                prompt: '£5000 is saved at 1.2% compound interest. How much interest does it earn in 3 years?',
                answer: '182.17', rules: [
                    mistake(5182.17, "That's the total in the account. Take away the £5000 you put in."),
                    mistake(180, "That's simple interest: £60 three times. With compound interest, times by 1.012³."),
                    mistake(5180, "That's the simple interest total. Use compound interest, then take away £5000.")
                ], fallback: 'Find the total first: 5000 × 1.012³. Then take away £5000.',
                feedback: '5000 × 1.012³ = £5182.17. £5182.17 − £5000 = £182.17'
            }),
            card('check-2', { start: 4000, method: 'compound', direction: 'up', rates: same(2.9, 5), asked: 'compare' }, {
                bankId: 'growth-decay-and-interest-11', input: 'choice',
                prompt: 'Two accounts both start with £4000. Account A pays 3% simple interest. Account B pays 2.9% compound interest. After 5 years, which has more money?', options: [
                    option('Account B, by £14.63', 'A: £4000 + 5 × £120 = £4600. B: 4000 × 1.029⁵ = £4614.63. B has £14.63 more.', true),
                    option('They have the same', "Don't round 2.9% up to 3%. Work out both totals."),
                    option('Account B, by £614.63', "£614.63 is all of B's interest. Take away A's total, £4600."),
                    option('Account A, by £20', "That works out B as simple interest too. B is compound, so times by 1.029⁵.")
                ]
            }),
            card('check-3', { start: 2800, method: 'compound', direction: 'up', rates: [2, 4], asked: 'total' }, {
                bankId: 'growth-decay-and-interest-07', input: 'number',
                prompt: '£2800 is saved. It earns 2% interest in the first year and 4% in the second year. How much is in the account after 2 years?',
                answer: '2970.24', rules: [
                    mistake(170.24, "That's only the interest. Add the £2800 you put in."),
                    mistake(3028.48, 'That uses 4% for both years. The first year is 2%.'),
                    mistake(2968, "That adds 6% in one go. The 4% is 4% of the new total.")
                ], fallback: 'Use two multipliers: 1.02, then 1.04.', feedback: '2800 × 1.02 × 1.04 = £2970.24'
            }),
            card('check-4', { start: 2000, method: 'compound', direction: 'up', rates: same(6, 12), asked: 'compare' }, {
                bankId: 'growth-decay-and-interest-12', input: 'choice',
                prompt: '£2000 is saved at 6% compound interest. Will it reach £4000 in 12 years?', options: [
                    option('Yes. It will be about £4024.39', '2000 × 1.06¹² = £4024.39, which is more than £4000.', true),
                    option('No. It will be £3440', "That's simple interest: £120 twelve times. Compound interest grows faster."),
                    option('No. It will be £2120', "That's only one year. Use 1.06¹² for 12 years."),
                    option('No. It will be less than £1', 'That times by 0.06, which is only the interest. Use 1.06.')
                ]
            }),
            card('check-5', { start: 15000, method: 'compound', direction: 'down', rates: same(12, 3), asked: 'total' }, {
                input: 'number', prompt: 'A car is worth £15 000. It depreciates (loses value) by 12% each year. What is it worth after 3 years?',
                answer: '10222.08', rules: [
                    mistake(9600, "That takes 36% off in one go. Each year's 12% comes off a smaller value."),
                    mistake(13200, "That's only one year. Use 0.88³ for 3 years."),
                    mistake(4777.92, "That's how much value it lost. The question asks what it's worth.")
                ], fallback: '88% is left each year. Times by 0.88 once for each year.', feedback: '15 000 × 0.88³ = £10 222.08'
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

    // Keeps rules that differ from the answer, and from each other, by more than the tolerance.
    function cleanRules(answer, rules, tolerance) {
        const kept = [];
        for (const rule of rules) {
            const value = Number(rule.value);
            if (value <= 0 || [answer, ...kept.map(each => Number(each.value))].some(other => Math.abs(other - value) <= tolerance + 1e-9)) continue;
            kept.push(rule);
        }
        return kept;
    }

    const RATES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 1.5, 2.5, 3.5];

    function generate(item, random) {
        const { randomInt } = window.Maths1to9LessonEngine;
        const int = (a, b) => randomInt(a, b, random);
        const choose = values => values[int(0, values.length - 1)];
        const type = item.type;
        if (!practiceTypes.includes(type)) throw new TypeError(`Unknown growth question type: ${type}`);
        let question;
        while (!question) {
            const start = 100 * int(5, 100);
            const years = int(2, 5);
            const rate = choose(RATES);
            const m = multiplier(rate);
            const yearly = round(start * rate / 100);
            const simple = start + yearly * years;
            const compound = round(total(start, 'compound', 'up', same(rate, years)));
            const compoundInterest = round(compound - start);
            const saved = `£${amount(start)} is saved at ${number(rate)}%`;
            const about = { start, direction: 'up', rates: same(rate, years) };

            if (type === 'simple-interest') {
                const askTotal = int(0, 1) === 1;
                const answer = askTotal ? simple : round(yearly * years);
                const rules = cleanRules(answer, [
                    mistake(askTotal ? round(yearly * years) : simple, askTotal
                        ? "That's only the interest. Add the money you put in."
                        : "That's the total. The question asks for the interest only."),
                    mistake(askTotal ? start + yearly : yearly, `That's only one year's interest. You get it for ${years} years.`),
                    mistake(askTotal ? compound : compoundInterest, `That's compound interest. Simple interest is the same £${amount(yearly)} every year.`)
                ], 0.01);
                if (rules.length < 2) continue;
                question = card(type, { ...about, method: 'simple', asked: askTotal ? 'total' : 'interest' }, {
                    input: 'number',
                    prompt: `${saved} simple interest. ${askTotal ? `How much is in the account after ${years} years?` : `How much interest does it earn in ${years} years?`}`,
                    answer: number(answer), rules,
                    fallback: `Find ${number(rate)}% of £${amount(start)}. You get that every year.`,
                    feedback: `${number(rate)}% of £${amount(start)} is ${pounds(yearly)} a year. ${pounds(yearly)} × ${years} = ${pounds(yearly * years)}${askTotal ? `, and £${amount(start)} + ${pounds(yearly * years)} = ${pounds(simple)}` : ''}`
                });
            } else if (type === 'simple-choice') {
                const labels = [simple, round(yearly * years), yearly, compound].map(pounds);
                if (new Set(labels).size !== 4) continue;
                question = card(type, { ...about, method: 'simple', asked: 'total' }, {
                    input: 'choice', prompt: `${saved} simple interest. How much is in the account after ${years} years?`, options: [
                        option(labels[0], `${pounds(yearly)} a year for ${years} years is ${pounds(yearly * years)}. £${amount(start)} + ${pounds(yearly * years)} = ${pounds(simple)}.`, true),
                        option(labels[1], "That's only the interest. Add the money you put in."),
                        option(labels[2], `That's only one year's interest. You get it for ${years} years, then add the money you put in.`),
                        option(labels[3], `That's compound interest. Simple interest is the same ${pounds(yearly)} every year.`)
                    ]
                });
            } else if (type === 'compound-total') {
                const rules = cleanRules(compound, [
                    mistake(simple, `That's simple interest. With compound interest, times by ${number(m)} once for each year.`),
                    mistake(round(start * m), `That's only one year. Use ${power(m, years)} for ${years} years.`),
                    mistake(compoundInterest, "That's only the interest. The question asks how much is in the account.")
                ], 0.01);
                if (rules.length < 2) continue;
                question = card(type, { ...about, method: 'compound', asked: 'total' }, {
                    input: 'number', prompt: `${saved} compound interest. How much is in the account after ${years} years?`,
                    answer: number(compound), rules,
                    fallback: `Times by ${number(m)} once for each year: ${amount(start)} × ${power(m, years)}.`,
                    feedback: `${amount(start)} × ${power(m, years)} = ${pounds(compound)}`
                });
            } else if (type === 'compound-interest') {
                const labels = [compoundInterest, compound, round(yearly * years), yearly].map(pounds);
                if (new Set(labels).size !== 4) continue;
                question = card(type, { ...about, method: 'compound', asked: 'interest' }, {
                    input: 'choice', prompt: `${saved} compound interest for ${years} years. How much interest does it earn?`, options: [
                        option(labels[0], `${amount(start)} × ${power(m, years)} = ${pounds(compound)}. ${pounds(compound)} − £${amount(start)} = ${pounds(compoundInterest)}.`, true),
                        option(labels[1], `That's the total in the account. Take away the £${amount(start)} you put in.`),
                        option(labels[2], `That's simple interest. For compound interest, times by ${power(m, years)}, then take away £${amount(start)}.`),
                        option(labels[3], `That's only the first year's interest. The money is saved for ${years} years.`)
                    ]
                });
            } else if (type === 'depreciation') {
                const loss = choose([5, 10, 12, 15, 20, 25]);
                const thing = choose(['car', 'van', 'laptop']);
                const price = thing === 'laptop' ? 100 * int(5, 20) : 500 * int(8, 40);
                const keep = multiplier(loss, 'down');
                const value = round(total(price, 'compound', 'down', same(loss, years)));
                const labels = [value, round(price * (1 - loss * years / 100)), round(price - value),
                    round(total(price, 'compound', 'up', same(loss, years)))];
                if (labels[1] <= 0 || new Set(labels.map(pounds)).size !== 4) continue;
                question = card(type, { start: price, method: 'compound', direction: 'down', rates: same(loss, years), asked: 'total' }, {
                    input: 'choice', prompt: `A ${thing} is worth £${amount(price)}. It loses ${loss}% of its value each year. What is it worth after ${years} years?`, options: [
                        option(pounds(labels[0]), `${100 - loss}% is left each year. ${amount(price)} × ${power(keep, years)} = ${pounds(value)}.`, true),
                        option(pounds(labels[1]), `That takes ${loss * years}% off in one go. Each year's ${loss}% comes off a smaller value.`),
                        option(pounds(labels[2]), "That's how much value it lost. The question asks what it's worth."),
                        option(pounds(labels[3]), `That times by ${number(multiplier(loss))}, which makes it go up. It loses value, so use ${number(keep)}.`)
                    ]
                });
            } else {
                const growth = int(2, 12);
                const [noun, place] = choose([['birds', 'A wood has'], ['people', 'A town has'], ['members', 'A club has']]);
                const count = noun === 'members' ? 10 * int(10, 90) : 100 * int(5, 200);
                const g = multiplier(growth);
                const exact = total(count, 'compound', 'up', same(growth, years));
                const answer = Math.round(exact);
                const rules = cleanRules(answer, [
                    mistake(Math.round(count * (1 + growth * years / 100)), `That adds ${growth * years}% in one go. Each year's ${growth}% is ${growth}% of a bigger number.`),
                    mistake(Math.round(count * g), `That's only one year. Use ${power(g, years)} for ${years} years.`),
                    mistake(Math.round(exact - count), `That's only how many more there are. The question asks how many ${noun} there are.`)
                ], 1.5);
                if (rules.length < 2) continue;
                question = card(type, { start: count, method: 'compound', direction: 'up', rates: same(growth, years), asked: 'total' }, {
                    input: 'number', label: 'count',
                    prompt: `${place} ${amount(count, false)} ${noun}. The number goes up by ${growth}% each year. How many ${noun} are there after ${years} years? Round to the nearest whole number.`,
                    answer: String(answer), rules,
                    fallback: `Times by ${number(g)} once for each year: ${amount(count, false)} × ${power(g, years)}.`,
                    feedback: `${amount(count, false)} × ${power(g, years)} = ${number(round(exact))}, so about ${amount(answer, false)} ${noun}.`
                });
            }
        }
        return prepare(question, random);
    }

    window.GrowthDecay = {
        number, round, multiplier, total, amount, pounds, power, learnScreens, examples, checks,
        practiceTypes, CHOICE_TYPES, pick, generate, prepare
    };
})();
