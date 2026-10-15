(() => {
    'use strict';

    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;

    function sectionEvent(name) {
        document.dispatchEvent(new CustomEvent(`maths1to9:section-${name}`, {
            detail: { sectionId: 'comparison' }
        }));
    }

    const E = window.GradientIntercept;
    const choice = (label, feedback, correct = false) => ({ label, feedback, correct });
    const checks = [
        { questionType: 'aisha', input: 'choice',
            prompt: `Aisha looks at ${E.equationText(4, -2)}. She says: 'The gradient is −2 and the y-intercept is 4.' What has she done wrong?`,
            options: [
                choice('She has swapped them. The gradient is 4 and the y-intercept is −2.', "Right. 4 multiplies x, so it's the gradient. 2 is subtracted, so the y-intercept is −2.", true),
                choice('She has swapped them. The gradient is 4 and the y-intercept is 2.', 'Swapped, yes, but keep the sign: the equation subtracts 2.'),
                choice('Nothing. She is right.', 'The gradient is the number multiplying x. Which number is that?')
            ] },
        { questionType: 'describe-line', input: 'choice', prompt: `Without drawing it, which describes the line ${E.equationText(-3, 5)}?`,
            options: [
                choice(`It crosses the y-axis at ${E.coordinate(0, 5)} and goes 3 down for every 1 right.`, 'Right. The gradient is −3, so the line goes down from left to right.', true),
                choice(`It crosses the y-axis at ${E.coordinate(0, 5)} and goes 3 up for every 1 right.`, 'The gradient is −3. A negative gradient means the line goes down.'),
                choice(`It crosses the y-axis at ${E.coordinate(0, -3)} and goes 5 down for every 1 right.`, "That swaps them. −3 multiplies x, so it's the gradient. The y-intercept is 5."),
                choice(`It crosses the y-axis at ${E.coordinate(5, 0)} and goes 3 down for every 1 right.`, `On the y-axis, x is 0. So the point is ${E.coordinate(0, 5)}.`)
            ] },
        { questionType: 'ben', input: 'choice', prompt: `Ben says: '${E.equationText(7, 0)} has no y-intercept, because there's no number after 7x.' Is he right?`,
            options: [
                choice(`No. ${E.equationText(7, 0)} means ${E.nb('y = 7x + 0')}. The y-intercept is 0, so the line goes through ${E.coordinate(0, 0)}.`, 'Right. Nothing added means the y-intercept is 0.', true),
                choice('Yes. The line never crosses the y-axis.', `Put ${E.nb('x = 0')} in: ${E.nb('y = 7 × 0 = 0')}. The line crosses at ${E.coordinate(0, 0)}.`),
                choice('No. The y-intercept is 7.', `7 multiplies x, so it's the gradient. Nothing is added: ${E.nb('y = 7x + 0')}.`)
            ] },
        { questionType: 'read-negative', ...E.typed(-2, 7) },
        { questionType: 'which-line', input: 'choice', prompt: `Which line crosses the y-axis at ${E.coordinate(0, -1)}?`,
            options: [
                choice(E.equationText(4, -1), 'Right. It subtracts 1, so the y-intercept is −1.', true),
                choice(E.equationText(-1, 4), `−x means −1x, so −1 is the gradient here. This line crosses at ${E.coordinate(0, 4)}.`),
                choice(E.equationText(1, 1), `This line adds 1, so it crosses at ${E.coordinate(0, 1)}.`),
                choice(E.equationText(-4, 0), `Nothing is added, so this line crosses at ${E.coordinate(0, 0)}.`)
            ] },
        { questionType: 'read-hidden', ...E.typed(1, -5) },
        { questionType: 'both-at-once', input: 'choice', prompt: 'Which line crosses the y-axis below zero and goes up from left to right?',
            options: [
                choice(E.equationText(2, -4), 'Right. Gradient 2 goes up; y-intercept −4 is below zero.', true),
                choice(E.equationText(-2, 4), `Gradient −2 goes down, and it crosses at ${E.coordinate(0, 4)}, above zero.`),
                choice(E.equationText(-4, -2), 'It crosses below zero, but gradient −4 goes down.'),
                choice(E.equationText(4, 2), `It goes up, but it crosses at ${E.coordinate(0, 2)}, above zero.`)
            ] }
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
