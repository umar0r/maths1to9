(() => {
    'use strict';

    const two = value => String(value).padStart(2, '0');
    const clock = (hours, minutes) => `${two(hours)}:${two(minutes)}`;
    const split = value => {
        const [hours, minutes] = value.split(':').map(Number);
        return { hours, minutes };
    };
    const minutesOf = value => {
        const { hours, minutes } = split(value);
        return hours * 60 + minutes;
    };
    const clockFrom = total => clock(Math.floor(total / 60), total % 60);
    const hourWord = count => `${count} ${count === 1 ? 'hour' : 'hours'}`;
    const minuteWord = count => `${count} ${count === 1 ? 'minute' : 'minutes'}`;
    const lengthText = total => {
        const hours = Math.floor(total / 60);
        const minutes = total % 60;
        if (hours === 0) return minuteWord(minutes);
        if (minutes === 0) return hourWord(hours);
        return `${hourWord(hours)} ${minuteWord(minutes)}`;
    };
    const option = (label, feedback, correct = false) => ({ label: String(label), feedback, correct });
    const mistake = (value, feedback) => ({ value, feedback });
    const fields = [{ id: 'hours', label: 'Hours', unit: 'hours' }, { id: 'minutes', label: 'Minutes', unit: 'minutes' }];
    const pair = (hours, minutes) => ({ hours: String(hours), minutes: String(minutes) });
    const practiceTypes = ['hop', 'same-hour', 'cross-hour', 'jumps', 'hours-and-minutes', 'calculator'];

    // What Practice asks about. Journeys "leave ... arrive"; the rest "start ... end".
    const SETTINGS = [
        { subject: 'A bus', travel: true, noun: 'journey' },
        { subject: 'A train', travel: true, noun: 'journey' },
        { subject: 'A film', travel: false, noun: 'film' },
        { subject: 'A football match', travel: false, noun: 'match' },
        { subject: 'A swim session', travel: false, noun: 'session' },
        { subject: 'A car journey', travel: true, noun: 'journey' }
    ];

    const startsAt = (setting, time) => `${setting.subject} ${setting.travel ? 'leaves' : 'starts'} at ${time}`;
    const endsAt = (setting, time) => `${setting.subject} ${setting.travel ? 'arrives' : 'ends'} at ${time}`;
    const minutesQuestion = setting => setting.travel
        ? 'How many minutes is the journey?' : 'How many minutes long is it?';
    const lengthQuestion = setting => setting.travel
        ? 'How long is the journey?' : `How long is the ${setting.noun}?`;

    // Each Learn screen shows, then offers a slider. Nothing is asked.
    const learnScreens = [
        {
            kind: 'counters',
            title: 'Clocks only count to 59',
            lines: [
                "In this lesson, you'll learn how to work out how long it is from one time to another. For example, how long a film lasts.",
                'Move the slider to add 1 each time.',
                'A normal number goes up to 159, then 160. A clock goes up to 01:59, then 02:00. Clock minutes only go up to 59. Then the clock moves on to the next hour.'
            ],
            callout: '60 minutes = 1 hour.',
            slider: 'Add 1 minute',
            values: [0, 1, 2, 3, 4],
            start: 0,
            counters: { number: 158, clock: '01:58' }
        },
        {
            kind: 'compare',
            title: 'Why taking away goes wrong',
            slider: 'Example',
            values: [1, 2],
            start: 1,
            examples: [
                {
                    tone: 'green',
                    clocks: ['10:12', '10:47'],
                    working: '47 − 12 = 35 minutes',
                    mark: '✓',
                    lines: [
                        'A bus leaves at 10:12 and arrives at 10:47. Both times are in the same hour. So you can just take away the minutes: 35 minutes.'
                    ]
                },
                {
                    tone: 'red',
                    clocks: ['10:35', '13:10'],
                    calculator: '13.10 − 10.35 = 2.75',
                    wrong: '2 hours 75 minutes?',
                    lines: [
                        'A film starts at 10:35 and ends at 13:10. The hour changes, so taking away goes wrong. A calculator thinks an hour has 100 minutes. But a clock never shows 75 minutes.',
                        'So when the hour changes, count up in jumps instead.'
                    ]
                }
            ]
        },
        {
            kind: 'timeline',
            title: 'Hop, then land',
            times: ['08:50', '09:00', '09:10'],
            arcs: [
                { from: 0, to: 1, label: '+10 min', tone: 'blue' },
                { from: 1, to: 2, label: '+10 min', tone: 'green' }
            ],
            steps: [
                {
                    stops: [0, 2], arcs: 0,
                    lines: [{ text: "Taking away gives 910 − 850 = 60. But the journey isn't 60 minutes long.", tone: 'grey' }]
                },
                {
                    stops: [0, 1, 2], arcs: 1,
                    lines: [{ text: 'Hop to 09:00: 10 minutes.', tone: 'blue' }]
                },
                {
                    stops: [0, 1, 2], arcs: 2,
                    lines: [
                        { text: 'Hop to 09:00: 10 minutes.', tone: 'blue' },
                        { text: 'Land on 09:10: 10 minutes.', tone: 'green' },
                        { text: '10 + 10 = 20 minutes', tone: 'dark' }
                    ]
                }
            ],
            lines: [
                "First, hop to the next o'clock. That's the next time that ends in :00. From 08:50, the next o'clock is 09:00.",
                'Then land on the end time. Add the jumps to find how long.'
            ],
            slider: 'Show the jumps',
            start: 1
        },
        {
            kind: 'hop-size',
            title: 'How long is the hop?',
            lines: [
                'The hop is the number of minutes you need to make 60.',
                'From 14:45 you need 15 more minutes to make 60. So the hop is 15 minutes.'
            ],
            callout: 'Use 60, not 100. From 14:45 the hop is 15 minutes, not 55.',
            slider: 'Start time',
            values: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55],
            start: 45,
            hour: 14,
            end: '15:00'
        },
        {
            kind: 'timeline',
            title: 'Skip whole hours',
            times: ['09:40', '10:00', '11:00', '11:15'],
            arcs: [
                { from: 0, to: 1, label: '+20 min', tone: 'blue' },
                { from: 1, to: 2, label: '+1 hour', tone: 'purple' },
                { from: 2, to: 3, label: '+15 min', tone: 'green' }
            ],
            steps: [
                { stops: [0, 3], arcs: 0, lines: [] },
                {
                    stops: [0, 1, 3], arcs: 1,
                    lines: [{ text: 'Hop to 10:00: 20 minutes.', tone: 'blue' }]
                },
                {
                    stops: [0, 1, 2, 3], arcs: 2,
                    lines: [
                        { text: 'Hop to 10:00: 20 minutes.', tone: 'blue' },
                        { text: 'Skip to 11:00: 1 hour.', tone: 'purple' }
                    ]
                },
                {
                    stops: [0, 1, 2, 3], arcs: 3,
                    lines: [
                        { text: 'Hop to 10:00: 20 minutes.', tone: 'blue' },
                        { text: 'Skip to 11:00: 1 hour.', tone: 'purple' },
                        { text: 'Land on 11:15: 15 minutes.', tone: 'green' },
                        { text: '20 + 15 = 35 minutes, plus 1 hour = 1 hour 35 minutes', tone: 'dark' }
                    ]
                }
            ],
            lines: [
                'Sometimes there are whole hours in the middle. Skip them all in one jump. This is the skip.',
                'From 10:00 to 11:00 is 1 hour.'
            ],
            slider: 'Show the jumps',
            start: 1
        },
        {
            kind: 'timeline',
            title: '60 minutes make 1 hour',
            times: ['08:14', '09:00', '09:22'],
            arcs: [
                { from: 0, to: 1, label: '+46 min', tone: 'blue' },
                { from: 1, to: 2, label: '+22 min', tone: 'green' }
            ],
            steps: [
                { stops: [0, 1, 2], arcs: 2, lines: [] },
                {
                    stops: [0, 1, 2], arcs: 2, cells: 68, split: 0,
                    lines: [{ text: '46 + 22 = 68 minutes', tone: 'dark' }]
                },
                {
                    stops: [0, 1, 2], arcs: 2, cells: 68, split: 60,
                    lines: [{ text: '68 minutes = 1 hour 8 minutes', tone: 'dark' }]
                }
            ],
            lines: [
                'Sometimes the hop and the land add up to 60 minutes or more.',
                "Every 60 minutes make 1 hour. Take 60 away, and what's left is the minutes."
            ],
            callout: 'Count in 60s, not 100s. 68 minutes is 1 hour 8 minutes.',
            slider: 'Show the steps',
            start: 1
        },
        {
            kind: 'timeline',
            title: 'Hop, skip, land, add',
            question: 'A coach leaves at 13:36 and arrives at 16:20. How long is the journey?',
            times: ['13:36', '14:00', '16:00', '16:20'],
            arcs: [
                { from: 0, to: 1, label: '+24 min', tone: 'blue' },
                { from: 1, to: 2, label: '+2 hours', tone: 'purple' },
                { from: 2, to: 3, label: '+20 min', tone: 'green' }
            ],
            steps: [
                {
                    // The whole journey stays on the line; each step adds its
                    // arc and the time it reaches.
                    stops: [0, 1, 3], arcs: 1,
                    lines: [{ label: 'Hop', text: '13:36 → 14:00 = 24 minutes', tone: 'blue' }]
                },
                {
                    stops: [0, 1, 2, 3], arcs: 2,
                    lines: [
                        { label: 'Hop', text: '13:36 → 14:00 = 24 minutes', tone: 'blue' },
                        { label: 'Skip', text: '14:00 → 16:00 = 2 hours', tone: 'purple' }
                    ]
                },
                {
                    stops: [0, 1, 2, 3], arcs: 3,
                    lines: [
                        { label: 'Hop', text: '13:36 → 14:00 = 24 minutes', tone: 'blue' },
                        { label: 'Skip', text: '14:00 → 16:00 = 2 hours', tone: 'purple' },
                        { label: 'Land', text: '16:00 → 16:20 = 20 minutes', tone: 'green' }
                    ]
                },
                {
                    stops: [0, 1, 2, 3], arcs: 3,
                    lines: [
                        { label: 'Hop', text: '13:36 → 14:00 = 24 minutes', tone: 'blue' },
                        { label: 'Skip', text: '14:00 → 16:00 = 2 hours', tone: 'purple' },
                        { label: 'Land', text: '16:00 → 16:20 = 20 minutes', tone: 'green' },
                        { label: 'Add', text: '24 + 20 = 44 minutes, plus 2 hours = 2 hours 44 minutes', tone: 'dark' }
                    ]
                },
                {
                    stops: [0, 1, 2, 3], arcs: 3,
                    lines: [
                        { label: 'Hop', text: '13:36 → 14:00 = 24 minutes', tone: 'blue' },
                        { label: 'Skip', text: '14:00 → 16:00 = 2 hours', tone: 'purple' },
                        { label: 'Land', text: '16:00 → 16:20 = 20 minutes', tone: 'green' },
                        { label: 'Add', text: '24 + 20 = 44 minutes, plus 2 hours = 2 hours 44 minutes', tone: 'dark' },
                        { label: 'In minutes', text: 'Each hour is 60 minutes.', tone: 'dark' },
                        { text: '24 + 60 + 60 + 20 = 164 minutes', tone: 'dark' }
                    ]
                }
            ],
            lines: [
                'Use these steps for every question.',
                'If the question asks for minutes, turn each hour into 60 minutes.'
            ],
            slider: 'Show the steps',
            start: 1
        }
    ];

    function card(questionType, values, asked, config) {
        return { questionType, values, asked, ...config };
    }

    function examples() {
        return [
            card('try-1', { start: '14:45', end: '15:00' }, 'hop', {
                input: 'choice',
                prompt: 'How many minutes is it from 14:45 to 15:00?',
                options: [
                    option('15 minutes', '45 + 15 = 60. So the hop to 15:00 is 15 minutes.', true),
                    option('55 minutes', "That's 100 − 45. An hour has 60 minutes, not 100."),
                    option('45 minutes', '45 is the minutes already gone since 14:00. Count on from 45 to 60.'),
                    option('60 minutes', "That's a whole hour. From 14:45 you only need to get to 15:00.")
                ]
            }),
            card('try-2', { start: '10:12', end: '10:47' }, 'minutes', {
                input: 'number', unit: 'minutes',
                prompt: 'A bus leaves at 10:12 and arrives at 10:47. How many minutes is the journey?',
                answer: '35',
                rules: [
                    mistake('59', 'That adds the minutes. Both times are in the same hour, so take away: 47 − 12.'),
                    mistake('47', '47 is the minutes when it arrives. Take away the 12 minutes when it leaves.')
                ],
                fallback: 'Both times are in the same hour. Take away the minutes.',
                feedback: '47 − 12 = 35 minutes'
            }),
            card('try-3', { start: '16:48', end: '17:21' }, 'minutes', {
                input: 'number', unit: 'minutes',
                prompt: 'A cake goes into the oven at 16:48. It comes out at 17:21. How many minutes is it in the oven?',
                answer: '33',
                rules: [
                    mistake('73', 'That takes away like normal numbers: 1721 − 1648. Minutes only go up to 59. Hop to 17:00 first.'),
                    mistake('27', "That's 48 − 21. It misses the change of hour. Hop to 17:00 first."),
                    mistake('21', '21 minutes is only the land, after 17:00. Add the hop from 16:48 to 17:00.'),
                    mistake('12', '12 minutes is the hop to 17:00. Now add the land: 21 more minutes.')
                ],
                fallback: 'Hop from 16:48 to 17:00. Then land on 17:21. Add the jumps.',
                feedback: 'Hop 12 minutes, land 21 minutes. 12 + 21 = 33 minutes'
            }),
            card('try-4', { start: '07:35', end: '09:20' }, 'jumps', {
                input: 'choice',
                prompt: 'Which jumps go from 07:35 to 09:20?',
                options: [
                    option('+25 min, +1 hour, +20 min', 'Hop to 08:00, skip to 09:00, land on 09:20.', true),
                    option('+35 min, +1 hour, +20 min', '35 is the minutes already gone since 07:00. The hop is what you need to make 60: 25 minutes.'),
                    option('+25 min, +2 hours, +20 min', 'The hop already takes you to 08:00. From 08:00 to 09:00 is only 1 hour.'),
                    option('+25 min, +1 hour', 'That stops at 09:00. Land on 09:20: add 20 more minutes.')
                ]
            }),
            card('try-5', { start: '15:48', end: '17:05' }, 'hours-minutes', {
                input: 'number', fractions: true, fields,
                prompt: 'A coach leaves at 15:48 and arrives at 17:05. How long is the journey?',
                answer: pair(1, 17),
                rules: [
                    mistake(pair(1, 57), 'That takes away like normal numbers. Minutes only go up to 59. Hop to 16:00 first.'),
                    mistake(pair(0, 17), 'You also need the skip from 16:00 to 17:00: 1 hour.'),
                    mistake(pair(2, 17), 'The hop already takes you to 16:00. From 16:00 to 17:00 is only 1 hour.')
                ],
                fallback: 'Hop to 16:00, skip to 17:00, then land on 17:05.',
                feedback: 'Hop 12 minutes, skip 1 hour, land 5 minutes. That\'s 1 hour 17 minutes'
            }),
            card('try-6', null, 'convert', {
                input: 'choice',
                prompt: 'The jumps add up to 85 minutes. How long is that in hours and minutes?',
                options: [
                    option('1 hour 25 minutes', '85 − 60 = 25. So 85 minutes is 1 hour 25 minutes.', true),
                    option('1 hour 85 minutes', 'That adds an hour but doesn\'t take 60 minutes away. 85 − 60 = 25.'),
                    option('1 hour 15 minutes', "That's 100 − 85. Take 60 away from 85 instead."),
                    option('8 hours 5 minutes', 'That splits the digits. 85 minutes is less than 2 hours. Take 60 away: 85 − 60 = 25.')
                ]
            }),
            card('try-7', { start: '18:25', end: '20:10' }, 'minutes', {
                input: 'number', unit: 'minutes',
                prompt: 'A film starts at 18:25 and ends at 20:10. How many minutes long is it?',
                answer: '105',
                rules: [
                    mistake('145', "That's 1 hour 85 minutes, from taking away like normal numbers. Minutes only go up to 59. Hop to 19:00 first."),
                    mistake('45', 'You also need the skip from 19:00 to 20:00. That\'s 60 more minutes.'),
                    mistake('165', 'The hop already takes you to 19:00. From 19:00 to 20:00 is only 1 hour: 60 minutes.')
                ],
                fallback: 'Hop to 19:00, skip to 20:00, land on 20:10. Each hour is 60 minutes.',
                feedback: '35 + 60 + 10 = 105 minutes'
            }),
            card('try-8', null, 'shortest', {
                input: 'choice',
                prompt: 'Three trains go to the same place. Train A leaves at 08:20 and arrives at 09:15. Train B leaves at 08:45 and arrives at 09:52. Train C leaves at 09:30 and arrives at 10:08. Which train has the shortest journey?',
                trips: [
                    { label: 'Train A', start: '08:20', end: '09:15' },
                    { label: 'Train B', start: '08:45', end: '09:52' },
                    { label: 'Train C', start: '09:30', end: '10:08' }
                ],
                options: [
                    option('Train C: 38 minutes', 'A takes 55 minutes, B takes 67 minutes and C takes 38 minutes. C is the shortest.', true),
                    option('Train B: 7 minutes', '52 − 45 = 7 misses the change of hour. From 08:45 to 09:52 is 67 minutes.'),
                    option('Train A: it leaves first', "Leaving first doesn't make the journey shortest. Train A takes 55 minutes."),
                    option('Train A: it arrives first', 'Train A arrives first because it left first. Its journey takes 55 minutes.')
                ]
            }),
            card('try-9', { start: '08:30', end: '17:45' }, 'hours-minutes', {
                input: 'number', fractions: true, fields,
                prompt: 'A shop opens at 08:30 and closes at 17:45. How long is it open?',
                answer: pair(9, 15),
                rules: [
                    mistake(pair(8, 75), '75 minutes is more than an hour. Turn 60 of them into 1 hour.'),
                    mistake(pair(8, 15), '30 + 45 = 75 minutes. That\'s 1 hour 15 minutes, so add the extra hour.'),
                    mistake(pair(10, 15), 'The hop already takes you to 09:00. Skip from 09:00 to 17:00: 8 hours.')
                ],
                fallback: 'Hop to 09:00, skip to 17:00, land on 17:45. Then add the jumps.',
                feedback: '30 + 45 = 75 minutes = 1 hour 15 minutes. Add the 8 hours: 9 hours 15 minutes'
            }),
            card('try-10', { start: '12:40', end: '15:25' }, 'calculator', {
                input: 'choice',
                prompt: 'Sam works out the time from 12:40 to 15:25 on a calculator: 15.25 − 12.40 = 2.85. Sam says it\'s 2 hours 85 minutes. How long is it really?',
                options: [
                    option('2 hours 45 minutes', 'Hop 20 minutes, skip 2 hours, land 25 minutes. 20 + 25 = 45.', true),
                    option('2 hours 85 minutes', 'Minutes only go up to 59. A clock never shows 85 minutes.'),
                    option('3 hours 25 minutes', "That turns Sam's 85 minutes into hours. But 85 is wrong to begin with. Count up in jumps."),
                    option('2 hours 20 minutes', 'That stops at 15:00. Land on 15:25: add 25 more minutes.')
                ]
            })
        ];
    }

    function checks() {
        return [
            card('check-1', { start: '13:50', end: '14:35' }, 'minutes', {
                input: 'number', unit: 'minutes',
                prompt: 'A lesson starts at 13:50 and ends at 14:35. How many minutes long is it?',
                answer: '45',
                rules: [
                    mistake('85', 'That takes away like normal numbers: 1435 − 1350. Minutes only go up to 59. Hop to 14:00 first.'),
                    mistake('15', "That's 50 − 35. It misses the change of hour. Hop to 14:00 first."),
                    mistake('35', 'That\'s only the land, after 14:00. Add the hop from 13:50 to 14:00.')
                ],
                fallback: 'Hop to 14:00, then land on 14:35. Add the jumps.',
                feedback: 'Hop 10 minutes, land 35 minutes. 10 + 35 = 45 minutes'
            }),
            card('check-2', { start: '19:25', end: '21:50' }, 'hours-minutes', {
                input: 'choice',
                prompt: 'A play starts at 19:25 and ends at 21:50. How long is it?',
                options: [
                    option('2 hours 25 minutes', 'Hop 35 minutes, skip 1 hour, land 50 minutes. 35 + 50 = 85 minutes = 1 hour 25 minutes. Add the 1 hour.', true),
                    option('1 hour 85 minutes', '85 minutes is more than an hour. Turn 60 of them into 1 hour.'),
                    option('1 hour 25 minutes', '35 + 50 = 85 minutes, which is 1 hour 25 minutes. You still need to add the 1 hour skip.'),
                    option('3 hours 25 minutes', 'The hop already takes you to 20:00. From 20:00 to 21:00 is only 1 hour.')
                ]
            }),
            card('check-3', { start: '06:47', end: '10:12' }, 'hours-minutes', {
                input: 'number', fractions: true, fields,
                prompt: 'A train leaves at 06:47 and arrives at 10:12. How long is the journey?',
                answer: pair(3, 25),
                rules: [
                    mistake(pair(3, 65), 'That takes away like normal numbers. Minutes only go up to 59. Hop to 07:00 first.'),
                    mistake(pair(0, 25), 'You also need the skip from 07:00 to 10:00: 3 hours.'),
                    mistake(pair(4, 25), 'The hop already takes you to 07:00. From 07:00 to 10:00 is 3 hours.'),
                    mistake(pair(3, 13), 'That stops at 10:00. Land on 10:12: add 12 more minutes.')
                ],
                fallback: 'Hop to 07:00, skip to 10:00, land on 10:12.',
                feedback: 'Hop 13 minutes, skip 3 hours, land 12 minutes. That\'s 3 hours 25 minutes'
            }),
            card('check-4', null, 'shortest', {
                input: 'choice',
                prompt: 'Bus A leaves at 13:15 and arrives at 14:05. Bus B leaves at 13:40 and arrives at 14:48. Bus C leaves at 14:35 and arrives at 15:12. Which bus has the shortest journey?',
                trips: [
                    { label: 'Bus A', start: '13:15', end: '14:05' },
                    { label: 'Bus B', start: '13:40', end: '14:48' },
                    { label: 'Bus C', start: '14:35', end: '15:12' }
                ],
                options: [
                    option('Bus C: 37 minutes', 'A takes 50 minutes, B takes 68 minutes and C takes 37 minutes. C is the shortest.', true),
                    option('Bus B: 8 minutes', '48 − 40 = 8 misses the change of hour. From 13:40 to 14:48 is 68 minutes.'),
                    option('Bus A: it leaves first', "Leaving first doesn't make the journey shortest. Bus A takes 50 minutes."),
                    option('Bus A: it arrives first', 'Bus A arrives first because it left first. Its journey takes 50 minutes.')
                ]
            }),
            card('check-5', { start: '16:38', end: '18:05' }, 'minutes', {
                input: 'number', unit: 'minutes',
                prompt: 'Mia starts her homework at 16:38 and finishes at 18:05. How many minutes does it take?',
                answer: '87',
                rules: [
                    mistake('127', "That's 1 hour 67 minutes, from taking away like normal numbers. Minutes only go up to 59. Hop to 17:00 first."),
                    mistake('27', 'You also need the skip from 17:00 to 18:00. That\'s 60 more minutes.'),
                    mistake('147', 'The hop already takes you to 17:00. From 17:00 to 18:00 is only 1 hour: 60 minutes.')
                ],
                fallback: 'Hop to 17:00, skip to 18:00, land on 18:05. Each hour is 60 minutes.',
                feedback: '22 + 60 + 5 = 87 minutes'
            }),
            card('check-6', { start: '09:50', end: '10:20' }, 'calculator', {
                input: 'choice',
                prompt: "Ben says: '09:50 to 10:20 is 70 minutes, because 1020 − 950 = 70.' How long is it really?",
                options: [
                    option('30 minutes', 'Hop 10 minutes to 10:00, then land 20 minutes on 10:20. 10 + 20 = 30.', true),
                    option('70 minutes', 'Ben took away like normal numbers. Minutes only go up to 59. Hop to 10:00 first.'),
                    option('1 hour 10 minutes', "That turns Ben's 70 minutes into hours. But 70 is wrong to begin with. Count up in jumps."),
                    option('20 minutes', "That's only the land, after 10:00. Add the hop from 09:50 to 10:00.")
                ]
            })
        ];
    }

    function prepare(question, random) {
        return question.options
            ? { ...question, options: window.Maths1to9LessonEngine.shuffle(question.options, random) }
            : { ...question };
    }

    function pick(random) {
        const { shuffle, randomInt } = window.Maths1to9LessonEngine;
        return shuffle(practiceTypes.map(type => ({ type, seed: randomInt(0, 4294967295, random) })), random);
    }

    // Keeps rules that differ from the answer and from each other. A minutes
    // answer or rule must be a positive whole number; the hours field of a
    // rule may be 0, because "0 hours 25 minutes" is a real pupil answer.
    function cleanRules(answer, rules) {
        const hourRules = fields.some(field => Object.hasOwn(answer, field.id));
        const kept = [];
        if (hourRules) {
            const same = (first, second) => first.hours === second.hours && first.minutes === second.minutes;
            for (const rule of rules) {
                const value = rule.value;
                const hours = Number(value?.hours);
                const minutes = Number(value?.minutes);
                if (!Number.isInteger(hours) || !Number.isInteger(minutes)) continue;
                if (hours < 0 || minutes < 0) continue;
                if (hours * 60 + minutes <= 0) continue;
                if ([answer, ...kept.map(each => each.value)].some(other => same(other, value))) continue;
                kept.push(rule);
            }
        } else {
            const target = Number(answer);
            for (const rule of rules) {
                const value = Number(rule.value);
                if (!Number.isInteger(value) || value <= 0) continue;
                if ([target, ...kept.map(each => Number(each.value))].some(other => other === value)) continue;
                kept.push(rule);
            }
        }
        return kept;
    }

    // The minutes of one hour a pupil counts on from.
    const hopFrom = minutes => 60 - minutes;
    const jumpLabel = minutes => `+${minutes} min`;

    function generate(item, random) {
        const { randomInt, shuffle } = window.Maths1to9LessonEngine;
        const int = (low, high) => randomInt(low, high, random);
        const choose = values => values[int(0, values.length - 1)];
        const type = item.type;
        if (!practiceTypes.includes(type)) throw new TypeError(`Unknown time-between-two-times question type: ${type}`);
        let question;

        if (type === 'hop') {
            const hour = int(7, 20);
            let minutes;
            do { minutes = int(1, 59); } while ([30, 40, 50].includes(minutes));
            const hop = hopFrom(minutes);
            const next = clock(hour + 1, 0);
            question = card(type, { start: clock(hour, minutes), end: next }, 'hop', {
                input: 'choice',
                prompt: `How many minutes is it from ${clock(hour, minutes)} to ${next}?`,
                options: [
                    option(minuteWord(hop), `${minutes} + ${hop} = 60. So the hop is ${hop} minutes.`, true),
                    option(minuteWord(100 - minutes), `That's 100 − ${minutes}. An hour has 60 minutes, not 100.`),
                    option(minuteWord(minutes), `${minutes} is the minutes already gone since ${clock(hour, 0)}. Count on from ${minutes} to 60.`),
                    option(minuteWord(60), `That's a whole hour. You only need to get to ${next}.`)
                ]
            });
        } else if (type === 'same-hour') {
            const setting = choose(SETTINGS);
            const hour = int(7, 20);
            const a = int(5, 49);
            const b = int(a + 6, Math.min(55, a + 50));
            const answer = b - a;
            const rules = [
                mistake(String(a + b), 'That adds the minutes. Both times are in the same hour, so take away.'),
                mistake(String(b), `${b} is the minutes when it ends. Take away the ${a} minutes when it starts.`)
            ];
            question = card(type, { start: clock(hour, a), end: clock(hour, b) }, 'minutes', {
                input: 'number', unit: 'minutes',
                prompt: `${startsAt(setting, clock(hour, a))} and ${endsAt(setting, clock(hour, b))}. ${minutesQuestion(setting)}`,
                answer: String(answer),
                rules: cleanRules(answer, rules),
                fallback: 'Both times are in the same hour. Take away the minutes.',
                feedback: `${b} − ${a} = ${answer} minutes`
            });
        } else if (type === 'cross-hour') {
            const setting = choose(SETTINGS);
            const hour = int(7, 20);
            const a = int(6, 55);
            const b = int(5, a - 1);
            const hop = hopFrom(a);
            const answer = hop + b;
            const next = clock(hour + 1, 0);
            const rules = [
                mistake(String(100 - a + b), `That takes away like normal numbers. Minutes only go up to 59. Hop to ${next} first.`),
                mistake(String(a - b), `That's ${a - b}. It misses the change of hour. Hop to ${next} first.`),
                mistake(String(b), `That's only the land, after ${next}. Add the hop too.`),
                mistake(String(hop), `That's only the hop, to ${next}. Now add the land: ${b} more minutes.`)
            ];
            question = card(type, { start: clock(hour, a), end: clock(hour + 1, b) }, 'minutes', {
                input: 'number', unit: 'minutes',
                prompt: `${startsAt(setting, clock(hour, a))} and ${endsAt(setting, clock(hour + 1, b))}. ${minutesQuestion(setting)}`,
                answer: String(answer),
                rules: cleanRules(answer, rules),
                fallback: `Hop from ${clock(hour, a)} to ${next}. Then land on ${clock(hour + 1, b)}. Add the jumps.`,
                feedback: `Hop ${hop} minutes, land ${b} minutes. ${hop} + ${b} = ${answer} minutes`
            });
        } else if (type === 'jumps') {
            const startHour = int(7, 17);
            const endHour = startHour + int(2, 4);
            const skip = endHour - startHour - 1;
            let a;
            do { a = int(5, 55); } while (a === 30);
            const b = int(5, 55);
            const hop = hopFrom(a);
            const start = clock(startHour, a);
            const end = clock(endHour, b);
            question = card(type, { start, end }, 'jumps', {
                input: 'choice',
                prompt: `Which jumps go from ${start} to ${end}?`,
                options: [
                    option(`${jumpLabel(hop)}, +${hourWord(skip)}, ${jumpLabel(b)}`,
                        `Hop to ${clock(startHour + 1, 0)}, skip to ${clock(endHour, 0)}, land on ${end}.`, true),
                    option(`${jumpLabel(a)}, +${hourWord(skip)}, ${jumpLabel(b)}`,
                        `${a} is the minutes already gone since ${clock(startHour, 0)}. The hop is what you need to make 60: ${hop} minutes.`),
                    option(`${jumpLabel(hop)}, +${hourWord(skip + 1)}, ${jumpLabel(b)}`,
                        `The hop already takes you to ${clock(startHour + 1, 0)}. From there to ${clock(endHour, 0)} is only ${hourWord(skip)}.`),
                    option(`${jumpLabel(hop)}, +${hourWord(skip)}`,
                        `That stops at ${clock(endHour, 0)}. Land on ${end}: add ${b} more minutes.`)
                ]
            });
        } else if (type === 'hours-and-minutes') {
            const setting = choose(SETTINGS);
            const startHour = int(6, 15);
            const endHour = Math.min(22, startHour + int(2, 6));
            const skip = endHour - startHour - 1;
            const a = int(11, 49);
            const extraHour = random() < 0.5;
            const b = extraHour ? int(a + 6, 55) : int(5, a - 6);
            const start = clock(startHour, a);
            const end = clock(endHour, b);
            const hop = hopFrom(a);
            const counted = hop + b;
            let answer;
            let rules;
            let feedback;
            if (extraHour) {
                const minutes = counted - 60;
                answer = pair(skip + 1, minutes);
                rules = [
                    mistake(pair(skip, counted), `${counted} minutes is more than an hour. Turn 60 of them into 1 hour.`),
                    mistake(pair(skip, minutes), `${hop} + ${b} = ${counted} minutes. That's 1 hour ${minuteWord(minutes)}, so add the extra hour.`),
                    mistake(pair(skip + 2, minutes), `The hop already takes you to ${clock(startHour + 1, 0)}. From there to ${clock(endHour, 0)} is only ${hourWord(skip)}.`)
                ];
                feedback = `Hop ${hop} minutes, skip ${hourWord(skip)}, land ${b} minutes. ${hop} + ${b} = ${counted} minutes, which is 1 hour ${minuteWord(minutes)}. Add the ${hourWord(skip)}: ${lengthText(skip * 60 + counted)}`;
            } else {
                answer = pair(skip, counted);
                rules = [
                    mistake(pair(skip, counted + 40), `That takes away like normal numbers. Minutes only go up to 59. Hop to ${clock(startHour + 1, 0)} first.`),
                    mistake(pair(0, counted), `You also need the skip from ${clock(startHour + 1, 0)} to ${clock(endHour, 0)}.`),
                    mistake(pair(skip + 1, counted), `The hop already takes you to ${clock(startHour + 1, 0)}. From there to ${clock(endHour, 0)} is only ${hourWord(skip)}.`)
                ];
                feedback = `Hop ${hop} minutes, skip ${hourWord(skip)}, land ${b} minutes. That's ${lengthText(skip * 60 + counted)}`;
            }
            question = card(type, { start, end }, 'hours-minutes', {
                input: 'number', fractions: true, fields,
                prompt: `${startsAt(setting, start)} and ${endsAt(setting, end)}. ${lengthQuestion(setting)}`,
                answer,
                rules: cleanRules(answer, rules),
                fallback: `Hop to ${clock(startHour + 1, 0)}, skip to ${clock(endHour, 0)}, land on ${end}. Then add the jumps.`,
                feedback
            });
        } else {
            const startHour = int(7, 17);
            const endHour = startHour + int(2, 4);
            const skip = endHour - startHour - 1;
            let diff;
            let b;
            do {
                diff = int(5, 39);
                b = int(5, 55 - diff);
            } while (b === 40);
            const a = b + diff;
            const start = clock(startHour, a);
            const end = clock(endHour, b);
            const hop = hopFrom(a);
            const counted = 100 - diff;
            const real = counted - 40;
            const options = [
                option(`${hourWord(skip)} ${minuteWord(real)}`,
                    `Hop ${hop} minutes, skip ${hourWord(skip)}, land ${b} minutes. ${hop} + ${b} = ${real}.`, true),
                option(`${hourWord(skip)} ${minuteWord(counted)}`,
                    `Minutes only go up to 59. A clock never shows ${counted} minutes.`),
                option(`${hourWord(skip + 1)} ${minuteWord(counted - 60)}`,
                    `That turns Sam's ${counted} minutes into hours. But ${counted} is wrong to begin with. Count up in jumps.`),
                option(`${hourWord(skip)} ${minuteWord(hop)}`,
                    `That stops at ${clock(endHour, 0)}. Land on ${end}: add ${b} more minutes.`)
            ];
            if (new Set(options.map(each => each.label)).size !== options.length) {
                return generate(item, random);
            }
            question = card(type, { start, end }, 'calculator', {
                input: 'choice',
                prompt: `Sam works out the time from ${start} to ${end} on a calculator: ${end.replace(':', '.')} − ${start.replace(':', '.')} = ${skip}.${two(counted)}. Sam says it's ${hourWord(skip)} ${counted} minutes. How long is it really?`,
                options
            });
        }
        if (!question) throw new Error(`Could not build a time-between-two-times card of type ${type}`);
        return prepare(question, random);
    }

    window.TimeBetween = {
        learnScreens, examples, checks, practiceTypes, pick, generate, prepare,
        clock, minutesOf, lengthText, cleanRules
    };
})();
