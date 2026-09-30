import { test } from 'node:test';
import assert from 'node:assert/strict';
import { distributeLeads } from '../src/distribute.js';

test('reparte exacto cuando es divisible', () => {
  const leads = Array.from({ length: 9 }, (_, i) => `n${i}`);
  const parts = distributeLeads(leads, 3);
  assert.deepEqual(parts.map((p) => p.length), [3, 3, 3]);
});

test('distribuye el residuo sumando uno extra a las primeras partes', () => {
  const leads = Array.from({ length: 10 }, (_, i) => `n${i}`);
  const parts = distributeLeads(leads, 3);
  assert.deepEqual(parts.map((p) => p.length), [4, 3, 3]);

  const flat = parts.flat();
  assert.deepEqual(flat, leads, 'no debe perder ni duplicar leads');
});

test('lanza error si n no es entero positivo', () => {
  assert.throws(() => distributeLeads(['a'], 0));
  assert.throws(() => distributeLeads(['a'], -1));
  assert.throws(() => distributeLeads(['a'], 1.5));
});
