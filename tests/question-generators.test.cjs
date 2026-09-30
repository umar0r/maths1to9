// Generic checks on every randomly generated question in every lesson:
// each question type is sampled with many seeds so failures repeat.
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { contentDir, read, readJson, lessonFolders, loadScript, normaliseQuestion, allStrings, sample, wrongSums } = require('./helpers/lessons.cjs');

const SAMPLES = 300;
const where = (folder, type, seed) => `${folder} ${type} (seed ${seed})`;

for (const folder of lessonFolders()) {
    const file = path.join(contentDir, folder, 'questions.js');
    if (!fs.existsSync(file) || !read(file).includes('const generators =')) continue;
    // Skip question banks the page never loads (tests/lessons.test.cjs reports those).
    if (!read(path.join(contentDir, folder, 'index.php')).includes('./questions.js')) continue;
    const source = read(file);
    const loaded = loadScript(file, ['generators']);
    const questionTypes = readJson(path.join(contentDir, folder, 'lesson.json')).assessment?.question_types ?? {};
    // Attempts are recorded as a fixed questionType string, or per question type.
    const fixedTypes = [...new Set([...source.matchAll(/questionType:\s*'([^']+)'/g)].map(m => m[1]))];
    const recordsPerType = /questionType:\s*[a-zA-Z]/.test(source);

    describe(folder, () => {
        test('every fixed questionType it records has a skill mapping', () => {
            for (const type of fixedTypes) {
                assert.ok(type in questionTypes, `records questionType "${type}", which assessment.question_types does not map to a skill, so those attempts count towards no skill`);
            }
        });

        for (const [key, generator] of Object.entries(loaded.generators)) {
            const name = Array.isArray(loaded.generators) ? generator.name : key;

            describe(name, () => {
                let samples;
                test('generates questions without errors', () => {
                    samples = sample(loaded, generator, SAMPLES);
                });

                test('has a skill mapping in lesson.json', () => {
                    if (!recordsPerType) return;
                    const type = samples?.[0]?.question.type;
                    assert.ok(name in questionTypes || type in questionTypes,
                        `assessment.question_types has no entry for "${name}"${type ? ` or "${type}"` : ''}, so attempts are not recorded against a skill`);
                });

                test('has exactly one correct, distinct answer', () => {
                    for (const { seed, question } of samples) {
                        const q = normaliseQuestion(question);
                        if (question.interaction === 'order-tiles') continue;
                        assert.ok(q.prompt.trim(), `empty prompt: ${where(folder, name, seed)}`);
                        assert.ok(q.options.length >= 2, `fewer than 2 options: ${where(folder, name, seed)} ${JSON.stringify(q.options)}`);
                        const labels = q.options.map(option => option.replace(/\s+/g, ' ').trim());
                        assert.equal(new Set(labels).size, labels.length, `duplicate options ${JSON.stringify(q.options)}: ${where(folder, name, seed)} "${q.prompt}"`);
                        assert.equal(q.correct.length, 1, `${q.correct.length} options marked correct ${JSON.stringify(q.options)}: ${where(folder, name, seed)} "${q.prompt}"`);
                        assert.equal(q.correct[0], q.answer, `the correct option is not the stated answer: ${where(folder, name, seed)}`);
                    }
                });

                test('the correct answer is not always in the same position', () => {
                    const positions = new Set(samples.map(({ question }) => normaliseQuestion(question))
                        .filter(q => q.options.length > 1).map(q => q.options.indexOf(q.answer)));
                    if (positions.size) assert.ok(positions.size > 1, `the answer is always option ${[...positions][0] + 1}`);
                });

                test('text has no broken values and uses the proper minus sign', () => {
                    for (const { seed, question } of samples) {
                        for (const text of allStrings(question)) {
                            assert.doesNotMatch(text, /\b(?:undefined|NaN|null|Infinity)\b|\[object Object\]/, `broken value in "${text}": ${where(folder, name, seed)}`);
                            assert.doesNotMatch(text.replace(/<[^>]*>/g, ''), /(?:^|[\s(=])-\d/, `hyphen used as a minus sign in "${text}" (use −): ${where(folder, name, seed)}`);
                        }
                    }
                });

                test('numbers are tidy (no floating-point leftovers)', () => {
                    for (const { seed, question } of samples) {
                        for (const text of allStrings(question)) {
                            assert.doesNotMatch(text.replace(/<[^>]*>/g, ''), /\d\.\d{9,}/, `untidy number in "${text}": ${where(folder, name, seed)}`);
                        }
                    }
                });

                test('every worked sum in the question and its feedback is right', () => {
                    for (const { seed, question } of samples) {
                        for (const text of allStrings(question)) {
                            assert.deepEqual(wrongSums(text), [], `wrong sum in "${text.replace(/<[^>]*>/g, '')}": ${where(folder, name, seed)}`);
                        }
                    }
                });

                test('explains the answer', () => {
                    for (const { seed, question } of samples) {
                        const q = normaliseQuestion(question);
                        assert.ok(q.explanation.trim() || q.feedback.length, `no explanation: ${where(folder, name, seed)}`);
                    }
                });
            });
        }
    });
}
