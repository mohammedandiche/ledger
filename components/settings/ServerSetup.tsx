import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useState, useMemo } from 'react';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { useTheme } from '@/contexts/theme';
import type { ThemeColors } from '@/constants/tokens';
import { Typography, Radius } from '@/constants/tokens';
import { useR } from '@/hooks/useR';
import { useAuth } from '@/contexts/auth';
import { getServerInfo, loginPassword, listFiles } from '@/constants/server';
import type { LoginMethod, BudgetFile } from '@/constants/server';
import { Field } from './Field';
import { settingsStyleBase } from './settingsStyles';

type Step = 'url' | 'auth' | 'files';

export function ServerSetup() {
  const { r, hp } = useR();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { state, dispatch } = useAuth();

  const [url, setUrl] = useState(state.url || '');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<Step>('url');
  const [method, setMethod] = useState<LoginMethod | null>(null);
  const [files, setFiles] = useState<BudgetFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleConnect() {
    setError('');
    if (!url.trim()) {
      setError('Enter a server URL.');
      return;
    }
    setLoading(true);
    try {
      const info = await getServerInfo(url.trim());
      const effectiveMethod: LoginMethod = info.loginMethod === 'header' ? 'header' : 'password';
      setMethod(effectiveMethod);
      dispatch({ type: 'SET_URL', url: url.trim() });
      if (effectiveMethod === 'header') {
        const fs = await listFiles(url.trim(), '');
        setFiles(fs);
        dispatch({ type: 'CONNECTED', method: effectiveMethod });
        dispatch({ type: 'SET_FILES', files: fs });
        setStep('files');
      } else {
        setStep('auth');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to connect');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin() {
    setError('');
    if (!password) {
      setError('Enter your password.');
      return;
    }
    setLoading(true);
    try {
      const serverUrl = url.trim();
      const tok = await loginPassword(serverUrl, password);
      dispatch({ type: 'CONNECTED', method: 'password', token: tok });
      const fs = await listFiles(serverUrl, tok);
      setFiles(fs);
      dispatch({ type: 'SET_FILES', files: fs });
      setStep('files');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  function handleSelectFile(id: string, name: string) {
    dispatch({ type: 'SELECT_FILE', id, name });
  }

  function reset() {
    setStep('url');
    setMethod(null);
    setFiles([]);
    setError('');
    setPassword('');
  }

  return (
    <>
      <SectionHeader title="server" />
      <Field
        label="server url"
        value={url}
        onChange={setUrl}
        placeholder="http://192.168.1.42:5006"
        keyboardType="url"
        editable={step === 'url'}
      />

      {step === 'url' && (
        <View style={[s.btnRow, { paddingHorizontal: hp }]}>
          <Pressable style={s.btn} onPress={handleConnect} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color={colors.amber} />
            ) : (
              <Text style={[s.btnText, { fontSize: r(10, 12) }]}>connect →</Text>
            )}
          </Pressable>
        </View>
      )}

      {step !== 'url' && (
        <>
          <SectionHeader title="authentication" />

          <View style={[s.methodRow, { paddingHorizontal: hp }]}>
            <View style={s.methodPill}>
              <Text style={[s.methodPillText, { fontSize: r(8, 10) }]}>
                {method === 'header' ? 'proxy / header' : 'password'}
              </Text>
            </View>
            <View style={s.methodActions}>
              <Pressable onPress={reset}>
                <Text style={[s.resetLink, { fontSize: r(8, 10) }]}>change server</Text>
              </Pressable>
            </View>
          </View>

          {method === 'password' && step === 'auth' && (
            <>
              <Field
                label="password"
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                secure
              />
              <View style={[s.btnRow, { paddingHorizontal: hp }]}>
                <Pressable style={s.btn} onPress={handleLogin} disabled={loading}>
                  {loading ? (
                    <ActivityIndicator size="small" color={colors.amber} />
                  ) : (
                    <Text style={[s.btnText, { fontSize: r(10, 12) }]}>login →</Text>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </>
      )}

      {step === 'files' && (
        <>
          <SectionHeader
            title={files.length === 1 ? '1 budget file' : `${files.length} budget files`}
          />
          <View style={[s.envelopeNote, { paddingHorizontal: hp }]}>
            <Text style={[s.envelopeNoteText, { fontSize: r(8, 10) }]}>
              only envelope budgets are supported — tracking budgets are not compatible
            </Text>
          </View>
          {files.length === 0 ? (
            <View style={[s.emptyNote, { paddingHorizontal: hp }]}>
              <Text style={[s.emptyNoteText, { fontSize: r(9, 11) }]}>
                No budget files found on this server.
              </Text>
            </View>
          ) : (
            files.map((f) => {
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
                    handleSelectFile(f.fileId, f.name);
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
            })
          )}
        </>
      )}

      {!!error && (
        <View style={[s.errorRow, { paddingHorizontal: hp }]}>
          <Text style={[s.errorText, { fontSize: r(9, 11) }]}>{error}</Text>
        </View>
      )}
    </>
  );
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    ...settingsStyleBase(C),

    btnText: {
      fontFamily: Typography.monoSB,
      letterSpacing: 0.8,
      color: C.amber,
    },

    // Method pill
    methodRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      backgroundColor: C.s1,
      borderBottomWidth: 1,
      borderBottomColor: C.b0,
    },
    methodPill: {
      backgroundColor: C.amberBg,
      borderWidth: 1,
      borderColor: C.b1,
      borderRadius: Radius.sm,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    methodPillText: {
      fontFamily: Typography.monoSB,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: C.amberL,
    },
    methodActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    resetLink: {
      fontFamily: Typography.mono,
      color: C.t3,
      textDecorationLine: 'underline',
    },

  });
}
