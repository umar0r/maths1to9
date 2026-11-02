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
    const text = value => String(value).replace(/(\d) (?=(?:cm²|cm|km|m²|m)(?![a-zA-Z\d]))/g, '$1\u00a0');
    const option = (label, feedback, correct = false) => ({ label: text(label), feedback: text(feedback), correct });
    const mistake = (value, feedback) => ({ value: String(value), feedback: text(feedback) });
    const card = (questionType, values, asked, config) => ({
        questionType, values, asked, ...(config.input === 'number' ? { inputLabel: 'Answer' } : {}),
        ...config, prompt: text(config.prompt),
        ...(config.feedback ? { feedback: text(config.feedback) } : {}),
        ...(config.fallback ? { fallback: text(config.fallback) } : {})
    });

    function examples() {
        return [
            card('try-1', { scale: 5, scaleUnit: 'm', drawing: 2, real: null }, 'to-real', {
                input: 'choice', prompt: 'A drawing uses the scale 1 cm represents 5 m. A wall is 2 cm long on the drawing. How long is the real wall?',
                options: [
                    option('10 m', 'Each cm stands for 5 m. 2 × 5 = 10 m.', true),
                    option('7 m', 'That adds 2 and 5. Each cm stands for 5 m, so 2 cm is 2 lots of 5 m.'),
                    option('2.5 m', 'That divides. Going to real life, the length gets bigger. Times by 5.'),
                    option('0.4 m', 'That divides 2 by 5. Going to real life, times: 2 × 5.')
                ]
            }),
            card('try-2', { scale: 8, scaleUnit: 'km', drawing: 6.5, real: null }, 'to-real', {
                input: 'number', unit: 'km', prompt: 'A map uses the scale 1 cm represents 8 km. Two camps are 6.5 cm apart on the map. How far apart are they in real life?',
                answer: '52', rules: [
                    mistake(6.5, '6.5 is the length on the map. Each cm stands for 8 km. Times by 8.'),
                    mistake(0.8125, 'That divides. Real life is bigger than the map. Times by 8.'),
                    mistake(14.5, 'That adds. Each cm stands for 8 km, so times: 6.5 × 8.'),
                    mistake(48, '6 × 8 = 48 leaves out the half cm. 0.5 × 8 = 4 more.')
                ], fallback: 'Each cm stands for 8 km. Times by 8.', feedback: '6.5 × 8 = 52 km'
            }),
            card('try-3', { scale: 3, scaleUnit: 'm', drawing: null, real: 21 }, 'to-drawing', {
                input: 'choice', prompt: 'A plan uses the scale 1 cm represents 3 m. A fence is 21 m long. How long is the fence on the plan?',
                options: [
                    option('7 cm', 'Going to the plan, divide. 21 ÷ 3 = 7 cm.', true),
                    option('63 cm', 'That times by 3. The plan is smaller than real life, so divide.'),
                    option('21 cm', '21 is the real length in metres. Divide by 3 to get the plan length.'),
                    option('18 cm', 'That takes away 3. Each cm stands for 3 m, so divide: 21 ÷ 3.')
                ]
            }),
            card('try-4', { scale: 50, scaleUnit: 'm', drawing: null, real: 350 }, 'to-drawing', {
                input: 'number', unit: 'cm', prompt: 'A map uses the scale 1 cm represents 50 m. A road is 350 m long. How long is it on the map?',
                answer: '7', rules: [
                    mistake(17500, 'That times. The map is smaller than real life. Divide by 50.'),
                    mistake(300, 'That takes away 50. Divide: 350 ÷ 50.'),
                    mistake(70, '350 ÷ 50 is 7, not 70. Check: 7 × 50 = 350.')
                ], fallback: 'Going to the map, divide by 50.', feedback: '350 ÷ 50 = 7 cm'
            }),
            card('try-5', { scale: null, scaleUnit: null, drawing: [2, 4], real: null }, 'zoom', {
                input: 'choice', prompt: 'A pond is 2 cm wide on Map A. The same pond is 4 cm wide on Map B. Which is true?',
                options: [
                    option('Map B is zoomed in more', 'Same pond, drawn bigger. So each cm on Map B stands for less.', true),
                    option('The pond on Map B is bigger', "It's the same pond. Map B just draws it bigger."),
                    option('One of the maps must be wrong', 'Both maps can be right. They use different scales.'),
                    option('Map A is zoomed in more', 'The pond looks smaller on Map A, so Map A is zoomed out.')
                ]
            }),
            card('try-6', { scale: 20, scaleUnit: 'm', drawing: [5, 3], real: null }, 'route', {
                input: 'number', unit: 'm', prompt: 'A path on a map goes 5 cm east, then 3 cm north. The scale is 1 cm represents 20 m. How far do you walk along the path?',
                answer: '160', rules: [
                    mistake(100, "That's only the east part. Add the north part: 3 × 20 = 60 m."),
                    mistake(60, "That's only the north part. Add the east part: 5 × 20 = 100 m."),
                    mistake(28, '8 + 20 adds the scale. Times: 8 × 20.'),
                    mistake(0.4, 'That divides. Going to real life, times by 20.')
                ], fallback: 'Find each part in real life, then add.', feedback: '5 + 3 = 8 cm. 8 × 20 = 160 m'
            }),
            card('try-7', { scale: 4, scaleUnit: 'm', drawing: 3.5, real: null }, 'to-real', {
                input: 'choice', prompt: 'A drawing uses the scale 1 cm represents 4 m. A room is 3.5 cm long on the drawing. How long is the real room?',
                options: [
                    option('14 m', '3.5 × 4 = 14 m', true),
                    option('12 m', 'That leaves out the half cm. 3 × 4 = 12, and 0.5 × 4 = 2 more.'),
                    option('7.5 m', 'That adds. Times: 3.5 × 4.'),
                    option('0.875 m', 'That divides. Going to real life, times by 4.')
                ]
            }),
            card('try-8', { scale: 2, scaleUnit: 'm', drawing: null, real: 9 }, 'to-drawing', {
                input: 'number', unit: 'cm', prompt: 'A garden is 9 m long. A plan uses the scale 1 cm represents 2 m. How long is the garden on the plan?',
                answer: '4.5', rules: [
                    mistake(18, 'That times. The plan is smaller than real life. Divide by 2.'),
                    mistake(4, '9 ÷ 2 is 4.5, not 4. Keep the half.'),
                    mistake(7, 'That takes away 2. Divide: 9 ÷ 2.')
                ], fallback: 'Going to the plan, divide by 2.', feedback: '9 ÷ 2 = 4.5 cm'
            }),
            card('try-9', { scale: 2, scaleUnit: 'm', drawing: [3, 2], real: [6, 4] }, 'draw', {
                input: 'custom', prompt: 'A patio is 6 m by 4 m. Draw it using the scale 1 cm represents 2 m.',
                widget: drawWidget({ scale: 2, real: [6, 4], answer: [3, 2], marking: true }), feedback: '6 ÷ 2 = 3 cm. 4 ÷ 2 = 2 cm.'
            }),
            card('try-10', { scale: 3, scaleUnit: 'm', drawing: [2, 4], real: null }, 'area', {
                input: 'number', unit: 'm²', prompt: 'A plan of a garden is 2 cm by 4 cm. The scale is 1 cm represents 3 m. What is the real area of the garden?',
                answer: '72', rules: [
                    mistake(24, "That times the plan's area by 3. Change each length first: 2 × 3 = 6 m and 4 × 3 = 12 m."),
                    mistake(8, '8 cm² is the area on the plan. Change the lengths to real life first.'),
                    mistake(18, '6 + 12 adds the sides. Area is length times width: 6 × 12.'),
                    mistake(36, '36 m is the distance round the edge. Area is 6 × 12.')
                ], fallback: 'Change each length to real life, then times them.', feedback: '2 × 3 = 6 m. 4 × 3 = 12 m. 6 × 12 = 72 m²'
            })
        ];
    }
    function prepare(question, random) {
        return question.options ? { ...question, options: window.Maths1to9LessonEngine.shuffle(question.options, random) } : { ...question };
    }
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
    window.ScaleDrawings = { number, learnScreens, practiceTypes, examples, checks, drawWidget, prepare };
})();
