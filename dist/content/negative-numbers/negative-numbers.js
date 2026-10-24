(() => {
    'use strict';

    const signed = number => String(number).replace('-', '−');
    const equation = (start, amount) => `${signed(start)} − (−${amount})`;
    const working = (start, amount) => `${equation(start, amount)} = ${signed(start)} + ${amount} = ${signed(start + amount)}.`;
    const option = (label, feedback, correct = false) => ({ label, feedback, correct });

    function rewrite(start, amount) {
        return {
            start, amount, questionType: 'rewrite', input: 'choice',
            prompt: `Which calculation means the same as ${equation(start, amount)}?`,
            options: [
                option(`${signed(start)} + ${amount}`, 'Keep the starting number. Subtracting a negative becomes addition.', true),
                option(`${signed(start)} − ${amount}`, 'You subtracted the positive number instead of adding it.'),
                option(`${signed(-start)} + ${amount}`, 'You changed the sign of the starting number. Keep it unchanged.'),
                option(`${signed(-start)} − ${amount}`, 'Keep the starting number and change subtracting a negative to addition.')
            ]
        };
    }

    function calculate(start, amount) {
        const answer = start + amount;
        const mistakes = [
            { value: signed(start - amount), feedback: 'You subtracted instead of adding the positive number.' },
            { value: signed(-start + amount), feedback: 'You changed the sign of the starting number. Keep it unchanged.' },
            { value: signed(-answer), feedback: 'Check the sign of your answer. Count right from the starting number.' }
        ].filter((rule, index, rules) => Number(rule.value.replace('−', '-')) !== answer && rules.findIndex(other => other.value === rule.value) === index);
        return {
            start, amount, questionType: 'calculate', input: 'number',
            prompt: `Work out ${equation(start, amount)}.`, answer: signed(answer),
            feedback: working(start, amount), rules: mistakes,
            fallback: `Keep ${signed(start)} and add ${amount}. Count ${amount} spaces to the right.`
        };
    }

    function error(start, amount) {
        return {
            start, amount, questionType: 'error', input: 'choice',
            prompt: `Sam writes: ${equation(start, amount)} = ${signed(-start)} + ${amount} = ${-start + amount}. What has Sam done wrong?`,
            options: [
                option(`He changed ${signed(start)} to ${signed(-start)}. The answer is ${signed(start + amount)}.`, 'The starting number stays unchanged. Only subtracting a negative changes to addition.', true),
                option(`He should subtract ${amount}. The answer is ${signed(start - amount)}.`, 'Subtracting a negative becomes addition, so add the positive number.'),
                option('Nothing. His working is right.', 'He changed the starting number. Keep its minus sign.'),
                option(`His answer has the wrong sign. It should be ${signed(start - amount)}.`, 'The mistake happens earlier: he changed the starting number, not just the final sign.')
            ]
        };
    }

    function checks() {
        const mistake = {
            questionType: 'error', input: 'choice',
            prompt: 'A student writes: −4 − (−7) = −4 − 7 = −11. Which explanation is right?',
            options: [
                option('Subtracting −7 means adding 7. The answer is 3.', 'Keep −4 and add 7: −4 + 7 = 3.', true),
                option('The working is right. The answer is −11.', 'Subtracting −7 becomes adding 7. It does not become subtracting 7.'),
                option('Change −4 to 4, then add 7. The answer is 11.', 'Keep the starting number −4. Only subtracting −7 changes to addition.'),
                option('Add 7 but keep the answer negative. The answer is −3.', 'Start at −4 and move seven spaces right. You pass zero and reach 3.')
            ]
        };
        const temperature = {
            questionType: 'temperature', input: 'choice',
            prompt: 'At 6 a.m., the temperature is −7°C. By midday, it is 4°C. Which calculation gives the increase?',
            options: [
                option('4 − (−7) = 11°C', 'The increase is the final temperature minus the starting temperature.', true),
                option('4 − 7 = −3°C', 'The starting temperature is −7, so subtract −7, not 7.'),
                option('−7 − 4 = −11°C', 'To find the increase, subtract the starting temperature from the final temperature.'),
                option('7 − 4 = 3°C', 'The temperature crosses zero: seven degrees to zero, then four more.')
            ]
        };
        return [calculate(13, 6), calculate(-15, 7), rewrite(-6, 10), mistake, temperature];
    }

    const practiceTypes = [
        'rewrite-positive', 'rewrite-negative', 'rewrite-positive', 'rewrite-negative',
        'calculate-positive', 'calculate-positive', 'cross-zero', 'stay-negative',
        'cross-zero', 'zero', 'error'
    ];

    function pick(random) {
        const { randomInt } = window.Maths1to9LessonEngine;
        return practiceTypes.map(type => ({ type, seed: randomInt(0, 4294967295, random) }));
    }

    function prepare(question, random) {
        return question.options
            ? { ...question, options: window.Maths1to9LessonEngine.shuffle(question.options, random) }
            : { ...question };
    }

    function generate(item, random) {
        const { randomInt } = window.Maths1to9LessonEngine;
        const integer = (min, max) => randomInt(min, max, random);
        let question;
        if (item.type.startsWith('rewrite')) {
            const magnitude = integer(1, 15);
            // Different magnitudes keep even the numerical values of all four choices distinct.
            let amount = integer(1, 14);
            if (amount === magnitude) amount = 15;
            question = rewrite(item.type === 'rewrite-positive' ? magnitude : -magnitude, amount);
        } else if (item.type === 'error') {
            const magnitude = integer(4, 15);
            question = error(-magnitude, integer(1, magnitude - 1));
        } else {
            let start = integer(1, 15);
            let amount = integer(1, 15);
            if (item.type === 'cross-zero') {
                start = -integer(1, 12);
                amount = -start + integer(1, 12);
            }
            if (item.type === 'stay-negative') {
                start = -integer(2, 20);
                amount = integer(1, -start - 1);
            }
            if (item.type === 'zero') {
                start = -integer(1, 20);
                amount = -start;
            }
            question = calculate(start, amount);
        }
        return prepare({ ...question, questionType: item.type }, random);
    }

    function paragraph(host, text, className = '') {
        const node = document.createElement('p');
        node.textContent = text;
        node.className = className;
        host.append(node);
        return node;
    }

    function drawLine(host, start, end, position = start) {
        const min = Math.min(-10, start);
        const max = Math.max(10, end);
        const line = document.createElement('div');
        line.className = 'negative-line';
        line.setAttribute('role', 'img');
        const track = document.createElement('div');
        track.className = 'negative-track';
        const ticks = document.createElement('div');
        ticks.className = 'negative-ticks';
        for (let value = min; value <= max; value++) {
            const tick = document.createElement('span');
            tick.style.left = `${(value - min) / (max - min) * 100}%`;
            tick.textContent = signed(value);
            if (value % 2 !== 0) tick.className = 'negative-small-tick';
            ticks.append(tick);
        }
        const path = document.createElement('div');
        path.className = 'negative-path';
        path.style.left = `${(start - min) / (max - min) * 100}%`;
        path.style.width = `${(end - start) / (max - min) * 100}%`;
        path.textContent = '→';
        const marker = document.createElement('span');
        marker.className = 'negative-marker';
        marker.textContent = '●';
        track.append(path, marker, ticks);
        line.append(track);
        host.append(line);
        function update(value) {
            marker.style.left = `${(value - min) / (max - min) * 100}%`;
            line.setAttribute('aria-label', `Number line from ${signed(min)} to ${signed(max)}. Start ${signed(start)}, move right to ${signed(end)}. Marker ${signed(value)}.`);
        }
        update(position);
        return update;
    }

    function slider(host, label, min, max, value, onInput) {
        const wrapper = document.createElement('label');
        wrapper.className = 'negative-slider';
        const caption = document.createElement('span');
        const input = document.createElement('input');
        input.type = 'range';
        input.min = min;
        input.max = max;
        input.step = 1;
        input.value = value;
        input.setAttribute('aria-label', label);
        const updateLabel = () => { caption.textContent = `${label}: ${signed(Number(input.value))}`; };
        updateLabel();
        input.addEventListener('input', () => { updateLabel(); onInput(Number(input.value)); });
        wrapper.append(caption, input);
        host.append(wrapper);
        return input;
    }

    function drawJourney(host, section) {
        const state = section.state;
        const update = drawLine(host, 3, 7, 3 + state.jumps);
        const trail = paragraph(host, '', 'negative-equation');
        function show(jumps) {
            update(3 + jumps);
            trail.textContent = Array.from({ length: jumps + 1 }, (_, i) => signed(3 + i)).join(' → ');
        }
        show(state.jumps);
        slider(host, 'Spaces moved right', 0, 4, state.jumps, jumps => {
            section.update(saved => { saved.jumps = jumps; });
            show(jumps);
        });
    }

    function drawExplore(host, section) {
        const state = section.state;
        const picture = document.createElement('div');
        const sum = paragraph(host, '', 'negative-equation');
        const update = () => {
            picture.replaceChildren();
            drawLine(picture, state.start, state.start + state.amount, state.start + state.amount);
            sum.textContent = working(state.start, state.amount);
        };
        slider(host, 'Starting number', -10, 2, state.start, start => {
            section.update(saved => { saved.start = start; });
            update();
        });
        slider(host, 'Positive amount to add', 1, 8, state.amount, amount => {
            section.update(saved => { saved.amount = amount; });
            update();
        });
        host.append(picture);
        update();
    }

    function drawAnswerLine(host, question, correct) {
        drawLine(host, question.start, question.start + question.amount, correct ? question.start + question.amount : question.start);
    }

    window.NegativeNumbers = {
        signed, equation, working, rewrite, calculate, checks,
        practiceTypes, pick, prepare, generate, drawJourney, drawExplore, drawAnswerLine
    };
})();
