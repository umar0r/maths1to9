// Answers the lesson's controls, leaving the shared main action to the runner.
module.exports = async function solve(page) {
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const data = await page.evaluate(async () => {
        const api = window.Maths1to9Lesson, E = window.StraightLineEquations;
        if (!api || !E) return null;
        const sectionId = api.getCurrentSection().id;
        const key = sectionId === 'explanation' ? 'learn' : sectionId;
        const state = (await Maths1to9Progress.getLessonActivityState('equations-of-straight-lines', key))?.data;
        if (!state) return null;
        if (sectionId === 'explanation') return { sectionId, state };
        let question;
        if (sectionId === 'interactive') question = E.examples[state.screen];
        if (sectionId === 'comparison') question = E.checks[state.screen];
        if (sectionId === 'question-bank' && state.items[state.screen]) {
            const item = state.items[state.screen]; question = E.generate(item, Maths1to9LessonEngine.seededRandom(item.seed));
        }
        return { sectionId, state, question };
    });
    if (!data) return false;
    const { sectionId, state, question } = data;
    const root = page.locator('.lesson-section:visible');
    if (sectionId === 'explanation') {
        const click = async label => {
            const control = root.getByRole('button', { name: label, exact: true });
            if (await control.count() && await control.isEnabled()) { await control.click(); return true; }
            return false;
        };
        if (state.screen === 0) {
            for (const label of ['2y\u00a0=\u00a04x\u00a0+\u00a06', 'y\u00a0=\u00a02x\u00a0+\u00a03']) if (await click(label)) return true;
        }
        if (state.screen === 1 && !state.reordered) return click('Put the x term first');
        if (state.screen === 2 && !state.steps[2].length) return click('+ 3 to both sides');
        if (state.screen === 3 && !state.steps[3].length) return click('÷ 2 both sides');
        if (state.screen === 4) {
            const divided = state.steps[4].some(step => step.kind === 'divide');
            const subtracted = state.steps[4].some(step => step.kind === 'add');
            if (!subtracted) return click(`− ${divided ? 2 : 4} from both sides`);
            if (!divided) return click('÷ 2 both sides');
        }
        if ([1, 2, 3, 5].includes(state.screen) && !state.choices[state.screen]?.correct) {
            const label = await page.evaluate(screen => StraightLineEquations.learnChoices[screen].options.find(o => o.correct).label, state.screen);
            return click(label);
        }
        if (state.screen === 6) {
            for (const label of ['Left side: 2y', 'Right side: 4x + 6']) if (await click(label)) return true;
        }
        return false;
    }
    if (!question) return false;
    const main = page.locator('.lesson-controls button.button--primary:visible').first();
    if ((await main.textContent()).trim() !== 'Check') return false;
    if (question.input === 'number') {
        const inputs = root.locator('.question-card input');
        if (!await inputs.count()) return false;
        for (const [index, field] of question.fields.entries()) await inputs.nth(index).fill(question.answer[field.id]);
    } else {
        await root.getByRole('button', { name: question.options.find(o => o.correct).label, exact: true }).click();
    }
    await main.click();
    return true;
};
