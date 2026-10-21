import { expect, it } from 'vitest';
import { EXTENDED_FORBIDDEN } from '../privacy/scan.mjs';

it('detects Anthropic key shapes and server key assignments without displaying values', () => {
  const synthetic = ['sk', 'ant', 'api03', 'x'.repeat(32)].join('-');
  expect(EXTENDED_FORBIDDEN.credentialValue.test(synthetic)).toBe(true);
  expect(EXTENDED_FORBIDDEN.assignedSecretLiteral.test(`ANTHROPIC_API_KEY = "${synthetic}"`)).toBe(true);
  expect(EXTENDED_FORBIDDEN.assignedSecretLiteral.test('ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY')).toBe(false);
});
