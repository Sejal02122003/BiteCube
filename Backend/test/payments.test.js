import test from 'node:test';
import assert from 'node:assert/strict';
import { toPaise, fromPaise } from '../src/core/payments/money.js';

test('money is stored as integer paise without floating point drift', () => {
  assert.equal(toPaise(1000), 100000);
  assert.equal(toPaise(10.05), 1005);
  assert.equal(fromPaise(100000), 1000);
});

test('invalid money values are rejected', () => {
  assert.throws(() => toPaise(-1));
  assert.throws(() => fromPaise(10.5));
});
