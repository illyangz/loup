import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useGetProvider,
  useListProviderReviews,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { formatAED, formatDay, withAlpha } from '@/lib/utils';
import {
  Card,
  EmptyState,
  ErrorState,
  LoadingView,
  SectionTitle,
  sansFont,
  sansMedium,
  sansSemiBold,
  serifFont,
} from '@/components/UI';
import { Platform } from 'react-native';

export default function ProviderScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const providerId = Number(id);

  const provider = useGetProvider(providerId);
  const reviews = useListProviderReviews(providerId);

  if (provider.isLoading) return <LoadingView />;
  if (provider.isError || !provider.data)
    return <ErrorState onRetry={() => provider.refetch()} />;

  const p = provider.data;
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: topPad + 8,
        paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 32,
        paddingHorizontal: 20,
      }}
    >
      <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back} testID="back-button">
        <Feather name="arrow-left" size={22} color={colors.foreground} />
        <Text style={{ color: colors.mutedForeground, fontFamily: sansFont, fontSize: 13 }}>
          {p.categoryName}
        </Text>
      </Pressable>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <Text style={{ color: colors.foreground, fontFamily: serifFont, fontSize: 30, flexShrink: 1 }}>
          {p.name}
        </Text>
        {p.verified && <Feather name="check-circle" size={18} color={colors.primary} />}
      </View>
      <Text style={{ color: colors.mutedForeground, fontFamily: sansFont, fontSize: 15, marginTop: 4 }}>
        {p.tagline}
      </Text>

      <View style={styles.statsRow}>
        <Stat icon="star" label={`${p.rating.toFixed(1)} (${p.reviewCount})`} />
        <Stat icon="briefcase" label={`${p.jobsCompleted} jobs`} />
        <Stat icon="clock" label={`~${p.responseMinutes} min`} />
        <Stat icon="calendar" label={`${p.yearsOnPlatform} yrs`} />
      </View>

      <Card style={{ marginTop: 8 }}>
        <Text style={{ color: colors.foreground, fontFamily: sansFont, fontSize: 14.5, lineHeight: 22 }}>
          {p.bio}
        </Text>
        {p.badges.length > 0 && (
          <View style={styles.badgesRow}>
            {p.badges.map((b) => (
              <View key={b} style={[styles.badgeChip, { backgroundColor: withAlpha(colors.primary, 0.12) }]}>
                <Feather name="shield" size={12} color={colors.primary} />
                <Text style={{ color: colors.primary, fontFamily: sansMedium, fontSize: 12 }}>{b}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      <SectionTitle title="Services" />
      {p.services.map((s) => (
        <Card
          key={s.id}
          testID={`service-${s.id}`}
          style={{ marginBottom: 10 }}
          onPress={() =>
            router.push({ pathname: '/book/[providerId]', params: { providerId: String(p.id), serviceId: String(s.id) } })
          }
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={{ color: colors.foreground, fontFamily: sansSemiBold, fontSize: 15 }}>
                {s.name}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontFamily: sansFont, fontSize: 13, marginTop: 2 }} numberOfLines={2}>
                {s.description}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontFamily: sansFont, fontSize: 12.5, marginTop: 4 }}>
                {Math.round(s.durationMinutes / 60 * 10) / 10} hr · {formatAED(s.price)}
              </Text>
            </View>
            <View style={[styles.bookBtn, { backgroundColor: colors.primary }]}>
              <Feather name="arrow-right" size={16} color={colors.primaryForeground} />
            </View>
          </View>
        </Card>
      ))}

      <SectionTitle title="Reviews" />
      {(reviews.data ?? []).length === 0 ? (
        <EmptyState icon="star" title="No reviews yet" />
      ) : (
        (reviews.data ?? []).map((r) => (
          <Card key={r.id} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: colors.foreground, fontFamily: sansSemiBold, fontSize: 14, flex: 1 }}>
                {r.authorName}
              </Text>
              <View style={{ flexDirection: 'row', gap: 2 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Feather
                    key={i}
                    name="star"
                    size={12}
                    color={i < r.rating ? colors.primary : colors.muted}
                  />
                ))}
              </View>
            </View>
            <Text style={{ color: colors.mutedForeground, fontFamily: sansFont, fontSize: 13.5, marginTop: 6, lineHeight: 20 }}>
              {r.comment}
            </Text>
            <Text style={{ color: colors.mutedForeground, fontFamily: sansFont, fontSize: 11.5, marginTop: 6 }}>
              {formatDay(r.createdAt)}
            </Text>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

function Stat({ icon, label }: { icon: keyof typeof Feather.glyphMap; label: string }) {
  const colors = useColors();
  return (
    <View style={styles.stat}>
      <Feather name={icon} size={13} color={colors.primary} />
      <Text style={{ color: colors.foreground, fontFamily: sansMedium, fontSize: 12.5 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginVertical: 14,
  },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  badgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  bookBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
