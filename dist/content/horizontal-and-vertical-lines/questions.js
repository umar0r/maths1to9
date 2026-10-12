(() => {
    'use strict';

    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;

    function sectionEvent(name) {
        document.dispatchEvent(new CustomEvent(`maths1to9:section-${name}`, {
            detail: { sectionId: 'comparison' }
        }));
    }

    const { equation, judge, describeLine } = window.HorizontalVerticalLines;
    const graphs = window.Maths1to9Graph;
    function drawing(target, correctFeedback) {
        return {
            input: 'custom', prompt: `Draw ${equation(target.axis, target.value)}.`,
            widget: graphs.questionWidget({
                graph: { label: `Coordinate grid for drawing ${equation(target.axis, target.value)}` },
                isEmpty: line => line === null,
                mark(line) {
                    const result = judge(line, target);
                    return { correct: result.correct, feedback: result.correct && correctFeedback
                        ? correctFeedback : result.feedback.replace(/^✓ /, '') };
                },
                answerText: line => `You drew ${describeLine(line)}.`,
                resultTone: line => judge(line, target).correct ? 'correct' : 'incorrect',
                resultLabel: line => graphs.classify(line).kind === 'sloping' ? null : describeLine(line)
            })
        };
    }
    const checks = [
        { title: `Draw ${equation('y', -3)}`, type: 'draw-horizontal', target: { axis: 'y', value: -3 },
            correctFeedback: 'Right. The line is horizontal (across), 3 below the x-axis.' },
        { title: "Sam's line", type: 'sams-line',
            prompt: `Sam was asked to draw ${equation('y', 4)}. He drew this line. What is the equation of Sam's line?`,
            options: [
                { label: equation('x', 4), correct: true, feedback: `Right. Every point on Sam's line has an x-coordinate of 4. For ${equation('y', 4)} he should draw across, through 4 on the y-axis.` },
                { label: equation('y', 4), feedback: `Sam's line goes up and down, so its y-coordinate changes. It can't be ${equation('y', 4)}.` },
                { label: equation('y', 0), feedback: `${equation('y', 0)} is the x-axis. Sam's line crosses it at 4.` },
                { label: equation('x', 0), feedback: `${equation('x', 0)} is the y-axis. Sam's line is 4 to the right of it.` }
            ] },
        { title: 'Two points', type: 'two-points',
            prompt: 'A straight line goes through (−2, 3) and (4, 3). What is its equation?',
            options: [
                { label: equation('y', 3), correct: true, feedback: `Right. Both points have a y-coordinate of 3, so the line is horizontal: ${equation('y', 3)}.` },
                { label: equation('x', 3), feedback: "The x-coordinates are −2 and 4, so x isn't fixed. Look at which coordinate is the same." },
                { label: equation('x', -2), feedback: `That's the first point's x-coordinate. The second point has ${equation('x', 4)}, so x isn't fixed.` }
            ] },
        { title: 'Which point?', type: 'which-point', prompt: `Which point is on the line ${equation('x', 2)}?`,
            options: [
                { label: '(2, −5)', correct: true, feedback: `Right. Its x-coordinate is 2. Any point with ${equation('x', 2)} is on the line, whatever its y-coordinate.` },
                { label: '(−5, 2)', feedback: `That point has ${equation('y', 2)}. The x-coordinate comes first.` },
                { label: '(0, 2)', feedback: `That point is on the y-axis, where ${equation('x', 0)}.` }
            ] },
        { title: `Draw ${equation('x', -1)}`, type: 'draw-vertical', target: { axis: 'x', value: -1 },
            correctFeedback: 'Right. The line is vertical (up and down), 1 left of the y-axis.' }
    ];
    function mountPractice() {
        const api = window.Maths1to9Lesson;
        const { randomInt } = window.Maths1to9LessonEngine;
        const types = ['horizontal-positive', 'vertical-positive', 'horizontal-negative', 'vertical-negative', 'axis', 'mixed'];
        return api.runQuestionSet('question-bank', {
            version: 1, count: api.getLesson().question_bank.session_length,
            practiseAgain: true, heading: 'Your practice results',
            pick(random) { return types.map(type => ({ type, seed: randomInt(0, 4294967295, random) })); },
            question(item, random) {
                let axis = item.type.startsWith('horizontal') ? 'y' : 'x';
                let value = randomInt(1, 5, random);
                if (item.type.endsWith('negative')) value = -value;
                if (item.type === 'axis' || item.type === 'mixed') {
                    axis = random() < 0.5 ? 'y' : 'x';
                    value = item.type === 'axis' ? 0 : value * (random() < 0.5 ? -1 : 1);
                }
                return { questionType: item.type, ...drawing({ axis, value }) };
            }
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
                sectionId: 'comparison', questionId: `final-check-${index + 1}`,
                questionType: question.type, scored: true, readOnly,
                ...(question.target ? drawing(question.target, question.correctFeedback) : {
                    input: 'choice', prompt: question.prompt,
                    options: state.order[index].map(option => question.options[option])
                }),
                onFeedback: reportProgress, onContinue: continueQuestion
            };
        }

        function renderEnding() {
            // Results need only saved text, avoiding creation of detached graph boards.
            const rows = questions.map((question, index) => {
                const card = state.cards[`final-check-${index + 1}`];
                return {
                    prompt: question.target ? `Draw ${equation(question.target.axis, question.target.value)}.` : question.prompt,
                    answer: question.target ? `You drew ${describeLine(card.value)}.`
                        : question.options[state.order[index][card.selected]].label,
                    firstCorrect: card.firstCorrect, correct: card.correct, explanation: card.feedback
                };
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

        let givenGraph;
        function render() {
            givenGraph?.destroy();
            root.replaceChildren();
            const heading = document.createElement('h3');
            heading.dataset.screenHeading = '';
            heading.textContent = state.screen === count ? 'Your completed Check' : questions[state.screen].title;
            root.append(heading);
            api.setSectionBack('comparison', state.screen > 0 ? {
                onClick: () => showScreen(state.screen - 1)
            } : null);
            if (state.finished) sectionEvent('complete');
            if (state.screen === count && state.finished) {
                renderEnding();
            } else {
                if (state.screen === 1 || state.screen === 2) {
                    const host = document.createElement('div');
                    root.append(host);
                    givenGraph = graphs.create(host, { label: state.screen === 1 ? "Coordinate grid showing Sam's line" : 'Coordinate grid showing (−2, 3) and (4, 3)' });
                    if (state.screen === 1) givenGraph.line({ axis: 'x', value: 4 }, { label: "Sam's line" });
                    else {
                        givenGraph.point([-2, 3], { coordinates: true, size: 'large' });
                        givenGraph.point([4, 3], { coordinates: true, size: 'large' });
                    }
                    givenGraph.setEditable(false);
                }
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
