/* Shared coordinate graphs. Lessons supply content, marking and persistence. */
(() => {
    'use strict';

    function snap(point, step = {}) {
        return point.map((value, index) => {
            const size = step[index === 0 ? 'x' : 'y'] ?? 1;
            return Math.round(value / size) * size || 0;
        });
    }

    function classify({ from, to }) {
        if (from[1] === to[1]) return { kind: 'horizontal', value: from[1] };
        if (from[0] === to[0]) return { kind: 'vertical', value: from[0] };
        const m = (to[1] - from[1]) / (to[0] - from[0]);
        return { kind: 'sloping', m, c: from[1] - m * from[0] };
    }

    function length({ from, to }) {
        return Math.hypot(to[0] - from[0], to[1] - from[1]);
    }

    function formatNumber(value) {
        return String(Object.is(value, -0) ? 0 : value).replace(/-/g, '−');
    }

    function formatPoint(point) {
        return `(${point.map(formatNumber).join(', ')})`;
    }

    function copy(value) {
        return value === null ? null : JSON.parse(JSON.stringify(value));
    }

    function escapeHtml(text) {
        return String(text).replace(/[&<>"']/g, character => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[character]);
    }

    function create(host, options = {}) {
        if (!window.JXG) {
            throw new Error('Load vendor/jsxgraph/jsxgraphcore.js before creating a graph.');
        }
        if (!host.isConnected || host.ownerDocument !== document) {
            throw new Error("Add the graph's container to the page before creating a graph.");
        }
        const x = options.x || [-6, 6];
        const y = options.y || [-6, 6];
        const step = { x: 1, y: 1, ...options.step };
        if (![step.x, step.y].every(value => Number.isFinite(value) && value > 0)) {
            throw new RangeError('Graph axis steps must be positive finite numbers.');
        }
        const wrapper = document.createElement('div');
        wrapper.className = 'maths-graph';
        const surface = document.createElement('div');
        surface.className = 'maths-graph__board';
        if (options.step) {
            const columns = (x[1] - x[0]) / step.x + 1.6;
            const rows = (y[1] - y[0]) / step.y + 1.6;
            surface.style.setProperty('--maths-graph-aspect', String(columns / rows));
        }
        const live = document.createElement('p');
        live.className = 'maths-graph__description';
        live.setAttribute('aria-live', 'polite');
        const tooltip = document.createElement('span');
        tooltip.className = 'maths-graph__coordinates';
        tooltip.hidden = true;
        tooltip.setAttribute('aria-hidden', 'true');
        wrapper.append(surface, tooltip, live);
        host.append(wrapper);
        const colours = getComputedStyle(host);
        const colour = property => colours.getPropertyValue(property).trim();
        const tones = {
            neutral: colour('--primary'), correct: colour('--success-dark'),
            incorrect: colour('--error-dark'), muted: colour('--border-dark'),
            ink: colour('--text')
        };
        const extent = Math.max(x[1] - x[0], y[1] - y[0]) / 2 + 0.8;
        const cx = (x[0] + x[1]) / 2;
        const cy = (y[0] + y[1]) / 2;
        const boundingBox = options.step
            ? [x[0] - 0.8 * step.x, y[1] + 0.8 * step.y, x[1] + 0.8 * step.x, y[0] - 0.8 * step.y]
            : [cx - extent, cy + extent, cx + extent, cy - extent];
        const board = window.JXG.JSXGraph.initBoard(surface, {
            boundingbox: boundingBox,
            axis: false, grid: false, keepaspectratio: !options.step,
            showNavigation: false, showCopyright: false, showInfobox: false,
            pan: { enabled: false }, zoom: { enabled: false, wheel: false },
            keyboard: { enabled: false }, registerEvents: false,
            resize: { enabled: false }, renderer: 'svg'
        });
        surface.tabIndex = 0;
        surface.setAttribute('role', 'application');
        surface.setAttribute('aria-label', options.label || 'Coordinate grid');
        const base = { fixed: true, highlight: false, withLabel: false };
        function text(position, value, attributes = {}) {
            // JSXGraph text positions use grid units; keep small clearances in pixels
            // so labels remain clear of axes when the board is resized.
            const { offset = [0, 0], ...style } = attributes;
            const placed = position.map((coordinate, index) => () => (typeof coordinate === 'function' ? coordinate() : coordinate) +
                offset[index] / (index === 0 ? board.unitX : board.unitY));
            return board.create('text', [...placed, value], {
                ...base, fontSize: 12, strokeColor: colour('--text'),
                cssClass: 'maths-graph__label', parse: false, ...style
            });
        }
        function segment(from, to, attributes = {}) {
            return board.create('segment', [from, to], { ...base, ...attributes });
        }
        const axisLabels = [];
        function axisText(position, value, attributes) {
            const label = text(position, value, attributes);
            axisLabels.push({ label, position, attributes });
        }
        const every = options.labelEvery || (Math.max((x[1] - x[0]) / step.x, (y[1] - y[0]) / step.y) > 12 ? 2 : 1);
        for (let tick = Math.ceil(x[0] / step.x); tick * step.x <= x[1]; tick++) {
            const value = tick * step.x;
            segment([value, y[0]], [value, y[1]], { strokeColor: colour('--border'), strokeWidth: 1, layer: 0 });
            if (value !== 0 && tick % every === 0) {
                axisText([value, -0.25 * step.y], formatNumber(value), { anchorX: 'middle', anchorY: 'top' });
            }
        }
        for (let tick = Math.ceil(y[0] / step.y); tick * step.y <= y[1]; tick++) {
            const value = tick * step.y;
            segment([x[0], value], [x[1], value], { strokeColor: colour('--border'), strokeWidth: 1, layer: 0 });
            if (value !== 0 && tick % every === 0) {
                axisText([0, value], formatNumber(value), { anchorX: 'right', anchorY: 'middle', offset: [-10, 0] });
            }
        }
        const axisStyle = { strokeColor: colour('--text-soft'), strokeWidth: 2, lastArrow: true, layer: 2 };
        segment([x[0], 0], [x[1] + 0.4 * step.x, 0], axisStyle);
        segment([0, y[0]], [0, y[1] + 0.4 * step.y], axisStyle);
        axisText([0, 0], '0', { anchorX: 'left', anchorY: 'top', offset: [6, -6] });
        text([x[1] + 0.45 * step.x, 0.2 * step.y], 'x');
        text([0.2 * step.x, y[1] + 0.4 * step.y], 'y');

        const items = new Set();
        let editable = true;
        let destroyed = false;
        let activeTool = null;
        let gesture = null;
        function clamp(point) {
            const rounded = snap(point, step);
            return [Math.max(x[0], Math.min(x[1], rounded[0])), Math.max(y[0], Math.min(y[1], rounded[1]))];
        }
        function pixels(point) {
            return [board.origin.scrCoords[1] + point[0] * board.unitX,
                board.origin.scrCoords[2] - point[1] * board.unitY];
        }
        function pointer(event, snapped = true) {
            const rect = surface.getBoundingClientRect();
            const position = [(event.clientX - rect.left - board.origin.scrCoords[1]) / board.unitX,
                (board.origin.scrCoords[2] - event.clientY + rect.top) / board.unitY];
            return snapped ? clamp(position) : position;
        }
        function describe(message) {
            live.textContent = message;
        }
        function markedLabel(label, tone) {
            return label ? `${label}${tone === 'correct' ? ' ✓' : tone === 'incorrect' ? ' ✗' : ''}` : '';
        }
        function pointLabel(position, content, settings, attributes, arrow = null) {
            const centred = arrow !== null;
            let label;
            function placement() {
                const [px, py] = pixels(position);
                // Measure the unwrapped label, including any coordinate emphasis.
                const bounds = label?.rendNode?.getBoundingClientRect();
                const width = bounds?.width || 0;
                const height = bounds?.height || 0;
                const [left, top] = pixels([x[0], y[1]]);
                const [right, bottom] = pixels([x[1], y[0]]);
                // Arrow labels on an axis also need clearance from its tick labels.
                const gap = centred && (position[0] === 0 || position[1] === 0) ? 28 : 12;
                const positions = {
                    right: centred ? [px + gap, py - height / 2]
                        : [px + 0.2 * board.unitX, py - 0.3 * board.unitY - height / 2],
                    left: [px - gap - width, py - height / 2],
                    above: [px - width / 2, py - gap - height],
                    below: [px - width / 2, py + gap]
                };
                const side = settings.labelSide || 'right';
                const opposite = { right: 'left', left: 'right', above: 'below', below: 'above' };
                let [lx, ly] = positions[side];
                if ((side === 'right' && lx + width > right) || (side === 'left' && lx < left) ||
                    (side === 'above' && ly < top) || (side === 'below' && ly + height > bottom)) {
                    [lx, ly] = positions[opposite[side]];
                }
                if (arrow) {
                    const from = pixels(arrow.from);
                    const to = pixels(arrow.to);
                    const size = Math.hypot(to[0] - from[0], to[1] - from[1]);
                    const normal = size > 0
                        ? [-(to[1] - from[1]) / size, (to[0] - from[0]) / size] : [0, 1];
                    const clearance = Math.abs(normal[0]) * width / 2 +
                        Math.abs(normal[1]) * height / 2 + 12;
                    const obstacles = axisLabels.map(({ label, position, attributes }) => {
                        const bounds = label.rendNode.getBoundingClientRect();
                        const [px, py] = pixels(position);
                        const { offset = [0, 0], anchorX, anchorY } = attributes;
                        // Use current board coordinates: the DOM positions can still
                        // describe the previous frame while JSXGraph is resizing.
                        const left = px + offset[0] - (anchorX === 'middle' ? bounds.width / 2
                            : anchorX === 'right' ? bounds.width : 0);
                        const top = py - offset[1] - (anchorY === 'middle' ? bounds.height / 2 : 0);
                        return { left: left - 6, right: left + bounds.width + 6,
                            top: top - 6, bottom: top + bounds.height + 6 };
                    });
                    function fit(candidate) {
                        let [lx, ly] = candidate;
                        // Explicit sides along the arrow still need perpendicular clearance.
                        const distance = (lx + width / 2 - px) * normal[0] +
                            (ly + height / 2 - py) * normal[1];
                        if (Math.abs(distance) < clearance) {
                            const shift = (distance < 0 ? -clearance : clearance) - distance;
                            lx += normal[0] * shift;
                            ly += normal[1] * shift;
                        }
                        return [Math.max(left, Math.min(right - width, lx)),
                            Math.max(top, Math.min(bottom - height, ly))];
                    }
                    const lines = [...items].filter(entry => entry.kind === 'line').map(entry => {
                        const line = entry.value;
                        const from = pixels(line.axis === 'x' ? [line.value, y[0]]
                            : line.axis === 'y' ? [x[0], line.value] : [0, line.c]);
                        const to = pixels(line.axis === 'x' ? [line.value, y[1]]
                            : line.axis === 'y' ? [x[1], line.value] : [1, line.m + line.c]);
                        const size = Math.hypot(to[0] - from[0], to[1] - from[1]);
                        return { from, normal: [-(to[1] - from[1]) / size, (to[0] - from[0]) / size] };
                    });
                    function clear(candidate) {
                        const [lx, ly] = candidate;
                        const distance = (lx + width / 2 - px) * normal[0] +
                            (ly + height / 2 - py) * normal[1];
                        return Math.abs(distance) >= clearance - 0.5 &&
                            lines.every(({ from, normal }) => {
                                const distance = (lx + width / 2 - from[0]) * normal[0] +
                                    (ly + height / 2 - from[1]) * normal[1];
                                return Math.abs(distance) > Math.abs(normal[0]) * width / 2 +
                                    Math.abs(normal[1]) * height / 2 + 6;
                            }) &&
                            obstacles.every(bounds => lx + width <= bounds.left || lx >= bounds.right ||
                                ly + height <= bounds.top || ly >= bounds.bottom);
                    }
                    const sides = [side, opposite[side], ...Object.keys(positions)];
                    const candidates = sides.map(side => fit(positions[side]));
                    const placed = candidates.find(clear);
                    if (placed) return placed;
                    // Choose the smallest safe nudge, keeping the label near its arrow.
                    const nudges = candidates.flatMap(([lx, ly]) => obstacles.flatMap(bounds =>
                        [[bounds.left - width, ly], [bounds.right, ly],
                            [lx, bounds.top - height], [lx, bounds.bottom]]));
                    const safe = nudges.map(fit).filter(clear);
                    const distance = position => Math.hypot(position[0] - candidates[0][0],
                        position[1] - candidates[0][1]);
                    safe.sort((a, b) => distance(a) - distance(b));
                    return safe[0] || candidates[0];
                }
                // At a corner, also keep the perpendicular dimension inside the grid.
                return [Math.max(left, Math.min(right - width, lx)),
                    Math.max(top, Math.min(bottom - height, ly))];
            }
            label = text([
                () => (placement()[0] - board.origin.scrCoords[1]) / board.unitX,
                () => (board.origin.scrCoords[2] - placement()[1]) / board.unitY
            ], content, {
                ...attributes, anchorX: 'left', anchorY: 'top',
                cssStyle: 'white-space: nowrap; width: max-content;'
            });
            return label;
        }
        function item(kind, initial, settings = {}) {
            let value = initial;
            let style = { tone: 'neutral', ...settings };
            let objects = [];
            const entry = {
                kind,
                get value() { return value; },
                get settings() { return style; },
                update(changes = {}) {
                    if (Object.hasOwn(changes, 'value')) value = changes.value;
                    style = { ...style, ...changes };
                    objects.forEach(object => board.removeObject(object));
                    objects = [];
                    const attributes = { ...base, strokeColor: tones[style.tone] || tones.neutral,
                        fillColor: tones[style.tone] || tones.neutral, fillOpacity: kind === 'point' ? 1 : 0,
                        strokeWidth: kind === 'arrow' ? 3 : 4, layer: 9 };
                    if ((kind === 'segment' || kind === 'arrow') && style.dash === true) attributes.dash = 2;
                    if (kind === 'arrow') {
                        attributes.lastArrow = { type: 1, size: 3 };
                        // Points keep their existing layer and remain above arrows,
                        // regardless of the order the lesson creates its items.
                        attributes.layer = 8;
                    }
                    let anchor;
                    let labelAttributes = {};
                    if (kind === 'point') {
                        objects.push(board.create('point', value, { ...attributes, name: '',
                            size: style.size === 'large' ? 5 : 3, showInfobox: false }));
                    } else if (kind === 'plot') {
                        objects.push(board.create('functiongraph', [value, ...(style.domain || x)], attributes));
                        const at = (style.domain || x)[1];
                        anchor = [at, value(at)];
                    } else {
                        let ends;
                        if (kind === 'line') {
                            if (value.axis === 'y') ends = [[x[0], value.value], [x[1], value.value]];
                            else if (value.axis === 'x') ends = [[value.value, y[0]], [value.value, y[1]]];
                            else ends = [[0, value.c], [1, value.m + value.c]];
                        } else ends = [value.from, value.to];
                        const type = kind === 'line' && !value.axis ? 'line' : 'segment';
                        const endpoints = ends.map(position => board.create('point', position, {
                            ...base, visible: false, name: '', showInfobox: false
                        }));
                        objects.push(board.create(type, endpoints, attributes), ...endpoints);
                        anchor = [(ends[0][0] + ends[1][0]) / 2 + 0.2, (ends[0][1] + ends[1][1]) / 2 + 0.3];
                        const orientation = classify({ from: ends[0], to: ends[1] });
                        if (kind === 'arrow') {
                            anchor = [(ends[0][0] + ends[1][0]) / 2, (ends[0][1] + ends[1][1]) / 2];
                        } else if (orientation.kind === 'horizontal') {
                            anchor = [Math.max(ends[0][0], ends[1][0]), orientation.value];
                            const below = orientation.value >= y[1] || (orientation.value < 0 && orientation.value > y[0]);
                            labelAttributes = { anchorX: 'right', anchorY: below ? 'top' : 'bottom',
                                offset: [-8, below ? -12 : 12] };
                        } else if (orientation.kind === 'vertical') {
                            anchor = [orientation.value, Math.max(ends[0][1], ends[1][1])];
                            const left = orientation.value >= x[1] || (orientation.value < 0 && orientation.value > x[0]);
                            labelAttributes = { anchorX: left ? 'right' : 'left', anchorY: 'top',
                                offset: [left ? -10 : 10, -12] };
                        }
                    }
                    let label = style.label;
                    if (kind === 'point' && !label && style.coordinates) {
                        const coordinates = value.map((number, index) => {
                            const formatted = formatNumber(number);
                            return style.highlight === ['x', 'y'][index] ? `<strong>${formatted}</strong>` : formatted;
                        });
                        label = `(${coordinates.join(', ')})`;
                    } else if (label) label = escapeHtml(label);
                    if (label) {
                        const appearance = {
                            strokeColor: style.tone === 'muted' ? colour('--text-muted') : attributes.strokeColor,
                            layer: 10, ...labelAttributes
                        };
                        const content = markedLabel(label, style.tone);
                        objects.push(kind === 'point'
                            ? pointLabel(value, content, style, appearance)
                            : kind === 'arrow' ? pointLabel(anchor, content, {
                                ...style, labelSide: style.labelSide || (value.from[1] === value.to[1] ? 'below' : 'right')
                            }, appearance, value)
                                : text(anchor, content, appearance));
                    }
                    board.update();
                },
                remove() {
                    objects.forEach(object => board.removeObject(object));
                    objects = [];
                    items.delete(entry);
                }
            };
            items.add(entry);
            entry.update();
            return entry;
        }
        function movePoint(entry, position) {
            const old = entry.value;
            const positions = entry.settings.positions;
            const next = entry.settings.drag === 'positions'
                ? [...positions.reduce((nearest, candidate) => {
                    const distance = point => Math.hypot((point[0] - position[0]) * board.unitX,
                        (point[1] - position[1]) * board.unitY);
                    return distance(candidate) < distance(nearest) ? candidate : nearest;
                })]
                : clamp(position);
            if (entry.settings.drag === 'x') next[1] = old[1];
            if (entry.settings.drag === 'y') next[0] = old[0];
            if (next[0] === old[0] && next[1] === old[1]) return;
            entry.update({ value: next });
            describe(options.pointText?.(next) || `Point at ${formatPoint(next)}.`);
            entry.settings.onMove?.([...next]);
        }
        function drawLine(settings = {}) {
            activeTool?.remove();
            const config = { minLength: 2, extend: true, movable: true, shortText: 'Draw a longer line.', ...settings };
            let line = null;
            let drawing = null;
            let start = null;
            let dot = null;
            let crosshair = null;
            let cursor = clamp([0, 0]);
            let appearance = {};
            function paint(value, finished = false, toneFinished = finished) {
                drawing?.remove();
                drawing = null;
                if (!value) return;
                const enough = length(value) >= config.minLength;
                const tone = enough ? appearance.tone || config.tone?.(copy(value), { finished: toneFinished }) || 'neutral' : 'neutral';
                const label = finished && enough ? appearance.label ?? config.label?.(copy(value)) : null;
                drawing = item('segment', value, { tone, label });
            }
            function setStart(value) {
                start = value;
                dot?.remove();
                dot = value ? item('point', value) : null;
            }
            function showCursor() {
                crosshair?.remove();
                crosshair = board.create('point', cursor, { ...base, face: '+', size: 7,
                    strokeColor: tones.neutral, fillColor: tones.neutral, name: '', layer: 10 });
                crosshair.label?.setAttribute({ visible: false });
                tooltipAt(cursor);
            }
            function finish(value) {
                setStart(null);
                const enough = length(value) >= config.minLength;
                if (enough && config.extend) {
                    const type = classify(value);
                    if (type.kind === 'horizontal') value = { from: [x[0], type.value], to: [x[1], type.value] };
                    if (type.kind === 'vertical') value = { from: [type.value, y[0]], to: [type.value, y[1]] };
                }
                line = enough ? copy(value) : null;
                paint(value, true);
                describe(enough ? (config.describe?.(copy(line)) || `Your line goes from ${formatPoint(line.from)} to ${formatPoint(line.to)}.`) : config.shortText);
                config.onChange?.(copy(line));
            }
            const tool = {
                get start() { return start; },
                get movable() { return config.movable; },
                get() { return copy(line); },
                set(value) {
                    line = copy(value);
                    setStart(null);
                    paint(line, true);
                },
                update(changes = {}) {
                    appearance = { ...appearance, ...changes };
                    if (Object.hasOwn(changes, 'value')) tool.set(changes.value);
                    else paint(line, true);
                },
                remove() {
                    drawing?.remove();
                    dot?.remove();
                    if (crosshair) board.removeObject(crosshair);
                    if (activeTool === tool) activeTool = null;
                    tooltip.hidden = true;
                },
                blur() {
                    if (crosshair) board.removeObject(crosshair);
                    crosshair = null;
                    tooltip.hidden = true;
                },
                preview(end, from = start) { paint({ from, to: end }); },
                tap(end) {
                    if (start) finish({ from: start, to: end });
                    else { setStart(end); describe(`Start point ${formatPoint(end)}.`); }
                },
                finish,
                move(delta, notify = true, original = line) {
                    if (!config.movable || !original) return;
                    const type = classify(original);
                    if (type.kind === 'sloping') return;
                    const index = type.kind === 'horizontal' ? 1 : 0;
                    const bounds = index === 1 ? y : x;
                    const value = Math.max(bounds[0], Math.min(bounds[1], type.value + delta[index]));
                    if (notify && value === type.value) return;
                    const next = copy(original);
                    next.from[index] = next.to[index] = value;
                    if (notify) finish(next);
                    else paint(next, true, false);
                },
                key(event, delta) {
                    if (event.shiftKey && delta && !config.movable) return;
                    if ((event.shiftKey && delta) || event.key === 'Enter' || event.key === ' ') showCursor();
                    if (event.key === 'Escape') {
                        setStart(null);
                        paint(line, true);
                        describe(options.cancelText || 'Drawing cancelled.');
                    } else if (event.shiftKey && delta && line && !start) tool.move(delta);
                    else if (delta) {
                        cursor = clamp([cursor[0] + delta[0], cursor[1] + delta[1]]);
                        showCursor();
                        if (start) tool.preview(cursor);
                        describe(formatPoint(cursor));
                    } else if (event.key === 'Enter' || event.key === ' ') tool.tap([...cursor]);
                }
            };
            activeTool = tool;
            tool.set(config.line || null);
            return tool;
        }
        function tooltipAt(position) {
            tooltip.textContent = formatPoint(position);
            tooltip.hidden = false;
            const [px, py] = pixels(position);
            const width = tooltip.offsetWidth;
            const height = tooltip.offsetHeight;
            tooltip.style.left = `${Math.max(0, Math.min(surface.clientWidth - width, px - width / 2))}px`;
            tooltip.style.top = `${Math.max(0, Math.min(surface.clientHeight - height, py - 40 - height))}px`;
        }
        function down(event) {
            if (!editable || event.button !== 0 || gesture) return;
            event.preventDefault();
            surface.focus();
            activeTool?.blur();
            surface.setPointerCapture(event.pointerId);
            const position = pointer(event);
            const rect = surface.getBoundingClientRect();
            const point = [...items].find(entry => entry.kind === 'point' && entry.settings.drag &&
                Math.hypot(...pixels(entry.value).map((pixel, index) => pixel - [event.clientX - rect.left, event.clientY - rect.top][index])) <= 14);
            gesture = { id: event.pointerId, position, last: position, client: [event.clientX, event.clientY], point, moved: false };
            if (!point && activeTool?.movable) {
                const line = activeTool.get();
                const type = line && classify(line);
                const distance = type?.kind === 'horizontal' ? Math.abs(event.clientY - rect.top - pixels(line.from)[1])
                    : type?.kind === 'vertical' ? Math.abs(event.clientX - rect.left - pixels(line.from)[0]) : Infinity;
                gesture.original = distance <= 20 ? line : null;
            }
        }
        function move(event) {
            if (!gesture || event.pointerId !== gesture.id || !editable) return;
            const position = pointer(event, gesture.point?.settings.drag !== 'positions');
            if (Math.hypot(event.clientX - gesture.client[0], event.clientY - gesture.client[1]) > 8) gesture.moved = true;
            if (gesture.point) movePoint(gesture.point, position);
            else if (activeTool && gesture.moved) {
                if (gesture.last && position.every((value, index) => value === gesture.last[index])) return;
                gesture.last = position;
                tooltipAt(position);
                if (gesture.original) activeTool.move(position.map((value, index) => value - gesture.position[index]), false, gesture.original);
                else activeTool.preview(position, activeTool.start || gesture.position);
            }
        }
        function up(event) {
            if (!gesture || event.pointerId !== gesture.id) return;
            const current = gesture;
            gesture = null;
            surface.releasePointerCapture(event.pointerId);
            tooltip.hidden = true;
            if (!editable || current.point || !activeTool) return;
            const end = pointer(event);
            if (current.moved && current.original) activeTool.move(end.map((value, index) => value - current.position[index]), true, current.original);
            else if (current.moved) activeTool.finish({ from: activeTool.start || current.position, to: end });
            else activeTool.tap(end);
        }
        function cancel() {
            gesture = null;
            tooltip.hidden = true;
            activeTool?.set(activeTool.get());
        }
        function key(event) {
            if (!editable) return;
            const delta = { ArrowLeft: [-step.x, 0], ArrowRight: [step.x, 0],
                ArrowUp: [0, step.y], ArrowDown: [0, -step.y] }[event.key];
            if (!delta && !['Enter', ' ', 'Escape'].includes(event.key)) return;
            const points = [...items].filter(entry => entry.kind === 'point' && entry.settings.drag);
            if (activeTool) { event.preventDefault(); activeTool.key(event, delta); }
            else if (points.length === 1 && delta) {
                event.preventDefault();
                const entry = points[0];
                if (entry.settings.drag === 'positions') {
                    const positions = entry.settings.positions;
                    const index = positions.findIndex(position => position.every((value, axis) => value === entry.value[axis]));
                    const direction = event.key === 'ArrowRight' || event.key === 'ArrowUp' ? 1 : -1;
                    movePoint(entry, positions[Math.max(0, Math.min(positions.length - 1, index + direction))]);
                } else movePoint(entry, entry.value.map((value, index) => value + delta[index]));
            }
        }
        const blur = () => activeTool?.blur();
        surface.addEventListener('pointerdown', down);
        surface.addEventListener('pointermove', move);
        surface.addEventListener('pointerup', up);
        surface.addEventListener('pointercancel', cancel);
        surface.addEventListener('keydown', key);
        surface.addEventListener('blur', blur);
        const resize = new ResizeObserver(() => {
            if (surface.clientWidth) {
                board.resizeContainer(surface.clientWidth, options.step ? surface.clientHeight : surface.clientWidth, true, true);
                board.setBoundingBox(boundingBox, !options.step);
            }
        });
        resize.observe(surface);
        const graph = {
            point(value, settings = {}) {
                if (settings.drag === 'positions') {
                    if (!Array.isArray(settings.positions) || settings.positions.length === 0) {
                        throw new TypeError('A positions point needs a non-empty positions list.');
                    }
                    // Listed positions are in units and need not coincide with this graph's grid.
                    const initial = settings.positions.find(position => position.every((number, axis) => number === value[axis]));
                    return item('point', [...(initial || settings.positions[0])], settings);
                }
                return item('point', clamp(value), settings);
            },
            line: (value, settings) => item('line', value, settings),
            segment: (from, to, settings) => item('segment', { from, to }, settings),
            arrow: (from, to, settings) => item('arrow', { from, to }, settings),
            plot: (fn, settings) => item('plot', fn, settings),
            drawLine, describe,
            clear() {
                activeTool?.remove();
                [...items].forEach(entry => entry.remove());
                describe('');
            },
            setEditable(value) {
                editable = value;
                if (!editable) { cancel(); activeTool?.blur(); }
            },
            destroy() {
                if (destroyed) return;
                destroyed = true;
                resize.disconnect();
                removal.disconnect();
                surface.removeEventListener('pointerdown', down);
                surface.removeEventListener('pointermove', move);
                surface.removeEventListener('pointerup', up);
                surface.removeEventListener('pointercancel', cancel);
                surface.removeEventListener('keydown', key);
                surface.removeEventListener('blur', blur);
                window.JXG.JSXGraph.freeBoard(board);
                wrapper.remove();
            }
        };
        // Question cards can be removed by Back/Next without a widget disposal hook.
        const removal = new MutationObserver(() => { if (!host.isConnected) graph.destroy(); });
        removal.observe(document.body, { childList: true, subtree: true });
        return graph;
    }

    function questionWidget(config) {
        return {
            isEmpty: config.isEmpty,
            mark: config.mark,
            answerText: config.answerText,
            render(host, { value, editable, onChange }) {
                const graph = create(host, config.graph);
                config.setup?.(graph);
                const tool = graph.drawLine({ ...config.draw, line: value, tone: () => 'neutral', label: () => null, onChange });
                graph.setEditable(editable);
                return {
                    update({ value, editable, phase }) {
                        const tone = phase === 'answer' ? 'neutral'
                            : config.resultTone?.(value, phase) || (phase === 'correct' ? 'correct' : 'incorrect');
                        tool.update({ value, tone,
                            label: phase === 'answer' || value === null ? null : config.resultLabel?.(value) });
                        graph.setEditable(editable && phase === 'answer');
                    },
                    focus() { host.querySelector('.maths-graph__board').focus(); }
                };
            }
        };
    }

    window.Maths1to9Graph = { create, snap, classify, length, formatNumber, formatPoint, questionWidget };
})();
