<?php

declare(strict_types=1);

$lessonId = 'negative-numbers';
$pageTitle = 'Negative numbers';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1"
    >

    <title>
        <?= htmlspecialchars($pageTitle, ENT_QUOTES, 'UTF-8') ?>
        | Maths1to9
    </title>

    <link
        rel="preload"
        href="../../assets/fonts/Nunito-Variable.woff2"
        as="font"
        type="font/woff2"
        crossorigin
    >
    <link rel="stylesheet" href="../../assets/css/app.css">
</head>

<body
    data-lesson-id="<?= htmlspecialchars($lessonId, ENT_QUOTES, 'UTF-8') ?>"
    data-lesson-src="./lesson.json"
>
    <header class="site-header">
        <div class="site-header__inner">
            <a class="site-logo" href="../../index.php">
                <span class="site-logo__mark" aria-hidden="true">1–9</span>
                <span>Maths1to9</span>
            </a>

            <a class="site-header__back" href="../../index.php">
                All lessons
            </a>
        </div>
    </header>

    <main
        id="lesson-app"
        class="lesson-page"
        aria-live="polite"
    >
        <div
            id="lesson-loading"
            class="lesson-loading"
        >
            Loading lesson…
        </div>
    </main>

    <noscript>
        <div class="noscript-message">
            JavaScript is required to use this lesson.
        </div>
    </noscript>

    <script src="../../assets/js/progress.js"></script>

    <script>
        (() => {
            'use strict';

            function isObject(value) {
                return (
                    value !== null
                    && typeof value === 'object'
                    && !Array.isArray(value)
                );
            }

            function createElement(tagName, className = '', text = '') {
                const element = document.createElement(tagName);

                if (className) {
                    element.className = className;
                }

                if (text) {
                    element.textContent = text;
                }

                return element;
            }

            function addSignRulesInteractive(container, signData) {
                if (!isObject(signData)) {
                    return;
                }

                const card = createElement('article', 'worked-example');

                card.append(
                    createElement(
                        'p',
                        'worked-example__number',
                        signData.eyebrow || 'Explore'
                    ),
                    createElement(
                        'h3',
                        'worked-example__title',
                        signData.title || 'What do the signs change?'
                    )
                );

                if (signData.intro) {
                    card.append(
                        createElement(
                            'p',
                            'lesson-section__intro',
                            signData.intro
                        )
                    );
                }

                const root = document.createElement('div');
                root.id = 'sign-rules-interactive';
                root.dataset.addsub = JSON.stringify(
                    isObject(signData.addsub) ? signData.addsub : {}
                );
                root.dataset.muldiv = JSON.stringify(
                    isObject(signData.muldiv) ? signData.muldiv : {}
                );

                card.append(root);
                container.append(card);
            }

            function addComparisonActivity(container, comparisonData) {
                if (
                    !isObject(comparisonData)
                    || !Array.isArray(comparisonData.questions)
                    || comparisonData.questions.length === 0
                ) {
                    return;
                }

                const card = createElement('article', 'worked-example');

                card.append(
                    createElement(
                        'p',
                        'worked-example__number',
                        comparisonData.eyebrow || 'Check'
                    ),
                    createElement(
                        'h3',
                        'worked-example__title',
                        comparisonData.title || 'Which number is greater?'
                    )
                );

                if (comparisonData.intro) {
                    card.append(
                        createElement(
                            'p',
                            'lesson-section__intro',
                            comparisonData.intro
                        )
                    );
                }

                const root = document.createElement('div');
                root.id = 'negative-comparison-questions';
                root.dataset.questions = JSON.stringify(
                    comparisonData.questions
                );

                card.append(root);
                container.append(card);
            }

            function buildLessonRoots(lesson) {
                const interactiveShell = document.getElementById(
                    'negative-numbers-interactive'
                );

                const questionsShell = document.getElementById(
                    'negative-numbers-questions'
                );

                if (!interactiveShell || !questionsShell) {
                    return false;
                }

                if (interactiveShell.dataset.negativeBootstrap === 'ready') {
                    return true;
                }

                const interactiveData = isObject(lesson.interactive)
                    ? lesson.interactive
                    : {};

                interactiveShell.dataset.negativeBootstrap = 'ready';
                interactiveShell.id = 'negative-numbers-interactive-shell';
                interactiveShell.replaceChildren();

                const numberLineRoot = document.createElement('div');
                numberLineRoot.id = 'negative-numbers-interactive';
                numberLineRoot.dataset.start = String(
                    Number.isFinite(interactiveData.start)
                        ? interactiveData.start
                        : -3
                );
                numberLineRoot.dataset.min = String(
                    Number.isFinite(interactiveData.min)
                        ? interactiveData.min
                        : -10
                );
                numberLineRoot.dataset.max = String(
                    Number.isFinite(interactiveData.max)
                        ? interactiveData.max
                        : 10
                );

                interactiveShell.append(numberLineRoot);
                addSignRulesInteractive(
                    interactiveShell,
                    lesson.sign_interactive
                );
                addComparisonActivity(
                    interactiveShell,
                    lesson.comparison
                );

                questionsShell.replaceChildren();

                const practiceRoot = document.createElement('div');
                practiceRoot.id = 'negative-numbers-practice';
                questionsShell.append(practiceRoot);

                document.dispatchEvent(
                    new CustomEvent('negative-numbers:roots-ready')
                );

                return true;
            }

            async function start() {
                let lesson;

                try {
                    const response = await fetch('./lesson.json', {
                        cache: 'no-store'
                    });

                    if (!response.ok) {
                        throw new Error(
                            `lesson.json returned ${response.status}`
                        );
                    }

                    lesson = await response.json();
                } catch (error) {
                    console.error(
                        'Negative numbers lesson data could not be loaded.',
                        error
                    );
                    return;
                }

                if (buildLessonRoots(lesson)) {
                    return;
                }

                const observer = new MutationObserver(() => {
                    if (buildLessonRoots(lesson)) {
                        observer.disconnect();
                    }
                });

                observer.observe(document.documentElement, {
                    childList: true,
                    subtree: true
                });
            }

            start();
        })();
    </script>

    <!--
        These scripts watch for their roots, so they do not depend on
        a particular lesson-engine event name or event.detail shape.
    -->
    <script src="./interactive.js?v=10"></script>
    <script src="./questions.js?v=10"></script>

    <!-- Shared lesson renderer; loaded last. -->
    <script src="../../assets/js/lesson-engine.js?v=10"></script>
</body>
</html>
