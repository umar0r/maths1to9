(() => {
    'use strict';

    function number(value) {
        const rounded = Math.round((Number(value) + Number.EPSILON) * 1e6) / 1e6;
        const parts = String(rounded).split('.');
        if (parts[0].replace('-', '').length >= 5) {
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        }
        return parts.join('.');
    }

    const learnScreens = [
        {
            title: 'What a scale tells you',
            lines: [
                "A plan is a drawing of something seen from above. This is Sam's bedroom.",
                "The scale tells you what 1 cm on the drawing stands for in real life. 'Represents' means 'stands for'.",
                'Here, every 1 cm on the plan stands for 2 m in the real room. Tap each centimetre along the bottom.'
            ],
            callout: '3 cm on the plan. 3 lots of 2 m. 3 × 2 = 6 m in real life.'
        },
        {
            title: 'Everything shrinks the same way',
            lines: [
                'In a scale drawing, every length shrinks the same way.',
                'Drag each piece onto the plan. Every length is divided by 2.',
                "The bed keeps its shape. It's just smaller."
            ],
            callout: "The room, the bed, the rug and the desk all use the same scale. That's what makes it a scale drawing."
        },
        {
            title: 'Same lake, two maps',
            lines: [
                "Map B's lake looks twice as big. Measure both.",
                'Map B is zoomed in. It draws everything bigger, so each centimetre stands for less.'
            ],
            callout: 'Same lake: 200 m across. On Map B, 200 m is drawn as 8 cm, so 1 cm stands for 200 ÷ 8 = 25 m. A length on a map means nothing without its scale.'
        },
        {
            title: 'Which way: times or divide?',
            lines: ['Real things are big. Drawings are small.', 'Going to real life, the number gets bigger. Times by 5.', 'Going to the drawing, the number gets smaller. Divide by 5.'],
            callout: 'Check your answer. A real length should be bigger than the number of cm on the drawing.'
        },
        {
            title: 'Draw it yourself',
            lines: ['Divide each real length by 2. Then draw.', "Drag the corner. The labels show the real size of what you've drawn."],
            callout: "That's Sam's garden: 4 cm by 2.5 cm on paper, 8 m by 5 m in real life."
        },
        {
            title: 'Area: change the lengths first',
            lines: ['m² means square metres.', "Each 1 cm square on the plan becomes a 2 m by 2 m square in real life. That's 4 m², not 2 m².", 'So change the lengths to real life first. Then find the area.'],
            callout: 'The plan is 6 cm². The real garden is 24 m², not 6 × 2 = 12 m².'
        },
        {
            title: 'A path in two parts',
            lines: ['You walk along the path, so find each part, then add.', 'You could also add the cm first: 3 + 4 = 7 cm, and 7 × 50 = 350 m.'],
            callout: 'Every time: 1. Read the scale: what does 1 cm stand for? 2. Going to real life? Times. Going to the drawing? Divide. 3. Check: real lengths should be bigger.'
        }
    ];

    const practiceTypes = [];
    const examples = () => [];
    const checks = () => [];

    function drawWidget(config) {
        const { scale, real, answer, marking } = config;
        const samePair = (value, pair) => value && (
            (value.width === pair[0] && value.height === pair[1]) ||
            (value.width === pair[1] && value.height === pair[0])
        );
        const units = text => String(text).replace(/(\d) (?=(?:cm|m)(?![a-zA-Z\d]))/g, '$1\u00a0');
        const SVG = 'http://www.w3.org/2000/svg';
        const element = (tag, attrs = {}, text = '') => {
            const node = document.createElementNS(SVG, tag);
            Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
            if (text) node.textContent = units(text);
            return node;
        };
        return {
            isEmpty(value) { return value === null; },
            answerText(value) { return value ? `${number(value.width)} cm by ${number(value.height)} cm` : ''; },
            mark(value) {
                if (samePair(value, answer)) return {
                    correct: true,
                    feedback: `${number(real[0])} ÷ ${number(scale)} = ${number(answer[0])} cm. ${number(real[1])} ÷ ${number(scale)} = ${number(answer[1])} cm.`
                };
                if (samePair(value, real)) return { correct: false, feedback: `That's the real size in metres. Divide each length by ${number(scale)}.` };
                if (value && (answer.includes(value.width) || answer.includes(value.height))) return { correct: false, feedback: `One side is right. Now divide the other real length by ${number(scale)}.` };
                return { correct: false, feedback: `Divide each real length by ${number(scale)}. Then drag the corner to those lengths.` };
            },
            render(host, { value, editable, onChange }) {
                const root = document.createElement('div');
                root.className = 'sd-draw-widget';
                const picture = element('svg', { viewBox: '0 0 360 260', class: 'sd-draw-svg', 'aria-label': 'Squared paper with a rectangle' });
                const x = 50, y = 40, size = 29;
                picture.append(element('rect', { x, y, width: 10 * size, height: 7 * size, class: 'sd-paper' }));
                for (let i = 0; i <= 20; i++) picture.append(element('line', { x1: x + i * size / 2, x2: x + i * size / 2, y1: y, y2: y + 7 * size, class: i % 2 ? 'sd-half-grid' : 'sd-grid-line' }));
                for (let i = 0; i <= 14; i++) picture.append(element('line', { x1: x, x2: x + 10 * size, y1: y + i * size / 2, y2: y + i * size / 2, class: i % 2 ? 'sd-half-grid' : 'sd-grid-line' }));
                const rectangle = element('rect', { x, y, class: 'sd-draw-rectangle' });
                const widthLabel = element('text', { class: 'sd-draw-blue', 'text-anchor': 'middle' });
                const widthReal = element('text', { class: 'sd-draw-green', 'text-anchor': 'middle' });
                const heightLabel = element('text', { x: 2, class: 'sd-draw-blue' });
                const heightReal = element('text', { x: 2, class: 'sd-draw-green' });
                const handle = element('circle', { r: 9, class: 'sd-draw-handle', role: 'button', tabindex: 0 });
                picture.append(rectangle, widthLabel, widthReal, heightLabel, heightReal, handle);
                const caption = document.createElement('p');
                caption.className = 'sd-grid-label';
                caption.textContent = units('Each square is 1 cm');
                root.append(picture, caption);
                host.append(root);
                let current = value ? { ...value } : { width: 1, height: 1 };
                let canEdit = editable;
                let phase = 'answer';
                let dragging = false;

                function paint() {
                    const right = x + current.width * size;
                    const bottom = y + current.height * size;
                    rectangle.setAttribute('width', current.width * size);
                    rectangle.setAttribute('height', current.height * size);
                    rectangle.classList.toggle('is-correct', phase === 'correct');
                    rectangle.classList.toggle('is-wrong', phase === 'wrong');
                    const topX = Math.max(80, Math.min(305, x + current.width * size / 2));
                    widthLabel.setAttribute('x', topX);
                    widthLabel.setAttribute('y', marking ? 30 : 15);
                    widthLabel.textContent = units(`${number(current.width)} cm`);
                    widthReal.setAttribute('x', topX);
                    widthReal.setAttribute('y', 31);
                    widthReal.textContent = marking ? '' : units(`= ${number(current.width * scale)} m`);
                    const sideY = Math.max(70, y + current.height * size / 2);
                    heightLabel.setAttribute('y', sideY);
                    heightLabel.textContent = units(`${number(current.height)} cm`);
                    heightReal.setAttribute('y', sideY + 15);
                    heightReal.textContent = marking ? '' : units(`= ${number(current.height * scale)} m`);
                    handle.setAttribute('cx', right);
                    handle.setAttribute('cy', bottom);
                    handle.setAttribute('tabindex', canEdit ? '0' : '-1');
                    handle.setAttribute('aria-disabled', String(!canEdit));
                    handle.setAttribute('aria-label', `Rectangle corner, ${number(current.width)} cm by ${number(current.height)} cm`);
                    if (!canEdit && document.activeElement === handle) handle.blur();
                }
                function set(width, height) {
                    if (!canEdit) return;
                    const next = { width: Math.max(0.5, Math.min(10, Math.round(width * 2) / 2)), height: Math.max(0.5, Math.min(7, Math.round(height * 2) / 2)) };
                    if (next.width === current.width && next.height === current.height) return;
                    current = next;
                    paint();
                    onChange({ ...current });
                }
                function move(event) {
                    const bounds = picture.getBoundingClientRect();
                    set(((event.clientX - bounds.left) * 360 / bounds.width - x) / size,
                        ((event.clientY - bounds.top) * 260 / bounds.height - y) / size);
                }
                handle.addEventListener('pointerdown', event => {
                    if (!canEdit) return;
                    event.preventDefault();
                    dragging = true;
                    handle.focus();
                    handle.setPointerCapture(event.pointerId);
                });
                handle.addEventListener('pointermove', event => { if (dragging) move(event); });
                handle.addEventListener('pointerup', () => { dragging = false; });
                handle.addEventListener('lostpointercapture', () => { dragging = false; });
                handle.addEventListener('keydown', event => {
                    if (!canEdit) return;
                    const delta = { ArrowRight: [0.5, 0], ArrowLeft: [-0.5, 0], ArrowDown: [0, 0.5], ArrowUp: [0, -0.5] }[event.key];
                    if (!delta) return;
                    event.preventDefault();
                    set(current.width + delta[0], current.height + delta[1]);
                });
                paint();
                return {
                    update(next) {
                        current = next.value ? { ...next.value } : { width: 1, height: 1 };
                        canEdit = next.editable;
                        phase = next.phase;
                        if (!canEdit) dragging = false;
                        paint();
                    },
                    focus() { if (canEdit) handle.focus(); }
                };
            }
        };
    }
    window.ScaleDrawings = { number, learnScreens, practiceTypes, examples, checks, drawWidget };
})();
