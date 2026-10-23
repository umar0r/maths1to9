const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const window = {};
vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/js/lesson-engine.js'), 'utf8'), {
    window, document: { body: { dataset: { lessonRenderer: 'custom' } } }
});
vm.runInNewContext(fs.readFileSync(path.join(root, 'content/recognising-graph-types/graphtypes.js'), 'utf8'), { window });
const Q = window.GraphTypes, E = window.Maths1to9LessonEngine;
const plain = value => JSON.parse(JSON.stringify(value));



test('graph types format every equation family tidily and calculate values', () => {
    for(const [form,text] of [
        [{kind:'line',m:1,c:-1},'y = x − 1'],[{kind:'line',m:-1,c:0},'y = −x'],
        [{kind:'line',m:3,c:2},'y = 3x + 2'],[{kind:'quadratic',a:-1,c:3},'y = 3 − x²'],
        [{kind:'quadratic',a:-1,c:0},'y = −x²'],[{kind:'quadratic',b:1},'y = x² + x'],
        [{kind:'cubic',a:2,c:-1},'y = 2x³ − 1'],[{kind:'cubic'},'y = x³'],[{kind:'reciprocal',k:3},'y = 3/x']
    ]){
        assert.equal(Q.equationText(form),text);
        assert.ok(!text.includes('1x')&&!text.includes('+ −'));
    }
    assert.equal(Q.valueOf({kind:'line',m:-1,c:2},3),-1);
    assert.equal(Q.valueOf({kind:'quadratic',a:-1,c:3},2),-1);
    assert.equal(Q.valueOf({kind:'quadratic',b:1},-0.5),-0.25);
    assert.equal(Q.valueOf({kind:'cubic',a:2,c:-1},-2),-17);
    assert.equal(Q.valueOf({kind:'reciprocal',k:2},-0.5),-4);
    assert.throws(()=>Q.valueOf({kind:'reciprocal'},0),/zero/);
    assert.equal(Q.prose('For y = 2x³ − 1.'),'For y\u00a0=\u00a02x³\u00a0−\u00a01.');
});
test('all drawn forms stop at the grid edges and reciprocals have two separate plots', () => {
    const forms=[];
    for(const m of [1,2,3,-1])for(let c=-3;c<=3;c++)forms.push({kind:'line',m,c});
    for(const a of [1,-1])for(let c=-3;c<=3;c++)forms.push({kind:'quadratic',a,c});
    for(const a of [1,2])for(let c=-2;c<=2;c++)forms.push({kind:'cubic',a,c});
    for(const k of [1,2,3])forms.push({kind:'reciprocal',k});
    forms.push({kind:'quadratic',b:1});
    for(const form of forms){
        const plots=[],board={plot(fn,options){plots.push({fn,...options});return{};}};
        Q.drawForm(board,form);
        assert.equal(plots.length,form.kind==='reciprocal'?2:1);
        for(const plot of plots){
            assert.ok(plot.domain[0]<plot.domain[1]);
            assert.ok(plot.domain.every(x=>Math.abs(x)<=4));
            if(form.kind==='reciprocal')assert.ok(plot.domain[0]*plot.domain[1]>0);
            for(let i=0;i<=100;i++){
                const x=plot.domain[0]+(plot.domain[1]-plot.domain[0])*i/100;
                assert.ok(Math.abs(plot.fn(x))<=6+1e-10,JSON.stringify(form));
            }
        }
    }
});
test('highest power rules cover lower powers and coefficients without duplicates or the answer', () => {
    for(const sum of Q.powerSums){
        const rules=Q.powerRules(sum),values=rules.map(r=>Number(r.value));
        assert.equal(new Set(values).size,values.length);
        assert.ok(!values.includes(sum.power));
        if(sum.lower)assert.match(rules[0].feedback,/higher power/);
        if(sum.coefficient!==sum.power&&sum.coefficient!==sum.lower)assert.match(rules.at(-1).feedback,/number in front/);
        assert.equal(Q.powerCard(sum).answer,String(sum.power));
    }
    assert.deepEqual(plain(Q.powerRules(Q.powerSums[0])).map(r=>r.value),['1']);
    assert.deepEqual(plain(Q.powerRules(Q.powerSums[2])).map(r=>r.value),['1']);
    assert.deepEqual(plain(Q.powerRules(Q.powerSums[3])).map(r=>r.value),['2','1']);
    assert.deepEqual(plain(Q.powerRules(Q.powerSums[4])).map(r=>r.value),['5']);
});
test('missing power marks the two other powers with their own shapes', () => {
    for(const kind of ['line','quadratic','cubic']){
        const form={kind,a:1,m:1,c:-1},card=Q.missingCard(form),rules=Q.missingRules(form);
        assert.equal(card.answer,String(Q.powerOf(form)));
        assert.equal(rules.length,2);
        assert.equal(new Set(rules.map(r=>r.value)).size,2);
        assert.ok(rules.every(r=>r.value!==card.answer&&r.feedback.includes(Q.shape(form))));
        assert.ok(rules.every(r=>r.feedback.includes(Q.powerShape(Number(r.value)))));
    }
});
test('graph choices use stable ids and caption letters after order changes', () => {
    const forms=Q.formsFor(-1,2),options=Q.graphOptions(forms,forms[2]),widget=Q.graphChoice(options);
    assert.equal(widget.correctId,'cubic');
    assert.equal(widget.mark('cubic').correct,true);
    assert.equal(widget.answerText('cubic'),'You chose Graph C.');
    const shuffled=Q.graphChoice([...options].reverse());
    assert.equal(shuffled.answerText('cubic'),'You chose Graph B.');
    for(const option of options.filter(o=>!o.correct)){
        assert.equal(widget.mark(option.id).correct,false);
        assert.equal(widget.mark(option.id).feedback,Q.prose(option.feedback));
    }
    assert.equal(new Set(options.filter(o=>!o.correct).map(o=>o.feedback)).size,3);
});
test('graph type generator keeps the six required types, typed slots, one kind per choice and deterministic forms', () => {
    const totals=Object.fromEntries(Q.kinds.map(kind=>[kind,0]));
    for(let i=0;i<200;i++){
        const seed=Math.imul(i,2654435761)>>>0,session=Q.pick(E.seededRandom(seed));
        assert.deepEqual(plain(session),plain(Q.pick(E.seededRandom(seed))));
        assert.equal(session.length,6);
        assert.equal(new Set(session.map(q=>q.type)).size,6);
        session.forEach((item,index)=>{
            const q=Q.generate(item,E.seededRandom(item.seed));
            assert.deepEqual(plain(q),plain(Q.generate(item,E.seededRandom(item.seed))));
            assert.equal(['power','missing-power'].includes(item.type),index===0||index===3);
            if(q.options){
                assert.equal(q.options.length,4);
                assert.equal(q.options.filter(o=>o.correct).length,1);
                assert.equal(new Set(q.options.map(o=>o.label)).size,4);
                assert.deepEqual(plain(q.options.map(o=>o.kind)).sort(),plain(Q.kinds).sort());
                assert.equal(new Set(q.options.filter(o=>!o.correct).map(o=>o.feedback)).size,3);
            }
            if(q.widget){
                assert.equal(q.widget.options.length,4);
                assert.equal(new Set(q.widget.options.map(o=>o.id)).size,4);
                assert.equal(q.widget.options.filter(o=>o.correct).length,1);
            }
            if(q.form&&item.type!=='missing-power')totals[q.form.kind]++;
            if(item.type==='missing-power'){
                assert.equal(q.form.a,1);assert.equal(q.form.m,1);
                assert.ok(['1','2','3'].includes(q.answer));
            }
        });
    }
    for(const total of Object.values(totals))assert.ok(total>=150&&total<=250,JSON.stringify(totals));
});
