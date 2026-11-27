// The map at the top of the place screen: a still picture of the area with one pin.
// Google Maps on Android, Apple Maps on iOS. It must only be shown when the build has a maps
// key (MAPS_AVAILABLE) and the phone is online; the place screen decides that.
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { tokens } from '../../ui/tokens';

type Props = {
  lat: number;
  lng: number;
  // How much of the bottom of the map is covered by the sheet, so the map maker's logo, which
  // must stay visible, is moved above it.
  bottomInset: number;
};

// About 500 m from top to bottom: close enough to recognise the street.
const SPAN = 0.005;

export function PlaceMap({ lat, lng, bottomInset }: Props) {
  const coordinate = { latitude: lat, longitude: lng };
  return (
    // A picture, not a control: touches pass through to the screen, and Navigate opens the
    // real maps app (R4.5). The address is in text right below, so screen readers skip it.
    <View
      testID="place-map-frame"
      style={[StyleSheet.absoluteFill, styles.frame]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <MapView
        testID="place-map"
        style={StyleSheet.absoluteFill}
        region={{ ...coordinate, latitudeDelta: SPAN, longitudeDelta: SPAN }}
        mapPadding={{ top: 0, right: 0, bottom: bottomInset, left: 0 }}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        // MindPin never asks where the user is (privacy rules).
        showsUserLocation={false}
        showsMyLocationButton={false}
      >
        <Marker coordinate={coordinate} pinColor={tokens.color.accent} tracksViewChanges={false} />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { pointerEvents: 'none' },
});
