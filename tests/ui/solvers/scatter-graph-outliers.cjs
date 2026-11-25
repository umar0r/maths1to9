// Answer the Outliers lesson with real clicks, taps and drags. Practice and
// Check cards are rebuilt from their saved seeds with the lesson's own
// generators, so the solver never guesses.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Q = require('../../../content/scatter-graph-outliers/questions.js');
const O = require('../../../content/scatter-graph-outliers/outliers.js');
const lesson = require('../../../content/scatter-graph-outliers/lesson.json');

const window = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../../assets/js/lesson-engine.js'), 'utf8'), {
    window, document: { body: { dataset: { lessonRenderer: 'custom' } } }
});
const E = window.Maths1to9LessonEngine;
const SLUG = 'scatter-graph-outliers';

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

async function sort(page, root, placements) {
    // Pick the card, then put it in its box with the keyboard: a mouse click on
    // a box can land on a card already in it and send that one back.
    for (const [label, bin] of placements) {
        await root.locator('.outliers-sort__tray button', { hasText: label }).first().click();
        await root.locator('.outliers-sort__drop').nth(bin).focus();
        await page.keyboard.press('Enter');
        await page.waitForTimeout(120);
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

    if (hash === 'spot-try-it-1') {
        await tap(page, O.tryIt.spot.answer);
        return true;
    }
    if (hash === 'read-try-it-1') {
        await tap(page, [O.tryIt.read.sunshine.bottom, 0]);
        await tap(page, [0, O.tryIt.read.sunshine.side]);
        return true;
    }
    if (hash === 'read-try-it-2') {
        await tap(page, [0, O.tryIt.read.heating.side]);
        return true;
    }
    if (hash === 'reason-try-it-1') {
        const cards = O.reasonCards('sunshine');
        await sort(page, root, cards.map(card => [card.label, card.bin === 'unusual' ? 0 : 1]));
        return true;
    }
    if (hash === 'ignore-try-it-1') {
        await sort(page, root, [['Positive', 0], ['Negative', 1]]);
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
    if (question.questionType === 'tap-outlier') {
        await tap(page, question.model.set.outlier);
        return true;
    }
    if (question.questionType === 'reason-sort') {
        const cards = question.model.cards;
        await sort(page, root, cards.map(card => [card.label, card.bin === 'unusual' ? 0 : 1]));
        return true;
    }
    if (question.questionType === 'ignore-sort') {
        const heating = question.model.contexts.indexOf('heating');
        const placements = [['Positive', heating === 0 ? 1 : 0], ['Negative', heating]];
        await sort(page, root, placements);
        return true;
    }
    return false;
};
