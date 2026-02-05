import { View, Text, Pressable } from 'react-native';
import { useR } from '@/hooks/useR';
import { useFormStyles } from './formStyles';

interface Props {
  cleared: boolean;
  onChange: (cleared: boolean) => void;
}

export function StatusPills({ cleared, onChange }: Props) {
  const { r } = useR();
  const fs = useFormStyles();

  return (
    <View style={fs.statusPills}>
      <Pressable
        style={[fs.statusPill, !cleared && fs.statusPillOn]}
        onPress={() => onChange(false)}
        hitSlop={4}
      >
        <Text style={[fs.statusPillText, { fontSize: r(11, 13) }, !cleared && fs.statusPillTextOn]}>
          uncleared
        </Text>
      </Pressable>

      <Pressable
        style={[fs.statusPill, cleared && fs.statusPillOnGreen]}
        onPress={() => onChange(true)}
        hitSlop={4}
      >
        <Text
          style={[fs.statusPillText, { fontSize: r(11, 13) }, cleared && fs.statusPillTextOnGreen]}
        >
          cleared
        </Text>
      </Pressable>
    </View>
  );
}
