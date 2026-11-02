(() => {
    'use strict';

    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;

    const screens = window.ScaleDrawings.learnScreens;

    // CHANGE: replace these examples and their real misconception options.
    const examples = [
        {
            number: 5, prompt: 'What is 2 × 5?', input: 'choice',
            options: [
                { label: '10', correct: true, feedback: 'Two groups of 5 make 10.' },
                { label: '7', feedback: 'You added 2 instead of making two equal groups.' },
                { label: '5', feedback: 'That counts only one group.' },
                { label: '15', feedback: 'That counts three groups instead of two.' }
            ]
        },
        {
            number: 6, prompt: 'What is 2 × 6?', input: 'number', answer: '12',
            rules: [
                { value: '8', feedback: 'You added 2 instead of doubling.' },
                { value: '6', feedback: 'Count both groups, not just one.' }
            ],
            fallback: 'Add the two equal groups: 6 + 6.'
        }
    ];

    function sectionEvent(sectionId, name) {
        document.dispatchEvent(new CustomEvent(`maths1to9:section-${name}`, {
            detail: { sectionId }
        }));
    }

    function drawGroups(container, number) {
        // CHANGE: draw this lesson's own visual here. Shared cards own inputs.
        const visual = document.createElement('p');
        visual.className = 'interactive-equation';
        visual.setAttribute('role', 'img');
        visual.setAttribute('aria-label', `Two equal groups of ${number} counters`);
        visual.textContent = `${'● '.repeat(number).trim()}  +  ${'● '.repeat(number).trim()}`;
        container.append(visual);
    }

    const SVG = 'http://www.w3.org/2000/svg';
    const display = text => String(text).replace(/(\d) (?=(?:cm²|cm³|cm|km|m²|m)(?![a-zA-Z\d]))/g, '$1\u00a0');
    function node(tag, text = '', className = '') {
        const element = document.createElement(tag);
        element.textContent = display(text);
        if (className) element.className = className;
        return element;
    }
    function svg(tag, attrs = {}, text = '') {
        const element = document.createElementNS(SVG, tag);
        for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, String(value));
        if (text) element.textContent = display(text);
        return element;
    }
    function grid(picture, x, y, width, height, size) {
        picture.append(svg('rect', { x, y, width: width * size, height: height * size, class: 'sd-paper' }));
        for (let i = 0; i <= width * 2; i++) {
            picture.append(svg('line', { x1: x + i * size / 2, x2: x + i * size / 2, y1: y, y2: y + height * size, class: i % 2 ? 'sd-half-grid' : 'sd-grid-line' }));
        }
        for (let i = 0; i <= height * 2; i++) {
            picture.append(svg('line', { x1: x, x2: x + width * size, y1: y + i * size / 2, y2: y + i * size / 2, class: i % 2 ? 'sd-half-grid' : 'sd-grid-line' }));
        }
    }
    function working(host, drawing, real) {
        const line = node('p', '', 'sd-working');
        const blue = node('span', drawing, 'sd-drawing');
        const green = node('span', real, 'sd-real');
        line.append(blue, document.createTextNode(' → '), green);
        host.append(line);
        return { line, blue, green };
    }

    function bedroom(host, state, save, callout) {
        host.append(node('p', 'Scale: 1 cm represents 2 m', 'sd-scale'));
        const picture = svg('svg', { viewBox: '0 0 180 125', class: 'sd-bedroom', 'aria-label': "Sam's bedroom plan" });
        grid(picture, 30, 5, 3, 2, 40);
        const squares = [];
        for (let i = 0; i < 3; i++) {
            const square = svg('rect', { x: 30 + i * 40, y: 45, width: 40, height: 40, class: 'sd-square', tabindex: '0', role: 'button', 'aria-label': `Centimetre ${i + 1}` });
            const activate = () => {
                if (i < state.values[0].lit) return;
                save(s => { s.values[0].lit++; });
                paint();
            };
            square.addEventListener('click', activate);
            square.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activate(); }
            });
            picture.append(square);
            squares.push(square);
        }
        picture.append(svg('text', { x: 30, y: 108, class: 'sd-caption' }, 'Each square is 1 cm'));
        host.append(picture, node('p', 'Real room', 'sd-label'));
        const bar = node('div', '', 'sd-bar');
        const blocks = Array.from({ length: 3 }, () => {
            const block = node('span', '2 m', 'sd-block');
            bar.append(block);
            return block;
        });
        host.append(bar);
        const total = node('p', '', 'sd-real sd-total');
        host.append(total);
        const line = working(host, '', '');
        function paint() {
            const count = state.values[0].lit;
            squares.forEach((square, i) => square.classList.toggle('is-lit', i < count));
            blocks.forEach((block, i) => block.classList.toggle('is-lit', i < count));
            total.textContent = display(`${count * 2} m`);
            line.blue.textContent = display(`${count} cm`);
            line.green.textContent = display(count === 3 ? '3 × 2 = 6 m' : `${count * 2} m`);
            callout.hidden = count !== 3;
        }
        return paint;
    }

    function furniture(host, state, save, callout) {
        const picture = svg('svg', { viewBox: '0 0 320 445', class: 'sd-furniture', 'aria-label': "Real room and Sam's plan" });
        picture.append(svg('text', { x: 10, y: 19, class: 'sd-svg-label' }, 'Real room: 6 m by 4 m'));
        picture.append(svg('rect', { x: 10, y: 30, width: 300, height: 200, class: 'sd-room' }));
        picture.append(svg('text', { x: 10, y: 260, class: 'sd-svg-label' }, "Sam's plan: 3 cm by 2 cm"));
        grid(picture, 10, 280, 3, 2, 60);
        picture.append(svg('text', { x: 10, y: 420, class: 'sd-caption' }, 'Each square is 1 cm'));
        const items = [
            { id: 'bed', name: 'Bed', x: 20, y: 40, px: 15, py: 285, w: 100, h: 50, real: '2 m by 1 m', drawn: '1 cm by 0.5 cm', work: '2 ÷ 2 = 1 cm and 1 ÷ 2 = 0.5 cm' },
            { id: 'rug', name: 'Rug', x: 140, y: 65, px: 90, py: 320, w: 150, h: 100, real: '3 m by 2 m', drawn: '1.5 cm by 1 cm', work: '3 ÷ 2 = 1.5 cm and 2 ÷ 2 = 1 cm' },
            { id: 'desk', name: 'Desk', x: 20, y: 165, px: 15, py: 360, w: 50, h: 50, real: '1 m by 1 m', drawn: '0.5 cm by 0.5 cm', work: '1 ÷ 2 = 0.5 cm and 1 ÷ 2 = 0.5 cm' }
        ];
        items.forEach(item => picture.append(svg('rect', { x: item.px, y: item.py, width: item.w * 0.6, height: item.h * 0.6, class: 'sd-outline' })));
        const labels = node('div', '', 'sd-furniture-labels');
        const workingBox = node('div', '', 'sd-workings');
        const elements = items.map(item => {
            const group = svg('g', { class: 'sd-piece', tabindex: '0', role: 'button', 'aria-label': item.name });
            const rect = svg('rect', { width: item.w, height: item.h, rx: 4 });
            const title = svg('text', { x: item.w / 2, y: item.h / 2 + 4, class: 'sd-piece-name' }, item.name);
            group.append(rect, title);
            picture.append(group);
            const label = node('p', '', 'sd-real');
            const line = node('p', '', 'sd-working');
            item.work.split(' and ').forEach((part, index) => {
                if (index) line.append(document.createTextNode(' and '));
                const [real, drawing] = part.split(' = ');
                line.append(node('span', real, 'sd-real'), document.createTextNode(' = '), node('span', drawing, 'sd-drawing'));
            });
            labels.append(label);
            let drag = null;
            function position(x, y, scale) { group.setAttribute('transform', `translate(${x} ${y}) scale(${scale})`); }
            function setPlaced(placed) {
                if (state.values[1].order.includes(item.id) === placed) { paint(); return; }
                save(s => {
                    const order = s.values[1].order.filter(id => id !== item.id);
                    if (placed) order.push(item.id);
                    s.values[1].order = order;
                });
                paint();
            }
            function point(event) {
                const bounds = picture.getBoundingClientRect();
                return { x: (event.clientX - bounds.left) * 320 / bounds.width, y: (event.clientY - bounds.top) * 445 / bounds.height };
            }
            group.addEventListener('pointerdown', event => {
                event.preventDefault();
                group.focus();
                group.setPointerCapture(event.pointerId);
                const start = point(event);
                const placed = state.values[1].order.includes(item.id);
                drag = { start, placed, moved: false, x: placed ? item.px : item.x, y: placed ? item.py : item.y };
                group.classList.add('is-dragging');
            });
            group.addEventListener('pointermove', event => {
                if (!drag) return;
                const current = point(event);
                const dx = current.x - drag.start.x;
                const dy = current.y - drag.start.y;
                if (Math.hypot(dx, dy) > 4) drag.moved = true;
                if (drag.moved) position(drag.x + dx, drag.y + dy, drag.placed ? 0.6 : 1);
            });
            group.addEventListener('pointerup', event => {
                if (!drag) return;
                const end = point(event);
                const inPlan = end.x >= 10 && end.x <= 190 && end.y >= 280 && end.y <= 400;
                const inRoom = end.x >= 10 && end.x <= 310 && end.y >= 30 && end.y <= 230;
                const next = !drag.moved ? !drag.placed : (!drag.placed && inPlan ? true : (drag.placed && inRoom ? false : drag.placed));
                drag = null;
                group.classList.remove('is-dragging');
                setPlaced(next);
            });
            group.addEventListener('lostpointercapture', () => { drag = null; group.classList.remove('is-dragging'); paint(); });
            group.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setPlaced(!state.values[1].order.includes(item.id));
                }
            });
            return { item, group, label, line, position };
        });
        host.append(node('p', 'Scale: 1 cm represents 2 m', 'sd-scale'), picture, labels, workingBox);
        function paint() {
            const order = state.values[1].order;
            elements.forEach(({ item, group, label, line, position }) => {
                const placed = order.includes(item.id);
                position(placed ? item.px : item.x, placed ? item.py : item.y, placed ? 0.6 : 1);
                group.classList.toggle('is-placed', placed);
                group.setAttribute('aria-label', `${item.name}: ${placed ? item.drawn : item.real}`);
                label.className = placed ? 'sd-drawing' : 'sd-real';
                label.textContent = display(`${item.name}: ${placed ? item.drawn : item.real}`);
                line.hidden = !placed;
            });
            order.forEach(id => workingBox.append(elements.find(element => element.item.id === id).line));
            callout.hidden = order.length !== 3;
        }
        return paint;
    }

    function lakes(host, state, save, callout) {
        const maps = [ { name: 'A', length: 4, scale: 50 }, { name: 'B', length: 8, scale: 25 } ];
        const pictures = maps.map((map, index) => {
            const holder = node('div', '', 'sd-map');
            holder.append(node('p', `Map ${map.name}`, 'sd-label'), node('p', `Scale: 1 cm represents ${map.scale} m`, 'sd-scale'));
            const picture = svg('svg', { viewBox: '0 0 340 115', class: 'sd-map-svg' });
            grid(picture, 30, 16, map.length, 2, 30);
            const lake = svg('ellipse', { cx: 30 + map.length * 15, cy: 46, rx: map.length * 15, ry: 26, class: 'sd-lake' });
            const tape = svg('line', { x1: 30, y1: 46, x2: 30, y2: 46, class: 'sd-tape' });
            const handle = svg('circle', { cx: 30, cy: 46, r: 10, tabindex: '0', role: 'slider', 'aria-label': `Map ${map.name} tape measure`, 'aria-valuemin': 0, 'aria-valuemax': map.length, class: 'sd-handle' });
            picture.append(lake, tape, handle);
            picture.append(svg('text', { x: 30, y: 100, class: 'sd-caption' }, 'Each square is 1 cm'));
            holder.append(picture);
            const line = working(holder, '', '');
            host.append(holder);
            let dragging = false;
            function set(value) {
                const next = Math.max(0, Math.min(map.length, Math.round(value)));
                save(s => { s.values[2].tapes[index] = next; });
                paint();
            }
            function move(event) {
                const bounds = picture.getBoundingClientRect();
                set(((event.clientX - bounds.left) * 340 / bounds.width - 30) / 30);
            }
            handle.addEventListener('pointerdown', event => {
                event.preventDefault();
                dragging = true;
                handle.focus();
                handle.setPointerCapture(event.pointerId);
                move(event);
            });
            handle.addEventListener('pointermove', event => { if (dragging) move(event); });
            handle.addEventListener('pointerup', () => { dragging = false; });
            handle.addEventListener('lostpointercapture', () => { dragging = false; });
            handle.addEventListener('keydown', event => {
                const current = state.values[2].tapes[index];
                if (['ArrowRight', 'ArrowUp'].includes(event.key)) set(current + 1);
                else if (['ArrowLeft', 'ArrowDown'].includes(event.key)) set(current - 1);
                else return;
                event.preventDefault();
            });
            return { map, lake, tape, handle, line };
        });
        function paint() {
            pictures.forEach(({ map, lake, tape, handle, line }, index) => {
                const value = state.values[2].tapes[index];
                const x = 30 + value * 30;
                tape.setAttribute('x2', x);
                handle.setAttribute('cx', x);
                handle.setAttribute('aria-valuenow', value);
                handle.setAttribute('aria-valuetext', `${value} cm`);
                lake.classList.toggle('is-complete', value === map.length);
                line.blue.textContent = display(`${value} cm`);
                line.green.textContent = display(`${value} × ${map.scale} = ${value * map.scale} m`);
            });
            callout.hidden = state.values[2].tapes.some((value, index) => value !== maps[index].length);
        }
        return paint;
    }

    const pictures = [bedroom, furniture, lakes, () => () => {}, () => () => {}, () => () => {}, () => () => {}];

    async function mountLearn() {
        const root = node('article', '', 'sd-learn');
        document.getElementById('lesson-section-explanation').append(root);
        const api = window.Maths1to9Lesson;
        sectionEvent('explanation', 'gate');
        const section = await api.useSectionState('learn', {
            version: 2,
            initial: () => ({
                screen: 0, furthestScreen: 0, finished: false,
                values: [{ lit: 1 }, { order: [] }, { tapes: [0, 0] }, {}, {}, {}, {}]
            }),
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
            root.replaceChildren();
            const screen = screens[state.screen];
            const heading = node('h3', screen.title);
            heading.dataset.screenHeading = '';
            root.append(heading);
            screen.lines.forEach(line => root.append(node('p', line)));
            const picture = node('div', '', 'sd-picture');
            const callout = node('p', screen.callout, 'sd-callout');
            callout.hidden = true;
            root.append(picture, callout);
            const paint = pictures[state.screen](picture, state, change => section.update(change), callout);
            paint();
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
        const api = window.Maths1to9Lesson;
        sectionEvent('interactive', 'gate');
        api.setSectionAction('interactive', { label: 'Check', disabled: true, onClick() {} });
        const section = await api.useSectionState('interactive', {
            version: 1,
            initial: () => ({ index: 0, screen: 0, furthestScreen: 0, finished: false, cards: {} })
        });
        const state = section.state;

        function syncHash() {
            if (api.getCurrentSection().id === 'interactive') {
                api.setSlideHash(`try-it-${state.screen + 1}`, { replace: true });
            }
        }

        function showScreen(screen) {
            section.update(state => { state.screen = screen; });
            render();
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
            const visual = document.createElement('div');
            drawGroups(visual, example.number);
            container.append(visual);
            const cardRoot = document.createElement('div');
            container.append(cardRoot);
            api.createQuestion(cardRoot, {
                ...example, sectionId: 'interactive', questionId: `example-${index + 1}`,
                scored: false, readOnly,
                onFeedback(result) {
                    reportProgress();
                    // CHANGE: update the lesson visual in place in response to
                    // result.correct / result.value / result.option (e.g. flash
                    // a missed tile). Don't rebuild the shared card here.
                    visual.setAttribute('aria-label', result.correct ? 'Both groups counted' : 'Count both equal groups');
                },
                onContinue: continueExample
            });
        }

        function render() {
            root.replaceChildren();
            const heading = document.createElement('h3');
            heading.dataset.screenHeading = '';
            heading.textContent = state.screen === examples.length ? 'Your completed examples' : `Example ${state.screen + 1}`;
            root.append(heading);
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
