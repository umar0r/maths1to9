(() => {
    'use strict';

    const nb = text => text.replace(/(\d) (m\/s|m|s)\b/g, '$1\u00a0$2');
    const decimal = value => String(Number(value.toFixed(2)));
    const typedTypes = ['whole-line', 'second-section', 'middle-section', 'after-stop', 'distance-and-time'];
    const choiceTypes = ['stopped', 'whole-journey-mistake', 'fastest', 'steady-or-not'];
    const fields = [{ id: 'd', label: 'Distance travelled', unit: 'm' }, { id: 't', label: 'Time taken', unit: 's' }];
    const fallback = 'Distance travelled in the section ÷ time taken for the section.';

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
            label: labels[index]
        })) : [];
        return Object.assign(graph, { journeyLines: lines });
    }
    function guides(graph, [t, d]) {
        return [graph.segment([t, 0], [t, d], { tone: 'ink', dash: true }),
            graph.segment([0, d], [t, d], { tone: 'ink', dash: true }),
            graph.point([t, d], { label: nb(`${t} s, ${d} m`) })];
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
        const typed = shuffle(typedTypes, random).slice(0, 4), choices = shuffle(choiceTypes, random);
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
                choice(`${decimal(d1 / t2)} m/s`, "That uses the whole journey. In this section the distance doesn't change.")
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
                    : `${journey.labels[i]} is ${s} m/s. The steepest section is fastest: ${journey.labels[best]} is ${speeds[best]} m/s.`, i === best)) };
        } else {
            delete journey.section;
            config = { prompt: 'Which statement is true?', options: [
                choice(`They stopped between ${t1} and ${t2} seconds.`, 'Right. That section is flat.', true),
                choice(`They stopped between 0 and ${t1} seconds.`, 'That section slopes, so the distance is changing.'),
                choice(`They were fastest between ${t1} and ${t2} seconds.`, 'Flat means stopped: 0 m/s. The steepest section is fastest.')
            ] };
        }
        if (config.options) {
            const seen = new Set();
            config.input = 'choice';
            config.options = shuffle(config.options.filter(option => {
                if (seen.has(option.label)) return false;
                seen.add(option.label); return true;
            }), random);
        }
        return withFigure({ questionType: item.type, ...config }, journey);
    }
    window.SpeedJourneys = { nb, decimal, typedTypes, choiceTypes, fields, fallback, speedText,
        journeyGraph, guides, sectionArrows, figure, withFigure, numberCard, choice, distanceAndTime, pick, generate };
})();
