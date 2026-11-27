import { isId, newId } from './id';

describe('ids', () => {
  it('accepts the ids the app creates', () => {
    expect(isId(newId())).toBe(true);
    expect(isId('3F2504E0-4F89-41D3-9A0C-0305E82C3301')).toBe(true);
  });

  it('rejects anything else that could arrive in a screen address', () => {
    for (const value of [
      '',
      'new',
      '123',
      '../../etc/passwd',
      "1' OR '1'='1",
      '3f2504e0-4f89-41d3-9a0c-0305e82c3301 ',
      '3f2504e04f8941d39a0c0305e82c3301',
      ['3f2504e0-4f89-41d3-9a0c-0305e82c3301'],
      undefined,
      null,
      42,
    ]) {
      expect(isId(value)).toBe(false);
    }
  });
});
