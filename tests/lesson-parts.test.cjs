const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const sectionPlans = require('./fixtures/section-plans.json');

const window = {};
const source = fs.readFileSync(path.join(__dirname, '../assets/js/lesson-engine.js'), 'utf8');
vm.runInNewContext(source, { window, document: { body: { dataset: { lessonRenderer: 'custom' } } } });
const { sectionKind, sectionPart, planSections } = window.Maths1to9LessonEngine;

test('section ids identify their kind and optional part', () => {
    for (const [id, kind, part] of [
        ['interactive', 'interactive', null],
        ['interactive--brackets', 'interactive', 'brackets'],
        ['question-bank--a-b', 'question-bank', 'a-b'],
        ['comparison', 'comparison', null]
    ]) {
        assert.equal(sectionKind(id), kind, id);
        assert.equal(sectionPart(id), part, id);
    }
});

test('existing lessons keep the section ids and order captured from origin/main (e80c6773)', () => {
    const content = path.join(__dirname, '../content');
    const lessons = fs.readdirSync(content)
        .filter(slug => fs.existsSync(path.join(content, slug, 'lesson.json')))
        .sort();
    assert.deepEqual(lessons, Object.keys(sectionPlans).sort(), 'snapshot lesson list');

    for (const slug of lessons) {
        const lesson = JSON.parse(fs.readFileSync(path.join(content, slug, 'lesson.json'), 'utf8'));
        const ids = Array.from(planSections(lesson), section => section.id);
        assert.deepEqual(ids, sectionPlans[slug], slug);
    }
});
