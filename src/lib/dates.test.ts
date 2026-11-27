import { isSameDay, shortDate } from './dates';

// Local time, so the tests do not depend on the machine's time zone.
const at = (year: number, month: number, day: number, hour = 12) =>
  new Date(year, month - 1, day, hour).getTime();

describe('date helpers', () => {
  it('knows when two moments are on the same calendar day', () => {
    expect(isSameDay(at(2026, 11, 26, 1), at(2026, 11, 26, 23))).toBe(true);
    expect(isSameDay(at(2026, 11, 26, 23), at(2026, 11, 27, 1))).toBe(false);
  });

  it('shows a date in the current year as month and day', () => {
    expect(shortDate(at(2026, 9, 14), at(2026, 11, 26), 'en')).toBe('Sep 14');
  });

  it('adds the year for a date in another year', () => {
    expect(shortDate(at(2025, 2, 20), at(2026, 11, 26), 'en')).toBe('Feb 20, 2025');
  });
});
