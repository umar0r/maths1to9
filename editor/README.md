# Maths1to9 GrapesJS visual editor

This folder is designed to sit here:

```text
maths1to9/
├── assets/
├── content/
└── editor/       ← this folder
```

Open it through XAMPP:

```text
http://localhost/maths1to9/editor/
```

Do not open `index.php` directly from Finder. PHP must run through Apache.

## What this version edits visually

- Lesson title, subtitle and ID
- Learn paragraphs and stacked Learn cards
- Function-machine diagrams
- Reverse-operation tables
- Paired forward/backward machines
- Big-idea callouts
- Uploaded PNG/JPG/WebP/GIF/SVG graphics
- Method steps
- Step-by-step multiple-choice Try It questions
- Worked examples
- Practice-section headings and completion settings through Advanced JSON

## Existing bespoke lessons

Saving an existing lesson writes only `lesson.json`. It does **not** replace that lesson's `interactive.js`, `questions.js`, `index.php` or shared `app.css`.

Fields not exposed by the visual blocks are retained. Use **Advanced JSON** for special fields such as custom comparison activities, place-value configuration, curriculum metadata and bespoke question-generator settings.

## New lessons

**New lesson** copies `content/_template`, replaces its slug/title markers, and installs `templates/new-lesson-interactive.js` as the new lesson's `interactive.js`.

That runtime reads the visual JSON blocks, renders the Learn graphics, and runs the Try It steps with one answer button. You can later replace it with a bespoke `interactive.js` without affecting the editor.

## Backups

Every save first copies the current file to:

```text
content/.editor-backups/<lesson-folder>/lesson-YYYYMMDD-HHMMSS.json
```

The save itself is atomic: the editor writes a temporary file and then renames it over `lesson.json`.

## GrapesJS

The editor loads GrapesJS 0.23.2 from cdnjs. GrapesJS is open source under the BSD 3-Clause licence. An internet connection is required when the editor first loads unless you later download GrapesJS into the project and change the two references in `editor/index.php`.

## Permissions

Your XAMPP Apache user needs write permission for:

```text
content/
content/.editor-backups/
```

On a normal local Mac XAMPP setup, the content folders you created yourself are usually already writable. If saving fails, fix ownership/permissions on the project folder rather than applying `777` permissions.
