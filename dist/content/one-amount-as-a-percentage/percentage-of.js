(() => {
    'use strict';

    const percent = (part, whole) => part / whole * 100;
    const number = value => String(Math.round(value * 1e10) / 1e10);
    const option = (label, feedback, correct = false) => ({ label: String(label), feedback, correct });
    const mistake = (value, feedback) => ({ value: number(value), feedback });
    const practiceTypes = ['part-of-whole', 'find-the-whole', 'more-than-100', 'which-is-100', 'which-working', 'percent-choice'];
    const learnScreens = [
        {
            title: 'How much of the whole?',
            lines: ['You score 18 marks on a test out of 30. Is that good? To compare, we use a percentage. The whole test, all 30 marks, is 100%. You can use a calculator in this lesson.'],
            maths: ['30 marks = 100%', '18 out of 30'],
            slider: 'Marks scored: 0 to 30', min: 0, max: 30
        },
        {
            title: 'Turn it into a percentage.',
            lines: ['You already know how to turn a fraction into a percentage. Divide the top by the bottom, then multiply by 100.'],
            maths: ['18 ÷ 30 = 0.6', '0.6 × 100 = 60', '18 out of 30 is 60%'],
            slider: 'Marks scored: 0 to 30 in steps of 3', min: 0, max: 30, step: 3
        },
        {
            title: 'Divide by the whole.',
            lines: ['To find A as a percentage of B, work out A ÷ B × 100. B is the whole: the amount that is 100%.'],
            maths: ['£50 = 100%', '20 ÷ 50 × 100 = 40', '£20 is 40% of £50'],
            callout: "Don't divide the other way. 50 ÷ 20 × 100 = 250%. That can't be right: £20 is less than £50, so the answer must be under 100%. Answers can have decimals too, like 22.5%.",
            slider: 'Money spent: £0 to £50 in £5 steps', min: 0, max: 50, step: 5
        },
        {
            title: 'More than 100%.',
            lines: ["We compare with last year, so last year's 20 is 100%. More than the whole gives more than 100%."],
            maths: ['Last year: 20 members = 100%', '25 ÷ 20 × 100 = 125', 'This year is 125% of last year'],
            slider: 'Members this year: 10 to 30', min: 10, max: 30
        },
        {
            title: 'Find the whole first.',
            lines: ['A shop has 84 insulated bottles and 36 plain ones.', "Sometimes the question doesn't give the whole. Add up the groups to find it first."],
            maths: ['84 + 36 = 120 bottles = 100%', '84 ÷ 120 × 100 = 70', '70% of the bottles are insulated'],
            callout: "Don't divide by the other group: 84 ÷ 36 × 100 is wrong.",
            slider: 'Show the steps: 1 to 3', min: 1, max: 3
        }
    ];

    function card(questionType, part, whole, asked, config) {
        return {
            questionType, part, whole, asked,
            fallback: `Divide by the whole: ${part} ÷ ${whole} × 100`,
            ...(config.input === 'number' ? { inputLabel: 'Percentage (no % sign)' } : {}),
            ...config
        };
    }

    function examples() {
        return [
            card('try-1', 9, 40, 'whole', {
                input: 'choice', prompt: 'There are 40 seats on a bus. 9 seats are empty. Which number is 100%?', options: [
                    option(40, 'All 40 seats is the whole, so 40 is 100%.', true),
                    option(9, "9 is the empty seats. That's the part. The whole is all 40 seats."),
                    option(31, '31 seats are full. The whole is all 40 seats.'),
                    option(100, '100% is the whole. Here the whole is 40 seats.')
                ]
            }),
            card('try-2', 9, 40, 'percent', {
                input: 'number', prompt: 'There are 40 seats on a bus. 9 seats are empty. What percentage of the seats are empty?', answer: '22.5', rules: [
                    mistake(0.225, "That's 9 ÷ 40. Now multiply by 100."),
                    mistake(77.5, "That's the full seats. 9 seats are empty: 9 ÷ 40 × 100."),
                    mistake(9, '9 is a number of seats. Divide by 40, then multiply by 100.')
                ], feedback: "9 ÷ 40 × 100 = 22.5. That's just under a quarter, so it makes sense."
            }),
            card('try-3', 21, 28, 'working', {
                input: 'choice', prompt: 'Aisha has £28. She spends £21 on a book. Which working finds the percentage of her money she spends?', options: [
                    option('21 ÷ 28 × 100', "All her money, £28, is 100%. So it's 21 ÷ 28 × 100.", true),
                    option('28 ÷ 21 × 100', 'That divides by what she spent. Divide by all her money, £28.'),
                    option('21 ÷ 100 × 28', 'That finds 21% of £28. Divide 21 by 28 first.'),
                    option('7 ÷ 28 × 100', '£7 is what she has left. She spends £21.')
                ]
            }),
            card('try-4', 21, 28, 'percent', {
                input: 'number', prompt: 'Aisha has £28. She spends £21 on a book. What percentage of her money does she spend?', answer: '75', rules: [
                    mistake(25, "That's the part she keeps. She spends £21."),
                    mistake(0.75, "That's 21 ÷ 28. Now multiply by 100."),
                    mistake(21, '21 is pounds, not a percentage. Work out 21 ÷ 28 × 100.')
                ], feedback: '21 ÷ 28 × 100 = 75'
            }),
            card('try-5', 15, 12, 'whole', {
                input: 'choice', prompt: 'A group planned to walk 12 km. It walked 15 km. Express the distance walked as a percentage of the planned distance. Which distance is 100%?', options: [
                    option('12 km', "It says 'of the planned distance', so the plan, 12 km, is 100%.", true),
                    option('15 km', '15 km is what they walked. We compare it with the plan, so the plan is 100%.'),
                    option('3 km', '3 km is the extra. The whole plan, 12 km, is 100%.'),
                    option('27 km', "Don't add them. The plan, 12 km, is 100%.")
                ]
            }),
            card('try-6', 15, 12, 'percent', {
                input: 'number', prompt: 'A group planned to walk 12 km. It walked 15 km. What percentage of the planned distance did they walk?', answer: '125', rules: [
                    mistake(80, "That's 12 ÷ 15. Divide by the plan: 15 ÷ 12 × 100."),
                    mistake(25, "That's only the extra 3 km. Use all 15 km."),
                    mistake(1.25, "That's 15 ÷ 12. Now multiply by 100.")
                ], feedback: "15 ÷ 12 × 100 = 125. They walked more than planned, so it's over 100%."
            }),
            card('try-7', 28, 80, 'percent', {
                bankId: 'percentages-of-amounts-04', input: 'choice', prompt: 'A group plants 80 trees. 28 are fruit trees. What percentage are fruit trees?', options: [
                    option('35%', '28 ÷ 80 × 100 = 35', true),
                    option('28%', '28 is a number of trees. Compare it with all 80.'),
                    option('0.35%', '0.35 is 28 ÷ 80. Multiply by 100 to get the percentage.'),
                    option('65%', "That's the trees that aren't fruit trees.")
                ]
            }),
            card('try-8', 45, 60, 'percent', {
                bankId: 'convert-a-fraction-to-a-percentage-08', input: 'number', prompt: 'A shop has 45 red pens and 15 blue pens. What percentage of the pens are red?', answer: '75', rules: [
                    mistake(25, "That's the blue pens."),
                    mistake(300, 'That divides by the blue pens. The whole is all 45 + 15 = 60 pens.'),
                    mistake(45, '45 is a number of pens. Work out 45 ÷ 60 × 100.')
                ], feedback: '45 + 15 = 60 pens. 45 ÷ 60 × 100 = 75'
            }),
            card('try-9', 20, 20, 'percent', {
                input: 'number', prompt: 'A team wins all 20 of its 20 matches. What percentage of its matches does it win?', answer: '100', rules: [
                    mistake(20, '20 is a number of matches. Work out 20 ÷ 20 × 100.'),
                    mistake(1, '20 ÷ 20 = 1. Now multiply by 100.'),
                    mistake(0, 'They won every match. All of them is 100%.')
                ], feedback: '20 ÷ 20 × 100 = 100. All of something is 100%.'
            })
        ];
    }

    function checks() {
        return [
            card('check-1', 15, 60, 'mistake', {
                input: 'choice', prompt: 'A coat costs £15. Mia has £60. To find what percentage of her money the coat costs, Mia writes 60 ÷ 15 × 100 = 400%. What has she done wrong?', options: [
                    option("She divided the wrong way. Her £60 is 100%, so it's 15 ÷ 60 × 100.", 'Right. Divide by the whole.', true),
                    option('Nothing. The coat is 400% of her money.', 'The coat costs less than she has, so the answer must be under 100%.'),
                    option('She should add: 15 + 60 = 75%.', "Adding doesn't give a percentage. Divide by the whole, £60."),
                    option('She should take away: 60 − 15 = 45%.', '£45 is the money left, not a percentage.')
                ]
            }),
            card('check-2', 15, 60, 'percent', {
                input: 'number', prompt: 'A coat costs £15. Mia has £60. What percentage of her money does the coat cost?', answer: '25', rules: [
                    mistake(400, "That's Mia's mistake. Divide by £60: 15 ÷ 60 × 100."),
                    mistake(0.25, "That's 15 ÷ 60. Now multiply by 100."),
                    mistake(75, "That's the money she has left.")
                ], feedback: '15 ÷ 60 × 100 = 25'
            }),
            card('check-3', 12, 60, 'percent', {
                input: 'number', prompt: 'Leo scores 12 out of 30 in one quiz and 12 out of 60 in another. What percentage did he get in the quiz out of 60?', answer: '20', rules: [
                    mistake(40, "That's the quiz out of 30. This one is out of 60."),
                    mistake(12, '12 is his marks. Work out 12 ÷ 60 × 100.'),
                    mistake(500, 'That divides the wrong way. Divide by 60.')
                ], feedback: '12 ÷ 60 × 100 = 20. The same 12 marks is a smaller part of 60 than of 30.'
            }),
            card('check-4', 24, 20, 'mistake', {
                input: 'choice', prompt: "A team aimed to score 20 goals. It scored 24. Ben says it can't be 120% of the target, because percentages stop at 100%. Is Ben right?", options: [
                    option('No. The target, 20, is 100%. They scored more, so 24 ÷ 20 × 100 = 120%.', 'Right. More than the whole is more than 100%.', true),
                    option("Yes. You can't go over 100%.", 'You can when you beat a target. More than the whole is more than 100%.'),
                    option("No. It's 20 ÷ 24 × 100 = 83.3%.", 'That divides by 24. The target, 20, is 100%.'),
                    option("No. It's 24 − 20 = 4, so 4%.", '4 is the number of extra goals, not a percentage.')
                ]
            }),
            card('check-5', 42, 120, 'percent', {
                bankId: 'percentage-change-12', input: 'number', prompt: 'A repair shop fixes 42 of 120 phones in one day. What percentage does it fix?', answer: '35', rules: [
                    mistake(0.35, "That's 42 ÷ 120. Now multiply by 100."),
                    mistake(65, "That's the phones not fixed."),
                    mistake(42, '42 is a number of phones. Work out 42 ÷ 120 × 100.')
                ], feedback: '42 ÷ 120 × 100 = 35'
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

    function cleanRules(answer, rules) {
        const used = new Set([number(answer)]);
        return rules.filter(rule => {
            const value = Number(rule.value);
            const key = number(value);
            if (Math.abs(value * 1000 - Math.round(value * 1000)) > 1e-7 || used.has(key)) return false;
            used.add(key);
            return true;
        });
    }

    function context(part, whole, kind) {
        return [
            [`You score ${part} marks on a test out of ${whole}.`, 'What percentage of the marks do you score?'],
            [`There are ${whole} seats on a bus. ${part} seats are empty.`, 'What percentage of the seats are empty?'],
            [`A crate has ${whole} apples. ${part} are green.`, 'What percentage of the apples are green?'],
            [`A class has ${whole} pupils. ${part} go to school by bus.`, 'What percentage go by bus?'],
            [`You have £${whole}. You spend £${part}.`, 'What percentage of your money do you spend?']
        ][kind];
    }

    function generate(item, random) {
        const { randomInt } = window.Maths1to9LessonEngine;
        const int = (a, b) => randomInt(a, b, random);
        const choose = values => values[int(0, values.length - 1)];
        let part, whole, answer, rules, question;
        const type = item.type;
        if (!practiceTypes.includes(type)) throw new TypeError(`Unknown percentage question type: ${type}`);
        do {
            whole = choose(type === 'more-than-100' ? [8, 10, 12, 16, 20, 24, 25, 40, 50] : [20, 24, 25, 30, 40, 45, 50, 60, 75, 80, 120, 200]);
            part = type === 'more-than-100' ? int(whole + 1, 2 * whole) : int(1, whole - 1);
            answer = percent(part, whole);
            if (Math.abs(answer * 10 - Math.round(answer * 10)) > 1e-8 || answer === 50) continue;
            answer = Math.round(answer * 10) / 10;
            if (type === 'which-is-100' && new Set([whole, part, whole - part, 100]).size !== 4) continue;
            if (type === 'percent-choice' && (part === answer || part === 100 - answer)) continue;
            const ruleSets = {
                'part-of-whole': [
                    mistake(part / whole, 'Now multiply by 100.'),
                    mistake(100 - answer, "That's the other part."),
                    mistake(percent(whole, part), `That divides the wrong way. Divide by ${whole}, the whole.`),
                    mistake(part, `${part} is the amount, not the percentage.`)
                ],
                'find-the-whole': [
                    mistake(100 - answer, "That's the other group."),
                    mistake(percent(part, whole - part), 'That divides by the other group. Add them to find the whole.'),
                    mistake(part, "That's a count, not a percentage.")
                ],
                'more-than-100': [
                    mistake(percent(whole, part), `That divides by ${part}. The plan, ${whole}, is 100%.`),
                    mistake(percent(part - whole, whole), `That's only the extra. Use all of ${part}.`),
                    mistake(part / whole, 'Now multiply by 100.')
                ]
            };
            rules = cleanRules(answer, ruleSets[type] || []);
            if (['part-of-whole', 'find-the-whole', 'more-than-100'].includes(type) && rules.length < 2) continue;
            break;
        } while (true);
        const [setup, ask] = context(part, whole, int(0, 4));
        const working = `${part} ÷ ${whole} × 100 = ${number(answer)}`;
        if (type === 'part-of-whole') {
            question = card(type, part, whole, 'percent', {
                input: 'number', prompt: int(0, 1) ? `${setup} ${ask}` : `Express ${part} as a percentage of ${whole}.`,
                answer: number(answer), rules, feedback: working
            });
        } else if (type === 'find-the-whole') {
            const groups = choose([
                [`A shop has ${part} insulated bottles and ${whole - part} plain ones.`, 'What percentage are insulated?'],
                [`A shop has ${part} red pens and ${whole - part} blue pens.`, 'What percentage of the pens are red?']
            ]);
            question = card(type, part, whole, 'percent', {
                bankId: 'convert-a-fraction-to-a-percentage-08', input: 'number', prompt: groups.join(' '),
                answer: number(answer), rules, feedback: `${part} + ${whole - part} = ${whole}. ${working}`
            });
        } else if (type === 'more-than-100') {
            const kind = int(0, 2);
            const prompts = [
                `A group planned to sell ${whole} tickets. It sold ${part}. Express the number sold as a percentage of the number planned.`,
                `A group planned to walk ${whole} km. It walked ${part} km. Express the distance walked as a percentage of the planned distance.`,
                `A club had ${whole} members last year. It has ${part} this year. Express this year's number as a percentage of last year's number.`
            ];
            if (kind === 2) rules = rules.map(rule => ({ ...rule, feedback: rule.feedback.replace(`The plan, ${whole}`, `Last year's number, ${whole}`) }));
            question = card(type, part, whole, 'percent', {
                input: 'number', prompt: prompts[kind], answer: number(answer), rules, feedback: working
            });
        } else if (type === 'which-is-100') {
            question = card(type, part, whole, 'whole', {
                input: 'choice', prompt: `${setup} Which number is 100%?`, options: [
                    option(whole, `All ${whole} is the whole, so ${whole} is 100%.`, true),
                    option(part, "That's the part."),
                    option(whole - part, "That's the rest, not the whole."),
                    option(100, `100% is the whole. Here the whole is ${whole}.`)
                ]
            });
        } else if (type === 'which-working') {
            question = card(type, part, whole, 'working', {
                input: 'choice', prompt: `${setup} ${ask} Which working finds the percentage?`, options: [
                    option(`${part} ÷ ${whole} × 100`, `The whole is ${whole}. ${working}`, true),
                    option(`${whole} ÷ ${part} × 100`, 'That divides the wrong way. Divide by the whole.'),
                    option(`${part} ÷ 100 × ${whole}`, `That finds ${part}% of ${whole}.`),
                    option(`${whole - part} ÷ ${whole} × 100`, 'That uses the rest, not the part asked about.')
                ]
            });
        } else {
            question = card(type, part, whole, 'percent', {
                bankId: 'percentages-of-amounts-04', input: 'choice', prompt: `${setup} ${ask}`, options: [
                    option(`${number(answer)}%`, working, true),
                    option(`${number(answer / 100)}%`, `That's ${part} ÷ ${whole}. Multiply by 100.`),
                    option(`${number(100 - answer)}%`, "That's the other part."),
                    option(`${part}%`, `${part} is a count. Compare it with ${whole}.`)
                ]
            });
        }
        return prepare(question, random);
    }

    function node(tag, text = '', className = '') {
        const element = document.createElement(tag);
        element.textContent = text;
        if (className) element.className = className;
        return element;
    }

    function drawLearnPicture(host, screen, value) {
        host.replaceChildren();
        const add = text => host.append(node('p', text, 'percentage-working'));
        function bar(label, blocks, shaded, capacity = blocks, partLabel = '') {
            const figure = node('figure', '', 'percentage-bar');
            figure.append(node('figcaption', label));
            if (partLabel) figure.append(node('p', partLabel, 'percentage-part-label'));
            const track = node('div', '', 'percentage-blocks');
            track.style.setProperty('--blocks', capacity);
            track.setAttribute('role', 'img');
            track.setAttribute('aria-label', `${label}. ${partLabel || `${shaded} shaded blocks out of ${blocks}`}`);
            for (let index = 0; index < blocks; index++) {
                track.append(node('span', '', index < shaded ? 'is-shaded' : ''));
            }
            figure.append(track);
            host.append(figure);
        }
        if (screen === 0 || screen === 1) {
            bar('30 marks = 100%', 30, value, 30, `${value} marks`);
            if (screen === 0) add(`${value} out of 30`);
            else {
                const scale = node('div', '', 'percentage-scale');
                scale.append(node('span', '0%'), node('span', '100%'));
                const marker = node('span', '', 'percentage-marker');
                marker.style.left = `${value / 30 * 100}%`;
                scale.append(marker);
                host.append(scale);
                add(`${value} ÷ 30 = ${number(value / 30)}`);
                add(`${number(value / 30)} × 100 = ${number(percent(value, 30))}`);
                add(`${value} out of 30 is ${number(percent(value, 30))}%`);
            }
        } else if (screen === 2) {
            bar('£50 = 100%', 10, value / 5, 10, `£${value} spent — each block is £5`);
            add(`${value} ÷ 50 × 100 = ${number(percent(value, 50))}`);
            add(`£${value} is ${number(percent(value, 50))}% of £50`);
        } else if (screen === 3) {
            bar('Last year: 20 members = 100%', 20, 20, 30);
            bar('This year', value, value, 30, `${value} members`);
            add(`${value} ÷ 20 × 100 = ${number(percent(value, 20))}`);
            add(`This year is ${number(percent(value, 20))}% of last year`);
            host.append(node('p', value < 20 ? 'Fewer than 20, so less than 100%.'
                : value === 20 ? 'Exactly 20, so 100%.' : 'More than 20, so more than 100%.'));
        } else {
            const figure = node('figure', '', 'percentage-bottles');
            figure.append(node('figcaption', value === 1 ? 'Two groups of bottles' : '84 + 36 = 120 bottles = 100%'));
            const bars = node('div', '', value === 1 ? 'percentage-groups' : 'percentage-groups is-joined');
            bars.append(node('div', '84 insulated', 'percentage-insulated'), node('div', '36 plain', 'percentage-plain'));
            figure.append(bars);
            host.append(figure);
            if (value === 3) {
                add('84 ÷ 120 × 100 = 70');
                add('70% of the bottles are insulated');
            }
        }
    }

    window.PercentageOf = { percent, learnScreens, examples, practiceTypes, pick, generate, checks, prepare, node, drawLearnPicture };
})();
