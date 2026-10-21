(() => {
    'use strict';
    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;
    const Q = window.Quadratics;
    const { node, nb, number, coordinate, valueOf } = Q;
    const base = { a: 1, c: -1 }, guided = { a: 1, c: -2 };
    const event = (sectionId, name) => document.dispatchEvent(new CustomEvent(`maths1to9:section-${name}`, { detail: { sectionId } }));
    function paragraph(root, text) { const p = node('p', text); root.append(p); return p; }
    function button(root, text, onClick) {
        const b = node('button', text, 'button'); b.type = 'button'; b.addEventListener('click', onClick); root.append(b); return b;
    }
    function equation(root, form) {
        const el = node('div', '', 'quadratic-equation');
        el.innerHTML = nb(Q.quadraticText(form)).replace(/([xy])/g, '<i>$1</i>'); root.append(el);
    }
    function group(root, label) {
        const el = node('div', '', 'question-options'); el.setAttribute('role', 'group'); el.setAttribute('aria-label', label); root.append(el); return el;
    }
    function plotting(root, form, saved, save, done) {
        const points = Q.xs.map(x => [x, valueOf(form, x)]);
        const table = Q.table(form, { highlighted: points[saved.length]?.[0] }); root.append(table);
        requestAnimationFrame(() => {
            if (table.isConnected && table.getBoundingClientRect().width) table.scrollIntoView({ block: 'start' });
        });
        const prompt = paragraph(root, saved.length < 5 ? `Plot ${nb(coordinate(points[saved.length]))}.` : '✓ All five points plotted.');
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
                board.describe(result.feedback);
            }
        } });
        return board;
    }
    function joining(root, form, saved, save, done, closing) {
        root.append(Q.table(form));
        const host = node('div'); root.append(host);
        const board = Q.graph(host, form);
        Q.xs.forEach(x => Q.point(board, [x, valueOf(form, x)]));
        const controls = group(root, 'How do you join the points?');
        const feedback = node('p', '', 'question-feedback'); feedback.setAttribute('role', 'status'); root.append(feedback);
        const ending = paragraph(root, ''); ending.hidden = form.c !== -1 || !saved.joined;
        const correctFeedback = form.c === -1 ? '✓ Right. One smooth curve through every point.' : `✓ ${closing}`;
        function closeText() {
            if (form.c === -1) {
                const [before, after] = closing.split('quadratic');
                ending.replaceChildren(document.createTextNode(Q.prose(before)), node('strong', 'quadratic'), document.createTextNode(after));
            } else ending.textContent = Q.prose(closing);
        }
        if (saved.joined && form.c === -1) closeText();
        let drawing = [];
        const labels = ['A smooth curve', 'Straight lines, dot to dot', 'Flat across the bottom'];
        function draw(index) {
            drawing.forEach(item => item.remove()); drawing = [];
            const tone = index === 0 ? 'correct' : 'incorrect';
            if (index === 1) for (let i = 0; i < 4; i++) drawing.push(board.segment([Q.xs[i], valueOf(form, Q.xs[i])], [Q.xs[i + 1], valueOf(form, Q.xs[i + 1])], { tone }));
            else drawing.push(board.plot(index === 0 ? x => valueOf(form, x) : x => valueOf(form, 1) + (valueOf(form, 2) - valueOf(form, 1)) * (x ** 4 - x ** 2) / 12, { domain: [-2.3, 2.3], tone }));
        }
        const buttons = labels.map((label, index) => button(controls, label, () => {
            draw(index);
            buttons.forEach((b, i) => { b.className = `button${i === index ? index ? ' is-incorrect' : ' is-correct' : ''}`; });
            if (index === 0) {
                saved.joined = true; save(); buttons.forEach(b => { b.disabled = true; });
                feedback.textContent = correctFeedback; feedback.className = 'question-feedback is-visible is-correct';
                if (form.c === -1) { closeText(); ending.hidden = false; }
                done();
            } else {
                feedback.textContent = index === 1 ? "The graph doesn't have corners. Quadratic graphs curve smoothly between the points."
                    : `Your curve misses ${coordinate([0, form.c])}. The curve must go through every point, including the lowest one.`;
                feedback.className = 'question-feedback is-visible is-incorrect';
            }
        }));
        if (saved.joined) {
            draw(0); buttons.forEach(b => { b.disabled = true; }); buttons[0].classList.add('is-correct');
            feedback.textContent = correctFeedback; feedback.className = 'question-feedback is-visible is-correct';
        }
        return board;
    }
    // Learn is for looking: the graph first, things appear in turn, nothing to answer.
    const upsideDown = { a: -1, c: 3 };
    const curve = form => x => valueOf(form, x);
    const pointsOf = form => Q.xs.map(x => [x, valueOf(form, x)]);
    const learn = [
        { title: 'This is a quadratic graph.', form: base, text: [
            'This is the graph of y = x² − 1.',
            "It has x² in it, so it's a **quadratic**.",
            'Quadratic graphs are smooth U-shaped curves.'] },
        { title: 'Each point comes from the equation.', form: base, focus: 2, text: [
            'Take x, square it, then subtract 1. That gives y.'] },
        { title: 'Negative x.', form: base, focus: -2, text: [
            'A negative times a negative is positive.',
            'So (−2, 3) is level with (2, 3). The curve is the same on both sides.'] },
        { title: 'A table keeps it tidy.', form: base, table: true, text: [
            'Work out y for each x in the table.',
            'Each column is one point (x, y).'] },
        { title: 'Join with a smooth curve.', form: base, join: true, text: [
            'Quadratic graphs have no corners.'] },
        { title: 'Upside down.', form: upsideDown, table: true, curve: true, text: [
            'When x² is taken away, the curve is an upside-down U.',
            'Same method: table, points, smooth curve.'] }
    ];
    function steps(form, x) {
        const square = `${Q.bracket(x)}²`;
        const times = `${Q.bracket(x)} × ${Q.bracket(x)}`;
        return [
            `x = ${number(x)}`,
            `${square} = ${times} = ${number(x * x)}`,
            `${number(x * x)} − 1 = ${number(valueOf(form, x))}`,
            `So the point is ${coordinate([x, valueOf(form, x)])}.`
        ];
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
        const root = node('article', '', 'quadratic-learn');
        document.getElementById('lesson-section-explanation').append(root);
        event('explanation', 'gate');
        const section = await api.useSectionState('learn', {
            version: 3,
            // The old seven-screen Learn asked questions. Keep a finished Learn finished; otherwise start again.
            upgrade: saved => ({ screen: 0, furthestScreen: saved.finished ? learn.length - 1 : 0,
                finished: Boolean(saved.finished), seen: [] }),
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
            const layout = node('div', '', 'quadratic-layout');
            equation(layout, screen.form);
            const figure = node('div', '', 'quadratic-figure');
            const notes = node('div', '', 'quadratic-notes');
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
                board.plot(curve(screen.form), { domain: [-2.3, 2.3] });
                points.forEach(p => { if (p[0] !== screen.focus) board.point(p, { tone: 'muted' }); });
                Q.point(board, [screen.focus, valueOf(screen.form, screen.focus)], 'neutral', true);
                const working = node('div', '', 'quadratic-steps');
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
                if (screen.curve) later(() => board.plot(curve(screen.form), { domain: [-2.3, 2.3] }));
            } else if (screen.join) {
                points.forEach(p => Q.point(board, p));
                const wrong = node('p', '', 'quadratic-wrong');
                const right = node('p', '', 'quadratic-right');
                notes.append(wrong, right);
                let segments = [];
                later(() => {
                    segments = points.slice(1).map((p, i) => board.segment(points[i], p, { tone: 'ink', dash: true }));
                    wrong.textContent = '✗ Not straight lines from dot to dot.';
                }, 700);
                later(() => {
                    segments.forEach(item => item.remove());
                    board.plot(curve(screen.form), { domain: [-2.3, 2.3], tone: 'correct' });
                    right.textContent = Q.prose('✓ One smooth curve through every point, a little past the ends.');
                }, 1800);
            } else {
                board.plot(curve(screen.form), { domain: [-2.3, 2.3] });
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
    const examples = [
        { ...Q.valueCard(guided, -2), prompt: 'What is y when x = −2? Square −2, then subtract 2.' },
        { ...Q.tableCard(guided, [-1, 0, 1, 2]), prompt: 'Complete the rest of the table.',
            feedback: 'Right. The table is symmetrical: the same y for x = 1 and x = −1.' }
    ];
    async function mountTryIt(root) {
        const api = window.Maths1to9Lesson;
        event('interactive', 'gate');
        const section = await api.useSectionState('interactive', { version: 2, initial: () => ({ index: 0, screen: 0, furthestScreen: 0,
            finished: false, cards: {}, plotted: [], joined: false }) });
        const state = section.state; section.save(); let board = null;
        function syncHash() { if (api.getCurrentSection().id === 'interactive') api.setSlideHash(`try-it-${state.screen + 1}`, { replace: true }); }
        function show(screen) {
            section.update(s => { s.screen = screen; }); render();
            const heading = root.querySelector('h3'); heading.tabIndex = -1; heading.focus();
        }
        function report() {
            const completed = Number(state.cards['example-1']?.correct === true) + Number(state.cards['example-2']?.correct === true) + Number(state.plotted.length === 5) + Number(state.joined);
            api.setSectionProgress('interactive', completed, 4);
        }
        function advance() {
            section.update(s => { s.index++; s.screen = s.index; s.furthestScreen = s.screen; s.finished = s.index === 4; }); render();
        }
        function action() {
            report();
            if (state.screen >= 2 && state.screen < 4) api.setSectionAction('interactive', { label: state.screen < state.index ? 'Next' : 'Continue',
                disabled: state.screen === 2 ? state.plotted.length < 5 : !state.joined, onClick: state.screen < state.index ? () => show(state.screen + 1) : advance });
        }
        function card(host, index, readOnly) {
            const config = examples[index];
            api.createQuestion(host, { ...config, figure(figure) {
                equation(figure, guided);
                const filled = index === 0 ? state.cards['example-1']?.correct ? [-2] : [] : state.cards['example-2']?.correct ? Q.xs : [-2];
                figure.append(Q.table(guided, { filled }));
            }, sectionId: 'interactive', questionId: `example-${index + 1}`, scored: false, readOnly,
                onFeedback(result) { report(); if (result.correct) root.querySelector('.quadratic-table')?.replaceWith(Q.table(guided, { filled: index ? Q.xs : [-2] })); }, onContinue: advance });
        }
        function render() {
            board?.destroy(); board = null; root.replaceChildren();
            root.append(node('h3', state.screen === 4 ? 'Your completed examples' : ['First column.', 'The rest of the table.', 'Plot.', 'Join them.'][state.screen]));
            equation(root, guided);
            api.setSectionBack('interactive', state.screen ? { onClick: () => show(state.screen - 1) } : null);
            if (state.finished) event('interactive', 'complete');
            if (state.screen < 2) {
                card(root, state.screen, state.screen < state.index);
                if (state.screen < state.index) api.setSectionAction('interactive', { label: 'Next', onClick: () => show(state.screen + 1) });
            } else if (state.screen === 2) board = plotting(root, guided, state.plotted, () => section.save(), action);
            else if (state.screen === 3) board = joining(root, guided, state, () => section.save(), action,
                'The graph goes through all five points and curves smoothly at the bottom.');
            else {
                const first = node('div'), second = node('div'); root.append(first, second); card(first, 0, true); card(second, 1, true);
                board = joining(root, guided, state, () => section.save(), action, 'The graph goes through all five points and curves smoothly at the bottom.');
                api.clearSectionAction('interactive');
            }
            action(); syncHash();
        }
        for (let i = 0; i <= 4; i++) api.registerHashRoute(`try-it-${i + 1}`, () => { if (api.goToSection('interactive', { moveFocus: false })) show(Math.min(i, state.furthestScreen)); });
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        window.addEventListener('hashchange', () => queueMicrotask(syncHash));
        render();
        const requested = /^#try-it-([1-5])$/.exec(initialHash);
        if (requested && api.goToSection('interactive', { moveFocus: false })) show(Math.min(Number(requested[1]) - 1, state.furthestScreen));
    }
    examples.forEach((question, index) => { examples[index] = Q.prepare(question); });
    Q.examples = examples;
    window.Maths1to9Interactives ??= {};
    window.Maths1to9Interactives[SLUG] = mountTryIt;
    document.addEventListener('maths1to9:lesson-rendered', e => { if (e.detail?.slug === SLUG) mountLearn(); });
})();
