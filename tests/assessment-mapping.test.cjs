const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadScript } = require('./helpers/lessons.cjs');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'assets/js/lesson-engine.js'), 'utf8');
const body = source.slice(source.indexOf('    function recordAssessment(detail)'), source.indexOf('    function setSectionAction('));
function harness(mapping) {
    const scores = [], events = [], warnings = [];
    const record = new Function('state', 'scoreTracker', 'document', 'CustomEvent', 'console', 'assessmentSessionId', 'normaliseText', 'isObject', 'safeArray', body + '\nreturn recordAssessment;')(
        {slug:'test', lesson:{assessment:{question_types:mapping}}},
        {has:()=>true, record:a=>scores.push(a)}, {dispatchEvent:e=>events.push(e)},
        function(type, data) { this.type = type; this.detail = data.detail; },
        {warn:message=>warnings.push(message)}, 'session',
        value => typeof value === 'string' ? value.trim() : '',
        value => value !== null && typeof value === 'object' && !Array.isArray(value),
        value => Array.isArray(value) ? value : []);
    return {record, scores, events, warnings};
}
test('unmapped or empty assessment types warn and cannot silently award points', () => {
    for (const mapping of [{}, {unknown:[]}, {unknown:['', null]}]) {
        const h = harness(mapping);
        assert.equal(h.record({questionType:'unknown', questionId:'final-check-1', correct:true}), false);
        assert.equal(h.scores.length, 0);
        assert.equal(h.events.length, 0);
        assert.match(h.warnings[0], /unknown.*no skill mapping.*final-check-1/);
    }
});
test('mapped answers record scores and one attempt per distinct skill, including wrong answers', () => {
    for (const correct of [true, false]) {
        const h = harness({compare:['order-numbers', 'inequality-symbols', 'order-numbers']});
        assert.equal(h.record({questionType:'compare', questionId:'final-check-2', correct}), true);
        assert.equal(h.scores.length, 1);
        assert.deepEqual(h.events.map(e=>e.detail.skillId), ['order-numbers', 'inequality-symbols']);
        assert.ok(h.events.every(e=>e.detail.correct === correct));
        assert.equal(h.warnings.length, 0);
    }
});
test('every place-value final check question records the intended skills', () => {
    const {createFinalCheckQuestions} = loadScript(path.join(root, 'content/place-value/questions.js'), ['createFinalCheckQuestions']);
    const mapping = JSON.parse(fs.readFileSync(path.join(root, 'content/place-value/lesson.json'))).assessment.question_types;
    const h = harness(mapping);
    const questions = createFinalCheckQuestions();
    const expected = [['place-value'], ['order-numbers','inequality-symbols'], ['order-numbers'], ['place-value'], ['place-value']];
    questions.forEach((q, i) => {
        const before = h.events.length;
        assert.equal(h.record({questionType:q.assessmentType, questionId:`final-check-${i+1}`, correct:true}), true);
        assert.deepEqual(h.events.slice(before).map(e=>e.detail.skillId), expected[i]);
    });
    assert.equal(h.scores.length, 5);
    assert.equal(h.warnings.length, 0);
});
