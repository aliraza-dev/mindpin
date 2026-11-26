// T051: handing off to the maps app, the dialer, WhatsApp, and SMS (R3.10, R4.5).
import { parseShared } from '../../parser/parseShared';
import { callPerson, messagePerson, normalizePhone, openInMaps } from './externalLinks';

const HOME = { title: 'Home (back gate)', lat: 31.5204, lng: 74.3587, address: 'House 22, Sample Street' };
const WEB = 'https://www.google.com/maps/search/?api=1&query=31.5204%2C74.3587';

// An opener that only succeeds for links starting with one of the given prefixes.
function opener(...working: string[]) {
  return jest.fn(async (url: string) => {
    if (!working.some((prefix) => url.startsWith(prefix))) throw new Error('No app can open this');
  });
}

describe('openInMaps (R4.5)', () => {
  it("opens the phone's maps app on Android with the pin and its label", async () => {
    const open = opener('geo:');
    expect(await openInMaps(HOME, { open, platform: 'android' })).toBe(true);
    expect(open).toHaveBeenCalledTimes(1);
    const url = open.mock.calls[0][0];
    expect(url).toBe('geo:0,0?q=31.5204,74.3587(Home%20back%20gate)');
    expect(parseShared(url)).toMatchObject({ kind: 'coordinates', lat: 31.5204, lng: 74.3587 });
  });

  it('opens Apple Maps on iOS with the pin and its label', async () => {
    const open = opener('https://maps.apple.com/');
    expect(await openInMaps(HOME, { open, platform: 'ios' })).toBe(true);
    const url = open.mock.calls[0][0];
    expect(url).toBe('https://maps.apple.com/?ll=31.5204,74.3587&q=Home%20(back%20gate)');
    expect(parseShared(url)).toMatchObject({ kind: 'coordinates', lat: 31.5204, lng: 74.3587 });
  });

  it('falls back to a Google Maps web link when no maps app opens', async () => {
    const open = opener('https://www.google.com/');
    expect(await openInMaps(HOME, { open, platform: 'android' })).toBe(true);
    expect(open.mock.calls.map((call) => call[0])).toEqual([
      'geo:0,0?q=31.5204,74.3587(Home%20back%20gate)',
      WEB,
    ]);
  });

  it('uses the address when the place has no coordinates', async () => {
    const place = { title: 'Shop', lat: null, lng: null, address: 'Corner Shop, Sample Town' };
    const android = opener('geo:');
    await openInMaps(place, { open: android, platform: 'android' });
    expect(android.mock.calls[0][0]).toBe('geo:0,0?q=Corner%20Shop%2C%20Sample%20Town');

    const ios = opener('https://maps.apple.com/');
    await openInMaps(place, { open: ios, platform: 'ios' });
    expect(ios.mock.calls[0][0]).toBe('https://maps.apple.com/?q=Corner%20Shop%2C%20Sample%20Town');
  });

  it('reports failure when nothing can be opened or there is nowhere to go', async () => {
    expect(await openInMaps(HOME, { open: opener(), platform: 'android' })).toBe(false);
    const nowhere = opener('geo:');
    const place = { title: 'Unknown', lat: null, lng: null, address: null };
    expect(await openInMaps(place, { open: nowhere, platform: 'android' })).toBe(false);
    expect(nowhere).not.toHaveBeenCalled();
  });
});

describe('normalizePhone', () => {
  it('keeps the digits and a leading plus', () => {
    expect(normalizePhone(' +1 (000) 000-0000 ')).toBe('+10000000000');
    expect(normalizePhone('0300 0000000')).toBe('03000000000');
    expect(normalizePhone('00 1 000 0000000')).toBe('+10000000000');
  });

  it('rejects text that is not a phone number', () => {
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone('call me')).toBeNull();
    expect(normalizePhone(null)).toBeNull();
  });
});

describe('callPerson (R3.10)', () => {
  it('opens the dialer with the number', async () => {
    const open = opener('tel:');
    expect(await callPerson('+1 000 000-0000', open)).toBe(true);
    expect(open).toHaveBeenCalledWith('tel:+10000000000');
  });

  it('does nothing without a usable number, and reports a dialer that will not open', async () => {
    const open = opener();
    expect(await callPerson('  ', open)).toBe(false);
    expect(open).not.toHaveBeenCalled();
    expect(await callPerson('+10000000000', open)).toBe(false);
  });
});

describe('messagePerson (R3.10)', () => {
  it('opens WhatsApp when it is installed', async () => {
    const open = opener('whatsapp:', 'sms:');
    expect(await messagePerson('+1 000 000-0000', open)).toBe('whatsapp');
    expect(open.mock.calls.map((call) => call[0])).toEqual(['whatsapp://send?phone=10000000000']);
  });

  it('opens SMS when WhatsApp is not installed', async () => {
    const open = opener('sms:');
    expect(await messagePerson('+10000000000', open)).toBe('sms');
    expect(open.mock.calls.map((call) => call[0])).toEqual([
      'whatsapp://send?phone=10000000000',
      'sms:+10000000000',
    ]);
  });

  it('goes straight to SMS for a number without a country code', async () => {
    const open = opener('whatsapp:', 'sms:');
    expect(await messagePerson('0300 0000000', open)).toBe('sms');
    expect(open.mock.calls.map((call) => call[0])).toEqual(['sms:03000000000']);
  });

  it('reports when nothing can be opened or there is no number', async () => {
    expect(await messagePerson('+10000000000', opener())).toBeNull();
    const open = opener('sms:');
    expect(await messagePerson(null, open)).toBeNull();
    expect(open).not.toHaveBeenCalled();
  });
});
