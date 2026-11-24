(() => {
    'use strict';

    const grids = { x: [0, 10], y: [0, 10], step: { x: 1, y: 1 } };

    const sets = {
        positiveLearning: [[1, 2], [2, 3], [3, 3], [4, 5], [5, 5], [6, 7], [7, 7], [8, 9]],
        negativeLearning: [[1, 9], [2, 8], [3, 8], [4, 6], [5, 5], [6, 4], [7, 3], [8, 2]],
        noneLearning: [[1, 6], [2, 2], [3, 8], [4, 4], [5, 9], [6, 1], [7, 6], [8, 3]],
        revision: [[1, 2], [2, 3], [3, 3], [4, 5], [5, 4], [6, 6], [7, 7], [8, 8], [9, 8]],
        heating: [[1, 9], [2, 8], [3, 8], [4, 6], [5, 6], [6, 5], [7, 3], [8, 3], [9, 2]],
        shoeSize: [[1, 5], [2, 8], [3, 2], [4, 7], [5, 4], [6, 9], [7, 3], [8, 6], [9, 4]],
        strongPositive: [[1, 1], [2, 2], [3, 4], [4, 4], [5, 5], [6, 7], [7, 7], [8, 8], [9, 9]],
        weakPositive: [[1, 4], [2, 1], [3, 5], [4, 2], [5, 7], [6, 3], [7, 8], [8, 5], [9, 9]],
        iceCreamSunburn: [[1, 1], [2, 3], [3, 2], [4, 4], [5, 5], [6, 5], [7, 7], [8, 8], [9, 8]]
    };

    function element(tag, text = '', className = '') {
        const node = document.createElement(tag);
        node.textContent = text;
        node.className = className;
        return node;
    }

    /* Every graph in the lesson is drawn here, so they all look the same.
       Small graphs leave out the axis names and label 0, 5 and 10 only. */
    function makeGraph(host, { x = grids.x, y = grids.y, step = grids.step, labelEvery = 1,
        axisNames = null, label = '' } = {}) {
        const options = { x, y, step, labelEvery, label };
        if (axisNames) options.axisNames = axisNames;
        return window.Maths1to9Graph.create(host, options);
    }

    function fullGraph(host, { points, axisNames, label, big = [], compact = false }) {
        const boardHost = document.createElement('div');
        boardHost.className = compact ? 'correlation-graph correlation-graph--compact' : 'correlation-graph';
        host.append(boardHost);
        const board = makeGraph(boardHost, { ...grids, axisNames, label });
        const isBig = point => big.some(other => other[0] === point[0] && other[1] === point[1]);
        points.forEach(point => board.point(point, {
            size: isBig(point) ? 'large' : 'small',
            tone: big.length > 0 && !isBig(point) ? 'muted' : 'neutral',
            coordinates: false
        }));
        board.setEditable(false);
        return board;
    }

    function miniGraph(host, { points, label, caption = null }) {
        const figure = document.createElement('figure');
        figure.className = 'correlation-mini';
        const boardHost = document.createElement('div');
        boardHost.className = 'correlation-mini__board';
        figure.append(boardHost);
        if (caption) figure.append(element('figcaption', caption));
        host.append(figure);
        // Empty axis names reserve the room the numbers need, so nothing is
        // clipped in a graph this small.
        const board = makeGraph(boardHost, { ...grids, labelEvery: 5,
            axisNames: { x: '', y: '' }, label: label || caption || 'Scatter graph' });
        points.forEach(point => board.point(point, { size: 'small', tone: 'neutral', coordinates: false }));
        board.setEditable(false);
        return board;
    }

    function smallGraphs(host, items) {
        const row = document.createElement('div');
        row.className = items.length === 2
            ? 'correlation-mini-graphs correlation-mini-graphs--pair'
            : items.length === 4 ? 'correlation-mini-graphs correlation-mini-graphs--four'
                : 'correlation-mini-graphs';
        host.append(row);
        return items.map(item => miniGraph(row, item));
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

    /* The y a point sits at when it follows the pattern exactly. */
    function patternY({ c, m }, direction, x) {
        return c + direction * m * x;
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

    /* Points for the x values the question needs, following a slope and
       start that a pointSet gave, and still strong enough to look like one. */
    function patternPoints(random, { direction, m, c, xs, strength = 'strong' }) {
        const pick = (min, max) => min + Math.floor(random() * (max - min + 1));
        const errors = errorsFor(strength);
        for (let attempt = 0; attempt < 500; attempt++) {
            const points = xs.map(x => [x, Math.max(0, Math.min(10,
                Math.round(c + direction * m * x + errors[pick(0, errors.length - 1)])))]);
            if (new Set(points.map(point => point.join(','))).size === points.length &&
                keepsRule(direction, strength, pearson(points))) return points;
        }
        return xs.map(x => [x, Math.max(0, Math.min(10, Math.round(c + direction * m * x)))]);
    }

    function note(text) {
        const node = document.createElement('p');
        node.className = 'correlation-note';
        node.textContent = text;
        return node;
    }

    function sentence(text) {
        const node = document.createElement('p');
        node.className = 'correlation-sentence';
        const strong = document.createElement('strong');
        strong.textContent = text;
        node.append(strong);
        return node;
    }

    /* A row of word cards and the boxes they go in. Each box may carry a
       small graph or a title. In 'try' mode a right card locks in green and a
       wrong one goes back with a hint; in 'check' mode cards move freely
       until the caller marks them. */
    function sortCards(host, { items, slots, figure = null, accepts, hint = () => '',
        mode = 'try', value = null, editable = true, onChange = () => {} }) {
        const blank = () => ({
            placed: Object.fromEntries(slots.map(slot => [slot.id, []])),
            selected: null,
            hint: ''
        });
        const state = value && typeof value === 'object' ? JSON.parse(JSON.stringify(value)) : blank();
        slots.forEach(slot => { state.placed[slot.id] ??= []; });
        state.hint ??= '';
        let marked = false;
        let canEdit = editable;

        const root = element('div', '', 'correlation-sort');
        const slotRow = element('div', '', slots.length === 4
            ? 'correlation-sort__slots correlation-sort__slots--four'
            : slots.length === 2 ? 'correlation-sort__slots correlation-sort__slots--pair'
                : 'correlation-sort__slots');
        const tray = element('div', '', 'correlation-sort__tray');
        tray.setAttribute('role', 'group');
        tray.setAttribute('aria-label', 'Cards to sort');
        root.append(slotRow, tray);
        host.append(root);

        const cards = new Map();
        const drops = new Map();
        items.forEach(item => {
            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'correlation-card';
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
            const box = element('div', '', 'correlation-sort__slot');
            // The box goes in first: a graph needs its container on the page.
            slotRow.append(box);
            if (figure) {
                const figureHost = element('div', '', 'correlation-sort__figure');
                box.append(figureHost);
                figure(figureHost, slot);
            }
            const drop = document.createElement('div');
            drop.className = 'correlation-sort__drop';
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
            if (slot.title) box.append(element('p', slot.title, 'correlation-sort__title'));
            drops.set(slot.id, drop);
        });

        function placedIn(itemId) {
            return slots.map(slot => slot.id)
                .find(slotId => state.placed[slotId].includes(itemId)) ?? null;
        }
        function locked(itemId) {
            const slotId = placedIn(itemId);
            return Boolean(slotId) && accepts(slotId, itemId);
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
            if (from) state.placed[from] = state.placed[from].filter(other => other !== itemId);
            state.selected = null;
            if (mode === 'try' && !accepts(slotId, itemId)) {
                state.hint = hint(slotId, itemId);
            } else {
                state.placed[slotId] = [...state.placed[slotId], itemId];
                state.hint = mode === 'try' && allPlaced() ? '' : state.hint;
            }
            paint();
            onChange({ ...state });
        }
        function allPlaced() {
            return items.every(item => Boolean(placedIn(item.id)));
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
                    const chip = document.createElement(mode === 'check' && !marked ? 'button' : 'span');
                    chip.className = 'correlation-card correlation-card--placed';
                    if (chip.tagName === 'BUTTON') {
                        chip.type = 'button';
                        chip.textContent = item.label;
                        chip.addEventListener('click', () => takeBack(itemId));
                    } else {
                        chip.textContent = item.label;
                    }
                    if (mode === 'try' && right) chip.classList.add('is-correct');
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
                return items.every(item => {
                    const slotId = placedIn(item.id);
                    return Boolean(slotId) && accepts(slotId, item.id);
                });
            }
        };
    }

    /* The sentence pair a filled sentence builder has made, if it is one of
       the two that say the same thing the right way round. */
    function sentencePair(sentence, values) {
        return sentence.pairs.find(pair => pair.values.every((word, index) => word === values[index])) ?? null;
    }

    /* A sentence with two gaps. Each gap has its own two word chips under the
       sentence: tap a chip to put its word in that gap, tap the other chip to
       swap it, tap the chosen chip to take it out. */
    function createSentence(host, { sentence, value = null, editable = true, marked = false, onChange = () => {} }) {
        const values = Array.isArray(value) ? sentence.gaps.map((_, index) => value[index] ?? null)
            : sentence.gaps.map(() => null);
        let canEdit = editable;
        let isMarked = marked;

        const root = element('div', '', 'correlation-builder');
        const line = element('p', '', 'correlation-builder__line');
        const boxes = sentence.gaps.map((_, index) => {
            const box = element('span', '', 'correlation-builder__gap');
            box.setAttribute('aria-label', index === 0 ? 'First gap' : 'Second gap');
            return box;
        });
        sentence.parts.forEach(part => {
            if (typeof part === 'number') line.append(boxes[part]);
            else line.append(document.createTextNode(part));
        });
        const tray = element('div', '', 'correlation-builder__tray');
        const groups = sentence.gaps.map((chips, index) => {
            const group = element('div', '', 'correlation-builder__chips');
            group.setAttribute('role', 'group');
            group.setAttribute('aria-label', index === 0 ? 'Words for the first gap' : 'Words for the second gap');
            chips.forEach(word => {
                const chip = element('button', word, 'correlation-card');
                chip.type = 'button';
                chip.addEventListener('click', () => choose(index, word));
                group.append(chip);
            });
            tray.append(group);
            return group;
        });
        root.append(line, tray);
        host.append(root);

        function right() {
            return Boolean(sentencePair(sentence, values));
        }
        function paint() {
            boxes.forEach((box, index) => {
                box.textContent = values[index] ?? '';
                box.classList.toggle('is-empty', !values[index]);
                box.classList.toggle('is-correct', isMarked && right());
                box.classList.toggle('is-incorrect', isMarked && !right());
            });
            groups.forEach((group, index) => [...group.children].forEach(chip => {
                const chosen = chip.textContent === values[index];
                chip.classList.toggle('is-selected', chosen);
                chip.disabled = !canEdit;
                chip.setAttribute('aria-pressed', String(chosen));
            }));
        }
        function choose(index, word) {
            if (!canEdit) return;
            values[index] = values[index] === word ? null : word;
            paint();
            onChange([...values]);
        }

        paint();
        return {
            values,
            update({ value: next, editable: nextEditable = canEdit, marked: nextMarked = isMarked }) {
                canEdit = nextEditable;
                isMarked = nextMarked;
                if (Array.isArray(next)) sentence.gaps.forEach((_, index) => { values[index] = next[index] ?? null; });
                paint();
            },
            filled() {
                return sentence.gaps.every((_, index) => Boolean(values[index]));
            },
            right
        };
    }

    /* The Practice version of the sentence builder: nothing is marked until
       Check, when the whole sentence turns green or red. */
    function sentenceWidget({ sentence }) {
        let handle = null;
        return {
            isEmpty: value => !Array.isArray(value) || value.some(word => !word),
            render(host, { value, editable, onChange }) {
                handle = createSentence(host, { sentence, value, editable, onChange });
                return {
                    update({ value: next, editable: nextEditable, phase = 'answer' }) {
                        handle.update({ value: next, editable: nextEditable === true && phase === 'answer',
                            marked: phase !== 'answer' });
                    },
                    focus() { host.querySelector('button')?.focus(); }
                };
            },
            mark(value) {
                const pair = sentencePair(sentence, value);
                return { correct: Boolean(pair), feedback: pair ? pair.feedback : sentence.wrong };
            },
            answerText: value => `You chose "${value[0]}" and "${value[1]}".`
        };
    }

    /* The Practice version of the word-card sort with sentence cards: the
       cards can be moved between the boxes until Check, then every box is
       marked at once. */
    function sortSentencesWidget({ cards, slots, success, wrong }) {
        let handle = null;
        const binOf = itemId => cards.find(card => card.id === itemId)?.bin ?? null;
        return {
            isEmpty: value => !value || slots.every(slot => (value.placed?.[slot.id] || []).length === 0),
            render(host, { value, editable, onChange }) {
                handle = sortCards(host, {
                    items: cards, slots, mode: 'check', value, editable,
                    accepts: (slotId, itemId) => binOf(itemId) === slotId,
                    onChange(next) { onChange(next); }
                });
                return {
                    update({ value: next, editable: nextEditable, phase = 'answer' }) {
                        handle.update({ value: next, editable: nextEditable === true && phase === 'answer',
                            marked: phase !== 'answer' });
                    },
                    focus() { handle.root.querySelector('.correlation-card')?.focus(); }
                };
            },
            mark(value) {
                const correct = cards.every(card => (value.placed?.[card.bin] || []).includes(card.id));
                return { correct, feedback: correct ? success : wrong };
            },
            answerText: value => slots.map(slot => {
                const labels = (value.placed?.[slot.id] || [])
                    .map(id => cards.find(card => card.id === id)?.label)
                    .filter(Boolean);
                return `${slot.title}: ${labels.length ? labels.join('; ') : 'nothing'}.`;
            }).join(' ')
        };
    }

    /* The Practice card that asks the pupil to drag blue points up or down.
       Nothing is marked until Check, when each blue point turns green or red. */
    function dragPointsWidget({ graph, fixed, movable, check, answerText }) {
        return {
            isEmpty: value => !Array.isArray(value),
            render(host, { value, editable, onChange }) {
                const boardHost = element('div', '', 'correlation-graph');
                host.append(boardHost);
                const board = makeGraph(boardHost, graph);
                fixed.forEach(point => board.point(point, { size: 'small', tone: 'muted', coordinates: false }));
                let positions = movable.map((start, index) => [...(value?.[index] ?? start)]);
                const items = positions.map((position, index) => board.point(position, {
                    size: 'large', tone: 'neutral', coordinates: false,
                    drag: editable ? 'y' : false,
                    onMove(point) {
                        positions[index] = [point[0], point[1]];
                        onChange(positions.map(entry => [...entry]));
                    }
                }));
                function paint({ value: next, editable: canEdit = false, phase = 'answer' }) {
                    // Try again clears the answer, so the points go back to where they started.
                    if (canEdit) positions = next ? next.map(entry => [...entry]) : movable.map(start => [...start]);
                    else if (next) positions = next.map(entry => [...entry]);
                    const verdict = phase === 'answer' ? null : check(positions);
                    // A check can mark the points one by one, or all at once.
                    const mark = index => verdict.points ? verdict.points[index] : verdict.correct;
                    items.forEach((item, index) => item.update({
                        value: positions[index],
                        tone: verdict ? (mark(index) ? 'correct' : 'incorrect') : 'neutral',
                        drag: canEdit ? 'y' : false
                    }));
                    board.setEditable(canEdit);
                }
                paint({ value, editable });
                return {
                    update: paint,
                    focus() { boardHost.querySelector('.maths-graph__board')?.focus(); }
                };
            },
            mark(value) {
                const verdict = check(value);
                return { correct: verdict.correct, feedback: verdict.feedback };
            },
            answerText
        };
    }

    /* The Try it screens' words and numbers, so the unit test can check them
       without a browser. interactive.js draws them. */
    const tryIt = {
        typeDragScreens: [
            {
                heading: 'Drag the two blue points so the graph shows positive correlation.',
                axisNames: { x: 'Hours of revision', y: 'Test mark' },
                label: 'Scatter graph of hours of revision and test marks, with two blue points to drag.',
                fixed: [[1, 2], [2, 2], [3, 4], [4, 4], [5, 5], [6, 6]],
                starts: [1, 1],
                ranges: [[5, 9], [6, 10]],
                success: "Now every point goes up from left to right. That's positive correlation.",
                tooLow: 'That point is too low. The points go up, so it needs to be higher than the ones to its left.',
                tooHigh: "That's a big jump. Keep it close to the other points."
            },
            {
                heading: 'Drag the two blue points so the graph shows negative correlation.',
                axisNames: { x: 'Outdoor temperature (°C)', y: 'Heating used (kWh)' },
                label: 'Scatter graph of outdoor temperature and heating used, with two blue points to drag.',
                fixed: [[1, 9], [2, 8], [3, 8], [4, 6], [5, 6], [6, 4]],
                starts: [9, 9],
                ranges: [[1, 5], [0, 4]],
                success: 'Now every point goes down from left to right. That\'s negative correlation.',
                tooHigh: 'That point is too high. The points go down, so it needs to be lower than the ones to its left.',
                tooLow: "That's a big drop. Keep it close to the other points."
            }
        ],
        typeSort: {
            heading: 'Put the right name under each graph.',
            cards: [
                { id: 'positive', label: 'Positive' },
                { id: 'negative', label: 'Negative' },
                { id: 'none', label: 'No correlation' }
            ],
            slots: [
                {
                    id: 'negative', points: sets.negativeLearning,
                    dropLabel: 'Name for the falling graph',
                    label: 'Scatter graph with negative correlation.'
                },
                {
                    id: 'none', points: sets.noneLearning,
                    dropLabel: 'Name for the graph with no pattern',
                    label: 'Scatter graph with no correlation.'
                },
                {
                    id: 'positive', points: sets.positiveLearning,
                    dropLabel: 'Name for the rising graph',
                    label: 'Scatter graph with positive correlation.'
                }
            ],
            success: 'Up is positive, down is negative, and no pattern is no correlation.',
            hint(slotId, itemId) {
                if (slotId === 'none') return "These points don't go up or down. They're all over the place.";
                if (itemId === 'none') return 'There is a pattern here. Do the points go up or down?';
                return slotId === 'positive'
                    ? 'These points go up from left to right.'
                    : 'These points go down from left to right.';
            }
        },
        strengthSort: {
            heading: 'Put the right name under each graph.',
            cards: [
                { id: 'strong-positive', label: 'Strong positive' },
                { id: 'weak-positive', label: 'Weak positive' },
                { id: 'strong-negative', label: 'Strong negative' },
                { id: 'weak-negative', label: 'Weak negative' }
            ],
            // The four graphs, in the order the spec gives: strong positive,
            // weak negative, weak positive, strong negative.
            slots: [
                { id: 'strong-positive', direction: 1, strength: 'strong', seed: 1301 },
                { id: 'weak-negative', direction: -1, strength: 'weak', seed: 2302 },
                { id: 'weak-positive', direction: 1, strength: 'weak', seed: 3303 },
                { id: 'strong-negative', direction: -1, strength: 'strong', seed: 4304 }
            ],
            success: 'Up or down tells you positive or negative. How close the points are tells you strong or weak.',
            hint(slotId, itemId) {
                const slot = tryIt.strengthSort.slots.find(entry => entry.id === slotId);
                const direction = itemId.endsWith('positive') ? 1 : -1;
                return direction === slot.direction
                    ? 'Right way. Now look how close the points are to a straight line.'
                    : 'Do the points go up or down from left to right?';
            }
        },
        strengthDrag: {
            heading: 'Drag the two blue points so the correlation is strong.',
            axisNames: { x: 'Hours of sunshine', y: 'Ice creams sold (boxes)' },
            label: 'Scatter graph of hours of sunshine and ice creams sold, with two blue points to drag.',
            fixed: [[1, 1], [2, 2], [4, 4], [5, 5], [6, 6], [8, 8], [9, 9]],
            xs: [3, 7],
            starts: [8, 2],
            ranges: [[2, 4], [6, 8]],
            success: 'Now all the points sit close to a straight line, so the correlation is strong.',
            wrong: 'That point is still a long way from the others. Move it so it fits the pattern.'
        },
        describeScreens: [
            {
                heading: 'Finish the sentence for this graph.',
                axisNames: { x: 'Garden length (m)', y: 'Mowing time (minutes)' },
                x: [0, 30], y: [0, 40], step: { x: 5, y: 5 }, labelEvery: { x: 1, y: 2 },
                label: 'Scatter graph of garden length and mowing time.',
                points: [[5, 11], [8, 16], [10, 15], [13, 22], [16, 24], [20, 29], [23, 28], [27, 35]],
                sentence: {
                    parts: [0, ' gardens tend to take ', 1, ' time to mow.'],
                    gaps: [['Longer', 'Shorter'], ['more', 'less']],
                    pairs: [
                        { values: ['Longer', 'more'],
                            feedback: 'Yes. The points go up, so longer gardens tend to take more time.' },
                        { values: ['Shorter', 'less'],
                            feedback: "Yes. That's the same pattern said the other way round." }
                    ],
                    wrong: 'That would mean the points go down. Look again: do they go up or down?'
                }
            },
            {
                heading: 'Finish the sentence for this graph.',
                axisNames: { x: 'Age of car (years)', y: 'Value (£1000s)' },
                label: 'Scatter graph of the age of a car and its value.',
                points: [[1, 9], [2, 9], [3, 7], [4, 7], [5, 5], [6, 5], [7, 4], [8, 2], [9, 2]],
                sentence: {
                    parts: [0, ' cars tend to be worth ', 1, '.'],
                    gaps: [['Older', 'Newer'], ['more', 'less']],
                    pairs: [
                        { values: ['Older', 'less'],
                            feedback: 'Yes. The points go down, so older cars tend to be worth less.' },
                        { values: ['Newer', 'more'],
                            feedback: "Yes. That's the same pattern said the other way round." }
                    ],
                    wrong: 'That would mean the points go up. Look again: do they go up or down?'
                }
            }
        ],
        causeSort: {
            heading: 'Sort the sentences about this graph.',
            axisNames: { x: 'Ice creams sold (boxes)', y: 'Sunburn cases' },
            label: 'Scatter graph of ice creams sold and sunburn cases.',
            points: sets.iceCreamSunburn,
            seed: 20261124,
            cards: [
                { id: 'shows-1', label: 'More ice creams tend to go with more sunburn.', bin: 'shows' },
                { id: 'shows-2', label: 'Fewer ice creams tend to go with less sunburn.', bin: 'shows' },
                { id: 'cant-1', label: 'Eating ice cream causes sunburn.', bin: 'cant' },
                { id: 'cant-2', label: 'Selling less ice cream would stop sunburn.', bin: 'cant' }
            ],
            slots: [
                { id: 'shows', title: 'The graph shows this' },
                { id: 'cant', title: "The graph can't prove this" }
            ],
            success: "The graph shows the two go together. It can't show why.",
            hint(slotId, itemId) {
                const card = tryIt.causeSort.cards.find(entry => entry.id === itemId);
                return card.bin === 'shows'
                    ? 'The points do show this: they go up together.'
                    : 'That says one thing causes the other. The graph only shows that they go together.';
            }
        }
    };

    const helpers = {
        sets, makeGraph, fullGraph, miniGraph, smallGraphs, note, sentence,
        pearson, pointSet, patternPoints, patternY, flatHalves,
        sortCards, dragPointsWidget, createSentence, sentencePair,
        sentenceWidget, sortSentencesWidget, tryIt
    };

    if (typeof module !== 'undefined' && module.exports) module.exports = helpers;
    else window.Correlation = helpers;
})();
