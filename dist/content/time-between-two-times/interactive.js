(() => {
    'use strict';

    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;
    const NS = 'http://www.w3.org/2000/svg';

    const S = window.TimeBetween;
    const screens = S.learnScreens;
    const examples = S.examples();

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

    function svgNode(tag, attributes, className = '') {
        const element = document.createElementNS(NS, tag);
        for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
        if (className) element.setAttribute('class', className);
        return element;
    }

    // Working lines are strings, or { text, tone, label } when a line needs a
    // colour or a bold name in front. Blue, purple, green and dark grey mean
    // the same thing on every screen.
    function lines(host) {
        const holder = node('div', '', 'tb-lines');
        host.append(holder);
        return values => {
            holder.replaceChildren(...values.filter(Boolean).map(entry => {
                const { text, tone = '', label } = typeof entry === 'string' ? { text: entry } : entry;
                const paragraph = node('p', '', `tb-working ${tone ? `tb-${tone}` : ''}`.trim());
                if (label) paragraph.append(node('strong', label), document.createTextNode(` ${text}`));
                else paragraph.textContent = text;
                return paragraph;
            }));
        };
    }

    // The time line: dots and labels under a straight line, one arc above it
    // per jump. Built once; paint() only moves, shows and hides what is there.
    function makeTimeline(host, screen) {
        const WIDTH = 400;
        const HEIGHT = 150;
        const LEFT = 26;
        const RIGHT = 374;
        const LINE = 104;
        const RY = 44;
        const svg = svgNode('svg', { viewBox: `0 0 ${WIDTH} ${HEIGHT}` }, 'tb-timeline');
        svg.setAttribute('role', 'img');
        svg.append(svgNode('line', { x1: LEFT, x2: RIGHT, y1: LINE, y2: LINE }, 'tb-axis'));

        const dots = screen.times.map(() => {
            const dot = svgNode('circle', { r: 4.5, cy: LINE, cx: LEFT }, 'tb-dot');
            svg.append(dot);
            return dot;
        });
        const labels = screen.times.map(value => {
            const label = svgNode('text', { x: LEFT, y: LINE + 26, 'text-anchor': 'middle' }, 'tb-time');
            label.textContent = value;
            svg.append(label);
            return label;
        });
        const arcs = screen.arcs.map(arc => {
            const path = svgNode('path', {}, `tb-arc tb-${arc.tone}`);
            svg.append(path);
            const label = svgNode('text', { y: LINE - RY - 8, 'text-anchor': 'middle' }, `tb-arc-label tb-${arc.tone}-text`);
            label.textContent = arc.label;
            svg.append(label);
            return { path, label, shown: false };
        });
        host.append(svg);
        const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

        function paint({ stops, arcs: shown = 0, labels: renamed = {}, arcLabels = {} }) {
            const slotOf = new Map(stops.map((stop, slot) => [stop, slot]));
            const xOf = slot => stops.length === 1
                ? (LEFT + RIGHT) / 2
                : LEFT + slot * ((RIGHT - LEFT) / (stops.length - 1));
            screen.times.forEach((value, index) => {
                const slot = slotOf.get(index);
                const visible = slot !== undefined;
                dots[index].style.display = visible ? '' : 'none';
                labels[index].style.display = visible ? '' : 'none';
                if (!visible) return;
                dots[index].setAttribute('cx', String(xOf(slot)));
                labels[index].setAttribute('x', String(xOf(slot)));
                labels[index].textContent = renamed[index] ?? value;
            });
            screen.arcs.forEach((arc, index) => {
                const item = arcs[index];
                const from = slotOf.get(arc.from);
                const to = slotOf.get(arc.to);
                const visible = index < shown && from !== undefined && to !== undefined;
                item.path.style.display = visible ? '' : 'none';
                item.label.style.display = visible ? '' : 'none';
                if (!visible) {
                    item.shown = false;
                    return;
                }
                const fromX = xOf(from);
                const toX = xOf(to);
                item.path.setAttribute('d', `M ${fromX} ${LINE} A ${(toX - fromX) / 2} ${RY} 0 0 1 ${toX} ${LINE}`);
                item.label.setAttribute('x', String((fromX + toX) / 2));
                item.label.textContent = arcLabels[index] ?? arc.label;
                if (!item.shown) {
                    if (reduceMotion) {
                        item.path.style.transition = 'none';
                        item.path.style.strokeDashoffset = '0';
                    } else {
                        const length = item.path.getTotalLength();
                        item.path.style.transition = 'none';
                        item.path.style.strokeDasharray = String(length);
                        item.path.style.strokeDashoffset = String(length);
                        requestAnimationFrame(() => requestAnimationFrame(() => {
                            item.path.style.transition = '';
                            item.path.style.strokeDashoffset = '0';
                        }));
                    }
                }
                item.shown = true;
            });
        }
        return { paint };
    }

    // A row of small cells, one per minute. paint() colours them; the cells
    // themselves are made once.
    function makeCells(host, total, caption) {
        const figure = node('figure', '', 'tb-cells-figure');
        figure.append(node('figcaption', caption, 'tb-cells-caption'));
        const wrap = node('div', '', 'tb-cells');
        const cells = [];
        for (let index = 0; index < total; index++) {
            const cell = node('span', '', 'tb-cell');
            wrap.append(cell);
            cells.push(cell);
        }
        const brackets = node('div', '', 'tb-brackets');
        figure.append(wrap, brackets);
        host.append(figure);
        return {
            figure,
            brackets,
            paint(toneOf) {
                cells.forEach((cell, index) => { cell.className = `tb-cell tb-cell-${toneOf(index)}`; });
            }
        };
    }

    function makeClock(value, tone = '') {
        return node('span', value, `tb-clock ${tone}`.trim());
    }

    // Every screen builds its picture once and returns paint(value), which only
    // changes positions, colours and text. The slider keeps focus while dragged.
    const pictures = [
        // Learn 1 and 2. One worked example each, red or green.
        function compare(host, screen) {
            const blocks = screen.examples.map(example => {
                const block = node('article', '', `tb-compare tb-${example.tone}`);
                const clocks = node('div', '', 'tb-clock-row');
                example.clocks.forEach(value => clocks.append(makeClock(value)));
                block.append(clocks);
                block.append(node('p', example.working, `tb-working tb-${example.tone}`));
                block.append(node('span', example.mark, `tb-mark tb-${example.tone}`));
                if (example.calculator) {
                    const calculator = node('div', '', 'tb-calculator');
                    calculator.append(node('p', example.calculator, 'tb-calculator-screen'));
                    block.append(calculator);
                }
                if (example.wrong) {
                    const wrong = node('p', '', 'tb-wrong');
                    wrong.append(node('span', example.wrong), node('span', '✗', 'tb-mark'));
                    block.append(wrong);
                }
                block.append(...example.lines.map(line => node('p', line, 'tb-text')));
                host.append(block);
                return block;
            });
            return value => {
                blocks.forEach((block, index) => { block.hidden = index !== value - 1; });
            };
        },
        // Learn 3, 5, 6 and 7. The time line, with its working under it.
        function timeline(host, screen) {
            const line = makeTimeline(host, screen);
            const working = lines(host);
            const totalCells = screen.steps.find(step => step.cells)?.cells;
            const cells = totalCells ? makeCells(host, totalCells, '68 minutes') : null;
            const brackets = [];
            if (cells && screen.steps.some(step => step.split)) {
                const purple = node('span', '1 hour', 'tb-bracket tb-purple');
                const grey = node('span', '8 minutes', 'tb-bracket tb-grey-right');
                purple.hidden = true;
                grey.hidden = true;
                cells.brackets.append(purple, grey);
                brackets.push(purple, grey);
            }
            return step => {
                const spec = screen.steps[step - 1];
                line.paint({ stops: spec.stops, arcs: spec.arcs });
                working(spec.lines || []);
                if (cells) {
                    if (spec.cells === undefined) {
                        cells.figure.hidden = true;
                    } else {
                        cells.figure.hidden = false;
                        cells.paint(index => {
                            if (!spec.split) return 'grey';
                            return index < spec.split ? 'purple' : 'grey';
                        });
                        brackets.forEach(span => { span.hidden = !spec.split; });
                    }
                }
            };
        },
        // Learn 4. The hop from a start time to the next o'clock, with the
        // 60 cells of the hour.
        function hopSize(host, screen, textLines) {
            const line = makeTimeline(host, {
                times: [S.clock(screen.hour, screen.values[0]), screen.end],
                arcs: [{ from: 0, to: 1, label: '+15 min', tone: 'blue' }]
            });
            const working = lines(host);
            const cells = makeCells(host, 60, '1 hour = 60 minutes');
            return minutes => {
                const start = S.clock(screen.hour, minutes);
                const hop = 60 - minutes;
                line.paint({
                    stops: [0, 1], arcs: 1,
                    labels: { 0: start, 1: screen.end },
                    arcLabels: { 0: `+${hop} min` }
                });
                working([{ text: `${minutes} + ${hop} = 60, so the hop is ${hop} minutes`, tone: 'dark' }]);
                cells.paint(index => index < minutes ? 'grey' : 'blue');
                if (textLines[1]) {
                    textLines[1].textContent = `From ${start}, you need ${hop} more minutes to get to 60, so the hop to ${screen.end} is ${hop} minutes.`;
                }
            };
        }
    ];

    // Learn 1 and 2 use the example card; 3, 5, 6 and 7 the time line.
    const pictureFor = [0, 0, 1, 2, 1, 1, 1];

    async function mountLearn() {
        const root = node('article', '', 'tb-learn');
        document.getElementById('lesson-section-explanation').append(root);
        const api = window.Maths1to9Lesson;
        sectionEvent('explanation', 'gate');
        const section = await api.useSectionState('learn', {
            version: 1,
            initial: () => ({
                screen: 0, furthestScreen: 0, finished: false,
                sliders: screens.map(screen => Math.max(0, screen.values ? screen.values.indexOf(screen.start) : screen.start - 1))
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
            // A second click on the last screen's button must not go past the
            // end: there the engine's own Continue takes over.
            const next = Math.min(screen, screens.length - 1);
            section.update(state => {
                state.screen = next;
                state.furthestScreen = Math.max(state.furthestScreen, next);
                if (next === screens.length - 1) state.finished = true;
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
            if (screen.question) root.append(node('p', screen.question, 'tb-question'));

            const textLines = (screen.lines || []).map(line => node('p', line, 'tb-text'));
            root.append(...textLines);

            if (screen.values && screen.values.length === 1) {
                // One example and nothing to change, so no slider.
                const picture = node('div', '', 'tb-picture');
                pictures[pictureFor[state.screen]](picture, screen, textLines)(screen.values[0]);
                root.append(picture);
            } else if (screen.values) {
                const controls = node('label', '', 'tb-slider');
                const slider = node('input');
                const output = node('output');
                Object.assign(slider, {
                    type: 'range', min: '0', max: String(screen.values.length - 1), step: '1',
                    value: String(state.sliders[state.screen]), id: `tb-slider-${state.screen + 1}`
                });
                slider.setAttribute('aria-label', screen.slider);
                output.htmlFor = slider.id;
                controls.append(node('span', screen.slider), slider, output);
                const picture = node('div', '', 'tb-picture');
                const paint = pictures[pictureFor[state.screen]](picture, screen, textLines);
                root.append(controls, picture);
                const chosen = () => screen.values[Number(slider.value)] ?? screen.values[0];
                function update() {
                    const value = chosen();
                    const shown = screen.kind === 'hop-size' ? S.clock(screen.hour, value) : value;
                    output.textContent = `${screen.slider}: ${shown}`;
                    paint(value);
                }
                slider.addEventListener('input', () => {
                    section.update(state => { state.sliders[state.screen] = Number(slider.value); });
                    update();
                });
                update();
            } else {
                const controls = node('label', '', 'tb-slider');
                const slider = node('input');
                const output = node('output');
                const total = screen.steps.length;
                Object.assign(slider, {
                    type: 'range', min: '1', max: String(total), step: '1',
                    value: String(state.sliders[state.screen] + 1), id: `tb-slider-${state.screen + 1}`
                });
                slider.setAttribute('aria-label', screen.slider);
                output.htmlFor = slider.id;
                controls.append(node('span', screen.slider), slider, output);
                const picture = node('div', '', 'tb-picture');
                const paint = pictures[pictureFor[state.screen]](picture, screen, textLines);
                root.append(controls, picture);
                function update() {
                    const step = Number(slider.value);
                    output.textContent = `${screen.slider}: ${step}`;
                    paint(step);
                }
                slider.addEventListener('input', () => {
                    section.update(state => { state.sliders[state.screen] = Number(slider.value) - 1; });
                    update();
                });
                update();
            }

            if (screen.callout) root.append(node('p', screen.callout, 'tb-callout'));
            api.setSectionBack('explanation', state.screen > 0 ? {
                onClick: () => showScreen(state.screen - 1)
            } : null);
            if (state.finished) sectionEvent('explanation', 'complete');
            if (state.screen < state.furthestScreen) {
                api.setSectionAction('explanation', { label: 'Next', onClick: () => showScreen(state.screen + 1) });
            } else if (state.finished) {
                api.clearSectionAction('explanation');
            } else {
                api.setSectionAction('explanation', { label: 'Next idea', onClick: () => showScreen(state.screen + 1) });
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
            const current = state.cards[`example-${state.index + 1}`];
            const completed = state.finished ? examples.length : state.index + Number(current?.correct === true);
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
            const heading = document.createElement('h3');
            heading.dataset.screenHeading = '';
            heading.textContent = state.screen === examples.length
                ? 'Your completed examples'
                : `Example ${state.screen + 1}`;
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
