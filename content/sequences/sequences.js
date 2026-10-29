(() => {
    'use strict';

    const number = value => String(value).replace(/-/g, '−');
    const option = (label, feedback, correct = false) => ({ label: String(label), feedback, correct });
    const mistake = (value, feedback) => ({ value, feedback });
    const pair = (first, second) => ({ first: String(first), second: String(second) });
    const fields = [{ id: 'first', label: 'Next term' }, { id: 'second', label: 'Term after' }];
    const fallback = 'Check the rule on every pair. Use it on the last term.';
    const practiceTypes = ['rule-choice', 'next-multiply', 'every-pair', 'below-zero', 'two-step', 'next-two', 'pattern-k'];

    const learnScreens = [
        {
            title: 'Numbers that follow a pattern.',
            lines: ['A cinema row has 3 seats. Each new row has 4 more seats than the row before.'],
            after: 'A list of numbers in order is called a sequence. Each number in it is a term. The dots (…) mean it keeps going.',
            maths: ['3, 7, 11, 15, …'], slider: 'Rows: 1 to 4', min: 1, max: 4
        },
        {
            title: 'Find the rule.',
            lines: ["Look at how you get from each term to the next. It's add 4 every time. This is the term-to-term rule: it tells you how to get the next term from the one before. To find the next term, use the rule on the last term."],
            maths: ['3, 7, 11, 15, …', '15 + 4 = 19'], slider: 'Show jumps: 0 to 4', min: 0, max: 4
        },
        {
            title: 'A sequence can go down.',
            lines: ['Each term is 4 less than the one before. The rule is subtract 4. Keep going past zero: −2 − 4 = −6.'],
            maths: ['10, 6, 2, −2, …', '−2 − 4 = −6'], slider: 'Jumps: 0 to 4', min: 0, max: 4
        },
        {
            title: 'Sometimes you multiply.',
            lines: ['Each term is 3 times the one before. The rule is multiply by 3.'],
            callout: "The gaps aren't the same, so it isn't an add rule.",
            maths: ['2, 6, 18, 54, …', '+4', '+12', '54 × 3 = 162'], slider: 'Show ×3: 0 to 4', min: 0, max: 4
        },
        {
            title: 'Sometimes you divide. Check every pair.', lines: [],
            callout: 'Always check your rule on every pair. For 2, 6, 18, 54, add 4 works for 2 to 6, but not for 6 to 18.',
            maths: ['80, 40, 20, 10, …', '10 ÷ 2 = 5', '6 + 4 = 10', '18'], slider: 'Show ÷2: 0 to 4', min: 0, max: 4
        },
        {
            title: 'Rules with two steps.',
            lines: ['Some rules come in words, like: multiply by 2, then add 1. Do the steps in order, every time.'],
            callout: 'Order matters. Adding 1 first would give (3 + 1) × 2 = 8, which is wrong.',
            maths: ['3 → 7 → 15 → 31', '3 × 2 = 6', '6 + 1 = 7', '7 × 2 = 14', '14 + 1 = 15', '15 × 2 = 30', '30 + 1 = 31'],
            slider: 'Terms: 1 to 4', min: 1, max: 4
        }
    ];

    function card(questionType, terms, rule, asked, config) {
        return { questionType, terms, rule, asked, fallback, ...config };
    }

    function examples() {
        const add = { op: 'add', value: 6 };
        const subtract = { op: 'subtract', value: 5 };
        const multiply = { op: 'multiply', value: 4 };
        return [
            card('added', [5, 11, 17, 23], add, { kind: 'rule' }, {
                input: 'number', prompt: 'How much is added each time?', answer: '6',
                rules: [
                    mistake('5', 'You counted the numbers between 5 and 11. Count the jump instead: 11 − 5 = 6.'),
                    mistake('16', 'That adds 5 and 11. Take away instead: 11 − 5.')
                ], feedback: '11 − 5 = 6, 17 − 11 = 6 and 23 − 17 = 6. The rule is add 6.'
            }),
            card('next-add', [5, 11, 17, 23], add, { kind: 'term', positions: [5] }, {
                input: 'number', prompt: 'What is the next term?', answer: '29',
                rules: [
                    mistake('28', 'The rule is add 6, not add 5.'),
                    mistake('46', 'That doubles 23. The rule is add 6.'),
                    mistake('6', '6 is the rule. Use it on the last term: 23 + 6.')
                ], feedback: '23 + 6 = 29.'
            }),
            card('subtract-rule', [13, 8, 3, -2], subtract, { kind: 'rule' }, {
                input: 'choice', prompt: 'What is the term-to-term rule?', options: [
                    option('Subtract 5', 'Each term is 5 less than the one before.', true),
                    option('Add 5', 'The terms are getting smaller, so you take away.'),
                    option('Subtract 10', '10 is the change over two steps, 13 to 3. Look at one step.'),
                    option('Subtract 4', 'Count the jump, not the numbers in between: 13 − 8 = 5.')
                ]
            }),
            card('next-subtract', [13, 8, 3, -2], subtract, { kind: 'term', positions: [5] }, {
                input: 'number', prompt: 'What is the next term?', answer: '-7',
                rules: [
                    mistake('7', 'Subtracting from −2 takes you further below zero. The answer is negative.'),
                    mistake('3', 'Adding 5 takes you back to 3, the term before. Go down 5 from −2.'),
                    mistake('-3', 'Go down 5 from −2, not 1.')
                ], feedback: '−2 − 5 = −7.'
            }),
            card('multiply-rule', [3, 12, 48, 192], multiply, { kind: 'rule' }, {
                input: 'choice', prompt: 'Which rule works for every pair?', options: [
                    option('Multiply by 4', '3 × 4 = 12, 12 × 4 = 48 and 48 × 4 = 192.', true),
                    option('Add 9', 'Add 9 works for 3 to 12, but 12 + 9 is 21, not 48.'),
                    option('Add 36', "Add 36 works for 12 to 48 only. 3 + 36 isn't 12."),
                    option('Multiply by 3', '3 × 3 = 9, not 12. Check the first pair.')
                ]
            }),
            card('next-times', [3, 12, 48, 192], multiply, { kind: 'term', positions: [5] }, {
                input: 'number', prompt: 'What is the next term?', answer: '768',
                rules: [
                    mistake('201', 'That adds 9. The rule is multiply by 4.'),
                    mistake('576', 'That multiplies by 3. The rule is multiply by 4.'),
                    mistake('196', 'That adds 4. Multiply by 4 instead.')
                ], feedback: '192 × 4 = 768.'
            }),
            card('rule-choice', [42, 35, 28, 21], { op: 'subtract', value: 7 }, { kind: 'rule' }, {
                bankId: 'sequences-02', input: 'choice', prompt: 'Which rule gives the next term?', options: [
                    option('Subtract 7', 'Each term is 7 less than the one before.', true),
                    option('Add 7', 'The terms are getting smaller, not larger.'),
                    option('Divide by 7', '35 ÷ 7 is 5, not 28.'),
                    option('Subtract 14', '14 is the change over two steps, not one.')
                ]
            }),
            card('divide-next', [64, 32, 16, 8], { op: 'divide', value: 2 }, { kind: 'term', positions: [5] }, {
                input: 'number', prompt: 'What is the next term?', answer: '4',
                rules: [
                    mistake('0', "That subtracts 8. Check: 64 − 8 isn't 32. The rule is divide by 2."),
                    mistake('16', 'That multiplies by 2. The terms are getting smaller, so divide.'),
                    mistake('2', 'That divides by 4. Each term is half the one before.')
                ], feedback: '8 ÷ 2 = 4.'
            }),
            card('two-step-next', [6], { op: 'two-step', steps: [{ op: 'multiply', value: 2 }, { op: 'subtract', value: 1 }] }, { kind: 'term', positions: [2] }, {
                input: 'choice', prompt: 'The rule is: multiply by 2, then subtract 1. A term is 6. What is the next term?', options: [
                    option('11', '6 × 2 = 12, then 12 − 1 = 11.', true),
                    option('10', 'You subtracted first. Multiply first: 6 × 2 = 12, then 12 − 1.'),
                    option('12', "That's after the first step only. Now subtract 1."),
                    option('5', 'You only subtracted 1. Multiply by 2 first.')
                ]
            })
        ];
    }

    function checks() {
        return [
            card('check-next-two', [17, 12, 7, 2], { op: 'subtract', value: 5 }, { kind: 'term', positions: [5, 6] }, {
                input: 'number', fractions: true, fields, prompt: 'Write the next two terms.', answer: pair(-3, -8),
                rules: [
                    mistake(pair(3, 8), 'Below zero, the terms are negative: 2 − 5 = −3.'),
                    mistake(pair(-3, -7), 'Take away 5 again: −3 − 5 = −8.')
                ], feedback: '2 − 5 = −3, then −3 − 5 = −8.'
            }),
            card('sam', [4, 12, 36, 108], { op: 'multiply', value: 3 }, { kind: 'rule' }, {
                input: 'choice', prompt: 'Sam says the rule is add 8, because 4 + 8 = 12. Is Sam right?', options: [
                    option('No. 12 + 8 = 20, not 36. The rule is multiply by 3.', 'No. 12 + 8 = 20, not 36. The rule is multiply by 3.', true),
                    option('Yes. 4 + 8 = 12.', 'It works for the first pair only. Check 12 to 36.'),
                    option('No. The rule is add 24.', 'Add 24 works for 12 to 36 only. Check 4 to 12.'),
                    option('No. The rule is multiply by 4.', '4 × 4 = 16, not 12.')
                ]
            }),
            card('check-multiply', [4, 12, 36, 108], { op: 'multiply', value: 3 }, { kind: 'term', positions: [5] }, {
                input: 'number', prompt: 'What is the next term?', answer: '324',
                rules: [
                    mistake('116', "That's Sam's add 8. Multiply by 3."),
                    mistake('180', 'That adds the last gap, 72. The gaps aren\'t the same, so multiply.'),
                    mistake('432', 'That multiplies by 4. The rule is multiply by 3.')
                ], feedback: '108 × 3 = 324.'
            }),
            card('aisha', [64, 32, 16, 8, 4, 2, 1], { op: 'divide', value: 2 }, { kind: 'term', positions: [8, 9] }, {
                input: 'choice', prompt: "A sequence starts at 64. Its rule is divide by 2. Aisha says it must stop at 1, because you can't halve 1. Is Aisha right?", options: [
                    option('No. The next two terms are 0.5 and 0.25.', 'No. The next two terms are 0.5 and 0.25.', true),
                    option("Yes. You can't halve 1.", 'Half of 1 is 0.5. Terms can be decimals.'),
                    option('No. The next two terms are 0 and −1.', 'That subtracts 1. The rule is divide by 2.'),
                    option('No. The next two terms are 2 and 4.', 'That goes backwards by doubling. Keep dividing by 2.')
                ], showTerms: false
            }),
            card('third-term', [4], { op: 'two-step', steps: [{ op: 'multiply', value: 3 }, { op: 'subtract', value: 2 }] }, { kind: 'term', positions: [3] }, {
                input: 'number', prompt: 'The rule is: multiply by 3, then subtract 2. The first term is 4. What is the third term?', answer: '28',
                rules: [
                    mistake('10', "That's the second term. Use the rule once more."),
                    mistake('12', 'You subtracted first. Multiply by 3, then take away 2.'),
                    mistake('82', "That's the fourth term, one step too many.")
                ], feedback: '4 × 3 − 2 = 10, then 10 × 3 − 2 = 28.'
            })
        ];
    }

    function pick(random) {
        const { randomInt, shuffle } = window.Maths1to9LessonEngine;
        const types = ['rule-choice', 'next-multiply', 'every-pair', 'below-zero', 'two-step', random() < 0.5 ? 'next-two' : 'pattern-k'];
        return shuffle(types.map(type => ({ type, seed: randomInt(0, 4294967295, random) })), random);
    }

    function cleanRules(question) {
        const key = value => typeof value === 'object'
            ? JSON.stringify(Object.fromEntries(Object.entries(value).map(([id, n]) => [id, Number(n)])))
            : String(Number(value));
        const used = new Set([key(question.answer)]);
        question.rules = (question.rules || []).filter(rule => {
            const id = key(rule.value);
            if (used.has(id)) return false;
            used.add(id);
            return true;
        });
        return question;
    }

    function generate(item, random) {
        const { randomInt, shuffle } = window.Maths1to9LessonEngine;
        const int = (min, max) => randomInt(min, max, random);
        const next = { kind: 'term', positions: [5] };
        let question;
        if (item.type === 'rule-choice') {
            const d = int(3, 12), down = random() < 0.5;
            const first = down ? int(3 * d + 1, 100) : int(1, 100 - 3 * d);
            const terms = Array.from({ length: 4 }, (_, i) => first + (down ? -1 : 1) * i * d);
            const direction = down ? 'Subtract' : 'Add';
            const op = down ? 'subtract' : 'add';
            const symbol = down ? '÷' : '×';
            question = card(item.type, terms, { op, value: d }, { kind: 'rule' }, {
                bankId: 'sequences-02', input: 'choice', prompt: 'Which rule gives the next term?', options: [
                    option(`${direction} ${d}`, `Each term is ${d} ${down ? 'less' : 'more'} than the one before.`, true),
                    option(`${down ? 'Add' : 'Subtract'} ${d}`, `The terms are getting ${down ? 'smaller, not larger.' : 'larger, not smaller.'}`),
                    option(`${direction} ${2 * d}`, "That's the change over two steps, not one."),
                    option(`${down ? 'Divide' : 'Multiply'} by ${d}`, `Check: ${first} ${symbol} ${d} isn't ${terms[1]}.`)
                ]
            });
        } else if (item.type === 'next-multiply') {
            const r = int(2, 4), divide = random() < 0.5;
            let a, terms, last, answer, wrong, values;
            do {
                a = int(1, 8);
                terms = divide ? [a * r ** 4, a * r ** 3, a * r ** 2, a * r] : [a, a * r, a * r ** 2, a * r ** 3];
                last = terms[3];
                answer = divide ? a : a * r ** 4;
                wrong = divide ? [
                    option(number(last - r), `That subtracts ${r}. Check the first pair: it divides by ${r}.`),
                    option(number(a * r ** 2), 'That multiplies. The terms are getting smaller, so divide.'),
                    option(number(last / (r === 2 ? 4 : 2)), 'That divides by the wrong number. Check the first pair.')
                ] : [
                    option(number(last + last - terms[2]), "That adds the last gap again. The gaps aren't the same, so multiply."),
                    option(number(last + r), `That adds ${r} instead of multiplying by ${r}.`),
                    option(number(last * (r + 1)), 'That multiplies by the wrong number. Check the first pair.')
                ];
                values = [answer, ...wrong.map(option => Number(option.label))];
            } while (values.some(value => !Number.isInteger(value)) || new Set(values).size !== 4);
            const context = !divide && random() < 0.5 ? (r === 3 ? 'A culture triples in size every hour.' : r === 2 ? 'A prize doubles each round.' : 'A prize is multiplied by 4 each round.') : '';
            const feedback = `${last} ${divide ? '÷' : '×'} ${r} = ${answer}.`;
            question = card(item.type, terms, { op: divide ? 'divide' : 'multiply', value: r }, next, {
                bankId: 'sequences-04', input: 'choice', context, prompt: 'What is the next term?',
                options: [option(number(answer), feedback, true), ...wrong]
            });
        } else if (item.type === 'every-pair') {
            const a = int(2, 6), r = int(2, 4), terms = [a, a * r, a * r ** 2, a * r ** 3];
            const gap1 = terms[1] - a, gap2 = terms[2] - terms[1];
            const wrongMultiplier = r + 1;
            question = card(item.type, terms, { op: 'multiply', value: r }, { kind: 'rule' }, {
                input: 'choice', prompt: 'Which rule works for every pair?', options: [
                    option(`Multiply by ${r}`, `${a} × ${r} = ${terms[1]}, ${terms[1]} × ${r} = ${terms[2]} and ${terms[2]} × ${r} = ${terms[3]}.`, true),
                    option(`Add ${gap1}`, `Add ${gap1} works for ${a} to ${terms[1]}, but ${terms[1]} + ${gap1} is ${terms[1] + gap1}, not ${terms[2]}.`),
                    option(`Add ${gap2}`, `Add ${gap2} works for ${terms[1]} to ${terms[2]} only. ${a} + ${gap2} isn't ${terms[1]}.`),
                    option(`Multiply by ${wrongMultiplier}`, `${a} × ${wrongMultiplier} = ${a * wrongMultiplier}, not ${terms[1]}. Check the first pair.`)
                ]
            });
        } else if (item.type === 'below-zero') {
            const d = int(3, 12), t = int(1, d - 1);
            question = card(item.type, [t + 3 * d, t + 2 * d, t + d, t], { op: 'subtract', value: d }, next, {
                bankId: 'sequences-03', input: 'number', prompt: 'What is the next term?', answer: String(t - d),
                rules: [
                    mistake(String(d - t), `Going down from ${t} passes zero. The answer is negative.`),
                    mistake(String(t + d), `That adds ${d}. The terms are going down.`)
                ], feedback: `${t} − ${d} = ${number(t - d)}.`
            });
        } else if (item.type === 'two-step') {
            const a = int(2, 8), m = int(2, 4), subtract = random() < 0.5;
            // Keep every forward result positive, including the third go.
            const s = subtract ? int(Math.floor(a / (m - 1)) + 1, Math.max(10, Math.floor(a / (m - 1)) + 1)) : int(1, 10);
            const steps = subtract ? [{ op: 'multiply', value: m }, { op: 'subtract', value: a }] : [{ op: 'add', value: a }, { op: 'multiply', value: m }];
            const rule = { op: 'two-step', steps };
            const first = apply(s, rule), answer = apply(first, rule), third = apply(answer, rule);
            const reversed = apply(apply(s, { op: 'two-step', steps: [...steps].reverse() }), { op: 'two-step', steps: [...steps].reverse() });
            const instruction = subtract ? `multiplies by ${m}, then subtracts ${a}` : `adds ${a}, then multiplies by ${m}`;
            question = card(item.type, [s], rule, { kind: 'term', positions: [3], goes: 2 }, {
                bankId: 'sequences-05', input: 'number', showTerms: false,
                prompt: `A number machine ${instruction}. Its answer goes back in each time. Start with ${s}. What is the answer after two goes?`,
                answer: String(answer), rules: [
                    mistake(String(reversed), subtract ? 'That subtracts first. Keep the steps in the order given.' : 'That multiplies first. Keep the steps in the order given.'),
                    mistake(String(first), "That's after one go. Put it back in."),
                    mistake(String(third), "That's three goes, one too many.")
                ], feedback: `After one go: ${first}. After two goes: ${answer}.`
            });
        } else if (item.type === 'next-two') {
            const kind = int(0, 2);
            let d, first;
            if (kind === 0) { d = int(2, 9); first = int(1, 20); }
            else if (kind === 1) {
                d = -int(2, 9);
                const crosses = random() < 0.5;
                const last = crosses ? int(1, -d - 1) : int(-2 * d + 1, -2 * d + 15);
                first = last - 3 * d;
            } else { d = random() < 0.5 ? 0.5 : 1.5; first = int(1, 10) / 2; }
            const terms = Array.from({ length: 4 }, (_, i) => first + i * d);
            const one = first + 4 * d, two = one + d, last = terms[3];
            const ruleText = `${d < 0 ? 'subtract' : 'add'} ${Math.abs(d)}`;
            const rules = [
                mistake(pair(one, one + (d < 0 ? d + 1 : d - 1)), 'Use the same rule again on the term you just found.'),
                mistake(pair(2 * last, 4 * last), `The rule is ${ruleText}, not double.`)
            ];
            if (one < 0 || two < 0) rules.push(mistake(pair(Math.abs(one), Math.abs(two)), 'Below zero the terms are negative.'));
            question = card(item.type, terms, { op: d < 0 ? 'subtract' : 'add', value: Math.abs(d) }, { kind: 'term', positions: [5, 6] }, {
                input: 'number', fractions: true, fields, prompt: 'Write the next two terms.', answer: pair(one, two), rules,
                feedback: `The next two terms are ${number(one)} and ${number(two)}.`
            });
        } else if (item.type === 'pattern-k') {
            const b = int(3, 8), d = int(2, 5), k = int(5, 8), answer = b + (k - 1) * d;
            question = card(item.type, [b, b + d, b + 2 * d], { op: 'add', value: d }, { kind: 'term', positions: [k] }, {
                input: 'number', table: true, showTerms: false,
                prompt: `How many sticks will Pattern ${k} use?`, answer: String(answer),
                rules: [
                    mistake(String(b + (k - 2) * d), `That's Pattern ${k - 1}. Count on one more.`),
                    mistake(String(k * d), `Multiplying the pattern number by the jump misses the start. Keep adding ${d} from the table.`),
                    mistake(String(b + k * d), `That's one jump too many. Pattern 1 already has ${b} sticks.`)
                ], feedback: `Keep adding ${d}. Pattern ${k} uses ${answer} sticks.`
            });
        } else {
            throw new TypeError(`Unknown sequence question type: ${item.type}`);
        }
        return prepare(question.input === 'number' ? cleanRules(question) : question, random);
    }

    function apply(value, rule) {
        if (rule.op === 'add') return value + rule.value;
        if (rule.op === 'subtract') return value - rule.value;
        if (rule.op === 'multiply') return value * rule.value;
        if (rule.op === 'divide') return value / rule.value;
        return rule.steps.reduce((current, step) => apply(current, step), value);
    }

    function prepare(question, random) {
        return question.options ? { ...question, options: window.Maths1to9LessonEngine.shuffle(question.options, random) } : { ...question };
    }

    window.Sequences = { learnScreens, examples, practiceTypes, pick, generate, checks, prepare, number, apply };
})();
