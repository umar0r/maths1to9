(() => {
    'use strict';

    mountLearnSection();
    mountMethodSection();

    function mountLearnSection() {
        const root = document.getElementById('pie-chart-lesson');

        if (!root) {
            return;
        }

        const state = {
            stepIndex: 0,
            selectedAnswer: '',
            answerChecked: false
        };

        const steps = [
            {
                type: 'intro',
                text:
                    'A pie chart is a way to represent data using a circle. ' +
                    'Each slice is proportional to the amount it represents.'
            },
            {
                type: 'friends',
                text:
                    'Four friends are in a room. One wears blue. ' +
                    'Three wear green.'
            },
            {
                type: 'whole',
                text:
                    'Draw a circle. The circle means “everyone in the room”.'
            },
            {
                type: 'quarters',
                text:
                    'Cut it into 4 equal parts, one part per person.'
            },
            {
                type: 'coloured-pie',
                text:
                    'Colour 1 part blue and 3 parts green.'
            },
            {
                type: 'meaning',
                text:
                    'This picture is called a pie chart. ' +
                    'The circle is the whole group. ' +
                    'Each slice is a share of the group.'
            },
            {
                type: 'check',
                text:
                    '2 of the 4 friends wear red instead. ' +
                    'How much of the circle is red?'
            }
        ];

        function render() {
            const step = steps[state.stepIndex];
            const isFinalStep = state.stepIndex === steps.length - 1;

            root.innerHTML = `
                <div style="max-width: 760px; margin: 0 auto; text-align: center;">
                    <div style="margin-bottom: 18px;">
                        <span
                            style="
                                display: inline-block;
                                padding: 6px 12px;
                                border: 2px solid #202020;
                                border-radius: 999px;
                                font-weight: 700;
                                background: #ffffff;
                            "
                        >
                            Learn
                        </span>
                    </div>

                    <p
                        style="
                            margin: 0 auto 28px;
                            font-size: clamp(1.2rem, 3vw, 1.65rem);
                            font-weight: 750;
                            line-height: 1.5;
                        "
                    >
                        ${escapeHtml(step.text)}
                    </p>

                    <div
                        id="pie-chart-visual"
                        style="
                            display: grid;
                            min-height: 310px;
                            place-items: center;
                            margin: 0 auto;
                        "
                    >
                        ${renderLearnVisual(step.type)}
                    </div>

                    ${isFinalStep ? renderMicroCheck(state) : ''}

                    <nav
                        aria-label="Learn controls"
                        style="
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            gap: 12px;
                            margin-top: 30px;
                        "
                    >
                        ${isFinalStep ? '' : `
                            <button
                                class="button button--primary"
                                id="continue-step"
                                type="button"
                            >
                                Continue
                            </button>
                        `}
                    </nav>
                </div>
            `;

            bindLearnControls();
            animateLearnVisual(step.type);
        }

        function bindLearnControls() {
            const continueButton = root.querySelector('#continue-step');
            const checkButton = root.querySelector('#check-answer');

            continueButton?.addEventListener('click', () => {
                state.stepIndex += 1;
                render();
            });

            root.querySelectorAll('input[name="red-circle-answer"]').forEach(input => {
                input.addEventListener('change', event => {
                    state.selectedAnswer = event.target.value;
                });
            });

            checkButton?.addEventListener('click', () => {
                const feedback = root.querySelector('#answer-feedback');

                if (!state.selectedAnswer) {
                    feedback.style.display = 'block';
                    feedback.className = 'question-feedback is-incorrect';
                    feedback.textContent = 'Choose an answer first.';
                    return;
                }

                if (state.selectedAnswer !== 'One half') {
                    feedback.style.display = 'block';
                    feedback.className = 'question-feedback is-incorrect';
                    feedback.textContent =
                        'Not quite. Count the red friends: 2 out of 4.';
                    return;
                }

                state.answerChecked = true;
                render();
                colourHalfRed(root);
            });
        }

        render();
    }

    function mountMethodSection() {
        const root = document.getElementById('pie-chart-method');

        if (!root) {
            return;
        }

        const state = {
            stepIndex: 0
        };

        const steps = [
            {
                title: 'Find the total',
                text:
                    'Add all the frequencies. This gives the whole group.',
                visual: 'total',
                baby:
                    'Count everyone. This tells you how many things there are altogether.'
            },
            {
                title: 'Make the share',
                text:
                    'Put the category frequency over the total frequency. This gives the category’s share of the group.',
                visual: 'share',
                baby:
                    'How many blue? Put that number on top. How many altogether? Put that number on the bottom.'
            },
            {
                title: 'Turn the share into an angle',
                text:
                    'Multiply the share by 360°. A full circle is 360°, so this gives the correct sector angle.',
                visual: 'angle',
                baby:
                    'If blue is one quarter of the people, blue needs one quarter of the circle too.'
            },
            {
                title: 'Check the angles',
                text:
                    'All the sector angles must add to 360°.',
                visual: 'check',
                baby:
                    'All the slices must fill the whole pizza. No gaps. No extra bits.'
            },
            {
                title: 'Draw the chart',
                text:
                    'Draw a radius, measure each angle from the centre, then colour and label each sector.',
                visual: 'draw',
                baby:
                    'Start in the middle. Measure the slice. Draw the line. Then do the next slice.'
            }
        ];

        function render() {
            const step = steps[state.stepIndex];
            const isFinalStep = state.stepIndex === steps.length - 1;

            root.innerHTML = `
                <div style="max-width: 840px; margin: 0 auto; text-align: center;">
                    <div style="margin-bottom: 18px;">
                        <span
                            style="
                                display: inline-block;
                                padding: 6px 12px;
                                border: 2px solid #202020;
                                border-radius: 999px;
                                font-weight: 700;
                                background: #ffffff;
                            "
                        >
                            Method
                        </span>
                    </div>

                    <p
                        style="
                            margin: 0 auto 10px;
                            font-size: .95rem;
                            font-weight: 700;
                            letter-spacing: .02em;
                            text-transform: uppercase;
                            color: #555;
                        "
                    >
                        Step ${state.stepIndex + 1} of ${steps.length}
                    </p>

                    <h2
                        style="
                            margin: 0 0 14px;
                            font-size: clamp(1.35rem, 3vw, 2rem);
                            line-height: 1.2;
                        "
                    >
                        ${escapeHtml(step.title)}
                    </h2>

                    <p
                        style="
                            max-width: 720px;
                            margin: 0 auto 28px;
                            font-size: clamp(1.05rem, 2.3vw, 1.2rem);
                            line-height: 1.6;
                        "
                    >
                        ${escapeHtml(step.text)}
                    </p>

                    <div
                        style="
                            display: grid;
                            gap: 24px;
                            align-items: start;
                        "
                    >
                        <div
                            id="method-visual"
                            style="
                                display: grid;
                                min-height: 330px;
                                place-items: center;
                                padding: 8px 0;
                            "
                        >
                            ${renderMethodVisual(step.visual)}
                        </div>

                        <div
                            style="
                                max-width: 760px;
                                margin: 0 auto;
                                padding: 18px;
                                border: 2px solid #202020;
                                border-radius: 20px;
                                text-align: left;
                                background: #fffdf8;
                                box-shadow: 0 10px 20px rgba(0, 0, 0, 0.05);
                            "
                        >
                            <p
                                style="
                                    margin: 0 0 10px;
                                    font-size: 1rem;
                                    font-weight: 800;
                                "
                            >
                                Explain it like I’m 5
                            </p>

                            <p
                                style="
                                    margin: 0;
                                    font-size: 1rem;
                                    line-height: 1.6;
                                "
                            >
                                ${escapeHtml(step.baby)}
                            </p>
                        </div>
                    </div>

                    <nav
                        aria-label="Method controls"
                        style="
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            gap: 12px;
                            margin-top: 30px;
                        "
                    >
                        ${isFinalStep ? '' : `
                            <button
                                class="button button--primary"
                                id="method-next"
                                type="button"
                            >
                                Continue
                            </button>
                        `}
                    </nav>
                </div>
            `;

            root.querySelector('#method-next')?.addEventListener('click', () => {
                state.stepIndex += 1;
                render();
            });

            animateMethodVisual(step.visual, root);
        }

        render();
    }

    function renderLearnVisual(type) {
        if (type === 'intro') {
            return renderPlainCircle();
        }

        if (type === 'friends') {
            return renderFriends(['blue', 'green', 'green', 'green']);
        }

        if (type === 'whole') {
            return renderPlainCircle();
        }

        if (type === 'quarters') {
            return renderQuarteredCircle(false);
        }

        if (type === 'coloured-pie' || type === 'meaning') {
            return renderQuarteredCircle(true);
        }

        if (type === 'check') {
            return `
                <div style="display: grid; gap: 24px; place-items: center;">
                    ${renderFriends(['red', 'red', 'green', 'green'])}
                    ${renderBlankQuarterCircle(180)}
                </div>
            `;
        }

        return '';
    }

    function renderMethodVisual(type) {
        if (type === 'total') {
            return `
                <div style="display: grid; gap: 24px; justify-items: center; width: 100%;">
                    <div style="font-size: 1.05rem; font-weight: 700;">Blue = 1 &nbsp;&nbsp; Green = 3</div>
                    <div style="display: flex; gap: 18px; align-items: center; flex-wrap: wrap; justify-content: center;">
                        <div style="padding: 16px 20px; border: 2px solid #202020; border-radius: 16px; min-width: 110px; background: #eef4ff; font-weight: 800; font-size: 1.4rem;">1</div>
                        <div style="font-size: 1.8rem; font-weight: 800;">+</div>
                        <div style="padding: 16px 20px; border: 2px solid #202020; border-radius: 16px; min-width: 110px; background: #eef9f1; font-weight: 800; font-size: 1.4rem;">3</div>
                        <div style="font-size: 1.8rem; font-weight: 800;">=</div>
                        <div style="padding: 16px 20px; border: 3px solid #202020; border-radius: 16px; min-width: 110px; background: #fff8db; font-weight: 800; font-size: 1.4rem;">4</div>
                    </div>
                    <div style="font-size: 1rem; line-height: 1.5;">
                        <strong>Total frequency</strong> = the number of items altogether.
                    </div>
                </div>
            `;
        }

        if (type === 'share') {
            return `
                <div style="display: grid; gap: 24px; justify-items: center; width: 100%;">
                    <div style="display: grid; gap: 14px; justify-items: center;">
                        <div style="font-size: 1.05rem; font-weight: 700;">For blue:</div>
                        <div style="display: grid; gap: 8px; justify-items: center;">
                            <div style="position: relative; width: min(460px, 92vw);">
                                <div style="font-size: 2.3rem; font-weight: 800; line-height: 1;">1</div>
                                <div style="position: absolute; left: calc(50% + 44px); top: 4px; font-size: 0.96rem; width: 150px; text-align: left; line-height: 1.35;">&larr; category frequency<br><span style="font-size: .9rem; color: #555;">(how many blue)</span></div>
                            </div>
                            <div style="width: 96px; border-top: 4px solid #202020;"></div>
                            <div style="position: relative; width: min(460px, 92vw);">
                                <div style="font-size: 2.3rem; font-weight: 800; line-height: 1;">4</div>
                                <div style="position: absolute; left: calc(50% + 44px); top: 4px; font-size: 0.96rem; width: 170px; text-align: left; line-height: 1.35;">&larr; total frequency<br><span style="font-size: .9rem; color: #555;">(how many altogether)</span></div>
                            </div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 20px; align-items: center; flex-wrap: wrap; justify-content: center;">
                        ${renderFriends(['blue', 'green', 'green', 'green'])}
                        <div style="font-size: 2rem; font-weight: 900;">&rarr;</div>
                        ${renderQuarteredCircle(true)}
                    </div>
                </div>
            `;
        }

        if (type === 'angle') {
            return `
                <div style="display: grid; gap: 20px; justify-items: center; width: 100%;">
                    <div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap; justify-content: center; font-size: 1.6rem; font-weight: 800;">
                        <span style="padding: 10px 16px; border: 2px solid #202020; border-radius: 16px; background: #ffffff;">1/4</span>
                        <span>&times;</span>
                        <span style="padding: 10px 16px; border: 2px solid #202020; border-radius: 16px; background: #ffffff;">360°</span>
                        <span>=</span>
                        <span style="padding: 10px 16px; border: 3px solid #202020; border-radius: 16px; background: #eef4ff;">90°</span>
                    </div>
                    <div style="font-size: 1rem; line-height: 1.5; max-width: 560px;">
                        Blue is one quarter of the group, so blue needs one quarter of the circle.
                    </div>
                    ${renderBlueQuarterWithAngle()}
                </div>
            `;
        }

        if (type === 'check') {
            return `
                <div style="display: grid; gap: 20px; justify-items: center; width: 100%;">
                    <div style="display: flex; gap: 14px; align-items: center; flex-wrap: wrap; justify-content: center; font-size: 1.5rem; font-weight: 800;">
                        <span style="padding: 10px 14px; border: 2px solid #202020; border-radius: 14px; background: #eef4ff;">Blue = 90°</span>
                        <span>+</span>
                        <span style="padding: 10px 14px; border: 2px solid #202020; border-radius: 14px; background: #eef9f1;">Green = 270°</span>
                        <span>=</span>
                        <span style="padding: 10px 14px; border: 3px solid #202020; border-radius: 14px; background: #fff8db;">360°</span>
                    </div>
                    ${renderQuarteredCircle(true)}
                </div>
            `;
        }

        if (type === 'draw') {
            return renderDrawMethodGraphic();
        }

        return '';
    }

    function renderFriends(colours) {
        const colourValues = {
            blue: '#2f6fed',
            green: '#2f9e5b',
            red: '#dc3545'
        };

        return `
            <div
                role="img"
                aria-label="Friends"
                style="
                    display: grid;
                    grid-template-columns: repeat(4, minmax(52px, 80px));
                    gap: 16px;
                    justify-content: center;
                    align-items: end;
                    width: 100%;
                    max-width: 400px;
                "
            >
                ${colours.map((colour, index) => `
                    <svg
                        class="friend-figure"
                        viewBox="0 0 80 130"
                        width="78"
                        height="126"
                        aria-label="Friend ${index + 1} wearing ${colour}"
                        role="img"
                    >
                        <circle cx="40" cy="24" r="18" fill="#f2c7a5" stroke="#202020" stroke-width="3"></circle>
                        <rect x="20" y="46" width="40" height="48" rx="8" fill="${colourValues[colour]}" stroke="#202020" stroke-width="3"></rect>
                        <line x1="29" y1="94" x2="25" y2="124" stroke="#202020" stroke-width="6" stroke-linecap="round"></line>
                        <line x1="51" y1="94" x2="55" y2="124" stroke="#202020" stroke-width="6" stroke-linecap="round"></line>
                    </svg>
                `).join('')}
            </div>
        `;
    }

    function renderPlainCircle() {
        return `
            <svg
                viewBox="0 0 260 260"
                width="260"
                height="260"
                role="img"
                aria-label="A circle representing everyone in the room"
            >
                <circle
                    id="whole-circle"
                    cx="130"
                    cy="130"
                    r="105"
                    fill="#ffffff"
                    stroke="#202020"
                    stroke-width="5"
                ></circle>
            </svg>
        `;
    }

    function renderQuarteredCircle(coloured) {
        const fills = coloured
            ? ['#2f6fed', '#2f9e5b', '#2f9e5b', '#2f9e5b']
            : ['#ffffff', '#ffffff', '#ffffff', '#ffffff'];

        return `
            <svg
                viewBox="0 0 260 260"
                width="260"
                height="260"
                role="img"
                aria-label="A circle divided into four equal slices"
            >
                <path class="pie-quarter" d="M130 130 L130 25 A105 105 0 0 1 235 130 Z" fill="${fills[0]}" stroke="#202020" stroke-width="4"></path>
                <path class="pie-quarter" d="M130 130 L235 130 A105 105 0 0 1 130 235 Z" fill="${fills[1]}" stroke="#202020" stroke-width="4"></path>
                <path class="pie-quarter" d="M130 130 L130 235 A105 105 0 0 1 25 130 Z" fill="${fills[2]}" stroke="#202020" stroke-width="4"></path>
                <path class="pie-quarter" d="M130 130 L25 130 A105 105 0 0 1 130 25 Z" fill="${fills[3]}" stroke="#202020" stroke-width="4"></path>
            </svg>
        `;
    }

    function renderBlankQuarterCircle(size) {
        return `
            <svg viewBox="0 0 180 180" width="${size}" height="${size}" role="img" aria-label="A circle divided into four equal blank slices">
                <circle cx="90" cy="90" r="72" fill="#ffffff" stroke="#202020" stroke-width="4"></circle>
                <line x1="90" y1="18" x2="90" y2="162" stroke="#202020" stroke-width="4"></line>
                <line x1="18" y1="90" x2="162" y2="90" stroke="#202020" stroke-width="4"></line>
            </svg>
        `;
    }

    function renderBlueQuarterWithAngle() {
        return `
            <svg viewBox="0 0 260 260" width="260" height="260" role="img" aria-label="A blue quarter labelled 90 degrees">
                <path d="M130 130 L130 25 A105 105 0 0 1 235 130 Z" fill="#2f6fed" stroke="#202020" stroke-width="4"></path>
                <path d="M130 130 L235 130" stroke="#202020" stroke-width="4" fill="none"></path>
                <path d="M130 130 L130 25" stroke="#202020" stroke-width="4" fill="none"></path>
                <path d="M130 78 A52 52 0 0 1 182 130" fill="none" stroke="#202020" stroke-width="3"></path>
                <text x="176" y="90" font-size="22" font-weight="800" text-anchor="middle">90°</text>
                <text x="92" y="70" font-size="18" font-weight="700" text-anchor="middle">1/4</text>
            </svg>
        `;
    }

    function renderDrawMethodGraphic() {
        return `
            <svg viewBox="0 0 700 300" width="100%" height="300" role="img" aria-label="How to draw a pie chart sector">
                <circle cx="180" cy="150" r="94" fill="#ffffff" stroke="#202020" stroke-width="4"></circle>
                <circle cx="180" cy="150" r="4" fill="#202020"></circle>
                <line x1="180" y1="150" x2="180" y2="56" stroke="#202020" stroke-width="4"></line>
                <line x1="180" y1="150" x2="274" y2="150" stroke="#202020" stroke-width="4"></line>
                <path d="M180 110 A40 40 0 0 1 220 150" fill="none" stroke="#202020" stroke-width="3"></path>
                <text x="225" y="122" font-size="18" font-weight="800">90°</text>
                <text x="180" y="40" font-size="16" font-weight="700" text-anchor="middle">Start line</text>
                <text x="298" y="154" font-size="16" font-weight="700">Next line</text>
                <line x1="395" y1="54" x2="395" y2="246" stroke="#202020" stroke-width="4"></line>
                <line x1="395" y1="54" x2="520" y2="54" stroke="#202020" stroke-width="4"></line>
                <line x1="520" y1="54" x2="520" y2="246" stroke="#202020" stroke-width="4"></line>
                <text x="458" y="34" font-size="18" font-weight="800" text-anchor="middle">Protractor</text>
                <text x="560" y="95" font-size="16">1. Put the centre on the middle.</text>
                <text x="560" y="135" font-size="16">2. Start from the last line.</text>
                <text x="560" y="175" font-size="16">3. Measure the angle.</text>
                <text x="560" y="215" font-size="16">4. Draw the next line.</text>
            </svg>
        `;
    }

    function renderMicroCheck(state) {
        const options = [
            'One quarter',
            'One half',
            'Three quarters',
            'The whole circle'
        ];

        return `
            <div style="max-width: 600px; margin: 12px auto 0;">
                <div class="question-options" role="radiogroup" aria-label="How much of the circle is red?">
                    ${options.map(option => `
                        <label class="question-option">
                            <input
                                type="radio"
                                name="red-circle-answer"
                                value="${escapeHtml(option)}"
                                ${state.selectedAnswer === option ? 'checked' : ''}
                                ${state.answerChecked ? 'disabled' : ''}
                            >
                            <span>${escapeHtml(option)}</span>
                        </label>
                    `).join('')}
                </div>

                <div style="display: flex; justify-content: center; margin-top: 18px;">
                    <button class="button button--primary" id="check-answer" type="button" ${state.answerChecked ? 'disabled' : ''}>
                        Check answer
                    </button>
                </div>

                <p
                    id="answer-feedback"
                    class="question-feedback${state.answerChecked ? ' is-correct' : ''}"
                    aria-live="polite"
                    style="${state.answerChecked ? '' : 'display: none;'}"
                >
                    ${state.answerChecked
                        ? 'Correct. 2 out of 4 is one half, so half of the circle is red.'
                        : ''}
                </p>
            </div>
        `;
    }

    function animateLearnVisual(type) {
        const root = document;

        if (type === 'friends') {
            const figures = root.querySelectorAll('.friend-figure');

            figures.forEach((figure, index) => {
                figure.animate(
                    [
                        { opacity: 0, transform: 'translateY(16px)' },
                        { opacity: 1, transform: 'translateY(0)' }
                    ],
                    {
                        duration: 320,
                        delay: index * 110,
                        easing: 'ease-out',
                        fill: 'both'
                    }
                );
            });
        }

        if (type === 'whole' || type === 'intro') {
            const circle = root.querySelector('#whole-circle');

            circle?.animate(
                [
                    { strokeDasharray: '0 660' },
                    { strokeDasharray: '660 0' }
                ],
                {
                    duration: 700,
                    easing: 'ease-out'
                }
            );
        }

        if (type === 'quarters') {
            const quarters = root.querySelectorAll('.pie-quarter');

            quarters.forEach((quarter, index) => {
                quarter.animate(
                    [
                        { opacity: 0.15 },
                        { opacity: 1 }
                    ],
                    {
                        duration: 260,
                        delay: index * 120,
                        fill: 'both'
                    }
                );
            });
        }

        if (type === 'coloured-pie' || type === 'meaning') {
            const quarters = root.querySelectorAll('.pie-quarter');

            quarters.forEach((quarter, index) => {
                quarter.animate(
                    [
                        {
                            opacity: 0,
                            transform: 'scale(0.88)',
                            transformOrigin: '130px 130px'
                        },
                        {
                            opacity: 1,
                            transform: 'scale(1)',
                            transformOrigin: '130px 130px'
                        }
                    ],
                    {
                        duration: 360,
                        delay: index * 120,
                        easing: 'ease-out',
                        fill: 'both'
                    }
                );
            });
        }
    }

    function animateMethodVisual(type, root) {
        if (type === 'total' || type === 'angle' || type === 'check') {
            root.querySelectorAll('#method-visual svg, #method-visual div > div, #method-visual div > span').forEach((node, index) => {
                if (typeof node.animate !== 'function') {
                    return;
                }

                node.animate(
                    [
                        { opacity: 0, transform: 'translateY(10px)' },
                        { opacity: 1, transform: 'translateY(0)' }
                    ],
                    {
                        duration: 280,
                        delay: index * 60,
                        easing: 'ease-out',
                        fill: 'both'
                    }
                );
            });
        }

        if (type === 'share' || type === 'draw') {
            const visual = root.querySelector('#method-visual');
            visual?.animate(
                [
                    { opacity: 0, transform: 'scale(0.97)' },
                    { opacity: 1, transform: 'scale(1)' }
                ],
                {
                    duration: 350,
                    easing: 'ease-out',
                    fill: 'both'
                }
            );
        }
    }

    function colourHalfRed(root) {
        const svg = root.querySelector('[aria-label="A circle divided into four equal blank slices"]');

        if (!svg) {
            return;
        }

        const firstHalf = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        firstHalf.setAttribute('d', 'M90 90 L90 18 A72 72 0 0 1 90 162 Z');
        firstHalf.setAttribute('fill', '#dc3545');
        firstHalf.setAttribute('stroke', '#202020');
        firstHalf.setAttribute('stroke-width', '4');

        svg.insertBefore(firstHalf, svg.children[1]);

        firstHalf.animate(
            [
                { opacity: 0 },
                { opacity: 1 }
            ],
            {
                duration: 450,
                fill: 'both'
            }
        );
    }

    function escapeHtml(value) {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }
})();
