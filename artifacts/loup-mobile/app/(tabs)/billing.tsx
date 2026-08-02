import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetBillingStatement,
  useListBillingHistory,
  useListPaymentMethods,
  usePayBillingStatement,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { formatAED, formatDay, withAlpha } from '@/lib/utils';
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingView,
  ScreenHeader,
  SectionTitle,
  sansFont,
  sansMedium,
  sansSemiBold,
  serifFont,
  useScreenPadding,
} from '@/components/UI';

export default function BillingScreen() {
  const colors = useColors();
  const pad = useScreenPadding();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [payOpen, setPayOpen] = useState(false);
  const [methodId, setMethodId] = useState<number | null>(null);

  const statement = useGetBillingStatement();
  const methods = useListPaymentMethods();
  const history = useListBillingHistory();
  const pay = usePayBillingStatement({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries();
        setPayOpen(false);
      },
    },
  });

  if (statement.isLoading) return <LoadingView />;
  if (statement.isError || !statement.data)
    return <ErrorState onRetry={() => statement.refetch()} />;

  const s = statement.data;
  const isOpen = s.status === 'open';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: pad.top + 12,
        paddingBottom: pad.bottom,
        paddingHorizontal: 20,
      }}
    >
      <ScreenHeader title="Billing" subtitle="One consolidated household bill" />

      {/* Statement card */}
      <Card
        style={{
          backgroundColor: isOpen ? colors.primary : withAlpha(colors.success, 0.12),
          borderColor: isOpen ? colors.primary : withAlpha(colors.success, 0.3),
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Feather
            name={isOpen ? 'file-text' : 'check-circle'}
            size={16}
            color={isOpen ? withAlpha(colors.primaryForeground, 0.9) : colors.success}
          />
          <Text
            style={{
              color: isOpen ? withAlpha(colors.primaryForeground, 0.9) : colors.success,
              fontFamily: sansSemiBold,
              fontSize: 12,
              letterSpacing: 1,
            }}
          >
            {isOpen ? 'OPEN STATEMENT' : 'PAID'} · {s.month.toUpperCase()}
          </Text>
        </View>
        <Text
          style={{
            color: isOpen ? colors.primaryForeground : colors.foreground,
            fontFamily: serifFont,
            fontSize: 40,
            marginTop: 8,
          }}
        >
          {formatAED(s.total)}
        </Text>
        {!isOpen && s.paidWith ? (
          <Text style={{ color: colors.mutedForeground, fontFamily: sansFont, fontSize: 13, marginTop: 4 }}>
            Settled with {s.paidWith}
            {s.paidAt ? ` on ${formatDay(s.paidAt)}` : ''}
          </Text>
        ) : null}
        {isOpen && s.total > 0 && (
          <View style={{ marginTop: 14 }}>
            <Button
              testID="settle-bill"
              label="Settle bill"
              variant="secondary"
              onPress={() => {
                const def = (methods.data ?? []).find((m) => m.isDefault);
                setMethodId(def?.id ?? methods.data?.[0]?.id ?? null);
                setPayOpen(true);
              }}
            />
          </View>
        )}
      </Card>

      {/* By member */}
      {s.byMember.length > 0 && (
        <>
          <SectionTitle title="Spend by member" />
          <Card>
            {s.byMember.map((m, i) => (
              <View
                key={m.memberId}
                style={[
                  styles.rowBetween,
                  i > 0 && { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 10 },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Avatar initials={m.initials} color={colors.primary} size={28} />
                  <Text style={{ color: colors.foreground, fontFamily: sansMedium, fontSize: 14 }}>
                    {m.memberName}
                  </Text>
                </View>
                <Text style={{ color: colors.foreground, fontFamily: sansSemiBold, fontSize: 14 }}>
                  {formatAED(m.amount)}
                </Text>
              </View>
            ))}
          </Card>
        </>
      )}

      {/* By category */}
      {s.byCategory.length > 0 && (
        <>
          <SectionTitle title="Spend by category" />
          <Card>
            {s.byCategory.map((c, i) => {
              const max = Math.max(...s.byCategory.map((x) => x.amount), 1);
              return (
                <View key={c.categoryName} style={i > 0 ? { marginTop: 12 } : undefined}>
                  <View style={styles.rowBetween}>
                    <Text style={{ color: colors.foreground, fontFamily: sansMedium, fontSize: 14 }}>
                      {c.categoryName}
                    </Text>
                    <Text style={{ color: colors.mutedForeground, fontFamily: sansFont, fontSize: 13 }}>
                      {formatAED(c.amount)}
                    </Text>
                  </View>
                  <View style={[styles.barTrack, { backgroundColor: colors.muted }]}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${(c.amount / max) * 100}%`, backgroundColor: colors.primary },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </Card>
        </>
      )}

      {/* Line items */}
      <SectionTitle title="Line items" />
      {s.items.length === 0 ? (
        <EmptyState icon="file" title="No charges yet this month" />
      ) : (
        <Card>
          {s.items.map((it, i) => (
            <View
              key={it.id}
              style={[
                styles.rowBetween,
                i > 0 && { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 10 },
              ]}
            >
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ color: colors.foreground, fontFamily: sansMedium, fontSize: 14 }} numberOfLines={1}>
                  {it.serviceName}
                </Text>
                <Text style={{ color: colors.mutedForeground, fontFamily: sansFont, fontSize: 12 }} numberOfLines={1}>
                  {it.providerName} · {it.memberName} · {formatDay(it.date)}
                </Text>
              </View>
              <Text style={{ color: colors.foreground, fontFamily: sansSemiBold, fontSize: 14 }}>
                {formatAED(it.amount)}
              </Text>
            </View>
          ))}
        </Card>
      )}

      {/* History */}
      {(history.data ?? []).length > 0 && (
        <>
          <SectionTitle title="Past statements" />
          <Card>
            {(history.data ?? []).map((h, i) => (
              <View
                key={h.id}
                style={[
                  styles.rowBetween,
                  i > 0 && { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 10 },
                ]}
              >
                <View>
                  <Text style={{ color: colors.foreground, fontFamily: sansMedium, fontSize: 14 }}>
                    {h.month}
                  </Text>
                  <Text style={{ color: colors.mutedForeground, fontFamily: sansFont, fontSize: 12 }}>
                    {h.itemCount} items · {h.status === 'paid' ? `paid${h.paidWith ? ` with ${h.paidWith}` : ''}` : 'open'}
                  </Text>
                </View>
                <Text
                  style={{
                    color: h.status === 'paid' ? colors.success : colors.primary,
                    fontFamily: sansSemiBold,
                    fontSize: 14,
                  }}
                >
                  {formatAED(h.total)}
                </Text>
              </View>
            ))}
          </Card>
        </>
      )}

      {/* Pay modal */}
      <Modal visible={payOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPayOpen(false)}>
        <View style={{ flex: 1, backgroundColor: colors.background, padding: 20, paddingBottom: insets.bottom + 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 8 }}>
            <Text style={{ color: colors.foreground, fontFamily: sansSemiBold, fontSize: 18, flex: 1 }}>
              Settle {s.month} · {formatAED(s.total)}
            </Text>
            <Pressable onPress={() => setPayOpen(false)} hitSlop={10} testID="close-pay-modal">
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </Pressable>
          </View>
          {(methods.data ?? []).map((m) => (
            <Pressable
              key={m.id}
              testID={`method-${m.id}`}
              onPress={() => setMethodId(m.id)}
              style={({ pressed }) => [
                styles.methodRow,
                {
                  backgroundColor: methodId === m.id ? withAlpha(colors.primary, 0.12) : colors.card,
                  borderColor: methodId === m.id ? colors.primary : colors.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Feather
                name={m.type === 'card' ? 'credit-card' : m.type === 'wallet' ? 'briefcase' : 'dollar-sign'}
                size={18}
                color={methodId === m.id ? colors.primary : colors.mutedForeground}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, fontFamily: sansMedium, fontSize: 15 }}>
                  {m.label}
                  {m.isDefault ? '  ·  Default' : ''}
                </Text>
                {m.detail ? (
                  <Text style={{ color: colors.mutedForeground, fontFamily: sansFont, fontSize: 12.5 }}>
                    {m.detail}
                  </Text>
                ) : null}
              </View>
              {methodId === m.id && <Feather name="check" size={18} color={colors.primary} />}
            </Pressable>
          ))}
          <View style={{ marginTop: 'auto' }}>
            <Button
              testID="confirm-pay"
              label={`Pay ${formatAED(s.total)}`}
              disabled={methodId == null}
              loading={pay.isPending}
              onPress={() => {
                if (methodId != null) pay.mutate({ data: { paymentMethodId: methodId } });
              }}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    overflow: 'hidden',
  },
  barFill: { height: 6, borderRadius: 3 },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
});
