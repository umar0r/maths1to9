(() => {
    'use strict';
    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;
    const Q = window.Reciprocals;
    const { node, nb, number, coordinate, valueOf } = Q;
    const base = 1, guided = 1;
    const event = (sectionId, name) => document.dispatchEvent(new CustomEvent(`maths1to9:section-${name}`, { detail: { sectionId } }));
    function paragraph(root, text) { const p = node('p', text); root.append(p); return p; }
    function button(root, text, onClick) {
        const b = node('button', text, 'button'); b.type = 'button'; b.addEventListener('click', onClick); root.append(b); return b;
    }
    function equation(root, form) {
        const el = node('div', '', 'reciprocal-equation');
        el.innerHTML = '<i>y</i> = <span class="reciprocal-fraction"><span>1</span><span><i>x</i></span></span>'; root.append(el);
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
        const prompt = paragraph(root, saved.length < 6 ? `Plot ${nb(coordinate(points[saved.length]))}.` : '✓ All six points plotted.');
        prompt.className = 'reciprocal-plot-prompt';
        const host = node('div'); root.append(host);
        const board = Q.graph(host, form);
        let lastPoint = null;
        saved.forEach((p, index) => {
            const labelled = saved.length < 6 && index === saved.length - 1;
            const item = Q.point(board, p, 'correct', labelled);
            if (labelled) lastPoint = item;
        });
        let temporary = [];
        if (saved.length < 6) board.pick({ onPick(position) {
            temporary.forEach(item => item.remove()); temporary = [];
            lastPoint?.update({ coordinates: false }); lastPoint = null;
            const target = points[saved.length], result = Q.plotMark(position, target);
            if (result.correct) {
                lastPoint = Q.point(board, position, 'correct', saved.length < 5); saved.push(position); save();
                table.querySelectorAll('[aria-current]').forEach(el => el.removeAttribute('aria-current'));
                const next = points[saved.length];
                if (next) table.querySelectorAll(`[data-x="${next[0]}"]`).forEach(el => el.setAttribute('aria-current', 'true'));
                prompt.textContent = next ? `Plot ${nb(coordinate(next))}.` : '✓ All six points plotted.';
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
    const pointsOf = form => Q.xs.map(x => [x, valueOf(form, x)]);
    const learn = [
        { title: 'This is a reciprocal graph.', text: [
            'This is the graph of y = 1/x. It means 1 ÷ x.',
            "It's a **reciprocal graph**: you divide 1 by x.", 'It has **two separate curves**.' ] },
        { title: 'Each point comes from dividing.', text: [
            'There are two halves in 1, so 1 ÷ 0.5 = 2.', 'Small x gives big y. Big x gives small y.' ] },
        { title: 'Negative x gives negative y.', text: [
            'A positive divided by a negative is negative.', 'So the second curve is at the bottom left.' ] },
        { title: 'No point where x = 0.', text: [
            '1 ÷ 0 has no answer: no number times 0 makes 1.',
            'So the graph has no point on the y-axis. The two curves never meet.' ] },
        { title: 'A table keeps it tidy.', text: [
            'Divide 1 by each x.', "There's no x = 0 column. You can't divide by 0." ] },
        { title: 'Two separate curves.', text: [
            'Join the right-hand points with one curve and the left-hand points with another.' ] },
        { title: 'Closer and closer, never touching.', text: [
            'As x gets bigger, y gets smaller.',
            '1 ÷ 100 = 0.01. y gets closer to 0, but never reaches it.',
            'So the curves get closer to the axes but never touch them.' ] }
    ];
    function strongText(root, text) {
        const p = node('p');
        text.split('**').forEach((part, index) => {
            p.append(index % 2 ? node('strong', part) : document.createTextNode(Q.prose(part)));
        });
        root.append(p);
    }
    async function mountLearn() {
        const api = window.Maths1to9Lesson;
        const root = node('article', '', 'reciprocal-learn');
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
            const layout = node('div', '', 'reciprocal-layout');
            equation(layout, base);
            const figure = node('div', '', 'reciprocal-figure');
            const notes = node('div', '', 'reciprocal-notes');
            layout.append(figure, notes);
            root.append(layout);
            const host = node('div');
            let table = null;
            if (state.screen === 4) {
                table = Q.table(base, { filled: [] });
                figure.append(table);
            }
            figure.append(host);
            board = Q.graph(host, base);
            const points = pointsOf(base);
            const working = node('div', '', 'reciprocal-steps');
            // The moving point's calculation sits directly under the graph.
            if (state.screen === 6) figure.append(working);
            else if (state.screen === 1 || state.screen === 2) notes.append(working);
            if (state.screen === 0) Q.drawCurves(board, base);
            else if (state.screen === 1) {
                board.plot(x => 1 / x, { domain: [0.25, 4], tone: 'muted' });
                let first = null;
                later(() => { working.replaceChildren(node('p', 'x = 2')); });
                later(() => { working.append(node('p', '1 ÷ 2 = 0.5')); first = Q.point(board, [2, 0.5], 'neutral', true); });
                later(() => { working.replaceChildren(node('p', 'x = 0.5')); });
                later(() => { first?.update({ coordinates: false }); working.append(node('p', '1 ÷ 0.5 = 2')); Q.point(board, [0.5, 2], 'neutral', true); });
            } else if (state.screen === 2) {
                board.plot(x => 1 / x, { domain: [0.25, 4], tone: 'muted' });
                later(() => working.append(node('p', 'x = −2')));
                later(() => { working.append(node('p', '1 ÷ (−2) = −0.5')); Q.point(board, [-2, -0.5], 'neutral', true); });
                later(() => board.plot(x => 1 / x, { domain: [-4, -0.25] }));
            } else if (state.screen === 3) {
                Q.drawCurves(board, base);
                board.segment([0, -4], [0, 4], { dash: true, tone: 'incorrect', label: 'no point here' });
            } else if (state.screen === 4) {
                const filled = [];
                points.forEach(point => later(() => {
                    filled.push(point[0]);
                    const next = Q.table(base, { filled, highlighted: animate ? point[0] : null });
                    table.replaceWith(next); table = next; Q.point(board, point);
                }));
                later(() => { const next = Q.table(base); table.replaceWith(next); table = next; });
            } else if (state.screen === 5) {
                points.forEach(point => Q.point(board, point));
                const wrong = node('p', '', 'reciprocal-wrong'), right = node('p', '', 'reciprocal-right');
                notes.append(wrong, right);
                let bridge;
                later(() => {
                    bridge = board.segment([-0.5, -2], [0.5, 2], { dash: true, tone: 'ink' });
                    wrong.textContent = "✗ Don't join across the middle.";
                }, 500);
                later(() => {
                    bridge?.remove(); wrong.textContent = '';
                    Q.drawCurves(board, base, { tone: 'correct' });
                    right.textContent = '✓ Two separate smooth curves.';
                }, 1800);
            } else {
                Q.drawCurves(board, base);
                const positions = [[0.5, 2], [1, 1], [2, 0.5], [4, 0.25]];
                const dot = board.point(positions[0], {
                    size: 'large', coordinates: true, labelSide: 'right', drag: 'positions', positions
                });
                working.append(node('p', Q.workingText(1, 0.5)));
                positions.slice(1).forEach(position => later(() => {
                    dot.update({ value: position, labelSide: position[0] === 1 ? 'left' : position[0] >= 2 ? 'above' : 'right' });
                    working.replaceChildren(node('p', Q.workingText(1, position[0])));
                }, 700));
            }
            board.setEditable(false);
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
        const requested = /^#learn-([1-7])$/.exec(initialHash);
        if (requested) show(Math.min(Number(requested[1]) - 1, state.furthestScreen));
        else render();
    }
    const examples = [
        { ...Q.valueCard(1, 4), prompt: 'What is y when x = 4? Work out 1 ÷ 4.' },
        { ...Q.tableCard(1, Q.xs, { correctFeedback: 'Right. Positive x gives positive y. Negative x gives negative y.' }),
            prompt: 'Complete the table for y = 1/x.' },
        null, null, Q.biggerCard()
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
            const completed = Number(state.cards['example-1']?.correct === true) + Number(state.cards['example-2']?.correct === true) + Number(state.plotted.length === 6) + Number(state.joined) + Number(state.cards['example-5']?.correct === true);
            api.setSectionProgress('interactive', completed, 5);
        }
        function advance() {
            section.update(s => { s.index++; s.screen = s.index; s.furthestScreen = s.screen; s.finished = s.index === 5; }); render();
        }
        function action() {
            report();
            if (state.screen >= 2 && state.screen < 4) api.setSectionAction('interactive', { label: state.screen < state.index ? 'Next' : 'Continue',
                disabled: state.screen === 2 ? state.plotted.length < 6 : !state.joined, onClick: state.screen < state.index ? () => show(state.screen + 1) : advance });
        }
        function card(host, index, readOnly) {
            const config = examples[index];
            api.createQuestion(host, { ...config,
                options: index === 4 ? state.crossOrder.map(i => config.options[i]) : undefined,
                sectionId: 'interactive', questionId: 'example-' + (index + 1), scored: false, readOnly,
                onFeedback: report, onContinue: advance });
        }
        function render() {
            board?.destroy(); board = null; root.replaceChildren();
            root.append(node('h3', state.screen === 5 ? 'Your completed examples' : ['One value.', 'The table.', 'Plot.', 'Join them.', 'Bigger x.'][state.screen]));
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
