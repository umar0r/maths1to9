// Setup checks for every lesson folder: wiring, files, shared asset
// versions, the dist build and wording. Run with: node --test tests/
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { root, contentDir, read, readJson, lessonFolders, allStrings, wrongSums } = require('./helpers/lessons.cjs');

const curriculum = readJson(path.join(contentDir, 'curriculum.json'));
const curriculumLessons = curriculum.categories.flatMap(category => category.lessons);
const skillIds = new Set(readJson(path.join(contentDir, 'skills.json')).skills.map(skill => skill.id));

// Local files a page loads (not links to other pages).
const pageAssets = html => [...html.matchAll(/(?:src|href)="(\.[^"]+)"/g)].map(m => m[1])
    .filter(url => !url.endsWith('/') && !url.split('?')[0].endsWith('.php'));
const version = url => url.match(/\?v=(\d+)/)?.[1] ?? null;
const pages = Object.fromEntries(lessonFolders().map(folder => [folder, read(path.join(contentDir, folder, 'index.php'))]));

// The newest ?v= used for each shared asset across all lesson pages.
const latestShared = {};
for (const html of Object.values(pages)) {
    for (const url of pageAssets(html).filter(url => url.startsWith('../../assets/'))) {
        const file = url.split('?')[0];
        latestShared[file] = Math.max(latestShared[file] ?? 0, Number(version(url) ?? 0));
    }
}

for (const folder of lessonFolders()) {
    const dir = path.join(contentDir, folder);
    const page = pages[folder];
    const jsonFile = path.join(dir, 'lesson.json');
    const data = fs.existsSync(jsonFile) ? readJson(jsonFile) : null;

    describe(folder, () => {
        test('has a lesson.json whose slug matches the page', () => {
            assert.ok(data, 'no lesson.json: this lesson does not use the shared lesson format');
            const pageId = page.match(/\$lessonId = '([^']+)'/)?.[1];
            assert.equal(pageId, data.slug, 'index.php $lessonId and lesson.json slug disagree, so progress is saved under two names');
        });

        test('is listed in curriculum.json', () => {
            assert.ok(curriculumLessons.some(lesson => lesson.folder === folder), 'missing from curriculum.json, so it will not appear on the homepage');
        });

        test('only uses skills that exist and are listed for the lesson', () => {
            if (!data) return;
            const entry = curriculumLessons.find(lesson => lesson.folder === folder);
            const used = new Set([
                ...Object.values(data.assessment?.question_types ?? {}).flat(),
                ...[data.guided, data.practice, data.check].flat().map(q => q?.skill).filter(Boolean)
            ]);
            for (const skill of used) {
                assert.ok(skillIds.has(skill), `skill "${skill}" is not in skills.json`);
                if (entry) assert.ok(entry.skills.includes(skill), `curriculum.json does not list skill "${skill}" for this lesson`);
            }
        });

        test('every file the page loads exists', () => {
            const urls = pageAssets(page);
            const dataSrc = page.match(/data-lesson-src="([^"]+)"/)?.[1];
            if (dataSrc) urls.push(dataSrc);
            const missing = urls.filter(url => !fs.existsSync(path.join(dir, url.split('?')[0])));
            assert.deepEqual(missing, [], `the page loads files that do not exist: ${missing.join(', ')}`);
        });

        test('every script in the folder is used by the page', () => {
            const unused = fs.readdirSync(dir).filter(name => name.endsWith('.js'))
                .filter(file => !new RegExp(`["']\\./${file.replace('.', '\\.')}`).test(page));
            assert.deepEqual(unused, [], `never loaded by index.php (dead code, or a missing <script> tag): ${unused.join(', ')}`);
        });

        test('loads the latest version of the shared CSS and JS', () => {
            for (const url of pageAssets(page).filter(url => url.startsWith('../../assets/') && !url.includes('/fonts/'))) {
                const file = url.split('?')[0];
                assert.equal(Number(version(url) ?? 0), latestShared[file],
                    `${file} is loaded as ${url}; other lessons use ?v=${latestShared[file]}, so this page can show a stale cached copy`);
            }
        });

        test('dist build matches the source', () => {
            const distDir = path.join(root, 'dist', 'content', folder);
            const html = path.join(distDir, 'index.html');
            assert.ok(fs.existsSync(html), 'dist has no built page for this lesson');
            assert.deepEqual(pageAssets(read(html)), pageAssets(page), 'dist index.html loads different files or versions');
            for (const file of fs.readdirSync(dir).filter(name => /\.(js|json|css)$/.test(name))) {
                const built = path.join(distDir, file);
                assert.ok(fs.existsSync(built), `dist is missing ${file}`);
                assert.equal(read(built), read(path.join(dir, file)), `dist ${file} is out of date`);
            }
        });

        test('lesson text uses British spelling and the proper minus sign', () => {
            if (!data) return;
            for (const text of allStrings(data)) {
                assert.doesNotMatch(text, /\b(?:color|center|recognize|organize|analyze|favorite|practicing|practiced|behavior)\b/i, `American spelling: "${text}"`);
                assert.doesNotMatch(text, /(?:^|[\s(=])-\d/, `hyphen used as a minus sign (use −): "${text}"`);
            }
        });

        test('every worked sum in the lesson text is right', () => {
            if (!data) return;
            const wrong = allStrings(data).flatMap(text => wrongSums(text).map(sum => `${sum}   (in "${text.replace(/<[^>]*>/g, '')}")`));
            assert.deepEqual(wrong, [], 'lesson.json contains sums that do not add up');
        });

        test('navigation sections have unique ids', () => {
            const stages = data?.navigation_stages;
            if (!stages) return;
            const ids = stages.map(stage => String(stage.id));
            assert.equal(new Set(ids).size, ids.length, 'duplicate navigation stage ids');
        });
    });
}

test('dist has no leftover lessons that no longer exist', () => {
    const distContent = path.join(root, 'dist', 'content');
    const built = fs.readdirSync(distContent, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name);
    const stale = built.filter(name => !lessonFolders().includes(name));
    assert.deepEqual(stale, [], `dist has folders with no matching lesson: ${stale.join(', ')}`);
});

test('dist copies of the shared data files are up to date', () => {
    for (const file of ['curriculum.json', 'collections.json', 'skills.json']) {
        assert.equal(read(path.join(root, 'dist', 'content', file)), read(path.join(contentDir, file)), `dist ${file} is out of date`);
    }
});
