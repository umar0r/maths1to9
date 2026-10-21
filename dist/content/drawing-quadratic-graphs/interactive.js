(() => {
    'use strict';
    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;
    const Q = window.Quadratics;
    const { node, nb, number, coordinate, valueOf } = Q;
    const base = { a: 1, c: -1 }, guided = { a: 1, c: -2 };
    const titles = ['From x to y.', 'Negative numbers.', 'A table of values.', 'Fill in the last two.',
        'Plot the points.', 'Join the points.', 'Upside down.'];
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
    function choices(root, definition, saved, save, done) {
        paragraph(root, definition.prompt);
        const options = group(root, definition.prompt), feedback = node('p', '', 'question-feedback');
        feedback.setAttribute('role', 'status'); root.append(feedback);
        const buttons = definition.options.map((option, index) => button(options, nb(option.label), () => {
            if (saved.correct || saved.rejected.includes(index)) return;
            saved.selected = index;
            if (option.correct) saved.correct = true; else saved.rejected.push(index);
            save(); paint(); done(option.correct);
        }));
        function paint() {
            buttons.forEach((b, index) => {
                b.disabled = saved.correct || saved.rejected.includes(index);
                b.className = `button${saved.rejected.includes(index) ? ' is-incorrect' : saved.correct && saved.selected === index ? ' is-correct' : ''}`;
            });
            if (saved.selected !== null) {
                feedback.textContent = Q.prose(`${saved.correct ? '✓' : '✗'} ${definition.options[saved.selected].feedback}`);
                feedback.className = `question-feedback is-visible ${saved.correct ? 'is-correct' : 'is-incorrect'}`;
            }
        }
        paint();
    }
    const negative = { prompt: 'What is x² when x = −2?', options: [
        Q.choice('4', 'Right. (−2) × (−2) = 4.', true),
        Q.choice('−4', 'A negative times a negative is positive: (−2) × (−2) = 4.'),
        Q.choice('−2', 'Squaring means multiplying −2 by itself: (−2) × (−2) = 4.'),
        Q.choice('0', "(−2) × (−2) = 4. Squaring doesn't cancel the number out.") ] };
    const lastTwo = [
        { prompt: 'What is y when x = 1?', options: [
            Q.choice('0', 'Right. 1² − 1 = 1 − 1 = 0.', true),
            Q.choice('1', 'Subtract 1 as well: 1² − 1 = 0.'), Q.choice('2', "Subtract 1, don't add it: 1 − 1 = 0.") ] },
        { prompt: 'What is y when x = 2?', options: [
            Q.choice('3', 'Right. 2² − 1 = 4 − 1 = 3.', true),
            Q.choice('1', 'Square 2 first: 2² = 2 × 2 = 4. Then 4 − 1 = 3.'), Q.choice('5', "Subtract 1, don't add it: 4 − 1 = 3.") ] }
    ];
    function freshChoice() { return { selected: null, rejected: [], correct: false }; }
    function plotting(root, form, saved, save, done) {
        const points = Q.xs.map(x => [x, valueOf(form, x)]);
        const table = Q.table(form, { highlighted: points[saved.length]?.[0] }); root.append(table);
        requestAnimationFrame(() => {
            if (table.isConnected && table.getBoundingClientRect().width) table.scrollIntoView({ block: 'start' });
        });
        const prompt = paragraph(root, saved.length < 5 ? `Plot ${nb(coordinate(points[saved.length]))}.` : '✓ All five points plotted.');
        const host = node('div'); root.append(host);
        const board = Q.graph(host, form);
        saved.forEach(p => Q.point(board, p, 'correct'));
        let temporary = [];
        if (saved.length < 5) board.pick({ onPick(position) {
            temporary.forEach(item => item.remove()); temporary = [];
            const target = points[saved.length], result = Q.plotMark(position, target);
            if (result.correct) {
                Q.point(board, position, 'correct'); saved.push(position); save();
                table.querySelectorAll('[aria-current]').forEach(el => el.removeAttribute('aria-current'));
                const next = points[saved.length];
                if (next) table.querySelectorAll(`[data-x="${next[0]}"]`).forEach(el => el.setAttribute('aria-current', 'true'));
                prompt.textContent = next ? `Plot ${nb(coordinate(next))}.` : '✓ All five points plotted.';
                board.describe('');
                if (!next) { board.setEditable(false); done(); }
            } else {
                temporary = [Q.point(board, position, 'incorrect'), ...Q.guides(board, target)];
                board.describe(result.feedback);
            }
        } });
        return board;
    }
    function joining(root, form, saved, save, done, closing) {
        const host = node('div'); root.append(host);
        const board = Q.graph(host, form);
        Q.xs.forEach(x => Q.point(board, [x, valueOf(form, x)]));
        const controls = group(root, 'How do you join the points?');
        const feedback = node('p', '', 'question-feedback'); feedback.setAttribute('role', 'status'); root.append(feedback);
        const ending = paragraph(root, ''); ending.hidden = !saved.joined;
        function closeText() {
            if (form.c === -1) {
                const [before, after] = closing.split('quadratic');
                ending.replaceChildren(document.createTextNode(Q.prose(before)), node('strong', 'quadratic'), document.createTextNode(after));
            } else ending.textContent = Q.prose(closing);
        }
        if (saved.joined) closeText();
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
                feedback.textContent = '✓'; feedback.className = 'question-feedback is-visible is-correct';
                closeText(); ending.hidden = false; done();
            } else {
                feedback.textContent = index === 1 ? "The graph doesn't have corners. Quadratic graphs curve smoothly between the points."
                    : `Your curve misses ${coordinate([0, form.c])}. The curve must go through every point, including the lowest one.`;
                feedback.className = 'question-feedback is-visible is-incorrect';
            }
        }));
        if (saved.joined) {
            draw(0); buttons.forEach(b => { b.disabled = true; }); buttons[0].classList.add('is-correct');
            feedback.textContent = '✓'; feedback.className = 'question-feedback is-visible is-correct';
        }
        return board;
    }
    async function mountLearn() {
        const api = window.Maths1to9Lesson;
        const root = node('article', '', 'quadratic-learn'); document.getElementById('lesson-section-explanation').append(root);
        event('explanation', 'gate');
        const section = await api.useSectionState('learn', { version: 1, initial: () => ({ screen: 0, furthestScreen: 0, finished: false,
            positive: null, negative: null, negativeChoice: freshChoice(), filled: [], highlighted: null,
            lastTwo: [freshChoice(), freshChoice()], plotted: [], joined: false, drawn: false }) });
        const state = section.state; section.save();
        let board = null, timers = [];
        function complete() {
            return [state.positive !== null, state.negativeChoice.correct, state.filled.length === 5,
                state.lastTwo.every(c => c.correct), state.plotted.length === 5, state.joined, state.drawn][state.screen];
        }
        function syncHash() { if (api.getCurrentSection().id === 'explanation') api.setSlideHash(`learn-${state.screen + 1}`, { replace: true }); }
        function action() {
            if (state.screen === 6 && complete() && !state.finished) section.update(s => { s.finished = true; });
            if (state.finished) event('explanation', 'complete');
            api.setSectionBack('explanation', state.screen ? { onClick: () => show(state.screen - 1) } : null);
            if (state.screen === 6 && complete()) api.clearSectionAction('explanation');
            else api.setSectionAction('explanation', { label: 'Next', disabled: !complete(), onClick: () => show(state.screen + 1) });
        }
        function show(screen) {
            section.update(s => { s.screen = screen; s.furthestScreen = Math.max(s.furthestScreen, screen); }); render();
            const h = root.querySelector('h3'); h.tabIndex = -1; h.focus();
        }
        function render() {
            board?.destroy(); board = null; timers.forEach(clearTimeout); timers = []; root.replaceChildren();
            const screen = state.screen; root.append(node('h3', titles[screen]));
            equation(root, screen < 2 ? { a: 1, c: 0 } : screen === 6 ? { a: -1, c: 3 } : base);
            if (screen < 2) {
                if (!screen) paragraph(root, 'Square x to find y. Squaring means multiplying a number by itself.');
                const controls = group(root, 'Pick a value of x');
                const working = paragraph(root, '', 'quadratic-working'), result = paragraph(root, '');
                function paint() {
                    const x = screen ? state.negative : state.positive;
                    if (x === null) return;
                    working.textContent = nb(`${Q.bracket(x)} × ${Q.bracket(x)} = ${x * x}`);
                    result.textContent = `So ${nb(coordinate([x, x * x]))} is on the graph${screen ? ' too' : ''}.`;
                }
                [1, 2, 3].map(x => screen ? -x : x).forEach(x => {
                    const control = button(controls, nb(`x = ${number(x)}`), () => {
                        section.update(s => { s[screen ? 'negative' : 'positive'] = x; }); paint(); action();
                    });
                    control.disabled = state.screen < state.furthestScreen || state.finished;
                }); paint();
                if (screen) {
                    paragraph(root, 'A negative times a negative is positive.');
                    choices(root, negative, state.negativeChoice, () => section.save(), action);
                }
            }
            if (screen === 2) {
                const host = node('div'); root.append(host);
                const working = paragraph(root, state.highlighted === null ? '' : nb(Q.workingText(base, state.highlighted)));
                paragraph(root, 'Square x first, then subtract 1.'); paragraph(root, 'Tap each empty box to work it out.');
                const closing = paragraph(root, state.filled.length === 5 ? 'Each column gives one point.' : '');
                function paint() {
                    host.replaceChildren(Q.table(base, { filled: state.filled, highlighted: state.highlighted, onPick(x) {
                        section.update(s => { s.highlighted = x; s.filled.push(x); });
                        working.textContent = nb(Q.workingText(base, x));
                        closing.textContent = state.filled.length === 5 ? 'Each column gives one point.' : '';
                        paint(); action();
                    } }));
                }
                paint();
            }
            if (screen === 3) {
                root.append(Q.table(base, { filled: [-2, -1, 0, ...(state.lastTwo[0].correct ? [1] : []), ...(state.lastTwo[1].correct ? [2] : [])] }));
                const index = state.lastTwo[0].correct ? 1 : 0;
                if (state.lastTwo[0].correct) paragraph(root, 'Right. 1² − 1 = 1 − 1 = 0.');
                choices(root, lastTwo[index], state.lastTwo[index], () => section.save(), correct => { if (correct) render(); else action(); });
            }
            if (screen === 4) {
                paragraph(root, 'Write each column as (x, y). Start at (0, 0): go across for x, then up or down for y.');
                board = plotting(root, base, state.plotted, () => section.save(), action);
            }
            if (screen === 5) board = joining(root, base, state, () => section.save(), action,
                "y = x² − 1 has x² in it, so it's a quadratic. Its graph is a smooth U-shaped curve.");
            if (screen === 6) {
                const form = { a: -1, c: 3 }; root.append(Q.table(form));
                const host = node('div'); root.append(host); board = Q.graph(host, form);
                const draw = () => {
                    Q.xs.forEach(x => Q.point(board, [x, valueOf(form, x)]));
                    board.plot(x => valueOf(form, x), { domain: [-2.3, 2.3] });
                };
                if (state.drawn) draw();
                const control = button(root, 'Draw it', () => {
                    section.update(s => { s.drawn = true; }); control.disabled = true;
                    const active = board;
                    if (matchMedia('(prefers-reduced-motion: reduce)').matches) draw();
                    else {
                        Q.xs.forEach((x, i) => timers.push(setTimeout(() => { if (board === active) Q.point(board, [x, valueOf(form, x)]); }, i * 180)));
                        timers.push(setTimeout(() => { if (board === active) board.plot(x => valueOf(form, x), { domain: [-2.3, 2.3] }); }, 900));
                    }
                    action();
                }); control.disabled = state.drawn;
                paragraph(root, 'When x² is taken away, the curve is an upside-down U.');
                paragraph(root, 'Same method: table, plot, smooth curve.');
            }
            action(); syncHash();
        }
        titles.forEach((title, i) => api.registerHashRoute(`learn-${i + 1}`, () => { api.goToSection('explanation', { moveFocus: false }); show(Math.min(i, state.furthestScreen)); }));
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        window.addEventListener('hashchange', () => queueMicrotask(syncHash));
        const requested = /^#learn-([1-7])$/.exec(initialHash);
        if (requested) show(Math.min(Number(requested[1]) - 1, state.furthestScreen)); else render();
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
    Q.examples = examples; Q.learnChoices = { negative, lastTwo };
    window.Maths1to9Interactives ??= {};
    window.Maths1to9Interactives[SLUG] = mountTryIt;
    document.addEventListener('maths1to9:lesson-rendered', e => { if (e.detail?.slug === SLUG) mountLearn(); });
})();
