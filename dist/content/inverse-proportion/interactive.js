(() => {
    'use strict';

    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;

    const S = window.InverseProportion;
    const screens = S.learnScreens;
    const examples = S.examples();
    const { number } = S;

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

    // Working lines are strings, or { text, tone } when a line needs a colour:
    // blue for the total job, green for the answer.
    function lines(host) {
        const holder = node('div', '', 'ip-lines');
        host.append(holder);
        return values => {
            holder.replaceChildren(...values.filter(Boolean).map(entry => {
                const { text, tone = '' } = typeof entry === 'string' ? { text: entry } : entry;
                return node('p', text, `ip-working ${tone}`.trim());
            }));
        };
    }

    // A rectangle of squares. Each square is one worker for one hour. The number
    // of squares never changes: set() only moves them, so the slider keeps focus
    // while it is dragged.
    function makeSquares(host, total) {
        const wrap = node('div', '', 'ip-rect');
        const heightSide = node('div', '', 'ip-height-side');
        const heightLabel = node('p', '', 'ip-height-label');
        const heightBadge = node('span', '', 'ip-badge');
        heightSide.append(heightLabel, heightBadge);
        const box = node('div', '', 'ip-box');
        const widthLabel = node('p', '', 'ip-width-label');
        const widthBadge = node('span', '', 'ip-badge');
        const widthSide = node('div', '', 'ip-width-side');
        widthSide.append(widthLabel, widthBadge);
        wrap.append(heightSide, box, widthSide);
        host.append(wrap);

        const squares = [];
        for (let index = 0; index < total; index++) {
            const square = node('span', '', 'ip-square');
            box.append(square);
            squares.push(square);
        }
        return {
            wrap,
            // set({ width, height, colour, widthText, heightText, widthBadge, heightBadge })
            set(settings) {
                const width = settings.width;
                const height = settings.height;
                if (width * height !== total) throw new Error(`A ${width} × ${height} rectangle cannot hold ${total} squares`);
                box.style.setProperty('--cols', String(width));
                box.style.setProperty('--rows', String(height));
                squares.forEach((square, index) => {
                    square.style.setProperty('--col', String(index % width));
                    square.style.setProperty('--row', String(Math.floor(index / width)));
                    square.classList.toggle('ip-square-grey', settings.colour === 'grey');
                    square.classList.toggle('ip-square-blue', settings.colour === 'blue');
                    square.classList.toggle('ip-square-green', settings.colour === 'green');
                });
                widthLabel.textContent = settings.widthText || '';
                heightLabel.textContent = settings.heightText || '';
                widthBadge.textContent = settings.widthBadge || '';
                widthBadge.hidden = !settings.widthBadge;
                heightBadge.textContent = settings.heightBadge || '';
                heightBadge.hidden = !settings.heightBadge;
                box.setAttribute('aria-label', [settings.heightText, settings.widthText].filter(Boolean).join(' by '));
            }
        };
    }

    // The pizza: 12 slices dealt onto plates. Each slice slides to its plate.
    function makePizza(host) {
        const figure = node('figure', '', 'ip-pizza');
        const disc = node('div', '', 'ip-disc');
        disc.setAttribute('role', 'img');
        disc.setAttribute('aria-label', 'A pizza with 12 slices');
        const pizzaSlots = [];
        for (let index = 0; index < 12; index++) {
            const slot = node('span', '', 'ip-pizza-slot');
            const angle = (index / 12) * Math.PI * 2 - Math.PI / 2;
            slot.style.left = `${66 + 46 * Math.cos(angle)}px`;
            slot.style.top = `${66 + 46 * Math.sin(angle)}px`;
            disc.append(slot);
            pizzaSlots.push(slot);
        }
        const caption = node('p', '12 slices', 'ip-pizza-caption');
        const plates = node('div', '', 'ip-plates');
        figure.append(disc, caption, plates);
        host.append(figure);

        const chips = [];
        for (let index = 0; index < 12; index++) {
            const chip = node('span', '', 'ip-chip ip-chip-static');
            figure.append(chip);
            chips.push(chip);
        }

        function place(chip, slot) {
            const origin = figure.getBoundingClientRect();
            const target = slot.getBoundingClientRect();
            const left = target.left - origin.left + (target.width - 12) / 2;
            const top = target.top - origin.top + (target.height - 12) / 2;
            chip.style.left = `${left}px`;
            chip.style.top = `${top}px`;
        }

        // Line the slices up on the pizza while the plates are still empty.
        requestAnimationFrame(() => {
            const origin = figure.getBoundingClientRect();
            chips.forEach((chip, index) => {
                const target = pizzaSlots[index].getBoundingClientRect();
                chip.style.left = `${target.left - origin.left + (target.width - 12) / 2}px`;
                chip.style.top = `${target.top - origin.top + (target.height - 12) / 2}px`;
                chip.classList.remove('ip-chip-static');
            });
        });

        return count => {
            plates.replaceChildren();
            const base = Math.floor(12 / count);
            const extra = 12 % count;
            const slots = [];
            for (let plateIndex = 0; plateIndex < count; plateIndex++) {
                const plate = node('div', '', 'ip-plate');
                const size = base + (plateIndex < extra ? 1 : 0);
                for (let slice = 0; slice < size; slice++) {
                    const slot = node('span', '', 'ip-slot');
                    plate.append(slot);
                    slots.push(slot);
                }
                plates.append(plate);
            }
            requestAnimationFrame(() => {
                chips.forEach((chip, index) => {
                    if (index < slots.length) {
                        chip.hidden = false;
                        place(chip, slots[index]);
                    } else {
                        chip.hidden = true;
                    }
                });
            });
        };
    }

    // One bar, measured against a scale, for screen 7.
    function makeBar(host, caption) {
        const figure = node('figure', '', 'ip-bar');
        const title = node('figcaption', caption);
        const track = node('div', '', 'ip-track');
        const fill = node('span', '', 'ip-fill');
        const note = node('p', '', 'ip-note');
        track.append(fill);
        figure.append(title, track, note);
        host.append(figure);
        return {
            figure,
            set({ scale, value, label, colour = 'green' }) {
                const share = scale > 0 ? Math.min(value / scale, 1) * 100 : 0;
                fill.style.width = `${share}%`;
                fill.classList.toggle('ip-fill-grey', colour === 'grey');
                fill.classList.toggle('ip-fill-green', colour === 'green');
                fill.textContent = '';
                note.textContent = label;
                track.setAttribute('aria-label', `${caption}: ${label}`);
            }
        };
    }

    // Learn 3's table: the total column is blue, and rows appear as the slider moves.
    function makeTable(host, rows) {
        const table = node('table', '', 'ip-table');
        const head = node('tr');
        const headers = ['Builders', 'Hours', 'Builders × hours'];
        headers.forEach((text, index) => {
            const cell = node('th', text);
            cell.scope = 'col';
            if (index === 2) cell.className = 'ip-blue';
            head.append(cell);
        });
        const headRow = node('thead');
        headRow.append(head);
        const body = node('tbody');
        const rowElements = rows.map(row => {
            const element = node('tr');
            const builders = node('td', String(row.builders));
            const hours = node('td', String(row.hours));
            const total = node('td', String(row.builders * row.hours), 'ip-blue');
            element.append(builders, hours, total);
            body.append(element);
            return element;
        });
        table.append(headRow, body);
        host.append(table);
        return shown => {
            rowElements.forEach((row, index) => { row.hidden = index >= shown; });
        };
    }

    function makeSteps(host, steps, extra) {
        const list = node('ol', '', 'ip-steps');
        const tones = ['ip-grey', 'ip-blue', 'ip-green', 'ip-grey'];
        const items = steps.map((step, index) => {
            const item = node('li', '', `ip-step ${tones[index % tones.length]}`);
            item.append(node('strong', step.title), document.createTextNode(` ${step.text}`));
            list.append(item);
            return item;
        });
        host.append(list);
        const check = extra ? node('p', extra, 'ip-check') : null;
        if (check) host.append(check);
        return shown => {
            items.forEach((item, index) => { item.hidden = index + 1 > shown; });
            if (check) check.hidden = shown < steps.length;
        };
    }

    // Every screen builds its picture once and returns paint(value), which only
    // changes positions, sizes, colours and text.
    const builders = host => {
        const rectangles = makeSquares(host, 12);
        const working = lines(host);
        return count => {
            const hours = 12 / count;
            rectangles.set({
                width: count, height: hours, colour: 'blue',
                widthText: `${count} ${count === 1 ? 'builder' : 'builders'}`,
                heightText: `${hours} ${hours === 1 ? 'hour' : 'hours'}`
            });
            const who = count === 1 ? 'builder takes' : 'builders take';
            working([{ text: `${count} ${who} 12 ÷ ${count} = ${number(hours)} hours`, tone: 'ip-green' }]);
        };
    };

    const pictures = [
        // 1. Share a pizza.
        function pizza(host) {
            const deal = makePizza(host);
            const working = lines(host);
            return count => {
                deal(count);
                working([{ text: `12 ÷ ${count} = ${number(12 / count)} slices each`, tone: 'ip-green' }]);
            };
        },
        // 2. More builders, fewer hours.
        builders,
        // 3. The total never changes.
        function totals(host, screen) {
            const shown = makeTable(host, screen.table);
            const rectangles = makeSquares(host, 12);
            return count => {
                const row = screen.table[count - 1];
                shown(count);
                rectangles.set({
                    width: row.builders, height: row.hours, colour: 'blue',
                    widthText: `${row.builders} ${row.builders === 1 ? 'builder' : 'builders'}`,
                    heightText: `${row.hours} ${row.hours === 1 ? 'hour' : 'hours'}`
                });
            };
        },
        // 4. Double one, halve the other.
        function doubleHalve(host) {
            const rectangles = makeSquares(host, 12);
            const working = lines(host);
            return count => {
                const times = count / 2;
                const hours = 12 / count;
                rectangles.set({
                    width: count, height: hours, colour: 'blue',
                    widthText: `${count} builders`,
                    heightText: `${hours} ${hours === 1 ? 'hour' : 'hours'}`,
                    widthBadge: times === 1 ? '' : `× ${number(times)}`,
                    heightBadge: times === 1 ? '' : `÷ ${number(times)}`
                });
                working([
                    { text: `2 × ${number(times)} = ${count} builders`, tone: 'ip-blue' },
                    { text: `6 ÷ ${number(times)} = ${hours} hours`, tone: 'ip-green' }
                ]);
            };
        },
        // 5. Find the total, then share it.
        function findTotal(host, screen) {
            const givenTag = node('p', '', 'ip-tag');
            host.append(givenTag);
            const given = makeSquares(host, 24);
            const blueTag = node('p', '', 'ip-total-tag');
            host.append(blueTag);
            const blueLine = lines(host);
            const answer = makeSquares(host, 24);
            const greenLine = lines(host);
            return count => {
                const total = 24;
                const hours = total / count;
                given.set({
                    width: screen.given.count, height: screen.given.hours, colour: 'grey',
                    widthText: `${screen.given.count} painters`,
                    heightText: `${screen.given.hours} hours`
                });
                givenTag.textContent = `${screen.given.count} painters: ${screen.given.hours} hours`;
                blueTag.textContent = `${total} painter-hours`;
                answer.set({
                    width: count, height: hours, colour: 'green',
                    widthText: `${count} painters`,
                    heightText: `${hours} hours`
                });
                blueLine([{ text: `${screen.given.count} × ${screen.given.hours} = ${total}`, tone: 'ip-blue' }]);
                greenLine([{ text: `${total} ÷ ${count} = ${number(hours)} hours`, tone: 'ip-green' }]);
            };
        },
        // 6. It isn't direct proportion.
        function notDirect(host, screen) {
            const tag = node('p', '', 'ip-tag');
            host.append(tag);
            const rectangles = makeSquares(host, 24);
            const working = lines(host);
            const callout = node('p', screen.callout, 'ip-callout');
            callout.hidden = true;
            host.append(callout);
            const stepLines = screen.steps.map(step => step.text);
            return step => {
                const final = step >= 3;
                tag.textContent = final ? '3 cleaners: 8 hours' : '6 cleaners: 4 hours';
                rectangles.set(final
                    ? { width: 3, height: 8, colour: 'green', widthText: '3 cleaners', heightText: '8 hours' }
                    : { width: 6, height: 4, colour: 'grey', widthText: '6 cleaners', heightText: '4 hours' });
                working([
                    { text: stepLines[0], tone: '' },
                    step >= 2 ? { text: stepLines[1], tone: 'ip-blue' } : '',
                    final ? { text: stepLines[2], tone: 'ip-green' } : ''
                ]);
                callout.hidden = !final;
            };
        },
        // 7. Does more help?
        function doesMoreHelp(host) {
            const bars = node('div', '', 'ip-bars');
            host.append(bars);
            const wall = makeBar(bars, 'Builders on the wall');
            const egg = makeBar(bars, 'Chefs boiling an egg');
            const working = lines(host);
            return people => {
                const hours = 12 / people;
                wall.set({ scale: 12, value: hours, label: `${number(hours)} hours`, colour: 'green' });
                egg.set({ scale: 10, value: 10, label: '10 minutes', colour: 'grey' });
                working([
                    { text: `${people} ${people === 1 ? 'builder' : 'builders'} × ${number(hours)} ${hours === 1 ? 'hour' : 'hours'} = 12`, tone: 'ip-green' },
                    { text: `${people} ${people === 1 ? 'chef' : 'chefs'} × 10 minutes = ${people * 10}`, tone: 'ip-grey' }
                ]);
            };
        },
        // 8. Four steps, every time.
        function fourSteps(host, screen) {
            const showSteps = makeSteps(host, screen.steps, screen.check);
            return step => showSteps(step);
        }
    ];

    async function mountLearn() {
        const root = node('article', '', 'ip-learn');
        document.getElementById('lesson-section-explanation').append(root);
        const api = window.Maths1to9Lesson;
        sectionEvent('explanation', 'gate');
        const section = await api.useSectionState('learn', {
            version: 1,
            initial: () => ({
                screen: 0, furthestScreen: 0, finished: false,
                sliders: screens.map(screen => Math.max(0, screen.values.indexOf(screen.start)))
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
            if (screen.question) root.append(node('p', screen.question, 'ip-question'));
            for (const line of screen.lines) root.append(node('p', line));

            if (screen.values) {
                const controls = node('label', '', 'ip-slider');
                const slider = node('input');
                const output = node('output');
                Object.assign(slider, {
                    type: 'range', min: '0', max: String(screen.values.length - 1), step: '1',
                    value: String(state.sliders[state.screen]), id: `ip-slider-${state.screen + 1}`
                });
                slider.setAttribute('aria-label', screen.slider);
                output.htmlFor = slider.id;
                controls.append(node('span', screen.slider), slider, output);
                const picture = node('div', '', 'ip-picture');
                const paint = pictures[state.screen](picture, screen);
                root.append(controls, picture);
                function update() {
                    const value = screen.values[Number(slider.value)] ?? screen.values[0];
                    output.textContent = `${screen.slider}: ${number(value)}`;
                    paint(value);
                }
                slider.addEventListener('input', () => {
                    section.update(state => { state.sliders[state.screen] = Number(slider.value); });
                    update();
                });
                update();
            } else {
                const picture = node('div', '', 'ip-picture');
                root.append(picture);
            }

            if (screen.callout) {
                const callout = root.querySelector('.ip-callout');
                if (!callout) root.append(node('p', screen.callout, 'ip-callout'));
            }
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
