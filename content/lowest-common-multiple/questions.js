(() => {
'use strict';
const SLUG = 'lowest-common-multiple';
    const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

    async function renderRecommendations(container) {
        try {
            const lessons = await window.Maths1to9Recommendations.getForLesson(SLUG);
            if (!lessons.length) {
                container.innerHTML = '<p>Choose another topic from all lessons.</p>';
                return;
            }
            container.innerHTML = '<h3 class="lesson-completion__next-title">Next lessons</h3>'
                + '<div class="lesson-completion__more">' + lessons.slice(0,3).map(lesson =>
                    `<a class="lesson-recommendation-card" href="${escape(lesson.url)}"><span class="lesson-recommendation-card__title">${escape(lesson.title)}</span><span class="lesson-recommendation-card__subtitle">${escape(lesson.subtitle || '')}</span><span class="lesson-recommendation-card__action">${lesson.state?.label === 'In progress' ? 'Continue lesson' : 'Start lesson'}</span></a>`
                ).join('') + '</div>';
        } catch {
            container.innerHTML = '<p>Choose another topic from all lessons.</p>';
        }
    }

    // The end screen replaces Check's heading; the questions bring it back.
    function showCheckHeading(root, visible) {
        const section = root.closest('.lesson-section');
        for (const child of section.children) {
            if (child.matches('.lesson-eyebrow, .lesson-section__title, .lesson-section__intro')) child.hidden = !visible;
        }
        if (!visible && section.hasAttribute('aria-labelledby')) {
            section.dataset.labelledby = section.getAttribute('aria-labelledby');
            section.removeAttribute('aria-labelledby');
        }
        if (visible) {
            section.removeAttribute('aria-label');
            if (section.dataset.labelledby) section.setAttribute('aria-labelledby', section.dataset.labelledby);
        } else section.setAttribute('aria-label', 'Lowest common multiple result');
    }

    function renderCheckEnding(root, state, api) {
        const score = state.questions.filter(q => q.firstCorrect === true).length;
        const ready = score === state.questions.length;
        const summary = api.getLesson().comparison.summary;
        showCheckHeading(root, false);
        root.innerHTML = `<section class="lesson-completion" aria-label="Lowest common multiple result">
            <div class="lesson-completion__result ${ready ? 'lesson-completion__result--success' : ''}">
                ${ready ? '<span class="lesson-completion__celebration" aria-hidden="true">★</span>' : ''}
                <div><h2>${ready ? 'Congratulations!' : 'A little more practice will help'}</h2><p>${ready ? 'You’ve completed Lowest common multiple and you’re ready to move on.' : 'You can choose another lesson below if you want to move on.'}</p><p>${score} of ${state.questions.length} Check questions correct first time.</p></div>
                <p class="lesson-completion__score">${score}<small>/${state.questions.length}</small></p>
            </div>
            ${`<section class="final-check-summary" aria-label="What you’ve learnt"><h2 class="lesson-section__title">${escape(summary.title)}</h2><ol class="lesson-steps">${summary.points.map(point => `<li class="lesson-step"><h3 class="lesson-step__title">${escape(point.title)}</h3><p class="lesson-step__text">${escape(point.text)}</p></li>`).join('')}</ol></section>`}
            <div class="lesson-completion__recommendations" aria-live="polite"><p>Finding your next lesson…</p></div>
        </section>`;
        renderRecommendations(root.querySelector('.lesson-completion__recommendations'));
    }

    // Keep each option and its feedback together during shuffling.
    function shuffleCheckQuestion(question) {
        const choices = question.options.map((option, index) => ({
            option, feedback: question.feedback[index], correct: index === question.answer
        }));
        for (let i = choices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [choices[i], choices[j]] = [choices[j], choices[i]];
        }
        return {
            ...question, options: choices.map(choice => choice.option),
            feedback: choices.map(choice => choice.feedback),
            answer: choices.findIndex(choice => choice.correct)
        };
    }

    async function mountCheck(root, lesson) {
        if (!root || root.dataset.mounted === 'true') return;
        root.dataset.mounted = 'true';
        const api = window.Maths1to9Lesson;
        const progress = window.Maths1to9Progress;
        const sectionId = 'comparison';
        const checkContentVersion = 1;
        const dispatch = name => document.dispatchEvent(new CustomEvent(`maths1to9:section-${name}`, { detail: { sectionId } }));
        dispatch('gate');
        api.setSectionAction(sectionId, { label: 'Check', disabled: true, onClick: () => {} });
        let state = await progress.getLessonActivityState(SLUG, sectionId);
        if (!state || state.contentVersion !== checkContentVersion || !Array.isArray(state.questions)) {
            state = {
                contentVersion: checkContentVersion, index: 0, selected: null, phase: 'answer',
                questions: lesson.comparison.questions.map(shuffleCheckQuestion), finished: false
            };
        }
        const save = () => progress.saveLessonActivityState(SLUG, sectionId, state);
        const reportProgress = () => api.setSectionProgress(sectionId,
            state.finished ? state.questions.length : state.index + (state.phase === 'correct' ? 1 : 0), state.questions.length);

        function action() {
            if (state.finished) return;
            const question = state.questions[state.index];
            if (state.phase === 'wrong') {
                state.phase = 'answer';
                state.selected = null;
            } else if (state.phase === 'correct') {
                if (state.index === state.questions.length - 1) {
                    state.finished = true;
                    render();
                    api.setSlideHash('summary');
                    return;
                }
                state.index++;
                state.selected = null;
                state.phase = 'answer';
            } else {
                if (state.selected === null) return;
                const correct = state.selected === question.answer;
                if (question.firstCorrect === undefined) question.firstCorrect = correct;
                state.phase = correct ? 'correct' : 'wrong';
                question.rejected ??= [];
                if (!correct && !question.rejected.includes(state.selected)) question.rejected.push(state.selected);
                api.recordAssessment({ questionType: question.type, questionId: `final-check-${state.index + 1}`, correct });
                reportProgress();
            }
            render();
        }
        function render() {
            save();
            if (state.finished || root.dataset.view === 'summary') {
                renderCheckEnding(root, state, api);
                if (state.finished) dispatch('complete');
                api.setSectionAction(sectionId, {
                    label: 'All lessons', disabled: false,
                    onClick: async () => {
                        if (state.finished) api.completeLesson();
                        await progress.saveCurrentLesson();
                        window.location.assign(new URL('../../', window.location.href).href);
                    }
                });
                return;
            }
            showCheckHeading(root, true);
            root.replaceChildren();
            const question = state.questions[state.index];
            const answered = state.phase !== 'answer';
            const card = document.createElement('article');
            card.className = 'question-card question-card--bare';
            const number = document.createElement('p');
            number.className = 'question-number';
            number.textContent = `Question ${state.index + 1} of ${state.questions.length}`;
            const prompt = document.createElement('h3');
            prompt.className = 'question-prompt';
            prompt.textContent = question.prompt;
            const options = document.createElement('div');
            options.className = 'prime-check-options';
            options.setAttribute('role', 'group');
            options.setAttribute('aria-label', 'Choose an answer');
            question.options.forEach((option, index) => {
                const button = document.createElement('button');
                button.type = 'button';
                const selected = state.selected === index;
                button.className = `button${selected ? state.phase === 'correct' ? ' is-correct' : state.phase === 'wrong' ? ' is-incorrect' : ' is-selected' : ''}`;
                const rejected = question.rejected?.includes(index);
                button.textContent = option;
                if (rejected) {
                    button.classList.add('is-rejected');
                    const mark = document.createElement('span');
                    mark.className = 'lcm-wrong-mark';
                    mark.textContent = ' ×';
                    button.append(mark);
                }
                button.disabled = answered || rejected;
                button.setAttribute('aria-pressed', String(selected));
                button.addEventListener('click', () => {
                    if (state.phase !== 'answer') return;
                    state.selected = index;
                    render();
                });
                options.append(button);
            });
            const feedback = document.createElement('p');
            feedback.className = `question-feedback${answered ? ` is-visible ${state.phase === 'correct' ? 'is-correct' : 'is-incorrect'}` : ''}`;
            feedback.setAttribute('role', 'status');
            feedback.textContent = answered ? question.feedback[state.selected] : '';
            card.append(number, prompt, options, feedback);
            root.append(card);
            document.dispatchEvent(new CustomEvent('maths1to9:lcm-render-maths', { detail: { root: card } }));
            api.setSectionAction(sectionId, {
                label: state.phase === 'wrong' ? 'Try again' : state.phase === 'correct' ? 'Continue' : 'Check',
                disabled: state.phase === 'answer' && state.selected === null, onClick: action
            });
        }
        document.addEventListener('maths1to9:comparison-view', render);
        reportProgress();
        render();
    }

    document.addEventListener('maths1to9:lesson-rendered', event => {
        if (event.detail?.slug !== SLUG) return;
        const lesson = event.detail.lesson || window.Maths1to9Lesson.getLesson();
        mountCheck(document.getElementById(`${SLUG}-comparison`), lesson);
    });
})();
