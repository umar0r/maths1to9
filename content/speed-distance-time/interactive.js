(() => {
    'use strict';

    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;

    const S = window.SpeedDistanceTime;
    const screens = S.learnScreens;
    const examples = S.examples();
    const { number } = S;
    const SVG = 'http://www.w3.org/2000/svg';
    const MAX_BLOCKS = 12;

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

    function svg(tag, attributes = {}, text = '') {
        const element = document.createElementNS(SVG, tag);
        for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
        if (text) element.textContent = text;
        return element;
    }

    // A small side-on car, drawn once and moved along the road.
    function carIcon() {
        const icon = svg('svg', { viewBox: '0 0 40 22', width: '40', height: '22', 'aria-hidden': 'true' });
        icon.append(
            svg('path', { d: 'M3 14 L7 7 Q8 5 11 5 L25 5 Q28 5 30 8 L33 11 L37 12 Q39 13 39 15 L39 17 L3 17 Z', fill: '#233a59' }),
            svg('path', { d: 'M11 7 L24 7 Q26 7 27 9 L29 11 L9 11 Z', fill: '#cfe0fa' }),
            svg('circle', { cx: '11', cy: '17', r: '4', fill: '#111' }),
            svg('circle', { cx: '31', cy: '17', r: '4', fill: '#111' })
        );
        return icon;
    }

    // One road: the blue road is the whole distance, green blocks are the
    // hours driven (each labelled with the distance in that hour) and the
    // orange tags under them count the hours. Widths are shares of `scale`.
    function makeRoad(host, caption = '') {
        const figure = node('figure', '', 'sd-road');
        const title = node('figcaption', caption);
        const track = node('div', '', 'sd-track');
        track.setAttribute('role', 'img');
        const road = node('div', '', 'sd-lane');
        const car = node('span', '', 'sd-car');
        car.append(carIcon());
        const blocks = [];
        const tags = [];
        const tagRow = node('div', '', 'sd-tags');
        for (let index = 0; index < MAX_BLOCKS; index++) {
            blocks.push(node('span', '', 'sd-block'));
            tags.push(node('span', '', 'sd-tag'));
        }
        road.append(...blocks);
        track.append(road, car);
        tagRow.append(...tags);
        const above = node('p', '', 'sd-above');
        const note = node('p', '', 'sd-note');
        figure.append(title, above, track, tagRow, note);
        host.append(figure);

        // Labels go on the blocks when they fit, or once above the road.
        function labels(list, scale, tries = 10) {
            // The full track, not the road, which may still be growing.
            const width = track.clientWidth;
            if (!width && tries > 0) {
                requestAnimationFrame(() => labels(list, scale, tries - 1));
                return;
            }
            const fits = list.every(block => width * block.size / scale >= block.label.length * 8.5 + 10);
            blocks.forEach((element, index) => {
                element.textContent = fits && list[index] ? list[index].label : '';
            });
            // Use "1 h" tags when they all fit. If not, just number the hours.
            const tagsFit = list.every(block => width * block.size / scale >= (block.tag || '').length * 8 + 6);
            tags.forEach((element, index) => {
                const tag = list[index]?.tag || '';
                element.textContent = tagsFit ? tag : tag.endsWith(' h') ? tag.slice(0, -2) : '';
            });
            above.textContent = !fits && list.length ? `${list[0].label} in each hour` : '';
        }

        return {
            figure,
            // list: [{ size, label, tag }]; road: the length of the blue road.
            set(list, scale, { road: length = scale, noteText = '', caption: text, label = '' } = {}) {
                if (text !== undefined) title.textContent = text;
                road.style.width = `${length / scale * 100}%`;
                const driven = list.reduce((total, block) => total + block.size, 0);
                blocks.forEach((element, index) => {
                    element.style.width = list[index] ? `${list[index].size / length * 100}%` : '0';
                    element.classList.toggle('is-part', Boolean(list[index]?.part));
                });
                tags.forEach((element, index) => {
                    element.style.width = list[index] ? `${list[index].size / scale * 100}%` : '0';
                });
                // Before the car moves, keep it on the road, not hanging off the left edge.
                car.style.left = `max(44px, ${driven / scale * 100}%)`;
                note.textContent = noteText;
                track.setAttribute('aria-label', label || `${title.textContent} ${noteText}`.trim());
                labels(list, scale);
            }
        };
    }

    function lines(host, className = 'sd-working') {
        const holder = node('div', '', 'sd-lines');
        host.append(holder);
        return values => {
            holder.replaceChildren(...values.filter(Boolean).map(text => node('p', text, className)));
        };
    }

    const hours = count => `${number(count)} hour${count === 1 ? '' : 's'}`;
    const repeat = (count, size, label) => Array.from({ length: count }, (_, index) => ({ size, label, tag: `${index + 1} h` }));

    // Builds a screen's picture once and returns paint(values), which only
    // changes widths and text, so the slider keeps focus while dragged.
    const pictures = [
        function twoCars(host) {
            const a = makeRoad(host, 'Car A: 120 km in 2 hours');
            const b = makeRoad(host, 'Car B: 150 km in 3 hours');
            const result = lines(host, 'sd-result');
            return ({ hours: time }) => {
                const aHours = Math.min(time, 2);
                a.set(repeat(aHours, 60, '60 km'), 150, {
                    road: 120,
                    noteText: time === 0 ? 'Not started' : `${aHours * 60} km so far${time > 2 ? '. Finished after 2 hours.' : ''}`
                });
                b.set(repeat(time, 50, '50 km'), 150, {
                    noteText: time === 0 ? 'Not started' : `${time * 50} km so far`
                });
                result([time === 3 ? screens[0].result : '']);
            };
        },
        function perHour(host) {
            const road = makeRoad(host);
            const working = lines(host);
            return ({ speed, hours: time }) => {
                road.set(repeat(time, speed, `${speed} km`), 500, {
                    road: speed * time, caption: `${speed} km/h for ${hours(time)}`,
                    noteText: `${speed} km in each hour`
                });
                working([`${speed} × ${time} = ${speed * time} km`]);
            };
        },
        function shareOut(host) {
            const road = makeRoad(host);
            const working = lines(host);
            return ({ distance, hours: time }) => {
                const each = number(distance / time);
                road.set(repeat(time, distance / time, `${each} km`), 300, {
                    road: distance, caption: `${distance} km in ${hours(time)}`,
                    noteText: `${distance} km shared between ${hours(time)}`
                });
                working([`${distance} ÷ ${time} = ${each} km/h`]);
            };
        },
        function howManyFit(host) {
            const road = makeRoad(host, '240 km to go');
            const working = lines(host);
            return ({ speed }) => {
                const count = 240 / speed;
                road.set(repeat(count, speed, `${speed} km`), 240, {
                    noteText: `${count} blocks of ${speed} km fit into 240 km`
                });
                working([`240 ÷ ${speed} = ${hours(count)}`]);
            };
        },
        function triangle(host, state, save) {
            const layout = node('div', '', 'sd-triangle-layout');
            const unit = node('div', '', 'sd-unit');
            unit.setAttribute('aria-label', 'km per hour means km divided by hours');
            const fraction = node('span', '', 'sd-fraction');
            fraction.append(node('span', 'km', 'sd-top'), node('span', 'h', 'sd-bottom'));
            unit.append(node('span', 'km/h', 'sd-chip'), node('span', '→', 'sd-arrow'), fraction);

            const drawing = svg('svg', { viewBox: '0 0 200 170', class: 'sd-triangle', role: 'img' });
            drawing.append(
                svg('polygon', { points: '100,8 192,162 8,162', fill: '#fff', stroke: '#233a59', 'stroke-width': '3', 'stroke-linejoin': 'round' }),
                svg('line', { x1: '54', y1: '95', x2: '146', y2: '95', stroke: '#233a59', 'stroke-width': '3' }),
                svg('line', { x1: '100', y1: '95', x2: '100', y2: '162', stroke: '#233a59', 'stroke-width': '3' }),
                svg('text', { x: '100', y: '138', class: 'sd-times' }, '×')
            );
            const spots = { D: [100, 72], S: [62, 140], T: [138, 140] };
            const covers = {};
            for (const [letter, [x, y]] of Object.entries(spots)) {
                drawing.append(svg('text', { x, y, class: `sd-letter sd-letter-${letter}` }, letter));
                covers[letter] = svg('circle', { cx: x, cy: y - 10, r: '19', class: 'sd-cover' });
                drawing.append(covers[letter]);
            }
            layout.append(unit, drawing);

            const buttons = node('div', '', 'sd-toggle');
            buttons.setAttribute('role', 'group');
            buttons.setAttribute('aria-label', 'Cover a letter');
            const names = { D: 'Distance', S: 'Speed', T: 'Time' };
            const pressers = Object.keys(spots).map(letter => {
                const button = node('button', `${letter}: ${names[letter]}`);
                button.type = 'button';
                button.dataset.letter = letter;
                buttons.append(button);
                return button;
            });
            host.append(layout, buttons);
            const working = lines(host);
            const how = node('p', '', 'sd-how');
            host.append(how);

            function paint() {
                const covered = state.cover;
                const info = screens[4].cover[covered];
                for (const [letter, circle] of Object.entries(covers)) circle.classList.toggle('is-covered', letter === covered);
                pressers.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.letter === covered)));
                drawing.setAttribute('aria-label', `Triangle with D on top, S and T underneath. ${names[covered]} is covered: ${info.rule}`);
                working([info.rule, info.example]);
                how.textContent = info.how;
            }
            pressers.forEach(button => button.addEventListener('click', () => {
                save(state => { state.cover = button.dataset.letter; });
                paint();
            }));
            return paint;
        },
        function minutes(host) {
            const bars = node('div', '', 'sd-hours');
            const cells = [];
            for (let hour = 0; hour < 3; hour++) {
                const bar = node('div', '', 'sd-hour');
                bar.append(node('span', `Hour ${hour + 1}`, 'sd-hour-name'));
                const row = node('div', '', 'sd-quarters');
                for (let quarter = 0; quarter < 4; quarter++) {
                    const cell = node('span', '', 'sd-quarter');
                    row.append(cell);
                    cells.push(cell);
                }
                bar.append(row);
                bars.append(bar);
            }
            bars.setAttribute('role', 'img');
            host.append(bars);
            const working = lines(host);
            const road = makeRoad(host, 'A bus at 48 km/h');
            const busWorking = lines(host);
            const speed = screens[5].busSpeed;
            return ({ minutes: total }) => {
                const filled = total / 15;
                cells.forEach((cell, index) => cell.classList.toggle('is-filled', index < filled));
                const whole = Math.floor(total / 60);
                const left = total % 60;
                const time = S.toHours(0, total);
                const spoken = `${total} minutes = ${whole ? hours(whole) : ''}${whole && left ? ' ' : ''}${left ? `${left} minutes` : ''}`;
                bars.setAttribute('aria-label', spoken);
                working([spoken, `${total} ÷ 60 = ${hours(time)}`]);
                const list = repeat(whole, speed, `${speed} km`);
                if (left) list.push({ size: speed * left / 60, label: `${number(speed * left / 60)} km`, tag: `${left} min`, part: true });
                road.set(list, speed * 3, {
                    road: speed * time, noteText: `${hours(time)} at 48 km/h`
                });
                busWorking([`48 × ${number(time)} = ${number(speed * time)} km`]);
            };
        },
        function threeSteps(host) {
            const screen = screens[6];
            host.append(node('p', screen.question, 'sd-question'));
            const list = node('ol', '', 'sd-steps');
            const items = screen.steps.map(step => {
                const item = node('li');
                item.append(node('strong', step.title), node('span', step.text, 'sd-step-text'));
                list.append(item);
                return item;
            });
            host.append(list);
            const result = lines(host, 'sd-result');
            return ({ step }) => {
                items.forEach((item, index) => {
                    item.classList.toggle('is-shown', index < step);
                    item.hidden = index >= step;
                });
                result([step === 3 ? screen.result : '']);
            };
        }
    ];

    function initialValues() {
        return screens.map(screen => Object.fromEntries((screen.sliders || []).map(slider => [slider.id, slider.start])));
    }

    async function mountLearn() {
        const root = node('article', '', 'sd-learn');
        document.getElementById('lesson-section-explanation').append(root);
        const api = window.Maths1to9Lesson;
        sectionEvent('explanation', 'gate');
        const section = await api.useSectionState('learn', {
            version: 1,
            initial: () => ({
                screen: 0, furthestScreen: 0, finished: false,
                values: initialValues(), cover: screens[4].start
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

        function makeSlider(slider, index) {
            const controls = node('label', '', 'sd-slider');
            const input = node('input');
            const output = node('output');
            const list = slider.values;
            const value = state.values[state.screen][slider.id];
            Object.assign(input, {
                type: 'range', id: `sd-slider-${state.screen + 1}-${index + 1}`,
                min: String(list ? 0 : slider.min), max: String(list ? list.length - 1 : slider.max),
                step: String(list ? 1 : slider.step), value: String(list ? list.indexOf(value) : value)
            });
            input.setAttribute('aria-label', slider.label);
            output.htmlFor = input.id;
            controls.append(node('span', slider.label), input, output);
            const read = () => list ? list[Number(input.value)] : Number(input.value);
            const show = () => {
                output.textContent = `${slider.label}: ${number(read())}${slider.unit || ''}`;
                input.setAttribute('aria-valuetext', output.textContent);
            };
            show();
            return { controls, input, read, show, id: slider.id };
        }

        function render() {
            root.replaceChildren();
            const screen = screens[state.screen];
            const heading = node('h3', screen.title);
            heading.dataset.screenHeading = '';
            root.append(heading);
            for (const line of screen.lines) root.append(node('p', line));
            if (screen.chips) {
                const chips = node('ul', '', 'sd-chips');
                for (const chip of screen.chips) chips.append(node('li', chip));
                root.append(chips);
            }
            const sliders = (screen.sliders || []).map(makeSlider);
            for (const slider of sliders) root.append(slider.controls);
            const picture = node('div', '', 'sd-picture');
            root.append(picture);
            const paint = pictures[state.screen](picture, state, change => section.update(change));
            const values = () => Object.fromEntries(sliders.map(slider => [slider.id, slider.read()]));
            for (const slider of sliders) {
                slider.input.addEventListener('input', () => {
                    section.update(state => { state.values[state.screen][slider.id] = slider.read(); });
                    slider.show();
                    paint(values());
                });
            }
            paint(values());
            if (screen.callout) root.append(node('p', screen.callout, 'sd-callout'));
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
            initial: () => ({ index: 0, screen: 0, furthestScreen: 0, finished: false, cards: {},
                seed: window.Maths1to9LessonEngine.randomInt(0, 4294967295) }),
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
                ...S.prepare(example, window.Maths1to9LessonEngine.seededRandom(state.seed + index)), sectionId: 'interactive', questionId: `example-${index + 1}`,
                scored: false, readOnly,
                onFeedback(result) {
                    reportProgress();
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
