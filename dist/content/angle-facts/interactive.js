(() => {
    'use strict';

    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;
    const S = window.AngleFacts;
    const screens = S.learnScreens;
    const examples = S.examples();
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    function sectionEvent(sectionId, name) {
        document.dispatchEvent(new CustomEvent(`maths1to9:section-${name}`, {
            detail: { sectionId }
        }));
    }

    function node(tag, text = '', className = '') {
        const element = document.createElement(tag);
        element.textContent = text;
        if (className) element.className = className;
        return element;
    }

    function heading(text) {
        const element = node('h3', text);
        element.dataset.screenHeading = '';
        return element;
    }

    function workingLines(host) {
        const holder = node('div', '', 'af-lines');
        holder.setAttribute('aria-live', 'polite');
        host.append(holder);
        return values => {
            holder.replaceChildren(...values.filter(Boolean).map(text => node('p', text, 'af-working')));
        };
    }

    function polar(origin, direction, length) {
        const radians = direction * Math.PI / 180;
        return [origin[0] + length * Math.cos(radians), origin[1] + length * Math.sin(radians)];
    }

    function degrees(value) {
        return `${S.number(value)}°`;
    }

    function screenCard(key) {
        return screens[0].cards.find(card => card.key === key) ?? screens[0].cards[0];
    }

    // 600 ms of movement, or straight to the end for reduced motion.
    function move(duration, step) {
        if (reduceMotion) {
            step(1);
            return Promise.resolve();
        }
        return new Promise(resolve => {
            const started = performance.now();
            function frame(now) {
                const done = Math.min(1, (now - started) / duration);
                step(done);
                if (done < 1) requestAnimationFrame(frame);
                else resolve();
            }
            requestAnimationFrame(frame);
        });
    }

    // An orange copy of an angle at the top crossing sliding down the
    // crossing line, turning as it goes, to land on the bottom crossing.
    function slideCopy(built, fromDirection, turn, span) {
        const top = built.top.position();
        const bottom = built.bottom.position();
        const radius = 1.1;
        const centre = built.diagram.point(top, { mark: 'none' });
        const first = built.diagram.point(polar(top, fromDirection, radius), { mark: 'none' });
        const second = built.diagram.point(polar(top, fromDirection + span, radius), { mark: 'none' });
        built.diagram.angle(first, centre, second, { turn: 'anticlockwise', tone: 'highlight' });
        return move(600, done => {
            const here = [top[0] + (bottom[0] - top[0]) * done, top[1] + (bottom[1] - top[1]) * done];
            const start = fromDirection + turn * done;
            centre.moveTo(here);
            first.moveTo(polar(here, start, radius));
            second.moveTo(polar(here, start + span, radius));
        });
    }

    // The three parts of an F, Z or C, drawn over the lines in orange.
    function shape(diagram, path) {
        const points = path.map(position => diagram.point(position, { mark: 'none' }));
        for (let index = 0; index < points.length - 1; index++) {
            diagram.segment(points[index], points[index + 1], { tone: 'highlight' });
        }
    }

    const pictures = [
        // 1. An angle is an amount of turn.
        {
            draw(host, steps, lines) {
                const card = screenCard(steps[0]);
                const built = S.buildAngles(S.open(host, {
                    label: `One angle, turned to ${card.size} degrees`
                }), {
                    vertex: [0, 0],
                    rays: [0, card.size],
                    sectors: [{ from: 0, to: card.size, label: degrees(card.size), tone: 'highlight', square: card.key === 'right' }]
                });
                lines([card.says]);
                return { built, size: card.size, mover: built.pointAt(card.size), label: built.sectors[0].handle };
            }
        },
        // 2. Angles on a straight line add up to 180°.
        {
            draw(host, steps, lines) {
                const known = steps.includes('known');
                const found = steps.includes('x');
                const built = S.buildAngles(S.open(host, {
                    label: 'A straight line with a line coming out of it, angles 130 degrees and x',
                    note: 'The whole straight line is 180°.'
                }), {
                    vertex: [2.6, 0],
                    lines: [[0, 180]],
                    rays: [130],
                    sectors: [
                        { from: 0, to: 130, label: '130°', tone: known ? 'highlight' : 'neutral', select: true, name: 'known' },
                        { from: 130, to: 180, label: found ? '50°' : 'x', tone: found ? 'highlight' : 'neutral', select: true, name: 'x' }
                    ]
                });
                lines([
                    known ? '130 + x = 180°' : '',
                    found ? 'x = 180 − 130 = 50°' : ''
                ]);
                return {
                    built,
                    select(name) {
                        if (name === 'x' && !known) return { say: 'Tap the 130° angle first.' };
                        if (name === 'known' && known) return { restart: true };
                        return { ok: true, step: name };
                    }
                };
            }
        },
        // 3. Angles around a point add up to 360°.
        {
            draw(host, steps, lines) {
                const first = steps.includes('a');
                const second = steps.includes('b');
                const found = steps.includes('x');
                const built = S.buildAngles(S.open(host, {
                    label: 'Three lines from a point, angles 100 degrees, 120 degrees and x',
                    note: 'All the way round is 360°.'
                }), {
                    vertex: [1.4, 0],
                    rays: [0, 100, 220],
                    sectors: [
                        { from: 0, to: 100, label: '100°', tone: first ? 'highlight' : 'neutral', select: true, name: 'a' },
                        { from: 100, to: 220, label: '120°', tone: second ? 'highlight' : 'neutral', select: true, name: 'b' },
                        { from: 220, to: 360, label: found ? '140°' : 'x', tone: found ? 'highlight' : 'neutral', select: true, name: 'x' }
                    ]
                });
                lines([
                    first && !second ? '100°' : '',
                    second ? '100 + 120 = 220°' : '',
                    found ? 'x = 360 − 220 = 140°' : ''
                ]);
                return {
                    built,
                    select(name) {
                        if (name !== 'x' && second) return { restart: true };
                        if (name === 'x' && !second) return { say: 'Tap 100° and 120° first.' };
                        return { ok: true, step: name };
                    }
                };
            }
        },
        // 4. Vertically opposite angles are equal.
        {
            draw(host, steps, lines) {
                const a = steps.includes('a');
                const b = steps.includes('b');
                const c = steps.includes('c');
                const built = S.buildAngles(S.open(host, {
                    label: 'Two straight lines crossing, angles 50 degrees, a, b and c',
                    view: { x: [-3.6, 3.6], y: [-3.2, 3.2] }
                }), {
                    vertex: [0, 0],
                    lines: [[0, 180], [50, 230]],
                    sectors: [
                        { from: 0, to: 50, label: '50°' },
                        { from: 50, to: 180, label: a ? '130°' : 'a', tone: a ? 'highlight' : 'neutral', arcs: 2, select: true, name: 'a' },
                        { from: 180, to: 230, label: b ? '50°' : 'b', tone: b ? 'highlight' : 'neutral', select: true, name: 'b' },
                        { from: 230, to: 360, label: c ? '130°' : 'c', tone: c ? 'highlight' : 'neutral', arcs: 2, select: true, name: 'c' }
                    ]
                });
                lines([
                    b ? 'b = 50°. Vertically opposite angles are equal.' : '',
                    a ? 'a = 180 − 50 = 130°. Angles on a straight line add up to 180°.' : '',
                    c ? 'c = 130°. Vertically opposite angles are equal.' : ''
                ]);
                return {
                    built,
                    select(name) {
                        if (name === 'c' && !a) return { say: 'Find a first. You need it to find c.' };
                        return { ok: true, step: name };
                    },
                    // An orange copy of the 50° angle turns half a turn
                    // round the crossing point and lands on b.
                    animate(name) {
                        if (name !== 'b') return null;
                        const centre = built.diagram.point([0, 0], { mark: 'none' });
                        const first = built.diagram.point(polar([0, 0], 0, 1.5), { mark: 'none' });
                        const second = built.diagram.point(polar([0, 0], 50, 1.5), { mark: 'none' });
                        built.diagram.angle(first, centre, second, { turn: 'anticlockwise', tone: 'highlight' });
                        return move(600, done => {
                            first.moveTo(polar([0, 0], 180 * done, 1.5));
                            second.moveTo(polar([0, 0], 50 + 180 * done, 1.5));
                        });
                    }
                };
            }
        },
        // 5. Corresponding angles are equal.
        {
            draw(host, steps, lines) {
                const found = steps.includes('x');
                const built = S.buildParallel(S.open(host, {
                    label: 'Two parallel lines crossed by a line, 60 degrees at the top and x at the bottom'
                }), {
                    theta: 60,
                    corners: {
                        'top-above-right': { label: '60°' },
                        'bottom-above-right': { label: found ? '60°' : 'x', tone: found ? 'highlight' : 'neutral', select: true, name: 'x' }
                    }
                });
                if (found) {
                    const top = built.top.position();
                    const bottom = built.bottom.position();
                    shape(built.diagram, S.shapeThrough(top, bottom, 'top-above-right', 'bottom-above-right'));
                }
                lines([found ? 'x = 60°. Corresponding angles are equal.' : '']);
                return {
                    built,
                    select: name => ({ ok: true, step: name }),
                    animate: name => (name === 'x' ? slideCopy(built, 0, 0, 60) : null)
                };
            }
        },
        // 6. Alternate angles are equal.
        {
            draw(host, steps, lines) {
                const found = steps.includes('y');
                const built = S.buildParallel(S.open(host, {
                    label: 'Two parallel lines crossed by a line, 120 degrees and y between the lines',
                    view: { x: [-0.9, 7.9], y: [-2.2, 5.2] }
                }), {
                    theta: 60,
                    corners: {
                        'top-below-right': { label: '120°' },
                        'top-below-left': { label: '', select: true, name: 'top-left' },
                        'bottom-above-right': { label: '', select: true, name: 'bottom-right' },
                        'bottom-above-left': { label: found ? '120°' : 'y', tone: found ? 'highlight' : 'neutral', select: true, name: 'y' }
                    }
                });
                if (found) {
                    const top = built.top.position();
                    const bottom = built.bottom.position();
                    shape(built.diagram, S.shapeThrough(top, bottom, 'top-below-right', 'bottom-above-left'));
                }
                lines([found ? 'y = 120°. Alternate angles are equal.' : '']);
                return {
                    built,
                    select(name) {
                        if (name === 'top-left' || name === 'bottom-right') {
                            return { say: 'That one is on the same side as 120°. Tap the angle on the other side of the crossing line.' };
                        }
                        return { ok: true, step: name };
                    },
                    animate: name => (name === 'y' ? slideCopy(built, 240, 180, 120) : null)
                };
            }
        },
        // 7. Co-interior angles add up to 180°.
        {
            draw(host, steps, lines) {
                const marked = steps.includes('mark');
                const found = steps.includes('z');
                const built = S.buildParallel(S.open(host, {
                    label: 'Two parallel lines crossed by a line, 120 degrees and z between the lines',
                    view: { x: [-0.9, 7.9], y: [-2.2, 5.2] }
                }), {
                    theta: 60,
                    corners: {
                        'top-below-right': { label: '120°' },
                        'bottom-above-right': { label: found ? '60°' : 'z', tone: found ? 'highlight' : 'neutral', select: true, name: 'z' }
                    }
                });
                if (marked) {
                    const top = built.top.position();
                    const bottom = built.bottom.position();
                    shape(built.diagram, S.shapeThrough(top, bottom, 'top-below-right', 'bottom-above-right'));
                }
                lines([
                    marked && !found ? '120° and z make a straight line.' : '',
                    found ? 'z = 180 − 120 = 60°. Co-interior angles add up to 180°.' : ''
                ]);
                return {
                    built,
                    select: name => ({ ok: true, step: name === 'z' && marked ? 'z' : 'mark' }),
                    animate: name => (name === 'mark' ? slideCopy(built, 240, 0, 120) : null)
                };
            }
        },
        // 8. Find it, and say why.
        {
            draw(host, steps, lines) {
                const y = steps.includes('y');
                const x = steps.includes('x');
                const built = S.buildParallel(S.open(host, {
                    label: 'Two parallel lines crossed by a line, 65 degrees, y and x',
                    view: { x: [-0.9, 7.9], y: [-2.2, 5.2] }
                }), {
                    theta: 65,
                    corners: {
                        'top-above-right': { label: '65°' },
                        'top-below-left': { label: y ? '65°' : 'y', tone: y ? 'highlight' : 'neutral', select: true, name: 'y' },
                        'bottom-above-left': { label: x ? '115°' : 'x', tone: x ? 'highlight' : 'neutral', select: true, name: 'x' }
                    }
                });
                lines([
                    y ? 'y = 65°. Vertically opposite angles are equal.' : '',
                    x ? 'x = 180 − 65 = 115°. Co-interior angles add up to 180°.' : ''
                ]);
                return {
                    built,
                    select(name) {
                        if (name === 'x' && !y) return { say: 'Find y first. You need it to find x.' };
                        return { ok: true, step: name };
                    }
                };
            }
        }
    ];

    function cardRow() {
        const row = node('div', '', 'af-cards');
        row.setAttribute('role', 'group');
        row.setAttribute('aria-label', 'Types of angle');
        for (const card of screens[0].cards) {
            const button = node('button', '', 'af-card');
            button.type = 'button';
            button.dataset.card = card.key;
            button.append(node('span', `${card.name} ${degrees(card.size)}`, 'af-card-name'),
                node('span', card.note, 'af-card-note'));
            row.append(button);
        }
        return row;
    }

    function reasonList() {
        const list = node('ul', '', 'af-reasons');
        for (const reason of S.REASON_LIST) list.append(node('li', reason));
        return list;
    }

    // ---------------------------------------------------------------
    // Learn
    // ---------------------------------------------------------------

    async function mountLearn() {
        const root = node('article', '', 'af-learn');
        document.getElementById('lesson-section-explanation').append(root);
        const api = window.Maths1to9Lesson;
        sectionEvent('explanation', 'gate');
        const section = await api.useSectionState('learn', {
            version: 1,
            initial: () => ({
                screen: 0, furthestScreen: 0, finished: false,
                steps: screens.map(() => [])
            }),
            upgrade: () => null
        });
        const state = section.state;
        section.save();
        let current = null;
        let busy = false;

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
            const title = root.querySelector('h3');
            title.tabIndex = -1;
            title.focus();
        }

        function saveStep(index, step) {
            section.update(state => {
                if (!state.steps[index].includes(step)) state.steps[index].push(step);
            });
            render();
        }

        function saveSteps(index, steps) {
            section.update(state => { state.steps[index] = steps; });
            render();
        }

        function render() {
            api.setSectionReset('explanation', () => {
                section.resetFields([['steps', state.screen]]);
                render();
            });
            busy = false;
            root.replaceChildren();
            const index = state.screen;
            const screen = screens[index];
            root.append(heading(screen.title));
            for (const line of screen.lines) root.append(node('p', line));
            if (screen.kind === 'turn') root.append(cardRow());
            const host = node('div', '', 'af-picture');
            root.append(host);
            const lines = workingLines(root);
            const steps = state.steps[index].slice();
            current = pictures[index].draw(host, steps, lines);
            if (screen.kind === 'turn') {
                for (const button of root.querySelectorAll('.af-card')) {
                    button.setAttribute('aria-pressed', String(button.dataset.card === (steps[0] ?? screens[0].cards[0].key)));
                }
            } else {
                hookTaps(index, current);
            }
            if (screen.callout) root.append(node('p', screen.callout, 'af-callout'));
            if (screen.kind === 'reason') root.append(reasonList());
            api.setSectionBack('explanation', index > 0 ? {
                onClick: () => showScreen(index - 1)
            } : null);
            if (state.finished) sectionEvent('explanation', 'complete');
            if (index < state.furthestScreen) {
                api.setSectionAction('explanation', { label: 'Next', onClick: () => showScreen(index + 1) });
            } else if (state.finished) {
                api.clearSectionAction('explanation');
            } else {
                api.setSectionAction('explanation', { label: 'Next idea', onClick: () => showScreen(index + 1) });
            }
            syncHash();
        }

        function hookTaps(index, picture) {
            const diagram = picture.built.diagram;
            diagram.onSelect(item => {
                if (busy) return;
                const answer = picture.select(item.settings.name);
                if (!answer) return;
                if (answer.say) {
                    diagram.describe(answer.say);
                    return;
                }
                if (answer.restart) {
                    saveSteps(index, []);
                    return;
                }
                if (state.steps[index].includes(answer.step)) return;
                diagram.describe('');
                const animation = picture.animate?.(answer.step);
                if (animation) {
                    busy = true;
                    animation.then(() => {
                        if (current !== picture) return;
                        busy = false;
                        saveStep(index, answer.step);
                    });
                } else {
                    saveStep(index, answer.step);
                }
            });
        }

        // Learn 1's four cards turn the line to that size.
        root.addEventListener('click', event => {
            const button = event.target.closest?.('.af-card');
            if (!button || busy) return;
            const index = state.screen;
            if (screens[index].kind !== 'turn') return;
            const card = screenCard(button.dataset.card);
            const picture = current;
            if (!picture?.mover) {
                saveSteps(index, [card.key]);
                return;
            }
            const start = picture.size;
            busy = true;
            move(600, done => {
                const size = start + (card.size - start) * done;
                picture.mover.moveTo(polar([0, 0], size, 2.6));
                picture.label.setLabel(degrees(Math.round(size)));
            }).then(() => {
                if (current !== picture) return;
                busy = false;
                saveSteps(index, [card.key]);
            });
        });

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

    // ---------------------------------------------------------------
    // Try it
    // ---------------------------------------------------------------

    async function mountTryIt(root) {
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
            const title = root.querySelector('h3');
            title.tabIndex = -1;
            title.focus();
        }

        function reportProgress() {
            const card = state.cards[`example-${state.index + 1}`];
            const completed = state.finished ? examples.length : state.index + Number(card?.correct === true);
            api.setSectionProgress('interactive', completed, examples.length);
        }

        function continueExample() {
            section.update(state => {
                state.index++;
                state.screen = state.index;
                state.furthestScreen = state.screen;
                state.finished = state.index === examples.length;
            });
            render();
        }

        function drawExample(container, index, readOnly) {
            const example = examples[index];
            const cardRoot = document.createElement('div');
            container.append(cardRoot);
            api.createQuestion(cardRoot, {
                ...S.prepare(example, window.Maths1to9LessonEngine.seededRandom(state.seed + index)),
                sectionId: 'interactive', questionId: `example-${index + 1}`,
                scored: false, readOnly,
                onFeedback() {
                    reportProgress();
                },
                onContinue: continueExample
            });
        }

        function render() {
            root.replaceChildren();
            root.append(heading(state.screen === examples.length
                ? 'Your completed examples' : `Example ${state.screen + 1}`));
            api.setSectionBack('interactive', state.screen > 0 ? {
                onClick: () => showScreen(state.screen - 1)
            } : null);
            if (state.finished) sectionEvent('interactive', 'complete');
            if (state.screen === examples.length) {
                examples.forEach((example, index) => {
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

        for (let index = 0; index <= examples.length; index++) {
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
        const requested = Array.from({ length: examples.length + 1 }, (_, index) => index)
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
