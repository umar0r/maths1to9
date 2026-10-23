(() => {
    'use strict';

    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;
    const Q = window.GraphTypes;
    const reciprocal={kind:'reciprocal',k:1},cubic={kind:'cubic',c:-1};
    const checks=[
        {input:'custom',questionType:'graph-from-equation',prompt:'Which graph is y = 1/x?',
            widget:Q.graphChoice(Q.graphOptions([reciprocal,{kind:'line',c:1},{kind:'quadratic',c:1},cubic],reciprocal))},
        {...Q.equationCard(cubic,[cubic,{kind:'line',c:-1},{kind:'quadratic',c:-1},reciprocal]),questionType:'equation-from-graph'},
        {input:'choice',questionType:'noah',prompt:"Noah says y = x³ + 1 is a straight line, because the equation ends in + 1. What's wrong?",options:[
            Q.choice("The highest power is 3, so it's a cubic: an S shape.",'Right. The + 1 only moves the graph up.',true),
            Q.choice("Nothing. It's a straight line.",'It has x³. Power 3 makes an S shape, not a straight line.'),
            Q.choice("It's a quadratic, because it has a power.","The power is 3, not 2. It's a cubic."),
            Q.choice("It's a reciprocal, because of the + 1.",'A reciprocal has x on the bottom of a fraction. This has x³: a cubic.')]},
        {...Q.powerCard(Q.powerSums[2]),questionType:'power'},
        {input:'choice',questionType:'two-curves',prompt:'A graph has two separate curves, one top right and one bottom left. They get closer to the axes but never touch them. Which equation could it be?',options:[
            Q.choice('y = 2/x','Right. Two separate curves: a reciprocal.',true),
            Q.choice('y = x³',"A cubic is one S-shaped curve. It doesn't break in two."),
            Q.choice('y = x²','A quadratic is one U-shaped curve.'),
            Q.choice('y = 2x',"That's a straight line through (0, 0).")]},
        {...Q.missingCard({kind:'quadratic',c:-1}),questionType:'missing-power'}
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
                order: questions.map(question => shuffle((question.options || []).map((option, index) => index))),
                graphOrders: questions.map(question => shuffle((question.widget?.options || []).map((option, index) => index)))
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

        function orderedQuestion(index) {
            const question=questions[index];
            return question.widget?.kind==='graph-choice' ? {...question,widget:Q.graphChoice(state.graphOrders[index].map(i=>question.widget.options[i]))} : question;
        }

        function questionConfig(index, readOnly) {
            const question = orderedQuestion(index);
            return {
                ...question,
                sectionId: 'comparison', questionId: `final-check-${index + 1}`,
                scored: true, readOnly,
                options: state.order[index].map(option => question.options[option]),
                onFeedback: reportProgress, onContinue: continueQuestion
            };
        }

        function renderEnding() {
            const rows = questions.map((original, index) => {
                const question = orderedQuestion(index);
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
