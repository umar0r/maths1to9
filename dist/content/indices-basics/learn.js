(() => {
    'use strict';

    document.addEventListener('maths1to9:lesson-rendered', event => {
        if (event.detail?.slug !== 'indices-basics') return;
        const paragraphs = document.querySelectorAll('#lesson-section-explanation .lesson-copy > p');
        if (paragraphs.length < 2) return;

        const notation = document.createElement('figure');
        notation.className = 'indices-notation';
        notation.setAttribute('role', 'img');
        notation.setAttribute('aria-label', 'Four cubed: the large 4 is the base; the raised 3 is the index, also called the exponent.');
        notation.innerHTML = `
            <div class="indices-notation__layout" aria-hidden="true">
                <div class="indices-notation__label indices-notation__label--base">Base<span>The number</span></div>
                <div class="indices-notation__power"><span>4</span><sup>3</sup></div>
                <div class="indices-notation__label indices-notation__label--index">Index<span>Also called exponent</span></div>
            </div>`;
        paragraphs[0].after(notation);

        const expansion = document.createElement('figure');
        expansion.className = 'indices-expansion';
        expansion.setAttribute('aria-label', 'Four cubed equals four times four times four, which equals sixty-four. There are three factors of four.');
        expansion.innerHTML = `
            <div class="indices-expansion__equation" aria-hidden="true">
                <span><span class="indices-base">4</span><sup class="indices-index">3</sup></span>
                <span>=</span>
                <span class="indices-factors"><span class="indices-base">4 × 4 × 4</span>
                    <svg viewBox="0 0 180 26" preserveAspectRatio="none"><path d="M2,2 V14 H178 V2 M90,14 V24"/></svg>
                    <span class="indices-factors__caption">three 4s</span>
                </span>
                <span>= 64</span>
            </div>
            <figcaption>Use the base <strong>4</strong> exactly <strong>three</strong> times.</figcaption>`;
        paragraphs[1].after(expansion);
    });
})();
