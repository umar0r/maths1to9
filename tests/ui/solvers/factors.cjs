const factors = number => Array.from({ length: number }, (_, index) => index + 1).filter(value => number % value === 0);
async function solve(page) {
    const explorer = page.getByRole('slider', { name: 'Rows to explore', exact: true });
    if (await explorer.isVisible()) await explorer.press('End');
    const main = page.locator('.lesson-controls button.button--primary:visible');
    if (await main.innerText() !== 'Check') return false;
    const prompt = await page.locator('.question-prompt:visible').innerText();
    if (prompt.startsWith('Make ')) {
        const number = Number(prompt.match(/Make (\d+) counters/)[1]);
        const rows = [2, 3, 4, 5, 6].find(value => number % value === 0);
        const slider = page.getByRole('slider', { name: 'Number of rows', exact: true });
        if (await main.isEnabled() && Number(await slider.inputValue()) === rows) return false;
        await slider.press('End');
        if (rows !== 6) {
            await slider.press('Home');
            for (let value = 2; value < rows; value++) await slider.press('ArrowRight');
        }
        return true;
    }
    if (await main.isEnabled()) return false;
    let answer;
    if (prompt.includes('contains every factor')) answer = factors(Number(prompt.match(/factor of (\d+)/)[1])).join(', ');
    else if (prompt.startsWith('How many factors')) answer = String(factors(Number(prompt.match(/does (\d+) have/)[1])).length);
    else if (prompt.startsWith('Find the missing')) {
        const [, divisor, number] = prompt.match(/(\d+) × □ = (\d+)/).map(Number);
        answer = String(number / divisor);
    } else if (prompt.startsWith('How many counters')) {
        const [, number, rows] = prompt.match(/when (\d+) counters are put into (\d+) equal rows/).map(Number);
        answer = String(number % rows);
    } else if (prompt.startsWith('You reach')) answer = `Stop and list ${prompt.match(/reach (\d+)/)[1]} once.`;
    else if (prompt.startsWith('Which explanation')) {
        const [, divisor, number] = prompt.match(/about (\d+) as a factor of (\d+)/).map(Number);
        answer = number % divisor === 0 ? 'Yes, the division is exact.' : 'No, there is a remainder.';
    } else if (prompt.startsWith('Sam says')) {
        const number = Number(prompt.match(/factors of (\d+)/)[1]);
        const shown = prompt.match(/are (.+)\. What/)[1].match(/\d+/g).map(Number);
        answer = String(factors(number).find(value => !shown.includes(value)));
    } else throw new Error(`Unrecognised factors question: ${prompt}`);
    const options = page.locator('.question-card-options:visible button');
    if (await options.count()) await page.getByRole('button', { name: answer, exact: true }).click();
    else await page.locator('.question-card:visible input[type=text]').fill(answer);
    return true;
}
module.exports = solve;
