// Solver for simplifying-expressions: select like terms by their letter part,
// drag terms into matching trays, and cancel zero pairs with the tiles.
const { section, sectionText, htmlDrag } = require('./common.cjs');

// "4a", "+5a", "−2a" -> "a"; "+6", "−1" -> "numbers".
const family = text => /[a-z]/.test(text) ? text.replace(/^[+−-]?\d*/, '') : 'numbers';

// Click every unselected term of the family the instruction asks for.
async function selectTerms(page, container, selector, instruction) {
    // The latest instruction wins ("Select the like terms" is just the intro).
    const asks = [...instruction.matchAll(/(?:Click all|Select) the (\S+?) terms|select the (numbers)/gi)]
        .map(m => m[1] ?? m[2]).filter(a => a && a !== 'like');
    const asked = asks.at(-1);
    if (!asked) return false;
    let acted = false;
    for (const term of await container.locator(`${selector}:visible:enabled`).all()) {
        const selected = /primary|selected/.test(await term.getAttribute('class') ?? '');
        if (!selected && family((await term.innerText()).trim()) === asked) { await term.click(); acted = true; }
    }
    return acted;
}

module.exports = async function solve(page) {
    const where = await section(page);
    const main = page.locator('.lesson-controls button:visible').first();
    if (await main.isEnabled().catch(() => false)) return false;
    const container = page.locator(`[data-lesson-section="${where}"]`);
    const text = await sectionText(page);

    if (where === 'explanation') {
        const example = container.locator('article.worked-example:visible').last();
        if (await example.locator('[data-paint-index]').count()) {
            return selectTerms(page, example, '[data-paint-index]', await example.innerText());
        }
        // Read the pile first: each drop changes it.
        const pile = await example.locator('[data-sorting-pile] [data-sort-term]')
            .evaluateAll(terms => terms.map(t => ({ id: t.dataset.sortTerm, family: t.dataset.family })));
        if (pile.length) {
            for (const { id, family: tray } of pile) {
                await htmlDrag(page, example.locator(`[data-sort-term="${id}"]`), example.locator(`[data-sort-tray="${tray}"]`));
            }
            return true;
        }
        const collect = example.locator('[data-collect-family]:visible:enabled');
        if (await collect.count()) { await collect.first().click(); await page.waitForTimeout(600); return true; }
        const negative = example.locator('[data-algebra-tile][data-sign="-1"]:visible:enabled');
        if (await negative.count()) {
            await htmlDrag(page, negative.first(), example.locator('[data-algebra-tile][data-sign="1"]:visible:enabled').first());
            await page.waitForTimeout(600);
            return true;
        }
    }
    if (where === 'interactive') return selectTerms(page, container, '[data-term-index]', text);
    return false;
};
