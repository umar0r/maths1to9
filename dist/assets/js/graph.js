/* Shared coordinate graphs. Lessons supply content, marking and persistence. */
(() => {
    'use strict';

    function snap(point) {
        return point.map(value => Math.round(value) || 0);
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
        const wrapper = document.createElement('div');
        wrapper.className = 'maths-graph';
        const surface = document.createElement('div');
        surface.className = 'maths-graph__board';
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
            incorrect: colour('--error-dark'), muted: colour('--border-dark')
        };
        const extent = Math.max(x[1] - x[0], y[1] - y[0]) / 2 + 0.8;
        const cx = (x[0] + x[1]) / 2;
        const cy = (y[0] + y[1]) / 2;
        const boundingBox = [cx - extent, cy + extent, cx + extent, cy - extent];
        const board = window.JXG.JSXGraph.initBoard(surface, {
            boundingbox: boundingBox,
            axis: false, grid: false, keepaspectratio: true,
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
            const placed = position.map((coordinate, index) => () => coordinate +
                offset[index] / (index === 0 ? board.unitX : board.unitY));
            return board.create('text', [...placed, value], {
                ...base, fontSize: 12, strokeColor: colour('--text'),
                cssClass: 'maths-graph__label', parse: false, ...style
            });
        }
        function segment(from, to, attributes = {}) {
            return board.create('segment', [from, to], { ...base, ...attributes });
        }
        const every = options.labelEvery || (Math.max(x[1] - x[0], y[1] - y[0]) > 12 ? 2 : 1);
        for (let value = Math.ceil(x[0]); value <= x[1]; value++) {
            segment([value, y[0]], [value, y[1]], { strokeColor: colour('--border'), strokeWidth: 1, layer: 0 });
            if (value !== 0 && value % every === 0) {
                text([value, -0.25], formatNumber(value), { anchorX: 'middle', anchorY: 'top' });
            }
        }
        for (let value = Math.ceil(y[0]); value <= y[1]; value++) {
            segment([x[0], value], [x[1], value], { strokeColor: colour('--border'), strokeWidth: 1, layer: 0 });
            if (value !== 0 && value % every === 0) {
                text([0, value], formatNumber(value), { anchorX: 'right', anchorY: 'middle', offset: [-10, 0] });
            }
        }
        const axisStyle = { strokeColor: colour('--text-soft'), strokeWidth: 2, lastArrow: true, layer: 2 };
        segment([x[0], 0], [x[1] + 0.4, 0], axisStyle);
        segment([0, y[0]], [0, y[1] + 0.4], axisStyle);
        text([0, 0], '0', { anchorX: 'left', anchorY: 'top', offset: [6, -6] });
        text([x[1] + 0.45, 0.2], 'x');
        text([0.2, y[1] + 0.4], 'y');

        const items = new Set();
        let editable = true;
        let destroyed = false;
        let activeTool = null;
        let gesture = null;
        function clamp(point) {
            const rounded = snap(point);
            return [Math.max(x[0], Math.min(x[1], rounded[0])), Math.max(y[0], Math.min(y[1], rounded[1]))];
        }
        function pixels(point) {
            return [board.origin.scrCoords[1] + point[0] * board.unitX,
                board.origin.scrCoords[2] - point[1] * board.unitY];
        }
        function pointer(event) {
            const rect = surface.getBoundingClientRect();
            return clamp([(event.clientX - rect.left - board.origin.scrCoords[1]) / board.unitX,
                (board.origin.scrCoords[2] - event.clientY + rect.top) / board.unitY]);
        }
        function describe(message) {
            live.textContent = message;
        }
        function markedLabel(label, tone) {
            return label ? `${label}${tone === 'correct' ? ' ✓' : tone === 'incorrect' ? ' ✗' : ''}` : '';
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
                        strokeWidth: 4, layer: 9 };
                    let anchor;
                    let labelAttributes = {};
                    if (kind === 'point') {
                        objects.push(board.create('point', value, { ...attributes, name: '',
                            size: style.size === 'large' ? 5 : 3, showInfobox: false }));
                        anchor = [value[0] + 0.2, value[1] + 0.3];
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
                        if (orientation.kind === 'horizontal') {
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
                        objects.push(text(anchor, markedLabel(label, style.tone), {
                            strokeColor: style.tone === 'muted' ? colour('--text-muted') : attributes.strokeColor,
                            layer: 10, ...labelAttributes
                        }));
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
            const next = clamp(position);
            if (entry.settings.drag === 'x') next[1] = old[1];
            if (entry.settings.drag === 'y') next[0] = old[0];
            if (next[0] === old[0] && next[1] === old[1]) return;
            entry.update({ value: next });
            describe(options.pointText?.(next) || `Point at ${formatPoint(next)}.`);
            entry.settings.onMove?.([...next]);
        }
        function drawLine(settings = {}) {
            activeTool?.remove();
            const config = { minLength: 2, extend: true, shortText: 'Draw a longer line.', ...settings };
            let line = null;
            let drawing = null;
            let start = null;
            let dot = null;
            let crosshair = null;
            let cursor = clamp([0, 0]);
            let appearance = {};
            function paint(value, finished = false) {
                drawing?.remove();
                drawing = null;
                if (!value) return;
                const enough = length(value) >= config.minLength;
                const tone = enough ? appearance.tone || config.tone?.(copy(value)) || 'neutral' : 'neutral';
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
                    if (!original) return;
                    const type = classify(original);
                    if (type.kind === 'sloping') return;
                    const index = type.kind === 'horizontal' ? 1 : 0;
                    const bounds = index === 1 ? y : x;
                    const value = Math.max(bounds[0], Math.min(bounds[1], type.value + delta[index]));
                    if (notify && value === type.value) return;
                    const next = copy(original);
                    next.from[index] = next.to[index] = value;
                    if (notify) finish(next);
                    else paint(next, true);
                },
                key(event, delta) {
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
            if (!point && activeTool) {
                const line = activeTool.get();
                const type = line && classify(line);
                const distance = type?.kind === 'horizontal' ? Math.abs(event.clientY - rect.top - pixels(line.from)[1])
                    : type?.kind === 'vertical' ? Math.abs(event.clientX - rect.left - pixels(line.from)[0]) : Infinity;
                gesture.original = distance <= 20 ? line : null;
            }
        }
        function move(event) {
            if (!gesture || event.pointerId !== gesture.id || !editable) return;
            const position = pointer(event);
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
            const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[event.key];
            if (!delta && !['Enter', ' ', 'Escape'].includes(event.key)) return;
            const points = [...items].filter(entry => entry.kind === 'point' && entry.settings.drag);
            if (activeTool) { event.preventDefault(); activeTool.key(event, delta); }
            else if (points.length === 1 && delta) {
                event.preventDefault();
                movePoint(points[0], points[0].value.map((value, index) => value + delta[index]));
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
                board.resizeContainer(surface.clientWidth, surface.clientWidth, true, true);
                board.setBoundingBox(boundingBox, true);
            }
        });
        resize.observe(surface);
        const graph = {
            point: (value, settings) => item('point', clamp(value), settings),
            line: (value, settings) => item('line', value, settings),
            segment: (from, to, settings) => item('segment', { from, to }, settings),
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
