(() => {
    'use strict';

    const slug = typeof document === 'undefined' ? 'scatter-graph-correlation' : document.body.dataset.lessonId;
    const C = typeof module !== 'undefined' && module.exports ? require('./correlation.js') : window.Correlation;
    const practiceLabels = { type: 'Type Practice', strength: 'Strength Practice', describe: 'Describe Practice', cause: 'Cause Practice' };

    const names = { 1: 'Positive correlation', '-1': 'Negative correlation', 0: 'No correlation' };

    const contexts = [
        { direction: 1, x: 'Hours of revision', y: 'Test mark' },
        { direction: 1, x: 'Hours of sunshine', y: 'Ice creams sold (boxes)' },
        { direction: 1, x: 'Shots on target', y: 'Goals' },
        { direction: -1, x: 'Age of car (years)', y: 'Value (£1000s)' },
        { direction: -1, x: 'Outdoor temperature (°C)', y: 'Heating used (kWh)' },
        { direction: -1, x: 'Hours of TV a day', y: 'Test mark' },
        { direction: 0, x: 'Shoe size', y: 'Test mark' },
        { direction: 0, x: 'Day of the month', y: 'Rainfall (mm)' }
    ];

    function contextFor(direction, random, { randomInt }) {
        const choices = contexts.filter(context => context.direction === direction);
        return choices[randomInt(0, choices.length - 1, random)];
    }

    function wrongNameFeedback(actual, chosen) {
        if (actual === 0) return "These points don't go up or down. They're spread all over.";
        if (chosen === 0) return 'There is a pattern: do the points go up or down?';
        if (actual === 1) return "These points go up from left to right, so it's positive.";
        return "These points go down from left to right, so it's negative.";
    }

    function nameType(item, random, helpers) {
        const { randomInt, shuffle } = helpers;
        const context = contextFor(item.direction, random, helpers);
        const set = C.pointSet(random, { direction: item.direction, strength: 'strong',
            count: randomInt(8, 9, random) });
        const right = names[item.direction];
        const options = shuffle([
            { label: right, correct: true,
                feedback: item.direction === 1 ? 'The points go up from left to right.'
                    : item.direction === -1 ? 'The points go down from left to right.'
                        : 'The points are spread all over, with no pattern up or down.' },
            ...[1, -1, 0].filter(direction => direction !== item.direction).map(direction => ({
                label: names[direction],
                feedback: wrongNameFeedback(item.direction, direction)
            })),
            { label: "You can't tell from a scatter graph.",
                feedback: 'You can. Look at whether the points go up, go down or have no pattern.' }
        ], random);
        const graph = { axisNames: { x: context.x, y: context.y }, label: 'Scatter graph.' };
        return {
            input: 'choice', questionType: 'name-type',
            prompt: 'What kind of correlation does this graph show?',
            options,
            model: { graph, points: set.points, r: set.r },
            figure(host) {
                const board = C.makeGraph(host, { ...graph, label: 'Scatter graph.' });
                set.points.forEach(point => board.point(point, {
                    size: 'small', tone: 'neutral', coordinates: false
                }));
                board.setEditable(false);
            }
        };
    }

    function dragType(item, random, helpers) {
        const { randomInt } = helpers;
        const context = contextFor(item.direction, random, helpers);
        const direction = item.direction;
        const pattern = C.pointSet(random, { direction, strength: 'strong', count: 9 });
        const { m, c } = pattern;
        const fixed = C.patternPoints(random, { direction, m, c, xs: [1, 2, 3, 4, 5, 6] });
        const targets = [7, 8].map(x => C.patternY({ c, m }, direction, x));
        const starts = direction === 1 ? [1, 1] : [9, 9];
        const words = direction === 1 ? 'positive' : 'negative';
        const graph = { axisNames: { x: context.x, y: context.y },
            label: 'Scatter graph with two blue points to drag.' };
        return {
            input: 'custom', questionType: 'drag-type',
            prompt: `Drag the two blue points so the graph shows ${words} correlation.`,
            model: { graph, fixed, targets, direction },
            widget: C.dragPointsWidget({
                graph,
                fixed,
                movable: [[7, starts[0]], [8, starts[1]]],
                check(value) {
                    const points = [0, 1].map(index => Math.abs(value[index][1] - targets[index]) <= 2);
                    const correct = points.every(Boolean);
                    const wrongEnd = points.some((right, index) => !right && (direction === 1
                        ? value[index][1] < targets[index] - 2
                        : value[index][1] > targets[index] + 2));
                    const feedback = correct
                        ? `Now every point goes ${direction === 1 ? 'up' : 'down'} from left to right.`
                        : wrongEnd
                            ? direction === 1
                                ? 'That point is too low. Positive means the points keep going up.'
                                : 'That point is too high. Negative means the points keep going down.'
                            : 'Keep the blue points close to the others, carrying on the pattern.';
                    return { correct, feedback, points };
                },
                answerText: value => `You moved the points to ${value[0][1]} and ${value[1][1]}.`
            })
        };
    }

    const capitalise = word => word[0].toUpperCase() + word.slice(1);

    /* Strength Practice, card 1: which description fits the graph. */
    function nameStrength(item, random, helpers) {
        const { randomInt, shuffle } = helpers;
        const { direction, strength } = item;
        const context = contextFor(direction, random, helpers);
        const set = C.pointSet(random, { direction, strength, count: 9 });
        const way = direction === 1 ? 'up' : 'down';
        const same = direction === 1 ? 'positive' : 'negative';
        const other = direction === 1 ? 'negative' : 'positive';
        const otherStrength = strength === 'strong' ? 'weak' : 'strong';
        const options = shuffle([
            {
                label: `${capitalise(strength)} ${same} correlation`,
                correct: true,
                feedback: strength === 'strong'
                    ? `The points go ${way} from left to right and sit close to a straight line.`
                    : `The points go ${way} from left to right, but they're quite spread out, so it's weak.`
            },
            {
                label: `${capitalise(strength)} ${other} correlation`,
                feedback: `The points go ${way}, so it's ${same}, not ${other}.`
            },
            {
                label: `${capitalise(otherStrength)} ${same} correlation`,
                feedback: strength === 'strong'
                    ? "The points sit close to a straight line, so it's strong."
                    : "The points are quite spread out, so it's weak."
            },
            { label: 'No correlation', feedback: `There is a clear pattern going ${way}.` }
        ], random);
        const graph = { axisNames: { x: context.x, y: context.y } };
        return {
            input: 'choice', questionType: 'name-strength',
            prompt: 'Which description fits this scatter graph?',
            options,
            model: { graph, points: set.points, r: set.r },
            figure(host) {
                const board = C.makeGraph(host, { ...graph, label: 'Scatter graph.' });
                set.points.forEach(point => board.point(point, {
                    size: 'small', tone: 'neutral', coordinates: false
                }));
                board.setEditable(false);
            }
        };
    }

    /* Strength Practice, card 2: one blue point pulled off a straight set. */
    function dragStrong(item, random, helpers) {
        const { randomInt } = helpers;
        const direction = item.direction;
        const context = contextFor(direction, random, helpers);
        const pattern = C.pointSet(random, { direction, strength: 'strong', count: 9 });
        const { m, c } = pattern;
        const inside = pattern.points.map(point => point[0]).filter(x => x >= 3 && x <= 7);
        const x = inside[randomInt(0, inside.length - 1, random)];
        const p = C.patternY({ c, m }, direction, x);
        // Four or more away from the pattern, and still on the graph.
        const away = p <= 5 ? Math.min(10, Math.ceil(p + 4)) : Math.max(0, Math.floor(p - 4));
        const fixed = pattern.points.filter(point => point[0] !== x);
        const graph = { axisNames: { x: context.x, y: context.y },
            label: 'Scatter graph with one blue point to drag.' };
        return {
            input: 'custom', questionType: 'drag-strong',
            prompt: 'Drag the blue point so the correlation is strong.',
            model: { graph, fixed, target: [x, p], direction, moved: [x, away] },
            widget: C.dragPointsWidget({
                graph,
                fixed,
                movable: [[x, away]],
                check(value) {
                    const right = Math.abs(value[0][1] - p) <= 1;
                    return {
                        correct: right,
                        points: [right],
                        feedback: right
                            ? 'Now all the points sit close to a straight line, so the correlation is strong.'
                            : 'That point is still a long way from the others. Move it so it fits the pattern.'
                    };
                },
                answerText: value => `You moved the point to ${value[0][1]}.`
            })
        };
    }

    /* Strength Practice, card 3: four small graphs, which is the strongest. */
    function strongest(random, helpers) {
        const { shuffle } = helpers;
        const entries = shuffle([
            { role: 'strong positive', set: C.pointSet(random, { direction: 1, strength: 'strong', count: 9 }) },
            { role: 'weak positive', set: C.pointSet(random, { direction: 1, strength: 'weak', count: 9 }) },
            { role: 'weak negative', set: C.pointSet(random, { direction: -1, strength: 'weak', count: 9 }) },
            { role: 'none', set: C.pointSet(random, { direction: 0, count: 9 }) }
        ], random);
        const words = {
            'strong positive': 'Yes. Its points sit closest to a straight line.',
            'weak positive': "That one goes up, but the points are spread out, so it's weak.",
            'weak negative': "Those points are spread out, so it's weak.",
            none: 'That one has no pattern at all.'
        };
        return {
            input: 'choice', questionType: 'strongest',
            prompt: 'Which graph shows the strongest correlation?',
            options: entries.map((entry, index) => ({
                label: 'ABCD'[index], correct: entry.role === 'strong positive', feedback: words[entry.role]
            })),
            model: { graphs: entries.map(entry => ({ role: entry.role, points: entry.set.points, r: entry.set.r })) },
            figure(host) {
                const gallery = document.createElement('div');
                gallery.className = 'correlation-mini-graphs correlation-mini-graphs--four';
                host.append(gallery);
                entries.forEach((entry, index) => C.miniGraph(gallery, {
                    points: entry.set.points,
                    caption: 'ABCD'[index],
                    label: `Graph ${'ABCD'[index]}.`
                }));
            }
        };
    }

    function practiceQuestion(item, random, helpers) {
        if (item.type === 'name-type') return nameType(item, random, helpers);
        if (item.type === 'drag-type') return dragType(item, random, helpers);
        if (item.type === 'name-strength') return nameStrength(item, random, helpers);
        if (item.type === 'drag-strong') return dragStrong(item, random, helpers);
        if (item.type === 'strongest') return strongest(random, helpers);
        throw new Error(`Unknown practice question: ${item.type}`);
    }

    function pickPractice(part, count, random, helpers) {
        const { randomInt, shuffle } = helpers;
        if (part === 'strength') {
            return [
                { type: 'name-strength', direction: random() < 0.5 ? 1 : -1,
                    strength: random() < 0.5 ? 'strong' : 'weak' },
                { type: 'drag-strong', direction: random() < 0.5 ? 1 : -1 },
                { type: 'strongest' }
            ].map(kind => ({ ...kind, seed: randomInt(0, 0xffffffff, random) }));
        }
        if (part !== 'type') throw new Error(`No practice generator for part ${part} yet.`);
        // The two name-type cards ask about different directions.
        const directions = shuffle([1, -1, 0], random).slice(0, count === 3 ? 2 : count);
        const kinds = [
            { type: 'name-type', direction: directions[0] },
            { type: 'drag-type', direction: random() < 0.5 ? 1 : -1 },
            { type: 'name-type', direction: directions[1] }
        ];
        return kinds.map(kind => ({ ...kind, seed: randomInt(0, 0xffffffff, random) }));
    }

    function mountPlaceholder(api, host, id, label) {
        const box = host.closest('.lesson-section');
        box?.removeAttribute('aria-labelledby');
        box?.setAttribute('aria-label', label);
        api.gateSection(id);
        host.replaceChildren();
        const heading = document.createElement('h2');
        heading.textContent = 'This part comes next.';
        heading.id = `lesson-section-title-${id}`;
        heading.dataset.screenHeading = '';
        heading.tabIndex = -1;
        host.append(heading);
        api.setSectionBack(id, null);
        api.setSectionReset(id, null);
        if (id !== 'comparison') {
            api.setSectionAction(id, {
                label: 'Continue',
                onClick() {
                    api.completeSection(id);
                    api.continueSection();
                }
            });
            return;
        }
        api.setSectionAction(id, {
            label: 'All lessons',
            async onClick() {
                api.completeSection(id);
                api.completeLesson();
                window.location.assign(new URL('../../', window.location.href).href);
            }
        });
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { pickPractice, practiceQuestion, contexts, nameStrength, dragStrong, strongest };
        return;
    }

    window.Maths1to9QuestionSets ??= {};
    window.Maths1to9QuestionSets[slug] = async api => {
        const helpers = window.Maths1to9LessonEngine;
        for (const { id } of api.getSections()) {
            const { kind, part, config } = api.getSection(id);
            if (kind !== 'question-bank' && kind !== 'comparison') continue;
            const host = document.getElementById(helpers.questionSetContainerId(slug, id));
            if (!host) continue;
            if (kind === 'question-bank' && (part === 'type' || part === 'strength')) {
                await api.runQuestionSet(id, {
                    version: 2, count: config.session_length, upgrade: () => null,
                    pick: random => pickPractice(part, config.session_length, random, helpers),
                    question: (item, random) => practiceQuestion(item, random, helpers)
                });
                continue;
            }
            mountPlaceholder(api, host, id,
                kind === 'comparison' ? 'Check' : part ? practiceLabels[part] : 'Mixed Practice');
        }
    };
})();
