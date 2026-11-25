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

    /* Spot Try it: one tap. The right point turns large and green and locks;
       any other point shows red for a moment. */
    async function mountSpotTryIt(api, root, section) {
        const E = window.Maths1to9LessonEngine;
        const id = section.id;
        const box = root.closest('.lesson-section');
        box?.removeAttribute('aria-labelledby');
        box?.setAttribute('aria-label', 'Spot Try it');
        api.gateSection(id);
        const sectionState = await api.useSectionState('interactive:spot', {
            version: 1, upgrade: () => null,
            initial: () => ({ screen: 0, furthest: 0, picked: null, done: false, hint: '' })
        });
        const state = sectionState.state;
        const context = C.contexts.heating;
        const points = [...context.set.main, context.set.outlier];
        let board = null;
        let items = [];
        let flashTimer = null;

        function syncHash() {
            if (api.getCurrentSection().id === id) api.setSlideHash('spot-try-it-1', { replace: true });
        }
        function progress() {
            api.setSectionProgress(id, Number(state.done), 1);
            if (state.done) api.completeSection(id);
        }

        function render() {
            if (flashTimer) {
                window.clearTimeout(flashTimer);
                flashTimer = null;
            }
            board?.destroy();
            board = null;
            root.replaceChildren();
            const heading = element('h2', 'Tap the outlier.');
            heading.id = `lesson-section-title-${id}`;
            heading.dataset.screenHeading = '';
            heading.tabIndex = -1;
            root.append(heading);
            const picture = element('div', '', 'outliers-picture');
            root.append(picture);
            const graphHost = element('div', '', 'outliers-graph');
            picture.append(graphHost);
            board = C.makeGraph(graphHost, {
                axisNames: context.axisNames,
                label: 'Scatter graph of outdoor temperature and heating used. Tap the outlier.'
            });
            items = points.map(point => [point, board.point(point, {
                size: 'small', tone: 'neutral', coordinates: false
            })]);
            const feedback = E.createFeedback('interactive', { visible: false });
            root.append(feedback);

            function paint() {
                items.forEach(([point, item]) => {
                    const isOutlier = C.samePoint(point, context.set.outlier);
                    const isPicked = Boolean(state.picked) && C.samePoint(state.picked, point);
                    if (state.done && isOutlier) item.update({ size: 'large', tone: 'correct' });
                    else if (isPicked) item.update({ size: 'large', tone: 'neutral' });
                    else item.update({ size: 'small', tone: 'neutral' });
                });
                const message = state.done
                    ? 'Yes. The other points go down, but this one sits far above them.'
                    : state.hint;
                feedback.textContent = message;
                feedback.className = E.feedbackClassName('interactive', {
                    visible: Boolean(message), correct: state.done
                });
                api.setSectionAction(id, {
                    label: 'Continue', disabled: !state.done,
                    onClick() {
                        if (!state.done) return;
                        api.completeSection(id);
                        api.continueSection();
                    }
                });
                if (state.done) board.setEditable(false);
                progress();
                syncHash();
            }

            /* One timer for the red flash, so a quick second tap can't be
               undone by an old timer. Repaint first, so any point that is
               still red goes back to normal. */
            function flash(point) {
                if (flashTimer) window.clearTimeout(flashTimer);
                paint();
                const item = items.find(([other]) => C.samePoint(other, point))?.[1];
                if (!item) return;
                item.update({ size: 'large', tone: 'incorrect' });
                flashTimer = window.setTimeout(() => {
                    flashTimer = null;
                    paint();
                }, 600);
            }

            if (!state.done) {
                const picker = board.pick({ label: 'Tap the outlier.', onPick(position) {
                    if (state.done) return;
                    const match = points.find(point => C.samePoint(point, position));
                    if (!match) {
                        sectionState.update(saved => {
                            saved.hint = "There's no point there. Tap one of the points.";
                        });
                        paint();
                        return;
                    }
                    if (C.samePoint(match, context.set.outlier)) {
                        sectionState.update(saved => {
                            saved.picked = [...match];
                            saved.done = true;
                            saved.hint = '';
                        });
                        picker.stop();
                        board.describe(`You tapped the point for ${context.words(match)}.`);
                        paint();
                        return;
                    }
                    sectionState.update(saved => {
                        saved.hint = 'That point fits the pattern. Find the one away from the others.';
                    });
                    board.describe(`You tapped the point for ${context.words(match)}.`);
                    paint();
                    flash(match);
                } });
            }

            api.setSectionBack(id, null);
            api.setSectionReset(id, state.done || state.hint || state.picked
                ? () => {
                    if (flashTimer) {
                        window.clearTimeout(flashTimer);
                        flashTimer = null;
                    }
                    sectionState.resetFields(['picked', 'done', 'hint']);
                    render();
                }
                : null);
            paint();
        }

        api.registerHashRoute('spot-try-it-1', () => {
            if (!api.goToSection(id, { moveFocus: false })) return false;
            render();
        });
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        render();
    }

    /* Read Try it: two taps on the axes, then one tap on the side axis. */
    async function mountReadTryIt(api, root, section) {
        const E = window.Maths1to9LessonEngine;
        const id = section.id;
        const box = root.closest('.lesson-section');
        box?.removeAttribute('aria-labelledby');
        box?.setAttribute('aria-label', 'Read Try it');
        api.gateSection(id);
        const sectionState = await api.useSectionState('interactive:read', {
            version: 1, upgrade: () => null,
            initial: () => ({
                screen: 0, furthest: 0,
                r1: { bottom: null, side: null, hint: '', done: false },
                r2: { side: null, hint: '', done: false }
            })
        });
        const state = sectionState.state;
        const headings = [
            'Find the outlier. Tap the bottom axis right under it.',
            'How much heating does the outlier show? Tap the number on the side axis.'
        ];
        const sunshine = C.contexts.sunshine;
        const heating = C.contexts.heating;
        let board = null;

        function syncHash() {
            if (api.getCurrentSection().id !== id) return;
            api.setSlideHash(`read-try-it-${state.screen + 1}`, { replace: true });
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
            const completed = Number(state.r1.done) + Number(state.r2.done);
            api.setSectionProgress(id, completed, 2);
            if (completed === 2) api.completeSection(id);
        }

        function render() {
            board?.destroy();
            board = null;
            root.replaceChildren();
            const index = state.screen;
            const heading = element('h2', headings[index]);
            heading.id = `lesson-section-title-${id}`;
            heading.dataset.screenHeading = '';
            heading.tabIndex = -1;
            root.append(heading);
            const prompt = element('p');
            root.append(prompt);
            const picture = element('div', '', 'outliers-picture');
            root.append(picture);
            const graphHost = element('div', '', 'outliers-graph');
            picture.append(graphHost);
            const feedback = E.createFeedback('interactive', { visible: false });
            root.append(feedback);
            const context = index === 0 ? sunshine : heating;
            const set = context.set;
            const points = [...set.main, set.outlier];
            board = C.makeGraph(graphHost, {
                axisNames: context.axisNames,
                label: index === 0
                    ? 'Scatter graph of hours of sunshine and ice creams sold.'
                    : 'Scatter graph of outdoor temperature and heating used.'
            });
            points.forEach(point => board.point(point, {
                size: 'small', tone: 'neutral', coordinates: false
            }));

            if (index === 0) {
                const card = state.r1;
                prompt.textContent = card.bottom === null ? '' : card.done ? '' : 'Now tap the side axis level with it.';
                const message = card.done
                    ? 'Yes. The outlier shows 7 hours of sunshine and 1 box sold.'
                    : card.hint;
                feedback.textContent = message;
                feedback.className = E.feedbackClassName('interactive', {
                    visible: Boolean(message), correct: card.done
                });
                api.setSectionAction(id, {
                    label: 'Next', disabled: !card.done,
                    onClick: () => show(1)
                });
                if (!card.done) {
                    board.pick({ label: headings[index], onPick([x, y]) {
                        const stage = card.bottom === null ? 'bottom' : 'side';
                        sectionState.update(saved => {
                            if (stage === 'bottom') {
                                if (y !== 0) {
                                    saved.r1.hint = 'Tap on the bottom axis, the line along the bottom.';
                                } else if (x === 7) {
                                    saved.r1.bottom = 7;
                                    saved.r1.hint = '';
                                } else {
                                    saved.r1.hint = "That's under a point that fits the pattern. Find the outlier first, then go straight down.";
                                }
                            } else if (x !== 0) {
                                saved.r1.hint = 'Tap on the side axis, the line up the left.';
                            } else if (y === 1) {
                                saved.r1.side = 1;
                                saved.r1.done = true;
                                saved.r1.hint = '';
                            } else {
                                saved.r1.hint = 'Go straight across from the outlier to the side axis.';
                            }
                        });
                        board.describe(stage === 'bottom' && y === 0 ? `You tapped ${x} on the bottom axis.`
                            : stage === 'side' && x === 0 ? `You tapped ${y} on the side axis.`
                                : 'You tapped the grid, not an axis.');
                        // Redraw after this tap has finished, so the board is
                        // never destroyed inside its own event.
                        window.setTimeout(render, 0);
                    } });
                }
            } else {
                const card = state.r2;
                prompt.textContent = '';
                const message = card.done ? 'Yes. The outlier shows 7 kWh of heating.' : card.hint;
                feedback.textContent = message;
                feedback.className = E.feedbackClassName('interactive', {
                    visible: Boolean(message), correct: card.done
                });
                api.setSectionAction(id, {
                    label: 'Continue', disabled: !card.done,
                    onClick() {
                        if (!card.done) return;
                        api.completeSection(id);
                        api.continueSection();
                    }
                });
                if (!card.done) {
                    board.pick({ label: headings[index], onPick([x, y]) {
                        sectionState.update(saved => {
                            if (x !== 0) {
                                saved.r2.hint = 'Tap on the side axis, the line up the left.';
                            } else if (y === 7) {
                                saved.r2.side = 7;
                                saved.r2.done = true;
                                saved.r2.hint = '';
                            } else if (y === 9) {
                                saved.r2.hint = "9 is the outlier's temperature, on the bottom axis. This question asks for the heating.";
                            } else {
                                saved.r2.hint = 'Go straight across from the outlier to the side axis.';
                            }
                        });
                        board.describe(x === 0 ? `You tapped ${y} on the side axis.` : 'You tapped the grid, not an axis.');
                        window.setTimeout(render, 0);
                    } });
                }
            }

            const started = index === 0
                ? Boolean(state.r1.bottom || state.r1.hint)
                : Boolean(state.r2.side || state.r2.hint);
            api.setSectionBack(id, index > 0 ? { onClick: () => show(index - 1) } : null);
            api.setSectionReset(id, started ? () => {
                sectionState.resetFields([index === 0 ? 'r1' : 'r2']);
                render();
            } : null);
            progress();
            syncHash();
        }

        headings.forEach((_, index) => api.registerHashRoute(`read-try-it-${index + 1}`, () => {
            if (!api.goToSection(id, { moveFocus: false })) return false;
            show(Math.min(index, state.furthest));
        }));
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        render();
    }

    /* Stage two: Reason and Ignore say so and move on, so the lesson loads
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
        if (section.part === 'spot') return mountSpotTryIt(api, root, section);
        if (section.part === 'read') return mountReadTryIt(api, root, section);
        return mountTryItPlaceholder(api, root, section);
    };
})();
