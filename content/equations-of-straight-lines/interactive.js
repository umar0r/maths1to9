(() => {
    'use strict';
    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;
    const E = window.StraightLineEquations;
    const titles = ['Same line, different equation.', 'Write the x term first.', 'Add or subtract on both sides.',
        'Divide every term.', 'Two steps.', 'Is a point on the line?', "You don't have to rearrange."];
    const forms = { 2: { k: 1, d: -3, p: 2, q: 0 }, 3: { k: 2, d: 0, p: 4, q: 6 }, 4: { k: 2, d: 4, p: 6, q: 0 } };
    const learnChoices = {
        1: { prompt: 'What is the gradient?', options: [
            E.choice('−2', `Right. ${E.lineText(E.formOf(-2, 5))}, so the gradient is −2 and the y-intercept is 5.`, true),
            E.choice('2', 'The minus belongs to the x term: −2x. The gradient is −2.'),
            E.choice('5', "5 is the number added, so it's the y-intercept. The gradient multiplies x."),
            E.choice('−5', "There's no −5 here. The x term is −2x, so the gradient is −2.") ] },
        2: { prompt: `Rewrite ${E.lineText({ k: 1, d: 4, p: 3, q: 0 })} with y on its own.`, options: [
            E.choice(E.lineText(E.formOf(3, -4)), 'Right. Subtract 4 from both sides.', true),
            E.choice(E.lineText(E.formOf(3, 4)), `To cancel + 4, subtract 4 from both sides: ${E.lineText(E.formOf(3, -4))}.`),
            E.choice(E.lineText(E.formOf(3, 0)), `You can't just drop the 4. Subtract it from both sides: ${E.lineText(E.formOf(3, -4))}.`) ] },
        3: { prompt: `Which equation means the same as ${E.lineText({ k: 3, d: 0, p: 6, q: -12 })}?`, options: [
            E.choice(E.lineText(E.formOf(2, -4)), 'Right. 6x ÷ 3 = 2x and −12 ÷ 3 = −4.', true),
            E.choice(E.lineText(E.formOf(2, -12)), 'Divide −12 by 3 as well: every term.'),
            E.choice(E.lineText(E.formOf(6, -4)), 'Divide 6x by 3 as well: every term.'),
            E.choice(E.lineText(E.formOf(18, -36)), "3y means 3 × y. To undo it, divide by 3, don't multiply.") ] },
        5: { prompt: `Is ${E.coordinate(2, 8)} on the line ${E.lineText(E.formOf(2, 3))}?`, options: [
            E.choice(E.nb('No. 2 × 2 + 3 = 7, not 8.'), 'Right.', true),
            E.choice('Yes. 8 is close to 7.', `The numbers must match exactly. When ${E.nb('x = 2')}, y is 7, so ${E.coordinate(2, 8)} isn't on the line.`),
            E.choice(E.nb('No. 2 × 8 + 3 = 19, not 2.'), 'Right answer, wrong working. Put the x-coordinate in for x, then compare with the y-coordinate.') ] }
    };
    function node(tag, text = '', className = '') {
        const element = document.createElement(tag);
        element.textContent = text;
        element.className = className;
        return element;
    }
    function sectionEvent(sectionId, name) {
        document.dispatchEvent(new CustomEvent(`maths1to9:section-${name}`, { detail: { sectionId } }));
    }
    function equation(root, form) {
        const element = node('div', '', 'lesson-equation');
        element.innerHTML = E.lineHtml(form);
        root.append(element);
        return element;
    }
    function paragraph(root, text) { root.append(node('p', text)); }
    function button(root, text, onClick) {
        const element = node('button', text, 'button');
        element.type = 'button'; element.addEventListener('click', onClick); root.append(element);
        return element;
    }
    function apply(form, operation) {
        const result = { ...form };
        if (operation.kind === 'divide') for (const key of ['k', 'd', 'p', 'q']) result[key] /= operation.value;
        else { result.d += operation.value; result.q += operation.value; }
        return result;
    }
    function termTiles(host, form) {
        const parts = [E.term(form.k, 'y'), ...(form.d ? [E.tail(form.d).trim()] : []), '=',
            ...(form.p ? [E.term(form.p, 'x')] : []), ...(form.q ? [form.p ? E.tail(form.q).trim() : E.number(form.q)] : form.p ? [] : ['0'])];
        for (const part of parts) {
            const tile = node('span', '', 'equation-tile');
            tile.innerHTML = E.nb(part).replace(/([xy])/g, '<i>$1</i>'); host.append(tile);
        }
    }
    const operationLabel = operation => operation.kind === 'divide' ? `÷ ${operation.value} both sides`
        : `${operation.value < 0 ? '−' : '+'} ${Math.abs(operation.value)} ${operation.value < 0 ? 'from' : 'to'} both sides`;
    function workingHtml(form, operation) {
        const html = text => E.nb(text).replace(/([xy])/g, '<i>$1</i>');
        const highlighted = text => `<span class="equation-highlight">${html(text)}</span>`;
        if (operation.kind === 'divide') {
            const divideSide = (value, letter, added) => html(E.term(value, letter)) + highlighted(` ÷ ${operation.value}`)
                + (added ? html(` ${added < 0 ? '−' : '+'} ${Math.abs(added)}`) + highlighted(` ÷ ${operation.value}`) : '');
            return divideSide(form.k, 'y', form.d) + html(' = ') + divideSide(form.p, 'x', form.q);
        }
        const suffix = highlighted(` ${operation.value < 0 ? '−' : '+'} ${Math.abs(operation.value)}`);
        return html(E.sideText(form.k, 'y', form.d)) + suffix + html(' = ') + html(E.sideText(form.p, 'x', form.q)) + suffix;
    }
    async function mountLearn() {
        const api = window.Maths1to9Lesson;
        const root = node('article'); document.getElementById('lesson-section-explanation').append(root);
        sectionEvent('explanation', 'gate');
        const section = await api.useSectionState('learn', { version: 1,
            initial: () => ({ screen: 0, furthestScreen: 0, finished: false, drawn: [], reordered: false,
                choices: {}, steps: { 2: [], 3: [], 4: [] }, sides: [] }) });
        const state = section.state;
        section.save();
        let graph, timer;
        function completeScreen() {
            const screen = state.screen;
            if (screen === 0) return state.drawn.length === 2;
            if (screen === 1) return state.choices[screen]?.correct === true;
            if (screen === 4) { const form = state.steps[4].reduce(apply, forms[4]); return form.k === 1 && form.d === 0; }
            if (screen === 6) return state.sides.length === 2;
            return state.choices[screen]?.correct === true;
        }
        function syncHash() {
            if (api.getCurrentSection().id === 'explanation') api.setSlideHash(`learn-${state.screen + 1}`, { replace: true });
        }
        function show(screen) {
            section.update(state => { state.screen = screen; state.furthestScreen = Math.max(state.furthestScreen, screen); });
            render();
            const heading = root.querySelector('[data-screen-heading]');
            heading.tabIndex = -1; heading.focus();
        }
        function action() {
            if (state.screen === 6 && completeScreen() && !state.finished) section.update(state => { state.finished = true; });
            if (state.finished) sectionEvent('explanation', 'complete');
            api.setSectionBack('explanation', state.screen ? { onClick: () => show(state.screen - 1) } : null);
            if (state.screen === 6 && completeScreen()) api.clearSectionAction('explanation');
            else api.setSectionAction('explanation', { label: 'Next', disabled: !completeScreen(), onClick: () => show(state.screen + 1) });
        }
        function choices(host, screen, onCorrect = () => {}) {
            const definition = learnChoices[screen];
            const saved = state.choices[screen] || { rejected: [], correct: false, selected: null };
            paragraph(host, definition.prompt);
            const group = node('div', '', 'question-options'); group.setAttribute('role', 'group'); group.setAttribute('aria-label', definition.prompt);
            const feedback = node('p', '', 'question-feedback'); feedback.setAttribute('role', 'status');
            host.append(group, feedback);
            const buttons = definition.options.map((option, index) => button(group, option.label, () => {
                if (saved.correct) return;
                saved.selected = index;
                if (option.correct) saved.correct = true; else saved.rejected.push(index);
                section.update(state => { state.choices[screen] = saved; });
                paint(); if (option.correct) onCorrect(); action();
            }));
            function paint() {
                buttons.forEach((button, index) => {
                    button.disabled = saved.correct || saved.rejected.includes(index);
                    button.className = `button${saved.rejected.includes(index) ? ' is-incorrect' : saved.correct && index === saved.selected ? ' is-correct' : ''}`;
                });
                if (saved.selected !== null) {
                    feedback.textContent = `${saved.correct ? '✓' : '✗'} ${definition.options[saved.selected].feedback}`;
                    feedback.className = `question-feedback is-visible ${saved.correct ? 'is-correct' : 'is-incorrect'}`;
                }
            }
            paint();
        }
        function workbench(screen) {
            const initial = forms[screen], steps = state.steps[screen];
            const current = steps.reduce(apply, initial), finished = current.k === 1 && current.d === 0;
            if (screen === 3) paragraph(root, E.nb('2y means 2 × y.'));
            const top = node('div', '', 'lesson-equation equation-tiles'); termTiles(top, initial); root.append(top);
            const label = node('p', 'What do you do to both sides?'); label.id = 'workbench-label'; root.append(label);
            const group = node('div'); group.setAttribute('role', 'group'); group.setAttribute('aria-labelledby', label.id); root.append(group);
            const feedback = node('p', '', 'question-feedback'); feedback.setAttribute('role', 'status'); root.append(feedback);
            let operations;
            if (screen === 2) operations = [{ kind: 'add', value: 3 }, { kind: 'add', value: -3 }, { kind: 'divide', value: 3 }];
            if (screen === 3) operations = [{ kind: 'divide', value: 2 }, { kind: 'multiply', value: 2 }, { kind: 'add', value: -2 }];
            if (screen === 4) {
                const amount = current.d || (steps[0]?.kind === 'divide' ? 2 : 4);
                operations = [{ kind: 'add', value: -amount }, { kind: 'add', value: amount }, { kind: 'divide', value: 2 }];
            }
            const buttons = operations.map(operation => {
                const correct = operation.kind === 'divide' ? current.k > 1 && screen !== 2 : operation.kind === 'add' && current.d !== 0 && operation.value === -current.d;
                const control = button(group, operation.kind === 'multiply' ? '× 2 both sides' : operationLabel(operation), event => {
                    buttons.forEach(button => { button.className = 'button'; });
                    if (correct) {
                        section.update(state => { state.steps[screen].push(operation); }); render(true);
                        if (event.detail === 0) root.querySelector('button:not(:disabled)')?.focus();
                    } else {
                        control.classList.add('is-incorrect');
                        let text;
                        if (screen === 2) text = operation.kind === 'divide' ? "y isn't multiplied by 3. To cancel − 3, add 3." : 'That gives y − 6. To cancel − 3, add 3.';
                        if (screen === 3) text = operation.kind === 'multiply' ? 'That gives 4y. To undo 2 × y, divide by 2.' : 'That gives 2y − 2, not y. 2y means 2 × y, so divide by 2.';
                        if (screen === 4) text = `That gives ${E.nb(E.sideText(current.k, 'y', current.d + operation.value))}. ${current.d ? `To cancel + ${current.d}, subtract ${current.d}.` : 'Now divide every term by 2.'}`;
                        feedback.textContent = `✗ ${E.mathProse(text)}`; feedback.className = 'question-feedback is-visible is-incorrect';
                    }
                });
                if (steps.some(step => step.kind === operation.kind && step.value === operation.value)) control.classList.add('is-correct');
                control.disabled = finished || screen === 4 && (operation.kind === 'divide' && current.k === 1 || operation.kind === 'add' && current.d === 0);
                return control;
            });
            let form = initial;
            steps.forEach((operation, index) => {
                const block = node('div', '', 'workbench-step');
                const working = node('div', '', 'workbench-equation'); working.innerHTML = workingHtml(form, operation);
                form = apply(form, operation);
                const result = node('div', '', 'workbench-equation workbench-result'); result.innerHTML = E.lineHtml(form) + (form.k === 1 && form.d === 0 ? '&nbsp;✓' : '');
                const caption = node('small', operationLabel(operation), 'workbench-caption');
                block.append(working, result, caption); root.append(block);
                if (index === steps.length - 1 && root.dataset.animate === 'true' && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
                    result.hidden = true; timer = setTimeout(() => { if (result.isConnected) result.hidden = false; }, 350);
                }
            });
            if (finished) {
                if (screen === 2) paragraph(root, 'Doing the same to both sides keeps the equation true.');
                if (screen === 3) { const text = node('p'); text.append('Divide ', node('strong', 'every'), ' term, the number too.'); root.append(text); }
                if (screen === 4) {
                    const text = node('p'); text.append('Now y is on its own: the gradient is ');
                    const gradient = node('span', '3', 'equation-highlight'); gradient.append(node('small', 'gradient'));
                    const crossing = node('span', '−2', 'equation-highlight'); crossing.append(node('small', 'y-intercept'));
                    text.append(gradient, ' and the y-intercept is ', crossing, '.'); root.append(text);
                } else choices(root, screen);
            }
        }
        function render(animate = false) {
            clearTimeout(timer); graph?.destroy(); graph = null; root.replaceChildren(); root.dataset.animate = String(animate);
            const heading = node('h3', titles[state.screen]); heading.dataset.screenHeading = ''; root.append(heading);
            const screen = state.screen;
            if ([2, 3, 4].includes(screen)) workbench(screen);
            if (screen === 0) {
                paragraph(root, 'Draw both lines.');
                const group = node('div'); group.setAttribute('role', 'group'); group.setAttribute('aria-label', 'Equations to draw'); root.append(group);
                const host = node('div'); const content = node('div'); root.append(host, content);
                graph = window.Maths1to9Graph.create(host, { x: [-5, 5], y: [-4, 10], step: { x: 1, y: 1 }, label: 'Coordinate grid. Two equations draw the same line: 2y = 4x + 6 and y = 2x + 3.' });
                state.drawn.forEach((id, index) => graph.line({ m: 2, c: 3 }, { tone: index ? 'correct' : 'neutral' }));
                const buttons = [forms[3], E.formOf(2, 3)].map((form, id) => {
                    const control = button(group, E.lineText(form), () => { section.update(state => { state.drawn.push(id); }); render(); });
                    control.disabled = state.drawn.includes(id); if (control.disabled) control.classList.add('is-selected'); return control;
                });
                if (buttons.every(button => button.disabled)) {
                    paragraph(content, '✓ Same line.'); paragraph(content, 'These two equations give the same line.');
                    paragraph(content, `In ${E.lineText(E.formOf(2, 3))} you can read the gradient, 2, and the y-intercept, 3, straight away.`);
                    paragraph(content, 'This lesson: rewrite any equation like that, and check if a point is on the line.');
                }
            }
            if (screen === 1) {
                const tiles = node('div', '', 'lesson-equation equation-tiles');
                const y = node('span', '', 'equation-tile'); y.innerHTML = '<i>y</i>'; const equal = node('span', '=', 'equation-tile');
                const c = node('span', state.reordered ? '+\u00a05' : '5', 'equation-tile');
                const x = node('span', '', 'equation-tile'); x.innerHTML = '−2<i>x</i>'; x.dataset.signedTerm = '';
                tiles.append(y, equal, ...(state.reordered ? [x, c] : [c, x])); root.append(tiles);
                const control = button(root, 'Put the x term first', () => {
                    const before = x.getBoundingClientRect();
                    section.update(state => { state.reordered = true; });
                    c.textContent = '+\u00a05'; tiles.insertBefore(x, c);
                    const after = x.getBoundingClientRect();
                    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) x.animate([{ transform: `translateX(${before.left - after.left}px)` }, { transform: 'translateX(0)' }], { duration: 400 });
                    control.disabled = true; reveal(); action();
                });
                control.disabled = state.reordered;
                function reveal() { paragraph(root, 'The minus stays with its term.'); choices(root, 1); }
                if (state.reordered) reveal();
            }
            if (screen === 5) {
                equation(root, E.formOf(2, 3));
                const host = node('div'); root.append(host);
                graph = window.Maths1to9Graph.create(host, { x: [-5, 5], y: [-4, 10], step: { x: 1, y: 1 }, label: 'Coordinate grid. The line y = 2x + 3 and the points (2, 7) and (2, 8).' });
                graph.line({ m: 2, c: 3 }); graph.point([2, 7], { coordinates: true, tone: 'correct', labelSide: 'left' });
                paragraph(root, 'A point is on the line when its coordinates fit the equation.');
                paragraph(root, `${E.coordinate(2, 7)}: put ${E.nb('x = 2')} in. ${E.nb('y = 2 × 2 + 3 = 7')}. That's the point's y, so it's on the line.`);
                const addPoint = () => graph.point([2, 8], { coordinates: true, tone: 'incorrect', labelSide: 'right' });
                if (state.choices[5]?.correct) addPoint(); choices(root, 5, addPoint);
            }
            if (screen === 6) {
                equation(root, forms[3]); paragraph(root, `The point ${E.coordinate(2, 7)}.`);
                paragraph(root, `Tap each side to put ${E.nb('x = 2')} and ${E.nb('y = 7')} in.`);
                const group = node('div', '', 'equation-tiles'); group.setAttribute('role', 'group'); group.setAttribute('aria-label', 'Put the coordinates into each side'); root.append(group);
                ['Left side: 2y', 'Right side: 4x + 6'].forEach((label, index) => {
                    const control = button(group, state.sides.includes(index) ? E.nb(index ? '4 × 2 + 6 = 14' : '2 × 7 = 14') : label, () => { section.update(state => { state.sides.push(index); }); render(); });
                    control.disabled = state.sides.includes(index);
                });
                if (state.sides.length === 2) {
                    paragraph(root, `✓ Both sides are 14, so ${E.coordinate(2, 7)} is on the line.`);
                    paragraph(root, 'Put both coordinates in. If the two sides are equal, the point is on the line.');
                }
            }
            action(); syncHash();
        }
        titles.forEach((title, index) => api.registerHashRoute(`learn-${index + 1}`, () => {
            api.goToSection('explanation', { moveFocus: false }); show(Math.min(index, state.furthestScreen));
        }));
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        window.addEventListener('hashchange', () => queueMicrotask(syncHash));
        const requested = /^#learn-([1-7])$/.exec(initialHash);
        if (requested) show(Math.min(Number(requested[1]) - 1, state.furthestScreen)); else render();
    }
    const examples = [
        { input: 'choice', prompt: `Look at ${E.lineText({ k: 1, d: -5, p: 4, q: 0 })}. What do you do to both sides to get y on its own?`, options: [
            E.choice('Add 5', 'Right. y − 5 + 5 = 4x + 5, so y = 4x + 5.', true),
            E.choice('Subtract 5', 'That gives y − 10. To cancel − 5, add 5.'),
            E.choice('Divide by 5', "y isn't multiplied by 5. To cancel − 5, add 5."),
            E.choice('Divide by 4', '4 multiplies x, not y. Leave it; cancel the − 5.') ] },
        { ...E.typed({ k: 4, d: 0, p: 8, q: 12 }), prompt: `Look at ${E.lineText({ k: 4, d: 0, p: 8, q: 12 })}. Divide every term by 4. What are the gradient and the y-intercept?` },
        { input: 'choice', prompt: `Look at ${E.lineText({ k: 2, d: 6, p: 8, q: 0 })}. Which equation means the same?`, options: [
            E.choice(E.lineText(E.formOf(4, -3)), 'Right. Subtract 6: 2y = 8x − 6. Divide every term by 2: y = 4x − 3.', true),
            E.choice(E.lineText(E.formOf(4, 3)), 'To cancel + 6, subtract 6 from both sides: 2y = 8x − 6.'),
            E.choice(E.lineText(E.formOf(4, -6)), 'Divide −6 by 2 as well: every term.'),
            E.choice(E.lineText(E.formOf(8, -3)), 'Divide 8x by 2 as well: every term.') ] },
        { ...E.typed({ k: 2, d: 6, p: 8, q: 0 }, 'Right. The gradient is 4 and the y-intercept is −3.'), prompt: `Look at ${E.lineText({ k: 2, d: 6, p: 8, q: 0 })}. What are its gradient and y-intercept?` },
        { ...E.pointCard({ k: 2, d: 0, p: 4, q: -2 }, [3, 5]), feedback: E.mathProse('Right. 2 × 5 = 10 and 4 × 3 − 2 = 10.') },
        { input: 'choice', prompt: `Is ${E.coordinate(3, 5)} on ${E.lineText({ k: 2, d: 0, p: 4, q: -2 })}? So is the point on the line?`, options: [
            E.choice('Yes', 'Right. Both sides are 10.', true),
            E.choice('No', 'Both sides are 10. Equal sides mean the point is on the line.') ] }
    ];
    E.examples = examples;
    E.learnChoices = learnChoices;
    async function mountTryIt(root) {
        const api = window.Maths1to9Lesson;
        const { shuffle } = window.Maths1to9LessonEngine;
        sectionEvent('interactive', 'gate');
        api.setSectionAction('interactive', { label: 'Check', disabled: true, onClick() {} });
        const section = await api.useSectionState('interactive', {
            version: 1, initial: () => ({ index: 0, screen: 0, furthestScreen: 0, finished: false, cards: {},
                order: examples.map(example => shuffle((example.options || []).map((option, index) => index))) })
        });
        const state = section.state;
        section.save();
        const hashes = ['try-it-1', 'try-it-2', 'try-it-3', 'try-it-3-read', 'try-it-4', 'try-it-4-check', 'try-it-results'];
        function syncHash() { if (api.getCurrentSection().id === 'interactive') api.setSlideHash(hashes[state.screen], { replace: true }); }
        function show(screen) {
            section.update(state => { state.screen = screen; }); render();
            const heading = root.querySelector('[data-screen-heading]');
            heading.tabIndex = -1; heading.focus();
        }
        function report() {
            const card = state.cards[`example-${state.index + 1}`];
            api.setSectionProgress('interactive', state.finished ? examples.length : state.index + Number(card?.correct === true), examples.length);
        }
        function draw(container, index, readOnly) {
            const example = examples[index];
            const cardRoot = node('div'); container.append(cardRoot);
            return api.createQuestion(cardRoot, { ...example, options: state.order[index].map(option => example.options[option]),
                fallback: example.fallback || E.fallback, sectionId: 'interactive', questionId: `example-${index + 1}`, scored: false, readOnly,
                onFeedback: report, onContinue() {
                    section.update(state => { state.index++; state.screen = state.index; state.furthestScreen = state.screen; state.finished = state.index === examples.length; });
                    render();
                } });
        }
        function render() {
            root.replaceChildren();
            const heading = node('h3', state.screen === examples.length ? 'Your completed examples' : `Example ${[1, 2, 3, 3, 4, 4][state.screen]}`);
            heading.dataset.screenHeading = ''; root.append(heading);
            api.setSectionBack('interactive', state.screen > 0 ? { onClick: () => show(state.screen - 1) } : null);
            if (state.finished) sectionEvent('interactive', 'complete');
            if (state.screen === examples.length) { examples.forEach((example, index) => draw(root, index, true)); api.clearSectionAction('interactive'); }
            else { draw(root, state.screen, state.screen < state.index); if (state.screen < state.index) api.setSectionAction('interactive', { label: 'Next', onClick: () => show(state.screen + 1) }); }
            syncHash();
        }
        hashes.forEach((hash, index) => api.registerHashRoute(hash, () => {
            if (api.goToSection('interactive', { moveFocus: false })) show(Math.min(index, state.furthestScreen));
            else document.dispatchEvent(new CustomEvent('maths1to9:section-change'));
        }));
        document.addEventListener('maths1to9:section-change', () => queueMicrotask(syncHash));
        window.addEventListener('hashchange', () => queueMicrotask(syncHash));
        report(); render();
        const requested = hashes.indexOf(initialHash.slice(1));
        if (requested >= 0 && api.goToSection('interactive', { moveFocus: false })) show(Math.min(requested, state.furthestScreen));
    }
    window.Maths1to9Interactives ??= {};
    window.Maths1to9Interactives[SLUG] = mountTryIt;
    document.addEventListener('maths1to9:lesson-rendered', event => { if (event.detail?.slug === SLUG) mountLearn(); });
})();
