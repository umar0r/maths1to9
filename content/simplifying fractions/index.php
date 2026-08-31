<?php

declare(strict_types=1);

$lessonId = 'equivalent-simplifying-fractions';
$pageTitle = 'Equivalent and simplifying fractions';
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

    <!-- Shared browser progress handling -->
    <script src="../../assets/js/progress.js"></script>

    <!-- Data and behaviour specific to this lesson -->
    <script src="./questions.js?v=10"></script>
    <script src="interactive.js?v=10"></script>

    <!-- Shared lesson renderer; loaded last -->
    <script src="../../assets/js/lesson-engine.js?v=10"></script>
</body>
</html>
