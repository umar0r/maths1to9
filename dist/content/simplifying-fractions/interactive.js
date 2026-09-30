(() => {
    'use strict';

    const SLUG = 'equivalent-simplifying-fractions';
    window.Maths1to9Interactives ??= {};

    /*
     * Section gating. gateSection() locks the lesson's
     * "Next" button while the pupil is on that section.
     * completeSection() unlocks it again. The engine
     * ignores duplicate calls, so these are safe to fire
     * on every render.
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

    function injectFractionStyles() {
        if (document.getElementById('equivalent-fractions-interactive-styles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'equivalent-fractions-interactive-styles';
        style.textContent = `
            .fraction {
                display: inline-grid;
                grid-template-rows: auto auto;
                min-width: 1.5em;
                vertical-align: middle;
                color: inherit;
                font-weight: 800;
                line-height: 1;
                text-align: center;
            }

            .fraction__top {
                padding: 0 .16em .12em;
                border-bottom: 2px solid currentColor;
            }

            .fraction__bottom {
                padding: .12em .16em 0;
            }

            .fraction-card,
            .fraction-try {
                width: 100%;
            }

            .fraction-card h3,
            .fraction-try h3 {
                margin-top: 0;
            }

            .fraction-card__lead {
                max-width: 62ch;
            }

            .fraction-visual {
                min-width: 0;
                margin: 0;
                text-align: center;
            }

            .fraction-visual__label {
                margin-bottom: 12px;
                font-size: clamp(1.35rem, 2.4vw, 1.9rem);
            }

            .fraction-visual figcaption {
                max-width: 34ch;
                margin: 10px auto 0;
                color: #64748b;
                font-size: .95rem;
                line-height: 1.45;
            }

            .fraction-bar {
                display: block;
                width: 100%;
                height: auto;
                margin-inline: auto;
                overflow: visible;
            }

            .fraction-bar__cell,
            .fraction-bar__outline,
            .fraction-bar__group-line {
                vector-effect: non-scaling-stroke;
            }

            .fraction-compare {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: clamp(18px, 4vw, 44px);
                align-items: end;
                margin: 28px 0;
            }

            .equivalence-chain {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                align-items: center;
                gap: clamp(14px, 2.5vw, 30px);
                margin: 28px 0;
            }

            .equivalence-chain .fraction-visual {
                flex: 1 1 230px;
                max-width: 320px;
            }

            .fraction-arrow {
                display: grid;
                place-items: center;
                flex: 0 0 110px;
                gap: 6px;
                text-align: center;
            }

            .fraction-arrow strong {
                font-size: 1.2rem;
            }

            .fraction-arrow__line {
                position: relative;
                display: block;
                width: 74px;
                height: 2px;
                background: #1f2937;
            }

            .fraction-arrow__line::after {
                position: absolute;
                top: 50%;
                right: -1px;
                width: 10px;
                height: 10px;
                border-top: 2px solid #1f2937;
                border-right: 2px solid #1f2937;
                content: '';
                transform: translateY(-50%) rotate(45deg);
            }

            .fraction-arrow--reverse .fraction-arrow__line::after {
                right: auto;
                left: -1px;
                transform: translateY(-50%) rotate(-135deg);
            }

            .fraction-arrow small {
                color: #64748b;
                line-height: 1.35;
            }

            .fraction-choice-row {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                margin-top: 22px;
            }

            .fraction-choice-row .answer-choice {
                flex: 1 1 150px;
            }

            .fraction-feedback {
                min-height: 1.6em;
                margin-top: 16px;
                line-height: 1.5;
            }

            .fraction-feedback.is-correct {
                color: #166534;
            }

            .fraction-feedback.is-incorrect {
                color: #9f1239;
            }

            .fraction-choice-row .is-selected,
            .fraction-choice-row .is-correct {
                border-color: #0f766e;
                background: #ccfbf1;
            }

            .fraction-choice-row .is-incorrect {
                border-color: #be123c;
                background: #ffe4e6;
            }

            .fraction-action {
                display: block;
                margin: 20px auto 0;
            }

            .fraction-rule,
            .fraction-calculation,
            .fraction-takeaway,
            .summary-reverse,
            .method-check {
                margin-top: 20px;
                padding: 16px 18px;
                border: 1px solid #cbd5e1;
                border-radius: 12px;
                background: #f8fafc;
                line-height: 1.55;
            }

            .fraction-result-chain,
            .method-equation,
            .method-factor,
            .worked-visual {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                justify-content: center;
                gap: 12px;
                margin-top: 18px;
                font-size: clamp(1.1rem, 2.2vw, 1.5rem);
            }

            .method-equation,
            .method-factor {
                justify-content: flex-start;
                padding: 16px;
                border-radius: 12px;
                background: #f8fafc;
            }

            .method-equation small {
                flex-basis: 100%;
                color: #64748b;
                font-size: .9rem;
            }

            .method-find {
                display: grid;
                grid-template-columns: minmax(0, 1fr) minmax(180px, .55fr);
                gap: 20px;
                align-items: center;
            }

            .merge-demo,
            .stop-demo,
            .stop-demo__result {
                margin-top: 24px;
            }

            .fraction-learn__progress {
                display: flex;
                justify-content: center;
                gap: 8px;
                margin-bottom: 18px;
            }

            .fraction-learn__dot {
                width: 9px;
                height: 9px;
                border-radius: 999px;
                background: #d7dee8;
            }

            .fraction-learn__dot.is-active {
                background: #2563eb;
            }

            .fraction-local-nav {
                display: grid;
                grid-template-columns: minmax(70px, auto) 44px;
                justify-content: center;
                align-items: center;
                gap: 12px;
                margin-top: 22px;
            }

            .fraction-local-nav__label {
                color: #64748b;
                font-size: .9rem;
                font-weight: 700;
                text-align: center;
            }

            .fraction-nav-button {
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

            .fraction-nav-button:hover:not(:disabled),
            .fraction-nav-button:focus-visible {
                border-color: #2563eb;
                color: #2563eb;
                outline: none;
                box-shadow: 0 0 0 3px rgba(37, 99, 235, .14);
            }

            .fraction-nav-button:disabled {
                cursor: not-allowed;
                opacity: .32;
            }

            .fraction-nav-button--inline {
                margin-top: 14px;
            }

            .fraction-method__history {
                display: grid;
                gap: 14px;
            }

            .fraction-method__step {
                display: grid;
                grid-template-columns: 42px minmax(0, 1fr);
                gap: 14px;
                padding: 18px;
                border: 1px solid #dbe3ee;
                border-radius: 14px;
                background: #ffffff;
                transition: opacity 150ms ease, border-color 150ms ease;
            }

            .fraction-method__step.is-complete {
                opacity: .62;
            }

            .fraction-method__step.is-current {
                border-color: #60a5fa;
                box-shadow: 0 0 0 3px rgba(96, 165, 250, .12);
            }

            .fraction-method__number {
                display: grid;
                width: 36px;
                height: 36px;
                place-items: center;
                border-radius: 999px;
                background: #eff6ff;
                color: #1d4ed8;
                font-weight: 800;
            }

            .fraction-method__content h3,
            .fraction-method__content p {
                margin-top: 0;
            }

            .worked-visual {
                justify-content: flex-start;
                margin-bottom: 18px;
                padding: 16px;
                border-radius: 12px;
                background: #f8fafc;
            }

            .worked-visual .fraction-bar {
                flex-basis: 100%;
            }

            .worked-visual__stop {
                color: #166534;
                font-size: 1rem;
                font-weight: 700;
            }

            .worked-visual--mistake .is-wrong {
                color: #be123c;
                text-decoration: line-through;
            }

            .fraction-try-complete {
                display: inline-block;
                margin-top: 14px;
                color: #166534;
                font-weight: 800;
            }

            @media (max-width: 760px) {
                .fraction-compare,
                .method-find {
                    grid-template-columns: 1fr;
                }

                .fraction-arrow {
                    flex-basis: 100%;
                }

                .fraction-arrow__line {
                    transform: rotate(90deg);
                }

                .fraction-arrow--reverse .fraction-arrow__line {
                    transform: rotate(-90deg);
                }
            }

            @media (prefers-reduced-motion: reduce) {
                .fraction-method__step {
                    transition: none;
                }
            }
        `;

        document.head.append(style);
    }

    function fractionHtml(numerator, denominator, className = '') {
        return (
            `<span class="fraction ${className}" aria-label="${numerator} over ${denominator}">`
            + `<span class="fraction__top">${numerator}</span>`
            + `<span class="fraction__bottom">${denominator}</span>`
            + '</span>'
        );
    }

    function barSvg(numerator, denominator, options = {}) {
        const {
            width = 360,
            height = 126,
            label = `${numerator}/${denominator}`,
            groupSize = 1,
            showGroups = false,
            invalidGroup = false,
            compact = false
        } = options;

        const stroke = compact ? 2 : 3;
        const cellWidth = width / denominator;
        const cells = [];

        for (let index = 0; index < denominator; index += 1) {
            const shaded = index < numerator;
            const isLeftover = invalidGroup && index >= denominator - (denominator % groupSize);
            const groupIndex = Math.floor(index / groupSize);
            const groupShade = groupIndex % 2 === 0 ? 'fraction-bar__group-a' : 'fraction-bar__group-b';

            const fill = isLeftover
                ? '#fecdd3'
                : shaded
                    ? (showGroups && groupIndex % 2 === 1 ? '#86d5ce' : '#62c5bc')
                    : '#ffffff';

            cells.push(
                `<rect class="fraction-bar__cell ${shaded ? 'is-shaded' : ''} ${isLeftover ? 'is-leftover' : ''} ${showGroups ? groupShade : ''}"`
                + ` x="${(index * cellWidth).toFixed(3)}" y="0"`
                + ` width="${cellWidth.toFixed(3)}" height="${height}"`
                + ` fill="${fill}" stroke="#1f2937" stroke-width="${stroke / 2}" />`
            );
        }

        const groupLines = [];
        if (showGroups && groupSize > 1) {
            for (let index = groupSize; index < denominator; index += groupSize) {
                groupLines.push(
                    `<line class="fraction-bar__group-line" x1="${(index * cellWidth).toFixed(3)}" y1="0"`
                    + ` x2="${(index * cellWidth).toFixed(3)}" y2="${height}"`
                    + ` stroke="#111827" stroke-width="${stroke * 1.5}" />`
                );
            }
        }

        return (
            `<svg class="fraction-bar ${invalidGroup ? 'is-invalid' : ''}"`
            + ` viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"`
            + ` preserveAspectRatio="xMidYMid meet" role="img" aria-label="${label}"`
            + ` style="display:block;width:100%;max-width:${width}px;height:auto">`
            + cells.join('')
            + groupLines.join('')
            + `<rect class="fraction-bar__outline" x="0" y="0" width="${width}" height="${height}" rx="8"`
            + ` fill="none" stroke="#111827" stroke-width="${stroke}" />`
            + '</svg>'
        );
    }

    function visualFraction(numerator, denominator, options = {}) {
        const { caption = '', compact = false, ...barOptions } = options;

        return (
            `<figure class="fraction-visual ${compact ? 'fraction-visual--compact' : ''}">`
            + `<div class="fraction-visual__label">${fractionHtml(numerator, denominator)}</div>`
            + barSvg(numerator, denominator, { compact, ...barOptions })
            + (caption ? `<figcaption>${caption}</figcaption>` : '')
            + '</figure>'
        );
    }

    function arrowHtml(operator, caption, reverse = false) {
        return (
            `<div class="fraction-arrow ${reverse ? 'fraction-arrow--reverse' : ''}" aria-label="${operator}. ${caption}">`
            + `<strong>${operator}</strong>`
            + '<span class="fraction-arrow__line" aria-hidden="true"></span>'
            + `<small>${caption}</small>`
            + '</div>'
        );
    }

    function mountLearnGraphics() {
        const section = document.getElementById('lesson-section-explanation');
        if (!section || section.dataset.visualMounted === 'true') {
            return;
        }

        section.dataset.visualMounted = 'true';
        section.querySelector('.lesson-copy')?.remove();
        section.querySelector('.lesson-key-points')?.remove();

        const root = document.createElement('div');
        root.className = 'fraction-learn';
        section.append(root);

        const slides = [
            renderHookSlide,
            renderSplitSlide,
            renderMergeSlide,
            renderStopSlide,
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
                '<div class="fraction-learn__progress" aria-label="Learn progress">'
                + slides.map((_, index) => (
                    `<span class="fraction-learn__dot ${index <= slideIndex ? 'is-active' : ''}"></span>`
                )).join('')
                + '</div>'
                + '<div class="fraction-learn__stage"></div>'
                + '<div class="fraction-local-nav" aria-label="Move between Learn cards">'
                + `<span class="fraction-local-nav__label">${slideIndex + 1} of ${slides.length}</span>`
                + `<button class="fraction-nav-button" type="button" data-learn-next aria-label="Next idea" disabled><span aria-hidden="true">›</span></button>`
                + '</div>'
            );

            const stage = root.querySelector('.fraction-learn__stage');
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
            '<article class="fraction-card">'
            + '<p class="lesson-eyebrow">Puzzle</p>'
            + '<h3>Which shape has more shaded?</h3>'
            + '<p class="fraction-card__lead">Look at the amount covered. Do not just compare the numbers.</p>'
            + '<div class="fraction-compare">'
            + visualFraction(1, 2, { width: 300, height: 120 })
            + visualFraction(2, 4, { width: 300, height: 120 })
            + '</div>'
            + '<div class="fraction-choice-row" role="group" aria-label="Choose which fraction has more shaded">'
            + '<button class="answer-choice" type="button" data-hook-answer="left">1/2 has more</button>'
            + '<button class="answer-choice" type="button" data-hook-answer="same">They show the same amount</button>'
            + '<button class="answer-choice" type="button" data-hook-answer="right">2/4 has more</button>'
            + '</div>'
            + '<div class="fraction-feedback" data-hook-feedback role="status"></div>'
            + '</article>'
        );

        stage.querySelectorAll('[data-hook-answer]').forEach((button) => {
            button.addEventListener('click', () => {
                const correct = button.dataset.hookAnswer === 'same';
                const feedback = stage.querySelector('[data-hook-feedback]');

                stage.querySelectorAll('[data-hook-answer]').forEach((choice) => {
                    choice.disabled = true;
                    choice.classList.toggle('is-correct', choice.dataset.hookAnswer === 'same');
                    choice.classList.toggle('is-incorrect', choice === button && !correct);
                });

                feedback.innerHTML = correct
                    ? '<strong>Correct.</strong> Each half was split into two quarters. The dividing lines changed, but the shaded amount did not.'
                    : '<strong>Look again.</strong> Both shapes have exactly half shaded. The second shape only uses smaller pieces.';

                if (correct) {
                    setReady(true);
                } else {
                    window.setTimeout(() => {
                        stage.querySelectorAll('[data-hook-answer]').forEach((choice) => {
                            choice.disabled = false;
                            choice.classList.remove('is-correct', 'is-incorrect');
                        });
                    }, 900);
                }
            });
        });
    }

    function renderSplitSlide(stage, setReady) {
        let splitCount = 0;

        stage.innerHTML = (
            '<article class="fraction-card">'
            + '<p class="lesson-eyebrow">Learn 1</p>'
            + '<h3>Split every piece</h3>'
            + '<p class="fraction-card__lead">When each piece splits into 2, both fraction numbers double.</p>'
            + '<div class="equivalence-chain" data-split-chain>'
            + visualFraction(2, 3, { width: 310, height: 126, caption: 'Two of three equal pieces are shaded.' })
            + '</div>'
            + '<button class="button button--primary fraction-action" type="button" data-split-action>Split every piece into 2</button>'
            + '<div class="fraction-rule" data-split-rule></div>'
            + '</article>'
        );

        const button = stage.querySelector('[data-split-action]');
        const chain = stage.querySelector('[data-split-chain]');
        const rule = stage.querySelector('[data-split-rule]');

        button.addEventListener('click', () => {
            splitCount += 1;

            if (splitCount === 1) {
                chain.insertAdjacentHTML(
                    'beforeend',
                    arrowHtml('×2', 'Split each third into 2 sixths')
                    + visualFraction(4, 6, { width: 310, height: 126, caption: 'Four of six smaller pieces are shaded.' })
                );
                rule.innerHTML = `${fractionHtml(2, 3)} <span>→</span> ${fractionHtml(2, 3)} × ${fractionHtml(2, 2)} = ${fractionHtml(4, 6)}`;
                button.textContent = 'Split every piece into 2 again';
                return;
            }

            chain.insertAdjacentHTML(
                'beforeend',
                arrowHtml('×2', 'Split each sixth into 2 twelfths')
                + visualFraction(8, 12, { width: 310, height: 126, caption: 'Eight of twelve smaller pieces are shaded.' })
            );
            rule.innerHTML = (
                `${fractionHtml(2, 3)} = ${fractionHtml(4, 6)} = ${fractionHtml(8, 12)}`
                + '<p>The number of pieces changes. The shaded amount stays at two thirds.</p>'
            );
            button.remove();
            setReady(true);
        });
    }

    function renderMergeSlide(stage, setReady) {
        stage.innerHTML = (
            '<article class="fraction-card">'
            + '<p class="lesson-eyebrow">Learn 2</p>'
            + '<h3>Merge the pieces back</h3>'
            + '<p class="fraction-card__lead">Simplifying reverses the split. Merge equal small pieces into larger pieces.</p>'
            + '<div class="merge-demo">'
            + `<div data-merge-before>${visualFraction(6, 8, { width: 430, height: 140, showGroups: true, groupSize: 2, caption: 'The eight pieces can be grouped in pairs.' })}</div>`
            + '<div class="merge-demo__result" data-merge-result hidden></div>'
            + '</div>'
            + '<button class="button button--primary fraction-action" type="button" data-merge-action>Merge each pair</button>'
            + '<div class="fraction-rule" data-merge-rule></div>'
            + '</article>'
        );

        stage.querySelector('[data-merge-action]').addEventListener('click', (event) => {
            const result = stage.querySelector('[data-merge-result]');
            result.hidden = false;
            result.innerHTML = (
                arrowHtml('÷2', 'Two small pieces become one larger piece', true)
                + visualFraction(3, 4, { width: 430, height: 140, caption: 'Three of four larger pieces are shaded.' })
            );
            stage.querySelector('[data-merge-rule]').innerHTML = (
                `${fractionHtml(6, 8)} → `
                + `<span class="fraction-calculation">6 ÷ 2 = 3</span>`
                + '<span class="fraction-rule__and">and</span>'
                + `<span class="fraction-calculation">8 ÷ 2 = 4</span>`
                + `<strong>${fractionHtml(6, 8)} = ${fractionHtml(3, 4)}</strong>`
            );
            event.currentTarget.remove();
            setReady(true);
        });
    }

    function renderStopSlide(stage, setReady) {
        let validChoiceMade = false;

        stage.innerHTML = (
            '<article class="fraction-card">'
            + '<p class="lesson-eyebrow">Learn 3</p>'
            + '<h3>Which group size works?</h3>'
            + '<p class="fraction-card__lead">A group size must divide both 8 and 12 exactly.</p>'
            + `<div class="stop-demo" data-stop-bar>${visualFraction(8, 12, { width: 560, height: 145 })}</div>`
            + '<div class="fraction-choice-row" role="group" aria-label="Choose a group size">'
            + [2, 3, 4, 5].map((size) => `<button class="answer-choice" type="button" data-group-size="${size}">Group in ${size}s</button>`).join('')
            + '</div>'
            + '<div class="fraction-feedback" data-stop-feedback role="status"></div>'
            + '<div class="stop-demo__result" data-stop-result></div>'
            + '</article>'
        );

        stage.querySelectorAll('[data-group-size]').forEach((button) => {
            button.addEventListener('click', () => {
                const size = Number(button.dataset.groupSize);
                const works = 8 % size === 0 && 12 % size === 0;
                const bar = stage.querySelector('[data-stop-bar]');
                const feedback = stage.querySelector('[data-stop-feedback]');
                const result = stage.querySelector('[data-stop-result]');

                if (!works) {
                    bar.innerHTML = visualFraction(8, 12, {
                        width: 560,
                        height: 145,
                        groupSize: size,
                        showGroups: true,
                        invalidGroup: true,
                        caption: 'Two cells are left over. The twelfths do not make complete groups of five.'
                    });
                    feedback.innerHTML = '<strong>5 does not work.</strong> Twelve does not divide into complete groups of five. The leftover cells show why.';
                    result.innerHTML = '';

                    window.setTimeout(() => {
                        bar.innerHTML = visualFraction(8, 12, { width: 560, height: 145 });
                    }, 1800);
                    return;
                }

                validChoiceMade = true;
                const newNumerator = 8 / size;
                const newDenominator = 12 / size;
                bar.innerHTML = visualFraction(8, 12, {
                    width: 560,
                    height: 145,
                    groupSize: size,
                    showGroups: true,
                    caption: `The cells make complete groups of ${size}.`
                });
                feedback.innerHTML = `<strong>${size} works.</strong> Divide the numerator and denominator by ${size}.`;
                result.innerHTML = (
                    '<div class="fraction-result-chain">'
                    + `${fractionHtml(8, 12)} <span>÷ ${size}</span> = ${fractionHtml(newNumerator, newDenominator)}`
                    + '</div>'
                    + (newNumerator === 2 && newDenominator === 3
                        ? '<p><strong>2/3 is fully simplified.</strong> No whole number greater than 1 divides both 2 and 3.</p>'
                        : '<p>This is equivalent, but it can still be simplified again.</p>')
                );

                if (newNumerator === 2 && newDenominator === 3) {
                    setReady(true);
                }
            });
        });

        if (!validChoiceMade) {
            setReady(false);
        }
    }

    function renderSummarySlide(stage, setReady) {
        stage.innerHTML = (
            '<article class="fraction-card fraction-card--summary">'
            + '<p class="lesson-eyebrow">Summary</p>'
            + '<h3>One amount, different-sized pieces</h3>'
            + '<div class="equivalence-chain equivalence-chain--summary">'
            + visualFraction(2, 3, { width: 300, height: 122 })
            + arrowHtml('×2  →', 'split')
            + visualFraction(4, 6, { width: 300, height: 122 })
            + arrowHtml('×2  →', 'split')
            + visualFraction(8, 12, { width: 300, height: 122 })
            + '</div>'
            + '<div class="summary-reverse">'
            + '<span>To simplify, move back by dividing both numbers by the same number:</span>'
            + `<strong>${fractionHtml(8, 12)} ÷ 2 = ${fractionHtml(4, 6)} ÷ 2 = ${fractionHtml(2, 3)}</strong>`
            + '</div>'
            + '<div class="fraction-takeaway">Simplifying changes the pieces, not the amount.</div>'
            + '</article>'
        );
        setReady(true);
    }

    function mountMethodGraphics() {
        const section = document.getElementById('lesson-section-method');
        if (!section || section.dataset.visualMounted === 'true') {
            return;
        }

        section.dataset.visualMounted = 'true';
        section.querySelector('.lesson-steps')?.remove();

        const root = document.createElement('div');
        root.className = 'fraction-method';
        section.append(root);

        const steps = [
            {
                title: 'Find',
                text: 'Choose a whole number that divides 12 and 20 exactly. Start with 2.',
                visual: (
                    '<div class="method-find">'
                    + visualFraction(12, 20, { width: 470, height: 105, compact: true })
                    + '<div class="method-factor"><span>12 ÷ 2</span><span>20 ÷ 2</span><strong>2 works for both</strong></div>'
                    + '</div>'
                )
            },
            {
                title: 'Divide the top',
                text: 'Use the chosen number on the numerator.',
                visual: '<div class="method-equation"><span>numerator:</span><strong>12 ÷ 2 = 6</strong><small>Keep the same ÷2 for the denominator.</small></div>'
            },
            {
                title: 'Divide the bottom',
                text: 'Use the same number on the denominator.',
                visual: (
                    '<div class="method-equation"><span>denominator:</span><strong>20 ÷ 2 = 10</strong></div>'
                    + `<div class="fraction-result-chain">${fractionHtml(12, 20)} = ${fractionHtml(6, 10)}</div>`
                )
            },
            {
                title: 'Repeat',
                text: '6 and 10 still divide by 2, so simplify once more.',
                visual: (
                    `<div class="fraction-result-chain">${fractionHtml(12, 20)} = ${fractionHtml(6, 10)} = ${fractionHtml(3, 5)}</div>`
                    + '<div class="method-check"><strong>Stop.</strong> No whole number greater than 1 divides both 3 and 5.</div>'
                )
            }
        ];

        gateSection('method');

        let current = 0;
        let highestRevealed = 0;

        function render() {
            if (highestRevealed === steps.length - 1) {
                completeSection('method');
            }

            root.innerHTML = (
                '<div class="fraction-method__history">'
                + steps.slice(0, highestRevealed + 1).map((step, index) => (
                    `<article class="fraction-method__step ${index === current ? 'is-current' : 'is-complete'}">`
                    + `<div class="fraction-method__number">${index + 1}</div>`
                    + '<div class="fraction-method__content">'
                    + `<h3>${step.title}</h3>`
                    + `<p>${step.text}</p>`
                    + step.visual
                    + '</div>'
                    + '</article>'
                )).join('')
                + '</div>'
                + '<div class="fraction-local-nav" aria-label="Move between Method steps">'
                + `<span class="fraction-local-nav__label">Step ${current + 1} of ${steps.length}</span>`
                + `<button class="fraction-nav-button" type="button" data-method-next aria-label="Next step" ${current === steps.length - 1 ? 'disabled' : ''}><span aria-hidden="true">›</span></button>`
                + '</div>'
            );

            root.querySelector('[data-method-next]')?.addEventListener('click', () => {
                if (current < highestRevealed) {
                    current += 1;
                } else if (highestRevealed < steps.length - 1) {
                    highestRevealed += 1;
                    current = highestRevealed;
                }
                render();
            });
        }

        render();
    }

    function mountWorkedExampleGraphics() {
        const section = document.getElementById('lesson-section-worked-examples');
        if (!section || section.dataset.visualMounted === 'true') {
            return;
        }

        section.dataset.visualMounted = 'true';
        const examples = section.querySelectorAll('.worked-example');
        const visuals = [
            `<div class="worked-visual">${fractionHtml(15, 20)} <span>÷5</span> = ${fractionHtml(3, 4)}${barSvg(15, 20, { width: 420, height: 70, compact: true })}</div>`,
            `<div class="worked-visual">${fractionHtml(18, 24)} <span>÷2</span> = ${fractionHtml(9, 12)} <span>÷3</span> = ${fractionHtml(3, 4)}</div>`,
            `<div class="worked-visual">${fractionHtml(5, 7)} <span class="worked-visual__stop">No shared divisor greater than 1</span></div>`,
            `<div class="worked-visual worked-visual--mistake"><span class="is-wrong">${fractionHtml(6, 10)} − 1 = ${fractionHtml(5, 9)}</span><span>Use division:</span>${fractionHtml(6, 10)} ÷ 2 = ${fractionHtml(3, 5)}</div>`
        ];

        examples.forEach((article, index) => {
            if (!visuals[index]) {
                return;
            }
            article.querySelector('.worked-example__title')?.insertAdjacentHTML('afterend', visuals[index]);
        });
    }

    function mountTryIt(root) {
        if (!root || root.dataset.mounted === 'true') {
            return;
        }
        root.dataset.mounted = 'true';

        const questions = [
            {
                title: 'Complete the result',
                prompt: 'The pieces are already grouped in pairs. What is the simplified fraction?',
                numerator: 4,
                denominator: 6,
                divisor: 2,
                mode: 'result',
                options: ['1/3', '2/3', '2/4'],
                answer: '2/3'
            },
            {
                title: 'Choose the group size',
                prompt: 'Which group size simplifies 10/15 in one step?',
                numerator: 10,
                denominator: 15,
                mode: 'divisor',
                options: ['2', '3', '5'],
                answer: '5'
            },
            {
                title: 'Work independently',
                prompt: 'Simplify 12/18 fully.',
                numerator: 12,
                denominator: 18,
                mode: 'full',
                options: ['6/9', '4/6', '2/3'],
                answer: '2/3'
            }
        ];

        gateSection('interactive');

        let index = 0;
        let selected = '';

        /*
         * One action button, three phases:
         *   answering — "Check", disabled until an option is picked
         *   wrong     — "Try again", resets the question
         *   correct   — "Continue", advances (hidden on the last question)
         */
        let phase = 'answering';

        function render() {
            const question = questions[index];
            const groupSize = question.divisor ?? (question.mode === 'divisor' ? 5 : 1);
            const grouped = question.mode !== 'full';
            const answered = phase !== 'answering';
            const isLast = index === questions.length - 1;
            const finished = phase === 'correct' && isLast;

            const actionLabel = phase === 'wrong'
                ? 'Try again'
                : phase === 'correct'
                    ? 'Continue'
                    : 'Check';

            root.innerHTML = (
                '<article class="fraction-try">'
                + `<p class="lesson-eyebrow">Question ${index + 1} of ${questions.length}</p>`
                + `<h3>${question.title}</h3>`
                + `<p>${question.prompt}</p>`
                + visualFraction(question.numerator, question.denominator, {
                    width: 560,
                    height: 145,
                    groupSize,
                    showGroups: grouped,
                    caption: grouped ? `Groups of ${groupSize} are shown.` : 'No grouping is provided this time.'
                })
                + '<div class="fraction-choice-row" role="radiogroup" aria-label="Choose an answer">'
                + question.options.map((option) => {
                    const stateClass = !answered
                        ? (selected === option ? 'is-selected' : '')
                        : option === selected
                            ? (phase === 'correct' ? 'is-correct' : 'is-incorrect')
                            : '';

                    return `<button class="answer-choice ${stateClass}" type="button" data-try-option="${option}" ${answered ? 'disabled' : ''}>${option}</button>`;
                }).join('')
                + '</div>'
                + '<div class="fraction-feedback" data-try-feedback role="status"></div>'
                + (finished
                    ? '<span class="fraction-try-complete">Try It complete. Use the button below to carry on.</span>'
                    : '')
                + '</article>'
            );

            const feedback = root.querySelector('[data-try-feedback]');

            if (phase === 'correct') {
                feedback.classList.add('is-correct');
                feedback.innerHTML = `<strong>Correct.</strong> ${tryExplanation(index)}`;
            } else if (phase === 'wrong') {
                feedback.classList.add('is-incorrect');
                feedback.innerHTML = `<strong>Not yet.</strong> ${tryHint(index)}`;
            }

            if (finished) {
                completeSection('interactive');
                window.Maths1to9Lesson
                    ?.clearSectionAction?.('interactive');
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
                window.Maths1to9Lesson
                    ?.setSectionAction?.('interactive', {
                        label: actionLabel,
                        disabled:
                            phase === 'answering' && selected === '',
                        onClick: handleAction
                    });
            }
        }

        render();
    }

    function tryExplanation(index) {
        if (index === 0) {
            return '4 ÷ 2 = 2 and 6 ÷ 2 = 3, so 4/6 = 2/3.';
        }
        if (index === 1) {
            return '10 and 15 both divide by 5. This gives 2/3 in one step.';
        }
        return '12 and 18 both divide by 6. This gives 2/3, which cannot be simplified again.';
    }

    function tryHint(index) {
        if (index === 0) {
            return 'Use the shown pairs: divide both 4 and 6 by 2.';
        }
        if (index === 1) {
            return 'Choose a number that divides both 10 and 15 exactly.';
        }
        return '6/9 and 4/6 are equivalent, but both can still be simplified.';
    }

    function mountAll() {
        injectFractionStyles();
        mountLearnGraphics();
        mountMethodGraphics();
        mountWorkedExampleGraphics();

        const tryRoot = document.getElementById(`${SLUG}-interactive`);
        if (tryRoot) {
            mountTryIt(tryRoot);
        }
    }

    window.Maths1to9Interactives[SLUG] = mountTryIt;

    document.addEventListener('maths1to9:lesson-rendered', mountAll);
    mountAll();
})();
