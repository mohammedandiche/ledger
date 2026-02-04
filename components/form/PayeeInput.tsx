import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, Keyboard } from 'react-native';
import { useTheme } from '@/contexts/theme';
import { useR } from '@/hooks/useR';
import type { Payee, Account } from '@/constants/types';
import { useFormStyles } from './formStyles';
import { logger } from '@/utils/logger';

export function PayeeInput({
  value,
  onChange,
  payees,
  onCreatePayee,
  accounts,
  onSelectTransfer,
  currentAccountId,
}: {
  value: string;
  onChange: (name: string) => void;
  payees: Payee[];
  onCreatePayee?: (name: string) => Promise<void>;
  accounts?: Account[];
  onSelectTransfer?: (account: Account) => void;
  currentAccountId?: string;
}) {
  const { r } = useR();
  const { colors } = useTheme();
  const fs = useFormStyles();
  const [focused, setFocused] = useState(false);
  const [creating, setCreating] = useState(false);

  const q = value.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!focused) return [];
    if (!q) return payees;
    return payees.filter((p) => p.name.toLowerCase().includes(q));
  }, [value, payees, focused]);

  const transferSuggestions = useMemo(() => {
    // Only show transfer options when the caller actually handles them.
    // In the edit form onSelectTransfer is undefined, so we hide this section
    // to avoid showing a "transfer to" list that does nothing on press.
    if (!focused || !accounts?.length || !onSelectTransfer) return [];
    // Exclude the account this transaction belongs to (can't transfer to itself)
    const candidates = currentAccountId
      ? accounts.filter((a) => a.id !== currentAccountId)
      : accounts;
    if (!q) return candidates;
    return candidates.filter(
      (a) =>
        `transfer: ${a.name}`.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q),
    );
  }, [accounts, q, focused, currentAccountId, onSelectTransfer]);

  const exactMatch = useMemo(() => {
    if (!value.trim()) return true;
    const lower = value.trim().toLowerCase();
    if (payees.some((p) => p.name.toLowerCase() === lower)) return true;
    if (accounts?.some((a) => `transfer: ${a.name}`.toLowerCase() === lower)) return true;
    return false;
  }, [value, payees, accounts]);

  const showCreate = focused && value.trim().length > 0 && !exactMatch;

  const hasDropdown =
    focused && (filtered.length > 0 || transferSuggestions.length > 0 || showCreate);

  async function handleCreate() {
    const name = value.trim();
    setFocused(false);
    Keyboard.dismiss();
    if (onCreatePayee && name) {
      setCreating(true);
      try {
        await onCreatePayee(name);
      } catch (e) {
        logger.error('PayeeInput', 'Failed to create payee', e);
      } finally {
        setCreating(false);
      }
    }
  }

  return (
    <View>
      <TextInput
        style={[fs.input, { fontSize: r(13, 15) }]}
        value={value}
        onChangeText={onChange}
        placeholder="payee name"
        placeholderTextColor={colors.t3}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 200)}
        autoCorrect={false}
      />
      {creating && (
        <Text style={[fs.suggestionText, { fontSize: r(10, 12), color: colors.t3, marginTop: 4 }]}>
          syncing payee…
        </Text>
      )}
      {hasDropdown && (
        <ScrollView style={fs.suggestions} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
          {showCreate && (
            <Pressable style={fs.suggestionRow} onPress={handleCreate}>
              <Text style={[fs.suggestionText, { fontSize: r(12, 14), color: colors.green }]}>
                create "{value.trim()}"
              </Text>
            </Pressable>
          )}
          {filtered.map((s) => (
            <Pressable
              key={s.id}
              style={fs.suggestionRow}
              onPress={() => {
                onChange(s.name);
                setFocused(false);
                Keyboard.dismiss();
              }}
            >
              <Text style={[fs.suggestionText, { fontSize: r(12, 14) }]}>{s.name}</Text>
            </Pressable>
          ))}
          {transferSuggestions.length > 0 && (
            <>
              <Text style={[fs.catGroup, { fontSize: r(9, 11), paddingHorizontal: 10 }]}>
                transfer to
              </Text>
              {transferSuggestions.map((a) => (
                <Pressable
                  key={a.id}
                  style={fs.suggestionRow}
                  onPress={() => {
                    onChange(`Transfer: ${a.name}`);
                    onSelectTransfer?.(a);
                    setFocused(false);
                    Keyboard.dismiss();
                  }}
                >
                  <Text style={[fs.suggestionText, { fontSize: r(12, 14), color: colors.blue }]}>
                    ⇄ Transfer: {a.name}
                  </Text>
                </Pressable>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}
