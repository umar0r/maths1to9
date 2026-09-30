const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname,'../assets/js/lesson-engine.js'),'utf8');
const listeners = new Map();
let url = new URL('https://example.test/lesson/#summary');
const history = [];
const window = {
    get location(){return url;},
    history:{pushState(_,__,next){history.push(String(next));url=new URL(next);},replaceState(_,__,next){url=new URL(next);}},
    addEventListener(name,fn){listeners.set(name,fn);},removeEventListener(name){listeners.delete(name);}
};
const context=vm.createContext({window,URL});
vm.runInContext(source.slice(0,source.indexOf('\n(() => {\n    \'use strict\';\n\n    if (document.body')),context);
const {createRouter,updateStageProgress}=window.Maths1to9LessonEngine;
const router=createRouter();
let viewed='';
router.register('summary',()=>{viewed='summary';router.sync('check');});
router.register('practice',()=>{viewed='practice';},['practise']);
assert.equal(router.start(),true);
assert.equal(viewed,'summary');
assert.equal(url.hash,'#summary','Routing cannot rewrite an explicit hash');
router.sync('practice'); assert.equal(url.hash,'#practice'); assert.equal(history.length,1);
router.sync('practice'); assert.equal(history.length,1,'No duplicate history entries');
url.hash='#summary';listeners.get('hashchange')();assert.equal(viewed,'summary');
url.hash='#practise';listeners.get('hashchange')();assert.equal(viewed,'practice');
url.hash='#missing';assert.equal(router.hasHash(),false);listeners.get('hashchange')();assert.equal(viewed,'practice');
url.hash='#%E0%A4%A';assert.equal(router.hasHash(),false,'Malformed hashes are harmless');
const button={textContent:'Learn',dataset:{},style:{setProperty(k,v){this[k]=v;}},setAttribute(k,v){this[k]=v;}};
updateStageProgress(button,2,6);assert.equal(button.dataset.stageProgress,'33');
assert.equal(button['aria-label'],'Learn, 33% complete');
updateStageProgress(button,9,6);assert.equal(button.style['--stage-fill'],'100%');
updateStageProgress(button,2,0);assert.equal(button.style['--stage-fill'],'0%');
router.destroy();assert.equal(listeners.has('hashchange'),false);
console.log('Shared lesson navigation: deep links, aliases, history, malformed hashes and partial progress passed.');

const tracker = window.Maths1to9LessonEngine.createScoreTracker();
tracker.record({id:'learn-1'});
tracker.record({id:'learn-1'});
assert.equal(tracker.getScore().points,5);
tracker.record({id:'number-line',kind:'explore'});
tracker.record({id:'question-1',kind:'answer',correct:false});
tracker.record({id:'question-1',kind:'answer',correct:true});
assert.equal(tracker.getScore().points,15);
assert.equal(tracker.getScore().correctFirstTry,0);
const restored = window.Maths1to9LessonEngine.createScoreTracker(tracker.export());
restored.record({id:'question-1',kind:'answer',correct:true});
assert.equal(restored.getScore().points,15);
restored.record({id:'question-2',kind:'answer',correct:true});
assert.equal(restored.getScore().points,25);
console.log('Core scoring: learning, exploration, retries, deduplication and restore passed.');

const planned = window.Maths1to9LessonEngine.createScoreTracker();
for (const activity of [{id:'section:learn'}, {id:'step:method:0',kind:'guided'}, {id:'answer:question-bank:1',kind:'answer'}]) planned.record({...activity,completed:false});
assert.equal(planned.getScore().maximumPoints,20);
assert.equal(planned.getScore().points,0);
planned.record({id:'step:method:0',kind:'guided'});
assert.equal(planned.getScore().points,5);
planned.record({id:'answer:question-bank:1',kind:'answer',correct:false});
planned.record({id:'answer:question-bank:1',kind:'answer',correct:true});
assert.equal(planned.getScore().points,10);
assert.equal(planned.getScore().maximumPoints,20);
const resumed = window.Maths1to9LessonEngine.createScoreTracker(planned.export());
resumed.record({id:'step:method:0',kind:'guided',completed:false});
assert.equal(resumed.getScore().points,10);
const migrated = window.Maths1to9LessonEngine.createScoreTracker([{id:'answer:digitValue:question-bank:1',kind:'answer',completed:true,firstCorrect:true,correct:true}]);
migrated.record({id:'answer:question-bank:1',kind:'answer',completed:false});
assert.equal(migrated.getScore().points,10);
assert.equal(migrated.getScore().maximumPoints,10);
console.log('Planned maximum, corrected answers, reloads and legacy answer IDs passed.');

// Actual IDs emitted by the two affected lessons must fill the reserved slots.
for (const alias of ['answer:question-bank:1:1', 'answer:comparison:1', 'answer:comparison:1:1']) {
    const canonical = alias.includes('question-bank') ? 'answer:question-bank:1' : 'answer:final-check-1';
    const score = window.Maths1to9LessonEngine.createScoreTracker([], undefined, [canonical]);
    score.record({id:canonical, kind:'answer', completed:false});
    assert.equal(score.has(alias), true);
    score.record({id:alias, kind:'answer', correct:true});
    assert.equal(score.getScore().points, 10, alias);
    assert.equal(score.getScore().maximumPoints, 10, alias);
    const legacy = window.Maths1to9LessonEngine.createScoreTracker([
        {id:canonical, kind:'answer', completed:false},
        {id:alias, kind:'answer', completed:true, firstCorrect:true, correct:true}
    ], undefined, [canonical]);
    assert.equal(legacy.getScore().points, 10, `restore ${alias}`);
    assert.equal(legacy.getScore().maximumPoints, 10, `restore ${alias}`);
    legacy.record({id:canonical, kind:'answer', completed:false});
    assert.equal(legacy.getScore().points, 10);
}
const replay = window.Maths1to9LessonEngine.createScoreTracker([], undefined, ['answer:question-bank:1']);
replay.record({id:'answer:question-bank:1', kind:'answer', completed:false});
replay.record({id:'answer:question-bank:1:1', kind:'answer', correct:false});
replay.record({id:'answer:question-bank:2:1', kind:'answer', correct:true});
assert.equal(replay.getScore().points, 5, 'A new run cannot erase the first wrong attempt');
assert.equal(replay.getScore().maximumPoints, 10);
assert.equal(replay.has('answer:unknown:1'), false, 'Unreserved IDs can be detected');
console.log('Practice run IDs, comparison IDs, saved progress and replay scoring passed.');

// Function machines records distinct question/step pairs, not practice runs.
const steps = window.Maths1to9LessonEngine.createScoreTracker();
steps.record({id:'answer:question-bank:1:2', kind:'answer', correct:true});
steps.record({id:'answer:question-bank:2:2', kind:'answer', correct:false});
assert.equal(steps.getScore().maximumPoints, 20);
assert.equal(steps.getScore().points, 10, 'An earlier correct step must not hide a later wrong answer');
steps.record({id:'answer:question-bank:2:2', kind:'answer', correct:true});
assert.equal(steps.getScore().points, 15);
const restoredSteps = window.Maths1to9LessonEngine.createScoreTracker(steps.export());
assert.equal(restoredSteps.getScore().maximumPoints, 20);
assert.equal(restoredSteps.getScore().points, 15);
assert.equal(restoredSteps.export().length, 2);
const otherSection = window.Maths1to9LessonEngine.createScoreTracker([], undefined, ['answer:final-check-1']);
otherSection.record({id:'answer:question-bank:1:2', kind:'answer', correct:true});
otherSection.record({id:'answer:question-bank:2:2', kind:'answer', correct:true});
assert.equal(otherSection.getScore().maximumPoints, 20, 'A fixed final check must not merge practice steps');
console.log('Question/step IDs remain distinct during recording and restore.');
