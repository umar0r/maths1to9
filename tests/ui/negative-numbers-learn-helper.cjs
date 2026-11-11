// Operate the visible Learn picture using real browser input.
module.exports = async function solveLearn(page) {
    const root = page.locator('.nn-learn:visible');
    if (!await root.count()) return false;
    // Try it: press the arrow keys until the dot lands on the answer.
    const line = page.locator('.negative-line--movable:visible');
    if (await line.count()) {
        const target = Number(await line.getAttribute('data-answer'));
        await line.focus();
        const dot = Number((await page.locator('.negative-dot-value:visible').innerText()).replace('−', '-'));
        for (let step = 0; step < Math.abs(target - dot); step++) await line.press(target > dot ? 'ArrowRight' : 'ArrowLeft');
        return true;
    }
    const reveal = root.locator('.nn-reveal__cards button[aria-pressed="false"]:enabled');
    if (await reveal.count()) {
        while (await reveal.count()) await reveal.first().click();
        return true;
    }
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
