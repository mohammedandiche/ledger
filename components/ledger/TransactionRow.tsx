import React, { useCallback, useEffect, useMemo, useRef, memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { tap, tapMedium } from '@/utils/haptics';
import { useTheme } from '@/contexts/theme';
import { useR } from '@/hooks/useR';
import { fmt, type Transaction } from '@/constants/types';
import type { ThemeColors } from '@/constants/tokens';
import { ClearedDot } from './ClearedDot';

const ACTION_WIDTH = 80;
const SNAP_THRESHOLD = 35;
const AUTO_TRIGGER_DISTANCE = 140;
const AUTO_TRIGGER_VELOCITY = 800;
const SPRING_CONFIG = { damping: 20, stiffness: 200, mass: 0.8 };

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    txRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: C.bw2,
      gap: 0,
    },
    txScheduled: { backgroundColor: 'rgba(88,128,160,0.04)' },
    txScheduledAccent: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 2,
      backgroundColor: C.blue,
    },
    txBody: { flex: 1, paddingHorizontal: 8, minWidth: 0 },
    txPayee: { fontFamily: 'NunitoSans_700Bold', color: C.t0 },
    txPayeeChild: { fontFamily: 'NunitoSans_600SemiBold', color: C.t1 },
    txCat: { fontFamily: 'OverpassMono_400Regular', color: C.t3, marginTop: 1 },
    txCatSplit: { color: C.amberD },
    txCatUncat: { color: C.red },
    txCatChild: { color: C.t2, marginTop: 0 },
    txNote: { fontFamily: 'OverpassMono_400Regular', color: C.t4, marginTop: 2 },
    txChildRow: { backgroundColor: C.bw2 },
    childAccent: { height: 6, borderRadius: 1, backgroundColor: C.t4, flexShrink: 0 },
    txAmount: { fontFamily: 'OverpassMono_600SemiBold', textAlign: 'right' },
    txOut: { color: C.redL },
    txIn: { color: C.greenL },
    txRunning: { fontFamily: 'OverpassMono_400Regular', color: C.t2, textAlign: 'right' },
  });
}

function makeSwipeStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { overflow: 'hidden' },
    actionsRow: { flex: 1, flexDirection: 'row', alignItems: 'stretch' },
    actionBtn: { width: ACTION_WIDTH },
    actionPressable: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 4 },
    actionText: {
      fontFamily: 'OverpassMono_700Bold',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    foreground: { backgroundColor: C.bg },
  });
}

const PRESS_IN_SPRING = { damping: 20, stiffness: 400, mass: 0.8 };
const PRESS_OUT_SPRING = { damping: 20, stiffness: 280, mass: 0.8 };

const TxRow = memo(function TxRow({
  tx,
  showAccount,
  onPress,
}: {
  tx: Transaction;
  showAccount?: boolean;
  onPress?: (tx: Transaction) => void;
}) {
  const { hp, r } = useR();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const amtW = r(70, 88);
  const runW = r(76, 94);
  const isOut = tx.amount < 0;
  const isSplit = tx.categoryType === 'split';
  const isUncat = tx.categoryType === 'uncategorised';
  const isChild = tx.isChild === true;

  const pressScale = useSharedValue(1);
  const pressAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const content = (
    <>
      {tx.scheduled && <View style={s.txScheduledAccent} />}
      {isChild ? (
        <View style={[s.childAccent, { width: r(6, 7) }]} />
      ) : (
        <ClearedDot status={tx.cleared} />
      )}
      <View style={s.txBody}>
        <Text
          style={[
            s.txPayee,
            isChild && s.txPayeeChild,
            { fontSize: isChild ? r(12, 14) : r(13, 15) },
            tx.scheduled && { opacity: 0.5 },
          ]}
          numberOfLines={1}
        >
          {tx.payee}
        </Text>
        <Text
          style={[
            s.txCat,
            { fontSize: r(10, 11) },
            isSplit && s.txCatSplit,
            isUncat && s.txCatUncat,
            isChild && s.txCatChild,
            tx.scheduled && { opacity: 0.5 },
          ]}
          numberOfLines={1}
        >
          {tx.category}
          {showAccount && !isChild && tx.accountName ? `  ·  ${tx.accountName}` : ''}
        </Text>
        {!!tx.notes && (
          <Text style={[s.txNote, { fontSize: r(9, 10) }]} numberOfLines={1}>
            {tx.notes}
          </Text>
        )}
      </View>
      <Text
        style={[
          s.txAmount,
          { width: amtW, fontSize: r(12, 14) },
          isOut ? s.txOut : s.txIn,
          isChild && { opacity: 0.75 },
          tx.scheduled && { opacity: 0.45 },
        ]}
      >
        {fmt(tx.amount)}
      </Text>
      <Text
        style={[
          s.txRunning,
          { width: runW, fontSize: r(12, 14) },
          tx.scheduled && { opacity: 0.35 },
        ]}
      >
        {isChild ? '—' : tx.runningBalance.toFixed(2)}
      </Text>
    </>
  );

  const rowStyle = [
    s.txRow,
    isChild && s.txChildRow,
    tx.scheduled && s.txScheduled,
    { paddingLeft: isChild ? hp + r(20, 24) : hp, paddingRight: hp },
  ];

  if (onPress && !tx.scheduled) {
    return (
      <Animated.View style={pressAnimStyle}>
        <Pressable
          style={({ pressed }) => [rowStyle, pressed && { backgroundColor: colors.s2 }]}
          onPress={() => onPress(tx)}
          onPressIn={() => { pressScale.value = withSpring(0.975, PRESS_IN_SPRING); }}
          onPressOut={() => { pressScale.value = withSpring(1, PRESS_OUT_SPRING); }}
        >
          {content}
        </Pressable>
      </Animated.View>
    );
  }
  return <View style={rowStyle}>{content}</View>;
});

export const TransactionRow = memo(function TransactionRow({
  tx,
  showAccount,
  onPress,
  onDelete,
}: {
  tx: Transaction;
  showAccount?: boolean;
  onPress?: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
}) {
  const { r } = useR();
  const { colors } = useTheme();
  const ss = useMemo(() => makeSwipeStyles(colors), [colors]);
  const isScheduled = !!tx.scheduled;
  const isChild = !!tx.isChild;

  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);
  const isOpenRef = useRef(false);

  // Reset swipe state when FlashList recycles this component for a different item
  useEffect(() => {
    translateX.value = 0;
    startX.value = 0;
    isOpenRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tx.id]);

  const markOpen = useCallback(() => {
    isOpenRef.current = true;
  }, []);
  const markClosed = useCallback(() => {
    isOpenRef.current = false;
  }, []);

  const close = useCallback(() => {
    translateX.value = withSpring(0, SPRING_CONFIG);
    isOpenRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRightSwipeAction = useCallback(() => {
    if (!isChild) onDelete(tx);
  }, [tx, isChild, onDelete]);

  const handleLeftSwipeAction = useCallback(() => {
    onPress?.(tx);
  }, [tx, onPress]);

  const handleRowPress = useCallback(() => {
    if (isOpenRef.current) {
      translateX.value = withSpring(0, SPRING_CONFIG);
      isOpenRef.current = false;
      return;
    }
    tap();
    onPress?.(tx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tx, onPress]);

  const handleAutoTriggerRight = useCallback(() => {
    isOpenRef.current = false;
    tapMedium();
    // Small delay so the spring-back starts before the item is potentially removed
    setTimeout(handleRightSwipeAction, 120);
  }, [handleRightSwipeAction]);

  const handleAutoTriggerLeft = useCallback(() => {
    isOpenRef.current = false;
    tap();
    setTimeout(handleLeftSwipeAction, 120);
  }, [handleLeftSwipeAction]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-15, 15])
    .onStart(() => {
      'worklet';
      startX.value = translateX.value;
    })
    .onUpdate((e) => {
      'worklet';
      const raw = startX.value + e.translationX;
      const maxRight = isChild ? 0 : AUTO_TRIGGER_DISTANCE + 30;
      translateX.value = Math.max(-(AUTO_TRIGGER_DISTANCE + 30), Math.min(maxRight, raw));
    })
    .onEnd((e) => {
      'worklet';
      const absX = Math.abs(translateX.value);
      const swipedRight = translateX.value > 0;
      const swipedLeft = translateX.value < 0;

      if (
        swipedRight &&
        (absX > AUTO_TRIGGER_DISTANCE ||
          (absX > SNAP_THRESHOLD && e.velocityX > AUTO_TRIGGER_VELOCITY))
      ) {
        translateX.value = withSpring(0, SPRING_CONFIG);
        runOnJS(handleAutoTriggerRight)();
      } else if (
        swipedLeft &&
        (absX > AUTO_TRIGGER_DISTANCE ||
          (absX > SNAP_THRESHOLD && -e.velocityX > AUTO_TRIGGER_VELOCITY))
      ) {
        translateX.value = withSpring(0, SPRING_CONFIG);
        runOnJS(handleAutoTriggerLeft)();
      } else if (swipedLeft && absX > SNAP_THRESHOLD) {
        translateX.value = withSpring(-ACTION_WIDTH, SPRING_CONFIG);
        runOnJS(markOpen)();
      } else if (swipedRight && absX > SNAP_THRESHOLD) {
        translateX.value = withSpring(ACTION_WIDTH, SPRING_CONFIG);
        runOnJS(markOpen)();
      } else {
        translateX.value = withSpring(0, SPRING_CONFIG);
        runOnJS(markClosed)();
      }
    });

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));

  const rightSwipeActionStyle = useAnimatedStyle(() => {
    'worklet';
    return { opacity: Math.min(1, Math.max(0, translateX.value / ACTION_WIDTH)) };
  });
  const leftSwipeActionStyle = useAnimatedStyle(() => {
    'worklet';
    return { opacity: Math.min(1, Math.max(0, -translateX.value / ACTION_WIDTH)) };
  });

  if (isScheduled) {
    return <TxRow tx={tx} showAccount={showAccount} />;
  }

  return (
    <View style={ss.container}>
      <View style={StyleSheet.absoluteFill}>
        <View style={ss.actionsRow}>
          {!isChild && (
            <Animated.View
              style={[
                ss.actionBtn,
                { backgroundColor: colors.redBg },
                rightSwipeActionStyle,
              ]}
            >
              <Pressable
                style={ss.actionPressable}
                hitSlop={12}
                onPress={() => {
                  close();
                  handleRightSwipeAction();
                }}
              >
                <Ionicons name="trash-outline" size={r(17, 20)} color={colors.redL} />
                <Text style={[ss.actionText, { fontSize: r(8, 10), color: colors.redL }]}>
                  delete
                </Text>
              </Pressable>
            </Animated.View>
          )}
          <View style={{ flex: 1 }} />
          <Animated.View
            style={[
              ss.actionBtn,
              { backgroundColor: colors.amberBg },
              leftSwipeActionStyle,
            ]}
          >
            <Pressable
              style={ss.actionPressable}
              hitSlop={12}
              onPress={() => {
                close();
                handleLeftSwipeAction();
              }}
            >
              <Ionicons name="pencil-outline" size={r(17, 20)} color={colors.amber} />
              <Text style={[ss.actionText, { fontSize: r(8, 10), color: colors.amber }]}>edit</Text>
            </Pressable>
          </Animated.View>
        </View>
      </View>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[ss.foreground, rowStyle]}>
          <TxRow tx={tx} showAccount={showAccount} onPress={handleRowPress} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
});
