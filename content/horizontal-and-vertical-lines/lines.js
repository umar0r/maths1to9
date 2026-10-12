(() => {
    'use strict';
    const graph = window.Maths1to9Graph;
    const number = graph.formatNumber;

    function equation(axis, value) {
        return `${axis}\u00a0=\u00a0${number(value)}`;
    }

    function judge(line, target) {
        if (line === null) return { correct: false, feedback: 'Draw a longer line.' };
        const type = graph.classify(line);
        const horizontal = target.axis === 'y';
        const sameDirection = type.kind === (horizontal ? 'horizontal' : 'vertical');
        const value = number(target.value);
        const rule = equation(target.axis, target.value);
        const coordinate = horizontal ? 'a y-coordinate' : 'an x-coordinate';
        const correct = sameDirection && type.value === target.value;
        let feedback;
        if (correct) feedback = `✓ Every point on this line has ${coordinate} of ${value}.`;
        else if (sameDirection) {
            const own = equation(target.axis, type.value);
            const move = horizontal ? (type.value > target.value ? 'down' : 'up') : (type.value > target.value ? 'left' : 'right');
            feedback = target.value === 0
                ? `This is ${own}. ${rule} is the ${horizontal ? 'x' : 'y'}-axis. Move it ${move}.`
                : `This is ${own}. Move it ${move} to ${value} on the ${target.axis}-axis.`;
        } else if (type.kind === 'sloping') {
            feedback = horizontal
                ? `Your line changes height. For ${rule}, the height stays at ${value} all the way across.`
                : `Your line moves sideways as it goes up. For ${rule}, it stays at ${value} all the way up.`;
        } else if (type.value === target.value) {
            const own = equation(horizontal ? 'x' : 'y', type.value);
            feedback = `This is ${own}. For ${rule}, draw ${horizontal ? 'across' : 'up and down'}, ` +
                (target.value === 0 ? `along the ${horizontal ? 'x' : 'y'}-axis.` : `through ${value} on the ${target.axis}-axis.`);
        } else {
            feedback = horizontal
                ? `This line goes up and down, so its y-coordinate changes. For ${rule}, draw across.`
                : `This line goes across, so its x-coordinate changes. For ${rule}, draw up and down.`;
        }
        return { correct, feedback };
    }

    function describeLine(line) {
        const type = graph.classify(line);
        if (type.kind === 'horizontal') return equation('y', type.value);
        if (type.kind === 'vertical') return equation('x', type.value);
        return `a sloping line from ${graph.formatPoint(line.from)} to ${graph.formatPoint(line.to)}`;
    }

    window.HorizontalVerticalLines = { equation, judge, describeLine };
})();
