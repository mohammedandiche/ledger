import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/theme';
import { useR } from '@/hooks/useR';
import { fmt } from '@/constants/types';
import { useBudget } from '@/contexts/budget';
import type { ThemeColors } from '@/constants/tokens';
import { BottomSheetModal } from '@/components/shared/BottomSheetModal';
import type { BottomSheetRef } from '@/components/shared/BottomSheetModal';

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    recBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 9,
      backgroundColor: C.s1,
      borderBottomWidth: 1,
      borderBottomColor: C.b0,
    },
    recBarActive: {
      backgroundColor: 'rgba(92,158,110,0.06)',
      borderBottomColor: 'rgba(92,158,110,0.15)',
    },
    recLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    recStatGroup: { alignItems: 'center' },
    recSep: { fontFamily: 'OverpassMono_400Regular', color: C.t4 },
    recRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    recBtn: {
      backgroundColor: C.s2,
      borderWidth: 1,
      borderColor: C.bw,
      borderRadius: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      minHeight: 30,
      alignItems: 'center',
      justifyContent: 'center',
    },
    recBtnLock: { backgroundColor: 'rgba(92,158,110,0.12)', borderColor: C.greenBorder },
    recBtnAdj: { backgroundColor: C.amberBg, borderColor: C.amberBorder },
    recBtnText: {
      fontFamily: 'OverpassMono_700Bold',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      color: C.t2,
    },
    recLabel: {
      fontFamily: 'OverpassMono_400Regular',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: C.t3,
    },
    recBalance: { fontFamily: 'NunitoSans_700Bold', color: C.t1 },

    // Reconcile setup modal — content styles only (shell handled by BottomSheetModal)
    recSetupTitle: {
      fontFamily: 'OverpassMono_700Bold',
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: C.amberL,
      marginBottom: 6,
    },
    recSetupDesc: {
      fontFamily: 'NunitoSans_400Regular',
      color: C.t2,
      lineHeight: 20,
      marginBottom: 20,
    },
    recSetupLabel: {
      fontFamily: 'OverpassMono_400Regular',
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: C.t3,
      marginBottom: 4,
    },
    recSetupInput: {
      fontFamily: 'NunitoSans_700Bold',
      color: C.t0,
      borderBottomWidth: 2,
      borderBottomColor: C.amber,
      paddingVertical: 6,
      marginBottom: 24,
    },
    recSetupBtn: {
      backgroundColor: C.amberBg,
      borderWidth: 1,
      borderColor: C.amberBorder,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    recSetupBtnText: {
      fontFamily: 'OverpassMono_700Bold',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      color: C.amberL,
    },
  });
}

export function ReconcileBar({
  reconcileMode,
  reconcileTarget,
  reconcileCleared,
  onReconcilePress,
  onLock,
  onExit,
  onAddAdjustment,
}: {
  reconcileMode: boolean;
  reconcileTarget: number; // cents
  reconcileCleared: number; // cents
  onReconcilePress: () => void;
  onLock: () => void;
  onExit: () => void;
  onAddAdjustment?: () => void;
}) {
  const { hp, r } = useR();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { accounts, activeAccountId } = useBudget();

  const balance = activeAccountId
    ? (accounts.find((a) => a.id === activeAccountId)?.balance ?? 0)
    : accounts.reduce((sum, a) => sum + a.balance, 0);

  const balanceColor = balance > 0 ? colors.greenL : balance < 0 ? colors.redL : colors.t2;

  if (reconcileMode) {
    const diff = reconcileTarget - reconcileCleared;
    const isBalanced = diff === 0;
    const diffColor = isBalanced ? colors.green : colors.amber;

    return (
      <View style={[s.recBar, s.recBarActive, { paddingHorizontal: hp }]}>
        <View style={s.recLeft}>
          <View style={s.recStatGroup}>
            <Text style={[s.recLabel, { fontSize: r(7, 9) }]}>cleared</Text>
            <Text style={[s.recBalance, { fontSize: r(11, 13), color: colors.greenL }]}>
              {fmt(reconcileCleared / 100)}
            </Text>
          </View>
          <Text style={[s.recSep, { fontSize: r(11, 13) }]}>→</Text>
          <View style={s.recStatGroup}>
            <Text style={[s.recLabel, { fontSize: r(7, 9) }]}>bank</Text>
            <Text style={[s.recBalance, { fontSize: r(11, 13), color: colors.t1 }]}>
              {fmt(reconcileTarget / 100)}
            </Text>
          </View>
          <Text style={[s.recSep, { fontSize: r(11, 13) }]}>·</Text>
          <View style={s.recStatGroup}>
            {isBalanced ? (
              <Text style={[s.recBalance, { fontSize: r(11, 13), color: colors.green }]}>
                ✓ balanced
              </Text>
            ) : (
              <>
                <Text style={[s.recLabel, { fontSize: r(7, 9) }]}>diff</Text>
                <Text style={[s.recBalance, { fontSize: r(11, 13), color: diffColor }]}>
                  {diff > 0 ? '+' : ''}
                  {fmt(diff / 100)}
                </Text>
              </>
            )}
          </View>
        </View>
        <View style={s.recRight}>
          {isBalanced ? (
            <Pressable style={[s.recBtn, s.recBtnLock]} onPress={onLock} hitSlop={8}>
              <Text style={[s.recBtnText, { fontSize: r(8, 10), color: colors.green }]}>
                lock ✓
              </Text>
            </Pressable>
          ) : (
            <Pressable style={[s.recBtn, s.recBtnAdj]} onPress={onAddAdjustment} hitSlop={8}>
              <Text style={[s.recBtnText, { fontSize: r(8, 10), color: colors.amber }]}>
                add adj
              </Text>
            </Pressable>
          )}
          <Pressable style={s.recBtn} onPress={onExit} hitSlop={8}>
            <Text style={[s.recBtnText, { fontSize: r(8, 10) }]}>exit</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.recBar, { paddingHorizontal: hp }]}>
      <View style={s.recLeft}>
        <Text style={[s.recLabel, { fontSize: r(8, 10) }]}>balance</Text>
        <Text style={[s.recBalance, { fontSize: r(12, 14), color: balanceColor }]}>
          {fmt(balance)}
        </Text>
      </View>
      {activeAccountId && (
        <Pressable style={s.recBtn} onPress={onReconcilePress} hitSlop={8}>
          <Text style={[s.recBtnText, { fontSize: r(8, 10) }]}>reconcile</Text>
        </Pressable>
      )}
    </View>
  );
}

export function ReconcileSetupModal({
  visible,
  accountName,
  accountBalance,
  onStart,
  onClose,
}: {
  visible: boolean;
  accountName: string;
  accountBalance: number; // dollars
  onStart: (targetCents: number) => void;
  onClose: () => void;
}) {
  const { hp, r } = useR();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const [inputVal, setInputVal] = useState('');
  const sheetRef = useRef<BottomSheetRef>(null);

  useEffect(() => {
    if (visible) {
      setInputVal(Math.abs(accountBalance).toFixed(2));
    }
  }, [visible, accountBalance]);

  function handleStart() {
    const val = parseFloat(inputVal.replace(',', '.')) || 0;
    sheetRef.current?.close(() => onStart(Math.round(val * 100)));
  }

  return (
    <BottomSheetModal
      ref={sheetRef}
      visible={visible}
      onDismiss={onClose}
      paddingHorizontal={hp}
      keyboardAvoiding
      sheetStyle={{ borderTopWidth: 1, borderColor: colors.b1 }}
    >
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={[s.recSetupTitle, { fontSize: r(12, 14) }]}>reconcile {accountName}</Text>
        <Text style={[s.recSetupDesc, { fontSize: r(11, 13) }]}>
          Enter your bank's current balance.
        </Text>
        <Text style={[s.recSetupLabel, { fontSize: r(9, 11) }]}>bank balance</Text>
        <TextInput
          style={[s.recSetupInput, { fontSize: r(26, 32) }]}
          value={inputVal}
          onChangeText={setInputVal}
          keyboardType="decimal-pad"
          selectTextOnFocus
          placeholderTextColor={colors.t3}
          selectionColor={colors.amber}
        />
        <Pressable style={s.recSetupBtn} onPress={handleStart}>
          <Text style={[s.recSetupBtnText, { fontSize: r(12, 14) }]}>start reconciling</Text>
        </Pressable>
        <View style={{ height: 16 }} />
      </ScrollView>
    </BottomSheetModal>
  );
}
