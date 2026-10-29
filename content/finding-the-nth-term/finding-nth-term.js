(() => {
    'use strict';

    const number = n => String(n).replace(/-/g, '−');
    const term = (rule, n) => rule.d * n + rule.c;
    const ruleText = ({ d, c }) => d < 0 ? `${number(c)} − ${-d}n`
        : `${d === 1 ? '' : d}n${c === 0 ? '' : ` ${c < 0 ? '−' : '+'} ${Math.abs(c)}`}`;
    const ordinal = n => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th')}`;
    const option = (label, feedback, correct = false) => ({ label: String(label), feedback, correct });
    const mistake = (value, feedback) => ({ value: String(value), feedback });
    const practiceTypes = ['rule-up', 'rule-down', 'pattern-dots', 'adjust', 'find-then-use', 'down-jump'];
    const learnScreens = [
        {
            title: 'Why find a rule?',
            lines: ["This sequence goes up by 4 each time. That's easy to keep going. But to find the 50th term, you'd have to add 4 lots of times. Last lesson you used an nth term to jump straight to any term. Now you'll find the nth term yourself."],
            maths: ['5, 9, 13, 17, …', '+4'], slider: 'Jumps: 0 to 3', min: 0, max: 3
        },
        {
            title: 'It goes up like a times table.',
            lines: ["The sequence goes up by 4 each time. The amount it goes up by is called the difference. The 4 times table goes up by 4 too. That's 4n: 4 × 1, 4 × 2, 4 × 3, … So the rule starts with 4n."],
            maths: ['4n: 4, 8, 12, 16', '5, 9, 13, 17, …'], slider: 'Show 4n: 0 to 4', min: 0, max: 4
        },
        {
            title: 'Make the rows match.',
            lines: ['Each term is 1 more than the 4 times table. So the nth term is 4n + 1. Multiply the position by 4, then add 1.'],
            maths: ['+1', '4n + 1'], slider: 'Compare: 0 to 4', min: 0, max: 4
        },
        {
            title: 'Sometimes you take away.',
            lines: ['It goes up by 3, so start with 3n. Each term is 1 less than the 3 times table. So the nth term is 3n − 1.'],
            callout: "If the terms match the times table exactly, you don't add anything. For 4, 8, 12, 16, … the nth term is 4n.",
            maths: ['3n: 3, 6, 9, 12', '2, 5, 8, 11, …', '−1', '3n − 1'], slider: 'Compare: 0 to 4', min: 0, max: 4
        },
        {
            title: 'When it goes down.',
            lines: ['It goes down by 3 each time, so use −3n. To get from −3 to 14, add 17. That works in every column. So the nth term is 17 − 3n.'],
            maths: ['−3n: −3, −6, −9, −12', '14, 11, 8, 5, …', '+17', '−3 + 17 = 14', '17 − 3n'], slider: 'Compare: 0 to 4', min: 0, max: 4
        },
        {
            title: 'Always check your rule.', ruleText: '4n + 1', lines: [],
            callout: 'A common mistake: the first term is 5, so the rule is 4n + 5. Check it: 4 × 1 + 5 = 9, not 5. Always check the first two terms.',
            steps: ['Find how much it goes up or down each time.', 'Write that times n.', 'Work out what to add or take away to match the terms.', 'Check the first two terms.'],
            maths: ['5, 9, 13, 17, …', '4 × 2 + 1 = 9'], slider: 'Check position: 1 to 4', min: 1, max: 4
        }
    ];

    function card(questionType, d, c, config) {
        const rule = { d, c };
        return {
            questionType, rule, terms: [1, 2, 3, 4].map(n => term(rule, n)),
            fallback: 'Find the jump. Compare the times table with the terms. Check the first two terms.',
            ...config
        };
    }

    function examples() {
        return [
            card('try-jump', 5, 2, {
                asked: 'jump', input: 'number', prompt: 'How much does it go up by each time?', answer: '5', rules: [
                    mistake(7, '7 is the 1st term. Find the jump: 12 − 7.'),
                    mistake(4, 'Count the jump, not the numbers between: 12 − 7 = 5.'),
                    mistake(19, 'That adds 7 and 12. Take away instead: 12 − 7.')
                ], feedback: '12 − 7 = 5, 17 − 12 = 5 and 22 − 17 = 5.'
            }),
            card('try-adjust', 5, 2, {
                asked: 'adjust', table: true, input: 'number', prompt: 'How much more is each term than the 5 times table?', answer: '2', rules: [
                    mistake(7, '7 is the 1st term. Compare it with 5 × 1 = 5: 7 − 5 = 2.'),
                    mistake(5, '5 is the jump. Compare the two rows: 7 − 5 = 2.'),
                    mistake(-2, "The terms are bigger than the 5 times table, so it's 2 more.")
                ], feedback: '7 − 5 = 2, 12 − 10 = 2, and so on.'
            }),
            card('try-rule', 5, 2, {
                asked: 'rule', input: 'choice', prompt: 'What is the nth term?', options: [
                    option('5n + 2', '5 × 1 + 2 = 7 and 5 × 2 + 2 = 12.', true),
                    option('5n + 7', '7 is the 1st term. Check: 5 × 1 + 7 = 12, not 7.'),
                    option('2n + 5', 'It goes up by 5, so the 5 goes with n: 5n.'),
                    option('n + 5', 'n + 5 goes up by 1 each time. This goes up by 5.')
                ]
            }),
            card('try-use', 5, 2, {
                position: 50, input: 'number', prompt: 'Use 5n + 2 to find the 50th term.', answer: '252', rules: [
                    mistake(250, "That's 5 × 50. Now add 2."),
                    mistake(257, 'That uses 5n + 7. The rule is 5n + 2.'),
                    mistake(57, '5n means 5 × 50, not 5 + 50.')
                ], feedback: '5 × 50 + 2 = 250 + 2 = 252'
            }),
            card('try-rule', 4, -3, {
                bankId: 'nth-term-02', asked: 'rule', input: 'choice', prompt: 'What is the nth term?', options: [
                    option('4n − 3', '4 × 1 − 3 = 1 and 4 × 2 − 3 = 5.', true),
                    option('4n + 1', '1 is the 1st term. Check: 4 × 1 + 1 = 5, not 1.'),
                    option('4n + 3', 'Each term is 3 less than the 4 times table, not 3 more.'),
                    option('4n', '4n gives 4, 8, 12, 16. Each term is 3 less, so take away 3.')
                ]
            }),
            card('try-use', 4, -3, {
                position: 20, input: 'number', prompt: 'Use your rule to find the 20th term.', answer: '77', rules: [
                    mistake(80, "That's 4 × 20. Now take away 3."),
                    mistake(83, 'That adds 3. The rule is 4n − 3.'),
                    mistake(81, 'That uses 4n + 1. Check it: 4 × 1 + 1 = 5, not 1.')
                ], feedback: '4 × 20 − 3 = 80 − 3 = 77'
            }),
            card('try-adjust', -2, 12, {
                asked: 'adjust', table: true, input: 'number', prompt: 'It goes down by 2, so use −2n. What do you add to −2n to get each term?', answer: '12', rules: [
                    mistake(10, '10 is the 1st term. −2 + 12 = 10, so add 12.'),
                    mistake(8, 'Compare the rows: from −2 up to 10 is 12.'),
                    mistake(-12, 'The terms are bigger than the −2n row, so you add.')
                ], feedback: '−2 + 12 = 10, −4 + 12 = 8, and so on.'
            }),
            card('try-rule', -2, 12, {
                bankId: 'nth-term-03', asked: 'rule', input: 'choice', prompt: 'What is the nth term?', options: [
                    option('12 − 2n', '12 − 2 × 1 = 10 and 12 − 2 × 2 = 8.', true),
                    option('12 + 2n', 'That goes up by 2. The terms go down, so take away 2n.'),
                    option('10 − 2n', '10 is the 1st term. Check: 10 − 2 × 1 = 8, not 10.'),
                    option('n − 2', 'n − 2 goes up by 1 each time. This goes down by 2.')
                ]
            }),
            card('pattern-dots', 4, 2, {
                bankId: 'nth-term-12', dots: true, position: 14, input: 'choice', prompt: 'How many dots are in Pattern 14?', options: [
                    option('58', '4 rows of 14 red dots, plus 2 blue: 4 × 14 + 2 = 58.', true),
                    option('62', "That's Pattern 15, one too far."),
                    option('56', 'That counts only the red dots. Add the 2 blue dots.'),
                    option('54', "That's Pattern 13.")
                ]
            })
        ];
    }

    function checks() {
        return [
            card('check-amir', 4, 1, {
                asked: 'rule', input: 'choice', prompt: 'Amir says the nth term is 4n + 5, because it goes up by 4 and the first term is 5. Is Amir right?', options: [
                    option('No. 4 × 1 + 5 = 9, not 5. The nth term is 4n + 1.', 'Right. The 4n part already gives 4 at position 1, so you only add 1.', true),
                    option('Yes. It goes up by 4 and starts at 5.', 'Check it: 4 × 1 + 5 = 9, but the 1st term is 5.'),
                    option('No. The nth term is 5n + 4.', 'It goes up by 4, so the 4 goes with n.'),
                    option('No. The nth term is 4n − 1.', '4 × 1 − 1 = 3, not 5.')
                ]
            }),
            card('check-beth', 3, 4, {
                asked: 'rule', input: 'choice', prompt: 'Beth says the nth term is 5n + 2. She checks n = 1 and gets 7. Is Beth right?', options: [
                    option('No. 5 × 2 + 2 = 12, but the 2nd term is 10. The nth term is 3n + 4.', "Right. One term isn't enough. Check the 2nd term too.", true),
                    option('Yes. It works for n = 1.', 'Check n = 2 as well: 5 × 2 + 2 = 12, not 10.'),
                    option('No. The nth term is 3n + 7.', '3 × 1 + 7 = 10, not 7.'),
                    option('No. The nth term is 7n + 3.', 'It goes up by 3, so the 3 goes with n.')
                ]
            }),
            card('check-adjust', 5, 6, {
                asked: 'adjust', input: 'number', prompt: 'The nth term is 5n + □. What number goes in the box?', answer: '6', rules: [
                    mistake(11, '11 is the 1st term. 5 × 1 = 5, so add 6.'),
                    mistake(5, '5 is the jump. Compare 11 with 5 × 1 = 5.')
                ], feedback: '5 × 1 + 6 = 11 and 5 × 2 + 6 = 16.'
            }),
            card('check-use', 5, 6, {
                position: 100, input: 'number', prompt: 'Find the 100th term.', answer: '506', rules: [
                    mistake(500, "That's 5 × 100. Now add 6."),
                    mistake(511, 'That uses 5n + 11. Check it on the 1st term.'),
                    mistake(111, '5n means 5 × 100, not 5 + 100.')
                ], feedback: '5 × 100 + 6 = 500 + 6 = 506'
            }),
            card('check-adjust', -3, 23, {
                asked: 'adjust', input: 'number', prompt: 'The nth term is □ − 3n. What number goes in the box?', answer: '23', rules: [
                    mistake(20, 'Check: 20 − 3 × 1 = 17, not 20. Add the 3 back: 23.'),
                    mistake(17, '17 is the 2nd term. You need 23 − 3 × 1 = 20.'),
                    mistake(3, '3 is the jump. The number in the box makes the 1st term 20.')
                ], feedback: '23 − 3 × 1 = 20 and 23 − 3 × 2 = 17.'
            })
        ];
    }

    function working(rule, n) {
        if (rule.d < 0) return `${number(rule.c)} − ${-rule.d} × ${n} = ${number(term(rule, n))}`;
        return `${rule.d} × ${n}${rule.c === 0 ? '' : ` ${rule.c < 0 ? '−' : '+'} ${Math.abs(rule.c)}`} = ${number(term(rule, n))}`;
    }

    function firstChecks(rule) {
        return `${working(rule, 1)} and ${working(rule, 2)}`;
    }

    function pick(random) {
        const { randomInt, shuffle } = window.Maths1to9LessonEngine;
        return shuffle(practiceTypes.map(type => ({ type, seed: randomInt(0, 4294967295, random) })), random);
    }

    function prepare(question, random) {
        return question.options ? { ...question, options: window.Maths1to9LessonEngine.shuffle(question.options, random) } : { ...question };
    }

    function cleanRules(question) {
        const used = new Set([Number(question.answer)]);
        question.rules = question.rules.filter(rule => {
            const value = Number(rule.value);
            if (used.has(value)) return false;
            used.add(value);
            return true;
        });
        return question;
    }

    function generate(item, random) {
        const { randomInt } = window.Maths1to9LessonEngine;
        const int = (min, max) => randomInt(min, max, random);
        const upRule = (nonzero = false) => {
            const d = int(2, 9);
            const offsets = Array.from({ length: 19 }, (_, i) => i - 8)
                .filter(c => d + c >= 1 && (!nonzero || c !== 0) && 2 * c !== -d);
            return { d, c: offsets[int(0, offsets.length - 1)] };
        };
        const downRule = (maxD = 9, positive = false) => {
            const d = int(2, maxD);
            return { d: -d, c: int(positive ? Math.max(20, 4 * d + 1) : 20, 60) };
        };
        let question;
        if (item.type === 'rule-up') {
            const rule = upRule();
            const { d, c } = rule, first = d + c;
            const right = ruleText(rule), wrongFirst = ruleText({ d, c: first });
            let swapped = ruleText({ d: first, c: d });
            let swappedFeedback = `It goes up by ${d}, so ${d} goes with n.`;
            const opposite = c === 0 ? `n + ${d}` : ruleText({ d, c: -c });
            if ([right, wrongFirst, opposite].includes(swapped)) {
                swapped = `${d + 1}n`;
                swappedFeedback = `${d + 1}n goes up by ${d + 1} each time. This goes up by ${d}.`;
            }
            question = card(item.type, d, c, {
                bankId: 'nth-term-02', asked: 'rule', input: 'choice', prompt: 'What is the nth term?', options: [
                    option(right, firstChecks(rule), true),
                    option(wrongFirst, `${first} is the 1st term. Check: ${d} × 1 + ${first} = ${d + first}, not ${first}.`),
                    option(swapped, swappedFeedback),
                    option(opposite, c === 0 ? `n + ${d} goes up by 1 each time.` : `Each term is ${Math.abs(c)} ${c < 0 ? 'less' : 'more'} than the ${d} times table.`)
                ]
            });
        } else if (item.type === 'rule-down') {
            const rule = downRule(9, true), d = -rule.d, c = rule.c, first = c - d;
            question = card(item.type, -d, c, {
                bankId: 'nth-term-03', asked: 'rule', input: 'choice', prompt: 'What is the nth term?', options: [
                    option(ruleText(rule), firstChecks(rule), true),
                    option(`${c} + ${d}n`, `That goes up. The terms go down, so take away ${d}n.`),
                    option(`${first} − ${d}n`, `${first} is the 1st term. Check: ${first} − ${d} × 1 = ${first - d}, not ${first}.`),
                    option(`${c} − n`, `That goes down by 1 each time, not ${d}.`)
                ]
            });
        } else if (item.type === 'pattern-dots') {
            const d = int(2, 5), k = int(8, 20);
            const extras = [1, 2, 3, 4, 5].filter(value => value !== d);
            const c = extras[int(0, extras.length - 1)];
            question = card(item.type, d, c, {
                bankId: 'nth-term-12', dots: true, position: k, input: 'choice', prompt: `How many dots are in Pattern ${k}?`, options: [
                    option(String(d * k + c), `${d} × ${k} + ${c} = ${d * k + c}. Check: ${firstChecks({ d, c })}`, true),
                    option(String(d * (k + 1) + c), `That's Pattern ${k + 1}, one too far.`),
                    option(String(d * k), `That counts only the red dots. Add the ${c} blue dots.`),
                    option(String(d * (k - 1) + c), `That's Pattern ${k - 1}.`)
                ]
            });
        } else if (item.type === 'adjust') {
            // Redraw before creating a card if the prescribed mistakes leave fewer than two values.
            let rule, answer, rules;
            do {
                rule = random() < 0.5 ? upRule(true) : downRule();
                answer = Math.abs(rule.c);
                rules = [
                    mistake(term(rule, 1), "That's the 1st term. Compare it with the number above it."),
                    mistake(Math.abs(rule.d), `${Math.abs(rule.d)} is the jump. Compare the two rows.`),
                    mistake(-answer, 'Look at which row is bigger.')
                ];
                rules = cleanRules({ answer, rules }).rules;
            } while (rules.length < 2);
            const base = `${number(rule.d)}n`;
            question = card(item.type, rule.d, rule.c, {
                asked: 'adjust', table: true, input: 'number',
                prompt: rule.c < 0 ? `What do you take away from ${base}?` : `What do you add to ${base} to get each term?`,
                answer: String(answer), rules, feedback: firstChecks(rule)
            });
        } else if (item.type === 'find-then-use') {
            const rule = random() < 0.5 ? upRule(true) : downRule(6), k = int(20, 100);
            const rules = [
                mistake(rule.d * k, "That's only the n part. Now add or take away the rest of the rule."),
                mistake(rule.d * k + term(rule, 1), 'That uses the 1st term in the rule. Check your rule on the 1st term.')
            ];
            if (rule.d > 0) rules.push(mistake(rule.d + k + rule.c, `${rule.d}n means ${rule.d} × n, not ${rule.d} + n.`));
            question = card(item.type, rule.d, rule.c, {
                position: k, input: 'number', prompt: `Find the nth term, then use it to find the ${ordinal(k)} term.`,
                answer: String(term(rule, k)), rules,
                feedback: `The nth term is ${ruleText(rule)}. ${working(rule, k)}. Check: ${firstChecks(rule)}`
            });
        } else if (item.type === 'down-jump') {
            const rule = downRule();
            question = card(item.type, rule.d, rule.c, {
                asked: 'jump', input: 'number', prompt: 'What number goes in front of n in the nth term?', answer: String(rule.d), rules: [
                    mistake(-rule.d, `The terms go down, so it's ${number(rule.d)}.`),
                    mistake(term(rule, 1), "That's the 1st term. Find the jump between terms.")
                ], feedback: `It goes down by ${-rule.d}, so use ${number(rule.d)}n. Check: ${firstChecks(rule)}`
            });
        } else {
            throw new TypeError(`Unknown finding-nth-term question type: ${item.type}`);
        }
        return prepare(question.input === 'number' ? cleanRules(question) : question, random);
    }

    window.FindingNthTerm = { learnScreens, examples, checks, practiceTypes, pick, generate, term, ruleText, prepare, number, ordinal, working };
})();
