(() => {
    'use strict';

    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;

    const screens = window.Rounding.learnScreens;

    function examples() {
        return window.Rounding.examples();
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
            version: 1,
            initial: () => ({ screen: 0, furthestScreen: 0, finished: false, lineValue: 67, explored: false }),
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
                if (screen === screens.length - 1) state.finished = true;
            });
            render();
            const heading = root.querySelector('h3');
            heading.tabIndex = -1;
            heading.focus();
        }

        function render() {
            api.setSectionReset('explanation', () => {
                section.resetFields(screens[state.screen].explore ? ['lineValue', 'explored'] : []);
                render();
            });
            const screen = screens[state.screen];
            const { escapeHtml } = window.Maths1to9LessonEngine;
            root.innerHTML = `<h3 data-screen-heading>${escapeHtml(screen.title)}</h3>`;
            for (const line of screen.lines) {
                const paragraph = document.createElement('p');
                paragraph.textContent = line;
                root.append(paragraph);
            }
            window.Rounding.drawLearn(root, state.screen, state.lineValue, value => {
                section.update(state => { state.lineValue = value; state.explored = true; });
                api.recordActivity({ id: 'rounding-line:explored', kind: 'explore' });
                api.setSectionAction('explanation', {
                    label: 'Next idea', onClick: () => showScreen(state.screen + 1)
                });
            }, state.screen < state.furthestScreen && state.explored);
            if (state.explored) api.recordActivity({ id: 'rounding-line:explored', kind: 'explore' });
            api.setSectionBack('explanation', state.screen > 0 ? {
                onClick: () => showScreen(state.screen - 1)
            } : null);
            if (state.finished) sectionEvent('explanation', 'complete');
            if (state.screen < state.furthestScreen) {
                api.setSectionAction('explanation', {
                    label: 'Next', onClick: () => showScreen(state.screen + 1)
                });
            } else if (state.finished) {
                api.clearSectionAction('explanation');
            } else {
                api.setSectionAction('explanation', {
                    label: 'Next idea', disabled: Boolean(screen.explore && !state.explored),
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
        const millionStart = questions.findIndex(question => question.number === '3724900');
        const millionSteps = questions[millionStart].steps;
        // Keep the original card IDs, scores and seeded option orders after inserting the example.
        const exampleId = index => {
            if (index < millionStart) return index;
            if (index < millionStart + millionSteps) return questions.length - millionSteps + index - millionStart;
            return index - millionSteps;
        };
        const cardId = index => `example-${exampleId(index) + 1}`;
        const api = window.Maths1to9Lesson;
        sectionEvent('interactive', 'gate');
        api.setSectionAction('interactive', { label: 'Check', disabled: true, onClick() {} });
        const section = await api.useSectionState('interactive', {
            version: 3,
            initial: () => ({
                // intro: the number line slider shown before the first example.
                intro: true, lineValue: 67, explored: false,
                index: 0, screen: 0, furthestScreen: 0, finished: false, cards: {},
                seed: window.Maths1to9LessonEngine.randomInt(0, 4294967295)
            }),
            upgrade(saved, version) {
                if (version !== 2) return null;
                // Resume at the first new step if the pupil had already passed it.
                return {
                    ...saved, index: Math.min(saved.index, millionStart),
                    screen: Math.min(saved.screen, millionStart),
                    furthestScreen: Math.min(saved.furthestScreen, millionStart), finished: false
                };
            }
        });
        const state = section.state;
        section.save();

        function syncHash() {
            if (api.getCurrentSection().id === 'interactive') {
                api.setSlideHash(state.intro ? 'try-it-1' : `try-it-${state.screen + 2}`, { replace: true });
            }
        }

        function showScreen(screen) {
            section.update(state => { state.screen = screen; state.intro = false; });
            render();
            const heading = root.querySelector('h3');
            heading.tabIndex = -1;
            heading.focus();
        }

        function reportProgress() {
            questions.forEach((question, index) => {
                if (state.cards[cardId(index)]?.correct) {
                    api.recordActivity({ id: `step:interactive:${exampleId(index)}`, kind: 'guided' });
                }
            });
            api.setSectionProgress('interactive', 0, questions.length);
        }

        function continueExample() {
            section.update(state => {
                state.index++;
                state.screen = state.index;
                state.furthestScreen = state.screen;
                state.finished = state.index === questions.length;
            });
            render();
        }

        function drawExample(container, index, readOnly) {
            const example = questions[index];
            const visual = document.createElement('div');
            window.Rounding.drawExample(visual, example, state.cards[cardId(index)]?.correct);
            container.append(visual);
            const cardRoot = document.createElement('div');
            container.append(cardRoot);
            function drawAnswer(correct) {
                visual.replaceChildren();
                window.Rounding.drawExample(visual, example, correct);
            }
            api.createQuestion(cardRoot, {
                ...window.Rounding.prepare(example, window.Maths1to9LessonEngine.seededRandom(state.seed + exampleId(index))), sectionId: 'interactive', questionId: cardId(index),
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

        // Before the examples: move a number along the line and watch it round.
        function renderIntro() {
            const heading = document.createElement('h3');
            heading.dataset.screenHeading = '';
            heading.textContent = "Let's see what numbers round to.";
            root.append(heading);
            const line = document.createElement('p');
            line.textContent = 'Move the number along the line. 65 is halfway, and at halfway we round up.';
            root.append(line);
            const next = () => api.setSectionAction('interactive', {
                label: 'Next', disabled: !state.explored, onClick: () => showScreen(0)
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

        function render() {
            root.replaceChildren();
            if (state.intro) {
                renderIntro();
                return;
            }
            api.setSectionReset('interactive', null);
            const heading = document.createElement('h3');
            heading.dataset.screenHeading = '';
            heading.textContent = state.screen === questions.length ? 'Your completed examples'
                : `Example ${questions[state.screen].example} of ${window.Rounding.guided.length} · Step ${questions[state.screen].step} of ${questions[state.screen].steps}`;
            root.append(heading);
            api.setSectionBack('interactive', {
                onClick: () => {
                    if (state.screen > 0) showScreen(state.screen - 1);
                    else {
                        section.update(state => { state.intro = true; });
                        render();
                    }
                }
            });
            if (state.finished) sectionEvent('interactive', 'complete');
            if (state.screen === questions.length) {
                questions.forEach((example, index) => {
                    const completed = document.createElement('article');
                    root.append(completed);
                    drawExample(completed, index, true);
                });
                api.clearSectionAction('interactive');
            } else {
                const readOnly = state.screen < state.index;
                drawExample(root, state.screen, readOnly);
                if (readOnly) api.setSectionAction('interactive', {
                    label: 'Next', onClick: () => showScreen(state.screen + 1)
                });
            }
            syncHash();
        }

        for (let index = 0; index <= questions.length; index++) {
            api.registerHashRoute(`try-it-${index + 2}`, () => {
                if (!api.goToSection('interactive', { moveFocus: false })) {
                    document.dispatchEvent(new CustomEvent('maths1to9:section-change'));
                    return;
                }
                showScreen(Math.min(index, state.furthestScreen));
            });
        }
        api.registerHashRoute('try-it-1', () => {
            if (!api.goToSection('interactive', { moveFocus: false })) {
                document.dispatchEvent(new CustomEvent('maths1to9:section-change'));
                return;
            }
            section.update(state => { state.intro = true; });
            render();
        });
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        reportProgress();
        render();
        const requested = Array.from({ length: questions.length + 1 }, (_, index) => index)
            .find(index => initialHash === `#try-it-${index + 2}`);
        if (initialHash === '#try-it-1') api.goToSection('interactive', { moveFocus: false });
        if (requested !== undefined && api.goToSection('interactive', { moveFocus: false })) {
            showScreen(Math.min(requested, state.furthestScreen));
        }
    }

    window.Maths1to9Interactives ??= {};
    window.Maths1to9Interactives[SLUG] = mountTryIt;
    document.addEventListener('maths1to9:lesson-rendered', event => {
        if (event.detail?.slug === SLUG) mountLearn();
    });
})();
