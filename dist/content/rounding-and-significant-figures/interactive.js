(() => {
    'use strict';

    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;

    const screens = window.Rounding.learnScreens;

    function sectionEvent(sectionId, name) {
        document.dispatchEvent(new CustomEvent(`maths1to9:section-${name}`, {
            detail: { sectionId }
        }));
    }

    async function mountLearn() {
        const root = document.createElement('article');
        document.getElementById('lesson-section-explanation').append(root);
        const api = window.Maths1to9Lesson;
        sectionEvent('explanation', 'gate');
        const section = await api.useSectionState('learn', {
            version: 14,
            initial: () => ({ screen: 0, furthestScreen: 0, finished: false, lineValue: 67, explored: false, taps: {} }),
            upgrade: () => null
        });
        const state = section.state;
        section.save();

        function syncHash() {
            if (api.getCurrentSection().id === 'explanation') {
                api.setSlideHash(`learn-${state.screen + 1}`, { replace: true });
            }
        }

        function showScreen(screen) {
            section.update(state => {
                state.screen = screen;
                state.furthestScreen = Math.max(state.furthestScreen, screen);
            });
            render();
            const heading = root.querySelector('h3');
            heading.tabIndex = -1;
            heading.focus();
        }

        function render() {
            const screen = screens[state.screen];
            const tap = screen.tap && state.taps[screen.title];
            const awaitingTap = screen.tap && tap !== 'correct';
            const lastScreen = state.screen === screens.length - 1;
            if (lastScreen && !awaitingTap && !state.finished) {
                section.update(saved => { saved.finished = true; });
            }
            const resetFields = screen.tap ? [['taps', screen.title]]
                : screen.explore ? ['lineValue', 'explored'] : [];
            const reset = () => {
                section.resetFields(resetFields);
                render();
            };
            api.setSectionReset('explanation', tap || (screen.explore && state.explored) ? reset : null);

            const heading = document.createElement('h3');
            heading.dataset.screenHeading = '';
            heading.textContent = screen.title;
            root.replaceChildren(heading);
            function paragraph(line) {
                const node = document.createElement('p');
                node.textContent = line;
                root.append(node);
            }
            const [intro, ...explanation] = screen.prompt ? [screen.prompt, ...screen.lines] : screen.lines;
            if (intro) paragraph(intro);
            if (awaitingTap) {
                const { createFeedback, feedbackClassName } = window.Maths1to9LessonEngine;
                const feedback = createFeedback('explanation', { correct: false, text: tap ?? '', visible: Boolean(tap) });
                window.Rounding.drawLearnTap(root, screen, (correct, hint) => {
                    section.update(saved => { saved.taps[screen.title] = correct ? 'correct' : hint; });
                    if (correct) {
                        render();
                        const revealed = root.querySelector('h3');
                        revealed.tabIndex = -1;
                        revealed.focus();
                    } else {
                        feedback.textContent = hint;
                        feedback.className = feedbackClassName('explanation', { correct: false, visible: true });
                        api.setSectionReset('explanation', reset);
                    }
                });
                root.append(feedback);
            } else {
                explanation.forEach(paragraph);
                window.Rounding.drawLearn(root, state.screen, state.lineValue, value => {
                    section.update(saved => { saved.lineValue = value; saved.explored = true; });
                    api.recordActivity({ id: 'rounding-line:explored', kind: 'explore' });
                    api.setSectionAction('explanation', {
                        label: 'Next idea', onClick: () => showScreen(state.screen + 1)
                    });
                }, state.screen < state.furthestScreen && state.explored);
            }
            if (state.explored) api.recordActivity({ id: 'rounding-line:explored', kind: 'explore' });
            api.setSectionBack('explanation', state.screen > 0 ? {
                onClick: () => showScreen(state.screen - 1)
            } : null);
            if (state.finished) sectionEvent('explanation', 'complete');
            if (lastScreen && !awaitingTap) {
                api.clearSectionAction('explanation');
            } else {
                api.setSectionAction('explanation', {
                    label: awaitingTap || state.screen === state.furthestScreen ? 'Next idea' : 'Next',
                    disabled: Boolean(awaitingTap || (screen.explore && !state.explored)),
                    onClick: () => showScreen(state.screen + 1)
                });
            }
            syncHash();
        }

        screens.forEach((screen, index) => {
            api.registerHashRoute(`learn-${index + 1}`, () => {
                api.goToSection('explanation', { moveFocus: false });
                showScreen(Math.min(index, state.furthestScreen));
            });
        });
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        const requested = screens.findIndex((screen, index) => initialHash === `#learn-${index + 1}`);
        if (requested >= 0) showScreen(Math.min(requested, state.furthestScreen));
        else render();
    }

    async function mountTryIt(root) {
        const api = window.Maths1to9Lesson;
        const engine = window.Maths1to9LessonEngine;
        const slides = window.Rounding.tryIt.slides;
        // Each slide keeps its own work. Reset (↺) starts that slide again.
        const blankSlide = () => ({ tapped: false, dot: false });
        let ready = false;
        let requested = /^#try-it-(\d+)$/.exec(initialHash);
        // Registered before the saved work has loaded, so a #try-it-N link (a
        // reload, or a link a pupil kept) reaches its slide instead of falling
        // back to the first section.
        for (let screen = 0; screen < slides.length; screen++) {
            api.registerHashRoute(`try-it-${screen + 1}`, () => {
                if (ready) openHashScreen(screen);
                else requested = [null, String(screen + 1)];
            });
        }
        sectionEvent('interactive', 'gate');
        api.setSectionAction('interactive', { label: 'Check', disabled: true, onClick() {} });
        const section = await api.useSectionState('interactive', {
            version: 14,
            initial: () => ({
                // The intro screen is the number line slider shown before the slides.
                lineValue: 67, explored: false,
                screen: 0, furthestScreen: 0, finished: false,
                slides: slides.map(blankSlide)
            }),
            upgrade: () => null
        });
        const state = section.state;
        section.save();

        function isComplete(index) {
            const saved = state.slides[index];
            if (slides[index].digits) return saved.tapped;
            return saved.dot;
        }

        function syncHash() {
            if (api.getCurrentSection().id === 'interactive') {
                api.setSlideHash(`try-it-${state.screen + 1}`, { replace: true });
            }
        }

        function showScreen(screen) {
            section.update(saved => {
                saved.screen = screen;
                saved.furthestScreen = Math.max(saved.furthestScreen, screen);
            });
            render();
            const heading = root.querySelector('h3');
            if (!heading) return;
            heading.tabIndex = -1;
            heading.focus();
        }

        // Before the slides: move a number along the line and watch it round.
        function renderIntro() {
            const heading = document.createElement('h3');
            heading.dataset.screenHeading = '';
            heading.textContent = "Let's see what numbers round to.";
            root.append(heading);
            const line = document.createElement('p');
            line.textContent = 'Move the number along the line. 65 is halfway, and at halfway we round up.';
            root.append(line);
            const next = () => api.setSectionAction('interactive', {
                label: 'Next', disabled: !state.explored, onClick: () => showScreen(1)
            });
            window.Rounding.drawLine(root, state.lineValue, true, value => {
                section.update(state => { state.lineValue = value; state.explored = true; });
                api.recordActivity({ id: 'rounding-line:explored', kind: 'explore' });
                next();
                api.setSectionReset('interactive', resetIntro);
            }, false);
            api.setSectionBack('interactive', null);
            api.setSectionReset('interactive', state.explored ? resetIntro : null);
            next();
            syncHash();
        }

        function resetIntro() {
            section.update(state => { state.lineValue = 67; state.explored = false; });
            render();
        }

        function finish() {
            section.update(saved => { saved.finished = true; });
            api.completeSection('interactive');
            // The last slide goes straight on to Practice, with no summary page.
            api.continueSection();
        }

        function render() {
            root.replaceChildren();
            if (state.screen === 0) {
                renderIntro();
                return;
            }
            const index = state.screen - 1;
            const slide = slides[index];
            const saved = state.slides[index];
            if (state.finished) api.completeSection('interactive');

            const heading = document.createElement('h3');
            heading.dataset.screenHeading = '';
            heading.textContent = slide.title;
            root.append(heading);

            api.setSectionBack('interactive', { onClick: () => showScreen(state.screen - 1) });
            const started = saved.tapped || saved.dot;
            api.setSectionReset('interactive', started ? () => {
                section.update(now => { now.slides[index] = blankSlide(); });
                render();
            } : null);

            // The engine's feedback box, used for the wrong-digit hint only.
            const feedback = engine.createFeedback('interactive', { correct: false, text: '', visible: false });
            window.Rounding.drawSlide(root, slide, saved, {
                onDigit(correct) {
                    if (correct) {
                        section.update(now => { now.slides[index].tapped = true; });
                        render();
                        const revealed = root.querySelector('h3');
                        revealed.tabIndex = -1;
                        revealed.focus();
                        return;
                    }
                    feedback.textContent = slide.tapHint;
                    feedback.className = engine.feedbackClassName('interactive', { correct: false, visible: true });
                },
                onHalf(correct) {
                    if (correct) {
                        section.update(now => { now.slides[index].dot = true; });
                        render();
                        return;
                    }
                    feedback.textContent = slide.placeHint;
                    feedback.className = engine.feedbackClassName('interactive', { correct: false, visible: true });
                },
                onContext(correct, hint) {
                    if (correct) {
                        section.update(now => { now.slides[index].dot = true; });
                        render();
                        return;
                    }
                    feedback.textContent = hint;
                    feedback.className = engine.feedbackClassName('interactive', { correct: false, visible: true });
                }
            });
            root.append(feedback);

            const done = isComplete(index);
            api.setSectionProgress('interactive', slides.filter((unused, i) => isComplete(i)).length, slides.length);
            if (!done) {
                api.setSectionAction('interactive', { label: slide.button, disabled: true, onClick() {} });
            } else if (index < slides.length - 1) {
                api.setSectionAction('interactive', { label: slide.button, onClick: () => showScreen(state.screen + 1) });
            } else {
                api.setSectionAction('interactive', { label: slide.button, onClick: finish });
            }
            syncHash();
        }

        function openHashScreen(screen) {
            // A #try-it-3 link opens Try it the way the engine's own section
            // links do: it is a link, so it does not need Try it unlocked first.
            if (!api.goToSection('interactive', { moveFocus: false, unlock: true })) {
                document.dispatchEvent(new CustomEvent('maths1to9:section-change'));
                return;
            }
            const furthest = state.explored ? state.furthestScreen : 0;
            showScreen(Math.min(screen, furthest));
        }

        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        ready = true;
        render();
        if (requested && Number(requested[1]) <= slides.length) {
            openHashScreen(Math.max(0, Number(requested[1]) - 1));
        }
    }

    window.Maths1to9Interactives ??= {};
    window.Maths1to9Interactives[SLUG] = mountTryIt;
    document.addEventListener('maths1to9:lesson-rendered', event => {
        if (event.detail?.slug === SLUG) mountLearn();
    });
})();
