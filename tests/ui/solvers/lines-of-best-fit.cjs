// Answer the Lines of best fit lesson with real taps, keyboard drawings and
// sorts. Practice and Check cards are rebuilt from their saved seeds with the
// lesson's own generators, so the solver never guesses.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Q = require('../../../content/lines-of-best-fit/questions.js');
const B = require('../../../content/lines-of-best-fit/best-fit.js');
const lesson = require('../../../content/lines-of-best-fit/lesson.json');

const window = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../../assets/js/lesson-engine.js'), 'utf8'), {
    window, document: { body: { dataset: { lessonRenderer: 'custom' } } }
});
const E = window.Maths1to9LessonEngine;
const SLUG = 'lines-of-best-fit';

async function pixels(page, point, index = 0) {
    const surface = page.locator('.lesson-section:visible .maths-graph__board').nth(index);
    await surface.scrollIntoViewIfNeeded();
    return surface.evaluate((surface, [x, y]) => {
        const board = Object.values(JXG.boards).find(entry => entry.containerObj === surface);
        const rect = surface.getBoundingClientRect();
        return {
            x: rect.left + board.origin.scrCoords[1] + x * board.unitX,
            y: rect.top + board.origin.scrCoords[2] - y * board.unitY
        };
    }, point);
}

async function tap(page, point, index = 0) {
    const spot = await pixels(page, point, index);
    await page.mouse.click(spot.x, spot.y);
    await page.waitForTimeout(120);
}

async function press(page, key, times) {
    for (let index = 0; index < times; index++) await page.keyboard.press(key);
}

// The keyboard draws from (0, 0): move the crosshair to the first end, set it,
// then move to the second end and set that. docs/shared-graph.md.
async function draw(page, line, index = 0) {
    const board = page.locator('.lesson-section:visible .maths-graph__board').nth(index);
    await board.scrollIntoViewIfNeeded();
    await board.focus();
    await press(page, 'ArrowRight', line.from[0]);
    await press(page, 'ArrowUp', line.from[1]);
    await page.keyboard.press('Enter');
    const dx = line.to[0] - line.from[0];
    const dy = line.to[1] - line.from[1];
    await press(page, dx < 0 ? 'ArrowLeft' : 'ArrowRight', Math.abs(dx));
    await press(page, dy < 0 ? 'ArrowDown' : 'ArrowUp', Math.abs(dy));
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
}

async function sort(page, root, placements) {
    // Pick the card, then put it in its box with the keyboard: a mouse click on
    // a box can land on a card already in it and send that one back.
    for (const [label, bin] of placements) {
        await root.locator('.best-fit-sort__tray')
            .getByRole('button', { name: label, exact: true }).click();
        await root.locator('.best-fit-sort__drop').nth(bin).focus();
        await page.keyboard.press('Enter');
        await page.waitForTimeout(100);
    }
}

async function saved(page) {
    return page.evaluate(async slug => {
        const id = window.Maths1to9Lesson.getCurrentSection().id;
        const key = id.startsWith('interactive--') ? 'interactive:' + id.slice('interactive--'.length) : id;
        const found = await window.Maths1to9Progress.getLessonActivityState(slug, key);
        return found ? { id, screen: found.data.screen, items: found.data.items } : { id };
    }, SLUG);
}

module.exports = async function solve(page) {
    const main = page.locator('.lesson-controls button.button--primary:visible').first();
    if (await main.isEnabled().catch(() => false)) return false;
    const root = page.locator('.lesson-section:visible');
    const hash = new URL(page.url()).hash.slice(1);

    if (hash === 'draw-try-it-1') {
        await draw(page, B.lines.SUNSHINE_LINE);
        return true;
    }
    if (hash === 'ignore-try-it-1') {
        await draw(page, { from: [0, 10], to: [10, 1] });
        return true;
    }
    if (hash === 'estimate-try-it-1') {
        await tap(page, [0, B.tryIt.estimate.heating.answer]);
        return true;
    }
    if (hash === 'estimate-try-it-2') {
        await tap(page, [B.tryIt.estimate.sunshine.answer, 0]);
        return true;
    }
    if (hash === 'trust-try-it-1') {
        await sort(page, root, B.tryIt.trust.cards.map(card => [card.label, card.bin === 'inside' ? 0 : 1]));
        return true;
    }
    if (hash.startsWith('check-')) {
        const index = Number(hash.split('-').pop()) - 1;
        await root.getByRole('button', { name: lesson.comparison.questions[index].correct, exact: true }).click();
        return true;
    }
    if (hash === 'summary') return false;

    const state = await saved(page);
    if (!state.items) return false;
    const item = state.items[state.screen];
    if (!item) return false;
    const question = Q.practiceQuestion(item, E.seededRandom(item.seed), E);

    if (question.input === 'choice') {
        await root.getByRole('button', { name: question.options.find(option => option.correct).label, exact: true }).click();
        return true;
    }
    if (question.input === 'number') {
        const inputs = root.locator('.question-card input');
        if (!await inputs.count()) return false;
        await inputs.first().fill(question.answer);
        return true;
    }
    if (question.questionType === 'draw-best') {
        await draw(page, question.model.right);
        return true;
    }
    if (question.questionType === 'trust-sort') {
        const word = Q.unitWord(question.model.context);
        await sort(page, root, [
            ...question.model.inside.map(value => [`${value} ${word}`, 0]),
            ...question.model.outside.map(value => [`${value} ${word}`, 1])
        ]);
        return true;
    }
    return false;
};
