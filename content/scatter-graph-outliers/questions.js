(() => {
    'use strict';

    const slug = typeof document === 'undefined' ? 'scatter-graph-outliers' : document.body.dataset.lessonId;
    const O = typeof module !== 'undefined' && module.exports ? require('./outliers.js') : window.Outliers;

    function element(tag, text = '', className = '') {
        const node = document.createElement(tag);
        node.textContent = text;
        node.className = className;
        return node;
    }

    /* One picture of a whole graph, with no point picked out: every point is
       small and blue, and some can carry a letter. */
    function drawPoints(host, { points, labels = [], axisNames, label }) {
        const boardHost = element('div', '', 'outliers-graph');
        host.append(boardHost);
        const board = O.makeGraph(boardHost, { axisNames, label });
        points.forEach(point => {
            const text = labels.find(entry => O.samePoint(entry.point, point))?.text ?? null;
            const options = { size: 'small', tone: 'neutral', coordinates: false };
            if (text) options.label = text;
            board.point(point, options);
        });
        board.setEditable(false);
        return board;
    }

    /* The pictures the Check questions show. */
    const checkPictures = {
        sunshine: host => drawPoints(host, {
            axisNames: { x: 'Hours of sunshine', y: 'Ice creams sold (boxes)' },
            label: 'Scatter graph of hours of sunshine and ice creams sold, with points labelled A, B, C and D.',
            points: [[1, 2], [2, 2], [3, 3], [4, 5], [5, 5], [6, 7], [7, 7], [9, 9], [8, 2]],
            labels: [
                { point: [9, 9], text: 'A' },
                { point: [8, 2], text: 'B' },
                { point: [1, 2], text: 'C' },
                { point: [5, 5], text: 'D' }
            ]
        }),
        revision: host => drawPoints(host, {
            axisNames: { x: 'Hours of revision', y: 'Test mark' },
            label: 'Scatter graph of hours of revision and test marks.',
            points: [[1, 2], [2, 3], [3, 3], [4, 4], [5, 6], [7, 7], [8, 8], [9, 9], [6, 1]]
        }),
        heating: host => drawPoints(host, {
            axisNames: O.contexts.heating.axisNames,
            label: 'Scatter graph of outdoor temperature and heating used.',
            points: [...O.sets.HEATING.main, O.sets.HEATING.outlier]
        })
    };

    function checkQuestion(definition, random, { shuffle }) {
        const question = {
            input: 'choice', questionType: definition.type, prompt: definition.prompt, lockedReview: true,
            options: shuffle([{ label: definition.correct, correct: true, feedback: definition.feedback },
                ...definition.wrong], random)
        };
        if (definition.picture) question.figure = host => checkPictures[definition.picture](host);
        return question;
    }

    /* Check: five fixed questions, each answer kept so Back shows it marked. */
    async function mountCheck(api, root) {
        const id = 'comparison';
        const { questions, summary } = api.getSection(id).config;
        const E = window.Maths1to9LessonEngine;
        const count = questions.length;
        const box = root.closest('.lesson-section');
        box?.removeAttribute('aria-labelledby');
        box?.setAttribute('aria-label', 'Check');
        api.gateSection(id);
        const section = await api.useSectionState(id, {
            version: 1, upgrade: () => null,
            initial: () => ({ index: 0, screen: 0, finished: false, cards: {}, seed: E.randomInt(0, 0xffffffff) })
        });
        const state = section.state;

        function syncHash() {
            if (api.getCurrentSection().id === id) {
                api.setSlideHash(state.screen === count ? 'summary' : `check-${state.screen + 1}`, { replace: true });
            }
        }
        function show(screen) {
            section.update(saved => { saved.screen = screen; });
            render();
            const heading = root.querySelector('[data-screen-heading]');
            if (heading) {
                heading.tabIndex = -1;
                heading.focus();
            }
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
                list.className = 'outliers-learned';
                summary.points.forEach(point => {
                    const item = document.createElement('li');
                    item.textContent = point.text;
                    list.append(item);
                });
                root.append(heading, list);
                api.setSectionReset(id, null);
                api.setSectionAction(id, {
                    label: 'All lessons',
                    async onClick() {
                        api.completeLesson();
                        await window.Maths1to9Progress.saveCurrentLesson();
                        window.location.assign(new URL('../../', window.location.href).href);
                    }
                });
            } else {
                const index = state.screen;
                const readOnly = index < state.index;
                api.createQuestion(root, {
                    ...checkQuestion(questions[index], E.seededRandom((state.seed + index) >>> 0), E),
                    sectionId: id, questionId: `final-check-${index + 1}`, scored: true, readOnly, lockedReview: true,
                    onFeedback: progress,
                    onContinue() {
                        section.update(saved => {
                            saved.index++;
                            saved.screen = saved.index;
                            saved.finished = saved.index === count;
                        });
                        progress();
                        render();
                    }
                });
                if (readOnly) api.setSectionAction(id, { label: 'Next', onClick: () => show(index + 1) });
            }
            syncHash();
        }

        for (let index = 0; index <= count; index++) {
            api.registerHashRoute(index === count ? 'summary' : `check-${index + 1}`, () => {
                if (!api.goToSection(id, { moveFocus: false })) return false;
                show(Math.min(index, state.index));
            });
        }
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        progress();
        render();
    }

    /* A main-group point from the middle, which the four letters can use. */
    function middlePoint(set) {
        const used = [set.outlier, set.highest, set.lowest];
        const free = point => !used.some(other => O.samePoint(other, point));
        const middle = set.main.filter(point => point[0] >= 4 && point[0] <= 6 && free(point));
        const pool = middle.length ? middle : set.main.filter(free);
        return pool[0];
    }

    const letters = ['A', 'B', 'C', 'D'];

    const outlierTips = {
        outlier: "Yes. It's the one point that doesn't fit the pattern.",
        highest: 'That point is high, but it fits the pattern.',
        lowest: 'That point is low, but it fits the pattern.',
        middle: 'That point sits in the main group. Look for the one away from the others.'
    };

    /* Which point is the outlier? Four of the points carry the letters A to
       D, and the pupil picks the letter. */
    function whichOutlier(item, random, { shuffle }) {
        const context = O.contexts[item.context];
        const set = O.outlierSet(random, item.context);
        const roles = shuffle([
            { role: 'outlier', point: set.outlier },
            { role: 'highest', point: set.highest },
            { role: 'lowest', point: set.lowest },
            { role: 'middle', point: middlePoint(set) }
        ], random);
        const labels = roles.map((entry, index) => ({ point: entry.point, text: letters[index] }));
        return {
            input: 'choice', questionType: 'which-outlier',
            prompt: 'Which point is the outlier?',
            options: roles.map((entry, index) => ({
                label: letters[index],
                correct: entry.role === 'outlier',
                feedback: outlierTips[entry.role]
            })),
            model: { context: item.context, set, roles },
            figure(host) {
                drawPoints(host, {
                    points: [...set.main, set.outlier],
                    labels,
                    axisNames: context.axisNames,
                    label: 'Scatter graph with points labelled A, B, C and D.'
                });
            }
        };
    }

    /* Tap the outlier on a graph where every point looks the same. */
    function tapOutlier(item, random) {
        const context = O.contexts[item.context];
        const set = O.outlierSet(random, item.context);
        return {
            input: 'custom', questionType: 'tap-outlier',
            prompt: 'Tap the outlier.',
            model: { context: item.context, set },
            widget: O.tapOutlierWidget({
                context, set, label: 'Scatter graph. Tap the outlier.'
            })
        };
    }

    /* Read the outlier's value on one axis, typed into the box. */
    function readValue(item, random) {
        const context = O.contexts[item.context];
        const set = O.outlierSet(random, item.context);
        const [x, y] = set.outlier;
        const axis = item.axis === 'y' ? 'y' : 'x';
        const answer = axis === 'x' ? x : y;
        const other = axis === 'x' ? y : x;
        const otherSide = axis === 'x' ? 'side' : 'bottom';
        const direction = axis === 'x' ? 'down to the bottom axis' : 'across to the side axis';
        const rules = [];
        if (other !== answer) {
            rules.push({
                value: String(other),
                feedback: `That's the ${otherSide} axis value. This question asks for the ${context.axisWords[axis]}.`
            });
        }
        [set.highest, set.lowest].forEach(point => {
            const value = axis === 'x' ? point[0] : point[1];
            if (value === answer || rules.some(rule => rule.value === String(value))) return;
            rules.push({
                value: String(value),
                feedback: "That's a point that fits the pattern. Find the one away from the others."
            });
        });
        return {
            input: 'number', questionType: 'read-value',
            prompt: context.ask[axis],
            answer: String(answer),
            feedback: `Yes. The outlier shows ${context.words([x, y])}.`,
            rules,
            fallback: `Find the point that doesn't fit, then read straight ${direction}.`,
            model: { context: item.context, set, axis },
            figure(host) {
                drawPoints(host, {
                    points: [...set.main, set.outlier],
                    axisNames: context.axisNames,
                    label: context.label
                });
            }
        };
    }

    /* Which words describe the outlier? The right pair, the pair the wrong
       way round, and two points that fit the pattern. */
    function whichPair(item, random, { shuffle }) {
        const context = O.contexts[item.context];
        const set = O.outlierSet(random, item.context);
        const [x, y] = set.outlier;
        const words = point => context.words(point);
        const right = words(set.outlier);
        const swapped = words([y, x]);
        const seen = new Set([right, swapped]);
        const fitting = [];
        [set.highest, set.lowest, ...set.main].forEach(point => {
            if (fitting.length === 2) return;
            const text = words(point);
            if (seen.has(text)) return;
            seen.add(text);
            fitting.push(text);
        });
        return {
            input: 'choice', questionType: 'which-pair',
            prompt: 'Which describes the outlier?',
            options: shuffle([
                { label: right, correct: true, feedback: "Yes. That's the point away from the others." },
                { label: swapped, feedback: 'Those numbers are the wrong way round. Read the bottom axis first.' },
                { label: fitting[0], feedback: 'That point fits the pattern.' },
                { label: fitting[1], feedback: 'That point fits the pattern.' }
            ], random),
            model: { context: item.context, set },
            figure(host) {
                drawPoints(host, {
                    points: [...set.main, set.outlier],
                    axisNames: context.axisNames,
                    label: context.label
                });
            }
        };
    }

    /* A full graph of a generated set, with the outlier in blue and the rest
       grey: the screens about why a point is odd, or what the rest of the
       graph shows. */
    function figureWithOutlier(host, { set, context, label }) {
        O.graphPoints(host, { set, context, blue: [set.outlier], label });
    }

    /* The opposite of each pattern, in words a pupil might believe. */
    const backwards = {
        revision: 'Revising more makes your mark go down.',
        sunshine: 'Sunny days make people buy fewer ice creams.',
        heating: 'Warmer days make people use more heating.'
    };

    function reasonChoice(item, random, { shuffle }) {
        const context = O.contexts[item.context];
        const set = O.outlierSet(random, item.context);
        const reasons = O.reasonCards(item.context).map(card => card.label);
        const reason = reasons[Math.floor(random() * reasons.length)];
        const goes = context.direction === 1 ? 'up' : 'down';
        return {
            input: 'choice', questionType: 'reason-choice',
            prompt: 'Which could explain the outlier?',
            options: shuffle([
                { label: reason, correct: true, feedback: 'Yes. That could explain one point that doesn\'t fit.' },
                { label: backwards[item.context],
                    feedback: `One point can't change the pattern. The other points still go ${goes}.` },
                { label: 'All the other points must be wrong.',
                    feedback: 'It\'s only the outlier that doesn\'t fit. The other points agree with each other.' },
                { label: 'There must be no correlation.',
                    feedback: 'There\'s a clear pattern. The outlier just doesn\'t fit it.' }
            ], random),
            model: { context: item.context, set, reason },
            figure(host) {
                figureWithOutlier(host, { set, context, label: 'Scatter graph with the outlier in blue.' });
            }
        };
    }

    function reasonSort(item, random) {
        const context = O.contexts[item.context];
        const set = O.outlierSet(random, item.context);
        const cards = O.reasonCards(item.context);
        return {
            input: 'custom', questionType: 'reason-sort',
            prompt: 'Sort these reasons for the outlier.',
            model: { context: item.context, set, cards },
            widget: O.sortWidget({
                cards, slots: O.reasonSlots(),
                success: 'An outlier can be real but unusual, or just a mistake in the data.',
                wrong: 'Two reasons mean something unusual really happened. The other two mean the data was written down wrong.'
            })
        };
    }

    function ignoreType(item, random, { shuffle }) {
        const context = O.contexts[item.context];
        const set = O.outlierSet(random, item.context);
        const negative = context.direction === -1;
        const word = negative ? 'negative' : 'positive';
        const goes = negative ? 'down' : 'up';
        return {
            input: 'choice', questionType: 'ignore-type',
            prompt: 'What kind of correlation does this graph show?',
            options: shuffle([
                { label: `${negative ? 'Negative' : 'Positive'} correlation`, correct: true,
                    feedback: `Yes. Ignore the outlier: the other points go ${goes}.` },
                { label: `${negative ? 'Positive' : 'Negative'} correlation`,
                    feedback: `Ignore the outlier. The other points go ${goes}, so it's ${word}.` },
                { label: 'No correlation',
                    feedback: 'One outlier doesn\'t stop the pattern. Ignore it and look at the other points.' },
                { label: 'You can\'t tell, because of the outlier.',
                    feedback: 'You can. Ignore the outlier and look at the pattern of the other points.' }
            ], random),
            model: { context: item.context, set },
            figure(host) {
                O.graphPoints(host, { set, context, label: context.label });
            }
        };
    }

    /* Two small graphs from the generator, one positive and one heating, and
       the three names from Ignore Try it. */
    function ignoreSort(item, random) {
        const positiveContext = O.contexts[item.context];
        const heating = O.contexts.heating;
        const positiveSet = O.outlierSet(random, item.context);
        const heatingSet = O.outlierSet(random, 'heating');
        const graphs = [
            { bin: 'positive', set: positiveSet, context: positiveContext },
            { bin: 'negative', set: heatingSet, context: heating }
        ];
        if (random() < 0.5) graphs.reverse();
        const slots = graphs.map((graph, index) => ({
            id: graph.bin,
            dropLabel: `Name for graph ${index + 1}`,
            capacity: 1
        }));
        const figures = graphs.map(graph => ({
            id: graph.bin,
            points: [...graph.set.main, graph.set.outlier],
            label: graph.context.label
        }));
        return {
            input: 'custom', questionType: 'ignore-sort',
            prompt: 'Put the right name under each graph.',
            model: { contexts: graphs.map(graph => graph.set === heatingSet ? 'heating' : item.context) },
            widget: O.sortWidget({
                cards: O.ignoreCards, slots, figures,
                success: 'Ignore the outlier, and the pattern of the others tells you the correlation.',
                wrong: 'Ignore each outlier. Do the other points go up or down?'
            })
        };
    }

    function ignoreReply(item, random, { shuffle }) {
        const context = O.contexts[item.context];
        const set = O.outlierSet(random, item.context);
        const negative = context.direction === -1;
        const word = negative ? 'negative' : 'positive';
        const other = negative ? 'positive' : 'negative';
        const goes = negative ? 'down' : 'up';
        const otherGoes = negative ? 'up' : 'down';
        return {
            input: 'choice', questionType: 'ignore-reply',
            prompt: 'Someone says, "This graph has an outlier, so there is no correlation." Which reply is right?',
            options: shuffle([
                { label: `Ignore the outlier. The other points still show ${word} correlation.`, correct: true,
                    feedback: "Yes. One point that doesn't fit can't stop the pattern." },
                { label: 'They\'re right. An outlier means there is no correlation.',
                    feedback: `One point can't stop a pattern. The other points still go ${goes}.` },
                { label: `Ignoring the outlier leaves ${other} correlation.`,
                    feedback: `The other points go ${goes}, not ${otherGoes}.` },
                { label: `${negative ? 'Negative' : 'Positive'} correlation means every point must sit on one straight line.`,
                    feedback: `The points only need to go ${goes} overall. They don't have to sit on a line.` }
            ], random),
            model: { context: item.context, set },
            figure(host) {
                O.graphPoints(host, { set, context, label: context.label });
            }
        };
    }

    /* What each card is: its part, whether it is hands-on, and whether it is
       multiple choice. Mixed Practice picks from these. */
    const typeInfo = {
        'which-outlier': { part: 'spot', widget: false, choice: true },
        'tap-outlier': { part: 'spot', widget: true, choice: false },
        'read-value': { part: 'read', widget: false, choice: false },
        'which-pair': { part: 'read', widget: false, choice: true },
        'reason-choice': { part: 'reason', widget: false, choice: true },
        'reason-sort': { part: 'reason', widget: true, choice: false },
        'ignore-type': { part: 'ignore', widget: false, choice: true },
        'ignore-sort': { part: 'ignore', widget: true, choice: false },
        'ignore-reply': { part: 'ignore', widget: false, choice: true }
    };
    const partTypes = {
        spot: ['which-outlier', 'tap-outlier'],
        read: ['read-value', 'which-pair'],
        reason: ['reason-choice', 'reason-sort'],
        ignore: ['ignore-type', 'ignore-sort', 'ignore-reply']
    };
    const widgetTypes = Object.keys(typeInfo).filter(type => typeInfo[type].widget);
    const partIds = Object.keys(partTypes);

    /* No two hands-on cards in a row, and never three choice cards in a row. */
    function orderIsSpread(order) {
        let choiceRun = 0;
        for (let index = 0; index < order.length; index++) {
            const type = order[index];
            if (index > 0 && typeInfo[type].widget && typeInfo[order[index - 1]].widget) return false;
            choiceRun = typeInfo[type].choice ? choiceRun + 1 : 0;
            if (choiceRun > 2) return false;
        }
        return true;
    }

    /* Six cards, at least one from each part, at most two of any one type,
       exactly two hands-on cards and at least one typed one. */
    function pickMixed(count, random, helpers) {
        const { randomInt, shuffle } = helpers;
        const all = Object.keys(typeInfo);
        for (let attempt = 0; attempt < 500; attempt++) {
            const picked = shuffle(widgetTypes, random).slice(0, 2);
            const covered = new Set(picked.map(type => typeInfo[type].part));
            partIds.filter(part => !covered.has(part)).forEach(part => {
                const options = partTypes[part].filter(type => !typeInfo[type].widget);
                picked.push(options[Math.floor(random() * options.length)]);
            });
            // The fill only adds cards that are not hands-on: the two
            // hands-on cards are already chosen.
            while (picked.length < count) {
                const options = all.filter(type => !typeInfo[type].widget &&
                    picked.filter(other => other === type).length < 2);
                picked.push(options[Math.floor(random() * options.length)]);
            }
            if (picked.length !== count) continue;
            const order = shuffle(picked, random);
            if (!order.includes('read-value') || !orderIsSpread(order)) continue;

            const items = [];
            let previous = null;
            let typed = null;
            order.forEach(type => {
                // The sort always shows one positive graph and heating.
                const context = type === 'ignore-sort'
                    ? ['revision', 'sunshine'][Math.floor(random() * 2)]
                    : O.contextIds.filter(id => id !== previous)[Math.floor(random() * 2)];
                const item = { type, context, seed: randomInt(0, 0xffffffff, random) };
                if (type === 'read-value') {
                    // Two typed cards on the same graph ask for different axes.
                    item.axis = typed && typed.context === context
                        ? (typed.axis === 'x' ? 'y' : 'x')
                        : ['x', 'y'][Math.floor(random() * 2)];
                    typed = item;
                }
                previous = context;
                items.push(item);
            });
            return items;
        }
        throw new Error('No Mixed Practice set for that seed.');
    }

    function pickPractice(part, count, random, helpers) {
        const { randomInt, shuffle } = helpers;
        if (!part) return pickMixed(count, random, helpers);
        const seed = kind => ({ ...kind, seed: randomInt(0, 0xffffffff, random) });
        if (part === 'spot') {
            // The two letter cards ask about two different graphs.
            const order = shuffle([...O.contextIds], random);
            return [
                seed({ type: 'which-outlier', context: order[0] }),
                seed({ type: 'tap-outlier', context: order[1] }),
                seed({ type: 'which-outlier', context: order[2] })
            ];
        }
        if (part === 'read') {
            const order = shuffle([...O.contextIds], random);
            const axes = shuffle(['x', 'y'], random);
            return [
                seed({ type: 'read-value', context: order[0], axis: axes[0] }),
                seed({ type: 'which-pair', context: order[1] }),
                seed({ type: 'read-value', context: order[2], axis: axes[1] })
            ];
        }
        if (part === 'reason') {
            // The two choice cards ask about two different graphs.
            const order = shuffle([...O.contextIds], random);
            return [
                seed({ type: 'reason-choice', context: order[0] }),
                seed({ type: 'reason-sort', context: order[1] }),
                seed({ type: 'reason-choice', context: order[2] })
            ];
        }
        if (part === 'ignore') {
            const [first, second] = shuffle([...O.contextIds], random);
            let type = first;
            let reply = second;
            // The sort always shows one positive graph and heating, so it
            // needs a positive graph neither choice card uses.
            let positive = ['revision', 'sunshine'].find(id => id !== type && id !== reply);
            if (!positive) {
                // The two choice cards took both positive graphs, so one of
                // them shows heating and the sort takes that card's graph.
                type = 'heating';
                positive = reply === 'revision' ? 'sunshine' : 'revision';
            }
            return [
                seed({ type: 'ignore-type', context: type }),
                seed({ type: 'ignore-sort', context: positive }),
                seed({ type: 'ignore-reply', context: reply })
            ];
        }
        throw new Error(`No practice generator for part ${part} yet.`);
    }

    function practiceQuestion(item, random, helpers) {
        if (item.type === 'which-outlier') return whichOutlier(item, random, helpers);
        if (item.type === 'tap-outlier') return tapOutlier(item, random, helpers);
        if (item.type === 'read-value') return readValue(item, random, helpers);
        if (item.type === 'which-pair') return whichPair(item, random, helpers);
        if (item.type === 'reason-choice') return reasonChoice(item, random, helpers);
        if (item.type === 'reason-sort') return reasonSort(item, random, helpers);
        if (item.type === 'ignore-type') return ignoreType(item, random, helpers);
        if (item.type === 'ignore-sort') return ignoreSort(item, random, helpers);
        if (item.type === 'ignore-reply') return ignoreReply(item, random, helpers);
        throw new Error(`No practice card for ${item.type}.`);
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            checkQuestion, checkPictures, drawPoints,
            pickPractice, practiceQuestion, whichOutlier, tapOutlier, readValue, whichPair,
            reasonChoice, reasonSort, ignoreType, ignoreSort, ignoreReply,
            typeInfo, partTypes, widgetTypes, pickMixed, orderIsSpread
        };
        return;
    }

    window.Maths1to9QuestionSets ??= {};
    window.Maths1to9QuestionSets[slug] = async api => {
        const helpers = window.Maths1to9LessonEngine;
        for (const { id } of api.getSections()) {
            const section = api.getSection(id);
            const { kind, part, config } = section;
            if (kind !== 'question-bank' && kind !== 'comparison') continue;
            const host = document.getElementById(helpers.questionSetContainerId(slug, id));
            if (!host) continue;
            if (kind === 'question-bank') {
                await api.runQuestionSet(id, {
                    version: 1, count: config.session_length, upgrade: () => null,
                    pick: random => pickPractice(part, config.session_length, random, helpers),
                    question: (item, random) => practiceQuestion(item, random, helpers)
                });
                continue;
            }
            await mountCheck(api, host);
        }
    };
})();
