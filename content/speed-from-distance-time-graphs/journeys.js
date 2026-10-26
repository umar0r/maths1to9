(() => {
    'use strict';

    const nb = text => text.replace(/(\d) (m\/s|m|s)\b/g, '$1\u00a0$2');
    const decimal = value => String(Number(value.toFixed(2)));
    const typedTypes = ['whole-line', 'second-section', 'middle-section', 'after-stop', 'distance-and-time'];
    const choiceTypes = ['stopped', 'whole-journey-mistake', 'fastest', 'steady-or-not'];
    const fields = [{ id: 'd', label: 'Distance travelled', unit: 'm' }, { id: 't', label: 'Time taken', unit: 's' }];
    const fallback = 'Distance travelled in the section ÷ time taken for the section.';

    const pointText = ([t, d]) => nb(`${t} s, ${d} m`);

    function speedText(distance, time) {
        return nb(`${distance} ÷ ${time} = ${distance / time} m/s`);
    }
    function description({ corners, section }) {
        const points = corners.map(([t, d]) => `${t} seconds, ${d} metres`);
        return `Distance–time graph. A straight line from ${points.join(', then to ')}.${section
            ? ` The section from ${section[0]} to ${section[1]} seconds is highlighted.` : ''}`;
    }
    function journeyGraph(host, journey) {
        const { corners, maxDistance = 30, section, labels = [], draw = true } = journey;
        const graph = window.Maths1to9Graph.create(host, {
            x: [0, 10], y: [0, maxDistance], step: { x: 1, y: 2 }, labelEvery: 1,
            aspect: 1, axisNames: { x: 'Time (s)', y: 'Distance (m)' },
            label: journey.label || description(journey)
        });
        const lines = draw ? corners.slice(1).map((to, index) => graph.segment(corners[index], to, {
            tone: !section || corners[index][0] === section[0] && to[0] === section[1] ? 'neutral' : 'muted',
            label: labels[index], ...(labels[index] ? { labelSide: 'above', labelTone: 'ink' } : {})
        })) : [];
        return Object.assign(graph, { journeyLines: lines, journeyCorners: corners });
    }
    function guideOverlapsJourney(graph, from, to) {
        return graph.journeyCorners.slice(1).some((end, index) => {
            const start = graph.journeyCorners[index];
            const cross = point => (point[0] - from[0]) * (to[1] - from[1]) -
                (point[1] - from[1]) * (to[0] - from[0]);
            if (cross(start) !== 0 || cross(end) !== 0) return false;
            const axis = from[0] === to[0] ? 1 : 0;
            return Math.max(Math.min(from[axis], to[axis]), Math.min(start[axis], end[axis])) <
                Math.min(Math.max(from[axis], to[axis]), Math.max(start[axis], end[axis]));
        });
    }
    function guides(graph, [t, d], options = {}) {
        const items = [];
        const ends = [];
        if (t !== 0 && (options.verticalTo ?? d) !== 0) ends.push([[t, 0], [t, options.verticalTo ?? d]]);
        if (d !== 0 && t !== 0 && options.horizontal !== false) ends.push([[0, d], [t, d]]);
        for (const [from, to] of ends) {
            if (!guideOverlapsJourney(graph, from, to)) items.push(graph.segment(from, to, { tone: 'ink', dash: true }));
        }
        items.push(graph.point([t, d], { label: options.label ?? pointText([t, d]), labelSide: options.labelSide }));
        return items;
    }
    function sectionArrows(graph, from, to) {
        const dt = to[0] - from[0], dd = to[1] - from[1];
        if (from[1] === 0 || dt < 3 || dd / 2 < 3) return [];
        const corner = [to[0], from[1]];
        return [graph.arrow(from, corner, { tone: 'ink', label: nb(`${dt} s`) }),
            graph.arrow(corner, to, { tone: 'ink', label: nb(`${dd} m`) })];
    }
    function figure(journey) {
        return (host, { readOnly }) => {
            const graph = journeyGraph(host, journey);
            const ends = journey.section
                ? journey.corners.filter(([t]) => journey.section.includes(t))
                : [journey.corners[0], journey.corners.at(-1)];
            ends.forEach(point => guides(graph, point));
            graph.setEditable(!readOnly);
        };
    }
    function withFigure(config, journey) {
        return { ...config, journey, figure: figure(journey) };
    }
    function numberCard(answer, feedback, rules = []) {
        return { input: 'number', inputLabel: 'Speed', unit: 'm/s', answer: String(answer),
            feedback: nb(feedback), rules: rules.map(rule => ({ ...rule, feedback: nb(rule.feedback) })), fallback };
    }
    function choice(label, feedback, correct = false) {
        return { label: nb(label), feedback: nb(feedback), correct };
    }
    function distanceAndTime(journey) {
        const [from, to] = journey.corners.filter(([t]) => journey.section.includes(t));
        const [t1, d1] = from, [t2, d2] = to, d = d2 - d1, t = t2 - t1;
        return { input: 'number', fractions: true, fields, answer: { d: String(d), t: String(t) },
            prompt: `Look at the highlighted section, from ${t1} to ${t2} seconds.`,
            rules: [
                { value: { d: String(d2) }, feedback: nb(`${d2} m is the distance from the start at the end. Take away the ${d1} m already gone: ${d2} − ${d1}.`) },
                { value: { d: String(d1) }, feedback: nb(`${d1} m is where the section starts. How much further does the line go?`) },
                { value: { t: String(t2) }, feedback: nb(`The section starts at ${t1} s, not 0. Time taken: ${t2} − ${t1}.`) },
                { value: { d: String(d) }, feedback: 'The distance is right. Check the time: end time − start time.' },
                { value: { t: String(t) }, feedback: 'The time is right. Check the distance: end distance − start distance.' }
            ].filter((rule, index) => index >= 3 || !Object.entries(rule.value).every(([id, value]) => Number(value) === (id === 'd' ? d : t))),
            feedback: nb(`Right. ${d} m in ${t} s.`), fallback };
    }

    const learnScreens = [
        {
            title: 'Speed is distance each second.',
            intro: 'Speed tells you how far you go each second. This walker goes 2 metres every second.',
            prompt: 'Move the time to 6 seconds.',
            lines: [
                'You walked 12 m in 6 seconds: 2 m every second.',
                "That's your <strong>speed</strong>: 2 metres per second, written <strong>2 m/s</strong>.",
                'Speed = distance travelled ÷ time taken = 12 ÷ 6 = 2 m/s'
            ]
        },
        {
            title: 'The same walk as a graph.',
            prompt: 'Drag the point forward one second at a time.',
            lines: [
                'Across: time. Up: distance from the start.',
                'The dots make a straight line, because you go the same distance every second: a <strong>steady speed</strong>.'
            ],
            working: "At 4 s you've gone 8 m. 8 ÷ 4 = 2 m/s"
        },
        {
            title: 'Speed for one section.',
            prompt: 'Find the speed between 4 and 10 seconds. Tap the start of the highlighted section.',
            lines: [
                'Distance travelled: 26 − 8 = 18 m',
                'Time taken: 10 − 4 = 6 s',
                'Speed = 18 ÷ 6 = <strong>3 m/s</strong>',
                'Use only the start and end of the section.'
            ]
        },
        {
            title: 'Steeper is faster.',
            lines: [
                'The steeper section is faster. You can compare two walkers on the same graph in the same way.',
                'The <strong>gradient</strong> means how steep a line is. On a distance–time graph, it is the speed: distance travelled ÷ time taken.'
            ],
            working: ['8 m in 4 s: 8 ÷ 4 = 2 m/s', '18 m in 6 s: 18 ÷ 6 = 3 m/s']
        },
        {
            title: 'A flat section.',
            prompt: 'Drag the point from 4 to 8 seconds. Watch the walker.',
            lines: [
                'Time goes on, but the distance stays at 12 m. A <strong>flat</strong> section means <strong>stopped</strong>.',
                'Distance travelled: 12 − 12 = 0 m. Speed: 0 ÷ 4 = <strong>0 m/s</strong>',
                'Time stopped = end time − start time = 8 − 4 = 4 s'
            ]
        }
    ];

    const pools = new Map();
    function candidates(pattern) {
        if (pools.has(pattern)) return pools.get(pattern);
        const result = [];
        function add(corners, speeds) {
            if (speeds.length === pattern.length) {
                if (pattern === 'fff') {
                    if (new Set(speeds).size !== 3) return;
                    const fastest = speeds.indexOf(Math.max(...speeds));
                    const distances = speeds.map((speed, i) => corners[i + 1][1] - corners[i][1]);
                    if (!distances.some((d, i) => speeds[i] < speeds[fastest] && d > distances[fastest])) return;
                }
                result.push(corners);
                return;
            }
            const [time, distance] = corners.at(-1);
            for (let duration = 2; duration <= 10 - time; duration++) {
                for (let speed = pattern[speeds.length] === '0' ? 0 : 1; speed <= (pattern[speeds.length] === '0' ? 0 : 6); speed++) {
                    const end = distance + duration * speed;
                    if (end > 30 || end % 2 || speed > 0 && speed === speeds.at(-1)) continue;
                    add([...corners, [time + duration, end]], [...speeds, speed]);
                }
            }
        }
        add([[0, 0]], []);
        pools.set(pattern, result);
        return result;
    }
    function pick(random) {
        const { shuffle, randomInt } = window.Maths1to9LessonEngine;
        const typed = shuffle(typedTypes, random).slice(0, 3);
        const choices = shuffle(choiceTypes, random).slice(0, 3);
        return typed.flatMap((type, i) => [type, choices[i]].map(type => ({ type, seed: randomInt(0, 4294967295, random) })));
    }
    function generate(item, random) {
        const { randomInt, shuffle } = window.Maths1to9LessonEngine;
        const patterns = { 'whole-line': 's', 'second-section': 'ss', 'distance-and-time': 'ss',
            'whole-journey-mistake': 'ss', 'middle-section': 'sss', 'after-stop': 's0s',
            stopped: 's0s', 'steady-or-not': 's0s', fastest: 'fff' };
        const pool = candidates(patterns[item.type]);
        const corners = pool[randomInt(0, pool.length - 1, random)].map(point => [...point]);
        const index = item.type === 'whole-line' ? 0 : item.type === 'after-stop' ? 2 : 1;
        const from = corners[index], to = corners[index + 1];
        const [t1, d1] = from, [t2, d2] = to, distance = d2 - d1, time = t2 - t1, speed = distance / time;
        const journey = { corners, section: [t1, t2] };
        let config;
        if (item.type === 'distance-and-time') config = distanceAndTime(journey);
        else if (typedTypes.includes(item.type)) {
            const used = new Set([String(speed)]), rules = [];
            for (const [value, feedback] of [
                [corners.at(-1)[1] / corners.at(-1)[0], 'That uses the whole journey. Use only the highlighted section.'],
                [time / distance, "That's time ÷ distance. Speed is distance ÷ time."],
                [d2 / time, 'Take away the distance already travelled before the section starts.'],
                [distance, "That's the distance travelled. Divide it by the time taken."]
            ]) {
                const key = decimal(value);
                if (!used.has(key)) { used.add(key); rules.push({ value: key, feedback }); }
            }
            config = { ...numberCard(speed, `Right. ${speedText(distance, time)}.`, rules),
                prompt: index === 0 ? 'What is the speed?' : `What is the speed between ${t1} and ${t2} seconds?` };
        } else if (item.type === 'stopped') {
            config = { prompt: `What is the speed between ${t1} and ${t2} seconds?`, options: [
                choice('0 m/s', "Right. The distance doesn't change, so they've stopped.", true),
                choice(`${d1} m/s`, `${d1} m is the distance from the start. It stays the same, so the speed is 0 m/s.`),
                choice(`${decimal(d1 / t2)} m/s`, "That uses the whole journey. In this section the distance doesn't change."),
                choice(`${time} m/s`, `${time} s is the time spent stopped. The distance travelled in that time is 0 m.`)
            ] };
        } else if (item.type === 'whole-journey-mistake') {
            config = { prompt: nb(`Priya says the speed between ${t1} and ${t2} seconds is ${d2} ÷ ${t2} = ${decimal(d2 / t2)} m/s. What is the speed?`), options: [
                choice(`${speed} m/s`, `Right. ${speedText(distance, time)}. Priya used the whole journey.`, true),
                choice(`${decimal(d2 / t2)} m/s`, "That's Priya's answer. She used the whole journey, not the highlighted section."),
                choice(`${decimal(d2 / time)} m/s`, `Take away the ${d1} m already travelled before the section starts.`),
                choice(`${decimal(time / distance)} m/s`, "That's time ÷ distance. Speed is distance ÷ time.")
            ] };
        } else if (item.type === 'fastest') {
            delete journey.section; journey.labels = ['A', 'B', 'C'];
            const speeds = corners.slice(1).map((p, i) => (p[1] - corners[i][1]) / (p[0] - corners[i][0]));
            const best = speeds.indexOf(Math.max(...speeds));
            config = { prompt: 'Which section is the fastest?', options: speeds.map((s, i) => choice(journey.labels[i],
                i === best ? `Right. ${journey.labels[i]}: ${speedText(corners[i + 1][1] - corners[i][1], corners[i + 1][0] - corners[i][0])}, the steepest.`
                    : `${journey.labels[i]} is ${s} m/s. The steepest section is fastest: ${journey.labels[best]} is ${speeds[best]} m/s.`, i === best)).concat([
                        choice('All three are the same speed', 'The sections have different steepness. The steepest section is fastest.')
                    ]) };
        } else {
            delete journey.section;
            config = { prompt: 'Which statement is true?', options: [
                choice(`They stopped between ${t1} and ${t2} seconds.`, 'Right. That section is flat.', true),
                choice(`They stopped between 0 and ${t1} seconds.`, 'That section slopes, so the distance is changing.'),
                choice(`They were fastest between ${t1} and ${t2} seconds.`, 'Flat means stopped: 0 m/s. The steepest section is fastest.'),
                choice('They kept the same speed for the whole journey.', 'The steepness changes, so the speed changes. The flat section means they stopped.')
            ] };
        }
        if (config.options) {
            const seen = new Set();
            config.input = 'choice';
            const distinct = config.options.filter(option => {
                if (seen.has(option.label)) return false;
                seen.add(option.label); return true;
            });
            // Some numerical mistakes coincide. Replace them with another real
            // misreading of this graph so every choice card still has four options.
            const alternatives = [
                choice(`${distance} m/s`, `${distance} m is the distance travelled. Divide it by the time taken.`),
                choice(`${time} m/s`, `${time} s is the time taken. Speed is distance travelled ÷ time taken.`),
                choice(`${d2} m/s`, `${d2} m is the distance from the start at the end. It is not the speed.`),
                choice(`${t2} m/s`, `${t2} s is the end time. It is not the speed.`),
                choice(`${t1} m/s`, `${t1} s is the start time. It is not the speed.`)
            ];
            for (const option of alternatives) {
                if (distinct.length === 4) break;
                if (!seen.has(option.label)) { distinct.push(option); seen.add(option.label); }
            }
            config.options = shuffle(distinct, random);
        }
        return withFigure({ questionType: item.type, ...config }, journey);
    }
    function examples() {
        return [
            withFigure({ prompt: 'Someone walks at a steady speed. What is their speed?',
                ...numberCard(4, 'Right. 20 ÷ 5 = 4 m/s: 4 metres every second.', [
                    { value: '0.25', feedback: "That's time ÷ distance. Speed is distance ÷ time: 20 ÷ 5." },
                    { value: '20', feedback: '20 m is the distance. Divide it by the time taken.' },
                    { value: '5', feedback: '5 s is the time taken. Divide the distance by it.' }
                ]) }, { corners: [[0, 0], [5, 20]] }),
            withFigure(distanceAndTime({ corners: [[0, 0], [3, 6], [7, 18]], section: [3, 7] }), { corners: [[0, 0], [3, 6], [7, 18]], section: [3, 7] }),
            withFigure({ input: 'choice', prompt: 'So what was the speed between 3 and 7 seconds?', options: [
                choice('3 m/s', 'Right. 12 ÷ 4 = 3 m/s.', true),
                choice('2 m/s', "That's the speed of the first section, 0 to 3 s. Use the highlighted one."),
                choice('0.33 m/s', "That's 4 ÷ 12, time ÷ distance. Speed is distance ÷ time."),
                choice('12 m/s', '12 m is the distance travelled. Divide it by the 4 s taken.')
            ] }, { corners: [[0, 0], [3, 6], [7, 18]], section: [3, 7] }),
            withFigure({ input: 'choice', prompt: 'What is happening between 4 and 8 seconds?', options: [
                choice('They have stopped.', 'Right. The distance stays at 12 m, so the speed is 0 m/s.', true),
                choice('They are going at 12 m/s.', "12 m is how far they are from the start. It doesn't change, so they aren't moving."),
                choice('They are going at a steady speed.', "A steady speed is a sloping straight line. A flat line means the distance doesn't change."),
                choice('They are going back to the start.', 'Going back would make the line go down, towards 0 m. This line stays at 12 m.')
            ] }, { corners: [[0, 0], [4, 12], [8, 12], [10, 20]], section: [4, 8] })
        ];
    }

    const amir = { corners: [[0, 0], [4, 12], [10, 24]], section: [4, 10] };
    const afterStop = { corners: [[0, 0], [3, 6], [5, 6], [9, 22]], section: [5, 9] };
    function checks() {
        return [
            withFigure({ questionType: 'amir', input: 'choice',
                prompt: nb("Amir is finding the speed between 4 and 10 seconds. He says: 'I divided 24 by 10, so the speed is 2.4 m/s.' What has he done wrong?"), options: [
                    choice('He used the whole journey. He should use only 4 to 10 seconds.', 'Right. 24 m and 10 s are for the whole journey.', true),
                    choice('He should have divided 10 by 24.', 'Speed is distance ÷ time, so dividing the distance was right. The numbers are the problem.'),
                    choice('Nothing. He is right.', '24 m and 10 s are for the whole journey, not the highlighted section.'),
                    choice('He should have multiplied 24 by 10.', 'Multiplying distance by time does not give speed. Divide the distance travelled by the time taken in the section.')
                ] }, amir),
            withFigure({ questionType: 'fix-it', prompt: 'What is the correct speed between 4 and 10 seconds?',
                ...numberCard(2, 'Right. 24 − 12 = 12 m in 10 − 4 = 6 s. 12 ÷ 6 = 2 m/s.', [
                    { value: '2.4', feedback: "That's Amir's answer, for the whole journey." },
                    { value: '3', feedback: "That's the first section, 0 to 4 s." },
                    { value: '4', feedback: 'Take away the 12 m already travelled: 24 − 12.' },
                    { value: '0.5', feedback: "That's time ÷ distance." },
                    { value: '12', feedback: '12 m is the distance travelled. Divide it by the 6 s taken.' }
                ]) }, amir),
            { questionType: 'who-is-faster', input: 'choice', prompt: 'Lena and Sam each walk at a steady speed. Who is faster?', options: [
                choice('Lena', "Right. Lena: 20 ÷ 5 = 4 m/s. Sam: 24 ÷ 8 = 3 m/s. Lena's line is steeper.", true),
                choice('Sam', 'Sam goes further, but takes longer. Sam: 24 ÷ 8 = 3 m/s. Lena: 20 ÷ 5 = 4 m/s.'),
                choice("They're the same speed", 'Their lines have different steepness, so different speeds.'),
                choice('They have both stopped', 'Both lines slope upwards. Their distances are changing, so both walkers are moving.')
            ], figure(host, { readOnly }) {
                const graph = journeyGraph(host, { corners: [[0, 0], [5, 20]],
                    label: 'Distance–time graph. Lena walks from 0 seconds, 0 metres to 5 seconds, 20 metres. Sam walks from 0 seconds, 0 metres to 8 seconds, 24 metres.' });
                graph.segment([0, 0], [8, 24]);
                guides(graph, [5, 20], { label: nb('Lena: 5 s, 20 m'), labelSide: 'above' });
                guides(graph, [8, 24], { label: nb('Sam: 8 s, 24 m'), labelSide: 'above' });
                graph.setEditable(!readOnly);
            } },
            withFigure({ questionType: 'after-a-stop', prompt: 'What is the speed between 5 and 9 seconds?',
                ...numberCard(4, 'Right. 22 − 6 = 16 m in 9 − 5 = 4 s. 16 ÷ 4 = 4 m/s.', [
                    { value: '2.44', feedback: 'That uses the whole journey.' },
                    { value: '5.5', feedback: 'Take away the 6 m already travelled: 22 − 6.' },
                    { value: '0.25', feedback: "That's time ÷ distance." },
                    { value: '16', feedback: '16 m is the distance travelled. Divide it by the 4 s taken.' }
                ]) }, afterStop),
            withFigure({ questionType: 'stop-duration', input: 'choice', prompt: 'For how long did they stop?', options: [
                choice('2 seconds', 'Right. The line is flat from 3 to 5 seconds.', true),
                choice('6 seconds', "6 m is how far they'd gone. Read the time: 3 to 5 seconds."),
                choice('5 seconds', '5 s is when they started again. They stopped at 3 s: 5 − 3.'),
                choice('3 seconds', '3 s is when they stopped. The stop lasts from 3 to 5 seconds: 5 − 3.')
            ] }, { corners: afterStop.corners })
        ];
    }

    window.SpeedJourneys = { nb, pointText, decimal, typedTypes, choiceTypes, fields, fallback, speedText,
        journeyGraph, guides, sectionArrows, figure, withFigure, numberCard, choice, distanceAndTime,
        learnScreens, practiceTypes: [...typedTypes, ...choiceTypes], pick, generate, examples, checks };
})();
