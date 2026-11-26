(() => {
    'use strict';

    const slug = document.body.dataset.lessonId;
    const B = window.LinesOfBestFit;

    function element(tag, text = '', className = '') {
        const node = document.createElement(tag);
        node.textContent = text;
        node.className = className;
        return node;
    }

    /* A thin dashed upright line from each point to the line of best fit,
       above or below it. A point already on the line gets none. */
    function gapsToLine(context, board) {
        context.set.main.forEach(point => {
            const on = B.lineValue(context.line, point[0]);
            if (Math.abs(on - point[1]) < 0.05) return;
            board.segment(point, [point[0], on], { dash: true, tone: 'muted' });
        });
    }

    /* The seven Learn screens. Every one is a heading, a still picture and
       Next, with no tapping or dragging anywhere. */
    const learn = {
        draw: [
            {
                heading: 'A line of best fit is a straight line that follows the pattern of the points.',
                draw(host) {
                    const revision = B.contexts.revision;
                    const board = B.scatterGraph(host, {
                        context: revision,
                        line: revision.line,
                        label: 'Scatter graph of hours of revision and test marks, with a straight line through the middle of the points.'
                    });
                    return [board];
                }
            },
            {
                heading: 'It goes through the middle of the points. About as many points sit above it as below it.',
                draw(host) {
                    const heating = B.contexts.heating;
                    const board = B.scatterGraph(host, {
                        context: heating,
                        line: heating.line,
                        label: 'Scatter graph of outdoor temperature and heating used, with a thin dashed line from each point to the line of best fit.'
                    });
                    gapsToLine(heating, board);
                    host.append(B.note('The gaps above the line and below it are about the same.'));
                    return [board];
                }
            }
        ],
        ignore: [
            {
                heading: 'Ignore the outlier when you draw the line.',
                draw(host) {
                    const revision = B.contexts.revision;
                    const board = B.scatterGraph(host, {
                        context: revision,
                        outlier: true,
                        outlierMuted: true,
                        labels: [{ point: revision.set.outlier, text: 'Outlier' }],
                        line: revision.line,
                        label: 'Scatter graph of hours of revision and test marks, with one grey point labelled Outlier and a line through the middle of the other points.'
                    });
                    host.append(B.note('The line goes through the middle of the other points.'));
                    return [board];
                }
            }
        ],
        estimate: [
            {
                heading: 'To estimate, go up from the bottom axis to the line, then across to the side axis.',
                draw(host) {
                    const revision = B.contexts.revision;
                    const board = B.scatterGraph(host, {
                        context: revision,
                        outlier: true,
                        outlierMuted: true,
                        line: revision.line,
                        label: 'Scatter graph of hours of revision and test marks, with dashed arrows from 8 hours up to the line and across to the marks.'
                    });
                    const mark = B.lineValue(revision.line, 8);
                    board.arrow([8, 0], [8, mark], { dash: true, tone: 'ink' });
                    board.arrow([8, mark], [0, mark], { dash: true, tone: 'ink' });
                    host.append(B.note('For 8 hours of revision, the line gives a mark of about 7.'));
                    return [board];
                }
            },
            {
                heading: 'It works the other way too. Go across from the side axis to the line, then down.',
                draw(host) {
                    const heating = B.contexts.heating;
                    const board = B.scatterGraph(host, {
                        context: heating,
                        outlier: true,
                        outlierMuted: true,
                        line: heating.line,
                        label: 'Scatter graph of outdoor temperature and heating used, with dashed arrows from 8 kWh of heating across to the line and down to the temperature.'
                    });
                    board.arrow([0, 8], [2, 8], { dash: true, tone: 'ink' });
                    board.arrow([2, 8], [2, 0], { dash: true, tone: 'ink' });
                    host.append(B.note('For 8 kWh of heating, the line gives a temperature of about 2 °C.'));
                    return [board];
                }
            }
        ],
        trust: [
            {
                heading: 'An estimate inside the data is reliable (you can trust it).',
                draw(host) {
                    const heating = B.contexts.heating;
                    const board = B.scatterGraph(host, {
                        context: heating,
                        outlier: true,
                        line: heating.line,
                        label: 'Scatter graph of outdoor temperature and heating used, with dashed arrows from 7 °C up to the line and across to 4 kWh of heating.'
                    });
                    const used = B.lineValue(heating.line, 7);
                    board.arrow([7, 0], [7, used], { dash: true, tone: 'ink' });
                    board.arrow([7, used], [0, used], { dash: true, tone: 'ink' });
                    host.append(B.note('The points go from 1 °C to 9 °C. 7 °C is inside, so this estimate is reliable.'));
                    host.append(B.note('Estimating inside the data is called interpolation.'));
                    return [board];
                }
            },
            {
                heading: 'Outside the data, an estimate may not be reliable. The pattern might not carry on.',
                draw(host) {
                    const heating = B.contexts.heating;
                    const board = B.scatterGraph(host, {
                        context: heating,
                        outlier: true,
                        x: [0, 15],
                        labelEvery: 5,
                        label: 'Scatter graph of outdoor temperature and heating used, with the line of best fit solid up to 9 °C and dashed past the data.'
                    });
                    board.segment([0, 9.6], [9, 2.4], { tone: 'ink' });
                    board.segment([9, 2.4], [12, 0], { tone: 'ink', dash: true });
                    host.append(B.note("At 12 °C the line says no heating at all. Warmer than that, it says less than nothing, which can't happen."));
                    host.append(B.note('Estimating outside the data is called extrapolation.'));
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
            const picture = element('div', '', 'best-fit-picture');
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

    /* One Try it screen: the pupil draws a line and it is marked on release.
       A right line locks in green; a wrong one stays neutral and can be drawn
       again. `message` says what the part calls each mistake. */
    async function mountLineTryIt(api, root, section, { context, withOutlier, message }) {
        const E = window.Maths1to9LessonEngine;
        const id = section.id;
        const part = section.part;
        api.gateSection(id);
        const box = root.closest('.lesson-section');
        box?.removeAttribute('aria-labelledby');
        box?.setAttribute('aria-label', 'Draw a line of best fit');
        const sectionState = await api.useSectionState(`interactive:${part}`, {
            version: 1, upgrade: () => null,
            initial: () => ({ line: null, done: false })
        });
        const state = sectionState.state;
        const points = context.set.main;
        const fit = B.leastSquares(points);
        const outlier = withOutlier ? context.set.outlier : null;
        let board = null;
        let feedback = null;

        function syncHash() {
            if (api.getCurrentSection().id === id) {
                api.setSlideHash(`${part}-try-it-1`, { replace: true });
            }
        }
        function action() {
            api.setSectionAction(id, {
                label: 'Continue',
                disabled: !state.done,
                onClick() {
                    if (!state.done) return;
                    api.completeSection(id);
                    api.continueSection();
                }
            });
        }
        function show(line) {
            if (!line) {
                feedback.className = E.feedbackClassName(id, { visible: false });
                feedback.textContent = '';
                return;
            }
            const result = B.judgeLine(line, points, fit, outlier);
            feedback.className = E.feedbackClassName(id, { correct: result === 'ok' });
            feedback.textContent = message(result);
        }
        function mark(line) {
            const done = line !== null && B.judgeLine(line, points, fit, outlier) === 'ok';
            sectionState.update(saved => {
                saved.line = line;
                saved.done = done;
            });
            show(line);
            if (done) {
                board.setEditable(false);
                api.setSectionProgress(id, 1, 1);
                api.completeSection(id);
            }
            action();
        }

        function render() {
            board?.destroy();
            root.replaceChildren();
            const heading = element('h2', 'Draw a line of best fit.');
            heading.id = `lesson-section-title-${id}`;
            heading.dataset.screenHeading = '';
            heading.tabIndex = -1;
            root.append(heading);
            const picture = element('div', '', 'best-fit-picture');
            root.append(picture);
            board = B.scatterGraph(picture, {
                context,
                outlier: withOutlier,
                label: withOutlier
                    ? 'Scatter graph of outdoor temperature and heating used, with every point looking the same.'
                    : 'Scatter graph of hours of sunshine and ice creams sold, with every point looking the same.'
            });
            feedback = E.createFeedback(id, { visible: false });
            root.append(feedback);
            board.drawLine({
                line: state.line,
                minLength: 2,
                tone: line => (B.judgeLine(line, points, fit, outlier) === 'ok' ? 'correct' : 'neutral'),
                onChange: mark
            });
            board.setEditable(!state.done);
            show(state.line);
            api.setSectionProgress(id, state.done ? 1 : 0, 1);
            if (state.done) api.completeSection(id);
            api.setSectionBack(id, null);
            api.setSectionReset(id, () => {
                sectionState.resetFields([['line'], ['done']]);
                api.setSectionProgress(id, 0, 1);
                render();
            });
            action();
            syncHash();
        }

        api.registerHashRoute(`${part}-try-it-1`, () => {
            if (!api.goToSection(id, { moveFocus: false })) return false;
            render();
        });
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        render();
    }

    /* Estimate Try it: one tap on an axis each. The right tap shows the two
       dashed arrows and locks the screen. */
    async function mountEstimateTryIt(api, root, section) {
        const E = window.Maths1to9LessonEngine;
        const id = section.id;
        api.gateSection(id);
        const box = root.closest('.lesson-section');
        box?.removeAttribute('aria-labelledby');
        box?.setAttribute('aria-label', 'Estimate Try it');
        const sectionState = await api.useSectionState('interactive:estimate', {
            version: 1, upgrade: () => null,
            initial: () => ({
                screen: 0, furthest: 0,
                s1: { done: false, hint: '' },
                s2: { done: false, hint: '' }
            })
        });
        const state = sectionState.state;
        const saying = B.tryIt.estimate;
        let board = null;

        function syncHash() {
            if (api.getCurrentSection().id !== id) return;
            api.setSlideHash(`estimate-try-it-${state.screen + 1}`, { replace: true });
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
        function cardOf(saved) {
            return saved.screen === 0 ? saved.s1 : saved.s2;
        }

        function render() {
            board?.destroy();
            board = null;
            root.replaceChildren();
            const index = state.screen;
            const stage = index === 0 ? 'heating' : 'sunshine';
            const context = B.contexts[stage];
            const wording = saying[stage];
            const card = index === 0 ? state.s1 : state.s2;
            const heading = element('h2', saying.headings[index]);
            heading.id = `lesson-section-title-${id}`;
            heading.dataset.screenHeading = '';
            heading.tabIndex = -1;
            root.append(heading);
            const picture = element('div', '', 'best-fit-picture');
            root.append(picture);
            board = B.scatterGraph(picture, {
                context,
                outlier: true,
                line: context.line,
                label: index === 0
                    ? 'Scatter graph of outdoor temperature and heating used, with the line of best fit. Tap the side axis.'
                    : 'Scatter graph of hours of sunshine and ice creams sold, with the line of best fit. Tap the bottom axis.'
            });
            if (card.done) {
                if (index === 0) {
                    board.arrow([7, 0], [7, 4], { dash: true, tone: 'ink' });
                    board.arrow([7, 4], [0, 4], { dash: true, tone: 'ink' });
                } else {
                    board.arrow([0, 4], [4, 4], { dash: true, tone: 'ink' });
                    board.arrow([4, 4], [4, 0], { dash: true, tone: 'ink' });
                }
            }
            const feedback = E.createFeedback(id, { visible: false });
            root.append(feedback);
            const message = card.done ? wording.right : card.hint;
            feedback.textContent = message;
            feedback.className = E.feedbackClassName(id, {
                visible: Boolean(message), correct: card.done
            });
            api.setSectionAction(id, {
                label: 'Continue',
                disabled: !card.done,
                onClick() {
                    if (!card.done) return;
                    if (index === 0) {
                        show(1);
                        return;
                    }
                    api.completeSection(id);
                    api.continueSection();
                }
            });
            if (card.done) {
                board.setEditable(false);
            } else {
                board.setEditable(true);
                board.pick({
                    label: saying.headings[index],
                    onPick(position) {
                        const result = B.estimateTap(stage, position);
                        sectionState.update(saved => {
                            const target = cardOf(saved);
                            target.done = result.done;
                            target.hint = result.done ? '' : result.message;
                        });
                        board.describe(position[0] === 0
                            ? `You tapped ${position[1]} on the side axis.`
                            : `You tapped ${position[0]} on the bottom axis.`);
                        // Redraw after this tap has finished, so the board is
                        // never destroyed inside its own event.
                        window.setTimeout(render, 0);
                    }
                });
            }
            const started = Boolean(card.done || card.hint);
            api.setSectionBack(id, index > 0 ? { onClick: () => show(index - 1) } : null);
            api.setSectionReset(id, started
                ? () => {
                    sectionState.resetFields([index === 0 ? 's1' : 's2']);
                    render();
                }
                : null);
            progress();
            syncHash();
        }

        [0, 1].forEach(index => api.registerHashRoute(`estimate-try-it-${index + 1}`, () => {
            if (!api.goToSection(id, { moveFocus: false })) return false;
            show(Math.min(index, state.furthest));
        }));
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        render();
    }

    /* Trust Try it: one sort. A graph, two boxes and four value cards. The
       cards are marked together once every box is filled. */
    async function mountTrustTryIt(api, root, section) {
        const E = window.Maths1to9LessonEngine;
        const id = section.id;
        api.gateSection(id);
        const box = root.closest('.lesson-section');
        box?.removeAttribute('aria-labelledby');
        box?.setAttribute('aria-label', 'Trust Try it');
        const sectionState = await api.useSectionState('interactive:trust', {
            version: 1, upgrade: () => null,
            initial: () => ({ sort: null, done: false, hint: '' })
        });
        const state = sectionState.state;
        const saying = B.tryIt.trust;
        let board = null;

        function syncHash() {
            if (api.getCurrentSection().id === id) api.setSlideHash('trust-try-it-1', { replace: true });
        }
        function progress() {
            api.setSectionProgress(id, Number(state.done), 1);
            if (state.done) api.completeSection(id);
        }
        function hintFor(itemId) {
            const card = saying.cards.find(entry => entry.id === itemId);
            return card?.bin === 'inside' ? saying.hints.inside : saying.hints.outside;
        }

        function render() {
            board?.destroy();
            root.replaceChildren();
            const heading = element('h2', saying.heading);
            heading.id = `lesson-section-title-${id}`;
            heading.dataset.screenHeading = '';
            heading.tabIndex = -1;
            root.append(heading);
            const picture = element('div', '', 'best-fit-picture');
            root.append(picture);
            const revision = B.contexts.revision;
            board = B.scatterGraph(picture, {
                context: revision,
                outlier: true,
                line: revision.line,
                label: 'Scatter graph of hours of revision and test marks, with the line of best fit.'
            });
            B.sortCards(root, {
                items: saying.cards,
                slots: saying.slots,
                mode: 'try',
                value: state.sort,
                hint: (slotId, itemId) => hintFor(itemId),
                accepts: (slotId, itemId) => saying.cards.find(card => card.id === itemId)?.bin === slotId,
                onChange(value) {
                    const done = saying.slots.every(slot =>
                        (value.placed[slot.id] || []).length >= B.slotCapacity(slot, saying.cards, saying.slots));
                    sectionState.update(saved => {
                        saved.sort = value;
                        saved.done = done;
                        saved.hint = done ? '' : (value.hint || '');
                    });
                    paint();
                }
            });
            const feedback = E.createFeedback(id, { visible: false });
            root.append(feedback);

            function paint() {
                const message = state.done ? saying.success : state.hint;
                feedback.textContent = message;
                feedback.className = E.feedbackClassName(id, {
                    visible: Boolean(message), correct: state.done
                });
                api.setSectionAction(id, {
                    label: 'Continue',
                    disabled: !state.done,
                    onClick() {
                        if (!state.done) return;
                        api.completeSection(id);
                        api.continueSection();
                    }
                });
                progress();
                syncHash();
            }

            api.setSectionBack(id, null);
            api.setSectionReset(id, state.sort ? () => {
                sectionState.resetFields(['sort', 'done', 'hint']);
                render();
            } : null);
            paint();
        }

        api.registerHashRoute('trust-try-it-1', () => {
            if (!api.goToSection(id, { moveFocus: false })) return false;
            render();
        });
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        render();
    }

    window.Maths1to9Interactives ??= {};
    window.Maths1to9Interactives[slug] = async (root, section) => {
        const api = window.Maths1to9Lesson;
        if (!learn[section.part]) throw new Error(`Unknown lines of best fit part: ${section.part}`);
        await mountLearn(api, section.part);
        if (section.part === 'draw') {
            return mountLineTryIt(api, root, section, {
                context: B.contexts.sunshine,
                withOutlier: false,
                message: result => B.drawFeedback(result, 'up')
            });
        }
        if (section.part === 'ignore') {
            return mountLineTryIt(api, root, section, {
                context: B.contexts.heating,
                withOutlier: true,
                message: result => B.ignoreFeedback(result, 'down')
            });
        }
        if (section.part === 'estimate') return mountEstimateTryIt(api, root, section);
        return mountTrustTryIt(api, root, section);
    };
})();
