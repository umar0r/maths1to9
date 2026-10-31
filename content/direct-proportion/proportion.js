(() => {
    'use strict';

    // Rounds away float noise, so 1 - 7 / 100 shows as 0.93, not 0.9299999.
    const number = value => String(Number(value.toPrecision(12)));
    const round = (value, places) => Math.round(value * 10 ** places + 1e-9) / 10 ** places;
    const option = (label, feedback, correct = false) => ({ label: String(label), feedback, correct });
    const mistake = (value, feedback) => ({ value: number(value), feedback });
    const practiceTypes = ['price-of-one', 'scale-price', 'scale-amount', 'which-calculation', 'adding-trap', 'is-proportional'];
    const MONEY_LABEL = 'Pounds (no £ sign)';

    // 0.45 → "45p", 0.075 → "7.5p", 1.44 → "£1.44", 2 → "£2.00".
    function money(pounds) {
        const pence = round(pounds * 100, 2);
        if (pence < 100) return `${number(pence)}p`;
        return `£${round(pounds, 2).toFixed(2)}`;
    }

    const learnScreens = [
        {
            title: 'The price of one biscuit',
            lines: ['One biscuit costs 8p. Move the slider to buy more biscuits.',
                'Each biscuit adds another 8p. The number of biscuits and the price go up together.',
                "In this lesson, you'll learn how to use the price of one thing to work out the price of any number of them. You can use a calculator."],
            slider: 'Biscuits', min: 1, max: 10, step: 1, start: 1
        },
        {
            title: 'Times both by the same number',
            lines: ['A recipe makes 4 pancakes with 2 eggs. To make 3 times as many pancakes, you need 3 times as many eggs.',
                'When you times one amount by a number, you times the other amount by the same number. This is called direct proportion.'],
            callout: "Don't add. 4 pancakes to 12 pancakes is × 3, not + 8. So the eggs go from 2 to 6, not 2 to 10.",
            slider: 'Pancakes', min: 4, max: 20, step: 4, start: 4
        },
        {
            title: 'Find the price of one',
            lines: ['5 pens cost £2.40. How much do 3 pens cost?',
                "There's no easy number to times 5 by to get 3. So first find the price of 1 pen: share £2.40 between 5 pens. Then times by the number of pens you want."],
            callout: 'This is called the unitary method. Unit means one: you find the value of one first.',
            slider: 'Pens you want', min: 1, max: 10, step: 1, start: 3
        },
        {
            title: "Why adding doesn't work",
            lines: ['4 biscuits cost 30p. How much do 6 biscuits cost?',
                "It's easy to think you can add 2, because 6 is 2 more than 4. But you can't add the same number to biscuits and to pence. Find the price of 1 biscuit first."],
            maths: ["6 is 2 more than 4. Is the answer 30p + 2p = 32p? No. 2 more biscuits don't cost 2p.",
                '30p ÷ 4 = 7.5p', '7.5p × 6 = 45p'],
            stepCallout: 'The 2 extra biscuits cost 2 × 7.5p = 15p. So 6 biscuits cost 30p + 15p = 45p ✓',
            slider: 'Show the steps', min: 1, max: 3, step: 1, start: 1
        },
        {
            title: 'Find one of what?',
            lines: ['A cheesecake for 8 people needs 200 g of biscuits. How much do you need for 14 people?',
                'The question is about people, so find the amount for 1 person. Share the 200 g between 8 people. Then times by 14.'],
            callout: 'Divide the right way round. You want grams for each person, so the grams go first: 200 ÷ 8 = 25 g. Not 8 ÷ 200.',
            slider: 'People', min: 1, max: 16, step: 1, start: 14
        },
        {
            title: 'Is it direct proportion?',
            lines: ['Stamps cost £2 each. A taxi costs £3 to get in, then £2 for each mile.',
                "Move the slider. 2 stamps cost double 1 stamp. But a 2-mile taxi ride costs £7. That's not double £5.",
                'In direct proportion, the price of 1 is always the same. For the taxi, it keeps changing.'],
            callout: 'Quick test: does 0 give 0? 0 stamps cost £0. A 0-mile taxi ride still costs £3. So the taxi price is not in direct proportion to the miles.',
            slider: 'How many', min: 0, max: 5, step: 1, start: 1
        },
        {
            title: 'Two steps, every time',
            question: '6 eggs cost £1.20. How much do 10 eggs cost?',
            lines: ['Use these steps for every direct proportion question.'],
            steps: [
                { title: 'Find one of what?', text: 'You want 10 eggs, so find the price of 1 egg.' },
                { title: 'Find one: divide.', text: '£1.20 ÷ 6 = £0.20' },
                { title: 'Times by how many you want.', text: '£0.20 × 10 = £2.00' }
            ],
            check: 'Check: 10 eggs is less than double 6 eggs, so the price is less than £2.40 ✓',
            slider: 'Show the steps', min: 1, max: 3, step: 1, start: 1
        }
    ];

    function card(questionType, values, asked, config) {
        return { questionType, values, asked, ...config };
    }

    function examples() {
        return [
            card('try-1', { count: 4, total: 2, want: 12 }, 'scaled', {
                input: 'choice',
                prompt: 'A recipe for 4 pancakes uses 2 eggs. How many eggs do you need for 12 pancakes?',
                options: [
                    option('6', '12 is 4 × 3, so times the eggs by 3: 2 × 3 = 6.', true),
                    option('10', "That adds 8, because 12 is 4 + 8. Don't add. 12 pancakes is 3 times as many, so you need 3 times the eggs."),
                    option('24', 'That times 2 by 12. 12 pancakes is 3 times 4 pancakes, so times the eggs by 3.'),
                    option('3', "12 ÷ 4 = 3 tells you it's 3 times as many. Now times the 2 eggs by 3.")
                ]
            }),
            card('try-2', { count: 8, total: 2, want: null }, 'one', {
                input: 'number', inputLabel: MONEY_LABEL,
                prompt: '8 apples cost £2. What is the price of 1 apple?',
                answer: '0.25',
                rules: [
                    mistake(4, "That's 8 ÷ 2, the wrong way round. You want pounds for each apple, so share the £2 between 8 apples: 2 ÷ 8."),
                    mistake(16, 'That multiplies. Share the £2 between 8 apples: divide.')
                ],
                fallback: 'Share £2 between 8 apples.',
                feedback: '£2 ÷ 8 = £0.25. 1 apple costs 25p.'
            }),
            card('try-3', { count: 5, total: 2.4, want: null }, 'calculation', {
                input: 'choice',
                prompt: '5 pens cost £2.40. Which calculation finds the price of 1 pen?',
                options: [
                    option('£2.40 ÷ 5', 'Share the £2.40 between the 5 pens.', true),
                    option('5 ÷ £2.40', "That's the wrong way round. You want pounds for each pen, so the pounds go first."),
                    option('£2.40 × 5', 'That gives £12, the price of 25 pens. Divide to find the price of 1.'),
                    option('£2.40 − 5', "You can't take pens away from pounds. Divide.")
                ]
            }),
            card('try-4', { count: 4, total: 18, want: 7 }, 'scaled', {
                input: 'number', inputLabel: MONEY_LABEL,
                prompt: '4 cinema tickets cost £18. How much do 7 tickets cost?',
                answer: '31.5',
                rules: [
                    mistake(21, 'That adds 3, because you added 3 tickets. But 3 more tickets cost more than £3. Find the price of 1 ticket first.'),
                    mistake(4.5, "That's the price of 1 ticket. Now times it by 7."),
                    mistake(126, 'That times £18 by 7, which is the price of 28 tickets. Find the price of 1 ticket first.')
                ],
                fallback: 'Find the price of 1 ticket: £18 ÷ 4.',
                feedback: '£18 ÷ 4 = £4.50 for 1 ticket. £4.50 × 7 = £31.50'
            }),
            card('try-5', { count: 4, total: 0.3, want: 6 }, 'scaled', {
                input: 'choice',
                prompt: '4 biscuits cost 30p. How much do 6 biscuits cost?',
                options: [
                    option('45p', '30p ÷ 4 = 7.5p for 1 biscuit. 7.5p × 6 = 45p.', true),
                    option('32p', 'That adds 2p because you added 2 biscuits. But each biscuit costs 7.5p, not 1p.'),
                    option('60p', "That doubles 30p. 6 isn't double 4. Double 4 is 8 biscuits."),
                    option('£1.80', 'That times 30p by 6, which is the price of 24 biscuits. Find the price of 1 biscuit first.')
                ]
            }),
            card('try-6', { count: 5, total: 300, want: 8 }, 'scaled', {
                input: 'number', unit: 'g',
                prompt: 'Pasta for 5 people needs 300 g. How much pasta do you need for 8 people?',
                answer: '480',
                rules: [
                    mistake(303, 'That adds 3, because 8 is 5 + 3. Find the amount for 1 person first.'),
                    mistake(60, "That's the amount for 1 person. Now times it by 8."),
                    mistake(2400, 'That times 300 g by 8, which is enough for 40 people. Find the amount for 1 person first.')
                ],
                fallback: 'Find the pasta for 1 person: 300 ÷ 5.',
                feedback: '300 ÷ 5 = 60 g for 1 person. 60 × 8 = 480 g'
            }),
            card('try-7', null, 'proportional', {
                input: 'choice',
                prompt: 'A taxi costs £3 to get in, then £2 for each mile. Is the price in direct proportion to the miles?',
                options: [
                    option('No: 0 miles still costs £3', 'In direct proportion, 0 miles would cost £0. This taxi charges £3 before it moves.', true),
                    option('Yes: it goes up by £2 every mile', 'It does go up by £2 each mile. But it starts at £3, so 2 miles (£7) is not double 1 mile (£5).'),
                    option('Yes: more miles cost more money', 'More miles do cost more. But in direct proportion, double the miles must cost double. 1 mile is £5 and 2 miles is £7.'),
                    option('No: the price stays the same', "The price does change with the miles. It isn't direct proportion because 0 miles still costs £3.")
                ]
            }),
            card('try-8', null, 'proportional', {
                input: 'choice',
                prompt: '2 bags of sweets cost £6. 5 bags cost £15. 7 bags cost £22. Are the bags and the price in direct proportion?',
                options: [
                    option('No: 7 bags should cost £21', '£6 ÷ 2 = £3 and £15 ÷ 5 = £3. 7 bags at £3 each would be £21, not £22.', true),
                    option('Yes: 1 bag always costs £3', 'Check every one. 2 × £3 = £6 and 5 × £3 = £15, but 7 × £3 = £21, not £22.'),
                    option('Yes: the price goes up when the bags go up', 'The price does go up. But divide each price by its bags. You get £3, £3 and then not £3. They must all be the same.'),
                    option("No: the bags don't go up in equal steps", "The bags don't need to go up in equal steps. Divide each price by its bags. You should get the same price for 1 bag every time.")
                ]
            }),
            card('try-9', { count: 3, total: 2.7, want: 5 }, 'scaled', {
                input: 'number', inputLabel: MONEY_LABEL,
                prompt: '3 cans of drink cost £2.70. How much do 5 cans cost?',
                answer: '4.5',
                rules: [
                    mistake(4.7, 'That adds £2, because you added 2 cans. Find the price of 1 can first.'),
                    mistake(0.9, "That's the price of 1 can. Now times it by 5."),
                    mistake(13.5, 'That times £2.70 by 5, which is the price of 15 cans. Find the price of 1 can first.')
                ],
                fallback: 'Find the price of 1 can: £2.70 ÷ 3.',
                feedback: '£2.70 ÷ 3 = £0.90 for 1 can. £0.90 × 5 = £4.50'
            }),
            card('try-10', { count: 6, total: 72, want: 10 }, 'scaled', {
                input: 'number', unit: 'km',
                prompt: 'A car uses 6 litres of petrol to go 72 km. How far can it go on 10 litres?',
                answer: '120',
                rules: [
                    mistake(76, 'That adds 4, because you added 4 litres. Find how far 1 litre goes first.'),
                    mistake(12, "That's how far 1 litre goes. Now times it by 10."),
                    mistake(720, 'That times 72 by 10, which is how far 60 litres go. Find 1 litre first.')
                ],
                fallback: 'Find how far 1 litre goes: 72 ÷ 6.',
                feedback: '72 ÷ 6 = 12 km on 1 litre. 12 × 10 = 120 km'
            })
        ];
    }

    function checks() {
        return [
            card('check-1', { count: 7, total: 10.5, want: 4 }, 'scaled', {
                input: 'number', inputLabel: MONEY_LABEL,
                prompt: '7 notebooks cost £10.50. How much do 4 notebooks cost?',
                answer: '6',
                rules: [
                    mistake(7.5, 'That takes £3 away because you took away 3 notebooks. Find the price of 1 notebook first.'),
                    mistake(1.5, "That's the price of 1 notebook. Now times it by 4."),
                    mistake(42, 'That times £10.50 by 4. Find the price of 1 notebook first.')
                ],
                fallback: '£10.50 ÷ 7 is the price of 1 notebook.',
                feedback: '£10.50 ÷ 7 = £1.50 for 1 notebook. £1.50 × 4 = £6.00'
            }),
            card('check-2', null, 'proportional', {
                input: 'choice',
                prompt: 'Which of these is in direct proportion?',
                options: [
                    option('The price of petrol and the litres you buy', 'Twice the litres costs twice as much, and 0 litres costs £0.', true),
                    option('A phone bill with a £10 monthly fee, and the minutes you use', "0 minutes still costs £10. So it isn't direct proportion."),
                    option('A gym that costs £20 to join, then £5 a visit', "0 visits still costs £20 to join. So it isn't direct proportion."),
                    option("A child's height and their age", "A child who is twice as old isn't twice as tall.")
                ]
            }),
            card('check-3', { count: 6, total: 150, want: 15 }, 'scaled', {
                input: 'number', unit: 'g',
                prompt: 'A recipe for 6 flapjacks uses 150 g of oats. How many grams of oats do you need for 15 flapjacks?',
                answer: '375',
                rules: [
                    mistake(159, 'That adds 9 because you added 9 flapjacks. Find the oats for 1 flapjack first.'),
                    mistake(25, "That's the oats for 1 flapjack. Now times it by 15."),
                    mistake(2250, 'That times 150 by 15. Find the oats for 1 flapjack first.')
                ],
                fallback: '150 ÷ 6 is the oats for 1 flapjack.',
                feedback: '150 ÷ 6 = 25 g for 1 flapjack. 25 × 15 = 375 g'
            }),
            card('check-4', { count: 3, total: 18, want: 5 }, 'mistake', {
                input: 'choice',
                prompt: "Ali says: '3 pizzas cost £18, so 5 pizzas cost £20.' What has Ali done wrong?",
                options: [
                    option('Added £2 for 2 more pizzas. 1 pizza is £6, so 5 cost £30.', '£18 ÷ 3 = £6 for 1 pizza. £6 × 5 = £30.', true),
                    option('Nothing. Ali is right.', '2 more pizzas cost more than £2. Find the price of 1 pizza: £18 ÷ 3 = £6.'),
                    option('Ali should times £18 by 5. 5 pizzas cost £90.', '£18 × 5 is the price of 15 pizzas. Find the price of 1 pizza first.'),
                    option('Ali should share £18 between 5. 5 pizzas cost £3.60.', "£3.60 would be the price of 1 pizza if 5 cost £18. But it's 3 pizzas that cost £18.")
                ]
            }),
            card('check-5', { count: 6, total: 90, want: 10 }, 'scaled', {
                input: 'number', unit: 'pages',
                prompt: 'A printer prints 90 pages in 6 minutes. How many pages does it print in 10 minutes?',
                answer: '150',
                rules: [
                    mistake(94, 'That adds 4 because you added 4 minutes. Find the pages in 1 minute first.'),
                    mistake(15, "That's the pages in 1 minute. Now times it by 10."),
                    mistake(900, 'That times 90 by 10. Find the pages in 1 minute first.')
                ],
                fallback: '90 ÷ 6 is the pages in 1 minute.',
                feedback: '90 ÷ 6 = 15 pages in 1 minute. 15 × 10 = 150 pages'
            }),
            card('check-6', null, 'proportional', {
                input: 'choice',
                prompt: '3 kg of potatoes cost £4.50. 5 kg cost £7.50. 8 kg cost £12. Are the kg and the price in direct proportion?',
                options: [
                    option('Yes: 1 kg always costs £1.50', '£4.50 ÷ 3, £7.50 ÷ 5 and £12 ÷ 8 all make £1.50.', true),
                    option("No: the kg don't go up in equal steps", "They don't need to. Divide each price by its kg. You get £1.50 every time."),
                    option('No: 8 kg should cost £12.50', 'Work it out: 8 × £1.50 = £12. That matches.'),
                    option('Yes: the price goes up when the kg go up', 'The answer is yes, but not for that reason. A taxi price goes up too. Check that 1 kg costs the same every time.')
                ]
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

    // Keeps rules that differ from the answer, and from each other.
    function cleanRules(answer, rules) {
        const kept = [];
        for (const rule of rules) {
            const value = Number(rule.value);
            if ([answer, ...kept.map(each => Number(each.value))].some(other => Math.abs(other - value) <= 1e-9)) continue;
            kept.push(rule);
        }
        return kept;
    }

    const MONEY_ITEMS = [
        ['pen', 'pens'], ['pencil', 'pencils'], ['apple', 'apples'], ['ticket', 'tickets'],
        ['can of drink', 'cans of drink'], ['notebook', 'notebooks'],
        ['bag of sweets', 'bags of sweets'], ['sticker', 'stickers']
    ];
    const RECIPE_THINGS = ['flour', 'pasta', 'rice', 'sugar', 'oats', 'butter'];
    const HALF_PENCE = [7.5, 12.5, 17.5];

    function generate(item, random) {
        const { randomInt } = window.Maths1to9LessonEngine;
        const int = (low, high) => randomInt(low, high, random);
        const choose = values => values[int(0, values.length - 1)];
        const cash = pence => money(pence / 100);
        const type = item.type;
        if (!practiceTypes.includes(type)) throw new TypeError(`Unknown direct proportion question type: ${type}`);
        let question;

        if (type === 'price-of-one') {
            const [one, many] = choose(MONEY_ITEMS);
            const unitPence = 5 * int(2, 100);
            const count = int(2, 12);
            const totalPence = unitPence * count;
            const answer = unitPence / 100;
            question = card(type, { count, total: totalPence / 100, want: null }, 'one', {
                input: 'number', inputLabel: MONEY_LABEL,
                prompt: `${count} ${many} cost ${cash(totalPence)}. What is the price of 1 ${one}?`,
                answer: number(answer),
                rules: cleanRules(answer, [
                    mistake(round(count / (totalPence / 100), 2), `That's the wrong way round. You want pounds for each ${one}, so share ${cash(totalPence)} between ${count} ${many}: ${cash(totalPence)} ÷ ${count}.`),
                    mistake(round(totalPence * count / 100, 2), `That multiplies. Share ${cash(totalPence)} between ${count} ${many}: divide.`)
                ]),
                fallback: `Share ${cash(totalPence)} between ${count} ${many}.`,
                feedback: `${cash(totalPence)} ÷ ${count} = ${cash(unitPence)}. 1 ${one} costs ${cash(unitPence)}.`
            });
        } else if (type === 'scale-price') {
            const [one, many] = choose(MONEY_ITEMS);
            const unitPence = 5 * int(2, 100);
            const count = int(2, 12);
            let want = int(2, 20);
            while (want === count) want = int(2, 20);
            const totalPence = unitPence * count;
            const answerPence = unitPence * want;
            const answer = answerPence / 100;
            const rules = [];
            const added = round(totalPence / 100 + (want - count), 2);
            if (added > 0) rules.push(mistake(added, `That changes the price by the same number as the ${many}. Find the price of 1 first.`));
            rules.push(mistake(unitPence / 100, `That's the price of 1. Now times it by ${want}.`));
            rules.push(mistake(round(totalPence * want / 100, 2), `That times ${cash(totalPence)} by ${want}. Find the price of 1 first.`));
            question = card(type, { count, total: totalPence / 100, want }, 'scaled', {
                input: 'number', inputLabel: MONEY_LABEL,
                prompt: `${count} ${many} cost ${cash(totalPence)}. How much do ${want} ${many} cost?`,
                answer: number(answer),
                rules: cleanRules(answer, rules),
                fallback: `Find the price of 1 ${one}: ${cash(totalPence)} ÷ ${count}.`,
                feedback: `${cash(totalPence)} ÷ ${count} = ${cash(unitPence)} for 1 ${one}. ${cash(unitPence)} × ${want} = ${cash(answerPence)}`
            });
        } else if (type === 'scale-amount') {
            const thing = choose(RECIPE_THINGS);
            const each = 5 * int(1, 20);
            const count = int(2, 12);
            let want = int(2, 12);
            while (want === count) want = int(2, 12);
            const total = each * count;
            const answer = each * want;
            const rules = [];
            const added = total + (want - count);
            if (added > 0) rules.push(mistake(added, 'That changes the grams by the same number as the people. Find the amount for 1 person first.'));
            rules.push(mistake(each, `That's the amount for 1 person. Now times it by ${want}.`));
            rules.push(mistake(total * want, `That times ${total} g by ${want}. Find the amount for 1 person first.`));
            question = card(type, { count, total, want }, 'scaled', {
                input: 'number', unit: 'g',
                prompt: `A recipe for ${count} people needs ${total} g of ${thing}. How much ${thing} for ${want} people?`,
                answer: number(answer),
                rules: cleanRules(answer, rules),
                fallback: `Find the ${thing} for 1 person: ${total} ÷ ${count}.`,
                feedback: `${total} ÷ ${count} = ${each} g for 1 person. ${each} × ${want} = ${answer} g`
            });
        } else if (type === 'which-calculation') {
            const [one, many] = choose(MONEY_ITEMS);
            let options, prompt, values;
            for (let attempt = 0; attempt < 50; attempt++) {
                const unitPence = 5 * int(2, 100);
                const count = int(2, 12);
                const totalPence = unitPence * count;
                const total = cash(totalPence);
                if (int(0, 1) === 0) {
                    prompt = `${count} ${many} cost ${total}. Which calculation finds the price of 1 ${one}?`;
                    options = [
                        option(`${total} ÷ ${count}`, `Share the ${total} between the ${count} ${many}.`, true),
                        option(`${count} ÷ ${total}`, `That's the wrong way round. You want pounds for each ${one}, so the pounds go first.`),
                        option(`${total} × ${count}`, `That gives ${cash(totalPence * count)}, the price of ${count * count} ${many}. Divide to find the price of 1.`),
                        option(`${total} − ${count}`, `You can't take ${many} away from pounds. Divide.`)
                    ];
                    values = { count, total: totalPence / 100, want: null };
                } else {
                    let want = int(2, 20);
                    while (want === count) want = int(2, 20);
                    prompt = `${count} ${many} cost ${total}. Which calculation finds the price of ${want} ${many}?`;
                    options = [
                        option(`${total} ÷ ${count} × ${want}`, `Divide by ${count} to find the price of 1, then times by ${want}.`, true),
                        option(`${total} ÷ ${want} × ${count}`, `That finds the price of 1 by sharing between ${want}. You have the price of ${count} ${many}, so divide by ${count}.`),
                        option(`${total} + (${want} − ${count})`, `You can't add ${many} to pounds. Find the price of 1 first.`),
                        option(`${total} × ${want}`, `That's the price of ${count * want} ${many}. Divide by ${count} first.`)
                    ];
                    values = { count, total: totalPence / 100, want };
                }
                if (new Set(options.map(each => each.label)).size === options.length) break;
            }
            question = card(type, values, 'calculation', { input: 'choice', prompt, options });
        } else if (type === 'adding-trap') {
            let options, prompt, values;
            for (let attempt = 0; attempt < 50; attempt++) {
                const count = int(2, 6);
                let want = count + int(1, 4);
                while (want === 2 * count) want = count + int(1, 4);
                const eachPence = int(0, 3) === 0 ? choose(HALF_PENCE) : int(6, 40);
                const totalPence = count * eachPence;
                const answerPence = want * eachPence;
                prompt = `${count} biscuits cost ${cash(totalPence)}. How much do ${want} biscuits cost?`;
                options = [
                    option(cash(answerPence), `${cash(totalPence)} ÷ ${count} = ${cash(eachPence)} for 1 biscuit. ${cash(eachPence)} × ${want} = ${cash(answerPence)}.`, true),
                    option(cash(totalPence + (want - count)), `That adds the same number to the pence as to the biscuits. Each one costs ${cash(eachPence)}, not 1p.`),
                    option(cash(totalPence * 2), `That doubles the price, but ${want} isn't double ${count}.`),
                    option(cash(totalPence * want), `That times the price of ${count} biscuits by ${want}. Find the price of 1 first.`)
                ];
                values = { count, total: totalPence / 100, want };
                if (new Set(options.map(each => each.label)).size === options.length) break;
            }
            question = card(type, values, 'scaled', { input: 'choice', prompt, options });
        } else {
            let options, prompt;
            for (let attempt = 0; attempt < 50; attempt++) {
                const each = int(2, 9);
                const counts = [];
                while (counts.length < 3) {
                    const value = int(1, 10);
                    if (!counts.includes(value)) counts.push(value);
                }
                counts.sort((first, second) => first - second);
                const direct = int(0, 1) === 0;
                const [c1, c2, c3] = counts;
                const p1 = c1 * each;
                const p2 = c2 * each;
                const p3 = c3 * each + (direct ? 0 : int(1, 3));
                prompt = `${c1} ${c1 === 1 ? 'bag of sweets costs' : 'bags of sweets cost'} ${money(p1)}. ${c2} bags cost ${money(p2)}. ${c3} bags cost ${money(p3)}. Are the bags and the price in direct proportion?`;
                if (direct) {
                    options = [
                        option(`Yes: 1 bag always costs ${money(each)}`, `${money(p1)} ÷ ${c1}, ${money(p2)} ÷ ${c2} and ${money(p3)} ÷ ${c3} all make ${money(each)}.`, true),
                        option("No: the bags don't go up in equal steps", `They don't need to go up in equal steps. Divide each price by its bags. You get ${money(each)} every time.`),
                        option(`No: ${c3} bags should cost ${money(p3 + 1)}`, `Work it out: ${c3} × ${money(each)} = ${money(p3)}. That matches the table.`),
                        option('Yes: the price goes up when the bags go up', 'The answer is yes, but not for that reason. A taxi price goes up too. Check that 1 bag costs the same every time.')
                    ];
                } else {
                    options = [
                        option(`No: ${c3} bags should cost ${money(c3 * each)}`, `${money(p1)} ÷ ${c1} = ${money(each)} and ${money(p2)} ÷ ${c2} = ${money(each)}. ${c3} bags at ${money(each)} each would be ${money(c3 * each)}, not ${money(p3)}.`, true),
                        option(`Yes: 1 bag always costs ${money(each)}`, `Check every one. ${c3} × ${money(each)} = ${money(c3 * each)}, not ${money(p3)}.`),
                        option('Yes: the price goes up when the bags go up', 'The price does go up. But divide each price by its bags. They must all give the same price.'),
                        option("No: the bags don't go up in equal steps", 'They don\'t need to. Divide each price by its bags. You should get the same price for 1 bag every time.')
                    ];
                }
                if (new Set(options.map(each => each.label)).size === options.length) break;
            }
            question = card(type, null, 'proportional', { input: 'choice', prompt, options });
        }
        return prepare(question, random);
    }

    window.DirectProportion = {
        number, round, money, learnScreens, examples, checks,
        practiceTypes, pick, generate, prepare
    };
})();
