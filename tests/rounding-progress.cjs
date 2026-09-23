const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'content/rounding-and-significant-figures/lesson.js'), 'utf8');
const normalise = source.slice(source.indexOf('    const normalise ='), source.indexOf('    const engine ='));
const matches = source.slice(source.indexOf('    function matches('), source.indexOf('    function advance('));
const context = vm.createContext({});
vm.runInContext(normalise + matches, context);
for (const [value, expected, result] of [
    ['2,700','2700',true], ['.0073','0.0073',true], ['1.0','1',true],
    ['0.0073000000000000001','0.0073',false], ['27,00','2700',false],
    ['','0',false], ['1abc','1',false], ['1e3','1000',false], ['Infinity','1',false]
]) assert.equal(context.matches({answer:expected},value),result, value);
assert.equal(context.matches({answer:'1.0',places:1},'1'),false);
assert.equal(context.matches({answer:'1.0',places:1},'1.0'),true);
assert.equal(context.matches({answer:'1.0',places:1},'1.00'),false);
const lesson=JSON.parse(fs.readFileSync(path.join(root,'content/rounding-and-significant-figures/lesson.json')));
for(const q of [...lesson.guided,...lesson.practice,...lesson.check]) {
    assert(context.matches(q,q.answer),q.prompt);
    if(q.options) assert.equal(q.options.filter(value=>context.matches(q,value)).length,1,q.prompt);
}
const storage = new Map();
const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k),key:i=>[...storage.keys()][i],get length(){return storage.size;}};
const sandbox = vm.createContext({window:{localStorage,crypto:{randomUUID:()=> 'test-id'}},document:{addEventListener(){},dispatchEvent(){}},CustomEvent:class{constructor(type,init){this.type=type;this.detail=init.detail;}},console});
vm.runInContext(fs.readFileSync(path.join(root,'assets/js/progress.js'),'utf8'),sandbox);
(async()=>{
    const api=sandbox.window.Maths1to9Progress;
    const record={title:'Rounding',score:{points:95},finished:false,roundingState:{slide:22,answers:{12:{firstCorrect:false,correct:true}}}};
    await api.saveLessonProgress(lesson.slug,record);
    record.roundingState.slide=0;
    assert.equal((await api.getLessonProgress(lesson.slug)).roundingState.slide,22,'Saved snapshot is isolated');
    await api.saveLessonProgress(lesson.slug,await api.getLessonProgress(lesson.slug));
    assert.equal((await api.getScoreSummary()).points,95,'Repeated save must not award more points');
    await api.saveLessonProgress(lesson.slug,{score:{points:145},finished:true});
    assert.equal((await api.getScoreSummary()).completedLessons,1);
    assert.equal((await api.getScoreSummary()).points,145);
    api.setUserId('second-pupil');
    assert.equal((await api.getScoreSummary()).points,0,'User scores are isolated');
    api.setUserId('anon-test-id');
    assert.equal((await api.getScoreSummary()).points,145);
    console.log('Rounding: all answers, precision, saved snapshots, score deduplication and user isolation passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
