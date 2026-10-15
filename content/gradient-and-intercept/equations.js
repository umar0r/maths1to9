(() => {
    'use strict';
    const nb = text => text.replace(/ /g, '\u00a0');
    const number = value => String(value).replace('-', '−');
    const coordinate = (x, y) => nb(`(${number(x)}, ${number(y)})`);
    const fields = [{ id: 'm', label: 'Gradient' }, { id: 'c', label: 'y-intercept' }];
    const typedTypes = ['positive', 'negative-intercept', 'negative-gradient', 'both-negative', 'hidden-one', 'no-intercept'];
    const choiceTypes = ['match-equation', 'crossing-point', 'direction', 'hidden'];
    const fallback = 'The gradient is the number multiplying x. The y-intercept is the number added or subtracted. Keep their signs.';

    function equationText(m, c) {
        if (m === 0) return nb(`y = ${number(c)}`);
        const term = m === 1 ? 'x' : m === -1 ? '−x' : `${number(m)}x`;
        return nb(`y = ${term}${c === 0 ? '' : ` ${c < 0 ? '−' : '+'} ${Math.abs(c)}`}`);
    }
    function equationHtml(m, c, { highlight, showHidden = false } = {}) {
        const highlighted = part => highlight === 'both' || highlight === part || Array.isArray(highlight) && highlight.includes(part);
        function part(content, name) {
            return highlighted(name) ? `<span class="equation-part is-highlighted">${content}<small>${name === 'm' ? 'gradient' : 'y-intercept'}</small></span>` : content;
        }
        const hidden = text => `<span class="equation-hidden">${text}</span>`;
        if (m === 0) return `y&nbsp;=&nbsp;${part(number(c), 'c')}`;
        const multiplier = Math.abs(m) === 1 ? (showHidden ? hidden(number(m)) : m < 0 ? '−' : '') : number(m);
        const end = c === 0 ? (showHidden ? hidden('&nbsp;+&nbsp;0') : '') : `&nbsp;${c < 0 ? '−' : '+'}&nbsp;${Math.abs(c)}`;
        return `y&nbsp;=&nbsp;${part(multiplier, 'm')}<i>x</i>${part(end, 'c')}`;
    }
    function readingRules(m, c) {
        const rules = [];
        function add(value, feedback) {
            if (Object.keys(value).length === 2 && value.m === m && value.c === c) return;
            rules.push({ value: Object.fromEntries(Object.entries(value).map(([key, value]) => [key, String(value)])), feedback });
        }
        if (c === 0 && m !== 0) add({ c: m }, `Nothing is added or subtracted, so ${equationText(m, 0)} means ${nb(`y = ${number(m)}x + 0`)}. The y-intercept is 0.`);
        add({ m: c, c: m }, "You've swapped them. The gradient is the number multiplying x. The y-intercept is the number added or subtracted.");
        if (m === 1) add({ m: 0 }, 'x means 1x, so the gradient is 1.');
        if (m === -1) add({ m: 0 }, '−x means −1x, so the gradient is −1.');
        if (m < 0) add({ m: -m }, `Keep the minus sign. The number multiplying x is ${number(m)}.`);
        if (m > 0) add({ m: -m }, `There's no minus in front of the x term, so the gradient is positive: ${number(m)}.`);
        if (c < 0) add({ c: -c }, `The equation subtracts ${Math.abs(c)}, so the y-intercept is ${number(c)}.`);
        if (c > 0) add({ c: -c }, `The equation adds ${c}, so the y-intercept is positive: ${c}.`);
        add({ m }, 'The gradient is right. Check the y-intercept: the number added or subtracted, with its sign.');
        add({ c }, 'The y-intercept is right. Check the gradient: the number multiplying x, with its sign.');
        return rules;
    }
    function typed(m, c, feedback) {
        return { input: 'number', fractions: true, fields, answer: { m: String(m), c: String(c) },
            prompt: `Look at ${equationText(m, c)}. Enter the gradient and the y-intercept.`,
            rules: readingRules(m, c), fallback,
            feedback: feedback || `Right. The gradient is ${number(m)} and the line crosses the y-axis at ${coordinate(0, c)}.` };
    }
    function pick(random) {
        const { shuffle, randomInt } = window.Maths1to9LessonEngine;
        const typed = shuffle(typedTypes, random).slice(0, 4);
        const choices = shuffle(choiceTypes, random);
        return typed.flatMap((type, index) => [type, choices[index]].map(type => ({ type, seed: randomInt(0, 4294967295, random) })));
    }
    function generate(item, random) {
        const { randomInt, shuffle } = window.Maths1to9LessonEngine;
        const signed = min => randomInt(min, 9, random) * (random() < 0.5 ? -1 : 1);
        let m = signed(2), c = signed(1);
        if (item.type === 'positive' || item.type === 'negative-intercept') m = Math.abs(m);
        if (item.type === 'negative-gradient' || item.type === 'both-negative') m = -Math.abs(m);
        if (item.type === 'positive' || item.type === 'negative-gradient') c = Math.abs(c);
        if (item.type === 'negative-intercept' || item.type === 'both-negative') c = -Math.abs(c);
        if (item.type === 'hidden-one' || item.type === 'hidden' && item.seed % 2 === 0) m = random() < 0.5 ? -1 : 1;
        if (item.type === 'no-intercept' || item.type === 'hidden' && item.seed % 2 === 1) c = 0;
        while (Math.abs(m) === Math.abs(c)) c = randomInt(1, 9, random) * Math.sign(c);
        if (typedTypes.includes(item.type)) return { questionType: item.type, ...typed(m, c) };
        const option = (label, feedback, correct = false) => ({ label, feedback, correct });
        const added = c < 0 ? `${Math.abs(c)} is subtracted` : `${c} is added`;
        let prompt, options;
        if (item.type === 'match-equation') {
            prompt = `Which line has gradient ${number(m)} and y-intercept ${number(c)}?`;
            options = [option(equationText(m, c), `Right. ${number(m)} multiplies x and ${added}.`, true),
                option(equationText(c, m), 'That swaps them. The gradient is the number multiplying x.'),
                option(equationText(-m, c), 'Check the sign of the number multiplying x.'),
                option(equationText(m, -c), 'Check the sign of the number added or subtracted.')];
        } else if (item.type === 'crossing-point') {
            prompt = `Where does ${equationText(m, c)} cross the y-axis?`;
            options = [option(coordinate(0, c), `Right. The y-intercept is ${number(c)}, so the line crosses at ${coordinate(0, c)}.`, true),
                option(coordinate(c, 0), `On the y-axis, x is 0. So the point is ${coordinate(0, c)}.`),
                option(coordinate(0, m), `${number(m)} multiplies x, so it's the gradient. Use the number added or subtracted.`),
                option(coordinate(0, -c), `Keep the sign. The equation ${c < 0 ? 'subtracts' : 'adds'} ${Math.abs(c)}.`)];
        } else if (item.type === 'direction') {
            const direction = m < 0 ? 'down' : 'up';
            prompt = `Which way does the line ${equationText(m, c)} go, from left to right?`;
            options = [option(`${Math.abs(m)} ${direction} for every 1 right`, `Right. The gradient is ${number(m)}, so the line goes ${direction}.`, true),
                option(`${Math.abs(m)} ${m < 0 ? 'up' : 'down'} for every 1 right`, `The gradient is ${number(m)}. ${m < 0 ? 'Negative' : 'Positive'} means the line goes ${direction}.`),
                option(`${Math.abs(c)} ${c < 0 ? 'down' : 'up'} for every 1 right`, `${number(c)} is the y-intercept. The gradient is the number multiplying x.`)];
        } else if (c === 0) {
            prompt = `What is the y-intercept of ${equationText(m, 0)}?`;
            options = [option('0', `Right. ${equationText(m, 0)} means ${nb(`y = ${number(m)}x + 0`)}.`, true),
                option(number(m), `${number(m)} multiplies x, so it's the gradient. Nothing is added.`),
                option("It doesn't have one", 'Every sloping line crosses the y-axis. Nothing is added, so it’s 0.')];
        } else {
            prompt = `What is the gradient of ${equationText(m, c)}?`;
            options = [option(number(m), `Right. ${m < 0 ? '−x means −1x' : 'x means 1x'}.`, true),
                option(number(-m), m < 0 ? 'Keep the minus sign: −x means −1x.' : 'There is no minus sign: x means 1x.'),
                option('0', `There is a number multiplying x: ${m < 0 ? '−x means −1x' : 'x means 1x'}.`),
                option(number(c), `${number(c)} is the y-intercept. The gradient multiplies x.`)];
        }
        options = options.filter((entry, index) => options.findIndex(other => other.label === entry.label) === index);
        return { questionType: item.type, input: 'choice', prompt, options: shuffle(options, random) };
    }
    function step(m, c) {
        if (m === 0) return null;
        for (const x of [1, -2]) {
            const from = [x, m * x + c], to = [x + 1, m * (x + 1) + c];
            if (from[1] !== 0 && Math.min(from[1], to[1]) >= -5 && Math.max(from[1], to[1]) <= 7) return { from, corner: [to[0], from[1]], to };
        }
        return null;
    }
    window.GradientIntercept = { nb, number, coordinate, equationText, equationHtml, readingRules, typed, fields, fallback,
        typedTypes, choiceTypes, pick, generate, step };
})();
