// Loads a screen's data from the on-device database, again each time the screen comes into view,
// so it is fresh after returning from another screen.
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getDatabase } from '../db/database';
import type { SqlDatabase } from '../db/types';
import { logEvent } from './log';

export type QueryState<T> =
  { status: 'loading' } | { status: 'ready'; data: T } | { status: 'error' };

// `key` says what the query depends on (for example the person's id): the data is loaded again
// when it changes. `screen` is a short code for the log, such as "person". Nothing about the
// data is logged.
export function useDbQuery<T>(load: (db: SqlDatabase) => Promise<T>, key: string, screen: string) {
  const [state, setState] = useState<QueryState<T>>({ status: 'loading' });
  const [version, setVersion] = useState(0);

  // The loader is a new function on every render; keep the latest without re-running for it.
  const latestLoad = useRef(load);
  useEffect(() => {
    latestLoad.current = load;
  });

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getDatabase()
        .then((db) => latestLoad.current(db))
        .then(
          (data) => {
            if (active) setState({ status: 'ready', data });
          },
          () => {
            logEvent('screen_load_failed', { screen });
            if (active) setState({ status: 'error' });
          },
        );
      return () => {
        active = false;
      };
      // `version` is listed so that reload() loads again.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, version, screen]),
  );

  return { state, reload: () => setVersion((v) => v + 1) };
}
