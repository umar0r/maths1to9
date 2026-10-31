(() => {
    'use strict';

    const NB = ' ';
    const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
    const simplify = (a, b) => { const h = gcd(a, b); return [a / h, b / h]; };
    // A ratio or fraction never breaks across two lines.
    const ratio = (...parts) => parts.join(`${NB}:${NB}`);
    const keepTogether = text => (typeof text === 'string' ? text.replace(/ : /g, `${NB}:${NB}`) : text);
    const fraction = (top, bottom) => `${top}/${bottom}`;
    const option = (label, feedback, correct = false) => ({ label: String(label), feedback, correct });
    const pair = (first, second) => ({ first: String(first), second: String(second) });
    const mistake = (value, feedback) => ({ value, feedback });
    const capital = text => text[0].toUpperCase() + text.slice(1);
    const fieldsOf = (first, second) => [{ id: 'first', label: first }, { id: 'second', label: second }];
    const practiceTypes = ['simplify-typed', 'part-and-rest', 'fraction-typed', 'simplify-choice', 'fraction-choice', 'same-ratio'];
    const BLOCK_SIZES = [10, 20, 40];

    const learnScreens = ([
        {
            title: 'A ratio counts parts',
            lines: ['A ratio compares amounts. blue : red = 5 : 3 means 5 parts of blue for every 3 parts of red. Blue comes first, so its number comes first.'],
            maths: ['blue : red = 5 : 3', '8 parts altogether'],
            callout: 'Order matters. 5 : 3 is not the same as 3 : 5.',
            slider: 'Red parts', min: 1, max: 6, start: 3
        },
        {
            title: 'Divide both to simplify',
            lines: [
                'A mix uses 200 ml of blue paint and 120 ml of red paint.',
                'Split both amounts into blocks of the same size. Count the blocks. Bigger blocks give smaller numbers, but the mix is the same.',
                "A ratio is in its **simplest form** when you can't divide both numbers by the same whole number any more."
            ],
            maths: ['200 ÷ 40 = 5', '120 ÷ 40 = 3', '200 : 120 = 5 : 3'],
            callout: '200 : 120, 20 : 12, 10 : 6 and 5 : 3 are all the same ratio. So is 15 : 9. If you multiply or divide both numbers by the same number, the ratio stays the same.',
            slider: 'Block size', min: 0, max: 2, start: 0
        },
        {
            title: 'Use the HCF',
            lines: ['The **highest common factor (HCF)** is the biggest number that divides into both numbers. Divide both by the HCF and you get the simplest form in one step. Dividing by a smaller number is fine too. Just keep going until you can\'t divide again.'],
            maths: ['45 ÷ 5 = 9', '60 ÷ 5 = 12', '9 ÷ 3 = 3', '12 ÷ 3 = 4', '45 ÷ 15 = 3', '60 ÷ 15 = 4'],
            callout: "Don't stop at 9 : 12. Always check: can both numbers still be divided?",
            slider: 'Show the steps', min: 1, max: 3, start: 1
        },
        {
            title: 'Find both amounts first',
            lines: [
                'A squad has 36 players. 15 of them are under 16.',
                "Sometimes you're given the total and one part. Take away to find the other part first. Then simplify."
            ],
            maths: ['36 − 15 = 21', '15 ÷ 3 = 5', '21 ÷ 3 = 7', '15 : 21 = 5 : 7'],
            callout: "Don't use the total. 15 : 36 compares the under 16s with the whole squad, not with the other players.",
            slider: 'Show the steps', min: 1, max: 3, start: 1
        },
        {
            title: 'One part as a fraction',
            lines: ['To write one part as a fraction, add the parts to find the total. Put that part over the total.'],
            maths: ['5 + 3 = 8', 'Red is 3 of the 8 parts, so 3/8 of the paint is red'],
            callout: 'Not 3/5. That compares red with blue. The bottom number is all the parts.',
            secondCallout: 'It works with amounts too. 12 boys and 18 girls make 30 pupils, so 12/30 = 2/5 of the class are boys.',
            slider: 'Red parts', min: 1, max: 5, start: 3
        }
    ]).map(screen => ({
        ...screen,
        lines: screen.lines.map(keepTogether),
        callout: keepTogether(screen.callout),
        secondCallout: keepTogether(screen.secondCallout)
    }));

    // What the slider's output says for each screen.
    function sliderText(screen, value) {
        if (screen === 1) return `Block size: ${BLOCK_SIZES[value]} ml`;
        if (screen === 2 || screen === 3) return `Step ${value} of 3`;
        return `${learnScreens[screen].slider}: ${value}`;
    }

    function card(questionType, numbers, asked, config) {
        const tidy = { ...config };
        for (const key of ['prompt', 'feedback', 'fallback']) tidy[key] = keepTogether(config[key]);
        if (config.options) tidy.options = config.options.map(o => ({ ...o, label: keepTogether(o.label), feedback: keepTogether(o.feedback) }));
        if (config.rules) tidy.rules = config.rules.map(r => ({ ...r, feedback: keepTogether(r.feedback) }));
        for (const key of ['feedback', 'fallback']) if (tidy[key] === undefined) delete tidy[key];
        return { questionType, ratio: numbers, asked, ...tidy };
    }

    function ratioCard(questionType, numbers, asked, labels, config) {
        return card(questionType, numbers, asked, {
            input: 'number', fractions: true, fields: fieldsOf(...labels), ...config
        });
    }

    function fractionCard(questionType, numbers, config) {
        return card(questionType, numbers, 'fraction', {
            input: 'number', fractions: true, inputLabel: 'Fraction, like 1/4', ...config
        });
    }

    function examples() {
        return [
            card('try-1', [4, 1], 'notation', {
                bankId: 'ratio-basics-13', input: 'choice',
                prompt: "Mia has 4 times as many stickers as Tom. What is the ratio Mia's stickers : Tom's stickers?", options: [
                    option(ratio(4, 1), 'For every 1 sticker Tom has, Mia has 4. So Mia : Tom = 4 : 1.', true),
                    option(ratio(1, 4), "That's Tom : Mia. Mia comes first, and she has more."),
                    option(ratio(4, 5), "5 is all the parts together. Tom has 1 part for every 4 of Mia's."),
                    option(ratio(4, 4), "That would mean they have the same. Tom has 1 part for every 4 of Mia's.")
                ]
            }),
            ratioCard('try-2', [6, 4], 'simplify', ['Red', 'White'], {
                prompt: 'A bag has 6 red beads and 4 white beads. Write red : white in its simplest form.',
                answer: pair(3, 2), rules: [
                    mistake(pair(6, 4), "That's right, but not simplest. Both numbers divide by 2."),
                    mistake(pair(2, 3), "Red comes first. There are more red beads, so red's number is bigger.")
                ],
                fallback: 'Divide both numbers by 2.',
                feedback: '6 ÷ 2 = 3 and 4 ÷ 2 = 2. So red : white = 3 : 2'
            }),
            card('try-3', [18, 24], 'simplify', {
                input: 'choice', prompt: 'Simplify 18 : 24 fully.', options: [
                    option(ratio(3, 4), 'The HCF of 18 and 24 is 6. 18 ÷ 6 = 3 and 24 ÷ 6 = 4', true),
                    option(ratio(9, 12), '9 and 12 can both still be divided by 3. Keep going.'),
                    option(ratio(6, 8), '6 and 8 can both still be divided by 2. Keep going.'),
                    option(ratio(4, 3), 'Keep the order. 18 is first, so its number comes first.')
                ]
            }),
            ratioCard('try-4', [24, 56], 'simplify', ['First number', 'Second number'], {
                bankId: 'ratio-basics-01', prompt: 'Write 24 : 56 in its simplest form.',
                answer: pair(3, 7), rules: [
                    mistake(pair(12, 28), '12 and 28 can both still be divided by 4.'),
                    mistake(pair(6, 14), '6 and 14 can both still be divided by 2.'),
                    mistake(pair(7, 3), 'Keep the order. 24 is first, so its number comes first.')
                ],
                fallback: 'Find the HCF of 24 and 56. Divide both numbers by it.',
                feedback: 'The HCF of 24 and 56 is 8. 24 ÷ 8 = 3 and 56 ÷ 8 = 7'
            }),
            ratioCard('try-5', [12, 18], 'simplify', ['Girls', 'Boys'], {
                bankId: 'ratio-basics-02',
                prompt: 'A team has 30 players. 12 of them are girls. The rest are boys. Write girls : boys in its simplest form.',
                answer: pair(2, 3), rules: [
                    mistake(pair(12, 18), 'Right amounts. Now simplify: both divide by 6.'),
                    mistake(pair(2, 5), 'That compares the girls with all the players. Find the boys first: 30 − 12 = 18.'),
                    mistake(pair(3, 2), 'Girls come first. There are fewer girls, so their number is smaller.')
                ],
                fallback: 'Find the boys first: 30 − 12 = 18. Then simplify 12 : 18.',
                feedback: '30 − 12 = 18 boys. 12 : 18 = 2 : 3 (divide both by 6)'
            }),
            card('try-6', [40, 24], 'compare', {
                bankId: 'ratio-basics-16', input: 'choice',
                prompt: 'Mix A uses 40 ml of blue and 24 ml of red. Mix B uses 25 ml of blue and 15 ml of red. Do they make the same shade?', options: [
                    option(`Yes. Both simplify to ${ratio(5, 3)}.`, '40 : 24 = 5 : 3 (÷ 8) and 25 : 15 = 5 : 3 (÷ 5). Same ratio, same shade.', true),
                    option("No. Mix A has more paint, so it's darker.", 'The shade depends on the ratio, not how much paint there is. Simplify both.'),
                    option('No. Mix A has 16 ml more blue than red. Mix B has only 10 ml more.', 'Compare ratios by dividing, not by taking away. 40 : 24 and 25 : 15 are both 5 : 3.'),
                    option(`No. ${ratio(40, 24)} and ${ratio(25, 15)} use different numbers.`, 'Different numbers can be the same ratio. Simplify both and see.')
                ]
            }),
            card('try-7', [4, 7], 'fraction', {
                bankId: 'ratio-basics-04', input: 'choice',
                prompt: 'In a car park, red cars : silver cars = 4 : 7. There are no other cars. What fraction of the cars are red?', options: [
                    option(fraction(4, 11), '4 + 7 = 11 parts. Red is 4 of them, so 4/11', true),
                    option(fraction(4, 7), "That's red over silver. The bottom number is all the parts: 4 + 7 = 11."),
                    option(fraction(7, 11), "That's the silver cars."),
                    option(fraction(7, 4), "That's silver over red. Put the red parts over all the parts.")
                ]
            }),
            fractionCard('try-8', [2, 7], {
                prompt: 'Squash : water = 2 : 7. What fraction of the drink is squash?',
                answer: '2/9', rules: [
                    mistake('2/7', "That's squash over water. The bottom number is all the parts: 2 + 7 = 9."),
                    mistake('7/9', "That's the water.")
                ],
                fallback: 'Add the parts: 2 + 7. Put the squash parts over that.',
                feedback: '2 + 7 = 9 parts. Squash is 2 of them, so 2/9'
            })
        ];
    }

    function checks() {
        return [
            card('check-1', [13, 9], 'notation', {
                bankId: 'ratio-basics-14', input: 'choice',
                prompt: 'In a bag, red beads : white beads = 13 : 9. Which of these must be true?', options: [
                    option('There are more red beads than white beads.', 'Right. 13 parts is more than 9 parts, whatever size the parts are.', true),
                    option('There are 13 red beads.', 'A ratio counts parts, not beads. There could be 26 red and 18 white.'),
                    option('There are 22 beads.', "There could be 44 or 66. A ratio doesn't tell you the total."),
                    option('There are 4 more red beads than white beads.', 'Only if each part is 1 bead. With 26 red and 18 white, there are 8 more.')
                ]
            }),
            ratioCard('check-2', [84, 147], 'simplify', ['Soup', 'Beans'], {
                bankId: 'ratio-basics-03',
                prompt: 'A shop has 84 tins of soup and 147 tins of beans. Write soup : beans in its simplest form.',
                answer: pair(4, 7), rules: [
                    mistake(pair(12, 21), '12 and 21 can both still be divided by 3.'),
                    mistake(pair(28, 49), '28 and 49 can both still be divided by 7.'),
                    mistake(pair(7, 4), 'Soup comes first.')
                ],
                fallback: 'Find the HCF of 84 and 147. Divide both numbers by it.',
                feedback: 'The HCF of 84 and 147 is 21. 84 ÷ 21 = 4 and 147 ÷ 21 = 7'
            }),
            card('check-3', [3, 4], 'compare', {
                bankId: 'ratio-basics-07', input: 'choice',
                prompt: "Jo's sweets : Kim's sweets = 3 : 4. Ravi says, 'Jo has 3/4 of the sweets.' Why is Ravi wrong?", options: [
                    option('There are 7 parts in total, so Jo has 3/7.', "Right. Put Jo's parts over all the parts.", true),
                    option('Jo has 4/3, because Kim has more.', "A fraction of the sweets can't be more than 1. Jo has 3 of the 7 parts."),
                    option("He isn't wrong. Jo has 3 parts and Kim has 4.", '3/4 compares Jo with Kim, not with all the sweets.'),
                    option('Jo has 4/7, because there are 7 parts.', 'Jo has 3 of the 7 parts, not 4.')
                ]
            }),
            ratioCard('check-4', [12, 18], 'simplify', ['Bag A', 'Bag B'], {
                bankId: 'ratio-basics-17',
                prompt: 'Bag A has number cards 5, 1 and 6. Bag B has number cards 3, 4, 2, 7 and 2. Write total of Bag A : total of Bag B in its simplest form.',
                answer: pair(2, 3), rules: [
                    mistake(pair(12, 18), 'Right totals. Now simplify: both divide by 6.'),
                    mistake(pair(6, 9), '6 and 9 can both still be divided by 3.'),
                    mistake(pair(4, 6), '4 and 6 can both still be divided by 2.'),
                    mistake(pair(3, 5), 'That compares how many cards are in each bag. Add the numbers on the cards: 12 and 18.')
                ],
                fallback: 'Add the numbers in each bag. Then simplify.',
                feedback: '5 + 1 + 6 = 12 and 3 + 4 + 2 + 7 + 2 = 18. 12 : 18 = 2 : 3'
            }),
            fractionCard('check-5', [12, 18], {
                prompt: 'A class has 12 boys and 18 girls. What fraction of the class are boys?',
                answer: '2/5', rules: [
                    mistake('2/3', "That's boys over girls. The bottom number is the whole class: 12 + 18 = 30."),
                    mistake('3/5', "That's the girls.")
                ],
                fallback: 'Find the whole class: 12 + 18. Put the boys over that.',
                feedback: '12 + 18 = 30 pupils. 12/30 = 2/5'
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

    // Two things in a fixed order, with how to ask about each as a fraction.
    const contexts = [
        {
            labels: ['Red', 'White'], names: ['red beads', 'white beads'],
            amounts: (a, b) => `A bag has ${a} red beads and ${b} white beads.`, ask: 'red : white',
            only: 'There are no other beads.', fractionOf: ['What fraction of the beads are red?', 'What fraction of the beads are white?']
        },
        {
            labels: ['Boys', 'Girls'], names: ['boys', 'girls'],
            amounts: (a, b) => `A class has ${a} boys and ${b} girls.`, ask: 'boys : girls',
            only: '', fractionOf: ['What fraction of the class are boys?', 'What fraction of the class are girls?']
        },
        {
            labels: ['Cats', 'Dogs'], names: ['cats', 'dogs'],
            amounts: (a, b) => `A shelter has ${a} cats and ${b} dogs.`, ask: 'cats : dogs',
            only: 'There are no other animals.', fractionOf: ['What fraction of the animals are cats?', 'What fraction of the animals are dogs?']
        },
        {
            labels: ['Flour', 'Sugar'], names: ['flour', 'sugar'],
            amounts: (a, b) => `A recipe uses ${a} g of flour and ${b} g of sugar.`, ask: 'flour : sugar',
            only: 'There is nothing else in the mix.', fractionOf: ['What fraction of the mix is flour?', 'What fraction of the mix is sugar?']
        },
        {
            labels: ['Blue', 'Red'], names: ['blue paint', 'red paint'],
            amounts: (a, b) => `A mix uses ${a} ml of blue paint and ${b} ml of red paint.`, ask: 'blue : red',
            only: 'There is no other paint.', fractionOf: ['What fraction of the paint is blue?', 'What fraction of the paint is red?']
        },
        {
            labels: ['Soup', 'Beans'], names: ['tins of soup', 'tins of beans'],
            amounts: (a, b) => `A shop has ${a} tins of soup and ${b} tins of beans.`, ask: 'soup : beans',
            only: 'There are no other tins.', fractionOf: ['What fraction of the tins are soup?', 'What fraction of the tins are beans?']
        }
    ];

    const restContexts = [
        {
            labels: ['Under 16', '16 and over'], ask: 'under 16 : 16 and over', whole: 'all the members', first: 'under 16s',
            text: (total, part) => `A club has ${total} members. ${part} of them are under 16. The rest are 16 or over.`
        },
        {
            labels: ['Blue', 'Black'], ask: 'blue : black', whole: 'all the pens', first: 'blue pens',
            text: (total, part) => `A box has ${total} pens. ${part} of them are blue. The rest are black.`
        }
    ];

    function generate(item, random) {
        const { randomInt } = window.Maths1to9LessonEngine;
        const int = (a, b) => randomInt(a, b, random);
        const choose = values => values[int(0, values.length - 1)];
        const type = item.type;
        if (!practiceTypes.includes(type)) throw new TypeError(`Unknown ratio question type: ${type}`);
        let p, q;
        do {
            p = int(1, 9);
            q = int(1, 9);
        } while (p === q || gcd(p, q) !== 1);
        const k = choose([4, 6, 8, 9, 10, 12]);
        const f = [2, 3, 5].find(prime => k % prime === 0);
        const a = k * p, b = k * q;
        const half = [a / f, b / f];
        const still = k / f;
        const context = choose(contexts);
        let question;

        if (type === 'simplify-typed') {
            const bare = int(0, 1) === 0;
            const labels = bare ? ['First number', 'Second number'] : context.labels;
            question = ratioCard(type, [a, b], 'simplify', labels, {
                bankId: bare ? 'ratio-basics-01' : 'ratio-basics-03',
                prompt: bare ? `Write ${a} : ${b} in its simplest form.` : `${context.amounts(a, b)} Write ${context.ask} in its simplest form.`,
                answer: pair(p, q), rules: [
                    mistake(pair(...half), `${half[0]} and ${half[1]} can both still be divided by ${still}. Keep going.`),
                    mistake(pair(q, p), bare ? `Keep the order. ${a} is first, so its number comes first.`
                        : `Keep the order. ${context.labels[0]} comes first.`)
                ],
                fallback: `Find the HCF of ${a} and ${b}. Divide both numbers by it.`,
                feedback: `The HCF of ${a} and ${b} is ${k}. ${a} ÷ ${k} = ${p} and ${b} ÷ ${k} = ${q}`
            });
        } else if (type === 'part-and-rest') {
            const rest = choose(restContexts);
            const total = a + b;
            question = ratioCard(type, [a, b], 'simplify', rest.labels, {
                bankId: 'ratio-basics-02',
                prompt: `${rest.text(total, a)} Write ${rest.ask} in its simplest form.`,
                answer: pair(p, q), rules: [
                    mistake(pair(a, b), `Right amounts. Now simplify: both divide by ${k}.`),
                    mistake(pair(...simplify(a, total)), `That compares the ${rest.first} with ${rest.whole}. Find the rest first: ${total} − ${a} = ${b}.`),
                    mistake(pair(q, p), `Keep the order. ${rest.labels[0]} comes first.`)
                ],
                fallback: `Find the rest first: ${total} − ${a} = ${b}. Then simplify ${a} : ${b}.`,
                feedback: `${total} − ${a} = ${b}. ${a} : ${b} = ${p} : ${q} (divide both by ${k})`
            });
        } else if (type === 'fraction-typed') {
            const which = int(0, 1);
            const part = which === 0 ? p : q, other = which === 0 ? q : p;
            const total = p + q;
            question = fractionCard(type, [p, q], {
                prompt: `${capital(context.names[0])} : ${context.names[1]} = ${p} : ${q}. ${context.only} ${context.fractionOf[which]}`.replace(/\s+/g, ' '),
                answer: fraction(part, total), rules: [
                    mistake(fraction(part, other), `That compares the two parts. The bottom number is all the parts: ${p} + ${q} = ${total}.`),
                    mistake(fraction(other, total), `That's the ${context.names[1 - which]}.`)
                ],
                fallback: `Add the parts: ${p} + ${q}. Put the ${context.names[which]} parts over that.`,
                feedback: `${p} + ${q} = ${total} parts. Put ${part} over ${total}: ${fraction(part, total)}`
            });
        } else if (type === 'simplify-choice') {
            question = card(type, [a, b], 'simplify', {
                input: 'choice', prompt: `Simplify ${a} : ${b} fully.`, options: [
                    option(ratio(p, q), `The HCF of ${a} and ${b} is ${k}. ${a} ÷ ${k} = ${p} and ${b} ÷ ${k} = ${q}`, true),
                    option(ratio(...half), `${half[0]} and ${half[1]} can both still be divided by ${still}. Keep going.`),
                    option(ratio(q, p), `Keep the order. ${a} is first, so its number comes first.`),
                    option(ratio(p, b), 'Divide both numbers by the same number, not just one.')
                ]
            });
        } else if (type === 'fraction-choice') {
            const total = p + q;
            question = card(type, [p, q], 'fraction', {
                bankId: 'ratio-basics-04', input: 'choice',
                prompt: `${capital(context.names[0])} : ${context.names[1]} = ${p} : ${q}. ${context.only} ${context.fractionOf[0]}`.replace(/\s+/g, ' '),
                options: [
                    option(fraction(p, total), `${p} + ${q} = ${total} parts. Put ${p} over ${total}: ${fraction(p, total)}`, true),
                    option(fraction(p, q), 'That compares the two parts. The bottom number is all the parts.'),
                    option(fraction(q, total), `That's the ${context.names[1]}.`),
                    option(fraction(q, p), `That's the ${context.names[1]} over the ${context.names[0]}.`)
                ]
            });
        } else {
            const m = int(2, 6);
            question = card(type, [p, q], 'notation', {
                bankId: 'proportion-and-unitary-method-10', input: 'choice',
                prompt: `Which ratio is the same as ${p} : ${q}?`, options: [
                    option(ratio(m * p, m * q), `${p} × ${m} = ${m * p} and ${q} × ${m} = ${m * q}. Both numbers are multiplied by ${m}.`, true),
                    option(ratio(p + m, q + m), 'Adding the same number changes the ratio. Multiply both numbers instead.'),
                    option(ratio(m * q, m * p), 'Keep the order.'),
                    option(ratio(m * p, q), 'Multiply both numbers, not just one.')
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

    // One row of equal blocks per thing. Every row in a picture shares the
    // same number of columns, so the rows stay to scale with each other.
    function drawBar(host, rows, columns, caption = '') {
        const figure = node('figure', '', 'ratio-bar');
        if (caption) figure.append(node('figcaption', caption));
        for (const row of rows) {
            const line = node('div', '', row.name ? 'ratio-row' : 'ratio-row ratio-row--wide');
            if (row.name) {
                const name = node('span', row.name, 'ratio-row__name');
                if (row.amount) name.append(node('small', row.amount));
                line.append(name);
            }
            const track = node('div', '', 'ratio-blocks');
            track.style.setProperty('--columns', columns);
            track.setAttribute('role', 'img');
            track.setAttribute('aria-label', row.label);
            for (const block of row.blocks) {
                track.append(node('span', block.text || '', `ratio-block is-${block.kind}${block.dim ? ' is-dim' : ''}`));
            }
            line.append(track);
            figure.append(line);
        }
        host.append(figure);
    }

    const blocks = (count, kind, text = () => '', dim = false) =>
        Array.from({ length: count }, (_, index) => ({ kind, text: text(index), dim }));

    function key(host, items) {
        const list = node('p', '', 'ratio-key');
        for (const [kind, text] of items) {
            const item = node('span', '', 'ratio-key__item');
            item.append(node('span', '', `ratio-key__swatch is-${kind}`), document.createTextNode(text));
            list.append(item);
        }
        host.append(list);
    }

    function drawLearnPicture(host, screen, value) {
        host.replaceChildren();
        const add = (text, className = 'ratio-working') => host.append(node('p', text, className));
        if (screen === 0) {
            drawBar(host, [
                { name: 'Blue', blocks: blocks(5, 'blue'), label: 'Blue: 5 parts' },
                { name: 'Red', blocks: blocks(value, 'red'), label: `Red: ${value} ${value === 1 ? 'part' : 'parts'}` }
            ], 6);
            add(`blue : red = ${ratio(5, value)}`);
            add(`${5 + value} parts altogether`);
            add(value === 1 ? 'There is 5 times as much blue as red.'
                : value === 5 ? 'There is the same amount of each.'
                    : `For every 5 parts of blue, there are ${value} parts of red.`, 'ratio-note');
        } else if (screen === 1) {
            const size = BLOCK_SIZES[value];
            const [blue, red] = [200 / size, 120 / size];
            drawBar(host, [
                { name: 'Blue', amount: '200 ml', blocks: blocks(blue, 'blue'), label: `Blue: 200 ml, ${blue} blocks of ${size} ml` },
                { name: 'Red', amount: '120 ml', blocks: blocks(red, 'red'), label: `Red: 120 ml, ${red} blocks of ${size} ml` }
            ], blue, `Each block is ${size} ml`);
            add(`200 ÷ ${size} = ${blue}`);
            add(`120 ÷ ${size} = ${red}`);
            add(`200 : 120 = ${ratio(blue, red)}`);
            const [smallBlue, smallRed] = simplify(blue, red);
            add(smallBlue === blue
                ? `${blue} and ${red} can't both be divided again. This is the simplest form.`
                : `${blue} and ${red} can both still be divided by ${blue / smallBlue}.`, 'ratio-note');
        } else if (screen === 2) {
            const size = value === 1 ? 5 : 15;
            const [first, second] = [45 / size, 60 / size];
            drawBar(host, [
                { name: '45', blocks: blocks(first, 'teal'), label: `45: ${first} blocks of ${size}` },
                { name: '60', blocks: blocks(second, 'orange'), label: `60: ${second} blocks of ${size}` }
            ], second, `Each block is ${size}`);
            if (value === 1) {
                add('45 ÷ 5 = 9');
                add('60 ÷ 5 = 12');
                add(`45 : 60 = ${ratio(9, 12)}`);
            } else if (value === 2) {
                add('9 and 12 can both still be divided by 3.', 'ratio-note');
                add('9 ÷ 3 = 3');
                add('12 ÷ 3 = 4');
                add(`9 : 12 = ${ratio(3, 4)}`);
            } else {
                add('Quicker: the HCF of 45 and 60 is 15.', 'ratio-note');
                add('45 ÷ 15 = 3');
                add('60 ÷ 15 = 4');
                add(`45 : 60 = ${ratio(3, 4)} in one step`);
            }
        } else if (screen === 3) {
            const grouped = value === 3;
            const [under, over] = grouped ? [5, 7] : [15, 21];
            drawBar(host, [{
                blocks: [...blocks(under, 'purple'), ...blocks(over, 'plain')],
                label: grouped ? '12 blocks of 3 players: 5 under 16 and 7 aged 16 and over'
                    : `36 players: 15 under 16${value === 2 ? ' and 21 aged 16 and over' : ''}`
            }], under + over, grouped ? 'Squad of 36 players. Each block is 3 players.' : 'Squad of 36 players');
            key(host, value === 1
                ? [['purple', 'Under 16: 15'], ['plain', '?']]
                : [['purple', 'Under 16: 15'], ['plain', '16 and over: 36 − 15 = 21']]);
            if (value >= 2) add(`under 16 : 16 and over = ${ratio(15, 21)}`);
            if (grouped) {
                add('15 ÷ 3 = 5');
                add('21 ÷ 3 = 7');
                add(`15 : 21 = ${ratio(5, 7)}`);
            }
        } else {
            const total = 5 + value;
            drawBar(host, [
                { name: 'Blue', blocks: blocks(5, 'blue', index => String(index + 1), true), label: 'Blue: parts 1 to 5' },
                { name: 'Red', blocks: blocks(value, 'red', index => String(index + 6)), label: `Red: parts 6 to ${total}` }
            ], 5);
            add(`blue : red = ${ratio(5, value)}`);
            add(`5 + ${value} = ${total} parts`);
            add(`Red is ${value} of the ${total} parts, so ${fraction(value, total)} of the paint is red. Blue is ${fraction(5, total)}.`, 'ratio-note');
        }
    }

    window.RatioBasics = {
        simplify, learnScreens, sliderText, examples, practiceTypes, pick, generate, checks, prepare, node, drawLearnPicture
    };
})();
