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
    function contextStep(questionType, prompt, answer, feedback, rules = [], figure) {
        return {
            stage: 'context', questionType, input: 'number', exact: false,
            prompt, answer, feedback, fallback: feedback,
            rules: rules.map(([value, message]) => ({ value, feedback: message })),
            ...(figure ? { figure } : {})
        };
    }

    /* Practice pictures. Each one is a small inline SVG in the question card:
       a footpath with a measuring arrow over it, and a pile of books beside one
       open box. Nothing in either picture gives the answer away. */
    /* The same card keeps the same picture function, so generating a question
       twice gives the same card. */
    const cardFigures = new Map();
    function cardFigure(key, build) {
        if (!cardFigures.has(key)) cardFigures.set(key, build());
        return cardFigures.get(key);
    }
    // A phone draws each picture for a narrow box, the same test drawLine uses,
    // instead of shrinking the wide one, so the picture fills the card.
    const narrowPicture = () => window.matchMedia('(max-width: 600px)').matches;

    function drawPathFigure(host, metres) {
        const label = `${Number(metres).toLocaleString('en-GB')} m`;
        const narrow = narrowPicture();
        const width = narrow ? 360 : 660;
        const from = narrow ? 12 : 16;
        const to = width - from;
        const middle = width / 2;
        const curve = narrow
            ? 'M 12 88 C 70 60, 116 116, 180 88 S 292 58, 348 88'
            : 'M 16 92 C 118 64, 192 120, 300 92 S 468 60, 644 92';
        // Small darker green tufts on the grass.
        const tufts = narrow
            ? [[26, 26], [70, 104], [128, 24], [222, 108], [286, 26], [332, 100]]
            : [[58, 30], [132, 104], [204, 26], [318, 110], [402, 24], [468, 106], [552, 28], [614, 102]];
        host.innerHTML = `<svg class="rounding-picture" viewBox="0 0 ${width} 150" role="img" aria-label="A path ${label} long">
            <rect class="rounding-picture__grass" x="0" y="8" width="${width}" height="108" rx="14"/>
            ${tufts.map(([cx, cy]) => `<circle class="rounding-picture__tuft" cx="${cx}" cy="${cy}" r="4"/>`).join('')}
            <path class="rounding-picture__path-edge" d="${curve}"/>
            <path class="rounding-picture__path-paving" d="${curve}"/>
            <path class="rounding-picture__measure" d="M ${from} 30 H ${to} M ${from} 22 V 38 M ${to} 22 V 38"/>
            <path class="rounding-picture__measure" d="M ${from + 14} 24 L ${from} 30 L ${from + 14} 36 M ${to - 14} 24 L ${to} 30 L ${to - 14} 36"/>
            <text class="rounding-picture__label rounding-picture__label--gap" x="${middle}" y="30" text-anchor="middle" dominant-baseline="middle">${label}</text>
        </svg>`;
    }

        function drawBooksFigure(host, total, size) {
        const books = total.toLocaleString('en-GB');
        const holds = `${size} books`;
        const narrow = narrowPicture();
        const width = narrow ? 360 : 660;
        // Seven books, flat and slightly offset, in soft colours with a darker edge.
        const colours = [
            ['#d9e7f7', '#7f9dc0'], ['#f7e0c8', '#c49b72'], ['#d9ecdc', '#82a88e'],
            ['#f2d8e2', '#b98ba6'], ['#e6ddf6', '#9a8ac0'], ['#fae8b6', '#c2a257'],
            ['#d7e8f0', '#85a6b7']
        ];
        const stackWidth = narrow ? 92 : 128;
        const stackX = narrow ? 12 : 46;
        const stack = colours.map(([fill, edge], index) => {
            const x = stackX + (index % 2 === 0 ? -5 : 5);
            const y = 125 - (index + 1) * 17;
            return `<rect class="rounding-picture__book" x="${x}" y="${y}" width="${stackWidth}" height="15" rx="5" fill="${fill}" stroke="${edge}"/>`;
        }).join('');
        // One open box, drawn in 3D: inside back, three flaps, front, right side, tape.
        const box = narrow
            ? {
                inside: '186,68 202,54 312,54 296,68', back: '202,54 312,54 324,36 214,36',
                left: '186,68 202,54 182,46 166,60', right: '296,68 312,54 332,48 316,62',
                front: [186, 68, 110, 54], side: '296,68 312,54 312,106 296,122', tape: [236, 74, 10, 34],
                booksLabel: 56, boxLabel: 241
            }
            : {
                inside: '418,68 440,52 580,52 558,68', back: '440,52 580,52 594,32 454,32',
                left: '418,68 440,52 416,42 394,58', right: '558,68 580,52 604,44 582,60',
                front: [418, 68, 140, 54], side: '558,68 580,52 580,106 558,122', tape: [482, 74, 12, 34],
                booksLabel: 105, boxLabel: 500
            };
        host.innerHTML = `<svg class="rounding-picture" viewBox="0 0 ${width} 150" role="img" aria-label="A pile of ${books} books and one box that holds ${holds}">
            ${stack}
            <polygon class="rounding-picture__box" fill="#92400e" points="${box.inside}"/>
            <polygon class="rounding-picture__box" fill="#e4b77e" points="${box.back}"/>
            <polygon class="rounding-picture__box" fill="#d6a565" points="${box.left}"/>
            <polygon class="rounding-picture__box" fill="#e4b77e" points="${box.right}"/>
            <rect class="rounding-picture__box" fill="#d6a565" x="${box.front[0]}" y="${box.front[1]}" width="${box.front[2]}" height="${box.front[3]}" rx="2"/>
            <polygon class="rounding-picture__box" fill="#b8844a" points="${box.side}"/>
            <rect class="rounding-picture__tape" x="${box.tape[0]}" y="${box.tape[1]}" width="${box.tape[2]}" height="${box.tape[3]}"/>
            <text class="rounding-picture__label" x="${box.booksLabel}" y="144" text-anchor="middle">${books} books</text>
            <text class="rounding-picture__label" x="${box.boxLabel}" y="144" text-anchor="middle">Holds ${holds}</text>
        </svg>`;
    }

    // Try it: hands-on slides. On the first the pupil taps the hundreds digit;
    // on the second, the half of the number line the number goes in. The
    // words below are the words on screen; the tests and the slides tool read
    // them from here.
    const tryIt = {
        slides: [
            {
                title: 'Round 53,481 to the nearest 100.',
                digits: '53481', accuracy: 2,
                tap: 'Tap the hundreds digit.',
                tapHint: 'The hundreds digit is the third from the right.',
                // After the right tap, two notes with arrows explain Round and Decides.
                digitNotes: {
                    keep: 'Round: the 4 is the hundreds digit. This is the digit we round (up or down).',
                    look: 'Decides: the 8 is 5 or more, so the 4 rounds up to 5.'
                },
                button: 'Next'
            },
            {
                title: "Let's put 53,481 on a number line.",
                place: 'Tap which half of the line 53,481 goes on?',
                placeHint: 'The halfway point is 53,450. 53,481 is more than that.',
                line: { base: 53400, step: 10, value: 53481 },
                notes: {
                    digit: '53,481 is past the halfway mark, 53,450, so it rounds up.',
                    nearest: 'So 53,481 is closer to 53,500.'
                },
                answer: '53,481 ≈ 53,500',
                button: 'Continue'
            }
        ]
    };

    /* The five digit cards, in one row, with no comma card between
       them. Taps only count while the pupil is still choosing. */
    function drawSlideDigits(host, slide, answered, onPick) {
        const digits = keyDigits(slide.digits, 'nearest', slide.accuracy);
        return drawDigits(host, { number: slide.digits, ...digits }, answered ? 'both' : 'none',
            answered ? null : index => onPick(index === digits.target), { commas: false });
    }

    /* The digit slide: tap the hundreds digit. Then the cards show which digit
       to keep and which to look at, and a note with an arrow explains each. */
    function drawDigitSlide(host, slide, saved, handlers) {
        text(host, 'p', slide.tap);
        const block = text(host, 'div', '', 'rounding-notes rounding-tryit rounding-digit');
        const row = drawSlideDigits(block, slide, saved.tapped, handlers.onDigit);
        if (!saved.tapped) return;
        const keep = text(block, 'p', slide.digitNotes.keep, 'rounding-note rounding-note--keep');
        const look = text(block, 'p', slide.digitNotes.look, 'rounding-note rounding-note--look');
        drawArrows(block, [
            [keep, () => row.querySelector('.significant-digit.is-keep'), 'right'],
            [look, () => row.querySelector('.significant-digit.is-look'), 'right']
        ]);
    }

    /* The line slide: tap the half of the line the number goes in. Then the dot
       goes on the line, and two notes say why it rounds the way it does. */
    function drawLineSlide(host, slide, saved, handlers) {
        const { base, step, value } = slide.line;
        const block = text(host, 'div', '', 'rounding-tryit');
        if (!saved.dot) {
            text(block, 'p', slide.place);
            drawLine(block, value, false, null, false, base, null, step, {
                wideLabels: true, labels: 'landmarks', showNearest: false, showDot: false,
                halves: true, onHalf: upper => handlers.onHalf(upper === (value >= base + 5 * step))
            });
            return;
        }
        drawLine(block, value, false, null, false, base, slide.notes, step, {
            wideLabels: true, labels: 'landmarks', showNearest: false, halves: true
        });
        text(host, 'p', slide.answer, 'significant-equation');
    }

    function drawSlide(host, slide, saved, handlers) {
        if (slide.digits) return drawDigitSlide(host, slide, saved, handlers);
        return drawLineSlide(host, slide, saved, handlers);
    }

    function checks() {
        return [
            roundingQuestion('2748', 'nearest', 2, 'choice', 'context', 'A stadium has 2,748 spectators. Round this to the nearest 100.'),
            { questionType: 'method', input: 'choice', prompt: 'Which steps, in the right order, round a number to the nearest 100?', options: [
                option('1. Find the hundreds digit. 2. Look at the digit to its right. 3. If that digit is 5 or more, round up. If not, round down.', 'Find the digit you are rounding to. The digit to its right decides.', true),
                option('1. Look at the last digit. 2. If it is 5 or more, round up. If not, round down.', 'The last digit is the ones. For the nearest 100, look at the digit just right of the hundreds digit.'),
                option('1. Find the hundreds digit. 2. If the hundreds digit is 5 or more, round up. If not, round down.', 'The hundreds digit does not decide. The digit to its right does.'),
                option('1. Round to the nearest 10. 2. Round that answer to the nearest 100.', 'Round the original number in one go. Rounding twice can give the wrong answer.')
            ] },
            roundingQuestion('2681450', 'nearest', 6, 'choice')
        ];
    }
    /* Practice starts with two number-line questions: tap the end of the line
       the number is closest to, once for the nearest 10 and once for the
       nearest 100. The engine's custom card draws, saves and marks it. */
    function linePickWidget(base, step, value, answer, feedback) {
        const format = number => number.toLocaleString('en-GB');
        return {
            render(host, { value: saved, editable, onChange }) {
                let chosen = saved;
                function draw() {
                    host.replaceChildren();
                    // The line is drawn in its own 660-wide units, so sizes are
                    // given in screen pixels and turned into those units.
                    const narrow = narrowPicture();
                    const scale = (host.clientWidth || 660) / 660;
                    // Sizes are given in screen pixels and turned into the line's
                    // drawing units: each end is about 64 x 52 on a computer and
                    // at least 44 x 44 on a phone.
                    const px = size => size / scale;
                    const boxWidth = px(narrow ? 46 : 64);
                    const boxHeight = px(narrow ? 46 : 52);
                    const labelSize = px(narrow ? 15 : 18);
                    // Keep each end fully inside the card, with its own margin.
                    const endMargin = px(narrow ? 26 : 10) + boxWidth / 2;
                    const line = drawLine(host, value, false, null, !editable, base, null, step, {
                        onPick: pick, wideLabels: true, showNearest: false,
                        valueLabel: format(value), numberAbove: true, edgeMargin: endMargin, axisToEnds: true
                    });
                    line.classList.add('rounding-line--pick');
                    // The number above the dot reads at least 14 px on a phone too.
                    const above = line.querySelector('.rounding-value--above');
                    if (above) above.style.fontSize = `${labelSize.toFixed(1)}px`;
                    // Each box hangs under its own tick, round the end number, so
                    // the line and both end ticks stay in view. The picture is made
                    // taller so the boxes are not cut off.
                    const svg = line.querySelector('svg');
                    const dot = line.querySelector('.rounding-dot');
                    const axis = dot ? Number(dot.getAttribute('cy')) : 0;
                    const boxTop = axis + px(14);
                    for (const end of line.querySelectorAll('.rounding-end')) {
                        const rect = end.querySelector('rect');
                        const label = end.querySelector('.rounding-value');
                        const centre = Number(rect.getAttribute('x')) + Number(rect.getAttribute('width')) / 2;
                        rect.setAttribute('x', String(centre - boxWidth / 2));
                        rect.setAttribute('y', String(boxTop));
                        rect.setAttribute('width', String(boxWidth));
                        rect.setAttribute('height', String(boxHeight));
                        rect.setAttribute('rx', String(px(10)));
                        label.style.fontSize = `${labelSize.toFixed(1)}px`;
                        label.setAttribute('y', String(boxTop + boxHeight / 2 + labelSize * 0.35));
                        if (Number(end.dataset.end) === chosen) end.classList.add('is-selected');
                        if (editable) continue;
                        // Once it is marked the ends still show the choice, but
                        // nothing on the line is tappable any more.
                        end.removeAttribute('tabindex');
                        end.removeAttribute('role');
                        line.classList.add('is-fixed');
                    }
                    const [,, width, height] = svg.getAttribute('viewBox').split(' ').map(Number);
                    const bottom = boxTop + boxHeight + px(8);
                    if (bottom > height) svg.setAttribute('viewBox', `0 0 ${width} ${Math.round(bottom)}`);
                }
                function pick(number) {
                    if (!editable) return;
                    chosen = number;
                    onChange(number);
                    draw();
                }
                draw();
                return {
                    update({ value: next, editable: editableNow }) {
                        chosen = next;
                        editable = editableNow;
                        draw();
                    }
                };
            },
            isEmpty(chosen) { return chosen === null || chosen === undefined; },
            mark(chosen) { return { correct: Number(chosen) === answer, feedback }; },
            answerText(chosen) { return chosen === null || chosen === undefined ? '' : format(Number(chosen)); }
        };
    }

    function linePickQuestion(place, integer) {
        const step = place === 1 ? 1 : 10;
        const span = 10 * step;
        const base = place === 1 ? integer(1, 9) * 10 : integer(1, 9) * 100;
        // Never on an end, never the halfway number, and for the nearest 100
        // never on a tick either: its ones digit is 1 to 9.
        let offset = integer(1, span - 1);
        if (place === 1) {
            while (offset === 5) offset = integer(1, 9);
        } else {
            while (offset === 50 || offset % 10 === 0) offset = integer(1, span - 1);
        }
        const format = number => number.toLocaleString('en-GB');
        const value = base + offset;
        const halfway = base + 5 * step;
        const answer = value < halfway ? base : base + span;
        const side = value > halfway ? 'past' : 'before';
        const feedback = `${format(value)} is ${side} the halfway mark, ${format(halfway)}, so it is closer to ${format(answer)}.`;
        return {
            questionType: 'line-pick', input: 'custom', base, step, value, answer,
            prompt: `Tap the number ${format(value)} is closest to.`,
            feedback,
            widget: cardFigure(`line-pick:${base}:${value}`, () => linePickWidget(base, step, value, answer, feedback))
        };
    }

    const practiceGroups = [
        { kind: 'place', types: ['nearest-ten', 'halfway-hundred', 'big-hundred'] },
        { kind: 'place', types: ['nearest-thousand', 'big-thousand'] },
        { kind: 'context', types: ['round-up'] },
        { kind: 'context', types: ['full-groups', 'path-context'] }
    ];
    const practiceTypes = [...practiceGroups.flatMap(group => group.types), 'line-pick'];

    function pick(random) {
        const { randomInt, shuffle } = window.Maths1to9LessonEngine;
        // The session opens with the two number-line questions: nearest 10,
        // then nearest 100.
        const linePicks = [1, 2].map(place => ({
            type: 'line-pick', place, mode: 'custom', seed: randomInt(0, 4294967295, random)
        }));
        // Three cards from each whole-number group and two from each real-life
        // group keeps it at 10 questions, so both come up in every session.
        const picks = practiceGroups.flatMap(group => (group.kind === 'place' ? [0, 1, 2] : [0, 1]).map(() => ({
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
            // The minibus and box questions (round up) are always multiple choice.
            return [...linePicks, ...ordered.map(({ type }, index) => ({
                type,
                mode: type === 'round-up' || placeChoice === (modes[index] === 'choice') ? 'choice' : 'number',
                seed: randomInt(0, 4294967295, random)
            }))];
        }
        throw new Error('Could not lay out a practice session.');
    }
    function prepare(question, random) {
        return question.options ? { ...question, options: window.Maths1to9LessonEngine.shuffle(question.options, random) } : { ...question };
    }
    function practiceContext(item, prompt, answer, feedback, mistakes, random, figure) {
        const seen = new Set([answer]);
        const rules = mistakes.filter(([value]) => {
            if (seen.has(value)) return false;
            seen.add(value);
            return true;
        });
        if (item.mode === 'choice' && rules.length >= 3) {
            return prepare({
                questionType: item.type, input: 'choice', prompt,
                options: [option(spaced(answer), feedback, true),
                    ...rules.slice(0, 3).map(([value, message]) => option(spaced(value), message))],
                ...(figure ? { figure } : {})
            }, random);
        }
        return contextStep(item.type, prompt, String(answer), feedback,
            rules.map(([value, message]) => [String(value), message]), figure);
    }


    function divisionText(total, size) {
        const scaled = total * 1000;
        const truncated = Math.floor(scaled / size) / 1000;
        return `${truncated}${scaled % size ? '…' : '.'}`;
    }

    function generateSituation(item, integer, random) {
        const roundUp = item.type === 'round-up';
        const size = roundUp ? integer(12, 30) : integer(6, 12);
        const max = roundUp ? 300 : 200;
        let total = integer(roundUp ? 100 : 40, max);
        if (total % size === 0) total += total === max ? -1 : 1;
        // A round-up question is always multiple choice, so pick numbers whose
        // real mistakes give at least three different wrong answers.
        const wrongAnswers = count => {
            const low = Math.floor(count / size);
            const nearest = Math.round(count / size);
            return new Set([low, nearest === low + 1 ? low - 1 : nearest, Math.round(count / size * 10) / 10, count % size]
                .filter(value => value !== low + 1)).size;
        };
        while (roundUp && (total % size === 0 || wrongAnswers(total) < 3)) total = integer(100, max);
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
                    [roundedQuotient, `You can't have part of a ${unit}. Give a whole number.`],
                    // Used when rounding to the nearest gives the same wrong answer as one too few.
                    [total % size, `That is how many ${contents} are left over, not the number of ${units}.`]
                ], random, books ? cardFigure(`books:${total}:${size}`, () => host => drawBooksFigure(host, total, size)) : undefined);
        }

        return practiceContext(item,
            `${total} stickers are packed into packets of ${size}. ${working} How many full packets can be made?`,
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
        case 'two-decimals': number = `${integer(1, 8)}.${integer(1, 9)}${integer(0, 9)}${integer(1, 9)}`; kind = 'decimal'; accuracy = 2; break;
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
        case 'full-groups':
            return generateSituation(item, integer, random);
        case 'line-pick':
            return linePickQuestion(item.place === 2 ? 2 : 1, integer);
        case 'path-context':
            number = String(nonZeroEnd(integer(111, 989))); kind = 'nearest'; accuracy = 1;
            customPrompt = `A path is ${number} metres long. Round its length to the nearest 10 metres.${item.mode === 'choice' ? '' : ' Type the number of metres.'}`;
            break;
        default: throw new Error(`Unknown rounding type: ${item.type}`);
        }
        // The path question gets the footpath picture, for both its answers.
        const pictured = question => item.type === 'path-context'
            ? { ...question, figure: cardFigure(`path:${number}`, () => host => drawPathFigure(host, number)) }
            : question;
        const question = pictured(roundingQuestion(number, kind, accuracy, item.mode || 'number', item.type, customPrompt));
        if (question.input === 'choice' && question.options.length < 4) {
            return pictured(roundingQuestion(number, kind, accuracy, 'number', item.type, customPrompt));
        }
        return prepare(question, random);
    }
    const learnScreens = [
        { title: 'Rounding means finding a simpler number that is close to the one you have.', lines: ['The ≈ sign means "is about".', "For example, if your friend lives 38 miles away, you might just say it's about 40 miles."], roundings: [
            { label: 'To the nearest 10', from: '38', to: '40' },
            { label: 'To the nearest 100', from: '461', to: '500' }
        ] },
        { title: 'We round to make numbers easier to use.', lines: [
            'A rounded number is easier to say and remember. A news report might say about 53,500 fans, not 53,481.',
            'Rounding also helps you estimate. Round each number first, and the sum is easy to do in your head. It is a quick way to check a calculator answer.'
        ], roundings: [
            { label: 'Easier to say', from: '53,481', to: '53,500' },
            { label: 'Easier to estimate', from: '48 × 21', to: '50 × 20 = 1,000' }
        ] },
        { title: "Let's start by rounding 67 to the nearest 10.", lines: ['67 sits between 60 and 70. Here it is on the number line.'], line: true, notes: {
            digit: 'The ones digit is 7. That is 5 or more, so round up.',
            nearest: 'So 67 is closer to 70.'
        } },
        { title: "Now let's round 342 to the nearest 10.", lines: ['342 sits between 340 and 350. Here it is on the number line.'], line: true, base: 340, value: 342, notes: {
            digit: 'The ones digit is 2. That is less than 5, so round down.',
            nearest: 'So 342 is closer to 340.'
        } },
        { title: "Let's round 48,672 to the nearest 100.", lines: ['First we find the digit that stands for hundreds.'], number: '48672', kind: 'nearest', accuracy: 2, after: ["If that digit is 0, 1, 2, 3 or 4, we round down. If it's 5, 6, 7, 8 or 9, we round up. It's 7, so we round up."], digitNotes: {
            keep: "This 6 is worth 600. It's the hundreds digit.",
            look: "Now look at the digit just to its right. It's a 7."
        } }
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
                text(cell, 'small', 'Round');
            } else if (marks === 'both' && key === d.decider) {
                cell.classList.add('is-look');
                text(cell, 'small', 'Decides');
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
    function drawLine(host, value, explore, onChange, readOnly, base = 60, notes = null, step = 1, { onPick, halves = false, onHalf = null, wideLabels = false, labels = 'all', valueLabel, showNearest = true, showDot = true, edgeMargin = null, numberAbove = false, axisToEnds = false } = {}) {
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
        // edgeMargin is only for the Practice line-pick, which needs its tapped
        // ends fully inside the card; Learn and Try it keep the usual margin.
        const edge = edgeMargin ?? (wideLabels ? 50 : 30);
        const x = number => edge + (number - base) / (10 * step) * (660 - 2 * edge);
        // A number between two ticks, or on a tick left unlabelled, has no label in the row, so its label sits
        // above the dot, and the line moves down to make room.
        const onTick = (value - base) % (labels === 'all' ? step : 5 * step) === 0;
        const axis = onTick ? 26 : (phone ? 58 : 50);
        const lineHost = notes ? text(host, 'div', '', 'rounding-notes') : host;
        const digitNote = notes && !onTick ? stepText(lineHost, 'p', notes.digit, 'rounding-note rounding-note--above') : null;
        const line = document.createElement('div');
        line.className = 'rounding-line';
        line.setAttribute('role', onPick || onHalf ? 'group' : 'img');
        let picture = '';
        if (halves) {
            // Two coloured boxes, one round each half of the line, meeting at halfway.
            // While the pupil is choosing, each box is a button.
            const middle = x(tick(5));
            const box = (from, to, side, name) => {
                const shape = `<rect class="rounding-half rounding-half--${side}" x="${from}" y="${axis - 24}" width="${to - from}" height="48" rx="8"/>`;
                return onHalf
                    ? `<g role="button" tabindex="0" aria-label="${name}" class="rounding-half-button" data-half="${side}">${shape}</g>`
                    : shape;
            };
            picture += box(x(base) - 18, middle - 3, 'lower', `The half from ${format(base)} to ${format(tick(5))}`);
            picture += box(middle + 3, x(top) + 18, 'upper', `The half from ${format(tick(5))} to ${format(top)}`);
        }
        // axisToEnds is only for the Practice line-pick: its line starts at the
        // first end tick and stops at the last, so it never runs on past the ends.
        const axisFrom = axisToEnds ? x(base) : 15;
        const axisTo = axisToEnds ? x(top) : 645;
        picture += `<path class="rounding-axis" d="M ${axisFrom} ${axis} H ${axisTo}"/>`;
        for (let mark = 0; mark <= 10; mark++) {
            // The two round numbers and the halfway number between them stand out.
            const number = tick(mark);
            const landmark = mark % 5 === 0;
            const reach = landmark ? 12 : 7;
            const y = axis + (phone ? 44 : 40);
            const end = number === base || number === top;
            const label = `<text class="rounding-value${landmark ? ' is-landmark' : ''}${wideLabels && !landmark ? ' rounding-value--minor' : ''}" data-value="${number}" x="${x(number)}" y="${y}">${marked(number)}</text>`;
            picture += `<path class="rounding-tick${landmark ? ' is-landmark' : ''}" d="M ${x(number)} ${axis - reach} V ${axis + reach}"/>`;
            // The Practice line-pick names the number above its dot, so it is not
            // repeated in the row of numbers under the line.
            if (numberAbove && number === value) continue;
            if (!landmark && labels !== 'all') continue;
            picture += onPick && end
                ? `<g role="button" tabindex="0" aria-label="${format(number)}" class="rounding-end" data-end="${number}">
                    <rect x="${x(number) - 44}" y="${y - 48}" width="88" height="80" rx="6"/>${label}
                </g>`
                : label;
        }
        // A number on a tick is labelled in the row, so it is only labelled
        // above the dot when the caller asks for it (the Practice line-pick).
        if (showDot && (!onTick || numberAbove)) picture += `<text class="rounding-value is-key rounding-value--above" x="${x(value)}" y="${axis - (phone ? 24 : 20)}">${valueLabel ?? marked(value)}</text>`;
        if (showDot) picture += `<circle class="rounding-dot" cx="${x(value)}" cy="${axis}" r="${phone ? 12 : 9}"/>`;
        line.innerHTML = `<svg viewBox="0 0 660 ${axis + (phone ? 54 : 46)}" aria-hidden="${!(onPick || onHalf)}">${picture}</svg>`;
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
        if (onHalf) {
            for (const half of line.querySelectorAll('.rounding-half-button')) {
                const pick = () => onHalf(half.dataset.half === 'upper');
                half.addEventListener('click', pick);
                half.addEventListener('keydown', event => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    pick();
                });
            }
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
            // Drag the dot along the line (mouse or finger), or use the ← and →
            // buttons under it, or the arrow keys. It snaps to whole steps.
            let current = value;
            const svg = line.querySelector('svg');
            const move = number => {
                number = Math.max(base, Math.min(top, number));
                if (readOnly || number === current) return;
                current = number;
                onChange(number);
                update(number);
                paintControls();
            };
            const numberAt = clientX => {
                const box = svg.getBoundingClientRect();
                const point = (clientX - box.left) / box.width * 660;
                return tick(Math.round((point - edge) / (660 - 2 * edge) * 10));
            };
            line.classList.add('rounding-line--drag');
            line.setAttribute('role', 'slider');
            line.tabIndex = readOnly ? -1 : 0;
            line.setAttribute('aria-valuemin', String(base));
            line.setAttribute('aria-valuemax', String(top));
            svg.addEventListener('pointerdown', event => {
                if (readOnly || event.button !== 0) return;
                svg.setPointerCapture(event.pointerId);
                line.classList.add('is-dragging');
                move(numberAt(event.clientX));
                const drag = moveEvent => move(numberAt(moveEvent.clientX));
                const end = () => {
                    line.classList.remove('is-dragging');
                    svg.removeEventListener('pointermove', drag);
                    svg.removeEventListener('pointerup', end);
                    svg.removeEventListener('pointercancel', end);
                };
                svg.addEventListener('pointermove', drag);
                svg.addEventListener('pointerup', end);
                svg.addEventListener('pointercancel', end);
            });
            line.addEventListener('keydown', event => {
                if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') move(tick((current - base) / step - 1));
                else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') move(tick((current - base) / step + 1));
                else return;
                event.preventDefault();
            });
            // The buttons sit straight under the line, above the rounded answer.
            const controls = document.createElement('div');
            controls.className = 'rounding-line-controls';
            line.after(controls);
            const moveButton = (arrow, name, change) => {
                const button = text(controls, 'button', arrow, 'rounding-line-move');
                button.type = 'button';
                button.setAttribute('aria-label', name);
                button.addEventListener('click', () => move(tick((current - base) / step + change)));
                return button;
            };
            const down = moveButton('←', 'Move the number down', -1);
            const up = moveButton('→', 'Move the number up', 1);
            function paintControls() {
                line.setAttribute('aria-valuenow', String(current));
                down.disabled = readOnly || current <= base;
                up.disabled = readOnly || current >= top;
            }
            paintControls();
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
