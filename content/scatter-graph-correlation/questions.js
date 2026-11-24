(() => {
    'use strict';

    const slug = typeof document === 'undefined' ? 'scatter-graph-correlation' : document.body.dataset.lessonId;
    const C = typeof module !== 'undefined' && module.exports ? require('./correlation.js') : window.Correlation;
    const practiceLabels = { type: 'Type Practice', strength: 'Strength Practice', describe: 'Describe Practice', cause: 'Cause Practice' };

    const names = { 1: 'Positive correlation', '-1': 'Negative correlation', 0: 'No correlation' };

    const lowerFirst = text => text[0].toLowerCase() + text.slice(1);

    /* Every positive and negative context, with the words a sentence uses
       about it: the axis words on their own (no units), the right sentence,
       the same sentence back to front, the "always" version, and the two gaps
       of the sentence-builder version with the pairs that say it right. */
    const contexts = [
        {
            direction: 1, x: 'Hours of revision', y: 'Test mark',
            words: { x: 'hours of revision', y: 'test mark' },
            right: 'Pupils who revise for longer tend to get higher marks.',
            back: 'Pupils who revise for longer tend to get lower marks.',
            always: 'Pupils who revise for longer always get higher marks.',
            sentence: {
                parts: ['Pupils who revise for ', 0, ' tend to get ', 1, ' marks.'],
                gaps: [['longer', 'shorter'], ['higher', 'lower']],
                pairs: [
                    { values: ['longer', 'higher'],
                        feedback: 'Yes. The points go up, so pupils who revise for longer tend to get higher marks.' },
                    { values: ['shorter', 'lower'],
                        feedback: "Yes. That's the same pattern said the other way round." }
                ],
                wrong: 'That would mean the points go down. Look again: do they go up or down?'
            }
        },
        {
            direction: 1, x: 'Hours of sunshine', y: 'Ice creams sold (boxes)',
            words: { x: 'hours of sunshine', y: 'ice creams sold' },
            right: 'Sunnier days tend to sell more ice creams.',
            back: 'Sunnier days tend to sell fewer ice creams.',
            always: 'Sunnier days always sell more ice creams.',
            sentence: {
                parts: [0, ' days tend to sell ', 1, ' ice creams.'],
                gaps: [['Sunnier', 'Colder'], ['more', 'fewer']],
                pairs: [
                    { values: ['Sunnier', 'more'],
                        feedback: 'Yes. The points go up, so sunnier days tend to sell more ice creams.' },
                    { values: ['Colder', 'fewer'],
                        feedback: "Yes. That's the same pattern said the other way round." }
                ],
                wrong: 'That would mean the points go down. Look again: do they go up or down?'
            }
        },
        {
            direction: 1, x: 'Hours of practice a week', y: 'Goals scored',
            words: { x: 'hours of practice a week', y: 'goals scored' },
            right: 'Players who practise more tend to score more goals.',
            back: 'Players who practise more tend to score fewer goals.',
            always: 'Players who practise more always score more goals.',
            sentence: {
                parts: ['Players who practise ', 0, ' tend to score ', 1, ' goals.'],
                gaps: [['more', 'less'], ['more', 'fewer']],
                pairs: [
                    { values: ['more', 'more'],
                        feedback: 'Yes. The points go up, so players who practise more tend to score more goals.' },
                    { values: ['less', 'fewer'],
                        feedback: "Yes. That's the same pattern said the other way round." }
                ],
                wrong: 'That would mean the points go down. Look again: do they go up or down?'
            }
        },
        {
            direction: -1, x: 'Age of car (years)', y: 'Value (£1000s)',
            words: { x: 'age of car', y: 'value' },
            right: 'Older cars tend to be worth less.',
            back: 'Older cars tend to be worth more.',
            always: 'Older cars are always worth less.',
            sentence: {
                parts: [0, ' cars tend to be worth ', 1, '.'],
                gaps: [['Older', 'Newer'], ['more', 'less']],
                pairs: [
                    { values: ['Older', 'less'],
                        feedback: 'Yes. The points go down, so older cars tend to be worth less.' },
                    { values: ['Newer', 'more'],
                        feedback: "Yes. That's the same pattern said the other way round." }
                ],
                wrong: 'That would mean the points go up. Look again: do they go up or down?'
            }
        },
        {
            direction: -1, x: 'Outdoor temperature (°C)', y: 'Heating used (kWh)',
            words: { x: 'outdoor temperature', y: 'heating used' },
            right: 'Warmer days tend to use less heating.',
            back: 'Warmer days tend to use more heating.',
            always: 'Warmer days always use less heating.',
            sentence: {
                parts: [0, ' days tend to use ', 1, ' heating.'],
                gaps: [['Warmer', 'Colder'], ['more', 'less']],
                pairs: [
                    { values: ['Warmer', 'less'],
                        feedback: 'Yes. The points go down, so warmer days tend to use less heating.' },
                    { values: ['Colder', 'more'],
                        feedback: "Yes. That's the same pattern said the other way round." }
                ],
                wrong: 'That would mean the points go up. Look again: do they go up or down?'
            }
        },
        {
            direction: -1, x: 'Hours of TV a day', y: 'Test mark',
            words: { x: 'hours of TV a day', y: 'test mark' },
            right: 'Pupils who watch more TV tend to get lower marks.',
            back: 'Pupils who watch more TV tend to get higher marks.',
            always: 'Pupils who watch more TV always get lower marks.',
            sentence: {
                parts: ['Pupils who watch ', 0, ' TV tend to get ', 1, ' marks.'],
                gaps: [['more', 'less'], ['higher', 'lower']],
                pairs: [
                    { values: ['more', 'lower'],
                        feedback: 'Yes. The points go down, so pupils who watch more TV tend to get lower marks.' },
                    { values: ['less', 'higher'],
                        feedback: "Yes. That's the same pattern said the other way round." }
                ],
                wrong: 'That would mean the points go up. Look again: do they go up or down?'
            }
        },
        { direction: 0, x: 'Shoe size', y: 'Test mark' },
        { direction: 0, x: 'Day of the month', y: 'Rainfall (mm)' }
    ];

    /* The Cause contexts, with every sentence the questions use written out. */
    const causeContexts = [
        {
            x: 'Ice creams sold (boxes)', y: 'Sunburn cases',
            words: { x: 'ice creams sold', y: 'sunburn cases' },
            reason: 'Sunny weather',
            shows: ['More ice creams sold tend to go with more sunburn.',
                'Fewer ice creams sold tend to go with less sunburn.'],
            cause: 'Eating ice cream causes sunburn.',
            cantTwo: 'Selling less ice cream would stop sunburn.',
            backwards: 'Sunburn makes people eat ice cream.'
        },
        {
            x: 'Hot chocolates sold', y: 'Gloves sold',
            words: { x: 'hot chocolates sold', y: 'gloves sold' },
            reason: 'Cold weather',
            shows: ['More hot chocolates sold tend to go with more gloves sold.',
                'Fewer hot chocolates sold tend to go with fewer gloves sold.'],
            cause: 'Drinking hot chocolate makes people buy gloves.',
            cantTwo: 'Selling less hot chocolate would stop people buying gloves.',
            backwards: 'Buying gloves makes people drink hot chocolate.'
        },
        {
            x: 'Shoe size', y: 'Reading score',
            words: { x: 'shoe size', y: 'reading score' },
            reason: "Children's age",
            shows: ['Children with bigger feet tend to have higher reading scores.',
                'Children with smaller feet tend to have lower reading scores.'],
            cause: 'Bigger feet make children better readers.',
            cantTwo: 'Making feet smaller would make children worse at reading.',
            backwards: 'Being a good reader makes your feet bigger.'
        },
        {
            x: 'Umbrellas sold', y: 'Car crashes',
            words: { x: 'umbrellas sold', y: 'car crashes' },
            reason: 'Rainy weather',
            shows: ['More umbrellas sold tend to go with more car crashes.',
                'Fewer umbrellas sold tend to go with fewer car crashes.'],
            cause: 'Buying umbrellas causes car crashes.',
            cantTwo: 'Banning umbrellas would stop car crashes.',
            backwards: 'Car crashes make people buy umbrellas.'
        }
    ];

    function contextFor(direction, random, { randomInt }) {
        const choices = contexts.filter(context => context.direction === direction);
        return choices[randomInt(0, choices.length - 1, random)];
    }

    const sortBins = [
        { id: 'shows', title: 'The graph shows this' },
        { id: 'cant', title: "The graph can't prove this" }
    ];

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

    /* A full graph of a point set, drawn the same way on every Practice card. */
    function drawPoints(host, { graph, points }) {
        const board = C.makeGraph(host, { ...graph, label: 'Scatter graph.' });
        points.forEach(point => board.point(point, { size: 'small', tone: 'neutral', coordinates: false }));
        board.setEditable(false);
    }

    /* Describe Practice, card 1: which sentence describes the pattern. */
    function describePattern(item, random, helpers) {
        const { shuffle } = helpers;
        const direction = item.direction;
        const context = contextFor(direction, random, helpers);
        const set = C.pointSet(random, { direction, strength: 'strong', count: 9 });
        const way = direction === 1 ? 'up' : 'down';
        const other = direction === 1 ? 'down' : 'up';
        const options = shuffle([
            { label: context.right, correct: true,
                feedback: `Yes. The points go ${way}, and that's what the sentence says.` },
            { label: context.back,
                feedback: `That would mean the points go ${other}. This graph goes ${way}.` },
            { label: `The ${context.words.y} is about the same every time.`,
                feedback: `The points don't stay level. They go ${way}.` },
            { label: `There's no link between ${context.words.x} and ${context.words.y}.`,
                feedback: "There's a clear pattern, so there is a link." }
        ], random);
        const graph = { axisNames: { x: context.x, y: context.y } };
        return {
            input: 'choice', questionType: 'describe-pattern',
            prompt: 'Which sentence describes the pattern?',
            options,
            model: { graph, points: set.points, r: set.r, direction, sentence: context.right },
            figure: host => drawPoints(host, { graph, points: set.points })
        };
    }

    /* Describe Practice, card 2: finish the sentence about the graph. */
    function finishSentence(item, random, helpers) {
        const direction = item.direction;
        const context = contextFor(direction, random, helpers);
        const set = C.pointSet(random, { direction, strength: 'strong', count: 9 });
        const graph = { axisNames: { x: context.x, y: context.y } };
        return {
            input: 'custom', questionType: 'finish-sentence',
            prompt: 'Finish the sentence for this graph.',
            model: { graph, points: set.points, r: set.r, sentence: context.sentence },
            figure: host => drawPoints(host, { graph, points: set.points }),
            widget: C.sentenceWidget({ sentence: context.sentence })
        };
    }

    /* Describe Practice, card 3: "tend to", never "always". */
    function tendNotAlways(item, random, helpers) {
        const { shuffle } = helpers;
        const direction = item.direction;
        const context = contextFor(direction, random, helpers);
        const set = C.pointSet(random, { direction, strength: 'weak', count: 9 });
        const way = direction === 1 ? 'up' : 'down';
        const other = direction === 1 ? 'down' : 'up';
        const options = shuffle([
            { label: context.right, correct: true,
                feedback: 'Yes. "Tend to" is right, because not every point fits.' },
            { label: context.always,
                feedback: 'Not every point fits the pattern, so "always" is wrong.' },
            { label: context.back,
                feedback: `That would mean the points go ${other}.` },
            { label: "There's no link, because the points don't make a straight line.",
                feedback: `The points don't need to make a line. They still go ${way} overall.` }
        ], random);
        const graph = { axisNames: { x: context.x, y: context.y } };
        return {
            input: 'choice', questionType: 'tend-not-always',
            prompt: 'Which sentence describes the graph best?',
            options,
            model: { graph, points: set.points, r: set.r, direction, sentence: context.right },
            figure: host => drawPoints(host, { graph, points: set.points })
        };
    }

    /* Cause Practice, card 1: what the graph shows, and what it can't. */
    function causeClaim(item, random, helpers) {
        const { shuffle } = helpers;
        const context = causeContexts[item.context];
        const set = C.pointSet(random, { direction: 1, strength: 'strong', count: 9 });
        const together = `${capitalise(context.words.x)} and ${context.words.y}`;
        const options = shuffle([
            { label: `${together} tend to go up together, but that doesn't prove one causes the other.`,
                correct: true, feedback: 'Yes. The graph shows they go together, not why.' },
            { label: context.cause,
                feedback: "The graph shows they go together. It can't show that one causes the other." },
            { label: "There's no correlation, because they're different things.",
                feedback: "Different things can still go up together. That's positive correlation." },
            { label: "It's negative correlation, because one thing can't cause the other.",
                feedback: "The points go up from left to right, so it's positive." }
        ], random);
        const graph = { axisNames: { x: context.x, y: context.y } };
        return {
            input: 'choice', questionType: 'cause-claim',
            prompt: 'Which sentence about this graph is right?',
            options,
            model: { graph, points: set.points, r: set.r, context: context.x },
            figure: host => drawPoints(host, { graph, points: set.points })
        };
    }

    /* Cause Practice, card 2: sort what the graph shows from what it can't. */
    function causeSort(item, random, helpers) {
        const context = causeContexts[item.context];
        const cards = helpers.shuffle([
            { id: 'shows-1', label: context.shows[0], bin: 'shows' },
            { id: 'shows-2', label: context.shows[1], bin: 'shows' },
            { id: 'cant-1', label: context.cause, bin: 'cant' },
            { id: 'cant-2', label: context.cantTwo, bin: 'cant' }
        ], random);
        const slots = sortBins.map(bin => ({ ...bin }));
        return {
            input: 'custom', questionType: 'cause-sort',
            prompt: 'Sort the sentences about this graph.',
            model: { cards: cards.map(card => ({ ...card })), slots, context: context.x },
            widget: C.sortSentencesWidget({
                cards, slots,
                success: "All four are right. The graph shows the two go together. It can't show why.",
                wrong: 'Two sentences say what the graph shows. The other two say one thing causes the other, which the graph can\'t prove.'
            })
        };
    }

    /* Cause Practice, card 3: what could make both of them go up. */
    function causeReason(item, random, helpers) {
        const { shuffle } = helpers;
        const context = causeContexts[item.context];
        const together = `${capitalise(context.words.x)} and ${context.words.y}`;
        const options = shuffle([
            { label: context.reason, correct: true,
                feedback: 'Yes. That could push both up at the same time.' },
            { label: context.cause,
                feedback: "The graph can't prove that. Something else could cause both." },
            { label: context.backwards,
                feedback: "The graph can't prove that either way round." },
            { label: 'Nothing. One of them must cause the other.',
                feedback: 'Not always. Something else can make both go up.' }
        ], random);
        return {
            input: 'choice', questionType: 'cause-reason',
            prompt: `${together} go up together. What could make both of them go up?`,
            options,
            model: { reason: context.reason, context: context.x }
        };
    }

    function practiceQuestion(item, random, helpers) {
        if (item.type === 'name-type') return nameType(item, random, helpers);
        if (item.type === 'drag-type') return dragType(item, random, helpers);
        if (item.type === 'name-strength') return nameStrength(item, random, helpers);
        if (item.type === 'drag-strong') return dragStrong(item, random, helpers);
        if (item.type === 'strongest') return strongest(random, helpers);
        if (item.type === 'describe-pattern') return describePattern(item, random, helpers);
        if (item.type === 'finish-sentence') return finishSentence(item, random, helpers);
        if (item.type === 'tend-not-always') return tendNotAlways(item, random, helpers);
        if (item.type === 'cause-claim') return causeClaim(item, random, helpers);
        if (item.type === 'cause-sort') return causeSort(item, random, helpers);
        if (item.type === 'cause-reason') return causeReason(item, random, helpers);
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
        if (part === 'describe') {
            return [
                { type: 'describe-pattern', direction: random() < 0.5 ? 1 : -1 },
                { type: 'finish-sentence', direction: random() < 0.5 ? 1 : -1 },
                { type: 'tend-not-always', direction: random() < 0.5 ? 1 : -1 }
            ].map(kind => ({ ...kind, seed: randomInt(0, 0xffffffff, random) }));
        }
        if (part === 'cause') {
            // Three cards, each about a different pair of things.
            const order = shuffle([0, 1, 2, 3], random).slice(0, 3);
            return [
                { type: 'cause-claim', context: order[0] },
                { type: 'cause-sort', context: order[1] },
                { type: 'cause-reason', context: order[2] }
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
        module.exports = {
            pickPractice, practiceQuestion, contexts, causeContexts, sortBins,
            nameStrength, dragStrong, strongest, describePattern, finishSentence,
            tendNotAlways, causeClaim, causeSort, causeReason
        };
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
            if (kind === 'question-bank' && part) {
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
