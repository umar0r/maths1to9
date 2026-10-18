(() => {
    'use strict';
    const nb = text => text.replace(/ /g, '\u00a0');
    const mathProse = text => text.replace(/(?:−?\d*[xy]|−?\d+)(?:\s*[=+−×÷]\s*(?:−?\d*[xy]|\(?−?\d+\)?))+/g, nb)
        .replace(/\(−?\d+,\s*−?\d+\)/g, nb);
    const number = value => String(value).replace('-', '−');
    const coordinate = (a, b) => nb(`(${number(a)}, ${number(b)})`);
    const put = value => value < 0 ? `(${number(value)})` : number(value);
    const term = (value, letter) => value === 1 ? letter : value === -1 ? `−${letter}` : `${number(value)}${letter}`;
    const tail = value => value ? ` ${value < 0 ? '−' : '+'} ${Math.abs(value)}` : '';
    const sideText = (value, letter, added) => value ? term(value, letter) + tail(added) : number(added);
    const formOf = (m, c) => ({ k: 1, d: 0, p: m, q: c });
    const lineText = ({ k, d, p, q }) => nb(`${sideText(k, 'y', d)} = ${sideText(p, 'x', q)}`);
    function reorderedText(m, c) {
        if (!c) return lineText(formOf(m, c));
        if (!m) return nb(`y = ${number(c)}`);
        return nb(`y = ${number(c)} ${m < 0 ? '−' : '+'} ${term(Math.abs(m), 'x')}`);
    }
    const lineHtml = form => lineText(form).replace(/([xy])/g, '<i>$1</i>');
    const fallback = 'Get y on its own first. Then read the gradient and the y-intercept, with their signs.';
    const fields = [{ id: 'm', label: 'Gradient' }, { id: 'c', label: 'y-intercept' }];
    const typedTypes = ['reorder', 'add-subtract', 'divide', 'two-step', 'point-sides'];
    const choiceTypes = ['same-equation', 'on-its-own', 'read-reordered', 'point-check'];
    const choice = (label, feedback, correct = false) => ({ label: mathProse(label), feedback: mathProse(feedback), correct });
    function cancel(d) {
        return `${d < 0 ? 'add' : 'subtract'} ${Math.abs(d)} ${d < 0 ? 'to' : 'from'} both sides`;
    }
    // Partial rules naming a correct field deliberately catch mistakes in the other box.
    function ruleList() {
        const rules = [], used = new Set();
        return { rules, add(value, feedback, allowed = true) {
            if (!allowed) return;
            const key = JSON.stringify(value);
            if (used.has(key)) return;
            used.add(key);
            rules.push({ value: Object.fromEntries(Object.entries(value).map(([id, v]) => [id, String(v)])), feedback: mathProse(feedback) });
        } };
    }
    function rearrangeRules(form) {
        const { k, d, p, q, reordered = false } = form;
        const m = p / k, c = (q - d) / k, result = lineText(formOf(m, c));
        const { rules, add } = ruleList();
        add({ m: c, c: m }, "You've swapped them. Once y is on its own, the gradient multiplies x and the y-intercept is the number added or subtracted.", m !== c);
        if (!reordered) {
            add({ c: q - d }, `Divide the number by ${k} as well: every term. ${result}.`, k > 1 && q - d !== c);
            add({ c: d - q }, `Get y on its own step by step: ${cancel(d)}, then divide every term by ${k}. ${result}.`, k > 1 && d !== 0 && d - q !== c);
            add({ m: p }, `Divide the x term by ${k} as well: ${nb(`${term(p, 'x')} ÷ ${k} = ${term(m, 'x')}`)}.`, k > 1 && p !== m);
            add({ c: -c }, `Check the sign. To cancel ${nb(`${d < 0 ? '−' : '+'} ${Math.abs(d)}`)}, ${cancel(d)}. ${result}.`, d !== 0 && c !== 0);
        }
        add({ m: -m }, reordered
            ? m < 0 ? `The minus belongs to the x term: ${nb(term(m, 'x'))}.` : "There's no minus in front of the x term."
            : `Keep the sign with the x term. The gradient is ${number(m)}.`, m !== 0);
        add({ m }, 'The gradient is right. Check the y-intercept: get y on its own, then read the number added or subtracted.');
        add({ c }, 'The y-intercept is right. Check the gradient: the number multiplying x once y is on its own.');
        return rules;
    }
    function working(p, a, q) { return nb(`${number(p)} × ${put(a)}${tail(q)}`); }
    function pointRules({ k, d, p, q }, [a, b]) {
        const left = k * b + d, right = p * a + q;
        const { rules, add } = ruleList();
        add({ left: b }, `${nb(term(k, 'y'))} means ${nb(`${k} × y`)}: ${nb(`${k} × ${put(b)}${tail(d)} = ${number(left)}`)}.`, k > 1 && b !== left);
        add({ left: k * a + d }, `Put the y-coordinate in for y: ${nb(`${k} × ${put(b)}${tail(d)}`)}.`, k * a + d !== left);
        add({ right: p * b + q }, `Put the x-coordinate in for x: ${working(p, a, q)}.`, a !== b && p * b + q !== right);
        add({ left }, `The left side is right. Work out the right side with ${nb(`x = ${number(a)}`)}.`);
        add({ right }, `The right side is right. Work out the left side with ${nb(`y = ${number(b)}`)}.`);
        return rules;
    }
    function typed(form, feedback) {
        const m = form.p / form.k, c = (form.q - form.d) / form.k;
        return { input: 'number', fractions: true, fields, answer: { m: String(m), c: String(c) },
            prompt: `Look at ${form.reordered ? reorderedText(m, c) : lineText(form)}. What are the gradient and the y-intercept?`,
            rules: rearrangeRules(form), fallback, feedback: mathProse(feedback || `Right. ${lineText(formOf(m, c))}.`) };
    }
    function pointCard(form, point) {
        const [a, b] = point, left = form.k * b + form.d, right = form.p * a + form.q;
        return { input: 'number', fractions: true,
            fields: [{ id: 'left', label: nb(sideText(form.k, 'y', form.d)) }, { id: 'right', label: nb(sideText(form.p, 'x', form.q)) }],
            answer: { left: String(left), right: String(right) }, rules: pointRules(form, point),
            prompt: `Is ${coordinate(a, b)} on ${lineText(form)}? Put ${nb(`x = ${number(a)}`)} and ${nb(`y = ${number(b)}`)} in. Work out each side.`,
            fallback: `Put ${nb(`x = ${number(a)}`)} and ${nb(`y = ${number(b)}`)} into each side and work it out.`,
            feedback: left === right ? `Right. Both sides are ${number(left)}, so ${coordinate(a, b)} is on the line.`
                : `Right. ${number(left)} and ${number(right)} aren't equal, so ${coordinate(a, b)} isn't on the line.` };
    }
    function reorderedChoice(m, c) {
        const label = (m, c) => `The gradient is ${number(m)} and the y-intercept is ${number(c)}.`;
        return { input: 'choice', prompt: `Look at ${reorderedText(m, c)}. Which is right?`, options: [
            choice(label(m, c), `Right. ${reorderedText(m, c)} is ${lineText(formOf(m, c))}.`, true),
            choice(label(c, m), `The gradient multiplies x. Write the x term first: ${lineText(formOf(m, c))}.`),
            choice(label(-m, c), m < 0 ? `The minus belongs to the x term: ${nb(term(m, 'x'))}.` : "There's no minus in front of the x term."),
            choice(label(m, -c), `Keep each sign with its term. ${c < 0 ? `${Math.abs(c)} is subtracted.` : `${c} is added.`}`)
        ] };
    }
    function pick(random) {
        const { shuffle, randomInt } = window.Maths1to9LessonEngine;
        const typed = shuffle(typedTypes, random).slice(0, 4), choices = shuffle(choiceTypes, random);
        return typed.flatMap((type, index) => [type, choices[index]].map(type => ({ type, seed: randomInt(0, 4294967295, random) })));
    }
    function generate(item, random) {
        const { randomInt, shuffle } = window.Maths1to9LessonEngine;
        const type = item.type;
        const signed = max => randomInt(1, max, random) * (random() < 0.5 ? -1 : 1);
        let m, c, k, a, b, form, numeric;
        // Include distractor calculations in the range check, not just the answer.
        do {
            const simple = ['reorder', 'add-subtract', 'on-its-own'].includes(type);
            m = signed(simple ? 5 : type === 'read-reordered' || type === 'point-check' ? 5 : 4);
            c = signed(simple || type === 'read-reordered' ? 8 : type === 'two-step' ? 4 : type === 'point-check' ? 6 : 5);
            k = ['divide', 'same-equation'].includes(type) ? randomInt(2, 4, random) : ['two-step', 'point-sides'].includes(type) ? randomInt(2, 3, random) : 1;
            a = randomInt(1, 4, random);
            const on = random() < 0.5;
            b = m * a + c + (on ? 0 : signed(2));
            if (type === 'point-check') b = m * a + (on ? c : 0);
            form = { k, d: ['add-subtract', 'two-step', 'on-its-own'].includes(type) ? -k * c : 0, p: k * m,
                q: ['add-subtract', 'two-step', 'on-its-own'].includes(type) ? 0 : k * c, reordered: type === 'reorder' };
            numeric = [m, c, k, form.d, form.p, form.q];
            if (type === 'same-equation') numeric.push(k * k * m, k * k * c);
            if (type === 'point-sides') numeric.push(a, b, k * a, k * b, form.p * a, form.p * b, form.p * a + form.q, form.p * b + form.q);
            if (type === 'point-check') numeric.push(a, b, m * a, m * b, m * a + c, m * b + c);
        } while (Math.abs(m) === Math.abs(c) || (['read-reordered', 'point-check'].includes(type) && Math.abs(m) < 2)
            || (type === 'point-sides' && a === b) || numeric.some(n => Math.abs(n) > 40));
        let question;
        if (type === 'point-sides') question = pointCard(form, [a, b]);
        else if (typedTypes.includes(type)) question = typed(form);
        else if (type === 'read-reordered') question = reorderedChoice(m, c);
        else if (type === 'same-equation') question = { input: 'choice', prompt: `Which equation means the same as ${lineText(form)}?`, options: [
            choice(lineText(formOf(m, c)), `Right. Divide every term by ${k}.`, true),
            choice(lineText(formOf(m, k * c)), `Divide ${number(k * c)} by ${k} as well: every term.`),
            choice(lineText(formOf(k * m, c)), `Divide ${nb(term(k * m, 'x'))} by ${k} as well: every term.`),
            choice(lineText(formOf(k * k * m, k * k * c)), `${nb(term(k, 'y'))} means ${nb(`${k} × y`)}. To undo it, divide by ${k}, don't multiply.`)
        ] };
        else if (type === 'on-its-own') {
            const step = cancel(form.d), capital = step[0].toUpperCase() + step.slice(1);
            question = { input: 'choice', prompt: `Rewrite ${lineText(form)} with y on its own.`, options: [
                choice(lineText(formOf(m, c)), `Right. ${capital}.`, true),
                choice(lineText(formOf(m, -c)), `To cancel ${nb(`${form.d < 0 ? '−' : '+'} ${Math.abs(form.d)}`)}, ${step}.`),
                choice(lineText(formOf(m, 0)), `You can't just drop the ${Math.abs(form.d)}. ${capital}.`)
            ] };
        } else {
            const value = m * a + c, swapped = m * b + c, on = value === b;
            const full = `${working(m, a, c)} = ${number(value)}`;
            question = { input: 'choice', prompt: `Is ${coordinate(a, b)} on the line ${lineText(formOf(m, c))}?`, options: [
                choice(`${on ? 'Yes' : 'No'}. ${full}${on ? '' : `, not ${number(b)}`}.`, 'Right.', true),
                choice(`${on ? 'No' : 'Yes'}. ${nb(`${number(m)} × ${a} = ${number(m * a)}`)}${on ? `, not ${number(b)}` : ''}.`, `Don't forget the ${nb(`${c < 0 ? '−' : '+'} ${Math.abs(c)}`)}: ${full}${on ? '' : `, not ${number(b)}`}.`),
                ...(swapped === a ? [] : [choice(`No. ${working(m, b, c)} = ${number(swapped)}, not ${a}.`, `${on ? 'That swaps x and y.' : 'Right answer, wrong working.'} Put ${nb(`x = ${a}`)} in, then compare with ${nb(`y = ${number(b)}`)}.`)])
            ] };
        }
        if (question.options) question.options = shuffle(question.options.filter((option, index, options) => options.findIndex(other => other.label === option.label) === index), random);
        return { questionType: type, ...question };
    }
    window.StraightLineEquations = { nb, mathProse, number, put, coordinate, term, tail, sideText, formOf, lineText, lineHtml, reorderedText,
        rearrangeRules, pointRules, typed, pointCard, reorderedChoice, choice, fields, fallback, typedTypes, choiceTypes, pick, generate };
})();
