(() => {
    'use strict';

    // Shared tap-the-gap widget, used by both Try it and Practice.
    // Depends on window.DecimalCalculations (element, button, drawArrows),
    // which interactive.js sets before this file loads.
    const Calc = () => window.DecimalCalculations;

    function pointText(digits, gap) {
        return gap >= digits.length ? digits : `${digits.slice(0, gap)}.${digits.slice(gap)}`;
    }

    function pointWidget(task) {
        const { element, button, drawArrows } = Calc();
        let value = null;
        let editable = true;
        let host, onChange;
        let gaps = [];
        let dispose = () => {};
        function paint() {
            dispose();
            dispose = () => {};
            host.replaceChildren();
            const placed = value?.gap;
            const correct = placed === task.gap && !editable;
            const picture = element('div', '', 'decimal-number-picture decimal-point-picture');
            const row = element('div', '', 'decimal-big-number decimal-point-row');
            row.classList.toggle('is-locked', !editable);
            const digits = [];
            gaps = [];
            if (placed === 0) row.append(element('span', '0', 'decimal-digit'));
            for (let index = 0; index <= task.digits.length; index++) {
                const gap = button(placed === index ? '.' : '',
                    `Put the point in ${task.digits} in gap ${index + 1}`, () => {
                        if (!editable) return;
                        value = { gap: index };
                        onChange(value);
                        paint();
                    });
                gap.disabled = !editable;
                gap.classList.toggle('is-placed', placed === index);
                if (placed === index && !correct && value?.wrongGap === index) gap.classList.add('is-wrong');
                gaps.push(gap);
                row.append(gap);
                if (index < task.digits.length) {
                    const digit = element('span', task.digits[index], 'decimal-digit');
                    digits.push(digit);
                    row.append(digit);
                }
            }
            picture.append(row);
            host.append(element('div', task.sum, 'decimal-big-number decimal-point-sum'), picture);
            if (editable) host.append(element('p', 'Tap the gap where the point goes.', 'decimal-learn-instruction'));
            const back = digits.slice(task.gap);
            dispose = drawArrows(picture, correct ? back.map((node, index) => ({
                from: { node, side: 'right' },
                to: index === 0 ? { node: gaps[task.gap], side: 'centre' } : { node, side: 'left' },
                label: String(task.count),
                head: index === 0
            })) : []);
        }
        return {
            keepValueOnRetry: true,
            render(container, options) {
                host = container;
                onChange = options.onChange;
                return {
                    update(next) {
                        value = next.value;
                        editable = next.editable;
                        paint();
                    },
                    focus() { gaps[value?.gap ?? 0]?.focus(); }
                };
            },
            reset() {
                if (!host) return;
                value = null;
                editable = true;
                paint();
            },
            isEmpty: value => value?.gap == null,
            mark(value) {
                const correct = value.gap === task.gap;
                return {
                    correct,
                    feedback: correct ? task.right : task.wrong(value.gap),
                    value: { gap: value.gap, wrongGap: correct ? null : value.gap }
                };
            },
            answerText: value => value?.gap == null ? '' : pointText(task.digits, value.gap)
        };
    }

    window.PointGap = { pointText, pointWidget };
})();
