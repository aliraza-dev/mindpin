import { distanceMeters, isValidCoordinates } from './geo';

describe('geo helpers', () => {
  it('accepts coordinates in range and rejects the rest', () => {
    expect(isValidCoordinates({ lat: 31.5204, lng: 74.3587 })).toBe(true);
    expect(isValidCoordinates({ lat: -90, lng: 180 })).toBe(true);
    expect(isValidCoordinates({ lat: 90.01, lng: 0 })).toBe(false);
    expect(isValidCoordinates({ lat: 0, lng: -180.01 })).toBe(false);
    expect(isValidCoordinates({ lat: Number.NaN, lng: 0 })).toBe(false);
  });

  it('measures zero distance between the same point', () => {
    const p = { lat: 31.5204, lng: 74.3587 };
    expect(distanceMeters(p, p)).toBe(0);
  });

  it('measures one degree of latitude as about 111.2 km', () => {
    const d = distanceMeters({ lat: 31, lng: 74 }, { lat: 32, lng: 74 });
    expect(d).toBeGreaterThan(111_000);
    expect(d).toBeLessThan(111_400);
  });

  it('measures a short walk to within a metre', () => {
    // 0.0009 degrees of latitude is about 100.1 m.
    const d = distanceMeters({ lat: 31.5204, lng: 74.3587 }, { lat: 31.5213, lng: 74.3587 });
    expect(d).toBeGreaterThan(99.5);
    expect(d).toBeLessThan(100.5);
  });
});
