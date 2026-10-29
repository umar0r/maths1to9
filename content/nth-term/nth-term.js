(() => {
    'use strict';

    const number = n => String(n).replace(/-/g, '−');
    const option = (label, feedback, correct = false) => ({ label: String(label), feedback, correct });
    const mistake = (value, feedback) => ({ value: typeof value === 'object' ? value : String(value), feedback });
    const rule = (a, b, c) => ({ a, b, c });
    const term = (rule, n) => rule.a * n * n + rule.b * n + rule.c;
    const ordinal = n => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th')}`;
    const practiceTypes = ['linear-term', 'take-away', 'square-rule', 'term-choice', 'first-terms', 'every-term'];
    const learnScreens = [
        {
            title: 'Every term has a position.',
            lines: ['Each number in a sequence is a term. Its position tells you where it is: 1st, 2nd, 3rd and so on.', 'Positions start at 1. In maths we use the letter n for the position.'],
            maths: ['5, 8, 11, 14, 17, 20, …', 'Position 4 → term 14'],
            slider: 'Position: 1 to 6', min: 1, max: 6
        },
        {
            title: 'A rule turns the position into the term.', ruleText: '3n + 2',
            lines: ['3n means 3 × n.', 'This rule is called the nth term. Put the position in place of n, and it gives you the term. Multiply by 3, then add 2.'],
            maths: ['3 × 4 + 2 = 12 + 2 = 14'], slider: 'n: 1 to 6', min: 1, max: 6
        },
        {
            title: 'Jump straight to any term.', ruleText: '3n + 2',
            lines: ["You don't need to write out the first 19 terms. Put 20 in place of n."],
            callout: 'Rules can count real things. If Pattern n uses 3n + 2 sticks, Pattern 20 uses 62 sticks.',
            maths: ['3 × 20 + 2 = 60 + 2 = 62'], slider: 'n: 1 to 100', min: 1, max: 100
        },
        {
            title: 'Multiply before you take away.', ruleText: '30 − 4n', lines: [],
            callout: 'Do 4 × 6 first. Taking away first gives (30 − 4) × 6 = 156, which is wrong.',
            belowZero: 'The terms can go below zero: 30 − 32 = −2.',
            maths: ['30 − 4 × 6 = 30 − 24 = 6'], slider: 'n: 1 to 10', min: 1, max: 10
        },
        {
            title: 'n² means n × n.', ruleText: 'n² + 3',
            lines: ["n² means n × n. It's called n squared."],
            callout: '4² is 4 × 4 = 16, not 4 × 2 = 8.',
            secondCallout: '2n² means 2 × n². Square first, then multiply: 2 × 4² = 2 × 16 = 32.',
            maths: ['4² + 3 = 4 × 4 + 3 = 16 + 3 = 19'], slider: 'n: 1 to 6', min: 1, max: 6
        },
        {
            title: 'Put the position in place of every n.', ruleText: 'n² + 2n', lines: [],
            steps: ['Find the position you want.', 'Put it in place of every n.', 'Work it out: squares first, then ×, then + or −.'],
            maths: ['3² + 2 × 3 = 9 + 6 = 15'], slider: 'n: 1 to 6', min: 1, max: 6
        }
    ];

    function card(questionType, ruleData, position, ruleText, config) {
        return {
            questionType, rule: ruleData, position, ruleText,
            fallback: 'Put the position in place of every n. Work out squares first, then ×, then + or −.',
            ...config
        };
    }

    function examples() {
        return [
            card('position-step', rule(0, 4, 1), 6, '4n + 1', {
                asked: 'step', input: 'choice', prompt: 'You want the 6th term. What number goes in place of n?', options: [
                    option('6', 'You want the 6th term, so n = 6.', true),
                    option('4', '4 is the number you multiply by. n is the position.'),
                    option('1', 'n = 1 gives the 1st term. You want the 6th.'),
                    option('5', "The 6th term is at position 6, so n = 6. Don't count the gaps.")
                ]
            }),
            card('try-linear', rule(0, 4, 1), 6, '4n + 1', {
                input: 'number', prompt: 'Find the 6th term.', answer: '25', rules: [
                    mistake(24, "That's 4 × 6. Now add 1."),
                    mistake(11, '4n means 4 × n, not 4 + n.'),
                    mistake(47, '4n means 4 × 6, not the number 46.')
                ], feedback: '4 × 6 + 1 = 24 + 1 = 25'
            }),
            card('multiply-step', rule(0, -3, 25), 7, '25 − 3n', {
                asked: 'step', input: 'choice', prompt: 'To find the 7th term, you work out 25 − 3 × 7. What do you work out first?', options: [
                    option('3 × 7', 'Multiply first: 3 × 7 = 21.', true),
                    option('25 − 3', 'Multiply before you take away. 25 − 3 first would give 22 × 7.'),
                    option('25 × 7', 'The 7 goes in place of n, so it goes with the 3: 3 × 7.'),
                    option('25 − 7', "3n means 3 × 7. Don't drop the 3.")
                ]
            }),
            card('try-take-away', rule(0, -3, 25), 7, '25 − 3n', {
                input: 'number', prompt: 'Find the 7th term.', answer: '4', rules: [
                    mistake(154, 'You took away first. Do 3 × 7 = 21 first, then 25 − 21.'),
                    mistake(46, 'That adds 21. The rule takes away 3n: 25 − 21.'),
                    mistake(-4, '25 is bigger than 21, so the answer is above zero: 25 − 21 = 4.')
                ], feedback: '25 − 3 × 7 = 25 − 21 = 4'
            }),
            card('try-bank', rule(0, 8, -5), 6, '8n − 5', {
                bankId: 'nth-term-01', input: 'number', prompt: 'Find the 6th term.', answer: '43', rules: [
                    mistake(48, "That's 8 × 6. Now take away 5."),
                    mistake(9, '8n means 8 × n, not 8 + n.'),
                    mistake(3, 'That uses n = 1, the 1st term. For the 6th term, use n = 6.')
                ], feedback: '8 × 6 − 5 = 48 − 5 = 43'
            }),
            card('try-square', rule(1, 0, 5), 6, 'n² + 5', {
                input: 'choice', prompt: 'Find the 6th term.', options: [
                    option('41', '6² + 5 = 36 + 5 = 41', true),
                    option('17', '6² means 6 × 6, not 6 × 2.'),
                    option('36', "That's 6². Now add 5."),
                    option('121', 'That adds 5 before squaring. Square 6 first, then add 5.')
                ]
            }),
            card('try-double-square', rule(2, 0, 0), 4, '2n²', {
                input: 'number', prompt: 'Find the 4th term.', answer: '32', rules: [
                    mistake(64, 'That squares 2 × 4 = 8. Square 4 first, then multiply by 2.'),
                    mistake(16, '4² is 16. Now multiply by 2.'),
                    mistake(8, "2n² isn't 2 × 4. Square 4 first: 4 × 4 = 16.")
                ], feedback: '4² = 16, then 2 × 16 = 32.'
            }),
            card('try-parts', rule(1, 2, 0), 3, 'n² + 2n', {
                input: 'number', fractions: true,
                fields: [{ id: 'square', label: '3²' }, { id: 'times', label: '2 × 3' }],
                prompt: 'Find the 3rd term. First work out each part.', parts: '3² + 2 × 3',
                answer: { square: '9', times: '6' }, rules: [
                    mistake({ square: '6', times: '6' }, '3² means 3 × 3 = 9, not 3 × 2.'),
                    mistake({ square: '9', times: '5' }, '2n means 2 × 3, not 2 + 3.'),
                    mistake({ square: '3', times: '6' }, '3² means 3 × 3, not just 3.')
                ], feedback: '3² = 9 and 2 × 3 = 6.'
            }),
            card('try-total', rule(1, 2, 0), 3, 'n² + 2n', {
                input: 'choice', prompt: 'So what is the 3rd term?', options: [
                    option('15', '9 + 6 = 15. You put 3 in place of both ns.', true),
                    option('12', "3² is 3 × 3 = 9, not 3 × 2 = 6. So it's 9 + 6."),
                    option('11', '2n means 2 × 3 = 6. Put 3 in place of every n.'),
                    option('9', "That's only 3². Add 2 × 3 as well.")
                ]
            })
        ];
    }

    function checks() {
        return [
            card('amir', rule(0, 5, 2), 4, '5n + 2', {
                input: 'choice', prompt: "Amir wants the 4th term. He says: 'I put n = 22, because the 4th term is 22.' Is Amir right?", options: [
                    option('No. n is the position, so he puts n = 4. 5 × 4 + 2 = 22 is the term.', 'Right. The position is 4. The term at that position is 22.', true),
                    option('Yes. The 4th term is 22, so n = 22.', '22 is the term. n is its position, 4.'),
                    option('No. He should put n = 5, the number in front of n.', '5 is the number you multiply by. n is the position, 4.'),
                    option('No. The 4th term is 5 + 4 + 2 = 11.', '5n means 5 × n, not 5 + n. 5 × 4 + 2 = 22.')
                ]
            }),
            card('check-linear', rule(0, 5, 2), 30, '5n + 2', {
                input: 'number', prompt: 'Find the 30th term.', answer: '152', rules: [
                    mistake(150, "That's 5 × 30. Now add 2."),
                    mistake(37, '5n means 5 × 30, not 5 + 30.'),
                    mistake(160, 'You added first. Multiply first: 5 × 30 = 150, then add 2.')
                ], feedback: '5 × 30 + 2 = 150 + 2 = 152'
            }),
            card('ella', rule(1, 0, 4), 5, 'n² + 4', {
                input: 'choice', prompt: 'Ella finds the 5th term like this: 5 × 2 + 4 = 14. What did she do wrong?', options: [
                    option('She worked out 5 × 2 instead of 5². The 5th term is 25 + 4 = 29.', 'Right. 5² means 5 × 5 = 25, so the 5th term is 29.', true),
                    option('Nothing. The 5th term is 14.', "5² isn't 5 × 2. Squared means times by itself: 5 × 5."),
                    option('She should add first: (5 + 4)² = 81.', 'Square 5 first, then add 4.'),
                    option('She used the wrong position. She should put n = 4.', 'She wants the 5th term, so n = 5 is right. Her mistake is 5 × 2.')
                ]
            }),
            card('check-take-away', rule(0, -3, 40), 12, '40 − 3n', {
                input: 'number', prompt: 'Find the 12th term.', answer: '4', rules: [
                    mistake(444, 'You took away first. Do 3 × 12 = 36 first, then 40 − 36.'),
                    mistake(76, 'That adds. The rule takes away 3n: 40 − 36.'),
                    mistake(-4, '40 is bigger than 36, so the answer is above zero.')
                ], feedback: '40 − 3 × 12 = 40 − 36 = 4'
            }),
            card('check-every-n', rule(1, -3, 0), 7, 'n² − 3n', {
                input: 'number', prompt: 'Find the 7th term.', answer: '28', rules: [
                    mistake(-7, '7² means 7 × 7 = 49, not 7 × 2 = 14.'),
                    mistake(46, '3n means 3 × 7. Put 7 in place of every n.'),
                    mistake(70, 'That adds. The rule takes away 3n: 49 − 21.')
                ], feedback: '7² − 3 × 7 = 49 − 21 = 28'
            })
        ];
    }

    function pick(random) {
        const { randomInt, shuffle } = window.Maths1to9LessonEngine;
        return shuffle(practiceTypes.map(type => ({ type, seed: randomInt(0, 4294967295, random) })), random);
    }

    function cleanRules(question) {
        const used = new Set([Number(question.answer)]);
        question.rules = question.rules.filter(rule => {
            const n = Number(rule.value);
            if (used.has(n)) return false;
            used.add(n);
            return true;
        });
        return question;
    }

    function generate(item, random) {
        const { randomInt } = window.Maths1to9LessonEngine;
        const int = (min, max) => randomInt(min, max, random);
        let question;
        if (item.type === 'linear-term') {
            const a = int(2, 9), k = int(5, 20), subtract = random() < 0.5;
            const b = int(1, subtract ? Math.min(12, a * k - 1) : 12);
            const sign = subtract ? '−' : '+', change = subtract ? 'take away' : 'add';
            const offset = subtract ? -b : b;
            const ruleText = `${a}n ${sign} ${b}`;
            const words = !subtract && random() < 0.5;
            const rules = [
                mistake(a * k, `That's ${a} × ${k}. Now ${change} ${b}.`),
                mistake(a + k + offset, `${a}n means ${a} × n, not ${a} + n.`),
                mistake(a + offset, `That uses n = 1, the 1st term. Use n = ${k}.`)
            ];
            if (k <= 9) rules.push(mistake(10 * a + k + offset, `${a}n means ${a} × ${k}, not the number ${a}${k}.`));
            question = card(item.type, rule(0, a, offset), k, ruleText, {
                bankId: 'nth-term-01', input: 'number',
                prompt: words ? `Pattern n uses ${ruleText} sticks. How many sticks does Pattern ${k} use?`
                    : `The nth term is ${ruleText}. Find the ${ordinal(k)} term.`,
                answer: String(a * k + offset), rules,
                feedback: `${a} × ${k} ${sign} ${b} = ${a * k} ${sign} ${b} = ${number(a * k + offset)}`
            });
        } else if (item.type === 'take-away') {
            const below = random() < 0.5;
            // Choose only pairs that leave at least one allowed c on the selected side of a × k.
            const pairs = [];
            for (let a = 2; a <= 6; a++) {
                for (let k = 5; k <= 15; k++) {
                    if (below ? a * k > 20 : a * k < 60) pairs.push({ a, k });
                }
            }
            const { a, k } = pairs[int(0, pairs.length - 1)];
            const product = a * k;
            const c = below ? int(20, Math.min(60, product - 1)) : int(Math.max(20, product + 1), 60);
            const answer = c - product;
            question = card(item.type, rule(0, -a, c), k, `${c} − ${a}n`, {
                input: 'number', prompt: `Find the ${ordinal(k)} term.`, answer: String(answer), rules: [
                    mistake((c - a) * k, `You took away first. Work out ${a} × ${k} first.`),
                    mistake(c + product, `That adds. The rule takes away ${a}n.`),
                    mistake(product - c, below ? `${product} is bigger than ${c}, so the answer is below zero.`
                        : `${c} is bigger than ${product}, so the answer is above zero.`)
                ], feedback: `${c} − ${a} × ${k} = ${c} − ${product} = ${number(answer)}`
            });
        } else if (item.type === 'square-rule') {
            const p = int(3, 12), kind = int(0, 2), square = p * p;
            if (kind < 2) {
                const subtract = kind === 1, b = int(1, subtract ? Math.min(20, square - 1) : 20);
                const sign = subtract ? '−' : '+', change = subtract ? 'take away' : 'add', offset = subtract ? -b : b;
                question = card(item.type, rule(1, 0, offset), p, `n² ${sign} ${b}`, {
                    input: 'number', prompt: `Find the ${ordinal(p)} term.`, answer: String(square + offset), rules: [
                        mistake(2 * p + offset, `${p}² means ${p} × ${p}, not ${p} × 2.`),
                        mistake((p + offset) ** 2, `Square ${p} first, then ${change} ${b}.`),
                        mistake(square, `That's ${p}². Now ${change} ${b}.`)
                    ], feedback: `${p}² ${sign} ${b} = ${square} ${sign} ${b} = ${number(square + offset)}`
                });
            } else {
                const m = int(2, 5);
                question = card(item.type, rule(m, 0, 0), p, `${m}n²`, {
                    input: 'number', prompt: `Find the ${ordinal(p)} term.`, answer: String(m * square), rules: [
                        mistake((m * p) ** 2, `Square ${p} first, then multiply by ${m}.`),
                        mistake(2 * m * p, `${p}² means ${p} × ${p}, not ${p} × 2.`),
                        mistake(square, `That's ${p}². Now multiply by ${m}.`)
                    ], feedback: `${m} × ${p}² = ${m} × ${square} = ${m * square}`
                });
            }
        } else if (item.type === 'term-choice') {
            const a = int(2, 9), k = int(6, 25);
            // Keep all three misconceptions distinct from each other and the answer.
            const offsets = Array.from({ length: 12 }, (_, i) => i + 1).filter(b =>
                new Set([a * k + b, a * k, a + k + b, a * (k + b)]).size === 4);
            const b = offsets[int(0, offsets.length - 1)];
            const ruleText = random() < 0.5 ? `${b} + ${a}n` : `${a}n + ${b}`;
            question = card(item.type, rule(0, a, b), k, ruleText, {
                input: 'choice', prompt: `Find the ${ordinal(k)} term.`, options: [
                    option(number(a * k + b), `${a} × ${k} + ${b} = ${a * k} + ${b} = ${a * k + b}`, true),
                    option(number(a * k), `That's ${a} × ${k}. Now add ${b}.`),
                    option(number(a + k + b), `${a}n means ${a} × n, not ${a} + n.`),
                    option(number(a * (k + b)), `Multiply first, then add: ${a} × ${k} + ${b}.`)
                ]
            });
        } else if (item.type === 'first-terms') {
            const b = int(1, 9), list = ns => ns.map(number).join(', ');
            question = card(item.type, rule(1, 0, b), undefined, `n² + ${b}`, {
                positions: [1, 2, 3], input: 'choice', prompt: 'What are the first three terms?', options: [
                    option(list([1 + b, 4 + b, 9 + b]), `1² + ${b} = ${1 + b}, 2² + ${b} = ${4 + b}, 3² + ${b} = ${9 + b}`, true),
                    option(list([b, 1 + b, 4 + b]), 'Positions start at 1, not 0.'),
                    option(list([2 + b, 4 + b, 6 + b]), 'n² means n × n, not n × 2.'),
                    option(list([(1 + b) ** 2, (2 + b) ** 2, (3 + b) ** 2]), `Square n first, then add ${b}.`)
                ]
            });
        } else if (item.type === 'every-term') {
            const a = int(2, 6);
            question = card(item.type, rule(-1, a, 0), 1, `${a}n − n²`, {
                bankId: 'nth-term-09', input: 'choice',
                prompt: 'Someone says every term of this sequence is below zero. Which reply is right?', options: [
                    option(`No. The 1st term is ${a} × 1 − 1² = ${a - 1}, which is above zero.`, "One term above zero is enough to show they're wrong.", true),
                    option(`Yes. n² is always bigger than ${a}n.`, `At n = 1, n² is 1 and ${a}n is ${a}. ${a} is bigger.`),
                    option('No. Put n = 0 and the term is 0.', 'Positions start at 1. There is no 0th term.'),
                    option(`Yes. The 1st term is 1 − ${a} = ${number(1 - a)}, which is below zero.`, `Put 1 in place of n: ${a} × 1 − 1² = ${a - 1}, not 1 − ${a}.`)
                ]
            });
        } else {
            throw new TypeError(`Unknown nth-term question type: ${item.type}`);
        }
        return prepare(question.input === 'number' ? cleanRules(question) : question, random);
    }

    function prepare(question, random) {
        return question.options ? { ...question, options: window.Maths1to9LessonEngine.shuffle(question.options, random) } : { ...question };
    }

    window.NthTerm = { learnScreens, examples, practiceTypes, pick, generate, checks, term, prepare, number, ordinal };
})();
