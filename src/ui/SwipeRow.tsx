// A list row that slides aside to show its actions (R10.11, and the Home lists). The actions
// are real buttons underneath, so a screen reader reaches them without the gesture.
import { useState } from 'react';
import { Animated, I18nManager, PanResponder, Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from './Icon';
import { themed, useColors } from './theme';

export type SwipeAction = {
  key: string;
  // The action is shown as an icon; this says what it does, already translated.
  icon: IconName;
  accessibilityLabel: string;
  // Drawn in the warning colors: for deleting.
  danger?: boolean;
  onPress: () => void;
};

type Props = { actions: SwipeAction[]; children: React.ReactNode };

const ACTION_WIDTH = 64;

export function SwipeRow({ actions, children }: Props) {
  const styles = useStyles();
  const colors = useColors();
  const openAt = ACTION_WIDTH * actions.length;
  // In a right-to-left layout the actions sit at the left, so the row slides the other way.
  const side = I18nManager.isRTL ? 1 : -1;

  // Made once per row: where the row is, and the gesture that moves it.
  const [{ slide, settle, responder }] = useState(() => {
    const position = new Animated.Value(0);
    let open = false;
    const rest = () => (open ? side * openAt : 0);
    const moveTo = (toOpen: boolean) => {
      open = toOpen;
      Animated.spring(position, { toValue: rest(), useNativeDriver: true, bounciness: 0 }).start();
    };
    const pan = PanResponder.create({
      // Only a sideways drag is taken, so the list still scrolls and taps still open the row.
      onMoveShouldSetPanResponder: (_event, gesture) =>
        Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
      onPanResponderMove: (_event, gesture) => {
        const to = rest() + gesture.dx;
        position.setValue(
          side < 0 ? Math.max(-openAt, Math.min(0, to)) : Math.min(openAt, Math.max(0, to)),
        );
      },
      onPanResponderRelease: (_event, gesture) => {
        const to = rest() + gesture.dx;
        moveTo(Math.abs(to) > openAt / 2 && Math.sign(to) === side);
      },
      onPanResponderTerminate: () => moveTo(open),
    });
    return { slide: position, settle: moveTo, responder: pan };
  });

  return (
    <View>
      <View style={styles.actions}>
        {actions.map((action) => (
          <Pressable
            key={action.key}
            accessibilityRole="button"
            accessibilityLabel={action.accessibilityLabel}
            onPress={() => {
              settle(false);
              action.onPress();
            }}
            style={[styles.action, action.danger && styles.actionDanger]}
          >
            <Icon
              name={action.icon}
              tintColor={action.danger ? colors.amberText : colors.tealText}
            />
          </Pressable>
        ))}
      </View>
      <Animated.View
        style={[styles.slider, { transform: [{ translateX: slide }] }]}
        {...responder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const useStyles = themed((colors) =>
  StyleSheet.create({
    slider: { backgroundColor: colors.surface },
    actions: { ...StyleSheet.absoluteFill, flexDirection: 'row', justifyContent: 'flex-end' },
    action: {
      width: ACTION_WIDTH,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.tealSoft,
    },
    actionDanger: { backgroundColor: colors.amberTint },
  }),
);
