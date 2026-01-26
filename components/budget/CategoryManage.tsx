import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, Modal, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/theme';
import type { ThemeColors } from '@/constants/tokens';
import { Radius, Overlay } from '@/constants/tokens';
import { useR } from '@/hooks/useR';
import type { BudgetGroup, EnvelopeRow } from '@/constants/types';
import { BottomSheetModal, BottomSheetScrollView } from '@/components/shared/BottomSheetModal';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface ActionDef {
  label: string;
  icon: IoniconsName;
  iconColor: string;
  iconBg: string;
  textColor?: string;
  onPress: () => void;
}

function ActionRow({
  action,
  fontSize,
  colors,
}: {
  action: ActionDef;
  fontSize: number;
  colors: ThemeColors;
}) {
  return (
    <Pressable
      style={({ pressed }) => [actionStyles.row, pressed && { backgroundColor: colors.s2 }]}
      onPress={action.onPress}
    >
      <View style={[actionStyles.icon, { backgroundColor: action.iconBg }]}>
        <Ionicons name={action.icon} size={fontSize + 2} color={action.iconColor} />
      </View>
      <Text style={[actionStyles.label, { fontSize, color: action.textColor ?? colors.t0 }]}>
        {action.label}
      </Text>
    </Pressable>
  );
}

const actionStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 4,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: 'NunitoSans_600SemiBold',
    flex: 1,
  },
});

export interface TextPromptModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel?: string;
  onConfirm: (text: string) => void;
  onClose: () => void;
}

export function TextPromptModal({
  visible,
  title,
  subtitle,
  placeholder = '',
  initialValue = '',
  confirmLabel = 'Save',
  onConfirm,
  onClose,
}: TextPromptModalProps) {
  const { r } = useR();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  const handleConfirm = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={s.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={s.card} onStartShouldSetResponder={() => true}>
          <Text style={[s.cardTitle, { fontSize: r(12, 14) }]}>{title}</Text>
          {subtitle && (
            <Text style={[s.cardSubtitle, { fontSize: r(10, 12) }]}>{subtitle}</Text>
          )}
          <TextInput
            style={[s.input, { fontSize: r(14, 16) }]}
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor={colors.t4}
            selectTextOnFocus
            selectionColor={colors.amber}
            autoFocus
            onSubmitEditing={handleConfirm}
            returnKeyType="done"
          />
          <Pressable
            style={({ pressed }) => [s.primaryBtn, pressed && s.pressed]}
            onPress={handleConfirm}
          >
            <Text style={[s.primaryBtnText, { fontSize: r(12, 14) }]}>{confirmLabel}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [s.cancelBtn, pressed && s.pressed]}
            onPress={onClose}
          >
            <Text style={[s.cancelBtnText, { fontSize: r(11, 13) }]}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export interface GroupActionsModalProps {
  visible: boolean;
  group: BudgetGroup | null;
  onRename: (group: BudgetGroup) => void;
  onAddCategory: (group: BudgetGroup) => void;
  onToggleHidden: (group: BudgetGroup) => void;
  onDelete: (group: BudgetGroup) => void;
  onClose: () => void;
}

export function GroupActionsModal({
  visible,
  group,
  onRename,
  onAddCategory,
  onToggleHidden,
  onDelete,
  onClose,
}: GroupActionsModalProps) {
  const { r, hp } = useR();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  if (!group) return null;

  const actions: ActionDef[] = [
    {
      label: 'Add category',
      icon: 'add-circle-outline',
      iconColor: colors.amber,
      iconBg: colors.amberBg,
      onPress: () => { onAddCategory(group); },
    },
    {
      label: 'Rename group',
      icon: 'pencil-outline',
      iconColor: colors.amber,
      iconBg: colors.amberBg,
      onPress: () => { onRename(group); },
    },
    {
      label: group.hidden ? 'Show group' : 'Hide group',
      icon: group.hidden ? 'eye-outline' : 'eye-off-outline',
      iconColor: colors.t2,
      iconBg: colors.s2,
      onPress: () => { onToggleHidden(group); onClose(); },
    },
    {
      label: 'Delete group',
      icon: 'trash-outline',
      iconColor: colors.redL,
      iconBg: colors.redBg,
      textColor: colors.redL,
      onPress: () => { onDelete(group); onClose(); },
    },
  ];

  return (
    <BottomSheetModal
      visible={visible}
      onDismiss={onClose}
      paddingHorizontal={hp}
      statusBarTranslucent
    >
      <Text style={[s.bottomTitle, { fontSize: r(10, 12) }]}>{group.name}</Text>
      <View style={s.actionList}>
        {actions.map((a) => (
          <ActionRow key={a.label} action={a} fontSize={r(13, 15)} colors={colors} />
        ))}
      </View>
      <Pressable style={({ pressed }) => [s.cancelBtn, pressed && s.pressed, { marginTop: 8 }]} onPress={onClose}>
        <Text style={[s.cancelBtnText, { fontSize: r(11, 13) }]}>Cancel</Text>
      </Pressable>
    </BottomSheetModal>
  );
}

export interface CategoryActionsModalProps {
  visible: boolean;
  category: EnvelopeRow | null;
  groupName?: string;
  onRename: (category: EnvelopeRow) => void;
  onToggleHidden: (category: EnvelopeRow) => void;
  onMove: (category: EnvelopeRow) => void;
  onDelete: (category: EnvelopeRow) => void;
  onClose: () => void;
}

export function CategoryActionsModal({
  visible,
  category,
  groupName,
  onRename,
  onToggleHidden,
  onMove,
  onDelete,
  onClose,
}: CategoryActionsModalProps) {
  const { r, hp } = useR();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  if (!category) return null;

  const actions: ActionDef[] = [
    {
      label: 'Rename',
      icon: 'pencil-outline',
      iconColor: colors.amber,
      iconBg: colors.amberBg,
      onPress: () => { onRename(category); },
    },
    {
      label: category.hidden ? 'Show category' : 'Hide category',
      icon: category.hidden ? 'eye-outline' : 'eye-off-outline',
      iconColor: colors.t2,
      iconBg: colors.s2,
      onPress: () => { onToggleHidden(category); onClose(); },
    },
    {
      label: 'Move to group',
      icon: 'arrow-forward-outline',
      iconColor: colors.blue,
      iconBg: colors.blueBg,
      onPress: () => { onMove(category); },
    },
    {
      label: 'Delete category',
      icon: 'trash-outline',
      iconColor: colors.redL,
      iconBg: colors.redBg,
      textColor: colors.redL,
      onPress: () => { onDelete(category); onClose(); },
    },
  ];

  return (
    <BottomSheetModal
      visible={visible}
      onDismiss={onClose}
      paddingHorizontal={hp}
      statusBarTranslucent
    >
      <Text style={[s.bottomTitle, { fontSize: r(10, 12) }]}>
        {category.name}
        {groupName ? ` · ${groupName}` : ''}
      </Text>
      <View style={s.actionList}>
        {actions.map((a) => (
          <ActionRow key={a.label} action={a} fontSize={r(13, 15)} colors={colors} />
        ))}
      </View>
      <Pressable style={({ pressed }) => [s.cancelBtn, pressed && s.pressed, { marginTop: 8 }]} onPress={onClose}>
        <Text style={[s.cancelBtnText, { fontSize: r(11, 13) }]}>Cancel</Text>
      </Pressable>
    </BottomSheetModal>
  );
}

export interface MoveGroupModalProps {
  visible: boolean;
  categoryName: string;
  groups: BudgetGroup[];
  currentGroupId: string;
  onMove: (groupId: string) => void;
  onClose: () => void;
}

export function MoveGroupModal({
  visible,
  categoryName,
  groups,
  currentGroupId,
  onMove,
  onClose,
}: MoveGroupModalProps) {
  const { r, hp } = useR();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const targets = groups.filter((g) => g.id !== currentGroupId && !g.isIncome);

  return (
    <BottomSheetModal
      visible={visible}
      onDismiss={onClose}
      paddingHorizontal={hp}
      statusBarTranslucent
    >
      <Text style={[s.bottomTitle, { fontSize: r(10, 12) }]}>
        Move "{categoryName}" to...
      </Text>
      <BottomSheetScrollView style={{ maxHeight: 300 }}>
        <View style={s.actionList}>
          {targets.length === 0 && (
            <Text style={[s.emptyText, { fontSize: r(11, 13) }]}>No other groups</Text>
          )}
          {targets.map((g) => (
            <Pressable
              key={g.id}
              style={({ pressed }) => [s.moveItem, pressed && { backgroundColor: colors.s2 }]}
              onPress={() => { onMove(g.id); onClose(); }}
            >
              <View style={[actionStyles.icon, { backgroundColor: colors.amberBg }]}>
                <Ionicons name="folder-outline" size={r(15, 17)} color={colors.amber} />
              </View>
              <Text style={[s.moveItemText, { fontSize: r(13, 15) }]}>{g.name}</Text>
            </Pressable>
          ))}
        </View>
      </BottomSheetScrollView>
      <Pressable style={({ pressed }) => [s.cancelBtn, pressed && s.pressed, { marginTop: 8 }]} onPress={onClose}>
        <Text style={[s.cancelBtnText, { fontSize: r(11, 13) }]}>Cancel</Text>
      </Pressable>
    </BottomSheetModal>
  );
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    // Center modal (TextPromptModal)
    overlay: {
      flex: 1,
      backgroundColor: Overlay.heavy,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    card: {
      backgroundColor: C.s1,
      borderWidth: 1,
      borderColor: C.b1,
      borderRadius: Radius.xl,
      paddingHorizontal: 28,
      paddingTop: 28,
      paddingBottom: 22,
      width: '100%',
      maxWidth: 340,
      alignItems: 'center',
    },
    cardTitle: {
      fontFamily: 'NunitoSans_700Bold',
      color: C.amber,
      textAlign: 'center',
      marginBottom: 4,
    },
    cardSubtitle: {
      fontFamily: 'OverpassMono_400Regular',
      color: C.t3,
      textAlign: 'center',
      marginBottom: 16,
    },
    input: {
      width: '100%',
      fontFamily: 'OverpassMono_600SemiBold',
      color: C.t1,
      backgroundColor: C.s2,
      borderWidth: 1,
      borderColor: C.b1,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 20,
    },

    // Bottom sheet action content
    bottomTitle: {
      fontFamily: 'OverpassMono_400Regular',
      color: C.t3,
      letterSpacing: 0.5,
      marginBottom: 12,
    },
    actionList: {
      width: '100%',
    },
    emptyText: {
      fontFamily: 'OverpassMono_400Regular',
      color: C.t3,
      paddingVertical: 16,
      textAlign: 'center',
    },
    moveItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 13,
      paddingHorizontal: 4,
      gap: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: C.b0,
    },
    moveItemText: {
      fontFamily: 'NunitoSans_600SemiBold',
      color: C.t0,
      flex: 1,
    },

    // Shared buttons
    primaryBtn: {
      width: '100%',
      backgroundColor: C.amberBg,
      borderWidth: 1,
      borderColor: C.amberBorder,
      borderRadius: 10,
      paddingVertical: 13,
      alignItems: 'center',
      minHeight: 48,
    },
    primaryBtnText: {
      fontFamily: 'NunitoSans_700Bold',
      color: C.amber,
    },
    cancelBtn: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      alignItems: 'center',
    },
    cancelBtnText: {
      fontFamily: 'NunitoSans_600SemiBold',
      color: C.t3,
    },
    pressed: {
      opacity: 0.7,
    },
  });
}
