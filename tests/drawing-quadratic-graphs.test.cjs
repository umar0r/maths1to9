const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const window = {};
vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/js/lesson-engine.js'), 'utf8'), { window, document: { body: { dataset: { lessonRenderer: 'custom' } } } });
vm.runInNewContext(fs.readFileSync(path.join(root, 'content/drawing-quadratic-graphs/quadratics.js'), 'utf8'), { window });
const Q = window.Quadratics, E = window.Maths1to9LessonEngine;
const plain = value => JSON.parse(JSON.stringify(value));
const form = { a: 1, c: -2 };

test('quadratics formats the specified equations and working with brackets only round negatives', () => {
    for (const [a, c, expected] of [[1,-1,'y = x² − 1'],[2,-4,'y = 2x² − 4'],[1,0,'y = x²'],[-1,3,'y = 3 − x²'],[1,1,'y = x² + 1']]) {
        assert.equal(Q.quadraticText({ a,c }), expected);
        assert.doesNotMatch(Q.quadraticText({ a,c }), /\+ −|-/);
    }
    for (const [a,c,x,expected] of [[1,-1,-2,'(−2)² − 1 = 4 − 1 = 3'],[2,-4,-2,'2 × (−2)² − 4 = 2 × 4 − 4 = 4'],[-1,3,-2,'3 − (−2)² = 3 − 4 = −1'],[1,-1,0,'0² − 1 = 0 − 1 = −1']]) assert.equal(Q.workingText({a,c},x), expected);
    assert.equal(Q.workingText({a:1,c:1},2), '2² + 1 = 4 + 1 = 5');
});

test('quadratics value rules cover every row and skip correct, duplicate and inapplicable values', () => {
    const rules = plain(Q.valueRules({a:2,c:-4},-2));
    assert.deepEqual(rules.map(r=>Number(r.value)), [-12,12,8]);
    assert.match(rules[0].feedback,/negative times a negative/);
    assert.ok(Q.valueRules({a:1,c:-2},-3).some(r=>r.feedback.includes('doubling')));
    // The multiply-before-square and constant-sign mistakes coincide here.
    assert.match(rules[1].feedback,/Square first, then multiply/);
    assert.match(rules.at(-1).feedback,/Don't forget/);
    assert.ok(Q.valueRules({a:-1,c:3},2).some(r=>r.feedback.includes('x² is taken away')));
    assert.ok(Q.valueRules({a:1,c:1},-3).some(r=>r.feedback.includes('so add 1')));
    assert.ok(Q.valueRules(form,-3).some(r=>r.feedback.includes('so subtract 2')));
    for(const a of [1,2,-1]) for(const c of [-4,0,3]) for(let x=-3;x<=3;x++) {
        const rules=Q.valueRules({a,c},x), values=rules.map(r=>Number(r.value));
        assert.equal(new Set(values).size,values.length);
        assert.ok(!values.includes(Q.valueOf({a,c},x)));
        if(x>=0) assert.ok(!rules.some(r=>r.feedback.startsWith('A negative')));
        if(a!==2) assert.ok(!rules.some(r=>r.feedback.startsWith('Square first, then multiply')));
        if(!c) assert.ok(!rules.some(r=>r.feedback.includes('forget')||r.feedback.includes('sign of the number')));
    }
});

test('quadratics table rules match negative squares, doubling, zero and each single wrong field in order', () => {
    const rules = Q.tableRules(form);
    const answer = Object.fromEntries(Q.xs.map(x=>[`x${x}`,Q.valueOf(form,x)]));
    const feedback = values => rules.find(r=>Object.entries(r.value).every(([key,v])=>Number(v)===values[key]))?.feedback;
    assert.match(feedback({...answer,'x-2':-6,'x-1':-3}),/negative times a negative/);
    assert.match(feedback(Object.fromEntries(Q.xs.map(x=>[`x${x}`,2*x-2]))),/doubling/);
    assert.match(feedback({...answer,x0:99}),/When x = 0/);
    for(const x of [-2,-1,1,2]) assert.equal(feedback({...answer,[`x${x}`]:99}),`One box is wrong. Work out that one again: ${Q.workingText(form,x)}`);
    assert.equal(feedback(Object.fromEntries(Q.xs.map(x=>[`x${x}`,99]))),undefined);
});

test('quadratics plot marking covers swapped coordinates, either sign, general guidance, zeros and correct points', () => {
    const target=[-2,3];
    assert.match(Q.plotMark([3,-2],target).feedback,/across first/);
    assert.match(Q.plotMark([2,3],target).feedback,/x sign/);
    assert.match(Q.plotMark([-2,-3],target).feedback,/y sign/);
    assert.equal(Q.plotMark([4,5],target).feedback,'Start at (0, 0). Go across to x = −2, then up to y = 3.');
    assert.match(Q.plotMark([4,5],[0,-1]).feedback,/down to y = −1/);
    assert.match(Q.plotMark([4,5],[-1,0]).feedback,/stay on the x-axis/);
    assert.match(Q.plotMark([1,0],[0,1]).feedback,/across first/);
    assert.equal(Q.plotMark([0,0],[0,0]).correct,true);
    assert.equal(Q.plotMark(target,target).correct,true);
});

test('quadratics generator alternates all six types, bounds every table, avoids duplicate options and repeats by seed', () => {
    let varied=0, ordinary=0;
    for(let i=0;i<1000;i++) {
        const seed = Math.imul(i,2654435761) >>> 0;
        const session=Q.pick(E.seededRandom(seed));
        assert.deepEqual(plain(session),plain(Q.pick(E.seededRandom(seed))));
        assert.equal(session.length,6);
        assert.equal(new Set(session.map(i=>i.type)).size,6);
        session[0].varied ? varied++ : ordinary++;
        session.forEach((item,index)=>{
            assert.ok((index%2?Q.choiceTypes:Q.typedTypes).includes(item.type));
            const q=Q.generate(item,E.seededRandom(item.seed));
            assert.deepEqual(plain(q),plain(Q.generate(item,E.seededRandom(item.seed))));
            if(q.options) {
                assert.equal(q.options.filter(o=>o.correct).length,1);
                assert.equal(new Set(q.options.map(o=>o.label)).size,q.options.length);
                assert.ok(q.options.every(o=>o.feedback));
            }
            if(item.type==='table') for(const value of Object.values(q.answer)) assert.ok(Number(value)>=-5&&Number(value)<=6);
        });
    }
    assert.ok(varied>350&&varied<650); assert.ok(ordinary>350&&ordinary<650);
});

test('quadratics hides given point coordinates and places a tapped label on its x side', () => {
    const board = { point(position, options) { return { position, options }; } };
    assert.equal(Q.point(board, [-2,3]).options.coordinates, false);
    assert.equal(Q.point(board, [-2,3], 'correct', true).options.labelSide, 'left');
    assert.equal(Q.point(board, [0,-1], 'incorrect', true).options.labelSide, 'right');
    assert.equal(Q.point(board, [2,3], 'correct', true).options.coordinates, true);
});
