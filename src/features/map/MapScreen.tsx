// The map of every saved pin (R6.3). Google Maps on Android, Apple Maps on iOS. The map is
// only drawn when the build has a maps key and the phone is online; otherwise the screen says
// why. MindPin never shows or asks for the user's own position (privacy rules).
// There is no Figma frame for this screen; it follows the other frames (design.md).
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { listPlaceSummaries, type PlaceSummary } from '../../db/placeSummaries';
import { MAPS_AVAILABLE } from '../../lib/buildFlags';
import { isValidCoordinates } from '../../lib/geo';
import { useDbQuery } from '../../lib/useDbQuery';
import { useOnline } from '../../lib/useOnline';
import { tokens } from '../../ui/tokens';

export type Pin = { id: string; label: string; lat: number; lng: number };

// The saved places that have a location.
export function pinsOf(places: PlaceSummary[]): Pin[] {
  return places.flatMap(({ place, personName }) =>
    place.lat !== null && place.lng !== null && isValidCoordinates({ lat: place.lat, lng: place.lng })
      ? [
          {
            id: place.id,
            label: personName ? `${place.title} · ${personName}` : place.title,
            lat: place.lat,
            lng: place.lng,
          },
        ]
      : [],
  );
}

// The area that holds every pin, with a margin, and never closer than a few streets.
export function regionFor(pins: Pin[]) {
  const lats = pins.map((pin) => pin.lat);
  const lngs = pins.map((pin) => pin.lng);
  const south = Math.min(...lats);
  const north = Math.max(...lats);
  const west = Math.min(...lngs);
  const east = Math.max(...lngs);
  return {
    latitude: (south + north) / 2,
    longitude: (west + east) / 2,
    latitudeDelta: Math.min(170, Math.max(0.01, (north - south) * 1.4)),
    longitudeDelta: Math.min(350, Math.max(0.01, (east - west) * 1.4)),
  };
}

export function MapScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const online = useOnline();
  const { state } = useDbQuery(async (db) => pinsOf(await listPlaceSummaries(db)), 'map', 'map');

  const message = (text: string) => (
    <View style={[styles.screen, { paddingTop: insets.top + 11 }]}>
      <Text accessibilityRole="header" style={styles.title}>
        {t('map:title')}
      </Text>
      <Text style={styles.message}>{text}</Text>
    </View>
  );

  if (state.status === 'loading') return <View style={styles.screen} />;
  if (state.status === 'error') return message(t('map:loadFailed'));
  const pins = state.data;
  if (pins.length === 0) return message(t('map:empty'));
  if (!MAPS_AVAILABLE) return message(t('map:unavailable'));
  if (!online) return message(t('map:offline'));

  return (
    <View style={styles.map}>
      <MapView
        testID="all-pins-map"
        style={StyleSheet.absoluteFill}
        initialRegion={regionFor(pins)}
        mapPadding={{ top: insets.top + 56, right: 0, bottom: 0, left: 0 }}
        toolbarEnabled={false}
        showsUserLocation={false}
        showsMyLocationButton={false}
      >
        {pins.map((pin) => (
          <Marker
            key={pin.id}
            coordinate={{ latitude: pin.lat, longitude: pin.lng }}
            pinColor={tokens.color.accent}
            title={pin.label}
            accessibilityLabel={t('map:pinA11y', { label: pin.label })}
            tracksViewChanges={false}
            // The label opens first; tapping the label opens the place.
            onCalloutPress={() => router.push(`/place/${pin.id}`)}
          />
        ))}
      </MapView>
      <View style={[styles.badge, { top: insets.top + 11 }]}>
        <Text accessibilityRole="header" style={styles.badgeText}>
          {t('map:count', { count: pins.length })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: tokens.color.background,
    paddingHorizontal: tokens.screenPadding,
  },
  title: { fontFamily: tokens.font.headingBold, fontSize: 28, color: tokens.color.text },
  message: {
    marginTop: 18,
    fontFamily: tokens.font.body,
    fontSize: 14,
    lineHeight: 20,
    color: tokens.color.mutedText,
  },
  map: { flex: 1, backgroundColor: tokens.color.mapPlaceholder },
  badge: {
    position: 'absolute',
    start: tokens.screenPadding,
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: tokens.radius.chip,
    borderWidth: 1,
    borderColor: tokens.color.controlBorder,
    backgroundColor: tokens.color.surface,
  },
  badgeText: { fontFamily: tokens.font.bodyBold, fontSize: 14, color: tokens.color.text },
});
