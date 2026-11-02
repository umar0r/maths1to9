/* Shared geometry diagrams. Lessons supply content, marking and persistence. */
(() => {
    'use strict';

    const SVG = 'http://www.w3.org/2000/svg';
    const ARC_RADIUS = 28;
    const SMALL_ANGLE_ARC = 44;
    const LABEL_PADDING = 32;

    // ---------------------------------------------------------------
    // Helpers that need no browser
    // ---------------------------------------------------------------

    function toRadians(degrees) {
        return (degrees * Math.PI) / 180;
    }

    function toDegrees(radians) {
        return (radians * 180) / Math.PI;
    }

    function normaliseHeading(value) {
        return ((value % 360) + 360) % 360;
    }

    function formatNumber(value) {
        const tidy = Object.is(value, -0) ? 0 : Math.round(value * 1e6) / 1e6;
        return String(tidy).replace(/-/g, '−');
    }

    function formatPoint(point) {
        return `(${point.map(formatNumber).join(', ')})`;
    }

    // SVG attributes need a plain hyphen, so never use formatNumber there.
    function attributeNumber(value) {
        return String(Math.round(value * 1000) / 1000);
    }

    function formatAngle(value) {
        return `${formatNumber(Math.round(value * 10) / 10)}°`;
    }

    function formatBearing(value) {
        const rounded = Math.round(normaliseHeading(Math.round(value))) % 360;
        return `${String(rounded).padStart(3, '0')}°`;
    }

    function fromBearing(start, bearing, distance) {
        const radians = toRadians(bearing);
        return [start[0] + distance * Math.sin(radians), start[1] + distance * Math.cos(radians)];
    }

    function bearingOf(from, to) {
        return normaliseHeading(toDegrees(Math.atan2(to[0] - from[0], to[1] - from[1])));
    }

    function angleAt(a, vertex, b, turn = 'smaller') {
        const start = toDegrees(Math.atan2(a[1] - vertex[1], a[0] - vertex[0]));
        const end = toDegrees(Math.atan2(b[1] - vertex[1], b[0] - vertex[0]));
        const anticlockwise = normaliseHeading(end - start);
        if (turn === 'anticlockwise') return anticlockwise;
        if (turn === 'clockwise') return anticlockwise === 0 ? 0 : 360 - anticlockwise;
        return anticlockwise > 180 ? 360 - anticlockwise : anticlockwise;
    }

    function regularPolygon(count, centre, radius, startAngle = 90) {
        return Array.from({ length: count }, (unused, index) => {
            const angle = startAngle + (index * 360) / count;
            return [centre[0] + radius * Math.cos(toRadians(angle)),
                centre[1] + radius * Math.sin(toRadians(angle))];
        });
    }

    // The middle of the widest empty wedge between the given directions.
    function labelDirection(directions) {
        if (!directions.length) return 45;
        const sorted = [...directions].map(normaliseHeading).sort((a, b) => a - b);
        let bestStart = sorted[0];
        let bestGap = -1;
        for (let index = 0; index < sorted.length; index++) {
            const next = index === sorted.length - 1 ? sorted[0] + 360 : sorted[index + 1];
            const gap = next - sorted[index];
            if (gap > bestGap) {
                bestGap = gap;
                bestStart = sorted[index];
            }
        }
        return normaliseHeading(bestStart + bestGap / 2);
    }

    function snapAngle(angle, step = 1) {
        const size = step > 0 ? step : 1;
        return normaliseHeading(Math.round(angle / size) * size);
    }

    // A protractor's numbers run from the zero line in the chosen direction:
    // anticlockwise grows the maths angle, clockwise shrinks it.
    function protractorTurn(turn) {
        return turn === 'clockwise' ? -1 : 1;
    }

    function protractorDirection(zero, turn, step) {
        return normaliseHeading(zero + protractorTurn(turn) * step);
    }

    // Where a protractor mark sits, as a point one unit from the centre in
    // maths coordinates (y up), so a test can check which way the scale runs.
    function protractorPoint(zero, turn, step) {
        const radians = toRadians(protractorDirection(zero, turn, step));
        return [Math.cos(radians), Math.sin(radians)];
    }

    // ---------------------------------------------------------------
    // The diagram
    // ---------------------------------------------------------------

    function create(host, options = {}) {
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            throw new Error('Maths1to9Diagram.create needs a browser.');
        }
        if (!host || !host.isConnected) {
            throw new Error("Add the diagram's container to the page before creating a diagram.");
        }
        if (!options.label) {
            throw new TypeError('A diagram needs a label for its accessible name.');
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'maths-diagram';
        const surface = document.createElement('div');
        surface.className = 'maths-diagram__surface';
        const svg = document.createElementNS(SVG, 'svg');
        svg.setAttribute('class', 'maths-diagram__svg');
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', options.label);
        const gridLayer = document.createElementNS(SVG, 'g');
        gridLayer.setAttribute('class', 'maths-diagram__grid');
        const wire = document.createElementNS(SVG, 'g');
        svg.append(gridLayer, wire);
        surface.append(svg);
        wrapper.append(surface);
        if (options.note) {
            const note = document.createElement('p');
            note.className = 'maths-diagram__note';
            note.textContent = options.note;
            wrapper.append(note);
        }
        const live = document.createElement('p');
        live.className = 'maths-diagram__description';
        live.setAttribute('aria-live', 'polite');
        wrapper.append(live);
        host.append(wrapper);

        const computed = getComputedStyle(host);
        const colour = property => computed.getPropertyValue(property).trim();
        const palette = {
            neutral: colour('--primary'), highlight: colour('--accent'),
            correct: colour('--success-dark'), incorrect: colour('--error-dark'),
            muted: colour('--text-muted'), text: colour('--text'),
            surface: colour('--surface'), border: colour('--border-dark'),
            fill: colour('--primary-light')
        };

        const items = [];
        const names = new Map();
        const norths = [];
        const grid = options.grid;
        let box = options.view ? { x: [...options.view.x], y: [...options.view.y] } : null;
        const drawing = { width: 0, height: 0, scale: 1, left: 0, top: 0, ready: false };
        let editable = true;
        let selected = null;
        let dragging = null;
        let queued = false;
        let destroyed = false;
        let onSelectCallback = null;

        function resolve(position) {
            if (Array.isArray(position)) return [Number(position[0]), Number(position[1])];
            if (position && position.__isPoint) return [...position.current];
            throw new TypeError('A position must be [x, y] or a point.');
        }

        function element(name, attributes = {}) {
            const node = document.createElementNS(SVG, name);
            for (const [key, value] of Object.entries(attributes)) {
                if (value === null || value === undefined || value === false) continue;
                node.setAttribute(key, value);
            }
            return node;
        }

        function project(position) {
            return [drawing.left + (position[0] - box.x[0]) * drawing.scale,
                drawing.top - (position[1] - box.y[0]) * drawing.scale];
        }

        function unproject(clientX, clientY) {
            const bounds = svg.getBoundingClientRect();
            return [box.x[0] + (clientX - bounds.left - drawing.left) / drawing.scale,
                box.y[0] + (drawing.top - (clientY - bounds.top)) / drawing.scale];
        }

        function strokeWidth(item) {
            return item.settings.tone === 'highlight' ? 3 : 2;
        }

        function toneColour(item) {
            return palette[item.settings.tone] || palette.neutral;
        }

        function directionFrom(origin, target) {
            return toDegrees(Math.atan2(target[1] - origin[1], target[0] - origin[0]));
        }

        // ---------------------------------------------------------------
        // Labels: one halo'd text, nudged until it touches nothing else
        // ---------------------------------------------------------------

        function labelSegments(exclude) {
            const segments = [];
            for (const item of items) {
                if (item === exclude || !item.visible) continue;
                segments.push(...item.obstacles());
            }
            return segments;
        }

        function labelRects(exclude) {
            return [...wire.querySelectorAll('[data-label]')]
                .filter(node => node !== exclude)
                .map(node => {
                    const bounds = node.getBBox();
                    return { left: bounds.x - 3, top: bounds.y - 3,
                        right: bounds.x + bounds.width + 3, bottom: bounds.y + bounds.height + 3 };
                });
        }

        function overlap(one, other) {
            return one.left < other.right && one.right > other.left &&
                one.top < other.bottom && one.bottom > other.top;
        }

        function insideDrawing(rect) {
            return rect.left >= 1 && rect.top >= 1 &&
                rect.right <= drawing.width - 1 && rect.bottom <= drawing.height - 1;
        }

        function pointInRect(x, y, rect) {
            return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
        }

        function segmentsCross(a, b, c, d) {
            const side = (p, q, r) =>
                (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
            const one = side(a, b, c);
            const two = side(a, b, d);
            const three = side(c, d, a);
            const four = side(c, d, b);
            return one * two < 0 && three * four < 0;
        }

        function segmentNearRect(segment, rect) {
            const [a, b] = segment;
            if (pointInRect(a[0], a[1], rect) || pointInRect(b[0], b[1], rect)) return true;
            const corners = [[rect.left, rect.top], [rect.right, rect.top],
                [rect.right, rect.bottom], [rect.left, rect.bottom]];
            return corners.some((corner, index) =>
                segmentsCross(a, b, corner, corners[(index + 1) % corners.length]));
        }

        function labelText(content, extraClass) {
            const text = element('text', {
                class: extraClass || 'maths-diagram__label', 'text-anchor': 'middle',
                'dominant-baseline': 'central', 'data-label': ''
            });
            text.textContent = content;
            return text;
        }

        // Place a label just outside whatever it belongs to (an arc, a dot, a
        // line), keeping clear of every other label and every line.
        function placeLabel(text, origin, directions, settings = {}) {
            const start = settings.from || 0;
            const gap = settings.gap ?? 8;
            const clearance = settings.clearance ?? 4;
            // Labels that must stay on one side (an angle inside its sector, a
            // side label outside its side) grow the view instead of moving.
            const mayGrow = settings.grow === true;
            text.setAttribute('x', '0');
            text.setAttribute('y', '0');
            const size = text.getBBox();
            const segments = labelSegments();
            const rects = labelRects(text);
            let fallback = null;
            let clipped = null;
            let clippedAt = -1;
            let crowded = null;
            for (const [index, direction] of directions.entries()) {
                const radians = toRadians(direction);
                const extent = (Math.abs(Math.cos(radians)) * size.width +
                    Math.abs(Math.sin(radians)) * size.height) / 2;
                for (let extra = 0; extra <= 4; extra++) {
                    const distance = start + gap + extent + extra * 9;
                    const x = origin[0] + distance * Math.cos(radians);
                    const y = origin[1] - distance * Math.sin(radians);
                    text.setAttribute('x', attributeNumber(x));
                    text.setAttribute('y', attributeNumber(y));
                    if (!fallback) fallback = [x, y];
                    const bounds = text.getBBox();
                    const rect = { left: bounds.x - clearance, top: bounds.y - clearance,
                        right: bounds.x + bounds.width + clearance,
                        bottom: bounds.y + bounds.height + clearance };
                    const free = !rects.some(other => overlap(rect, other)) &&
                        !segments.some(segment => segmentNearRect(segment, rect));
                    const fits = insideDrawing(rect);
                    if (free && fits) {
                        // An earlier, preferred direction already has a clear
                        // spot only just past the edge: keep that one and let
                        // the fitted view grow, rather than swapping sides.
                        if (mayGrow && clipped && clippedAt < index) break;
                        return;
                    }
                    // Clear of everything but past the edge: keep it here and
                    // let the fitted view grow instead of moving the label.
                    if (mayGrow && free && !clipped) {
                        clipped = [x, y];
                        clippedAt = index;
                    }
                    if (fits && !crowded) crowded = [x, y];
                }
            }
            const chosen = clipped || crowded || fallback;
            if (chosen) {
                text.setAttribute('x', attributeNumber(chosen[0]));
                text.setAttribute('y', attributeNumber(chosen[1]));
            }
        }

        function screenAngle(vector) {
            return toDegrees(Math.atan2(-vector[1], vector[0]));
        }

        // ---------------------------------------------------------------
        // Items
        // ---------------------------------------------------------------

        function schedule() {
            if (queued) return;
            queued = true;
            queueMicrotask(() => {
                queued = false;
                paint();
            });
        }

        function makeItem(kind, settings, draw) {
            if (settings.select && !settings.name) {
                throw new TypeError(`A tappable ${kind} needs a name for its accessible label.`);
            }
            const group = element('g', { class: `maths-diagram__item maths-diagram__${kind}` });
            wire.append(group);
            const item = {
                kind, group, settings: { tone: 'neutral', ...settings },
                dependencies: [], visible: true, selected: false, draw,
                extent() { return []; },
                obstacles() { return []; },
                edges() { return []; },
                paint() {
                    if (destroyed || !item.visible) return;
                    if (!drawing.ready || box === null) {
                        schedule();
                        return;
                    }
                    group.replaceChildren();
                    item.draw(item);
                },
                setTone(tone) { item.settings.tone = tone; item.paint(); },
                setLabel(text) { item.settings.label = text; item.paint(); },
                show() { item.visible = true; item.paint(); },
                hide() { item.visible = false; group.replaceChildren(); },
                remove() {
                    group.remove();
                    const index = items.indexOf(item);
                    if (index >= 0) items.splice(index, 1);
                    const north = norths.indexOf(item);
                    if (north >= 0) norths.splice(north, 1);
                    if (item.settings.name) names.delete(item.settings.name);
                    if (selected === item) selected = null;
                    item.dependencies.forEach(point => point.dependents.delete(item));
                }
            };
            if (item.settings.name) names.set(item.settings.name, item);
            items.push(item);
            return item;
        }

        function depend(item, positions) {
            for (const position of positions) {
                if (position && position.__isPoint) {
                    position.dependents.add(item);
                    item.dependencies.push(position);
                }
            }
        }

        function fitBox() {
            const corners = [];
            for (const item of items) corners.push(...item.extent());
            if (!corners.length) return { x: [-1, 1], y: [-1, 1] };
            const xs = corners.map(corner => corner[0]);
            const ys = corners.map(corner => corner[1]);
            let minX = Math.min(...xs);
            let maxX = Math.max(...xs);
            let minY = Math.min(...ys);
            let maxY = Math.max(...ys);
            if (maxX - minX < 1) {
                const middle = (minX + maxX) / 2;
                minX = middle - 0.5;
                maxX = middle + 0.5;
            }
            if (maxY - minY < 1) {
                const middle = (minY + maxY) / 2;
                minY = middle - 0.5;
                maxY = middle + 0.5;
            }
            return { x: [minX, maxX], y: [minY, maxY] };
        }

        function measure() {
            const available = Math.max(160, Math.min(host.clientWidth || 440, 440));
            const spanX = box.x[1] - box.x[0];
            const spanY = box.y[1] - box.y[0];
            const aspect = spanX / spanY;
            const height = Math.min(360, available / aspect);
            const width = Math.min(available, height * aspect);
            const padding = options.view ? 10 : LABEL_PADDING;
            drawing.width = Math.round(width);
            drawing.height = Math.round(height);
            drawing.scale = Math.max(0.001, Math.min(
                (drawing.width - 2 * padding) / spanX,
                (drawing.height - 2 * padding) / spanY));
            drawing.left = (drawing.width - spanX * drawing.scale) / 2;
            drawing.top = (drawing.height + spanY * drawing.scale) / 2;
            surface.style.width = `${drawing.width}px`;
            surface.style.height = `${drawing.height}px`;
            svg.setAttribute('width', String(drawing.width));
            svg.setAttribute('height', String(drawing.height));
            svg.setAttribute('viewBox', `0 0 ${drawing.width} ${drawing.height}`);
        }

        function paintGrid() {
            gridLayer.replaceChildren();
            if (!grid) return;
            const step = grid === true ? 1 : (grid.step || 1);
            const colourHere = palette.border;
            const [left, top] = project([box.x[0], box.y[1]]);
            const [right, bottom] = project([box.x[1], box.y[0]]);
            for (let x = Math.ceil(box.x[0] / step) * step; x <= box.x[1]; x += step) {
                const [px] = project([x, 0]);
                gridLayer.append(element('path', {
                    d: `M ${px} ${top} L ${px} ${bottom}`, stroke: colourHere,
                    'stroke-width': 1, 'stroke-opacity': 0.35
                }));
            }
            for (let y = Math.ceil(box.y[0] / step) * step; y <= box.y[1]; y += step) {
                const [, py] = project([0, y]);
                gridLayer.append(element('path', {
                    d: `M ${left} ${py} L ${right} ${py}`, stroke: colourHere,
                    'stroke-width': 1, 'stroke-opacity': 0.35
                }));
            }
        }

        // Arcs, labels and north arrows reach past the points they belong to,
        // so after painting, grow the view until nothing is clipped.
        function growToContent() {
            let bounds;
            try {
                bounds = svg.getBBox();
            } catch (unused) {
                return false;
            }
            if (!bounds || !bounds.width) return false;
            let grow = false;
            const left = Math.max(0, -bounds.x);
            const right = Math.max(0, bounds.x + bounds.width - drawing.width);
            const top = Math.max(0, -bounds.y);
            const bottom = Math.max(0, bounds.y + bounds.height - drawing.height);
            const margin = 10;
            if (left > 1) {
                box.x[0] -= (left + margin) / drawing.scale;
                grow = true;
            }
            if (right > 1) {
                box.x[1] += (right + margin) / drawing.scale;
                grow = true;
            }
            if (top > 1) {
                box.y[1] += (top + margin) / drawing.scale;
                grow = true;
            }
            if (bottom > 1) {
                box.y[0] -= (bottom + margin) / drawing.scale;
                grow = true;
            }
            return grow;
        }

        function paint() {
            if (destroyed) return;
            if (box === null) box = fitBox();
            for (let pass = 0; pass < 3; pass++) {
                measure();
                paintGrid();
                drawing.ready = true;
                for (const item of items) item.paint();
                if (options.view || !growToContent()) break;
            }
            const interactive = items.some(item => item.settings.select) ||
                items.some(item => item.kind === 'point' && item.settings.drag);
            svg.setAttribute('role', interactive ? 'group' : 'img');
        }

        // ---------------------------------------------------------------
        // Points
        // ---------------------------------------------------------------

        function point(position, settings = {}) {
            const item = makeItem('point', settings, draw => drawPoint(draw));
            item.__isPoint = true;
            item.dependents = new Set();
            item.current = resolve(position);
            item.position = () => [...item.current];
            item.moveTo = next => {
                item.current = resolve(next);
                item.paint();
                item.dependents.forEach(dependent => dependent.paint());
            };
            item.extent = () => {
                const drag = item.settings.drag;
                if (drag && drag.around) {
                    const middle = resolve(drag.around);
                    const distance = Math.hypot(item.current[0] - middle[0],
                        item.current[1] - middle[1]);
                    return [[middle[0] - distance, middle[1] - distance],
                        [middle[0] + distance, middle[1] + distance]];
                }
                return [item.current];
            };
            if (item.settings.drag) {
                item.group.setAttribute('tabindex', '0');
                item.group.setAttribute('role', 'slider');
                item.group.setAttribute('data-draggable', 'true');
                item.group.setAttribute('aria-label', item.settings.label
                    ? `Point ${item.settings.label}` : 'Draggable point');
                item.group.setAttribute('aria-valuetext', ariaText(item));
                item.group.addEventListener('keydown', event => keyPoint(item, event));
                item.group.addEventListener('focus', () => focusRing(item, true));
                item.group.addEventListener('blur', () => focusRing(item, false));
            }
            item.paint();
            return item;
        }

        function focusRing(item, focused) {
            item.group.querySelector('.maths-diagram__focus')?.remove();
            if (!focused) return;
            const [x, y] = project(item.current);
            item.group.append(element('circle', {
                class: 'maths-diagram__focus', cx: x, cy: y, r: 18, fill: 'none',
                stroke: palette.neutral, 'stroke-width': 2, 'stroke-dasharray': '4 3'
            }));
        }

        // The biggest angle arc at a point: its label must sit outside it.
        function arcReach(item) {
            let reach = 0;
            for (const other of items) {
                if (other.kind !== 'angle' || other.settings.vertex !== item) continue;
                const geometry = angleGeometry(other);
                const count = other.settings.square === false
                    ? Math.max(1, Math.min(3, other.settings.arcs || 1)) : 1;
                reach = Math.max(reach, arcRadius(other, geometry.sweep) + (count - 1) * 5);
            }
            return reach;
        }

        function drawPoint(item) {
            const group = item.group;
            const settings = item.settings;
            const [x, y] = project(item.current);
            const tone = toneColour(item);
            if (settings.drag) {
                group.append(element('circle', {
                    cx: x, cy: y, r: 13, fill: tone, 'fill-opacity': 0.16
                }));
            }
            if (settings.select || settings.drag) {
                group.append(element('circle', {
                    cx: x, cy: y, r: 22, fill: 'transparent', stroke: 'none',
                    class: 'maths-diagram__target'
                }));
            }
            if (settings.mark === 'dot') {
                group.append(element('circle', {
                    cx: x, cy: y, r: 4, fill: tone,
                    stroke: palette.surface, 'stroke-width': 1.5
                }));
            } else if (settings.mark === 'cross') {
                const size = 5;
                group.append(element('path', {
                    d: `M ${x - size} ${y - size} L ${x + size} ${y + size}
                        M ${x + size} ${y - size} L ${x - size} ${y + size}`,
                    stroke: tone, 'stroke-width': 2, 'stroke-linecap': 'round', fill: 'none'
                }));
            }
            if (settings.label) {
                const text = labelText(settings.label);
                group.append(text);
                placeLabel(text, [x, y], pointSides(item),
                    { from: arcReach(item), gap: 10, clearance: 4, grow: true });
            }
            if (settings.select) {
                group.setAttribute('data-select', settings.name);
                group.setAttribute('role', 'button');
                group.setAttribute('tabindex', '0');
                group.setAttribute('aria-label', settings.name);
                group.addEventListener('click', () => choose(item));
                group.addEventListener('keydown', event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        choose(item);
                    }
                });
            }
        }

        function insideSector(direction, sectors) {
            return sectors.some(sector => {
                const offset = normaliseHeading(direction - sector.start);
                return sector.sweep >= 0
                    ? offset <= sector.sweep
                    : normaliseHeading(sector.start - direction) <= -sector.sweep;
            });
        }

        // The middle of the widest gap that is not inside a drawn angle. Only
        // when every gap is taken does it fall back to the widest gap.
        function freeDirection(directions, sectors) {
            if (!directions.length) return 45;
            const sorted = [...new Set(directions.map(normaliseHeading))].sort((a, b) => a - b);
            let best = null;
            let bestGap = -1;
            for (let index = 0; index < sorted.length; index++) {
                const start = sorted[index];
                const end = index === sorted.length - 1 ? sorted[0] + 360 : sorted[index + 1];
                const gap = end - start;
                const middle = start + gap / 2;
                if (insideSector(middle, sectors)) continue;
                if (gap > bestGap) {
                    bestGap = gap;
                    best = middle;
                }
            }
            if (best === null) return labelDirection(directions);
            return normaliseHeading(best);
        }

        function pointSides(item) {
            if (item.settings.labelSide) {
                const fixed = { above: 90, below: 270, left: 180, right: 0 }[item.settings.labelSide];
                return [fixed ?? 45];
            }
            const directions = [];
            const sectors = [];
            for (const other of items) {
                if (other === item || !other.visible) continue;
                if (other.kind === 'angle' && other.settings.vertex === item) {
                    const geometry = angleGeometry(other);
                    sectors.push({ start: geometry.start, sweep: geometry.sweep });
                    directions.push(...other.edges());
                } else if (other.kind === 'north' && other.settings.from === item) {
                    directions.push(90);
                } else if (other.settings.from === item || other.settings.to === item) {
                    const far = other.settings.from === item ? other.settings.to : other.settings.from;
                    if (!far) continue;
                    directions.push(directionFrom(item.current, resolve(far)));
                }
            }
            const middle = freeDirection(directions, sectors);
            return [middle, middle + 18, middle - 18, middle + 36, middle - 36, middle + 180];
        }

        // ---------------------------------------------------------------
        // Segments, rays and lines
        // ---------------------------------------------------------------

        function clipToDrawing(fromUnit, toUnit, mode) {
            const from = project(fromUnit);
            const to = project(toUnit);
            const dx = to[0] - from[0];
            const dy = to[1] - from[1];
            if (!dx && !dy) return [from, from];
            const edges = { left: 5, top: 5, right: drawing.width - 5, bottom: drawing.height - 5 };
            let near = mode === 'line' ? -Infinity : 0;
            let far = Infinity;
            for (const axis of ['x', 'y']) {
                const start = axis === 'x' ? from[0] : from[1];
                const step = axis === 'x' ? dx : dy;
                const low = axis === 'x' ? edges.left : edges.top;
                const high = axis === 'x' ? edges.right : edges.bottom;
                if (!step) {
                    if (start < low || start > high) return [from, from];
                    continue;
                }
                const one = (low - start) / step;
                const two = (high - start) / step;
                near = Math.max(near, Math.min(one, two));
                far = Math.min(far, Math.max(one, two));
            }
            if (!Number.isFinite(near)) near = 0;
            if (!Number.isFinite(far) || far < near) far = near;
            return [[from[0] + dx * near, from[1] + dy * near],
                [from[0] + dx * far, from[1] + dy * far]];
        }

        function addTicks(group, from, to, count, tone) {
            const mid = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
            const length = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1;
            const along = [(to[0] - from[0]) / length, (to[1] - from[1]) / length];
            const across = [-along[1], along[0]];
            for (let index = 0; index < count; index++) {
                const offset = (index - (count - 1) / 2) * 6;
                const cx = mid[0] + along[0] * offset;
                const cy = mid[1] + along[1] * offset;
                group.append(element('path', {
                    d: `M ${cx - across[0] * 5} ${cy - across[1] * 5}
                        L ${cx + across[0] * 5} ${cy + across[1] * 5}`,
                    stroke: tone, 'stroke-width': 2, 'stroke-linecap': 'round', fill: 'none'
                }));
            }
        }

        function addArrows(group, from, to, count, tone) {
            const mid = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
            const length = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1;
            const along = [(to[0] - from[0]) / length, (to[1] - from[1]) / length];
            const across = [-along[1], along[0]];
            for (let index = 0; index < count; index++) {
                const offset = (index - (count - 1) / 2) * 8;
                const tip = [mid[0] + along[0] * offset, mid[1] + along[1] * offset];
                const back = [tip[0] - along[0] * 7, tip[1] - along[1] * 7];
                group.append(element('path', {
                    d: `M ${back[0] + across[0] * 4.5} ${back[1] + across[1] * 4.5}
                        L ${tip[0]} ${tip[1]}
                        L ${back[0] - across[0] * 4.5} ${back[1] - across[1] * 4.5}`,
                    stroke: tone, 'stroke-width': 2, 'stroke-linecap': 'round',
                    'stroke-linejoin': 'round', fill: 'none'
                }));
            }
        }

        function ends(item) {
            if (item.kind === 'segment') {
                return [project(resolve(item.settings.from)), project(resolve(item.settings.to))];
            }
            return clipToDrawing(resolve(item.settings.from), resolve(item.settings.to), item.kind);
        }

        function addLine(kind, from, to, settings = {}) {
            const item = makeItem(kind, settings, draw => drawSegment(draw));
            item.settings.from = from;
            item.settings.to = to;
            // Rays and lines run to the edge of the picture, so the view fits
            // the two given points and the drawing clips at its own border.
            item.extent = () => [resolve(item.settings.from), resolve(item.settings.to)];
            item.obstacles = () => [ends(item)];
            item.edges = () => {
                const a = resolve(item.settings.from);
                const b = resolve(item.settings.to);
                return [directionFrom(a, b), directionFrom(b, a)];
            };
            depend(item, [from, to]);
            item.paint();
            return item;
        }

        // The middle of everything drawn, in maths units.
        function drawingCentre() {
            const points = [];
            for (const item of items) points.push(...item.extent());
            if (!points.length) return [(box.x[0] + box.x[1]) / 2, (box.y[0] + box.y[1]) / 2];
            return [points.reduce((total, point) => total + point[0], 0) / points.length,
                points.reduce((total, point) => total + point[1], 0) / points.length];
        }

        function segmentSides(item, a, b) {
            const from = resolve(item.settings.from);
            const to = resolve(item.settings.to);
            const dx = to[0] - from[0];
            const dy = to[1] - from[1];
            const side = item.settings.labelSide;
            if (side === 'left' || side === 'right') {
                const normal = side === 'left' ? [-dy, dx] : [dy, -dx];
                return [toDegrees(Math.atan2(normal[1], normal[0]))];
            }
            const across = [-(b[1] - a[1]), b[0] - a[0]];
            const middle = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
            // A polygon side goes away from its polygon's own middle; a lone
            // segment goes away from the middle of everything drawn.
            const inside = project(item.settings.awayFrom || drawingCentre());
            if (across[0] * (middle[0] - inside[0]) + across[1] * (middle[1] - inside[1]) < 0) {
                across[0] = -across[0];
                across[1] = -across[1];
            }
            const primary = screenAngle(across);
            return [primary, primary + 180];
        }

        function drawSegment(item) {
            const group = item.group;
            const settings = item.settings;
            const [a, b] = ends(item);
            const tone = toneColour(item);
            const width = strokeWidth(item);
            if (settings.select) {
                group.append(element('path', {
                    d: `M ${a[0]} ${a[1]} L ${b[0]} ${b[1]}`,
                    stroke: 'transparent', 'stroke-width': 44, fill: 'none',
                    'stroke-linecap': 'round', class: 'maths-diagram__target'
                }));
            }
            group.append(element('path', {
                d: `M ${a[0]} ${a[1]} L ${b[0]} ${b[1]}`,
                stroke: tone, 'stroke-width': width, 'stroke-linecap': 'round',
                'stroke-dasharray': settings.dashed ? '7 5' : null, fill: 'none'
            }));
            if (settings.ticks) addTicks(group, a, b, settings.ticks, tone);
            if (settings.arrows) addArrows(group, a, b, settings.arrows, tone);
            if (settings.label) {
                const text = labelText(settings.label);
                group.append(text);
                placeLabel(text, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
                    segmentSides(item, a, b), { gap: 7, clearance: 4, grow: true });
            }
            if (settings.select) {
                group.setAttribute('data-select', settings.name);
                group.setAttribute('role', 'button');
                group.setAttribute('tabindex', '0');
                group.setAttribute('aria-label', settings.name);
                group.addEventListener('click', () => choose(item));
                group.addEventListener('keydown', event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        choose(item);
                    }
                });
            }
        }

        function segment(from, to, settings) {
            return addLine('segment', from, to, settings);
        }

        function ray(from, to, settings) {
            return addLine('ray', from, to, settings);
        }

        function line(from, to, settings) {
            return addLine('line', from, to, settings);
        }

        function polygon(corners, settings = {}) {
            const points = corners.map(resolve);
            const fill = makeItem('polygon', settings, draw => {
                const mapped = points.map(project);
                draw.group.append(element('polygon', {
                    points: mapped.map(corner => corner.join(' ')).join(' '),
                    fill: palette.fill, 'fill-opacity': 0.6, stroke: 'none',
                    class: 'maths-diagram__fill'
                }));
            });
            fill.extent = () => points;
            const middle = points.reduce((total, point) =>
                [total[0] + point[0] / points.length, total[1] + point[1] / points.length], [0, 0]);
            const sideSettings = { ...settings, fill: undefined, select: undefined,
                name: undefined, awayFrom: middle };
            const sides = points.map((unused, index) =>
                segment(corners[index], corners[(index + 1) % points.length], sideSettings));
            if (!settings.fill) fill.hide();
            fill.paint();
            return {
                settings: fill.settings,
                fill,
                sides,
                setTone(tone) {
                    fill.setTone(tone);
                    sides.forEach(side => side.setTone(tone));
                },
                setLabel(text) { fill.setLabel(text); },
                show() { fill.show(); sides.forEach(side => side.show()); },
                hide() { fill.hide(); sides.forEach(side => side.hide()); },
                remove() { fill.remove(); sides.forEach(side => side.remove()); }
            };
        }

        // ---------------------------------------------------------------
        // Angles
        // ---------------------------------------------------------------

        function sweepBetween(start, end, turn) {
            const anticlockwise = normaliseHeading(end - start);
            if (turn === 'anticlockwise') return anticlockwise;
            if (turn === 'clockwise') return anticlockwise === 0 ? 0 : anticlockwise - 360;
            return anticlockwise > 180 ? anticlockwise - 360 : anticlockwise;
        }

        function angleGeometry(item) {
            const vertex = resolve(item.settings.vertex);
            const from = resolve(item.settings.from);
            const to = resolve(item.settings.to);
            const start = directionFrom(vertex, from);
            const end = directionFrom(vertex, to);
            return { vertex, start, sweep: sweepBetween(start, end, item.settings.turn) };
        }

        function arcRadius(item, sweep) {
            if (item.settings.radius) return item.settings.radius;
            return Math.abs(sweep) < 35 ? SMALL_ANGLE_ARC : ARC_RADIUS;
        }

        // Arcs stop short of both lines so each angle reads as its own arc:
        // min(5 px, a fifth of the arc).
        function arcTrim(radiusPixels, sweep) {
            const byLength = toDegrees(Math.min(5 / radiusPixels, 0.2 * Math.abs(toRadians(sweep))));
            return Math.min(byLength, Math.abs(sweep) / 2 - 0.5);
        }

        function arcPoint(vertex, direction, radiusPixels) {
            const radians = toRadians(direction);
            return project([vertex[0] + (radiusPixels / drawing.scale) * Math.cos(radians),
                vertex[1] + (radiusPixels / drawing.scale) * Math.sin(radians)]);
        }

        function arcPath(from, to, radius, sweep) {
            const large = Math.abs(sweep) > 180 ? 1 : 0;
            const flag = sweep >= 0 ? 0 : 1;
            return `M ${from[0]} ${from[1]} A ${radius} ${radius} 0 ${large} ${flag} ${to[0]} ${to[1]}`;
        }

        function arcTail(from, to, radius, sweep) {
            return arcPath(from, to, radius, sweep).replace(/^M [^A]+ /, '');
        }

        function sectorPath(vertex, from, to, radius, sweep) {
            return `M ${vertex[0]} ${vertex[1]} L ${from[0]} ${from[1]} ${arcTail(from, to, radius, sweep)} Z`;
        }

        function angleLabel(item, geometry) {
            if (item.settings.format === 'bearing') {
                return formatBearing(bearingOf(resolve(item.settings.vertex), resolve(item.settings.to)));
            }
            if (item.settings.label === 'auto') return formatAngle(Math.round(Math.abs(geometry.sweep)));
            return item.settings.label;
        }

        function addAngle(from, vertex, to, settings = {}) {
            const item = makeItem('angle', settings, draw => drawAngle(draw));
            item.settings.from = from;
            item.settings.vertex = vertex;
            item.settings.to = to;
            item.extent = () => {
                const geometry = angleGeometry(item);
                return [geometry.vertex,
                    [geometry.vertex[0] + Math.cos(toRadians(geometry.start)),
                        geometry.vertex[1] + Math.sin(toRadians(geometry.start))],
                    [geometry.vertex[0] + Math.cos(toRadians(geometry.start + geometry.sweep)),
                        geometry.vertex[1] + Math.sin(toRadians(geometry.start + geometry.sweep))]];
            };
            item.obstacles = () => {
                const geometry = angleGeometry(item);
                const corner = project(geometry.vertex);
                return [
                    [corner, arcPoint(geometry.vertex, geometry.start, 18)],
                    [corner, arcPoint(geometry.vertex, geometry.start + geometry.sweep, 18)]
                ];
            };
            item.edges = () => {
                const geometry = angleGeometry(item);
                return [geometry.start, geometry.start + geometry.sweep];
            };
            depend(item, [from, vertex, to]);
            item.paint();
            return item;
        }

        function drawAngle(item) {
            const group = item.group;
            const settings = item.settings;
            const geometry = angleGeometry(item);
            const radius = arcRadius(item, geometry.sweep);
            const tone = toneColour(item);
            const width = strokeWidth(item);
            const corner = project(geometry.vertex);
            const square = settings.square !== false && Math.abs(Math.abs(geometry.sweep) - 90) < 0.5;
            if (square) {
                const edge = radius - 6;
                const one = arcPoint(geometry.vertex, geometry.start, edge);
                const two = arcPoint(geometry.vertex, geometry.start + Math.sign(geometry.sweep || 1) * 90, edge);
                const far = [one[0] + two[0] - corner[0], one[1] + two[1] - corner[1]];
                group.append(element('path', {
                    d: `M ${one[0]} ${one[1]} L ${far[0]} ${far[1]} L ${two[0]} ${two[1]}`,
                    stroke: tone, 'stroke-width': width, fill: 'none'
                }));
            } else {
                const count = Math.max(1, Math.min(3, settings.arcs || 1));
                const trim = arcTrim(radius, geometry.sweep);
                const step = Math.sign(geometry.sweep || 1);
                for (let index = 0; index < count; index++) {
                    const here = radius + index * 5;
                    group.append(element('path', {
                        d: arcPath(arcPoint(geometry.vertex, geometry.start + step * trim, here),
                            arcPoint(geometry.vertex,
                                geometry.start + geometry.sweep - step * trim, here),
                            here, geometry.sweep - step * trim * 2),
                        stroke: tone, 'stroke-width': width, fill: 'none'
                    }));
                }
            }
            if (item.selected) {
                const count = square ? 0 : Math.max(1, Math.min(3, settings.arcs || 1)) - 1;
                const outer = radius + count * 5;
                group.append(element('path', {
                    d: sectorPath(corner, arcPoint(geometry.vertex, geometry.start, outer),
                        arcPoint(geometry.vertex, geometry.start + geometry.sweep, outer),
                        outer, geometry.sweep),
                    fill: palette.neutral, 'fill-opacity': 0.18, stroke: 'none'
                }));
            }
            const label = angleLabel(item, geometry);
            if (label) {
                const text = labelText(label);
                group.append(text);
                // Always inside its own sector, hugging the arc: a small nudge
                // either side of the bisector, never past the sector's lines.
                const bisector = geometry.start + geometry.sweep / 2;
                const extra = square ? 0 : Math.max(1, Math.min(3, settings.arcs || 1)) - 1;
                const nudge = Math.min(8, Math.max(0, Math.abs(geometry.sweep) / 2 - 2));
                const around = nudge > 2 ? [0, nudge, -nudge] : [0];
                placeLabel(text, corner, around.map(offset => bisector + offset),
                    { from: radius + extra * 5, gap: 4, clearance: 3, grow: true });
            }
            if (settings.select) {
                const reach = Math.max(radius + 22, 44);
                group.append(element('path', {
                    d: sectorPath(corner, arcPoint(geometry.vertex, geometry.start, reach),
                        arcPoint(geometry.vertex, geometry.start + geometry.sweep, reach),
                        reach, geometry.sweep),
                    fill: 'transparent', stroke: 'none', class: 'maths-diagram__target'
                }));
                group.setAttribute('data-select', settings.name);
                group.setAttribute('role', 'button');
                group.setAttribute('tabindex', '0');
                group.setAttribute('aria-label', settings.name);
                group.addEventListener('click', () => choose(item));
                group.addEventListener('keydown', event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        choose(item);
                    }
                });
            }
        }

        function angle(from, vertex, to, settings) {
            return addAngle(from, vertex, to, settings);
        }

        // ---------------------------------------------------------------
        // North lines and bearings
        // ---------------------------------------------------------------

        function north(base, settings = {}) {
            const length = settings.length ?? 2;
            const start = resolve(base);
            const item = makeItem('north', { ...settings, from: base }, draw => {
                const [x, y] = project(start);
                const [topX, topY] = project([start[0], start[1] + length]);
                const tone = toneColour(draw);
                draw.group.append(element('path', {
                    d: `M ${x} ${y} L ${topX} ${topY}`, stroke: tone,
                    'stroke-width': strokeWidth(draw), fill: 'none'
                }));
                draw.group.append(element('path', {
                    d: `M ${topX - 5} ${topY + 8} L ${topX} ${topY} L ${topX + 5} ${topY + 8}`,
                    stroke: tone, 'stroke-width': 2, fill: 'none',
                    'stroke-linecap': 'round', 'stroke-linejoin': 'round'
                }));
                const text = labelText(draw.settings.label ?? 'N');
                draw.group.append(text);
                placeLabel(text, [topX, topY], [90], { gap: 13, clearance: 3 });
            });
            item.extent = () => [start, [start[0], start[1] + length]];
            item.obstacles = () => [[project(start), project([start[0], start[1] + length])]];
            item.edges = () => [90];
            norths.push(item);
            depend(item, [base]);
            item.paint();
            return item;
        }

        function hasNorth(position) {
            return norths.some(item => {
                const base = resolve(item.settings.from);
                return Math.abs(base[0] - position[0]) < 1e-9 && Math.abs(base[1] - position[1]) < 1e-9;
            });
        }

        function bearing(base, through, settings = {}) {
            const start = resolve(base);
            if (!hasNorth(start)) north(base, { length: settings.length ?? 2 });
            return addAngle([start[0], start[1] + 1], base, through, {
                ...settings, turn: 'clockwise', format: 'bearing',
                label: settings.label ?? 'auto', square: false
            });
        }

        // ---------------------------------------------------------------
        // Protractor
        // ---------------------------------------------------------------

        function protractor(base, settings = {}) {
            const centre = resolve(base);
            const full = settings.full === true;
            const turn = settings.turn === 'clockwise' ? 'clockwise' : 'anticlockwise';
            const zero = typeof settings.zero === 'number'
                ? settings.zero : directionFrom(centre, resolve(settings.zero));
            const reach = settings.radius ?? 3.2;
            const item = makeItem('protractor', settings, draw => {
                const group = draw.group;
                const [cx, cy] = project(centre);
                const room = Math.min(cx, cy, drawing.width - cx, drawing.height - cy) - 6;
                const radius = Math.max(30, Math.min(reach * drawing.scale, room));
                const tone = palette.neutral;
                const span = full ? 360 : 180;
                const arcs = full ? 2 : 1;
                const sign = protractorTurn(turn);
                for (let index = 0; index < arcs; index++) {
                    const from = zero + sign * index * 180;
                    const to = zero + sign * (index * 180 + 180);
                    const fromPx = [cx + radius * Math.cos(toRadians(from)),
                        cy - radius * Math.sin(toRadians(from))];
                    const toPx = [cx + radius * Math.cos(toRadians(to)),
                        cy - radius * Math.sin(toRadians(to))];
                    group.append(element('path', {
                        d: arcPath(fromPx, toPx, radius, sign * 180),
                        fill: 'none', stroke: tone, 'stroke-width': 1.5, 'stroke-opacity': 0.5
                    }));
                }
                const written = [];
                for (let step = 0; step <= span; step++) {
                    const direction = protractorDirection(zero, turn, step);
                    const long = step % 5 === 0;
                    const inner = radius - (long ? 9 : 5);
                    const fromPx = [cx + inner * Math.cos(toRadians(direction)),
                        cy - inner * Math.sin(toRadians(direction))];
                    const toPx = [cx + radius * Math.cos(toRadians(direction)),
                        cy - radius * Math.sin(toRadians(direction))];
                    group.append(element('path', {
                        d: `M ${fromPx[0]} ${fromPx[1]} L ${toPx[0]} ${toPx[1]}`,
                        stroke: tone, 'stroke-width': long ? 1.2 : 0.8, 'stroke-opacity': 0.45
                    }));
                    if (step % 10 === 0 && !(full && step === 360)) {
                        const labelRadius = radius - 21;
                        const text = labelText(String(step),
                            'maths-diagram__label maths-diagram__scale');
                        text.setAttribute('x', attributeNumber(
                            cx + labelRadius * Math.cos(toRadians(direction))));
                        text.setAttribute('y', attributeNumber(
                            cy - labelRadius * Math.sin(toRadians(direction))));
                        // Measure in place, then leave out a number that would
                        // sit on its neighbour on a small protractor.
                        group.append(text);
                        const bounds = text.getBBox();
                        const collides = written.some(other =>
                            bounds.x < other.right + 3 && bounds.x + bounds.width > other.left - 3 &&
                            bounds.y < other.bottom + 3 && bounds.y + bounds.height > other.top - 3);
                        if (collides) text.remove();
                        else {
                            written.push({ left: bounds.x, top: bounds.y,
                                right: bounds.x + bounds.width, bottom: bounds.y + bounds.height });
                        }
                    }
                }
            });
            item.extent = () => [[centre[0] - reach - 0.2, centre[1] - reach - 0.2],
                [centre[0] + reach + 0.2, centre[1] + reach + 0.2]];
            item.obstacles = () => [];
            item.paint();
            return item;
        }

        // ---------------------------------------------------------------
        // Choosing
        // ---------------------------------------------------------------

        function choose(item) {
            if (!editable || destroyed) return;
            select(item);
            onSelectCallback?.(item);
        }

        function select(item) {
            if (selected === item) return;
            const previous = selected;
            selected = item;
            if (previous) {
                previous.selected = false;
                previous.paint();
            }
            if (selected) {
                selected.selected = true;
                selected.paint();
            }
        }

        // ---------------------------------------------------------------
        // Dragging
        // ---------------------------------------------------------------

        function draggablePoints() {
            return items.filter(item => item.kind === 'point' && item.settings.drag);
        }

        function bearingOfPosition(item) {
            return normaliseHeading(90 - angularPosition(item));
        }

        function ariaText(item) {
            const drag = item.settings.drag;
            if (drag && drag.around) {
                if (drag.measure === 'bearing') return `Bearing ${formatBearing(bearingOfPosition(item))}.`;
                return `Turned to ${formatAngle(angularPosition(item))}.`;
            }
            return `${item.settings.label ? `Point ${item.settings.label}` : 'Point'} at ${formatPoint(item.current)}.`;
        }

        function angularPosition(item) {
            const centre = resolve(item.settings.drag.around);
            return snapAngle(normaliseHeading(toDegrees(
                Math.atan2(item.current[1] - centre[1], item.current[0] - centre[0]))),
            item.settings.drag.step || 1);
        }

        function announce(item) {
            item.group.setAttribute('aria-valuetext', ariaText(item).replace(/\.$/, ''));
        }

        function moveTo(item, next, notify, release) {
            if (item.current[0] === next[0] && item.current[1] === next[1]) return;
            item.current = next;
            item.paint();
            item.dependents.forEach(dependent => dependent.paint());
            announce(item);
            if (notify) item.settings.onMove?.([...next]);
            if (release) item.settings.onRelease?.([...next]);
        }

        function nearestDraggable(event) {
            const bounds = svg.getBoundingClientRect();
            const x = event.clientX - bounds.left;
            const y = event.clientY - bounds.top;
            let best = null;
            let bestDistance = 22;
            for (const item of draggablePoints()) {
                if (!item.visible) continue;
                const [px, py] = project(item.current);
                const distance = Math.hypot(px - x, py - y);
                if (distance <= bestDistance) {
                    best = item;
                    bestDistance = distance;
                }
            }
            return best;
        }

        function freePosition(item, position) {
            const snap = item.settings.snap || 1;
            return [Math.max(box.x[0], Math.min(box.x[1], Math.round(position[0] / snap) * snap)),
                Math.max(box.y[0], Math.min(box.y[1], Math.round(position[1] / snap) * snap))];
        }

        function aroundPosition(item, position, radius) {
            const centre = resolve(item.settings.drag.around);
            const angle = snapAngle(normaliseHeading(toDegrees(
                Math.atan2(position[1] - centre[1], position[0] - centre[0]))),
            item.settings.drag.step || 1);
            const distance = radius ?? Math.hypot(item.current[0] - centre[0],
                item.current[1] - centre[1]);
            return [centre[0] + distance * Math.cos(toRadians(angle)),
                centre[1] + distance * Math.sin(toRadians(angle))];
        }

        function alongPosition(item, position) {
            const [from, to] = item.settings.drag.along.map(resolve);
            const dx = to[0] - from[0];
            const dy = to[1] - from[1];
            const length = Math.hypot(dx, dy) || 1;
            const raw = ((position[0] - from[0]) * dx + (position[1] - from[1]) * dy) / length;
            const distance = Math.max(0, Math.min(length, Math.round(raw)));
            return [from[0] + (dx / length) * distance, from[1] + (dy / length) * distance];
        }

        function draggedPosition(item, position, radius) {
            const drag = item.settings.drag;
            if (drag === 'free') return freePosition(item, position);
            if (drag && drag.around) return aroundPosition(item, position, radius);
            if (drag && drag.along) return alongPosition(item, position);
            return [...item.current];
        }

        function pointerDown(event) {
            if (!editable || destroyed || dragging || event.button !== 0) return;
            const item = nearestDraggable(event);
            if (!item) return;
            event.preventDefault();
            svg.setPointerCapture(event.pointerId);
            svg.classList.add('is-dragging');
            svg.style.touchAction = 'none';
            const drag = item.settings.drag;
            dragging = {
                item, id: event.pointerId,
                radius: drag && drag.around
                    ? Math.hypot(item.current[0] - resolve(drag.around)[0],
                        item.current[1] - resolve(drag.around)[1]) : undefined
            };
            const [x, y] = project(item.current);
            item.group.append(element('circle', {
                class: 'maths-diagram__ring', cx: x, cy: y, r: 17, fill: 'none',
                stroke: palette.neutral, 'stroke-width': 2, 'stroke-opacity': 0.5,
                'stroke-dasharray': '3 3'
            }));
        }

        function pointerMove(event) {
            if (!dragging || event.pointerId !== dragging.id) return;
            event.preventDefault();
            const position = unproject(event.clientX, event.clientY);
            moveTo(dragging.item, draggedPosition(dragging.item, position, dragging.radius),
                true, false);
        }

        function pointerUp(event) {
            if (!dragging || event.pointerId !== dragging.id) return;
            const current = dragging;
            dragging = null;
            svg.classList.remove('is-dragging');
            svg.style.touchAction = '';
            if (svg.hasPointerCapture?.(event.pointerId)) svg.releasePointerCapture(event.pointerId);
            current.item.group.querySelector('.maths-diagram__ring')?.remove();
            describe(ariaText(current.item));
            current.item.settings.onRelease?.([...current.item.current]);
        }

        function pointerCancel(event) {
            if (!dragging || event.pointerId !== dragging.id) return;
            const current = dragging;
            dragging = null;
            svg.classList.remove('is-dragging');
            svg.style.touchAction = '';
            current.item.group.querySelector('.maths-diagram__ring')?.remove();
        }

        function keyPoint(item, event) {
            if (!editable) return;
            const step = event.shiftKey ? 10 : 1;
            const drag = item.settings.drag;
            let next = null;
            if (drag && drag.around) {
                const centre = resolve(drag.around);
                const radius = Math.hypot(item.current[0] - centre[0], item.current[1] - centre[1]);
                const current = angularPosition(item);
                const turn = event.shiftKey ? (drag.step || 1) * 10 : (drag.step || 1);
                if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
                    next = aroundPosition(item, [centre[0] + radius * Math.cos(toRadians(current - turn)),
                        centre[1] + radius * Math.sin(toRadians(current - turn))], radius);
                } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
                    next = aroundPosition(item, [centre[0] + radius * Math.cos(toRadians(current + turn)),
                        centre[1] + radius * Math.sin(toRadians(current + turn))], radius);
                }
            } else if (drag === 'free') {
                const snap = item.settings.snap || 1;
                const delta = { ArrowLeft: [-snap, 0], ArrowRight: [snap, 0],
                    ArrowUp: [0, snap], ArrowDown: [0, -snap] }[event.key];
                if (delta) {
                    next = freePosition(item, [item.current[0] + delta[0] * step,
                        item.current[1] + delta[1] * step]);
                }
            } else if (drag && drag.along) {
                const [from, to] = drag.along.map(resolve);
                const dx = to[0] - from[0];
                const dy = to[1] - from[1];
                const length = Math.hypot(dx, dy) || 1;
                const here = ((item.current[0] - from[0]) * dx + (item.current[1] - from[1]) * dy) / length;
                const direction = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[event.key];
                if (direction) {
                    const distance = Math.max(0, Math.min(length, here + direction * step));
                    next = [from[0] + (dx / length) * distance, from[1] + (dy / length) * distance];
                }
            }
            if (!next) return;
            event.preventDefault();
            moveTo(item, next, true, true);
        }

        // ---------------------------------------------------------------
        // Public diagram
        // ---------------------------------------------------------------

        function describe(text) {
            live.textContent = text;
        }

        svg.addEventListener('pointerdown', pointerDown);
        svg.addEventListener('pointermove', pointerMove);
        svg.addEventListener('pointerup', pointerUp);
        svg.addEventListener('pointercancel', pointerCancel);

        const observer = new ResizeObserver(() => paint());
        observer.observe(host);

        const diagram = {
            point, segment, ray, line, polygon, angle, north, bearing, protractor,
            describe,
            fit() {
                box = fitBox();
                paint();
            },
            clear() {
                [...items].forEach(item => item.remove());
                box = null;
                describe('');
            },
            setEditable(value) {
                editable = value;
                if (!editable) {
                    dragging = null;
                    svg.classList.remove('is-dragging');
                    svg.style.touchAction = '';
                }
            },
            onSelect(callback) {
                onSelectCallback = callback;
            },
            select(handle) {
                select(typeof handle === 'string' ? names.get(handle) : handle);
            },
            find(name) {
                return names.get(name);
            },
            draggablePoints,
            destroy() {
                if (destroyed) return;
                destroyed = true;
                observer.disconnect();
                svg.removeEventListener('pointerdown', pointerDown);
                svg.removeEventListener('pointermove', pointerMove);
                svg.removeEventListener('pointerup', pointerUp);
                svg.removeEventListener('pointercancel', pointerCancel);
                wrapper.remove();
            }
        };
        // The first paint waits for the end of this block, so the view fits
        // every item the lesson draws and never jumps afterwards.
        return diagram;
    }

    // ---------------------------------------------------------------
    // Question widget: one diagram, either tap-to-choose or drag
    // ---------------------------------------------------------------

    function questionWidget(config) {
        return {
            isEmpty: config.isEmpty,
            mark: config.mark,
            answerText: config.answerText,
            render(host, { value, editable, onChange }) {
                const diagram = create(host, config.diagram);
                config.setup?.(diagram);
                if (config.answer === 'drag') {
                    const points = diagram.draggablePoints();
                    if (points.length !== 1) {
                        throw new TypeError('A drag question needs exactly one draggable point.');
                    }
                    const [item] = points;
                    item.settings.onRelease = position => onChange([...position]);
                } else {
                    diagram.onSelect(item => onChange(item.settings.name));
                }
                diagram.setEditable(editable);
                return {
                    update({ value: next, editable: nextEditable, phase }) {
                        const active = nextEditable && phase === 'answer';
                        diagram.setEditable(active);
                        if (config.answer === 'drag') {
                            const [item] = diagram.draggablePoints();
                            if (next) item.moveTo(next);
                            const tone = phase === 'answer' ? 'neutral'
                                : phase === 'correct' ? 'correct' : 'incorrect';
                            // The ray and anything else drawn from it take the
                            // same tone as the point the pupil dragged.
                            [item, ...item.dependents].forEach(drawn => drawn.setTone(tone));
                            return;
                        }
                        const item = next ? diagram.find(next) : null;
                        diagram.select(item || null);
                        if (item && phase !== 'answer') {
                            item.setTone(phase === 'correct' ? 'correct' : 'incorrect');
                        }
                    },
                    focus() {
                        const target = config.answer === 'drag'
                            ? diagram.draggablePoints()[0]?.group
                            : host.querySelector('[data-select]');
                        target?.focus?.();
                    }
                };
            }
        };
    }

    const api = {
        create, questionWidget, fromBearing, bearingOf, angleAt, formatAngle,
        formatBearing, formatNumber, formatPoint, regularPolygon, labelDirection,
        snapAngle, protractorPoint
    };

    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (typeof window !== 'undefined') window.Maths1to9Diagram = api;
})();
