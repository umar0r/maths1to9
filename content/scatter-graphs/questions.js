(() => {
    'use strict';

    const slug = typeof document === 'undefined' ? 'scatter-graphs' : document.body.dataset.lessonId;
    const S = typeof module !== 'undefined' && module.exports ? require('./scatter-graphs.js') : window.ScatterGraphs;

    const contexts = [
        { x: 'Hours of revision', y: 'Test mark', xw: 'hours', yw: 'marks',
            promptUp: a => `A pupil revised for ${S.quantity(a, 'hours')}. What mark did they get?`,
            promptAcross: b => `One pupil got a mark of ${b}. How many hours did they revise?` },
        { x: 'Rainy days', y: 'Road accidents', xw: 'rainy days', yw: 'accidents',
            promptUp: a => `In the week with ${S.quantity(a, 'rainy days')}, how many accidents were there?`,
            promptAcross: b => `In the week with ${S.quantity(b, 'accidents')}, how many rainy days were there?` },
        { x: 'Shots on target', y: 'Goals', xw: 'shots', yw: 'goals',
            promptUp: a => `A player had ${S.quantity(a, 'shots')} on target. How many goals did they score?`,
            promptAcross: b => `A player scored ${S.quantity(b, 'goals')}. How many shots on target did they have?` }
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

    function makeFigure(ctx, points, asked, highlight) {
        return (host, { readOnly }) => {
            const graph = S.makeGraph(host, { x: [0, 10], y: [0, 10], step: { x: 1, y: 1 }, labelEvery: 1,
                axisNames: { x: ctx.x, y: ctx.y },
                label: 'Scatter graph.' });
            points.forEach(p => {
                const big = highlight && p[0] === asked[0] && p[1] === asked[1];
                graph.point(p, { size: big ? 'large' : 'small', tone: !highlight || big ? 'neutral' : 'muted', coordinates: false });
            });
            graph.setEditable(!readOnly);
        };
    }

    const sunshineContext = { x: 'Hours of sunshine', y: 'Ice creams sold (boxes)', xw: 'hours of sunshine', yw: 'boxes of ice creams' };

    function plotPractice(item, random, helpers) {
        const { randomInt, shuffle } = helpers;
        const ctx = [...contexts, sunshineContext][randomInt(0, contexts.length, random)];
        const a = randomInt(1, 9, random);
        let b = randomInt(1, 9, random);
        while (b === a) b = randomInt(1, 9, random);
        const target = [a, b];
        const graph = { x: [0, 10], y: [0, 10], step: { x: 1, y: 1 }, labelEvery: 1,
            axisNames: { x: ctx.x, y: ctx.y }, label: 'Scatter graph.' };
        if (item.type === 'pick-point') {
            const candidates = shuffle([
                { point: target, labelSide: a === 9 ? 'right' : 'left', correct: true, feedback: `Across to ${a}, up to ${b}.` },
                { point: [b, a], labelSide: b > a ? (a === 1 ? 'right' : 'below') : 'left', feedback: `That point is back to front: ${b} across and ${a} up.` },
                { point: [a, b === 9 ? b - 1 : b + 1], labelSide: b === 9 ? 'below' : 'above', feedback: 'That one is one square too high or low. Count up again.' },
                { point: [a === 9 ? a - 1 : a + 1, b], labelSide: a === 9 ? 'left' : 'right', feedback: 'That one is one square off across. Count along again.' }
            ], random);
            const options = candidates.map((candidate, index) => ({ label: 'ABCD'[index],
                correct: Boolean(candidate.correct), feedback: candidate.feedback }));
            return {
                input: 'choice', questionType: item.type,
                prompt: `Which point shows ${S.quantity(a, ctx.xw)} and ${S.quantity(b, ctx.yw)}?`, options,
                model: { target, points: candidates.map(candidate => candidate.point), graph },
                figure(host) {
                    const board = S.makeGraph(host, graph);
                    candidates.forEach((candidate, index) => board.point(candidate.point, {
                        size: 'small', tone: 'neutral', label: 'ABCD'[index], labelSide: candidate.labelSide, coordinates: false
                    }));
                    board.setEditable(false);
                }
            };
        }
        let existing = null;
        let table = null;
        const points = [];
        if (item.type === 'plot-same-start') {
            const choices = Array.from({ length: 9 }, (_, index) => index + 1).filter(c => Math.abs(b - c) >= 2);
            const c = choices[randomInt(0, choices.length - 1, random)];
            existing = [a, c];
            points.push(existing);
            table = { rows: [ctx.xw, ctx.yw], values: [existing, target], selected: 1 };
        } else {
            while (points.length < 3) {
                const point = [randomInt(1, 9, random), randomInt(1, 9, random)];
                if (!S.samePoint(point, target) && !S.samePoint(point, [b, a]) && !points.some(other => S.samePoint(point, other))) points.push(point);
            }
        }
        return {
            input: 'custom', questionType: item.type,
            prompt: `Plot the point for ${S.quantity(a, ctx.xw)} and ${S.quantity(b, ctx.yw)}.`,
            model: { target, points, graph, existing },
            widget: S.plotWidget({ graph, points, target, existing, table, words: { x: ctx.xw, y: ctx.yw } })
        };
    }

    const scales = [{ step: 2, labels: 5 }, { step: 5, labels: 2 }, { step: 10, labels: 2 }, { step: 20, labels: 5 }];

    function scalesPractice(item, random, helpers) {
        const { randomInt, shuffle } = helpers;
        const xs = scales[randomInt(0, 2, random)];
        const ys = scales[randomInt(0, scales.length - 1, random)];
        const graph = { x: [0, 40], y: [0, ys.step * 10],
            step: { x: xs.step, y: ys.step }, labelEvery: { x: xs.labels, y: ys.labels },
            axisNames: { x: 'Temperature (°C)', y: 'Ice creams sold' }, label: 'Scatter graph with scaled axes.' };
        if (item.type === 'square-worth') {
            const axis = random() < 0.5 ? 'x' : 'y';
            const scale = axis === 'x' ? xs : ys;
            const alternatives = [
                { label: String(scale.step), correct: true,
                    feedback: `There are ${scale.labels} squares between each number, so one square is ${scale.step}.` },
                { label: String(scale.step * scale.labels), feedback: "That's the gap between two numbers. Count the squares in that gap." },
                { label: '1', feedback: "Squares aren't always worth 1. Count the squares between two numbers." },
                { label: String(scale.labels), feedback: "That's how many squares there are, not what each one is worth." }
            ];
            const seen = new Set();
            for (const option of alternatives) {
                if (seen.has(option.label)) {
                    option.label = String(scale.step * 2);
                    option.feedback = 'Count the squares between two numbers again.';
                }
                seen.add(option.label);
            }
            return { input: 'choice', questionType: item.type,
                prompt: `What is one square worth on the ${axis === 'x' ? 'bottom' : 'side'} axis?`,
                options: shuffle(alternatives, random), model: { graph, axis, step: scale.step, points: [] },
                figure(host) { S.makeGraph(host, graph).setEditable(false); } };
        }
        if (item.type === 'plot-scaled') {
            let across, up;
            do {
                across = randomInt(1, Math.floor(40 / xs.step), random);
                up = randomInt(1, 9, random);
            } while (across % xs.labels === 0 && up % ys.labels === 0);
            const target = [across * xs.step, up * ys.step];
            return { input: 'custom', questionType: item.type,
                prompt: `Plot ${S.quantity(target[0], '°C')} and ${S.quantity(target[1], 'ice creams')}.`,
                model: { target, points: [], graph },
                widget: S.plotWidget({ graph, points: [], target, words: { x: '°C', y: 'ice creams' },
                    mark: value => S.markScaledPlot(value, { target, step: graph.step }) }) };
        }
        graph.axisNames.x = 'Hours of sunshine';
        graph.x = [0, 10];
        graph.step.x = 1;
        graph.labelEvery.x = 1;
        const a = randomInt(1, 9, random);
        let b = randomInt(1, 9, random) * ys.step;
        while (a === b) b = randomInt(1, 9, random) * ys.step;
        const target = [a, b];
        const points = [];
        while (points.length < 3) {
            const point = [randomInt(1, 9, random), randomInt(1, 9, random) * ys.step];
            if (point[0] !== a && !points.some(other => S.samePoint(point, other))) points.push(point);
        }
        points.push(target);
        return { input: 'number', questionType: item.type,
            prompt: `How many ice creams were sold on the day with ${S.quantity(a, 'hours of sunshine')}?`,
            answer: String(b), feedback: `Across from ${a} to the point, then count the squares: ${b}.`,
            rules: [
                { value: String(b / ys.step), feedback: `That's the number of squares. One square is worth ${ys.step}.` },
                { value: String(a), feedback: `${a} is on the bottom axis.` },
                ...[b - ys.step, b + ys.step].map(value => ({ value: String(value), feedback: 'Count the squares again.' }))
            ], fallback: `Go straight up from ${a}, across to the side axis, then count the squares.`,
            model: { graph, target, points },
            figure(host) {
                const board = S.makeGraph(host, graph);
                points.forEach(point => board.point(point, { size: S.samePoint(point, target) ? 'large' : 'small',
                    tone: 'neutral', coordinates: false }));
                board.setEditable(false);
            } };
    }

    const practiceTypes = {
        read: ['read-pair', 'read-up', 'read-across'],
        plot: ['plot-pair', 'pick-point', 'plot-same-start'],
        scales: ['square-worth', 'plot-scaled', 'read-scaled']
    };
    const customTypes = ['plot-pair', 'plot-same-start', 'plot-scaled'];
    const numberTypes = ['read-up', 'read-across', 'read-scaled'];
    const inputFor = type => customTypes.includes(type) ? 'custom' : numberTypes.includes(type) ? 'number' : 'choice';

    function validMix(types) {
        const which = types.indexOf('which-graph');
        if (which < 1 || which > types.length - 2) return false;
        for (let index = 1; index < types.length; index++) {
            const input = inputFor(types[index]);
            if (input === 'custom' && inputFor(types[index - 1]) === input) return false;
            if (index > 1 && inputFor(types[index - 1]) === input && inputFor(types[index - 2]) === input) return false;
        }
        return true;
    }

    function whichGraph(random, { randomInt, shuffle }) {
        const across = [randomInt(1, 2, random), randomInt(4, 5, random), randomInt(7, 8, random)];
        let up;
        do { up = [randomInt(1, 2, random), randomInt(4, 5, random), randomInt(7, 8, random)]; }
        while (up.every((value, index) => value === across[index]));
        const sorted = [...up];
        do { up = shuffle(sorted, random); } while (up.every((value, index) => value === sorted[index]));
        const pairs = across.map((value, index) => [value, up[index]]);
        const entries = shuffle([
            { points: pairs, correct: true, feedback: 'Each point matches one column of the table.' },
            { points: pairs.map(([a, b]) => [b, a]), feedback: 'These are back to front: the second number went across.' },
            { points: across.map((value, index) => [value, sorted[index]]),
                feedback: 'The up numbers were put in order, so the pairs got mixed up. Keep each column together.' },
            { points: pairs.map(([a, b], index) => [a + Number(index === 0), b]),
                feedback: 'One point is one square off. Check each point against its column.' }
        ], random);
        const graph = { x: [0, 10], y: [0, 10], step: { x: 1, y: 1 }, labelEvery: 2, axisNames: { x: '', y: '' } };
        return {
            input: 'choice', questionType: 'which-graph',
            prompt: 'The table gives three pairs. Which graph plots them correctly?',
            options: entries.map((entry, index) => ({ label: 'ABCD'[index], correct: Boolean(entry.correct), feedback: entry.feedback })),
            model: { graph, points: [], pairs, graphs: entries.map(entry => entry.points) },
            figure(host) {
                S.pairTable(host, { rows: ['Hours', 'Mark'], values: pairs });
                const gallery = document.createElement('div');
                gallery.className = 'scatter-mini-graphs';
                host.append(gallery);
                entries.forEach((entry, index) => {
                    const figure = document.createElement('figure');
                    figure.className = 'scatter-mini-graph';
                    const caption = document.createElement('figcaption');
                    caption.textContent = 'ABCD'[index];
                    figure.append(caption);
                    const boardHost = document.createElement('div');
                    figure.append(boardHost);
                    gallery.append(figure);
                    const board = S.makeGraph(boardHost, { ...graph, label: `Graph ${'ABCD'[index]}.` });
                    entry.points.forEach(point => board.point(point, { size: 'small', tone: 'neutral', coordinates: false }));
                    board.setEditable(false);
                });
            }
        };
    }

    function pickPractice(part, count, random, helpers) {
        const { shuffle, randomInt } = helpers;
        let types;
        if (part === 'plot') {
            const plots = shuffle(['plot-pair', 'plot-same-start'], random);
            types = [plots[0], 'pick-point', plots[1]];
        } else if (part) types = shuffle(practiceTypes[part], random);
        else {
            const chosen = Object.values(practiceTypes).map(group => group[randomInt(0, group.length - 1, random)]);
            const remaining = shuffle(Object.values(practiceTypes).flat().filter(type => !chosen.includes(type)), random);
            chosen.push(...remaining.slice(0, 2), 'which-graph');
            let attempts = 0;
            do {
                types = shuffle(chosen, random);
                if (++attempts > 1000) throw new Error('Could not arrange Mixed Practice questions.');
            } while (!validMix(types));
        }
        return types.map(type => ({ type, seed: randomInt(0, 0xffffffff, random) }));
    }

    function practiceQuestion(item, random, helpers) {
        if (item.type === 'which-graph') return whichGraph(random, helpers);
        if (['square-worth', 'plot-scaled', 'read-scaled'].includes(item.type)) return scalesPractice(item, random, helpers);
        if (['plot-pair', 'pick-point', 'plot-same-start'].includes(item.type)) return plotPractice(item, random, helpers);
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
        const figure = makeFigure(ctx, points, asked, item.type === 'read-pair');
        const model = { target: asked, points, graph: { x: [0, 10], y: [0, 10],
            step: { x: 1, y: 1 }, labelEvery: 1, axisNames: { x: ctx.x, y: ctx.y } } };

        if (item.type === 'read-pair') {
            const opts = [
                { label: `${S.quantity(a, ctx.xw)} and ${S.quantity(b, ctx.yw)}`, feedback: `Down to ${a}, across to ${b}.`, correct: true },
                { label: `${S.quantity(b, ctx.xw)} and ${S.quantity(a, ctx.yw)}`, feedback: "That's back to front. Go down to the bottom axis first." },
                { label: `${S.quantity(a, ctx.xw)} and ${S.quantity(b + 1, ctx.yw)}`, feedback: "Count the side axis again from 0." },
                { label: `${S.quantity(a + 1, ctx.xw)} and ${S.quantity(b, ctx.yw)}`, feedback: "Go straight down. Count the bottom axis again from 0." }
            ];
            // ensure distinct
            const seen = new Set();
            const distinct = opts.filter(o => { if (seen.has(o.label)) return false; seen.add(o.label); return true; });
            return {
                input: 'choice', questionType: 'read-pair',
                prompt: 'Which pair does the big point show?',
                figure, model, options: shuffle(distinct, random)
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
                    rules.push({ value: String(y), feedback: `That's the point above another number. Find the point straight above ${a}.` });
                }
            });
            return {
                input: 'number', questionType: 'read-up',
                prompt: ctx.promptUp(a),
                figure, model, answer: String(b), feedback: `Up from ${a} to the point, then across to ${b}.`,
                rules, fallback: `Find ${a} on the bottom axis, go up to the point, then across.`
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
                rules.push({ value: String(x), feedback: `That's the point for another number. Find the point straight across from ${b}.` });
            }
        });
        return {
            input: 'number', questionType: 'read-across',
            prompt: ctx.promptAcross(b),
            figure, model, answer: String(a), feedback: `Across from ${b} to the point, then down to ${a}.`,
            rules, fallback: `Find ${b} on the side axis, go across to the point, then down.`
        };
    }

    function checkQuestion(definition, random, { shuffle }) {
        const question = {
            input: 'choice', questionType: definition.type, prompt: definition.prompt, lockedReview: true,
            options: shuffle([{ label: definition.correct, correct: true, feedback: definition.feedback }, ...definition.wrong], random)
        };
        if (definition.picture) question.figure = host => {
            const wrapper = document.createElement('div');
            wrapper.className = 'scatter-graph-host';
            host.append(wrapper);
            const scaled = definition.picture === 'scale';
            const board = S.makeGraph(wrapper, { x: [0, 10], y: [0, scaled ? 60 : 10],
                step: { x: 1, y: scaled ? 10 : 1 }, labelEvery: scaled ? { x: 2, y: 2 } : 1,
                axisNames: scaled ? { x: 'Hours of sunshine', y: 'Ice creams sold' }
                    : { x: 'Hours of revision', y: 'Test mark' },
                label: scaled ? 'A side axis with two squares between 0, 20, 40 and 60.' : 'A scatter graph with one big point.' });
            if (!scaled) [[1, 3], [3, 7], [5, 4], [8, 9]].forEach(point => {
                const big = S.samePoint(point, [5, 4]);
                board.point(point, { size: big ? 'large' : 'small', tone: big ? 'neutral' : 'muted', coordinates: false });
            });
            board.setEditable(false);
        };
        return question;
    }

    async function mountCheck(api, root) {
        const id = 'comparison';
        const { questions, summary } = api.getSection(id).config;
        const E = window.Maths1to9LessonEngine;
        const count = questions.length;
        const section = await api.useSectionState(id, {
            version: 1, upgrade: () => null,
            initial: () => ({ index: 0, screen: 0, finished: false, cards: {}, seed: E.randomInt(0, 0xffffffff) })
        });
        const state = section.state;
        root.closest('.lesson-section').removeAttribute('aria-labelledby');
        root.closest('.lesson-section').setAttribute('aria-label', 'Check');
        api.gateSection(id);
        function syncHash() {
            if (api.getCurrentSection().id === id) api.setSlideHash(state.screen === count ? 'summary' : `check-${state.screen + 1}`, { replace: true });
        }
        function show(screen) {
            section.update(saved => { saved.screen = screen; });
            render();
            const heading = root.querySelector('[data-screen-heading]');
            heading.tabIndex = -1;
            heading.focus();
        }
        function progress() {
            const current = state.cards[`final-check-${state.index + 1}`];
            api.setSectionProgress(id, state.finished ? count : state.index + Number(current?.correct === true), count);
        }
        function render() {
            root.replaceChildren();
            api.setSectionBack(id, state.screen > 0 ? { onClick: () => show(state.screen - 1) } : null);
            api.setSectionPosition(id, null);
            if (state.finished) api.completeSection(id);
            if (state.screen === count && state.finished) {
                const heading = document.createElement('h3');
                heading.dataset.screenHeading = '';
                heading.textContent = summary.title;
                const list = document.createElement('ul');
                list.className = 'scatter-learned';
                summary.points.forEach(point => {
                    const item = document.createElement('li');
                    item.textContent = point.text;
                    list.append(item);
                });
                root.append(heading, list);
                api.setSectionReset(id, null);
                api.setSectionAction(id, { label: 'All lessons', async onClick() {
                    api.completeLesson();
                    await window.Maths1to9Progress.saveCurrentLesson();
                    window.location.assign(new URL('../../', window.location.href).href);
                } });
            } else {
                const index = state.screen;
                const readOnly = index < state.index;
                api.createQuestion(root, {
                    ...checkQuestion(questions[index], E.seededRandom((state.seed + index) >>> 0), E),
                    sectionId: id, questionId: `final-check-${index + 1}`, scored: true, readOnly, lockedReview: true,
                    onFeedback: progress,
                    onContinue() {
                        section.update(saved => { saved.index++; saved.screen = saved.index; saved.finished = saved.index === count; });
                        progress();
                        render();
                    }
                });
                if (readOnly) api.setSectionAction(id, { label: 'Next', onClick: () => show(index + 1) });
            }
            syncHash();
        }
        for (let index = 0; index <= count; index++) api.registerHashRoute(index === count ? 'summary' : `check-${index + 1}`, () => {
            if (!api.goToSection(id, { moveFocus: false })) return false;
            show(Math.min(index, state.index));
        });
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        progress();
        render();
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { pickPractice, practiceQuestion, practiceTypes, checkQuestion };
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
            const section = host.closest('.lesson-section');
            section.removeAttribute('aria-labelledby');
            section.setAttribute('aria-label', part ? `${{ read: 'Read', plot: 'Plot', scales: 'Scales' }[part]} Practice` : 'Mixed Practice');
            await api.runQuestionSet(id, {
                version: part === 'plot' ? 3 : part === 'scales' ? 2 : part === 'read' ? 2 : 1, count: config.session_length, upgrade: () => null,
                pick: random => pickPractice(part, config.session_length, random, helpers),
                question: (item, random) => practiceQuestion(item, random, helpers)
            });
        }
        const checkRoot = document.getElementById(helpers.questionSetContainerId(slug, 'comparison'));
        await mountCheck(api, checkRoot);
    };
})();
