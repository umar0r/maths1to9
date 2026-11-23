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
            label: 'Scatter graph with two big points to drag.' };
        return {
            input: 'custom', questionType: 'drag-type',
            prompt: `Drag the two big points so the graph shows ${words} correlation.`,
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
                            : 'Keep the big points close to the others, carrying on the pattern.';
                    return { correct, feedback, points };
                },
                answerText: value => `You moved the points to ${value[0][1]} and ${value[1][1]}.`
            })
        };
    }

    function practiceQuestion(item, random, helpers) {
        if (item.type === 'name-type') return nameType(item, random, helpers);
        if (item.type === 'drag-type') return dragType(item, random, helpers);
        throw new Error(`Unknown Type practice question: ${item.type}`);
    }

    function pickPractice(part, count, random, helpers) {
        if (part !== 'type') throw new Error(`No practice generator for part ${part} yet.`);
        const { randomInt, shuffle } = helpers;
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
        module.exports = { pickPractice, practiceQuestion, contexts };
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
            if (kind === 'question-bank' && part === 'type') {
                await api.runQuestionSet(id, {
                    version: 1, count: config.session_length, upgrade: () => null,
                    pick: random => pickPractice('type', config.session_length, random, helpers),
                    question: (item, random) => practiceQuestion(item, random, helpers)
                });
                continue;
            }
            mountPlaceholder(api, host, id,
                kind === 'comparison' ? 'Check' : part ? practiceLabels[part] : 'Mixed Practice');
        }
    };
})();
