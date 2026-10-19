(() => {
    'use strict';

    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;

    function sectionEvent(name) {
        document.dispatchEvent(new CustomEvent(`maths1to9:section-${name}`, {
            detail: { sectionId: 'comparison' }
        }));
    }

    const E = window.StraightLineEquations;
    const choice = E.choice;
    const checks = [
        { questionType: 'sam', input: 'choice', prompt: `Sam rewrites ${E.lineText({ k: 2, d: 0, p: 6, q: 8 })} as ${E.lineText(E.formOf(3, 8))}. What should he have written?`, options: [
            choice(E.lineText(E.formOf(3, 4)), 'Right. Divide every term by 2: 8 ÷ 2 = 4.', true),
            choice(E.lineText(E.formOf(3, 8)), "That's Sam's answer. He divided 6x by 2 but not 8."),
            choice(E.lineText(E.formOf(6, 4)), 'Divide 6x by 2 as well: every term.'),
            choice(E.lineText(E.formOf(3, 16)), "Divide 8 by 2, don't multiply: 8 ÷ 2 = 4.") ] },
        { questionType: 'rearrange-two-step', ...E.typed({ k: 3, d: 6, p: 12, q: 0 }, 'Right. 3y = 12x − 6, so y = 4x − 2.') },
        { questionType: 'mia', input: 'choice', prompt: `Mia says ${E.coordinate(2, 5)} is on ${E.lineText({ k: 2, d: 0, p: 6, q: -2 })}. Which working checks this correctly?`, options: [
            choice(`${E.nb('2 × 5 = 10')} and ${E.nb('6 × 2 − 2 = 10')}, so she's right.`, 'Right. Both sides are 10.', true),
            choice(`${E.nb('2 × 2 = 4')} and ${E.nb('6 × 5 − 2 = 28')}, so she's wrong.`, 'That swaps x and y. Put x = 2 and y = 5 in.'),
            choice(`${E.nb('6 × 2 − 2 = 10')}, which isn't 5, so she's wrong.`, 'Compare with 2y, not y. 2 × 5 = 10, so both sides are 10.') ] },
        { questionType: 'keep-sign', ...E.reorderedChoice(-3, 7) },
        { questionType: 'rearrange-negative', ...E.typed({ k: 1, d: 5, p: -2, q: 0 }, 'Right. Subtract 5 from both sides: y = −2x − 5.') },
        { questionType: 'which-point', input: 'choice', prompt: `Which point is on the line ${E.lineText({ k: 1, d: -1, p: 3, q: 0 })}?`, options: [
            choice(E.coordinate(2, 7), 'Right. y = 3x + 1, and 3 × 2 + 1 = 7.', true),
            choice(E.coordinate(2, 5), 'Check the sign. y − 1 = 3x means y = 3x + 1, so at x = 2, y = 7.'),
            choice(E.coordinate(2, 6), "Don't forget the 1: y = 3x + 1, so 3 × 2 + 1 = 7."),
            choice(E.coordinate(7, 2), 'That swaps x and y. At x = 2, y = 7: the point is (2, 7).') ] }
    ];
    E.checks = checks;

    function mountPractice() {
        const api = window.Maths1to9Lesson;
        return api.runQuestionSet('question-bank', {
            version: 1, count: api.getLesson().question_bank.session_length,
            practiseAgain: true, heading: 'Your practice results', pick: E.pick, question: E.generate
        });
    }

    async function mountCheck(root, lesson) {
        const api = window.Maths1to9Lesson;
        const { shuffle, renderResults, renderScorePanel, escapeHtml } = window.Maths1to9LessonEngine;
        const questions = checks;
        const count = questions.length;
        sectionEvent('gate');
        api.setSectionAction('comparison', { label: 'Check', disabled: true, onClick() {} });
        const section = await api.useSectionState('comparison', {
            version: 1,
            initial: () => ({
                index: 0, screen: 0, furthestScreen: 0, finished: false, cards: {},
                order: questions.map(question => shuffle((question.options || []).map((option, index) => index)))
            })
        });
        const state = section.state;

        function syncHash() {
            if (api.getCurrentSection().id === 'comparison') {
                api.setSlideHash(state.screen === count ? 'summary' : `check-${state.screen + 1}`, { replace: true });
            }
        }

        function showScreen(screen) {
            section.update(state => { state.screen = screen; });
            render();
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
                ...question, sectionId: 'comparison', questionId: `final-check-${index + 1}`, scored: true, readOnly,
                options: state.order[index].map(option => question.options[option]),
                onFeedback: reportProgress, onContinue: continueQuestion
            };
        }

        function renderEnding() {
            const rows = questions.map((question, index) => {
                const cardRoot = document.createElement('div');
                return api.createQuestion(cardRoot, questionConfig(index, true)).result();
            });
            const scorePanel = document.createElement('div');
            const results = document.createElement('div');
            root.append(scorePanel, results);
            renderScorePanel(scorePanel, {
                correct: rows.filter(row => row.firstCorrect === true).length, total: count
            });
            renderResults(results, rows, { heading: 'Your Check results' });
            const summary = document.createElement('section');
            summary.innerHTML = `<h3>${escapeHtml(lesson.comparison.summary.title)}</h3>`;
            for (const point of lesson.comparison.summary.points) {
                const paragraph = document.createElement('p');
                paragraph.textContent = point.text;
                summary.append(paragraph);
            }
            root.append(summary);
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
            const heading = document.createElement('h3');
            heading.dataset.screenHeading = '';
            heading.textContent = state.screen === count ? 'Your completed Check' : `Question ${state.screen + 1} of ${count}`;
            root.append(heading);
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

        questions.forEach((question, index) => {
            api.registerHashRoute(`check-${index + 1}`, () => {
                if (!api.goToSection('comparison', { moveFocus: false })) {
                    document.dispatchEvent(new CustomEvent('maths1to9:section-change'));
                    return;
                }
                showScreen(Math.min(index, state.furthestScreen));
            });
        });
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        window.addEventListener('hashchange', () => queueMicrotask(syncHash));
        document.addEventListener('maths1to9:comparison-view', () => {
            if (root.dataset.view === 'summary' && state.finished) showScreen(count);
        });
        reportProgress();
        render();
        const requested = questions.findIndex((question, index) => initialHash === `#check-${index + 1}`);
        if (initialHash === '#summary' && state.finished) {
            if (api.goToSection('comparison', { moveFocus: false })) showScreen(count);
        } else if (requested >= 0 && api.goToSection('comparison', { moveFocus: false })) {
            showScreen(Math.min(requested, state.furthestScreen));
        }
    }

    document.addEventListener('maths1to9:lesson-rendered', event => {
        if (event.detail?.slug !== SLUG) return;
        mountPractice();
        mountCheck(document.getElementById(`${SLUG}-comparison`), event.detail.lesson);
    });
})();
