(() => {
    'use strict';

    function standardForm(front, index) {
        const superscripts = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
        return `${front} × 10${String(index).split('').map(digit => superscripts[digit]).join('')}`;
    }

    // Move the point in the original digits; no numeric conversion or multiplication.
    function toOrdinary(front, index) {
        const negative = front.startsWith('-');
        const text = negative ? front.slice(1) : front;
        const [whole, fraction = ''] = text.split('.');
        const digits = whole + fraction;
        const point = whole.length + index;
        let result;
        if (point <= 0) result = `0.${'0'.repeat(-point)}${digits}`;
        else if (point >= digits.length) result = digits + '0'.repeat(point - digits.length);
        else result = `${digits.slice(0, point)}.${digits.slice(point)}`;
        result = result.replace(/^0+(?=\d)/, '');
        if (result.includes('.')) result = result.replace(/0+$/, '').replace(/\.$/, '');
        return negative && result !== '0' ? `-${result}` : result;
    }

    function spaced(text) {
        const [whole, fraction] = text.split('.');
        const sign = whole.startsWith('-') ? '−' : '';
        const digits = whole.replace(/^-/, '');
        const grouped = digits.length >= 5 ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : digits;
        return sign + grouped + (fraction === undefined ? '' : `.${fraction}`);
    }

    function chain(front, index) {
        const direction = Math.sign(index);
        return Array.from({ length: Math.abs(index) + 1 }, (_, step) => spaced(toOrdinary(front, direction * step))).join(' → ');
    }

    function practiceQuestion(type, front, index) {
        const answer = toOrdinary(front, index);
        const size = Math.abs(index);
        const step = index > 0 ? '×10' : '÷10';
        const rules = [];
        function rule(value, feedback) {
            if (value !== answer && !rules.some(item => item.value === value)) rules.push({ value, feedback });
        }
        if (index < 0) rule(`-${answer}`, "A negative index means divide by 10. It doesn't make the number negative.");
        if (index !== 0) {
            rule(toOrdinary(front, 0), `That's the number you started with. Do ${size} ${step} steps.`);
            rule(toOrdinary(front, -index), 'Check the sign of the index. Positive: multiply by 10. Negative: divide by 10.');
        }
        if (type.startsWith('zero-inside')) rule(toOrdinary(front.replace('.0', '.'), index), 'Keep the 0 between the digits. It holds a place.');
        if (index !== 0) {
            rule(toOrdinary(answer, Math.sign(index)), `That's ${size + 1} steps. The index tells you to do ${size}.`);
            rule(toOrdinary(answer, -Math.sign(index)), `That's ${size - 1} steps. The index tells you to do ${size}.`);
        } else {
            rule(toOrdinary(front, 1), '10⁰ is 1, so there are no ×10 steps.');
            rule('0', '10⁰ is 1, not 0, so the number stays the same.');
        }
        const words = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'];
        const working = chain(front, index);
        const unchanged = `10⁰ is 1, so ${standardForm(front, index)} = ${spaced(answer)}.`;
        return {
            questionType: type, input: 'number', answer, rules,
            prompt: `Write ${standardForm(front, index)} as an ordinary number.`,
            fallback: index === 0 ? unchanged : `${index > 0 ? 'Multiply' : 'Divide'} by 10 ${words[size].toLowerCase()} times: ${working}.`,
            feedback: index === 0 ? unchanged : `${working}. ${words[size]} ${step} steps.`
        };
    }

    window.StandardFormOrdinary = { standardForm, toOrdinary, spaced, chain, practiceQuestion };
})();
