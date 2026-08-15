import React from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetHomeSummaryQueryKey,
  useApproveServiceRequest,
  useDeclineServiceRequest,
  useGetHomeSummary,
  useListCategories,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import {
  categoryIcon,
  formatAED,
  formatDateTime,
  greeting,
  statusLabel,
  withAlpha,
} from '@/lib/utils';
import {
  Avatar,
  Button,
  Card,
  ErrorState,
  LoadingView,
  SectionTitle,
  sansFont,
  sansMedium,
  sansSemiBold,
  serifFont,
  useScreenPadding,
} from '@/components/UI';

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const pad = useScreenPadding();
  const qc = useQueryClient();

  const summary = useGetHomeSummary({
    query: { queryKey: getGetHomeSummaryQueryKey(), refetchInterval: 10_000 },
  });
  const categories = useListCategories();
  const approve = useApproveServiceRequest({
    mutation: { onSuccess: () => qc.invalidateQueries() },
  });
  const decline = useDeclineServiceRequest({
    mutation: { onSuccess: () => qc.invalidateQueries() },
  });

  if (summary.isLoading) return <LoadingView />;
  if (summary.isError || !summary.data)
    return <ErrorState onRetry={() => summary.refetch()} />;

  const s = summary.data;
  const live = s.activeBooking;
  const next = s.nextBooking;
  const initials = s.memberName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: pad.top + 12,
        paddingBottom: pad.bottom,
        paddingHorizontal: 20,
      }}
      refreshControl={
        <RefreshControl
          refreshing={summary.isRefetching}
          onRefresh={() => qc.invalidateQueries()}
          tintColor={colors.primary}
        />
      }
    >
      {/* Greeting */}
      <View style={styles.greetRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.greeting, { color: colors.foreground }]}>
            {greeting()}, {s.memberName.split(' ')[0]}
          </Text>
          <Text style={{ color: colors.mutedForeground, fontFamily: sansFont, fontSize: 14 }}>
            {s.householdName} · {s.memberCount} members
          </Text>
        </View>
        <Avatar initials={initials} color={colors.primary} size={44} />
      </View>

      {/* Live / up next band */}
      {live ? (
        <Card
          testID="active-booking-band"
          onPress={() => router.push(`/booking/${live.id}`)}
          style={{ backgroundColor: colors.primary, borderColor: colors.primary }}
        >
          <View style={styles.bandRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.bandKicker, { color: withAlpha(colors.primaryForeground, 0.8) }]}>
                ACTIVE NOW · {statusLabel(live.status).toUpperCase()}
              </Text>
              <Text style={[styles.bandTitle, { color: colors.primaryForeground }]}>
                {live.serviceName}
              </Text>
              <Text style={{ color: withAlpha(colors.primaryForeground, 0.85), fontFamily: sansFont, fontSize: 13 }}>
                {live.providerName}
                {live.etaMinutes != null ? ` · ETA ${live.etaMinutes} min` : ''}
              </Text>
            </View>
            <Feather name="chevron-right" size={22} color={colors.primaryForeground} />
          </View>
        </Card>
      ) : next ? (
        <Card testID="next-booking-band" onPress={() => router.push(`/booking/${next.id}`)}>
          <View style={styles.bandRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.bandKicker, { color: colors.primary }]}>UP NEXT</Text>
              <Text style={[styles.bandTitle, { color: colors.foreground }]}>
                {next.serviceName}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontFamily: sansFont, fontSize: 13 }}>
                {next.providerName} · {formatDateTime(next.scheduledAt)}
              </Text>
            </View>
            <Feather name="chevron-right" size={22} color={colors.mutedForeground} />
          </View>
        </Card>
      ) : null}

      {/* Pending requests */}
      {s.pendingRequests.length > 0 && (
        <>
          <SectionTitle title="Awaiting approval" />
          {s.pendingRequests.map((r) => (
            <Card key={r.id} style={{ marginBottom: 10 }} testID={`request-${r.id}`}>
              <Text style={{ color: colors.foreground, fontFamily: sansSemiBold, fontSize: 15 }}>
                {r.serviceName} · {formatAED(r.price)}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontFamily: sansFont, fontSize: 13, marginTop: 2 }}>
                {r.memberName} asked for {r.providerName}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontFamily: sansFont, fontSize: 13, marginTop: 4 }} numberOfLines={2}>
                “{r.note}”
              </Text>
              {s.isHeadOfHousehold && (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Button
                      testID={`approve-${r.id}`}
                      label="Approve"
                      small
                      loading={approve.isPending && approve.variables?.id === r.id}
                      onPress={() => approve.mutate({ id: r.id })}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      testID={`decline-${r.id}`}
                      label="Decline"
                      small
                      variant="secondary"
                      loading={decline.isPending && decline.variables?.id === r.id}
                      onPress={() => decline.mutate({ id: r.id })}
                    />
                  </View>
                </View>
              )}
            </Card>
          ))}
        </>
      )}

      {/* Bill + Pack quick cards */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 24 }}>
        <Card style={{ flex: 1 }} onPress={() => router.push('/billing')} testID="home-bill-card">
          <Feather name="credit-card" size={18} color={colors.primary} />
          <Text style={{ color: colors.mutedForeground, fontFamily: sansFont, fontSize: 12, marginTop: 8 }}>
            Open bill
          </Text>
          <Text style={{ color: colors.foreground, fontFamily: sansSemiBold, fontSize: 18 }}>
            {formatAED(s.openBillTotal)}
          </Text>
        </Card>
        <Card style={{ flex: 1 }} onPress={() => router.push('/pack')} testID="home-pack-card">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Feather name="message-circle" size={18} color={colors.primary} />
            {s.packUnreadCount > 0 && (
              <View style={[styles.unreadDot, { backgroundColor: colors.destructive }]}>
                <Text style={{ color: '#fff', fontSize: 10, fontFamily: sansSemiBold }}>
                  {s.packUnreadCount}
                </Text>
              </View>
            )}
          </View>
          <Text style={{ color: colors.mutedForeground, fontFamily: sansFont, fontSize: 12, marginTop: 8 }}>
            The Pack
          </Text>
          <Text style={{ color: colors.foreground, fontFamily: sansSemiBold, fontSize: 14 }} numberOfLines={1}>
            {s.recentPackMessages[0]
              ? `${s.recentPackMessages[0].memberName.split(' ')[0]}: ${s.recentPackMessages[0].body}`
              : 'No messages yet'}
          </Text>
        </Card>
      </View>

      {/* Categories */}
      <SectionTitle
        title="Summon a professional"
        right={
          <Text
            onPress={() => router.push('/catalog')}
            style={{ color: colors.primary, fontFamily: sansMedium, fontSize: 13 }}
          >
            See all
          </Text>
        }
      />
      <View style={styles.catGrid}>
        {(categories.data ?? []).map((c) => (
          <Card
            key={c.id}
            testID={`category-${c.slug}`}
            style={styles.catCard}
            onPress={() => router.push({ pathname: '/catalog', params: { category: c.slug } })}
          >
            <View style={[styles.catIcon, { backgroundColor: withAlpha(colors.primary, 0.12) }]}>
              <Feather name={categoryIcon(c.icon) as never} size={18} color={colors.primary} />
            </View>
            <Text style={{ color: colors.foreground, fontFamily: sansSemiBold, fontSize: 14 }} numberOfLines={1}>
              {c.name}
            </Text>
            <Text style={{ color: colors.mutedForeground, fontFamily: sansFont, fontSize: 12 }}>
              from {formatAED(c.startingPrice)}
            </Text>
          </Card>
        ))}
      </View>

      {/* Month to date */}
      <Card style={{ marginTop: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: colors.mutedForeground, fontFamily: sansFont, fontSize: 13 }}>
            Month-to-date household spend
          </Text>
          <Text style={{ color: colors.foreground, fontFamily: sansSemiBold, fontSize: 14 }}>
            {formatAED(s.monthToDateSpend)}
          </Text>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  greetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  greeting: {
    fontFamily: serifFont,
    fontSize: 28,
    letterSpacing: -0.5,
  },
  bandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bandKicker: { fontFamily: sansSemiBold, fontSize: 11, letterSpacing: 1 },
  bandTitle: { fontFamily: sansSemiBold, fontSize: 18, marginVertical: 2 },
  unreadDot: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  catCard: {
    width: '48%',
    flexGrow: 1,
  },
  catIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
});
