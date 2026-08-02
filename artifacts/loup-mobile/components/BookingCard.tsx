import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { Booking } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import {
  ACTIVE_STATUSES,
  formatAED,
  formatDay,
  formatTime,
  statusLabel,
  withAlpha,
} from '@/lib/utils';
import { Badge, Card, sansFont, sansMedium, sansSemiBold } from '@/components/UI';

export function BookingCard({
  booking,
  memberColor,
}: {
  booking: Booking;
  memberColor?: string;
}) {
  const colors = useColors();
  const router = useRouter();
  const isActive = ACTIVE_STATUSES.includes(booking.status);
  const isDone = booking.status === 'completed';
  const isCancelled = booking.status === 'cancelled';

  return (
    <Card
      testID={`booking-card-${booking.id}`}
      onPress={() => router.push(`/booking/${booking.id}`)}
      style={styles.card}
    >
      <View style={styles.row}>
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: withAlpha(memberColor ?? colors.primary, 0.14) },
          ]}
        >
          <Feather
            name="calendar"
            size={18}
            color={memberColor ?? colors.primary}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={[styles.title, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {booking.serviceName}
          </Text>
          <Text
            style={[styles.sub, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {booking.providerName} · {booking.memberName}
          </Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            {formatDay(booking.scheduledAt)} · {formatTime(booking.scheduledAt)}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <Badge
            label={statusLabel(booking.status)}
            color={
              isActive
                ? colors.primaryForeground
                : isCancelled
                  ? colors.mutedForeground
                  : isDone
                    ? colors.success
                    : colors.secondaryForeground
            }
            bg={
              isActive
                ? colors.primary
                : isDone
                  ? withAlpha(colors.success, 0.15)
                  : colors.secondary
            }
          />
          <Text style={[styles.price, { color: colors.foreground }]}>
            {formatAED(booking.priceEstimate)}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: sansSemiBold, fontSize: 15 },
  sub: { fontFamily: sansFont, fontSize: 12.5, marginTop: 1 },
  price: { fontFamily: sansMedium, fontSize: 13 },
});
