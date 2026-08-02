import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { withAlpha } from '@/lib/utils';

export const serifFont = 'InstrumentSerif_400Regular';
export const sansFont = 'Outfit_400Regular';
export const sansMedium = 'Outfit_500Medium';
export const sansSemiBold = 'Outfit_600SemiBold';
export const sansBold = 'Outfit_700Bold';

export function useScreenPadding() {
  const insets = useSafeAreaInsets();
  const top = Platform.OS === 'web' ? 67 : insets.top;
  const bottom = (Platform.OS === 'web' ? 84 : 49 + insets.bottom) + 24;
  return { top, bottom };
}

export function ScreenHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={styles.headerRow}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

export function Card({
  children,
  style,
  onPress,
  testID,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  testID?: string;
}) {
  const colors = useColors();
  const base: ViewStyle = {
    backgroundColor: colors.card,
    borderRadius: colors.radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  };
  if (!onPress) {
    return (
      <View style={[base, style]} testID={testID}>
        {children}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [base, { opacity: pressed ? 0.7 : 1 }, style]}
    >
      {children}
    </Pressable>
  );
}

export function Badge({
  label,
  color,
  bg,
}: {
  label: string;
  color?: string;
  bg?: string;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bg ?? colors.secondary },
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          { color: color ?? colors.secondaryForeground },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export function Avatar({
  initials,
  color,
  size = 36,
}: {
  initials: string;
  color: string;
  size?: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: withAlpha(color, 0.15),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color,
          fontFamily: sansSemiBold,
          fontSize: size * 0.38,
        }}
      >
        {initials}
      </Text>
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  small,
  testID,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'destructive' | 'outline';
  icon?: keyof typeof Feather.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
  testID?: string;
}) {
  const colors = useColors();
  const bg =
    variant === 'primary'
      ? colors.primary
      : variant === 'destructive'
        ? colors.destructive
        : variant === 'outline'
          ? 'transparent'
          : colors.secondary;
  const fg =
    variant === 'primary'
      ? colors.primaryForeground
      : variant === 'destructive'
        ? colors.destructiveForeground
        : variant === 'outline'
          ? colors.foreground
          : colors.secondaryForeground;
  return (
    <Pressable
      testID={testID}
      disabled={disabled || loading}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        {
          backgroundColor: bg,
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor: colors.border,
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <>
          {icon ? <Feather name={icon} size={small ? 14 : 16} color={fg} /> : null}
          <Text
            style={{
              color: fg,
              fontFamily: sansSemiBold,
              fontSize: small ? 13 : 15,
            }}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function Pill({
  label,
  active,
  onPress,
  color,
  testID,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  color?: string;
  testID?: string;
}) {
  const colors = useColors();
  const activeColor = color ?? colors.primary;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: active ? withAlpha(activeColor, 0.15) : colors.card,
          borderColor: active ? activeColor : colors.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text
        style={{
          color: active ? activeColor : colors.mutedForeground,
          fontFamily: sansMedium,
          fontSize: 13,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function SectionTitle({ title, right }: { title: string; right?: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.sectionRow}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      {right}
    </View>
  );
}

export function LoadingView() {
  const colors = useColors();
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.empty}>
      <Feather name={icon} size={28} color={colors.mutedForeground} />
      <Text style={{ color: colors.foreground, fontFamily: sansSemiBold, fontSize: 15 }}>
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={{
            color: colors.mutedForeground,
            fontFamily: sansFont,
            fontSize: 13,
            textAlign: 'center',
          }}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  const colors = useColors();
  return (
    <View style={styles.empty}>
      <Feather name="alert-circle" size={28} color={colors.destructive} />
      <Text style={{ color: colors.foreground, fontFamily: sansSemiBold, fontSize: 15 }}>
        Something went wrong
      </Text>
      <Button label="Retry" onPress={onRetry} variant="secondary" small />
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  headerTitle: {
    fontFamily: serifFont,
    fontSize: 32,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontFamily: sansFont,
    fontSize: 14,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontFamily: sansMedium,
    fontSize: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 16,
  },
  buttonSmall: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: serifFont,
    fontSize: 22,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  empty: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
});
