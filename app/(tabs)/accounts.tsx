import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  RefreshControl,
} from 'react-native';
import { useMemo, useState, useCallback } from 'react';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { tap, tapMedium } from '@/utils/haptics';
import { LottieLoader } from '@/components/shared/LottieLoader';
import { SkiaSparkline } from '@/components/shared/SkiaSparkline';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBar } from '@/components/shared/AppBar';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { useTheme } from '@/contexts/theme';
import type { ThemeColors } from '@/constants/tokens';
import { useR } from '@/hooks/useR';
import { fmt, type Account } from '@/constants/types';
import { useBudget } from '@/contexts/budget';
import { ANIM_ROW_ENTER, ANIM_ROW_STAGGER, ANIM_STAGGER_CAP } from '@/constants/animations';
import { AccountActionSheet } from '@/components/accounts/AccountActionSheet';
import { RenameAccountModal } from '@/components/accounts/RenameAccountModal';
import { CreateAccountSheet } from '@/components/accounts/CreateAccountSheet';
import { AccountRow } from '@/components/accounts/AccountRow';

function AccountSparkline({ data }: { data: number[] }) {
  const { r, hp, width } = useR();
  const { colors } = useTheme();
  if (data.length < 2) return null;
  return (
    <View style={{ marginTop: 8 }}>
      <SkiaSparkline
        data={data}
        width={width - hp * 2}
        height={r(32, 44)}
        lineColor={colors.amber}
        fillGradient={[colors.amberBg2, 'transparent']}
      />
    </View>
  );
}

function NetWorthHero() {
  const { hp, r } = useR();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { netWorth, totalAssets, totalLiabilities, netWorthHistory, accounts } = useBudget();

  const onBudgetNW = useMemo(
    () => accounts.reduce((sum, a) => (a.onBudget ? sum + a.balance : sum), 0),
    [accounts],
  );
  const offBudgetNW = useMemo(
    () => accounts.reduce((sum, a) => (!a.onBudget ? sum + a.balance : sum), 0),
    [accounts],
  );

  return (
    <View style={[s.nwHero, { paddingHorizontal: hp }]}>
      <Text style={[s.nwLabel, { fontSize: r(8, 10) }]}>total net worth</Text>
      <Text style={[s.nwAmount, { fontSize: r(36, 44), lineHeight: r(46, 54) }]}>
        {Math.abs(netWorth).toFixed(2)}
      </Text>
      <View style={s.nwRow}>
        <View style={s.nwStat}>
          <Text style={[s.nwStatLabel, { fontSize: r(8, 10) }]}>assets</Text>
          <Text style={[s.nwStatVal, { color: colors.green, fontSize: r(14, 16) }]}>
            {fmt(totalAssets)}
          </Text>
        </View>
        <View style={s.nwStat}>
          <Text style={[s.nwStatLabel, { fontSize: r(8, 10) }]}>liabilities</Text>
          <Text style={[s.nwStatVal, { color: colors.redL, fontSize: r(14, 16) }]}>
            {fmt(totalLiabilities)}
          </Text>
        </View>
      </View>
      <View style={[s.nwRow, { marginTop: 10 }]}>
        <View style={s.nwStat}>
          <Text style={[s.nwStatLabel, { fontSize: r(8, 10) }]}>on-budget</Text>
          <Text style={[s.nwStatVal, { color: onBudgetNW >= 0 ? colors.t0 : colors.redL, fontSize: r(13, 15) }]}>
            {fmt(onBudgetNW)}
          </Text>
        </View>
        <View style={s.nwStat}>
          <Text style={[s.nwStatLabel, { fontSize: r(8, 10) }]}>off-budget</Text>
          <Text style={[s.nwStatVal, { color: offBudgetNW >= 0 ? colors.t0 : colors.redL, fontSize: r(13, 15) }]}>
            {fmt(offBudgetNW)}
          </Text>
        </View>
      </View>
      <AccountSparkline data={netWorthHistory} />
    </View>
  );
}

function BudgetStrip() {
  const { hp, r } = useR();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { budgetSummary } = useBudget();
  return (
    <View style={[s.budgetStrip, { paddingHorizontal: hp }]}>
      <View style={s.bsCell}>
        <Text style={[s.bsLabel, { fontSize: r(8, 10) }]}>budgeted</Text>
        <Text style={[s.bsVal, { color: colors.t2, fontSize: r(13, 15) }]}>
          {fmt(budgetSummary.budgeted)}
        </Text>
      </View>
      <View style={[s.bsCell, { alignItems: 'center' }]}>
        <Text style={[s.bsLabel, { fontSize: r(8, 10) }]}>activity</Text>
        <Text style={[s.bsVal, { color: colors.redL, fontSize: r(13, 15) }]}>
          {fmt(budgetSummary.activity)}
        </Text>
      </View>
      <View style={[s.bsCell, { alignItems: 'flex-end' }]}>
        <Text style={[s.bsLabel, { fontSize: r(8, 10) }]}>to budget</Text>
        <Text style={[s.bsVal, { color: colors.amber, fontSize: r(13, 15) }]}>
          {fmt(budgetSummary.toBudget)}
        </Text>
      </View>
    </View>
  );
}

function OffBudgetDivider() {
  const { hp, r } = useR();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[s.offBudget, { paddingHorizontal: hp }]}>
      <View style={s.offLine} />
      <Text style={[s.offLabel, { fontSize: r(8, 10) }]}>off-budget · tracking only</Text>
      <View style={s.offLine} />
    </View>
  );
}

function ClosedAccountsSection({
  accounts,
  onMenu,
}: {
  accounts: Account[];
  onMenu: (acct: Account) => void;
}) {
  const { r } = useR();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const [expanded, setExpanded] = useState(false);

  if (accounts.length === 0) return null;

  return (
    <>
      <Pressable
        style={[s.closedToggle, { borderTopColor: colors.b0, borderBottomColor: colors.b0 }]}
        onPress={() => {
          tap();
          setExpanded((v) => !v);
        }}
      >
        <Ionicons
          name={expanded ? 'chevron-down' : 'chevron-forward'}
          size={r(12, 14)}
          color={colors.t3}
        />
        <Text style={[s.closedToggleLabel, { fontSize: r(9, 11), color: colors.t3 }]}>
          {expanded ? 'Hide' : 'Show'} {accounts.length} closed account{accounts.length !== 1 ? 's' : ''}
        </Text>
      </Pressable>

      {expanded &&
        accounts.map((a, i) => (
          <MotiView
            key={a.id}
            from={{ opacity: 0, translateY: 4 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', delay: Math.min(i * ANIM_ROW_STAGGER, ANIM_STAGGER_CAP), duration: ANIM_ROW_ENTER }}
          >
            <AccountRow acct={a} onPress={() => {}} onMenu={() => onMenu(a)} dimmed />
          </MotiView>
        ))}
    </>
  );
}

export default function AccountsScreen() {
  const { r } = useR();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const {
    accounts,
    closedAccounts,
    loading,
    error,
    isOnline,
    pendingCount,
    lastSyncAt,
    syncing,
    sync: syncBudget,
    setActiveAccountId,
    createAccount,
    renameAccount,
    closeAccount,
    reopenAccount,
    deleteAccount,
  } = useBudget();

  const onBudget = useMemo(() => accounts.filter((a) => a.onBudget), [accounts]);
  const offBudget = useMemo(() => accounts.filter((a) => !a.onBudget), [accounts]);

  const [sheetAccount, setSheetAccount] = useState<Account | null>(null);
  const [renameAccount_, setRenameAccount] = useState<Account | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const openMenu = useCallback((acct: Account) => {
    tap();
    setSheetAccount(acct);
  }, []);

  const handleRowPress = useCallback((acct: Account) => {
    if (acct.closed) return;
    setActiveAccountId(acct.id);
    router.push('/(tabs)/ledger');
  }, [setActiveAccountId, router]);

  const startRename = useCallback(() => {
    const acct = sheetAccount;
    setSheetAccount(null);
    setTimeout(() => setRenameAccount(acct), 240);
  }, [sheetAccount]);

  const handleToggleClose = useCallback(async () => {
    if (!sheetAccount) return;
    const acct = sheetAccount;
    setSheetAccount(null);
    try {
      if (acct.closed) {
        await reopenAccount(acct.id);
      } else {
        await closeAccount(acct.id);
      }
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Operation failed');
    }
  }, [sheetAccount, closeAccount, reopenAccount]);

  const handleDelete = useCallback(() => {
    if (!sheetAccount) return;
    const acct = sheetAccount;
    setSheetAccount(null);
    setTimeout(() => {
      Alert.alert(
        'Delete Account',
        `Delete "${acct.name}"?\n\nAll ${acct.name} transactions will be permanently deleted. This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteAccount(acct.id);
              } catch (e) {
                Alert.alert('Error', e instanceof Error ? e.message : 'Delete failed');
              }
            },
          },
        ],
      );
    }, 240);
  }, [sheetAccount, deleteAccount]);

  const handleRenameConfirm = useCallback(async (newName: string) => {
    if (!renameAccount_) return;
    const acct = renameAccount_;
    setRenameAccount(null);
    try {
      await renameAccount(acct.id, newName);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Rename failed');
    }
  }, [renameAccount_, renameAccount]);

  const handleCreate = useCallback(async (
    name: string,
    type: Account['type'],
    onBudgetFlag: boolean,
    startingBalanceCents: number,
  ) => {
    setShowCreate(false);
    try {
      await createAccount(name, type, onBudgetFlag, startingBalanceCents);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Create failed');
    }
  }, [createAccount]);

  return (
    <SafeAreaView style={s.safe} edges={[]}>
      <AppBar
        badge="actual-budget"
        showSync
        lastSyncAt={lastSyncAt}
        syncing={syncing}
        onSync={syncBudget}
        isOnline={isOnline}
        pendingCount={pendingCount}
        right={
          <Pressable
            onPress={() => {
              tapMedium();
              setShowCreate(true);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ paddingVertical: 3, paddingHorizontal: 2 }}
          >
            <Ionicons name="add" size={r(20, 23)} color={colors.amber} />
          </Pressable>
        }
      />

      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={syncing} onRefresh={syncBudget} />}
      >
        <NetWorthHero />
        <BudgetStrip />

        {!!error && (
          <View style={[s.statusRow, { backgroundColor: colors.redBg }]}>
            <Text style={{ fontFamily: 'OverpassMono_400Regular', fontSize: r(9, 11), color: colors.redL, flex: 1 }}>
              {error}
            </Text>
          </View>
        )}

        <SectionHeader title="on-budget accounts" />
        {loading && onBudget.length === 0 && (
          <View style={s.statusRow}>
            <LottieLoader size={28} />
          </View>
        )}
        {onBudget.map((a, i) => (
          <MotiView
            key={a.id}
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', delay: Math.min(i * ANIM_ROW_STAGGER, ANIM_STAGGER_CAP), duration: ANIM_ROW_ENTER }}
          >
            <AccountRow acct={a} onPress={() => handleRowPress(a)} onMenu={() => openMenu(a)} />
          </MotiView>
        ))}

        {offBudget.length > 0 && (
          <>
            <OffBudgetDivider />
            {offBudget.map((a, i) => (
              <MotiView
                key={a.id}
                from={{ opacity: 0, translateY: 8 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', delay: Math.min(i * ANIM_ROW_STAGGER, ANIM_STAGGER_CAP), duration: ANIM_ROW_ENTER }}
              >
                <AccountRow acct={a} onPress={() => handleRowPress(a)} onMenu={() => openMenu(a)} />
              </MotiView>
            ))}
          </>
        )}

        <ClosedAccountsSection accounts={closedAccounts} onMenu={openMenu} />

        <View style={{ height: 24 }} />
      </ScrollView>

      <AccountActionSheet
        account={sheetAccount}
        onDismiss={() => setSheetAccount(null)}
        onRename={startRename}
        onToggleClose={handleToggleClose}
        onDelete={handleDelete}
      />

      <RenameAccountModal
        account={renameAccount_}
        onDismiss={() => setRenameAccount(null)}
        onSave={handleRenameConfirm}
      />

      <CreateAccountSheet
        visible={showCreate}
        onDismiss={() => setShowCreate(false)}
        onCreate={handleCreate}
      />
    </SafeAreaView>
  );
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    scroll: { flex: 1 },

    nwHero: {
      paddingTop: 8,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: C.b0,
      backgroundColor: C.s0,
    },
    nwLabel: {
      fontFamily: 'OverpassMono_400Regular',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: C.t3,
      marginBottom: 2,
    },
    nwAmount: {
      fontFamily: 'NunitoSans_900Black',
      letterSpacing: -1.5,
      color: C.t0,
    },
    nwRow: { flexDirection: 'row', gap: 20, marginTop: 8 },
    nwStat: {},
    nwStatLabel: {
      fontFamily: 'OverpassMono_400Regular',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: C.t3,
      marginBottom: 1,
    },
    nwStatVal: { fontFamily: 'NunitoSans_800ExtraBold', letterSpacing: -0.3 },

    budgetStrip: {
      flexDirection: 'row',
      paddingVertical: 8,
      backgroundColor: C.s1,
      borderBottomWidth: 1,
      borderBottomColor: C.b0,
    },
    bsCell: { flex: 1 },
    bsLabel: {
      fontFamily: 'OverpassMono_400Regular',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: C.t3,
      marginBottom: 2,
    },
    bsVal: { fontFamily: 'NunitoSans_800ExtraBold', letterSpacing: -0.3 },

    offBudget: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 4,
      backgroundColor: C.s1,
      borderTopWidth: 1,
      borderTopColor: C.b0,
      borderBottomWidth: 1,
      borderBottomColor: C.b0,
    },
    offLine: { flex: 1, height: 1, backgroundColor: C.b0 },
    offLabel: {
      fontFamily: 'OverpassMono_400Regular',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: C.t3,
    },

    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 5,
      backgroundColor: C.s0,
      borderBottomWidth: 1,
      borderBottomColor: C.b0,
    },

    closedToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      backgroundColor: C.s1,
    },
    closedToggleLabel: {
      fontFamily: 'OverpassMono_400Regular',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
  });
}
