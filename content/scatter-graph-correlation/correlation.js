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

    function fullGraph(host, { points, axisNames, label, big = [] }) {
        const boardHost = document.createElement('div');
        boardHost.className = 'correlation-graph';
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
                if (keepsRule(0, strength, r)) return { points, r, m: null, c: null };
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
        const slotRow = element('div', '', 'correlation-sort__slots');
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
            card.addEventListener('click', () => pick(item.id));
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

    /* The Practice card that asks the pupil to drag big points up or down.
       Nothing is marked until Check, when each big point turns green or red. */
    function dragPointsWidget({ graph, fixed, movable, check, answerText }) {
        return {
            isEmpty: value => !Array.isArray(value),
            render(host, { value, editable, onChange }) {
                const boardHost = element('div', '', 'correlation-graph');
                host.append(boardHost);
                const board = makeGraph(boardHost, graph);
                fixed.forEach(point => board.point(point, { size: 'small', tone: 'neutral', coordinates: false }));
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
                    items.forEach((item, index) => item.update({
                        value: positions[index],
                        tone: verdict ? (verdict.points[index] ? 'correct' : 'incorrect') : 'neutral',
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

    const helpers = {
        sets, makeGraph, fullGraph, miniGraph, smallGraphs, note, sentence,
        pearson, pointSet, patternPoints, patternY, sortCards, dragPointsWidget
    };

    if (typeof module !== 'undefined' && module.exports) module.exports = helpers;
    else window.Correlation = helpers;
})();
