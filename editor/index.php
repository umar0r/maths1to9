<?php

declare(strict_types=1);

?><!DOCTYPE html>
<html lang="en-GB">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Maths1to9 Visual Lesson Editor</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/grapesjs/0.23.2/css/grapes.min.css">
    <link rel="stylesheet" href="./assets/editor.css?v=1">
</head>
<body>
<div class="editor-app">
    <header class="editor-toolbar">
        <a class="editor-brand" href="../index.php" title="Back to Maths1to9">
            <span class="editor-brand__mark">1–9</span>
            <span>
                <strong>Maths1to9</strong>
                <small>Visual lesson editor</small>
            </span>
        </a>

        <div class="toolbar-group toolbar-group--lesson">
            <label class="sr-only" for="lesson-select">Lesson</label>
            <select id="lesson-select" class="toolbar-select" aria-label="Choose a lesson"></select>
            <button id="reload-button" class="toolbar-button" type="button">Reload</button>
            <button id="new-button" class="toolbar-button" type="button">New lesson</button>
        </div>

        <div class="toolbar-group toolbar-group--history">
            <button id="undo-button" class="toolbar-button toolbar-button--icon" type="button" title="Undo" aria-label="Undo">↶</button>
            <button id="redo-button" class="toolbar-button toolbar-button--icon" type="button" title="Redo" aria-label="Redo">↷</button>
            <button id="desktop-button" class="toolbar-button is-active" type="button">Desktop</button>
            <button id="mobile-button" class="toolbar-button" type="button">Mobile</button>
        </div>

        <div class="toolbar-group toolbar-group--actions">
            <button id="upload-button" class="toolbar-button" type="button">Add image / SVG</button>
            <button id="json-button" class="toolbar-button" type="button">Advanced JSON</button>
            <button id="preview-button" class="toolbar-button" type="button">Preview lesson</button>
            <button id="save-button" class="toolbar-button toolbar-button--primary" type="button">Save</button>
        </div>
    </header>

    <section class="lesson-meta" aria-label="Lesson details">
        <div class="meta-field meta-field--small">
            <label for="lesson-id">Lesson ID</label>
            <input id="lesson-id" type="text" autocomplete="off">
        </div>
        <div class="meta-field meta-field--small">
            <label for="lesson-slug">Folder / slug</label>
            <input id="lesson-slug" type="text" readonly>
        </div>
        <div class="meta-field">
            <label for="lesson-title">Title</label>
            <input id="lesson-title" type="text" autocomplete="off">
        </div>
        <div class="meta-field meta-field--wide">
            <label for="lesson-subtitle">Subtitle</label>
            <input id="lesson-subtitle" type="text" autocomplete="off">
        </div>
        <div id="save-status" class="save-status" role="status" aria-live="polite">Choose a lesson.</div>
    </section>

    <main class="editor-workspace">
        <aside class="editor-sidebar editor-sidebar--left">
            <div class="sidebar-heading">
                <strong>Blocks</strong>
                <span>Drag into the matching section</span>
            </div>
            <div id="blocks-panel" class="blocks-panel"></div>
        </aside>

        <section class="canvas-shell" aria-label="Lesson canvas">
            <div id="editor-empty" class="editor-empty">Loading lessons…</div>
            <div id="gjs"></div>
        </section>

        <aside class="editor-sidebar editor-sidebar--right">
            <div class="sidebar-heading">
                <strong>Settings</strong>
                <span>Select a card or visual</span>
            </div>
            <div id="traits-panel" class="traits-panel"></div>
            <div class="sidebar-help">
                <strong>How this works</strong>
                <p>The canvas is a visual view of <code>lesson.json</code>. Select a block, then edit its fields here. Save writes JSON only and keeps unsupported fields.</p>
            </div>
        </aside>
    </main>
</div>

<input id="asset-input" type="file" accept=".png,.jpg,.jpeg,.webp,.gif,.svg,image/*" multiple hidden>

<dialog id="new-dialog" class="editor-dialog">
    <form id="new-form" method="dialog">
        <div class="dialog-heading">
            <h2>Create a lesson</h2>
            <button class="dialog-close" value="cancel" aria-label="Close">×</button>
        </div>
        <label>
            Lesson title
            <input id="new-title" type="text" required autocomplete="off" placeholder="Equations and identities">
        </label>
        <label>
            Folder slug
            <input id="new-slug" type="text" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" autocomplete="off" placeholder="equations-and-identities">
        </label>
        <p class="dialog-note">This copies your <code>content/_template</code> wiring, then installs the editor-friendly interaction runtime.</p>
        <div class="dialog-actions">
            <button class="toolbar-button" value="cancel">Cancel</button>
            <button id="create-button" class="toolbar-button toolbar-button--primary" value="default">Create lesson</button>
        </div>
    </form>
</dialog>

<dialog id="json-dialog" class="editor-dialog editor-dialog--json">
    <form method="dialog">
        <div class="dialog-heading">
            <div>
                <h2>Advanced lesson JSON</h2>
                <p>Use this for fields the visual editor does not yet expose.</p>
            </div>
            <button class="dialog-close" value="cancel" aria-label="Close">×</button>
        </div>
        <textarea id="json-editor" spellcheck="false" aria-label="lesson.json"></textarea>
        <div id="json-error" class="json-error" role="alert"></div>
        <div class="dialog-actions">
            <button class="toolbar-button" value="cancel">Close</button>
            <button id="apply-json-button" class="toolbar-button toolbar-button--primary" value="default">Apply to canvas</button>
        </div>
    </form>
</dialog>

<script src="https://cdnjs.cloudflare.com/ajax/libs/grapesjs/0.23.2/grapes.min.js"></script>
<script src="./assets/editor.js?v=1"></script>
</body>
</html>
