import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractPhoneNumbers, toWhatsappDigits } from '../src/phoneUtils.js';

test('extrae y normaliza números venezolanos en distintos formatos', () => {
  const text = `
    Juan: 0412-123.45.67
    Maria: +58 414 765 4321
    Pedro: 04241112233
    duplicado: 0412 123 4567
  `;
  const { valid, invalid } = extractPhoneNumbers(text, 'VE');

  assert.equal(valid.length, 3, 'debe deduplicar el número repetido');
  assert.ok(valid.every((n) => n.startsWith('+58')));
  assert.equal(invalid.length, 0);
});

test('descarta fragmentos que no son números válidos', () => {
  const text = 'referencia 12345 y fecha 2024-01-01 no son teléfonos, pero 04121234567 sí';
  const { valid, invalid } = extractPhoneNumbers(text, 'VE');

  assert.equal(valid.length, 1);
  assert.equal(valid[0], '+584121234567');
  assert.ok(invalid.length >= 1);
});

test('toWhatsappDigits quita el signo +', () => {
  assert.equal(toWhatsappDigits('+584121234567'), '584121234567');
});
