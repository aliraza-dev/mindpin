import { Pressable } from 'react-native';

import { Icon, type IconName } from './Icon';

type Props = {
  // A round button drawn whole in its icon file, at least 44 px across.
  icon: Extract<IconName, 'back' | 'edit' | 'more'>;
  onPress: () => void;
  accessibilityLabel: string;
};

export function IconButton({ icon, onPress, accessibilityLabel }: Props) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress}>
      <Icon name={icon} />
    </Pressable>
  );
}
