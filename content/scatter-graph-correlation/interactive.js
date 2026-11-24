(() => {
    'use strict';

    const slug = document.body.dataset.lessonId;
    const C = window.Correlation;

    function element(tag, text = '', className = '') {
        const node = document.createElement(tag);
        node.textContent = text;
        node.className = className;
        return node;
    }

    /* The eight Learn screens. Every one is a heading, a still picture and
       Next, with no tapping or dragging anywhere. */
    const learn = {
        type: [
            {
                heading: 'Correlation is the pattern the points make on a scatter graph. There are three kinds.',
                draw: host => C.smallGraphs(host, [
                    {
                        caption: 'Positive correlation', points: C.sets.positiveLearning,
                        label: 'Scatter graph with positive correlation.'
                    },
                    {
                        caption: 'Negative correlation', points: C.sets.negativeLearning,
                        label: 'Scatter graph with negative correlation.'
                    },
                    {
                        caption: 'No correlation', points: C.sets.noneLearning,
                        label: 'Scatter graph with no correlation.'
                    }
                ])
            },
            {
                heading: 'Positive correlation means the points go up from left to right.',
                draw(host) {
                    const board = C.fullGraph(host, {
                        points: C.sets.revision,
                        axisNames: { x: 'Hours of revision', y: 'Test mark' },
                        label: 'Scatter graph of hours of revision and test marks.'
                    });
                    host.append(C.note('More revision, higher marks.'));
                    return [board];
                }
            },
            {
                heading: 'Negative correlation means the points go down from left to right.',
                draw(host) {
                    const board = C.fullGraph(host, {
                        points: C.sets.heating,
                        axisNames: { x: 'Outdoor temperature (°C)', y: 'Heating used (kWh)' },
                        label: 'Scatter graph of outdoor temperature and heating used.'
                    });
                    host.append(C.note('Warmer days, less heating.'));
                    return [board];
                }
            },
            {
                heading: 'No correlation means the points are spread all over, with no pattern up or down.',
                draw(host) {
                    const board = C.fullGraph(host, {
                        points: C.sets.shoeSize,
                        axisNames: { x: 'Shoe size', y: 'Test mark' },
                        label: 'Scatter graph of shoe size and test marks.'
                    });
                    host.append(C.note("Big feet don't mean higher marks."));
                    return [board];
                }
            }
        ],
        strength: [
            {
                heading: "When the points sit close to a straight line, the correlation is strong. When they're more spread out, it's weak.",
                draw: host => C.smallGraphs(host, [
                    {
                        caption: 'Strong positive correlation', points: C.sets.strongPositive,
                        label: 'Scatter graph with strong positive correlation.'
                    },
                    {
                        caption: 'Weak positive correlation', points: C.sets.weakPositive,
                        label: 'Scatter graph with weak positive correlation.'
                    }
                ])
            }
        ],
        describe: [
            {
                heading: 'To describe correlation in words, say what tends to happen to one thing as the other goes up.',
                draw(host) {
                    const board = C.fullGraph(host, {
                        points: C.sets.revision,
                        axisNames: { x: 'Hours of revision', y: 'Test mark' },
                        label: 'Scatter graph of hours of revision and test marks.'
                    });
                    host.append(C.sentence('Pupils who revise for longer tend to get higher marks.'));
                    return [board];
                }
            },
            {
                heading: 'We say "tend to" because not every point fits the pattern.',
                draw(host) {
                    const board = C.fullGraph(host, {
                        points: C.sets.revision,
                        axisNames: { x: 'Hours of revision', y: 'Test mark' },
                        big: [[5, 4], [4, 5]],
                        label: 'Scatter graph of hours of revision and test marks, with two blue points.'
                    });
                    board.arrow([9, 1.2], [5.4, 3.6], { tone: 'ink' });
                    host.append(C.note('5 hours, but a lower mark than 4 hours.'));
                    return [board];
                }
            }
        ],
        cause: [
            {
                heading: "Correlation doesn't prove that one thing causes the other.",
                draw(host) {
                    const board = C.fullGraph(host, {
                        points: C.sets.iceCreamSunburn,
                        axisNames: { x: 'Ice creams sold (boxes)', y: 'Sunburn cases' },
                        label: 'Scatter graph of ice creams sold and sunburn cases.'
                    });
                    host.append(C.note("Ice cream doesn't cause sunburn. Both go up on sunny days."));
                    return [board];
                }
            }
        ]
    };

    /* Type Try it, screens 1 and 2: drag two blue points into the pattern. */
    const typeDragScreens = [
        {
            heading: 'Drag the two blue points so the graph shows positive correlation.',
            axisNames: { x: 'Hours of revision', y: 'Test mark' },
            label: 'Scatter graph of hours of revision and test marks, with two blue points to drag.',
            fixed: [[1, 2], [2, 2], [3, 4], [4, 4], [5, 5], [6, 6]],
            starts: [1, 1],
            ranges: [[5, 9], [6, 10]],
            success: "Now every point goes up from left to right. That's positive correlation.",
            tooLow: 'That point is too low. The points go up, so it needs to be higher than the ones to its left.',
            tooHigh: "That's a big jump. Keep it close to the other points."
        },
        {
            heading: 'Drag the two blue points so the graph shows negative correlation.',
            axisNames: { x: 'Outdoor temperature (°C)', y: 'Heating used (kWh)' },
            label: 'Scatter graph of outdoor temperature and heating used, with two blue points to drag.',
            fixed: [[1, 9], [2, 8], [3, 8], [4, 6], [5, 6], [6, 4]],
            starts: [9, 9],
            ranges: [[1, 5], [0, 4]],
            success: 'Now every point goes down from left to right. That\'s negative correlation.',
            tooHigh: 'That point is too high. The points go down, so it needs to be lower than the ones to its left.',
            tooLow: "That's a big drop. Keep it close to the other points."
        }
    ];

    /* Type Try it, screen 3: put the right name under each graph. */
    const typeSort = {
        heading: 'Put the right name under each graph.',
        cards: [
            { id: 'positive', label: 'Positive' },
            { id: 'negative', label: 'Negative' },
            { id: 'none', label: 'No correlation' }
        ],
        slots: [
            {
                id: 'negative', points: C.sets.negativeLearning,
                dropLabel: 'Name for the falling graph',
                label: 'Scatter graph with negative correlation.'
            },
            {
                id: 'none', points: C.sets.noneLearning,
                dropLabel: 'Name for the graph with no pattern',
                label: 'Scatter graph with no correlation.'
            },
            {
                id: 'positive', points: C.sets.positiveLearning,
                dropLabel: 'Name for the rising graph',
                label: 'Scatter graph with positive correlation.'
            }
        ],
        success: 'Up is positive, down is negative, and no pattern is no correlation.',
        hint(slotId, itemId) {
            if (slotId === 'none') return "These points don't go up or down. They're all over the place.";
            if (itemId === 'none') return 'There is a pattern here. Do the points go up or down?';
            return slotId === 'positive'
                ? 'These points go up from left to right.'
                : 'These points go down from left to right.';
        }
    };

    const strengthSort = {
        heading: 'Put the right name under each graph.',
        cards: [
            { id: 'strong-positive', label: 'Strong positive' },
            { id: 'weak-positive', label: 'Weak positive' },
            { id: 'strong-negative', label: 'Strong negative' },
            { id: 'weak-negative', label: 'Weak negative' }
        ],
        // The four graphs, in the order the spec gives: strong positive,
        // weak negative, weak positive, strong negative.
        slots: [
            { id: 'strong-positive', direction: 1, strength: 'strong', seed: 1301 },
            { id: 'weak-negative', direction: -1, strength: 'weak', seed: 2302 },
            { id: 'weak-positive', direction: 1, strength: 'weak', seed: 3303 },
            { id: 'strong-negative', direction: -1, strength: 'strong', seed: 4304 }
        ],
        success: 'Up or down tells you positive or negative. How close the points are tells you strong or weak.',
        hint(slotId, itemId) {
            const slot = strengthSort.slots.find(entry => entry.id === slotId);
            const direction = itemId.endsWith('positive') ? 1 : -1;
            return direction === slot.direction
                ? 'Right way. Now look how close the points are to a straight line.'
                : 'Do the points go up or down from left to right?';
        }
    };

    /* Strength Try it, screen 2: two blue points into an already straight set. */
    const strengthDrag = {
        heading: 'Drag the two blue points so the correlation is strong.',
        axisNames: { x: 'Hours of sunshine', y: 'Ice creams sold (boxes)' },
        label: 'Scatter graph of hours of sunshine and ice creams sold, with two blue points to drag.',
        fixed: [[1, 1], [2, 2], [4, 4], [5, 5], [6, 6], [8, 8], [9, 9]],
        xs: [3, 7],
        starts: [8, 2],
        ranges: [[2, 4], [6, 8]],
        success: 'Now all the points sit close to a straight line, so the correlation is strong.',
        wrong: 'That point is still a long way from the others. Move it so it fits the pattern.'
    };

    async function mountLearn(api, part) {
        const id = `explanation--${part}`;
        const host = document.getElementById(`lesson-section-${id}`);
        if (!host) return;
        const root = element('article');
        host.append(root);
        api.gateSection(id);
        const screens = learn[part];
        const section = await api.useSectionState(`learn:${part}`, {
            version: 1, upgrade: () => null,
            initial: () => ({ screen: 0, furthest: 0 })
        });
        const state = section.state;
        let boards = [];

        function syncHash() {
            if (api.getCurrentSection().id === id) {
                api.setSlideHash(`${part}-learn-${state.screen + 1}`, { replace: true });
            }
        }
        function show(index) {
            section.update(saved => {
                saved.screen = index;
                saved.furthest = Math.max(saved.furthest, index);
            });
            render();
            root.querySelector('[data-screen-heading]')?.focus();
        }
        function render() {
            boards.forEach(board => board.destroy());
            boards = [];
            root.replaceChildren();
            const index = state.screen;
            const heading = element('h2', screens[index].heading);
            heading.id = `lesson-section-title-${id}`;
            heading.dataset.screenHeading = '';
            heading.tabIndex = -1;
            root.append(heading);
            const picture = element('div', '', 'correlation-picture');
            root.append(picture);
            boards = screens[index].draw(picture) || [];
            const last = index === screens.length - 1;
            api.setSectionAction(id, {
                label: last ? 'Continue' : 'Next',
                onClick() {
                    if (last) {
                        api.completeSection(id);
                        api.continueSection();
                    } else show(index + 1);
                }
            });
            api.setSectionBack(id, index > 0 ? { onClick: () => show(index - 1) } : null);
            api.setSectionReset(id, null);
            syncHash();
        }

        screens.forEach((_, index) => api.registerHashRoute(`${part}-learn-${index + 1}`, () => {
            if (!api.goToSection(id, { moveFocus: false })) return false;
            show(Math.min(index, state.furthest));
        }));
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        render();
    }

    async function mountTypeTryIt(api, root, section) {
        const E = window.Maths1to9LessonEngine;
        const id = section.id;
        const box = root.closest('.lesson-section');
        box?.removeAttribute('aria-labelledby');
        box?.setAttribute('aria-label', 'Type Try it');
        api.gateSection(id);
        const sectionState = await api.useSectionState('interactive:type', {
            version: 2, upgrade: () => null,
            initial: () => ({
                screen: 0, furthest: 0,
                t1: { values: [1, 1], done: false, hint: '' },
                t2: { values: [9, 9], done: false, hint: '' },
                t3: { sort: null, done: false, hint: '' }
            })
        });
        const state = sectionState.state;
        let boards = [];

        function syncHash() {
            if (api.getCurrentSection().id === id) {
                api.setSlideHash(`type-try-it-${state.screen + 1}`, { replace: true });
            }
        }
        function show(index) {
            sectionState.update(saved => {
                saved.screen = index;
                saved.furthest = Math.max(saved.furthest, index);
            });
            render();
            root.querySelector('[data-screen-heading]')?.focus();
        }
        function progress() {
            const completed = Number(state.t1.done) + Number(state.t2.done) + Number(state.t3.done);
            api.setSectionProgress(id, completed, 3);
            if (completed === 3) api.completeSection(id);
        }

        function paintDrag(index, board, items, feedback) {
            const card = index === 0 ? state.t1 : state.t2;
            const screen = typeDragScreens[index];
            items.forEach((item, order) => item.update({
                value: [7 + order, card.values[order]],
                tone: card.done ? 'correct' : 'neutral',
                drag: card.done ? false : 'y'
            }));
            board.setEditable(!card.done);
            const message = card.done ? screen.success : card.hint;
            feedback.textContent = message;
            feedback.className = E.feedbackClassName('interactive', {
                visible: Boolean(message), correct: card.done
            });
            api.setSectionAction(id, {
                label: 'Next', disabled: !card.done,
                onClick: () => show(index + 1)
            });
            progress();
            syncHash();
        }

        function renderDrag(index, picture, feedback) {
            const screen = typeDragScreens[index];
            const card = index === 0 ? state.t1 : state.t2;
            const graphHost = element('div', '', 'correlation-graph');
            picture.append(graphHost);
            const board = C.makeGraph(graphHost, { axisNames: screen.axisNames, label: screen.label });
            boards.push(board);
            screen.fixed.forEach(point => board.point(point, {
                size: 'small', tone: 'muted', coordinates: false
            }));
            const items = [7, 8].map((x, order) => board.point([x, card.values[order]], {
                size: 'large', tone: card.done ? 'correct' : 'neutral', coordinates: false,
                drag: card.done ? false : 'y',
                onMove(point) {
                    if (card.done) return;
                    const values = [...card.values];
                    values[order] = point[1];
                    const done = values.every((value, place) =>
                        value >= screen.ranges[place][0] && value <= screen.ranges[place][1]);
                    sectionState.update(saved => {
                        const savedCard = index === 0 ? saved.t1 : saved.t2;
                        savedCard.values = values;
                        savedCard.done = done;
                    });
                    // Once both points are in place there is nothing left to drag.
                    if (done) paintDrag(index, board, items, feedback);
                }
            }));
            // The hint waits for the finger to let go: changing it mid-drag would
            // move the page under the point being dragged.
            function settle() {
                if (card.done) return;
                const card_ = index === 0 ? state.t1 : state.t2;
                const place = screen.ranges.findIndex(([low, high], at) =>
                    card_.values[at] < low || card_.values[at] > high);
                const hint = place === -1 ? ''
                    : card_.values[place] < screen.ranges[place][0] ? screen.tooLow : screen.tooHigh;
                sectionState.update(saved => {
                    const savedCard = index === 0 ? saved.t1 : saved.t2;
                    savedCard.hint = hint;
                });
                paintDrag(index, board, items, feedback);
            }
            graphHost.addEventListener('pointerup', settle);
            graphHost.addEventListener('pointercancel', settle);
            paintDrag(index, board, items, feedback);
        }

        function renderSort(picture, feedback) {
            function paint() {
                const message = state.t3.done ? typeSort.success : state.t3.hint;
                feedback.textContent = message;
                feedback.className = E.feedbackClassName('interactive', {
                    visible: Boolean(message), correct: state.t3.done
                });
                api.setSectionAction(id, {
                    label: 'Continue', disabled: !state.t3.done,
                    onClick() {
                        if (!state.t3.done) return;
                        api.completeSection(id);
                        api.continueSection();
                    }
                });
                progress();
                syncHash();
            }
            C.sortCards(picture, {
                items: typeSort.cards,
                slots: typeSort.slots,
                figure: (figureHost, slot) => {
                    boards.push(C.miniGraph(figureHost, { points: slot.points, label: slot.label }));
                },
                accepts: (slotId, itemId) => slotId === itemId,
                hint: typeSort.hint,
                mode: 'try',
                value: state.t3.sort,
                onChange(value) {
                    const done = typeSort.cards.every(item =>
                        Object.keys(value.placed).some(slotId => slotId === item.id && value.placed[slotId].includes(item.id)));
                    sectionState.update(saved => {
                        saved.t3.sort = value;
                        saved.t3.done = done;
                        saved.t3.hint = done ? '' : (value.hint || '');
                    });
                    paint();
                }
            });
            paint();
        }

        function render() {
            boards.forEach(board => board.destroy());
            boards = [];
            root.replaceChildren();
            const index = state.screen;
            const heading = element('h2', index < 2 ? typeDragScreens[index].heading : typeSort.heading);
            heading.id = `lesson-section-title-${id}`;
            heading.dataset.screenHeading = '';
            heading.tabIndex = -1;
            root.append(heading);
            const picture = element('div', '', 'correlation-picture');
            root.append(picture);
            const feedback = E.createFeedback('interactive', { visible: false });
            root.append(feedback);
            if (index < 2) renderDrag(index, picture, feedback);
            else renderSort(picture, feedback);
            api.setSectionBack(id, index > 0 ? { onClick: () => show(index - 1) } : null);
            api.setSectionReset(id, () => {
                sectionState.resetFields([['t1', 't2', 't3'][index]]);
                render();
            });
        }

        for (let index = 0; index < 3; index++) {
            api.registerHashRoute(`type-try-it-${index + 1}`, () => {
                if (!api.goToSection(id, { moveFocus: false })) return false;
                show(Math.min(index, state.furthest));
            });
        }
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        render();
    }

    async function mountStrengthTryIt(api, root, section) {
        const E = window.Maths1to9LessonEngine;
        const id = section.id;
        const box = root.closest('.lesson-section');
        box?.removeAttribute('aria-labelledby');
        box?.setAttribute('aria-label', 'Strength Try it');
        api.gateSection(id);
        const sectionState = await api.useSectionState('interactive:strength', {
            version: 1, upgrade: () => null,
            initial: () => ({
                screen: 0, furthest: 0,
                s1: { sort: null, done: false, hint: '' },
                s2: { values: [...strengthDrag.starts], done: false, hint: '' }
            })
        });
        const state = sectionState.state;
        let boards = [];
        const strengthSets = new Map(strengthSort.slots.map(slot => [slot.id,
            C.pointSet(E.seededRandom(slot.seed), {
                direction: slot.direction, strength: slot.strength, count: 8
            })]));

        function syncHash() {
            if (api.getCurrentSection().id === id) {
                api.setSlideHash(`strength-try-it-${state.screen + 1}`, { replace: true });
            }
        }
        function show(index) {
            sectionState.update(saved => {
                saved.screen = index;
                saved.furthest = Math.max(saved.furthest, index);
            });
            render();
            root.querySelector('[data-screen-heading]')?.focus();
        }
        function progress() {
            const completed = Number(state.s1.done) + Number(state.s2.done);
            api.setSectionProgress(id, completed, 2);
            if (completed === 2) api.completeSection(id);
        }

        function renderSort(picture, feedback) {
            function paint() {
                const message = state.s1.done ? strengthSort.success : state.s1.hint;
                feedback.textContent = message;
                feedback.className = E.feedbackClassName('interactive', {
                    visible: Boolean(message), correct: state.s1.done
                });
                api.setSectionAction(id, {
                    label: 'Next', disabled: !state.s1.done,
                    onClick: () => show(1)
                });
                progress();
                syncHash();
            }
            C.sortCards(picture, {
                items: strengthSort.cards,
                slots: strengthSort.slots.map((slot, position) => ({
                    id: slot.id,
                    dropLabel: `Name for graph ${position + 1}`
                })),
                figure: (figureHost, slot) => {
                    boards.push(C.miniGraph(figureHost, {
                        points: strengthSets.get(slot.id).points,
                        label: 'Scatter graph.'
                    }));
                },
                accepts: (slotId, itemId) => slotId === itemId,
                hint: strengthSort.hint,
                mode: 'try',
                value: state.s1.sort,
                onChange(value) {
                    const done = strengthSort.cards.every(item =>
                        Object.keys(value.placed).some(slotId => slotId === item.id && value.placed[slotId].includes(item.id)));
                    sectionState.update(saved => {
                        saved.s1.sort = value;
                        saved.s1.done = done;
                        saved.s1.hint = done ? '' : (value.hint || '');
                    });
                    paint();
                }
            });
            paint();
        }

        function renderDrag(picture, feedback) {
            const graphHost = element('div', '', 'correlation-graph');
            picture.append(graphHost);
            const board = C.makeGraph(graphHost, {
                axisNames: strengthDrag.axisNames, label: strengthDrag.label
            });
            boards.push(board);
            strengthDrag.fixed.forEach(point => board.point(point, {
                size: 'small', tone: 'muted', coordinates: false
            }));
            const items = strengthDrag.xs.map((x, order) => board.point([x, state.s2.values[order]], {
                size: 'large', tone: state.s2.done ? 'correct' : 'neutral', coordinates: false,
                drag: state.s2.done ? false : 'y',
                onMove(point) {
                    if (state.s2.done) return;
                    const values = [...state.s2.values];
                    values[order] = point[1];
                    const done = values.every((value, place) =>
                        value >= strengthDrag.ranges[place][0] && value <= strengthDrag.ranges[place][1]);
                    sectionState.update(saved => {
                        saved.s2.values = values;
                        saved.s2.done = done;
                        if (done) saved.s2.hint = '';
                    });
                    if (done) paint();
                }
            }));
            function paint() {
                items.forEach((item, order) => item.update({
                    value: [strengthDrag.xs[order], state.s2.values[order]],
                    tone: state.s2.done ? 'correct' : 'neutral',
                    drag: state.s2.done ? false : 'y'
                }));
                board.setEditable(!state.s2.done);
                const message = state.s2.done ? strengthDrag.success : state.s2.hint;
                feedback.textContent = message;
                feedback.className = E.feedbackClassName('interactive', {
                    visible: Boolean(message), correct: state.s2.done
                });
                api.setSectionAction(id, {
                    label: 'Continue', disabled: !state.s2.done,
                    onClick() {
                        if (!state.s2.done) return;
                        api.completeSection(id);
                        api.continueSection();
                    }
                });
                progress();
                syncHash();
            }
            // As on the Type screens, the hint waits for the pointer to let go.
            function settle() {
                if (state.s2.done) return;
                const wrong = strengthDrag.ranges.some(([low, high], place) =>
                    state.s2.values[place] < low || state.s2.values[place] > high);
                sectionState.update(saved => { saved.s2.hint = wrong ? strengthDrag.wrong : ''; });
                paint();
            }
            graphHost.addEventListener('pointerup', settle);
            graphHost.addEventListener('pointercancel', settle);
            paint();
        }

        function render() {
            boards.forEach(board => board.destroy());
            boards = [];
            root.replaceChildren();
            const index = state.screen;
            const heading = element('h2', index === 0 ? strengthSort.heading : strengthDrag.heading);
            heading.id = `lesson-section-title-${id}`;
            heading.dataset.screenHeading = '';
            heading.tabIndex = -1;
            root.append(heading);
            const picture = element('div', '', 'correlation-picture');
            root.append(picture);
            const feedback = E.createFeedback('interactive', { visible: false });
            root.append(feedback);
            if (index === 0) renderSort(picture, feedback);
            else renderDrag(picture, feedback);
            api.setSectionBack(id, index > 0 ? { onClick: () => show(index - 1) } : null);
            api.setSectionReset(id, () => {
                sectionState.resetFields([['s1', 's2'][index]]);
                render();
            });
        }

        for (let index = 0; index < 2; index++) {
            api.registerHashRoute(`strength-try-it-${index + 1}`, () => {
                if (!api.goToSection(id, { moveFocus: false })) return false;
                show(Math.min(index, state.furthest));
            });
        }
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        render();
    }

    /* Describe Try it, screens 1 and 2: finish the sentence for the graph. */
    const describeScreens = [
        {
            heading: 'Finish the sentence for this graph.',
            axisNames: { x: 'Garden length (m)', y: 'Mowing time (minutes)' },
            x: [0, 30], y: [0, 40], step: { x: 5, y: 5 }, labelEvery: { x: 1, y: 2 },
            label: 'Scatter graph of garden length and mowing time.',
            points: [[5, 11], [8, 16], [10, 15], [13, 22], [16, 24], [20, 29], [23, 28], [27, 35]],
            sentence: {
                parts: [0, ' gardens tend to take ', 1, ' time to mow.'],
                gaps: [['Longer', 'Shorter'], ['more', 'less']],
                pairs: [
                    { values: ['Longer', 'more'],
                        feedback: 'Yes. The points go up, so longer gardens tend to take more time.' },
                    { values: ['Shorter', 'less'],
                        feedback: "Yes. That's the same pattern said the other way round." }
                ],
                wrong: 'That would mean the points go down. Look again: do they go up or down?'
            }
        },
        {
            heading: 'Finish the sentence for this graph.',
            axisNames: { x: 'Age of car (years)', y: 'Value (£1000s)' },
            label: 'Scatter graph of the age of a car and its value.',
            points: [[1, 9], [2, 9], [3, 7], [4, 7], [5, 5], [6, 5], [7, 4], [8, 2], [9, 2]],
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
        }
    ];

    /* Cause Try it: two boxes for the four sentences about the ice cream graph. */
    const causeSort = {
        heading: 'Sort the sentences about this graph.',
        axisNames: { x: 'Ice creams sold (boxes)', y: 'Sunburn cases' },
        label: 'Scatter graph of ice creams sold and sunburn cases.',
        points: C.sets.iceCreamSunburn,
        seed: 20261124,
        cards: [
            { id: 'shows-1', label: 'More ice creams tend to go with more sunburn.', bin: 'shows' },
            { id: 'shows-2', label: 'Fewer ice creams tend to go with less sunburn.', bin: 'shows' },
            { id: 'cant-1', label: 'Eating ice cream causes sunburn.', bin: 'cant' },
            { id: 'cant-2', label: 'Selling less ice cream would stop sunburn.', bin: 'cant' }
        ],
        slots: [
            { id: 'shows', title: 'The graph shows this' },
            { id: 'cant', title: "The graph can't prove this" }
        ],
        success: "The graph shows the two go together. It can't show why.",
        hint(slotId, itemId) {
            const card = causeSort.cards.find(entry => entry.id === itemId);
            return card.bin === 'shows'
                ? 'The points do show this: they go up together.'
                : 'That says one thing causes the other. The graph only shows that they go together.';
        }
    };

    function attemptKey(part, index) {
        return `${part}${index + 1}`;
    }

    async function mountDescribeTryIt(api, root, section) {
        const E = window.Maths1to9LessonEngine;
        const id = section.id;
        const box = root.closest('.lesson-section');
        box?.removeAttribute('aria-labelledby');
        box?.setAttribute('aria-label', 'Describe Try it');
        api.gateSection(id);
        const sectionState = await api.useSectionState('interactive:describe', {
            version: 1, upgrade: () => null,
            initial: () => ({
                screen: 0, furthest: 0,
                d1: { values: [null, null], done: false, hint: '', feedback: '' },
                d2: { values: [null, null], done: false, hint: '', feedback: '' }
            })
        });
        const state = sectionState.state;
        let boards = [];

        function syncHash() {
            if (api.getCurrentSection().id === id) {
                api.setSlideHash(`describe-try-it-${state.screen + 1}`, { replace: true });
            }
        }
        function show(index) {
            sectionState.update(saved => {
                saved.screen = index;
                saved.furthest = Math.max(saved.furthest, index);
            });
            render();
            root.querySelector('[data-screen-heading]')?.focus();
        }
        function progress() {
            const completed = Number(state.d1.done) + Number(state.d2.done);
            api.setSectionProgress(id, completed, describeScreens.length);
            if (completed === describeScreens.length) api.completeSection(id);
        }

        function render() {
            boards.forEach(board => board.destroy());
            boards = [];
            root.replaceChildren();
            const index = state.screen;
            const screen = describeScreens[index];
            const card = state[attemptKey('d', index)];
            const heading = element('h2', screen.heading);
            heading.id = `lesson-section-title-${id}`;
            heading.dataset.screenHeading = '';
            heading.tabIndex = -1;
            root.append(heading);
            const picture = element('div', '', 'correlation-picture');
            root.append(picture);
            const graphHost = element('div', '', 'correlation-graph');
            picture.append(graphHost);
            const board = C.makeGraph(graphHost, {
                x: screen.x, y: screen.y, step: screen.step, labelEvery: screen.labelEvery,
                axisNames: screen.axisNames, label: screen.label
            });
            boards.push(board);
            screen.points.forEach(point => board.point(point, {
                size: 'small', tone: 'neutral', coordinates: false
            }));
            board.setEditable(false);
            const feedback = E.createFeedback('interactive', { visible: false });
            const builder = C.createSentence(picture, {
                sentence: screen.sentence, value: card.values,
                editable: !card.done, marked: card.done,
                onChange(values) {
                    const pair = values.every(Boolean) ? C.sentencePair(screen.sentence, values) : null;
                    sectionState.update(saved => {
                        const savedCard = saved[attemptKey('d', index)];
                        savedCard.values = values;
                        if (pair) {
                            savedCard.done = true;
                            savedCard.feedback = pair.feedback;
                            savedCard.hint = '';
                        } else if (values.every(Boolean)) {
                            savedCard.hint = screen.sentence.wrong;
                        }
                    });
                    if (pair) {
                        render();
                        return;
                    }
                    paint();
                }
            });
            picture.append(feedback);

            function paint() {
                const message = card.done ? card.feedback : card.hint;
                feedback.textContent = message;
                feedback.className = E.feedbackClassName('interactive', {
                    visible: Boolean(message), correct: card.done
                });
                const last = index === describeScreens.length - 1;
                api.setSectionAction(id, {
                    label: last ? 'Continue' : 'Next', disabled: !card.done,
                    onClick() {
                        if (!card.done) return;
                        if (last) {
                            api.completeSection(id);
                            api.continueSection();
                            return;
                        }
                        show(index + 1);
                    }
                });
                progress();
                syncHash();
            }
            builder.update({ value: card.values, editable: !card.done, marked: card.done });
            paint();
            api.setSectionBack(id, index > 0 ? { onClick: () => show(index - 1) } : null);
            api.setSectionReset(id, () => {
                sectionState.resetFields([attemptKey('d', index)]);
                render();
            });
        }

        describeScreens.forEach((_, index) => api.registerHashRoute(`describe-try-it-${index + 1}`, () => {
            if (!api.goToSection(id, { moveFocus: false })) return false;
            show(Math.min(index, state.furthest));
        }));
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        render();
    }

    async function mountCauseTryIt(api, root, section) {
        const E = window.Maths1to9LessonEngine;
        const id = section.id;
        const box = root.closest('.lesson-section');
        box?.removeAttribute('aria-labelledby');
        box?.setAttribute('aria-label', 'Cause Try it');
        api.gateSection(id);
        const sectionState = await api.useSectionState('interactive:cause', {
            version: 1, upgrade: () => null,
            initial: () => ({ screen: 0, furthest: 0, c1: { sort: null, done: false, hint: '' } })
        });
        const state = sectionState.state;
        const cards = E.shuffle(causeSort.cards.map(card => ({ ...card })), E.seededRandom(causeSort.seed));
        let boards = [];

        function syncHash() {
            if (api.getCurrentSection().id === id) {
                api.setSlideHash('cause-try-it-1', { replace: true });
            }
        }

        function render() {
            boards.forEach(board => board.destroy());
            boards = [];
            root.replaceChildren();
            const heading = element('h2', causeSort.heading);
            heading.id = `lesson-section-title-${id}`;
            heading.dataset.screenHeading = '';
            heading.tabIndex = -1;
            root.append(heading);
            const picture = element('div', '', 'correlation-picture');
            root.append(picture);
            boards.push(C.fullGraph(picture, {
                points: causeSort.points, axisNames: causeSort.axisNames,
                label: causeSort.label, compact: true
            }));
            const feedback = E.createFeedback('interactive', { visible: false });
            C.sortCards(picture, {
                items: cards,
                slots: causeSort.slots,
                accepts: (slotId, itemId) => causeSort.cards.find(card => card.id === itemId).bin === slotId,
                hint: causeSort.hint,
                mode: 'try',
                value: state.c1.sort,
                onChange(value) {
                    const done = cards.every(card => (value.placed[card.bin] || []).includes(card.id));
                    sectionState.update(saved => {
                        saved.c1.sort = value;
                        saved.c1.done = done;
                        saved.c1.hint = done ? '' : (value.hint || '');
                    });
                    paint();
                }
            });
            picture.append(feedback);

            function paint() {
                const message = state.c1.done ? causeSort.success : state.c1.hint;
                feedback.textContent = message;
                feedback.className = E.feedbackClassName('interactive', {
                    visible: Boolean(message), correct: state.c1.done
                });
                api.setSectionAction(id, {
                    label: 'Continue', disabled: !state.c1.done,
                    onClick() {
                        if (!state.c1.done) return;
                        api.completeSection(id);
                        api.continueSection();
                    }
                });
                api.setSectionProgress(id, Number(state.c1.done), 1);
                if (state.c1.done) api.completeSection(id);
                syncHash();
            }
            paint();
            api.setSectionBack(id, null);
            api.setSectionReset(id, () => {
                sectionState.resetFields(['c1']);
                render();
            });
        }

        api.registerHashRoute('cause-try-it-1', () => {
            if (!api.goToSection(id, { moveFocus: false })) return false;
            render();
        });
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        render();
    }

    window.Maths1to9Interactives ??= {};
    window.Maths1to9Interactives[slug] = async (root, section) => {
        const api = window.Maths1to9Lesson;
        if (!learn[section.part]) throw new Error(`Unknown correlation part: ${section.part}`);
        await mountLearn(api, section.part);
        if (section.part === 'type') await mountTypeTryIt(api, root, section);
        else if (section.part === 'strength') await mountStrengthTryIt(api, root, section);
        else if (section.part === 'describe') await mountDescribeTryIt(api, root, section);
        else await mountCauseTryIt(api, root, section);
    };
})();
