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
