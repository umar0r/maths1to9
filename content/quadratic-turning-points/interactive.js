(() => {
    'use strict';

    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;
    const T = window.Turning;
    const { node, coordinate, number } = T;

    const event = (sectionId, name) => document.dispatchEvent(new CustomEvent(`maths1to9:section-${name}`, { detail: { sectionId } }));
    const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Learn is for looking: the graph first, things appear in turn, nothing to answer.
    const learn = [
        { title: 'Where the curve turns.', forms: [{ a: 1, h: 1, k: -2 }], slide: true, text: [
            'Follow the curve from left to right. It goes down, then up.',
            'Where it turns is the **turning point**.'] },
        { title: 'The lowest point is a minimum.', forms: [{ a: 1, h: 1, k: -2 }], guides: true, text: [
            "It's the lowest point on the curve, so it's a **minimum**.",
            'Read x first, then y: (1, −2).'] },
        { title: 'A curve that opens downwards.', forms: [{ a: -1, h: -2, k: 3 }], slide: true, guides: true, text: [
            'This curve goes up, then down.',
            "Its turning point is the highest point, so it's a **maximum**: (−2, 3)."] },
        { title: 'Shape, not position.', forms: [{ a: -1, h: 2, k: -2 }], named: 'coordinates', text: [
            'This curve is below the x-axis, but it still has a highest point.',
            'Its turning point is a **maximum**.',
            'Look at the shape, not where it is.'] },
        { title: 'Both together.', forms: [{ a: 1, h: -3, k: -3 }, { a: -1, h: 3, k: 4 }], named: 'kind', text: [
            'Lowest point: **minimum**. Highest point: **maximum**.',
            'Write the turning point as (x, y): (−3, −3) and (3, 4).'] }
    ];

    // Which way the curve is heading at x, reading from left to right.
    function heading(form, x) {
        if (x === form.h) return '';
        const falling = (x < form.h) === (form.a === 1);
        return falling ? 'Going down…' : 'Going up…';
    }

    function layout(root) {
        const wrapper = node('div', '', 'turning-layout');
        const figure = node('div', '', 'turning-figure');
        const notes = node('div', '', 'turning-notes');
        wrapper.append(figure, notes);
        root.append(wrapper);
        return { figure, notes };
    }

    async function mountLearn() {
        const api = window.Maths1to9Lesson;
        const root = node('article', '', 'turning-learn');
        document.getElementById('lesson-section-explanation').append(root);
        event('explanation', 'gate');
        const section = await api.useSectionState('learn', {
            version: 1,
            initial: () => ({ screen: 0, furthestScreen: 0, finished: false, seen: [] })
        });
        const state = section.state;
        let board = null;
        let timers = [];

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
            const title = root.querySelector('h3');
            title.tabIndex = -1;
            title.focus();
        }
        function render() {
            timers.forEach(clearTimeout);
            timers = [];
            board?.destroy();
            root.replaceChildren();
            const screen = learn[state.screen];
            const animate = !state.seen[state.screen] && !reducedMotion();
            let delay = 0;
            // Run each step in turn the first time; on a revisit, or with reduced motion, show the finished screen.
            const later = (run, wait = 500) => {
                if (!animate) return run();
                delay += wait;
                timers.push(setTimeout(run, delay));
            };
            root.append(node('h3', screen.title));
            const { figure, notes } = layout(root);
            const host = node('div');
            figure.append(host);
            const [form] = screen.forms;
            if (screen.forms.length > 1) {
                // Two curves on one grid: each stops 2.5 units either side of its turning point,
                // so they read as two separate shapes.
                board = T.graph(host, [], 'Coordinate grid with a U-shaped curve and an upside-down U-shaped curve.');
                screen.forms.forEach(each => board.plot(x => T.valueOf(each, x), { domain: [Math.max(T.GRID.x[0], each.h - 2.5), Math.min(T.GRID.x[1], each.h + 2.5)] }));
            } else {
                board = T.graph(host, screen.forms, `${T.shapeLabel(form)} Its turning point is at ${coordinate(T.turningPoint(form))}.`);
            }
            const status = node('p', '', 'turning-status');
            const steps = node('div', '', 'turning-steps');
            notes.append(status, steps);

            if (screen.named) {
                // Labels stay short so they sit beside their point: the text names the kind on screen 4.
                screen.forms.forEach(each => T.markTurningPoint(board, each, {
                    text: screen.named === 'kind' ? T.kind(each) : null
                }));
            } else {
                const target = T.turningPoint(form);
                // The dot runs the whole curve from left to right, slowing round the turn, then comes back to it.
                const along = T.positions(form);
                const back = along.filter(([x]) => x >= form.h).reverse();
                const dot = board.point(animate && screen.slide ? along[0] : target, { size: 'large' });
                if (screen.slide && animate) {
                    along.forEach(position => later(() => {
                        dot.update({ value: position });
                        status.textContent = heading(form, position[0]);
                    }, Math.abs(position[0] - form.h) < 1 ? 130 : 60));
                    later(() => { status.textContent = 'Back to where it turned.'; }, 400);
                    back.forEach(position => later(() => dot.update({ value: position }), 40));
                    later(() => { status.textContent = ''; }, 200);
                }
                if (screen.guides) {
                    const lines = T.guides(board, target);
                    later(() => { lines.x(); steps.append(node('p', `x = ${number(target[0])}`)); });
                    later(() => { lines.y(); steps.append(node('p', `y = ${number(target[1])}`)); });
                }
                later(() => dot.update({ coordinates: true, labelSide: form.a === 1 ? 'below' : 'above' }));
            }
            screen.text.forEach(text => notes.append(T.strongText(text)));
            section.update(s => { s.seen[s.screen] = true; });
            api.setSectionBack('explanation', state.screen > 0 ? { onClick: () => show(state.screen - 1) } : null);
            if (state.finished) event('explanation', 'complete');
            if (state.screen === learn.length - 1 && state.finished) api.clearSectionAction('explanation');
            else api.setSectionAction('explanation', { label: 'Next', onClick: () => show(state.screen + 1) });
            syncHash();
        }
        learn.forEach((screen, index) => api.registerHashRoute(`learn-${index + 1}`, () => {
            api.goToSection('explanation', { moveFocus: false });
            show(Math.min(index, state.furthestScreen));
        }));
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        window.addEventListener('hashchange', () => queueMicrotask(syncHash));
        const requested = /^#learn-([1-5])$/.exec(initialHash);
        if (requested) show(Math.min(Number(requested[1]) - 1, state.furthestScreen));
        else render();
    }

    // Try it: find the turning point of one U, one step at a time, then read an upside-down U with less help.
    const guided = { a: 1, h: -1, k: -2 };
    const lessHelp = { a: -1, h: 2, k: 4 };
    const titles = ['Find it.', 'Its x-coordinate.', 'Its y-coordinate.', 'Minimum or maximum?', 'Now with less help.', 'Now with less help.'];
    const steps = 6;

    // The guided graph: the turning point marked, with the guides the pupil has earned so far.
    const guidedFigure = shown => host => {
        const frame = node('div', '', 'turning-card-graph');
        host.append(frame);
        const board = T.graph(frame, [guided], T.shapeLabel(guided));
        const lines = T.guides(board, T.turningPoint(guided));
        if (shown.x) lines.x();
        if (shown.y) lines.y();
        T.markTurningPoint(board, guided, { label: shown.y });
    };

    const examples = [
        null,
        { input: 'number', fractions: true, prompt: 'What is its x-coordinate?', answer: '-1',
            rules: [
                { value: '1', feedback: 'Left of 0 is negative: the x-coordinate is −1.' },
                { value: '-2', feedback: "That's the y-coordinate. Read x on the x-axis: −1." }],
            fallback: 'Go straight up or down from the point to the x-axis, and read the number there.',
            feedback: 'Right. It lines up with −1 on the x-axis.' },
        { input: 'number', fractions: true, prompt: 'What is its y-coordinate?', answer: '-2',
            rules: [
                { value: '2', feedback: 'Below 0 is negative: the y-coordinate is −2.' },
                { value: '-1', feedback: "That's the x-coordinate. Read y on the y-axis: −2." }],
            fallback: 'Go straight across from the point to the y-axis, and read the number there.',
            feedback: 'Right. It lines up with −2 on the y-axis.' },
        { input: 'choice', prompt: 'Is it a minimum or a maximum?', options: [
            T.choice('Minimum', "Right. It's the lowest point on the curve.", true),
            T.choice('Maximum', "A maximum is the highest point. This turning point is the lowest point, so it's a minimum.")] },
        { ...T.pointCard(lessHelp) },
        { input: 'choice', prompt: 'Is it a minimum or a maximum?', figure: T.figure(lessHelp), options: [
            T.choice('Maximum', "Right. It's the highest point on the curve.", true),
            T.choice('Minimum', 'A minimum is the lowest point. This curve opens downwards, so its turning point is the highest point: a maximum.')] }
    ];

    async function mountTryIt(root) {
        const api = window.Maths1to9Lesson;
        event('interactive', 'gate');
        const section = await api.useSectionState('interactive', {
            version: 1,
            initial: () => ({ index: 0, screen: 0, furthestScreen: 0, finished: false, cards: {},
                dot: T.positions(guided)[0], found: false })
        });
        const state = section.state;
        section.save();
        let board = null;

        const correct = index => state.cards[`example-${index}`]?.correct === true;
        function syncHash() {
            if (api.getCurrentSection().id === 'interactive') {
                api.setSlideHash(`try-it-${state.screen + 1}`, { replace: true });
            }
        }
        function show(screen) {
            section.update(s => { s.screen = screen; });
            render();
            const title = root.querySelector('h3');
            title.tabIndex = -1;
            title.focus();
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

        // Try it 1: drag the dot along the curve to the turning point.
        function finding(host) {
            const { figure, notes } = layout(host);
            const frame = node('div');
            figure.append(frame);
            notes.append(node('p', 'Drag the dot along the curve to the turning point.'));
            const status = node('p', '', 'turning-status');
            status.setAttribute('role', 'status');
            notes.append(status);
            board = T.graph(frame, [guided], `${T.shapeLabel(guided)} Drag the dot along the curve.`);
            function paint() {
                if (state.found) {
                    status.textContent = '✓ This is the turning point. The curve stops going down and starts going up.';
                    status.className = 'turning-status question-feedback is-visible is-correct';
                } else status.textContent = heading(guided, state.dot[0]).replace('…', '.');
            }
            if (state.found) T.markTurningPoint(board, guided, { label: false, tone: 'correct' });
            else board.point(state.dot, {
                size: 'large', drag: 'positions', positions: T.positions(guided),
                onMove(position) {
                    section.update(s => {
                        s.dot = position;
                        s.found = position[0] === guided.h && position[1] === guided.k;
                    });
                    // Rebuild after the graph has finished handling this drag.
                    if (state.found) setTimeout(render);
                    else paint();
                }
            });
            paint();
        }

        function card(host, index, readOnly) {
            const config = examples[index];
            const figure = config.figure || guidedFigure({ x: correct(1) || index > 1, y: correct(2) || index > 2 });
            api.createQuestion(host, {
                ...config, figure,
                sectionId: 'interactive', questionId: `example-${index}`, scored: false, readOnly,
                onFeedback(result) {
                    report();
                    // Earned guides appear as soon as the answer is right.
                    if (result.correct && index <= 2 && !readOnly) {
                        const graph = host.querySelector('.turning-card-graph');
                        const fresh = node('div');
                        graph.replaceWith(fresh);
                        guidedFigure({ x: true, y: index === 2 })(fresh);
                    }
                },
                onContinue: advance
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
                for (let i = 1; i < steps; i++) {
                    const host = node('div', '', 'turning-retained');
                    root.append(host);
                    card(host, i, true);
                }
                api.clearSectionAction('interactive');
            } else if (state.screen === 0) {
                finding(root);
                api.setSectionAction('interactive', {
                    label: state.index > 0 ? 'Next' : 'Continue',
                    disabled: !state.found,
                    onClick: state.index > 0 ? () => show(1) : advance
                });
            } else {
                const host = node('div');
                root.append(host);
                const readOnly = state.screen < state.index;
                card(host, state.screen, readOnly);
                if (readOnly) api.setSectionAction('interactive', { label: 'Next', onClick: () => show(state.screen + 1) });
            }
            report();
            syncHash();
        }

        for (let i = 0; i <= steps; i++) {
            api.registerHashRoute(`try-it-${i + 1}`, () => {
                if (api.goToSection('interactive', { moveFocus: false })) show(Math.min(i, state.furthestScreen));
            });
        }
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        window.addEventListener('hashchange', () => queueMicrotask(syncHash));
        render();
        const requested = /^#try-it-([1-7])$/.exec(initialHash);
        if (requested && api.goToSection('interactive', { moveFocus: false })) show(Math.min(Number(requested[1]) - 1, state.furthestScreen));
    }

    T.examples = examples;
    window.Maths1to9Interactives ??= {};
    window.Maths1to9Interactives[SLUG] = mountTryIt;
    document.addEventListener('maths1to9:lesson-rendered', e => { if (e.detail?.slug === SLUG) mountLearn(); });
})();
