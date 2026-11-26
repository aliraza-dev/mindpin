// One group per row of the parser table in docs/spec/design.md (R1.4, R2.1, R2.4).
import { parseShared } from './parseShared';

function expectCoordinates(text: string, lat: number, lng: number, source: string) {
  expect(parseShared(text)).toEqual({ kind: 'coordinates', lat, lng, source, snapshot: false });
}

describe('parseShared', () => {
  describe('Google Maps full links', () => {
    it('reads @lat,lng from the path', () => {
      expectCoordinates(
        'https://www.google.com/maps/place/Lahore/@31.5204,74.3587,15z',
        31.5204,
        74.3587,
        'google_maps',
      );
    });

    it('prefers the exact place pin (!3d!4d) over the map centre (@)', () => {
      expectCoordinates(
        'https://www.google.com/maps/place/Shop/@31.5,74.3,17z/data=!3m1!4b1!4m5!3m4!1s0x0:0x0!8m2!3d31.5204!4d74.3587',
        31.5204,
        74.3587,
        'google_maps',
      );
    });

    it('reads ?q=lat,lng', () => {
      expectCoordinates('https://maps.google.com/?q=31.5204,74.3587', 31.5204, 74.3587, 'google_maps');
    });

    it('reads an encoded query=lat%2Clng', () => {
      expectCoordinates(
        'https://www.google.com/maps/search/?api=1&query=31.5204%2C74.3587',
        31.5204,
        74.3587,
        'google_maps',
      );
    });

    it('handles negative coordinates', () => {
      expectCoordinates('https://maps.google.com/?q=-33.8688,151.2093', -33.8688, 151.2093, 'google_maps');
    });

    it('accepts country domains such as google.com.pk', () => {
      expectCoordinates('https://www.google.com.pk/maps/@31.5,74.35,15z', 31.5, 74.35, 'google_maps');
    });

    it('reads coordinates written in the /place/ or /search/ path', () => {
      expectCoordinates(
        'https://www.google.com/maps/place/31.5204,74.3587/data=!4m2!3m1',
        31.5204,
        74.3587,
        'google_maps',
      );
      expectCoordinates(
        'https://www.google.com/maps/search/31.5204,+74.3587?entry=tts',
        31.5204,
        74.3587,
        'google_maps',
      );
    });

    it('returns a place named in the path as text when the link has no coordinates', () => {
      expect(
        parseShared(
          'https://www.google.com/maps/place/Corner+Shop,+Sample+Road,+Sample+Town/data=!4m2!3m1!1s0x1:0x2?entry=gps',
        ),
      ).toEqual({ kind: 'text', text: 'Corner Shop, Sample Road, Sample Town' });
    });

    it('prefers coordinates over the place name in the same link', () => {
      expectCoordinates(
        'https://www.google.com/maps/place/Corner+Shop/@31.5204,74.3587,17z',
        31.5204,
        74.3587,
        'google_maps',
      );
    });

    it('returns a place name in q as text for address lookup (R2.4)', () => {
      expect(parseShared('https://maps.google.com/?q=Main+Boulevard+Gulberg')).toEqual({
        kind: 'text',
        text: 'Main Boulevard Gulberg',
      });
    });
  });

  describe('Google Maps short links', () => {
    it('marks maps.app.goo.gl links as needing resolution', () => {
      expect(parseShared('https://maps.app.goo.gl/AbCdEf123')).toEqual({
        kind: 'needs_resolve',
        url: 'https://maps.app.goo.gl/AbCdEf123',
      });
    });

    it('marks goo.gl/maps links as needing resolution', () => {
      expect(parseShared('https://goo.gl/maps/AbCdEf')).toEqual({
        kind: 'needs_resolve',
        url: 'https://goo.gl/maps/AbCdEf',
      });
    });

    it('drops trailing punctuation from the link', () => {
      expect(parseShared('Here: https://maps.app.goo.gl/AbC.')).toEqual({
        kind: 'needs_resolve',
        url: 'https://maps.app.goo.gl/AbC',
      });
    });
  });

  describe('Apple Maps links', () => {
    it('reads the ll parameter', () => {
      expectCoordinates(
        'https://maps.apple.com/?ll=31.5204,74.3587&q=Home',
        31.5204,
        74.3587,
        'apple_maps',
      );
    });

    it('reads the coordinate parameter', () => {
      expectCoordinates(
        'https://maps.apple.com/place?coordinate=31.5204,74.3587',
        31.5204,
        74.3587,
        'apple_maps',
      );
    });

    it('returns an address parameter as text for lookup (R2.4)', () => {
      expect(parseShared('https://maps.apple.com/?address=Main%20Boulevard,%20Lahore')).toEqual({
        kind: 'text',
        text: 'Main Boulevard, Lahore',
      });
    });
  });

  describe('WhatsApp location shares', () => {
    it('reads the maps link inside the shared text', () => {
      expectCoordinates(
        "Ahmed Raza's shop\nMain Boulevard, Gulberg III\nhttps://maps.google.com/maps?q=31.5204%2C74.3587&z=17&hl=en",
        31.5204,
        74.3587,
        'google_maps',
      );
    });

    it('finds a short link inside a chat message', () => {
      expect(
        parseShared("Ahmed: here's the new shop location https://maps.app.goo.gl/xyz come by Friday"),
      ).toEqual({ kind: 'needs_resolve', url: 'https://maps.app.goo.gl/xyz' });
    });
  });

  describe('geo: links', () => {
    it('reads geo:lat,lng', () => {
      expectCoordinates('geo:31.5204,74.3587', 31.5204, 74.3587, 'geo_uri');
    });

    it('ignores parameters after the coordinates', () => {
      expectCoordinates('geo:31.5204,74.3587?z=17', 31.5204, 74.3587, 'geo_uri');
    });

    it('reads coordinates from q when the main point is 0,0', () => {
      expectCoordinates('geo:0,0?q=31.5204,74.3587(Shop)', 31.5204, 74.3587, 'geo_uri');
    });

    it('returns a q address as text for lookup (R2.4)', () => {
      expect(parseShared('geo:0,0?q=Main+Boulevard')).toEqual({ kind: 'text', text: 'Main Boulevard' });
    });
  });

  describe('plain coordinates', () => {
    it('reads "lat, lng"', () => {
      expectCoordinates('31.5204, 74.3587', 31.5204, 74.3587, 'plain_coordinates');
    });

    it('reads "lat,lng" without a space', () => {
      expectCoordinates('31.5204,74.3587', 31.5204, 74.3587, 'plain_coordinates');
    });

    it('reads degrees with hemisphere letters', () => {
      expectCoordinates('33.8688° S, 151.2093° E', -33.8688, 151.2093, 'plain_coordinates');
    });

    it('rejects a latitude out of range', () => {
      expect(parseShared('95.1234, 74.3587').kind).not.toBe('coordinates');
    });

    it('rejects a longitude out of range', () => {
      expect(parseShared('31.5204, 181.0001').kind).not.toBe('coordinates');
    });

    it('does not mistake whole numbers in text for coordinates', () => {
      expect(parseShared('Floor 2, 3 rooms').kind).not.toBe('coordinates');
    });

    it('does not read version-like numbers as coordinates', () => {
      expect(parseShared('Update to 1.234.567 today').kind).not.toBe('coordinates');
    });

    it('does not flip the sign when the next word starts with W', () => {
      expectCoordinates('31.5204, 74.3587 west gate', 31.5204, 74.3587, 'plain_coordinates');
    });

    it('does not join two numbers that have words between them', () => {
      expect(parseShared('31.5204 south side, 74.3587').kind).toBe('text');
    });

    it('reads coordinates separated by a space', () => {
      expectCoordinates('31.5204 74.3587', 31.5204, 74.3587, 'plain_coordinates');
    });
  });

  describe('address only (R2.4)', () => {
    it('returns free text for address lookup', () => {
      expect(parseShared('  House 22, Street 14, DHA Phase 5, Lahore  ')).toEqual({
        kind: 'text',
        text: 'House 22, Street 14, DHA Phase 5, Lahore',
      });
    });

    it('keeps the words around a link that is not a map', () => {
      expect(parseShared('check this https://www.youtube.com/watch?v=abc')).toEqual({
        kind: 'text',
        text: 'check this',
      });
    });
  });

  describe('no location found (R1.4)', () => {
    it('reports empty text as not found', () => {
      expect(parseShared('   ')).toEqual({ kind: 'not_found' });
    });

    it('reports a lone link that is not a map as not found', () => {
      expect(parseShared('https://www.youtube.com/watch?v=abc')).toEqual({ kind: 'not_found' });
    });
  });

  describe('precedence and purity', () => {
    it('prefers coordinates from a map link over address text around it', () => {
      expectCoordinates(
        'House 22, DHA https://maps.google.com/?q=31.5204,74.3587',
        31.5204,
        74.3587,
        'google_maps',
      );
    });

    it('prefers a short map link over decimal numbers in the message', () => {
      expect(parseShared('Paid 31.50, 74.25 https://maps.app.goo.gl/xyz')).toEqual({
        kind: 'needs_resolve',
        url: 'https://maps.app.goo.gl/xyz',
      });
    });

    it('ignores look-alike hosts and out-of-range link coordinates', () => {
      expect(parseShared('https://google.com.evil.example/maps?q=31.5204,74.3587').kind).not.toBe(
        'coordinates',
      );
      expect(parseShared('https://maps.google.com/?q=131.5204,74.3587').kind).not.toBe(
        'coordinates',
      );
    });

    it('survives a malformed percent-encoding', () => {
      expect(parseShared('https://maps.google.com/?q=%E0%A4%A')).toEqual({
        kind: 'text',
        text: '%E0%A4%A',
      });
    });

    it('returns synchronously, with no network work', () => {
      const result = parseShared('31.5204, 74.3587');
      expect(result).not.toBeInstanceOf(Promise);
    });
  });
});
