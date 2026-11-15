const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const sectionPlans = require('./fixtures/section-plans.json');

const window = {};
const source = fs.readFileSync(path.join(__dirname, '../assets/js/lesson-engine.js'), 'utf8');
vm.runInNewContext(source, { window, document: { body: { dataset: { lessonRenderer: 'custom' } } } });
const engine = window.Maths1to9LessonEngine;
const { sectionKind, sectionPart, planSections, planScoreActivities, calculateScore, createScoreTracker, seededRandom } = engine;

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
test('the fixture plans every part in order, then Mixed Practice and Check', () => {
    const result = Array.from(planSections(partsFixture), section => ({ ...section }));
    assert.deepEqual(result, [
        { id: 'explanation--apples', kind: 'explanation', part: 'apples', label: 'Apples Learn' },
        { id: 'interactive--apples', kind: 'interactive', part: 'apples', label: 'Apples Try it' },
        { id: 'question-bank--apples', kind: 'question-bank', part: 'apples', label: 'Apples Practice' },
        { id: 'explanation--pears', kind: 'explanation', part: 'pears', label: 'Pears Learn' },
        { id: 'interactive--pears', kind: 'interactive', part: 'pears', label: 'Pears Try it' },
        { id: 'question-bank--pears', kind: 'question-bank', part: 'pears', label: 'Pears Practice' },
        { id: 'question-bank', kind: 'question-bank', part: null, label: 'Mixed Practice' },
        { id: 'comparison', kind: 'comparison', part: null, label: 'Check' }
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
        const lesson = structuredClone(partsFixture);
        change(lesson);
        assert.throws(() => planSections(lesson), error);
    });
}

test('the planned score reserves each section, guided activity and answer under its own id', () => {
    const { activities, reservedAnswerIds } = planScoreActivities(partsFixture);
    const parts = partsFixture.parts;
    const sectionPoints = (parts.length * 3 + 2) * 5;
    const guidedPoints = partsFixture.score_activities.length * 5;
    const banks = parts.map(part => [`question-bank--${part.id}`, part.question_bank.session_length]);
    banks.push(['question-bank', partsFixture.question_bank.session_length]);
    const answerIds = banks.flatMap(([id, count]) => Array.from({ length: count }, (_, index) => `answer:${id}:${index + 1}`));
    answerIds.push(...partsFixture.comparison.questions.map((_, index) => `answer:final-check-${index + 1}`));
    assert.deepEqual(Array.from(reservedAnswerIds), answerIds);
    assert.equal(new Set(Array.from(activities, activity => activity.id)).size, activities.length);
    assert.equal(calculateScore(activities).maximumPoints, sectionPoints + guidedPoints + answerIds.length * 10);

    const tracker = createScoreTracker([], undefined, reservedAnswerIds);
    for (const activity of activities) tracker.record(activity);
    const id = 'question-bank--apples';
    tracker.record({ id: `answer:${id}:1:1`, kind: 'answer', correct: true });
    tracker.record({ id: `answer:${id}:2:1`, kind: 'answer', correct: true });
    assert.equal(tracker.getScore().points, 10);
    tracker.record({ id: 'answer:question-bank--pears:1:1', kind: 'answer', correct: true });
    const restored = createScoreTracker(tracker.export(), undefined, reservedAnswerIds);
    assert.equal(restored.getScore().points, 20);
    assert.equal(restored.getScore().maximumPoints, tracker.getScore().maximumPoints);
});

test('Practice generators are deterministic and keep each part separate across 20 uint32 seeds', () => {
    const { pickPractice, practiceQuestion } = require('./fixtures/parts-lesson/questions.js');
    const sample = seededRandom(0x4d415448);
    const seeds = Array.from({ length: 20 }, () => Math.floor(sample() * 2 ** 32));
    for (const [part, length] of [['apples', 3], ['pears', 3], [null, 4]]) {
        const makeCards = seed => pickPractice(part, length, seededRandom(seed), engine)
            .map(item => practiceQuestion(item, seededRandom(item.seed), engine));
        for (const seed of seeds) {
            const cards = makeCards(seed);
            assert.deepEqual(cards, makeCards(seed));
            assert.equal(cards.length, length);
            assert.deepEqual(new Set(cards.map(card => card.part)), new Set(part ? [part] : ['apples', 'pears']));
            assert.deepEqual(new Set(cards.map(card => card.input)), new Set(['number', 'choice']));
            for (const card of cards.filter(card => card.input === 'choice')) {
                assert.equal(new Set(Array.from(card.options, option => option.label)).size, 4);
                assert.equal(card.options.filter(option => option.correct).length, 1);
            }
        }
    }
});
