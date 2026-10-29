(() => {
    'use strict';

    const number = n => String(n).replace(/-/g, '−');
    const ordinal = n => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th')}`;
    const option = (label, feedback, correct = false) => ({ label: String(label), feedback, correct });
    const mistake = (value, feedback) => ({ value: typeof value === 'object' ? value : String(value), feedback });
    const pair = (first, second) => ({ first: String(first), second: String(second) });
    const fields = [{ id: 'first', label: 'Next term' }, { id: 'second', label: 'Term after' }];
    const list = terms => terms.map(number).join(', ');
    const practiceTypes = ['next-term', 'next-two', 'kth-term', 'next-two-choice', 'spot-wrong', 'which-is-fib'];

    function extend(first, second, count) {
        const terms = [first, second].slice(0, count);
        while (terms.length < count) terms.push(terms[terms.length - 2] + terms[terms.length - 1]);
        return terms;
    }

    const learnScreens = [
        {
            title: 'Add the two terms before.',
            lines: ["Here's a different kind of rule. To get the next term, add the two terms before it. Then move along one and do it again."],
            maths: ['2, 5, 7, 12, 19, …', '2 + 5 = 7', '5 + 7 = 12', '7 + 12 = 19'],
            slider: 'New terms: 0 to 3', min: 0, max: 3
        },
        {
            title: 'Fibonacci-type sequences.',
            lines: ['A sequence with this rule is called a Fibonacci-type sequence. The famous one starts 1, 1. But any two numbers can start one. The rule stays the same: add the two terms before.'],
            maths: ['1, 1, 2, 3, 5, 8, 13'], slider: 'New terms: 0 to 5', min: 0, max: 5
        },
        {
            title: 'No nth term this time.',
            lines: ["The top row goes up by 3 every time, so it has an nth term: 3n − 1. The bottom row's gaps keep changing. So a Fibonacci-type sequence has no nth term like that. To find a term further along, keep adding until you get there."],
            rowLabels: ['Adds 3 each time', 'Fibonacci-type'],
            maths: ['2, 5, 8, 11, …', '+3, +3, +3', '2, 5, 7, 12, …', '+3, +2, +5'],
            slider: 'Show the gaps: 0 to 3', min: 0, max: 3
        },
        {
            title: 'Find a term at any position.',
            lines: ['To find the 8th term, keep going until you reach position 8. Count the positions, not the sums. The 8th term is 47.'],
            maths: ['1, 3, 4, 7, 11, …', '7 + 11 = 18', '11 + 18 = 29', '18 + 29 = 47'],
            slider: 'Fill in: 5th to 8th', min: 5, max: 8
        },
        {
            title: 'It works with any numbers.',
            lines: ['The first two terms can be negative or the same. 5, 5 gives 5, 5, 10, 15, 25, …'],
            callout: "Always add the last two terms. Don't add the same gap again, and don't add every term.",
            maths: ['−2, 3, 1, 4, 5, …', '−2 + 3 = 1', '3 + 1 = 4', '1 + 4 = 5'],
            slider: 'New terms: 0 to 3', min: 0, max: 3
        }
    ];

    function card(questionType, start, terms, asked, config) {
        return {
            questionType, start, terms, asked,
            fallback: 'Add the two terms just before the gap. Move along one each time.',
            ...config
        };
    }

    function examples() {
        return [
            card('try-next', [3, 4], [3, 4], [3], {
                input: 'number', prompt: 'This is a Fibonacci-type sequence. What is the 3rd term?', answer: '7', rules: [
                    mistake(12, 'That multiplies. Add the two terms: 3 + 4.'),
                    mistake(5, 'That adds 1. Add the two terms before: 3 + 4.'),
                    mistake(1, 'That takes away. Add them: 3 + 4.')
                ], feedback: '3 + 4 = 7'
            }),
            card('try-pair', [3, 4], [3, 4, 7], 'pair', {
                positions: [4], input: 'choice', prompt: 'Which two terms do you add to get the next term?', options: [
                    option('4 and 7', 'The two terms before the gap are 4 and 7.', true),
                    option('3 and 4', 'That gives 7 again. Move along one: use the last two terms.'),
                    option('3 and 7', 'Use the two terms just before the gap: 4 and 7.'),
                    option('3, 4 and 7', 'Add only the two terms before, not all of them.')
                ]
            }),
            card('try-next', [3, 4], [3, 4, 7], [4], {
                input: 'number', prompt: 'What is the 4th term?', answer: '11', rules: [
                    mistake(14, 'That adds all three terms. Add only the last two: 4 + 7.'),
                    mistake(10, "That's 3 + 7. Use the last two terms: 4 + 7."),
                    mistake(28, 'That multiplies. Add 4 + 7.')
                ], feedback: '4 + 7 = 11'
            }),
            card('try-next', [3, 4], [3, 4, 7, 11], [5], {
                input: 'number', prompt: 'What is the next term?', answer: '18', rules: [
                    mistake(15, 'That adds 4 to 11. Use the last two terms: 7 + 11.'),
                    mistake(25, 'That adds all four terms. Add only 7 + 11.'),
                    mistake(22, 'That doubles 11. Add 7 + 11.')
                ], feedback: '7 + 11 = 18'
            }),
            card('try-two', [2, 6], [2, 6], [3, 4], {
                input: 'number', fractions: true, fields, prompt: 'Find the next two terms.', answer: pair(8, 14), rules: [
                    mistake(pair(8, 10), 'For the term after, use 6 and 8, not 2 and 8.'),
                    mistake(pair(8, 16), 'That doubles 8. Add the two terms before: 6 + 8.'),
                    mistake(pair(8, 12), 'That adds 4 again. The gaps change: use 6 + 8.')
                ], feedback: '2 + 6 = 8, then 6 + 8 = 14'
            }),
            card('try-which', [2, 5], [2, 5, 7, 12], 'which', {
                showTerms: false, input: 'choice', prompt: 'Which of these is a Fibonacci-type sequence?', options: [
                    option('2, 5, 7, 12, …', '2 + 5 = 7 and 5 + 7 = 12.', true),
                    option('2, 5, 8, 11, …', 'That adds 3 each time. Its nth term is 3n − 1.'),
                    option('2, 4, 8, 16, …', 'That doubles each time.'),
                    option('1, 4, 9, 16, …', 'Those are 1², 2², 3², 4².')
                ]
            }),
            card('try-kth', [1, 3], [1, 3, 4, 7, 11], [8], {
                input: 'number', prompt: 'What is the 8th term?', answer: '47', rules: [
                    mistake(29, "That's the 7th term. One more."),
                    mistake(76, "That's the 9th term, one too many."),
                    mistake(18, "That's the 6th term. Keep going to position 8.")
                ], feedback: '18, 29, 47. The 8th term is 47.'
            }),
            card('try-next', [5, 5], [5, 5, 10, 15, 25], [6], {
                input: 'choice', prompt: 'What is the next term?', options: [
                    option('40', '15 + 25 = 40', true),
                    option('35', 'That adds 10, like 15 to 25. The gaps change: add 15 + 25.'),
                    option('30', 'That adds 5. Add the two terms before: 15 + 25.'),
                    option('50', 'That doubles 25. Add 15 + 25.')
                ]
            }),
            card('try-next', [-2, 3], [-2, 3, 1, 4], [5], {
                input: 'choice', prompt: 'What is the next term?', options: [
                    option('5', '1 + 4 = 5', true),
                    option('7', "That's 3 + 4. Use the last two terms: 1 and 4."),
                    option('6', 'That adds all four terms. Add only 1 + 4.'),
                    option('3', 'That takes away. Add them: 1 + 4.')
                ]
            })
        ];
    }

    function checks() {
        return [
            card('check-sam', [2, 5], [2, 5, 7, 12], [5], {
                input: 'choice', prompt: 'Sam says the next term is 17, because you add 5 again. Is Sam right?', options: [
                    option('No. Add the last two terms: 7 + 12 = 19.', 'Right. In a Fibonacci-type sequence, the gaps change.', true),
                    option('Yes. 12 + 5 = 17.', 'The gaps are 3, 2 and 5, not the same. Add the last two terms.'),
                    option("No. It's 2 + 5 + 7 + 12 = 26.", 'Add only the last two terms.'),
                    option("No. It's 12 + 12 = 24.", "Don't double. Add 7 + 12.")
                ]
            }),
            card('check-mia', [3, 5], [3, 5, 8, 13, 20], [5], {
                input: 'number', prompt: 'Mia says this is a Fibonacci-type sequence, but its last term is wrong. What should the last term be?', answer: '21', rules: [
                    mistake(20, 'Check it: 8 + 13 = 21, not 20.'),
                    mistake(33, 'That adds 13 and 20. Use the two terms before the last one: 8 + 13.'),
                    mistake(18, 'That adds the gap of 5 again. Add 8 + 13.')
                ], feedback: '8 + 13 = 21'
            }),
            card('check-working', [4, 7], [4, 7, 11], [4], {
                input: 'choice', prompt: 'Which working gives the 4th term?', options: [
                    option('7 + 11 = 18. Add the 2nd and 3rd terms.', 'Right. Use the two terms just before.', true),
                    option('4 + 7 = 11. Add the first two again.', "That's how you got the 3rd term. Move along one."),
                    option('11 + 4 = 15. It goes up by 4.', 'The gaps are 3 and 4, not the same. Add 7 + 11.'),
                    option('4 + 7 + 11 = 22. Add all the terms.', 'Add only the two terms before.')
                ]
            }),
            card('check-kth', [2, 3], [2, 3], [7], {
                input: 'number', prompt: 'The first two terms of a Fibonacci-type sequence are 2 and 3. What is the 7th term?', answer: '34', rules: [
                    mistake(21, "That's the 6th term. One more."),
                    mistake(55, "That's the 8th term, one too many."),
                    mistake(13, "That's the 5th term. Keep going to position 7.")
                ], feedback: '2, 3, 5, 8, 13, 21, 34'
            }),
            card('check-next', [-1, 4], [-1, 4, 3, 7], [5], {
                input: 'number', prompt: 'What is the next term?', answer: '10', rules: [
                    mistake(11, "That's 4 + 7. Use the last two terms: 3 + 7."),
                    mistake(13, 'That adds all four terms. Add only 3 + 7.'),
                    mistake(4, 'That takes away. Add 3 + 7.')
                ], feedback: '3 + 7 = 10'
            })
        ];
    }

    function pick(random) {
        const { randomInt, shuffle } = window.Maths1to9LessonEngine;
        return shuffle(practiceTypes.map(type => ({ type, seed: randomInt(0, 4294967295, random) })), random);
    }

    function prepare(question, random) {
        return question.options ? { ...question, options: window.Maths1to9LessonEngine.shuffle(question.options, random) } : { ...question };
    }

    function cleanRules(question) {
        const key = value => typeof value === 'object' ? JSON.stringify(value) : String(Number(value));
        const used = new Set([key(question.answer)]);
        question.rules = question.rules.filter(rule => {
            const value = key(rule.value);
            if (used.has(value)) return false;
            used.add(value);
            return true;
        });
        return question;
    }

    function generate(item, random) {
        const { randomInt } = window.Maths1to9LessonEngine;
        const int = (min, max) => randomInt(min, max, random);
        let question;
        if (item.type === 'next-term') {
            const negative = int(1, 6) === 1;
            let a, b, terms, answer, rules;
            do {
                a = negative ? int(-5, -1) : int(1, 12);
                b = int(1, 12);
                terms = extend(a, b, 5);
                const [t1, t2, t3, t4, t5] = terms;
                answer = t4 + t5;
                rules = cleanRules({ answer, rules: [
                    mistake(t5 + t5 - t4, 'That adds the last gap again. The gaps change: add the last two terms.'),
                    mistake(t1 + t2 + t3 + t4 + t5, 'Add only the last two terms.'),
                    mistake(t3 + t5, 'That skips a term. Use the last two.'),
                    mistake(2 * t5, 'That doubles. Add the last two terms.')
                ] }).rules;
            } while (rules.length < 2);
            question = card(item.type, [a, b], terms, [6], {
                input: 'number', prompt: 'What is the next term?', answer: String(answer), rules,
                feedback: `${number(terms[3])} + ${number(terms[4])} = ${number(answer)}`
            });
        } else if (item.type === 'next-two') {
            const a = int(1, 12), b = int(1, 12), one = a + b, two = a + 2 * b;
            question = card(item.type, [a, b], [a, b], [3, 4], {
                input: 'number', fractions: true, fields, prompt: 'Find the next two terms.', answer: pair(one, two), rules: [
                    mistake(pair(one, 2 * a + b), `For the term after, use ${b} and ${one}.`),
                    mistake(pair(one, 2 * one), 'That doubles. Add the two terms before.'),
                    mistake(pair(one, one + b - a), 'That adds the same gap again. The gaps change.')
                ], feedback: `${a} + ${b} = ${one}, then ${b} + ${one} = ${two}`
            });
        } else if (item.type === 'kth-term') {
            const a = int(1, 6), b = int(1, 6), k = int(6, 8), terms = extend(a, b, k + 1);
            question = card(item.type, [a, b], [a, b], [k], {
                input: 'number', prompt: `The first two terms are ${a} and ${b}. What is the ${ordinal(k)} term?`, answer: String(terms[k - 1]), rules: [
                    mistake(terms[k - 2], `That's the ${ordinal(k - 1)} term. One more.`),
                    mistake(terms[k], "That's one too many. Count the positions.")
                ], feedback: `${list(terms.slice(0, k))}. The ${ordinal(k)} term is ${terms[k - 1]}.`
            });
        } else if (item.type === 'next-two-choice') {
            let a, b, terms, pairs;
            do {
                a = int(1, 12); b = int(1, 12);
                terms = extend(a, b, 4);
                const t3 = terms[2], t4 = terms[3], g = t4 - t3, one = t3 + t4;
                pairs = [[one, t4 + one], [2 * t4, 4 * t4], [t4 + g, t4 + 2 * g], [one, t3 + one]];
            } while (new Set(pairs.map(list)).size !== 4);
            question = card(item.type, [a, b], terms, [5, 6], {
                bankId: 'sequences-08', input: 'choice',
                prompt: `Each new term is the sum of the two before it. The sequence starts ${list(terms)}. Which two numbers come next?`,
                options: [
                    option(list(pairs[0]), `${terms[2]} + ${terms[3]} = ${pairs[0][0]}, then ${terms[3]} + ${pairs[0][0]} = ${pairs[0][1]}`, true),
                    option(list(pairs[1]), 'That doubles the last term each time.'),
                    option(list(pairs[2]), 'That adds the same amount each time. The rule uses the two terms before.'),
                    option(list(pairs[3]), `After the first one, use the last two terms, not ${terms[2]} again.`)
                ]
            });
        } else if (item.type === 'spot-wrong') {
            const a = int(1, 9), b = int(1, 9), wrongPosition = int(3, 5), change = int(1, 3);
            const terms = extend(a, b, wrongPosition);
            terms[wrongPosition - 1] += change;
            // Later terms use the displayed pair, leaving exactly one failed sum.
            while (terms.length < 5) terms.push(terms[terms.length - 2] + terms[terms.length - 1]);
            const index = wrongPosition - 1;
            const fail = `${terms[index - 2]} + ${terms[index - 1]} = ${terms[index - 2] + terms[index - 1]}, not ${terms[index]}.`;
            question = card(item.type, [a, b], terms, 'wrong-term', {
                wrongPosition, input: 'choice', prompt: 'Mia says this is a Fibonacci-type sequence. Which term is wrong?', options: [
                    ...[3, 4, 5].map(position => {
                        const i = position - 1;
                        return option(`The ${ordinal(position)} term`, position === wrongPosition ? fail
                            : `The ${ordinal(position)} term is right: ${terms[i - 2]} + ${terms[i - 1]} = ${terms[i]}.`, position === wrongPosition);
                    }),
                    option('None of them', `One sum fails: ${fail} So the ${ordinal(wrongPosition)} term is wrong.`)
                ]
            });
        } else if (item.type === 'which-is-fib') {
            let a, b, sequences;
            do {
                a = int(2, 8); b = int(a + 1, 9);
                const gap = b - a;
                sequences = [extend(a, b, 4), [a, b, b + gap, b + 2 * gap], [a, b, 2 * b, 4 * b], [a, b, b + a, b + 2 * a]];
            } while (new Set(sequences.map(list)).size !== 4);
            const terms = sequences[0];
            question = card(item.type, [a, b], terms, 'which', {
                sequences, showTerms: false, input: 'choice', prompt: 'Which of these is a Fibonacci-type sequence?', options: [
                    option(`${list(terms)}, …`, `${a} + ${b} = ${terms[2]} and ${b} + ${terms[2]} = ${terms[3]}`, true),
                    option(`${list(sequences[1])}, …`, 'That adds the same amount each time, so it has an nth term.'),
                    option(`${list(sequences[2])}, …`, `After ${b}, that doubles each time.`),
                    option(`${list(sequences[3])}, …`, `That keeps adding ${a}. Each term must be the two terms before added together.`)
                ]
            });
        } else {
            throw new TypeError(`Unknown Fibonacci question type: ${item.type}`);
        }
        return prepare(question.input === 'number' ? cleanRules(question) : question, random);
    }

    window.Fibonacci = { learnScreens, examples, practiceTypes, pick, generate, checks, extend, prepare, number, ordinal };
})();
