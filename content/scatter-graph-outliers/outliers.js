(() => {
    'use strict';

    const grids = { x: [0, 10], y: [0, 10], step: { x: 1, y: 1 } };

    /* The fixed point sets: eight points that make the pattern, and the last
       point, which doesn't fit it. */
    const sets = {
        REVISION: {
            main: [[1, 1], [2, 3], [3, 3], [4, 5], [5, 5], [6, 6], [7, 7], [9, 8]],
            outlier: [8, 2]
        },
        SUNSHINE: {
            main: [[1, 1], [2, 2], [3, 4], [4, 4], [5, 5], [6, 6], [8, 8], [9, 9]],
            outlier: [7, 1]
        },
        HEATING: {
            main: [[1, 9], [2, 8], [3, 8], [4, 6], [5, 6], [6, 5], [7, 3], [8, 3]],
            outlier: [9, 7]
        }
    };

    /* The three examples the whole lesson uses, the same three as lessons 1
       and 2. Direction 1 goes up, −1 goes down. */
    const contexts = {
        revision: {
            direction: 1,
            set: sets.REVISION,
            axisNames: { x: 'Hours of revision', y: 'Test mark' },
            axisWords: { x: 'hours of revision', y: 'test mark' },
            ask: {
                x: 'How many hours of revision does the outlier show?',
                y: 'What test mark does the outlier show?'
            },
            label: 'Scatter graph of hours of revision and test marks.',
            words([x, y]) {
                return `${x}${x === 1 ? ' hour' : ' hours'} of revision and a mark of ${y}`;
            }
        },
        sunshine: {
            direction: 1,
            set: sets.SUNSHINE,
            axisNames: { x: 'Hours of sunshine', y: 'Ice creams sold (boxes)' },
            axisWords: { x: 'hours of sunshine', y: 'boxes of ice cream' },
            ask: {
                x: 'How many hours of sunshine does the outlier show?',
                y: 'How many boxes of ice cream does the outlier show?'
            },
            label: 'Scatter graph of hours of sunshine and ice creams sold.',
            words([x, y]) {
                return `${x}${x === 1 ? ' hour' : ' hours'} of sunshine and ${y} ${y === 1 ? 'box' : 'boxes'} sold`;
            }
        },
        heating: {
            direction: -1,
            set: sets.HEATING,
            axisNames: { x: 'Outdoor temperature (°C)', y: 'Heating used (kWh)' },
            axisWords: { x: 'temperature', y: 'heating' },
            ask: {
                x: 'What temperature does the outlier show? Give it in °C.',
                y: 'How much heating does the outlier show? Give it in kWh.'
            },
            label: 'Scatter graph of outdoor temperature and heating used.',
            words([x, y]) {
                return `${x} °C and ${y} kWh of heating`;
            }
        }
    };

    const contextIds = ['revision', 'sunshine', 'heating'];

    function element(tag, text = '', className = '') {
        const node = document.createElement(tag);
        node.textContent = text;
        node.className = className;
        return node;
    }

    function samePoint(first, second) {
        return first[0] === second[0] && first[1] === second[1];
    }

    /* Every graph in the lesson is drawn here, so they all look the same. */
    function makeGraph(host, { x = grids.x, y = grids.y, step = grids.step, labelEvery = 1,
        axisNames = null, label = '' } = {}) {
        const options = { x, y, step, labelEvery, label };
        if (axisNames) options.axisNames = axisNames;
        return window.Maths1to9Graph.create(host, options);
    }

    /* One full graph of a context. The points a screen talks about are blue,
       and `blueSize` is 'large' unless the screen wants them small; every
       other point is small and grey. A point can carry a text label. */
    function fullGraph(host, { context, blue = [], blueSize = 'large', labels = [], label = '' }) {
        const boardHost = element('div', '', 'outliers-graph');
        host.append(boardHost);
        const board = makeGraph(boardHost, {
            ...grids, axisNames: context.axisNames, label: label || context.label
        });
        const all = [...context.set.main, context.set.outlier];
        all.forEach(point => {
            const isBlue = blue.some(other => samePoint(other, point));
            const text = labels.find(entry => samePoint(entry.point, point))?.text ?? null;
            const options = {
                size: isBlue ? blueSize : 'small',
                tone: isBlue ? 'neutral' : 'muted',
                coordinates: false
            };
            if (text) options.label = text;
            board.point(point, options);
        });
        board.setEditable(false);
        return board;
    }

    /* One full graph of a set the generator made: every point looks the
       same, and some can carry a letter. A point in `blue` is the one the
       screen talks about, so it is large and the others are grey. */
    function graphPoints(host, { set, context, labels = [], label = '', blue = [] }) {
        const boardHost = element('div', '', 'outliers-graph');
        host.append(boardHost);
        const board = makeGraph(boardHost, {
            ...grids, axisNames: context.axisNames, label: label || context.label
        });
        [...set.main, set.outlier].forEach(point => {
            const text = labels.find(entry => samePoint(entry.point, point))?.text ?? null;
            const isBlue = blue.some(other => samePoint(other, point));
            const options = {
                size: isBlue ? 'large' : 'small',
                tone: isBlue ? 'neutral' : blue.length ? 'muted' : 'neutral',
                coordinates: false
            };
            if (text) options.label = text;
            board.point(point, options);
        });
        board.setEditable(false);
        return board;
    }

    function note(text) {
        return element('p', text, 'outliers-note');
    }

    function sentence(text) {
        const node = element('p', '', 'outliers-sentence');
        const strong = document.createElement('strong');
        strong.textContent = text;
        node.append(strong);
        return node;
    }

    /* A question the pupil is asked about a graph, in a plain box. */
    function ask(text) {
        return element('p', text, 'outliers-ask');
    }

    /* One reason for an outlier, with its lead in bold. */
    function reason(lead, text) {
        const node = element('p', '', 'outliers-reason');
        const strong = document.createElement('strong');
        strong.textContent = lead;
        node.append(strong, document.createTextNode(` ${text}`));
        return node;
    }

    function average(values) {
        return values.reduce((sum, value) => sum + value, 0) / values.length;
    }

    /* Pearson's r: close to 1 is a strong rise, close to −1 a strong fall,
       and close to 0 no pattern. */
    function pearson(points) {
        const meanX = average(points.map(point => point[0]));
        const meanY = average(points.map(point => point[1]));
        let cross = 0;
        let spreadX = 0;
        let spreadY = 0;
        points.forEach(([x, y]) => {
            cross += (x - meanX) * (y - meanY);
            spreadX += (x - meanX) ** 2;
            spreadY += (y - meanY) ** 2;
        });
        if (spreadX === 0 || spreadY === 0) return 0;
        return cross / Math.sqrt(spreadX * spreadY);
    }

    function keepsRule(direction, strength, r) {
        if (direction === 0) return Math.abs(r) <= 0.2;
        if (Math.sign(r) !== direction) return false;
        return strength === 'strong' ? Math.abs(r) >= 0.9
            : Math.abs(r) >= 0.45 && Math.abs(r) <= 0.75;
    }

    function errorsFor(strength) {
        return strength === 'strong' ? [-1, 0, 1] : [-3, -2, -1, 0, 1, 2, 3];
    }

    /* A "none" set must not look like a hill or a valley: each half of it,
       either side of the middle x, has to be flat too. */
    function flatHalves(points) {
        const xs = [...new Set(points.map(point => point[0]))].sort((first, second) => first - second);
        const middle = xs[Math.floor(xs.length / 2)];
        const left = points.filter(([x]) => x < middle);
        const right = points.filter(([x]) => x > middle);
        const flat = half => half.length < 2 || Math.abs(pearson(half)) <= 0.5;
        return flat(left) && flat(right);
    }

    /* A set of points that shows the asked pattern: direction 1 rises,
       −1 falls and 0 has no pattern. Returns the points, their r, and the
       slope and start used, so a question can work out the pattern's own y. */
    function pointSet(random, { direction, strength = 'strong', count = 8 }) {
        const pick = (min, max) => min + Math.floor(random() * (max - min + 1));
        for (let attempt = 0; attempt < 5000; attempt++) {
            const xs = [];
            while (xs.length < count) {
                const x = pick(1, 9);
                if (!xs.includes(x)) xs.push(x);
            }
            xs.sort((first, second) => first - second);
            if (direction === 0) {
                const points = xs.map(x => [x, pick(1, 9)]);
                const r = pearson(points);
                if (keepsRule(0, strength, r) && flatHalves(points)) {
                    return { points, r, m: null, c: null };
                }
                continue;
            }
            const m = [0.7, 0.8, 0.9, 1][pick(0, 3)];
            const lined = xs.map(x => direction * m * x);
            const lowest = Math.ceil(-Math.min(...lined));
            const highest = Math.floor(10 - Math.max(...lined));
            if (highest < lowest) continue;
            const c = pick(lowest, highest);
            const errors = errorsFor(strength);
            const points = xs.map(x => [x, Math.max(0, Math.min(10,
                Math.round(c + direction * m * x + errors[pick(0, errors.length - 1)])))]);
            if (new Set(points.map(point => point.join(','))).size !== count) continue;
            const r = pearson(points);
            if (keepsRule(direction, strength, r)) return { points, r, m, c };
        }
        throw new Error(`No points with ${strength} correlation in that direction.`);
    }

    function highestOf(points) {
        return points.reduce((best, point) => (point[1] > best[1] ? point : best));
    }

    function lowestOf(points) {
        return points.reduce((best, point) => (point[1] < best[1] ? point : best));
    }

    /* A graph from a context with one point taken out and put far away from
       the pattern: nine x values, eight that follow it and one that doesn't. */
    function outlierSet(random, contextId) {
        const context = contexts[contextId];
        const direction = context.direction;
        const pick = (min, max) => min + Math.floor(random() * (max - min + 1));
        for (let attempt = 0; attempt < 5000; attempt++) {
            const pattern = pointSet(random, { direction, strength: 'strong', count: 9 });
            const { m, c } = pattern;
            const xs = [3, 4, 5, 6, 7, 8];
            for (let index = xs.length - 1; index > 0; index--) {
                const other = pick(0, index);
                [xs[index], xs[other]] = [xs[other], xs[index]];
            }
            for (const x of xs) {
                const p = c + direction * m * x;
                const lowest = direction === 1 ? 0 : Math.ceil(p + 5);
                const highest = direction === 1 ? Math.floor(p - 5) : 10;
                if (lowest > highest) continue;
                const y = pick(lowest, highest);
                if (y === x) continue;
                const main = pattern.points.filter(point => point[0] !== x);
                if (main.length !== 8) continue;
                if (!keepsRule(direction, 'strong', pearson(main))) continue;
                return {
                    main,
                    outlier: [x, y],
                    c,
                    m,
                    highest: highestOf(main),
                    lowest: lowestOf(main)
                };
            }
        }
        throw new Error(`No outlier set for ${contextId}.`);
    }

    /* The Practice card that asks the pupil to tap the outlier. Nothing is
       marked until Check, when the point they tapped turns green or red. */
    function tapOutlierWidget({ context, set, label }) {
        return {
            isEmpty: value => !Array.isArray(value),
            render(host, { value, editable, onChange }) {
                const boardHost = element('div', '', 'outliers-graph');
                host.append(boardHost);
                const board = makeGraph(boardHost, { ...grids, axisNames: context.axisNames, label });
                const points = [...set.main, set.outlier];
                const items = points.map(point => [point, board.point(point, {
                    size: 'small', tone: 'neutral', coordinates: false
                })]);
                let chosen = Array.isArray(value) ? [...value] : null;
                let canEdit = editable;
                let phase = 'answer';

                function paint() {
                    items.forEach(([point, item]) => {
                        const isChosen = Boolean(chosen) && samePoint(chosen, point);
                        const isOutlier = samePoint(point, set.outlier);
                        if (phase === 'answer') {
                            item.update({ size: isChosen ? 'large' : 'small', tone: 'neutral' });
                        } else if (isChosen) {
                            item.update({ size: 'large', tone: phase === 'correct' ? 'correct' : 'incorrect' });
                        } else if (isOutlier && phase !== 'correct') {
                            // They missed it, so the right point shows green.
                            item.update({ size: 'large', tone: 'correct' });
                        } else {
                            item.update({ size: 'small', tone: 'neutral' });
                        }
                    });
                    board.setEditable(canEdit);
                }

                if (canEdit) {
                    board.pick({ label, onPick(position) {
                        if (!canEdit) return;
                        const match = points.find(point => samePoint(point, position));
                        if (!match) return;
                        chosen = [...match];
                        board.describe(`You tapped the point for ${context.words(chosen)}.`);
                        paint();
                        onChange([...chosen]);
                    } });
                }
                paint();
                return {
                    update({ value: next, editable: nextEditable = false, phase: nextPhase = 'answer' }) {
                        canEdit = nextEditable === true && nextPhase === 'answer';
                        phase = nextPhase;
                        if (Array.isArray(next)) chosen = [...next];
                        else if (nextPhase === 'answer') chosen = null;
                        paint();
                    },
                    focus() { boardHost.querySelector('.maths-graph__board')?.focus(); }
                };
            },
            mark(value) {
                const correct = Array.isArray(value) && samePoint(value, set.outlier);
                return {
                    correct,
                    feedback: correct
                        ? "Yes. That's the point that doesn't fit the pattern."
                        : 'That point fits the pattern. The outlier is the one away from the others.'
                };
            },
            answerText: value => `You tapped the point for ${context.words(value)}.`
        };
    }

    /* Why a point might not fit: something unusual happened, or the data was
       written down wrong. No numbers, so the reasons suit any graph of that
       context. */
    const reasonSets = {
        revision: {
            unusual: ['The pupil was ill on the day of the test.', 'The pupil revised the wrong topic.'],
            wrong: ['The mark was written down wrong.', "Another pupil's mark was written down."]
        },
        sunshine: {
            unusual: ['The ice cream shop was shut for most of the day.', 'The ice cream freezer was broken.'],
            wrong: ['The number of boxes was written down wrong.',
                'The boxes sold on a different day were written down.']
        },
        heating: {
            unusual: ['The windows were left open all day.', 'The heating was left on all night.'],
            wrong: ['The heating used was written down wrong.',
                'The temperature from a different day was written down.']
        }
    };

    /* The four reason cards for one context: two unusual days, two mistakes
       in the data. */
    function reasonCards(contextId) {
        const set = reasonSets[contextId];
        return [
            { id: `${contextId}-unusual-1`, label: set.unusual[0], bin: 'unusual' },
            { id: `${contextId}-unusual-2`, label: set.unusual[1], bin: 'unusual' },
            { id: `${contextId}-wrong-1`, label: set.wrong[0], bin: 'wrong' },
            { id: `${contextId}-wrong-2`, label: set.wrong[1], bin: 'wrong' }
        ];
    }

    function reasonSlots() {
        return [
            { id: 'unusual', title: 'Something unusual happened', capacity: 2 },
            { id: 'wrong', title: 'The data was written down wrong', capacity: 2 }
        ];
    }

    /* The hint a wrong reason card earns in Reason Try it. */
    function reasonHint(cards) {
        return (slotId, itemId) => {
            const card = cards.find(entry => entry.id === itemId);
            return card?.bin === 'unusual'
                ? "That really could happen, so the numbers would be right. It's an unusual day."
                : "That means the number on the graph is wrong, so it's a mistake in the data.";
        };
    }

    /* The three names for a graph's correlation, one of them spare. */
    const ignoreCards = [
        { id: 'positive', label: 'Positive', bin: 'positive' },
        { id: 'negative', label: 'Negative', bin: 'negative' },
        { id: 'none', label: 'No correlation', bin: 'none' }
    ];

    /* The hint a wrong name earns in Ignore Try it. */
    function ignoreHint(slotId, itemId) {
        if (itemId === 'none') return "One outlier doesn't stop the pattern. Ignore it and look at the other points.";
        return slotId === 'sunshine'
            ? 'Ignore the outlier. The other points go up.'
            : 'Ignore the outlier. The other points go down.';
    }

    /* A small graph for a box the pupil sorts into, with no axis names and a
       number only every fifth place. */
    function miniGraph(host, { points, label, caption = null }) {
        const figure = element('figure', '', 'outliers-mini');
        const boardHost = element('div', '', 'outliers-mini__board');
        figure.append(boardHost);
        if (caption) figure.append(element('figcaption', caption));
        host.append(figure);
        // Empty axis names reserve the room the numbers need, so nothing is
        // clipped in a graph this small.
        const board = makeGraph(boardHost, {
            ...grids, labelEvery: 5, axisNames: { x: '', y: '' }, label: label || caption || 'Scatter graph'
        });
        points.forEach(point => board.point(point, { size: 'small', tone: 'neutral', coordinates: false }));
        board.setEditable(false);
        return board;
    }

    function smallGraphs(host, items) {
        const row = element('div', '', items.length === 2
            ? 'outliers-mini-graphs outliers-mini-graphs--pair'
            : 'outliers-mini-graphs');
        host.append(row);
        return items.map(item => miniGraph(row, item));
    }

    function slotCapacity(slot, items, slots) {
        return slot.capacity ?? Math.ceil(items.length / slots.length);
    }

    /* A row of word cards and the boxes they go in. Each box may carry a
       small graph or a title, and holds its own number of cards, so the row
       can have a spare card that never goes in a box. In 'try' mode a right
       card locks in green and a wrong one goes back with a hint; in 'check'
       mode cards move freely until the caller marks them. */
    function sortCards(host, { items, slots, figure = null, accepts, hint = () => '',
        mode = 'try', value = null, editable = true, onChange = () => {} }) {
        const blank = () => ({
            placed: Object.fromEntries(slots.map(slot => [slot.id, []])),
            selected: null,
            hint: '',
            locked: []
        });
        const state = value && typeof value === 'object' ? JSON.parse(JSON.stringify(value)) : blank();
        slots.forEach(slot => { state.placed[slot.id] ??= []; });
        state.hint ??= '';
        state.locked = Array.isArray(state.locked) ? state.locked : [];
        let marked = false;
        let canEdit = editable;

        const root = element('div', '', 'outliers-sort');
        const slotRow = element('div', '', slots.length === 2
            ? 'outliers-sort__slots outliers-sort__slots--pair'
            : 'outliers-sort__slots');
        const tray = element('div', '', 'outliers-sort__tray');
        tray.setAttribute('role', 'group');
        tray.setAttribute('aria-label', 'Cards to sort');
        root.append(slotRow, tray);
        host.append(root);

        const cards = new Map();
        const drops = new Map();
        items.forEach(item => {
            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'outliers-card';
            card.textContent = item.label;
            let press = null;
            let dragged = false;
            card.addEventListener('click', () => {
                if (!dragged) pick(item.id);
                dragged = false;
            });
            card.addEventListener('pointerdown', event => {
                if (!canEdit || marked || locked(item.id)) return;
                press = { x: event.clientX, y: event.clientY };
                dragged = false;
                card.setPointerCapture(event.pointerId);
            });
            card.addEventListener('pointermove', event => {
                if (!press) return;
                if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > 8) {
                    dragged = true;
                    state.selected = item.id;
                    paint();
                }
            });
            card.addEventListener('pointerup', event => {
                if (!press) return;
                press = null;
                if (!dragged) return;
                const target = document.elementFromPoint(event.clientX, event.clientY);
                const slot = [...drops].find(([, drop]) => drop.contains(target));
                if (slot) place(slot[0]);
            });
            card.addEventListener('pointercancel', () => { press = null; });
            tray.append(card);
            cards.set(item.id, card);
        });
        slots.forEach(slot => {
            const box = element('div', '', 'outliers-sort__slot');
            // The box goes in first: a graph needs its container on the page.
            slotRow.append(box);
            if (figure) {
                const figureHost = element('div', '', 'outliers-sort__figure');
                box.append(figureHost);
                figure(figureHost, slot);
            }
            const drop = document.createElement('div');
            drop.className = 'outliers-sort__drop';
            drop.setAttribute('role', 'button');
            drop.setAttribute('aria-label', slot.dropLabel || slot.label || 'Box');
            drop.tabIndex = 0;
            drop.addEventListener('click', () => place(slot.id));
            drop.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    place(slot.id);
                }
            });
            box.append(drop);
            // Only a bin title shows; a slot's label is the graph's description.
            if (slot.title) box.append(element('p', slot.title, 'outliers-sort__title'));
            drops.set(slot.id, drop);
        });

        function placedIn(itemId) {
            return slots.map(slot => slot.id)
                .find(slotId => state.placed[slotId].includes(itemId)) ?? null;
        }
        function locked(itemId) {
            if (state.locked.includes(itemId)) return true;
            const slotId = placedIn(itemId);
            return marked && Boolean(slotId) && accepts(slotId, itemId);
        }
        function takeBack(itemId) {
            const slotId = placedIn(itemId);
            if (!canEdit || marked || !slotId || locked(itemId)) return;
            state.placed[slotId] = state.placed[slotId].filter(other => other !== itemId);
            state.hint = '';
            paint();
            onChange({ ...state });
        }
        function pick(itemId) {
            if (!canEdit || marked || locked(itemId)) return;
            state.selected = state.selected === itemId ? null : itemId;
            paint();
        }
        function place(slotId) {
            if (!canEdit || marked) return;
            const itemId = state.selected;
            if (!itemId) return;
            const from = placedIn(itemId);
            if (from === slotId) return;
            const slot = slots.find(entry => entry.id === slotId);
            if (from) state.placed[from] = state.placed[from].filter(other => other !== itemId);
            // A full box sends its cards back to the row, so a spare card has
            // somewhere to wait.
            if (state.placed[slotId].length >= slotCapacity(slot, items, slots)) state.placed[slotId] = [];
            state.selected = null;
            state.placed[slotId] = [...state.placed[slotId], itemId];
            state.hint = '';
            paint();
            onChange({ ...state });
            if (mode === 'try' && allFilled()) markAll();
        }

        // Try it marks every card at once, when the last empty box is filled:
        // right cards lock green, wrong ones go back to the row and one hint
        // tells the pupil about the first wrong card.
        function markAll() {
            const wrong = [];
            slots.forEach(slot => state.placed[slot.id].forEach(itemId => {
                if (!accepts(slot.id, itemId)) wrong.push({ slotId: slot.id, itemId });
            }));
            if (!wrong.length) {
                state.hint = '';
                state.locked = items.map(item => item.id);
            } else {
                state.hint = hint(wrong[0].slotId, wrong[0].itemId);
                wrong.forEach(({ slotId, itemId }) => {
                    state.placed[slotId] = state.placed[slotId].filter(other => other !== itemId);
                });
                state.locked = items
                    .map(item => [item.id, placedIn(item.id)])
                    .filter(([itemId, slotId]) => Boolean(slotId) && accepts(slotId, itemId))
                    .map(([itemId]) => itemId);
            }
            paint();
            onChange({ ...state });
        }
        function allFilled() {
            return slots.every(slot => state.placed[slot.id].length >= slotCapacity(slot, items, slots));
        }
        function paint() {
            cards.forEach((card, itemId) => {
                const placed = Boolean(placedIn(itemId));
                card.hidden = placed;
                card.disabled = !canEdit || marked;
                card.classList.toggle('is-selected', state.selected === itemId);
                card.setAttribute('aria-pressed', String(state.selected === itemId));
            });
            drops.forEach((drop, slotId) => {
                drop.replaceChildren();
                drop.classList.toggle('is-ready', Boolean(state.selected));
                state.placed[slotId].forEach(itemId => {
                    const item = items.find(entry => entry.id === itemId);
                    const right = accepts(slotId, itemId);
                    const chip = document.createElement('button');
                    chip.type = 'button';
                    chip.className = 'outliers-card outliers-card--placed';
                    chip.textContent = item.label;
                    chip.disabled = !canEdit || marked || state.locked.includes(itemId);
                    chip.addEventListener('click', () => takeBack(itemId));
                    if (state.locked.includes(itemId)) chip.classList.add('is-correct');
                    if (marked) chip.classList.add(right ? 'is-correct' : 'is-incorrect');
                    drop.append(chip);
                });
                drop.classList.toggle('is-empty', state.placed[slotId].length === 0);
            });
        }

        paint();
        return {
            root,
            state,
            mark(next = true) {
                marked = next;
                canEdit = canEdit && !next;
                paint();
            },
            update({ value: next, editable: nextEditable = canEdit, marked: nextMarked = marked }) {
                if (next) Object.assign(state, JSON.parse(JSON.stringify(next)));
                marked = nextMarked;
                canEdit = nextEditable;
                paint();
            },
            allCorrect() {
                return slots.every(slot => {
                    const placed = state.placed[slot.id];
                    return placed.length === slotCapacity(slot, items, slots) &&
                        placed.every(itemId => accepts(slot.id, itemId));
                });
            }
        };
    }

    /* The Practice version of the word-card sort: the cards can be moved
       between the boxes until Check, then every box is marked at once. */
    function sortWidget({ cards, slots, figures = null, success, wrong }) {
        let handle = null;
        const binOf = itemId => cards.find(card => card.id === itemId)?.bin ?? null;
        return {
            isEmpty: value => !value || slots.every(slot => (value.placed?.[slot.id] || []).length === 0),
            render(host, { value, editable, onChange }) {
                handle = sortCards(host, {
                    items: cards, slots, mode: 'check', value, editable,
                    accepts: (slotId, itemId) => binOf(itemId) === slotId,
                    figure: figures ? (figureHost, slot) => {
                        const graph = figures.find(entry => entry.id === slot.id);
                        if (graph) miniGraph(figureHost, { points: graph.points, label: graph.label });
                    } : null,
                    onChange(next) { onChange(next); }
                });
                return {
                    update({ value: next, editable: nextEditable, phase = 'answer' }) {
                        handle.update({
                            value: next, editable: nextEditable === true && phase === 'answer',
                            marked: phase !== 'answer'
                        });
                    },
                    focus() { handle.root.querySelector('.outliers-card')?.focus(); }
                };
            },
            mark(value) {
                const correct = slots.every(slot => {
                    const placed = value?.placed?.[slot.id] || [];
                    return placed.length === slotCapacity(slot, cards, slots) &&
                        placed.every(itemId => binOf(itemId) === slot.id);
                });
                return { correct, feedback: correct ? success : wrong };
            },
            answerText: value => slots.map(slot => {
                const labels = (value.placed?.[slot.id] || [])
                    .map(id => cards.find(card => card.id === id)?.label)
                    .filter(Boolean);
                return `${slot.title || slot.dropLabel}: ${labels.length ? labels.join('; ') : 'nothing'}.`;
            }).join(' ')
        };
    }

    const helpers = {
        sets, contexts, contextIds, reasonSets, makeGraph, fullGraph, graphPoints, samePoint,
        note, sentence, ask, reason, pearson, pointSet, outlierSet, keepsRule,
        highestOf, lowestOf, tapOutlierWidget, reasonCards, reasonSlots, reasonHint,
        ignoreCards, ignoreHint, miniGraph, smallGraphs, sortCards, sortWidget
    };

    if (typeof module !== 'undefined' && module.exports) module.exports = helpers;
    else window.Outliers = helpers;
})();
