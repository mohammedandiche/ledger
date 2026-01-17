import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useState, useMemo } from 'react';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { useTheme } from '@/contexts/theme';
import type { ThemeColors } from '@/constants/tokens';
import { Typography, Radius } from '@/constants/tokens';
import { useR } from '@/hooks/useR';
import { useAuth } from '@/contexts/auth';
import { listFiles } from '@/constants/server';
import { SyncControls, Diagnostics } from './SyncControls';
import { settingsStyleBase } from './settingsStyles';

export function ConnectedStatus() {
  const { r, hp } = useR();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { state, dispatch } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleRefresh() {
    setError('');
    setLoading(true);
    try {
      const fs = await listFiles(state.url, state.token ?? '');
      dispatch({ type: 'SET_FILES', files: fs });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Refresh failed');
    } finally {
      setLoading(false);
    }
  }

  function handleDisconnect() {
    Alert.alert('Disconnect', 'Remove server connection and saved credentials?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disconnect', style: 'destructive', onPress: () => dispatch({ type: 'LOGOUT' }) },
    ]);
  }

  return (
    <>
      <SectionHeader title="server" />
      <View style={[s.statusRow, { paddingHorizontal: hp }]}>
        <View style={s.statusDot} />
        <View style={s.statusInfo}>
          <Text style={[s.statusUrl, { fontSize: r(11, 13) }]} numberOfLines={1}>
            {state.url}
          </Text>
          <Text style={[s.statusMeta, { fontSize: r(8, 10) }]}>
            {state.loginMethod} auth
            {state.activeFileName ? ` · ${state.activeFileName}` : ''}
          </Text>
        </View>
        <Pressable style={s.disconnectBtn} onPress={handleDisconnect}>
          <Text style={[s.disconnectText, { fontSize: r(8, 10) }]}>disconnect</Text>
        </Pressable>
      </View>

      <SectionHeader title="budget files" action={loading ? '…' : 'refresh'} />
      <View style={[s.envelopeNote, { paddingHorizontal: hp }]}>
        <Text style={[s.envelopeNoteText, { fontSize: r(8, 10) }]}>
          only envelope budgets are supported — tracking budgets are not compatible
        </Text>
      </View>

      {!loading &&
        state.files.map((f) => {
          const isEncrypted = !!f.encryptKeyId;
          const isActive = state.activeFileId === f.fileId;
          return (
            <Pressable
              key={f.fileId}
              style={[
                s.fileRow,
                { paddingHorizontal: hp },
                isActive && s.fileRowActive,
                isEncrypted && s.fileRowDisabled,
              ]}
              onPress={() => {
                if (isEncrypted) return;
                dispatch({ type: 'SELECT_FILE', id: f.fileId, name: f.name });
              }}
              disabled={isEncrypted}
            >
              <View style={[s.fileRadio, isActive && s.fileRadioActive]} />
              <View style={s.fileInfo}>
                <Text
                  style={[
                    s.fileName,
                    { fontSize: r(12, 14) },
                    isActive && s.fileNameActive,
                    isEncrypted && s.fileNameDisabled,
                  ]}
                >
                  {f.name}
                </Text>
                <Text style={[s.fileId, { fontSize: r(8, 10) }]} numberOfLines={1}>
                  {f.fileId}
                </Text>
              </View>
              {isEncrypted && (
                <Text style={[s.disabledTag, { fontSize: r(7, 9) }]}>encrypted</Text>
              )}
              {isActive && !isEncrypted && (
                <Text style={[s.activeTag, { fontSize: r(8, 10) }]}>active</Text>
              )}
            </Pressable>
          );
        })}

      {loading && (
        <View style={[s.emptyNote, { paddingHorizontal: hp }]}>
          <ActivityIndicator size="small" color={colors.amber} />
        </View>
      )}

      {!!error && (
        <View style={[s.errorRow, { paddingHorizontal: hp }]}>
          <Text style={[s.errorText, { fontSize: r(9, 11) }]}>{error}</Text>
        </View>
      )}

      <View style={[s.btnRow, { paddingHorizontal: hp, marginTop: 4 }]}>
        <Pressable style={[s.btn, s.btnSecondary]} onPress={handleRefresh} disabled={loading}>
          <Text style={[s.btnTextSecondary, { fontSize: r(9, 11) }]}>↻ refresh file list</Text>
        </Pressable>
      </View>

      {state.activeFileId && <SyncControls />}
      {state.activeFileId && <Diagnostics />}
    </>
  );
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    ...settingsStyleBase(C),

    // Connected status row
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      backgroundColor: C.s1,
      borderBottomWidth: 1,
      borderBottomColor: C.b0,
      gap: 8,
    },
    statusDot: {
      width: 7,
      height: 7,
      borderRadius: 99,
      backgroundColor: C.green,
      shadowColor: C.green,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.7,
      shadowRadius: 4,
      flexShrink: 0,
    },
    statusInfo: { flex: 1, minWidth: 0 },
    statusUrl: {
      fontFamily: Typography.mono,
      color: C.t0,
    },
    statusMeta: {
      fontFamily: Typography.mono,
      color: C.t3,
      marginTop: 2,
    },
    disconnectBtn: {
      borderWidth: 1,
      borderColor: C.redBorder,
      borderRadius: Radius.sm,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: C.redBg,
      flexShrink: 0,
    },
    disconnectText: {
      fontFamily: Typography.monoSB,
      letterSpacing: 0.5,
      color: C.redL,
    },
  });
}
