// T028 (resolver part): following a short link's redirect with a mocked fetch (R2.2).
import { resolveShortLink, type FetchLike } from './resolveShortLink';

const SHORT = 'https://maps.app.goo.gl/AbC123';
const FULL = 'https://www.google.com/maps/place/Corner+Shop/@31.5204,74.3587,17z';

function fetchReturning(...responses: { url: string; status: number }[]) {
  const mock = jest.fn<ReturnType<FetchLike>, Parameters<FetchLike>>();
  for (const response of responses) mock.mockResolvedValueOnce(response);
  return mock;
}

describe('resolveShortLink', () => {
  it('follows the redirect and reads coordinates from the final link', async () => {
    const fetchMock = fetchReturning({ url: FULL, status: 200 });
    expect(await resolveShortLink(SHORT, fetchMock)).toEqual({
      kind: 'coordinates',
      lat: 31.5204,
      lng: 74.3587,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(SHORT);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'HEAD', redirect: 'follow' });
  });

  it('returns the place name when the final link has no coordinates', async () => {
    const fetchMock = fetchReturning({
      url: 'https://www.google.com/maps/place/Corner+Shop,+Sample+Town/data=!4m2',
      status: 200,
    });
    expect(await resolveShortLink(SHORT, fetchMock)).toEqual({
      kind: 'text',
      text: 'Corner Shop, Sample Town',
    });
  });

  it('asks to retry later when the network request fails (R1.5)', async () => {
    const fetchMock = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
    expect(await resolveShortLink(SHORT, fetchMock)).toEqual({ kind: 'retry' });
  });

  it('asks to retry later when the server is busy or failing', async () => {
    expect(await resolveShortLink(SHORT, fetchReturning({ url: SHORT, status: 503 }))).toEqual({
      kind: 'retry',
    });
    expect(await resolveShortLink(SHORT, fetchReturning({ url: SHORT, status: 429 }))).toEqual({
      kind: 'retry',
    });
  });

  it('gives up on a link that no longer exists', async () => {
    const fetchMock = fetchReturning({ url: SHORT, status: 404 });
    expect(await resolveShortLink(SHORT, fetchMock)).toEqual({ kind: 'unresolvable' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('tries a GET when the HEAD request does not lead to a map link', async () => {
    const fetchMock = fetchReturning({ url: SHORT, status: 405 }, { url: FULL, status: 200 });
    expect(await resolveShortLink(SHORT, fetchMock)).toMatchObject({ kind: 'coordinates' });
    expect(fetchMock.mock.calls.map((call) => call[1].method)).toEqual(['HEAD', 'GET']);
  });

  it('gives up when neither request leads to a location', async () => {
    const fetchMock = fetchReturning(
      { url: SHORT, status: 200 },
      { url: 'https://www.example.com/', status: 200 },
    );
    expect(await resolveShortLink(SHORT, fetchMock)).toEqual({ kind: 'unresolvable' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('never requests a link that is not a known short map link', async () => {
    const fetchMock = jest.fn();
    expect(await resolveShortLink('https://example.com/redirect', fetchMock)).toEqual({
      kind: 'unresolvable',
    });
    expect(await resolveShortLink('not a link', fetchMock)).toEqual({ kind: 'unresolvable' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('upgrades http short links to https', async () => {
    const fetchMock = fetchReturning({ url: FULL, status: 200 });
    await resolveShortLink('http://maps.app.goo.gl/AbC123', fetchMock);
    expect(fetchMock.mock.calls[0][0]).toBe(SHORT);
  });

  it('asks to retry later when the request takes too long', async () => {
    jest.useFakeTimers();
    try {
      const fetchMock: FetchLike = (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () => reject(new Error('Aborted')));
        });
      const pending = resolveShortLink(SHORT, fetchMock, 5000);
      await jest.advanceTimersByTimeAsync(5000);
      expect(await pending).toEqual({ kind: 'retry' });
    } finally {
      jest.useRealTimers();
    }
  });
});
