import { logEvent, sanitizeFields } from './log';

describe('privacy-safe logger (constitution II)', () => {
  it('keeps allow-listed fields with safe values', () => {
    expect(sanitizeFields({ screen: 'save_sheet', count: 3, ok: true })).toEqual({
      screen: 'save_sheet',
      count: 3,
      ok: true,
    });
  });

  it('drops fields that are not on the allow-list', () => {
    expect(
      sanitizeFields({ address: 'Main Boulevard', lat: 31.5, contactName: 'Ahmed', count: 1 }),
    ).toEqual({ count: 1 });
  });

  it('drops allow-listed string values that look like free text', () => {
    expect(sanitizeFields({ screen: 'House 22, Street 14', status: 'Ahmed Raza' })).toEqual({});
  });

  it('rejects event names that are not snake_case identifiers', () => {
    const spy = jest.spyOn(console, 'info').mockImplementation(() => {});
    logEvent('Saved place at Main Boulevard');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('prints only the event name and sanitized fields in development', () => {
    const spy = jest.spyOn(console, 'info').mockImplementation(() => {});
    logEvent('place_saved', { durationMs: 840, address: 'secret' });
    expect(spy).toHaveBeenCalledWith('[mindpin]', 'place_saved', { durationMs: 840 });
    spy.mockRestore();
  });
});
