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
        await mountPlaceholder(api, root, section);
    };
})();
