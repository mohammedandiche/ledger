import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useState, useMemo, useEffect } from 'react';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import { useTheme } from '@/contexts/theme';
import type { ThemeColors } from '@/constants/tokens';
import { Typography, Radius } from '@/constants/tokens';
import { useR } from '@/hooks/useR';
import { useBudget } from '@/contexts/budget';
import type { DiagnosticIssueRaw } from '@/constants/db';
import { formatSyncAge } from '@/utils/formatSyncAge';
import { settingsStyleBase } from './settingsStyles';

export function SyncControls() {
  const { r, hp } = useR();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { lastSyncAt, syncing, sync, refresh, resetSync, loading } = useBudget();
  const [repairing, setRepairing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  async function handleSync() {
    await sync();
  }

  async function handleRepair() {
    setRepairing(true);
    try {
      await refresh();
    } finally {
      setRepairing(false);
    }
  }

  async function handleReset() {
    setShowResetConfirm(false);
    setResetting(true);
    try {
      await resetSync();
    } finally {
      setResetting(false);
    }
  }

  const [, setTick] = useState(0);
  useEffect(() => {
    if (!lastSyncAt) return;
    const id = setInterval(() => setTick((t) => t + 1), 1_000);
    return () => clearInterval(id);
  }, [lastSyncAt]);

  const busySyncing = syncing || loading;
  const busyRepairing = repairing;
  const busyResetting = resetting;

  return (
    <>
      <SectionHeader title="sync" />

      <View style={[s.syncRow, { paddingHorizontal: hp }]}>
        <View style={s.syncInfo}>
          <Text style={[s.syncLabel, { fontSize: r(8, 10) }]}>last synced</Text>
          <Text style={[s.syncValue, { fontSize: r(11, 13) }]}>
            {busySyncing ? 'syncing…' : formatSyncAge(lastSyncAt, 'never')}
          </Text>
        </View>
        <Pressable
          style={[s.syncBtn, busySyncing && s.syncBtnDisabled]}
          onPress={handleSync}
          disabled={busySyncing}
        >
          {busySyncing ? (
            <ActivityIndicator size="small" color={colors.amber} />
          ) : (
            <Text style={[s.syncBtnText, { fontSize: r(9, 11) }]}>sync now</Text>
          )}
        </Pressable>
      </View>

      <View style={[s.btnRow, { paddingHorizontal: hp }]}>
        <Pressable
          style={[s.btn, s.btnSecondary, busyRepairing && s.btnDisabled]}
          onPress={handleRepair}
          disabled={busyRepairing || busyResetting}
        >
          {busyRepairing ? (
            <ActivityIndicator size="small" color={colors.t2} />
          ) : (
            <Text style={[s.btnTextSecondary, { fontSize: r(9, 11) }]}>↻ repair sync</Text>
          )}
        </Pressable>
      </View>
      <View style={[s.repairHint, { paddingHorizontal: hp }]}>
        <Text style={[s.hintText, { fontSize: r(8, 9) }]}>
          Re-downloads the budget snapshot and re-applies all sync messages. Use if data looks out
          of date.
        </Text>
      </View>

      <View style={[s.btnRow, { paddingHorizontal: hp }]}>
        <Pressable
          style={[s.btn, s.btnDanger, busyResetting && s.btnDisabled]}
          onPress={() => setShowResetConfirm(true)}
          disabled={busyResetting || busyRepairing}
        >
          {busyResetting ? (
            <ActivityIndicator size="small" color={colors.redL} />
          ) : (
            <Text style={[s.btnTextDanger, { fontSize: r(9, 11) }]}>✕ reset sync</Text>
          )}
        </Pressable>
      </View>
      <View style={[s.repairHint, { paddingHorizontal: hp }]}>
        <Text style={[s.hintText, { fontSize: r(8, 9) }]}>
          Deletes all local cached data and downloads a completely fresh copy. Use when sync is
          broken or data is corrupted.
        </Text>
      </View>

      <ConfirmModal
        visible={showResetConfirm}
        icon="⚠️"
        title="Reset sync"
        message="This will delete all locally cached budget data and download a fresh copy from the server. Any unsynced local changes will be lost."
        confirmLabel="Reset"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={handleReset}
        onCancel={() => setShowResetConfirm(false)}
      />
    </>
  );
}

const DIAG_META: Record<string, { label: string; detail: string }> = {
  'blank-payee': {
    label: 'split children missing a payee',
    detail: 'Some split children have no payee even though their parent does. Fix copies the parent payee to each child.',
  },
  'cleared-mismatch': {
    label: 'split children with mismatched cleared',
    detail: 'A split child has a different cleared status than its parent. Fix sets each child to match its parent.',
  },
  'orphan-child': {
    label: 'orphaned split children',
    detail: 'Split children whose parent transaction was deleted. Fix removes these orphaned rows from the ledger.',
  },
  'split-amount-mismatch': {
    label: "split amounts don't add up",
    detail: 'The sum of split children differs from the parent amount. Open the split in the ledger to correct it manually.',
  },
  'parent-has-category': {
    label: 'split parents with a category set',
    detail: 'Split parents should never have a category — only children carry categories. Fix clears the parent category.',
  },
  'reconciled-not-cleared': {
    label: 'reconciled but not marked as cleared',
    detail: 'Transactions flagged as reconciled but missing the cleared flag, excluding them from the cleared balance. Fix sets cleared on each one.',
  },
  'null-cleared-reconciled': {
    label: 'NULL cleared/reconciled values',
    detail: 'Some transactions have NULL instead of 0 for cleared or reconciled, which can cause them to be skipped during reconciliation. Fix sets NULL values to 0.',
  },
};

export function Diagnostics() {
  const { r, hp } = useR();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { runDiagnostics, applyDiagnosticFix } = useBudget();
  const [issues, setIssues] = useState<DiagnosticIssueRaw[] | null>(null);
  const [running, setRunning] = useState(false);
  const [fixing, setFixing] = useState<string | null>(null);
  const [confirmIssue, setConfirmIssue] = useState<DiagnosticIssueRaw | null>(null);

  async function handleRun() {
    setRunning(true);
    setIssues(null);
    try {
      setIssues(await runDiagnostics());
    } finally {
      setRunning(false);
    }
  }

  async function handleFix(issue: DiagnosticIssueRaw) {
    setFixing(issue.kind + issue.ids[0]);
    try {
      await applyDiagnosticFix(issue);
      setIssues(await runDiagnostics());
    } finally {
      setFixing(null);
      setConfirmIssue(null);
    }
  }

  const autoFixable = issues?.filter((i) => i.canAutoFix) ?? [];
  const hasIssues = (issues?.length ?? 0) > 0;

  return (
    <>
      <SectionHeader title="diagnostics" />

      <View style={[s.diagInfoBox, { paddingHorizontal: hp }]}>
        <Text style={[s.diagInfoTitle, { fontSize: r(8, 10) }]}>
          checks (mirrors Actual Budget's fix-split-transactions):
        </Text>
        {Object.values(DIAG_META).map((m) => (
          <Text key={m.label} style={[s.diagInfoRow, { fontSize: r(8, 9) }]}>
            · {m.detail}
          </Text>
        ))}
      </View>

      <View style={[s.btnRow, { paddingHorizontal: hp }]}>
        <Pressable
          style={[s.btn, s.btnSecondary, running && s.btnDisabled]}
          onPress={handleRun}
          disabled={running}
        >
          {running ? (
            <ActivityIndicator size="small" color={colors.t2} />
          ) : (
            <Text style={[s.btnTextSecondary, { fontSize: r(9, 11) }]}>⬡ run diagnostics</Text>
          )}
        </Pressable>
      </View>

      {issues !== null && (
        <View style={[s.diagSummary, { paddingHorizontal: hp }]}>
          {issues.length === 0 ? (
            <Text style={[s.diagOkText, { fontSize: r(9, 11) }]}>✓ no issues found</Text>
          ) : (
            <>
              <Text style={[s.diagSummaryTitle, { fontSize: r(8, 10) }]}>
                {issues.length} issue{issues.length > 1 ? 's' : ''} found
                {autoFixable.length > 0 ? ` · ${autoFixable.length} auto-fixable` : ''}
              </Text>
              {Object.entries(DIAG_META).map(([kind, meta]) => {
                const count = issues
                  .filter((i) => i.kind === kind)
                  .reduce((sum, i) => sum + i.ids.length, 0);
                if (count === 0) return null;
                return (
                  <Text key={kind} style={[s.diagSummaryRow, { fontSize: r(8, 9) }]}>
                    {count} {meta.label}
                  </Text>
                );
              })}
            </>
          )}
        </View>
      )}

      {hasIssues &&
        issues!.map((issue, i) => {
          const fixId = issue.kind + issue.ids[0];
          const isBusy = fixing === fixId;
          return (
            <View key={fixId + i} style={[s.diagCard, { marginHorizontal: hp }]}>
              <Text style={[s.diagTitle, { fontSize: r(9, 11) }]}>{issue.description}</Text>
              {issue.rows.map((row, ri) => (
                <View key={ri} style={s.diagRow}>
                  <Text style={[s.diagRowLabel, { fontSize: r(8, 9) }]}>{row.label}</Text>
                  <Text style={[s.diagRowValue, { fontSize: r(8, 9) }]}>{row.value}</Text>
                </View>
              ))}
              <View style={s.diagFixRow}>
                <Text style={[s.diagFixDesc, { fontSize: r(8, 10) }]}>{issue.fixDescription}</Text>
                {issue.canAutoFix ? (
                  <Pressable
                    style={[s.diagFixBtn, isBusy && s.btnDisabled]}
                    onPress={() => setConfirmIssue(issue)}
                    disabled={isBusy || fixing !== null}
                  >
                    {isBusy ? (
                      <ActivityIndicator size="small" color={colors.amber} />
                    ) : (
                      <Text style={[s.diagFixBtnText, { fontSize: r(8, 10) }]}>fix</Text>
                    )}
                  </Pressable>
                ) : (
                  <View style={s.diagManualTag}>
                    <Text style={[s.diagManualText, { fontSize: r(7, 9) }]}>manual</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}

      <ConfirmModal
        visible={confirmIssue !== null}
        icon="⚠️"
        title="Apply fix"
        message={confirmIssue?.fixDescription ?? ''}
        confirmLabel="Apply"
        cancelLabel="Cancel"
        variant="warning"
        onConfirm={() => {
          if (confirmIssue) handleFix(confirmIssue);
        }}
        onCancel={() => setConfirmIssue(null)}
      />
    </>
  );
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    ...settingsStyleBase(C),

    btnDisabled: { opacity: 0.45 },
    btnDanger: {
      backgroundColor: C.redBg,
      borderWidth: 1,
      borderColor: C.redBorder,
      borderRadius: Radius.sm,
      paddingVertical: 9,
      alignItems: 'center',
    },
    btnTextDanger: {
      fontFamily: Typography.monoSB,
      letterSpacing: 0.8,
      color: C.redL,
    },

    // Sync
    syncRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      backgroundColor: C.s1,
      borderBottomWidth: 1,
      borderBottomColor: C.b0,
      gap: 10,
    },
    syncInfo: { flex: 1 },
    syncLabel: {
      fontFamily: Typography.monoSB,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: C.t3,
      marginBottom: 2,
    },
    syncValue: {
      fontFamily: Typography.mono,
      color: C.t1,
    },
    syncBtn: {
      backgroundColor: C.amberBg2,
      borderWidth: 1,
      borderColor: C.b2,
      borderRadius: Radius.sm,
      paddingHorizontal: 14,
      paddingVertical: 7,
      minWidth: 80,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    syncBtnDisabled: { opacity: 0.45 },
    syncBtnText: {
      fontFamily: Typography.monoSB,
      letterSpacing: 0.5,
      color: C.amber,
    },
    repairHint: {
      paddingVertical: 6,
      backgroundColor: C.s1,
      borderBottomWidth: 1,
      borderBottomColor: C.b0,
    },
    hintText: {
      fontFamily: Typography.mono,
      color: C.t3,
      lineHeight: 18,
    },

    // Diagnostics
    diagOkText: {
      fontFamily: Typography.monoSB,
      color: C.green,
      letterSpacing: 0.5,
    },
    diagCard: {
      marginTop: 8,
      backgroundColor: C.s1,
      borderWidth: 1,
      borderColor: C.b1,
      borderRadius: Radius.sm,
      padding: 12,
      gap: 6,
    },
    diagTitle: {
      fontFamily: Typography.mono,
      color: C.t1,
      lineHeight: 16,
    },
    diagRow: {
      flexDirection: 'row',
      gap: 8,
    },
    diagRowLabel: {
      fontFamily: Typography.mono,
      color: C.t3,
      minWidth: 60,
    },
    diagRowValue: {
      fontFamily: Typography.mono,
      color: C.t2,
      flex: 1,
    },
    diagFixRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 4,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: C.b0,
    },
    diagFixDesc: {
      fontFamily: Typography.mono,
      color: C.t3,
      flex: 1,
      lineHeight: 14,
    },
    diagFixBtn: {
      backgroundColor: C.amberBg,
      borderWidth: 1,
      borderColor: C.amberBorder,
      borderRadius: Radius.sm,
      paddingHorizontal: 12,
      paddingVertical: 6,
      minWidth: 44,
      alignItems: 'center',
    },
    diagFixBtnText: {
      fontFamily: Typography.monoSB,
      letterSpacing: 0.5,
      color: C.amber,
      textTransform: 'uppercase',
    },
    diagInfoBox: {
      paddingVertical: 10,
      backgroundColor: C.s1,
      borderBottomWidth: 1,
      borderBottomColor: C.b0,
      gap: 4,
    },
    diagInfoTitle: {
      fontFamily: Typography.monoSB,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: C.t3,
      marginBottom: 4,
    },
    diagInfoRow: {
      fontFamily: Typography.mono,
      color: C.t3,
      lineHeight: 17,
    },
    diagSummary: {
      paddingVertical: 10,
      backgroundColor: C.s1,
      borderBottomWidth: 1,
      borderBottomColor: C.b0,
      gap: 3,
    },
    diagSummaryTitle: {
      fontFamily: Typography.monoSB,
      letterSpacing: 0.5,
      color: C.amberL,
      marginBottom: 4,
    },
    diagSummaryRow: {
      fontFamily: Typography.mono,
      color: C.t2,
      lineHeight: 16,
    },
    diagManualTag: {
      backgroundColor: C.s2,
      borderWidth: 1,
      borderColor: C.b1,
      borderRadius: Radius.sm,
      paddingHorizontal: 10,
      paddingVertical: 5,
      alignItems: 'center',
    },
    diagManualText: {
      fontFamily: Typography.monoSB,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: C.t3,
    },
  });
}
