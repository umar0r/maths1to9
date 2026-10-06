(() => {
    'use strict';

    const SLUG = 'prime-factor-decomposition';
    const contentVersion = 2;
    const PRACTICE_NUMBERS = Object.freeze([30, 44, 72, 81, 100, 126]);

    function pickSession() {
        const pool = [...PRACTICE_NUMBERS];
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        return pool.slice(0, 5);
    }

    async function mountPractice(root) {
        if (!root || root.dataset.mounted === 'true') return;
        root.dataset.mounted = 'true';
        const api = window.Maths1to9Lesson;
        const progress = window.Maths1to9Progress;
        const logic = window.Maths1to9PrimeFactors;
        const sectionId = 'question-bank';
        const dispatch = name => document.dispatchEvent(new CustomEvent(`maths1to9:section-${name}`, { detail: { sectionId } }));
        dispatch('gate');
        api.setSectionAction(sectionId, { label: 'Check', disabled: true, onClick: () => {} });
        let state = await progress.getLessonActivityState(SLUG, sectionId);
        // Keep E2 working and position while discarding the old chip answers.
        if (state?.contentVersion === 1 && Array.isArray(state.order)) {
            state = { ...state, contentVersion, builder: [{ prime: '', count: '' }], phase: 'answer', feedback: '', finished: false };
        }
        if (!state || state.contentVersion !== contentVersion || !Array.isArray(state.order)) {
            state = {
                contentVersion, order: pickSession(), index: 0,
                builder: [{ prime: '', count: '' }],
                phase: 'answer', feedback: '', finished: false
            };
        }
        // Preserve E1 sessions and answers while adding trees to their saved state.
        state.trees ??= state.order.map(n => logic.createTree(n));
        state.split ??= { nodeId: null, inputs: ['', ''], phase: 'answer', feedback: '', tone: 'is-correct' };
        let builder;
        let feedback;
        const save = () => progress.saveLessonActivityState(SLUG, sectionId, state);
        const reportProgress = () => api.setSectionProgress(sectionId, state.index + (state.phase === 'correct' ? 1 : 0), state.order.length);

        function activeTreeNode(node = state.trees[state.index]) {
            if (node.id === state.split.nodeId) return node;
            for (const child of node.children || []) {
                const found = activeTreeNode(child);
                if (found) return found;
            }
            return null;
        }
        function tapTreeNode(node) {
            if (state.phase === 'correct' || state.finished) return;
            state.split.inputs = ['', ''];
            state.split.phase = 'answer';
            if (logic.isPrime(node.value)) {
                state.split.nodeId = null;
                state.split.feedback = logic.feedback('is-prime', { n: node.value });
                state.split.tone = 'is-correct';
            } else {
                state.split.nodeId = node.id;
                state.split.feedback = '';
            }
            render();
            if (state.split.nodeId) root.querySelector('[data-practice-split-input]')?.focus({ preventScroll: true });
            else root.querySelector('[data-practice-tree-status]')?.focus({ preventScroll: true });
        }
        function checkTreeSplit() {
            if (state.split.phase === 'wrong') {
                state.split.inputs = ['', ''];
                state.split.phase = 'answer';
                state.split.feedback = '';
                render();
                root.querySelector('[data-practice-split-input]')?.focus({ preventScroll: true });
                return;
            }
            const node = activeTreeNode();
            if (!node || state.split.inputs.some(value => value.trim() === '')) return;
            const a = Number(state.split.inputs[0]);
            const b = Number(state.split.inputs[1]);
            const result = logic.checkSplit(node.value, a, b);
            if (!result.ok) {
                state.split.phase = 'wrong';
                state.split.feedback = logic.feedback(result.reason, { n: node.value });
                state.split.tone = 'is-incorrect';
            } else {
                state.trees[state.index] = logic.splitNode(state.trees[state.index], node.id, a, b).tree;
                state.split = { nodeId: null, inputs: ['', ''], phase: 'answer', feedback: '', tone: 'is-correct' };
            }
            // Optional working never records an assessment or earned progress.
            render();
        }
        function updateAction() {
            if (state.finished) { api.clearSectionAction(sectionId); return; }
            if (activeTreeNode()) {
                api.setSectionAction(sectionId, {
                    label: state.split.phase === 'wrong' ? 'Try again' : 'Check split',
                    disabled: state.split.phase !== 'wrong' && state.split.inputs.some(value => value.trim() === ''),
                    onClick: action
                });
                return;
            }
            const empty = !builder.isComplete();
            api.setSectionAction(sectionId, {
                label: state.phase === 'wrong' ? 'Try again' : state.phase === 'correct' ? 'Continue' : 'Check',
                disabled: state.phase === 'answer' && empty,
                onClick: action
            });
        }
        function action() {
            if (state.finished) return;
            if (activeTreeNode()) { checkTreeSplit(); return; }
            if (state.phase === 'wrong') {
                state.phase = 'answer';
                state.feedback = '';
            } else if (state.phase === 'correct') {
                if (state.index === state.order.length - 1) {
                    state.finished = true;
                    render();
                    api.goToSection('comparison', { unlock: true });
                    return;
                }
                state.index++;
                state.split = { nodeId: null, inputs: ['', ''], phase: 'answer', feedback: '', tone: 'is-correct' };
                state.builder = [{ prime: '', count: '' }];
                state.phase = 'answer';
                state.feedback = '';
            } else {
                if (!builder.isComplete()) return;
                const result = logic.markAnswer(state.order[state.index], builder.getEntries(), { indexForm: true });
                const correct = result.status === 'correct';
                state.phase = correct ? 'correct' : 'wrong';
                state.feedback = result.message;
                // Every Check is an assessed attempt; retries retain this slot ID.
                api.recordAssessment({
                    questionType: 'prime-index-form',
                    questionId: `question-bank:${state.index + 1}`,
                    correct
                });
                reportProgress();
            }
            render();
        }
        function render() {
            root.replaceChildren();
            const card = document.createElement('article');
            card.className = 'question-card question-card--bare';
            const number = document.createElement('p');
            number.className = 'question-number';
            number.textContent = `Question ${state.index + 1} of ${state.order.length}`;
            const prompt = document.createElement('h3');
            prompt.className = 'question-prompt';
            prompt.textContent = `Write ${state.order[state.index]} as a product of prime factors. Use powers for repeated factors.`;
            const container = document.createElement('div');
            feedback = document.createElement('p');
            feedback.className = `question-feedback${state.phase !== 'answer' ? ` is-visible ${state.phase === 'correct' ? 'is-correct' : 'is-incorrect'}` : ''}`;
            feedback.textContent = state.feedback;
            feedback.setAttribute('role', 'status');
            card.append(number, prompt);
            const treeArea = document.createElement('div');
            treeArea.className = 'prime-practice-tree';
            card.append(treeArea);
            const instruction = document.createElement('p');
            instruction.textContent = "Tap a number that isn't prime to split it. You don't have to use the tree.";
            treeArea.append(instruction, logic.drawTree(state.trees[state.index], {
                onNodeTap: tapTreeNode, locked: state.phase === 'correct' || state.finished
            }));
            const splitNode = activeTreeNode();
            if (splitNode) {
                const panel = document.createElement('div');
                panel.className = 'prime-split-panel';
                const text = document.createElement('p');
                text.textContent = `Split ${splitNode.value} into two numbers:`;
                const row = document.createElement('div');
                row.className = 'prime-split-inputs';
                panel.append(text, row);
                state.split.inputs.forEach((value, index) => {
                    if (index === 1) {
                        const times = document.createElement('span');
                        times.dataset.primeMaths = '\\times';
                        row.append(times);
                    }
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.inputMode = 'numeric';
                    input.autocomplete = 'off';
                    input.value = value;
                    input.readOnly = state.split.phase === 'wrong';
                    input.dataset.practiceSplitInput = String(index);
                    input.setAttribute('aria-label', `${index === 0 ? 'First' : 'Second'} factor of ${splitNode.value}`);
                    input.addEventListener('input', () => { state.split.inputs[index] = input.value; save(); updateAction(); });
                    input.addEventListener('keydown', event => {
                        if (event.key === 'Enter') { event.preventDefault(); action(); }
                    });
                    row.append(input);
                });
                treeArea.append(panel);
            }
            const treeStatus = document.createElement('p');
            treeStatus.className = `question-feedback${state.split.feedback ? ` is-visible ${state.split.tone}` : ''}`;
            treeStatus.textContent = state.split.feedback;
            treeStatus.dataset.practiceTreeStatus = 'true';
            treeStatus.setAttribute('role', 'status');
            treeStatus.tabIndex = -1;
            treeArea.append(treeStatus);
            if (logic.isFinished(state.trees[state.index])) {
                const finished = document.createElement('p');
                finished.textContent = 'Every end number is prime. Now write your answer below.';
                treeArea.append(finished);
            }
            const countInstruction = document.createElement('p');
            countInstruction.textContent = 'Write each prime once, and how many times it appears.';
            card.append(countInstruction, container, feedback);
            root.append(card);
            logic.renderMaths(treeArea);
            builder = logic.createAnswerBuilder(container, {
                target: state.order[state.index], initial: state.builder, empty: true,
                onChange: (entries, raw) => {
                    state.builder = raw;
                    state.phase = 'answer';
                    state.feedback = '';
                    feedback.textContent = '';
                    feedback.className = 'question-feedback';
                    save();
                    updateAction();
                }
            });
            state.builder = builder.getState();
            if (state.phase === 'correct') container.querySelectorAll('input, button').forEach(element => { element.disabled = true; });
            container.addEventListener('keydown', event => {
                if (event.key === 'Enter' && event.target.tagName === 'INPUT') { event.preventDefault(); action(); }
            });
            save();
            if (state.finished) dispatch('complete');
            updateAction();
        }
        reportProgress();
        render();
    }

    window.Maths1to9QuestionBanks ??= {};
    window.Maths1to9QuestionBanks[SLUG] = mountPractice;
    document.addEventListener('maths1to9:lesson-rendered', event => {
        if (event.detail?.slug === SLUG) mountPractice(event.detail.questionsRoot);
    });

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
        } else section.setAttribute('aria-label', 'Prime factor decomposition result');
    }

    function renderCheckEnding(root, state, api) {
        const score = state.questions.filter(q => q.firstCorrect === true).length;
        const ready = score === state.questions.length;
        const summary = api.getLesson().comparison.summary;
        showCheckHeading(root, false);
        root.innerHTML = `<section class="lesson-completion" aria-label="Prime factor decomposition result">
            <div class="lesson-completion__result ${ready ? 'lesson-completion__result--success' : ''}">
                ${ready ? '<span class="lesson-completion__celebration" aria-hidden="true">★</span>' : ''}
                <div><h2>${ready ? 'Congratulations!' : 'A little more practice will help'}</h2><p>${ready ? 'You’ve completed Prime factor decomposition and you’re ready to move on.' : 'You can choose another lesson below if you want to move on.'}</p><p>${score} of ${state.questions.length} Check questions correct first time.</p></div>
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
                api.recordAssessment({ questionType: question.type, questionId: `comparison:${state.index + 1}`, correct });
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
                button.textContent = option;
                button.disabled = answered;
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
