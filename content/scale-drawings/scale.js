(() => {
    'use strict';

    function number(value) {
        const rounded = Math.round((Number(value) + Number.EPSILON) * 1e6) / 1e6;
        const parts = String(rounded).split('.');
        if (parts[0].replace('-', '').length >= 5) {
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        }
        return parts.join('.');
    }

    const learnScreens = [
        {
            title: 'What a scale tells you',
            lines: [
                "A plan is a drawing of something seen from above. This is Sam's bedroom.",
                "The scale tells you what 1 cm on the drawing stands for in real life. 'Represents' means 'stands for'.",
                'Here, every 1 cm on the plan stands for 2 m in the real room. Tap each centimetre along the bottom.'
            ],
            callout: '3 cm on the plan. 3 lots of 2 m. 3 × 2 = 6 m in real life.'
        },
        {
            title: 'Everything shrinks the same way',
            lines: [
                'In a scale drawing, every length shrinks the same way.',
                'Drag each piece onto the plan. Every length is divided by 2.',
                "The bed keeps its shape. It's just smaller."
            ],
            callout: "The room, the bed, the rug and the desk all use the same scale. That's what makes it a scale drawing."
        },
        {
            title: 'Same lake, two maps',
            lines: [
                "Map B's lake looks twice as big. Measure both.",
                'Map B is zoomed in. It draws everything bigger, so each centimetre stands for less.'
            ],
            callout: 'Same lake: 200 m across. On Map B, 200 m is drawn as 8 cm, so 1 cm stands for 200 ÷ 8 = 25 m. A length on a map means nothing without its scale.'
        },
        {
            title: 'Which way: times or divide?',
            lines: ['Real things are big. Drawings are small.', 'Going to real life, the number gets bigger. Times by 5.', 'Going to the drawing, the number gets smaller. Divide by 5.'],
            callout: 'Check your answer. A real length should be bigger than the number of cm on the drawing.'
        },
        {
            title: 'Draw it yourself',
            lines: ['Divide each real length by 2. Then draw.', "Drag the corner. The labels show the real size of what you've drawn."],
            callout: "That's Sam's garden: 4 cm by 2.5 cm on paper, 8 m by 5 m in real life."
        },
        {
            title: 'Area: change the lengths first',
            lines: ['m² means square metres.', "Each 1 cm square on the plan becomes a 2 m by 2 m square in real life. That's 4 m², not 2 m².", 'So change the lengths to real life first. Then find the area.'],
            callout: 'The plan is 6 cm². The real garden is 24 m², not 6 × 2 = 12 m².'
        },
        {
            title: 'A path in two parts',
            lines: ['You walk along the path, so find each part, then add.', 'You could also add the cm first: 3 + 4 = 7 cm, and 7 × 50 = 350 m.'],
            callout: 'Every time: 1. Read the scale: what does 1 cm stand for? 2. Going to real life? Times. Going to the drawing? Divide. 3. Check: real lengths should be bigger.'
        }
    ];

    const practiceTypes = [];
    const examples = () => [];
    const checks = () => [];
    window.ScaleDrawings = { number, learnScreens, practiceTypes, examples, checks };
})();
