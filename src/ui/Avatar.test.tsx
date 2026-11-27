import { initialsOf, tintFor } from './Avatar';
import { touchSlop } from './tokens';

describe('avatar helpers', () => {
  it('takes up to two initials', () => {
    expect(initialsOf('ahmed raza')).toBe('AR');
    expect(initialsOf('  Sara  ')).toBe('S');
    expect(initialsOf('Ahmed Bhai (Plumber)')).toBe('AB');
    expect(initialsOf('')).toBe('');
  });

  it('always gives the same person the same tint', () => {
    expect(tintFor('person-1')).toBe(tintFor('person-1'));
    expect(tintFor('')).toBeDefined();
  });
});

describe('touchSlop', () => {
  it('extends small controls to a 44 px touch area and leaves large ones alone', () => {
    expect(36 + touchSlop(36).top + touchSlop(36).bottom).toBeGreaterThanOrEqual(44);
    expect(18 + touchSlop(18).top + touchSlop(18).bottom).toBeGreaterThanOrEqual(44);
    expect(touchSlop(44)).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
  });
});
