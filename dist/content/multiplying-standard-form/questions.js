(() => {
    'use strict';

    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;

    function sectionEvent(name) {
        document.dispatchEvent(new CustomEvent(`maths1to9:section-${name}`, {
            detail: { sectionId: 'comparison' }
        }));
    }

    function formatNumber(value) {
        return String(Number(value.toFixed(2))).replace('-', '−');
    }

    function standardForm(front, index) {
        const superscripts = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
        return `${formatNumber(front)} × 10${String(index).split('').map(char => superscripts[char]).join('')}`;
    }

    function practiceQuestion(type, a, b, m, n, random) {
        const { shuffle } = window.Maths1to9LessonEngine;
        const p = a * b;
        const k = m + n;
        const adjustment = p >= 10 ? 1 : 0;
        const front = adjustment ? p / 10 : p;
        const index = k + adjustment;
        const answer = standardForm(front, index);
        const signed = value => value < 0 ? `(${formatNumber(value)})` : formatNumber(value);
        const calculation = `${formatNumber(a)} × ${formatNumber(b)} = ${formatNumber(p)} and ${formatNumber(m)} + ${signed(n)} = ${formatNumber(k)}`;
        const options = [{ label: answer, correct: true, feedback: adjustment
            ? `${calculation}. ${standardForm(p, k)} = ${answer}.`
            : `${calculation}, so the answer is ${answer}.` }];
        const candidates = [
            [standardForm(front, m * n + adjustment), 'That multiplies the indices. Add them instead.'],
            ...(adjustment ? [
                [standardForm(p, k), 'The number at the front must be less than 10. Take out a 10 and add 1 to the index.'],
                [standardForm(front, k - 1), 'Making the front number smaller means one more 10, so the index goes up by 1.']
            ] : []),
            ...(m < 0 || n < 0 ? [[standardForm(front, Math.abs(m) + Math.abs(n) + adjustment), 'Keep the sign of each index: add them as they are.']] : []),
            [standardForm(a + b >= 10 ? (a + b) / 10 : a + b, k + (a + b >= 10 ? 1 : 0)), "Multiply the numbers at the front, don't add them."],
            [standardForm(front, index - 1), `Add the indices carefully: ${formatNumber(m)} + ${signed(n)} = ${formatNumber(k)}.`],
            [standardForm(front, index + 1), `Add the indices carefully: ${formatNumber(m)} + ${signed(n)} = ${formatNumber(k)}.`],
            [standardForm(front, m), `Add both indices: ${formatNumber(m)} + ${signed(n)} = ${formatNumber(k)}.`],
            [standardForm(front, index - 2), `Add the indices carefully: ${formatNumber(m)} + ${signed(n)} = ${formatNumber(k)}.`],
            [standardForm(front, index + 2), `Add the indices carefully: ${formatNumber(m)} + ${signed(n)} = ${formatNumber(k)}.`]
        ];
        for (const [label, feedback] of candidates) {
            if (!options.some(option => option.label === label)) options.push({ label, feedback });
            if (options.length === 4) break;
        }
        return {
            questionType: type, input: 'choice',
            prompt: `Work out (${standardForm(a, m)}) × (${standardForm(b, n)}). Give your answer in standard form.`,
            options: shuffle(options, random)
        };
    }

    function mountPractice() {
        const api = window.Maths1to9Lesson;
        const { randomInt } = window.Maths1to9LessonEngine;
        const types = ['no-adjust', 'adjust', 'one-negative', 'front-ten', 'one-negative', 'two-negative'];
        return api.runQuestionSet('question-bank', {
            version: 1, count: types.length, practiseAgain: true, heading: 'Your practice results',
            pick(random) {
                return types.map(type => ({ type, seed: randomInt(0, 4294967295, random) }));
            },
            question(item, random) {
                const pairs = [];
                for (const a of [1.5, 2, 2.5, 3, 4, 5, 6]) {
                    for (let b = 2; b <= 9; b++) {
                        const p = a * b;
                        if (item.type === 'no-adjust' && p >= 10) continue;
                        if (item.type === 'adjust' && p <= 10) continue;
                        if (item.type === 'front-ten' && p !== 10) continue;
                        pairs.push([a, b]);
                    }
                }
                const [a, b] = pairs[randomInt(0, pairs.length - 1, random)];
                let m = randomInt(1, 6, random);
                let n = randomInt(1, 6, random);
                if (item.type === 'one-negative') {
                    m = randomInt(2, 7, random);
                    n = -randomInt(1, 6, random);
                    if (random() < 0.5) [m, n] = [n, m];
                } else if (item.type === 'two-negative') {
                    m = -m;
                    n = -n;
                }
                return practiceQuestion(item.type, a, b, m, n, random);
            }
        });
    }

    async function mountCheck(root, lesson) {
        const api = window.Maths1to9Lesson;
        const { shuffle, renderResults, renderScorePanel, escapeHtml } = window.Maths1to9LessonEngine;
        const questions = lesson.comparison.questions;
        const count = questions.length;
        sectionEvent('gate');
        api.setSectionAction('comparison', { label: 'Check', disabled: true, onClick() {} });
        const section = await api.useSectionState('comparison', {
            version: 1,
            initial: () => ({
                index: 0, screen: 0, furthestScreen: 0, finished: false, cards: {},
                order: questions.map(question => shuffle(question.options.map((option, index) => index)))
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
                questionType: question.type, scored: true, input: 'choice', readOnly,
                prompt: question.prompt,
                options: state.order[index].map(option => ({
                    label: question.options[option], correct: option === question.answer,
                    feedback: question.feedback[option]
                })),
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
