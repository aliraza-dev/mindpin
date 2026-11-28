// T090: "Did you visit?" when the app opens after Navigate (R5.2).
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { getDatabase } from '../../db/database';
import { createPlace } from '../../db/memories';
import { freshDb } from '../../db/testing/freshDb';
import { listVisits } from '../../db/visits';
import { initI18n } from '../../i18n';
import { DidYouVisit } from './DidYouVisit';
import { rememberNavigate } from './navigateConfirm';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../../db/database', () => ({ getDatabase: jest.fn() }));

const HOUR = 60 * 60 * 1000;

async function seeded(navigatedAgo: number | null) {
  const db = await freshDb();
  const place = await createPlace(db, { title: 'Shop', address: 'Main Road' });
  const at = navigatedAgo === null ? null : Date.now() - navigatedAgo;
  if (at !== null) await rememberNavigate(db, place.id, at);
  (getDatabase as jest.Mock).mockResolvedValue(db);
  return { db, place, at };
}

describe('DidYouVisit', () => {
  beforeAll(async () => {
    await initI18n('en');
  });

  it('asks about the place and records the visit at the time of Navigate on Yes', async () => {
    const { db, place, at } = await seeded(HOUR);
    await render(<DidYouVisit />);
    expect(await screen.findByText('Did you visit Shop?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Yes, record a visit to Shop' }));
    await waitFor(() => expect(screen.queryByText('Did you visit Shop?')).toBeNull());
    expect(await listVisits(db, place.id)).toMatchObject([
      { visitedAt: at, source: 'navigate_confirm' },
    ]);
  });

  it('records nothing on No and does not ask again', async () => {
    const { db, place } = await seeded(HOUR);
    const view = await render(<DidYouVisit />);
    await fireEvent.press(await screen.findByRole('button', { name: 'No, I did not visit Shop' }));
    await waitFor(() => expect(screen.queryByText('Did you visit Shop?')).toBeNull());
    expect(await listVisits(db, place.id)).toHaveLength(0);
    await view.unmount();

    await render(<DidYouVisit />);
    await waitFor(() => expect(getDatabase).toHaveBeenCalled());
    expect(screen.queryByText('Did you visit Shop?')).toBeNull();
  });

  it('does not ask straight after Navigate, or when Navigate was never tapped', async () => {
    await seeded(60 * 1000);
    const soon = await render(<DidYouVisit />);
    await waitFor(() => expect(getDatabase).toHaveBeenCalled());
    expect(screen.queryByText(/Did you visit/)).toBeNull();
    await soon.unmount();

    await seeded(null);
    await render(<DidYouVisit />);
    expect(screen.queryByText(/Did you visit/)).toBeNull();
  });
});
