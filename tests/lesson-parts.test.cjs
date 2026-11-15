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

const partsFixture = require('./fixtures/parts-lesson/lesson.json');
const fixtureOptions = { allowStage2FixtureWithoutPractice: true };

function fullPartsLesson() {
    const lesson = structuredClone(partsFixture);
    lesson.question_bank = { session_length: 6 };
    for (const part of lesson.parts) part.question_bank = { session_length: 4 };
    return lesson;
}

test('the Stage 2 fixture plans Learn and Try it for both parts, followed by Check', () => {
    const result = Array.from(planSections(partsFixture, fixtureOptions), section => ({ ...section }));
    assert.deepEqual(result, [
        { id: 'explanation--apples', kind: 'explanation', part: 'apples', label: 'Apples Learn' },
        { id: 'interactive--apples', kind: 'interactive', part: 'apples', label: 'Apples Try it' },
        { id: 'explanation--pears', kind: 'explanation', part: 'pears', label: 'Pears Learn' },
        { id: 'interactive--pears', kind: 'interactive', part: 'pears', label: 'Pears Try it' },
        { id: 'comparison', kind: 'comparison', part: null, label: 'Check' }
    ]);
    assert.throws(() => planSections(partsFixture), /Part "apples" needs question_bank/);
});

test('the full parts plan interleaves each part’s Practice and ends with Mixed Practice and Check', () => {
    assert.deepEqual(Array.from(planSections(fullPartsLesson()), section => section.id), [
        'explanation--apples', 'interactive--apples', 'question-bank--apples',
        'explanation--pears', 'interactive--pears', 'question-bank--pears',
        'question-bank', 'comparison'
    ]);
});

for (const [name, change, error] of [
    ['a non-array parts value', lesson => { lesson.parts = {}; }, /at least two parts/],
    ['one part', lesson => { lesson.parts.pop(); }, /at least two parts/],
    ['duplicate part ids', lesson => { lesson.parts[1].id = 'apples'; }, /Duplicate part id "apples"/],
    ['a double hyphen', lesson => { lesson.parts[0].id = 'red--apples'; }, /Invalid id for part 1.*red--apples/],
    ['uppercase part ids', lesson => { lesson.parts[0].id = 'Apples'; }, /Invalid id for part 1.*Apples/],
    ['a missing label', lesson => { delete lesson.parts[0].label; }, /Part "apples" needs a label/],
    ['missing explanation', lesson => { delete lesson.parts[0].explanation; }, /Part "apples" needs explanation/],
    ['missing interactive', lesson => { delete lesson.parts[1].interactive; }, /Part "pears" needs interactive/],
    ['missing question_bank', lesson => { delete lesson.parts[0].question_bank; }, /Part "apples" needs question_bank/],
    ['top-level explanation', lesson => { lesson.explanation = {}; }, /cannot have top-level explanation/],
    ['top-level interactive', lesson => { lesson.interactive = {}; }, /cannot have top-level interactive/],
    ['section_order', lesson => { lesson.section_order = []; }, /cannot have top-level section_order/],
    ['navigation_stages', lesson => { lesson.navigation_stages = []; }, /cannot have top-level navigation_stages/],
    ['missing comparison', lesson => { delete lesson.comparison; }, /needs a top-level comparison/],
    ['missing mixed Practice', lesson => { delete lesson.question_bank; }, /needs a top-level question_bank/]
]) {
    test(`a parts lesson rejects ${name}`, () => {
        const lesson = fullPartsLesson();
        change(lesson);
        assert.throws(() => planSections(lesson), error);
    });
}
