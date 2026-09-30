// Solver for solving-linear-equations: the walkthrough highlights the next
// part to tap (data-guided-action / .is-target), so tap it.
const { section } = require('./common.cjs');

module.exports = async function solve(page) {
    if (await section(page) !== 'interactive') return false;
    if (await page.locator('.lesson-controls button:visible').first().isEnabled().catch(() => false)) return false;
    const target = page.locator('[data-lesson-section="interactive"] [data-guided-action]:visible:enabled, [data-lesson-section="interactive"] .is-target:visible:enabled');
    if (!(await target.count())) return false;
    await target.first().click();
    return true;
};
