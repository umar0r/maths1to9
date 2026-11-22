(() => {
    'use strict';

    const slug = document.body.dataset.lessonId;
    const S = window.ScatterGraphs;
    const E = window.Maths1to9LessonEngine;

    const contexts = [
        { x: 'Hours of revision', y: 'Test mark', xw: 'hours', yw: 'marks',
            promptUp: a => `A pupil revised for ${a} hours. What mark did they get?`,
            promptAcross: b => `One pupil got a mark of ${b}. How many hours did they revise?` },
        { x: 'Rainy days', y: 'Road accidents', xw: 'rainy days', yw: 'accidents',
            promptUp: a => `In the week with ${a} rainy days, how many accidents were there?`,
            promptAcross: b => `In the week with ${b} accidents, how many rainy days were there?` },
        { x: 'Shots on target', y: 'Goals', xw: 'shots', yw: 'goals',
            promptUp: a => `A player had ${a} shots on target. How many goals did they score?`,
            promptAcross: b => `A player scored ${b} goals. How many shots on target did they have?` }
    ];

    function genPoints(random, helpers) {
        const { randomInt } = helpers;
        let pts = null;
        for (let attempt = 0; attempt < 100; attempt++) {
            const n = randomInt(5, 6, random);
            const set = new Set();
            while (set.size < n) {
                const x = randomInt(1, 9, random);
                const y = randomInt(1, 9, random);
                set.add(`${x},${y}`);
            }
            pts = [...set].map(s => s.split(',').map(Number));
            // find a valid asked point for read-pair/read-up (unique x, x!==y)
            const cands = pts.filter(p => {
                if (p[0] === p[1]) return false;
                return pts.filter(q => q[0] === p[0]).length === 1;
            });
            if (cands.length > 0) return pts;
        }
        return pts;
    }

    function askedPoint(points, needUniqueY, random, helpers) {
        const { randomInt } = helpers;
        const cands = points.filter(p => {
            if (p[0] === p[1]) return false;
            if (points.filter(q => q[0] === p[0]).length !== 1) return false;
            if (needUniqueY && points.filter(q => q[1] === p[1]).length !== 1) return false;
            return true;
        });
        if (cands.length === 0) return null;
        return cands[randomInt(0, cands.length - 1, random)];
    }

    function makeFigure(ctx, points, asked) {
        return (host, { readOnly }) => {
            const graph = S.makeGraph(host, { x: [0, 10], y: [0, 10], step: { x: 1, y: 1 }, labelEvery: 1,
                axisNames: { x: ctx.x, y: ctx.y },
                label: 'Scatter graph.' });
            points.forEach(p => {
                const big = p[0] === asked[0] && p[1] === asked[1];
                graph.point(p, { size: big ? 'large' : 'small', tone: big ? 'neutral' : 'muted', coordinates: false });
            });
            graph.setEditable(!readOnly);
        };
    }

    function pickPractice(part, count, random, helpers) {
        const { shuffle, randomInt } = helpers;
        const types = shuffle(['read-pair', 'read-up', 'read-across'], random);
        return types.map(type => ({ type, seed: randomInt(0, 0xffffffff, random) }));
    }

    function practiceQuestion(item, random, helpers) {
        const { shuffle, randomInt } = helpers;
        const ctx = contexts[randomInt(0, contexts.length - 1, random)];
        let points = genPoints(random, helpers);
        const needUniqueY = item.type === 'read-across';
        let asked = askedPoint(points, needUniqueY, random, helpers);
        // regenerate until valid asked point
        let tries = 0;
        while (!asked && tries < 50) {
            points = genPoints(random, helpers);
            asked = askedPoint(points, needUniqueY, random, helpers);
            tries++;
        }
        const [a, b] = asked;
        const figure = makeFigure(ctx, points, asked);

        if (item.type === 'read-pair') {
            const opts = [
                { label: `${a} ${ctx.xw} and ${b} ${ctx.yw}`, feedback: `Down to ${a}, across to ${b}.`, correct: true },
                { label: `${b} ${ctx.xw} and ${a} ${ctx.yw}`, feedback: "That's back to front. Go down to the bottom axis first." },
                { label: `${a} ${ctx.xw} and ${b + 1} ${ctx.yw}`, feedback: "Count the side axis again from 0." },
                { label: `${a + 1} ${ctx.xw} and ${b} ${ctx.yw}`, feedback: "Go straight down. Count the bottom axis again from 0." }
            ];
            // ensure distinct
            const seen = new Set();
            const distinct = opts.filter(o => { if (seen.has(o.label)) return false; seen.add(o.label); return true; });
            return {
                input: 'choice', questionType: 'read-pair',
                prompt: 'Which pair does the big point show?',
                figure, options: shuffle(distinct, random)
            };
        }

        if (item.type === 'read-up') {
            const otherYs = [...new Set(points.filter(p => p[0] !== a).map(p => p[1]))];
            const rules = [];
            rules.push({ value: String(a), feedback: `${a} is on the bottom axis. Go straight up to the point, then across to the side axis.` });
            if (b + 1 <= 10) rules.push({ value: String(b + 1), feedback: 'Count the side axis again from 0.' });
            if (b - 1 >= 0) rules.push({ value: String(b - 1), feedback: 'Count the side axis again from 0.' });
            otherYs.forEach(y => {
                if (y !== b && y !== b + 1 && y !== b - 1 && y !== a) {
                    rules.push({ value: String(y), feedback: "That's the point above another number. Find the point straight above a." });
                }
            });
            return {
                input: 'number', questionType: 'read-up',
                prompt: ctx.promptUp(a),
                figure, answer: String(b),
                rules, fallback: 'Find a on the bottom axis, go up to the point, then across.'
            };
        }

        // read-across
        const otherXs = [...new Set(points.filter(p => p[1] !== b).map(p => p[0]))];
        const rules = [];
        rules.push({ value: String(b), feedback: `${b} is on the side axis. Go straight across to the point, then down to the bottom axis.` });
        if (a + 1 <= 10) rules.push({ value: String(a + 1), feedback: 'Count the bottom axis again from 0.' });
        if (a - 1 >= 0) rules.push({ value: String(a - 1), feedback: 'Count the bottom axis again from 0.' });
        otherXs.forEach(x => {
            if (x !== a && x !== a + 1 && x !== a - 1 && x !== b) {
                rules.push({ value: String(x), feedback: "That's the point for another number. Find the point straight across from b." });
            }
        });
        return {
            input: 'number', questionType: 'read-across',
            prompt: ctx.promptAcross(b),
            figure, answer: String(a),
            rules, fallback: 'Find b on the side axis, go across to the point, then down.'
        };
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { pickPractice, practiceQuestion };
        return;
    }

    window.Maths1to9QuestionSets ??= {};
    window.Maths1to9QuestionSets[slug] = async api => {
        const helpers = window.Maths1to9LessonEngine;
        for (const { id } of api.getSections()) {
            const { kind, part, config } = api.getSection(id);
            if (kind !== 'question-bank') continue;
            const containerId = helpers.questionSetContainerId(slug, id);
            const host = document.getElementById(containerId);
            if (part !== 'read') {
                // placeholder for not-yet-built parts
                const h = document.createElement('h2');
                h.textContent = 'Coming soon.';
                host.append(h);
                api.gateSection(id);
                api.setSectionBack(id, null);
                api.setSectionReset(id, null);
                api.setSectionAction(id, { label: 'Continue', disabled: true, onClick() {} });
                continue;
            }
            const section = host.closest('.lesson-section');
            section.removeAttribute('aria-labelledby');
            section.setAttribute('aria-label', 'Read Practice');
            await api.runQuestionSet(id, {
                version: 1, count: config.session_length,
                pick: random => pickPractice(part, config.session_length, random, helpers),
                question: (item, random) => practiceQuestion(item, random, helpers)
            });
        }
        // comparison (Check) placeholder
        const comparison = api.getSection('comparison');
        const cHost = document.getElementById(helpers.questionSetContainerId(slug, comparison.id));
        const ch = document.createElement('h2');
        ch.textContent = 'Coming soon.';
        cHost.append(ch);
        api.gateSection(comparison.id);
        api.setSectionBack(comparison.id, null);
        api.setSectionReset(comparison.id, null);
        api.setSectionAction(comparison.id, { label: 'Continue', disabled: true, onClick() {} });
    };
})();