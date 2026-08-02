import React, { useState } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useListCategories, useListProviders } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { formatAED, withAlpha } from '@/lib/utils';
import {
  Card,
  EmptyState,
  ErrorState,
  LoadingView,
  Pill,
  ScreenHeader,
  sansFont,
  sansMedium,
  sansSemiBold,
  useScreenPadding,
} from '@/components/UI';

export default function CatalogScreen() {
  const colors = useColors();
  const router = useRouter();
  const pad = useScreenPadding();
  const params = useLocalSearchParams<{ category?: string }>();
  const [search, setSearch] = useState('');
  const [availableNow, setAvailableNow] = useState(false);
  const [category, setCategory] = useState<string | undefined>(params.category);

  const categories = useListCategories();
  const providers = useListProviders(
    {
      ...(category ? { category } : {}),
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(availableNow ? { availableNow: true } : {}),
    },
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={providers.data ?? []}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={{
          paddingTop: pad.top + 12,
          paddingBottom: pad.bottom,
          paddingHorizontal: 20,
        }}
        scrollEnabled={true}
        ListHeaderComponent={
          <View>
            <ScreenHeader title="Catalog" subtitle="Trusted professionals for the household" />
            <View style={[styles.searchRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="search" size={16} color={colors.mutedForeground} />
              <TextInput
                testID="catalog-search"
                value={search}
                onChangeText={setSearch}
                placeholder="Search providers"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.searchInput, { color: colors.foreground }]}
              />
            </View>
            <View style={styles.toggleRow}>
              <Text style={{ color: colors.foreground, fontFamily: sansMedium, fontSize: 14 }}>
                Available now
              </Text>
              <Switch
                testID="available-now-toggle"
                value={availableNow}
                onValueChange={setAvailableNow}
                trackColor={{ true: colors.primary, false: colors.muted }}
                thumbColor="#fff"
              />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 16 }}
            >
              <Pill label="All" active={!category} onPress={() => setCategory(undefined)} />
              {(categories.data ?? []).map((c) => (
                <Pill
                  key={c.id}
                  label={c.name}
                  active={category === c.slug}
                  onPress={() => setCategory(category === c.slug ? undefined : c.slug)}
                />
              ))}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          providers.isLoading ? (
            <LoadingView />
          ) : providers.isError ? (
            <ErrorState onRetry={() => providers.refetch()} />
          ) : (
            <EmptyState
              icon="search"
              title="No providers found"
              subtitle="Try a different search or category."
            />
          )
        }
        renderItem={({ item: p }) => (
          <Card
            testID={`provider-${p.id}`}
            style={{ marginBottom: 10 }}
            onPress={() => router.push(`/provider/${p.id}`)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: colors.foreground, fontFamily: sansSemiBold, fontSize: 16, flexShrink: 1 }}>
                {p.name}
              </Text>
              {p.verified && <Feather name="check-circle" size={14} color={colors.primary} />}
              {p.availableNow && (
                <View style={[styles.availDot, { backgroundColor: colors.success }]} />
              )}
            </View>
            <Text style={{ color: colors.mutedForeground, fontFamily: sansFont, fontSize: 13, marginTop: 2 }} numberOfLines={1}>
              {p.categoryName} · {p.tagline}
            </Text>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Feather name="star" size={13} color={colors.primary} />
                <Text style={[styles.metaText, { color: colors.foreground }]}>
                  {p.rating.toFixed(1)} ({p.reviewCount})
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Feather name="clock" size={13} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                  ~{p.responseMinutes} min
                </Text>
              </View>
              <Text style={{ color: colors.primary, fontFamily: sansSemiBold, fontSize: 13, marginLeft: 'auto' }}>
                from {formatAED(p.startingPrice)}
              </Text>
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 2,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Outfit_400Regular',
    fontSize: 15,
    paddingVertical: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  availDot: { width: 8, height: 8, borderRadius: 4 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 10,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontFamily: 'Outfit_500Medium', fontSize: 12.5 },
});
