(() => {
    'use strict';

    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;

    const S = window.DensityAndPressure;
    const screens = S.learnScreens;
    const examples = S.examples();
    const { number } = S;
    const SVG = 'http://www.w3.org/2000/svg';
    const MAX_CUBES = 12;
    const MAX_PIECES = 48;
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

    function svg(tag, attributes = {}, text = '') {
        const element = document.createElementNS(SVG, tag);
        for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
        if (text) element.textContent = text;
        return element;
    }

    function lines(host, className = 'dp-working') {
        const holder = node('div', '', 'dp-lines');
        host.append(holder);
        return values => {
            holder.replaceChildren(...values.filter(Boolean).map(text => node('p', text, className)));
        };
    }

    // A tray of 1 cm³ cubes in rows of up to 6, each labelled with its mass.
    // Labels go on the cubes when they fit, or once above the tray. With
    // eachLine the "X g in each cm³" line always sits above the tray too.
    function makeTray(host, tone, caption = '', eachLine = false) {
        const figure = node('figure', '', `dp-tray dp-tray-${tone}`);
        const title = node('figcaption', caption, 'dp-tray-name');
        const above = node('p', '', 'dp-above');
        const grid = node('div', '', 'dp-blocks');
        grid.setAttribute('role', 'img');
        const total = node('p', '', 'dp-total');
        const cubes = [];
        for (let index = 0; index < MAX_CUBES; index++) {
            const cube = node('span', '', 'dp-cube');
            const mass = node('span', '', 'dp-cube-mass');
            cube.append(mass);
            grid.append(cube);
            cubes.push({ cube, mass });
        }
        figure.append(title, above, grid, total);
        host.append(figure);

        function fit(count, label, tries = 10) {
            const width = grid.clientWidth;
            if (!width && tries > 0) {
                requestAnimationFrame(() => fit(count, label, tries - 1));
                return;
            }
            const columns = Math.min(6, Math.max(1, count));
            const cell = (width - (columns - 1) * 6) / columns;
            const shown = cell >= label.length * 7.4 + 10;
            cubes.forEach(({ cube, mass }) => {
                if (cube.hidden) return;
                mass.textContent = shown ? label : '';
                cube.classList.toggle('is-bare', !shown);
            });
            above.textContent = eachLine || !shown ? `${label} in each cm³` : '';
        }

        return {
            figure,
            // count cubes, each holding `each` grams, with the total under them.
            set(count, each, totalText) {
                const columns = Math.min(6, Math.max(1, count));
                grid.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
                const label = `${number(each)} g`;
                cubes.forEach(({ cube, mass }, index) => {
                    cube.hidden = index >= count;
                    mass.textContent = label;
                });
                grid.setAttribute('aria-label', `${count} cm³, each holding ${label}`);
                total.textContent = totalText;
                above.textContent = '';
                fit(count, label);
            }
        };
    }

    // Builds a screen's picture once and returns paint(values), which only
    // changes sizes and text, so the slider keeps focus while dragged.
    const pictures = [
        function twoTrays(host) {
            const row = node('div', '', 'dp-trays');
            host.append(row);                const wood = makeTray(row, 'wood', 'Wood', true);
                const metal = makeTray(row, 'metal', 'Metal', true);
            const result = lines(host, 'dp-result');
            return ({ volume }) => {
                wood.set(volume, 0.5, `Wood: ${volume} × 0.5 = ${number(0.5 * volume)} g`);
                metal.set(volume, 8, `Metal: ${volume} × 8 = ${number(8 * volume)} g`);
                result([screens[0].result]);
            };
        },
        function oneTray(host) {
            const tray = makeTray(host, 'stone');
            const working = lines(host);
            return ({ density, volume }) => {
                tray.set(volume, density, '');
                working([`${number(density)} × ${volume} = ${number(density * volume)} g`]);
            };
        },
        function shareOut(host) {
            const figure = node('figure', '', 'dp-share');
            const bar = node('div', '', 'dp-share-bar');
            bar.setAttribute('role', 'img');
            const cells = [];
            for (let index = 0; index < MAX_CUBES; index++) {
                const cell = node('span', '', 'dp-share-cell');
                bar.append(cell);
                cells.push(cell);
            }
            const whole = node('span', '', 'dp-share-whole');
            bar.append(whole);
            const caption = node('figcaption', '', 'dp-note');
            figure.append(caption, bar);
            host.append(figure);
            const working = lines(host);
            let timer;
            return ({ mass, volume }) => {
                const each = mass / volume;
                bar.style.gridTemplateColumns = `repeat(${volume}, minmax(0, 1fr))`;
                cells.forEach((cell, index) => {
                    cell.hidden = index >= volume;
                    cell.textContent = `${number(each)} g`;
                });
                whole.textContent = `${number(mass)} g`;
                bar.setAttribute('aria-label', `${number(mass)} g shared between ${volume} cm³, ${number(each)} g in each cm³`);
                caption.textContent = `${number(mass)} g shared between ${volume} cm³`;
                working([`${number(mass)} ÷ ${volume} = ${number(each)} g/cm³`]);
                clearTimeout(timer);
                bar.classList.add('is-whole');
                if (reduceMotion) bar.classList.remove('is-whole');
                else timer = setTimeout(() => bar.classList.remove('is-whole'), 500);
            };
        },
        function countOut(host) {
            const figure = node('figure', '', 'dp-out');
            const track = node('div', '', 'dp-out-track');
            track.setAttribute('role', 'img');
            const cells = [];
            for (let index = 0; index < MAX_PIECES; index++) {
                const cell = node('span', '', 'dp-out-cell');
                track.append(cell);
                cells.push(cell);
            }
            const note = node('figcaption', '', 'dp-note');
            figure.append(track, note);
            host.append(figure);
            const working = lines(host);
            let timer;
            return ({ density }) => {
                const mass = screens[3].mass;
                const count = Math.round(mass / density);
                cells.forEach((cell, index) => {
                    cell.hidden = index >= count;
                    cell.style.flex = `0 0 ${100 / count}%`;
                    cell.classList.remove('is-out');
                });
                track.setAttribute('aria-label', `${count} pieces of ${number(density)} g make ${number(mass)} g`);
                note.textContent = `${count} pieces of ${number(density)} g make ${number(mass)} g`;
                working([`${number(mass)} ÷ ${number(density)} = ${count} cm³`]);
                clearInterval(timer);
                if (reduceMotion) {
                    cells.forEach(cell => cell.classList.add('is-out'));
                    return;
                }
                let shown = 0;
                cells.forEach(cell => cell.classList.remove('is-out'));
                timer = setInterval(() => {
                    shown++;
                    if (shown > count) {
                        clearInterval(timer);
                        return;
                    }
                    cells.forEach((cell, index) => {
                        if (index < shown) cell.classList.add('is-out');
                    });
                }, Math.max(10, Math.min(150, 400 / count)));
            };
        },
        function densityTriangle(host, state, save) {
            return triangle(host, screens[4], state, save);
        },
        function bags(host) {
            const row = node('div', '', 'dp-bags');
            row.setAttribute('role', 'img');
            const cells = [];
            for (let bag = 1; bag <= 3; bag++) {
                const box = node('div', '', 'dp-bag');
                box.append(node('span', `${bag} kg`, 'dp-bag-name'));
                const parts = node('div', '', 'dp-parts');
                for (let part = 0; part < 10; part++) {
                    const cell = node('span', '', 'dp-part');
                    parts.append(cell);
                    cells.push(cell);
                }
                box.append(parts);
                row.append(box);
            }
            const caption = node('p', '', 'dp-note');
            caption.textContent = 'Each bag is 1 kg, split into 10 parts of 100 g.';
            host.append(row, caption);
            const working = lines(host);
            return ({ mass }) => {
                const grams = mass * 1000;
                const density = screens[5].density;
                const filled = Math.round(grams / 100);
                cells.forEach((cell, index) => cell.classList.toggle('is-filled', index < filled));
                row.setAttribute('aria-label', `${number(mass)} kg is ${number(grams)} g`);
                working([
                    `${number(mass)} kg = ${number(mass)} × 1000 = ${number(grams)} g`,
                    `Density: ${number(density)} g/cm³`,
                    `${number(grams)} ÷ ${number(density)} = ${number(grams / density)} cm³`
                ]);
            };
        },
        function pressure(host) {
            const screen = screens[6];
            const scene = svg('svg', { viewBox: '0 0 400 180', class: 'dp-snow', role: 'img' });
            scene.append(svg('rect', { x: '0', y: '110', width: '400', height: '70', fill: '#dceefb' }));
            const dent = svg('path', { fill: '#b7d7f2' });
            const bar = svg('rect', { y: '102', height: '12', rx: '5', fill: '#3a4a5c' });
            const leftLeg = svg('line', { stroke: '#3a4a5c', 'stroke-width': '7', 'stroke-linecap': 'round' });
            const rightLeg = svg('line', { stroke: '#3a4a5c', 'stroke-width': '7', 'stroke-linecap': 'round' });
            const body = svg('line', { x1: '200', y1: '66', x2: '200', y2: '42', stroke: '#3a4a5c', 'stroke-width': '9', 'stroke-linecap': 'round' });
            const leftArm = svg('line', { x1: '200', y1: '52', x2: '182', y2: '68', stroke: '#3a4a5c', 'stroke-width': '6', 'stroke-linecap': 'round' });
            const rightArm = svg('line', { x1: '200', y1: '52', x2: '218', y2: '68', stroke: '#3a4a5c', 'stroke-width': '6', 'stroke-linecap': 'round' });
            const head = svg('circle', { cx: '200', cy: '32', r: '11', fill: '#3a4a5c' });
            const arrow = svg('polygon', { points: '200,19 193,6 207,6', fill: '#6b3fa0' });
            const arrowLine = svg('line', { x1: '200', y1: '0', x2: '200', y2: '8', stroke: '#6b3fa0', 'stroke-width': '4' });
            const forceLabel = svg('text', { x: '214', y: '14', class: 'dp-force-label' }, `${screen.force} N`);
            scene.append(dent, bar, leftLeg, rightLeg, body, leftArm, rightArm, head, arrowLine, arrow, forceLabel);
            const feetRow = node('div', '', 'dp-feet');
            for (const note of screen.sliderNotes) feetRow.append(node('span', note.text, 'dp-feet-name'));
            host.append(scene, feetRow);
            const working = lines(host);

            return ({ area }) => {
                const pressure = screen.force / area;
                const width = 40 + (area - 0.05) / 0.25 * 200;
                const depth = 4 + 30 * (pressure / 12000);
                const left = 200 - width / 2;
                const right = 200 + width / 2;
                dent.setAttribute('d', `M ${left - 6} 110 Q 200 ${110 + depth * 2} ${right + 6} 110 Z`);
                bar.setAttribute('x', String(left));
                bar.setAttribute('width', String(width));
                leftLeg.setAttribute('x1', '194');
                leftLeg.setAttribute('y1', '66');
                leftLeg.setAttribute('x2', String(left + 14));
                leftLeg.setAttribute('y2', '102');
                rightLeg.setAttribute('x1', '206');
                rightLeg.setAttribute('y1', '66');
                rightLeg.setAttribute('x2', String(right - 14));
                rightLeg.setAttribute('y2', '102');
                scene.setAttribute('aria-label', `A person standing on snow. The area touching the snow is ${number(area)} m², so the pressure is ${number(pressure)} N/m²`);
                working([`${number(screen.force)} ÷ ${number(area)} = ${number(pressure)} N/m²`]);
            };
        },
        function pressureTriangle(host, state, save) {
            return triangle(host, screens[7], state, save);
        }
    ];

    // The triangle, built from the unit. Tap a letter to cover it.
    function triangle(host, screen, state, save) {
        const key = screen.key;
        const layout = node('div', '', 'dp-triangle-layout');
        const unit = node('div', '', 'dp-unit');
        unit.setAttribute('aria-label', `The unit: ${screen.unit.label}`);
        const fraction = node('span', '', 'dp-fraction');
        fraction.append(node('span', screen.unit.top, 'dp-top'), node('span', screen.unit.bottom, 'dp-bottom'));
        unit.append(node('span', screen.unit.chip, 'dp-chip'), node('span', '→', 'dp-arrow'), fraction);

        const drawing = svg('svg', { viewBox: '0 0 200 170', class: 'dp-triangle', role: 'img' });
        drawing.append(
            svg('polygon', { points: '100,8 192,162 8,162', fill: '#fff', stroke: '#233a59', 'stroke-width': '3', 'stroke-linejoin': 'round' }),
            svg('line', { x1: '54', y1: '95', x2: '146', y2: '95', stroke: '#233a59', 'stroke-width': '3' }),
            svg('line', { x1: '100', y1: '95', x2: '100', y2: '162', stroke: '#233a59', 'stroke-width': '3' }),
            svg('text', { x: '100', y: '138', class: 'dp-times' }, '×')
        );
        const letters = Object.keys(screen.names);
        const order = ['top', 'left', 'right'];
        const spots = {};
        const positions = { top: [100, 72], left: [62, 140], right: [138, 140] };
        letters.forEach((letter, index) => { spots[letter] = positions[order[index]]; });
        const covers = {};
        for (const letter of letters) {
            const [x, y] = spots[letter];
            drawing.append(svg('text', { x, y, class: `dp-letter dp-letter-${letter}` }, letter));
            covers[letter] = svg('circle', { cx: x, cy: y - 10, r: '19', class: 'dp-cover' });
            drawing.append(covers[letter]);
        }
        layout.append(unit, drawing);

        const buttons = node('div', '', 'dp-toggle');
        buttons.setAttribute('role', 'group');
        buttons.setAttribute('aria-label', 'Cover a letter');
        const pressers = letters.map(letter => {
            const button = node('button', `${letter}: ${screen.names[letter]}`);
            button.type = 'button';
            button.dataset.letter = letter;
            buttons.append(button);
            return button;
        });
        host.append(layout, buttons);
        const working = lines(host);
        const how = node('p', '', 'dp-how');
        host.append(how);

        function paint() {
            const covered = state.covers[key];
            const info = screen.cover[covered];
            for (const letter of letters) covers[letter].classList.toggle('is-covered', letter === covered);
            pressers.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.letter === covered)));
            drawing.setAttribute('aria-label',
                `Triangle with ${letters[0]} on top, ${letters[1]} and ${letters[2]} underneath. ${screen.names[covered]} is covered: ${info.rule}`);
            working([info.rule, info.example]);
            how.textContent = info.how;
        }
        pressers.forEach(button => button.addEventListener('click', () => {
            save(state => { state.covers[key] = button.dataset.letter; });
            paint();
        }));
        return paint;
    }

    function initialValues() {
        return screens.map(screen => Object.fromEntries((screen.sliders || []).map(slider => [slider.id, slider.start])));
    }

    async function mountLearn() {
        const root = node('article', '', 'dp-learn');
        document.getElementById('lesson-section-explanation').append(root);
        const api = window.Maths1to9Lesson;
        sectionEvent('explanation', 'gate');
        const section = await api.useSectionState('learn', {
            version: 1,
            initial: () => ({
                screen: 0, furthestScreen: 0, finished: false,
                values: initialValues(),
                covers: { density: screens[4].start, pressure: screens[7].start }
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
            const controls = node('label', '', 'dp-slider');
            const input = node('input');
            const output = node('output');
            const list = slider.values;
            const value = state.values[state.screen][slider.id];
            Object.assign(input, {
                type: 'range', id: `dp-slider-${state.screen + 1}-${index + 1}`,
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
                const chips = node('ul', '', 'dp-chips');
                for (const chip of screen.chips) chips.append(node('li', chip));
                root.append(chips);
            }
            const sliders = (screen.sliders || []).map(makeSlider);
            for (const slider of sliders) root.append(slider.controls);
            const picture = node('div', '', 'dp-picture');
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
            if (screen.callout) root.append(node('p', screen.callout, 'dp-callout'));
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
            version: 2,
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
            const card = state.cards[`example-${state.index + 1}`];
            const completed = state.finished ? examples.length : state.index + Number(card?.correct === true);
            api.setSectionProgress('interactive', completed, examples.length);
        }

        const lastScreen = examples.length - 1;

        // After the last example the pupil goes straight on to Practice:
        // there is no review screen.
        function goToPractice() {
            api.completeSection('interactive');
            api.continueSection();
        }

        function continueExample() {
            section.update(state => {
                state.index++;
                state.screen = Math.min(state.index, lastScreen);
                state.furthestScreen = state.screen;
                state.finished = state.index === examples.length;
            });
            render();
            if (state.finished) goToPractice();
        }

        function drawExample(container, index, readOnly) {
            const example = examples[index];
            const cardRoot = document.createElement('div');
            container.append(cardRoot);
            api.createQuestion(cardRoot, {
                ...S.prepare(example, window.Maths1to9LessonEngine.seededRandom(state.seed + index)),
                sectionId: 'interactive', questionId: `example-${index + 1}`,
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
            heading.textContent = `Example ${state.screen + 1}`;
            root.append(heading);
            api.setSectionBack('interactive', state.screen > 0 ? {
                onClick: () => showScreen(state.screen - 1)
            } : null);
            if (state.finished) sectionEvent('interactive', 'complete');
            const readOnly = state.screen < state.index;
            drawExample(root, state.screen, readOnly);
            if (readOnly) api.setSectionAction('interactive', {
                label: 'Next', onClick: () => state.screen === lastScreen ? goToPractice() : showScreen(state.screen + 1)
            });
            syncHash();
        }

        for (let index = 0; index < examples.length; index++) {
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
        const requested = Array.from({ length: examples.length }, (_, index) => index)
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
