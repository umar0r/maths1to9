(() => {
    'use strict';

    /* ---------- helpers ---------- */

    const MINUS = '\u2212';

    function escapeHtml(value) {
        return String(value).replace(
            /[&<>"']/g,
            (character) => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            })[character]
        );
    }

    function formatSigned(value) {
        return value < 0
            ? `${MINUS}${Math.abs(value)}`
            : String(value);
    }

    function formatBracketed(value) {
        return value < 0
            ? `(${formatSigned(value)})`
            : String(value);
    }

    function parseNumber(value, fallback) {
        const parsed = Number(value);

        return Number.isFinite(parsed)
            ? parsed
            : fallback;
    }

    /* ---------- shared drag controller ----------
       One drag gesture moves the counter one step. Arrow keys
       also move one step. Home returns to the start. */

    function createDragController({
        root,
        state,
        minimumOffset,
        maximumOffset,
        getRows,
        getMovableDigits,
        render
    }) {
        function getColumnWidth() {
            const rows = getRows();
            const row = rows[0];

            if (!row) {
                return 1;
            }

            const cells = row.querySelectorAll(
                '.place-value-cell'
            );

            if (cells.length < 2) {
                return 1;
            }

            return cells[1]
                .getBoundingClientRect()
                .width;
        }

        function moveDigits(distance) {
            getMovableDigits().forEach((digit) => {
                digit.style.transform =
                    `translateX(${distance}px)`;
            });
        }

        function finishDrag(event) {
            if (!state.dragging) {
                return;
            }

            const threshold = Math.max(
                18,
                getColumnWidth() * 0.4
            );

            if (
                state.distance <= -threshold
                && state.offset > minimumOffset
            ) {
                state.offset -= 1;
            } else if (
                state.distance >= threshold
                && state.offset < maximumOffset
            ) {
                state.offset += 1;
            }

            const activeRow = getRows().find(
                (row) => (
                    event
                    && row.hasPointerCapture(
                        event.pointerId
                    )
                )
            );

            if (activeRow && event) {
                activeRow.releasePointerCapture(
                    event.pointerId
                );
            }

            state.dragging = false;
            state.pointerId = null;
            state.distance = 0;

            render();
        }

        getRows().forEach((row) => {
            row.addEventListener(
                'pointerdown',
                (event) => {
                    state.dragging = true;
                    state.pointerId = event.pointerId;
                    state.startX = event.clientX;
                    state.distance = 0;

                    row.style.cursor = 'grabbing';
                    row.setPointerCapture(
                        event.pointerId
                    );
                }
            );

            row.addEventListener(
                'pointermove',
                (event) => {
                    if (
                        !state.dragging
                        || event.pointerId
                            !== state.pointerId
                    ) {
                        return;
                    }

                    const maximum =
                        getColumnWidth() * 0.9;

                    state.distance = Math.max(
                        -maximum,
                        Math.min(
                            maximum,
                            event.clientX
                                - state.startX
                        )
                    );

                    moveDigits(state.distance);
                }
            );

            row.addEventListener(
                'pointerup',
                finishDrag
            );

            row.addEventListener(
                'pointercancel',
                finishDrag
            );

            row.addEventListener(
                'keydown',
                (event) => {
                    if (
                        event.key === 'ArrowLeft'
                        && state.offset
                            > minimumOffset
                    ) {
                        event.preventDefault();
                        state.offset -= 1;
                        render();
                    }

                    if (
                        event.key === 'ArrowRight'
                        && state.offset
                            < maximumOffset
                    ) {
                        event.preventDefault();
                        state.offset += 1;
                        render();
                    }

                    if (event.key === 'Home') {
                        event.preventDefault();
                        state.offset = 0;
                        render();
                    }
                }
            );
        });
    }

    /* ---------- number line interactive ---------- */

    function mountNumberLine(root) {
        const start = parseNumber(
            root.dataset.start,
            -3
        );

        const minimum = parseNumber(
            root.dataset.min,
            -10
        );

        const maximum = parseNumber(
            root.dataset.max,
            10
        );

        if (
            minimum >= maximum
            || start < minimum
            || start > maximum
        ) {
            root.textContent =
                'The number line could not be loaded.';
            return;
        }

        const values = [];

        for (
            let value = minimum;
            value <= maximum;
            value += 1
        ) {
            values.push(value);
        }

        const state = {
            offset: 0,
            dragging: false,
            pointerId: null,
            startX: 0,
            distance: 0
        };

        const minimumOffset = minimum - start;
        const maximumOffset = maximum - start;

        function isZeroBoundary(value) {
            return value === 0;
        }

        function getMoveMessage() {
            if (state.offset === 0) {
                return (
                    `You are at ${formatSigned(start)}. `
                    + 'Drag right to add. '
                    + 'Drag left to subtract.'
                );
            }

            const steps = Math.abs(state.offset);
            const stepWord = steps === 1
                ? 'step'
                : 'steps';

            if (state.offset > 0) {
                return (
                    `You moved ${steps} ${stepWord} right. `
                    + 'Moving right adds.'
                );
            }

            return (
                `You moved ${steps} ${stepWord} left. `
                + 'Moving left subtracts.'
            );
        }

        function getEquation() {
            const current = start + state.offset;

            if (state.offset === 0) {
                return `Start: ${formatSigned(start)}`;
            }

            const symbol = state.offset > 0
                ? '+'
                : MINUS;

            return (
                `${formatSigned(start)} ${symbol} `
                + `${Math.abs(state.offset)} = `
                + formatSigned(current)
            );
        }

        function render() {
            const current = start + state.offset;

            const rowTemplate = (
                `120px repeat(${values.length}, `
                + 'minmax(44px, 1fr))'
            );

            const chartWidth =
                120 + (values.length * 48);

            root.innerHTML = `
                <p class="interactive-explanation">
                    <strong>← subtract 1</strong>
                    &nbsp;&nbsp; Drag the counter &nbsp;&nbsp;
                    <strong>add 1 →</strong>
                </p>

                <div class="place-value-chart-wrapper">
                    <div
                        class="place-value-chart"
                        style="min-width: ${chartWidth}px;"
                    >
                        <div
                            class="place-value-row"
                            style="grid-template-columns: ${rowTemplate};"
                        >
                            <div class="place-value-cell place-value-cell--heading"></div>

                            ${values.map((value) => `
                                <div class="place-value-cell place-value-cell--heading ${
                                    isZeroBoundary(value)
                                        ? 'place-value-cell--decimal-start'
                                        : ''
                                }">
                                    ${escapeHtml(formatSigned(value))}
                                </div>
                            `).join('')}
                        </div>

                        <div
                            class="place-value-row"
                            data-role="number-line-row"
                            role="slider"
                            tabindex="0"
                            aria-label="Move the counter right to add 1 or left to subtract 1"
                            aria-valuemin="${minimum}"
                            aria-valuemax="${maximum}"
                            aria-valuenow="${current}"
                            aria-valuetext="Counter at ${escapeHtml(formatSigned(current))}"
                            style="
                                grid-template-columns: ${rowTemplate};
                                cursor: grab;
                                touch-action: pan-y;
                                user-select: none;
                            "
                        >
                            <div class="place-value-cell place-value-cell--row-label">
                                Counter
                            </div>

                            ${values.map((value) => `
                                <div class="place-value-cell place-value-cell--digit ${
                                    isZeroBoundary(value)
                                        ? 'place-value-cell--decimal-start'
                                        : ''
                                }">
                                    <span
                                        data-role="line-counter"
                                        style="
                                            display: inline-block;
                                            will-change: transform;
                                        "
                                    >
                                        ${value === current ? '●' : ''}
                                    </span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <p
                    class="interactive-explanation"
                    aria-live="polite"
                >
                    ${escapeHtml(getMoveMessage())}
                </p>

                <div
                    class="interactive-equation"
                    aria-live="polite"
                >
                    ${escapeHtml(getEquation())}
                </div>

                <div class="question-answer-row">
                    <button
                        class="button"
                        type="button"
                        data-action="line-reset"
                        ${state.offset === 0 ? 'disabled' : ''}
                    >
                        Reset number line
                    </button>
                </div>
            `;

            createDragController({
                root,
                state,
                minimumOffset,
                maximumOffset,
                getRows: () => [
                    root.querySelector(
                        '[data-role="number-line-row"]'
                    )
                ].filter(Boolean),
                getMovableDigits: () => (
                    root.querySelectorAll(
                        '[data-role="line-counter"]'
                    )
                ),
                render
            });

            const resetButton = root.querySelector(
                '[data-action="line-reset"]'
            );

            if (resetButton) {
                resetButton.addEventListener(
                    'click',
                    () => {
                        state.offset = 0;
                        render();
                    }
                );
            }
        }

        render();
    }

    /* ---------- sign rules interactive ---------- */

    function parseJsonData(value, fallback = {}) {
        try {
            const parsed = JSON.parse(value || '{}');

            return parsed && typeof parsed === 'object'
                ? parsed
                : fallback;
        } catch (error) {
            return fallback;
        }
    }

    function mountSignRules(root) {
        const addsubData = parseJsonData(
            root.dataset.addsub
        );

        const muldivData = parseJsonData(
            root.dataset.muldiv
        );

        const addsub = {
            first: parseNumber(addsubData.first, 7),
            second: parseNumber(addsubData.second, 4)
        };

        const muldiv = {
            first: parseNumber(muldivData.first, 6),
            second: parseNumber(muldivData.second, 3)
        };

        const state = {
            operation: `${MINUS}`,
            sign: `${MINUS}`,
            firstSign: `${MINUS}`,
            secondSign: '+',
            multiply: true
        };

        function sameSigns(first, second) {
            return first === second;
        }

        function getAddSubResult() {
            const tidied = sameSigns(
                state.operation,
                state.sign
            )
                ? '+'
                : MINUS;

            const value = tidied === '+'
                ? addsub.first + addsub.second
                : addsub.first - addsub.second;

            return {
                tidied,
                value
            };
        }

        function getAddSubMessage() {
            const pair =
                `${state.operation} and ${state.sign}`;

            if (
                sameSigns(state.operation, state.sign)
            ) {
                return (
                    `${pair} are the same, `
                    + 'so together they act like +.'
                );
            }

            return (
                `${pair} are different, `
                + `so together they act like ${MINUS}.`
            );
        }

        function getMulDivValue() {
            const size = state.multiply
                ? muldiv.first * muldiv.second
                : muldiv.first / muldiv.second;

            return sameSigns(
                state.firstSign,
                state.secondSign
            )
                ? size
                : -size;
        }

        function getMulDivMessage() {
            if (
                sameSigns(
                    state.firstSign,
                    state.secondSign
                )
            ) {
                return (
                    'Same signs → '
                    + 'the answer is positive.'
                );
            }

            return (
                'Different signs → '
                + 'the answer is negative.'
            );
        }

        function signedText(sign, value) {
            return sign === '+'
                ? String(value)
                : `${MINUS}${value}`;
        }

        function bracketedText(sign, value) {
            return `(${signedText(sign, value)})`;
        }

        function render() {
            const addSubResult = getAddSubResult();

            const addSubEquation = (
                `${addsub.first} ${state.operation} `
                + `${bracketedText(state.sign, addsub.second)}`
                + '  →  '
                + `${addsub.first} ${addSubResult.tidied} `
                + `${addsub.second} = `
                + formatSigned(addSubResult.value)
            );

            const mulDivSymbol = state.multiply
                ? '×'
                : '÷';

            const mulDivEquation = (
                `${signedText(state.firstSign, muldiv.first)} `
                + `${mulDivSymbol} `
                + `${bracketedText(state.secondSign, muldiv.second)} = `
                + formatSigned(getMulDivValue())
            );

            root.innerHTML = `
                <p class="question-prompt">
                    Rule 1: two signs next to each other
                </p>

                <div class="question-answer-row">
                    <button
                        class="button"
                        type="button"
                        data-action="flip-operation"
                    >
                        Flip the operation
                        (now ${escapeHtml(state.operation)})
                    </button>

                    <button
                        class="button"
                        type="button"
                        data-action="flip-sign"
                    >
                        Flip the sign of ${addsub.second}
                        (now ${escapeHtml(state.sign)})
                    </button>
                </div>

                <div
                    class="interactive-equation"
                    aria-live="polite"
                >
                    ${escapeHtml(addSubEquation)}
                </div>

                <p
                    class="interactive-explanation"
                    aria-live="polite"
                >
                    ${escapeHtml(getAddSubMessage())}
                </p>

                <p class="question-prompt">
                    Rule 2: multiplying and dividing
                </p>

                <div class="question-answer-row">
                    <button
                        class="button"
                        type="button"
                        data-action="flip-first"
                    >
                        Flip the sign of ${muldiv.first}
                    </button>

                    <button
                        class="button"
                        type="button"
                        data-action="flip-second"
                    >
                        Flip the sign of ${muldiv.second}
                    </button>

                    <button
                        class="button"
                        type="button"
                        data-action="switch-operation"
                    >
                        Switch to ${state.multiply ? '÷' : '×'}
                    </button>
                </div>

                <div
                    class="interactive-equation"
                    aria-live="polite"
                >
                    ${escapeHtml(mulDivEquation)}
                </div>

                <p
                    class="interactive-explanation"
                    aria-live="polite"
                >
                    ${escapeHtml(getMulDivMessage())}
                </p>
            `;

            const actions = {
                'flip-operation': () => {
                    state.operation =
                        state.operation === '+'
                            ? MINUS
                            : '+';
                },
                'flip-sign': () => {
                    state.sign =
                        state.sign === '+'
                            ? MINUS
                            : '+';
                },
                'flip-first': () => {
                    state.firstSign =
                        state.firstSign === '+'
                            ? MINUS
                            : '+';
                },
                'flip-second': () => {
                    state.secondSign =
                        state.secondSign === '+'
                            ? MINUS
                            : '+';
                },
                'switch-operation': () => {
                    state.multiply = !state.multiply;
                }
            };

            Object.keys(actions).forEach((name) => {
                const button = root.querySelector(
                    `[data-action="${name}"]`
                );

                if (button) {
                    button.addEventListener(
                        'click',
                        () => {
                            actions[name]();
                            render();
                        }
                    );
                }
            });
        }

        render();
    }

    /* ---------- mounting ---------- */

    function mountAll() {
        const lineRoot = document.getElementById(
            'negative-numbers-interactive'
        );

        if (lineRoot && !lineRoot.dataset.mounted) {
            lineRoot.dataset.mounted = 'true';
            mountNumberLine(lineRoot);
        }

        const signRoot = document.getElementById(
            'sign-rules-interactive'
        );

        if (signRoot && !signRoot.dataset.mounted) {
            signRoot.dataset.mounted = 'true';
            mountSignRules(signRoot);
        }
    }

    document.addEventListener(
        'negative-numbers:roots-ready',
        mountAll
    );

    document.addEventListener(
        'maths1to9:lesson-rendered',
        mountAll
    );

    document.addEventListener(
        'lesson:rendered',
        mountAll
    );

    const mountObserver = new MutationObserver(mountAll);
    mountObserver.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    mountAll();
})();
