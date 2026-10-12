(() => {
    'use strict';

    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;

    const screens = [
        { title: 'What standard form looks like', lines: [String.raw`6000 = \underbrace{6}_{\substack{\text{the number}\\\text{at the front}}} \times \underbrace{10^3}_{\text{a power of 10}}`], caption: 'In standard form, the number at the front is at least 1 and less than 10. It is multiplied by a power of 10.' },
        { title: 'Group the numbers', lines: [String.raw`20 \times 300 = 2 \times 10 \times 3 \times 100`, String.raw`= (2 \times 3) \times (10 \times 100)`, String.raw`= 6 \times 1000 = 6000`], caption: 'Everything is being multiplied, so we can change the order. Multiply the numbers at the front, then the powers of 10.' },
        { title: 'Why we add the indices', tiles: true, lines: [String.raw`10^2 \times 10^3 = 10^5`], caption: 'The index is the small raised number. It counts the 10s multiplied together: 2 tens and 3 tens make 5 tens, so 10² × 10³ = 10⁵.' },
        { title: 'Put it together', lines: [String.raw`(2 \times 10^2) \times (4 \times 10^3)`, String.raw`2 \times 4 = 8 \qquad 2 + 3 = 5`, String.raw`= 8 \times 10^5`], caption: 'Multiply the numbers at the front and add the indices. 8 is at least 1 and less than 10, so 8 × 10⁵ is in standard form.' },
        { title: 'When the front number is 10 or more', lines: [String.raw`(4 \times 10^2) \times (5 \times 10^3) = 20 \times 10^5`, String.raw`20 = 2 \times 10`, String.raw`= 2 \times 10^6`, String.raw`10 \times 10^5 = 1 \times 10^6`], caption: "20 is too big for the number at the front: take out a 10, so it becomes 2 and the index goes up by 1. Exactly 10 isn't allowed either: 10 × 10⁵ = 1 × 10⁶." },
        { title: 'Negative indices work the same way', lines: [String.raw`10^3 \times 10^{-1} = 1000 \times 0.1 = 100 = 10^2`, String.raw`3 + (-1) = 2`, String.raw`(3 \times 10^4) \times (2 \times 10^{-2}) = 6 \times 10^2`, String.raw`4 + (-2) = 2`], caption: 'Keep the sign of each index when you add them.' }
    ];

    const examples = [
        { tiles: true, prompt: { latex: String.raw`10^{2} \times 10^{3} = 10^{\square}` }, inputLabel: 'What is the missing index?', input: 'number', answer: '5', feedback: '2 tens and 3 tens make 5 tens: 10⁵.', rules: [{ value: '6', feedback: 'That multiplies the indices. Count the 10s: 2 + 3 = 5.' }], fallback: 'Count the 10s in both groups.' },
        { lines: ['(3 × 10²) × (4 × 10³)'], prompt: 'Multiply the numbers at the front: 3 × 4 = ?', input: 'number', answer: '12', feedback: '3 × 4 = 12.', rules: [{ value: '7', feedback: 'That adds them. Multiply: 3 × 4 = 12.' }], fallback: 'Multiply 3 by 4.' },
        { lines: ['(3 × 10²) × (4 × 10³)', '3 × 4 = 12'], prompt: 'Add the indices: 2 + 3 = ?', input: 'number', answer: '5', feedback: '2 + 3 = 5, so we have 12 × 10⁵.', rules: [{ value: '6', feedback: 'That multiplies the indices. Add them: 2 + 3 = 5.' }], fallback: 'Add 2 and 3.' },
        { lines: ['= 12 × 10⁵'], prompt: '12 × 10⁵ = 1.2 × 10^? What is the index?', input: 'number', answer: '6', feedback: '12 = 1.2 × 10, so the index goes up by 1: 1.2 × 10⁶.', rules: [{ value: '4', feedback: 'Making the front smaller means one more 10, so the index goes up: 6.' }, { value: '5', feedback: '12 = 1.2 × 10, so there is one extra 10: the index is 6.' }], fallback: '12 = 1.2 × 10. Add that 10 to 10⁵.' },
        { prompt: 'Work out (2 × 10⁵) × (3 × 10⁻²)', input: 'choice', options: [
            { label: '6 × 10³', correct: true, feedback: '2 × 3 = 6 and 5 + (−2) = 3, so the answer is 6 × 10³.' },
            { label: '6 × 10⁷', feedback: 'Keep the minus sign: 5 + (−2) = 3.' },
            { label: '6 × 10⁻¹⁰', feedback: 'That multiplies the indices. Add them: 5 + (−2) = 3.' },
            { label: '5 × 10³', feedback: 'Multiply the front numbers: 2 × 3 = 6.' }
        ] }
    ];

    function sectionEvent(sectionId, name) {
        document.dispatchEvent(new CustomEvent(`maths1to9:section-${name}`, {
            detail: { sectionId }
        }));
    }

    function drawVisual(container, content, maths = false) {
        const visual = document.createElement('div');
        visual.className = 'standard-form-visual';
        if (content.tiles) {
            for (const [label, count] of [['10²', 2], ['10³', 3], ['10⁵', 5]]) {
                const row = document.createElement('div');
                row.className = 'standard-form-tiles';
                row.setAttribute('aria-label', `${label}: ${count} tens multiplied together`);
                const name = document.createElement('strong');
                name.textContent = `${label} = `;
                row.append(name);
                for (let i = 0; i < count; i++) {
                    const tile = document.createElement('span');
                    tile.className = 'standard-form-tile';
                    tile.textContent = '10';
                    row.append(tile);
                }
                visual.append(row);
            }
        }
        for (const line of content.lines || []) {
            const row = document.createElement('p');
            if (maths) window.katex.render(line, row, { throwOnError: true, displayMode: true });
            else row.textContent = line;
            visual.append(row);
        }
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
            drawVisual(root, screen, true);
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
            drawVisual(visual, example);
            container.append(visual);
            const cardRoot = document.createElement('div');
            container.append(cardRoot);
            api.createQuestion(cardRoot, {
                ...example, sectionId: 'interactive', questionId: `example-${index + 1}`,
                scored: false, readOnly,
                onFeedback(result) {
                    reportProgress();

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
