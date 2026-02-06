import React from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { useTheme } from '@/contexts/theme';
import { useR } from '@/hooks/useR';
import { useFormStyles, formatDateInt } from './formStyles';
import { FormRow } from './FormRow';
import { PayeeInput } from './PayeeInput';
import { AccountPickerModal } from './AccountPickerModal';
import { CategoryPickerModal } from './CategoryPickerModal';
import { DatePickerModal } from './DatePickerModal';
import { AmountSection } from './AmountSection';
import { SplitChildCard } from './SplitChildCard';
import { StatusPills } from './StatusPills';
import { SaveOrSplitButton } from './SaveOrSplitButton';
import type { Account, Payee, CategoryOption } from '@/constants/types';
import type { SplitChild } from '@/hooks/useSplitForm';

export interface TransactionFormBodyProps {
  amountStr: string;
  onChangeAmount: (s: string) => void;
  isOutflow: boolean;
  onToggleOutflow: () => void;
  accountId: string | null;
  onAccountChange: (id: string) => void;
  dateInt: number;
  onDateChange: (d: number) => void;
  payeeName: string;
  onPayeeChange: (name: string) => void;
  categoryId: string | null;
  categoryName: string;
  notes: string;
  onNotesChange: (n: string) => void;
  cleared: boolean;
  onClearedChange: (v: boolean) => void;
  childForms: SplitChild[];

  isSplit: boolean;
  canEditCategory: boolean;
  parentAmountCents: number;
  childrenSumCents: number;
  remainingCents: number;
  isBalanced: boolean;
  isOver: boolean;
  canSave: boolean;
  saving: boolean;
  saveError: string | null;

  updateChild: (idx: number, patch: Partial<SplitChild>) => void;
  addChild: (prefillCents?: number) => void;
  onDeleteChild: (idx: number) => void;

  openCatPicker: (targetIdx: number) => void;
  handleCatPicked: (cat: CategoryOption | null) => void;

  handleSave: () => void;
  saveLabel?: string;

  accounts: Account[];
  payees: Payee[];
  categoryOptions: CategoryOption[];
  onCreatePayee?: (name: string) => Promise<void>;

  showAcctPicker: boolean;
  onAcctPickerChange: (v: boolean) => void;
  showCatPicker: boolean;
  showDatePicker: boolean;
  onDatePickerChange: (v: boolean) => void;
  catPickerTarget: number;

  isTransfer?: boolean;
  payeeTransferOnly?: boolean;
  transferDestAccountId?: string | null;
  isReconciled?: boolean;
  onShowUnreconcile?: () => void;
  onSelectTransfer?: (account: Account) => void;

  feedbackSlot?: React.ReactNode;
  bottomSlot?: React.ReactNode;
}

export function TransactionFormBody({
  amountStr,
  onChangeAmount,
  isOutflow,
  onToggleOutflow,
  accountId,
  onAccountChange,
  dateInt,
  onDateChange,
  payeeName,
  onPayeeChange,
  categoryId,
  categoryName,
  notes,
  onNotesChange,
  cleared,
  onClearedChange,
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
  updateChild,
  addChild,
  onDeleteChild,
  openCatPicker,
  handleCatPicked,
  handleSave,
  saveLabel = 'save transaction',
  accounts,
  payees,
  categoryOptions,
  onCreatePayee,
  showAcctPicker,
  onAcctPickerChange,
  showCatPicker,
  showDatePicker,
  onDatePickerChange,
  catPickerTarget,
  isTransfer,
  payeeTransferOnly,
  transferDestAccountId,
  isReconciled,
  onShowUnreconcile,
  onSelectTransfer,
  feedbackSlot,
  bottomSlot,
}: TransactionFormBodyProps) {
  const { hp, r } = useR();
  const { colors } = useTheme();
  const fs = useFormStyles();

  const selectedAccount = accounts.find((a) => a.id === accountId) ?? null;
  const transferDestAccount = accounts.find((a) => a.id === transferDestAccountId) ?? null;
  // Both source and destination are on-budget → frozen "Transfer" (no category makes sense)
  const isOnBudgetTransfer =
    (isTransfer ?? false) &&
    (selectedAccount?.onBudget ?? false) &&
    (transferDestAccount?.onBudget ?? false);

  return (
    <>
      {/* Note: ScrollView is owned by the parent (modal or screen) so */}
      {/* KAV + safe area behavior is handled at the right level.      */}
      <View style={{ flex: 1 }}>
        {/* Amount */}
        <AmountSection
          amountStr={amountStr}
          onChangeAmount={onChangeAmount}
          isOutflow={isOutflow}
          onToggleOutflow={onToggleOutflow}
          isSplit={isSplit}
          childrenSumCents={childrenSumCents}
          remainingCents={remainingCents}
          isBalanced={isBalanced}
          isOver={isOver}
        />

        {/* Payee */}
        {/* payeeTransferOnly=true (edit form for a transfer): shows only transfer account
            suggestions — no regular payees, no "create". User can pick a different account.
            payeeTransferOnly=false/undefined (add form): shows all payees + transfer options. */}
        <FormRow label="payee">
          <PayeeInput
            value={payeeName}
            onChange={onPayeeChange}
            payees={payeeTransferOnly ? [] : payees}
            onCreatePayee={payeeTransferOnly ? undefined : onCreatePayee}
            accounts={accounts}
            onSelectTransfer={onSelectTransfer}
            currentAccountId={accountId ?? undefined}
          />
        </FormRow>

        {/* Category — all off-budget account transactions show a frozen "Off budget" label
            (not saved to DB). On-budget transactions show the editable picker. */}
        <FormRow label="category">
          {!(selectedAccount?.onBudget ?? true) ? (
            <View style={[fs.pickerBtn, fs.disabled]}>
              <Text style={[fs.pickerText, { fontSize: r(13, 15), color: colors.t3 }]}>
                Off budget
              </Text>
            </View>
          ) : isOnBudgetTransfer ? (
            <View style={[fs.pickerBtn, fs.disabled]}>
              <Text style={[fs.pickerText, { fontSize: r(13, 15), color: colors.t3 }]}>
                Transfer
              </Text>
            </View>
          ) : isSplit && childForms.length > 1 ? (
            <View style={[fs.pickerBtn, fs.disabled]}>
              <Text style={[fs.pickerText, { fontSize: r(13, 15), color: colors.amber }]}>
                ✂️ Split
              </Text>
            </View>
          ) : (
            <Pressable style={fs.pickerBtn} onPress={() => openCatPicker(-1)}>
              <Text
                style={[
                  fs.pickerText,
                  { fontSize: r(13, 15) },
                  isSplit && { color: colors.amber },
                  !categoryId && !isSplit && fs.pickerPlaceholder,
                ]}
              >
                {isSplit ? '✂️ Split' : categoryId ? categoryName : 'no category'}
              </Text>
              <Text style={[fs.pickerArrow, { fontSize: r(10, 12) }]}>▾</Text>
            </Pressable>
          )}
        </FormRow>

        {/* Split children */}
        {isSplit && (
          <>
            {childForms.map((child, idx) => (
              <SplitChildCard
                key={child.id}
                child={child}
                payees={payees}
                onCreatePayee={onCreatePayee}
                onUpdate={(patch) => updateChild(idx, patch)}
                onDelete={() => onDeleteChild(idx)}
                onOpenCatPicker={() => openCatPicker(idx)}
              />
            ))}
            <Pressable
              style={[fs.addSplitInline, { marginHorizontal: hp }]}
              onPress={() => addChild(remainingCents !== 0 ? remainingCents : undefined)}
              hitSlop={8}
            >
              <Text style={[fs.addSplitInlineText, { fontSize: r(10, 12) }]}>+ add split</Text>
            </Pressable>
          </>
        )}

        {/* Account */}
        <FormRow label="account">
          <Pressable style={fs.pickerBtn} onPress={() => onAcctPickerChange(true)}>
            <Text
              style={[
                fs.pickerText,
                { fontSize: r(13, 15) },
                !selectedAccount && fs.pickerPlaceholder,
              ]}
            >
              {selectedAccount?.name ?? 'select account'}
            </Text>
            <Text style={[fs.pickerArrow, { fontSize: r(10, 12) }]}>▾</Text>
          </Pressable>
        </FormRow>

        {/* Date */}
        <FormRow label="date">
          <Pressable style={fs.pickerBtn} onPress={() => onDatePickerChange(true)}>
            <Text style={[fs.pickerText, { fontSize: r(13, 15) }]}>
              {dateInt ? formatDateInt(dateInt) : '—'}
            </Text>
            <Text style={[fs.pickerArrow, { fontSize: r(10, 12) }]}>▾</Text>
          </Pressable>
        </FormRow>

        {/* Notes (hidden when split — each child has its own notes) */}
        {!isSplit && (
          <FormRow label="notes">
            <TextInput
              style={[fs.input, { fontSize: r(13, 15) }]}
              value={notes}
              onChangeText={onNotesChange}
              placeholder="optional"
              placeholderTextColor={colors.t3}
            />
          </FormRow>
        )}

        {/* Status */}
        <FormRow label="status">
          {isReconciled ? (
            <Pressable style={fs.reconcBadge} onPress={onShowUnreconcile} hitSlop={8}>
              <Text style={[fs.reconcBadgeText, { fontSize: r(12, 14) }]}>🔒 reconciled ›</Text>
            </Pressable>
          ) : (
            <StatusPills cleared={cleared} onChange={onClearedChange} />
          )}
        </FormRow>

        {/* Error message */}
        {saveError && (
          <View style={[fs.feedback, { paddingHorizontal: hp }]}>
            <Text style={[fs.feedbackError, { fontSize: r(10, 12) }]}>{saveError}</Text>
          </View>
        )}

        {/* Extra feedback slot (e.g. success message for Add) */}
        {feedbackSlot}

        {/* Save / add-split button */}
        <View style={[fs.actionArea, { paddingHorizontal: hp }]}>
          <SaveOrSplitButton
            isSplit={isSplit}
            isBalanced={isBalanced}
            canSave={canSave}
            saving={saving}
            remainingCents={remainingCents}
            accountId={accountId}
            onSave={handleSave}
            onAddChild={addChild}
            label={saveLabel}
          />
        </View>

        {/* Extra bottom slot (reset for Add, delete for Edit) */}
        {bottomSlot}

        <View style={{ height: 40 }} />
      </View>

      {/* ── Sub-modals (rendered outside the scroll so they overlay correctly) */}
      <DatePickerModal
        visible={showDatePicker}
        value={dateInt}
        onConfirm={(d) => {
          onDateChange(d);
          onDatePickerChange(false);
        }}
        onClose={() => onDatePickerChange(false)}
      />

      <AccountPickerModal
        visible={showAcctPicker}
        onClose={(acct) => {
          if (acct) onAccountChange(acct.id);
          onAcctPickerChange(false);
        }}
        accounts={accounts}
        excludeAccountId={transferDestAccountId ?? undefined}
      />

      <CategoryPickerModal
        visible={showCatPicker}
        onClose={handleCatPicked}
        categories={categoryOptions}
        showSplit={catPickerTarget === -1 && canEditCategory && !isTransfer}
      />
    </>
  );
}
