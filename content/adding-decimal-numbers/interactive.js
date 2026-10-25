(() => {
    'use strict';

    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;

    const screens = [
        { title: 'Line up the decimal points', lines: [
            'Write 14.7 and 6.82 underneath each other.',
            'Ones go under ones. One tenth is 0.1. One hundredth is 0.01.'
        ] },
        { title: 'A zero can help', lines: [
            '14.7 = 14.70',
            'A zero at the end after the decimal point does not change the value.'
        ] },
        { title: 'Start at the right', lines: [
            'Hundredths: 0 + 2 = 2',
            'Write 2 in the hundredths column.'
        ] },
        { title: 'Carry into the next column', lines: [
            'Tenths: 7 + 8 = 15',
            'Ten tenths make one whole. Write 5 tenths and put 1 above the ones column.',
            'This is called carrying: move a group of ten into the next column.'
        ] },
        { title: 'Add the ones, including the carry', lines: [
            'Ones: 4 + 6 + 1 = 11',
            'Write 1 in the ones column. Carry 1 ten into the tens column.'
        ] },
        { title: 'Finish the tens and check the size', lines: [
            'Tens: 1 + 1 = 2',
            '14.70 + 6.82 = 21.52',
            'Keep the answer’s decimal point directly below the others.',
            '14.7 is about 15 and 6.82 is about 7. An answer near 22 makes sense.'
        ] }
    ];

    function examples() {
        return window.DecimalAddition.examples();
    }

    function sectionEvent(sectionId, name) {
        document.dispatchEvent(new CustomEvent(`maths1to9:section-${name}`, {
            detail: { sectionId }
        }));
    }

    async function mountLearn() {
        const root = document.createElement('article');
        document.getElementById('lesson-section-explanation').append(root);
        const api = window.Maths1to9Lesson;
        sectionEvent('explanation', 'gate');
        const section = await api.useSectionState('learn', {
            version: 1,
            initial: () => ({ screen: 0, furthestScreen: 0, finished: false }),
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
                if (/^(?:[0-9]|Hundredths:|Tenths:|Ones:|Tens:)/.test(line) && line.includes('=')) paragraph.className = 'decimal-equation';
                root.append(paragraph);
            }
            const frames = [
                {}, {},
                { result: ['', '', '.', '', '2'], highlight: 'hundredths' },
                { result: ['', '', '.', '5', '2'], carries: { ones: '1' }, highlight: 'tenths' },
                { result: ['', '1', '.', '5', '2'], carries: { ones: '1', tens: '1' }, highlight: 'ones' },
                { result: '21.52', carries: { ones: '1', tens: '1' }, highlight: 'tens' }
            ];
            window.DecimalAddition.drawGrid(root, state.screen === 0 ? '14.7' : '14.70', '6.82', frames[state.screen]);
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
            version: 1,
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
            const visual = document.createElement('div');
            window.DecimalAddition.drawExample(visual, example, state.cards[`example-${index + 1}`]?.correct);
            container.append(visual);
            const cardRoot = document.createElement('div');
            container.append(cardRoot);
            api.createQuestion(cardRoot, {
                ...window.DecimalAddition.prepare(example, window.Maths1to9LessonEngine.seededRandom(state.seed + index)), sectionId: 'interactive', questionId: `example-${index + 1}`,
                scored: false, readOnly,
                onFeedback(result) {
                    reportProgress();
                    visual.replaceChildren();
                    window.DecimalAddition.drawExample(visual, example, result.correct);
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
