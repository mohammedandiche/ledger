import { Pressable, Text } from 'react-native';
import { useR } from '@/hooks/useR';
import { useFormStyles } from './formStyles';

interface Props {
  isSplit: boolean;
  isBalanced: boolean;
  canSave: boolean;
  saving: boolean;
  remainingCents: number;
  accountId: string | null;
  onSave: () => void;
  onAddChild: (prefillCents: number) => void;
  label?: string;
}

export function SaveOrSplitButton({
  isSplit,
  isBalanced,
  canSave,
  saving,
  remainingCents,
  accountId,
  onSave,
  onAddChild,
  label = 'save transaction',
}: Props) {
  const { r } = useR();
  const fs = useFormStyles();

  if (isSplit && !isBalanced) {
    return (
      <Pressable
        style={[fs.saveBtn, !accountId && fs.saveBtnDisabled]}
        onPress={() => onAddChild(remainingCents)}
        disabled={!accountId}
      >
        <Text style={[fs.saveBtnText, { fontSize: r(13, 15) }]}>
          add split ({remainingCents > 0 ? '+' : ''}
          {(remainingCents / 100).toFixed(2)})
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      style={[fs.saveBtn, (!canSave || saving) && fs.saveBtnDisabled]}
      onPress={onSave}
      disabled={!canSave || saving}
    >
      <Text style={[fs.saveBtnText, { fontSize: r(13, 15) }]}>{saving ? 'saving…' : label}</Text>
    </Pressable>
  );
}
