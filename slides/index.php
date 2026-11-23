<?php

declare(strict_types=1);

/**
 * A local viewing page for the pictures scripts/lesson-slides.cjs takes:
 * every screen of a lesson, before and after the answer, at desktop and
 * phone width.
 *
 *   http://localhost/maths1to9/slides/?lesson=rounding-and-significant-figures
 *
 * It reads slides/<lesson>/slides.json and the pictures next to it. It is a
 * tool for looking at a lesson on this computer only: build.sh does not copy
 * slides/ into dist, so it never goes on the live site.
 */

const SLIDES_DIRECTORY = __DIR__;
const WIDTHS = ['desktop' => 'Desktop', 'phone' => 'Phone'];

/**
 * @return array<string, mixed>|null
 */
function readSlides(string $path): ?array
{
    if (!is_file($path) || !is_readable($path)) {
        return null;
    }

    $json = file_get_contents($path);

    if ($json === false) {
        return null;
    }

    try {
        $slides = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException $exception) {
        return null;
    }

    return is_array($slides) ? $slides : null;
}

/**
 * Every lesson folder that has a slides.json, newest first.
 *
 * @return list<string>
 */
function availableLessons(): array
{
    $items = scandir(SLIDES_DIRECTORY);
    $lessons = [];

    if ($items === false) {
        return $lessons;
    }

    foreach ($items as $item) {
        if ($item === '.' || $item === '..' || str_starts_with($item, '.')) {
            continue;
        }

        if (is_dir(SLIDES_DIRECTORY . '/' . $item) && is_file(SLIDES_DIRECTORY . '/' . $item . '/slides.json')) {
            $lessons[] = $item;
        }
    }

    $lessons = array_values(array_filter($lessons, static fn (string $slug): bool => preg_match('/^[a-z0-9-]+$/', $slug) === 1));
    usort($lessons, static fn (string $left, string $right): int =>
        (int) filemtime(SLIDES_DIRECTORY . '/' . $right . '/slides.json')
        <=> (int) filemtime(SLIDES_DIRECTORY . '/' . $left . '/slides.json'));

    return $lessons;
}

function escape(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

function generatedAt(string $stamp): string
{
    $time = strtotime($stamp);

    return $time === false ? $stamp : date('j M Y, H:i', $time);
}

// The lesson's own name, e.g. "Rounding", so the page matches the lesson.
// The walk records it in slides.json, because the checkout it walked may not be
// this one; the lesson.json next to the slides is the fallback.
function lessonTitle(string $slug, ?array $slides = null): string
{
    $title = $slides['title'] ?? '';
    if (!is_string($title) || trim($title) === '') {
        $lesson = readSlides(SLIDES_DIRECTORY . '/../content/' . $slug . '/lesson.json');
        $title = $lesson['title'] ?? '';
    }

    return is_string($title) && trim($title) !== ''
        ? trim($title)
        : ucwords(str_replace('-', ' ', $slug));
}

/**
 * @param array<string, mixed> $screen
 * @param array<string, string> $shot
 */
function picture(string $slug, string $width, array $shot, string $side, string $alt): void
{
    if ($shot === [] || !isset($shot[$side])) {
        return;
    }

    $file = $shot[$side];
    ?>
    <figure class="shot" data-width="<?= escape($width) ?>">
        <a href="<?= escape($slug . '/' . $file) ?>" target="_blank" rel="noopener">
            <img
                src="<?= escape($slug . '/' . $file) ?>"
                alt="<?= escape($alt) ?>"
                loading="lazy"
            >
        </a>
    </figure>
    <?php
}

$lessons = availableLessons();
$requested = isset($_GET['lesson']) && is_string($_GET['lesson']) ? trim($_GET['lesson']) : '';
$slug = in_array($requested, $lessons, true) ? $requested : ($lessons[0] ?? '');
$slides = $slug === '' ? null : readSlides(SLIDES_DIRECTORY . '/' . $slug . '/slides.json');
$screens = is_array($slides['screens'] ?? null) ? $slides['screens'] : [];
$title = lessonTitle($slug, is_array($slides) ? $slides : null);
?>
<!DOCTYPE html>
<html lang="en-GB">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?= escape($title) ?> slides | Maths1to9</title>
    <style>
        :root {
            --ink: #16233a;
            --soft: #5b6b86;
            --line: #dbe2ee;
            --page: #f6f8fc;
            --card: #ffffff;
            --accent: #287fd1;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            background: var(--page);
            color: var(--ink);
            font: 16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        }

        .slides-header {
            position: sticky;
            top: 0;
            z-index: 2;
            display: flex;
            flex-wrap: wrap;
            gap: 12px 24px;
            align-items: center;
            padding: 16px 24px;
            background: var(--card);
            border-bottom: 1px solid var(--line);
        }

        .slides-header h1 {
            margin: 0;
            font-size: 1.1rem;
            letter-spacing: 0.02em;
        }

        .slides-header h1 span {
            font-weight: 400;
            color: var(--soft);
        }

        .slides-header p {
            margin: 0;
            flex: 1 1 280px;
            font-size: 0.85rem;
            color: var(--soft);
        }

        .toggle {
            display: flex;
            gap: 0;
            border: 1px solid var(--line);
            border-radius: 999px;
            overflow: hidden;
        }

        .toggle label {
            display: flex;
            gap: 8px;
            align-items: center;
            padding: 6px 16px;
            font-size: 0.85rem;
            cursor: pointer;
            color: var(--soft);
        }

        .toggle input {
            margin: 0;
            accent-color: var(--accent);
            cursor: pointer;
        }

        .toggle label:has(input:checked) {
            background: var(--accent);
            color: #ffffff;
        }

        main {
            max-width: 1800px;
            margin: 0 auto;
            padding: 24px;
        }

        .slides-group h2 {
            margin: 40px 0 16px;
            padding-bottom: 8px;
            font-size: 1.3rem;
            border-bottom: 1px solid var(--line);
        }

        .slides-group:first-of-type h2 {
            margin-top: 8px;
        }

        .slide {
            margin: 0 0 24px;
            scroll-margin-top: 96px;
            padding: 16px 18px;
            background: var(--card);
            border: 1px solid var(--line);
            border-radius: 14px;
        }

        .slide__caption {
            display: flex;
            flex-wrap: wrap;
            gap: 4px 12px;
            align-items: baseline;
            margin-bottom: 12px;
        }

        .slide__number {
            font-size: 0.8rem;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--accent);
        }

        .slide__heading {
            font-weight: 600;
        }

        .slide__prompt {
            font-size: 0.9rem;
            color: var(--soft);
        }

        .slide__pictures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }

        .slide__column h3 {
            margin: 0 0 6px;
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--soft);
        }

        .shot {
            margin: 0;
        }

        .shot img {
            display: block;
            width: 100%;
            height: auto;
            border: 1px solid var(--line);
            border-radius: 8px;
            background: #ffffff;
        }

        .slide__none {
            margin: 0;
            padding: 16px;
            font-size: 0.85rem;
            color: var(--soft);
            background: var(--page);
            border: 1px dashed var(--line);
            border-radius: 8px;
        }

        .slide__none [data-skipped] {
            display: block;
            margin-top: 4px;
            font-style: italic;
        }

        /* Show the chosen width everywhere, at the phone's real 375 pixels. */
        .shot {
            display: none;
        }

        body:has(#width-desktop:checked) .shot[data-width="desktop"] {
            display: block;
        }

        body:has(#width-phone:checked) .shot[data-width="phone"] {
            display: block;
            width: 375px;
            max-width: 100%;
        }

        .empty {
            padding: 24px;
            background: var(--card);
            border: 1px solid var(--line);
            border-radius: 14px;
        }

        .empty code {
            padding: 2px 6px;
            background: var(--page);
            border-radius: 6px;
        }

        @media (max-width: 900px) {
            .slide__pictures {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>

<body>
    <header class="slides-header">
        <h1>Lesson slides <span><?= escape($title) ?></span></h1>

        <div class="toggle" role="group" aria-label="Picture width">
            <label for="width-desktop"><input type="radio" name="width" id="width-desktop" checked>Desktop</label>
            <label for="width-phone"><input type="radio" name="width" id="width-phone">Phone</label>
        </div>

        <?php if ($slides !== null): ?>
            <p>
                Every screen in lesson order, before and after the answer.
                <?= escape((string) count($screens)) ?> screens, made
                <?= escape(generatedAt((string) ($slides['generated'] ?? ''))) ?>
                with seed <?= escape((string) ($slides['seed'] ?? '')) ?>.
            </p>
        <?php endif; ?>
    </header>

    <main>
        <?php if ($slides === null) : ?>
            <section class="empty">
                <h2>No slides yet</h2>
                <p>
                    Take the pictures first:
                    <code>node scripts/lesson-slides.cjs <?= escape($slug !== '' ? $slug : '&lt;slug&gt;') ?></code>
                </p>
            </section>
        <?php else: ?>
            <?php $group = null; ?>
            <?php foreach ($screens as $screen): ?>
                <?php
                $label = (string) ($screen['label'] ?? '');
                $number = (string) ($screen['number'] ?? '');
                $heading = (string) ($screen['heading'] ?? '');
                $prompt = (string) ($screen['prompt'] ?? '');
                $shots = is_array($screen['shots'] ?? null) ? $screen['shots'] : [];
                $answered = ($screen['answered'] ?? false) === true;
                $skipped = (string) ($screen['skipped'] ?? '');

                if ($label !== $group) {
                    if ($group !== null) {
                        echo '</section>';
                    }

                    $group = $label;
                    ?>
                    <section class="slides-group">
                        <h2><?= escape($label) ?></h2>
                    <?php
                }
                ?>
                <figure class="slide">
                    <figcaption class="slide__caption">
                        <strong class="slide__number"><?= escape($label . ' ' . $number) ?></strong>
                        <span class="slide__heading"><?= escape($heading) ?></span>
                        <?php if ($prompt !== '' && $prompt !== $heading): ?>
                            <span class="slide__prompt"><?= escape($prompt) ?></span>
                        <?php endif; ?>
                    </figcaption>

                    <div class="slide__pictures">
                        <div class="slide__column">
                            <h3>Before</h3>
                            <?php foreach (array_keys(WIDTHS) as $width): ?>
                                <?php picture($slug, (string) $width, is_array($shots[$width] ?? null) ? $shots[$width] : [], 'before',
                                    sprintf('%s %s, before the answer, %s width', $title, $label . ' ' . $number, $width)); ?>
                            <?php endforeach; ?>
                        </div>

                        <div class="slide__column">
                            <h3>After</h3>
                            <?php if ($answered): ?>
                                <?php foreach (array_keys(WIDTHS) as $width): ?>
                                    <?php picture($slug, (string) $width, is_array($shots[$width] ?? null) ? $shots[$width] : [], 'after',
                                        sprintf('%s %s, answered, %s width', $title, $label . ' ' . $number, $width)); ?>
                                <?php endforeach; ?>
                            <?php else: ?>
                                <p class="slide__none">
                                    Nothing to answer on this screen.
                                    <?php if ($skipped !== '' && $skipped !== 'nothing to answer on this screen'): ?>
                                        <span data-skipped><?= escape($skipped) ?></span>
                                    <?php endif; ?>
                                </p>
                            <?php endif; ?>
                        </div>
                    </div>
                </figure>
            <?php endforeach; ?>
            <?php if ($group !== null) : ?>
                </section>
            <?php endif; ?>
        <?php endif; ?>
    </main>
</body>
</html>
