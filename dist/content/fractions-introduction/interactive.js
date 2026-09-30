(() => {
    'use strict';

    /*
     * Must match "slug" in lesson.json.
     */
    const SLUG = 'fractions-introduction';
    window.Maths1to9Interactives ??= {};

    /*
     * Section gating. gateSection() locks the lesson's "Next"
     * button while the pupil is on that section;
     * completeSection() unlocks it. Duplicate events are
     * ignored by the engine, so both are safe on every render.
     */
    function gateSection(sectionId) {
        document.dispatchEvent(new CustomEvent('maths1to9:section-gate', {
            detail: { sectionId }
        }));
    }

    function completeSection(sectionId) {
        document.dispatchEvent(new CustomEvent('maths1to9:section-complete', {
            detail: { sectionId }
        }));
    }

    function injectStyles() {
        if (document.getElementById('fractions-introduction-styles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'fractions-introduction-styles';
        style.textContent = `
            .fraction {
                display: inline-grid;
                grid-template-rows: auto auto;
                min-width: 1.4em;
                vertical-align: middle;
                color: inherit;
                font-weight: 800;
                line-height: 1;
                text-align: center;
            }

            .fraction__top {
                padding: 0 .18em .12em;
                border-bottom: 2px solid currentColor;
            }

            .fraction__bottom {
                padding: .12em .18em 0;
            }

            .fi-card,
            .fi-try {
                width: 100%;
            }

            .fi-card h3,
            .fi-try h3 {
                margin-top: 0;
            }

            .fi-card__lead {
                max-width: 62ch;
            }

            .fi-visual-row {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                align-items: flex-end;
                gap: clamp(16px, 4vw, 40px);
                margin: 26px 0;
            }

            .fi-visual {
                margin: 0;
                text-align: center;
            }

            .fi-visual__label {
                margin-bottom: 10px;
                font-size: clamp(1.3rem, 2.4vw, 1.8rem);
            }

            .fi-visual figcaption {
                max-width: 32ch;
                margin: 10px auto 0;
                color: #64748b;
                font-size: .95rem;
                line-height: 1.45;
            }

            .fi-svg {
                display: block;
                width: 100%;
                height: auto;
                margin-inline: auto;
                overflow: visible;
            }

            .fi-cell,
            .fi-outline,
            .fi-slice {
                vector-effect: non-scaling-stroke;
            }

            .fi-rule,
            .fi-takeaway {
                margin-top: 20px;
                padding: 16px 18px;
                border: 1px solid #cbd5e1;
                border-radius: 12px;
                background: #f8fafc;
                line-height: 1.55;
            }

            .fi-takeaway {
                font-weight: 700;
            }

            .fi-choice-row {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                margin-top: 22px;
            }

            .fi-choice-row .answer-choice {
                flex: 1 1 150px;
            }

            .fi-feedback {
                min-height: 1.6em;
                margin-top: 16px;
                line-height: 1.5;
            }

            .fi-feedback.is-correct {
                color: #166534;
            }

            .fi-feedback.is-incorrect {
                color: #9f1239;
            }

            .fi-learn__progress {
                display: flex;
                justify-content: center;
                gap: 8px;
                margin-bottom: 18px;
            }

            .fi-learn__dot {
                width: 9px;
                height: 9px;
                border-radius: 999px;
                background: #d7dee8;
            }

            .fi-learn__dot.is-active {
                background: #2563eb;
            }

            .fi-local-nav {
                display: grid;
                grid-template-columns: minmax(70px, auto) 44px;
                justify-content: center;
                align-items: center;
                gap: 12px;
                margin-top: 22px;
            }

            .fi-local-nav__label {
                color: #64748b;
                font-size: .9rem;
                font-weight: 700;
                text-align: center;
            }

            .fi-nav-button {
                display: inline-grid;
                width: 44px;
                height: 44px;
                padding: 0;
                place-items: center;
                border: 1px solid #cbd5e1;
                border-radius: 999px;
                background: #ffffff;
                color: #1f2937;
                cursor: pointer;
                font: inherit;
                font-size: 1.8rem;
                line-height: 1;
            }

            .fi-nav-button:hover:not(:disabled),
            .fi-nav-button:focus-visible {
                border-color: #2563eb;
                color: #2563eb;
                outline: none;
                box-shadow: 0 0 0 3px rgba(37, 99, 235, .14);
            }

            .fi-nav-button:disabled {
                cursor: not-allowed;
                opacity: .32;
            }

            .fi-try-complete {
                display: inline-block;
                margin-top: 14px;
                color: #166534;
                font-weight: 800;
            }

            .fi-legend {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                gap: 18px;
                margin-top: 8px;
                color: #475569;
                font-size: .95rem;
            }

            .fi-legend span {
                display: inline-flex;
                align-items: center;
                gap: 8px;
            }

            .fi-swatch {
                display: inline-block;
                width: 16px;
                height: 16px;
                border: 2px solid #1f2937;
                border-radius: 4px;
            }

            .fi-swatch--num {
                background: #62c5bc;
            }

            .fi-swatch--den {
                background: #ffffff;
            }
        `;

        document.head.append(style);
    }

    function fractionHtml(numerator, denominator, whole) {
        const stack = (
            '<span class="fraction">'
            + `<span class="fraction__top">${numerator}</span>`
            + `<span class="fraction__bottom">${denominator}</span>`
            + '</span>'
        );

        if (whole === undefined || whole === null || whole === 0) {
            return stack;
        }

        return `<span class="fraction-mixed"><strong>${whole}</strong> ${stack}</span>`;
    }

    /*
     * A row of one or more equal bars. denominator cells per
     * bar; numerator cells are shaded, spilling onto a second
     * or third bar when the fraction is improper.
     */
    function barSvg(numerator, denominator, options) {
        const opts = options || {};
        const barWidth = opts.barWidth || 300;
        const barHeight = opts.barHeight || 92;
        const gap = 14;
        const bars = Math.max(1, Math.ceil(numerator / denominator));
        const width = barWidth;
        const height = bars * barHeight + (bars - 1) * gap;
        const cellWidth = barWidth / denominator;
        const parts = [];
        let painted = 0;

        for (let bar = 0; bar < bars; bar += 1) {
            const top = bar * (barHeight + gap);

            for (let index = 0; index < denominator; index += 1) {
                const shaded = painted < numerator;
                painted += 1;

                parts.push(
                    '<rect class="fi-cell"'
                    + ` x="${(index * cellWidth).toFixed(2)}" y="${top}"`
                    + ` width="${cellWidth.toFixed(2)}" height="${barHeight}"`
                    + ` fill="${shaded ? '#62c5bc' : '#ffffff'}"`
                    + ' stroke="#1f2937" stroke-width="1.5" />'
                );
            }

            parts.push(
                '<rect class="fi-outline"'
                + ` x="0" y="${top}" width="${barWidth}" height="${barHeight}"`
                + ' rx="8" fill="none" stroke="#111827" stroke-width="3" />'
            );
        }

        return (
            `<svg class="fi-svg" viewBox="0 0 ${width} ${height}"`
            + ` width="${width}" height="${height}"`
            + ' preserveAspectRatio="xMidYMid meet" role="img"'
            + ` aria-label="${numerator} of ${denominator} equal parts shaded"`
            + ` style="max-width:${width}px">`
            + parts.join('')
            + '</svg>'
        );
    }

    /*
     * A single circular "pizza" cut into denominator equal
     * slices, with numerator slices shaded.
     */
    function pizzaSvg(numerator, denominator, options) {
        const opts = options || {};
        const size = opts.size || 200;
        const cx = size / 2;
        const cy = size / 2;
        const r = size / 2 - 6;
        const slices = [];

        for (let index = 0; index < denominator; index += 1) {
            const a0 = (-90 + (360 / denominator) * index) * Math.PI / 180;
            const a1 = (-90 + (360 / denominator) * (index + 1)) * Math.PI / 180;
            const x0 = (cx + r * Math.cos(a0)).toFixed(2);
            const y0 = (cy + r * Math.sin(a0)).toFixed(2);
            const x1 = (cx + r * Math.cos(a1)).toFixed(2);
            const y1 = (cy + r * Math.sin(a1)).toFixed(2);
            const large = (360 / denominator) > 180 ? 1 : 0;
            const shaded = index < numerator;

            slices.push(
                `<path class="fi-slice" d="M ${cx} ${cy} L ${x0} ${y0}`
                + ` A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z"`
                + ` fill="${shaded ? '#f4a259' : '#fff7ed'}"`
                + ' stroke="#7c2d12" stroke-width="2" />'
            );
        }

        return (
            `<svg class="fi-svg" viewBox="0 0 ${size} ${size}"`
            + ` width="${size}" height="${size}"`
            + ' preserveAspectRatio="xMidYMid meet" role="img"'
            + ` aria-label="${numerator} of ${denominator} slices"`
            + ` style="max-width:${size}px">`
            + slices.join('')
            + `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none"`
            + ' stroke="#7c2d12" stroke-width="3" />'
            + '</svg>'
        );
    }

    /*
     * Horizontal number line. points is a list of
     * { value, label, below } markers.
     */
    function numberLineSvg(min, max, points, options) {
        const opts = options || {};
        const width = opts.width || 640;
        const height = 96;
        const pad = 34;
        const axisY = 54;
        const span = max - min;
        const toX = (value) => pad + ((value - min) / span) * (width - 2 * pad);
        const bits = [];

        bits.push(
            `<line x1="${pad}" y1="${axisY}" x2="${width - pad}" y2="${axisY}"`
            + ' stroke="#111827" stroke-width="3" />'
        );

        for (let value = Math.ceil(min); value <= Math.floor(max); value += 1) {
            const x = toX(value).toFixed(2);
            bits.push(
                `<line x1="${x}" y1="${axisY - 8}" x2="${x}" y2="${axisY + 8}"`
                + ' stroke="#111827" stroke-width="2.5" />'
                + `<text x="${x}" y="${axisY + 26}" text-anchor="middle"`
                + ' font-size="13" fill="#475569">' + value + '</text>'
            );
        }

        (points || []).forEach((point) => {
            const x = toX(point.value).toFixed(2);
            const labelY = point.below ? axisY + 30 : axisY - 16;

            bits.push(
                `<circle cx="${x}" cy="${axisY}" r="6" fill="#2563eb"`
                + ' stroke="#ffffff" stroke-width="2" />'
                + `<text x="${x}" y="${labelY}" text-anchor="middle"`
                + ' font-size="15" font-weight="700" fill="#1d4ed8">'
                + point.label + '</text>'
            );
        });

        return (
            `<svg class="fi-svg" viewBox="0 0 ${width} ${height}"`
            + ` width="${width}" height="${height}"`
            + ' preserveAspectRatio="xMidYMid meet" role="img"'
            + ' aria-label="Fractions placed on a number line"'
            + ` style="max-width:${width}px">`
            + bits.join('')
            + '</svg>'
        );
    }

    function visual(labelHtml, svg, caption) {
        return (
            '<figure class="fi-visual">'
            + `<div class="fi-visual__label">${labelHtml}</div>`
            + svg
            + (caption ? `<figcaption>${caption}</figcaption>` : '')
            + '</figure>'
        );
    }

    /* ---------- Learn ---------- */

    function mountLearnGraphics() {
        const section = document.getElementById('lesson-section-explanation');
        if (!section || section.dataset.visualMounted === 'true') {
            return;
        }

        section.dataset.visualMounted = 'true';
        section.querySelector('.lesson-copy')?.remove();
        section.querySelector('.lesson-key-points')?.remove();

        const root = document.createElement('div');
        root.className = 'fi-learn';
        section.append(root);

        const slides = [
            renderHookSlide,
            renderNameSlide,
            renderTypesSlide,
            renderLineSlide,
            renderSummarySlide
        ];

        gateSection('explanation');

        let slideIndex = 0;
        let slideReady = false;

        function setReady(value) {
            slideReady = value;
            const next = root.querySelector('[data-learn-next]');
            if (next) {
                next.disabled = !value || slideIndex === slides.length - 1;
            }
        }

        function render() {
            slideReady = false;
            root.innerHTML = (
                '<div class="fi-learn__progress" aria-label="Learn progress">'
                + slides.map((_, index) => (
                    `<span class="fi-learn__dot ${index <= slideIndex ? 'is-active' : ''}"></span>`
                )).join('')
                + '</div>'
                + '<div class="fi-learn__stage"></div>'
                + '<div class="fi-local-nav" aria-label="Move between Learn cards">'
                + `<span class="fi-local-nav__label">${slideIndex + 1} of ${slides.length}</span>`
                + '<button class="fi-nav-button" type="button" data-learn-next aria-label="Next idea" disabled><span aria-hidden="true">›</span></button>'
                + '</div>'
            );

            const stage = root.querySelector('.fi-learn__stage');
            slides[slideIndex](stage, setReady);

            if (slideIndex === slides.length - 1) {
                completeSection('explanation');
            }

            root.querySelector('[data-learn-next]')?.addEventListener('click', () => {
                if (!slideReady) {
                    return;
                }

                if (slideIndex < slides.length - 1) {
                    slideIndex += 1;
                    render();
                }
            });
        }

        render();
    }

    function renderHookSlide(stage, setReady) {
        stage.innerHTML = (
            '<article class="fi-card">'
            + '<p class="lesson-eyebrow">Puzzle</p>'
            + '<h3>How much pizza is left?</h3>'
            + '<p class="fi-card__lead">The pizza was cut into 8 equal slices. 3 slices have been eaten.</p>'
            + '<div class="fi-visual-row">'
            + visual('', pizzaSvg(5, 8, { size: 210 }), '5 of the 8 equal slices are still there.')
            + '</div>'
            + '<div class="fi-choice-row" role="group" aria-label="Choose the fraction that is left">'
            + '<button class="answer-choice" type="button" data-hook="3/8">3/8 is left</button>'
            + '<button class="answer-choice" type="button" data-hook="5/8">5/8 is left</button>'
            + '<button class="answer-choice" type="button" data-hook="5/3">5/3 is left</button>'
            + '</div>'
            + '<div class="fi-feedback" data-hook-feedback role="status"></div>'
            + '</article>'
        );

        stage.querySelectorAll('[data-hook]').forEach((button) => {
            button.addEventListener('click', () => {
                const correct = button.dataset.hook === '5/8';
                const feedback = stage.querySelector('[data-hook-feedback]');

                stage.querySelectorAll('[data-hook]').forEach((choice) => {
                    choice.disabled = true;
                    choice.classList.toggle('is-correct', choice.dataset.hook === '5/8');
                    choice.classList.toggle('is-incorrect', choice === button && !correct);
                });

                feedback.className = 'fi-feedback ' + (correct ? 'is-correct' : 'is-incorrect');
                feedback.innerHTML = correct
                    ? '<strong>Correct.</strong> 8 equal slices in the whole, 5 slices left: that is 5 out of 8, written 5/8.'
                    : '<strong>Not quite.</strong> The whole has 8 equal slices and 5 remain, so count 5 out of 8.';

                if (correct) {
                    setReady(true);
                } else {
                    window.setTimeout(() => {
                        stage.querySelectorAll('[data-hook]').forEach((choice) => {
                            choice.disabled = false;
                            choice.classList.remove('is-correct', 'is-incorrect');
                        });
                    }, 900);
                }
            });
        });
    }

    function renderNameSlide(stage, setReady) {
        stage.innerHTML = (
            '<article class="fi-card">'
            + '<p class="lesson-eyebrow">Learn 1</p>'
            + '<h3>Numerator and denominator</h3>'
            + '<p class="fi-card__lead">The <strong>denominator</strong> (bottom) names how many equal parts the whole is cut into. The <strong>numerator</strong> (top) counts how many of those parts you have.</p>'
            + '<div class="fi-visual-row">'
            + visual(fractionHtml(3, 8), barSvg(3, 8, { barWidth: 340, barHeight: 88 }),
                'Whole cut into 8 equal parts; 3 parts shaded.')
            + '</div>'
            + '<div class="fi-legend">'
            + '<span><span class="fi-swatch fi-swatch--num"></span>numerator = parts counted (3)</span>'
            + '<span><span class="fi-swatch fi-swatch--den"></span>denominator = equal parts in one whole (8)</span>'
            + '</div>'
            + '<div class="fi-rule">Read it as "three eighths": 3 parts, each part is one eighth of the whole.</div>'
            + '</article>'
        );

        setReady(true);
    }

    function renderTypesSlide(stage, setReady) {
        let seen = 0;
        const targets = 3;

        stage.innerHTML = (
            '<article class="fi-card">'
            + '<p class="lesson-eyebrow">Learn 2</p>'
            + '<h3>Proper, improper and mixed</h3>'
            + '<p class="fi-card__lead">Compare the top number with the bottom number. Tap each card to see what it means.</p>'
            + '<div class="fi-choice-row" role="group" aria-label="Choose a fraction type">'
            + '<button class="answer-choice" type="button" data-type="proper">Proper: 3/4</button>'
            + '<button class="answer-choice" type="button" data-type="improper">Improper: 5/4</button>'
            + '<button class="answer-choice" type="button" data-type="mixed">Mixed: 1 1/4</button>'
            + '</div>'
            + '<div class="fi-visual-row" data-type-visual></div>'
            + '<div class="fi-feedback" data-type-feedback role="status"></div>'
            + '</article>'
        );

        const box = stage.querySelector('[data-type-visual]');
        const feedback = stage.querySelector('[data-type-feedback]');
        const shown = { proper: false, improper: false, mixed: false };

        stage.querySelectorAll('[data-type]').forEach((button) => {
            button.addEventListener('click', () => {
                const kind = button.dataset.type;

                if (!shown[kind]) {
                    shown[kind] = true;
                    seen += 1;
                }

                stage.querySelectorAll('[data-type]').forEach((choice) => {
                    choice.classList.toggle('is-selected', choice === button);
                });

                if (kind === 'proper') {
                    box.innerHTML = visual(fractionHtml(3, 4), barSvg(3, 4, { barWidth: 320, barHeight: 84 }),
                        'Top < bottom, so less than one whole.');
                    feedback.className = 'fi-feedback is-correct';
                    feedback.innerHTML = '<strong>Proper fraction.</strong> The numerator is smaller than the denominator, so the value is between 0 and 1.';
                } else if (kind === 'improper') {
                    box.innerHTML = visual(fractionHtml(5, 4), barSvg(5, 4, { barWidth: 320, barHeight: 84 }),
                        'Top ≥ bottom, so one whole and a bit more.');
                    feedback.className = 'fi-feedback is-correct';
                    feedback.innerHTML = '<strong>Improper fraction.</strong> The numerator is equal to or larger than the denominator, so the value is 1 or more.';
                } else {
                    box.innerHTML = visual(fractionHtml(1, 4, 1), barSvg(5, 4, { barWidth: 320, barHeight: 84 }),
                        'Same amount as 5/4, written as 1 whole + 1/4.');
                    feedback.className = 'fi-feedback is-correct';
                    feedback.innerHTML = '<strong>Mixed number.</strong> A whole number next to a proper fraction. 1 1/4 and 5/4 are the same value.';
                }

                if (seen >= targets) {
                    setReady(true);
                }
            });
        });
    }

    function renderLineSlide(stage, setReady) {
        stage.innerHTML = (
            '<article class="fi-card">'
            + '<p class="lesson-eyebrow">Learn 3</p>'
            + '<h3>Ordering on the number line</h3>'
            + '<p class="fi-card__lead">Every fraction has a place on the number line. Further right is larger; further left is smaller. This works for negatives too.</p>'
            + '<div class="fi-visual-row">'
            + '<figure class="fi-visual">'
            + numberLineSvg(-1, 2, [
                { value: -0.75, label: '−3/4' },
                { value: -0.5, label: '−1/2', below: true },
                { value: 0.4, label: '2/5' },
                { value: 1.25, label: '5/4', below: true }
            ], { width: 660 })
            + '<figcaption>−3/4 is the smallest because it is furthest to the left.</figcaption>'
            + '</figure>'
            + '</div>'
            + '<div class="fi-rule">Order, smallest first: −3/4 &lt; −1/2 &lt; 2/5 &lt; 5/4. The sign &lt; points to the smaller number.</div>'
            + '</article>'
        );

        setReady(true);
    }

    function renderSummarySlide(stage, setReady) {
        stage.innerHTML = (
            '<article class="fi-card">'
            + '<p class="lesson-eyebrow">Summary</p>'
            + '<h3>One whole, counted in equal parts</h3>'
            + '<div class="fi-visual-row">'
            + visual(fractionHtml(3, 8), barSvg(3, 8, { barWidth: 260, barHeight: 74 }), 'Proper: less than 1')
            + visual(fractionHtml(5, 4), barSvg(5, 4, { barWidth: 260, barHeight: 74 }), 'Improper: 1 or more')
            + visual(fractionHtml(1, 4, 1), barSvg(5, 4, { barWidth: 260, barHeight: 74 }), 'Mixed: same as 5/4')
            + '</div>'
            + '<div class="fi-takeaway">Denominator names the parts, numerator counts them. To order fractions, give them a common denominator or place them on the number line.</div>'
            + '</article>'
        );

        setReady(true);
    }

    /* ---------- Try it ---------- */

    function mountTryIt(root) {
        if (!root || root.dataset.mounted === 'true') {
            return;
        }
        root.dataset.mounted = 'true';

        gateSection('interactive');

        const questions = [
            {
                title: 'Read the diagram',
                prompt: 'The whole is cut into equal parts. What is the denominator of the shaded fraction?',
                visual: barSvg(3, 8, { barWidth: 420, barHeight: 84 }),
                options: ['3', '8', '11'],
                answer: '8',
                explanation: 'The whole is cut into 8 equal parts, so the denominator is 8. The 3 shaded parts are the numerator.',
                hint: 'Count every equal part in one whole bar, shaded or not.'
            },
            {
                title: 'Classify the fraction',
                prompt: 'Is 9/5 a proper fraction, an improper fraction, or a mixed number?',
                visual: barSvg(9, 5, { barWidth: 360, barHeight: 74 }),
                options: ['Proper fraction', 'Improper fraction', 'Mixed number'],
                answer: 'Improper fraction',
                explanation: '9 is larger than 5, so the value is more than one whole and it is written as a single fraction. That is an improper fraction (it equals 1 4/5).',
                hint: 'Compare the top number with the bottom number. Is there a whole number written beside it?'
            },
            {
                title: 'Order two negatives',
                prompt: 'Which is the smaller number: −2/5 or −1/5?',
                visual: numberLineSvg(-1, 1, [
                    { value: -0.4, label: '−2/5' },
                    { value: -0.2, label: '−1/5', below: true }
                ], { width: 560 }),
                options: ['−2/5', '−1/5', 'They are equal'],
                answer: '−2/5',
                explanation: '−2/5 sits further to the left of zero, so it is the smaller number: −2/5 < −1/5.',
                hint: 'On the number line the smaller number is further to the left, not the one with smaller digits.'
            }
        ];

        let index = 0;
        let selected = '';
        let phase = 'answering';

        function render() {
            const question = questions[index];
            const answered = phase !== 'answering';
            const isLast = index === questions.length - 1;
            const finished = phase === 'correct' && isLast;

            const actionLabel = phase === 'wrong'
                ? 'Try again'
                : phase === 'correct'
                    ? 'Continue'
                    : 'Check';

            root.innerHTML = (
                '<article class="fi-try">'
                + `<p class="lesson-eyebrow">Question ${index + 1} of ${questions.length}</p>`
                + `<h3>${question.title}</h3>`
                + `<p>${question.prompt}</p>`
                + `<div class="fi-visual-row">${question.visual}</div>`
                + '<div class="fi-choice-row" role="radiogroup" aria-label="Choose an answer">'
                + question.options.map((option) => {
                    const stateClass = !answered
                        ? (selected === option ? 'is-selected' : '')
                        : option === selected
                            ? (phase === 'correct' ? 'is-correct' : 'is-incorrect')
                            : '';

                    return `<button class="answer-choice ${stateClass}" type="button" data-try-option="${option}" ${answered ? 'disabled' : ''}>${option}</button>`;
                }).join('')
                + '</div>'
                + '<div class="fi-feedback" data-try-feedback role="status"></div>'
                + (finished
                    ? '<span class="fi-try-complete">Try It complete. Use the button below to carry on.</span>'
                    : '')
                + '</article>'
            );

            const feedback = root.querySelector('[data-try-feedback]');

            if (phase === 'correct') {
                feedback.classList.add('is-correct');
                feedback.innerHTML = `<strong>Correct.</strong> ${question.explanation}`;
            } else if (phase === 'wrong') {
                feedback.classList.add('is-incorrect');
                feedback.innerHTML = `<strong>Not yet.</strong> ${question.hint}`;
            }

            if (finished) {
                completeSection('interactive');
                window.Maths1to9Lesson?.clearSectionAction?.('interactive');
            }

            root.querySelectorAll('[data-try-option]').forEach((button) => {
                button.addEventListener('click', () => {
                    selected = button.dataset.tryOption;
                    render();
                });
            });

            function handleAction() {
                if (phase === 'answering') {
                    phase = selected === question.answer ? 'correct' : 'wrong';
                } else if (phase === 'wrong') {
                    selected = '';
                    phase = 'answering';
                } else {
                    index += 1;
                    selected = '';
                    phase = 'answering';
                }

                render();
            }

            if (!finished) {
                window.Maths1to9Lesson?.setSectionAction?.('interactive', {
                    label: actionLabel,
                    disabled: phase === 'answering' && selected === '',
                    onClick: handleAction
                });
            }
        }

        render();
    }

    function mountAll() {
        injectStyles();
        mountLearnGraphics();

        const tryRoot = document.getElementById(`${SLUG}-interactive`);
        if (tryRoot) {
            mountTryIt(tryRoot);
        }
    }

    window.Maths1to9Interactives[SLUG] = mountTryIt;

    document.addEventListener('maths1to9:lesson-rendered', mountAll);
    mountAll();
})();
