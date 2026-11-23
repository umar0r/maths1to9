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
                        label: 'Scatter graph of hours of revision and test marks, with two big points.'
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

    /* Type Try it, screens 1 and 2: drag two big points into the pattern. */
    const typeDragScreens = [
        {
            heading: 'Drag the two big points so the graph shows positive correlation.',
            axisNames: { x: 'Hours of revision', y: 'Test mark' },
            label: 'Scatter graph of hours of revision and test marks, with two big points to drag.',
            fixed: [[1, 2], [2, 2], [3, 4], [4, 4], [5, 5], [6, 6]],
            starts: [1, 1],
            ranges: [[5, 9], [6, 10]],
            success: "Now every point goes up from left to right. That's positive correlation.",
            tooLow: 'That point is too low. The points go up, so it needs to be higher than the ones to its left.',
            tooHigh: "That's a big jump. Keep it close to the other points."
        },
        {
            heading: 'Drag the two big points so the graph shows negative correlation.',
            axisNames: { x: 'Outdoor temperature (°C)', y: 'Heating used (kWh)' },
            label: 'Scatter graph of outdoor temperature and heating used, with two big points to drag.',
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
            version: 1, upgrade: () => null,
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
                size: 'small', tone: 'neutral', coordinates: false
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

    /* Placeholder for a Try it that a later stage builds. */
    async function mountPlaceholder(api, root, section) {
        const id = section.id;
        const box = root.closest('.lesson-section');
        box?.removeAttribute('aria-labelledby');
        box?.setAttribute('aria-label', 'Try it');
        api.gateSection(id);
        root.replaceChildren();
        const heading = element('h2', 'This part comes next.');
        heading.id = `lesson-section-title-${id}`;
        heading.dataset.screenHeading = '';
        heading.tabIndex = -1;
        root.append(heading);
        api.setSectionBack(id, null);
        api.setSectionReset(id, null);
        api.setSectionAction(id, {
            label: 'Continue',
            onClick() {
                api.completeSection(id);
                api.continueSection();
            }
        });
    }

    window.Maths1to9Interactives ??= {};
    window.Maths1to9Interactives[slug] = async (root, section) => {
        const api = window.Maths1to9Lesson;
        if (!learn[section.part]) throw new Error(`Unknown correlation part: ${section.part}`);
        await mountLearn(api, section.part);
        if (section.part === 'type') await mountTypeTryIt(api, root, section);
        else await mountPlaceholder(api, root, section);
    };
})();
