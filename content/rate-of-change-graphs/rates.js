(() => {
    'use strict';

    const contexts = {
        plant: { context: 'plant height', axisNames: { x: 'Time (weeks)', y: 'Height (cm)' }, time: 'weeks', unit: 'cm', rateUnit: 'cm per week', subject: 'height' },
        tank: { context: 'water in a tank', axisNames: { x: 'Time (minutes)', y: 'Water (litres)' }, time: 'minutes', unit: 'litres', rateUnit: 'litres per minute', subject: 'water level' },
        savings: { context: 'savings', axisNames: { x: 'Time (months)', y: 'Savings (£)' }, time: 'months', unit: '£', rateUnit: '£ per month', subject: 'savings' },
        temperature: { context: 'temperature', axisNames: { x: 'Time (hours)', y: 'Temperature (°C)' }, time: 'hours', unit: '°C', rateUnit: '°C per hour', subject: 'temperature' }
    };
    const plantA = { ...contexts.plant, corners: [[0, 4], [2, 8], [4, 20], [6, 20], [8, 24]], step: 4, maxValue: 28 };
    const plantB = { ...contexts.plant, corners: [[0, 6], [2, 18], [4, 18], [6, 24]], step: 2, maxValue: 24 };
    const tank = { ...contexts.tank, corners: [[0, 60], [2, 40], [4, 40], [5, 10]], step: 10, maxValue: 70 };
    const amount = (value, unit) => unit.startsWith('£') ? `£${value}${unit.slice(1)}` : `${value} ${unit}`;
    const practiceTypes = ['fastest', 'trend', 'flat-meaning', 'change', 'rate-up', 'rate-down'];
    const choice = (label, feedback, correct = false) => ({ label, feedback, correct });
    const rule = (value, feedback) => ({ value: String(value), feedback });
    const number = (answer, unit, feedback, rules = []) => ({ input: 'number', answer: String(answer), unit, feedback, rules,
        fallback: 'Read the start and end of the section. Use the change in the value and the time taken.' });

    function drawGraph(host, data, { highlight = null, labels = false } = {}) {
        const graph = window.Maths1to9Graph.create(host, {
            x: [0, data.corners.at(-1)[0]], y: [0, data.maxValue],
            step: { x: 1, y: data.step }, axisNames: data.axisNames, aspect: 1,
            label: `${data.context} graph. ${data.corners.map(([t, v]) => `${t} ${data.time}: ${amount(v, data.unit)}`).join('; ')}.`
        });
        const lines = data.corners.slice(1).map((to, i) => graph.segment(data.corners[i], to, {
            tone: highlight === null || i === highlight ? 'neutral' : 'muted',
            ...(labels ? { label: `${data.time} ${data.corners[i][0]} to ${to[0]}`, labelSide: 'above', labelTone: 'ink' } : {})
        }));
        data.corners.forEach(point => graph.point(point));
        return Object.assign(graph, { sections: lines });
    }

    // The figure stays neutral until a correct answer. The fixed-card callers
    // pass their saved phase back in so a reload restores the same picture.
    function cardVisual(data, correct = false) {
        let graph;
        function reveal() {
            if (!graph) return;
            const asked = data.section;
            if (asked) graph.sections.forEach((line, i) => line.update({ tone:
                data.corners[i][0] >= asked[0] && data.corners[i + 1][0] <= asked[1] ? 'correct' : 'muted' }));
            if (data.point) graph.point(data.point, { tone: 'correct', size: 'large' });
        }
        return {
            figure(host) { graph = drawGraph(host, data); if (correct) reveal(); },
            onFeedback(result) { if (result.correct) reveal(); }
        };
    }
    function card(config, graph, section = null, point = null) {
        const data = { ...graph, section, point };
        return { ...config, graph: data, ...cardVisual(data) };
    }

    const learnScreens = [
        { title: 'Graphs can show change.', lines: [
            'A plant can grow quickly for a few weeks, then slowly. A water tank can empty quickly, then stop. A graph shows these changes over time.',
            'Read the graph from left to right, as time moves forward.'
        ] },
        { title: 'Up, down or flat.', lines: [
            'The slope of a line is called its gradient. Up is a positive gradient, down is negative, flat is zero.'
        ], captions: ['The value is increasing.', 'The value is decreasing.', 'It stays the same.'] },
        { title: 'Steeper means faster.', captions: [
            'Weeks 0 to 2: a gentle slope. The plant grows slowly.',
            'Weeks 2 to 4: steepest. The plant grows fastest here.',
            "Weeks 4 to 6: flat. The plant stays 20 cm tall. Flat doesn't mean zero height. It means no change.",
            'Weeks 6 to 8: a gentle slope. The plant grows slowly again.'
        ], lines: [] },
        { title: 'Work out the rate.', maths: [
            'Change in height: 20 − 8 = 12 cm', 'Time taken: 4 − 2 = 2 weeks', 'Rate: 12 ÷ 2 = 6 cm per week'
        ], lines: [
            'A rate of change tells you how much something changes each week (or each minute). 6 cm per week means the plant gains 6 cm every week.',
            'The line is straight here, so the rate is the same all through these two weeks.'
        ] },
        { title: 'Use the change, not the height.', lines: [
            "Don't divide the final height by the time: 20 ÷ 2 = 10 is wrong. It counts the 8 cm the plant already had."
        ], maths: ['20 ÷ 2 = 10', '(20 − 8) ÷ 2 = 6 cm per week'] },
        { title: 'Going down and staying flat.', maths: [
            'Change in water: 60 − 40 = 20 litres',
            'Time taken: 2 − 0 = 2 minutes',
            'Rate: 20 ÷ 2 = 10 litres per minute'
        ], lines: [
            'Time is now in minutes, not weeks.',
            'Minutes 2 to 4: flat, so 0 litres per minute.',
            "The tank isn't empty: it still holds 40 litres.",
            'Per minute means each minute. The tank loses 10 litres each minute from minute 0 to minute 2.'
        ] }
    ];

    function examples() {
        return [
            card({ questionType: 'fastest', input: 'choice', prompt: 'In which weeks does the plant grow fastest?', options: [
                choice('Weeks 2 to 4', 'Right. The line is steepest here.', true),
                choice('Weeks 6 to 8', "That's the highest part, where the plant is tallest. Look for the steepest part instead."),
                choice('Weeks 4 to 6', "That part is flat: the plant isn't growing at all."),
                choice('Weeks 0 to 2', 'That part rises gently. Find the steepest part.')
            ] }, plantA, [2, 4]),
            card({ questionType: 'trend', input: 'choice', prompt: 'In which weeks does the height stay the same?', options: [
                choice('Weeks 4 to 6', 'Right. The line is flat here.', true),
                choice('Weeks 0 to 2', 'The line goes up there, so the plant grows.'),
                choice('Weeks 2 to 4', "The line goes up steeply there: that's the fastest growth."),
                choice('Weeks 6 to 8', 'The line goes up there, so the plant still grows.')
            ] }, plantA, [4, 6]),
            card({ questionType: 'read-height', prompt: 'How tall is the plant at week 6?', ...number(20, 'cm', 'Right. At week 6 the height is 20 cm.') }, plantA, null, [6, 20]),
            card({ questionType: 'read-height', prompt: 'How tall is the plant at week 8?', ...number(24, 'cm', 'Right. At week 8 the height is 24 cm.') }, plantA, null, [8, 24]),
            card({ questionType: 'change', prompt: 'How much does the plant grow from week 6 to week 8?', ...number(4, 'cm', 'Right. 24 − 20 = 4 cm.', [
                rule(24, "That's the height at week 8. Take away the height at week 6."), rule(44, "Take away, don't add.")
            ]) }, plantA, [6, 8]),
            card({ questionType: 'time-taken', input: 'choice', prompt: 'How many weeks pass from week 6 to week 8?', options: [
                choice('2', 'Right. 8 − 6 = 2 weeks.', true),
                choice('8', "That's the week it ends. Take away the start: 8 − 6."),
                choice('6', "That's the week it starts. Take it away from the end: 8 − 6."),
                choice('14', "Take away, don't add.")
            ] }, plantA, [6, 8]),
            card({ questionType: 'rate-up', prompt: 'What is the rate of growth from week 6 to week 8?', ...number(2, 'cm per week', 'Right. 4 ÷ 2 = 2 cm per week.', [
                rule(4, "That's the growth in 2 weeks. Divide by 2."),
                rule(12, 'You divided the final height, 24, by 2. Use the change, 4 cm.'),
                rule(8, 'Divide the change by the time, not multiply.')
            ]) }, plantA, [6, 8]),
            card({ questionType: 'equal-rates', input: 'choice', prompt: 'Weeks 0 to 2 and weeks 6 to 8 both grow at 2 cm per week. Why?', options: [
                choice('The two parts are equally steep.', 'Right. Equal steepness means equal rates.', true),
                choice('The plant is the same height in both.', "They aren't the same height. The rate is about how steep the line is."),
                choice('They both last 2 weeks.', "Weeks 2 to 4 also last 2 weeks, but the plant grows faster then. It's the steepness that matters."),
                choice('They are at the start and end of the graph.', "Where a part sits doesn't matter. Look at how steep it is.")
            ] }, plantA)
        ];
    }

    function checks() {
        return [
            card({ questionType: 'fastest', input: 'choice', prompt: "Aisha says the plant grows fastest from week 4 to 6, because that's the highest part of the graph. Who is right?", options: [
                choice('No. It grows fastest from week 0 to 2, where the line is steepest.', 'Right. The steepest part shows the fastest growth.', true),
                choice('Yes. The highest part shows the fastest growth.', "The highest part isn't the fastest. Look for the steepest part."),
                choice('No. It grows fastest from week 2 to 4.', "Weeks 2 to 4 are flat: the plant doesn't grow at all."),
                choice('Yes, because the line ends there.', "Where the line ends doesn't matter. Look for the steepest part.")
            ] }, plantB, [0, 2]),
            card({ questionType: 'rate-up', prompt: 'Ben works out the rate from week 0 to 2 as 18 ÷ 2 = 9 cm per week. What is the correct rate?', ...number(6, 'cm per week', 'Right. (18 − 6) ÷ 2 = 6 cm per week.', [
                rule(9, "That's Ben's answer. He divided the final height, 18. Use the change: 18 − 6."),
                rule(12, "That's the change. Divide it by the 2 weeks.")
            ]) }, plantB, [0, 2]),
            card({ questionType: 'flat-meaning', input: 'choice', prompt: 'From week 2 to 4 the line is flat at 18 cm. What does this tell you?', options: [
                choice('The plant stays 18 cm tall. Its rate of growth is 0 cm per week.', 'Right. The height stays the same.', true),
                choice("The plant's height is 0 cm.", 'Flat means no change, not zero. The plant is 18 cm tall.'),
                choice('The plant grows 18 cm each week.', "18 cm is its height. Flat means it doesn't grow."),
                choice('The plant stops being measured.', 'The graph carries on, so it is still measured. Flat means no change.')
            ] }, plantB, [2, 4]),
            card({ questionType: 'rate-up', prompt: 'What is the rate of growth from week 4 to week 6?', ...number(3, 'cm per week', 'Right. (24 − 18) ÷ 2 = 3 cm per week.', [
                rule(12, 'You divided the final height, 24, by 2. Use the change: 24 − 18.'),
                rule(6, "That's the change. Divide it by the 2 weeks.")
            ]) }, plantB, [4, 6]),
            card({ questionType: 'change', prompt: 'How much does the plant grow altogether, from week 0 to week 6?', ...number(18, 'cm', 'Right. 24 − 6 = 18 cm.', [
                rule(24, "That's the final height. Take away the height at the start."),
                rule(6, "That's the height at the start. Take it away from the final height.")
            ]) }, plantB, [0, 6])
        ];
    }

    function pick(random) {
        const { shuffle, randomInt } = window.Maths1to9LessonEngine;
        const choices = shuffle(practiceTypes.slice(0, 3), random);
        const typed = shuffle(practiceTypes.slice(3), random);
        return choices.flatMap((type, i) => [type, typed[i]]).map(type => ({ type, seed: randomInt(0, 4294967295, random) }));
    }

    function generate(item, random) {
        const { randomInt, shuffle } = window.Maths1to9LessonEngine;
        const choose = values => values[randomInt(0, values.length - 1, random)];
        const type = item.type;
        const key = choose(type === 'rate-down' ? ['tank', 'savings', 'temperature']
            : ['change', 'rate-up'].includes(type) ? ['plant', 'savings', 'temperature'] : Object.keys(contexts));
        const context = contexts[key];
        const scale = randomInt(1, 7, random);
        const descending = key === 'tank' || key !== 'plant' && random() < 0.5;
        let rates, durations, start;
        if (type === 'fastest') {
            rates = shuffle(descending ? [-1, 0, -1, -3] : [1, 3, 0, 1], random);
            // Keep a gentle section at the highest end. Shuffle all the other
            // sections so neither the steepest nor the flat has a fixed place.
            const highest = descending ? 0 : 3;
            const gentle = descending ? -1 : 1;
            const slowIndex = rates.indexOf(gentle);
            [rates[highest], rates[slowIndex]] = [rates[slowIndex], rates[highest]];
            durations = rates.map(() => randomInt(1, 2, random));
            start = descending ? 12 : 1;
        } else {
            rates = key === 'plant' ? [1, 0, 2] : key === 'tank' ? [-1, 0, -2]
                : choose([[1, 0, -1], [-1, 0, 1]]);
            durations = rates.map(() => randomInt(2, 3, random));
            start = key === 'plant' ? 1 : key === 'tank' ? 12 : 6;
        }
        const corners = [[0, start * scale]];
        rates.forEach((rate, i) => {
            const [t, v] = corners.at(-1);
            corners.push([t + durations[i], v + durations[i] * rate * scale]);
        });
        const graph = { ...context, corners, step: scale, maxValue: 12 * scale };
        let index = 1, config;
        if (type === 'fastest') {
            const fastest = rates.findIndex(rate => Math.abs(rate) === 3);
            const flat = rates.indexOf(0), highest = descending ? 0 : 3;
            index = fastest;
            config = { input: 'choice', prompt: key === 'plant' ? 'In which weeks does the plant grow fastest?'
                : key === 'tank' ? 'In which minutes does the tank empty fastest?' : `In which ${context.time} ${key === 'savings' ? 'do' : 'does'} the ${context.subject} change fastest?`,
            options: rates.map((rate, i) => choice(`${context.time[0].toUpperCase() + context.time.slice(1)} ${corners[i][0]} to ${corners[i + 1][0]}`,
                i === fastest ? 'Right. That is the steepest section.' : i === highest ? "That's the highest part, not the steepest."
                    : i === flat ? 'That part is flat: nothing changes.' : 'That part is less steep.', i === fastest)) };
        } else if (type === 'trend') {
            index = randomInt(0, rates.length - 1, random);
            const labels = key === 'savings'
                ? ['They are increasing.', 'They are decreasing.', 'They are staying the same.', 'They are zero.']
                : ['It is increasing.', 'It is decreasing.', 'It is staying the same.', 'It is zero.'];
            const correct = rates[index] > 0 ? 0 : rates[index] < 0 ? 1 : 2;
            config = { input: 'choice', prompt: `What happens to the ${context.subject} from ${context.time.slice(0, -1)} ${corners[index][0]} to ${corners[index + 1][0]}?`,
                options: labels.map((label, i) => choice(label, i === correct ? 'Right. Read the line from left to right.'
                    : i === 3 ? 'Flat means no change, not zero.' : i === 0 ? 'Increasing means the line goes up. Look at this section.'
                        : i === 1 ? 'Decreasing means the line goes down. Look at this section.' : 'Staying the same means the line is flat. Look at this section.', i === correct)) };
        } else if (type === 'flat-meaning') {
            const value = corners[1][1];
            config = { input: 'choice', prompt: `The graph is flat at ${amount(value, context.unit)} from ${context.time.slice(0, -1)} ${corners[1][0]} to ${corners[2][0]}. What does this show?`, options: [
                choice(`The ${context.subject} ${key === 'savings' ? 'stay' : 'stays'} at ${amount(value, context.unit)}. The rate is ${amount(0, context.rateUnit)}.`, 'Right. Flat means no change.', true),
                choice(`The ${context.subject} ${key === 'savings' ? 'are' : 'is'} ${amount(0, context.unit)}.`, `Flat means no change, not zero. The value is ${amount(value, context.unit)}.`),
                choice('The graph stops.', 'The graph carries on as time passes. The value stays the same.'),
                choice(key === 'savings' ? 'They change fastest.' : 'It changes fastest.', 'A flat section has no change. Look for a steep section for the fastest change.')
            ] };
        } else {
            index = rates.findIndex(rate => type === 'rate-down' ? rate < 0 : rate > 0);
            const [t1, v1] = corners[index], [t2, v2] = corners[index + 1];
            const time = t2 - t1, change = Math.abs(v2 - v1), rate = change / time;
            const interval = `from ${context.time.slice(0, -1)} ${t1} to ${t2}`;
            if (type === 'change') {
                config = { prompt: key === 'plant' ? `How much does the plant grow ${interval}?` : `How much ${key === 'savings' ? 'do' : 'does'} the ${context.subject} go up ${interval}?`, ...number(change, key === 'savings' ? 'pounds' : context.unit,
                    key === 'savings' ? `Right. £${v2} − £${v1} = £${change}.` : `Right. ${v2} − ${v1} = ${change} ${context.unit}.`, [
                        rule(v2, "That's the final value. Take away the value at the start."), rule(v1 + v2, "Take away, don't add.")
                    ]) };
            } else {
                const candidates = [
                    [change, "That's the change. Divide it by the time taken."],
                    [type === 'rate-down' ? v1 / time : v2 / time, 'Use the change in the value, not the value at one end.'],
                    [time / change, "That's time ÷ change. Divide the change by the time."]
                ];
                const seen = new Set([rate]);
                const rules = candidates.flatMap(([value, feedback], i) => {
                    if (i === 1 && !Number.isInteger(value) || i === 2 && !Number.isInteger(value * 100) || seen.has(value)) return [];
                    seen.add(value); return [rule(value, feedback)];
                });
                const prompt = type === 'rate-up' ? `What is the rate of increase ${interval}?`
                    : key === 'tank' ? `From minute ${t1} to minute ${t2}, how many litres leave the tank each minute?`
                        : key === 'savings' ? `From month ${t1} to month ${t2}, how many pounds are spent each month?`
                            : `From hour ${t1} to hour ${t2}, by how many °C does the temperature fall each hour?`;
                config = { prompt, ...number(rate, key === 'savings' ? 'pounds per month' : context.rateUnit,
                    key === 'savings' ? `Right. £${change} ÷ ${time} = £${rate} per month.` : `Right. ${change} ÷ ${time} = ${rate} ${context.rateUnit}.`, rules) };
            }
        }
        if (config.options) config.options = shuffle(config.options, random);
        const result = card({ questionType: type, ...config }, graph, [corners[index][0], corners[index + 1][0]]);
        // Practice pictures stay neutral in every answer phase and on reload.
        result.figure = host => drawGraph(host, result.graph);
        delete result.onFeedback;
        return result;
    }

    window.RateOfChangeGraphs = { learnScreens, examples, practiceTypes, pick, generate, checks,
        plantA, plantB, tank, drawGraph, cardVisual };
})();
