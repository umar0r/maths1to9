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
vm.runInNewContext(fs.readFileSync(path.join(root, 'content/drawing-reciprocal-graphs/reciprocals.js'), 'utf8'), { window });
const Q = window.Reciprocals, E = window.Maths1to9LessonEngine;
const plain = value => JSON.parse(JSON.stringify(value));


test('reciprocals formats equations, decimal working and no-break maths', () => {
    assert.equal(Q.reciprocalText(1), 'y = 1/x');
    assert.equal(Q.reciprocalText(2), 'y = 2/x');
    for (const [k,x,text] of [[1,2,'1 ÷ 2 = 0.5'],[1,0.5,'1 ÷ 0.5 = 2'],[1,-2,'1 ÷ (−2) = −0.5'],[2,-0.5,'2 ÷ (−0.5) = −4']]) {
        assert.equal(Q.workingText(k,x),text);
        assert.equal(Q.valueOf(k,x),k/x);
    }
    assert.throws(()=>Q.valueOf(1,0),/zero/);
    assert.equal(Q.prose('y = 1/x at (−0.5, −2)'), 'y\u00a0=\u00a01/x at (−0.5,\u00a0−2)');
});
test('reciprocal value rules preserve order, skip the answer and duplicate mistakes', () => {
    const seen=new Set();
    for(const k of [1,2]) for(const x of [-4,-2,-1,-0.5,-0.25,0.25,0.5,1,2,4]) {
        const rules=Q.valueRules(k,x),values=rules.map(r=>Number(r.value));
        assert.equal(new Set(values).size,values.length);
        assert.ok(!values.includes(k/x));
        for(const rule of rules)seen.add(rule.feedback.split('.')[0]);
        const expected=[x/k,k*x,-k/x,0].filter((v,i,a)=>v!==k/x&&a.indexOf(v)===i);
        assert.deepEqual(plain(values),expected);
    }
    assert.ok([...seen].some(s=>s.includes('multiplying')));
    assert.deepEqual(plain(Q.valueRules(1,4)).map(r=>r.value),['4','-0.25','0']);
    assert.match(Q.valueCard(2,-0.5).fallback,/Divide 2 by x/);
});
test('reciprocal table rules cover wrong way, sign, each single box and fallback', () => {
    for(const k of [1,2]) for(const xs of Q.tableSets(k)) {
        const widget=Q.tableWidget(k,xs),right=Object.fromEntries(xs.map(x=>['x'+x,String(k/x)]));
        assert.equal(widget.mark(right).correct,true);
        assert.match(widget.mark(Object.fromEntries(xs.map(x=>['x'+x,String(x/k)]))).feedback,/not x by/);
        const positive={...right};xs.filter(x=>x<0).forEach(x=>positive['x'+x]=String(-k/x));
        assert.match(widget.mark(positive).feedback,/negative x/);
        for(const x of xs) assert.equal(widget.mark({...right,['x'+x]:'99'}).feedback,Q.prose('One box is wrong. Work out that one again: '+Q.workingText(k,x)));
        assert.equal(widget.mark(Object.fromEntries(xs.map(x=>['x'+x,'99']))).correct,false);
        assert.equal(widget.isEmpty({...right,['x'+xs[0]]:''}),true);
    }
    for(const s of ['-.25','−0.25','–.25'])assert.equal(Q.readNumber(s),-0.25);
    for(const s of ['','-','.','NaN','Infinity','1/4'])assert.equal(Q.readNumber(s),null);
});
test('reciprocal plotting feedback covers swaps, signs, halves on either axis and fallback', () => {
    const target=[-2,-0.5];
    assert.match(Q.plotMark([-0.5,-2],target).feedback,/across first/);
    assert.match(Q.plotMark([2,-0.5],target).feedback,/x sign/);
    assert.match(Q.plotMark([-2,0.5],target).feedback,/y sign/);
    for(const p of [[-2,0],[-1.5,-0.5]])assert.match(Q.plotMark(p,target).feedback,/Each faint line/);
    assert.equal(Q.plotMark([0,0],target).feedback,'Start at (0, 0). Go across to x = −2, then down to y = −0.5.');
    assert.equal(Q.plotMark(target,target).correct,true);
});
test('reciprocal drawings are two clipped pieces; only deliberate wrong joins bridge zero', () => {
    for(const k of [1,2]) {
        const plots=[],segments=[];
        const board={plot(fn,options){plots.push({fn,...options});return{};},segment(a,b){segments.push([a,b]);return{};}};
        Q.drawCurves(board,k);
        assert.equal(plots.length,2);
        for(const p of plots)for(let i=0;i<=100;i++){
            const x=p.domain[0]+(p.domain[1]-p.domain[0])*i/100;
            assert.ok(x!==0&&Math.abs(p.fn(x))<=4+1e-12);
        }
    }
    for(let index=0;index<4;index++){
        const plots=[],segments=[];
        const board={plot(fn,options){plots.push({fn,...options});return{};},segment(a,b){segments.push([a,b]);return{};}};
        Q.joinDrawing(board,1,index);
        assert.equal(segments.some(([a,b])=>a[0]*b[0]<0),index===1||index===2);
        for(const [a,b] of segments)assert.ok([...a,...b].every(v=>Math.abs(v)<=4));
        for(const p of plots)assert.ok(p.domain[0]*p.domain[1]>0);
    }
});
test('reciprocal generator repeats by seed, alternates all typed types with distinct choices and stays on grid', () => {
    const seen=new Set();let doubles=0;
    for(let i=0;i<1000;i++){
        const seed=Math.imul(i,2654435761)>>>0,session=Q.pick(E.seededRandom(seed));
        assert.deepEqual(plain(session),plain(Q.pick(E.seededRandom(seed))));
        assert.equal(session.length,6);
        assert.equal(new Set(session.map(q=>q.type)).size,6);
        if(session[0].k===2)doubles++;
        session.forEach((item,index)=>{
            seen.add(item.type);
            assert.ok((index%2?Q.choiceTypes:Q.typedTypes).includes(item.type));
            assert.equal(item.k,session[0].k);
            const q=Q.generate(item,E.seededRandom(item.seed));
            assert.deepEqual(plain(q),plain(Q.generate(item,E.seededRandom(item.seed))));
            if(q.options){
                assert.equal(q.options.length,4);
                assert.equal(new Set(q.options.map(o=>o.label)).size,4);
                assert.equal(q.options.filter(o=>o.correct).length,1);
                assert.ok(q.options.every(o=>o.feedback));
            }
            if(item.type==='table')for(const answer of Object.values(q.widget.answers))assert.ok(Math.abs(Number(answer))<=4);
            if(item.type==='plot'){
                let count=0;
                for(let x=-4;x<=4;x+=0.5)for(let y=-4;y<=4;y+=0.5)if(q.widget.mark([x,y]).correct)count++;
                assert.equal(count,1);
            }
        });
    }
    assert.equal(seen.size,8);assert.ok(doubles>280&&doubles<390);
});
