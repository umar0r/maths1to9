<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$remoteAddress = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
if (!in_array($remoteAddress, ['127.0.0.1', '::1'], true)) {
    http_response_code(403);
    echo json_encode([
        'ok' => false,
        'error' => 'The lesson editor API is available only from this computer.'
    ]);
    exit;
}

$projectRoot = dirname(__DIR__);
$contentRoot = $projectRoot . DIRECTORY_SEPARATOR . 'content';
$templateRoot = $contentRoot . DIRECTORY_SEPARATOR . '_template';
$editorTemplateRoot = __DIR__ . DIRECTORY_SEPARATOR . 'templates';

function respond(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function requestData(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return $_POST;
    }

    $data = json_decode($raw, true);
    if (!is_array($data)) {
        respond(['ok' => false, 'error' => 'The request body is not valid JSON.'], 400);
    }

    return $data;
}

function safeExistingFolder(string $contentRoot, string $folder): string
{
    if (
        $folder === ''
        || $folder === '.'
        || $folder === '..'
        || basename($folder) !== $folder
        || str_contains($folder, "\0")
        || str_starts_with($folder, '.')
    ) {
        respond(['ok' => false, 'error' => 'Invalid lesson folder.'], 400);
    }

    $path = $contentRoot . DIRECTORY_SEPARATOR . $folder;
    $real = realpath($path);
    $rootReal = realpath($contentRoot);

    if ($real === false || $rootReal === false || !is_dir($real)) {
        respond(['ok' => false, 'error' => 'Lesson folder not found.'], 404);
    }

    if (!str_starts_with($real, $rootReal . DIRECTORY_SEPARATOR)) {
        respond(['ok' => false, 'error' => 'Lesson folder is outside content.'], 400);
    }

    return $real;
}

function copyDirectory(string $source, string $destination): void
{
    if (!is_dir($source)) {
        throw new RuntimeException('The lesson template folder is missing.');
    }

    if (!mkdir($destination, 0775, true) && !is_dir($destination)) {
        throw new RuntimeException('Could not create the lesson folder.');
    }

    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($source, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::SELF_FIRST
    );

    foreach ($iterator as $item) {
        $target = $destination . DIRECTORY_SEPARATOR . $iterator->getSubPathName();
        if ($item->isDir()) {
            if (!mkdir($target, 0775, true) && !is_dir($target)) {
                throw new RuntimeException('Could not create a template subfolder.');
            }
        } elseif (!copy($item->getPathname(), $target)) {
            throw new RuntimeException('Could not copy a template file.');
        }
    }
}

function replaceInFile(string $path, array $replacements): void
{
    if (!is_file($path)) {
        return;
    }

    $contents = file_get_contents($path);
    if ($contents === false) {
        throw new RuntimeException('Could not read ' . basename($path) . '.');
    }

    $contents = str_replace(array_keys($replacements), array_values($replacements), $contents);
    if (file_put_contents($path, $contents, LOCK_EX) === false) {
        throw new RuntimeException('Could not update ' . basename($path) . '.');
    }
}

if (!is_dir($contentRoot)) {
    respond([
        'ok' => false,
        'error' => 'The editor must sit at /maths1to9/editor beside /maths1to9/content.'
    ], 500);
}

$action = (string) ($_GET['action'] ?? $_POST['action'] ?? 'list');

if ($action === 'list') {
    $lessons = [];
    $entries = scandir($contentRoot);

    if ($entries === false) {
        respond(['ok' => false, 'error' => 'Could not read the content folder.'], 500);
    }

    foreach ($entries as $entry) {
        if ($entry === '.' || $entry === '..' || str_starts_with($entry, '_')) {
            continue;
        }

        $folder = $contentRoot . DIRECTORY_SEPARATOR . $entry;
        $lessonFile = $folder . DIRECTORY_SEPARATOR . 'lesson.json';
        if (!is_dir($folder) || !is_file($lessonFile)) {
            continue;
        }

        $raw = file_get_contents($lessonFile);
        $lesson = $raw === false ? null : json_decode($raw, true);
        if (!is_array($lesson)) {
            continue;
        }

        $lessons[] = [
            'folder' => $entry,
            'slug' => (string) ($lesson['slug'] ?? $entry),
            'title' => (string) ($lesson['title'] ?? $entry),
            'modified' => filemtime($lessonFile) ?: null,
            'has_interactive' => is_file($folder . DIRECTORY_SEPARATOR . 'interactive.js'),
            'has_questions' => is_file($folder . DIRECTORY_SEPARATOR . 'questions.js')
        ];
    }

    usort($lessons, static fn(array $a, array $b): int => strnatcasecmp($a['title'], $b['title']));
    respond(['ok' => true, 'lessons' => $lessons]);
}

if ($action === 'load') {
    $folder = (string) ($_GET['folder'] ?? '');
    $path = safeExistingFolder($contentRoot, $folder);
    $lessonFile = $path . DIRECTORY_SEPARATOR . 'lesson.json';

    if (!is_file($lessonFile)) {
        respond(['ok' => false, 'error' => 'lesson.json was not found.'], 404);
    }

    $raw = file_get_contents($lessonFile);
    $lesson = $raw === false ? null : json_decode($raw, true);
    if (!is_array($lesson)) {
        respond(['ok' => false, 'error' => 'lesson.json is not valid JSON.'], 500);
    }

    respond([
        'ok' => true,
        'folder' => $folder,
        'lesson' => $lesson,
        'preview_url' => '../content/' . rawurlencode($folder) . '/index.php',
        'modified' => filemtime($lessonFile) ?: null
    ]);
}

if ($action === 'save') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        respond(['ok' => false, 'error' => 'Save requires POST.'], 405);
    }

    $data = requestData();
    $folder = (string) ($data['folder'] ?? '');
    $lesson = $data['lesson'] ?? null;
    if (!is_array($lesson)) {
        respond(['ok' => false, 'error' => 'No lesson JSON was supplied.'], 400);
    }

    $path = safeExistingFolder($contentRoot, $folder);
    $lessonFile = $path . DIRECTORY_SEPARATOR . 'lesson.json';

    $encoded = json_encode(
        $lesson,
        JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
    );
    if ($encoded === false) {
        respond(['ok' => false, 'error' => 'The lesson could not be encoded as JSON.'], 400);
    }
    $encoded .= PHP_EOL;

    $backupRoot = $contentRoot . DIRECTORY_SEPARATOR . '.editor-backups' . DIRECTORY_SEPARATOR . $folder;
    if (!is_dir($backupRoot) && !mkdir($backupRoot, 0775, true) && !is_dir($backupRoot)) {
        respond(['ok' => false, 'error' => 'Could not create the backup folder.'], 500);
    }

    if (is_file($lessonFile)) {
        $backup = $backupRoot . DIRECTORY_SEPARATOR . 'lesson-' . date('Ymd-His') . '.json';
        if (!copy($lessonFile, $backup)) {
            respond(['ok' => false, 'error' => 'Could not back up the current lesson.json.'], 500);
        }
    }

    $temporary = $lessonFile . '.editor-tmp';
    if (file_put_contents($temporary, $encoded, LOCK_EX) === false) {
        respond(['ok' => false, 'error' => 'Could not write the temporary lesson file.'], 500);
    }

    if (!rename($temporary, $lessonFile)) {
        @unlink($temporary);
        respond(['ok' => false, 'error' => 'Could not replace lesson.json.'], 500);
    }

    respond([
        'ok' => true,
        'message' => 'Saved lesson.json and created a backup.',
        'modified' => filemtime($lessonFile) ?: time()
    ]);
}

if ($action === 'create') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        respond(['ok' => false, 'error' => 'Create requires POST.'], 405);
    }

    $data = requestData();
    $slug = strtolower(trim((string) ($data['slug'] ?? '')));
    $title = trim((string) ($data['title'] ?? ''));

    if (!preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug)) {
        respond(['ok' => false, 'error' => 'Use a lower-case kebab-case slug.'], 400);
    }
    if ($title === '') {
        respond(['ok' => false, 'error' => 'Enter a lesson title.'], 400);
    }

    $destination = $contentRoot . DIRECTORY_SEPARATOR . $slug;
    if (file_exists($destination)) {
        respond(['ok' => false, 'error' => 'That lesson folder already exists.'], 409);
    }

    try {
        copyDirectory($templateRoot, $destination);

        $replacements = [
            'my-lesson-slug-01' => $slug . '-01',
            'my-lesson-slug' => $slug,
            'My lesson title' => $title
        ];

        foreach (['index.php', 'interactive.js', 'questions.js', 'lesson.json', 'README.md'] as $filename) {
            replaceInFile($destination . DIRECTORY_SEPARATOR . $filename, $replacements);
        }

        $runtime = $editorTemplateRoot . DIRECTORY_SEPARATOR . 'new-lesson-interactive.js';
        if (is_file($runtime)) {
            $contents = file_get_contents($runtime);
            if ($contents === false) {
                throw new RuntimeException('Could not read the editor interaction runtime.');
            }
            $contents = str_replace('__LESSON_SLUG__', $slug, $contents);
            if (file_put_contents($destination . DIRECTORY_SEPARATOR . 'interactive.js', $contents, LOCK_EX) === false) {
                throw new RuntimeException('Could not install the editor interaction runtime.');
            }
        }

        $lessonFile = $destination . DIRECTORY_SEPARATOR . 'lesson.json';
        $lessonRaw = file_get_contents($lessonFile);
        $lesson = $lessonRaw === false ? null : json_decode($lessonRaw, true);
        if (!is_array($lesson)) {
            throw new RuntimeException('The copied lesson template contains invalid JSON.');
        }

        unset($lesson['explanation']['video']);
        $lesson['id'] = $slug . '-01';
        $lesson['slug'] = $slug;
        $lesson['title'] = $title;
        $lesson['subtitle'] = 'Add a one-line hook for the pupil.';
        $lesson['explanation'] = [
            'eyebrow' => 'Learn',
            'title' => 'The big idea',
            'blocks' => [[
                'title' => 'Start with one clear idea',
                'paragraphs' => [
                    'Explain one thing in simple language.',
                    'Add a visual or a tiny check before moving on.'
                ]
            ]]
        ];
        $lesson['interactive']['steps'] = [[
            'label' => 'Guided question',
            'prompt' => 'Add the first question.',
            'options' => ['Option A', 'Option B', 'Option C'],
            'answer' => 'Option B',
            'feedback' => 'Explain why the answer is correct.'
        ]];

        $encoded = json_encode($lesson, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if ($encoded === false || file_put_contents($lessonFile, $encoded . PHP_EOL, LOCK_EX) === false) {
            throw new RuntimeException('Could not write the new lesson JSON.');
        }
    } catch (Throwable $error) {
        if (is_dir($destination)) {
            $iterator = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($destination, FilesystemIterator::SKIP_DOTS),
                RecursiveIteratorIterator::CHILD_FIRST
            );
            foreach ($iterator as $item) {
                $item->isDir() ? @rmdir($item->getPathname()) : @unlink($item->getPathname());
            }
            @rmdir($destination);
        }
        respond(['ok' => false, 'error' => $error->getMessage()], 500);
    }

    respond(['ok' => true, 'folder' => $slug, 'message' => 'Lesson created.']);
}

if ($action === 'upload') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        respond(['ok' => false, 'error' => 'Upload requires POST.'], 405);
    }

    $folder = (string) ($_GET['folder'] ?? $_POST['folder'] ?? '');
    $path = safeExistingFolder($contentRoot, $folder);
    $assetsPath = $path . DIRECTORY_SEPARATOR . 'assets';
    if (!is_dir($assetsPath) && !mkdir($assetsPath, 0775, true) && !is_dir($assetsPath)) {
        respond(['ok' => false, 'error' => 'Could not create the lesson assets folder.'], 500);
    }

    $files = $_FILES['files'] ?? null;
    if (!is_array($files)) {
        respond(['ok' => false, 'error' => 'No files were uploaded.'], 400);
    }

    $names = is_array($files['name'] ?? null) ? $files['name'] : [$files['name'] ?? ''];
    $tmpNames = is_array($files['tmp_name'] ?? null) ? $files['tmp_name'] : [$files['tmp_name'] ?? ''];
    $errors = is_array($files['error'] ?? null) ? $files['error'] : [$files['error'] ?? UPLOAD_ERR_NO_FILE];
    $sizes = is_array($files['size'] ?? null) ? $files['size'] : [$files['size'] ?? 0];

    $allowed = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'];
    $uploaded = [];

    foreach ($names as $index => $originalName) {
        if (($errors[$index] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            continue;
        }
        if (($sizes[$index] ?? 0) > 10 * 1024 * 1024) {
            continue;
        }

        $extension = strtolower(pathinfo((string) $originalName, PATHINFO_EXTENSION));
        if (!in_array($extension, $allowed, true)) {
            continue;
        }

        $base = pathinfo((string) $originalName, PATHINFO_FILENAME);
        $base = preg_replace('/[^a-zA-Z0-9_-]+/', '-', $base) ?: 'asset';
        $base = trim($base, '-_') ?: 'asset';
        $filename = $base . '-' . substr(bin2hex(random_bytes(4)), 0, 8) . '.' . $extension;
        $destination = $assetsPath . DIRECTORY_SEPARATOR . $filename;

        if (!move_uploaded_file((string) ($tmpNames[$index] ?? ''), $destination)) {
            continue;
        }

        $uploaded[] = [
            'name' => $filename,
            'src' => '../content/' . rawurlencode($folder) . '/assets/' . rawurlencode($filename),
            'stored_src' => './assets/' . $filename
        ];
    }

    if ($uploaded === []) {
        respond(['ok' => false, 'error' => 'No supported image or SVG files were uploaded.'], 400);
    }

    respond(['ok' => true, 'data' => $uploaded]);
}

respond(['ok' => false, 'error' => 'Unknown API action.'], 404);
