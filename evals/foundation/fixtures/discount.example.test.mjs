import test from 'node:test';
import assert from 'node:assert/strict';
import { priceAfterDiscount } from './discount.mjs';
test('ordinary whole-penny examples', () => {
  assert.equal(priceAfterDiscount(1000, 20), 800);
  assert.equal(priceAfterDiscount(500, 0), 500);
});
