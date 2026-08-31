(() => {
    'use strict';

    window.Maths1to9Interactives ??= {};

    window.Maths1to9Interactives['solving-quadratic-equations'] =
        function mountSolvingQuadraticsInteractive(root) {
            if (!root) {
                return;
            }

            const hasKatex = typeof window.katex !== 'undefined';
            const hasGsap = typeof window.gsap !== 'undefined';

            let currentProblem = null;
            let currentStepIndex = 0;
            let locked = false;

            const OPTION_LABELS = {
                rearrange: 'Rearrange so one side equals zero',
                factorise: 'Factorise the quadratic',
                zeroProduct: 'Put each factor equal to zero',
                solve: 'Solve the two linear equations',
                check: 'Check the solutions'
            };

            const DISTRACTORS = {
                rearrange: [
                    'Divide every term by x',
                    'Take the square root of both sides',
                    'Factorise without rearranging'
                ],
                factorise: [
                    'Add the coefficients together',
                    'Take the square root of every term',
                    'Move the constant to the other side'
                ],
                zeroProduct: [
                    'Multiply the two brackets together',
                    'Set x equal to zero',
                    'Divide one bracket by the other'
                ],
                solve: [
                    'Multiply the two equations together',
                    'Add the two factors together',
                    'Use only the positive solution'
                ],
                check: [
                    'Change both signs',
                    'Round both answers',
                    'Choose the larger solution'
                ]
            };

            document.dispatchEvent(
                new CustomEvent('maths1to9:section-gate', {
                    detail: { sectionId: 'interactive' }
                })
            );

            injectStyles();
            renderShell();
            loadNewProblem('rearrange');

            function renderShell() {
                root.innerHTML = `
                    <section class="quadratic-interactive">
                        <header class="quadratic-interactive__header">
                            <div>
                                <p class="quadratic-interactive__eyebrow">
                                    Interactive explanation
                                </p>

                                <h2 class="quadratic-interactive__title">
                                    Solve a quadratic by factorising
                                </h2>

                                <p class="quadratic-interactive__intro">
                                    Work through the equation one decision at a
                                    time. The expression being changed will be
                                    highlighted.
                                </p>
                            </div>

                            <button
                                class="quadratic-button quadratic-button--secondary"
                                type="button"
                                data-action="new-problem"
                            >
                                New example
                            </button>
                        </header>

                        <div class="quadratic-method" aria-label="Method">
                            <div class="quadratic-method__item" data-method="rearrange">
                                <span>1</span>
                                Rearrange
                            </div>

                            <div class="quadratic-method__line"></div>

                            <div class="quadratic-method__item" data-method="factorise">
                                <span>2</span>
                                Factorise
                            </div>

                            <div class="quadratic-method__line"></div>

                            <div class="quadratic-method__item" data-method="zeroProduct">
                                <span>3</span>
                                Set factors to zero
                            </div>

                            <div class="quadratic-method__line"></div>

                            <div class="quadratic-method__item" data-method="solve">
                                <span>4</span>
                                Solve
                            </div>
                        </div>

                        <div class="quadratic-workspace">
                            <aside class="quadratic-explanation">
                                <p class="quadratic-explanation__label">
                                    What are we doing?
                                </p>

                                <h3
                                    class="quadratic-explanation__title"
                                    data-role="explanation-title"
                                ></h3>

                                <p
                                    class="quadratic-explanation__body"
                                    data-role="explanation-body"
                                ></p>

                                <div
                                    class="quadratic-rule"
                                    data-role="rule"
                                ></div>
                            </aside>

                            <main class="quadratic-board">
                                <p class="quadratic-board__label">
                                    Current equation
                                </p>

                                <div
                                    class="quadratic-current-equation"
                                    data-role="current-equation"
                                    aria-live="polite"
                                ></div>

                                <div
                                    class="quadratic-working"
                                    data-role="working"
                                ></div>
                            </main>
                        </div>

                        <section class="quadratic-question">
                            <p class="quadratic-question__label">
                                What should we do next?
                            </p>

                            <div
                                class="quadratic-options"
                                data-role="options"
                            ></div>

                            <div
                                class="quadratic-feedback"
                                data-role="feedback"
                                aria-live="polite"
                            ></div>

                            <div class="quadratic-controls">
                                <button
                                    class="quadratic-button quadratic-button--secondary"
                                    type="button"
                                    data-action="hint"
                                >
                                    Hint
                                </button>

                            </div>
                        </section>
                    </section>
                `;

                root.addEventListener('click', handleClick);
            }

            function handleClick(event) {
                const option = event.target.closest('[data-option]');
                const action = event.target.closest('[data-action]');

                if (option) {
                    checkOption(option);
                    return;
                }

                if (!action) {
                    return;
                }

                switch (action.dataset.action) {
                    case 'new-problem':
                        loadNewProblem();
                        break;

                    case 'hint':
                        showHint();
                        break;

                    case 'continue':
                        continueToNextStep();
                        break;
                }
            }

            function clearFooterAction() {
                window.Maths1to9Lesson
                    ?.clearSectionAction?.('interactive');

                const button = root.querySelector(
                    '[data-action="continue"], ' +
                    '[data-action="new-problem"].quadratic-button--primary'
                );

                if (button) {
                    button.hidden = true;
                    button.textContent = 'Continue';
                    button.dataset.action = 'continue';
                }
            }

            function showFooterAction(
                label,
                fallbackAction,
                onClick
            ) {
                const button = root.querySelector(
                    '[data-action="continue"], ' +
                    '[data-action="new-problem"].quadratic-button--primary'
                );

                if (
                    window.Maths1to9Lesson
                        ?.setSectionAction?.('interactive', {
                            label,
                            disabled: false,
                            onClick
                        })
                ) {
                    if (button) {
                        button.hidden = true;
                    }

                    return;
                }

                if (button) {
                    button.hidden = false;
                    button.textContent = label;
                    button.dataset.action = fallbackAction;
                }
            }

            function loadNewProblem(forcedType = null) {
                currentProblem = createProblem(forcedType);
                currentStepIndex = 0;
                locked = false;

                const working = getElement('working');
                working.innerHTML = '';

                renderCurrentStep();

                if (hasGsap) {
                    window.gsap.fromTo(
                        root.querySelector('.quadratic-workspace'),
                        {
                            opacity: 0,
                            y: 14
                        },
                        {
                            opacity: 1,
                            y: 0,
                            duration: 0.35,
                            ease: 'power2.out'
                        }
                    );
                }
            }

            function renderCurrentStep() {
                const step = currentProblem.steps[currentStepIndex];

                locked = false;

                renderMath(
                    getElement('current-equation'),
                    step.before,
                    true
                );

                getElement('explanation-title').textContent = step.heading;
                getElement('explanation-body').textContent = step.introduction;

                renderRule(step.rule);
                renderOptions(step.action);
                clearFeedback();
                updateMethodBar(step.action);

                clearFooterAction();
            }

            function renderRule(rule) {
                const ruleElement = getElement('rule');

                ruleElement.innerHTML = `
                    <span class="quadratic-rule__label">Remember</span>
                    <span class="quadratic-rule__text"></span>
                `;

                ruleElement.querySelector(
                    '.quadratic-rule__text'
                ).textContent = rule;
            }

            function renderOptions(correctAction) {
                const optionsElement = getElement('options');

                const answers = shuffle([
                    {
                        action: correctAction,
                        label: OPTION_LABELS[correctAction],
                        correct: true
                    },
                    ...pickRandom(
                        DISTRACTORS[correctAction],
                        3
                    ).map((label) => ({
                        action: 'incorrect',
                        label,
                        correct: false
                    }))
                ]);

                optionsElement.innerHTML = answers
                    .map((answer, index) => `
                        <button
                            class="quadratic-option"
                            type="button"
                            data-option="${answer.action}"
                            data-correct="${answer.correct}"
                        >
                            <span class="quadratic-option__letter">
                                ${String.fromCharCode(65 + index)}
                            </span>

                            <span>${escapeHtml(answer.label)}</span>
                        </button>
                    `)
                    .join('');
            }

            function checkOption(option) {
                if (locked) {
                    return;
                }

                const isCorrect = option.dataset.correct === 'true';

                if (!isCorrect) {
                    option.classList.add('quadratic-option--incorrect');

                    showFeedback(
                        'Not this time. Think about the next change needed to move the equation towards two values of x.',
                        'incorrect'
                    );

                    animateWrong(option);
                    return;
                }

                locked = true;

                root.querySelectorAll('[data-option]').forEach((button) => {
                    button.disabled = true;
                });

                option.classList.add('quadratic-option--correct');

                revealStep();

                showFeedback(
                    currentProblem.steps[currentStepIndex].success,
                    'correct'
                );

                showFooterAction(
                    'Continue',
                    'continue',
                    continueToNextStep
                );
            }

            function revealStep() {
                const step = currentProblem.steps[currentStepIndex];
                const working = getElement('working');

                const row = document.createElement('div');
                row.className = 'quadratic-working__row';

                row.innerHTML = `
                    <div class="quadratic-working__number">
                        ${currentStepIndex + 1}
                    </div>

                    <div class="quadratic-working__content">
                        <p class="quadratic-working__reason">
                            ${escapeHtml(step.reason)}
                        </p>

                        <div class="quadratic-working__math"></div>
                    </div>
                `;

                renderMath(
                    row.querySelector('.quadratic-working__math'),
                    step.after,
                    true
                );

                working.appendChild(row);

                renderMath(
                    getElement('current-equation'),
                    step.after,
                    true
                );

                if (hasGsap) {
                    const timeline = window.gsap.timeline();

                    timeline
                        .fromTo(
                            row,
                            {
                                opacity: 0,
                                y: 16
                            },
                            {
                                opacity: 1,
                                y: 0,
                                duration: 0.35,
                                ease: 'power2.out'
                            }
                        )
                        .fromTo(
                            getElement('current-equation'),
                            {
                                backgroundColor: 'rgba(255, 221, 87, 0.9)',
                                scale: 1.025
                            },
                            {
                                backgroundColor: 'rgba(255, 255, 255, 0)',
                                scale: 1,
                                duration: 0.65,
                                ease: 'power2.out'
                            },
                            0
                        );
                }
            }

            function continueToNextStep() {
                if (currentStepIndex >= currentProblem.steps.length - 1) {
                    showCompletedState();
                    return;
                }

                currentStepIndex += 1;
                renderCurrentStep();

                if (hasGsap) {
                    window.gsap.fromTo(
                        '.quadratic-question',
                        {
                            opacity: 0,
                            y: 10
                        },
                        {
                            opacity: 1,
                            y: 0,
                            duration: 0.3
                        }
                    );
                }
            }

            function showCompletedState() {
                const { root1, root2 } = currentProblem;

                getElement('explanation-title').textContent =
                    'The quadratic has been solved';

                getElement('explanation-body').textContent =
                    'A quadratic can have two solutions because either factor can equal zero.';

                renderMath(
                    getElement('rule'),
                    solutionSetLatex(root1, root2),
                    true
                );

                getElement('options').innerHTML = `
                    <div class="quadratic-complete">
                        <span class="quadratic-complete__tick">✓</span>

                        <div>
                            <strong>Example complete</strong>
                            <p>
                                Substitute both answers into the original
                                equation to confirm that they work.
                            </p>
                        </div>
                    </div>
                `;

                clearFeedback();

                document.dispatchEvent(
                    new CustomEvent('maths1to9:section-complete', {
                        detail: { sectionId: 'interactive' }
                    })
                );

                showFooterAction(
                    'Try another example',
                    'new-problem',
                    () => loadNewProblem()
                );

                updateMethodBar('complete');

                if (hasGsap) {
                    window.gsap.fromTo(
                        '.quadratic-complete',
                        {
                            opacity: 0,
                            scale: 0.96
                        },
                        {
                            opacity: 1,
                            scale: 1,
                            duration: 0.4,
                            ease: 'back.out(1.5)'
                        }
                    );
                }
            }

            function showHint() {
                const step = currentProblem.steps[currentStepIndex];

                showFeedback(step.hint, 'hint');

                const correctOption = root.querySelector(
                    '[data-correct="true"]'
                );

                if (correctOption && hasGsap) {
                    window.gsap.fromTo(
                        correctOption,
                        {
                            x: -3
                        },
                        {
                            x: 3,
                            repeat: 3,
                            yoyo: true,
                            duration: 0.09,
                            clearProps: 'transform'
                        }
                    );
                }
            }

            function showFeedback(message, type) {
                const feedback = getElement('feedback');

                feedback.className =
                    `quadratic-feedback quadratic-feedback--${type}`;

                feedback.textContent = message;
            }

            function clearFeedback() {
                const feedback = getElement('feedback');

                feedback.className = 'quadratic-feedback';
                feedback.textContent = '';
            }

            function updateMethodBar(action) {
                const order = [
                    'rearrange',
                    'factorise',
                    'zeroProduct',
                    'solve'
                ];

                const currentPosition = order.indexOf(action);

                root.querySelectorAll('[data-method]').forEach((item) => {
                    const itemPosition = order.indexOf(item.dataset.method);

                    item.classList.toggle(
                        'quadratic-method__item--active',
                        item.dataset.method === action
                    );

                    item.classList.toggle(
                        'quadratic-method__item--complete',
                        action === 'complete' ||
                        (
                            currentPosition !== -1 &&
                            itemPosition < currentPosition
                        )
                    );
                });
            }

            function createProblem(forcedType = null) {
                const types = [
                    'rearrange',
                    'trinomial',
                    'common-factor',
                    'difference-of-squares'
                ];

                const type = forcedType || randomItem(types);

                switch (type) {
                    case 'common-factor':
                        return createCommonFactorProblem();

                    case 'difference-of-squares':
                        return createDifferenceOfSquaresProblem();

                    case 'trinomial':
                        return createTrinomialProblem();

                    default:
                        return createRearrangementProblem();
                }
            }

            function createRearrangementProblem() {
                let root1;
                let root2;

                do {
                    root1 = randomNonZeroInteger(-8, 8);
                    root2 = randomNonZeroInteger(-8, 8);
                } while (
                    root1 === root2 ||
                    Math.abs(root1 + root2) > 9
                );

                const b = -(root1 + root2);
                const c = root1 * root2;

                let rightSide = randomNonZeroInteger(-8, 8);

                if (rightSide === c) {
                    rightSide += rightSide > 0 ? 1 : -1;
                }

                const leftConstant = c + rightSide;

                const original = `${polynomialLatex(1, b, leftConstant)} = ${rightSide}`;
                const zeroForm = `${polynomialLatex(1, b, c)} = 0`;
                const factors = factorisedLatex(root1, root2);
                const factorEquations = factorEquationsLatex(root1, root2);
                const answers = solutionsLatex(root1, root2);

                return {
                    type: 'rearrange',
                    root1,
                    root2,
                    steps: [
                        {
                            action: 'rearrange',
                            heading: 'First, get zero on one side',
                            introduction:
                                'Factorising solves an equation most clearly when one side is zero.',
                            before: original,
                            after: zeroForm,
                            reason:
                                `Subtract ${formatSignedValue(rightSide)} from both sides.`,
                            rule:
                                'Before factorising, rearrange the equation into the form ax² + bx + c = 0.',
                            hint:
                                'Look at the right-hand side. We need to make it equal zero.',
                            success:
                                'Correct. Both sides were changed equally, so the equation remains balanced.'
                        },
                        ...factorisationSteps(
                            zeroForm,
                            factors,
                            factorEquations,
                            answers,
                            root1,
                            root2,
                            b,
                            c
                        )
                    ]
                };
            }

            function createTrinomialProblem() {
                let root1;
                let root2;

                do {
                    root1 = randomNonZeroInteger(-9, 9);
                    root2 = randomNonZeroInteger(-9, 9);
                } while (
                    root1 === root2 ||
                    Math.abs(root1 + root2) > 10
                );

                const b = -(root1 + root2);
                const c = root1 * root2;

                const zeroForm = `${polynomialLatex(1, b, c)} = 0`;
                const factors = factorisedLatex(root1, root2);
                const factorEquations = factorEquationsLatex(root1, root2);
                const answers = solutionsLatex(root1, root2);

                return {
                    type: 'trinomial',
                    root1,
                    root2,
                    steps: factorisationSteps(
                        zeroForm,
                        factors,
                        factorEquations,
                        answers,
                        root1,
                        root2,
                        b,
                        c
                    )
                };
            }

            function createCommonFactorProblem() {
                const commonFactor = randomInteger(2, 6);
                const secondRoot = randomNonZeroInteger(-8, 8);
                const b = -commonFactor * secondRoot;

                const original = `${
                    coefficientLatex(commonFactor, 'x^2')
                } ${signedTermLatex(b, 'x')} = 0`;

                const bracketConstant = -secondRoot;

                const factors =
                    `${commonFactor}x${linearFactorLatex(bracketConstant)} = 0`;

                const factorEquations =
                    `${commonFactor}x = 0 \\quad \\text{or} \\quad ${
                        linearExpressionLatex(bracketConstant)
                    } = 0`;

                const answers = solutionsLatex(0, secondRoot);

                return {
                    type: 'common-factor',
                    root1: 0,
                    root2: secondRoot,
                    steps: [
                        {
                            action: 'factorise',
                            heading: 'Look for a common factor first',
                            introduction:
                                'Both terms contain a numerical factor and x.',
                            before: original,
                            after: factors,
                            reason:
                                `Take ${commonFactor}x outside a single pair of brackets.`,
                            rule:
                                'Always check for a highest common factor before using double brackets.',
                            hint:
                                'What factor divides both terms and also contains x?',
                            success:
                                'Correct. Taking out the common factor gives a product equal to zero.'
                        },
                        {
                            action: 'zeroProduct',
                            heading: 'Use the zero-product rule',
                            introduction:
                                'If two factors multiply to make zero, at least one factor must be zero.',
                            before: factors,
                            after: factorEquations,
                            reason:
                                'Put each factor equal to zero.',
                            rule:
                                'If A × B = 0, then A = 0 or B = 0.',
                            hint:
                                'Separate the expression into its two factors.',
                            success:
                                'Correct. Each factor now gives a linear equation.'
                        },
                        {
                            action: 'solve',
                            heading: 'Solve each equation',
                            introduction:
                                'Each linear equation gives one possible value of x.',
                            before: factorEquations,
                            after: answers,
                            reason:
                                'Solve both equations separately.',
                            rule:
                                'Do not stop after finding only one solution.',
                            hint:
                                'Solve the equation containing x, then solve the bracket.',
                            success:
                                'Correct. These are the two solutions of the quadratic.'
                        },
                        createCheckStep(
                            original,
                            answers,
                            0,
                            secondRoot
                        )
                    ]
                };
            }

            function createDifferenceOfSquaresProblem() {
                const squareRoot = randomInteger(2, 12);
                const square = squareRoot ** 2;

                const original = `x^2 - ${square} = 0`;
                const factors =
                    `(x + ${squareRoot})(x - ${squareRoot}) = 0`;

                const factorEquations =
                    `x + ${squareRoot} = 0 \\quad \\text{or} \\quad ` +
                    `x - ${squareRoot} = 0`;

                const answers = solutionsLatex(
                    -squareRoot,
                    squareRoot
                );

                return {
                    type: 'difference-of-squares',
                    root1: -squareRoot,
                    root2: squareRoot,
                    steps: [
                        {
                            action: 'factorise',
                            heading: 'Recognise a difference of two squares',
                            introduction:
                                `Both x² and ${square} are square terms, with a subtraction sign between them.`,
                            before: original,
                            after: factors,
                            reason:
                                `Use a² − b² = (a + b)(a − b), where b = ${squareRoot}.`,
                            rule:
                                'A difference of two squares factorises as (a + b)(a − b).',
                            hint:
                                `Find the positive square root of ${square}.`,
                            success:
                                'Correct. The two brackets contain the same terms with opposite signs.'
                        },
                        {
                            action: 'zeroProduct',
                            heading: 'Put each factor equal to zero',
                            introduction:
                                'The product is zero, so either bracket can equal zero.',
                            before: factors,
                            after: factorEquations,
                            reason:
                                'Apply the zero-product rule.',
                            rule:
                                'If two factors multiply to zero, one or both factors must equal zero.',
                            hint:
                                'Write one equation for each bracket.',
                            success:
                                'Correct. There are now two linear equations.'
                        },
                        {
                            action: 'solve',
                            heading: 'Solve both equations',
                            introduction:
                                'The solutions have the same size but opposite signs.',
                            before: factorEquations,
                            after: answers,
                            reason:
                                'Isolate x in each equation.',
                            rule:
                                'Difference-of-squares equations usually give a positive and negative solution.',
                            hint:
                                'Undo + and − separately.',
                            success:
                                'Correct. Both values make the original equation true.'
                        },
                        createCheckStep(
                            original,
                            answers,
                            -squareRoot,
                            squareRoot
                        )
                    ]
                };
            }

            function factorisationSteps(
                zeroForm,
                factors,
                factorEquations,
                answers,
                root1,
                root2,
                b,
                c
            ) {
                return [
                    {
                        action: 'factorise',
                        heading: 'Factorise the quadratic',
                        introduction:
                            'Find two numbers whose product is the constant term and whose sum is the coefficient of x.',
                        before: zeroForm,
                        after: factors,
                        reason:
                            `${formatNumber(-root1)} × ${formatNumber(-root2)} = ` +
                            `${formatNumber(c)} and ` +
                            `${formatNumber(-root1)} + ${formatNumber(-root2)} = ` +
                            `${formatNumber(b)}.`,
                        rule:
                            'For x² + bx + c, find two numbers that multiply to c and add to b.',
                        hint:
                            `Find two integers that multiply to ${c} and add to ${b}.`,
                        success:
                            'Correct. Multiplying the brackets would recreate the original quadratic.'
                    },
                    {
                        action: 'zeroProduct',
                        heading: 'Put each factor equal to zero',
                        introduction:
                            'The brackets multiply to zero, so either bracket may be zero.',
                        before: factors,
                        after: factorEquations,
                        reason:
                            'Apply the zero-product rule to the two factors.',
                        rule:
                            'If A × B = 0, then A = 0 or B = 0.',
                        hint:
                            'Separate the two brackets and put each one equal to zero.',
                        success:
                            'Correct. The quadratic has become two linear equations.'
                    },
                    {
                        action: 'solve',
                        heading: 'Solve both linear equations',
                        introduction:
                            'Each factor produces one possible value of x.',
                        before: factorEquations,
                        after: answers,
                        reason:
                            'Undo the addition or subtraction in each equation.',
                        rule:
                            'Solve both factors. A quadratic may have two solutions.',
                        hint:
                            'Move the constant in each equation to the other side.',
                        success:
                            'Correct. Both values are solutions.'
                    },
                    createCheckStep(
                        zeroForm,
                        answers,
                        root1,
                        root2
                    )
                ];
            }

            function createCheckStep(
                original,
                answers,
                root1,
                root2
            ) {
                return {
                    action: 'check',
                    heading: 'Check both solutions',
                    introduction:
                        'Substitute each value into the original equation.',
                    before: answers,
                    after:
                        `${substitutionLatex(root1)} \\quad \\checkmark ` +
                        `\\qquad ${substitutionLatex(root2)} \\quad \\checkmark`,
                    reason:
                        'Both substitutions make the left and right sides equal.',
                    rule:
                        'A value is a solution only if it satisfies the original equation.',
                    hint:
                        'Replace x with each answer and evaluate the equation.',
                    success:
                        'Correct. Checking confirms that neither solution was lost or given the wrong sign.'
                };
            }

            function factorisedLatex(root1, root2) {
                return `${factorFromRootLatex(root1)}${
                    factorFromRootLatex(root2)
                } = 0`;
            }

            function factorEquationsLatex(root1, root2) {
                return `${expressionFromRootLatex(root1)} = 0` +
                    ` \\quad \\text{or} \\quad ` +
                    `${expressionFromRootLatex(root2)} = 0`;
            }

            function solutionsLatex(root1, root2) {
                return `x = ${formatNumber(root1)}` +
                    ` \\quad \\text{or} \\quad ` +
                    `x = ${formatNumber(root2)}`;
            }

            function solutionSetLatex(root1, root2) {
                return `\\boxed{x = ${formatNumber(root1)}}` +
                    ` \\qquad ` +
                    `\\boxed{x = ${formatNumber(root2)}}`;
            }

            function factorFromRootLatex(rootValue) {
                if (rootValue < 0) {
                    return `(x + ${Math.abs(rootValue)})`;
                }

                return `(x - ${rootValue})`;
            }

            function expressionFromRootLatex(rootValue) {
                if (rootValue < 0) {
                    return `x + ${Math.abs(rootValue)}`;
                }

                return `x - ${rootValue}`;
            }

            function linearFactorLatex(constant) {
                if (constant > 0) {
                    return `(x + ${constant})`;
                }

                if (constant < 0) {
                    return `(x - ${Math.abs(constant)})`;
                }

                return 'x';
            }

            function linearExpressionLatex(constant) {
                if (constant > 0) {
                    return `x + ${constant}`;
                }

                if (constant < 0) {
                    return `x - ${Math.abs(constant)}`;
                }

                return 'x';
            }

            function polynomialLatex(a, b, c) {
                const terms = [];

                if (a === 1) {
                    terms.push('x^2');
                } else if (a === -1) {
                    terms.push('-x^2');
                } else {
                    terms.push(`${a}x^2`);
                }

                if (b !== 0) {
                    terms.push(signedTermLatex(b, 'x'));
                }

                if (c !== 0) {
                    terms.push(
                        c > 0 ? `+ ${c}` : `- ${Math.abs(c)}`
                    );
                }

                return terms.join(' ');
            }

            function coefficientLatex(coefficient, variable) {
                if (coefficient === 1) {
                    return variable;
                }

                if (coefficient === -1) {
                    return `-${variable}`;
                }

                return `${coefficient}${variable}`;
            }

            function signedTermLatex(coefficient, variable) {
                const sign = coefficient > 0 ? '+' : '-';
                const magnitude = Math.abs(coefficient);

                return `${sign} ${
                    magnitude === 1 ? '' : magnitude
                }${variable}`;
            }

            function substitutionLatex(value) {
                return `x = ${formatNumber(value)}`;
            }

            function renderMath(element, latex, displayMode = false) {
                if (!element) {
                    return;
                }

                if (hasKatex) {
                    try {
                        window.katex.render(latex, element, {
                            displayMode,
                            throwOnError: false,
                            strict: false
                        });

                        return;
                    } catch (error) {
                        console.error('KaTeX rendering failed:', error);
                    }
                }

                element.textContent = latex
                    .replaceAll('\\quad', ' ')
                    .replaceAll('\\text{or}', 'or')
                    .replaceAll('\\boxed', '')
                    .replaceAll('{', '')
                    .replaceAll('}', '')
                    .replaceAll('^2', '²');
            }

            function animateWrong(element) {
                if (!hasGsap) {
                    return;
                }

                window.gsap.fromTo(
                    element,
                    {
                        x: -5
                    },
                    {
                        x: 5,
                        repeat: 3,
                        yoyo: true,
                        duration: 0.07,
                        clearProps: 'transform'
                    }
                );
            }

            function getElement(role) {
                return root.querySelector(`[data-role="${role}"]`);
            }

            function randomInteger(min, max) {
                return Math.floor(
                    Math.random() * (max - min + 1)
                ) + min;
            }

            function randomNonZeroInteger(min, max) {
                let value = 0;

                while (value === 0) {
                    value = randomInteger(min, max);
                }

                return value;
            }

            function randomItem(items) {
                return items[
                    Math.floor(Math.random() * items.length)
                ];
            }

            function shuffle(items) {
                const copy = [...items];

                for (let index = copy.length - 1; index > 0; index -= 1) {
                    const target = Math.floor(
                        Math.random() * (index + 1)
                    );

                    [copy[index], copy[target]] = [
                        copy[target],
                        copy[index]
                    ];
                }

                return copy;
            }

            function pickRandom(items, amount) {
                return shuffle(items).slice(0, amount);
            }

            function formatNumber(value) {
                return value < 0 ? `-${Math.abs(value)}` : String(value);
            }

            function formatSignedValue(value) {
                return value < 0
                    ? `negative ${Math.abs(value)}`
                    : String(value);
            }

            function escapeHtml(value) {
                return String(value)
                    .replaceAll('&', '&amp;')
                    .replaceAll('<', '&lt;')
                    .replaceAll('>', '&gt;')
                    .replaceAll('"', '&quot;')
                    .replaceAll("'", '&#039;');
            }

            function injectStyles() {
                if (
                    document.querySelector(
                        '[data-quadratic-interactive-styles]'
                    )
                ) {
                    return;
                }

                const style = document.createElement('style');

                style.dataset.quadraticInteractiveStyles = 'true';

                style.textContent = `
                    .quadratic-interactive {
                        --quadratic-ink: #17233c;
                        --quadratic-muted: #63708a;
                        --quadratic-border: #dce2ec;
                        --quadratic-blue: #1677d2;
                        --quadratic-blue-soft: #edf6ff;
                        --quadratic-green: #14835f;
                        --quadratic-green-soft: #e9f8f2;
                        --quadratic-red: #b64040;
                        --quadratic-red-soft: #fff0f0;
                        --quadratic-yellow: #fff7d6;
                        color: var(--quadratic-ink);
                        width: 100%;
                    }

                    .quadratic-interactive *,
                    .quadratic-interactive *::before,
                    .quadratic-interactive *::after {
                        box-sizing: border-box;
                    }

                    .quadratic-interactive__header {
                        align-items: flex-start;
                        display: flex;
                        gap: 24px;
                        justify-content: space-between;
                        margin-bottom: 28px;
                    }

                    .quadratic-interactive__eyebrow,
                    .quadratic-board__label,
                    .quadratic-question__label,
                    .quadratic-explanation__label {
                        color: var(--quadratic-blue);
                        font-size: 0.75rem;
                        font-weight: 800;
                        letter-spacing: 0.08em;
                        margin: 0 0 8px;
                        text-transform: uppercase;
                    }

                    .quadratic-interactive__title {
                        font-size: clamp(1.55rem, 4vw, 2.2rem);
                        line-height: 1.12;
                        margin: 0;
                    }

                    .quadratic-interactive__intro {
                        color: var(--quadratic-muted);
                        line-height: 1.6;
                        margin: 10px 0 0;
                        max-width: 650px;
                    }

                    .quadratic-method {
                        align-items: center;
                        display: flex;
                        margin-bottom: 28px;
                        overflow-x: auto;
                        padding-bottom: 4px;
                    }

                    .quadratic-method__item {
                        align-items: center;
                        color: var(--quadratic-muted);
                        display: flex;
                        flex: 0 0 auto;
                        font-size: 0.82rem;
                        font-weight: 700;
                        gap: 8px;
                    }

                    .quadratic-method__item span {
                        align-items: center;
                        background: #eef1f6;
                        border-radius: 50%;
                        display: inline-flex;
                        height: 28px;
                        justify-content: center;
                        width: 28px;
                    }

                    .quadratic-method__item--active {
                        color: var(--quadratic-blue);
                    }

                    .quadratic-method__item--active span {
                        background: var(--quadratic-blue);
                        color: white;
                    }

                    .quadratic-method__item--complete {
                        color: var(--quadratic-green);
                    }

                    .quadratic-method__item--complete span {
                        background: var(--quadratic-green);
                        color: white;
                    }

                    .quadratic-method__line {
                        background: var(--quadratic-border);
                        flex: 1 0 30px;
                        height: 2px;
                        margin: 0 10px;
                        min-width: 30px;
                    }

                    .quadratic-workspace {
                        display: grid;
                        gap: 20px;
                        grid-template-columns: minmax(220px, 0.8fr) minmax(0, 1.7fr);
                    }

                    .quadratic-explanation,
                    .quadratic-board,
                    .quadratic-question {
                        border: 1px solid var(--quadratic-border);
                        border-radius: 18px;
                    }

                    .quadratic-explanation {
                        background: var(--quadratic-blue-soft);
                        padding: 24px;
                    }

                    .quadratic-explanation__title {
                        font-size: 1.25rem;
                        line-height: 1.25;
                        margin: 0 0 12px;
                    }

                    .quadratic-explanation__body {
                        color: var(--quadratic-muted);
                        line-height: 1.55;
                        margin: 0;
                    }

                    .quadratic-rule {
                        background: white;
                        border-left: 4px solid var(--quadratic-blue);
                        border-radius: 10px;
                        display: grid;
                        gap: 5px;
                        margin-top: 22px;
                        padding: 14px;
                    }

                    .quadratic-rule__label {
                        color: var(--quadratic-blue);
                        font-size: 0.7rem;
                        font-weight: 800;
                        letter-spacing: 0.08em;
                        text-transform: uppercase;
                    }

                    .quadratic-rule__text {
                        font-size: 0.9rem;
                        line-height: 1.45;
                    }

                    .quadratic-board {
                        background:
                            linear-gradient(#ffffffee, #ffffffee),
                            repeating-linear-gradient(
                                0deg,
                                transparent,
                                transparent 27px,
                                #e8edf5 28px
                            );
                        min-height: 350px;
                        padding: 24px;
                    }

                    .quadratic-current-equation {
                        border-bottom: 1px solid var(--quadratic-border);
                        font-size: clamp(1.15rem, 3vw, 1.65rem);
                        min-height: 82px;
                        padding: 10px 8px 22px;
                        transform-origin: center;
                    }

                    .quadratic-working {
                        display: grid;
                        gap: 12px;
                        padding-top: 20px;
                    }

                    .quadratic-working__row {
                        align-items: flex-start;
                        display: grid;
                        gap: 14px;
                        grid-template-columns: 30px minmax(0, 1fr);
                    }

                    .quadratic-working__number {
                        align-items: center;
                        background: var(--quadratic-blue-soft);
                        border-radius: 50%;
                        color: var(--quadratic-blue);
                        display: flex;
                        font-size: 0.8rem;
                        font-weight: 800;
                        height: 30px;
                        justify-content: center;
                    }

                    .quadratic-working__content {
                        border-bottom: 1px solid #edf0f5;
                        padding: 2px 0 14px;
                    }

                    .quadratic-working__reason {
                        color: var(--quadratic-muted);
                        font-size: 0.84rem;
                        line-height: 1.45;
                        margin: 0 0 6px;
                    }

                    .quadratic-working__math {
                        font-size: 1.03rem;
                    }

                    .quadratic-question {
                        margin-top: 20px;
                        padding: 24px;
                    }

                    .quadratic-options {
                        display: grid;
                        gap: 10px;
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }

                    .quadratic-option {
                        align-items: center;
                        background: white;
                        border: 2px solid var(--quadratic-border);
                        border-radius: 14px;
                        color: var(--quadratic-ink);
                        cursor: pointer;
                        display: flex;
                        font: inherit;
                        font-weight: 700;
                        gap: 12px;
                        min-height: 64px;
                        padding: 12px 14px;
                        text-align: left;
                        transition:
                            border-color 150ms ease,
                            background-color 150ms ease,
                            transform 150ms ease;
                    }

                    .quadratic-option:hover:not(:disabled) {
                        border-color: var(--quadratic-blue);
                        transform: translateY(-1px);
                    }

                    .quadratic-option:disabled {
                        cursor: default;
                    }

                    .quadratic-option__letter {
                        align-items: center;
                        background: #f0f3f8;
                        border-radius: 9px;
                        display: flex;
                        flex: 0 0 34px;
                        height: 34px;
                        justify-content: center;
                    }

                    .quadratic-option--correct {
                        background: var(--quadratic-green-soft);
                        border-color: var(--quadratic-green);
                    }

                    .quadratic-option--correct .quadratic-option__letter {
                        background: var(--quadratic-green);
                        color: white;
                    }

                    .quadratic-option--incorrect {
                        background: var(--quadratic-red-soft);
                        border-color: var(--quadratic-red);
                    }

                    .quadratic-option--incorrect .quadratic-option__letter {
                        background: var(--quadratic-red);
                        color: white;
                    }

                    .quadratic-feedback {
                        border-radius: 10px;
                        line-height: 1.5;
                        margin-top: 14px;
                    }

                    .quadratic-feedback:not(:empty) {
                        padding: 12px 14px;
                    }

                    .quadratic-feedback--correct {
                        background: var(--quadratic-green-soft);
                        color: #0c684a;
                    }

                    .quadratic-feedback--incorrect {
                        background: var(--quadratic-red-soft);
                        color: #903030;
                    }

                    .quadratic-feedback--hint {
                        background: var(--quadratic-yellow);
                        color: #6b5814;
                    }

                    .quadratic-controls {
                        display: flex;
                        gap: 10px;
                        justify-content: flex-end;
                        margin-top: 18px;
                    }

                    .quadratic-button {
                        border: 0;
                        border-radius: 11px;
                        cursor: pointer;
                        font: inherit;
                        font-weight: 800;
                        min-height: 44px;
                        padding: 10px 17px;
                    }

                    .quadratic-button--primary {
                        background: var(--quadratic-blue);
                        color: white;
                    }

                    .quadratic-button--secondary {
                        background: #eef2f7;
                        color: var(--quadratic-ink);
                    }

                    .quadratic-complete {
                        align-items: center;
                        background: var(--quadratic-green-soft);
                        border: 1px solid #a9dfcc;
                        border-radius: 14px;
                        display: flex;
                        gap: 14px;
                        grid-column: 1 / -1;
                        padding: 18px;
                    }

                    .quadratic-complete__tick {
                        align-items: center;
                        background: var(--quadratic-green);
                        border-radius: 50%;
                        color: white;
                        display: flex;
                        flex: 0 0 42px;
                        font-size: 1.25rem;
                        height: 42px;
                        justify-content: center;
                    }

                    .quadratic-complete p {
                        color: var(--quadratic-muted);
                        margin: 4px 0 0;
                    }

                    @media (max-width: 760px) {
                        .quadratic-interactive__header {
                            display: grid;
                        }

                        .quadratic-workspace {
                            grid-template-columns: 1fr;
                        }

                        .quadratic-options {
                            grid-template-columns: 1fr;
                        }

                        .quadratic-method__item {
                            font-size: 0;
                        }

                        .quadratic-method__item span {
                            font-size: 0.82rem;
                        }
                    }

                    @media (prefers-reduced-motion: reduce) {
                        .quadratic-interactive *,
                        .quadratic-interactive *::before,
                        .quadratic-interactive *::after {
                            scroll-behavior: auto !important;
                            transition-duration: 0.01ms !important;
                        }
                    }
                `;

                document.head.appendChild(style);
            }

            return function destroy() {
                root.removeEventListener('click', handleClick);

                if (hasGsap) {
                    window.gsap.killTweensOf(
                        root.querySelectorAll('*')
                    );
                }

                root.innerHTML = '';
            };
        };
})();
