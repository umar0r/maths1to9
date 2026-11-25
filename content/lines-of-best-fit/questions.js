(() => {
    'use strict';

    const slug = typeof document === 'undefined' ? 'lines-of-best-fit' : document.body.dataset.lessonId;

    /* Placeholder Practice and Check: one card about what a line of best fit
       is, so every question section loads and works. The real cards for each
       part replace these in the next stages. */
    function scaffoldCard() {
        return {
            input: 'choice',
            questionType: 'best-line',
            prompt: 'What is a line of best fit?',
            feedback: 'Yes. About as many points sit above it as below it.',
            options: [
                {
                    label: 'A straight line that follows the pattern, through the middle of the points.',
                    feedback: 'Yes. About as many points sit above it as below it.',
                    correct: true
                },
                {
                    label: 'A line that joins every point, dot to dot.',
                    feedback: "A line of best fit is one straight line. It doesn't join the dots."
                },
                {
                    label: 'A line from the first point to the last point.',
                    feedback: "It doesn't have to go through any point. It goes through the middle of them all."
                },
                {
                    label: 'A straight line that must start at 0.',
                    feedback: "It doesn't have to start at 0. It just follows the points."
                }
            ]
        };
    }

    function pickPractice(part, count, random, { randomInt }) {
        return Array.from({ length: count }, () => ({
            type: 'scaffold', part,
            seed: randomInt(0, 0xffffffff, random)
        }));
    }

    function practiceQuestion(item, random, { shuffle }) {
        const card = scaffoldCard();
        return { ...card, options: shuffle(card.options, random) };
    }

    function checkQuestion(random, { shuffle }) {
        const card = scaffoldCard();
        return { ...card, options: shuffle(card.options, random) };
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { pickPractice, practiceQuestion, scaffoldCard };
        return;
    }

    window.Maths1to9QuestionSets ??= {};
    window.Maths1to9QuestionSets[slug] = async api => {
        const helpers = window.Maths1to9LessonEngine;
        for (const { id } of api.getSections()) {
            const section = api.getSection(id);
            const { kind, part, config } = section;
            if (kind !== 'question-bank' && kind !== 'comparison') continue;
            const host = document.getElementById(helpers.questionSetContainerId(slug, id));
            if (!host) continue;
            if (kind === 'question-bank') {
                await api.runQuestionSet(id, {
                    version: 1, count: config.session_length, upgrade: () => null,
                    pick: random => pickPractice(part, config.session_length, random, helpers),
                    question: (item, random) => practiceQuestion(item, random, helpers)
                });
                continue;
            }
            const { questions } = config;
            await api.runQuestionSet(id, {
                version: 1, count: questions.length, heading: 'Check results', upgrade: () => null,
                pick: () => questions.map((_, index) => ({ type: String(index), seed: index })),
                question: (item, random) => checkQuestion(random, helpers)
            });
        }
    };
})();
