// Solver for pie-charts (older standalone lesson with its own Continue buttons).
// Presses each Continue and answers "How much of the circle is …?" from the counts.
const SHARES = { 0.25: 'One quarter', 0.5: 'One half', 0.75: 'Three quarters', 1: 'The whole circle' };

module.exports = async function solve(page, memory) {
    const radios = page.locator('main input[type=radio]:visible:enabled');
    if (await radios.count() && !memory.answered) {
        const text = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
        const [, part, whole] = text.match(/(\d+) of the (\d+) \w+/) ?? [];
        const answer = SHARES[Number(part) / Number(whole)];
        if (!answer) throw new Error(`the solver cannot answer: "${text.slice(0, 200)}"`);
        await page.locator('main label', { hasText: answer }).locator('input[type=radio]').check({ force: true });
        await page.locator('#check-answer').click();
        memory.answered = true;
        return true;
    }
    for (const id of ['#continue-step', '#method-next']) {
        const button = page.locator(`${id}:visible:enabled`);
        if (await button.count()) { await button.click(); return true; }
    }
    return false;
};
