// Solver for function machines: the machine is read from the screen
// ("? Input → − 3 → ? → × 4 → 28 Output"), then each step is answered:
// start at the output, undo each box last-first, check forwards.
const { section, sectionText, options } = require('./common.cjs');
const { evaluate, close } = require('../../helpers/lessons.cjs');

const INVERSE = { '+': '−', '−': '+', '×': '÷', '÷': '×' };

function answerFor(text, labels, machine) {
    const shown = text.match(/\? Input → (.+?) → (−?\d+(?:\.\d+)?) Output/);
    let m;
    if (/Which number do you start with/.test(text) && shown) return shown[2];
    if ((m = text.match(/The (?:next|last|first) box says ([+−×÷]) (\d+(?:\.\d+)?)\. What do you do to reverse it/))) return `${INVERSE[m[1]]} ${m[2]}`;
    if ((m = text.match(/Which calculation checks that the input is (−?\d+(?:\.\d+)?)/))) {
        if (!machine) throw new Error('The original machine was not read before its check step.');
        let input = machine.output;
        for (const [symbol, operand] of [...machine.operations].reverse()) {
            input = evaluate(`${input} ${INVERSE[symbol]} ${operand}`);
        }
        if (!close(input, Number(m[1].replace('−','-')))) throw new Error('Displayed input does not reverse the machine.');
        let value = input;
        const working = machine.operations.map(([symbol, operand]) => {
            const result = evaluate(`${value} ${symbol} ${operand}`);
            const line = `${String(value).replace('-', '−')} ${symbol} ${operand} = ${String(result).replace('-', '−')}`;
            value = result;
            return line;
        }).join(', then ');
        return labels.find(label => label === working);
    }
    return null;
}

module.exports = async function solve(page, memory) {
    const where = await section(page);
    if (where !== 'interactive' && where !== 'question-bank') return false;
    if (await page.locator('.lesson-controls button:visible').first().isEnabled().catch(() => false)) return false;
    const answers = page.locator(`[data-lesson-section="${where}"] [data-answer]`);
    if (!(await answers.count())) return false; // nothing to answer (e.g. practice complete)
    if (await answers.count() && !(await page.locator(`[data-lesson-section="${where}"] [data-answer]:visible:enabled`).count())) {
        // Answered: the next step appears by itself after a moment.
        await page.waitForTimeout(1500);
        return true;
    }
    const text = await sectionText(page);
    const labels = (await options(page)).map(o => o.label);
    if (/Which number do you start with/.test(text)) {
        const graphic = await page.locator(`[data-lesson-section="${where}"] [role="img"]`).first().innerText();
        const output = graphic.match(/([−-]?\d+(?:\.\d+)?)\s+Output/);
        if (!output) throw new Error(`Cannot read machine output: ${graphic}`);
        memory.machine = {
            output: Number(output[1].replace('−','-')),
            operations: [...graphic.matchAll(/([+−×÷])\s+(\d+(?:\.\d+)?)/g)].map(match=>[match[1],Number(match[2])])
        };
    }
    const answer = answerFor(text, labels, memory.machine);
    if (!answer) throw new Error(`the solver cannot answer this step: "${text.slice(-200)}" (options: ${labels.join(' | ')})`);
    // Buttons that look the same but carry different values (e.g. "9" and "9 ").
    const values = await page.locator(`[data-lesson-section="${where}"] [data-answer]:visible`).evaluateAll(els => els.map(e => e.dataset.answer));
    const looksSame = values.filter(v => values.filter(w => w.trim() === v.trim()).length > 1);
    if (looksSame.length) {
        (memory.problems ??= []).push(`two answer buttons look identical (${looksSame.map(v => JSON.stringify(v)).join(' and ')}) but only one is marked correct: "${text.slice(-80)}"`);
    }
    // Click the button whose exact value is the answer.
    await page.locator(`[data-lesson-section="${where}"] [data-answer="${answer}"]:visible`).first().click();
    return true;
};
