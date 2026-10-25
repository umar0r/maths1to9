(() => {
    'use strict';

    const SVG_NS = 'http://www.w3.org/2000/svg';
    const colours = ['#2769c5', '#16845e', '#cf523b'];
    const allowedTotals = [12, 18, 20, 24, 30, 36, 40, 45, 60, 72, 90, 120, 180];
    const option = (label, feedback, correct = false) => ({ label, feedback, correct });
    const total = data => data.reduce((sum, row) => sum + row.count, 0);
    const angles = data => data.map(row => 360 / total(data) * row.count);
    const gcd = (a, b) => b ? gcd(b, a % b) : a;
    const fraction = (a, b) => `${a / gcd(a, b)}/${b / gcd(a, b)}`;
    const tidy = value => String(Number(value.toFixed(4)));
    const dataset = counts => counts.map((count, index) => ({ name: ['Blue', 'Green', 'Red'][index], count, colour: colours[index] }));
    const learnData = dataset([3, 9]);
    let widgetNumber = 0;

    function text(host, tag, value, className) {
        const element = document.createElement(tag);
        element.textContent = value;
        if (className) element.className = className;
        host.append(element);
        return element;
    }
    function svgNode(tag, attributes = {}) {
        const element = document.createElementNS(SVG_NS, tag);
        for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
        return element;
    }
    function point(angle, radius = 100) {
        const radians = angle * Math.PI / 180;
        return { x: 170 + radius * Math.sin(radians), y: 170 - radius * Math.cos(radians) };
    }
    function sectorPath(start, angle) {
        if (angle <= 0) return '';
        const first = point(start);
        if (angle >= 360) {
            const middle = point(start + 180);
            return `M 170 170 L ${first.x} ${first.y} A 100 100 0 1 1 ${middle.x} ${middle.y} A 100 100 0 1 1 ${first.x} ${first.y} Z`;
        }
        const last = point(start + angle);
        return `M 170 170 L ${first.x} ${first.y} A 100 100 0 ${angle > 180 ? 1 : 0} 1 ${last.x} ${last.y} Z`;
    }
    function drawTable(host, data, { showTotal = false, shares = false, showAngles = false, compact = false } = {}) {
        const table = document.createElement('table');
        table.className = `pie-frequency-table${compact ? ' is-compact' : ''}`;
        const caption = document.createElement('caption');
        caption.textContent = 'Favourite colours';
        table.append(caption);
        const headings = document.createElement('thead');
        const row = document.createElement('tr');
        for (const heading of ['Colour', 'Number of pupils', ...(shares ? ['Share'] : []), ...(showAngles ? ['Angle'] : [])]) text(row, 'th', heading);
        headings.append(row);
        const body = document.createElement('tbody');
        data.forEach((item, index) => {
            const tr = document.createElement('tr');
            const label = text(tr, 'th', item.name);
            label.scope = 'row';
            label.style.setProperty('--slice-colour', item.colour);
            text(tr, 'td', item.count);
            if (shares) text(tr, 'td', fraction(item.count, total(data)));
            if (showAngles) text(tr, 'td', `${angles(data)[index]}°`);
            body.append(tr);
        });
        table.append(headings, body);
        if (showTotal) {
            const foot = document.createElement('tfoot');
            const tr = document.createElement('tr');
            text(tr, 'th', 'Total');
            text(tr, 'td', total(data));
            if (shares) text(tr, 'td', '1');
            if (showAngles) text(tr, 'td', '360°');
            foot.append(tr);
            table.append(foot);
        }
        host.append(table);
        return table;
    }
    function chart(host, data, values, { protractor = false, active = 0, label = 'Pie chart' } = {}) {
        const svg = svgNode('svg', { viewBox: '0 0 340 340', class: 'pie-chart-svg', role: 'img', 'aria-label': label });
        svg.append(svgNode('circle', { cx: 170, cy: 170, r: 100, fill: '#eef2f7', stroke: '#26344d', 'stroke-width': 2 }));
        const paths = data.map(item => {
            const path = svgNode('path', { fill: item.colour, stroke: '#fff', 'stroke-width': 2, 'aria-hidden': true });
            svg.append(path);
            return path;
        });
        const baseline = svgNode('line', { x1: 170, y1: 170, stroke: '#26344d', 'stroke-width': 2, 'aria-hidden': true });
        svg.append(baseline);
        const ticks = [];
        if (protractor) {
            for (let angle = 0; angle < 360; angle += 10) {
                const line = svgNode('line', { stroke: '#718096', 'stroke-width': angle % 30 === 0 ? 1.5 : 1, 'aria-hidden': true });
                svg.append(line);
                let label;
                if (angle % 30 === 0) {
                    label = svgNode('text', { 'text-anchor': 'middle', 'dominant-baseline': 'middle', class: 'pie-scale-label', 'aria-hidden': true });
                    label.textContent = `${angle}°`;
                    svg.append(label);
                }
                ticks.push({ angle, line, label });
            }
        }
        svg.append(svgNode('circle', { cx: 170, cy: 170, r: 3, fill: '#26344d', 'aria-hidden': true }));
        host.append(svg);
        function update(values, active = 0) {
            let start = 0;
            values.forEach((value, index) => {
                const angle = Number.isFinite(Number(value)) ? Math.max(0, Math.min(360, Number(value))) : 0;
                paths[index].setAttribute('d', sectorPath(start, angle));
                start += angle;
            });
            const beginning = values.slice(0, active).reduce((sum, value) => sum + (Number(value) || 0), 0);
            const end = point(beginning);
            baseline.setAttribute('x2', end.x);
            baseline.setAttribute('y2', end.y);
            for (const tick of ticks) {
                const inner = point(beginning + tick.angle, tick.angle % 30 === 0 ? 123 : 127);
                const outer = point(beginning + tick.angle, 133);
                for (const [key, value] of Object.entries({ x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y })) tick.line.setAttribute(key, value);
                if (tick.label) {
                    const position = point(beginning + tick.angle, 150);
                    tick.label.setAttribute('x', position.x);
                    tick.label.setAttribute('y', position.y);
                }
            }
            return beginning;
        }
        update(values, active);
        return { svg, update };
    }
    function normalise(value, length) {
        return {
            angles: Array.from({ length }, (_, index) => value?.angles?.[index] === undefined ? '' : String(value.angles[index])),
            active: Number.isInteger(value?.active) && value.active >= 0 && value.active < length ? value.active : 0
        };
    }
    function angleValue(text) {
        if (String(text).trim() === '') return null;
        const number = Number(text);
        return Number.isFinite(number) && Number.isInteger(number) && number >= 0 && number <= 360 ? number : null;
    }
    function drawingWidget(data) {
        const expected = angles(data);
        return {
            isEmpty(value) { return normalise(value, data.length).angles.some(value => value.trim() === ''); },
            answerText(value) {
                return normalise(value, data.length).angles.map((value, index) => `${data[index].name} ${value === '' ? '—' : `${Number(value)}°`}`).join(', ');
            },
            mark(value) {
                const values = normalise(value, data.length).angles.map(angleValue);
                if (values.some(value => value === null)) return { correct: false, feedback: 'Set every angle. Use whole-number angles from 0° to 360°.' };
                const sum = values.reduce((a, b) => a + b, 0);
                const index = values.findIndex((value, i) => value !== expected[i]);
                if (index < 0) return { correct: true, feedback: 'Every slice has the right angle. The angles add to 360°.' };
                const item = data[index];
                let feedback;
                if (values[index] === item.count / total(data) * 100) feedback = `The ${item.name} angle uses 100 for the whole. A full circle is 360°.`;
                else if (values[index] === 360 / item.count) feedback = `The ${item.name} angle divides 360 by that row's number. Divide by the total, then multiply by the row's number.`;
                else if (values[index] === 360 / total(data)) feedback = `The ${item.name} angle is only one pupil's share. Multiply by the number of pupils in that row.`;
                else if (sum !== 360) feedback = `Your angles add to ${sum}°. They need to add to 360°. Check each slice.`;
                else feedback = `Check the ${item.name} slice. Use ${item.count} ÷ ${total(data)} × 360°.`;
                return { correct: false, feedback };
            },
            render(host, { value, editable, onChange }) {
                const id = `pie-widget-${++widgetNumber}`;
                const root = document.createElement('div');
                root.className = 'pie-drawing-widget';
                host.append(root);
                let state = normalise(value, data.length);
                let canEdit = editable;
                let dragging = false;
                let phase = 'answer';
                text(root, 'p', 'Choose a slice. Drag the round handle or type its angle.', 'pie-widget-help');
                const activeLabel = text(root, 'label', 'Slice to change');
                activeLabel.htmlFor = `${id}-active`;
                const select = document.createElement('select');
                select.id = `${id}-active`;
                data.forEach((item, index) => {
                    const entry = document.createElement('option');
                    entry.value = String(index);
                    entry.textContent = item.name;
                    select.append(entry);
                });
                root.append(select);
                const picture = chart(root, data, state.angles, { protractor: true, active: state.active, label: 'Your pie chart and protractor' });
                picture.svg.setAttribute('role', 'group');
                picture.svg.classList.add('pie-drawing-svg');
                const handle = svgNode('g', { class: 'pie-handle', role: 'slider', tabindex: 0, 'aria-valuemin': 0, 'aria-valuemax': 360 });
                handle.append(svgNode('circle', { r: 26, fill: 'transparent', class: 'pie-handle-hit' }), svgNode('circle', { r: 8, stroke: '#26344d', 'stroke-width': 2, class: 'pie-handle-dot' }));
                picture.svg.append(handle);
                const fields = data.map((item, index) => {
                    const label = text(root, 'label', '', 'pie-angle-field');
                    const name = text(label, 'span', `${item.name} angle (°)`);
                    name.style.setProperty('--slice-colour', item.colour);
                    const input = document.createElement('input');
                    Object.assign(input, { type: 'number', min: '0', max: '360', step: '1', inputMode: 'decimal', autocomplete: 'off' });
                    input.addEventListener('input', () => {
                        if (!canEdit) return;
                        state.angles[index] = input.value;
                        state.active = index;
                        commit();
                    });
                    label.append(input);
                    return input;
                });
                const sum = text(root, 'p', '', 'pie-angle-sum');
                sum.setAttribute('aria-live', 'polite');
                function paint() {
                    select.value = String(state.active);
                    select.disabled = !canEdit;
                    const beginning = picture.update(state.angles, state.active);
                    const angle = Number(state.angles[state.active]) || 0;
                    const position = point(beginning + angle, 112);
                    handle.setAttribute('transform', `translate(${position.x} ${position.y})`);
                    handle.setAttribute('aria-label', `${data[state.active].name} slice angle`);
                    handle.setAttribute('aria-valuenow', Math.max(0, Math.min(360, angle)));
                    handle.setAttribute('aria-valuetext', state.angles[state.active] === '' ? 'Not set' : `${angle} degrees`);
                    handle.setAttribute('aria-disabled', String(!canEdit));
                    handle.setAttribute('tabindex', canEdit ? '0' : '-1');
                    handle.querySelector('.pie-handle-dot').setAttribute('fill', data[state.active].colour);
                    fields.forEach((input, index) => {
                        if (input.value !== state.angles[index]) input.value = state.angles[index];
                        input.disabled = !canEdit;
                        const wrong = phase === 'wrong' && angleValue(state.angles[index]) !== expected[index];
                        input.setAttribute('aria-invalid', String(wrong));
                    });
                    sum.textContent = `Total of angles entered: ${state.angles.reduce((sum, value) => sum + (Number(value) || 0), 0)}°`;
                }
                function commit() {
                    paint();
                    onChange({ angles: [...state.angles], active: state.active });
                }
                function setAngle(value) {
                    if (!canEdit) return;
                    state.angles[state.active] = String(Math.max(0, Math.min(360, Math.round(value))));
                    commit();
                }
                function move(event) {
                    const bounds = picture.svg.getBoundingClientRect();
                    const x = (event.clientX - bounds.left) * 340 / bounds.width - 170;
                    const y = (event.clientY - bounds.top) * 340 / bounds.height - 170;
                    const absolute = (Math.atan2(x, -y) * 180 / Math.PI + 360) % 360;
                    const beginning = state.angles.slice(0, state.active).reduce((sum, value) => sum + (Number(value) || 0), 0);
                    setAngle((absolute - beginning % 360 + 360) % 360);
                }
                select.addEventListener('change', () => {
                    if (!canEdit) return;
                    state.active = Number(select.value);
                    commit();
                });
                handle.addEventListener('pointerdown', event => {
                    if (!canEdit) return;
                    event.preventDefault();
                    dragging = true;
                    handle.focus();
                    handle.setPointerCapture(event.pointerId);
                    move(event);
                });
                handle.addEventListener('pointermove', event => { if (dragging) move(event); });
                handle.addEventListener('pointerup', () => { dragging = false; });
                handle.addEventListener('lostpointercapture', () => { dragging = false; });
                handle.addEventListener('keydown', event => {
                    if (!canEdit) return;
                    const value = Number(state.angles[state.active]) || 0;
                    const step = event.shiftKey ? 10 : 1;
                    let next;
                    if (['ArrowRight', 'ArrowUp'].includes(event.key)) next = value + step;
                    else if (['ArrowLeft', 'ArrowDown'].includes(event.key)) next = value - step;
                    else if (event.key === 'Home') next = 0;
                    else if (event.key === 'End') next = 360;
                    else return;
                    event.preventDefault();
                    setAngle(next);
                });
                paint();
                return {
                    update(next) {
                        state = normalise(next.value, data.length);
                        canEdit = next.editable;
                        phase = next.phase;
                        dragging = false;
                        paint();
                    },
                    focus() { fields[0].focus(); }
                };
            }
        };
    }

    function prepare(question, random) {
        return question.options ? { ...question, options: window.Maths1to9LessonEngine.shuffle(question.options, random) } : { ...question };
    }
    function numeric(prompt, answer, mistakes, feedback, input, questionType, data, degrees = false) {
        const wrong = mistakes.filter(([value], index, list) => Number.isInteger(value) && value >= 0 && value !== answer && list.findIndex(([other]) => other === value) === index);
        const question = { prompt, input, questionType, data, feedback };
        if (data) question.figure = host => drawTable(host, data);
        if (input === 'choice') {
            question.options = [option(`${answer}${degrees ? '°' : ''}`, feedback, true), ...wrong.slice(0, 3).map(([value, message]) => option(`${value}${degrees ? '°' : ''}`, message))];
        } else {
            question.answer = String(answer);
            question.rules = wrong.map(([value, message]) => ({ value: String(value), feedback: message }));
            question.fallback = feedback;
        }
        return question;
    }
    function totalQuestion(data, input = 'choice') {
        const t = total(data);
        return numeric('How many pupils are listed altogether?', t, [
            [t - data.at(-1).count, `That leaves out ${data.at(-1).name}. Add every row.`],
            [data[0].count, `That counts only ${data[0].name}. Add every row.`],
            [360, '360 is the number of degrees in a full circle. Add the numbers of pupils.']
        ], `${data.map(row => row.count).join(' + ')} = ${t}`, input, 'total', data);
    }
    function shareQuestion(data, index = 0) {
        const item = data[index];
        const t = total(data);
        const answer = `${item.count}/${t}`;
        const wrong = [
            option(`${t}/${item.count}`, 'That puts the whole group on top. Put this row on top and the total underneath.'),
            option(`${item.count}/${item.count}`, 'That uses only this row as the whole group. Put the total number of pupils underneath.'),
            option(`1/${t}`, 'That is one pupil\'s share. Use every pupil in this row.'),
            option(`${t - item.count}/${t}`, 'That is the share for all the other colours. Use the colour asked for.'),
            option(`${item.count}/${t - item.count}`, 'That leaves this row out of the bottom number. The bottom number is the whole group.')
        ].filter((entry, i, list) => entry.label.split('/').reduce((a, b) => Number(a) / Number(b)) !== item.count / t && list.findIndex(other => other.label === entry.label) === i);
        return {
            data, index, input: 'choice', questionType: 'share',
            prompt: `Which fraction of the pupils chose ${item.name}?`,
            figure: host => drawTable(host, data),
            options: [option(answer, `${item.count}/${t} = ${fraction(item.count, t)}`, true), ...wrong.slice(0, 3)]
        };
    }
    function perItemQuestion(data, input = 'number') {
        const t = total(data);
        return numeric('What is the angle for one pupil\'s share? Give the angle in degrees.', 360 / t, [
            [t, 'That is the number of pupils. Divide 360 by that total.'],
            [360, 'That is the full circle. Share it equally between all the pupils.'],
            [100, 'A full circle has 360°, so start with 360.'],
            [360 / t * data[0].count, 'That uses a whole row. The question asks for just one pupil\'s share.']
        ], `360° ÷ ${t} = ${360 / t}°`, input, 'per-item', data, true);
    }
    function angleQuestion(data, index = 0, input = 'number') {
        const item = data[index];
        const t = total(data);
        const answer = angles(data)[index];
        return { ...numeric(`Find the angle for ${item.name}. Give the angle in degrees.`, answer, [
            [item.count / t * 100, 'That uses 100 for the whole. A full circle has 360°.'],
            [360 / item.count, 'That divides 360 by this row. Divide by the total, then multiply by this row.'],
            [360 / t, 'That is only one pupil\'s share. Multiply by the number of pupils in this row.'],
            [item.count, 'That is the number of pupils in this row. Find its share of 360°.'],
            [t, 'That is the total number of pupils. Find this colour\'s share of 360°.'],
            [360 - answer, 'That is the angle for the other colours together. Use the colour asked for.']
        ], `${item.count} ÷ ${t} × 360° = ${answer}°`, input, 'angle', data, true), index };
    }
    function missingQuestion(known, input = 'number') {
        const sum = known.reduce((a, b) => a + b, 0);
        const answer = 360 - sum;
        return { ...numeric(`The known angles are ${known.map(angle => `${angle}°`).join(' and ')}. Find the missing angle.`, answer, [
            [sum, 'That is the total of the angles already given. Subtract it from 360°.'],
            [360, 'That is the full circle. Take away the angles already given.'],
            [known[0], 'That repeats an angle already given. Find the part of 360° that is left.'],
            [known.at(-1), 'That repeats the last angle given. Find the angle that is missing.'],
            [360 - known[0], 'That takes away only the first angle. Take away all the known angles.'],
            [answer / 2, 'That halves the angle left over. There is only one missing slice.'],
            [100 - sum, 'That starts with 100. A full circle has 360°.']
        ], `The known angles add to ${sum}°. The missing angle is ${answer}°.`, input, 'missing', null, true), known };
    }
    function drawingQuestion(data) {
        return {
            data, input: 'custom', questionType: 'draw',
            prompt: 'Draw a pie chart for this table. Set the angle of each slice.',
            figure: host => drawTable(host, data), widget: drawingWidget(data)
        };
    }
    function examples() {
        const data = dataset([6, 3, 3]);
        return [totalQuestion(data), shareQuestion(data), perItemQuestion(data), angleQuestion(data, 0, 'choice'), drawingQuestion(data)];
    }
    function checks() {
        const data = dataset([8, 6, 4]);
        return [
            totalQuestion(data, 'number'), angleQuestion(data, 1, 'choice'),
            { input: 'choice', questionType: 'error', prompt: 'A pupil uses 100 instead of 360 to find the angles. Which explanation corrects the mistake?', options: [
                option('A full circle has 360°. Multiply each share by 360.', 'Every slice is a share of the 360° in a full circle.', true),
                option('A full circle has 100°, so use 100.', '100 is used for percentages. A full circle has 360°.'),
                option('Divide 360 by each row\'s number.', 'Divide by the total to find one pupil\'s angle. Then multiply by this row.'),
                option('Give every row the angle for one pupil.', 'A row with several pupils needs several pupils\' shares of the circle.')
            ] },
            missingQuestion([90, 150]), drawingQuestion(dataset([5, 4, 3]))
        ];
    }
    const practiceTypes = ['total', 'share', 'per-item', 'angle', 'missing', 'draw'];
    function pick(random) {
        const { randomInt } = window.Maths1to9LessonEngine;
        return practiceTypes.map(type => ({ type, mode: ['total', 'share'].includes(type) ? 'choice' : type === 'draw' ? 'custom' : 'number', seed: randomInt(0, 4294967295, random) }));
    }
    function generate(item, random) {
        const integer = (min, max) => window.Maths1to9LessonEngine.randomInt(min, max, random);
        const t = allowedTotals[integer(0, allowedTotals.length - 1)];
        const first = integer(1, t - 2);
        const second = integer(first + 1, t - 1);
        const data = dataset([first, second - first, t - second]);
        const index = integer(0, data.length - 1);
        let question;
        switch (item.type) {
        case 'total': question = totalQuestion(data, item.mode || 'choice'); break;
        case 'share': question = shareQuestion(data, index); break;
        case 'per-item': question = perItemQuestion(data, item.mode || 'number'); break;
        case 'angle': question = angleQuestion(data, index, item.mode || 'number'); break;
        case 'missing': question = missingQuestion(angles(data).slice(0, -1), item.mode || 'number'); break;
        case 'draw': question = drawingQuestion(data); break;
        default: throw new Error(`Unknown pie-chart type: ${item.type}`);
        }
        return prepare(question, random);
    }
    function resultVisual(question, value) {
        if (!question.data) return undefined;
        const host = document.createElement('div');
        host.className = 'pie-result-visual';
        drawTable(host, question.data, { compact: true });
        if (question.input === 'custom') {
            const values = value ? normalise(value, question.data.length).angles : angles(question.data);
            chart(host, question.data, values, { label: values.map((value, index) => `${question.data[index].name} ${value}°`).join(', ') });
        }
        return host;
    }
    function practiceResultVisual(item) {
        return resultVisual(generate(item, window.Maths1to9LessonEngine.seededRandom(item.seed)));
    }
    const learnScreens = [
        { title: 'Find the total', lines: ['A pie chart shows a group as slices of a circle. A sector is one slice of the pie.', 'A frequency table tells you how many are in each group. Here, 3 pupils chose blue and 9 chose green. Add the numbers to find the total.'] },
        { title: 'Write each share as a fraction', lines: ['Put the number in the row on top. Put the total number underneath.', 'Blue is 3 out of 12 pupils. That is 3/12, or one quarter. Green is 9/12, or three quarters.'] },
        { title: 'Turn the share into an angle', lines: ['An angle is the turn between two lines that meet. We measure it in degrees (°). A full circle has 360°.', 'Multiply each share by 360°. This gives the angle for that slice.'] },
        { title: 'Check the angles', lines: ['The angles must add to 360°.', 'Together, the slices fill the whole circle. No gaps. No slices on top of each other.'] },
        { title: 'Draw the chart', lines: ['Draw a line from the centre to the edge. A protractor is a tool for measuring angles.', 'Measure the first angle from your line. Draw the next line from the centre. Measure the next angle from that new line.', 'Colour the slices. Add labels or a colour key so people know what each slice shows.'] }
    ];
    function drawLearn(host, index) {
        if (index === 0) {
            drawTable(host, learnData);
            const people = document.createElement('div');
            people.className = 'pie-people';
            people.setAttribute('role', 'img');
            people.setAttribute('aria-label', 'Twelve pupils: three chose blue and nine chose green');
            for (let pupil = 0; pupil < 12; pupil++) {
                const dot = text(people, 'span', '');
                dot.style.background = pupil < 3 ? colours[0] : colours[1];
                dot.setAttribute('aria-hidden', 'true');
            }
            host.append(people);
            text(host, 'p', '3 + 9 = 12', 'pie-equation');
        } else if (index === 1) {
            drawTable(host, learnData, { showTotal: true, shares: true });
            chart(host, learnData, angles(learnData), { label: 'One quarter blue and three quarters green' });
        } else if (index === 2) {
            text(host, 'p', 'Blue: 3/12 × 360° = 90°', 'pie-equation');
            text(host, 'p', 'Green: 9/12 × 360° = 270°', 'pie-equation');
            text(host, 'p', 'You can also find the angle for one pupil, then multiply by the number in each row.');
            text(host, 'p', '360° ÷ 12 pupils = 30° for each pupil', 'pie-equation');
            text(host, 'p', 'Blue: 3 × 30° = 90°', 'pie-equation');
            text(host, 'p', 'Green: 9 × 30° = 270°', 'pie-equation');
            text(host, 'p', 'Both ways give the same angle.');
            chart(host, learnData, angles(learnData), { protractor: true, label: 'Blue angle 90 degrees; green angle 270 degrees' });
        } else if (index === 3) {
            drawTable(host, learnData, { showTotal: true, showAngles: true });
            text(host, 'p', '90° + 270° = 360°', 'pie-equation');
            chart(host, learnData, angles(learnData), { label: 'The two slices fill the full circle' });
        } else {
            drawTable(host, learnData, { showAngles: true });
            chart(host, learnData, angles(learnData), { protractor: true, label: 'A finished chart with a 90-degree blue slice and a 270-degree green slice' });
            text(host, 'p', 'The blue slice starts at 0° and ends at 90°. The green slice fills the rest.', 'pie-caption');
        }
    }
    window.PieCharts = { total, angles, fraction, allowedTotals, dataset, point, sectorPath, drawingWidget, totalQuestion, shareQuestion, perItemQuestion, angleQuestion, missingQuestion, drawingQuestion, examples, checks, practiceTypes, pick, prepare, generate, resultVisual, practiceResultVisual, learnScreens, drawLearn };
})();
