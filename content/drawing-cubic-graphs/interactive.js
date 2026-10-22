(() => {
    'use strict';
    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;
    const Q = window.Cubics;
    const { node, nb, number, coordinate, valueOf } = Q;
    const base = { a: 1, c: 0 }, guided = { a: 1, c: 1 };
    const event = (sectionId, name) => document.dispatchEvent(new CustomEvent(`maths1to9:section-${name}`, { detail: { sectionId } }));
    function paragraph(root, text) { const p = node('p', text); root.append(p); return p; }
    function button(root, text, onClick) {
        const b = node('button', text, 'button'); b.type = 'button'; b.addEventListener('click', onClick); root.append(b); return b;
    }
    function equation(root, form) {
        const el = node('div', '', 'cubic-equation');
        el.innerHTML = nb(Q.cubicText(form)).replace(/([xy])/g, '<i>$1</i>'); root.append(el);
    }
    function group(root, label) {
        const el = node('div', '', 'question-options'); el.setAttribute('role', 'group'); el.setAttribute('aria-label', label); root.append(el); return el;
    }
    function plotting(root, form, saved, save, done) {
        const points = Q.xs.map(x => [x, valueOf(form, x)]);
        const table = Q.table(form, { highlighted: points[saved.length]?.[0] }); root.append(table);
        document.fonts.ready.then(() => requestAnimationFrame(() => {
            if (table.isConnected && table.getBoundingClientRect().width) {
                table.scrollIntoView({ block: 'start', behavior: 'instant' });
            }
        }));
        const prompt = paragraph(root, saved.length < 5 ? `Plot ${nb(coordinate(points[saved.length]))}.` : '✓ All five points plotted.');
        prompt.className = 'cubic-plot-prompt';
        const host = node('div'); root.append(host);
        const board = Q.graph(host, form);
        let lastPoint = null;
        saved.forEach((p, index) => {
            const labelled = saved.length < 5 && index === saved.length - 1;
            const item = Q.point(board, p, 'correct', labelled);
            if (labelled) lastPoint = item;
        });
        let temporary = [];
        if (saved.length < 5) board.pick({ onPick(position) {
            temporary.forEach(item => item.remove()); temporary = [];
            lastPoint?.update({ coordinates: false }); lastPoint = null;
            const target = points[saved.length], result = Q.plotMark(position, target);
            if (result.correct) {
                lastPoint = Q.point(board, position, 'correct', saved.length < 4); saved.push(position); save();
                table.querySelectorAll('[aria-current]').forEach(el => el.removeAttribute('aria-current'));
                const next = points[saved.length];
                if (next) table.querySelectorAll(`[data-x="${next[0]}"]`).forEach(el => el.setAttribute('aria-current', 'true'));
                prompt.textContent = next ? `Plot ${nb(coordinate(next))}.` : '✓ All five points plotted.';
                board.describe('');
                if (!next) { board.setEditable(false); done(); }
            } else {
                temporary = [Q.point(board, position, 'incorrect', true), ...Q.guides(board, target)];
                board.describe(Q.prose(result.feedback));
            }
        } });
        return board;
    }
    function joining(root, form, saved, save, done) {
        root.append(Q.table(form));
        const host = node('div'); root.append(host);
        const board = Q.graph(host, form);
        Q.xs.forEach(x => Q.point(board, [x, valueOf(form, x)]));
        const controls = group(root, 'How do you join the points?');
        const feedback = node('p', '', 'question-feedback');
        feedback.setAttribute('role', 'status'); root.append(feedback);
        let drawing = [];
        function draw(index) {
            drawing.forEach(item => item.remove());
            drawing = Q.joinDrawing(board, form, index);
        }
        const buttons = saved.joinOrder.map(index => button(controls, Q.joinLabels[index], () => {
            draw(index);
            buttons.forEach((b, position) => {
                b.className = `button${saved.joinOrder[position] === index ? index ? ' is-selected is-incorrect' : ' is-selected is-correct' : ''}`;
            });
            feedback.textContent = Q.prose(Q.joinFeedback[index]);
            feedback.className = `question-feedback is-visible ${index ? 'is-incorrect' : 'is-correct'}`;
            if (index === 0) {
                saved.joined = true; save();
                buttons.forEach(b => { b.disabled = true; }); done();
            }
        }));
        if (saved.joined) {
            draw(0); buttons.forEach((b, position) => {
                b.disabled = true;
                b.classList.toggle('is-correct', saved.joinOrder[position] === 0);
                b.classList.toggle('is-selected', saved.joinOrder[position] === 0);
            });
            feedback.textContent = Q.prose(Q.joinFeedback[0]);
            feedback.className = 'question-feedback is-visible is-correct';
        }
        return board;
    }
    const curve = form => x => valueOf(form, x);
    const pointsOf = form => Q.xs.map(x => [x, valueOf(form, x)]);
    const learn = [
        { title: 'This is a cubic graph.', form: base, text: [
            'This is the graph of y = x³.',
            'x³ means x × x × x. We say x **cubed**.',
            'A cubic graph is a smooth curve with a stretched **S shape**.'] },
        { title: 'Each point comes from the equation.', form: base, focus: 2, text: [
            'To cube a number, multiply it by itself, then by itself again.'] },
        { title: 'A negative cubed stays negative.', form: base, focus: -2, text: [
            'The first two negatives make 4. Times −2 makes −8.',
            "So (−2, −8) is at the bottom left. That's why the curve starts low."] },
        { title: 'A table keeps it tidy.', form: base, table: true, text: [
            'Cube each x in the table.', 'Each column is one point (x, y).'] },
        { title: 'Join with a smooth curve.', form: base, join: true, text: [
            'It rises from bottom left to top right.', 'It flattens out as it passes (0, 0).'] },
        { title: 'Add a number after cubing.', form: guided, shifted: true, text: [
            'y = x³ + 1: cube x **first**, then add 1.',
            'Every point moves up 1. It crosses the y-axis at (0, 1), not (0, 0).'] }
    ];
    function steps(form, x) {
        if (x < 0) return ['(−2)³ = (−2) × (−2) × (−2)', '= 4 × (−2) = −8'];
        return ['x = 2', '2³ = 2 × 2 × 2 = 8', 'So the point is (2, 8).'];
    }
    function strongText(root, text) {
        const p = node('p');
        text.split('**').forEach((part, index) => {
            p.append(index % 2 ? node('strong', part) : document.createTextNode(Q.prose(part)));
        });
        root.append(p);
    }
    async function mountLearn() {
        const api = window.Maths1to9Lesson;
        const root = node('article', '', 'cubic-learn');
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
            const heading = root.querySelector('h3');
            heading.tabIndex = -1;
            heading.focus();
        }
        function render() {
            timers.forEach(clearTimeout);
            timers = [];
            board?.destroy();
            root.replaceChildren();
            const screen = learn[state.screen];
            const animate = !state.seen[state.screen] && !matchMedia('(prefers-reduced-motion: reduce)').matches;
            let delay = 0;
            // Run each step in turn the first time; on a revisit, or with reduced motion, show the finished screen.
            const later = (run, wait = 500) => {
                if (!animate) return run();
                delay += wait;
                timers.push(setTimeout(run, delay));
            };
            root.append(node('h3', screen.title));
            // On wide screens the figure (table and graph) sits beside the equation and notes; on phones they stack.
            const layout = node('div', '', 'cubic-layout');
            equation(layout, screen.form);
            const figure = node('div', '', 'cubic-figure');
            const notes = node('div', '', 'cubic-notes');
            layout.append(figure, notes);
            root.append(layout);
            const filled = [];
            let table = null;
            if (screen.table) {
                table = Q.table(screen.form, { filled: animate ? [] : Q.xs });
                figure.append(table);
            }
            const host = node('div');
            figure.append(host);
            board = Q.graph(host, screen.form);
            const points = pointsOf(screen.form);
            if (screen.focus !== undefined) {
                board.plot(curve(screen.form), { domain: Q.plotDomain(screen.form) });
                points.forEach(p => { if (p[0] !== screen.focus) Q.point(board, p, 'muted'); });
                Q.point(board, [screen.focus, valueOf(screen.form, screen.focus)], 'neutral', true);
                const working = node('div', '', 'cubic-steps');
                notes.append(working);
                steps(screen.form, screen.focus).forEach(line => later(() => working.append(node('p', line))));
            } else if (screen.table) {
                points.forEach(p => later(() => {
                    filled.push(p[0]);
                    const next = Q.table(screen.form, { filled: animate ? filled : Q.xs, highlighted: animate ? p[0] : null });
                    table.replaceWith(next);
                    table = next;
                    Q.point(board, p);
                }));
                if (animate) later(() => {
                    const done = Q.table(screen.form);
                    table.replaceWith(done);
                    table = done;
                });
                if (screen.curve) later(() => board.plot(curve(screen.form), { domain: Q.plotDomain(screen.form) }));
            } else if (screen.join) {
                points.forEach(p => Q.point(board, p));
                const wrong = node('p', '', 'cubic-wrong');
                const right = node('p', '', 'cubic-right');
                notes.append(wrong, right);
                let segments = [];
                later(() => {
                    segments = points.slice(1).map((p, i) => board.segment(points[i], p, { tone: 'ink', dash: true }));
                    wrong.textContent = '✗ Not straight lines from dot to dot.';
                }, 700);
                later(() => {
                    segments.forEach(item => item.remove());
                    board.plot(curve(screen.form), { domain: Q.plotDomain(screen.form), tone: 'correct' });
                    wrong.textContent = '';
                    right.textContent = '✓ One smooth curve through every point.';
                }, 1800);
            } else if (screen.shifted) {
                board.plot(curve(base), { domain: Q.plotDomain(base), tone: 'muted' });
                const working = node('div', '', 'cubic-steps'); notes.append(working);
                ['x = 2', '2³ + 1 = 8 + 1 = 9'].forEach(line => later(() => working.append(node('p', line))));
                points.forEach(p => later(() => Q.point(board, p)));
                later(() => board.plot(curve(screen.form), { domain: Q.plotDomain(screen.form) }));
            } else {
                board.plot(curve(screen.form), { domain: Q.plotDomain(screen.form) });
                points.forEach(p => Q.point(board, p));
            }
            screen.text.forEach(text => strongText(notes, text));
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
        const requested = /^#learn-([1-6])$/.exec(initialHash);
        if (requested) show(Math.min(Number(requested[1]) - 1, state.furthestScreen));
        else render();
    }
    const crossing = { input: 'choice', prompt: 'Where does the graph of y = x³ + 1 cross the y-axis?', options: [
        Q.choice('(0, 1)', 'Right. When x = 0, y = 0³ + 1 = 1.', true),
        Q.choice('(0, 0)', "A cubic graph doesn't have to go through (0, 0). When x = 0, y = 0 + 1 = 1."),
        Q.choice('(1, 0)', 'x comes first. On the y-axis x = 0, so the point is (0, 1).'),
        Q.choice('(−1, 0)', "That's where it crosses the x-axis. On the y-axis, x = 0: the point is (0, 1).") ] };
    const examples = [
        { ...Q.valueCard(guided, -2), prompt: 'What is y when x = −2? Cube −2, then add 1.' },
        { ...Q.tableCard(guided, [-1, 0, 1, 2], { correctFeedback: 'Right. When x = 0, y = 1: the curve crosses the y-axis at (0, 1).' }),
            prompt: 'Complete the rest of the table.' },
        null, null, crossing
    ];
    async function mountTryIt(root) {
        const api = window.Maths1to9Lesson;
        event('interactive', 'gate');
        const section = await api.useSectionState('interactive', { version: 1, initial: () => ({ index: 0, screen: 0, furthestScreen: 0,
            finished: false, cards: {}, plotted: [], joined: false,
            joinOrder: window.Maths1to9LessonEngine.shuffle([0, 1, 2, 3]),
            crossOrder: window.Maths1to9LessonEngine.shuffle([0, 1, 2, 3]) }) });
        const state = section.state; section.save(); let board = null;
        function syncHash() { if (api.getCurrentSection().id === 'interactive') api.setSlideHash(`try-it-${state.screen + 1}`, { replace: true }); }
        function show(screen) {
            section.update(s => { s.screen = screen; }); render();
            const heading = root.querySelector('h3'); heading.tabIndex = -1; heading.focus();
        }
        function report() {
            const completed = Number(state.cards['example-1']?.correct === true) + Number(state.cards['example-2']?.correct === true) + Number(state.plotted.length === 5) + Number(state.joined) + Number(state.cards['example-5']?.correct === true);
            api.setSectionProgress('interactive', completed, 5);
        }
        function advance() {
            section.update(s => { s.index++; s.screen = s.index; s.furthestScreen = s.screen; s.finished = s.index === 5; }); render();
        }
        function action() {
            report();
            if (state.screen >= 2 && state.screen < 4) api.setSectionAction('interactive', { label: state.screen < state.index ? 'Next' : 'Continue',
                disabled: state.screen === 2 ? state.plotted.length < 5 : !state.joined, onClick: state.screen < state.index ? () => show(state.screen + 1) : advance });
        }
        function card(host, index, readOnly) {
            const config = examples[index];
            // The first card shows the table above it; the second card's table is its own answer area.
            api.createQuestion(host, { ...config, options: index === 4 ? state.crossOrder.map(i => config.options[i]) : undefined, figure(figure) {
                equation(figure, guided);
                if (index === 0) figure.append(Q.table(guided, { filled: state.cards['example-1']?.correct ? [-2] : [] }));
            }, sectionId: 'interactive', questionId: `example-${index + 1}`, scored: false, readOnly,
                onFeedback(result) {
                    report();
                    if (result.correct && index === 0) host.querySelector('.cubic-table')?.replaceWith(Q.table(guided, { filled: [-2] }));
                }, onContinue: advance });
        }
        function render() {
            board?.destroy(); board = null; root.replaceChildren();
            root.append(node('h3', state.screen === 5 ? 'Your completed examples' : ['First column.', 'The rest of the table.', 'Plot.', 'Join them.', 'Where does it cross?'][state.screen]));
            equation(root, guided);
            api.setSectionBack('interactive', state.screen ? { onClick: () => show(state.screen - 1) } : null);
            if (state.finished) event('interactive', 'complete');
            if (state.screen < 2 || state.screen === 4) {
                card(root, state.screen, state.screen < state.index);
                if (state.screen < state.index) api.setSectionAction('interactive', { label: 'Next', onClick: () => show(state.screen + 1) });
            } else if (state.screen === 2) board = plotting(root, guided, state.plotted, () => section.save(), action);
            else if (state.screen === 3) board = joining(root, guided, state, () => section.save(), action);
            else {
                const first = node('div'), second = node('div'), third = node('div');
                root.append(first, second, third); card(first, 0, true); card(second, 1, true); card(third, 4, true);
                board = joining(root, guided, state, () => section.save(), action);
                api.clearSectionAction('interactive');
            }
            action(); syncHash();
        }
        for (let i = 0; i <= 5; i++) api.registerHashRoute(`try-it-${i + 1}`, () => { if (api.goToSection('interactive', { moveFocus: false })) show(Math.min(i, state.furthestScreen)); });
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        window.addEventListener('hashchange', () => queueMicrotask(syncHash));
        render();
        const requested = /^#try-it-([1-6])$/.exec(initialHash);
        if (requested && api.goToSection('interactive', { moveFocus: false })) show(Math.min(Number(requested[1]) - 1, state.furthestScreen));
    }
    examples.forEach((question, index) => { if (question) examples[index] = Q.prepare(question); });
    Q.examples = examples;
    window.Maths1to9Interactives ??= {};
    window.Maths1to9Interactives[SLUG] = mountTryIt;
    document.addEventListener('maths1to9:lesson-rendered', e => { if (e.detail?.slug === SLUG) mountLearn(); });
})();
