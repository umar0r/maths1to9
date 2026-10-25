// Read the pupil-visible table and calculate every share/angle independently.
const gcd = (a, b) => b ? gcd(b, a % b) : a;
async function readTable(page) {
    const table = page.locator('.question-card:visible .pie-frequency-table');
    const rows = [];
    for (const row of await table.locator('tbody tr').all()) {
        rows.push({ name: (await row.locator('th').innerText()).trim(), count: Number(await row.locator('td').first().innerText()) });
    }
    return rows;
}
async function fillChart(page, values) {
    const widget = page.locator('.question-card:visible .pie-drawing-widget');
    const data = await readTable(page);
    const total = data.reduce((sum, row) => sum + row.count, 0);
    for (const [index, row] of data.entries()) await widget.getByLabel(`${row.name} angle (°)`, { exact: true }).fill(String(values ? values[index] : row.count * 360 / total));
}
async function solve(page) {
    const main = page.locator('.lesson-controls button.button--primary:visible');
    if (await main.isEnabled()) return false;
    const prompt = page.locator('.question-prompt:visible');
    if (!await prompt.count()) return false;
    const text = await prompt.innerText();
    const widget = page.locator('.question-card:visible .pie-drawing-widget');
    if (await widget.count()) { await fillChart(page); return true; }
    let answer;
    if (text.startsWith('A pupil uses 100')) answer = 'A full circle has 360°. Multiply each share by 360.';
    else if (text.startsWith('The known angles')) {
        const known = [...text.matchAll(/(\d+)°/g)].map(match => Number(match[1]));
        answer = String(360 - known.reduce((a, b) => a + b, 0));
    } else {
        const data = await readTable(page);
        const total = data.reduce((sum, row) => sum + row.count, 0);
        if (text.startsWith('How many pupils')) answer = String(total);
        else if (text.includes("one pupil's share")) answer = String(360 / total);
        else if (text.startsWith('Which fraction')) {
            const name = text.match(/chose (\w+)/)[1];
            const count = data.find(row => row.name === name).count;
            const divisor = gcd(count, total);
            answer = `${count / divisor}/${total / divisor}`;
        } else {
            const name = text.match(/angle for (\w+)/)?.[1];
            if (!name) throw new Error(`Cannot solve pie-chart question: ${text}`);
            answer = String(data.find(row => row.name === name).count * 360 / total);
        }
    }
    const options = page.locator('.question-card-options:visible button');
    if (await options.count()) {
        if (text.includes('angle') && !text.startsWith('A pupil') && !text.startsWith('Which fraction')) answer += '°';
        await page.getByRole('button', { name: answer, exact: true }).click();
    } else await page.locator('.question-card:visible input[type=text]').fill(answer);
    return true;
}
solve.readTable = readTable;
solve.fillChart = fillChart;
module.exports = solve;
