(() => {
    'use strict';

    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;
    const T = window.Turning;
    const above = { a: 1, h: -2, k: 1 };
    const amira = { a: -1, h: -3, k: 2 };
    const ben = { a: -1, h: 1, k: -2 };
    const checks = [
        { ...T.pointCard(above), questionType: 'read-point' },
        { input: 'choice', questionType: 'type', prompt: 'Is the turning point a minimum or a maximum?',
            figure: T.figure(above), options: T.typeOptions(above) },
        { input: 'choice', questionType: 'amira', figure: T.figure(amira),
            prompt: 'Amira says the turning point is (2, −3). What has she done wrong?', options: [
                T.choice("She has swapped x and y. It's (−3, 2).", 'Right. x comes first: −3, then y: 2.', true),
                T.choice('Nothing. (2, −3) is right.', "Read x first: the point lines up with −3 on the x-axis, and 2 on the y-axis. It's (−3, 2)."),
                T.choice("She has the signs wrong. It's (−2, 3).", "The signs are the same as hers. She has written them in the wrong order: it's (−3, 2).")] },
        { input: 'choice', questionType: 'ben', figure: T.figure(ben),
            prompt: 'Ben says the turning point is below the x-axis, so it must be a minimum. Is he right?', options: [
                T.choice("No. It's the highest point on the curve, so it's a maximum.", 'Right. Look at the shape, not where it is.', true),
                T.choice('Yes. Below the x-axis means a minimum.', "Where it sits doesn't decide it. It's the highest point on the curve, so it's a maximum."),
                T.choice('Yes, because its y-coordinate is negative.', "The coordinates don't decide it. It's the highest point on the curve: a maximum.")] },
        { ...T.pointCard({ a: -1, h: -1, k: 4 }), questionType: 'read-point' }
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
