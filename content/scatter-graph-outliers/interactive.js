(() => {
    'use strict';

    const slug = document.body.dataset.lessonId;
    const C = window.Outliers;

    const partNames = { spot: 'Spot', read: 'Read', reason: 'Reason', ignore: 'Ignore' };

    function element(tag, text = '', className = '') {
        const node = document.createElement(tag);
        node.textContent = text;
        node.className = className;
        return node;
    }

    /* The six Learn screens. Every one is a heading, a still picture and
       Next, with no tapping or dragging anywhere. */
    const learn = {
        spot: [
            {
                heading: "An outlier is a point that doesn't fit the pattern of the other points.",
                draw(host) {
                    const revision = C.contexts.revision;
                    const board = C.fullGraph(host, {
                        context: revision,
                        blue: [revision.set.outlier],
                        labels: [{ point: revision.set.outlier, text: 'Outlier' }],
                        label: 'Scatter graph of hours of revision and test marks, with one point labelled Outlier.'
                    });
                    return [board];
                }
            },
            {
                heading: "A point can be low and still fit the pattern. The outlier is the one that doesn't fit.",
                draw(host) {
                    const sunshine = C.contexts.sunshine;
                    const board = C.fullGraph(host, {
                        context: sunshine,
                        blue: [[1, 1], sunshine.set.outlier],
                        labels: [{ point: [1, 1], text: 'A' }, { point: sunshine.set.outlier, text: 'B' }],
                        label: 'Scatter graph of hours of sunshine and ice creams sold, with points labelled A and B.'
                    });
                    host.append(C.note('A: 1 hour of sunshine and 1 box sold. This fits.'));
                    host.append(C.note('B: 7 hours of sunshine but only 1 box sold. This is the outlier.'));
                    return [board];
                }
            }
        ],
        read: [
            {
                heading: 'To read the outlier, go down to the bottom axis and across to the side axis.',
                draw(host) {
                    const revision = C.contexts.revision;
                    const outlier = revision.set.outlier;
                    const board = C.fullGraph(host, {
                        context: revision,
                        blue: [outlier],
                        label: 'Scatter graph of hours of revision and test marks, with the outlier in blue.'
                    });
                    board.arrow(outlier, [outlier[0], 0], { dash: true, tone: 'ink' });
                    board.arrow(outlier, [0, outlier[1]], { dash: true, tone: 'ink' });
                    host.append(C.note('This pupil revised for 8 hours but got a mark of 2.'));
                    return [board];
                }
            },
            {
                heading: 'Some questions ask for just one value. Give only that one.',
                draw(host) {
                    const heating = C.contexts.heating;
                    const outlier = heating.set.outlier;
                    host.append(C.ask('What temperature does the outlier show?'));
                    const board = C.fullGraph(host, {
                        context: heating,
                        blue: [outlier],
                        label: 'Scatter graph of outdoor temperature and heating used, with the outlier in blue.'
                    });
                    board.arrow(outlier, [outlier[0], 0], { dash: true, tone: 'ink' });
                    host.append(C.note("The answer is 9 °C, from the bottom axis. The heating used doesn't matter here."));
                    return [board];
                }
            }
        ],
        reason: [
            {
                heading: 'An outlier might be an unusual case, or a mistake made when the data was written down.',
                draw(host) {
                    const revision = C.contexts.revision;
                    const board = C.fullGraph(host, {
                        context: revision,
                        blue: [revision.set.outlier],
                        label: 'Scatter graph of hours of revision and test marks, with the outlier in blue.'
                    });
                    host.append(C.reason('Unusual case:', 'the pupil was ill on the day of the test.'));
                    host.append(C.reason('Mistake:', 'the pupil got 7, but someone wrote down 2.'));
                    return [board];
                }
            }
        ],
        ignore: [
            {
                heading: 'When you describe the correlation, ignore the outlier. Look at the other points.',
                draw(host) {
                    const revision = C.contexts.revision;
                    const board = C.fullGraph(host, {
                        context: revision,
                        blue: revision.set.main,
                        blueSize: 'small',
                        labels: [{ point: revision.set.outlier, text: 'Outlier' }],
                        label: 'Scatter graph of hours of revision and test marks, with one grey point labelled Outlier.'
                    });
                    host.append(C.sentence('Positive correlation: pupils who revise for longer tend to get higher marks.'));
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
            const picture = element('div', '', 'outliers-picture');
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

    /* Stage one: the other sections say so and move on, so the lesson loads
       from the first Learn screen through to Check. Later stages fill them
       in. */
    function placeholder(host, section, text) {
        host.replaceChildren();
        const root = element('article');
        host.append(root);
        const heading = element('h2', 'Not built yet.');
        heading.id = `lesson-section-title-${section.id}`;
        heading.dataset.screenHeading = '';
        root.append(heading, element('p', text, 'outliers-note'));
    }

    function mountTryItPlaceholder(api, root, section) {
        const box = root.closest('.lesson-section');
        box?.removeAttribute('aria-labelledby');
        box?.setAttribute('aria-label', `${partNames[section.part]} Try it`);
        api.gateSection(section.id);
        placeholder(root, section, `The ${partNames[section.part]} Try it screens are added in the next stage.`);
        api.setSectionBack(section.id, null);
        api.setSectionReset(section.id, null);
        api.setSectionAction(section.id, {
            label: 'Continue',
            onClick() {
                api.completeSection(section.id);
                api.continueSection();
            }
        });
    }

    window.Maths1to9Interactives ??= {};
    window.Maths1to9Interactives[slug] = async (root, section) => {
        const api = window.Maths1to9Lesson;
        if (!learn[section.part]) throw new Error(`Unknown outliers part: ${section.part}`);
        await mountLearn(api, section.part);
        mountTryItPlaceholder(api, root, section);
    };
})();
