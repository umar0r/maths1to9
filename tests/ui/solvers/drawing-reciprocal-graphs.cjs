const { MAIN_ACTION } = require('../helpers.cjs');
const slug = 'drawing-reciprocal-graphs';
const root = page => page.locator('.lesson-section:visible');
async function tapPoint(page, position) {
    await root(page).locator('.maths-graph__board').scrollIntoViewIfNeeded();
    const box = await root(page).locator('.maths-graph__board').boundingBox();
    const relative = await root(page).locator('.maths-graph__board').evaluate((element, position) => {
        const board=Object.values(JXG.boards).find(b=>b.containerObj===element);
        return [board.origin.scrCoords[1]+position[0]*board.unitX,board.origin.scrCoords[2]-position[1]*board.unitY];
    }, position);
    if (await page.evaluate(()=>navigator.maxTouchPoints>0)) await page.touchscreen.tap(box.x+relative[0],box.y+relative[1]);
    else await page.mouse.click(box.x+relative[0],box.y+relative[1]);
}
async function read(page) {
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    return page.evaluate(async slug=>{
        const api=Maths1to9Lesson,Q=Reciprocals,id=api.getCurrentSection().id;
        const s=(await Maths1to9Progress.getLessonActivityState(slug,id==='explanation'?'learn':id))?.data;
        let q;
        if(id==='interactive')q=Q.examples[s.screen];
        else if(id==='comparison')q=Q.checks[s.screen];
        else if(id==='question-bank'&&s.items[s.screen]) {const item=s.items[s.screen];q=Q.generate(item,Maths1to9LessonEngine.seededRandom(item.seed));}
        return {id,s,q};
    },slug);
}
async function solve(page) {
    const {id,s,q}=await read(page);
    const click=async name=>{await root(page).getByRole('button',{name,exact:true}).click();return true;};
    // Learn has nothing to answer: the main button moves on.
    if(id==='explanation')return false;
    if(id==='interactive'&&s.screen===2&&s.plotted.length<6){const x=[-2,-1,-0.5,0.5,1,2][s.plotted.length];await tapPoint(page,[x,1/x]);return true;}
    if(id==='interactive'&&s.screen===3&&!s.joined)return click('Two separate smooth curves');
    const main=page.locator(`${MAIN_ACTION}:visible`).first();
    if(!q||(await main.textContent()).trim()!=='Check')return false;
    if(q.input==='choice') await root(page).getByRole('button',{name:q.options.find(o=>o.correct).label,exact:true}).click();
    else if(q.input==='number') {
        const inputs=root(page).locator('.question-card input');
        if(q.fields)for(let i=0;i<q.fields.length;i++)await inputs.nth(i).fill(q.answer[q.fields[i].id]);
        else await inputs.fill(q.answer);
    } else if(q.widget?.kind==='table') {
        // The table's own cells are the answer boxes.
        const cells=root(page).locator('.question-card .reciprocal-cell');
        for(let i=0;i<q.widget.values.length;i++)await cells.nth(i).fill(q.widget.answers[`x${q.widget.values[i]}`]);
    } else {
        const target=await root(page).locator('.reciprocal-table').evaluate(table=>{
            const xText=document.querySelector('.lesson-section:not([hidden]) .question-prompt')?.textContent || table.parentElement.parentElement.textContent;
            const x=Number(xText.match(/x\s*=\s*(−?\d+(?:\.\d+)?)/)?.[1].replace('−','-'));
            const columns=[...table.rows[0].cells].slice(1).map(c=>Number(c.textContent.replace('−','-')));
            return [x,Number(table.rows[1].cells[columns.indexOf(x)+1].textContent.replace('−','-'))];
        });
        await tapPoint(page,target);
    }
    await main.click(); return true;
}
module.exports=solve;
module.exports.tapPoint=tapPoint;
module.exports.read=read;
