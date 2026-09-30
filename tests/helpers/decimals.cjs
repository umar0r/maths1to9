// Exact decimal arithmetic for tests: numbers are digit strings, never floats,
// so rounding and percentage checks cannot be fooled by 0.1 + 0.2 errors.
const fs = require('node:fs');
const path = require('node:path');

// "1,234.50" -> { digits: 123450n, places: 2 }
function exact(text) {
    const clean = String(text).replace(/[,£\s]/g, '').replace(/−/g, '-');
    const negative = clean.startsWith('-');
    const [whole, fraction = ''] = clean.replace('-', '').split('.');
    const digits = BigInt((whole || '0') + fraction);
    return { digits: negative ? -digits : digits, places: fraction.length };
}
// Exact value -> plain string with at least `minPlaces` decimals ("10.0", "4000").
function show({ digits, places }, minPlaces = 0) {
    const negative = digits < 0n;
    let s = (negative ? -digits : digits).toString().padStart(places + 1, '0');
    let whole = places ? s.slice(0, -places) : s, fraction = places ? s.slice(-places) : '';
    fraction = fraction.replace(/0+$/, '').padEnd(minPlaces, '0');
    return (negative ? '-' : '') + whole + (fraction ? '.' + fraction : '');
}
const withCommas = text => {
    const [whole, fraction] = String(text).split('.');
    return whole.replace(/\B(?=(\d{3})+$)/g, ',') + (fraction !== undefined ? '.' + fraction : '');
};
const scale = (x, places) => x.places >= places ? x : { digits: x.digits * 10n ** BigInt(places - x.places), places };
const times = (a, b) => ({ digits: a.digits * b.digits, places: a.places + b.places });
const equal = (a, b) => { const p = Math.max(a.places, b.places); return scale(a, p).digits === scale(b, p).digits; };
const percentOf = (percent, whole) => times(exact(percent), { ...exact(whole), places: exact(whole).places + 2 });

// Round a positive number to the place 10^power (power 1 = nearest 10,
// power -2 = 2 decimal places), halves up. Keeps the decimals that place needs.
function roundToPower(text, power) {
    const x = exact(text);
    const dropPlaces = x.places + power; // digits to remove from the right
    if (dropPlaces <= 0) return show(x, Math.max(0, -power));
    const unit = 10n ** BigInt(dropPlaces);
    let kept = x.digits / unit;
    if ((x.digits % unit) * 2n >= unit) kept++;
    return show({ digits: kept * (power > 0 ? 10n ** BigInt(power) : 1n), places: Math.max(0, -power) }, Math.max(0, -power));
}

// Round to n significant figures, halves up. After a carry (9.96 -> 10) the
// extra digit is dropped so the answer keeps n figures.
function roundSig(text, n) {
    const [whole, fraction = ''] = String(text).replace(/,/g, '').split('.');
    const mantissa = BigInt(whole + fraction);
    const drop = mantissa.toString().length - n;
    let kept, place = drop - fraction.length;
    if (drop > 0) {
        const unit = 10n ** BigInt(drop);
        kept = mantissa / unit;
        if ((mantissa % unit) * 2n >= unit) kept++;
        if (kept.toString().length > n) { kept /= 10n; place++; }
    } else {
        kept = mantissa;
    }
    if (place >= 0) return (kept * 10n ** BigInt(place)).toString();
    const digits = kept.toString().padStart(-place + 1, '0');
    return digits.slice(0, place) + '.' + digits.slice(place);
}

// A custom lesson's own answer checker (normalise + matches) from its lesson.js.
function lessonChecker(lessonJsFile) {
    const source = fs.readFileSync(lessonJsFile, 'utf8');
    return new Function(
        source.slice(source.indexOf('    const normalise ='), source.indexOf('    const engine =')) +
        source.slice(source.indexOf('    function matches('), source.indexOf('    function advance(')) +
        'return { normalise, matches };'
    )();
}

module.exports = { exact, show, withCommas, times, equal, percentOf, roundToPower, roundSig, lessonChecker, path };
