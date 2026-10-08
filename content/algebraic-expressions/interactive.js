(() => {
    'use strict';

    window.Maths1to9Interactives ??= {};

    window.Maths1to9Interactives['algebraic-expressions'] = async function mount(root) {
        if (!root || root.dataset.mounted) return;
        root.dataset.mounted = 'true';

        document.dispatchEvent(new CustomEvent('maths1to9:section-gate', {
            detail: { sectionId: 'interactive' }
        }));

        const steps = [
            {
                prompt: 'Miguel has p songs. What expression do you start with?',
                answer: 'p',
                choices: [
                    ['30', '30 is how many more songs Josh has than Adam. Start with Miguel’s number of songs.'],
                    ['p', ''],
                    ['2p', 'That is Adam’s number of songs. Start with Miguel, who has p songs.']
                ],
                explanation: 'Miguel has p songs.'
            },
            {
                prompt: 'Adam has twice as many songs as Miguel. What does p become?',
                answer: '2p',
                choices: [
                    ['p + 2', 'Twice as many means multiply by 2, not add 2.'],
                    ['p²', 'p² means p × p. Twice as many means 2 × p.'],
                    ['2p', '']
                ],
                explanation: 'Adam has 2 × p songs, written as 2p.'
            },
            {
                prompt: 'Josh has 30 more songs than Adam. What does 2p become?',
                answer: '2p + 30',
                choices: [
                    ['2p + 30', ''],
                    ['2(p + 30)', 'This adds 30 before doubling. Double Miguel’s number first, then add 30.'],
                    ['30p', '30 more means add 30, not multiply by 30.']
                ],
                explanation: 'Josh has 2p + 30 songs: double Miguel’s number, then add 30.'
            }
        ];
        const slug = 'algebraic-expressions';
        const store = window.Maths1to9Progress;
        let state = await store.getLessonActivityState(slug, 'interactive');
        if (state?.contentVersion !== 1) {
            state = { contentVersion: 1, steps, stepIndex: 0, answers: [] };
        }
        // Use the saved question text alongside its answers after content edits.
        const savedSteps = state.steps;
        function save() {
            store.saveLessonActivityState(slug, 'interactive', state);
        }

        function element(tag, className, text) {
            const node = document.createElement(tag);
            node.className = className;
            node.textContent = text;
            return node;
        }

        function render(moveFocus = false) {
            root.replaceChildren();
            const card = element('article', 'question-card', '');
            const finished = state.stepIndex === savedSteps.length;
            card.append(element('p', 'lesson-eyebrow', finished ? 'Expression complete' : `Step ${state.stepIndex + 1} of ${savedSteps.length}`));
            const heading = element('h3', 'question-prompt', finished ? 'Josh has 2p + 30 songs.' : savedSteps[state.stepIndex].prompt);
            heading.tabIndex = -1;
            card.append(heading);

            if (state.stepIndex > 0) {
                const chain = element('div', 'interactive-equation expression-chain', '');
                chain.setAttribute('aria-label', 'The growing expression');
                savedSteps.slice(0, state.stepIndex).forEach((step, index) => {
                    if (index > 0) {
                        const arrow = element('span', 'expression-chain__arrow', '→');
                        arrow.setAttribute('aria-hidden', 'true');
                        chain.append(arrow);
                    }
                    const answer = state.answers[index];
                    const term = element('span', 'expression-chain__term', '');
                    term.append(element('span', '', answer.selected));
                    const status = element('small', 'expression-chain__status', answer.firstCorrect ? '✓' : '2nd try');
                    status.setAttribute('aria-label', answer.firstCorrect ? 'Right first time' : 'Corrected');
                    term.append(status);
                    chain.append(term);
                });
                card.append(chain);
            }

            if (!finished) {
                const step = savedSteps[state.stepIndex];
                const choices = element('div', 'question-options', '');
                const feedback = element('p', 'question-feedback', '');
                feedback.setAttribute('role', 'status');
                const answer = state.answers[state.stepIndex] ??= {
                    selected: '', phase: 'answer', firstCorrect: null, attempts: []
                };
                if (answer.phase === 'wrong') {
                    feedback.className = 'question-feedback is-visible is-incorrect';
                    feedback.textContent = step.choices.find(choice => choice[0] === answer.selected)?.[1] || '';
                }
                for (const [label, message] of step.choices) {
                    const button = element('button', 'button', label);
                    button.type = 'button';
                    button.setAttribute('aria-pressed', String(answer.selected === label));
                    button.addEventListener('click', () => {
                        if (savedSteps[state.stepIndex] !== step) return;
                        const correct = label === step.answer;
                        answer.selected = label;
                        answer.phase = correct ? 'correct' : 'wrong';
                        if (answer.firstCorrect === null) answer.firstCorrect = correct;
                        answer.attempts.push({ selected: label, correct });
                        save();
                        if (!correct) {
                            feedback.className = 'question-feedback is-visible is-incorrect';
                            feedback.textContent = message;
                            render();
                            return;
                        }
                        state.stepIndex += 1;
                        render(true);

                    });
                    choices.append(button);
                }
                card.append(choices, feedback);
            }

            root.append(card);
            save();
            if (finished) {
                document.dispatchEvent(new CustomEvent('maths1to9:section-complete', {
                    detail: { sectionId: 'interactive' }
                }));
            }
            if (moveFocus) heading.focus({ preventScroll: true });
        }

        render();
    };
})();
