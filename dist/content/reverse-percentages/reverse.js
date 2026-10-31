(() => {
    'use strict';

    // Rounds away float noise, so 1 - 7 / 100 shows as 0.93, not 0.9299999.
    const number = value => String(Number(value.toPrecision(12)));
    const multiplier = (percent, direction) => Number(number(direction === 'up' ? 1 + percent / 100 : 1 - percent / 100));
    const round = (value, places = 2) => Math.round(value * 10 ** places + 1e-9) / 10 ** places;
    const option = (label, feedback, correct = false) => ({ label: String(label), feedback, correct });
    const mistake = (value, feedback) => ({ value: number(round(value)), feedback });
    const practiceTypes = ['percent-now', 'which-divide', 'compare', 'decrease', 'increase', 'percent-of-number'];
    const CHOICE_TYPES = ['percent-now', 'which-divide', 'compare'];

    // 12000 → "12 000"; 7.5 as money → "7.50"; whole amounts keep no pence.
    function amount(value, money = false) {
        const rounded = round(value, 2);
        const text = money && !Number.isInteger(rounded) ? rounded.toFixed(2) : number(rounded);
        const [whole, pence] = text.split('.');
        const grouped = whole.length > 4 ? whole.replace(/\B(?=(\d{3})+$)/g, ' ') : whole;
        return pence === undefined ? grouped : `${grouped}.${pence}`;
    }
    const pounds = value => `£${amount(value, true)}`;

    // Text inside **…** is shown in bold.
    const learnScreens = [
        {
            title: "Jo's mistake",
            lines: ['A coat is 20% off in a sale. It now costs £60. Jo wants to know what it cost before the sale.',
                "Move the slider to follow Jo's working.",
                "In this lesson, you'll learn how to find an amount before a percentage change. You can use a calculator."],
            maths: ['Jo adds 20% of £60 back on: £60 + £12 = £72', 'Check: 20% of £72 is £14.40. £72 − £14.40 = £57.60',
                "That's not £60, so Jo is wrong. The 20% came off the price before the sale, not off £60."],
            slider: 'Show the steps', min: 1, max: 2, step: 1, start: 1
        },
        {
            title: 'The price before is 100%',
            lines: ['The percentage in the question is always a percentage of the amount **before** the change. So the price before the sale is 100%.',
                '20% comes off, so 80% is left. The £60 you pay is that 80%.'],
            maths: ['100% − 20% = 80%', 'So £60 is 80% of the price before.'],
            slider: 'Percentage off', min: 5, max: 50, step: 5, start: 20, unit: '%'
        },
        {
            title: 'Going up: more than 100%',
            lines: ['Rent goes up by 25%. It is now £150.',
                'The rent before is 100%. 25% is added on, so the rent now is 125%. The £150 you pay now is that 125%.'],
            maths: ['100% + 25% = 125%', 'So £150 is 125% of the rent before.'],
            slider: 'Increase', min: 5, max: 50, step: 5, start: 25, unit: '%'
        },
        {
            title: 'Find 1%, then 100%',
            lines: ['Back to the coat. £60 is 80% of the price before the sale.',
                '£60 is 80 lots of 1%. So to find 1%, divide £60 by 80. Then times by 100 to get all of it.'],
            maths: ['£60 is 80%', '1%: £60 ÷ 80 = £0.75', '100%: £0.75 × 100 = £75', 'The coat cost £75 before the sale.',
                'Check: 20% of £75 is £15. £75 − £15 = £60 ✓'],
            slider: 'Show the steps', min: 1, max: 3, step: 1, start: 1
        },
        {
            title: 'Or divide by the multiplier',
            lines: ['With a calculator, you can do it in one step.',
                'To take 20% off, you times by 0.8 (80% as a decimal). This is the **multiplier**. To go back, do the opposite: divide by 0.8.'],
            maths: ['£75 × 0.8 = £60', '£60 ÷ 0.8 = £75'],
            callout: "Don't times £60 by 1.2. That adds 20% of £60, which is only £12. The 20% that came off was 20% of £75, which is £15. That was Jo's mistake.",
            slider: 'Show the steps', min: 1, max: 2, step: 1, start: 1
        },
        {
            title: 'Up or down? Then divide',
            lines: ['A price has changed. It is now £396. Use these three steps to find the price before.',
                'Then check your answer. Do the change forwards and you should get £396 again.'],
            steps: [
                { title: 'Up or down?', text: 'Going up: add the percentage to 100%. Going down: take it away from 100%.' },
                { title: 'Make the multiplier.', text: 'Divide by 100.' },
                { title: 'Divide.', text: 'Divide the amount you have now by the multiplier.' }
            ],
            maths: ['100% − 20% = 80%', '80% → 0.8', '396 ÷ 0.8 = 495', 'Check: 495 × 0.8 = 396 ✓'],
            slider: 'Change', values: [10, 20, 25, 50], start: 20, unit: '%'
        },
        {
            title: 'Find the amount that is 100%',
            lines: ["Questions don't always say \"increase\" or \"decrease\". Find the amount before the change, or the amount you compare with. That one is 100%."],
            examples: [
                { text: 'A bike is 20% off.', direction: 'down', whole: 'The price before the sale', now: 'The sale price' },
                { text: 'Bus fares go up by 20%.', direction: 'up', whole: 'The fare before', now: 'The new fare' },
                { text: 'A kettle costs £96, including 20% VAT.', note: 'VAT is a tax that is added on to a price.', direction: 'up', whole: 'The price without VAT', now: 'The £96' },
                { text: 'A car has lost 20% of its value.', direction: 'down', whole: 'Its value when it was new', now: 'Its value now' },
                { text: "Ali's journey takes 20% longer than Ben's.", direction: 'up', whole: "Ben's time", now: "Ali's time" },
                { text: 'Sam earns 20% less than Kim.', direction: 'down', whole: 'Kim\'s pay', now: "Sam's pay" }
            ],
            callout: "\"Ali's journey takes 20% longer than Ben's\" means Ben's time is 100%, even though Ali comes first.",
            slider: 'Example', min: 1, max: 6, step: 1, start: 1
        }
    ];

    const LABELS = { money: 'Pounds (no £ sign)', count: 'Answer' };

    // given is the amount in the question; givenPercent is the percentage of
    // the amount before that it stands for (80 after 20% off, 120 after 20% up).
    function card(questionType, given, givenPercent, asked, config) {
        const { label, ...rest } = config;
        return {
            questionType, given, givenPercent, asked,
            ...(config.input === 'number' ? { inputLabel: LABELS[label || 'count'], tolerance: 0.01 } : {}),
            ...rest
        };
    }

    function examples() {
        return [
            card('try-1', null, 65, 'percent-now', {
                input: 'choice',
                prompt: 'A price goes down by 35%. The price before is 100%. What percentage is the new price?',
                options: [
                    option('65%', '100% − 35% = 65%. The new price is 65% of the price before.', true),
                    option('35%', "35% is the part that came off. Take it away from 100% to see what's left."),
                    option('135%', '135% is for a 35% increase. The price went down.'),
                    option('100%', '100% is the price before. 35% has come off since then, so the new price is less.')
                ]
            }),
            card('try-2', 91, 35, 'original', {
                bankId: 'reverse-percentages-01', input: 'number',
                prompt: '35% of a number is 91. What is the number?', answer: '260', rules: [
                    mistake(31.85, "That's 35% of 91. But 91 is already the 35%."),
                    mistake(2.6, '2.6 is only 1%. Now times it by 100.'),
                    mistake(140, 'That treats 91 as 65%. The question says 91 is 35%.')
                ], fallback: '91 is 35%. Divide by 35 to find 1%. Then times by 100.',
                feedback: '1% is 91 ÷ 35 = 2.6. 100% is 2.6 × 100 = 260.'
            }),
            card('try-3', 56, 70, 'original', {
                input: 'number', label: 'money',
                prompt: 'A bike is 30% off in a sale. It now costs £56. What was the price before the sale?', answer: '80', rules: [
                    mistake(72.8, "That adds 30% of £56. But the 30% came off the price before, which was more than £56."),
                    mistake(186.67, '£56 is the 70% that is left, not the 30% that came off.'),
                    mistake(39.2, 'That takes 30% off again. The price before must be more than £56.')
                ], fallback: '100% − 30% = 70%. So £56 is 70% of the price before. Find 1%, then 100%.',
                feedback: '£56 is 70%. 1% is £56 ÷ 70 = £0.80. 100% is £0.80 × 100 = £80.'
            }),
            card('try-4', 150, 125, 'calculation', {
                input: 'choice',
                prompt: 'Rent goes up by 25%. It is now £150. Which calculation gives the rent before?',
                options: [
                    option('150 ÷ 1.25', '£150 is 125% of the rent before. 150 ÷ 1.25 = £120.', true),
                    option('150 × 0.75', 'That takes 25% off £150. But the 25% was 25% of the rent before, not of £150.'),
                    option('150 ÷ 0.75', 'Dividing by 0.75 is for a 25% decrease. The rent went up.'),
                    option('150 × 1.25', 'That makes it bigger again. The rent before must be less than £150.')
                ]
            }),
            card('try-5', 92, 115, 'original', {
                input: 'number',
                prompt: 'A plant grows 15% taller. It is now 92 cm tall. How tall was it before? Give your answer in cm.', answer: '80', rules: [
                    mistake(78.2, 'That takes 15% off 92 cm. But the 15% was 15% of the height before.'),
                    mistake(105.8, 'That makes it taller again. The plant was shorter before.'),
                    mistake(613.33, '92 cm is 115% of the height before, not 15%.')
                ], fallback: '100% + 15% = 115%. Divide 92 by 1.15.',
                feedback: '92 cm is 115%. 92 ÷ 1.15 = 80 cm.'
            }),
            card('try-6', 228, 76, 'original', {
                bankId: 'reverse-percentages-03', input: 'choice',
                prompt: "A chair's price is cut by 24%. It now costs £228. What was the price before?",
                options: [
                    option('£300', '£228 is 76% of the price before. £228 ÷ 0.76 = £300.', true),
                    option('£173.28', 'That takes 24% off £228. The price before must be more than £228.'),
                    option('£950', '£228 is the 76% that is left, not the 24% that came off.'),
                    option('£282.72', 'That adds 24% of £228. But the 24% was 24% of the price before, not of £228.')
                ]
            }),
            card('try-7', 96, 120, 'original', {
                input: 'number', label: 'money',
                prompt: 'A kettle costs £96. This includes 20% VAT. What is the price without VAT?', answer: '80', rules: [
                    mistake(76.8, 'That takes 20% off £96. But the VAT was 20% of the price without VAT, not of £96.'),
                    mistake(115.2, 'That adds VAT again. The price without VAT is less than £96.'),
                    mistake(480, '£96 is 120% of the price without VAT, not 20%.')
                ], fallback: 'VAT is added on, so £96 is 100% + 20% = 120%. Divide 96 by 1.2.',
                feedback: '£96 is 120%. 96 ÷ 1.2 = £80.'
            }),
            card('try-8', 54, 120, 'original', {
                input: 'choice',
                prompt: "Ali's journey takes 20% longer than Ben's. Ali's takes 54 minutes. How long does Ben's take?",
                options: [
                    option('45 minutes', "Ben's time is 100%, so Ali's 54 minutes is 120%. 54 ÷ 1.2 = 45 minutes.", true),
                    option('43.2 minutes', "That takes 20% off 54. But the 20% is 20% of Ben's time, not Ali's."),
                    option('64.8 minutes', "That makes it longer. Ben's journey is shorter than Ali's."),
                    option('270 minutes', "Ali's 54 minutes is 120% of Ben's time, not 20%.")
                ]
            }),
            card('try-9', 7800, 65, 'original', {
                input: 'number', label: 'money',
                prompt: 'A car has lost 35% of its value. It is now worth £7800. What was it worth before?', answer: '12000', rules: [
                    mistake(10530, "That adds 35% of £7800. But the 35% was 35% of the value before, which was more."),
                    mistake(5070, 'That takes 35% off again. The value before must be more than £7800.'),
                    mistake(22285.71, '£7800 is the 65% that is left, not the 35% that was lost.')
                ], fallback: '100% − 35% = 65%. Divide 7800 by 0.65.',
                feedback: '£7800 is 65%. 7800 ÷ 0.65 = £12 000.'
            }),
            card('try-10', 90, 150, 'mistake', {
                input: 'choice',
                prompt: 'A price goes up by 50%. It is now £90. Mo says the price before was £45. Which reply is right?',
                options: [
                    option('No. It was £60, because 90 ÷ 1.5 = 60.', '£90 is 150% of the price before. 90 ÷ 1.5 = 60. Check: 50% of £60 is £30, and £60 + £30 = £90 ✓', true),
                    option("Yes. Half of £90 is £45, so take that off.", 'That takes 50% of £90. But the 50% was 50% of the price before, not of £90.'),
                    option('No. It was £135, because 90 × 1.5 = 135.', 'That makes it bigger again. The price before must be less than £90.'),
                    option('No. It was £180, because 90 ÷ 0.5 = 180.', 'Dividing by 0.5 is for a 50% decrease. The price went up.')
                ]
            })
        ];
    }

    function checks() {
        return [
            card('check-1', 27, 90, 'original', {
                input: 'number', label: 'money',
                prompt: 'A game is 10% off in a sale. It costs £27. What was the price before the sale?', answer: '30', rules: [
                    mistake(29.7, 'That adds 10% of £27. But the 10% came off the price before, which was more.'),
                    mistake(270, '£27 is the 90% that is left, not the 10% that came off.'),
                    mistake(24.3, 'That takes 10% off again. The price before must be more than £27.')
                ], fallback: '100% − 10% = 90%. Divide 27 by 0.9.',
                feedback: '£27 is 90%. 27 ÷ 0.9 = £30.'
            }),
            card('check-2', 80, 125, 'original', {
                input: 'choice',
                prompt: 'A box holds 25% more sweets than a bag. The box holds 80 sweets. How many sweets does the bag hold?',
                options: [
                    option('64', 'The bag is 100%, so the box is 125%. 80 ÷ 1.25 = 64 sweets.', true),
                    option('60', 'That takes 25% off 80. But the 25% is 25% of the bag, not the box.'),
                    option('100', 'That adds 25%. The bag holds fewer sweets than the box.'),
                    option('320', 'The box is 125% of the bag, not 25%.')
                ]
            }),
            card('check-3', 84, 12, 'original', {
                bankId: 'reverse-percentages-04', input: 'number', label: 'money',
                prompt: 'A club puts its fee up by 12%. The fee goes up by £84. What was the fee before?', answer: '700', rules: [
                    mistake(784, "That's the fee after it went up. The question asks for the fee before."),
                    mistake(10.08, "That's 12% of £84. But £84 is already the 12%."),
                    mistake(7, '£7 is only 1%. Now times it by 100.')
                ], fallback: 'The £84 that was added is 12% of the fee before. Find 1%, then 100%.',
                feedback: '£84 is 12%. 1% is £84 ÷ 12 = £7. 100% is £7 × 100 = £700.'
            }),
            card('check-4', 84, 120, 'calculation', {
                bankId: 'reverse-percentages-13', input: 'choice',
                prompt: 'A number goes up by 20%. It is now 84. Which working finds the number before?',
                options: [
                    option('84 ÷ 1.2 = 70', '84 is 120% of the number before. 84 ÷ 1.2 = 70. Check: 70 × 1.2 = 84 ✓', true),
                    option('84 × 0.8 = 67.2', 'Taking 20% off 84 does not undo it. The 20% was 20% of the number before, not of 84.'),
                    option('84 − 20 = 64', 'It went up by 20%, not by 20.'),
                    option('84 ÷ 0.2 = 420', '84 is 120% of the number before, not 20%.')
                ]
            }),
            card('check-5', 3280, 82, 'original', {
                bankId: 'reverse-percentages-11', input: 'number',
                prompt: 'A pile of sand loses 18% of its mass. Its mass is now 3280 kg. What was its mass before? Give your answer in kg.', answer: '4000', rules: [
                    mistake(3870.4, 'That adds 18% of 3280 kg. But the 18% was 18% of the mass before.'),
                    mistake(2689.6, 'That takes 18% off again. The mass before must be more than 3280 kg.'),
                    mistake(18222.22, '3280 kg is the 82% that is left, not the 18% that was lost.')
                ], fallback: '100% − 18% = 82%. Divide 3280 by 0.82.',
                feedback: '3280 kg is 82%. 3280 ÷ 0.82 = 4000 kg.'
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
    function cleanRules(answer, rules, tolerance = 0.01) {
        const kept = [];
        for (const rule of rules) {
            const value = Number(rule.value);
            if (value <= 0) continue;
            if ([answer, ...kept.map(each => Number(each.value))].some(other => Math.abs(other - value) <= tolerance + 1e-9)) continue;
            kept.push(rule);
        }
        return kept;
    }

    const PERCENTS = [5, 8, 10, 12, 15, 20, 25, 30, 35, 40, 45, 50, 60, 75];
    const SMALL = [2, 3, 4, 5, 6, 7, 8, 9];
    const gcd = (a, b) => b ? gcd(b, a % b) : a;

    // Settings for "A is P% more/less than B". B is the 100%.
    const COMPARISONS = [
        { direction: 'up', prompt: (p, n) => `Ali's journey takes ${p}% longer than Ben's. Ali's takes ${n} minutes. How long does Ben's take?`,
            unit: ' minutes', whole: "Ben's time", now: "Ali's", range: [20, 90], more: "Ben's journey is shorter than Ali's.", less: '' },
        { direction: 'up', prompt: (p, n) => `A box holds ${p}% more sweets than a bag. The box holds ${n} sweets. How many sweets does the bag hold?`,
            unit: ' sweets', whole: 'the bag', now: 'The box', range: [20, 200], more: 'The bag holds fewer sweets than the box.' },
        { direction: 'down', prompt: (p, n) => `Sam earns ${p}% less than Kim. Sam earns £${n} a week. How much does Kim earn a week?`,
            money: true, whole: "Kim's pay", now: "Sam's pay", range: [200, 600], more: 'Kim earns more than Sam.' },
        { direction: 'down', prompt: (p, n) => `A small bag of rice weighs ${p}% less than a big bag. The small bag weighs ${n} g. How much does the big bag weigh?`,
            unit: ' g', whole: 'the big bag', now: 'The small bag', range: [200, 1000], more: 'The big bag is heavier than the small bag.' }
    ];

    function generate(item, random) {
        const { randomInt } = window.Maths1to9LessonEngine;
        const int = (a, b) => randomInt(a, b, random);
        const choose = values => values[int(0, values.length - 1)];
        const type = item.type;
        if (!practiceTypes.includes(type)) throw new TypeError(`Unknown reverse percentage question type: ${type}`);
        const sign = direction => direction === 'up' ? '+' : '−';
        const now = (percent, direction) => direction === 'up' ? 100 + percent : 100 - percent;
        // "an 8% increase", "a 5% increase"
        const a = percent => /^(8|11|18|8\d)$/.test(String(percent)) ? 'an' : 'a';
        let question;

        if (type === 'percent-now') {
            const direction = choose(['up', 'down']);
            const percent = choose(PERCENTS.filter(p => p !== 50));
            const kept = now(percent, direction);
            const thing = choose(['A price', 'The number of pupils in a school', 'The value of a house', 'The rent on a flat']);
            question = card(type, null, kept, 'percent-now', {
                input: 'choice',
                prompt: `${thing} goes ${direction} by ${percent}%. The amount before is 100%. What percentage is the new amount?`,
                options: [
                    option(`${kept}%`, `100% ${sign(direction)} ${percent}% = ${kept}%`, true),
                    option(`${percent}%`, direction === 'up'
                        ? `${percent}% is only the part that was added. Add it to 100%.`
                        : `${percent}% is the part that came off. Take it away from 100% to see what's left.`),
                    option(`${now(percent, direction === 'up' ? 'down' : 'up')}%`, `That's for ${a(percent)} ${percent}% ${direction === 'up' ? 'decrease' : 'increase'}. It went ${direction}.`),
                    option('100%', `100% is the amount before. It has gone ${direction} since then, so it's ${direction === 'up' ? 'more' : 'less'} than 100% now.`)
                ]
            });
        } else if (type === 'which-divide') {
            const direction = choose(['up', 'down']);
            const percent = choose(SMALL);
            const m = multiplier(percent, direction);
            const kept = now(percent, direction);
            const before = int(20, 400);
            const given = round(before * m);
            const slip = direction === 'up' ? Number(number(1 + percent / 10)) : Number(number(1 - percent / 10));
            question = card(type, given, kept, 'multiplier', {
                input: 'choice',
                prompt: `A price goes ${direction} by ${percent}%. It is now ${pounds(given)}. What should you divide ${pounds(given)} by to find the price before?`,
                options: [
                    option(number(m), `100% ${sign(direction)} ${percent}% = ${kept}%, and ${kept}% is ${number(m)}. So divide by ${number(m)}.`, true),
                    option(number(multiplier(percent, direction === 'up' ? 'down' : 'up')),
                        `${number(multiplier(percent, direction === 'up' ? 'down' : 'up'))} is for ${a(percent)} ${percent}% ${direction === 'up' ? 'decrease' : 'increase'}. The price went ${direction}.`),
                    option(number(percent / 100), `${number(percent / 100)} is only the ${percent}% change. ${pounds(given)} is ${kept}% of the price before, so divide by ${number(m)}.`),
                    option(number(slip), `${percent}% is 0.0${percent}, not 0.${percent}. So the multiplier is ${number(m)}.`)
                ]
            });
        } else if (type === 'compare') {
            const setting = choose(COMPARISONS);
            const percent = choose(PERCENTS.filter(p => p < 50));
            const m = multiplier(percent, setting.direction);
            const kept = now(percent, setting.direction);
            // Choose the 100% amount so the amount in the question is a whole number.
            const step = 100 / gcd(percent, 100);
            const [low, high] = setting.range;
            let before, given, values;
            do {
                before = step * int(Math.ceil(low / step), Math.max(Math.ceil(low / step), Math.floor(high / step)));
                given = round(before * m);
                values = [before, round(given * multiplier(percent, setting.direction === 'up' ? 'down' : 'up')),
                    round(given * m), round(given / (percent / 100))];
            } while (new Set(values).size !== 4);
            const show = value => setting.money ? pounds(value) : `${amount(value)}${setting.unit}`;
            const otherWay = setting.direction === 'up' ? 'takes' : 'adds';
            const offOrOf = setting.direction === 'up' ? 'off' : 'of';
            question = card(type, given, kept, 'original', {
                input: 'choice', prompt: setting.prompt(percent, setting.money ? amount(given, true) : amount(given)),
                options: [
                    option(show(values[0]), `${setting.whole[0].toUpperCase()}${setting.whole.slice(1)} is 100%, so ${show(given)} is ${kept}%. ${amount(given)} ÷ ${number(m)} = ${show(before)}`, true),
                    option(show(values[1]), `That ${otherWay} ${percent}% ${offOrOf} ${show(given)}. But the ${percent}% is ${percent}% of ${setting.whole}, not of ${show(given)}.`),
                    option(show(values[2]), `That goes the wrong way. ${setting.more}`),
                    option(show(values[3]), `${show(given)} is ${kept}% of ${setting.whole}, not ${percent}%.`)
                ]
            });
        } else if (type === 'decrease' || type === 'increase') {
            const direction = type === 'increase' ? 'up' : 'down';
            const settings = direction === 'down' ? [
                { money: true, whole: 'the price before the sale', before: () => 4 * int(5, 150), text: (p, n) => `A ${choose(['jacket', 'sofa', 'bike', 'TV'])} is ${p}% off in a sale. It now costs £${n}. What was the price before the sale?` },
                { money: true, whole: 'its value before', before: () => 500 * int(4, 60), text: (p, n) => `A car has lost ${p}% of its value. It is now worth £${n}. What was it worth before?` },
                { money: false, whole: 'the number before', before: () => 100 * int(20, 300), text: (p, n) => `The number of people in a town goes down by ${p}%. There are now ${n} people. How many people were there before?` }
            ] : [
                { money: true, whole: 'the rent before', before: () => 10 * int(40, 150), text: (p, n) => `Rent goes up by ${p}%. It is now £${n} a month. What was the rent before?` },
                { money: true, whole: 'the price without VAT', before: () => 5 * int(20, 200), percent: 20, text: (p, n) => `A TV costs £${n}. This includes ${p}% VAT. What is the price without VAT?` },
                { money: false, whole: 'its height before', unit: ' cm', before: () => 10 * int(3, 12), text: (p, n) => `A plant grows ${p}% taller. It is now ${n} cm tall. How tall was it before? Give your answer in cm.` },
                { money: false, whole: 'the number before', before: () => 100 * int(20, 300), text: (p, n) => `The number of people in a town goes up by ${p}%. There are now ${n} people. How many people were there before?` }
            ];
            const setting = choose(settings);
            const percent = setting.percent || choose(PERCENTS.filter(p => p <= (direction === 'up' ? 50 : 60)));
            const m = multiplier(percent, direction);
            const kept = now(percent, direction);
            const before = setting.before();
            const given = round(before * m);
            const unit = setting.money ? '£' : '';
            const shown = setting.money ? amount(given, true) : amount(given);
            const said = `${unit}${shown}${setting.unit || ''}`;
            const whole = setting.whole;
            const Whole = `${whole[0].toUpperCase()}${whole.slice(1)}`;
            const rules = cleanRules(before, [
                mistake(given * multiplier(percent, 'up' === direction ? 'down' : 'up'), direction === 'down'
                    ? `That adds ${percent}% of ${said}. But the ${percent}% came off ${whole}, which was more.`
                    : `That takes ${percent}% off ${said}. But the ${percent}% was ${percent}% of ${whole}, not of ${said}.`),
                mistake(given * m, direction === 'down'
                    ? `That takes ${percent}% off again. ${Whole} must be more than ${said}.`
                    : `That adds ${percent}% again. ${Whole} must be less than ${said}.`),
                mistake(given / (percent / 100), `${said} is ${kept}% of ${whole}, not ${percent}%.`)
            ]);
            question = card(type, given, kept, 'original', {
                input: 'number', label: setting.money ? 'money' : 'count',
                prompt: setting.text(percent, shown), answer: number(before), rules,
                fallback: `100% ${sign(direction)} ${percent}% = ${kept}%. Divide ${shown} by ${number(m)}.`,
                feedback: `${said} is ${kept}%. ${amount(given)} ÷ ${number(m)} = ${setting.money ? pounds(before) : amount(before)}${setting.unit || ''}`
            });
        } else {
            const percent = choose([15, 20, 25, 30, 35, 40, 45, 60, 65, 75, 80, 125, 150, 175]);
            const before = int(20, 400);
            const given = round(before * percent / 100);
            const rules = [
                mistake(given * percent / 100, `That's ${percent}% of ${amount(given)}. But ${amount(given)} is already the ${percent}%.`),
                mistake(given / percent, `${amount(round(given / percent, 4))} is only 1%. Now times it by 100.`)
            ];
            if (percent > 100) {
                rules.push(mistake(given / ((percent - 100) / 100), `${amount(given)} is ${percent}% of the number, not just the extra ${percent - 100}%.`));
            } else {
                rules.push(mistake(given / (1 - percent / 100), `That treats ${amount(given)} as ${100 - percent}%. The question says it is ${percent}%.`));
            }
            question = card(type, given, percent, 'original', {
                bankId: percent > 100 ? 'reverse-percentages-07' : 'reverse-percentages-01', input: 'number',
                prompt: `${percent}% of a number is ${amount(given)}. What is the number?`, answer: number(before),
                rules: cleanRules(before, rules),
                fallback: `${amount(given)} is ${percent}%. Divide by ${percent} to find 1%. Then times by 100.`,
                feedback: `1% is ${amount(given)} ÷ ${percent} = ${amount(round(given / percent, 4))}. 100% is ${amount(round(given / percent, 4))} × 100 = ${amount(before)}.`
            });
        }
        return prepare(question, random);
    }

    window.ReversePercentages = {
        multiplier, amount, pounds, number, learnScreens, examples, checks,
        practiceTypes, CHOICE_TYPES, pick, generate, prepare
    };
})();
