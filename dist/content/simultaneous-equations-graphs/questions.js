(() => {
    'use strict';

    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;
    const T = window.Simultaneous;
    const checks = [
        { ...T.solutionCard([{ m: 1, c: 3 }, { m: -2, c: 6 }]), questionType: 'read-solution' },
        { ...T.solutionCard([{ m: 3, c: 5 }, { m: -1, c: -3 }]), questionType: 'read-solution' },
        { input: 'choice', questionType: 'estimate', prompt: 'Estimate the solution.',
            figure: T.figure([{ m: 1, c: 1 }, { m: -2, c: 3 }]), options: [
                T.choice('x ≈ 0.7, y ≈ 1.7', 'Right. x is between 0 and 1, and y is between 1 and 2.', true),
                T.choice('x ≈ 1, y ≈ 2', "That's the nearest grid point. The lines cross a little left of 1 and below 2."),
                T.choice('x ≈ 1.7, y ≈ 0.7', 'x comes first. Read x on the x-axis, then y on the y-axis.'),
                T.choice('x ≈ 0, y ≈ 1', "(0, 1) is where y = x + 1 crosses the y-axis. It's on one line only.")] },
        { input: 'choice', questionType: 'aisha',
            figure: T.figure([{ m: 1, c: 2 }, { m: -1, c: 4 }], { point: [3, 5], label: 'A' }),
            prompt: "Aisha says A is the solution because it's on a line. What else must be true?", options: [
                T.choice('A must be on both lines.', 'Right. The values must work in both equations, so the point must be on both lines.', true),
                T.choice('Nothing. Any point on a line is a solution.', "A point on one line only works in that line's equation. It must work in both."),
                T.choice('A must be on an axis.', "The solution doesn't have to be on an axis. It's where the two lines cross."),
                T.choice("A's coordinates must be whole numbers.", 'Solutions can be decimals. What matters is that the point is on both lines.')] }
    ];
    T.checks = checks;

    function sectionEvent(name) {
        document.dispatchEvent(new CustomEvent(`maths1to9:section-${name}`, {
            detail: { sectionId: 'comparison' }
        }));
    }

    function mountPractice() {
        const api = window.Maths1to9Lesson;
        return api.runQuestionSet('question-bank', {
            version: 1, count: 6, practiseAgain: true, heading: 'Your practice results',
            pick: T.pick, question: T.generate
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
            heading.tabIndex = -1; heading.focus();
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
                ...question,
                sectionId: 'comparison', questionId: `final-check-${index + 1}`,
                scored: true, readOnly,
                options: state.order[index].map(option => question.options[option]),
                onFeedback: reportProgress, onContinue: continueQuestion
            };
        }

        function renderEnding() {
            const rows = questions.map((question, index) => {
                const card = state.cards[`final-check-${index + 1}`];
                const answer = question.input === 'custom' ? question.widget.answerText(card.value)
                    : question.input === 'choice' ? question.options[state.order[index][card.selected]].label
                    : question.fields ? question.fields.map(field => `${field.label} ${card.value[field.id]}`).join(', ')
                    : card.value;
                return { prompt: question.prompt, answer, firstCorrect: card.firstCorrect,
                    correct: card.correct, explanation: card.feedback };
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
