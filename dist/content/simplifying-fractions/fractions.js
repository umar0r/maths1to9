(() => {
    'use strict';

    const practiceTypes = ['equivalentGap', 'reverseGap', 'spotEquivalent', 'simplifyOneStep', 'simplifyFully',
        'fullySimplified', 'validDivisor', 'spotTheMistake', 'shadedFraction', 'equalOrNot'];
    const coprimePairs = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 6],
        [5, 6], [2, 7], [3, 7], [4, 7], [5, 7], [3, 8], [5, 8], [7, 8], [2, 9], [4, 9], [5, 9], [7, 9]];
    const gcd = (a, b) => b ? gcd(b, a % b) : Math.abs(a);
    const fraction = (top, bottom) => `${top}/${bottom}`.replace(/-/g, '−');
    const sameValue = (a, b) => a[0] * b[1] === b[0] * a[1];
    function optionKey(value, writtenForm) {
        const text = String(value).replace(/−/g, '-').trim();
        if (writtenForm) return text;
        const match = text.match(/^(-?\d+)\/(\d+)$/);
        if (!match) return text;
        const n = Number(match[1]), d = Number(match[2]), divisor = gcd(n, d);
        return fraction(n / divisor, d / divisor);
    }

    function makeQuestion({ type, mode = 'choice', prompt, answer, wrong, feedback, fallback, writtenForm = false, ...details }) {
        const candidates = wrong.filter(([label], index, list) => optionKey(label, writtenForm) !== optionKey(answer, writtenForm)
            && list.findIndex(([other]) => optionKey(other, writtenForm) === optionKey(label, writtenForm)) === index);
        const question = { ...details, questionType: type, input: mode, prompt, feedback, fallback };
        if (mode === 'choice') {
            if (candidates.length < 3) throw new Error(`Missing mistake options for ${type}`);
            question.options = [{ label: String(answer), correct: true, feedback },
                ...candidates.slice(0, 3).map(([label, message]) => ({ label: String(label), correct: false, feedback: message }))];
        } else {
            question.answer = String(answer);
            question.tolerance = 0;
            question.rules = candidates.map(([value, feedback]) => ({ value: String(value), feedback }));
        }
        return question;
    }

    function gapQuestion(a, b, k, mode = 'choice', reverse = false) {
        const top = a * k, bottom = b * k, type = reverse ? 'reverseGap' : 'equivalentGap';
        return makeQuestion({ type, mode, model: { a, b, k, top, bottom, reverse },
            prompt: `${reverse ? `□/${bottom} = ${a}/${b}` : `${a}/${b} = □/${bottom}`}. What is the missing top number?`, answer: top,
            wrong: [[a + bottom - b, 'That adds the change in the bottom to the top. Multiply both numbers by the same number.'],
                [a, 'The top must change too. The bottom was multiplied by a number.'],
                [a * (k + 1), `The bottom was multiplied by ${k}, not ${k + 1}. Use the same multiplier for the top.`],
                [bottom, 'That copies the bottom number into the top. Multiply the original top by the multiplier.']],
            feedback: `${b} × ${k} = ${bottom}. So ${a} × ${k} = ${top}.`,
            fallback: 'Find the multiplier between the bottom numbers. Multiply the top by the same number.' });
    }

    function equivalentQuestion(a, b, k, mode = 'choice') {
        return makeQuestion({ type: 'spotEquivalent', mode, fractions: mode === 'number', model: { a, b, k },
            prompt: `Which fraction is equivalent to ${a}/${b}?${mode === 'number' ? ' Type a fraction with the same value.' : ''}`,
            answer: fraction(a * k, b * k),
            wrong: [[fraction(a + 1, b + 1), 'Adding 1 to both numbers changes the value. Multiply both by the same number.'],
                [fraction(a * k, b * (k + 1)), 'That multiplies the top and bottom by different numbers.'],
                [fraction(b, a + b), 'That uses the old bottom as the new top and adds both numbers for the bottom.'],
                [fraction(a, b * k), 'That changes only the bottom number. Both numbers must change together.']],
            feedback: `${a} × ${k} = ${a * k} and ${b} × ${k} = ${b * k}, so ${a}/${b} = ${a * k}/${b * k}.`,
            fallback: 'Multiply the top and bottom by the same whole number.' });
    }

    function simplificationWrong(top, bottom, a, b, divisor, includePartial) {
        const wrong = [];
        if (includePartial) {
            const first = divisor % 2 === 0 ? 2 : 3;
            wrong.push([fraction(top / first, bottom / first), 'That keeps the value, but it is not finished. Both numbers can still be divided by the same whole number.']);
        }
        wrong.push([fraction(a, bottom), 'Only the top was divided. Divide the bottom by the same number.'],
            [fraction(top - 1, bottom - 1), 'Subtracting 1 from both numbers changes the value. Simplifying uses division.'],
            [fraction(top, b), 'Only the bottom was divided. Divide the top by the same number.'],
            [fraction(top, bottom), 'That is the original fraction. It can still be simplified.']);
        return wrong;
    }

    function simplifyQuestion(a, b, divisor, mode = 'choice', type = 'simplifyFully', picture = null) {
        const top = a * divisor, bottom = b * divisor;
        const model = { a, b, divisor, top, bottom };
        const wrong = type === 'shadedFraction' ? [
            [fraction(top, bottom), 'That counts the shaded parts correctly, but it is not fully simplified. Divide both numbers by their highest common factor.'],
            [fraction(top, bottom - top), 'The bottom counts all the equal parts, not just the unshaded parts.'],
            [fraction(a + 1, b + 1), 'Adding to the top and bottom changes the value. Count the parts, then divide both numbers.'],
            [fraction(a, bottom), 'Only the top was divided. Divide the bottom by the same number.']
        ] : simplificationWrong(top, bottom, a, b, divisor, type === 'simplifyFully' && divisor > 3);
        const prompt = type === 'shadedFraction' ? 'What fraction of the bar is shaded? Give the fraction in its simplest form.'
            : `Write ${top}/${bottom} in its simplest form.`;
        const feedback = `${top} ÷ ${divisor} = ${a} and ${bottom} ÷ ${divisor} = ${b}. ${a}/${b} is fully simplified.`;
        const fallback = 'Divide both numbers by the same whole number. Keep going until no whole number greater than 1 divides both.';
        if (mode === 'number') return { questionType: type, input: 'custom', prompt, model, picture, feedback,
            widget: simplestWidget({ a, b, wrong, feedback, fallback }) };
        return makeQuestion({ type, mode, prompt, model, picture, writtenForm: true,
            answer: fraction(a, b), wrong, feedback, fallback });
    }

    function fullySimplifiedQuestion(a, b, mode = 'choice') {
        if (mode === 'number') return { questionType: 'fullySimplified', input: 'custom', model: { a, b },
            prompt: `Write ${a}/${b} in its simplest form.`, widget: simplestWidget({ a, b, wrong: [],
                feedback: `${a}/${b} is already fully simplified. No whole number greater than 1 divides both numbers.`,
                fallback: 'Check for a whole number greater than 1 that divides both numbers. If there is none, keep the fraction as it is.' }) };
        return makeQuestion({ type: 'fullySimplified', mode, model: { a, b }, prompt: 'Which fraction is fully simplified?',
            answer: fraction(a, b), writtenForm: true,
            wrong: [[6, 10], [9, 12], [8, 12]].map(([n, d]) => [fraction(n, d), `${n} and ${d} both divide by ${gcd(n, d)}, so this fraction can still be simplified.`]),
            feedback: `No whole number greater than 1 divides both ${a} and ${b}.`, fallback: 'Look for a common factor greater than 1.' });
    }

    function divisorQuestion(a, b, divisor, mode = 'choice') {
        const top = a * divisor, bottom = b * divisor;
        const wrong = Array.from({ length: 10 }, (_, index) => index + 2)
            .filter(n => top % n !== 0 || bottom % n !== 0)
            .map(n => [n, top % n === 0 ? `${n} divides ${top}, but not ${bottom}. It must divide both exactly.`
                : bottom % n === 0 ? `${n} divides ${bottom}, but not ${top}. It must divide both exactly.`
                    : `${n} does not divide either ${top} or ${bottom} exactly.`]);
        return makeQuestion({ type: 'validDivisor', mode, model: { a, b, divisor, top, bottom },
            prompt: mode === 'choice' ? `Which number divides both ${top} and ${bottom} exactly?`
                : `What is the highest common factor of ${top} and ${bottom}?`, answer: divisor, wrong,
            feedback: `${top} ÷ ${divisor} = ${a} and ${bottom} ÷ ${divisor} = ${b}. Both answers are whole numbers.`,
            fallback: 'Find a whole number that divides both exactly. For the highest common factor, choose the biggest.' });
    }

    function mistakeQuestion(a, b, variant, mode = 'choice') {
        const divisor = variant === 'stoppedEarly' ? 6 : variant === 'differentNumbers' ? 4 : 2;
        if (variant === 'differentNumbers') { a = 2; b = 3; }
        const top = a * divisor, bottom = b * divisor;
        const wrongTop = variant === 'subtracted' ? top - 1 : top / 2;
        const wrongBottom = variant === 'subtracted' ? bottom - 1 : variant === 'onlyTop' ? bottom
            : variant === 'differentNumbers' ? bottom / 3 : bottom / 2;
        const descriptions = {
            subtracted: 'They subtracted 1 instead of dividing.',
            onlyTop: 'They divided the top but not the bottom.',
            differentNumbers: 'They divided the top and bottom by different numbers.',
            stoppedEarly: 'They stopped before the fraction was fully simplified.'
        };
        const prompt = `A pupil changes ${top}/${bottom} to ${wrongTop}/${wrongBottom}. `
            + (mode === 'choice' ? 'What mistake did they make?' : 'Write the original fraction in its simplest form.');
        const feedback = `${descriptions[variant]} The fully simplified fraction is ${a}/${b}.`;
        const model = { a, b, divisor, top, bottom, wrongTop, wrongBottom, variant };
        if (mode === 'number') return { questionType: 'spotTheMistake', input: 'custom', prompt, model,
            widget: simplestWidget({ a, b, wrong: [[fraction(wrongTop, wrongBottom), descriptions[variant]]], feedback,
                fallback: 'Work from the original fraction. Divide its top and bottom by the same whole number.' }) };
        const mistakeFeedback = {
            subtracted: `Subtracting 1 would give ${top - 1}/${bottom - 1}. That is not the step shown.`,
            onlyTop: 'Both numbers changed here. The mistake is not leaving the bottom unchanged.',
            differentNumbers: 'Check the division in each number. The step shown did not divide them by different numbers.',
            stoppedEarly: 'This step changed the value. It is not just an unfinished simplification.'
        };
        return makeQuestion({ type: 'spotTheMistake', mode, model, prompt, answer: descriptions[variant],
            wrong: Object.entries(descriptions).filter(([key]) => key !== variant).map(([key, label]) => [label, mistakeFeedback[key]]),
            feedback, fallback: 'Compare what happened to the top and to the bottom.' });
    }

    function equalQuestion(a, b, k, equal, mode = 'choice') {
        const top = a * k + Number(!equal), bottom = b * k;
        if (mode === 'number') return { ...gapQuestion(a, b, k, mode), questionType: 'equalOrNot',
            model: { a, b, k, top: a * k, bottom, equal: true }, prompt: `To make □/${bottom} equal to ${a}/${b}, what top number is needed?` };
        const symbol = top * b === a * bottom ? '=' : '>';
        const first = fraction(top, bottom), second = fraction(a, b);
        return makeQuestion({ type: 'equalOrNot', mode, model: { a, b, k, top, bottom, equal, symbol },
            prompt: `Which statement about ${first} and ${second} is true?`, answer: `${first} ${symbol} ${second}`,
            wrong: [['<', 'Compare equal-sized parts. Rewrite the second fraction with the same bottom before comparing.'],
                ['>', 'That says the first fraction is greater. Check the tops after making the bottom numbers match.'],
                ['=', 'That says the fractions have the same value. Both top and bottom must have the same multiplier.']]
                .map(([sign, feedback]) => [`${first} ${sign} ${second}`, feedback])
                .concat([['They cannot be compared.', 'Rewrite them with the same bottom number. Then their parts are the same size.']]),
            feedback: `${a}/${b} = ${a * k}/${bottom}. So ${first} ${symbol} ${second}.`,
            fallback: 'Multiply both numbers in the smaller-written fraction by the same number.' });
    }

    function pick(random) {
        const E = window.Maths1to9LessonEngine;
        return E.shuffle(practiceTypes, random).slice(0, 6).map((type, index) => ({ type, mode: index % 2 ? 'number' : 'choice',
            seed: E.randomInt(0, 4294967295, random) }));
    }
    function generate(item, random) {
        const E = window.Maths1to9LessonEngine;
        const choose = items => items[E.randomInt(0, items.length - 1, random)];
        let [a, b] = choose(coprimePairs);
        const mode = item.mode || 'choice';
        switch (item.type) {
        case 'equivalentGap': return gapQuestion(a, b, choose([2, 3, 4, 5, 6]), mode);
        case 'reverseGap': return gapQuestion(a, b, choose([2, 3, 4, 5]), mode, true);
        case 'spotEquivalent': return equivalentQuestion(a, b, choose([2, 3, 4]), mode);
        case 'simplifyOneStep': return simplifyQuestion(a, b, choose([2, 3, 5, 7]), mode, item.type);
        case 'simplifyFully':
            [a, b] = choose(coprimePairs.filter(([, bottom]) => bottom <= 6));
            return simplifyQuestion(a, b, choose([4, 6, 8, 9, 10]), mode, item.type);
        case 'fullySimplified':
            [a, b] = choose([[3, 4], [2, 5], [5, 7], [7, 9], [4, 9], [9, 16], [8, 15], [5, 8]]);
            return fullySimplifiedQuestion(a, b, mode);
        case 'validDivisor': return divisorQuestion(a, b, choose([2, 3, 4, 5, 6]), mode);
        case 'spotTheMistake':
            [a, b] = choose([[3, 5], [2, 5], [3, 4], [2, 3]]);
            return mistakeQuestion(a, b, choose(['subtracted', 'onlyTop', 'differentNumbers', 'stoppedEarly']), mode);
        case 'shadedFraction': {
            const [n, d, k] = choose([[1, 2, 4], [1, 2, 5], [1, 3, 4], [2, 3, 4], [1, 4, 3],
                [3, 4, 3], [2, 5, 2], [1, 5, 2], [1, 3, 3], [1, 2, 6]]);
            return simplifyQuestion(n, d, k, mode, item.type, { top: n * k, bottom: d * k });
        }
        case 'equalOrNot': return equalQuestion(a, b, choose([3, 4, 5, 6]), choose([true, false]), mode);
        default: throw new Error(`Unknown simplifying fraction type: ${item.type}`);
        }
    }

    function examples() {
        return [equalQuestion(1, 2, 2, true), gapQuestion(2, 3, 4, 'number'),
            simplifyQuestion(2, 3, 2, 'choice', 'simplifyOneStep', { top: 4, bottom: 6, group: 2 }),
            divisorQuestion(2, 3, 5), simplifyQuestion(2, 3, 6, 'number'), gapQuestion(3, 5, 4, 'number', true),
            mistakeQuestion(3, 5, 'onlyTop'), simplifyQuestion(3, 4, 2, 'number', 'shadedFraction', { top: 6, bottom: 8 })];
    }
    function checks() {
        return [gapQuestion(3, 5, 4, 'number'), equivalentQuestion(3, 4, 2), simplifyQuestion(3, 4, 6, 'number'),
            fullySimplifiedQuestion(5, 7), simplifyQuestion(2, 3, 4, 'number', 'shadedFraction', { top: 8, bottom: 12 })];
    }

    // A strict written fraction is needed here: equivalent but unfinished answers must be rejected.
    function simplestWidget({ a, b, wrong, feedback, fallback }) {
        const normalise = value => ({ top: String(value?.top ?? ''), bottom: String(value?.bottom ?? '') });
        function mark(value) {
            const pair = normalise(value);
            if (!/^\d+$/.test(pair.top) || !/^\d+$/.test(pair.bottom) || Number(pair.bottom) === 0 || Number(pair.top) === 0) {
                return { correct: false, feedback: 'Use a positive whole number in each box. The bottom cannot be zero.' };
            }
            const top = Number(pair.top), bottom = Number(pair.bottom);
            if (!Number.isSafeInteger(top) || !Number.isSafeInteger(bottom)) return { correct: false, feedback: 'Use the whole-number counts from the fraction.' };
            if (top === a && bottom === b) return { correct: true, feedback };
            if (sameValue([top, bottom], [a, b])) return { correct: false,
                feedback: 'That has the right value, but it is not fully simplified. Divide both numbers by a common factor greater than 1.' };
            const mistake = wrong.find(([label]) => label === fraction(top, bottom));
            return { correct: false, feedback: mistake?.[1] || fallback };
        }
        return {
            mark,
            correctValue: () => ({ top: String(a), bottom: String(b) }),
            isEmpty: value => !normalise(value).top.trim() || !normalise(value).bottom.trim(),
            answerText: value => value === null ? '' : fraction(normalise(value).top, normalise(value).bottom),
            render(host, { value, editable, onChange }) {
                const group = element('div', '', 'sf-answer'); group.setAttribute('role', 'group'); group.setAttribute('aria-label', 'Your fraction');
                const fields = {};
                for (const [id, label] of [['top', 'Top number'], ['bottom', 'Bottom number']]) {
                    const wrapper = element('label', label);
                    const input = document.createElement('input'); input.type = 'text'; input.inputMode = 'numeric'; input.autocomplete = 'off';
                    input.addEventListener('input', () => onChange({ top: fields.top.value, bottom: fields.bottom.value }));
                    wrapper.append(input); group.append(wrapper); fields[id] = input;
                }
                fields.top.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); fields.bottom.focus(); } });
                host.append(group);
                function update(next) {
                    const pair = normalise(next.value);
                    for (const id of ['top', 'bottom']) { fields[id].value = pair[id]; fields[id].disabled = !next.editable; }
                }
                update({ value, editable });
                return { update, focus: () => fields.top.focus() };
            }
        };
    }

    const learnScreens = [
        { title: 'Different pieces can show the same amount', lines: ['Both bars have half shaded. The wholes are the same size.',
            '1/2 and 2/4 are equivalent fractions. Equivalent means they have the same value.',
            'The top number counts the shaded parts. The bottom number counts all the equal parts in one whole.'], maths: ['1/2 = 2/4'] },
        { title: 'Split every piece', lines: ['Split each third into 2 equal pieces. The shaded amount stays the same.',
            'Multiply the top and bottom by 2: 2/3 = 4/6. Split each piece again to get 8/12.',
            'Move the slider to see the pieces split.'], maths: ['2/3 = 4/6 = 8/12'], states: [[2, 3], [4, 6], [8, 12]] },
        { title: 'Merge the pieces back', lines: ['Simplifying is the opposite of splitting. It joins small pieces into larger pieces.',
            'Join each pair in 6/8. Divide the top and bottom by 2: 6 ÷ 2 = 3 and 8 ÷ 2 = 4.',
            '6/8 = 3/4. The numbers are smaller, but the amount is the same.'], maths: ['6/8 = 3/4', '6 ÷ 2 = 3', '8 ÷ 2 = 4'] },
        { title: 'Use a group size that divides both numbers', lines: ['A factor divides a whole number exactly, with no parts left over. A common factor divides both numbers.',
            'For 8/12, a group size of 2 works: 8 ÷ 2 = 4 and 12 ÷ 2 = 6. That gives 4/6.',
            'A group size of 4 gives 2/3. No whole number greater than 1 divides both 2 and 3, so 2/3 is fully simplified.',
            'Choose a group size to see which groups fit.'], maths: ['8/12 = 4/6 = 2/3', '8 ÷ 2 = 4', '12 ÷ 2 = 6', '8 ÷ 4 = 2', '12 ÷ 4 = 3'], groups: [2, 3, 4, 5] },
        { title: 'Simplify in one step', lines: ['The highest common factor is the biggest whole number that divides both numbers exactly.',
            'For 15/20, it is 5. Divide the top and bottom by 5.', '15 ÷ 5 = 3 and 20 ÷ 5 = 4. So 15/20 = 3/4.'], maths: ['15/20 = 3/4', '15 ÷ 5 = 3', '20 ÷ 5 = 4'] },
        { title: 'Keep going until it is finished', lines: ['For 18/24, divide both numbers by 2 to get 9/12.',
            '9/12 is not finished. Both numbers still divide by 3. Divide again to get 3/4.',
            '18/24 = 9/12 = 3/4. You could also divide both original numbers by their highest common factor, 6, in one step.'], maths: ['18/24 = 9/12 = 3/4'] },
        { title: 'Know when to stop', lines: ['No whole number greater than 1 divides both 5 and 7. So 5/7 is already fully simplified.',
            'The simplest form means the top and bottom have no common factor greater than 1. Keep the fraction as it is.'], maths: ['5/7'] },
        { title: 'Divide both numbers by the same number', lines: ['Subtracting from both numbers changes the value. 6/10 is not equal to 5/9.',
            'Dividing only the top also changes the value. 6/10 is not equal to 3/10. Divide both by 2 to get 3/5.',
            'Using different divisors changes the value too. Dividing 8 by 2 and 12 by 3 gives 4/4. That is not equal to 8/12.'], maths: ['6/10 ≠ 5/9', '6/10 ≠ 3/10', '6/10 = 3/5', '8/12 ≠ 4/4'] },
        { title: 'Read a shaded fraction, then simplify', lines: ['This bar has 8 equal parts, with 6 shaded. Write 6/8 first.',
            'Divide both numbers by 2 to get 3/4. Give this fully simplified fraction when the question asks for the simplest form.',
            'To check if fractions are equal, rewrite them with the same bottom. For example, 3/4 = 6/8. A top of 7 would make 7/8 greater than 3/4.',
            'The sign = means the same value. The sign > means greater than. The sign < means smaller than.'], maths: ['6/8 = 3/4', '3/4 = 6/8', '7/8 > 3/4'] }
    ];

    function element(tag, text, className) {
        const node = document.createElement(tag);
        if (text) node.textContent = text;
        if (className) node.className = className;
        return node;
    }
    function barSvg(top, bottom, group = 1) {
        const width = 320, cellWidth = (width - 2) / bottom;
        let shapes = '';
        for (let i = 0; i < bottom; i++) shapes += `<rect x="${1 + i * cellWidth}" y="6" width="${cellWidth}" height="44" fill="${i < top ? '#62c5bc' : '#fff'}" stroke="#64748b" stroke-width=".6"/>`;
        for (let i = 0; i < bottom; i += group) shapes += `<rect x="${1 + i * cellWidth}" y="3" width="${Math.min(group, bottom - i) * cellWidth}" height="50" fill="none" stroke="#155e75" stroke-width="2"/>`;
        return `<svg class="sf-bar" role="img" aria-label="${top} of ${bottom} equal parts shaded, grouped in ${group}s" viewBox="0 0 320 58" width="320" height="58">${shapes}</svg>`;
    }
    function picture(top, bottom, caption, group = 1) {
        const figure = element('figure', '', 'sf-picture'); figure.innerHTML = barSvg(top, bottom, group);
        if (caption) figure.append(element('figcaption', caption, 'sf-equation'));
        return figure;
    }
    function drawLearn(host, screen, section) {
        const explore = () => window.Maths1to9Lesson.recordActivity({ id: 'simplifying-fractions:pieces', kind: 'explore' });
        if (screen === 0) host.append(picture(1, 2, '1/2'), picture(2, 4, '2/4'));
        else if (screen === 1 || screen === 2) {
            const split = screen === 1, key = split ? 'split' : 'merge';
            const label = element('label', split ? 'Number of splits' : 'Pieces in each group', 'sf-slider-label');
            const input = document.createElement('input'); input.type = 'range'; input.min = split ? '0' : '1'; input.max = split ? '2' : '2'; input.step = '1';
            input.value = split ? section.state.split - 1 : section.state.merge;
            label.append(input); const visual = element('div'); host.append(label, visual);
            function update() {
                if (split) {
                    const factor = 2 ** Number(input.value);
                    visual.replaceChildren(picture(2 * factor, 3 * factor, factor === 1 ? '2/3' : `2/3 = ${2 * factor}/${3 * factor}`));
                } else {
                    const group = Number(input.value);
                    visual.replaceChildren(picture(6, 8, '6/8', group), picture(6 / group, 8 / group, group === 1 ? '6/8' : `6/8 = ${6 / group}/${8 / group}`));
                }
            }
            input.addEventListener('input', () => { section.update(state => { state[key] = split ? Number(input.value) + 1 : Number(input.value); }); explore(); update(); });
            update();
        } else if (screen === 3) {
            const label = element('label', 'Group size', 'sf-slider-label'); const select = document.createElement('select');
            for (const size of [2, 3, 4, 5]) { const option = element('option', String(size)); option.value = size; select.append(option); }
            select.value = section.state.group; label.append(select);
            const visual = element('div'); host.append(label, visual);
            function update() {
                const size = Number(select.value), works = 8 % size === 0 && 12 % size === 0;
                visual.replaceChildren(picture(8, 12, '8/12', size));
                if (works) visual.append(picture(8 / size, 12 / size, `8/12 = ${8 / size}/${12 / size}`),
                    element('p', size === 4 ? '4 divides both exactly. 2/3 is fully simplified.' : '2 divides both exactly. 4/6 can still be simplified.'));
                else visual.append(element('p', `${size} does not divide ${8 % size ? '8' : '12'} exactly. Some parts are left over. Choose a group size that divides both.`));
            }
            select.addEventListener('change', () => { section.update(state => { state.group = Number(select.value); }); explore(); update(); }); update();
        } else if (screen === 4) host.append(picture(15, 20, '15/20', 5), picture(3, 4, '3/4'));
        else if (screen === 5) host.append(picture(18, 24, '18/24', 2), picture(9, 12, '9/12', 3), picture(3, 4, '3/4'));
        else if (screen === 6) host.append(picture(5, 7, '5/7'));
        else if (screen === 7) host.append(picture(6, 10, '6/10', 2), picture(3, 5, '3/5'));
        else host.append(picture(6, 8, '6/8', 2), picture(3, 4, '3/4'));
    }
    function prepare(question, random) {
        const prepared = question.options ? { ...question, options: window.Maths1to9LessonEngine.shuffle(question.options, random) } : { ...question };
        if (question.picture) prepared.figure = host => {
            const { top, bottom, group = 1 } = question.picture;
            host.innerHTML = barSvg(top, bottom, group);
        };
        return prepared;
    }
    window.SimplifyingFractions = { learnScreens, examples, practiceTypes, pick, generate, checks, prepare, drawLearn,
        gapQuestion, equivalentQuestion, simplifyQuestion, fullySimplifiedQuestion, divisorQuestion, mistakeQuestion, equalQuestion,
        simplestWidget, correctValue: question => question.widget.correctValue(), barSvg, gcd, sameValue, optionKey, coprimePairs };
})();
