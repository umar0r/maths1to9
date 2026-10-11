(() => {
'use strict';
const SLUG = 'highest-common-factor';
const initialScreenHash = window.location.hash;
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
        } else section.setAttribute('aria-label', 'Highest common factor result');
    }

    function renderCheckEnding(root, state, api) {
        const score = state.order.filter((choices, index) => state.cards[`final-check-${index + 1}`]?.firstCorrect === true).length;
        const ready = score === state.order.length;
        const summary = api.getLesson().comparison.summary;
        showCheckHeading(root, false);
        root.innerHTML = `<section class="lesson-completion" aria-label="Highest common factor result">
            <div class="lesson-completion__result ${ready ? 'lesson-completion__result--success' : ''}">
                ${ready ? '<span class="lesson-completion__celebration" aria-hidden="true">★</span>' : ''}
                <div><h2>${ready ? 'Congratulations!' : 'A little more practice will help'}</h2><p>${ready ? 'You’ve completed Highest common factor and you’re ready to move on.' : 'You can choose another lesson below if you want to move on.'}</p><p>${score} of ${state.order.length} Check questions correct first time.</p></div>
                <p class="lesson-completion__score">${score}<small>/${state.order.length}</small></p>
            </div>
            ${`<section class="final-check-summary" aria-label="What you’ve learnt"><h2 class="lesson-section__title">${escape(summary.title)}</h2><ol class="lesson-steps">${summary.points.map(point => `<li class="lesson-step"><h3 class="lesson-step__title">${escape(point.title)}</h3><p class="lesson-step__text">${escape(point.text)}</p></li>`).join('')}</ol></section>`}
            <div class="lesson-completion__recommendations" aria-live="polite"><p>Finding your next lesson…</p></div>
        </section>`;
        renderRecommendations(root.querySelector('.lesson-completion__recommendations'));
    }

    async function mountCheck(root, lesson) {
        if (!root || root.dataset.mounted === 'true') return;
        root.dataset.mounted = 'true';
        const api = window.Maths1to9Lesson;
        const progress = window.Maths1to9Progress;
        const sectionId = 'comparison';
        const questions = lesson.comparison.questions;
        const count = questions.length;
        const dispatch = name => document.dispatchEvent(new CustomEvent(`maths1to9:section-${name}`, { detail: { sectionId } }));
        const renderMaths = () => document.dispatchEvent(new CustomEvent('maths1to9:hcf-render-maths', { detail: { root } }));
        dispatch('gate');
        api.setSectionAction(sectionId, { label: 'Check', disabled: true, onClick: () => {} });

        function initialState() {
            return {
                index: 0, screen: 0, furthestScreen: 0, finished: false,
                order: questions.map(question => window.Maths1to9LessonEngine.shuffle(question.options.map((option, index) => index))),
                cards: {}
            };
        }
        function upgradeCheck(saved, version) {
            if (version !== 0 || saved?.contentVersion !== 1 || !Array.isArray(saved.questions)) return null;
            const source = lesson.comparison.questions;
            if (saved.questions.length !== source.length || !Number.isInteger(saved.index) ||
                saved.index < 0 || saved.index >= source.length ||
                !['answer', 'wrong', 'correct'].includes(saved.phase)) return null;
            if (saved.questions.some((question, index) => !Array.isArray(question.options) ||
                question.options.length !== source[index].options.length)) return null;
            const order = saved.questions.map((question, index) => question.options.map(option => source[index].options.indexOf(option)));
            if (order.some((choices, index) => choices.includes(-1) || new Set(choices).size !== source[index].options.length)) return null;
            const cards = {};
            saved.questions.forEach((question, index) => {
                const completed = saved.finished || index < saved.index;
                if (!completed && index !== saved.index) return;
                const phase = completed ? 'correct' : saved.phase;
                const selected = completed ? question.answer : saved.selected ?? null;
                cards[`final-check-${index + 1}`] = {
                    selected, rejected: phase === 'wrong' && selected !== null ? [selected] : [],
                    value: '', phase, firstCorrect: question.firstCorrect ?? null,
                    correct: phase === 'correct' ? true : phase === 'wrong' ? false : null,
                    feedback: phase === 'answer' || selected === null ? '' : question.feedback[selected],
                    hint: null, invalid: false
                };
            });
            const screen = saved.screen ?? (saved.finished ? source.length : saved.index);
            return {
                index: saved.index, screen, furthestScreen: saved.furthestScreen ?? screen,
                finished: saved.finished, order, cards
            };
        }
        const section = await api.useSectionState(sectionId, {
            version: 1, initial: initialState, upgrade: upgradeCheck
        });
        const state = section.state;
        function showScreen(screen) {
            section.update(state => { state.screen = screen; });
            render();
            api.setSlideHash(screen === count ? 'summary' : `hcf-check-${screen + 1}`, { replace: true });
        }
        for (let screen = 0; screen <= count; screen++) {
            api.registerHashRoute(`hcf-check-${screen + 1}`, () => {
                if (!api.goToSection(sectionId, { moveFocus: false })) {
                    document.dispatchEvent(new CustomEvent('maths1to9:section-change'));
                    return;
                }
                showScreen(Math.min(screen, state.furthestScreen));
            });
        }
        function syncScreenHash() {
            if (api.getCurrentSection().id !== sectionId) return;
            if (root.dataset.view === 'summary' && !state.finished) return;
            api.setSlideHash(state.screen === count ? 'summary' : `hcf-check-${state.screen + 1}`, { replace: true });
        }
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncScreenHash));
        function reportProgress() {
            const current = state.cards[`final-check-${state.index + 1}`];
            const completed = state.finished ? count : state.index + (current?.phase === 'correct' ? 1 : 0);
            api.setSectionProgress(sectionId, completed, count);
        }
        function continueQuestion() {
            section.update(state => {
                state.index++;
                state.finished = state.index === count;
                state.screen = state.index;
                state.furthestScreen = state.screen;
            });
            render();
            if (state.finished) api.setSlideHash('summary');
        }
        function questionConfig(index, readOnly) {
            const question = questions[index];
            return {
                sectionId, questionId: `final-check-${index + 1}`, questionType: question.type,
                scored: true, prompt: question.prompt, input: 'choice', readOnly,
                options: state.order[index].map(option => ({
                    label: question.options[option], correct: option === question.answer,
                    feedback: question.feedback[option]
                })),
                onFeedback() {
                    reportProgress();
                    renderMaths();
                },
                onContinue: continueQuestion
            };
        }
        function render() {
            section.save();
            syncScreenHash();
            api.setSectionBack(sectionId, state.screen > 0 ? {
                onClick: () => showScreen(state.screen - 1)
            } : null);
            if (state.screen < (state.finished ? count : state.index)) {
                if (state.finished) dispatch('complete');
                showCheckHeading(root, true);
                api.createQuestion(root, questionConfig(state.screen, true));
                renderMaths();
                api.setSectionAction(sectionId, { label: 'Next', onClick: () => showScreen(state.screen + 1) });
                return;
            }
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
            api.createQuestion(root, questionConfig(state.index, false));
            const number = document.createElement('p');
            number.className = 'question-number';
            number.textContent = `Question ${state.index + 1} of ${count}`;
            root.querySelector('article').prepend(number);
            renderMaths();
        }
        document.addEventListener('maths1to9:comparison-view', render);
        reportProgress();
        render();
        const requested = initialScreenHash.match(/^#hcf-check-(\d+)$/);
        if (requested) {
            if (!api.goToSection(sectionId, { moveFocus: false })) {
                document.dispatchEvent(new CustomEvent('maths1to9:section-change'));
                return;
            }
            showScreen(Math.min(Number(requested[1]) - 1, state.furthestScreen));
        }
    }

    document.addEventListener('maths1to9:lesson-rendered', event => {
        if (event.detail?.slug !== SLUG) return;
        const lesson = event.detail.lesson || window.Maths1to9Lesson.getLesson();
        mountCheck(document.getElementById(`${SLUG}-comparison`), lesson);
    });
})();
