(() => {
    'use strict';

    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;
    const Q = window.Reciprocals;
    const checks = [
        { ...Q.tableCard(1, [-4, -1, -0.25, 0.25, 1, 4]), prompt: 'Complete the table for y = 1/x.', questionType: 'table' },
        { input: 'custom', widget: Q.plotWidget(2, -1), prompt: 'Plot the point for x = −1.', questionType: 'plot' },
        { input: 'choice', questionType: 'mia', prompt: 'Mia plots the points of y = 1/x correctly. She says she must join every point with one curve. What should she do instead?', options: [
            Q.choice('Draw two separate curves. They must not join across the middle.', "Right. There's no point where x = 0.", true),
            Q.choice('Nothing. One curve through every point is right.', "There's no point where x = 0, so one curve can't go across the middle."),
            Q.choice('Join them with straight lines.', 'Reciprocal graphs curve smoothly. Use two smooth curves.'),
            Q.choice('Draw one curve through (0, 0).', "1 ÷ 0 has no answer, so the graph can't go through (0, 0).")
        ] },
        { input: 'choice', questionType: 'sam', prompt: 'Sam says that when x is big enough, 1/x equals 0. Is Sam right?', options: [
            Q.choice('No. 1/x gets closer to 0, but never equals 0.', 'Right. 1 ÷ 100 = 0.01, 1 ÷ 1000 = 0.001: never 0.', true),
            Q.choice('Yes. 1 ÷ 100 is 0.', '1 ÷ 100 = 0.01. Small, but not 0.'),
            Q.choice('Yes. The curve touches the x-axis at x = 4.', 'At x = 4, y = 0.25. The curve gets closer to the x-axis but never touches it.'),
            Q.choice('No. 1/x gets bigger as x gets bigger.', 'Sam is wrong, but not for that reason. 1/x gets smaller as x gets bigger, closer and closer to 0.')
        ] },
        { ...Q.valueCard(1, 0.5), prompt: 'For y = 1/x, what is y when x = 0.5?', questionType: 'value',
            feedback: 'Right. There are two halves in 1, so 1 ÷ 0.5 = 2.' }
    ];
    checks.forEach((question, index) => { checks[index] = Q.prepare(question); });
    Q.checks = checks;

    function sectionEvent(name) {
        document.dispatchEvent(new CustomEvent(`maths1to9:section-${name}`, {
            detail: { sectionId: 'comparison' }
        }));
    }

    function mountPractice() {
        const api = window.Maths1to9Lesson;
        return api.runQuestionSet('question-bank', {
            version: 1, count: 6, practiseAgain: true, heading: 'Your practice results',
            pick: Q.pick, question: Q.generate
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
                paragraph.textContent = Q.prose(point.text);
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
