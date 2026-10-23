(() => {
    'use strict';

    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;

    // CHANGE: one idea per screen, with a diagram or hands-on visual rather
    // than paragraphs. Use plain English for GCSE pupils.
    const screens = [
        { title: 'Two equal groups', number: 3, caption: 'Each group has 3 counters.' },
        { title: 'Add the groups', number: 3, caption: '3 + 3 = 6. Two groups of 3 make 6.' },
        { title: 'Write it as multiplication', number: 4, caption: '2 × 4 = 8. Multiply by 2 to double.' }
    ];

    // CHANGE: replace these examples and their real misconception options.
    const examples = [
        {
            number: 5, prompt: 'What is 2 × 5?', input: 'choice',
            options: [
                { label: '10', correct: true, feedback: 'Two groups of 5 make 10.' },
                { label: '7', feedback: 'You added 2 instead of making two equal groups.' },
                { label: '5', feedback: 'That counts only one group.' },
                { label: '15', feedback: 'That counts three groups instead of two.' }
            ]
        },
        {
            number: 6, prompt: 'What is 2 × 6?', input: 'number', answer: '12',
            rules: [
                { value: '8', feedback: 'You added 2 instead of doubling.' },
                { value: '6', feedback: 'Count both groups, not just one.' }
            ],
            fallback: 'Add the two equal groups: 6 + 6.'
        }
    ];

    function sectionEvent(sectionId, name) {
        document.dispatchEvent(new CustomEvent(`maths1to9:section-${name}`, {
            detail: { sectionId }
        }));
    }

    function drawGroups(container, number) {
        // CHANGE: draw this lesson's own visual here. Shared cards own inputs.
        const visual = document.createElement('p');
        visual.className = 'interactive-equation';
        visual.setAttribute('role', 'img');
        visual.setAttribute('aria-label', `Two equal groups of ${number} counters`);
        visual.textContent = `${'● '.repeat(number).trim()}  +  ${'● '.repeat(number).trim()}`;
        container.append(visual);
    }

    async function mountLearn() {
        const root = document.createElement('article');
        document.getElementById('lesson-section-explanation').append(root);
        const api = window.Maths1to9Lesson;
        sectionEvent('explanation', 'gate');
        const section = await api.useSectionState('learn', {
            version: 1,
            initial: () => ({ screen: 0, furthestScreen: 0, finished: false })
            // CHANGE: bump version when content changes; add upgrade(saved,
            // version) when migrating a previous format. Unknown => null.
        });
        const state = section.state;

        function syncHash() {
            if (api.getCurrentSection().id === 'explanation') {
                api.setSlideHash(`learn-${state.screen + 1}`, { replace: true });
            }
        }

        function showScreen(screen) {
            section.update(state => {
                state.screen = screen;
                state.furthestScreen = Math.max(state.furthestScreen, screen);
                if (screen === screens.length - 1) state.finished = true;
            });
            render();
        }

        function render() {
            const screen = screens[state.screen];
            const { escapeHtml } = window.Maths1to9LessonEngine;
            root.innerHTML = `<h3 data-screen-heading>${escapeHtml(screen.title)}</h3>`;
            drawGroups(root, screen.number);
            const caption = document.createElement('p');
            caption.textContent = screen.caption;
            root.append(caption);
            api.setSectionBack('explanation', state.screen > 0 ? {
                onClick: () => showScreen(state.screen - 1)
            } : null);
            if (state.finished) sectionEvent('explanation', 'complete');
            if (state.screen < state.furthestScreen) {
                api.setSectionAction('explanation', {
                    label: 'Next', onClick: () => showScreen(state.screen + 1)
                });
            } else if (state.finished) {
                api.clearSectionAction('explanation');
            } else {
                // CHANGE: the current screen's normal action (e.g. Next match).
                api.setSectionAction('explanation', {
                    label: 'Next idea', onClick: () => showScreen(state.screen + 1)
                });
            }
            syncHash();
        }

        screens.forEach((screen, index) => {
            api.registerHashRoute(`learn-${index + 1}`, () => {
                api.goToSection('explanation', { moveFocus: false });
                showScreen(Math.min(index, state.furthestScreen));
            });
        });
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        const requested = screens.findIndex((screen, index) => initialHash === `#learn-${index + 1}`);
        if (requested >= 0) showScreen(Math.min(requested, state.furthestScreen));
        else render();
    }

    async function mountTryIt(root) {
        const api = window.Maths1to9Lesson;
        sectionEvent('interactive', 'gate');
        api.setSectionAction('interactive', { label: 'Check', disabled: true, onClick() {} });
        const section = await api.useSectionState('interactive', {
            version: 1,
            initial: () => ({ index: 0, screen: 0, furthestScreen: 0, finished: false, cards: {} })
        });
        const state = section.state;

        function syncHash() {
            if (api.getCurrentSection().id === 'interactive') {
                api.setSlideHash(`try-it-${state.screen + 1}`, { replace: true });
            }
        }

        function showScreen(screen) {
            section.update(state => { state.screen = screen; });
            render();
        }

        function reportProgress() {
            const card = state.cards[`example-${state.index + 1}`];
            const completed = state.finished ? examples.length : state.index + Number(card?.correct === true);
            api.setSectionProgress('interactive', completed, examples.length);
        }

        function continueExample() {
            section.update(state => {
                state.index++;
                state.screen = state.index;
                state.furthestScreen = state.screen;
                state.finished = state.index === examples.length;
            });
            render();
        }

        function drawExample(container, index, readOnly) {
            const example = examples[index];
            const visual = document.createElement('div');
            drawGroups(visual, example.number);
            container.append(visual);
            const cardRoot = document.createElement('div');
            container.append(cardRoot);
            api.createQuestion(cardRoot, {
                ...example, sectionId: 'interactive', questionId: `example-${index + 1}`,
                scored: false, readOnly,
                onFeedback(result) {
                    reportProgress();
                    // CHANGE: update the lesson visual in place in response to
                    // result.correct / result.value / result.option (e.g. flash
                    // a missed tile). Don't rebuild the shared card here.
                    visual.setAttribute('aria-label', result.correct ? 'Both groups counted' : 'Count both equal groups');
                },
                onContinue: continueExample
            });
        }

        function render() {
            root.replaceChildren();
            const heading = document.createElement('h3');
            heading.dataset.screenHeading = '';
            heading.textContent = state.screen === examples.length ? 'Your completed examples' : `Example ${state.screen + 1}`;
            root.append(heading);
            api.setSectionBack('interactive', state.screen > 0 ? {
                onClick: () => showScreen(state.screen - 1)
            } : null);
            if (state.finished) sectionEvent('interactive', 'complete');
            if (state.screen === examples.length) {
                examples.forEach((example, index) => {
                    const completed = document.createElement('article');
                    root.append(completed);
                    drawExample(completed, index, true);
                });
                api.clearSectionAction('interactive');
            } else {
                const readOnly = state.screen < state.index;
                drawExample(root, state.screen, readOnly);
                if (readOnly) api.setSectionAction('interactive', {
                    label: 'Next', onClick: () => showScreen(state.screen + 1)
                });
            }
            syncHash();
        }

        for (let index = 0; index <= examples.length; index++) {
            api.registerHashRoute(`try-it-${index + 1}`, () => {
                if (!api.goToSection('interactive', { moveFocus: false })) {
                    document.dispatchEvent(new CustomEvent('maths1to9:section-change'));
                    return;
                }
                showScreen(Math.min(index, state.furthestScreen));
            });
        }
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        reportProgress();
        render();
        const requested = Array.from({ length: examples.length + 1 }, (_, index) => index)
            .find(index => initialHash === `#try-it-${index + 1}`);
        if (requested !== undefined && api.goToSection('interactive', { moveFocus: false })) {
            showScreen(Math.min(requested, state.furthestScreen));
        }
    }

    window.Maths1to9Interactives ??= {};
    window.Maths1to9Interactives[SLUG] = mountTryIt;
    document.addEventListener('maths1to9:lesson-rendered', event => {
        if (event.detail?.slug === SLUG) mountLearn();
    });
})();
