(() => {
    'use strict';

    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;

    function sectionEvent(name) {
        document.dispatchEvent(new CustomEvent(`maths1to9:section-${name}`, {
            detail: { sectionId: 'comparison' }
        }));
    }

    const J = window.SpeedJourneys;
    const choice = J.choice;
    const amir = { corners: [[0, 0], [4, 12], [10, 24]], section: [4, 10] };
    const afterStop = { corners: [[0, 0], [3, 6], [5, 6], [9, 22]], section: [5, 9] };
    const checks = [
        J.withFigure({ questionType: 'amir', input: 'choice',
            prompt: J.nb("Amir is finding the speed between 4 and 10 seconds. He says: 'I divided 24 by 10, so the speed is 2.4 m/s.' What has he done wrong?"), options: [
                choice('He used the whole journey. He should use only 4 to 10 seconds.', 'Right. 24 m and 10 s are for the whole journey.', true),
                choice('He should have divided 10 by 24.', 'Speed is distance ÷ time, so dividing the distance was right. The numbers are the problem.'),
                choice('Nothing. He is right.', '24 m and 10 s are for the whole journey, not the highlighted section.')
            ] }, amir),
        J.withFigure({ questionType: 'fix-it', prompt: 'What is the correct speed between 4 and 10 seconds?',
            ...J.numberCard(2, 'Right. 24 − 12 = 12 m in 10 − 4 = 6 s. 12 ÷ 6 = 2 m/s.', [
                { value: '2.4', feedback: "That's Amir's answer, for the whole journey." },
                { value: '3', feedback: "That's the first section, 0 to 4 s." },
                { value: '4', feedback: 'Take away the 12 m already travelled: 24 − 12.' },
                { value: '0.5', feedback: "That's time ÷ distance." },
                { value: '12', feedback: '12 m is the distance travelled. Divide it by the 6 s taken.' }
            ]) }, amir),
        { questionType: 'who-is-faster', input: 'choice', prompt: 'Lena and Sam each walk at a steady speed. Who is faster?', options: [
            choice('Lena', "Right. Lena: 20 ÷ 5 = 4 m/s. Sam: 24 ÷ 8 = 3 m/s. Lena's line is steeper.", true),
            choice('Sam', 'Sam goes further, but takes longer. Sam: 24 ÷ 8 = 3 m/s. Lena: 20 ÷ 5 = 4 m/s.'),
            choice("They're the same speed", 'Their lines have different steepness, so different speeds.')
        ], figure(host, { readOnly }) {
            const graph = J.journeyGraph(host, { corners: [[0, 0], [5, 20]],
                label: 'Distance–time graph. Lena walks from 0 seconds, 0 metres to 5 seconds, 20 metres. Sam walks from 0 seconds, 0 metres to 8 seconds, 24 metres.' });
            graph.segment([0, 0], [8, 24]);
            J.guides(graph, [5, 20], { label: J.nb('Lena: 5 s, 20 m'), labelSide: 'above' });
            J.guides(graph, [8, 24], { label: J.nb('Sam: 8 s, 24 m'), labelSide: 'above' });
            graph.setEditable(!readOnly);
        } },
        J.withFigure({ questionType: 'after-a-stop', prompt: 'What is the speed between 5 and 9 seconds?',
            ...J.numberCard(4, 'Right. 22 − 6 = 16 m in 9 − 5 = 4 s. 16 ÷ 4 = 4 m/s.', [
                { value: '2.44', feedback: 'That uses the whole journey.' },
                { value: '5.5', feedback: 'Take away the 6 m already travelled: 22 − 6.' },
                { value: '0.25', feedback: "That's time ÷ distance." },
                { value: '16', feedback: '16 m is the distance travelled. Divide it by the 4 s taken.' }
            ]) }, afterStop),
        J.withFigure({ questionType: 'stop-duration', input: 'choice', prompt: 'For how long did they stop?', options: [
            choice('2 seconds', 'Right. The line is flat from 3 to 5 seconds.', true),
            choice('6 seconds', "6 m is how far they'd gone. Read the time: 3 to 5 seconds."),
            choice('5 seconds', '5 s is when they started again. They stopped at 3 s: 5 − 3.')
        ] }, { corners: afterStop.corners }),
        J.withFigure({ questionType: 'fastest-check', input: 'choice', prompt: 'Which section is the fastest?', options: [
            choice('C', 'Right. C: 10 ÷ 2 = 5 m/s, the steepest.', true),
            choice('A', 'A: 6 ÷ 2 = 3 m/s. C is steeper: 5 m/s.'),
            choice('B', 'B goes furthest (12 m), but takes 6 s: 2 m/s. C is fastest at 5 m/s.')
        ] }, { corners: [[0, 0], [2, 6], [8, 18], [10, 28]], labels: ['A', 'B', 'C'] })
    ];
    J.checks = checks;

    function mountPractice() {
        const api = window.Maths1to9Lesson;
        return api.runQuestionSet('question-bank', {
            version: 1, count: api.getLesson().question_bank.session_length,
            practiseAgain: true, heading: 'Your practice results', pick: J.pick, question: J.generate
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
                return api.createQuestion(cardRoot, { ...questionConfig(index, true), figure: undefined }).result();
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
