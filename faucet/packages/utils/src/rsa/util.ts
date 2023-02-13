// @ts-nocheck
const bigInt = require("big-integer");

export function splitToWords(x, w, n, name) {
  let t = bigInt(x);
  w = bigInt(w);
  n = bigInt(n);
  const words = {};
  for (let i = 0; i < n; ++i) {
    words[`${name}[${i}]`] = `${t.mod(bigInt(2).pow(w))}`;
    t = t.divide(bigInt(2).pow(w));
  }
  if (!t.isZero()) {
    throw `Number ${x} does not fit in ${w * n} bits`;
  }
  return words;
}
