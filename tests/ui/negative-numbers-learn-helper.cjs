// Operate the visible Learn picture using real browser input.
module.exports = async function solveLearn(page) {
    const root = page.locator('.nn-learn:visible');
    if (!await root.count()) return false;
    const target = root.locator('[role="button"]').first();
    if (!await target.count()) return false;
    // Generic runners detect progress from text. Finish one visible journey
    // so seven picture-only hops are not mistaken for a stuck screen.
    const before = await root.innerText();
    for (let tap = 0; tap < 7; tap++) {
        const next = root.locator('[role="button"]').first();
        if (!await next.count()) break;
        await next.click();
        if (await root.innerText() !== before) break;
    }
    return true;
};
