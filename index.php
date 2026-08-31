<?php

declare(strict_types=1);

const CONTENT_DIRECTORY = __DIR__ . '/content';
const CURRICULUM_FILE = CONTENT_DIRECTORY . '/curriculum.json';

/**
 * @return array<string, mixed>|null
 */
function readJsonObject(string $path): ?array
{
    if (!is_file($path) || !is_readable($path)) {
        return null;
    }

    $json = file_get_contents($path);

    if ($json === false) {
        return null;
    }

    try {
        $data = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException $exception) {
        return null;
    }

    return is_array($data) ? $data : null;
}

function textValue(mixed $value, string $fallback = ''): string
{
    if (!is_string($value)) {
        return $fallback;
    }

    $value = trim($value);

    return $value === '' ? $fallback : $value;
}

function escape(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

function lessonUrl(string $folder): string
{
    return 'content/' . rawurlencode($folder) . '/';
}

function titleFromFolder(string $folder): string
{
    return ucwords(str_replace(['-', '_'], ' ', $folder));
}

/**
 * @param array<string, mixed> $manifestEntry
 * @return array<string, mixed>|null
 */
function buildLesson(string $folder, array $manifestEntry = []): ?array
{
    $folder = trim($folder);

    if (
        $folder === '' ||
        str_starts_with($folder, '_') ||
        str_contains($folder, '/') ||
        str_contains($folder, '\\')
    ) {
        return null;
    }

    $directory = CONTENT_DIRECTORY . '/' . $folder;
    $entryPoint = $directory . '/index.php';

    if (!is_dir($directory) || !is_file($entryPoint)) {
        return null;
    }

    $lessonData = readJsonObject($directory . '/lesson.json') ?? [];

    $title = textValue(
        $lessonData['title'] ?? null,
        textValue($manifestEntry['title'] ?? null, titleFromFolder($folder))
    );

    $subtitle = textValue(
        $lessonData['subtitle'] ?? null,
        textValue($manifestEntry['subtitle'] ?? null, 'Open the lesson and start exploring.')
    );

    $grade = textValue(
        $lessonData['grade'] ?? null,
        textValue($manifestEntry['grade'] ?? null)
    );

    $minutesValue = $lessonData['estimated_minutes']
        ?? $manifestEntry['estimated_minutes']
        ?? null;

    $minutes = is_int($minutesValue) || is_float($minutesValue)
        ? (int) $minutesValue
        : null;

    $skillsValue = $manifestEntry['skills'] ?? [];
    $skills = [];

    if (is_array($skillsValue)) {
        foreach ($skillsValue as $skill) {
            $skill = textValue($skill);

            if ($skill !== '') {
                $skills[] = $skill;
            }
        }
    }

    return [
        'folder' => $folder,
        'title' => $title,
        'subtitle' => $subtitle,
        'grade' => $grade,
        'minutes' => $minutes,
        'skills' => array_values(array_unique($skills)),
        'url' => lessonUrl($folder),
    ];
}

/**
 * @return list<string>
 */
function discoverLessonFolders(): array
{
    if (!is_dir(CONTENT_DIRECTORY)) {
        return [];
    }

    $folders = [];
    $items = scandir(CONTENT_DIRECTORY);

    if ($items === false) {
        return [];
    }

    foreach ($items as $item) {
        if ($item === '.' || $item === '..' || str_starts_with($item, '_')) {
            continue;
        }

        $directory = CONTENT_DIRECTORY . '/' . $item;

        if (is_dir($directory) && is_file($directory . '/index.php')) {
            $folders[] = $item;
        }
    }

    natcasesort($folders);

    return array_values($folders);
}

$curriculum = readJsonObject(CURRICULUM_FILE) ?? ['categories' => []];
$categoryDefinitions = is_array($curriculum['categories'] ?? null)
    ? $curriculum['categories']
    : [];

$categories = [];
$mappedFolders = [];
$totalLessons = 0;

foreach ($categoryDefinitions as $categoryDefinition) {
    if (!is_array($categoryDefinition)) {
        continue;
    }

    $categoryId = textValue($categoryDefinition['id'] ?? null);
    $categoryTitle = textValue($categoryDefinition['title'] ?? null);

    if ($categoryId === '' || $categoryTitle === '') {
        continue;
    }

    $lessonDefinitions = is_array($categoryDefinition['lessons'] ?? null)
        ? $categoryDefinition['lessons']
        : [];

    $lessons = [];

    foreach ($lessonDefinitions as $lessonDefinition) {
        if (is_string($lessonDefinition)) {
            $lessonDefinition = ['folder' => $lessonDefinition];
        }

        if (!is_array($lessonDefinition)) {
            continue;
        }

        $folder = textValue($lessonDefinition['folder'] ?? null);
        $lesson = buildLesson($folder, $lessonDefinition);

        if ($lesson === null) {
            continue;
        }

        $lessons[] = $lesson;
        $mappedFolders[$folder] = true;
    }

    $totalLessons += count($lessons);
    $categories[] = [
        'id' => $categoryId,
        'title' => $categoryTitle,
        'description' => textValue($categoryDefinition['description'] ?? null),
        'lessons' => $lessons,
    ];
}

$uncategorisedLessons = [];

foreach (discoverLessonFolders() as $folder) {
    if (isset($mappedFolders[$folder])) {
        continue;
    }

    $lesson = buildLesson($folder);

    if ($lesson !== null) {
        $uncategorisedLessons[] = $lesson;
    }
}

/**
 * Topic colour + glyph coding (Khan-style subject colours).
 * Falls back to the primary blue for unknown categories.
 */
const TOPIC_STYLES = [
    'number' => ['color' => 'var(--topic-number)', 'glyph' => '÷'],
    'algebra' => ['color' => 'var(--topic-algebra)', 'glyph' => 'x²'],
    'ratio-proportion-and-rates-of-change' => ['color' => 'var(--topic-ratio)', 'glyph' => 'a:b'],
    'geometry-and-measures' => ['color' => 'var(--topic-geometry)', 'glyph' => '△'],
    'probability' => ['color' => 'var(--topic-statistics)', 'glyph' => 'P'],
    'statistics' => ['color' => 'var(--topic-statistics)', 'glyph' => '%'],
];

/**
 * @return array{color: string, glyph: string}
 */
function topicStyle(string $categoryId): array
{
    return TOPIC_STYLES[$categoryId]
        ?? ['color' => 'var(--primary)', 'glyph' => '='];
}

if ($uncategorisedLessons !== []) {
    $totalLessons += count($uncategorisedLessons);
    $categories[] = [
        'id' => 'uncategorised',
        'title' => 'More lessons',
        'description' => 'Lessons found in the content folder that have not been placed in the curriculum yet.',
        'lessons' => $uncategorisedLessons,
    ];
}
?>
<!DOCTYPE html>
<html lang="en-GB">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta
        name="description"
        content="Interactive GCSE maths lessons for grades 1 to 9."
    >

    <title>Maths1to9 | Interactive GCSE maths lessons</title>

    <link
        rel="preload"
        href="./assets/fonts/Nunito-Variable.woff2"
        as="font"
        type="font/woff2"
        crossorigin
    >
    <link rel="stylesheet" href="./assets/css/app.css">
    <link rel="stylesheet" href="./assets/css/home.css">
</head>

<body class="home-page">
    <header class="home-header">
        <div class="home-header__inner">
            <a class="home-brand" href="./index.php" aria-label="Maths1to9 home">
                <span class="home-brand__mark" aria-hidden="true">1–9</span>
                <span>Maths1to9</span>
            </a>

            <div class="home-header__right">
                <span class="home-header__label">GCSE maths · Grades 1–9</span>
                <a class="cta-button" href="#catalogue">Start learning</a>
            </div>
        </div>
    </header>

    <main>
        <section class="home-hero" aria-labelledby="page-title">
            <div class="home-shell home-hero__inner">
                <div>
                    <p class="home-eyebrow">Learn by doing</p>
                    <h1 id="page-title">
                        Master GCSE maths, <em>one idea</em> at a time.
                    </h1>
                    <p class="home-hero__copy">
                        Visual explanations, guided methods and practice that
                        responds to your answers. No sign-up, no fuss — just
                        pick a lesson and start.
                    </p>

                    <div class="home-hero__actions">
                        <a class="cta-button" href="#catalogue">Start learning</a>
                        <a class="cta-button cta-button--ghost" href="#catalogue">Browse topics</a>
                    </div>

                    <div class="home-hero__meta" aria-label="Course summary">
                        <span><?= escape((string) $totalLessons) ?> interactive lessons</span>
                        <span>Grades 1–9</span>
                        <span>Free to explore</span>
                    </div>
                </div>

                <div class="hero-tiles" aria-hidden="true">
                    <span class="hero-tile" style="--tile: var(--topic-number); --tilt: -5deg; --delay: 0s;">½</span>
                    <span class="hero-tile hero-tile--fill" style="--tile: var(--topic-algebra); --tilt: 3deg; --delay: 0.6s;">x²</span>
                    <span class="hero-tile" style="--tile: var(--topic-graphs); --tilt: -2deg; --delay: 1.2s;">y=</span>
                    <span class="hero-tile hero-tile--fill" style="--tile: var(--topic-ratio); --tilt: 4deg; --delay: 1.8s;">a:b</span>
                    <span class="hero-tile" style="--tile: var(--topic-geometry); --tilt: -4deg; --delay: 2.4s;">△</span>
                    <span class="hero-tile hero-tile--fill" style="--tile: var(--topic-statistics); --tilt: 2deg; --delay: 3s;">%</span>
                    <span class="hero-tile" style="--tile: var(--topic-ratio); --tilt: 3deg; --delay: 3.6s;">π</span>
                    <span class="hero-tile hero-tile--fill" style="--tile: var(--topic-number); --tilt: -3deg; --delay: 4.2s;">÷</span>
                    <span class="hero-tile" style="--tile: var(--topic-algebra); --tilt: 5deg; --delay: 4.8s;">√</span>
                </div>
            </div>
        </section>

        <section
            class="daily-review"
            data-daily-review
            aria-labelledby="daily-review-title"
            hidden
        >
            <div class="home-shell">
                <div class="daily-review__head">
                    <h2 id="daily-review-title">Daily Review</h2>
                    <p>
                        A quick second look at skills you had secure about
                        a week ago.
                    </p>
                </div>

                <div
                    class="lesson-list daily-review__list"
                    data-daily-review-list
                ></div>

                <p
                    class="daily-review__empty"
                    data-daily-review-empty
                    hidden
                >
                    You’re up to date — nothing to review today.
                </p>
            </div>
        </section>

        <div id="catalogue" class="home-shell home-layout">
            <?php if ($categories !== []): ?>
                <nav class="category-nav" aria-label="Lesson categories">
                    <p class="category-nav__title">Topics</p>
                    <div class="category-nav__links">
                        <?php foreach ($categories as $category): ?>
                            <?php $topic = topicStyle((string) $category['id']); ?>
                            <a
                                href="#<?= escape((string) $category['id']) ?>"
                                style="--topic: <?= escape($topic['color']) ?>;"
                            >
                                <span><?= escape((string) $category['title']) ?></span>
                                <span aria-label="<?= count($category['lessons']) ?> lessons">
                                    <?= count($category['lessons']) ?>
                                </span>
                            </a>
                        <?php endforeach; ?>
                    </div>
                </nav>
            <?php endif; ?>

            <div class="lesson-catalogue">
                <?php if ($categories === []): ?>
                    <section class="catalogue-empty">
                        <h2>No lessons found</h2>
                        <p>Add a lesson folder inside <code>content</code>, then place it in <code>curriculum.json</code>.</p>
                    </section>
                <?php else: ?>
                    <?php foreach ($categories as $categoryIndex => $category): ?>
                        <?php $topic = topicStyle((string) $category['id']); ?>
                        <section
                            id="<?= escape((string) $category['id']) ?>"
                            class="lesson-category"
                            style="--topic: <?= escape($topic['color']) ?>;"
                            aria-labelledby="category-title-<?= $categoryIndex ?>"
                        >
                            <header class="lesson-category__header">
                                <span class="lesson-category__icon" aria-hidden="true">
                                    <?= escape($topic['glyph']) ?>
                                </span>

                                <div>
                                    <h2 id="category-title-<?= $categoryIndex ?>">
                                        <?= escape((string) $category['title']) ?>
                                    </h2>

                                    <?php if ($category['description'] !== ''): ?>
                                        <p><?= escape((string) $category['description']) ?></p>
                                    <?php endif; ?>
                                </div>
                            </header>

                            <?php if ($category['lessons'] === []): ?>
                                <p class="lesson-category__empty">
                                    Lessons coming soon — check back shortly.
                                </p>
                            <?php else: ?>
                                <div class="lesson-list">
                                    <?php foreach ($category['lessons'] as $lesson): ?>
                                        <a
                                            class="lesson-card"
                                            href="<?= escape((string) $lesson['url']) ?>"
                                            <?php if ($lesson['skills'] !== []): ?>
                                                data-skills="<?= escape(implode(',', $lesson['skills'])) ?>"
                                            <?php endif; ?>
                                        >
                                            <span class="lesson-card__top">
                                                <span class="lesson-card__glyph" aria-hidden="true">
                                                    <?= escape($topic['glyph']) ?>
                                                </span>
                                                <span class="lesson-card__arrow" aria-hidden="true">→</span>
                                            </span>

                                            <span class="lesson-card__content">
                                                <span class="lesson-card__title">
                                                    <?= escape((string) $lesson['title']) ?>
                                                </span>
                                                <span class="lesson-card__subtitle">
                                                    <?= escape((string) $lesson['subtitle']) ?>
                                                </span>
                                            </span>

                                            <?php if ($lesson['grade'] !== '' || $lesson['minutes'] !== null): ?>
                                                <span class="lesson-card__meta">
                                                    <?php if ($lesson['grade'] !== ''): ?>
                                                        <span>Grades <?= escape((string) $lesson['grade']) ?></span>
                                                    <?php endif; ?>

                                                    <?php if ($lesson['minutes'] !== null): ?>
                                                        <span><?= escape((string) $lesson['minutes']) ?> min</span>
                                                    <?php endif; ?>
                                                </span>
                                            <?php endif; ?>
                                        </a>
                                    <?php endforeach; ?>
                                </div>
                            <?php endif; ?>
                        </section>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>
        </div>
    </main>

    <footer class="home-footer">
        <div class="home-shell">
            <p>
                <span class="home-brand__mark" aria-hidden="true">1–9</span>
                Maths1to9
            </p>
            <p>Interactive GCSE maths for grades 1–9.</p>
        </div>
    </footer>
    <script src="./assets/js/progress.js" defer></script>
    <script src="./assets/js/home-progress.js" defer></script>
</body>
</html>
