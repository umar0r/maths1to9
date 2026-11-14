(() => {
    'use strict';

    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;

    function sectionEvent(name) {
        document.dispatchEvent(new CustomEvent(`maths1to9:section-${name}`, {
            detail: { sectionId: 'comparison' }
        }));
    }

    function mountPractice() {
        const api = window.Maths1to9Lesson;
        return api.runQuestionSet('question-bank', {
            version: 4, count: api.getLesson().question_bank.session_length,
            practiseAgain: true, heading: 'Your practice results',
            pick: window.NegativeNumbers.pick,
            question(item, random) {
                const { generate, withAnswerVisual } = window.NegativeNumbers;
                const generated = generate(item, random);
                // Multiplying and dividing questions are just a box or four
                // choices: no picture.
                if (generated.signs) return generated;
                return withAnswerVisual(generated, { thermometer: item.type === 'temperature-rise' });
            },
            upgrade: (saved, version) => {
                if (version !== 3) return null;
                // Keep existing questions and answers. A finished session now
                // has one final question before its results.
                const seed = (saved.items.at(-1).seed + 1) >>> 0;
                return {
                    ...saved,
                    items: [...saved.items, { type: 'sign-cards', seed }],
                    finished: false
                };
            }
        });
    }

    async function mountCheck(root, lesson) {
        const api = window.Maths1to9Lesson;
        const questions = window.NegativeNumbers.checks();
        const count = questions.length;
        sectionEvent('gate');
        api.setSectionAction('comparison', { label: 'Check', disabled: true, onClick() {} });
        // Version 2 changed question 3, so older saved answers no longer fit.
        const section = await api.useSectionState('comparison', {
            version: 2,
            initial: () => ({
                index: 0, screen: 0, furthestScreen: 0, finished: false, cards: {},
                seed: window.Maths1to9LessonEngine.randomInt(0, 4294967295)
            }),
            upgrade: () => null
        });
        const state = section.state;
        section.save();

        function syncHash() {
            if (api.getCurrentSection().id === 'comparison') {
                api.setSlideHash(state.screen === count ? 'summary' : `check-${state.screen + 1}`, { replace: true });
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
            const current = state.cards[`final-check-${state.index + 1}`];
            api.setSectionProgress('comparison', state.finished ? count : state.index + Number(current?.correct === true), count);
        }

        function continueQuestion() {
            section.update(state => {
                state.index++;
                state.screen = state.index;
                state.furthestScreen = state.screen;
                state.finished = state.index === count;
            });
            render();
        }

        function questionConfig(index, readOnly) {
            const question = questions[index];
            return {
                ...window.NegativeNumbers.withMovableLine(window.NegativeNumbers.prepare(question, window.Maths1to9LessonEngine.seededRandom(state.seed + index))),
                sectionId: 'comparison', questionId: `final-check-${index + 1}`,
                scored: true, readOnly,
                onFeedback: reportProgress, onContinue: continueQuestion
            };
        }

        function renderEnding() {
            const list = document.createElement('ul');
            list.className = 'negative-learned';
            for (const point of lesson.comparison.summary.points) {
                const item = document.createElement('li');
                item.textContent = point.text;
                list.append(item);
            }
            root.append(list);
            api.setSectionAction('comparison', {
                label: 'All lessons',
                async onClick() {
                    if (state.finished) api.completeLesson();
                    await window.Maths1to9Progress.saveCurrentLesson();
                    window.location.assign(new URL('../../', window.location.href).href);
                }
            });
        }

        function render() {
            root.replaceChildren();
            // The section title is hidden. A question is its page's only heading.
            if (state.screen === count) {
                const heading = document.createElement('h3');
                heading.dataset.screenHeading = '';
                heading.className = 'lesson-section__title';
                heading.textContent = lesson.comparison.summary.title;
                root.append(heading);
            }
            api.setSectionBack('comparison', state.screen > 0 ? {
                onClick: () => showScreen(state.screen - 1)
            } : null);
            if (state.finished) sectionEvent('complete');
            if (state.screen === count && state.finished) {
                renderEnding();
            } else {
                const cardRoot = document.createElement('div');
                root.append(cardRoot);
                const readOnly = state.screen < state.index;
                api.createQuestion(cardRoot, questionConfig(state.screen, readOnly));
                if (readOnly) api.setSectionAction('comparison', {
                    label: 'Next', onClick: () => showScreen(state.screen + 1)
                });
            }
            syncHash();
        }

        // The site isn't open to pupils yet, so a slide link opens any slide,
        // even one not reached yet. Skipped slides stay unanswered.
        function jumpTo(screen) {
            section.update(state => {
                if (screen > state.index) {
                    state.index = screen;
                    state.furthestScreen = screen;
                }
            });
            reportProgress();
            showScreen(screen);
        }

        questions.forEach((question, index) => {
            api.registerHashRoute(`check-${index + 1}`, () => {
                if (!api.goToSection('comparison', { moveFocus: false, unlock: true })) {
                    document.dispatchEvent(new CustomEvent('maths1to9:section-change'));
                    return;
                }
                jumpTo(index);
            });
        });
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        document.addEventListener('maths1to9:comparison-view', () => {
            if (root.dataset.view === 'summary' && state.finished) showScreen(count);
        });
        reportProgress();
        render();
        const requested = questions.findIndex((question, index) => initialHash === `#check-${index + 1}`);
        if (initialHash === '#summary' && state.finished) {
            if (api.goToSection('comparison', { moveFocus: false })) showScreen(count);
        } else if (requested >= 0 && api.goToSection('comparison', { moveFocus: false, unlock: true })) {
            jumpTo(requested);
        }
    }

    document.addEventListener('maths1to9:lesson-rendered', event => {
        if (event.detail?.slug !== SLUG) return;
        mountPractice();
        mountCheck(document.getElementById(`${SLUG}-comparison`), event.detail.lesson);
    });
})();
