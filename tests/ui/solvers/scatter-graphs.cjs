// Read the pupil's graph/table and solve the maths independently of the generator's answer.
async function graphs(page) {
    return page.locator('.lesson-section:visible .maths-graph__board').evaluateAll(surfaces => surfaces.map(surface => {
        const board = Object.values(JXG.boards).find(board => board.containerObj === surface);
        const objects = Object.values(board.objects);
        const points = objects.filter(object => object.elType === 'point' && object.visProp.visible !== false &&
            object.rendNode?.getBoundingClientRect().width > 0).map(object => ({ x: object.X(), y: object.Y(), size: object.visProp.size }));
        const lines = objects.filter(object => object.elType === 'segment');
        const xs = [...new Set(lines.filter(line => line.point1.X() === line.point2.X()).map(line => line.point1.X()))].sort((a, b) => a - b);
        const ys = [...new Set(lines.filter(line => line.point1.Y() === line.point2.Y()).map(line => line.point1.Y()))].sort((a, b) => a - b);
        return { points, step: { x: Math.min(...xs.slice(1).map((x, i) => x - xs[i])),
            y: Math.min(...ys.slice(1).map((y, i) => y - ys[i])) } };
    }));
}

async function pixels(page, point) {
    const surface = page.locator('.lesson-section:visible .maths-graph__board').first();
    await surface.scrollIntoViewIfNeeded();
    return surface.evaluate((surface, [x, y]) => {
        const board = Object.values(JXG.boards).find(board => board.containerObj === surface);
        const rect = surface.getBoundingClientRect();
        return { x: rect.left + board.origin.scrCoords[1] + x * board.unitX,
            y: rect.top + board.origin.scrCoords[2] - y * board.unitY };
    }, point);
}
async function pick(page, point) {
    const position = await pixels(page, point);
    await page.mouse.click(position.x, position.y);
}
const pointKey = point => `${point.x},${point.y}`;
const sameSet = (left, right) => left.map(pointKey).sort().join('|') === right.map(pointKey).sort().join('|');

module.exports = async function solve(page) {
    const main = page.locator('.lesson-controls button.button--primary:visible');
    if (await main.isEnabled()) return false;
    const root = page.locator('.lesson-section:visible');
    const hash = new URL(page.url()).hash.slice(1);
    const text = await root.innerText();
    const data = await graphs(page);
    const big = data[0]?.points.find(point => point.size > 3);
    const slots = root.locator('[data-slot]');
    if (await slots.count()) {
        for (const slot of await slots.all()) {
            if (await slot.isDisabled()) continue;
            const id = await slot.getAttribute('data-slot');
            const value = id === 'rainy' || id.startsWith('temperature:') ? big.x : big.y;
            const digit = id.includes(':') ? String(value).padStart(2, '0')[id.endsWith('tens') ? 0 : 1] : String(value);
            await slot.click();
            await root.getByRole('button', { name: `Digit ${digit}`, exact: true }).click();
        }
        return true;
    }
    if (hash === 'read-learn-2') { await root.getByRole('button', { name: '4 Hours, 5 Mark', exact: true }).click(); return true; }
    if (hash === 'read-learn-3' || hash === 'read-try-it-1') {
        const side = text.includes('Now tap the side axis');
        await pick(page, side ? [0, big.y] : [big.x, 0]);
        return true;
    }
    if (hash === 'read-try-it-2') { await pick(page, [3, 7]); return true; }
    if (hash.startsWith('plot-learn-') || hash.startsWith('plot-try-it-')) {
        let column = root.locator('.scatter-pair-table__column.is-selected');
        if (!await column.count()) column = root.locator('.scatter-pair-table__column').first();
        const target = (await column.locator('span').allTextContents()).map(Number);
        if (hash === 'plot-try-it-3') {
            const from = await pixels(page, [big.x, big.y]), to = await pixels(page, target);
            await page.mouse.move(from.x, from.y); await page.mouse.down();
            await page.mouse.move(to.x, to.y, { steps: 12 }); await page.mouse.up();
        } else await pick(page, target);
        return true;
    }
    if (hash === 'scales-learn-1') { await pick(page, [0, 30]); return true; }
    if (hash === 'scales-try-it-1') { await pick(page, [6, 70]); return true; }
    if (hash === 'scales-try-it-2') { await pick(page, [14, 50]); return true; }
    const prompt = await root.locator('.question-prompt').innerText();
    const numbers = (prompt.match(/\d+/g) || []).map(Number);
    const choice = async label => root.getByRole('button', { name: label, exact: true }).click();
    if (hash.startsWith('check-')) {
        const correct = [
            'One pair of numbers from the table.',
            'Go straight down to the bottom axis, then straight across to the side axis.',
            "Sam swapped the numbers. It's across to 6, then up to 2.",
            'Two points, one above the other, both across at 4.',
            '10'
        ][Number(hash.split('-').at(-1)) - 1];
        await choice(correct); return true;
    }
    const type = await page.evaluate(async () => {
        const id = Maths1to9Lesson.getCurrentSection().id;
        const saved = await Maths1to9Progress.getLessonActivityState('scatter-graphs', id);
        return saved.data.items[saved.data.screen].type;
    });
    if (['plot-pair', 'plot-same-start', 'plot-scaled'].includes(type)) { await pick(page, numbers); return true; }
    if (type === 'which-graph') {
        const pairs = await root.locator('.scatter-pair-table__column').evaluateAll(columns => columns.map(column => {
            const [x, y] = [...column.querySelectorAll('span')].map(span => Number(span.textContent)); return { x, y };
        }));
        const index = data.findIndex(graph => sameSet(graph.points, pairs));
        if (index < 0) throw new Error('No mini graph matches the table.');
        await choice('ABCD'[index]); return true;
    }
    if (type === 'pick-point') {
        const index = data[0].points.findIndex(point => point.x === numbers[0] && point.y === numbers[1]);
        await choice('ABCD'[index]); return true;
    }
    if (type === 'square-worth') { await choice(String(data[0].step[prompt.includes('bottom') ? 'x' : 'y'])); return true; }
    if (type === 'read-pair') {
        const options = root.locator('.question-card-options button');
        for (const option of await options.all()) {
            const [x, y] = ((await option.innerText()).match(/\d+/g) || []).map(Number);
            if (x === big.x && y === big.y) { await option.click(); return true; }
        }
        throw new Error('No pair matches the big point.');
    }
    const point = data[0].points.find(point => type === 'read-across' ? point.y === numbers[0] : point.x === numbers[0]);
    await root.locator('input').fill(String(type === 'read-across' ? point.x : point.y));
    return true;
};
module.exports.pick = pick;
module.exports.graphs = graphs;
