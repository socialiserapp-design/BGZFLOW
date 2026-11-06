export function priceAfterDiscount(cents, percent) {
  if (!Number.isSafeInteger(cents) || cents < 0 || cents > 1000000 || !Number.isInteger(percent) || percent < 0 || percent > 100) throw new RangeError('Outside the supported input domain.');
  return Math.floor(cents * (100 - percent) / 100);
}
