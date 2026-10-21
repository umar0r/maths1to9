(() => {
    'use strict';

    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;
    const T = window.Simultaneous;
    const { node, coordinate } = T;
    const event = (sectionId, name) => document.dispatchEvent(new CustomEvent(`maths1to9:section-${name}`, { detail: { sectionId } }));
    const first = [{ m: 1, c: 1 }, { m: -2, c: 4, text: 'y = 4 − 2x' }];
    const learn = [
        { title: 'One equation, lots of answers.', lines: [first[0]], text: [
            'y = x + 1 has lots of pairs of x and y that work.', 'Each point on the line is one pair.'] },
        { title: 'Two equations at once.', lines: first, text: [
            'Now we want x and y that work in **both** equations. These are called **simultaneous equations**.',
            `${coordinate([0, 1])} is on y = x + 1, but not on y = 4 − 2x. So it doesn't work in both.`] },
        { title: 'Where the lines cross.', lines: first, text: [
            `The lines cross at ${coordinate([1, 2])}. This point is on both lines.`,
            'Where two lines cross is called the **point of intersection**.'] },
        { title: 'It works in both.', lines: first, text: [
            'x = 1 and y = 2 work in both equations.', 'So the **solution** is x = 1, y = 2.'] },
        { title: 'The method.', lines: [{ m: 1, c: -1 }, { m: -1, c: 3, text: 'y = 3 − x' }], text: [
            'Find the crossing point, then read x, then y.'] },
        { title: 'Between grid lines.', lines: [{ m: 2, c: 0 }, { m: -1, c: 4, text: 'y = 4 − x' }], text: [
            "Lines don't always cross on a grid point.", "Use the scale to **estimate** each value. ≈ means 'about'."] }
    ];
    function layout(root) {
        const wrapper = node('div', '', 'simultaneous-layout');
        const figure = node('div', '', 'simultaneous-figure');
        const notes = node('div', '', 'simultaneous-notes');
        wrapper.append(figure, notes);
        root.append(wrapper);
        return { figure, notes };
    }
    async function mountLearn() {
        const api = window.Maths1to9Lesson;
        const root = node('article', '', 'simultaneous-learn');
        document.getElementById('lesson-section-explanation').append(root);
        event('explanation', 'gate');
        const section = await api.useSectionState('learn', {
            version: 1, initial: () => ({ screen: 0, furthestScreen: 0, finished: false, seen: [] })
        });
        const state = section.state;
        let board, timers = [];
        function syncHash() {
            if (api.getCurrentSection().id === 'explanation') api.setSlideHash(`learn-${state.screen + 1}`, { replace: true });
        }
        function show(screen) {
            section.update(s => {
                s.screen = screen;
                s.furthestScreen = Math.max(s.furthestScreen, screen);
                if (screen === learn.length - 1) s.finished = true;
            });
            render();
            const heading = root.querySelector('h3');
            heading.tabIndex = -1;
            heading.focus();
        }
        function render() {
            timers.forEach(clearTimeout);
            timers = [];
            board?.destroy();
            root.replaceChildren();
            const index = state.screen, screen = learn[index];
            const animate = !state.seen[index] && !matchMedia('(prefers-reduced-motion: reduce)').matches;
            let delay = 0;
            const later = run => {
                if (!animate) return run();
                delay += 500;
                timers.push(setTimeout(run, delay));
            };
            root.append(node('h3', screen.title));
            const { figure, notes } = layout(root);
            if (index === 0) figure.classList.add('simultaneous-single-equation');
            board = T.graph(figure, screen.lines, T.graphLabel(screen.lines), T.LEARN_GRID);
            screen.text.forEach(text => notes.append(T.strongText(text)));
            const steps = node('div', '', 'simultaneous-steps');
            notes.append(steps);
            const working = text => steps.append(node('p', text));
            if (index === 0) {
                let newest;
                [[[-2, -1], 'x = −2, y = −2 + 1 = −1'], [[0, 1], 'x = 0, y = 0 + 1 = 1'], [[2, 3], 'x = 2, y = 2 + 1 = 3']].forEach(([point, text]) => later(() => {
                    newest?.update({ coordinates: false });
                    newest = board.point(point, { coordinates: true, labelSide: 'above' });
                    working(text);
                }));
            } else if (index === 1) {
                board.point([0, 1], { size: 'large', coordinates: true, labelSide: 'left' });
                later(() => working('y = x + 1: 0 + 1 = 1 ✓'));
                later(() => working('y = 4 − 2x: 4 − 2 × 0 = 4, not 1 ✗'));
            } else if (index === 2 || index === 4) {
                const point = index === 2 ? [1, 2] : [2, 1];
                const guides = T.guides(board, point);
                let dot;
                later(() => {
                    dot = board.point(point, { size: 'large', tone: 'correct' });
                    if (index === 4) working('1. Find where the lines cross.');
                });
                later(() => { guides.x(); working(index === 2 ? 'x = 1' : '2. Go down to the x-axis: x = 2.'); });
                later(() => { guides.y(); working(index === 2 ? 'y = 2' : '3. Go across to the y-axis: y = 1.'); });
                later(() => {
                    dot.update({ coordinates: true, labelSide: 'right' });
                    if (index === 4) working('Write the solution: x = 2, y = 1.');
                });
            } else if (index === 3) {
                board.point([1, 2], { size: 'large', tone: 'correct', coordinates: true, labelSide: 'right' });
                const guides = T.guides(board, [1, 2]);
                guides.x(); guides.y();
                later(() => working('y = x + 1: 1 + 1 = 2 ✓'));
                later(() => working('y = 4 − 2x: 4 − 2 × 1 = 2 ✓'));
            } else {
                const point = [4 / 3, 8 / 3];
                later(() => {
                    // The documented positions option keeps a fractional position instead of snapping to a grid point.
                    board.point(point, { size: 'large', tone: 'correct', drag: 'positions', positions: [point] });
                    board.setEditable(false);
                    const guides = T.guides(board, point);
                    guides.x(); guides.y();
                });
                later(() => working('x is about a third of the way from 1 to 2: x ≈ 1.3.'));
                later(() => working('y is about two thirds of the way from 2 to 3: y ≈ 2.7.'));
                later(() => working('Solution: x ≈ 1.3, y ≈ 2.7.'));
            }
            section.update(s => { s.seen[index] = true; });
            api.setSectionBack('explanation', index > 0 ? { onClick: () => show(index - 1) } : null);
            if (state.finished) event('explanation', 'complete');
            if (index === learn.length - 1 && state.finished) api.clearSectionAction('explanation');
            else api.setSectionAction('explanation', { label: 'Next', onClick: () => show(index + 1) });
            syncHash();
        }
        learn.forEach((screen, index) => api.registerHashRoute(`learn-${index + 1}`, () => {
            api.goToSection('explanation', { moveFocus: false });
            show(Math.min(index, state.furthestScreen));
        }));
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        window.addEventListener('hashchange', () => queueMicrotask(syncHash));
        const requested = /^#learn-([1-6])$/.exec(initialHash);
        if (requested) show(Math.min(Number(requested[1]) - 1, state.furthestScreen));
        else render();
    }

    const guided = [{ m: 2, c: 7 }, { m: -1, c: 4 }];
    const lessHelp = [{ m: 1, c: -3 }, { m: -2, c: 3 }];
    const titles = ['Tap the crossing point.', 'Its x-coordinate.', 'Its y-coordinate.', 'Write the solution.', 'Now with less help.'];
    const steps = 5;
    const examples = [
        null,
        { input: 'number', prompt: 'Go down to the x-axis. What is the x-coordinate?', answer: '-1', rules: [
            { value: '1', feedback: 'The crossing point is left of 0, so its x-coordinate is negative: −1.' },
            { value: '5', feedback: "That's the y-coordinate. Read x on the x-axis: −1." }],
            fallback: 'Follow the dashed line down to the x-axis.', feedback: 'Right. x = −1.' },
        { input: 'choice', prompt: 'Go across to the y-axis. What is the y-coordinate?', options: [
            T.choice('5', 'Right. y = 5.', true),
            T.choice('−1', "That's the x-coordinate. Read y on the y-axis: 5."),
            T.choice('−5', 'The point is above 0, so y is positive: 5.'),
            T.choice('4', '4 is where y = −x + 4 crosses the y-axis. The crossing point is higher up, level with 5.')] },
        { input: 'choice', prompt: 'What is the solution?', options: [
            T.choice('x = −1, y = 5', 'Right. These values work in both equations.', true),
            T.choice('x = 5, y = −1', 'x comes first. Read x on the x-axis: x = −1, y = 5.'),
            T.choice('x = 1, y = 5', 'The point is left of 0, so x is negative: x = −1.'),
            T.choice('x = 0, y = 7', "(0, 7) is where y = 2x + 7 crosses the y-axis. It's on one line only.")] },
        T.solutionCard(lessHelp)
    ].map(config => config ? T.formatCard(config) : null);

    async function mountTryIt(root) {
        const api = window.Maths1to9Lesson;
        event('interactive', 'gate');
        const section = await api.useSectionState('interactive', {
            version: 1,
            initial: () => ({ index: 0, screen: 0, furthestScreen: 0, finished: false, cards: {},
                tap: null, found: false, help: false,
                order: examples.map(q => window.Maths1to9LessonEngine.shuffle((q?.options || []).map((o, i) => i))) })
        });
        const state = section.state;
        section.save();
        let board = null;
        const correct = index => state.cards[`example-${index}`]?.correct === true;
        function syncHash() {
            if (api.getCurrentSection().id === 'interactive') api.setSlideHash(`try-it-${state.screen + 1}`, { replace: true });
        }
        function show(screen) {
            section.update(s => { s.screen = screen; });
            render();
            const heading = root.querySelector('h3');
            heading.tabIndex = -1;
            heading.focus();
        }
        function report() {
            let completed = Number(state.found);
            for (let i = 1; i < steps; i++) completed += Number(correct(i));
            api.setSectionProgress('interactive', completed, steps);
        }
        function advance() {
            section.update(s => {
                s.index++;
                s.screen = s.index;
                s.furthestScreen = s.screen;
                s.finished = s.index === steps;
            });
            render();
        }
        function finding(host) {
            const { figure, notes } = layout(host);
            notes.append(node('p', 'Tap where the two lines cross.'));
            board = T.graph(figure, guided, T.graphLabel(guided), T.TRY_GRID);
            const status = node('p', '', 'simultaneous-status');
            status.setAttribute('role', 'status');
            figure.append(status);
            let dot, picker;
            function paint() {
                dot?.remove();
                if (state.tap) dot = board.point(state.tap, { size: 'large', tone: state.found ? 'correct' : 'incorrect' });
                const first = state.tap && T.onLine(guided[0], state.tap);
                const second = state.tap && T.onLine(guided[1], state.tap);
                status.textContent = T.mathText(state.found ? '✓ Both lines go through this point.'
                    : !state.tap ? '' : first ? '✗ That point is on y = 2x + 7 only. Find where both lines meet.'
                        : second ? '✗ That point is on y = −x + 4 only. Find where both lines meet.'
                            : "✗ That point isn't on either line. Find where the two lines cross.");
                status.className = `simultaneous-status${state.tap ? ` question-feedback is-visible ${state.found ? 'is-correct' : 'is-incorrect'}` : ''}`;
                api.setSectionAction('interactive', {
                    label: state.index > 0 ? 'Next' : 'Continue', disabled: !state.found,
                    onClick: state.index > 0 ? () => show(1) : advance
                });
            }
            if (!state.found) picker = board.pick({ label: 'Tap where the two lines cross.', onPick(point) {
                section.update(s => { s.tap = point; s.found = guided.every(line => T.onLine(line, point)); });
                if (state.found) { picker.stop(); board.setEditable(false); }
                paint();
                report();
            } });
            paint();
        }
        function card(host, index, readOnly) {
            host.classList.add('simultaneous-guided-card');
            let currentBoard, currentPoint;
            const config = examples[index];
            const figure = T.figure(index === 4 ? lessHelp : guided, {
                grid: index === 4 ? T.GRID : T.TRY_GRID,
                setup(graph) {
                    currentBoard = graph;
                    if (index === 4) {
                        if (state.help) { const guides = T.guides(graph, [2, -1]); guides.x(); guides.y(); }
                    } else {
                        const guides = T.guides(graph, [-1, 5]);
                        guides.x();
                        if (index >= 2) guides.y();
                        currentPoint = graph.point([-1, 5], { size: 'large', coordinates: index >= 3 || (index === 2 && correct(2)), labelSide: 'left' });
                    }
                }
            });
            api.createQuestion(host, {
                ...config, figure,
                options: state.order[index].map(i => config.options[i]),
                sectionId: 'interactive', questionId: `example-${index}`, scored: false, readOnly,
                onFeedback(result) {
                    report();
                    if (index === 2 && result.correct) {
                        // Only the lesson's graph changes; the shared card and its feedback stay intact.
                        currentPoint.update({ coordinates: true, labelSide: 'left' });
                    }
                    if (index === 4 && !result.correct && !state.help) {
                        section.update(s => { s.help = true; });
                        const guides = T.guides(currentBoard, [2, -1]);
                        guides.x(); guides.y();
                    }
                }, onContinue: advance
            });
        }
        function render() {
            board?.destroy();
            board = null;
            root.replaceChildren();
            const done = state.screen === steps;
            root.append(node('h3', done ? 'Your completed examples' : titles[state.screen]));
            api.setSectionBack('interactive', state.screen ? { onClick: () => show(state.screen - 1) } : null);
            if (state.finished) event('interactive', 'complete');
            if (done) {
                const found = node('div', '', 'simultaneous-retained');
                root.append(found);
                finding(found);
                for (let i = 1; i < steps; i++) {
                    const host = node('div', '', 'simultaneous-retained');
                    root.append(host);
                    card(host, i, true);
                }
                api.clearSectionAction('interactive');
            } else if (state.screen === 0) finding(root);
            else {
                const host = node('div');
                root.append(host);
                const readOnly = state.screen < state.index;
                card(host, state.screen, readOnly);
                if (readOnly) api.setSectionAction('interactive', { label: 'Next', onClick: () => show(state.screen + 1) });
            }
            report();
            syncHash();
        }
        for (let i = 0; i <= steps; i++) api.registerHashRoute(`try-it-${i + 1}`, () => {
            if (api.goToSection('interactive', { moveFocus: false })) show(Math.min(i, state.furthestScreen));
        });
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        window.addEventListener('hashchange', () => queueMicrotask(syncHash));
        render();
        const requested = /^#try-it-([1-6])$/.exec(initialHash);
        if (requested && api.goToSection('interactive', { moveFocus: false })) show(Math.min(Number(requested[1]) - 1, state.furthestScreen));
    }
    T.examples = examples;
    T.learn = learn;
    window.Maths1to9Interactives ??= {};
    window.Maths1to9Interactives[SLUG] = mountTryIt;

    document.addEventListener('maths1to9:lesson-rendered', e => { if (e.detail?.slug === SLUG) mountLearn(); });
})();
