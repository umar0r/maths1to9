(() => {
    'use strict';

    const option = (label, feedback, correct = false, index) => ({ label, feedback, correct, ...(index !== undefined ? { index } : {}) });
    const clean = text => String(text).replace(/,/g, '');
    const spaced = text => {
        const [whole, fraction] = String(text).split('.');
        return whole.replace(/\B(?=(\d{3})+$)/g, ',') + (fraction !== undefined ? '.' + fraction : '');
    };

    function digits(number, n) {
        const text = clean(number);
        const indexes = [...text].map((digit, index) => /\d/.test(digit) ? index : -1).filter(index => index >= 0);
        const start = indexes.findIndex(index => text[index] !== '0');
        const significant = indexes.slice(start);
        return { first: significant[0], target: significant[n - 1], decider: significant[n], significant, indexes };
    }

    function place(number, index) {
        const text = clean(number);
        const point = text.includes('.') ? text.indexOf('.') : text.length;
        const power = index < point ? point - index - 1 : point - index;
        return {
            6: 'millions', 5: 'hundred-thousands', 4: 'ten-thousands', 3: 'thousands',
            2: 'hundreds', 1: 'tens', 0: 'ones', '-1': 'tenths', '-2': 'hundredths',
            '-3': 'thousandths', '-4': 'ten-thousandths', '-5': 'hundred-thousandths', '-6': 'millionths'
        }[power];
    }
    const digitLabel = (number, index) => `${clean(number)[index]} (${place(number, index)})`;

    function roundToPower(number, power, mode = 'nearest') {
        const [whole, fraction = ''] = clean(number).split('.');
        const integer = BigInt(whole + fraction);
        const drop = fraction.length + power;
        let kept;
        if (drop <= 0) kept = integer * 10n ** BigInt(-drop);
        else {
            const unit = 10n ** BigInt(drop);
            kept = integer / unit;
            if (mode === 'up' || (mode === 'nearest' && (integer % unit) * 2n >= unit)) kept++;
        }
        if (power >= 0) return kept === 0n ? '0' : String(kept) + '0'.repeat(power);
        const places = -power;
        const result = String(kept).padStart(places + 1, '0');
        return result.slice(0, -places) + '.' + result.slice(-places);
    }
    function rounded(number, kind, accuracy, mode = 'nearest') {
        return roundToPower(number, kind === 'decimal' ? -accuracy : accuracy, mode);
    }
    function accuracyText(kind, accuracy) {
        if (kind === 'decimal') return `${accuracy} decimal ${accuracy === 1 ? 'place' : 'places'}`;
        if (accuracy === 0) return 'the nearest whole number';
        if (accuracy === 6) return 'the nearest million';
        return `the nearest ${spaced(String(10 ** accuracy))}`;
    }
    function keyDigits(number, kind, accuracy) {
        const d = digits(number, 1);
        const point = number.includes('.') ? number.indexOf('.') : number.length;
        const power = kind === 'decimal' ? -accuracy : accuracy;
        const target = power >= 0 ? point - 1 - power : point - power;
        return { ...d, target, decider: d.indexes[d.indexes.indexOf(target) + 1] };
    }
    function roundingQuestion(number, kind, accuracy, input = 'number', questionType = kind, customPrompt) {
        number = clean(number);
        const d = keyDigits(number, kind, accuracy);
        const answer = rounded(number, kind, accuracy);
        const next = number[d.decider];
        const feedback = `The next digit is ${next}, so ${Number(next) >= 5 ? 'round up' : 'keep the last digit as it is'}. ${spaced(number)} ≈ ${spaced(answer)}`;
        const wrongAccuracy = kind === 'decimal' ? accuracy + 1 : Math.max(0, accuracy - 1);
        const otherAccuracy = kind === 'decimal' ? Math.max(0, accuracy - 1) : accuracy + 1;
        const wrongKind = kind === 'decimal' && otherAccuracy === 0 ? 'nearest' : kind;
        const mistakes = [
            ...(answer.includes('.') && answer.endsWith('0') ? [[answer.slice(0, -1).replace(/\.$/, ''), 'Keep the final zero after the decimal point. It shows the accuracy asked for.']] : []),
            [rounded(number, kind, accuracy, 'down'), 'That drops the later digits without rounding up. The next digit is 5 or more.'],
            [rounded(number, kind, accuracy, 'up'), 'That rounds up. The next digit is less than 5, so keep the last digit as it is.'],
            ...(!answer.includes('.') && answer.endsWith('0') ? [[answer.replace(/0+$/, ''), 'That drops the zeros that keep the number the right size. Keep those whole-number places.']] : []),
            [rounded(number, kind, wrongAccuracy), `That rounds to a different place. The question asks for ${accuracyText(kind, accuracy)}.`],
            [rounded(number, wrongKind, otherAccuracy), `That uses a different accuracy. Use ${accuracyText(kind, accuracy)}.`],
            [number, 'That leaves the original number unchanged. Round it to the place asked for.']
        ].filter(([value], index, list) => value !== answer && list.findIndex(([other]) => other === value) === index);
        let prompt = customPrompt || `Round ${spaced(number)} to ${accuracyText(kind, accuracy)}.`;
        if (input === 'number' && answer.includes('.') && answer.endsWith('0')) {
            const zeros = answer.match(/0+$/)[0].length > 1 ? 'zeros' : 'zero';
            prompt += ` Keep the ${zeros} at the end after the decimal point.`;
        }
        const question = { number, kind, accuracy, ...d, stage: 'round', questionType, input, prompt, feedback, exact: kind !== 'nearest' };
        if (input === 'choice') question.options = [option(spaced(answer), feedback, true), ...mistakes.slice(0, 3).map(([value, message]) => option(spaced(value), message))];
        else {
            question.answer = answer;
            question.rules = mistakes.map(([value, message]) => ({ value, feedback: message }));
            question.fallback = feedback;
        }
        return question;
    }
    function contextStep(questionType, prompt, answer, feedback, rules = []) {
        return {
            stage: 'context', questionType, input: 'number', exact: false,
            prompt, answer, feedback, fallback: feedback,
            rules: rules.map(([value, message]) => ({ value, feedback: message }))
        };
    }

    // Try it: two hands-on slides. On each one the pupil taps the digit that
    // decides, then puts the number on a number line with their hands. The
    // words below are the words on screen; the tests and the slides tool read
    // them from here.
    const tryIt = {
        slides: [
            {
                title: 'Round 53,481 to the nearest 100.',
                digits: '53481', accuracy: 2,
                tap: 'Tap the hundreds digit.',
                tapHint: 'The hundreds digit is the third from the right.',
                place: 'Tap where 53,481 goes on the line.',
                line: { base: 53400, step: 10, value: 53481, tolerance: 5 },
                notes: {
                    digit: 'The next digit is 8. That is 5 or more, so round up.',
                    nearest: 'So 53,481 is closer to 53,500.'
                },
                answer: '53,481 ≈ 53,500',
                button: 'Next'
            },
            {
                title: 'Round 2,681,450 to the nearest million.',
                digits: '2681450', accuracy: 6,
                tap: 'Tap the millions digit.',
                tapHint: 'The millions digit is the seventh from the right.',
                place: 'Drag each number to its place on the line.',
                move: 'Drag 2,681,450 to where it goes on the line.',
                labels: ['2,000,000', '2,500,000', '3,000,000'],
                line: { base: 2000000, step: 100000, value: 2681450, tolerance: 50000 },
                notes: {
                    digit: 'The next digit is 6. That is 5 or more, so round up.',
                    nearest: 'So 2,681,450 is closer to 3,000,000.'
                },
                answer: '2,681,450 ≈ 3,000,000',
                button: 'Continue'
            }
        ]
    };

    /* Which number a point across a number line stands for. The lines are
       drawn in a 660-wide box with a margin at each end, so the pointer is
       measured against those same numbers. */
    function valueOnLine(line, clientX) {
        const rect = line.querySelector('svg').getBoundingClientRect();
        const edge = Number(line.dataset.edge);
        const base = Number(line.dataset.base);
        const step = Number(line.dataset.step);
        const point = (clientX - rect.left) / rect.width * 660;
        return base + (point - edge) / (660 - 2 * edge) * 10 * step;
    }

    /* A card that follows the pointer, or a finger, and glides back if it is
       dropped somewhere it does not belong. A plain tap is reported instead,
       so tapping a card and then its place works too. */
    function dragCard(card, { onDrop, onTap }) {
        let drag = null;
        let dragged = false;
        let offset = { dx: 0, dy: 0 };
        card.addEventListener('pointerdown', event => {
            if (event.pointerType === 'mouse' && event.button !== 0) return;
            drag = { x: event.clientX, y: event.clientY, id: event.pointerId };
            dragged = false;
            card.setPointerCapture(event.pointerId);
        });
        card.addEventListener('pointermove', event => {
            if (!drag || event.pointerId !== drag.id) return;
            offset = { dx: event.clientX - drag.x, dy: event.clientY - drag.y };
            if (!dragged && Math.hypot(offset.dx, offset.dy) < 6) return;
            dragged = true;
            card.classList.add('is-dragging');
            card.style.transform = `translate(${offset.dx}px, ${offset.dy}px)`;
        });
        const end = event => {
            if (!drag || event.pointerId !== drag.id) return;
            drag = null;
            if (!dragged) return;
            card.classList.remove('is-dragging');
            card.style.transform = '';
            const taken = event.type !== 'pointercancel' && onDrop(event.clientX, event.clientY);
            // Nothing is said: the card just slides back to where it started.
            if (!taken) {
                card.animate([
                    { transform: `translate(${offset.dx}px, ${offset.dy}px)` },
                    { transform: 'none' }
                ], { duration: 220, easing: 'ease-out' });
            }
            setTimeout(() => { dragged = false; }, 0);
        };
        card.addEventListener('pointerup', end);
        card.addEventListener('pointercancel', end);
        card.addEventListener('click', () => {
            if (dragged) return;
            onTap();
        });
    }

    /* The five or seven digit cards, in one row, with no comma card between
       them. Taps only count while the pupil is still choosing. */
    function drawSlideDigits(host, slide, answered, onPick) {
        const digits = keyDigits(slide.digits, 'nearest', slide.accuracy);
        return drawDigits(host, { number: slide.digits, ...digits }, answered ? 'both' : 'none',
            answered ? null : index => onPick(index === digits.target), { commas: false });
    }

    /* Slide one: tap the digit, tap where the number goes on the line, then it
       rounds by itself. */
    function drawSlideOne(host, slide, saved, handlers) {
        const { base, step, value } = slide.line;
        text(host, 'p', slide.tap);
        const block = text(host, 'div', '', 'rounding-notes rounding-tryit');
        const row = drawSlideDigits(block, slide, saved.tapped, handlers.onDigit);
        if (!saved.tapped) return;
        text(block, 'p', slide.place);
        const line = drawLine(block, value, false, null, false, base, null, step, {
            wideLabels: true, labels: 'landmarks', showNearest: false,
            showDot: saved.dot, onTap: saved.dot ? null : number => handlers.onTap(number)
        });
        line.dataset.base = base;
        line.dataset.step = step;
        line.dataset.edge = 50;
        line.dataset.tapValue = value;
        if (!saved.dot) return;
        // Two short notes, each with an arrow to the exact thing it is about:
        // the 8 card, and the round number the answer lands on.
        const digitNote = text(block, 'p', slide.notes.digit, 'rounding-note rounding-note--digit');
        const nearestNote = text(block, 'p', slide.notes.nearest, 'rounding-note rounding-note--nearest');
        drawArrows(block, [
            [digitNote, () => row.querySelector('.significant-digit.is-look')],
            [nearestNote, () => line.querySelector(`.rounding-value[data-value="${base + 10 * step}"]`)]
        ]);
        text(host, 'p', slide.answer, 'significant-equation');
    }

    /* Slide two's line: a tick every 100,000, then three empty slots under the
       left end, the middle and the right end for the pupil to fill. */
    function drawBuildLine(host, slide, saved, handlers, labelsPlaced) {
        const { base, step, value, tolerance } = slide.line;
        const targets = slide.labels.map(label => Number(clean(label)));
        const edge = 30;
        const axis = 30;
        const x = number => edge + (number - base) / (10 * step) * (660 - 2 * edge);
        let picture = `<path class="rounding-axis" d="M 15 ${axis} H 645"/>`;
        for (let mark = 0; mark <= 10; mark++) {
            const number = base + mark * step;
            const landmark = mark % 5 === 0;
            const reach = landmark ? 12 : 7;
            picture += `<path class="rounding-tick${landmark ? ' is-landmark' : ''}" d="M ${x(number)} ${axis - reach} V ${axis + reach}"/>`;
        }
        // The number itself, once it has been put where it goes: a round dot
        // on the line with its value written above it.
        if (saved.dot) {
            picture += `<circle class="rounding-dot" cx="${x(value)}" cy="${axis}" r="9"/>`;
            picture += `<text class="rounding-value is-key rounding-value--above" x="${x(value)}" y="${axis - 12}">${spaced(String(value))}</text>`;
        }
        const line = document.createElement('div');
        line.className = 'rounding-line';
        line.dataset.base = base;
        line.dataset.step = step;
        line.dataset.edge = edge;
        line.dataset.tapValue = value;
        line.innerHTML = `<svg viewBox="0 0 660 ${axis + 28}" aria-hidden="true">${picture}</svg>`;
        host.append(line);

        const row = document.createElement('div');
        row.className = 'tryit-slots';
        const slots = slide.labels.map((label, index) => {
            const slot = document.createElement('button');
            slot.type = 'button';
            slot.className = 'tryit-slot';
            slot.dataset.slot = index;
            const placed = saved.slots[index];
            if (placed === null) slot.setAttribute('aria-label', `Empty place for ${label}`);
            else {
                slot.classList.add('is-filled');
                slot.textContent = spaced(String(placed));
                slot.setAttribute('aria-label', `${spaced(String(placed))} in place`);
                slot.disabled = true;
            }
            row.append(slot);
            return slot;
        });
        host.append(row);

        const tray = document.createElement('div');
        tray.className = 'tryit-cards';
        host.append(tray);

        if (!labelsPlaced) {
            const slotAt = (pointerX, pointerY) => slots.findIndex(slot => {
                const box = slot.getBoundingClientRect();
                return pointerX >= box.left && pointerX <= box.right
                    && pointerY >= box.top && pointerY <= box.bottom;
            });
            let picked = null;
            // Cards already on the line have left the tray.
            const cards = handlers.order.filter(number => !saved.slots.includes(number)).map(number => {
                const card = document.createElement('button');
                card.type = 'button';
                card.className = 'tryit-card';
                card.dataset.value = number;
                card.textContent = spaced(String(number));
                card.setAttribute('aria-label', `Drag ${spaced(String(number))} to its place on the line, or tap it and tap its place`);
                dragCard(card, {
                    // Only the right slot keeps a card. Anywhere else it slides back.
                    onDrop: (pointerX, pointerY) => {
                        const slot = slotAt(pointerX, pointerY);
                        if (targets[slot] !== number) return false;
                        handlers.onLabel(number, slot);
                        return true;
                    },
                    onTap() {
                        picked = picked === number ? null : number;
                        cards.forEach(other => other.classList.toggle('is-picked', Number(other.dataset.value) === picked));
                    }
                });
                tray.append(card);
                return card;
            });
            slots.forEach((slot, index) => slot.addEventListener('click', () => {
                if (picked === null || targets[index] !== picked) return;
                handlers.onLabel(picked, index);
            }));
        }

        if (labelsPlaced && !saved.dot) {
            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'tryit-card';
            card.dataset.value = value;
            card.textContent = spaced(String(value));
            card.setAttribute('aria-label', `Drag ${spaced(String(value))} to where it goes on the line`);
            dragCard(card, {
                onDrop(pointerX) {
                    if (Math.abs(valueOnLine(line, pointerX) - value) > tolerance) return false;
                    handlers.onNumber();
                    return true;
                },
                onTap() {}
            });
            tray.append(card);
        }
        return { line, slots };
    }

    /* Slide two: build the three labels first, then drag the number on. */
    function drawSlideTwo(host, slide, saved, handlers) {
        text(host, 'p', slide.tap);
        const block = text(host, 'div', '', 'rounding-notes rounding-tryit');
        const row = drawSlideDigits(block, slide, saved.tapped, handlers.onDigit);
        if (!saved.tapped) return;
        const labelsPlaced = saved.slots.every(placed => placed !== null);
        text(block, 'p', labelsPlaced ? slide.move : slide.place);
        const { line, slots } = drawBuildLine(block, slide, saved, handlers, labelsPlaced);
        if (!saved.dot) return;
        // The 6 card decides, and the answer lands on 3,000,000 at the right end.
        const digitNote = text(block, 'p', slide.notes.digit, 'rounding-note rounding-note--digit');
        const nearestNote = text(block, 'p', slide.notes.nearest, 'rounding-note rounding-note--nearest');
        drawArrows(block, [
            [digitNote, () => row.querySelector('.significant-digit.is-look')],
            [nearestNote, () => slots[slots.length - 1]]
        ]);
        text(host, 'p', slide.answer, 'significant-equation');
        void line;
    }

    function drawSlide(host, slide, saved, handlers) {
        return slide.labels ? drawSlideTwo(host, slide, saved, handlers) : drawSlideOne(host, slide, saved, handlers);
    }

    function checks() {
        return [
            roundingQuestion('2748', 'nearest', 2, 'choice', 'context', 'A stadium has 2,748 spectators. Round this to the nearest 100.'),
            roundingQuestion('12.64', 'decimal', 1, 'choice'), roundingQuestion('2681450', 'nearest', 6, 'choice'),
            { questionType: 'error', input: 'choice', prompt: 'Amir says 4.95 rounds to 4.9 at 1 decimal place. Which explanation corrects him?', options: [
                option('The 5 rounds the tenths up, giving 5.0', 'The hundredths digit is 5. Round up and keep one decimal place.', true),
                option('Keep 4.9 because the tenths digit is already 9', 'A 9 can still round up. The extra 1 carries to the next column.'),
                option('Round to 4 because only whole numbers can be rounded', 'Decimals can be rounded too. Keep the tenths place.'),
                option('Write 5 because the zero after the point does not matter', 'Write 5.0 to show the one decimal place asked for.')
            ] },
            roundingQuestion('1.049', 'decimal', 1, 'number', 'context', 'A bottle holds 1.049 litres. Round this directly to 1 decimal place.')
        ];
    }
    const practiceGroups = [
        { kind: 'place', types: ['nearest-ten', 'halfway-hundred', 'nearest-thousand', 'big-hundred', 'big-thousand'] },
        { kind: 'place', types: ['one-decimal', 'decimal-zero', 'decimal-carry'] },
        { kind: 'context', types: ['round-up'] },
        { kind: 'context', types: ['round-down'] },
        { kind: 'context', types: ['full-groups', 'path-context'] }
    ];
    const practiceTypes = practiceGroups.flatMap(group => group.types);

    function pick(random) {
        const { randomInt, shuffle } = window.Maths1to9LessonEngine;
        // Two cards from each group keeps it at 10 questions, so whole numbers,
        // 1 decimal place and real life all come up in every session.
        const picks = practiceGroups.flatMap(group => [0, 1].map(() => ({
            group, type: group.types[randomInt(0, group.types.length - 1, random)]
        })));

        // Backtrack if a legal next card would leave no way to place the remaining cards.
        function order(remaining, ordered = []) {
            if (!remaining.length) return ordered;
            const last = ordered.at(-1)?.group;
            const previous = ordered.at(-2)?.group;
            for (const candidate of remaining) {
                const { group } = candidate;
                if (group === last || (group.kind === last?.kind && group.kind === previous?.kind)) continue;
                const result = order(remaining.filter(item => item !== candidate), [...ordered, candidate]);
                if (result) return result;
            }
            return null;
        }

        for (let attempt = 0; attempt < 20; attempt++) {
            const ordered = order(shuffle(picks, random));
            if (!ordered) continue;
            const modes = ordered.map((_, index) => index % 2 === 0 ? 'choice' : 'number');
            // A real-life card drops back to a typed answer when it cannot make
            // four different choices, so give at least one place card (which
            // always can) the multiple-choice slot.
            const placeChoice = ordered.some(({ group }, index) => group.kind === 'place' && modes[index] === 'choice');
            return ordered.map(({ type }, index) => ({
                type,
                mode: placeChoice === (modes[index] === 'choice') ? 'choice' : 'number',
                seed: randomInt(0, 4294967295, random)
            }));
        }
        throw new Error('Could not lay out a practice session.');
    }
    function prepare(question, random) {
        return question.options ? { ...question, options: window.Maths1to9LessonEngine.shuffle(question.options, random) } : { ...question };
    }
    function practiceContext(item, prompt, answer, feedback, mistakes, random) {
        const seen = new Set([answer]);
        const rules = mistakes.filter(([value]) => {
            if (seen.has(value)) return false;
            seen.add(value);
            return true;
        });
        if (item.mode === 'choice' && rules.length === 3) {
            return prepare({
                questionType: item.type, input: 'choice', prompt,
                options: [option(spaced(answer), feedback, true),
                    ...rules.map(([value, message]) => option(spaced(value), message))]
            }, random);
        }
        return contextStep(item.type, prompt, String(answer), feedback,
            rules.map(([value, message]) => [String(value), message]));
    }


    function divisionText(total, size) {
        const scaled = total * 1000;
        const truncated = Math.floor(scaled / size) / 1000;
        return `${truncated}${scaled % size ? '…' : '.'}`;
    }

    function generateSituation(item, integer, random) {
        if (item.type === 'round-down') {
            const pounds = integer(10, 40);
            const budget = pounds * 100;
            const prices = Array.from({ length: 77 }, (_, index) => 115 + index * 5)
                .filter(price => budget % price !== 0);
            const price = prices[integer(0, prices.length - 1)];
            const money = pence => `£${(pence / 100).toFixed(2)}`;
            const product = ['pen', 'ticket', 'notebook'][integer(0, 2)];
            const quotient = budget / price;
            const answer = Math.floor(quotient);
            const next = answer + 1;
            return practiceContext(item,
                `You have £${pounds}. Each ${product} costs ${money(price)}. ${pounds} ÷ ${(price / 100).toFixed(2)} = ${divisionText(budget, price)} What is the greatest number you can buy?`,
                answer, `${answer} × ${money(price)} = ${money(answer * price)}. ${next} cost ${money(next * price)}, which is more than £${pounds}.`, [
                    [next, `That many cost more than £${pounds}. Round down.`],
                    [Math.round(quotient) === answer ? next + 1 : Math.round(quotient), 'Here you always round down, even if the decimal is big.'],
                    [Math.round(quotient * 10) / 10, "You can't buy part of one. Give a whole number."]
                ], random);
        }

        const roundUp = item.type === 'round-up';
        const size = roundUp ? integer(12, 30) : integer(6, 12);
        const max = roundUp ? 300 : 200;
        let total = integer(roundUp ? 100 : 40, max);
        if (total % size === 0) total += total === max ? -1 : 1;
        const quotient = total / size;
        const lower = Math.floor(quotient);
        const upper = lower + 1;
        const roundedQuotient = Math.round(quotient * 10) / 10;
        const working = `${total} ÷ ${size} = ${divisionText(total, size)}`;
        if (roundUp) {
            const books = integer(0, 1) === 0;
            const [unit, units, contents] = books ? ['box', 'boxes', 'books'] : ['minibus', 'minibuses', 'people'];
            const setup = books
                ? `There are ${total} books to pack. Each box holds ${size} books.`
                : `A trip needs seats for ${total} people. Each minibus seats ${size}.`;
            return practiceContext(item,
                `${setup} ${working} What is the smallest number of ${units} needed?`, upper,
                `${upper} ${units} hold ${upper} × ${size} = ${upper * size} ${contents}, so all ${total} fit. ${lower} ${units} only hold ${lower * size}.`, [
                    [lower, 'That leaves some with no space. You need one more.'],
                    [Math.round(quotient) === upper ? lower - 1 : Math.round(quotient), 'Here you always round up, even if the decimal is small.'],
                    [roundedQuotient, `You can't have part of a ${unit}. Give a whole number.`]
                ], random);
        }

        return practiceContext(item,
            `A club has ${total} stickers. It packs them in packets of ${size}. ${working} How many full packets can it make?`,
            lower, `${lower} × ${size} = ${lower * size} stickers. That fills ${lower} packets and leaves ${total % size} over.`, [
                [upper, "The last packet wouldn't be full."],
                [total % size, 'That is how many are left over, not the number of packets.'],
                [roundedQuotient, 'Only full packets count. Give a whole number.']
            ], random);
    }

    function generate(item, random) {
        const integer = (a, b) => window.Maths1to9LessonEngine.randomInt(a, b, random);
        const nonZeroEnd = value => value % 10 === 0 ? value + 1 : value;
        let number, kind, accuracy, customPrompt;
        switch (item.type) {
        case 'nearest-ten': number = String(nonZeroEnd(integer(12, 98))); kind = 'nearest'; accuracy = 1; break;
        case 'halfway-hundred': number = String(integer(2, 8) * 100 + 50); kind = 'nearest'; accuracy = 2; break;
        case 'nearest-thousand': number = String(nonZeroEnd(integer(1001, 9899))); kind = 'nearest'; accuracy = 3; break;
        case 'one-decimal': number = `${integer(1, 8)}.${integer(1, 9)}${integer(1, 9)}`; kind = 'decimal'; accuracy = 1; break;
        case 'two-decimals': number = `${integer(1, 8)}.${integer(1, 9)}${integer(0, 9)}${integer(1, 9)}`; kind = 'decimal'; accuracy = 2; break;
        case 'decimal-zero': number = `${integer(1, 8)}.0${integer(1, 4)}`; kind = 'decimal'; accuracy = 1; break;
        case 'decimal-carry': number = `9.9${integer(5, 9)}`; kind = 'decimal'; accuracy = 1; break;
        case 'big-hundred':
        case 'big-thousand': {
            accuracy = item.type === 'big-hundred' ? 2 : 3;
            const value = integer(10001, 98999);
            const unit = 10 ** accuracy;
            number = String(value % unit === 0 ? value + 1 : value);
            kind = 'nearest';
            break;
        }
        case 'whole-number':
            number = `${integer(10, 98)}.${integer(1, 9)}${integer(1, 9)}`;
            kind = 'nearest'; accuracy = 0; break;
        case 'carry-two':
            number = `${integer(1, 8)}.99${integer(5, 9)}`;
            kind = 'decimal'; accuracy = 2; break;
        case 'round-up':
        case 'round-down':
        case 'full-groups':
            return generateSituation(item, integer, random);
        case 'path-context':
            number = String(nonZeroEnd(integer(111, 989))); kind = 'nearest'; accuracy = 1;
            customPrompt = `A path is ${number} metres long. Round its length to the nearest 10 metres.${item.mode === 'choice' ? '' : ' Type the number of metres.'}`;
            break;
        default: throw new Error(`Unknown rounding type: ${item.type}`);
        }
        const question = roundingQuestion(number, kind, accuracy, item.mode || 'number', item.type, customPrompt);
        if (question.input === 'choice' && question.options.length < 4) {
            return roundingQuestion(number, kind, accuracy, 'number', item.type, customPrompt);
        }
        return prepare(question, random);
    }
    const learnScreens = [
        { title: 'Rounding means finding a simpler number that is close to the one you have.', lines: ['You can round whole numbers or decimals. The ≈ sign means "is about".'], roundings: [
            { label: 'To the nearest 10', from: '38', to: '40' },
            { label: 'To the nearest 100', from: '461', to: '500' },
            { label: 'To 2 decimal places', from: '3.147', to: '3.15' }
        ] },
        { title: "Let's start by rounding 67 to the nearest 10.", lines: ['67 sits between 60 and 70. Here it is on the number line.'], line: true, notes: {
            digit: 'The ones digit is 7. That is 5 or more, so round up.',
            nearest: 'So 67 is closer to 70.'
        } },
        { title: "Now let's round 342 to the nearest 10.", lines: ['342 sits between 340 and 350. Here it is on the number line.'], line: true, base: 340, value: 342, notes: {
            digit: 'The ones digit is 2. That is less than 5, so round down.',
            nearest: 'So 342 is closer to 340.'
        } },
        { title: "Let's round 48,672 to the nearest 100.", lines: ["We've been asked to round to the nearest 100, so first we find the digit that stands for hundreds. In 48,672 that's the 6, because it's worth 600."], number: '48672', kind: 'nearest', accuracy: 2, after: ["If that digit is 0, 1, 2, 3 or 4, we round down. If it's 5, 6, 7, 8 or 9, we round up. It's 7, so we round up."], digitNotes: {
            keep: "This 6 is worth 600. It's the hundreds digit.",
            look: "Now look at the digit just to its right. It's a 7."
        } },
        // Worked step by step: find the digit, put it on a line, look at the next digit, round.
        { title: "Let's put 48,672 on a number line to see why it rounds up.", lines: [], line: true, base: 48600, step: 10, value: 48672, labels: 'landmarks', steps: {
            find: 'Step 1: We are rounding to the nearest 100, so find the hundreds digit.',
            found: 'The hundreds digit is 6. So 48,672 is between 48,600 and 48,700.',
            place: 'Step 2: Put 48,672 on a number line from 48,600 to 48,700.'
        }, notes: {
            digit: 'Step 3: Look at the next digit. The tens digit is 7. That is 5 or more, so round up.',
            nearest: 'Step 4: So 48,672 rounds up to 48,700.'
        } },
        { title: "Now let's round 3.47 to 1 decimal place.", lines: ['1 decimal place means 1 digit after the decimal point. So 3.47 sits between 3.4 and 3.5. Here it is on the number line, counting in steps of 0.01.'], line: true, base: 3.4, step: 0.01, value: 3.47, tap: 'end', labels: 'landmarks', notes: {
            digit: 'The next digit is 7. That is 5 or more, so round up.',
            nearest: 'So 3.47 is closer to 3.5.'
        } },
        { title: 'When rounding carries', lines: ['To round 9.96 to 1 decimal place, keep the tenths digit, 9. The next digit is 6, so round up.', 'The extra 1 carries to the next column. Keep one digit after the point in the answer.'], number: '9.96', kind: 'decimal', accuracy: 1, equations: ['9.96 ≈ 10.0'] },
        { title: 'Rounding in a real situation', lines: ['A path is 248 metres long. Round its length to the nearest 10 metres.', 'The next digit is 8, so round up. Rounding does not change the unit: the length is still in metres.'], number: '248', kind: 'nearest', accuracy: 1, equations: ['248 metres ≈ 250 metres'] },
        {
            title: 'When you need enough of something, round up.',
            lines: [], base: 7, step: 0.1, value: 131 / 18, labels: 'landmarks', tap: 'end', answer: 8,
            context: {
                setup: 'Step 1: There are 131 helmets. Each rack holds 18. On a calculator, 131 ÷ 18 = 7.277…',
                valueLabel: '7.277…',
                question: 'How many racks do you need?',
                hint: '7 racks hold 7 × 18 = 126 helmets. That leaves 5 helmets with no rack.',
                steps: [
                    ['Step 2: 7 racks hold 126 helmets. 5 helmets have no rack.', 7],
                    ['Step 3: So you need 8 racks. 8 racks hold 144, so all 131 fit.', 8]
                ]
            },
            equations: ['8 racks'],
            caption: '7.277… would normally round to 7. Here you round up, because 7 racks are not enough.'
        },
        {
            title: 'When you can only pay for whole ones, round down.',
            lines: [], base: 6, step: 0.1, value: 12.50 / 1.85, labels: 'landmarks', tap: 'end', answer: 6,
            context: {
                setup: 'Step 1: A club has £12.50. Each trophy costs £1.85. On a calculator, 12.50 ÷ 1.85 = 6.756…',
                valueLabel: '6.756…',
                question: 'How many trophies can they buy?',
                hint: '7 trophies cost £12.95. That is more than £12.50.',
                steps: [
                    ['Step 2: 7 trophies cost £12.95. That is too much.', 7],
                    ['Step 3: So they can buy 6. 6 trophies cost £11.10.', 6]
                ]
            },
            equations: ['6 trophies'],
            caption: "6.756… would normally round to 7. Here you round down, because you can't pay for the 7th."
        },
        {
            title: "To find what's left, take away the full groups.",
            lines: [], base: 11, step: 0.1, value: 950 / 80, labels: 'landmarks', tap: 'end', answer: 11,
            context: {
                setup: 'Step 1: A roll has 9.5 m of cord, which is 950 cm. Cut it into 80 cm pieces. On a calculator, 950 ÷ 80 = 11.875',
                valueLabel: '11.875',
                question: 'How many full pieces can you cut?',
                hint: '12 pieces need 960 cm. There is only 950 cm.',
                steps: [
                    ['Step 2: 11 full pieces use 11 × 80 = 880 cm.', 11],
                    ['Step 3: 950 − 880 = 70 cm is left.']
                ]
            },
            equations: ['70 cm left']
        }
    ];
    function text(host, tag, value, className) {
        const node = document.createElement(tag);
        node.textContent = value;
        if (className) node.className = className;
        host.append(node);
        return node;
    }
    // A line that starts "Step 1:" shows the step name in bold.
    function stepText(host, tag, value, className) {
        const node = text(host, tag, '', className);
        const match = /^(Step \d+:)\s*(.*)$/.exec(value);
        if (!match) node.textContent = value;
        else {
            text(node, 'strong', match[1]);
            node.append(` ${match[2]}`);
        }
        return node;
    }
    // Step 1 of a worked example: the number, with the digit you round to
    // picked out and a note pointing at it.
    function drawFindDigit(host, value, step, steps) {
        stepText(host, 'p', steps.find);
        const block = text(host, 'div', '', 'rounding-notes rounding-find');
        const shown = value.toLocaleString('en-GB');
        const number = text(block, 'p', '', 'rounding-big-number');
        number.setAttribute('aria-label', shown);
        // The digit you round to is one place left of the digit that decides.
        let fromEnd = Math.round(Math.log10(step)) + 1;
        let target = null;
        for (let i = shown.length - 1; i >= 0; i--) {
            if (!/\d/.test(shown[i])) continue;
            if (fromEnd-- === 0) { target = i; break; }
        }
        [...shown].forEach((character, i) => {
            const span = text(number, 'span', character, i === target ? 'rounding-keep' : '');
            span.setAttribute('aria-hidden', 'true');
        });
        const note = text(block, 'p', steps.found, 'rounding-note rounding-note--found');
        drawArrows(block, [[note, () => number.querySelector('.rounding-keep')]]);
        stepText(host, 'p', steps.place);
    }
    function drawDigits(host, question, marks = 'both', onPick, { commas = true } = {}) {
        const { number } = question;
        const d = question;
        const row = document.createElement('div');
        row.className = 'significant-digits';
        row.setAttribute('role', onPick ? 'group' : 'img');
        row.setAttribute('aria-label', `Digits of ${spaced(number)}${marks === 'first' ? `; start at ${number[d.first]}` : marks === 'none' ? '' : `; keep ${digitLabel(number, d.target)}${marks === 'both' ? `; next digit ${digitLabel(number, d.decider)}` : ''}`}`);
        // Show the thousands commas (48,672) as the number lines do. A comma is
        // a separator, not a box, and it does not shift the digit positions.
        const shown = commas ? spaced(number) : String(number);
        let separators = 0;
        for (const [index, digit] of [...shown].entries()) {
            if (digit === ',') {
                separators++;
                text(row, 'span', ',', 'significant-comma');
                continue;
            }
            const key = index - separators;
            const isButton = onPick && digit !== '.';
            const cell = text(row, isButton ? 'button' : 'span', '', digit === '.' ? 'significant-point' : 'significant-digit');
            if (isButton) {
                cell.type = 'button';
                cell.setAttribute('aria-label', digitLabel(number, key));
                cell.addEventListener('click', () => onPick(key));
            } else {
                cell.setAttribute('aria-hidden', 'true');
            }
            text(cell, 'span', digit);
            if (marks === 'first' && key === d.first) {
                cell.classList.add('is-first');
                text(cell, 'small', 'Start');
            } else if (marks !== 'none' && marks !== 'first' && key === d.target) {
                cell.classList.add('is-keep');
                text(cell, 'small', 'Keep');
            } else if (marks === 'both' && key === d.decider) {
                cell.classList.add('is-look');
                text(cell, 'small', 'Look');
            }
        }
        host.append(row);
        return row;
    }
    // A number line from one round number (base) to the next, drawn like the
    // negative numbers line: a grey line, ten equal steps with a tick and a
    // number at each, and a blue dot on the number. step is 1 for the nearest
    // 10, 10 for the nearest 100 and 100 for the nearest 1000. With notes, one
    // note points at the digit that decides, one at the number it rounds to.
    function drawLine(host, value, explore, onChange, readOnly, base = 60, notes = null, step = 1, { onPick, onTap = null, wideLabels = false, labels = 'all', valueLabel, showNearest = true, showDot = true } = {}) {
        const format = number => number.toLocaleString('en-GB');
        // Wrap the digit that decides (the ones for step 1, the tens for step 10
        // and so on) so a note's arrow can point at it.
        const marked = number => {
            const shown = format(number);
            // With a step smaller than 1 (0.001), the digit that decides is the
            // last one shown, not a digit above the point.
            let fromEnd = Math.max(0, Math.round(Math.log10(step)));
            for (let i = shown.length - 1; i >= 0; i--) {
                if (!/\d/.test(shown[i])) continue;
                if (fromEnd-- === 0) return `${shown.slice(0, i)}<tspan class="rounding-decider">${shown[i]}</tspan>${shown.slice(i + 1)}`;
            }
            return shown;
        };
        const phone = window.matchMedia('(max-width: 600px)').matches;
        // A step of 0.001 leaves float noise (4.2749999999999995), so every tick
        // is snapped before it is labelled or used as a tap target.
        const tick = mark => Number((base + mark * step).toFixed(6));
        const top = tick(10);
        const edge = wideLabels ? 50 : 30;
        const x = number => edge + (number - base) / (10 * step) * (660 - 2 * edge);
        // A number between two ticks, or on a tick left unlabelled, has no label in the row, so its label sits
        // above the dot, and the line moves down to make room.
        const onTick = (value - base) % (labels === 'all' ? step : 5 * step) === 0;
        const axis = onTick ? 26 : (phone ? 58 : 50);
        const lineHost = notes ? text(host, 'div', '', 'rounding-notes') : host;
        const digitNote = notes && !onTick ? stepText(lineHost, 'p', notes.digit, 'rounding-note rounding-note--above') : null;
        const line = document.createElement('div');
        line.className = 'rounding-line';
        line.setAttribute('role', onPick || onTap ? 'group' : 'img');
        let picture = `<path class="rounding-axis" d="M 15 ${axis} H 645"/>`;
        for (let mark = 0; mark <= 10; mark++) {
            // The two round numbers and the halfway number between them stand out.
            const number = tick(mark);
            const landmark = mark % 5 === 0;
            const reach = landmark ? 12 : 7;
            const y = axis + (phone ? 44 : 40);
            const end = number === base || number === top;
            const label = `<text class="rounding-value${landmark ? ' is-landmark' : ''}${wideLabels && !landmark ? ' rounding-value--minor' : ''}" data-value="${number}" x="${x(number)}" y="${y}">${marked(number)}</text>`;
            picture += `<path class="rounding-tick${landmark ? ' is-landmark' : ''}" d="M ${x(number)} ${axis - reach} V ${axis + reach}"/>`;
            if (!landmark && labels !== 'all') continue;
            picture += onPick && end
                ? `<g role="button" tabindex="0" aria-label="${format(number)}" class="rounding-end" data-end="${number}">
                    <rect x="${x(number) - 44}" y="${y - 48}" width="88" height="80" rx="6"/>${label}
                </g>`
                : label;
        }
        if (showDot && !onTick) picture += `<text class="rounding-value is-key rounding-value--above" x="${x(value)}" y="${axis - (phone ? 24 : 20)}">${valueLabel ?? marked(value)}</text>`;
        if (showDot) picture += `<circle class="rounding-dot" cx="${x(value)}" cy="${axis}" r="${phone ? 12 : 9}"/>`;
        line.innerHTML = `<svg viewBox="0 0 660 ${axis + (phone ? 54 : 46)}" aria-hidden="${!(onPick || onTap)}">${picture}</svg>`;
        if (onPick) {
            for (const end of line.querySelectorAll('.rounding-end')) {
                const pick = () => onPick(Number(end.dataset.end));
                end.addEventListener('click', pick);
                end.addEventListener('keydown', event => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    pick();
                });
            }
        }
        if (onTap) {
            // A tap anywhere along the line: where it lands decides the number.
            line.querySelector('svg').addEventListener('click', event => {
                const box = event.currentTarget.getBoundingClientRect();
                const point = (event.clientX - box.left) / box.width * 660;
                onTap(base + (point - edge) / (660 - 2 * edge) * 10 * step);
            });
        }
        const dot = line.querySelector('.rounding-dot');
        const label = number => line.querySelector(`.rounding-value[data-value="${number}"]`);
        const nearest = number => number < base + 5 * step ? base : top;
        lineHost.append(line);
        const output = showNearest && !onPick ? text(host, 'p', '', 'significant-equation rounding-line-answer') : null;
        function update(number) {
            if (dot) dot.setAttribute('cx', x(number));
            line.querySelectorAll('.rounding-value[data-value]').forEach(item => item.classList.toggle('is-key', Number(item.dataset.value) === number));
            if (output) output.textContent = `${format(number)} ≈ ${format(nearest(number))}`;
            const description = `${valueLabel ?? format(number)} on a line from ${format(base)} to ${format(top)}`;
            line.setAttribute('aria-label', output
                ? `${description}; to the nearest ${format(10 * step)} it is ${format(nearest(number))}` : description);
        }
        update(value);
        if (notes) {
            const digit = digitNote || stepText(lineHost, 'p', notes.digit, 'rounding-note rounding-note--digit');
            const nearestNote = stepText(lineHost, 'p', notes.nearest, 'rounding-note rounding-note--nearest');
            const valueLabel = onTick ? () => label(value) : () => line.querySelector('.rounding-value--above');
            drawArrows(lineHost, [
                [digit, () => valueLabel().querySelector('.rounding-decider')],
                [nearestNote, () => label(nearest(value))]
            ]);
        }
        if (explore) {
            const sliderLabel = text(host, 'label', 'Move the number from 60 to 70.');
            sliderLabel.htmlFor = 'number-slider';
            const slider = document.createElement('input');
            Object.assign(slider, { id: 'number-slider', type: 'range', min: '60', max: '70', step: '1', value: String(value), disabled: readOnly });
            slider.setAttribute('aria-label', 'Number on the line');
            slider.addEventListener('input', () => {
                const number = Number(slider.value);
                onChange(number);
                update(number);
            });
            host.append(slider);
        }
        return line;
    }
    /* Hand-drawn arrows from each note to the thing it talks about, like the arrows
       in the place-value lesson. Each arrow leaves the right end of its note and comes
       in to its target from straight above or below. They are redrawn whenever the
       layout changes size. */
    function drawArrows(block, pairs) {
        const svgNs = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNs, 'svg');
        svg.setAttribute('class', 'rounding-notes__arrows');
        svg.setAttribute('aria-hidden', 'true');
        block.append(svg);
        function draw() {
            if (!block.isConnected) { observer.disconnect(); return; }
            const origin = block.getBoundingClientRect();
            svg.setAttribute('width', origin.width);
            svg.setAttribute('height', origin.height);
            svg.replaceChildren();
            for (const [note, findTarget, arrowSide] of pairs) {
                const target = findTarget();
                if (!target) continue;
                // Keep each note just left of what it points at, so its arrow
                // curves down onto the target instead of running in flat from
                // far away on a wide screen.
                // When there is no room on the left (a number near the start of
                // the line), the note sits to the right and its arrow leaves
                // from the note's left end instead.
                const targetBox = target.getBoundingClientRect();
                const targetX = targetBox.left + targetBox.width / 2 - origin.left;
                const left = arrowSide ? arrowSide === 'right' : targetX - note.offsetWidth - 48 >= 0;
                const lead = left
                    ? Math.min(targetX - note.offsetWidth - 48, origin.width - note.offsetWidth)
                    : Math.max(0, Math.min(targetX + 48, origin.width - note.offsetWidth));
                if (!arrowSide && note.style.marginLeft !== `${lead}px`) note.style.marginLeft = `${lead}px`;
                const from = note.getBoundingClientRect();
                const to = target.getBoundingClientRect();
                const down = to.top > from.top;
                const sx = (left ? from.right - origin.left + 8 : from.left - origin.left - 8), sy = from.top + from.height / 2 - origin.top;
                const tx = to.left + to.width / 2 - origin.left;
                const ty = (down ? to.top - 4 : to.bottom + 4) - origin.top;
                const tip = down ? -1 : 1;
                const path = document.createElementNS(svgNs, 'path');
                path.setAttribute('d', `M ${sx} ${sy} C ${sx + (tx - sx) * 0.55} ${sy + 3}, ${tx + 2} ${sy + (ty - sy) * 0.65}, ${tx} ${ty}`
                    + ` M ${tx - 6} ${ty + 9 * tip} L ${tx} ${ty} L ${tx + 6} ${ty + 8 * tip}`);
                svg.append(path);
            }
        }
        const observer = new ResizeObserver(() => draw());
        observer.observe(block);
        requestAnimationFrame(draw);
    }
    function drawRoundings(host, roundings) {
        const list = document.createElement('ul');
        list.className = 'rounding-examples';
        for (const item of roundings) {
            const card = document.createElement('li');
            card.className = 'rounding-example';
            card.setAttribute('aria-label', `${item.from} rounded ${item.label.toLowerCase()} is ${item.to}`);
            text(card, 'span', item.label, 'rounding-example__label');
            const sum = document.createElement('span');
            sum.className = 'rounding-example__sum';
            sum.setAttribute('aria-hidden', 'true');
            text(sum, 'span', item.from, 'rounding-example__from');
            text(sum, 'span', '≈', 'rounding-example__sign');
            text(sum, 'span', item.to, 'rounding-example__to');
            card.append(sum);
            list.append(card);
        }
        host.append(list);
    }
    function drawContextLine(host, screen, onPick) {
        const { context, value, base, step, labels } = screen;
        stepText(host, 'p', context.setup);
        if (onPick) text(host, 'p', context.question);
        const block = text(host, 'div', '', 'rounding-notes rounding-context');
        const line = drawLine(block, value, false, null, false, base, null, step, {
            onPick, wideLabels: true, labels, valueLabel: context.valueLabel, showNearest: false
        });
        if (onPick) return;
        const arrows = [];
        for (const [message, target] of context.steps) {
            const note = stepText(block, 'p', message, 'rounding-context__step');
            if (target !== undefined) {
                arrows.push([note, () => line.querySelector(`.rounding-value[data-value="${target}"]`), target === base ? 'left' : 'right']);
            }
        }
        drawArrows(block, arrows);
    }
    function drawLearnTap(host, screen, onResult) {
        if (screen.tap === 'end') {
            const answer = screen.answer ?? Number(rounded(String(screen.value), 'nearest', Math.log10(10 * screen.step)));
            const hint = screen.context?.hint ?? "Look at the digit after the one you're rounding to. Is it 5 or more?";
            const onPick = value => onResult(value === answer, hint);
            if (screen.context) drawContextLine(host, screen, onPick);
            else {
                text(host, 'p', `Tap the number ${screen.value.toLocaleString('en-GB')} is closer to.`);
                drawLine(host, screen.value, false, null, false, screen.base, null, screen.step, {
                    wideLabels: true, labels: screen.labels, onPick
                });
            }
            return;
        }
        const d = keyDigits(screen.number, screen.kind, screen.accuracy);
        const answer = d.decider;
        text(host, 'p', 'Tap the digit that decides.');
        drawDigits(host, { ...screen, ...d }, 'none', index => onResult(index === answer, 'Find the last digit you keep, then look one digit to the right.'));
    }

    function drawLearn(host, index, lineValue, onChange, readOnly) {
        const screen = learnScreens[index];
        if (screen.roundings) drawRoundings(host, screen.roundings);
        if (screen.steps) drawFindDigit(host, screen.value, screen.step, screen.steps);
        if (screen.context) drawContextLine(host, screen);
        else if (screen.line) drawLine(host, screen.explore ? lineValue : screen.value ?? 67, screen.explore, onChange, readOnly,
            screen.base, screen.notes, screen.step, { wideLabels: screen.tap === 'end', labels: screen.labels });
        else if (screen.number) {
            // A screen with notes gets a block, so the arrows can point from each
            // note up at the digit box it talks about.
            const block = screen.digitNotes ? text(host, 'div', '', 'rounding-notes rounding-digit') : host;
            const row = drawDigits(block, { ...screen, ...keyDigits(screen.number, screen.kind, screen.accuracy) }, screen.marks);
            if (screen.digitNotes) {
                const keep = text(block, 'p', screen.digitNotes.keep, 'rounding-note rounding-note--keep');
                const look = text(block, 'p', screen.digitNotes.look, 'rounding-note rounding-note--look');
                // Both notes sit at the left under the boxes and each arrow leaves
                // from the note's right end, so no arrow runs through text.
                drawArrows(block, [
                    [keep, () => row.querySelector('.significant-digit.is-keep'), 'right'],
                    [look, () => row.querySelector('.significant-digit.is-look'), 'right']
                ]);
            }
        }
        // A real-life answer sits in the small centred box, like the number-line answers.
        for (const equation of screen.equations || []) text(host, 'p', equation, screen.context ? 'significant-equation rounding-line-answer' : 'significant-equation');
        for (const line of screen.after || []) text(host, 'p', line);
        if (screen.caption) text(host, 'p', screen.caption);
    }
    window.Rounding = { roundToPower, rounded, accuracyText, keyDigits, place, digitLabel, roundingQuestion, checks, practiceTypes, pick, prepare, generate, tryIt, learnScreens, drawLearn, drawLearnTap, drawLine, drawSlide };
})();
