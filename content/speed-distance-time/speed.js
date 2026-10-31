(() => {
    'use strict';

    // Rounds away float noise, so 75 / 60 shows as 1.25, not 1.2499999.
    const number = value => String(Number(Number(value).toPrecision(12)));
    const round = (value, places) => Math.round(value * 10 ** places + 1e-9) / 10 ** places;
    const toHours = (hours, minutes = 0) => Number(number(hours + minutes / 60));
    const option = (label, feedback, correct = false) => ({ label: String(label), feedback, correct });
    const mistake = (value, feedback) => ({ value: number(value), feedback });
    const plural = (count, word) => `${number(count)} ${word}${count === 1 ? '' : 's'}`;
    const practiceTypes = ['find-speed', 'find-distance', 'find-time', 'which-calculation', 'minutes-speed', 'minutes-distance', 'who-is-faster'];
    const TYPED_TYPES = ['find-speed', 'find-distance', 'find-time'];
    const CHOICE_TYPES = ['which-calculation', 'minutes-speed', 'minutes-distance', 'who-is-faster'];

    const learnScreens = [
        {
            title: 'Which car is faster?',
            lines: ['Car A goes 120 km in 2 hours. Car B goes 150 km in 3 hours.',
                'Car B goes further. But it also drives for longer. Move the slider to see the cars hour by hour.',
                "In this lesson, you'll learn how to work out speed, distance and time. You can use a calculator."],
            result: 'Car B went further. But Car A went further in each hour: 60 km, not 50 km. Car A is faster.',
            sliders: [{ id: 'hours', label: 'Hours', min: 0, max: 3, step: 1, start: 0 }]
        },
        {
            title: '60 km/h means 60 km in each hour',
            lines: ['Speed tells you how far you go in each hour. 60 km/h means 60 km in each hour.',
                "You say it '60 kilometres per hour'. Per means 'in each'.",
                'So in 3 hours, you go 60 km three times: 60 × 3.'],
            chips: ['km/h: kilometres per hour', 'mph: miles per hour', 'm/s: metres per second'],
            sliders: [
                { id: 'speed', label: 'Speed', min: 20, max: 100, step: 10, start: 60, unit: ' km/h' },
                { id: 'hours', label: 'Hours', min: 1, max: 5, step: 1, start: 3 }
            ]
        },
        {
            title: 'Find the speed: share it out',
            lines: ['Now turn it round. A car goes 150 km in 3 hours.',
                'Share the 150 km equally between the 3 hours. Each hour gets 50 km, so the speed is 50 km/h.',
                'Sharing is dividing: speed = distance ÷ time.'],
            callout: 'This is the average speed. The car may go faster or slower at times. On average, it goes 50 km in each hour.',
            sliders: [
                { id: 'distance', label: 'Distance', min: 30, max: 300, step: 30, start: 150, unit: ' km' },
                { id: 'hours', label: 'Hours', min: 1, max: 6, step: 1, start: 3 }
            ]
        },
        {
            title: 'Find the time: how many hours fit?',
            lines: ['A car needs to go 240 km at 60 km/h. Each hour, it goes 60 km.',
                'How many 60 km blocks fit into 240 km? 240 ÷ 60 = 4.',
                'So it takes 4 hours: time = distance ÷ speed.'],
            callout: 'A faster car needs fewer blocks, so it takes less time.',
            sliders: [{ id: 'speed', label: 'Speed', values: [20, 30, 40, 60, 80, 120], start: 60, unit: ' km/h' }]
        },
        {
            title: 'The triangle comes from the unit',
            lines: ['km/h means km ÷ hours: distance ÷ time. So distance goes on top of the triangle. Speed and time sit underneath.',
                'Tap the one you want to find to cover it. The other two show you what to do.'],
            callout: "You don't need to learn the triangle by heart. The unit tells you: km/h has km on top.",
            cover: {
                D: { rule: 'D = S × T', example: '60 × 3 = 180 km', how: 'Side by side means times.' },
                S: { rule: 'S = D ÷ T', example: '150 ÷ 3 = 50 km/h', how: 'One above the other means divide.' },
                T: { rule: 'T = D ÷ S', example: '240 ÷ 60 = 4 hours', how: 'One above the other means divide.' }
            },
            start: 'S'
        },
        {
            title: 'Make the times match',
            lines: ['km/h counts hours, so the time must be in hours too.',
                'If the time is in minutes, divide by 60 to change it to hours.'],
            chips: ['15 minutes = 0.25 hours', '30 minutes = 0.5 hours', '45 minutes = 0.75 hours'],
            callout: "1 hour 15 minutes is not 1.15 hours. 15 minutes is a quarter of an hour, so it's 1.25 hours.",
            busSpeed: 48,
            sliders: [{ id: 'minutes', label: 'Time', min: 15, max: 180, step: 15, start: 75, unit: ' minutes' }]
        },
        {
            title: 'Three steps, every time',
            lines: ['Use these three steps for every speed question.'],
            question: 'A cyclist rides at 40 mph for 1 hour 30 minutes. How far does she go?',
            steps: [
                { title: 'What do you want?', text: 'Distance. Cover D: speed × time.' },
                { title: 'Do the times match?', text: 'mph is per hour. 1 hour 30 minutes = 1.5 hours. (Not 1.3.)' },
                { title: 'Work it out. Write the unit.', text: '40 × 1.5 = 60 miles' }
            ],
            result: 'Check: 40 miles in the first hour, then 20 more in the half hour. 60 miles ✓',
            sliders: [{ id: 'step', label: 'Show the steps', min: 1, max: 3, step: 1, start: 1 }]
        }
    ];

    // values: { distance, speed, time } with time in hours and null for the unknown.
    function card(questionType, values, asked, config) {
        return {
            questionType, values, asked,
            ...(config.input === 'number' ? { inputLabel: 'Answer' } : {}),
            ...config
        };
    }

    function examples() {
        return [
            card('try-1', { distance: null, speed: 50, time: null }, 'meaning', {
                input: 'choice', prompt: 'A car drives at 50 km/h. What does this mean?', options: [
                    option('It goes 50 km in each hour', "Per means 'in each': 50 km in each hour.", true),
                    option('It goes 50 km in total', "50 km/h doesn't tell you the total. It tells you how far the car goes in each hour."),
                    option('The journey takes 50 hours', 'The h stands for hours, but 50 is the distance in each hour, not the time.'),
                    option('It goes 1 km every 50 hours', "That's the wrong way round. km/h means km in each hour.")
                ]
            }),
            card('try-2', { distance: null, speed: 80, time: 3 }, 'distance', {
                input: 'number', unit: 'km', prompt: 'A train goes at 80 km/h for 3 hours. How far does it go?', answer: '240', rules: [
                    mistake(26.67, 'That divides. In 3 hours, the train goes 80 km three times. Multiply.'),
                    mistake(83, 'That adds. It goes 80 km in each of the 3 hours, so multiply.')
                ], fallback: 'Distance = speed × time.', feedback: '80 × 3 = 240 km'
            }),
            card('try-3', { distance: 54, speed: null, time: 3 }, 'speed', {
                bankId: 'speed-distance-time-01', input: 'number', unit: 'km/h',
                prompt: 'A cyclist rides 54 km in 3 hours. What is her average speed?', answer: '18', rules: [
                    mistake(162, 'That multiplies. Share the 54 km between the 3 hours: divide.'),
                    mistake(51, 'That takes 3 away. Share the 54 km between the 3 hours: divide.')
                ], fallback: 'Speed = distance ÷ time.', feedback: '54 ÷ 3 = 18 km/h'
            }),
            card('try-4', { distance: 200, speed: null, time: 4 }, 'calculation', {
                input: 'choice', prompt: 'A lorry goes 200 miles in 4 hours. Which calculation finds its speed?', options: [
                    option('200 ÷ 4', 'Speed = distance ÷ time. mph means miles ÷ hours.', true),
                    option('4 ÷ 200', "That's the wrong way round. mph means miles ÷ hours, so the distance goes first."),
                    option('200 × 4', 'Multiplying gives 800, far more than the lorry goes in an hour. Divide.'),
                    option('200 − 4', "You can't take hours away from miles. Divide.")
                ]
            }),
            card('try-5', { distance: 42, speed: 12, time: null }, 'time', {
                bankId: 'speed-distance-time-04', input: 'number', unit: 'hours',
                prompt: 'A boat goes 42 km at 12 km/h. How long does it take?', answer: '3.5', rules: [
                    mistake(504, 'That multiplies. See how many 12 km blocks fit into 42 km: divide.'),
                    mistake(30, 'That takes 12 away. Time = distance ÷ speed.')
                ], fallback: 'Cover T: distance ÷ speed.', feedback: '42 ÷ 12 = 3.5 hours'
            }),
            card('try-6', { distance: null, speed: null, time: 1.5 }, 'hours', {
                input: 'choice', prompt: 'Write 1 hour 30 minutes in hours.', options: [
                    option('1.5 hours', '30 minutes is half an hour, so 1 hour 30 minutes is 1.5 hours.', true),
                    option('1.3 hours', '30 minutes is half an hour: 0.5, not 0.3.'),
                    option('90 hours', '90 is the number of minutes. Divide by 60 to get hours.'),
                    option('0.5 hours', "That's only the 30 minutes. Add the 1 hour too.")
                ]
            }),
            card('try-7', { distance: null, speed: 48, time: 1.25 }, 'distance', {
                bankId: 'speed-distance-time-02', input: 'choice',
                prompt: 'A bus goes at 48 km/h for 1 hour 15 minutes. How far does it go?', options: [
                    option('60 km', '1 hour 15 minutes is 1.25 hours. 48 × 1.25 = 60 km', true),
                    option('55.2 km', '1 hour 15 minutes is not 1.15 hours. 15 minutes is a quarter of an hour: 0.25.'),
                    option('38.4 km', 'That divides. Distance = speed × time.'),
                    option('720 km', 'That uses 15 minutes as 15 hours. Change the time to hours first.')
                ]
            }),
            card('try-8', { distance: 12, speed: 0.4, time: null }, 'time', {
                input: 'number', unit: 'seconds', prompt: 'A snail moves at 0.4 m/s. How long does it take to move 12 m?', answer: '30', rules: [
                    mistake(4.8, 'That multiplies. See how many 0.4 m steps fit into 12 m: divide.')
                ], fallback: 'Time = distance ÷ speed. The speed is in metres per second, so the answer is in seconds.',
                feedback: '12 ÷ 0.4 = 30 seconds'
            }),
            card('try-9', { distance: 6, speed: null, time: 0.5 }, 'speed', {
                input: 'number', unit: 'km/h', prompt: 'A runner goes 6 km in 30 minutes. What is her speed in km/h?', answer: '12', rules: [
                    mistake(0.2, "That's how far she goes in each minute. km/h needs hours: 30 minutes is 0.5 hours."),
                    mistake(20, '30 minutes is 0.5 hours, not 0.3.'),
                    mistake(180, 'That multiplies. Speed = distance ÷ time.')
                ], fallback: 'Change 30 minutes to hours first.',
                feedback: '30 minutes = 0.5 hours. 6 ÷ 0.5 = 12 km/h. In a whole hour, she would go twice as far.'
            }),
            card('try-10', { distance: 90, speed: 60, time: null }, 'mistake', {
                input: 'choice', prompt: "Sam says: 'A car goes 90 km at 60 km/h. The time is 60 ÷ 90 = 0.67 hours.' What has Sam done wrong?",
                options: [
                    option("Divided the wrong way round. It's 90 ÷ 60 = 1.5 hours.",
                        'Time = distance ÷ speed. 90 km is more than one hour of driving, so the answer must be more than 1 hour.', true),
                    option('Nothing. Sam is right.', "Check it: in less than 1 hour at 60 km/h, the car goes less than 60 km. That's not 90 km."),
                    option('Sam should multiply: 90 × 60 = 5400 hours', 'Multiplying finds a distance. Cover T: distance ÷ speed.'),
                    option('Sam should take away: 90 − 60 = 30 hours', "Taking away doesn't give a time. Divide distance by speed.")
                ]
            })
        ];
    }

    function checks() {
        return [
            card('check-1', { distance: 5, speed: null, time: toHours(0, 25) }, 'compare', {
                input: 'choice', prompt: 'Amy runs 5 km in 25 minutes. Ben runs 9 km in 1 hour. Who is faster?', options: [
                    option("Amy: 12 km/h, faster than Ben's 9 km/h", '25 minutes is 25 ÷ 60 hours. 5 ÷ (25 ÷ 60) = 12 km/h. Ben goes 9 km in an hour.', true),
                    option("Ben: 9 km/h, faster than Amy's 5 km/h", 'Amy runs 5 km in less than an hour, so her speed is more than 5 km/h. Change 25 minutes to hours.'),
                    option("Ben: 9 km/h, faster than Amy's 0.2 km/h", '0.2 is how far Amy runs in each minute. Change 25 minutes to hours first.'),
                    option("Amy: 125 km/h, faster than Ben's 9 km/h", 'That multiplies 5 by 25. Speed = distance ÷ time.')
                ]
            }),
            card('check-2', { distance: 10, speed: null, time: 1.25 }, 'speed', {
                bankId: 'speed-distance-time-12', input: 'number', unit: 'km/h',
                prompt: "Jo walks for 2 hours at 5 km/h. Mel walks the same route in 1.25 hours. What is Mel's average speed?",
                answer: '8', rules: [
                    mistake(10, "10 km is the length of the route. Now divide it by Mel's time."),
                    mistake(6.25, "That multiplies Jo's speed by Mel's time. Find the length of the route first.")
                ], fallback: 'Find how far Jo walks. Mel walks the same distance.',
                feedback: 'The route is 5 × 2 = 10 km. 10 ÷ 1.25 = 8 km/h'
            }),
            card('check-3', { distance: null, speed: 120, time: toHours(0, 40) }, 'distance', {
                input: 'number', unit: 'km', prompt: 'A train goes at 120 km/h for 40 minutes. How far does it go?', answer: '80', rules: [
                    mistake(4800, 'That multiplies by 40 minutes. The speed is per hour, so change 40 minutes to hours.'),
                    mistake(48, '40 minutes is not 0.4 hours. Divide 40 by 60.'),
                    mistake(3, 'That divides. Distance = speed × time.')
                ], fallback: 'Change 40 minutes to hours first.', feedback: '40 minutes = 40 ÷ 60 hours. 120 × 40 ÷ 60 = 80 km'
            }),
            card('check-4', { distance: 90, speed: 60, time: null }, 'time', {
                bankId: 'speed-distance-time-09', input: 'choice',
                prompt: 'A coach leaves at 09:20. It goes 90 km at 60 km/h, then stops for 15 minutes. What time is it after the stop?',
                options: [
                    option('11:05', '90 ÷ 60 = 1.5 hours, which is 1 hour 30 minutes. 09:20 + 1 hour 30 minutes = 10:50. Add 15 minutes: 11:05.', true),
                    option('10:50', "That's when the coach stops. Add the 15-minute stop."),
                    option('11:25', '1.5 hours is 1 hour 30 minutes, not 1 hour 50 minutes.'),
                    option('1 hour 45 minutes', "That's how long it takes. The question asks for the time on the clock.")
                ]
            }),
            card('check-5', { distance: 60, speed: null, time: 3 }, 'speed', {
                bankId: 'speed-distance-time-07', input: 'choice',
                prompt: 'A rider goes 30 km in 1 hour. She comes back the same 30 km in 2 hours. What is her average speed for the whole trip?',
                options: [
                    option('20 km/h', 'The whole trip is 60 km in 3 hours. 60 ÷ 3 = 20 km/h', true),
                    option('22.5 km/h', "That's halfway between 30 and 15. The two parts take different times, so use the total distance ÷ total time."),
                    option('30 km/h', "That's only the way there."),
                    option('15 km/h', "That's only the way back.")
                ]
            }),
            card('check-6', { distance: 120, speed: null, time: 2.25 }, 'speed', {
                bankId: 'speed-distance-time-08', input: 'number', unit: 'mph', tolerance: 0.05,
                prompt: 'A driver goes 150 miles in 3 hours. The first 30 miles take 45 minutes. What is her average speed for the rest of the journey? Round to 1 decimal place.',
                answer: '53.3', rules: [
                    mistake(50, "That's the speed for the whole journey. Take off the first part first."),
                    mistake(40, "That's the speed for the first part.")
                ], fallback: 'Find the distance and time left, then divide.',
                feedback: '120 miles are left, in 2.25 hours. 120 ÷ 2.25 = 53.3 mph'
            })
        ];
    }

    function prepare(question, random) {
        return question.options ? { ...question, options: window.Maths1to9LessonEngine.shuffle(question.options, random) } : { ...question };
    }

    // Each session: the three typed types, and three of the four choice types.
    function pick(random) {
        const { shuffle, randomInt } = window.Maths1to9LessonEngine;
        const choices = shuffle(CHOICE_TYPES, random).slice(0, 3);
        return shuffle([...TYPED_TYPES, ...choices].map(type => ({ type, seed: randomInt(0, 4294967295, random) })), random);
    }

    // Keeps rules that differ from the answer, and from each other, by more than the tolerance.
    function cleanRules(answer, rules, tolerance = 0) {
        const kept = [];
        for (const rule of rules) {
            const value = Number(rule.value);
            if (value <= 0) continue;
            if ([answer, ...kept.map(each => Number(each.value))].some(other => Math.abs(other - value) <= tolerance + 1e-9)) continue;
            kept.push(rule);
        }
        return kept;
    }

    const steps = (from, to, by) => Array.from({ length: Math.round((to - from) / by) + 1 }, (_, index) => from + index * by);

    // Who travels, in which units, at which speeds.
    const SETTINGS = [
        { who: 'A car', subject: 'the car', owner: "the car's", verb: 'drives', unit: 'km/h', distance: 'km', speeds: steps(30, 120, 5) },
        { who: 'A train', subject: 'the train', owner: "the train's", verb: 'goes', unit: 'km/h', distance: 'km', speeds: steps(30, 120, 5) },
        { who: 'A cyclist', subject: 'the cyclist', owner: "the cyclist's", verb: 'rides', unit: 'km/h', distance: 'km', speeds: steps(10, 30, 1) },
        { who: 'Kim', subject: 'Kim', owner: "Kim's", verb: 'walks', unit: 'km/h', distance: 'km', speeds: steps(3, 6, 1) },
        { who: 'A lorry', subject: 'the lorry', owner: "the lorry's", verb: 'drives', unit: 'mph', distance: 'miles', speeds: steps(30, 70, 5) }
    ];

    // "1 hour 15 minutes", "2 hours 30 minutes"
    const hoursAndMinutes = (hours, minutes) => `${plural(hours, 'hour')} ${minutes} minutes`;

    function generate(item, random) {
        const { randomInt } = window.Maths1to9LessonEngine;
        const int = (a, b) => randomInt(a, b, random);
        const choose = values => values[int(0, values.length - 1)];
        const type = item.type;
        if (!practiceTypes.includes(type)) throw new TypeError(`Unknown speed question type: ${type}`);
        let question;

        if (type === 'find-speed') {
            const place = choose(SETTINGS);
            const speed = choose(place.speeds);
            const time = int(2, 6);
            const distance = speed * time;
            question = card(type, { distance, speed: null, time }, 'speed', {
                input: 'number', unit: place.unit,
                prompt: `${place.who} ${place.verb} ${distance} ${place.distance} in ${time} hours. What is ${place.owner} average speed?`,
                answer: number(speed), rules: cleanRules(speed, [
                    mistake(distance * time, 'That multiplies. Share the distance between the hours: divide.'),
                    mistake(distance - time, `You can't take hours away from ${place.distance}. Divide.`)
                ]),
                fallback: 'Speed = distance ÷ time.',
                feedback: `${distance} ÷ ${time} = ${number(speed)} ${place.unit}`
            });
        } else if (type === 'find-distance') {
            const place = choose(SETTINGS);
            const speed = choose(place.speeds);
            const time = choose([1.5, 2, 2.5, 3, 4, 5]);
            const distance = Number(number(speed * time));
            question = card(type, { distance: null, speed, time }, 'distance', {
                input: 'number', unit: place.distance,
                prompt: `${place.who} ${place.verb} at ${speed} ${place.unit} for ${plural(time, 'hour')}. How far does ${place.subject} go?`,
                answer: number(distance), rules: cleanRules(distance, [
                    mistake(round(speed / time, 2), 'That divides. Speed × time gives the distance.'),
                    mistake(speed + time, `That adds. It goes ${speed} ${place.distance} in each hour, so multiply.`)
                ]),
                fallback: 'Distance = speed × time.',
                feedback: `${speed} × ${number(time)} = ${number(distance)} ${place.distance}`
            });
        } else if (type === 'find-time') {
            const place = choose(SETTINGS);
            let speed;
            let time;
            do {
                speed = choose(place.speeds);
                time = choose(steps(0.5, 5, 0.25));
            } while (!Number.isInteger(Number(number(speed * time))));
            const distance = Number(number(speed * time));
            question = card(type, { distance, speed, time: null }, 'time', {
                bankId: 'speed-distance-time-04', input: 'number', unit: 'hours',
                prompt: `${place.who} ${place.verb} ${distance} ${place.distance} at ${speed} ${place.unit}. How many hours does the journey take?`,
                answer: number(time), rules: cleanRules(time, [
                    mistake(distance * speed, `That multiplies. See how many ${speed} ${place.distance} blocks fit into ${distance} ${place.distance}: divide.`),
                    mistake(distance - speed, "Taking away doesn't give a time. Divide distance by speed.")
                ]),
                fallback: 'Cover T: distance ÷ speed.',
                feedback: `${distance} ÷ ${speed} = ${number(time)} hours`
            });
        } else if (type === 'which-calculation') {
            const place = choose(SETTINGS);
            const speed = choose(place.speeds);
            const time = int(2, 6);
            const distance = speed * time;
            const unknown = choose(['speed', 'time', 'distance']);
            const d = `${distance}`;
            const s = `${speed}`;
            const t = `${time}`;
            const wrongWay = `That's the wrong way round. ${place.unit} means ${place.distance} ÷ hours, so the distance goes first.`;
            const noTakeAway = `You can't take away hours and ${place.distance}. ${unknown === 'distance' ? 'Multiply' : 'Divide'}.`;
            let prompt;
            let options;
            if (unknown === 'speed') {
                prompt = `${place.who} ${place.verb} ${d} ${place.distance} in ${t} hours. Which calculation finds ${place.owner} speed?`;
                options = [
                    option(`${d} ÷ ${t}`, `Speed = distance ÷ time. ${place.unit} means ${place.distance} ÷ hours.`, true),
                    option(`${t} ÷ ${d}`, wrongWay),
                    option(`${d} × ${t}`, 'Multiplying gives far more than the distance in one hour. Speed = distance ÷ time.'),
                    option(`${d} − ${t}`, noTakeAway)
                ];
            } else if (unknown === 'time') {
                prompt = `${place.who} ${place.verb} ${d} ${place.distance} at ${s} ${place.unit}. Which calculation finds how long the journey takes?`;
                options = [
                    option(`${d} ÷ ${s}`, `Time = distance ÷ speed. See how many ${s} ${place.distance} blocks fit into ${d} ${place.distance}.`, true),
                    option(`${s} ÷ ${d}`, `That's the wrong way round. See how many ${s} ${place.distance} blocks fit into ${d} ${place.distance}: ${d} ÷ ${s}.`),
                    option(`${d} × ${s}`, 'Multiplying finds a distance, not a time. Cover T: distance ÷ speed.'),
                    option(`${d} − ${s}`, "Taking away doesn't give a time. Divide distance by speed.")
                ];
            } else {
                prompt = `${place.who} ${place.verb} at ${s} ${place.unit} for ${t} hours. Which calculation finds how far ${place.subject} goes?`;
                options = [
                    option(`${s} × ${t}`, `Distance = speed × time. It goes ${s} ${place.distance} in each of the ${t} hours.`, true),
                    option(`${s} ÷ ${t}`, 'Dividing finds a speed or a time. Cover D: speed × time.'),
                    option(`${t} ÷ ${s}`, `That divides hours by ${place.unit}, which gives a tiny number. Distance = speed × time.`),
                    option(`${s} + ${t}`, `You can't add hours and ${place.unit}. Multiply.`)
                ];
            }
            question = card(type, { distance: unknown === 'distance' ? null : distance, speed: unknown === 'speed' ? null : speed, time: unknown === 'time' ? null : time },
                'calculation', { input: 'choice', prompt, options });
        } else if (type === 'minutes-speed') {
            const place = choose([
                { who: 'A van', unit: 'mph', distance: 'miles' },
                { who: 'A car', unit: 'km/h', distance: 'km' }
            ]);
            let minutes;
            let speed;
            let distance;
            let labels;
            do {
                minutes = choose([10, 12, 15, 20, 30, 40, 45]);
                speed = int(12, 84);
                distance = Number(number(speed * minutes / 60));
                labels = [speed, round(distance / minutes, 2), round(distance / (minutes / 100), 2), round(distance * minutes, 2)];
            } while (!Number.isInteger(round(distance * 100, 6)) || new Set(labels).size < 4);
            const [right, perMinute, slip, times] = labels.map(value => `${number(value)} ${place.unit}`);
            question = card(type, { distance, speed: null, time: toHours(0, minutes) }, 'speed', {
                bankId: 'speed-distance-time-03', input: 'choice',
                prompt: `${place.who} goes ${number(distance)} ${place.distance} in ${minutes} minutes. What is its average speed in ${place.unit}?`,
                options: [
                    option(right, `${minutes} minutes = ${minutes} ÷ 60 hours. ${number(distance)} ÷ (${minutes} ÷ 60) = ${right}`, true),
                    option(perMinute, `That's how far it goes in each minute. ${place.unit} needs hours: ${minutes} minutes is ${minutes} ÷ 60 hours.`),
                    option(slip, `${minutes} minutes is not 0.${minutes} hours. Divide by 60, not 100.`),
                    option(times, 'That multiplies. Speed = distance ÷ time.')
                ]
            });
        } else if (type === 'minutes-distance') {
            const place = choose([
                { who: 'A bus', unit: 'km/h', distance: 'km' },
                { who: 'A lorry', unit: 'mph', distance: 'miles' }
            ]);
            let hours;
            let minutes;
            let speed;
            let labels;
            let time;
            do {
                hours = int(1, 3);
                minutes = choose([15, 30, 45]);
                speed = 4 * int(5, 20);
                time = toHours(hours, minutes);
                labels = [speed * time, round(speed * (hours + minutes / 100), 2), round(speed / time, 2), speed * (60 * hours + minutes)];
            } while (new Set(labels).size < 4);
            const [right, slip, divided, inMinutes] = labels.map(value => `${number(value)} ${place.distance}`);
            question = card(type, { distance: null, speed, time }, 'distance', {
                bankId: 'speed-distance-time-02', input: 'choice',
                prompt: `${place.who} goes at ${speed} ${place.unit} for ${hoursAndMinutes(hours, minutes)}. How far does it go?`,
                options: [
                    option(right, `${hoursAndMinutes(hours, minutes)} = ${number(time)} hours. ${speed} × ${number(time)} = ${right}`, true),
                    option(slip, `${hoursAndMinutes(hours, minutes)} is not ${hours}.${minutes} hours. Divide the minutes by 60.`),
                    option(divided, 'That divides. Distance = speed × time.'),
                    option(inMinutes, 'That multiplies by the minutes. The speed is per hour, so use hours.')
                ]
            });
        } else {
            // The car that goes further is the slower one.
            let fast;
            let slow;
            let fastTime;
            let slowTime;
            do {
                fast = 10 * int(4, 9);
                slow = 10 * int(3, 8);
                fastTime = int(2, 5);
                slowTime = int(3, 6);
            } while (slow >= fast || fast * fastTime >= slow * slowTime);
            const fastIsA = int(0, 1) === 0;
            const [fastName, slowName] = fastIsA ? ['Car A', 'Car B'] : ['Car B', 'Car A'];
            const fastDistance = fast * fastTime;
            const slowDistance = slow * slowTime;
            const journey = (name, distance, time) => `${name} goes ${distance} km in ${time} hours.`;
            const sentences = fastIsA
                ? [journey('Car A', fastDistance, fastTime), journey('Car B', slowDistance, slowTime)]
                : [journey('Car A', slowDistance, slowTime), journey('Car B', fastDistance, fastTime)];
            const working = fastIsA
                ? `Car A: ${fastDistance} ÷ ${fastTime} = ${fast} km/h. Car B: ${slowDistance} ÷ ${slowTime} = ${slow} km/h.`
                : `Car A: ${slowDistance} ÷ ${slowTime} = ${slow} km/h. Car B: ${fastDistance} ÷ ${fastTime} = ${fast} km/h.`;
            question = card(type, { distance: fastDistance, speed: null, time: fastTime }, 'compare', {
                input: 'choice', prompt: `${sentences.join(' ')} Which car is faster?`,
                options: [
                    option(`${fastName}: ${fast} km/h, faster than ${slow} km/h`, working, true),
                    option(`${slowName}, because it goes further`, `${slowName} goes further, but it drives for longer. Compare how far each car goes in one hour.`),
                    option(`${slowName}: ${slowDistance * slowTime} km/h, faster than ${fastDistance * fastTime} km/h`,
                        'That multiplies distance by time. Speed = distance ÷ time.'),
                    option('They go at the same speed', "Work out each speed: distance ÷ time. They're different.")
                ]
            });
        }
        return prepare(question, random);
    }

    window.SpeedDistanceTime = {
        number, toHours, learnScreens, examples, checks,
        practiceTypes, TYPED_TYPES, CHOICE_TYPES, pick, generate, prepare
    };
})();
