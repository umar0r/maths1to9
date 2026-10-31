(() => {
    'use strict';

    // Rounds away float noise, so 13.3 shows as 13.3, not 13.3000000001.
    const number = value => String(Number(value.toPrecision(12)));
    const round = (value, places) => Math.round(value * 10 ** places + 1e-9) / 10 ** places;
    const option = (label, feedback, correct = false) => ({ label: String(label), feedback, correct });
    const mistake = (value, feedback) => ({ value: number(value), feedback });
    const practiceTypes = ['find-time', 'find-workers', 'inverse-xy', 'double-halve', 'does-it-apply', 'is-it-inverse'];

    // The jobs Practice asks about. The total job is "<one>-hours".
    const JOBS = [
        { one: 'builder', many: 'builders', work: 'build a wall' },
        { one: 'painter', many: 'painters', work: 'paint a hall' },
        { one: 'cleaner', many: 'cleaners', work: 'clean an office' },
        { one: 'gardener', many: 'gardeners', work: 'plant a garden' },
        { one: 'packer', many: 'packers', work: 'pack an order' },
        { one: 'decorator', many: 'decorators', work: 'decorate a room' }
    ];

    // The totals in the "is it inverse proportion?" tables and the y = k/x cards.
    const TOTALS = [12, 18, 24, 30, 36, 40, 48, 60, 72, 80, 90, 96, 100, 120];

    const INVERSE_EXAMPLES = [
        ['The number of builders and the time to build a wall', 'More builders, fewer hours. The job is shared out.'],
        ['The number of people sharing a pizza and the slices each', 'More people, fewer slices each. The pizza is shared out.'],
        ['The number of taps filling a bath and the time it takes', 'More taps, less time. The water is shared between the taps.'],
        ['The number of people sharing a prize and the money each gets', 'More people, less money each. The prize is shared out.'],
        ['The number of pupils sharing a bag of sweets and the sweets each', 'More pupils, fewer sweets each. The bag is shared out.']
    ];
    const DIRECT_EXAMPLES = [
        ['The number of apples you buy and the cost', 'More apples cost more. Both go up, so it is direct proportion.'],
        ['The hours you work and your pay', 'More hours, more pay. Both go up, so it is direct proportion.'],
        ['The litres of petrol you buy and the cost', 'More petrol costs more. Both go up, so it is direct proportion.'],
        ['The number of cinema tickets and the cost', 'More tickets cost more. Both go up, so it is direct proportion.']
    ];
    const NEITHER_EXAMPLES = [
        ['The number of chefs and the time to boil an egg', "More chefs can't boil an egg faster. The time doesn't change."],
        ['The number of people in a band and the time to play a song', "More players don't make the song shorter. The time doesn't change."],
        ['The number of people watching a film and how long the film lasts', 'The film lasts the same time however many people watch it.']
    ];

    // Learn 3's table. The last column is the total, and it is always 12.
    const BUILDERS_TABLE = [
        { builders: 1, hours: 12 },
        { builders: 2, hours: 6 },
        { builders: 3, hours: 4 },
        { builders: 4, hours: 3 },
        { builders: 6, hours: 2 },
        { builders: 12, hours: 1 }
    ];

    // Every slider moves through a list of values, so it lands on real answers.
    const learnScreens = [
        {
            title: 'Share a pizza',
            lines: ['A pizza has 12 slices. Some friends share it equally. Move the slider to add more friends.',
                "More friends means fewer slices each. The pizza doesn't get any bigger.",
                "In this lesson, you'll learn how to work out problems like this. You can use a calculator."],
            slider: 'Friends', values: [1, 2, 3, 4, 6, 12], start: 1
        },
        {
            title: 'More builders, fewer hours',
            lines: ['1 builder takes 12 hours to build a wall. Move the slider to add more builders. They all work at the same speed.',
                'Each column is one builder. Each row is one hour. More builders means fewer hours.'],
            slider: 'Builders', values: [1, 2, 3, 4, 6, 12], start: 1
        },
        {
            title: 'The total never changes',
            lines: ['Times the builders by the hours. You get 12 every time.',
                'One builder working for one hour is called a builder-hour. This wall is a job of 12 builder-hours. Each square in the picture is one builder-hour.',
                'When two amounts always times to the same total, they are in inverse proportion. One goes up and the other goes down.'],
            callout: "In exams you may read 'y is inversely proportional to x'. It means the same thing: x × y is always the same number.",
            slider: 'Show rows', values: [1, 2, 3, 4, 5, 6], start: 1,
            table: BUILDERS_TABLE
        },
        {
            title: 'Double one, halve the other',
            lines: ['2 builders take 6 hours. Move the slider to double the builders.',
                'Double the builders, and the hours halve. Times the builders by 3, and you divide the hours by 3.'],
            callout: 'In direct proportion, both amounts go × 3. In inverse proportion, one goes × 3 and the other goes ÷ 3.',
            slider: 'Builders', values: [2, 4, 6, 12], start: 2
        },
        {
            title: 'Find the total, then share it',
            given: { count: 3, hours: 8 },
            lines: ['3 painters take 8 hours to paint a hall. How long would 4 painters take?',
                'First times to find the total job: 3 × 8 = 24 painter-hours. Then share the total between the painters you have: 24 ÷ 4 = 6 hours.'],
            callout: 'Divide the right way round. Share the total between the painters: 24 ÷ 4. Not 4 ÷ 24.',
            slider: 'Painters you have', values: [2, 3, 4, 6, 8, 12], start: 4
        },
        {
            title: "It isn't direct proportion",
            given: { count: 6, hours: 4 },
            lines: ['6 cleaners take 4 hours to clean an office. How long do 3 cleaners take?',
                "It's easy to halve the time because you halved the cleaners. But fewer cleaners take longer, not less time."],
            steps: [
                { title: 'Step 1:', text: 'Half the cleaners. Is it half the time, 2 hours? No. Fewer cleaners can\'t finish faster.' },
                { title: 'Step 2:', text: '6 × 4 = 24 cleaner-hours' },
                { title: 'Step 3:', text: '24 ÷ 3 = 8 hours' }
            ],
            callout: 'Check the answer goes the right way. Fewer cleaners, more hours: 8 hours is more than 4 ✓. Don\'t add or take away either: 3 fewer cleaners doesn\'t mean 3 more hours.',
            slider: 'Show the steps', values: [1, 2, 3], start: 1
        },
        {
            title: 'Does more help?',
            lines: ['1 builder takes 12 hours to build a wall. 1 chef takes 10 minutes to boil an egg. Move the slider to add more people.',
                "More builders share the work, so the wall takes less time. But more chefs can't make water boil faster. The egg still takes 10 minutes.",
                'Inverse proportion only works when the job can be shared out.'],
            callout: 'Quick test: times each pair. For the wall, you get 12 every time. For the egg, you get 10, 20, 30, 40. The total changes, so it isn\'t inverse proportion.',
            slider: 'People', values: [1, 2, 3, 4], start: 1
        },
        {
            title: 'Four steps, every time',
            question: '5 cleaners take 9 hours to clean an office. How many cleaners do you need to finish in 6 hours?',
            lines: ['Use these steps for every inverse proportion question.'],
            steps: [
                { title: 'Does more help?', text: 'More cleaners finish faster. So it is inverse proportion.' },
                { title: 'Times to find the total job.', text: '5 × 9 = 45 cleaner-hours' },
                { title: 'Share it out: divide.', text: '45 ÷ 6 = 7.5' },
                { title: 'Check, and round up if you need to.', text: "You can't have 7.5 cleaners. 7 cleaners would take more than 6 hours (45 ÷ 7 = 6.4). So round up: 8 cleaners." }
            ],
            check: 'Check: less time needs more cleaners. 8 is more than 5 ✓',
            slider: 'Show the steps', values: [1, 2, 3, 4], start: 1
        }
    ];

    function card(questionType, values, asked, config) {
        return { questionType, values, asked, ...config };
    }

    function examples() {
        return [
            card('try-1', { count: 4, time: 3, newCount: 6, newTime: 2 }, 'time', {
                input: 'choice',
                prompt: '4 friends share a pizza. They get 3 slices each. 2 more friends arrive. How many slices does each person get now?',
                options: [
                    option('2', 'The pizza has 4 × 3 = 12 slices. 12 ÷ 6 = 2 slices each.', true),
                    option('1', 'That takes 2 slices away because 2 friends came. Find the whole pizza first: 4 × 3 = 12 slices. Then share it between 6.'),
                    option('5', 'That adds 2. More friends means fewer slices each, not more.'),
                    option('4.5', "That's direct proportion: more friends, more slices. But the pizza is the same size, so each share gets smaller.")
                ]
            }),
            card('try-2', { count: 1, time: 12, newCount: 3, newTime: 4 }, 'time', {
                input: 'number', unit: 'hours',
                prompt: '1 builder takes 12 hours to build a wall. How many hours would 3 builders take? They all work at the same speed.',
                answer: '4',
                rules: [
                    mistake(36, 'That times by 3. More builders should take less time, not more.'),
                    mistake(9, 'That takes 3 away. Share the 12 hours of work between 3 builders: divide.'),
                    mistake(0.25, "That's 3 ÷ 12, the wrong way round. Share the 12 hours between 3 builders: 12 ÷ 3.")
                ],
                fallback: 'Share the 12 hours of work between 3 builders.',
                feedback: '12 ÷ 3 = 4 hours'
            }),
            card('try-3', null, 'change', {
                input: 'choice',
                prompt: 'y is inversely proportional to x. x is doubled. What happens to y?',
                options: [
                    option('y is halved', 'Double one and the other halves, so x × y stays the same.', true),
                    option('y is doubled', "That's direct proportion. In inverse proportion, when one goes up, the other goes down."),
                    option('y stays the same', 'Then x × y would double. It must stay the same, so y halves.'),
                    option('y goes down by 2', "Don't take away. Doubling x means y is divided by 2.")
                ]
            }),
            card('try-4', { count: 4, time: 6, newCount: null, newTime: null }, 'total', {
                input: 'number', unit: 'painter-hours',
                prompt: '4 painters take 6 hours to paint a hall. How many painter-hours is the job?',
                answer: '24',
                rules: [
                    mistake(10, 'That adds. Times the painters by the hours: 4 × 6.'),
                    mistake(1.5, 'That divides 6 by 4. Times the painters by the hours to find the total job.')
                ],
                fallback: 'Times the painters by the hours.',
                feedback: '4 × 6 = 24 painter-hours'
            }),
            card('try-5', { count: 4, time: 6, newCount: 8, newTime: 3 }, 'time', {
                input: 'choice',
                prompt: '4 painters take 6 hours to paint a hall. How long would 8 painters take? They all work at the same speed.',
                options: [
                    option('3 hours', '4 × 6 = 24 painter-hours. 24 ÷ 8 = 3 hours. Double the painters, half the time.', true),
                    option('12 hours', 'That doubles the hours. More painters should finish faster, not slower.'),
                    option('2 hours', "That takes 4 hours away because you added 4 painters. Don't take away. Find the total job: 4 × 6 = 24 painter-hours."),
                    option('0.33 hours', "That's 8 ÷ 24, the wrong way round. Share the 24 painter-hours between 8 painters: 24 ÷ 8.")
                ]
            }),
            card('try-6', { count: 5, time: 12, newCount: 3, newTime: 20 }, 'time', {
                input: 'number', unit: 'minutes',
                prompt: '5 taps fill a tank in 12 minutes. How long would 3 taps take? The taps all run at the same speed.',
                answer: '20',
                rules: [
                    mistake(7.2, "That's direct proportion: fewer taps, less time. Would fewer taps fill the tank faster?"),
                    mistake(14, 'That adds 2 because you took away 2 taps. Find the total job first: 5 × 12.'),
                    mistake(60, "That's the total job, 60 tap-minutes. Now share it between 3 taps.")
                ],
                fallback: 'Find the total job: 5 × 12. Then share it between 3 taps.',
                feedback: '5 × 12 = 60 tap-minutes. 60 ÷ 3 = 20 minutes'
            }),
            card('try-7', { count: 1, time: 10, newCount: 5, newTime: 10 }, 'time', {
                input: 'choice',
                prompt: '1 chef takes 10 minutes to boil an egg. How long do 5 chefs take to boil the same egg?',
                options: [
                    option('10 minutes', "More chefs can't make the water boil faster. The egg still takes 10 minutes.", true),
                    option('2 minutes', "That's 10 ÷ 5, as if the job is shared out. But boiling an egg can't be shared."),
                    option('50 minutes', "That times by 5. More chefs don't make it slower either."),
                    option('5 minutes', 'That takes 5 away. The water boils at the same speed however many chefs there are.')
                ]
            }),
            card('try-8', null, 'table', {
                input: 'choice',
                prompt: 'The table shows the speed of a car and the time a trip takes. 20 km/h: 6 hours. 30 km/h: 4 hours. 40 km/h: 2 hours. Is it inverse proportion?',
                options: [
                    option('No: 40 × 2 = 80, not 120', '20 × 6 = 120 and 30 × 4 = 120. But 40 × 2 = 80. The total must be the same every time.', true),
                    option('Yes: the time goes down as the speed goes up', "The time does go down. But that isn't enough. Times each pair. You must get the same answer every time."),
                    option('Yes: speed × time is always 120', 'Check every pair. 40 × 2 = 80, not 120.'),
                    option('No: the time should go up when the speed goes up', 'A faster car does take less time. That is not the problem. Times each pair: 40 × 2 = 80, not 120.')
                ]
            }),
            card('try-9', { count: 4, time: 15, newCount: 6, newTime: 10 }, 'xy', {
                input: 'number',
                prompt: 'y is inversely proportional to x. When x = 4, y = 15. Find y when x = 6.',
                answer: '10',
                rules: [
                    mistake(22.5, "That's direct proportion: y went up when x went up. In inverse proportion, y goes down."),
                    mistake(60, '60 is x × y, the total. Now divide it by the new x: 60 ÷ 6.'),
                    mistake(13, 'That takes 2 away because x went up by 2. Find x × y first: 4 × 15.')
                ],
                fallback: 'Find x × y first: 4 × 15. Then divide by 6.',
                feedback: '4 × 15 = 60. 60 ÷ 6 = 10'
            }),
            card('try-10', { count: 6, time: 4, newCount: 8, newTime: 3 }, 'workers', {
                input: 'number', unit: 'cleaners',
                prompt: '6 cleaners take 4 hours to clean an office. How many cleaners do you need to finish in 3 hours? They all work at the same speed.',
                answer: '8',
                rules: [
                    mistake(4.5, "That's direct proportion: less time, fewer cleaners. To finish faster, you need more cleaners."),
                    mistake(24, '24 is the total job in cleaner-hours. Share it by the 3 hours.'),
                    mistake(7, 'That adds 1 because you took away 1 hour. Find the total job first: 6 × 4.')
                ],
                fallback: 'Find the total job: 6 × 4 = 24 cleaner-hours. Then divide by 3.',
                feedback: '6 × 4 = 24 cleaner-hours. 24 ÷ 3 = 8 cleaners'
            })
        ];
    }

    function checks() {
        return [
            card('check-1', { count: 12, time: 5, newCount: 15, newTime: 4 }, 'time', {
                input: 'number', unit: 'hours',
                prompt: '12 gardeners take 5 hours to plant trees along a road. How long would 15 gardeners take? They all work at the same speed.',
                answer: '4',
                rules: [
                    mistake(6.25, "That's direct proportion. More gardeners should take less time, not more."),
                    mistake(60, '60 is the total job in gardener-hours. Share it between 15 gardeners.'),
                    mistake(2, 'That takes 3 hours away because you added 3 gardeners. Find the total job first: 12 × 5.')
                ],
                fallback: 'Find the total job: 12 × 5. Then share it between 15.',
                feedback: '12 × 5 = 60 gardener-hours. 60 ÷ 15 = 4 hours'
            }),
            card('check-2', null, 'applies', {
                input: 'choice',
                prompt: 'Which of these is inverse proportion?',
                options: [
                    option('The number of people sharing a £60 prize and the money each gets', 'Twice the people, half the money each. People × money each is always £60.', true),
                    option('The number of cinema tickets and the cost', "More tickets cost more. That's direct proportion."),
                    option('The number of people singing a song and how long the song lasts', "More singers don't make the song shorter. The time doesn't change."),
                    option('The hours you work and your pay', "More hours, more pay. That's direct proportion.")
                ]
            }),
            card('check-3', { count: 8, time: 5, newCount: 14, newTime: 3 }, 'workers', {
                input: 'number', unit: 'cleaners',
                prompt: '8 cleaners take 5 hours to clean a school. How many cleaners do you need to finish in 3 hours? They all work at the same speed.',
                answer: '14',
                rules: [
                    mistake(13, '13 cleaners would take more than 3 hours: 40 ÷ 13 is more than 3. Round up.'),
                    mistake(13.33, "You can't have part of a cleaner. Round up to a whole number."),
                    mistake(4.8, "That's direct proportion: less time, fewer cleaners. To finish faster, you need more cleaners."),
                    mistake(40, '40 is the total job in cleaner-hours. Share it by the 3 hours.')
                ],
                fallback: 'Find the total job: 8 × 5 = 40 cleaner-hours. Divide by 3, then round up.',
                feedback: "8 × 5 = 40 cleaner-hours. 40 ÷ 3 = 13.3… You can't have part of a cleaner, and 13 would take too long. So you need 14 cleaners."
            }),
            card('check-4', { count: 6, time: 10, newCount: 3, newTime: 20 }, 'time', {
                input: 'choice',
                prompt: "Sam says: '6 builders take 10 hours, so 3 builders take 5 hours.' What has Sam done wrong?",
                options: [
                    option('Used direct proportion. Fewer builders take longer: 3 builders take 20 hours.', '6 × 10 = 60 builder-hours. 60 ÷ 3 = 20 hours.', true),
                    option('Nothing. Sam is right.', "Half the builders can't finish in half the time. They take twice as long: 20 hours."),
                    option('Sam should take away 3 hours. 3 builders take 7 hours.', "Don't take away. Find the total job: 6 × 10 = 60 builder-hours."),
                    option('Sam should add 3 hours. 3 builders take 13 hours.', 'Fewer builders do take longer, but not 3 hours longer. 60 builder-hours ÷ 3 = 20 hours.')
                ]
            }),
            card('check-5', { count: 4, time: 30, newCount: 12, newTime: 10 }, 'xy', {
                input: 'number',
                prompt: 'y is inversely proportional to x. When x = 4, y = 30. Find y when x = 12.',
                answer: '10',
                rules: [
                    mistake(90, "That's direct proportion: y went up when x went up. In inverse proportion, y goes down."),
                    mistake(120, '120 is x × y, the total. Now divide it by the new x: 120 ÷ 12.'),
                    mistake(22, 'That takes 8 away because x went up by 8. Find x × y first: 4 × 30.')
                ],
                fallback: 'Find x × y first: 4 × 30. Then divide by 12.',
                feedback: '4 × 30 = 120. 120 ÷ 12 = 10'
            }),
            card('check-6', null, 'table', {
                input: 'choice',
                prompt: 'Some pupils share a bag of sweets equally. 3 pupils get 16 sweets each. 4 pupils get 12 each. 6 pupils get 8 each. Is it inverse proportion?',
                options: [
                    option('Yes: pupils × sweets is always 48', '3 × 16, 4 × 12 and 6 × 8 all make 48.', true),
                    option("No: the sweets don't go down by the same amount", "They don't need to. Times each pair. You get 48 every time."),
                    option('No: 6 pupils should get 9 sweets each', 'Work it out: 48 ÷ 6 = 8. That matches.'),
                    option('Yes: the sweets go down when the pupils go up', 'The answer is yes, but not for that reason. Going down is not enough. Check that pupils × sweets is the same every time.')
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

    // Keeps rules that differ from the answer and from each other, and that a
    // pupil could really type (whole numbers, or a number with 2 decimal places).
    function cleanRules(answer, rules) {
        const kept = [];
        for (const rule of rules) {
            const value = Number(rule.value);
            if (!Number.isFinite(value) || value <= 0) continue;
            if (Math.abs(round(value, 2) - value) > 1e-9) continue;
            if ([answer, ...kept.map(each => Number(each.value))].some(other => Math.abs(other - value) <= 1e-9)) continue;
            kept.push(rule);
        }
        return kept;
    }

    // A whole number, or a number that ends in .5.
    const isWholeOrHalf = value => Math.abs(value * 2 - Math.round(value * 2)) <= 1e-9;

    function generate(item, random) {
        const { randomInt, shuffle } = window.Maths1to9LessonEngine;
        const int = (low, high) => randomInt(low, high, random);
        const choose = values => values[int(0, values.length - 1)];
        const type = item.type;
        if (!practiceTypes.includes(type)) throw new TypeError(`Unknown inverse proportion question type: ${type}`);
        let question;

        if (type === 'find-time') {
            const job = choose(JOBS);
            let a, t, b, total, answer;
            for (let attempt = 0; attempt < 200; attempt++) {
                a = int(2, 12);
                t = int(2, 24);
                b = int(2, 15);
                if (b === a) continue;
                total = a * t;
                answer = total / b;
                if (isWholeOrHalf(answer) && answer > 0) break;
            }
            const rules = [
                mistake(t * b / a, `That's direct proportion. More ${job.many} should take less time, fewer should take more.`),
                mistake(total, `That's the total job, ${total} ${job.one}-hours. Now share it between ${b} ${job.many}.`)
            ];
            const taken = t - (b - a);
            if (taken > 0) rules.push(mistake(taken, `That changes the hours by the same number as the ${job.many}. Find the total job first: ${a} × ${t}.`));
            question = card(type, { count: a, time: t, newCount: b, newTime: answer }, 'time', {
                input: 'number', unit: 'hours',
                prompt: `${a} ${job.many} take ${t} hours to ${job.work}. How long would ${b} ${job.many} take? They all work at the same speed.`,
                answer: number(answer),
                rules: cleanRules(answer, rules),
                fallback: `Find the total job: ${a} × ${t}. Then share it between ${b} ${job.many}.`,
                feedback: `${a} × ${t} = ${total} ${job.one}-hours. ${total} ÷ ${b} = ${number(answer)} hours`
            });
        } else if (type === 'find-workers') {
            const job = choose(JOBS);
            const wantRoundUp = int(0, 1) === 1;
            let a, t, d, total, exact, answer;
            for (let attempt = 0; attempt < 400; attempt++) {
                a = int(2, 10);
                t = int(4, 24);
                d = int(2, t - 1);
                total = a * t;
                exact = total / d;
                if (!(exact > a && exact <= 40)) continue;
                if (Number.isInteger(exact) === wantRoundUp) continue;
                answer = wantRoundUp ? Math.ceil(exact) : exact;
                break;
            }
            const rules = [
                mistake(a * d / t, `That's direct proportion: less time, fewer ${job.many}. To finish faster, you need more ${job.many}.`),
                mistake(total, `That's the total job in ${job.one}-hours. Share it by the ${d} hours.`)
            ];
            if (!Number.isInteger(exact)) {
                rules.push(mistake(round(exact, 2), `You can't have part of a ${job.one}. Round up to a whole number.`));
                rules.push(mistake(Math.floor(exact), `That many ${job.many} would take more than ${d} hours. Round up.`));
            }
            question = card(type, { count: a, time: t, newCount: answer, newTime: d }, 'workers', {
                input: 'number', unit: job.many,
                prompt: `${a} ${job.many} take ${t} hours to ${job.work}. How many ${job.many} do you need to finish in ${d} hours? They all work at the same speed.`,
                answer: number(answer),
                rules: cleanRules(answer, rules),
                fallback: `Find the total job: ${a} × ${t} = ${total} ${job.one}-hours. Then divide by ${d}.`,
                feedback: Number.isInteger(exact)
                    ? `${a} × ${t} = ${total} ${job.one}-hours. ${total} ÷ ${d} = ${answer}. You need ${answer} ${job.many}.`
                    : `${a} × ${t} = ${total} ${job.one}-hours. ${total} ÷ ${d} = ${round(exact, 2)}… You can't have part of a ${job.one}, so round up to ${answer}.`
            });
        } else if (type === 'inverse-xy') {
            let total, x1, x2, y1, answer;
            for (let attempt = 0; attempt < 200; attempt++) {
                total = choose(TOTALS);
                const divisors = [];
                for (let x = 2; x <= 12; x++) if (total % x === 0) divisors.push(x);
                if (divisors.length < 2) continue;
                x1 = choose(divisors);
                const others = divisors.filter(x => x !== x1);
                x2 = choose(others);
                y1 = total / x1;
                answer = total / x2;
                break;
            }
            const direction = x2 > x1
                ? 'That\'s direct proportion. In inverse proportion, when x goes up, y goes down.'
                : 'That\'s direct proportion. In inverse proportion, when x goes down, y goes up.';
            const rules = [
                mistake(y1 * x2 / x1, direction),
                mistake(total, `${total} is x × y, the total. Now divide it by the new x: ${total} ÷ ${x2}.`)
            ];
            const taken = y1 - (x2 - x1);
            if (taken > 0) rules.push(mistake(taken, 'That changes y by the same amount as x. Find x × y first.'));
            question = card(type, { count: x1, time: y1, newCount: x2, newTime: answer }, 'xy', {
                input: 'number',
                prompt: `y is inversely proportional to x. When x = ${x1}, y = ${y1}. Find y when x = ${x2}.`,
                answer: number(answer),
                rules: cleanRules(answer, rules),
                fallback: `Find x × y first: ${x1} × ${y1}. Then divide by ${x2}.`,
                feedback: `${x1} × ${y1} = ${total}. ${total} ÷ ${x2} = ${number(answer)}`
            });
        } else if (type === 'double-halve') {
            const m = choose([2, 3, 4, 5, 10]);
            const aboutY = int(0, 1) === 0;
            const subject = aboutY ? 'y' : 'the time';
            const times = m === 2 ? 'doubled' : `multiplied by ${m}`;
            const divided = m === 2 ? 'halved' : `divided by ${m}`;
            question = card(type, null, 'change', {
                input: 'choice',
                prompt: aboutY
                    ? `y is inversely proportional to x. x is ${times}. What happens to y?`
                    : `The number of builders on a job is ${times}. What happens to the time it takes?`,
                options: [
                    option(`${subject} is ${divided}`, `Times one by ${m} and the other is divided by ${m}. The total stays the same.`, true),
                    option(`${subject} is ${times}`, "That's direct proportion. In inverse proportion, when one goes up, the other goes down."),
                    option(`${subject} stays the same`, `Then the total would be ${m} times bigger. It must stay the same.`),
                    option(`${subject} goes down by ${m}`, "Don't take away. Times one by m and you divide the other by m.")
                ]
            });
        } else if (type === 'does-it-apply') {
            const [inverseText, inverseFeedback] = choose(INVERSE_EXAMPLES);
            const direct = shuffle(DIRECT_EXAMPLES, random).slice(0, 2);
            const neither = choose(NEITHER_EXAMPLES);
            question = card(type, null, 'applies', {
                input: 'choice',
                prompt: 'Which of these is inverse proportion?',
                options: [
                    option(inverseText, inverseFeedback, true),
                    ...direct.map(([text, feedback]) => option(text, feedback)),
                    option(neither[0], neither[1])
                ]
            });
        } else {
            let options, prompt;
            for (let attempt = 0; attempt < 200; attempt++) {
                const total = choose(TOTALS);
                const divisors = [];
                for (let x = 1; x <= 12; x++) if (total % x === 0) divisors.push(x);
                if (divisors.length < 3) continue;
                const [x1, x2, x3] = shuffle(divisors, random).slice(0, 3).sort((first, second) => first - second);
                const y1 = total / x1;
                const y2 = total / x2;
                const isInverse = int(0, 1) === 0;
                const y3 = total / x3 + (isInverse ? 0 : int(1, 2));
                if (!isInverse && !(y3 < y2)) continue;
                const p3 = x3 * y3;
                prompt = `The table shows three pairs of x and y. When x is ${x1}, y is ${y1}. When x is ${x2}, y is ${y2}. When x is ${x3}, y is ${y3}. Is y inversely proportional to x?`;
                if (isInverse) {
                    options = [
                        option(`Yes: x × y is always ${total}`, `${x1} × ${y1}, ${x2} × ${y2} and ${x3} × ${y3} all make ${total}.`, true),
                        option('No: y goes down by different amounts', `y doesn't need to go down by the same amount each time. Times each pair. You get ${total} every time.`),
                        option(`No: when x is ${x3}, y should be ${y3 + 1}`, `Work it out: ${total} ÷ ${x3} = ${y3}. That matches the table.`),
                        option('Yes: y goes down when x goes up', 'The answer is yes, but not for that reason. y can go down without it being inverse proportion. Check that x × y is the same every time.')
                    ];
                } else {
                    options = [
                        option(`No: ${x3} × ${y3} = ${p3}, not ${total}`, `${x1} × ${y1} = ${total} and ${x2} × ${y2} = ${total}. But ${x3} × ${y3} = ${p3}. They must all be the same.`, true),
                        option(`Yes: x × y is always ${total}`, `Check every pair. ${x3} × ${y3} = ${p3}, not ${total}.`),
                        option('Yes: y goes down when x goes up', 'y does go down. But that is not enough. Times each pair. They must all give the same answer.'),
                        option('No: y should go up when x goes up', `In inverse proportion, y does go down when x goes up. The problem is that ${x3} × ${y3} = ${p3}, not ${total}.`)
                    ];
                }
                if (new Set(options.map(each => each.label)).size === options.length) {
                    question = card(type, { count: x1, time: y1, newCount: x3, newTime: y3 }, 'table', { input: 'choice', prompt, options });
                    break;
                }
            }
        }
        if (!question) throw new Error(`Could not build an inverse proportion card of type ${type}`);
        return prepare(question, random);
    }

    window.InverseProportion = {
        number, round, learnScreens, examples, checks,
        practiceTypes, pick, generate, prepare
    };
})();
