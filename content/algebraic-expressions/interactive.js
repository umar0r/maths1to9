(() => {
    'use strict';

    window.Maths1to9Interactives ??= {};

    window.Maths1to9Interactives['algebraic-expressions'] = function mount(root) {
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
        let stepIndex = 0;
        const expressions = [];
        const working = [];

        function element(tag, className, text) {
            const node = document.createElement(tag);
            node.className = className;
            node.textContent = text;
            return node;
        }

        function render(moveFocus = false) {
            root.replaceChildren();
            const card = element('article', 'question-card', '');
            const finished = stepIndex === steps.length;
            card.append(element('p', 'lesson-eyebrow', finished ? 'Expression complete' : `Step ${stepIndex + 1} of ${steps.length}`));
            const heading = element('h3', 'question-prompt', finished ? 'Josh has 2p + 30 songs.' : steps[stepIndex].prompt);
            heading.tabIndex = -1;
            card.append(heading);

            if (expressions.length) {
                card.append(element('p', 'interactive-equation', expressions.join(' → ')));
                const list = document.createElement('ol');
                working.forEach(text => list.append(element('li', '', text)));
                card.append(list);
            }

            if (!finished) {
                const step = steps[stepIndex];
                const choices = element('div', 'question-options', '');
                const feedback = element('p', 'question-feedback', '');
                feedback.setAttribute('role', 'status');
                for (const [label, message] of step.choices) {
                    const button = element('button', 'button', label);
                    button.type = 'button';
                    button.addEventListener('click', () => {
                        if (steps[stepIndex] !== step) return;
                        if (label !== step.answer) {
                            feedback.className = 'question-feedback is-visible is-incorrect';
                            feedback.textContent = message;
                            return;
                        }
                        expressions.push(step.answer);
                        working.push(step.explanation);
                        stepIndex += 1;
                        render(true);
                        if (stepIndex === steps.length) {
                            document.dispatchEvent(new CustomEvent('maths1to9:section-complete', {
                                detail: { sectionId: 'interactive' }
                            }));
                        }
                    });
                    choices.append(button);
                }
                card.append(choices, feedback);
            }

            root.append(card);
            if (moveFocus) heading.focus({ preventScroll: true });
        }

        render();
    };
})();
