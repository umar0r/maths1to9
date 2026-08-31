(() => {
    'use strict';

    /*
     * CHANGE: must match the slug in lesson.json / index.php.
     */
    const SLUG = 'my-lesson-slug';

    window.Maths1to9Interactives ??= {};

    /*
     * Section gating — do not change.
     *
     * gateSection() locks the lesson's "Next" button while the
     * pupil is on that section. completeSection() unlocks it.
     * The engine ignores duplicates, so both are safe to fire
     * on every render.
     *
     * Section ids: 'explanation', 'method', 'interactive',
     * 'worked-examples', 'question-bank'.
     */
    function gateSection(sectionId) {
        document.dispatchEvent(new CustomEvent('maths1to9:section-gate', {
            detail: { sectionId }
        }));
    }

    function completeSection(sectionId) {
        document.dispatchEvent(new CustomEvent('maths1to9:section-complete', {
            detail: { sectionId }
        }));
    }

    /*
     * OPTIONAL: bespoke Learn cards.
     *
     * If you replace the Learn section with your own card
     * navigator (like the fractions lesson does), call
     * gateSection('explanation') when it mounts and
     * completeSection('explanation') when the last card
     * renders. If you leave the engine's plain text in place,
     * do nothing and Learn stays ungated.
     */
    function mountLearnGraphics() {
        const section = document.getElementById('lesson-section-explanation');
        if (!section || section.dataset.visualMounted === 'true') {
            return;
        }
        section.dataset.visualMounted = 'true';

        // CHANGE: build Learn cards here, or delete this
        // function and its call in mountAll().
    }

    /*
     * Try It — one question at a time, one morphing button.
     *
     * The button has three phases:
     *   answering — "Check", disabled until an option is picked
     *   wrong     — "Try again", resets the question
     *   correct   — "Continue", advances; on the last question
     *               the button is replaced by a completion
     *               message and the section unlocks.
     */
    function mountTryIt(root) {
        if (!root || root.dataset.mounted === 'true') {
            return;
        }
        root.dataset.mounted = 'true';

        gateSection('interactive');

        /*
         * CHANGE: your scaffolded questions, most supported
         * first. Add any fields you need (visuals etc.) and
         * render them in render() below.
         */
        const questions = [
            {
                title: 'Guided question',
                prompt: 'CHANGE: prompt with the most support.',
                options: ['A', 'B', 'C'],
                answer: 'B',
                explanation: 'CHANGE: why B is right.',
                hint: 'CHANGE: nudge shown after a wrong answer.'
            },
            {
                title: 'Less support',
                prompt: 'CHANGE: prompt with partial support.',
                options: ['A', 'B', 'C'],
                answer: 'A',
                explanation: 'CHANGE: why A is right.',
                hint: 'CHANGE: nudge.'
            },
            {
                title: 'Work independently',
                prompt: 'CHANGE: no support this time.',
                options: ['A', 'B', 'C'],
                answer: 'C',
                explanation: 'CHANGE: why C is right.',
                hint: 'CHANGE: nudge.'
            }
        ];

        let index = 0;
        let selected = '';
        let phase = 'answering';

        function render() {
            const question = questions[index];
            const answered = phase !== 'answering';
            const isLast = index === questions.length - 1;
            const finished = phase === 'correct' && isLast;

            const actionLabel = phase === 'wrong'
                ? 'Try again'
                : phase === 'correct'
                    ? 'Continue'
                    : 'Check';

            root.innerHTML = (
                '<article class="fraction-try">'
                + `<p class="lesson-eyebrow">Question ${index + 1} of ${questions.length}</p>`
                + `<h3>${question.title}</h3>`
                + `<p>${question.prompt}</p>`
                /* CHANGE: insert your visual here if the question has one. */
                + '<div class="fraction-choice-row" role="radiogroup" aria-label="Choose an answer">'
                + question.options.map((option) => {
                    const stateClass = !answered
                        ? (selected === option ? 'is-selected' : '')
                        : option === selected
                            ? (phase === 'correct' ? 'is-correct' : 'is-incorrect')
                            : '';

                    return `<button class="answer-choice ${stateClass}" type="button" data-try-option="${option}" ${answered ? 'disabled' : ''}>${option}</button>`;
                }).join('')
                + '</div>'
                + '<div class="fraction-feedback" data-try-feedback role="status"></div>'
                + (finished
                    ? '<span class="fraction-try-complete">Try It complete. Use the button below to carry on.</span>'
                    : '')
                + '</article>'
            );

            const feedback = root.querySelector('[data-try-feedback]');

            if (phase === 'correct') {
                feedback.classList.add('is-correct');
                feedback.innerHTML = `<strong>Correct.</strong> ${question.explanation}`;
            } else if (phase === 'wrong') {
                feedback.classList.add('is-incorrect');
                feedback.innerHTML = `<strong>Not yet.</strong> ${question.hint}`;
            }

            if (finished) {
                completeSection('interactive');
                window.Maths1to9Lesson
                    ?.clearSectionAction?.('interactive');
            }

            root.querySelectorAll('[data-try-option]').forEach((button) => {
                button.addEventListener('click', () => {
                    selected = button.dataset.tryOption;
                    render();
                });
            });

            function handleAction() {
                if (phase === 'answering') {
                    phase = selected === question.answer ? 'correct' : 'wrong';
                } else if (phase === 'wrong') {
                    selected = '';
                    phase = 'answering';
                } else {
                    index += 1;
                    selected = '';
                    phase = 'answering';
                }

                render();
            }

            if (!finished) {
                window.Maths1to9Lesson
                    ?.setSectionAction?.('interactive', {
                        label: actionLabel,
                        disabled:
                            phase === 'answering' && selected === '',
                        onClick: handleAction
                    });
            }
        }

        render();
    }

    function mountAll() {
        mountLearnGraphics();

        const tryRoot = document.getElementById(`${SLUG}-interactive`);
        if (tryRoot) {
            mountTryIt(tryRoot);
        }
    }

    window.Maths1to9Interactives[SLUG] = mountTryIt;

    document.addEventListener('maths1to9:lesson-rendered', mountAll);
    mountAll();
})();
