import {
  Text,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useMemo, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { MotiView, AnimatePresence } from 'moti';
import { LottieLoader } from '@/components/shared/LottieLoader';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBar } from '@/components/shared/AppBar';
import { useTheme } from '@/contexts/theme';
import type { ThemeColors } from '@/constants/tokens';
import { useR } from '@/hooks/useR';
import { useBudget } from '@/contexts/budget';
import { useFormStyles } from '@/components/form/formStyles';
import { TransactionFormBody } from '@/components/form/TransactionFormBody';
import { useAddTransactionForm } from '@/hooks/useAddTransactionForm';

export default function AddScreen() {
  const { hp, r } = useR();
  const { colors } = useTheme();
  const fs = useFormStyles();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();

  const { accounts, payees, categoryOptions, createPayee, addTransaction, addSplitTransaction } =
    useBudget();

  const form = useAddTransactionForm({ addTransaction, addSplitTransaction });
  const {
    amountStr,
    setAmountStr,
    isOutflow,
    setIsOutflow,
    accountId,
    setAccountId,
    dateInt,
    setDateInt,
    payeeName,
    onPayeeChange,
    categoryId,
    categoryName,
    notes,
    setNotes,
    cleared,
    setCleared,
    childForms,
    isSplit,
    canEditCategory,
    parentAmountCents,
    childrenSumCents,
    remainingCents,
    isBalanced,
    isOver,
    canSave,
    saving,
    saveError,
    saved,
    showAcctPicker,
    setShowAcctPicker,
    showCatPicker,
    showDatePicker,
    setShowDatePicker,
    catPickerTarget,
    updateChild,
    addChild,
    onDeleteChild,
    openCatPicker,
    handleCatPicked,
    handleSave,
    resetForm,
    isTransfer,
    transferDestAccountId,
    handleSelectTransfer,
  } = form;

  // Navigate to the ledger tab as soon as a transaction is saved.
  useEffect(() => {
    if (saved) router.navigate('/(tabs)/ledger');
  }, [saved, router]);

  return (
    <SafeAreaView style={s.safe} edges={[]}>
      <AppBar title="ledger" badge="add" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TransactionFormBody
            // Field values
            amountStr={amountStr}
            onChangeAmount={setAmountStr}
            isOutflow={isOutflow}
            onToggleOutflow={() => setIsOutflow(!isOutflow)}
            accountId={accountId}
            onAccountChange={setAccountId}
            dateInt={dateInt}
            onDateChange={setDateInt}
            payeeName={payeeName}
            onPayeeChange={onPayeeChange}
            categoryId={categoryId}
            categoryName={categoryName}
            notes={notes}
            onNotesChange={setNotes}
            cleared={cleared}
            onClearedChange={setCleared}
            childForms={childForms}
            // Derived
            isSplit={isSplit}
            canEditCategory={canEditCategory}
            parentAmountCents={parentAmountCents}
            childrenSumCents={childrenSumCents}
            remainingCents={remainingCents}
            isBalanced={isBalanced}
            isOver={isOver}
            canSave={canSave}
            saving={saving}
            saveError={saveError}
            // Child management
            updateChild={updateChild}
            addChild={addChild}
            onDeleteChild={onDeleteChild}
            // Category picker
            openCatPicker={openCatPicker}
            handleCatPicked={handleCatPicked}
            // Save
            handleSave={handleSave}
            saveLabel="save transaction"
            // Data
            accounts={accounts}
            payees={payees}
            categoryOptions={categoryOptions}
            onCreatePayee={createPayee}
            // Modal visibility
            showAcctPicker={showAcctPicker}
            onAcctPickerChange={setShowAcctPicker}
            showCatPicker={showCatPicker}
            showDatePicker={showDatePicker}
            onDatePickerChange={setShowDatePicker}
            catPickerTarget={catPickerTarget}
            // Transfer support
            isTransfer={isTransfer}
            transferDestAccountId={transferDestAccountId}
            onSelectTransfer={handleSelectTransfer}
            // Success banner
            feedbackSlot={
              <AnimatePresence>
                {saved && (
                  <MotiView
                    key="saved"
                    from={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                    style={[fs.feedback, { paddingHorizontal: hp, flexDirection: 'row', alignItems: 'center', gap: 8 }]}
                  >
                    <LottieLoader animation="success" size={24} loop={false} />
                    <Text style={[fs.feedbackOk, { fontSize: r(10, 12) }]}>transaction saved</Text>
                  </MotiView>
                )}
              </AnimatePresence>
            }
            // Reset button
            bottomSlot={
              <Pressable
                style={[s.resetBtn, { paddingHorizontal: hp }]}
                onPress={resetForm}
                hitSlop={8}
              >
                <Text style={[s.resetBtnText, { fontSize: r(10, 12) }]}>reset</Text>
              </Pressable>
            }
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    scroll: { flex: 1 },

    resetBtn: { alignItems: 'center', marginTop: 12, paddingVertical: 8 },
    resetBtnText: {
      fontFamily: 'OverpassMono_600SemiBold',
      color: C.t3,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
  });
}
