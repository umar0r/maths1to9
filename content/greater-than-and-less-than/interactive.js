(() => {
    'use strict';

    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;

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

    function element(tag, text = '', className = '') {
        const node = document.createElement(tag);
        node.textContent = text;
        node.className = className;
        return node;
    }

    function mouthSign(sign) {
        const svgNs = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNs, 'svg');
        svg.setAttribute('viewBox', '0 0 60 68');
        svg.setAttribute('class', 'pv-mouth');
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', sign === '>' ? 'is greater than' : 'is less than');

        const drawing = document.createElementNS(svgNs, 'g');
        if (sign === '<') drawing.setAttribute('transform', 'translate(60 0) scale(-1 1)');

        const along = [0.838, 0.545];
        const inward = [-0.545, 0.838];
        const point = (forward, inside) => [
            10 + along[0] * forward + inward[0] * inside,
            8 + along[1] * forward + inward[1] * inside
        ];
        for (const distance of [6, 15, 24]) {
            const corners = [point(distance - 4, 5), point(distance, 13), point(distance + 4, 5)];
            for (const flip of [false, true]) {
                const tooth = document.createElementNS(svgNs, 'polygon');
                tooth.setAttribute('points', corners.map(([x, y]) => `${x.toFixed(1)},${(flip ? 68 - y : y).toFixed(1)}`).join(' '));
                drawing.append(tooth);
            }
        }

        const jaws = document.createElementNS(svgNs, 'polyline');
        jaws.setAttribute('points', '10,8 50,34 10,60');
        drawing.append(jaws);
        svg.append(drawing);
        return svg;
    }

    function mountLearn() {
        const root = document.createElement('article');
        const heading = element('h3', 'The wide side of the sign faces the bigger number.', 'lesson-section__title');
        heading.setAttribute('data-screen-heading', '');
        root.append(heading, element('p', 'Think of the sign as an open mouth. It always wants to eat the bigger number.'));
        const cards = element('div', '', 'pv-sign-cards');
        for (const [said, left, sign, right] of [['0.80 is greater than 0.75', '0.80', '>', '0.75'], ['0.75 is less than 0.80', '0.75', '<', '0.80']]) {
            const card = element('div', '', 'pv-sign-card');
            const written = element('strong');
            written.append(left, mouthSign(sign), right);
            card.append(element('span', said), written);
            cards.append(card);
        }
        root.append(cards);

        document.getElementById('lesson-section-explanation').append(root);
        const api = window.Maths1to9Lesson;
        function syncHash() {
            if (api.getCurrentSection().id === 'explanation') {
                api.setSlideHash('learn-1', { replace: true });
            }
        }
        api.registerHashRoute('learn-1', () => api.goToSection('explanation', { moveFocus: false }));
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        api.setSectionAction('explanation', {
            label: 'Next',
            onClick: () => {
                sectionEvent('explanation', 'complete');
                api.goToSection('interactive', { unlock: true });
            }
        });
        syncHash();
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
