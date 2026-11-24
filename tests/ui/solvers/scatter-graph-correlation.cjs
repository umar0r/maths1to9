// Answer the Correlation lesson with real clicks and drags. Practice and Check
// cards are rebuilt from their saved seeds with the lesson's own generators, so
// the solver never guesses.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Q = require('../../../content/scatter-graph-correlation/questions.js');
const lesson = require('../../../content/scatter-graph-correlation/lesson.json');

const window = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../../assets/js/lesson-engine.js'), 'utf8'), {
    window, document: { body: { dataset: { lessonRenderer: 'custom' } } }
});
const E = window.Maths1to9LessonEngine;
const SLUG = 'scatter-graph-correlation';

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

async function drag(page, from, to, index = 0) {
    const start = await pixels(page, from, index);
    const end = await pixels(page, to, index);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(80);
}

async function sort(page, root, placements) {
    // Pick the card, then put it in its box with the keyboard: a mouse click on
    // a box can land on a card already in it and send that one back.
    for (const [label, bin] of placements) {
        await root.locator('.correlation-sort__tray button', { hasText: label }).first().click();
        await root.locator('.correlation-sort__drop').nth(bin).focus();
        await page.keyboard.press('Enter');
        await page.waitForTimeout(80);
    }
}

async function chips(page, root, words) {
    const groups = root.locator('.correlation-builder__chips');
    for (const [index, word] of words.entries()) {
        await groups.nth(index).getByRole('button', { name: word, exact: true }).click();
        await page.waitForTimeout(80);
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

    if (hash === 'type-try-it-1') {
        await drag(page, [7, 1], [7, 6]);
        await drag(page, [8, 1], [8, 7]);
        return true;
    }
    if (hash === 'type-try-it-2') {
        await drag(page, [7, 9], [7, 3]);
        await drag(page, [8, 9], [8, 2]);
        return true;
    }
    if (hash === 'type-try-it-3') {
        await sort(page, root, [['Negative', 0], ['No correlation', 1], ['Positive', 2]]);
        return true;
    }
    if (hash === 'strength-try-it-1') {
        await sort(page, root, [['Strong positive', 0], ['Weak negative', 1],
            ['Weak positive', 2], ['Strong negative', 3]]);
        return true;
    }
    if (hash === 'strength-try-it-2') {
        await drag(page, [3, 8], [3, 3]);
        await drag(page, [7, 2], [7, 7]);
        return true;
    }
    if (hash === 'describe-try-it-1') {
        await chips(page, root, ['Longer', 'more']);
        return true;
    }
    if (hash === 'describe-try-it-2') {
        await chips(page, root, ['Older', 'less']);
        return true;
    }
    if (hash === 'cause-try-it-1') {
        await sort(page, root, [
            ['More ice creams tend to go with more sunburn.', 0],
            ['Fewer ice creams tend to go with less sunburn.', 0],
            ['Eating ice cream causes sunburn.', 1],
            ['Selling less ice cream would stop sunburn.', 1]
        ]);
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
    const question = Q.practiceQuestion(item, E.seededRandom(item.seed), E);
    if (question.input === 'choice') {
        await root.getByRole('button', { name: question.options.find(option => option.correct).label, exact: true }).click();
        return true;
    }
    if (question.questionType === 'drag-type') {
        const start = question.model.direction === 1 ? 1 : 9;
        await drag(page, [7, start], [7, Math.round(question.model.targets[0])]);
        await drag(page, [8, start], [8, Math.round(question.model.targets[1])]);
        return true;
    }
    if (question.questionType === 'drag-strong') {
        const [x, target] = question.model.target;
        await drag(page, [x, question.model.moved[1]], [x, Math.round(target)]);
        return true;
    }
    if (question.questionType === 'finish-sentence') {
        await chips(page, root, question.model.sentence.pairs[0].values);
        return true;
    }
    if (question.questionType === 'cause-sort') {
        for (const bin of ['shows', 'cant']) {
            const binIndex = bin === 'shows' ? 0 : 1;
            for (const card of question.model.cards.filter(entry => entry.bin === bin)) {
                await sort(page, root, [[card.label, binIndex]]);
            }
        }
        return true;
    }
    return false;
};
