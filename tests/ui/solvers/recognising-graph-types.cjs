const {MAIN_ACTION}=require('../helpers.cjs');
const slug='recognising-graph-types';
const root=page=>page.locator('.lesson-section:visible');
async function read(page){
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    return page.evaluate(async slug=>{
        const api=Maths1to9Lesson,Q=GraphTypes,id=api.getCurrentSection().id;
        const s=(await Maths1to9Progress.getLessonActivityState(slug,id==='explanation'?'learn':id))?.data;
        let q;
        if(id==='interactive')q=Q.examples[s.screen];
        else if(id==='comparison')q=Q.checks[s.screen];
        else if(id==='question-bank'&&s.items[s.screen]){const item=s.items[s.screen];q=Q.generate(item,Maths1to9LessonEngine.seededRandom(item.seed));}
        return{id,s,q};
    },slug);
}
async function solve(page){
    const {id,q}=await read(page);
    if(id==='explanation')return false;
    const main=page.locator(MAIN_ACTION+':visible').first();
    if(!q||(await main.textContent()).trim()!=='Check')return false;
    if(q.input==='choice')await root(page).getByRole('button',{name:q.options.find(o=>o.correct).label,exact:true}).click();
    else if(q.input==='number')await root(page).locator('.question-card input').fill(q.answer);
    else await root(page).locator('.graphtypes-choice[data-option-id="'+q.widget.correctId+'"]').click();
    await main.click();return true;
}
module.exports=solve;
module.exports.read=read;
