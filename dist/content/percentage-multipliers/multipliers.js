(() => {
    'use strict';

    // Rounds away float noise, so 1 - 7 / 100 shows as 0.93, not 0.9299999.
    const number = value => String(Number(value.toPrecision(12)));
    const multiplier = (percent, direction) => Number(number(direction === 'up' ? 1 + percent / 100 : 1 - percent / 100));
    const apply = (amount, multipliers) => multipliers.reduce((total, each) => total * each, amount);
    const round = (value, places) => Math.round(value * 10 ** places + 1e-9) / 10 ** places;
    const option = (label, feedback, correct = false) => ({ label: String(label), feedback, correct });
    const mistake = (value, feedback) => ({ value: number(value), feedback });
    const change = (percent, direction, times = 1) => Array.from({ length: times }, () => ({ percent, direction }));
    const POWERS = ['', '', '²', '³', '⁴', '⁵'];
    const practiceTypes = ['find-multiplier', 'which-multiplier', 'single-change', 'repeated-change', 'which-calculation', 'two-changes'];
    const CHOICE_TYPES = ['which-multiplier', 'which-calculation', 'two-changes'];

    // 12000 → "12 000"; 7369.5 → "7369.50"; whole amounts keep no pence.
    function amount(value, money = false) {
        const rounded = round(value, 2);
        let text = money && !Number.isInteger(rounded) ? rounded.toFixed(2) : number(rounded);
        const [whole, pence] = text.split('.');
        const grouped = whole.length > 4 ? whole.replace(/\B(?=(\d{3})+$)/g, ' ') : whole;
        return pence === undefined ? grouped : `${grouped}.${pence}`;
    }
    const pounds = value => `£${amount(value, true)}`;
    const power = (base, times) => times === 1 ? number(base) : `${number(base)}${POWERS[times]}`;

    const learnScreens = [
        {
            title: 'Two shops, two deals',
            lines: ['A pair of trainers costs £100. Shop A gives you 10% off, then another 10% off at the till. Shop B gives you 20% off.',
                "Move the slider to see what you'd pay in each shop.",
                "In this lesson, you'll learn how to make an amount bigger or smaller by a percentage in one step. You can use a calculator."],
            maths: ['10% of £90 = £9 off', "Shop A: £81. Shop B: £80. Shop B is cheaper. Shop A's second 10% comes off £90, not £100."],
            slider: 'Show the steps', min: 1, max: 3, step: 1, start: 1
        },
        {
            title: '100% means all of it',
            lines: ['To find a percentage of an amount, turn the percentage into a decimal. Then times the amount by it.',
                '100% means all of it. As a decimal, 100% is 1. The number you times by is called the multiplier.'],
            maths: ['60% = 0.6', '200 × 0.6 = 120', '100% = 1', '200 × 1 = 200', 'Times by 1 and you keep all £200.'],
            slider: 'Percentage', min: 0, max: 100, step: 10, start: 100
        },
        {
            title: 'Going up by a percentage',
            lines: ["To add 8%, you keep all of it (100%) and add 8% more. That's 108% in total, so the multiplier is 1.08."],
            maths: ['100% + 8% = 108%', '× 1.08', '200 × 1.08 = 216'],
            callout: "8% is 0.08, so 108% is 1.08. It isn't 1.8. That would be 180%.",
            slider: 'Increase', min: 0, max: 50, step: 1, start: 8
        },
        {
            title: 'Going down by a percentage',
            lines: ["To take off 7%, you start with all of it (100%) and take 7% away. That leaves 93%, so the multiplier is 0.93."],
            maths: ['100% − 7% = 93%', '× 0.93', '200 × 0.93 = 186'],
            callout: "Don't times by 0.07. That only gives the £14 you take off, not what's left.",
            slider: 'Decrease', min: 0, max: 50, step: 1, start: 7
        },
        {
            title: 'Up or down? Then multiply',
            lines: ['These three steps work for any percentage, even one like 12.5%.'],
            steps: [
                { title: 'Up or down?', text: 'Going up: add it to 100%. Going down: take it away from 100%.' },
                { title: 'Make the multiplier.', text: 'Divide by 100.' },
                { title: 'Multiply.', text: 'Times the amount by the multiplier.' }
            ],
            maths: ['100% + 12.5% = 112.5%', '112.5% → 1.125', '240 × 1.125 = 270',
                'It went up, so the answer should be more than £240 ✓', 'It went down, so the answer should be less than £240 ✓'],
            slider: 'Change', min: 0, max: 50, step: 0.5, start: 12.5
        },
        {
            title: 'The same change every year',
            lines: ['A car is worth £12 000. Every year, it loses 15% of its value.',
                "So every year, you times by 0.85. For 3 years, that's 0.85 three times. You can write that as 0.85³."],
            maths: ['12 000 × 0.85 × 0.85 × 0.85', '12 000 × 0.85³ = £7369.50'],
            callout: "Don't add the percentages. 3 years of 15% is not 45% off. Each year's 15% comes off a smaller amount, like in Shop A. Round only at the end.",
            slider: 'Years', min: 0, max: 5, step: 1, start: 3
        },
        {
            title: 'Two different changes',
            lines: ['A coat costs £500. In a sale, the price drops by 20%. Later, the sale price goes up by 10%.',
                'Two changes means two multipliers, one after the other: × 0.8, then × 1.1.',
                'You can also times the two multipliers first: 0.8 × 1.1 = 0.88. So the coat ends up at 88% of £500.'],
            maths: ['500 × 0.8 = 400', '400 × 1.1 = 440', '500 × 0.8 × 1.1 = £440'],
            callout: "It doesn't go back to £500. The 10% is 10% of £400, so it adds back less than the £100 that came off.",
            slider: 'Show the steps', min: 1, max: 3, step: 1, start: 1
        }
    ];

    function card(questionType, start, changes, asked, config) {
        const labels = { multiplier: 'Multiplier', percent: 'Percentage (no % sign)', money: 'Pounds (no £ sign)', count: 'Answer' };
        const { label, ...rest } = config;
        return {
            questionType, start, changes, asked,
            ...(config.input === 'number' ? { inputLabel: labels[label || 'count'] } : {}),
            ...(label === 'money' ? { tolerance: 0.01 } : {}),
            ...rest
        };
    }

    function examples() {
        return [
            card('try-1', null, change(8, 'up'), 'multiplier', {
                input: 'choice', prompt: 'Which multiplier increases an amount by 8%?', options: [
                    option('1.08', '100% + 8% = 108%, and 108% is 1.08.', true),
                    option('1.8', '1.8 is 180%. 8% is 0.08, so 108% is 1.08.'),
                    option('0.08', "0.08 is only the 8% you add. You keep the 100% as well, so it's 108%, which is 1.08."),
                    option('0.92', '0.92 is for a decrease of 8%.')
                ]
            }),
            card('try-2', 75, change(8, 'up'), 'final', {
                input: 'number', prompt: 'Increase 75 by 8%.', answer: '81', rules: [
                    mistake(6, "That's only the 8% you add. Times by 1.08 so you keep the 75 as well."),
                    mistake(135, "That's 75 × 1.8. 8% is 0.08, so use 1.08."),
                    mistake(69, "That's a decrease. An increase makes it bigger.")
                ], fallback: 'Use the multiplier 1.08.', feedback: '75 × 1.08 = 81'
            }),
            card('try-3', null, change(7, 'down'), 'multiplier', {
                input: 'choice', prompt: 'Which multiplier decreases an amount by 7%?', options: [
                    option('0.93', '100% − 7% = 93%, and 93% is 0.93.', true),
                    option('0.07', "0.07 finds the 7% you take off. What's left is 93%."),
                    option('0.7', '0.7 is 70%. 7% is 0.07.'),
                    option('1.07', '1.07 is for an increase of 7%.')
                ]
            }),
            card('try-4', 450, change(12, 'down'), 'final', {
                input: 'number', prompt: 'Decrease 450 by 12%.', answer: '396', rules: [
                    mistake(54, "That's the 12% you take off. Multiply by 0.88 to find what's left."),
                    mistake(504, "That's an increase. A decrease makes it smaller.")
                ], fallback: '100% − 12% = 88%. Times 450 by 0.88.', feedback: '100% − 12% = 88%. 450 × 0.88 = 396'
            }),
            card('try-5', null, change(35, 'up'), 'multiplier', {
                input: 'number', label: 'multiplier', prompt: 'What is the multiplier for an increase of 35%?', answer: '1.35', rules: [
                    mistake(0.35, "That's only the 35% you add. You keep the 100% as well: 135%."),
                    mistake(135, '135% is right. Now divide it by 100 to get the multiplier.'),
                    mistake(0.65, '0.65 is for a decrease of 35%.')
                ], fallback: 'Add 35% to 100%, then divide by 100.', feedback: '100% + 35% = 135% = 1.35'
            }),
            card('try-6', 60, change(35, 'up'), 'final', {
                input: 'number', prompt: 'Increase 60 by 35%.', answer: '81', rules: [
                    mistake(21, "That's only the 35% you add. Times 60 by 1.35."),
                    mistake(39, "That takes 35% off. You need to add it, so times by 1.35.")
                ], fallback: 'Use the multiplier 1.35.', feedback: '60 × 1.35 = 81'
            }),
            card('try-7', null, [{ percent: 18, direction: 'down' }, { percent: 20, direction: 'down' }], 'multiplier', {
                bankId: 'percentage-multipliers-01', input: 'choice',
                prompt: 'A price goes down by 18%. Then the new price goes down by 20%. Which single number can you multiply the first price by to get the final price?',
                options: [
                    option('0.82 × 0.80 = 0.656', 'Times the two multipliers together: 0.82 × 0.80 = 0.656.', true),
                    option('1 − 0.18 − 0.20 = 0.62', 'That just adds the two percentages. The 20% comes off the new, smaller price.'),
                    option('1.18 × 1.20 = 1.416', 'Those are multipliers for going up. Both changes go down.'),
                    option('0.82 × 0.20 = 0.164', '0.20 finds the 20% taken off. What\'s left is 80%, so use 0.80.')
                ]
            }),
            card('try-8', 3600, [{ percent: 12, direction: 'down' }, { percent: 25, direction: 'down' }], 'final', {
                bankId: 'percentage-multipliers-02', input: 'number', label: 'money',
                prompt: 'Some stage lights are worth £3600. Their value goes down by 12% in the first year and by 25% in the second year. What are they worth after two years?',
                answer: '2376', rules: [
                    mistake(2268, 'That takes 37% off in one go. The 25% comes off the value after year 1, not £3600.'),
                    mistake(5040, 'Those are increases. The value goes down.'),
                    mistake(1224, "£1224 is how much value they lost. The question asks what they're worth.")
                ], fallback: 'Use two multipliers: 0.88, then 0.75.', feedback: '3600 × 0.88 × 0.75 = £2376'
            }),
            card('try-9', 8000, change(4, 'up', 5), 'calculation', {
                input: 'choice', prompt: 'A town has 8000 people. The number goes up by 4% every year. Which calculation gives the number after 5 years?', options: [
                    option('8000 × 1.04⁵', 'Times by 1.04 once for each year: 1.04⁵.', true),
                    option('8000 × 1.2', "That adds 5 × 4% = 20%. Each year's 4% is 4% of a bigger number."),
                    option('8000 × 1.04 × 5', 'That times by 5. You need to times by 1.04 five times: 1.04⁵.'),
                    option('8000 × 0.04⁵', '0.04 is only the 4% added. You keep the 100% as well, so use 1.04.')
                ]
            }),
            card('try-10', 1200, change(5, 'down', 3), 'final', {
                input: 'number', tolerance: 0.15,
                prompt: 'A wood has 1200 birds. The number goes down by 5% each year. How many birds are there after 3 years? Round to the nearest whole number.',
                answer: '1029', rules: [
                    mistake(1020, "That takes 15% off in one go. Each year's 5% comes off a smaller number. Work out 1200 × 0.95³."),
                    mistake(1140, "That's only one year. Use 0.95³ for 3 years."),
                    mistake(0.15, '0.05 is the part that goes. 95% is left each year, so use 0.95.')
                ], fallback: 'Times by 0.95 once for each year: 1200 × 0.95³.', feedback: '1200 × 0.95³ = 1028.85, so about 1029 birds.'
            })
        ];
    }

    function checks() {
        return [
            card('check-1', 6400, [{ percent: 20, direction: 'down' }, { percent: 15, direction: 'down' }], 'mistake', {
                bankId: 'percentage-multipliers-07', input: 'choice',
                prompt: "A kiln is worth £6400. Its value goes down by 20% in year 1. Then it goes down by 15% of the new value in year 2. Sam says it's worth £4160 now. Which reply is right?",
                options: [
                    option("No. It's worth £4352: 6400 × 0.80 × 0.85.", 'Right. Sam just added 20% and 15%. But the 15% comes off the value after year 1.', true),
                    option('Yes. 20% + 15% = 35%, and 6400 × 0.65 = 4160.', 'The 15% comes off the value after year 1, not £6400.'),
                    option("No. It's worth £4624.", 'That takes 15% off in both years. Year 1 is 20%.'),
                    option("No. It's worth £4096.", 'That takes 20% off in both years. Year 2 is 15%.')
                ]
            }),
            card('check-2', 960, change(25, 'down', 2), 'change', {
                bankId: 'percentage-multipliers-08', input: 'number',
                prompt: 'A tank holds 960 litres of water. Each day, 25% of the water left in it is used. How many litres are used on day 2?',
                answer: '180', rules: [
                    mistake(240, '240 litres is 25% of 960. That was used on day 1.'),
                    mistake(540, '540 litres are left after day 2. The question asks how much is used that day.'),
                    mistake(720, '720 litres are left after day 1. Now find 25% of that.')
                ], fallback: 'Find what is left after day 1 first. Then find 25% of that.',
                feedback: 'Day 1 leaves 960 × 0.75 = 720 litres. Day 2 uses 25% of 720, which is 180 litres.'
            }),
            card('check-3', 250000, change(8, 'up', 2), 'final', {
                input: 'number', label: 'money', prompt: 'A flat is worth £250 000. Its value goes up by 8% each year. What is it worth after 2 years?',
                answer: '291600', rules: [
                    mistake(290000, "That adds 16% in one go. Year 2's 8% is 8% of a bigger value, so use 1.08²."),
                    mistake(270000, "That's only one year. Use 1.08²."),
                    mistake(41600, "£41 600 is how much it went up. The question asks what it's worth.")
                ], fallback: 'Times by 1.08 once for each year: 1.08².', feedback: '250 000 × 1.08² = £291 600'
            }),
            card('check-4', 500, change(13, 'down', 3), 'final', {
                input: 'choice', prompt: 'A school has 500 pencils. The number goes down by 13% each term. How many are left after 3 terms, to the nearest whole number?', options: [
                    option('329', '500 × 0.87³ = 329.25, so 329 pencils.', true),
                    option('305', "That takes 39% off in one go. Each term's 13% comes off a smaller number."),
                    option('435', "That's only one term. Use 0.87³."),
                    option('1', '0.13 is the part that goes. 87% is left each term, so use 0.87.')
                ]
            }),
            card('check-5', null, [{ percent: 8, direction: 'up' }, { percent: 15, direction: 'up' }], 'change', {
                bankId: 'percentage-multipliers-03', input: 'number', label: 'percent',
                prompt: "A club's members go up by 8% one year. The next year they go up by 15%. What is the total percentage increase over the two years?",
                answer: '24.2', rules: [
                    mistake(23, 'That just adds 8 and 15. Times the multipliers together: 1.08 × 1.15.'),
                    mistake(124.2, '124.2% is the new total. Take away the 100% you started with.'),
                    mistake(1.242, "1.242 is the multiplier. As a percentage that's 124.2%. Take away the 100% you started with.")
                ], fallback: 'Times the two multipliers together. Then turn the answer into a percentage.',
                feedback: "1.08 × 1.15 = 1.242. That's 124.2%, so a 24.2% increase."
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
    function cleanRules(answer, rules, tolerance = 0) {
        const kept = [];
        for (const rule of rules) {
            const value = Number(rule.value);
            if ([answer, ...kept.map(each => Number(each.value))].some(other => Math.abs(other - value) <= tolerance + 1e-9)) continue;
            kept.push(rule);
        }
        return kept;
    }

    const SMALL = [2, 3, 4, 5, 6, 7, 8, 9];
    const HALVES = [2.5, 12.5, 17.5];
    const WHOLE = Array.from({ length: 39 }, (_, index) => index + 2);

    // The slip of reading P% as 0.P: 8% up → 1.8, 7% down → 0.7, 17.5% up → 1.75.
    function slip(percent, direction) {
        if (direction === 'down') return percent / 10;
        if (Number.isInteger(percent)) return 1 + percent / 10;
        return 1 + Number(String(percent).replace('.', '')) / 100;
    }

    function generate(item, random) {
        const { randomInt } = window.Maths1to9LessonEngine;
        const int = (a, b) => randomInt(a, b, random);
        const choose = values => values[int(0, values.length - 1)];
        const type = item.type;
        if (!practiceTypes.includes(type)) throw new TypeError(`Unknown multiplier question type: ${type}`);
        const upWord = direction => direction === 'up' ? 'an increase' : 'a decrease';
        const otherWord = direction => direction === 'up' ? 'a decrease' : 'an increase';
        const other = direction => direction === 'up' ? 'down' : 'up';
        let question;

        if (type === 'find-multiplier') {
            const direction = choose(['up', 'down']);
            const percent = int(0, 3) === 0 ? choose(HALVES) : choose(WHOLE);
            const m = multiplier(percent, direction);
            const kept = direction === 'up' ? 100 + percent : 100 - percent;
            const sum = `100% ${direction === 'up' ? '+' : '−'} ${number(percent)}% = ${number(kept)}%`;
            question = card(type, null, change(percent, direction), 'multiplier', {
                input: 'number', label: 'multiplier', prompt: `What is the multiplier for ${upWord(direction)} of ${number(percent)}%?`,
                answer: number(m), rules: cleanRules(m, [
                    mistake(percent / 100, `That's just the ${number(percent)}%. ${direction === 'up' ? 'Add it to' : 'Take it from'} 100% first.`),
                    mistake(multiplier(percent, other(direction)), `That's for ${otherWord(direction)}.`),
                    mistake(kept, `${number(kept)}% is right. Divide by 100 to get the multiplier.`)
                ]),
                fallback: `${direction === 'up' ? 'Add' : 'Take'} ${number(percent)}% ${direction === 'up' ? 'to' : 'from'} 100%, then divide by 100.`,
                feedback: `${sum} = ${number(m)}`
            });
        } else if (type === 'which-multiplier') {
            const direction = choose(['up', 'down']);
            const percent = direction === 'up' ? choose([...SMALL, ...HALVES]) : choose(SMALL);
            const m = multiplier(percent, direction);
            const kept = direction === 'up' ? 100 + percent : 100 - percent;
            question = card(type, null, change(percent, direction), 'multiplier', {
                input: 'choice', prompt: `Which multiplier ${direction === 'up' ? 'increases' : 'decreases'} an amount by ${number(percent)}%?`, options: [
                    option(number(m), `100% ${direction === 'up' ? '+' : '−'} ${number(percent)}% = ${number(kept)}%, and ${number(kept)}% is ${number(m)}.`, true),
                    option(number(percent / 100), `That's only the ${number(percent)}%. ${direction === 'up' ? 'Keep the 100% too.' : "What's left is " + number(kept) + '%.'}`),
                    option(number(multiplier(percent, other(direction))), `That's for ${otherWord(direction)} of ${number(percent)}%.`),
                    option(number(slip(percent, direction)), `${number(percent)}% is ${number(percent)} ÷ 100 = ${number(percent / 100)}, so the multiplier is ${number(m)}.`)
                ]
            });
        } else if (type === 'single-change') {
            const direction = choose(['up', 'down']);
            const small = int(0, 3) === 0;
            const percent = direction === 'up' && small ? choose(SMALL) : int(0, 3) === 0 ? choose(HALVES) : choose(WHOLE);
            const start = 4 * int(5, 1250);
            const m = multiplier(percent, direction);
            const answer = round(start * m, 2);
            const isMoney = int(0, 1) === 1;
            const thing = choose(['phone', 'bike', 'sofa', 'TV']);
            const prompt = isMoney
                ? `A ${thing} costs £${amount(start)}. Its price goes ${direction} by ${number(percent)}%. What is the new price?`
                : `${direction === 'up' ? 'Increase' : 'Decrease'} ${amount(start)} by ${number(percent)}%.`;
            const rules = [
                mistake(round(start * percent / 100, 2), `That's only the part that changes. Times by ${number(m)} so you keep the rest too.`),
                mistake(round(start * multiplier(percent, other(direction)), 2), `That's ${otherWord(direction)}. Use ${number(m)}.`)
            ];
            if (direction === 'up' && Number.isInteger(percent) && percent < 10) {
                rules.push(mistake(round(start * slip(percent, 'up'), 2), `${percent}% is 0.0${percent}, not 0.${percent}. Use ${number(m)}.`));
            }
            question = card(type, start, change(percent, direction), 'final', {
                input: 'number', label: isMoney ? 'money' : 'count', prompt, answer: number(answer),
                rules: cleanRules(answer, rules, isMoney ? 0.01 : 0),
                fallback: `Times by the multiplier ${number(m)}.`,
                feedback: `${amount(start)} × ${number(m)} = ${isMoney ? pounds(answer) : amount(answer)}`
            });
        } else if (type === 'repeated-change' || type === 'which-calculation') {
            let start, percent, years, direction, setting, rules, answer, m;
            const settings = [
                { direction: 'down', money: true, start: () => 500 * int(8, 60), text: s => `A car is worth £${amount(s)}. Its value goes down by`, what: 'What is it worth' },
                { direction: 'up', money: true, start: () => 5000 * int(30, 80), text: s => `A house is worth £${amount(s)}. Its value goes up by`, what: 'What is it worth' },
                { direction: choose(['up', 'down']), money: false, start: () => 100 * int(5, 200), text: s => `A wood has ${amount(s)} birds. The number goes %DIR% by`, what: 'How many birds are there' },
                { direction: choose(['up', 'down']), money: false, start: () => 100 * int(5, 200), text: s => `A town has ${amount(s)} people. The number goes %DIR% by`, what: 'How many people are there' }
            ];
            do {
                setting = choose(settings);
                direction = setting.direction;
                start = setting.start();
                percent = int(2, 20);
                years = int(2, 5);
                m = multiplier(percent, direction);
                const exact = apply(start, Array(years).fill(m));
                answer = setting.money ? round(exact, 2) : Math.round(exact);
                const tolerance = setting.money ? 0.01 : 0.5;
                const shown = value => setting.money ? round(value, 2) : Math.round(value);
                const added = multiplier(percent * years, direction);
                rules = cleanRules(answer, [
                    mistake(shown(start * added), `That just adds the percentages. Each year's ${percent}% is ${percent}% of a new amount, so use ${power(m, years)}.`),
                    mistake(shown(start * m), `That's only one year. Use ${power(m, years)} for ${years} years.`),
                    mistake(shown(start * (percent / 100) ** years), `${number(percent / 100)} is only the part that changes. Use the multiplier ${number(m)}.`)
                ], tolerance);
                if (direction === 'down' && percent * years >= 100) continue;
                if (rules.length >= 2) break;
            } while (true);
            const prompt = `${setting.text(start).replace('%DIR%', direction)} ${percent}% each year.`;
            const changes = change(percent, direction, years);
            if (type === 'repeated-change') {
                question = card(type, start, changes, 'final', {
                    input: 'number', label: setting.money ? 'money' : 'count',
                    ...(setting.money ? {} : { tolerance: 0.5 }),
                    prompt: `${prompt} ${setting.what} after ${years} years?${setting.money ? '' : ' Round to the nearest whole number.'}`,
                    answer: number(answer), rules,
                    fallback: `Times by ${number(m)} once for each year: ${power(m, years)}.`,
                    feedback: `${amount(start)} × ${power(m, years)} = ${setting.money ? pounds(answer) : number(round(apply(start, Array(years).fill(m)), 2))}${setting.money ? '' : `, so about ${amount(answer)}`}`
                });
            } else {
                const added = multiplier(percent * years, direction);
                question = card(type, start, changes, 'calculation', {
                    input: 'choice', prompt: `${prompt} Which calculation gives the ${setting.money ? 'value' : 'number'} after ${years} years?`, options: [
                        option(`${amount(start)} × ${power(m, years)}`, `Times by ${number(m)} once for each year: ${power(m, years)}.`, true),
                        option(`${amount(start)} × ${number(added)}`, `That adds ${years} × ${percent}% = ${percent * years}%. Each year's ${percent}% is ${percent}% of a new amount.`),
                        option(`${amount(start)} × ${number(m)} × ${years}`, `That times by ${years}. You need to times by ${number(m)}, ${years} times: ${power(m, years)}.`),
                        option(`${amount(start)} × ${power(percent / 100, years)}`, `${number(percent / 100)} is only the part that changes. Use the multiplier ${number(m)}.`)
                    ]
                });
            }
        } else {
            let start, first, second, secondDirection, labels, answer;
            do {
                start = 20 * int(5, 50);
                first = choose([10, 15, 20, 25]);
                secondDirection = choose(['down', 'up']);
                second = secondDirection === 'down' ? choose([5, 10, 15]) : choose([5, 10, 20]);
                const m1 = multiplier(first, 'down');
                const m2 = multiplier(second, secondDirection);
                answer = round(start * m1 * m2, 2);
                const together = secondDirection === 'down' ? first + second : first - second;
                labels = [
                    answer,
                    round(start * multiplier(together, 'down'), 2),
                    round(start * m1, 2),
                    round(start - answer, 2)
                ];
            } while (new Set(labels).size !== 4);
            const m1 = multiplier(first, 'down');
            const m2 = multiplier(second, secondDirection);
            const verb = secondDirection === 'down' ? 'is cut by' : 'goes up by';
            question = card(type, start, [{ percent: first, direction: 'down' }, { percent: second, direction: secondDirection }], 'final', {
                bankId: 'percentage-change-06', input: 'choice',
                prompt: `A desk costs £${amount(start)}. Its price is cut by ${first}%. Then the new price ${verb} ${second}%. What is the final price?`,
                options: [
                    option(pounds(labels[0]), `${amount(start)} × ${number(m1)} × ${number(m2)} = ${pounds(answer)}`, true),
                    option(pounds(labels[1]), `That does both changes to £${amount(start)} in one go. The ${second}% is a percentage of the new price, not £${amount(start)}.`),
                    option(pounds(labels[2]), `That's only the first change. Now times by ${number(m2)}.`),
                    option(pounds(labels[3]), `That's how much the price has gone down altogether. The question asks for the final price.`)
                ]
            });
        }
        return prepare(question, random);
    }

    window.PercentageMultipliers = {
        multiplier, apply, amount, pounds, power, number, learnScreens, examples, checks,
        practiceTypes, CHOICE_TYPES, pick, generate, prepare
    };
})();
