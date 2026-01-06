import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useMemo,
} from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  SectionList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type {
  DimensionValue,
  StyleProp,
  ViewStyle,
  ScrollViewProps,
  FlatListProps,
  SectionListProps,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedScrollHandler } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { useTheme } from '@/contexts/theme';
import type { ThemeColors } from '@/constants/tokens';
import { Radius, Overlay } from '@/constants/tokens';
import { useR } from '@/hooks/useR';
import { useBottomSheet } from '@/hooks/useBottomSheet';

const AnimatedSectionList = Animated.createAnimatedComponent(SectionList);

export interface BottomSheetRef {
  close: (cb?: () => void) => void;
}

interface BottomSheetCtx {
  panRef: React.RefObject<any>;
  nativeRef: React.RefObject<any>;
  scrollY: SharedValue<number>;
  scrollRef: any; // AnimatedRef
  hasScrollChild: SharedValue<boolean>;
}

const BottomSheetContext = createContext<BottomSheetCtx | null>(null);

function useSheetCtx() {
  const ctx = useContext(BottomSheetContext);
  if (!ctx) throw new Error('BottomSheet scroll components must be inside BottomSheetModal');
  return ctx;
}

function useScrollCoordination() {
  const { panRef, nativeRef, scrollY, scrollRef, hasScrollChild } = useSheetCtx();

  useEffect(() => {
    hasScrollChild.value = true;
    return () => { hasScrollChild.value = false; };
  }, [hasScrollChild]);

  const nativeGesture = Gesture.Native()
    .withRef(nativeRef)
    .simultaneousWithExternalGesture(panRef);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  return { nativeGesture, scrollHandler, scrollRef };
}

interface Props {
  visible: boolean;
  onDismiss: () => void;
  title?: string;
  maxHeight?: DimensionValue;
  paddingHorizontal?: number;
  sheetStyle?: StyleProp<ViewStyle>;
  statusBarTranslucent?: boolean;
  keyboardAvoiding?: boolean;
  children: React.ReactNode;
}

export const BottomSheetModal = forwardRef<BottomSheetRef, Props>(function BottomSheetModal(
  {
    visible,
    onDismiss,
    title,
    maxHeight = '70%',
    paddingHorizontal,
    sheetStyle: sheetStyleProp,
    statusBarTranslucent,
    keyboardAvoiding,
    children,
  },
  ref,
) {
  const { r } = useR();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const {
    open,
    close,
    panGesture,
    panRef,
    nativeRef,
    scrollY,
    scrollRef,
    hasScrollChild,
    sheetStyle: animStyle,
    overlayStyle,
  } = useBottomSheet(onDismiss);

  useImperativeHandle(ref, () => ({ close }), [close]);

  useEffect(() => {
    if (visible) open();
  }, [visible, open]);

  const tapDismiss = useCallback(() => close(), [close]);

  const ctxValue = useMemo<BottomSheetCtx>(
    () => ({ panRef, nativeRef, scrollY, scrollRef, hasScrollChild }),
    [panRef, nativeRef, scrollY, scrollRef, hasScrollChild],
  );

  const inner = (
    <>
      <Animated.View
        style={[StyleSheet.absoluteFill, s.overlayBg, overlayStyle]}
        pointerEvents="none"
      />
      <Pressable style={s.backdrop} onPress={tapDismiss} />

      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            s.sheet,
            { maxHeight },
            paddingHorizontal != null ? { paddingHorizontal } : null,
            sheetStyleProp,
            animStyle,
          ]}
        >
          <View style={s.handleBar}>
            <View style={s.handlePill} />
          </View>

          {title != null && (
            <View style={s.header}>
              <Text style={[s.title, { fontSize: r(12, 14) }]}>{title}</Text>
              <Pressable onPress={tapDismiss} hitSlop={12}>
                <Text style={[s.closeBtn, { fontSize: r(12, 14) }]}>✕</Text>
              </Pressable>
            </View>
          )}

          <BottomSheetContext.Provider value={ctxValue}>
            {children}
          </BottomSheetContext.Provider>
        </Animated.View>
      </GestureDetector>
    </>
  );

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      statusBarTranslucent={statusBarTranslucent}
      onRequestClose={tapDismiss}
    >
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={s.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {inner}
        </KeyboardAvoidingView>
      ) : (
        <View style={s.container}>{inner}</View>
      )}
    </Modal>
  );
});

type BSScrollViewProps = ScrollViewProps & { children?: React.ReactNode };

export function BottomSheetScrollView({ children, style, ...props }: BSScrollViewProps) {
  const { nativeGesture, scrollHandler, scrollRef } = useScrollCoordination();

  return (
    <GestureDetector gesture={nativeGesture}>
      <Animated.ScrollView
        ref={scrollRef}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        style={style}
        {...props}
      >
        {children}
      </Animated.ScrollView>
    </GestureDetector>
  );
}

export function BottomSheetFlatList<T>(props: FlatListProps<T>) {
  const { nativeGesture, scrollHandler, scrollRef } = useScrollCoordination();

  return (
    <GestureDetector gesture={nativeGesture}>
      <Animated.FlatList
        ref={scrollRef as any}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        {...(props as any)}
      />
    </GestureDetector>
  );
}

export function BottomSheetSectionList<T, S>(props: SectionListProps<T, S>) {
  const { nativeGesture, scrollHandler, scrollRef } = useScrollCoordination();

  return (
    <GestureDetector gesture={nativeGesture}>
      <AnimatedSectionList
        ref={scrollRef as any}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        {...(props as any)}
      />
    </GestureDetector>
  );
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'flex-end',
    } as any,
    overlayBg: {
      backgroundColor: Overlay.heavy,
    },
    backdrop: {
      flex: 1,
    },
    sheet: {
      backgroundColor: C.s1,
      borderTopLeftRadius: Radius.xxl,
      borderTopRightRadius: Radius.xxl,
      paddingTop: 10,
      paddingBottom: 32,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 24,
    },
    handleBar: {
      alignItems: 'center',
      paddingTop: 4,
      paddingBottom: 12,
    },
    handlePill: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: C.t4,
      opacity: 0.5,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    title: {
      fontFamily: 'OverpassMono_700Bold',
      color: C.amber,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    closeBtn: {
      fontFamily: 'NunitoSans_700Bold',
      color: C.t2,
    },
  });
}
