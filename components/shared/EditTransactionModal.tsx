import {
  View,
  Text,
  Pressable,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useMemo } from 'react';
import { useTheme } from '@/contexts/theme';
import { useR } from '@/hooks/useR';
import { makeStyles } from './editTransactionStyles';
import { useFormStyles } from '@/components/form/formStyles';
import { TransactionFormBody } from '@/components/form/TransactionFormBody';
import { ConfirmModal } from './ConfirmModal';
import { useEditTransactionForm } from '@/hooks/useEditTransactionForm';
import type { EditTransactionFormProps } from '@/hooks/useEditTransactionForm';
import type { Account, Payee, CategoryOption } from '@/constants/types';

interface Props extends EditTransactionFormProps {
  visible: boolean;
  accounts: Account[];
  payees: Payee[];
  categoryOptions: CategoryOption[];
  onCreatePayee: (name: string) => Promise<void>;
}

export function EditTransactionModal({
  visible,
  accounts,
  payees,
  categoryOptions,
  onCreatePayee,
  ...formProps
}: Props) {
  const { hp, r } = useR();
  const { colors } = useTheme();
  const fs = useFormStyles();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const form = useEditTransactionForm(formProps, accounts);
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
    deleting,
    saveError,
    showAcctPicker,
    setShowAcctPicker,
    showCatPicker,
    showDatePicker,
    setShowDatePicker,
    catPickerTarget,
    showDeleteConfirm,
    setShowDeleteConfirm,
    showDeleteSplitConfirm,
    setShowDeleteSplitConfirm,
    showDiscardConfirm,
    setShowDiscardConfirm,
    showReconcileEditConfirm,
    setShowReconcileEditConfirm,
    showUnreconcileConfirm,
    setShowUnreconcileConfirm,
    isReconciled,
    isTransfer,
    transferDestAccountId,
    handleSelectTransfer,
    updateChild,
    addChild,
    onDeleteChild,
    openCatPicker,
    handleCatPicked,
    handleClose,
    handleSave,
    performSave,
    handleDelete,
    confirmDelete,
    confirmDeleteChild,
    confirmUnreconcile,
    discardDelay,
  } = form;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={s.container}>
        {/* Drag handle */}
        <View style={s.handleBar}>
          <View style={s.handle} />
        </View>

        {/* Header */}
        <View style={[s.header, { paddingHorizontal: hp }]}>
          <Text style={[s.headerTitle, { fontSize: r(12, 14) }]}>
            {isSplit ? 'edit split' : 'edit transaction'}
          </Text>
          <Pressable onPress={handleClose} hitSlop={12}>
            <Text style={[s.headerClose, { fontSize: r(12, 14) }]}>cancel</Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={{ flex: 1 }}
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
              saveLabel="save changes"
              // Data
              accounts={accounts}
              payees={payees}
              categoryOptions={categoryOptions}
              onCreatePayee={onCreatePayee}
              // Modal visibility
              showAcctPicker={showAcctPicker}
              onAcctPickerChange={setShowAcctPicker}
              showCatPicker={showCatPicker}
              showDatePicker={showDatePicker}
              onDatePickerChange={setShowDatePicker}
              catPickerTarget={catPickerTarget}
              // Variant flags
              isTransfer={isTransfer}
              // Transfer edits: only allow picking a different transfer target
              payeeTransferOnly={isTransfer}
              transferDestAccountId={transferDestAccountId}
              onSelectTransfer={isTransfer ? handleSelectTransfer : undefined}
              isReconciled={isReconciled}
              onShowUnreconcile={() => setShowUnreconcileConfirm(true)}
              // Delete button slot
              bottomSlot={
                <View style={[s.deleteArea, { paddingHorizontal: hp }]}>
                  <Pressable
                    style={[s.deleteBtn, deleting && fs.saveBtnDisabled]}
                    onPress={handleDelete}
                    disabled={deleting}
                  >
                    <Text style={[s.deleteBtnText, { fontSize: r(11, 13) }]}>
                      {deleting ? 'deleting…' : 'delete transaction'}
                    </Text>
                  </Pressable>
                </View>
              }
            />
          </ScrollView>
        </KeyboardAvoidingView>

        <ConfirmModal
          visible={showDeleteConfirm}
          icon="🗑️"
          title="Delete transaction"
          message={
            isSplit
              ? 'This will delete the split transaction and all its splits. This cannot be undone.'
              : 'This will permanently delete this transaction. This cannot be undone.'
          }
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />

        <ConfirmModal
          visible={showDeleteSplitConfirm != null}
          icon="✂️"
          title="Delete split"
          message="Remove this split line? This cannot be undone."
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={confirmDeleteChild}
          onCancel={() => setShowDeleteSplitConfirm(null)}
        />

        <ConfirmModal
          visible={showDiscardConfirm}
          icon="📝"
          title="Unsaved changes"
          message="You have unsaved changes. Are you sure you want to discard them?"
          confirmLabel="Discard"
          cancelLabel="Keep editing"
          variant="warning"
          onConfirm={() => {
            setShowDiscardConfirm(false);
            setTimeout(formProps.onClose, discardDelay);
          }}
          onCancel={() => setShowDiscardConfirm(false)}
        />

        <ConfirmModal
          visible={showReconcileEditConfirm}
          icon="🔒"
          title="Edit reconciled transaction"
          message="This transaction has been reconciled. Editing it may affect your reconciled balance. Continue?"
          confirmLabel="Save anyway"
          cancelLabel="Cancel"
          variant="warning"
          onConfirm={() => {
            setShowReconcileEditConfirm(false);
            performSave();
          }}
          onCancel={() => setShowReconcileEditConfirm(false)}
        />

        <ConfirmModal
          visible={showUnreconcileConfirm}
          icon="🔓"
          title="Remove reconciliation"
          message="This will mark the transaction as cleared (not reconciled), allowing it to be edited freely. The reconciled balance may change."
          confirmLabel="Remove"
          cancelLabel="Keep"
          variant="warning"
          onConfirm={confirmUnreconcile}
          onCancel={() => setShowUnreconcileConfirm(false)}
        />
      </View>
    </Modal>
  );
}
