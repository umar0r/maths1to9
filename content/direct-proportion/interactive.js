(() => {
    'use strict';

    const SLUG = document.body.dataset.lessonId;
    const initialHash = window.location.hash;

    const S = window.DirectProportion;
    const screens = S.learnScreens;
    const examples = S.examples();
    const { number, money } = S;

    // Working lines write money in pounds when the spec spells them that way.
    const pounds = pence => `£${(pence / 100).toFixed(2)}`;
    // Whole pounds stay short (£3), part pounds keep 2 decimal places (£3.50).
    const cash = value => Number.isInteger(value) ? `£${value}` : `£${value.toFixed(2)}`;

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

    // One hidden span measures how wide a label is, so text only goes into a
    // tile or a bar part when it really fits.
    let ruler = null;
    function measure(text, className) {
        if (!ruler) {
            ruler = node('span', '', 'dp-ruler');
            document.body.append(ruler);
        }
        ruler.className = `dp-ruler ${className}`;
        ruler.textContent = text;
        return ruler.getBoundingClientRect().width;
    }

    // A row of square tiles, one per item. set() only adds, removes, recolours
    // and relabels, so the slider keeps focus while it is dragged.
    function makeTiles(host, caption = '') {
        const figure = node('figure', '', 'dp-tiles');
        const tag = node('p', '', 'dp-tag');
        const each = node('p', '', 'dp-each');
        const row = node('div', '', 'dp-tile-row');
        row.setAttribute('role', 'img');
        const captionEl = node('figcaption', caption);
        figure.append(tag, each, row, captionEl);
        host.append(figure);

        let tiles = [];
        let settings = { count: 0, colour: 'blue', label: '', tag: '' };
        let shown = true;

        function paintTile(tile) {
            tile.classList.toggle('dp-tile-grey', settings.colour === 'grey');
            tile.classList.toggle('dp-tile-blue', settings.colour === 'blue');
            tile.classList.toggle('dp-tile-green', settings.colour === 'green');
        }

        function labels(tries = 10) {
            const label = settings.label;
            if (!label) {
                each.textContent = '';
                for (const tile of tiles) tile.textContent = '';
                return;
            }
            const width = tiles[0]?.clientWidth || 0;
            if (!width && tries > 0) {
                requestAnimationFrame(() => labels(tries - 1));
                return;
            }
            const fits = width > 0 && measure(label, 'dp-tile-measure') + 6 <= width;
            each.textContent = fits ? '' : `${label} each`;
            for (const tile of tiles) tile.textContent = fits ? label : '';
        }

        function sync() {
            if (!shown) return;
            while (tiles.length > settings.count) {
                const tile = tiles.pop();
                tile.classList.add('dp-tile-gone');
                setTimeout(() => tile.remove(), 300);
            }
            while (tiles.length < settings.count) {
                const tile = node('span', '', 'dp-tile dp-tile-enter');
                paintTile(tile);
                row.append(tile);
                tiles.push(tile);
                requestAnimationFrame(() => tile.classList.remove('dp-tile-enter'));
            }
            for (const tile of tiles) paintTile(tile);
            labels();
        }

        return {
            figure,
            set(values) {
                settings = { ...settings, ...values };
                tag.textContent = settings.tag;
                captionEl.hidden = !caption;
                row.setAttribute('aria-label', `${settings.tag} ${settings.label ? `, ${settings.label} each` : ''}`.trim());
                sync();
            },
            show(visible) {
                shown = visible;
                figure.hidden = !visible;
                if (visible) {
                    sync();
                } else {
                    for (const tile of tiles) tile.remove();
                    tiles = [];
                }
            }
        };
    }

    // A bar with a grey part and a green part, measured against `scale`.
    function makeBar(host, caption = '', withBadge = false) {
        const figure = node('figure', '', 'dp-bar');
        const title = node('figcaption', caption);
        const head = node('div', '', 'dp-bar-head');
        const track = node('div', '', 'dp-track');
        track.setAttribute('role', 'img');
        const greyPart = node('span', '', 'dp-part dp-part-grey');
        const greenPart = node('span', '', 'dp-part dp-part-green');
        const note = node('p', '', 'dp-note');
        track.append(greyPart, greenPart);
        head.append(track);
        const badge = withBadge ? node('span', '', 'dp-badge') : null;
        if (badge) head.append(badge);
        figure.append(title, head, note);
        host.append(figure);

        function paintLabel(label, green, scale, tries = 10) {
            if (!label) {
                greenPart.textContent = '';
                note.textContent = '';
                return;
            }
            const width = track.clientWidth;
            if (!width && tries > 0) {
                requestAnimationFrame(() => paintLabel(label, green, scale, tries - 1));
                return;
            }
            const room = scale > 0 ? width * green / scale : 0;
            const fits = room > 0 && measure(label, 'dp-part-measure') + 10 <= room;
            greenPart.textContent = fits ? label : '';
            note.textContent = fits ? '' : label;
        }

        return {
            figure,
            set({ scale = 1, grey = 0, green = 0, label = '', badge: badgeText = '', caption: captionText } = {}) {
                if (captionText !== undefined) title.textContent = captionText;
                title.hidden = !title.textContent;
                greyPart.style.width = `${scale > 0 ? grey / scale * 100 : 0}%`;
                greenPart.style.width = `${scale > 0 ? green / scale * 100 : 0}%`;
                if (badge) {
                    badge.textContent = badgeText;
                    badge.style.visibility = badgeText ? 'visible' : 'hidden';
                }
                paintLabel(label, green, scale);
                track.setAttribute('aria-label', label || title.textContent);
            },
            show(visible) {
                figure.hidden = !visible;
            }
        };
    }

    // values are strings, or { text, tone } when a line needs the ÷ or × colour.
    function lines(host, className = 'dp-working') {
        const holder = node('div', '', 'dp-lines');
        host.append(holder);
        return values => {
            holder.replaceChildren(...values.filter(Boolean).map(entry => {
                const { text, tone = '' } = typeof entry === 'string' ? { text: entry } : entry;
                return node('p', text, `${className} ${tone}`.trim());
            }));
        };
    }

    // A small marker between two pictures, such as "÷ 5" or "× 3".
    function operator(host, className = 'dp-operator') {
        const element = node('p', '', className);
        host.append(element);
        return {
            element,
            set(text) {
                element.textContent = text;
                element.hidden = !text;
            },
            show(visible) {
                element.hidden = !visible;
            }
        };
    }

    // Builds a screen's picture once and returns paint(value), which only
    // changes counts, widths and text, so the slider keeps focus while dragged.
    const pictures = [
        function biscuits(host) {
            const tiles = makeTiles(host);
            const bar = makeBar(host);
            const working = lines(host, 'dp-working dp-green');
            return count => {
                const total = count * 8;
                tiles.set({ count, colour: 'blue', label: '8p', tag: `${count} ${count === 1 ? 'biscuit' : 'biscuits'}` });
                bar.set({ scale: 80, green: total, label: money(total / 100) });
                working([`${count} × 8p = ${money(total / 100)}`]);
            };
        },
        function pancakes(host) {
            const pancakeBar = makeBar(host, 'Pancakes', true);
            const eggBar = makeBar(host, 'Eggs', true);
            const working = lines(host);
            return count => {
                const times = count / 4;
                const eggs = count / 2;
                const badge = times === 1 ? '' : `× ${number(times)}`;
                pancakeBar.set({ scale: 20, green: count, label: `${count} pancakes`, badge });
                eggBar.set({ scale: 10, green: eggs, label: `${eggs} eggs`, badge });
                working([`4 × ${number(times)} = ${count} pancakes`, `2 × ${number(times)} = ${eggs} eggs`]);
            };
        },
        function pens(host) {
            const pack = makeTiles(host);
            const divide = operator(host);
            const single = makeTiles(host);
            const times = operator(host);
            const wanted = makeTiles(host);
            const bar = makeBar(host);
            const working = lines(host);
            return count => {
                const total = count * 48;
                pack.set({ count: 5, colour: 'grey', label: '', tag: '5 pens: £2.40' });
                divide.set('÷ 5');
                single.set({ count: 5, colour: 'blue', label: '48p' });
                times.set(`× ${count}`);
                wanted.set({ count, colour: 'green', label: '48p' });
                bar.set({ scale: 480, green: total, label: money(total / 100) });
                working([
                    { text: '£2.40 ÷ 5 = £0.48', tone: 'dp-blue' },
                    { text: `£0.48 × ${count} = ${pounds(total)}`, tone: 'dp-green' }
                ]);
            };
        },
        function adding(host) {
            const given = makeTiles(host);
            const divide = operator(host);
            const single = makeTiles(host);
            const times = operator(host);
            const wanted = makeTiles(host);
            const bar = makeBar(host);
            const working = lines(host);
            const callout = node('p', screens[3].stepCallout, 'dp-callout');
            host.append(callout);
            return step => {
                given.set({ count: 4, colour: 'grey', label: '', tag: '4 biscuits: 30p' });
                divide.show(step >= 2);
                single.show(step >= 2);
                times.show(step >= 3);
                wanted.show(step >= 3);
                bar.show(step >= 3);
                if (step >= 2) {
                    divide.set('÷ 4');
                    single.set({ count: 4, colour: 'blue', label: '7.5p' });
                }
                if (step >= 3) {
                    times.set('× 6');
                    wanted.set({ count: 6, colour: 'green', label: '7.5p' });
                    bar.set({ scale: 60, green: 45, label: '45p' });
                }
                callout.hidden = step < 3;
                working([
                    screens[3].maths[0],
                    step >= 2 ? { text: screens[3].maths[1], tone: 'dp-blue' } : '',
                    step >= 3 ? { text: screens[3].maths[2], tone: 'dp-green' } : ''
                ]);
            };
        },
        function cheesecake(host) {
            const given = makeTiles(host);
            const divide = operator(host);
            const single = makeTiles(host);
            const times = operator(host);
            const wanted = makeTiles(host);
            const bar = makeBar(host);
            const working = lines(host);
            return count => {
                const total = count * 25;
                given.set({ count: 8, colour: 'grey', label: '', tag: '8 people: 200 g' });
                divide.set('÷ 8');
                single.set({ count: 1, colour: 'blue', label: '25 g' });
                times.set(`× ${count}`);
                wanted.set({ count, colour: 'green', label: '25 g' });
                bar.set({ scale: 400, green: total, label: `${total} g` });
                working([
                    { text: '200 g ÷ 8 = 25 g for 1 person', tone: 'dp-blue' },
                    { text: `25 g × ${count} = ${total} g`, tone: 'dp-green' }
                ]);
            };
        },
        function stamps(host) {
            const stampsBar = makeBar(host, 'Stamps');
            const taxiBar = makeBar(host, 'Taxi');
            const working = lines(host);
            return count => {
                const stampPrice = 2 * count;
                const taxiPrice = 3 + 2 * count;
                const stampWord = count === 1 ? 'stamp' : 'stamps';
                const mileWord = count === 1 ? 'mile' : 'miles';
                stampsBar.set({ scale: 13, green: stampPrice, label: count ? cash(stampPrice) : '' });
                taxiBar.set({ scale: 13, grey: 3, green: 2 * count, label: cash(taxiPrice) });
                working([
                    count === 0
                        ? '0 stamps: £0'
                        : `${count} ${stampWord}: ${count} × £2 = ${cash(stampPrice)} · ${cash(stampPrice)} ÷ ${count} = £2 for each stamp`,
                    count === 0
                        ? '0 miles: £3'
                        : `${count} ${mileWord}: £3 + ${count} × £2 = ${cash(taxiPrice)} · ${cash(taxiPrice)} ÷ ${count} = ${cash(taxiPrice / count)} for each mile`
                ]);
            };
        },
        function twoSteps(host) {
            const list = node('ol', '', 'dp-steps');
            const tones = ['dp-grey', 'dp-blue', 'dp-green'];
            const items = screens[6].steps.map((step, index) => {
                const item = node('li', '', `dp-step ${tones[index]}`);
                item.append(node('strong', step.title), document.createTextNode(` ${step.text}`));
                list.append(item);
                return item;
            });
            host.append(list);
            const check = node('p', screens[6].check, 'dp-check');
            host.append(check);
            return step => {
                items.forEach((item, index) => { item.hidden = index + 1 > step; });
                check.hidden = step < 3;
            };
        }
    ];

    async function mountLearn() {
        const root = node('article', '', 'dp-learn');
        document.getElementById('lesson-section-explanation').append(root);
        const api = window.Maths1to9Lesson;
        sectionEvent('explanation', 'gate');
        const section = await api.useSectionState('learn', {
            version: 1,
            initial: () => ({
                screen: 0, furthestScreen: 0, finished: false,
                sliders: screens.map(screen => screen.start)
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

        function paragraph(text) {
            return node('p', text);
        }

        function render() {
            root.replaceChildren();
            const screen = screens[state.screen];
            const heading = node('h3', screen.title);
            heading.dataset.screenHeading = '';
            root.append(heading);
            if (screen.question) root.append(node('p', screen.question, 'dp-question'));
            for (const line of screen.lines) root.append(paragraph(line));
            const controls = node('label', '', 'dp-slider');
            const slider = node('input');
            const output = node('output');
            Object.assign(slider, {
                type: 'range', min: String(screen.min), max: String(screen.max), step: String(screen.step),
                value: String(state.sliders[state.screen]), id: `dp-slider-${state.screen + 1}`
            });
            slider.setAttribute('aria-label', screen.slider);
            output.htmlFor = slider.id;
            controls.append(node('span', screen.slider), slider, output);
            const picture = node('div', '', 'dp-picture');
            const paint = pictures[state.screen](picture, state, change => section.update(change));
            root.append(controls, picture);
            function update() {
                const value = Number(slider.value);
                output.textContent = `${screen.slider}: ${number(value)}`;
                paint(value);
            }
            slider.addEventListener('input', () => {
                section.update(state => { state.sliders[state.screen] = Number(slider.value); });
                update();
            });
            update();
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
