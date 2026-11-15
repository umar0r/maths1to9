(() => {
    'use strict';

    const slug = document.body.dataset.lessonId;
    const content = {
        apples: {
            learn: [
                { title: 'Adding puts groups together', fruit: '🍎', start: 3, change: 4, action: 'Add 4 apples', result: 7 },
                { title: 'Count all the apples', fruit: '🍎', start: 2, change: 3, action: 'Add 3 apples', result: 5 }
            ],
            examples: [
                { prompt: 'How many apples? 3 + 4', answer: '7', feedback: '3 + 4 = 7.' },
                { prompt: 'How many apples? 2 + 3', answer: '5', feedback: '2 + 3 = 5.' }
            ]
        },
        pears: {
            learn: [
                { title: 'Subtracting takes some away', fruit: '🍐', start: 5, change: -3, action: 'Take away 3 pears', result: 2 },
                { title: 'Count the pears that are left', fruit: '🍐', start: 6, change: -2, action: 'Take away 2 pears', result: 4 }
            ],
            examples: [
                { prompt: 'How many pears are left? 5 − 3', answer: '2', feedback: '5 − 3 = 2.' },
                { prompt: 'How many pears are left? 6 − 2', answer: '4', feedback: '6 − 2 = 4.' }
            ]
        }
    };

    function registerSlides(api, sectionId, route, count, state, show) {
        function syncHash() {
            if (api.getCurrentSection().id === sectionId) {
                api.setSlideHash(`${route}-${state.screen + 1}`, { replace: true });
            }
        }
        for (let index = 0; index < count; index++) {
            api.registerHashRoute(`${route}-${index + 1}`, () => {
                if (!api.goToSection(sectionId, { moveFocus: false })) return false;
                show(Math.min(index, state.furthest));
            });
        }
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        return syncHash;
    }

    async function mountLearn(api, part, screens) {
        const { id } = api.getSection(`explanation--${part}`);
        const host = document.getElementById(`lesson-section-${id}`);
        const root = document.createElement('article');
        host.append(root);
        api.gateSection(id);
        const section = await api.useSectionState(`learn:${part}`, {
            version: 1,
            initial: () => ({ screen: 0, furthest: 0, tapped: screens.map(() => false) })
        });
        const state = section.state;
        const syncHash = registerSlides(api, id, `${part}-learn`, screens.length, state, show);
        render();

        function show(index) {
            section.update(saved => {
                saved.screen = index;
                saved.furthest = Math.max(saved.furthest, index);
            });
            render();
        }

        function render() {
            const index = state.screen;
            const screen = screens[index];
            const heading = document.createElement('h2');
            heading.id = `lesson-section-title-${id}`;
            heading.dataset.screenHeading = '';
            heading.textContent = screen.title;
            const fruit = document.createElement('p');
            const action = document.createElement('button');
            action.className = 'button';
            action.type = 'button';
            action.textContent = screen.action;
            action.addEventListener('click', () => {
                if (state.tapped[index]) return;
                section.update(saved => { saved.tapped[index] = true; });
                update();
            });
            const feedback = document.createElement('p');
            root.replaceChildren(heading, fruit, action, feedback);
            api.setSectionBack(id, index > 0 ? { onClick: () => show(index - 1) } : null);
            api.setSectionReset(id, () => {
                section.resetFields([['tapped', index]]);
                update();
            });
            update();

            function update() {
                const done = state.tapped[index];
                fruit.textContent = Array(done ? screen.result : screen.start).fill(screen.fruit).join(' ');
                action.setAttribute('aria-pressed', String(done));
                const operator = screen.change < 0 ? '−' : '+';
                feedback.textContent = done ? `${screen.start} ${operator} ${Math.abs(screen.change)} = ${screen.result}` : '';
                api.setSectionProgress(id, state.tapped.filter(Boolean).length, screens.length);
                if (state.tapped.every(Boolean)) api.completeSection(id);
                api.setSectionAction(id, {
                    label: index + 1 < screens.length ? 'Next' : 'Continue',
                    disabled: !done,
                    onClick: () => {
                        if (index + 1 < screens.length) show(index + 1);
                        else api.continueSection();
                    }
                });
                syncHash();
            }
        }
    }

    async function mountTryIt(api, root, { id, part }, examples) {
        const sectionId = id;
        root.closest('.lesson-section').removeAttribute('aria-labelledby');
        root.closest('.lesson-section').setAttribute('aria-label', `${part} Try it`);
        api.gateSection(sectionId);
        const section = await api.useSectionState(`interactive:${part}`, {
            version: 1,
            initial: () => ({ screen: 0, furthest: 0, cards: {} })
        });
        const state = section.state;
        const syncHash = registerSlides(api, sectionId, `${part}-try-it`, examples.length, state, show);
        render();

        function show(index) {
            section.update(saved => {
                saved.screen = index;
                saved.furthest = Math.max(saved.furthest, index);
            });
            render();
        }

        function reportProgress() {
            const completed = Object.values(state.cards).filter(card => card.correct === true).length;
            api.setSectionProgress(sectionId, completed, examples.length);
            if (completed === examples.length) api.completeSection(sectionId);
        }

        function render() {
            const index = state.screen;
            api.setSectionBack(sectionId, index > 0 ? { onClick: () => show(index - 1) } : null);
            api.setSectionPosition(sectionId, `Example ${index + 1} of ${examples.length}`);
            api.createQuestion(root, {
                ...examples[index],
                input: 'number',
                sectionId,
                questionId: `example-${index + 1}`,
                scored: false,
                autoContinue: false,
                fallback: part === 'apples' ? 'Count both groups of apples.' : 'Count the pears that are left.',
                onFeedback: reportProgress,
                onContinue() {
                    if (index + 1 < examples.length) show(index + 1);
                    else api.continueSection();
                }
            });
            syncHash();
        }
    }

    window.Maths1to9Interactives ??= {};
    window.Maths1to9Interactives[slug] = async (root, section) => {
        const api = window.Maths1to9Lesson;
        const part = content[section.part];
        await mountLearn(api, section.part, part.learn);
        await mountTryIt(api, root, section, part.examples);
    };
})();
