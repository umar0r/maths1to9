(() => {
    'use strict';

    function pickPractice(part, count, random, { randomInt, shuffle }) {
        const types = part ? Array(count).fill(part) : shuffle([
            'apples', 'pears',
            ...Array.from({ length: count - 2 }, () => random() < 0.5 ? 'apples' : 'pears')
        ], random);
        return types.map((type, index) => ({
            type, seed: randomInt(0, 0xffffffff, random),
            input: index % 2 === 0 ? 'number' : 'choice'
        }));
    }

    function practiceQuestion(item, random, { randomInt, shuffle }) {
        const apples = item.type === 'apples';
        const a = apples ? randomInt(2, 8, random) : randomInt(7, 13, random);
        const b = randomInt(2, 6, random);
        const total = apples ? a + b : a - b;
        const answer = String(total);
        const feedback = `${a} ${apples ? '+' : '−'} ${b} = ${total}.`;
        const prompt = apples ? `How many apples? ${a} + ${b}` : `How many pears are left? ${a} − ${b}`;
        const definition = {
            input: item.input, prompt, part: item.type,
            questionType: 'fruit-practice', answer, feedback
        };
        const wrong = apples ? [
            { label: String(a), feedback: 'Count both groups.' },
            { label: String(total - 1), feedback: 'You missed one apple.' },
            { label: String(total + 1), feedback: 'Count each apple once.' }
        ] : [
            { label: String(a), feedback: 'Take away the pears that were removed.' },
            { label: String(a + b), feedback: 'The group gets smaller when you take pears away.' },
            { label: String(total + 1), feedback: 'You need to take away one more pear.' }
        ];
        if (item.input === 'choice') {
            definition.options = shuffle([{ label: answer, feedback, correct: true }, ...wrong], random);
        } else {
            definition.rules = wrong.map(({ label, feedback }) => ({ value: label, feedback }));
            definition.fallback = apples ? 'Count both groups together.' : 'Count the pears that are left.';
        }
        return definition;
    }

    function checkQuestion({ prompt, correct, wrong, feedback }, random, { shuffle }) {
        return {
            input: 'choice', questionType: 'fruit-check', prompt,
            options: shuffle([{ label: correct, feedback, correct: true }, ...wrong], random)
        };
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { pickPractice, practiceQuestion };
        return;
    }

    window.Maths1to9QuestionSets ??= {};
    window.Maths1to9QuestionSets[document.body.dataset.lessonId] = async api => {
        const helpers = window.Maths1to9LessonEngine;
        const comparison = api.getSection('comparison');
        for (const { id } of api.getSections()) {
            const { kind, part, config } = api.getSection(id);
            if (kind !== 'question-bank') continue;
            const containerId = helpers.questionSetContainerId(document.body.dataset.lessonId, id);
            const host = document.getElementById(containerId);
            const section = host.closest('.lesson-section');
            section.removeAttribute('aria-labelledby');
            section.setAttribute('aria-label', config.title ?? (part ? `${part} Practice` : 'Mixed Practice'));
            await api.runQuestionSet(id, {
                version: 1, count: config.session_length,
                pick: random => pickPractice(part, config.session_length, random, helpers),
                question: (item, random) => practiceQuestion(item, random, helpers)
            });
        }
        const { questions } = comparison.config;
        await api.runQuestionSet(comparison.id, {
            version: 1, count: questions.length, heading: 'Check results',
            pick: () => questions.map((_, index) => ({ type: String(index), seed: index })),
            question: (item, random) => checkQuestion(questions[Number(item.type)], random, helpers)
        });
    };
})();
