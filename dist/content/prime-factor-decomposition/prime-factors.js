(() => {
    'use strict';

    const FEEDBACK = Object.freeze({
        'is-prime': '{n} is prime. This branch is finished.',
        'not-whole': 'Use whole numbers.',
        'not-product': 'These numbers must multiply to make {n}. Try again.',
        'uses-one': '1 × {n} just gives you {n} again. Use two numbers bigger than 1.',
        'not-finished': "One end number isn't prime yet. Split it.",
        'includes-one': "Leave out 1. It isn't prime, and multiplying by 1 changes nothing.",
        'wrong-product': "Your answer makes {p}, not {n}. Check you've included every prime, including repeats.",
        'not-prime': "{x} isn't prime. Split it into prime factors.",
        'not-grouped': 'Your prime factors are correct. Now group the repeated factors using powers.',
        correct: 'All your factors are prime, and they multiply to make {n}.',
        empty: 'Add at least one factor.',
        invalid: 'Each factor and power must be a whole number.'
    });

    function feedback(reason, values = {}) {
        return FEEDBACK[reason].replace(/\{([nxp])\}/g, (_, key) => String(values[key]));
    }

    function isPrime(n) {
        if (!Number.isInteger(n) || n < 2) return false;
        for (let factor = 2; factor * factor <= n; factor++) {
            if (n % factor === 0) return false;
        }
        return true;
    }

    function primeFactors(n) {
        if (!Number.isSafeInteger(n) || n < 2) {
            throw new RangeError('Use a safe whole number greater than 1.');
        }
        const factors = [];
        let remaining = n;
        for (let factor = 2; factor * factor <= remaining; factor++) {
            while (remaining % factor === 0) {
                factors.push(factor);
                remaining /= factor;
            }
        }
        if (remaining > 1) factors.push(remaining);
        return factors;
    }

    function toIndexForm(factors) {
        const counts = new Map();
        factors.forEach(base => counts.set(base, (counts.get(base) || 0) + 1));
        return [...counts].sort(([a], [b]) => a - b).map(([base, power]) => ({ base, power }));
    }

    function toLatex(entries) {
        return entries.map(({ base, power }) => power === 1 ? String(base) : `${base}^{${power}}`).join(' \\times ');
    }

    function checkSplit(value, a, b) {
        if (isPrime(value)) return { ok: false, reason: 'is-prime' };
        if (!Number.isInteger(a) || !Number.isInteger(b) || a < 1 || b < 1) {
            return { ok: false, reason: 'not-whole' };
        }
        if (a * b !== value) return { ok: false, reason: 'not-product' };
        if (a === 1 || b === 1) return { ok: false, reason: 'uses-one' };
        return { ok: true };
    }

    function createTree(n) {
        if (!Number.isSafeInteger(n) || n < 2) {
            throw new RangeError('Use a safe whole number greater than 1.');
        }
        return { id: 'root', value: n };
    }

    function splitNode(tree, nodeId, a, b) {
        function find(node) {
            if (node.id === nodeId) return node;
            for (const child of node.children || []) {
                const found = find(child);
                if (found) return found;
            }
            return null;
        }
        const node = find(tree);
        // Model errors are distinct from mathematical factor-pair mistakes.
        if (!node) return { error: 'not-found' };
        if (node.children?.length) return { error: 'already-split' };
        const result = checkSplit(node.value, a, b);
        if (!result.ok) return { error: result.reason };
        function copy(current) {
            if (current.id === nodeId) {
                return { ...current, children: [
                    { id: `${current.id}-0`, value: a },
                    { id: `${current.id}-1`, value: b }
                ] };
            }
            return current.children?.length
                ? { ...current, children: current.children.map(copy) }
                : { ...current };
        }
        return { tree: copy(tree) };
    }

    function leaves(tree) {
        return tree.children?.length ? tree.children.flatMap(leaves) : [tree.value];
    }

    function isFinished(tree) {
        return leaves(tree).every(isPrime);
    }

    function markAnswer(target, entries, { indexForm = false } = {}) {
        const answer = (status, values = {}) => ({ status, message: feedback(status, { n: target, ...values }) });
        if (Array.isArray(entries) && entries.length === 0) return answer('empty');
        if (!Array.isArray(entries) || entries.some(entry =>
            !entry || !Number.isInteger(entry.base) || entry.base < 1 || !Number.isInteger(entry.power) || entry.power < 1
        )) return answer('invalid');
        if (entries.some(({ base }) => base === 1)) return answer('includes-one');
        const product = entries.reduce((total, { base, power }) => total * base ** power, 1);
        if (product !== target) return answer('wrong-product', { p: product });
        const nonPrime = entries.find(({ base }) => !isPrime(base));
        if (nonPrime) return answer('not-prime', { x: nonPrime.base });
        if (indexForm && new Set(entries.map(({ base }) => base)).size !== entries.length) {
            return answer('not-grouped');
        }
        return answer('correct');
    }

    Object.assign(window.Maths1to9PrimeFactors ??= {}, {
        FEEDBACK, feedback, isPrime, primeFactors, toIndexForm, toLatex,
        checkSplit, createTree, splitNode, leaves, isFinished, markAnswer
    });
})();
