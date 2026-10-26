(() => {
    'use strict';

    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;

    function examples() {
        return window.Indices.examples();
    }

    function sectionEvent(sectionId, name) {
        document.dispatchEvent(new CustomEvent(`maths1to9:section-${name}`, {
            detail: { sectionId }
        }));
    }

    async function mountLearn() {
        const screens = window.Indices.learnScreens;
        const root = document.createElement('article');
        document.getElementById('lesson-section-explanation').append(root);
        const api = window.Maths1to9Lesson;
        sectionEvent('explanation', 'gate');
        const section = await api.useSectionState('learn', {
            version: 2,
            initial: () => ({ screen: 0, furthestScreen: 0, finished: false, base: 2, index: 1 }),
            upgrade: () => null
        });
        const state = section.state;
        section.save();

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
            const heading = root.querySelector('h3');
            heading.tabIndex = -1;
            heading.focus();
        }

        function render() {
            const screen = screens[state.screen];
            const { escapeHtml } = window.Maths1to9LessonEngine;
            root.innerHTML = `<h3 data-screen-heading>${escapeHtml(screen.title)}</h3>`;
            for (const line of screen.lines) {
                const paragraph = document.createElement('p');
                paragraph.textContent = line;
                root.append(paragraph);
            }
            const visual = document.createElement('div');
            if (state.screen === 1) visual.className = 'indices-explorer-picture';
            root.append(visual);
            window.Indices.drawLearn(visual, state.screen, section);
            if (state.screen === 1) {
                const controls = document.createElement('div');
                controls.className = 'indices-explorer-controls';
                const baseLabel = document.createElement('label');
                baseLabel.textContent = 'Base';
                const base = document.createElement('select');
                base.setAttribute('aria-label', 'Base');
                for (const number of [2, 3, 4, 5]) {
                    const option = document.createElement('option');
                    option.value = String(number); option.textContent = String(number);
                    base.append(option);
                }
                base.value = String(state.base);
                baseLabel.append(base);
                const indexLabel = document.createElement('label');
                const count = document.createElement('span');
                const slider = document.createElement('input');
                Object.assign(slider, { type: 'range', min: '1', max: '6', step: '1', value: String(state.index) });
                slider.setAttribute('aria-label', 'Index');
                indexLabel.append(count, slider);
                controls.append(baseLabel, indexLabel);
                root.insertBefore(controls, visual);
                function paint() {
                    count.textContent = `Index: ${state.index}`;
                    visual.replaceChildren();
                    visual.append(window.Indices.factorTiles(state.base, state.index));
                    const equation = document.createElement('p');
                    equation.className = 'indices-equation';
                    equation.textContent = state.index === 1 ? `${window.Indices.power(state.base, 1)} = ${state.base}`
                        : `${window.Indices.power(state.base, state.index)} = ${window.Indices.repeated(state.base, state.index)} = ${state.base ** state.index}`;
                    visual.append(equation);
                }
                function change() {
                    section.update(state => { state.base = Number(base.value); state.index = Number(slider.value); });
                    api.recordActivity({ id: 'indices:power-explorer', kind: 'explore' });
                    paint();
                }
                base.addEventListener('change', change);
                slider.addEventListener('input', change);
                paint();
            }
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
        const questions = examples();
        const api = window.Maths1to9Lesson;
        sectionEvent('interactive', 'gate');
        api.setSectionAction('interactive', { label: 'Check', disabled: true, onClick() {} });
        const section = await api.useSectionState('interactive', {
            version: 2,
            initial: () => ({
                index: 0, screen: 0, furthestScreen: 0, finished: false, cards: {},
                seed: window.Maths1to9LessonEngine.randomInt(0, 4294967295)
            }),
            upgrade: () => null
        });
        const state = section.state;
        section.save();

        function syncHash() {
            if (api.getCurrentSection().id === 'interactive') {
                api.setSlideHash(`try-it-${state.screen + 1}`, { replace: true });
            }
        }

        function showScreen(screen) {
            section.update(state => { state.screen = screen; });
            render();
            const heading = root.querySelector('h3');
            heading.tabIndex = -1;
            heading.focus();
        }

        function reportProgress() {
            const card = state.cards[`example-${state.index + 1}`];
            const completed = state.finished ? questions.length : state.index + Number(card?.correct === true);
            api.setSectionProgress('interactive', completed, questions.length);
        }

        function continueExample() {
            section.update(state => {
                state.index++;
                state.screen = state.index;
                state.furthestScreen = state.screen;
                state.finished = state.index === questions.length;
            });
            render();
        }

        function drawExample(container, index, readOnly) {
            const example = questions[index];
            const cardRoot = document.createElement('div');
            container.append(cardRoot);
            api.createQuestion(cardRoot, {
                ...window.Indices.prepare(example, window.Maths1to9LessonEngine.seededRandom(state.seed + index)), sectionId: 'interactive', questionId: `example-${index + 1}`,
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
            heading.textContent = state.screen === questions.length ? 'Your completed examples' : `Example ${state.screen + 1}`;
            root.append(heading);
            api.setSectionBack('interactive', state.screen > 0 ? {
                onClick: () => showScreen(state.screen - 1)
            } : null);
            if (state.finished) sectionEvent('interactive', 'complete');
            if (state.screen === questions.length) {
                questions.forEach((example, index) => {
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

        for (let index = 0; index <= questions.length; index++) {
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
        const requested = Array.from({ length: questions.length + 1 }, (_, index) => index)
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
