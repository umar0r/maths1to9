(() => {
    'use strict';

    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;

    const screens = window.SignificantFigures.learnScreens;

    function examples() {
        return window.SignificantFigures.examples();
    }

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
            version: 3,
            initial: () => ({ screen: 0, furthestScreen: 0, finished: false, taps: {} }),
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
            const reset = () => {
                section.resetFields([['taps', screen.title]]);
                render();
            };
            api.setSectionReset('explanation', tap ? reset : null);

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
                window.SignificantFigures.drawLearnTap(root, screen, (correct, hint) => {
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
                window.SignificantFigures.drawLearn(root, state.screen);
            }
            api.setSectionBack('explanation', state.screen > 0 ? {
                onClick: () => showScreen(state.screen - 1)
            } : null);
            if (state.finished) sectionEvent('explanation', 'complete');
            if (lastScreen && !awaitingTap) {
                api.clearSectionAction('explanation');
            } else {
                api.setSectionAction('explanation', {
                    label: awaitingTap || state.screen === state.furthestScreen ? 'Next idea' : 'Next',
                    disabled: Boolean(awaitingTap),
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
        const questions = examples();
        const api = window.Maths1to9Lesson;
        sectionEvent('interactive', 'gate');
        api.setSectionAction('interactive', { label: 'Check', disabled: true, onClick() {} });
        const section = await api.useSectionState('interactive', {
            version: 3,
            initial: () => ({
                index: 0, screen: 0, furthestScreen: 0, finished: false, cards: {},
                seed: window.Maths1to9LessonEngine.randomInt(0, 4294967295)
            }),
            upgrade: () => null
        });
        const state = section.state;
        section.save();

        function syncHash() {
            if (api.getCurrentSection().id === 'interactive') {
                api.setSlideHash(`try-it-${state.screen + 1}`, { replace: true });
            }
        }

        function showScreen(screen) {
            section.update(state => { state.screen = screen; });
            render();
            const heading = root.querySelector('h3');
            heading.tabIndex = -1;
            heading.focus();
        }

        function reportProgress() {
            const card = state.cards[`example-${state.index + 1}`];
            const completed = state.finished ? questions.length : state.index + Number(card?.correct === true);
            api.setSectionProgress('interactive', completed, questions.length);
        }

        // The last example carries straight on to Practice.
        function continueExample() {
            section.update(state => {
                state.index++;
                state.furthestScreen = Math.min(state.index, questions.length - 1);
                state.screen = state.furthestScreen;
                state.finished = state.index === questions.length;
            });
            render();
            if (state.finished) api.continueSection();
        }

        function drawExample(container, index, readOnly) {
            const example = questions[index];
            const visual = document.createElement('div');
            window.SignificantFigures.drawExample(visual, example, state.cards[`example-${index + 1}`]?.correct);
            container.append(visual);
            const cardRoot = document.createElement('div');
            container.append(cardRoot);
            function drawAnswer(correct) {
                visual.replaceChildren();
                window.SignificantFigures.drawExample(visual, example, correct);
            }
            api.createQuestion(cardRoot, {
                ...window.SignificantFigures.prepare(example, window.Maths1to9LessonEngine.seededRandom(state.seed + index)), sectionId: 'interactive', questionId: `example-${index + 1}`,
                scored: false, readOnly,
                onReset: () => drawAnswer(false),
                onReplayReset: () => drawAnswer(false),
                onReplayFeedback: result => drawAnswer(result.correct),
                onFeedback(result) {
                    reportProgress();
                    drawAnswer(result.correct);
                },
                onContinue: continueExample
            });
        }

        function render() {
            root.replaceChildren();
            const question = questions[state.screen];
            const heading = document.createElement('h3');
            heading.dataset.screenHeading = '';
            heading.textContent = `Example ${question.example} of ${window.SignificantFigures.exampleCount} · Step ${question.step} of ${question.steps}`;
            root.append(heading);
            api.setSectionBack('interactive', state.screen > 0 ? {
                onClick: () => showScreen(state.screen - 1)
            } : null);
            if (state.finished) api.completeSection('interactive');
            const readOnly = state.screen < state.index;
            drawExample(root, state.screen, readOnly);
            if (readOnly) {
                const last = state.screen === questions.length - 1;
                api.setSectionAction('interactive', {
                    label: last ? 'Continue' : 'Next',
                    onClick: last ? () => api.continueSection() : () => showScreen(state.screen + 1)
                });
            }
            syncHash();
        }

        for (let index = 0; index < questions.length; index++) {
            api.registerHashRoute(`try-it-${index + 1}`, () => {
                if (!api.goToSection('interactive', { moveFocus: false })) {
                    document.dispatchEvent(new CustomEvent('maths1to9:section-change'));
                    return;
                }
                showScreen(Math.min(index, state.furthestScreen));
            });
        }
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        reportProgress();
        render();
        const requested = questions.findIndex((question, index) => initialHash === `#try-it-${index + 1}`);
        if (requested >= 0 && api.goToSection('interactive', { moveFocus: false })) {
            showScreen(Math.min(requested, state.furthestScreen));
        }
    }

    window.Maths1to9Interactives ??= {};
    window.Maths1to9Interactives[SLUG] = mountTryIt;
    document.addEventListener('maths1to9:lesson-rendered', event => {
        if (event.detail?.slug === SLUG) mountLearn();
    });
})();
