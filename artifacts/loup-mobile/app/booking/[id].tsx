import React, { useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import {
  useAdvanceBooking,
  useCreateReview,
  useGetBooking,
  useListBookingMessages,
  useSendBookingMessage,
  useUpdateBooking,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import {
  formatAED,
  formatDateTime,
  LIVE_STATUSES,
  statusLabel,
  withAlpha,
} from '@/lib/utils';
import {
  Badge,
  Button,
  Card,
  ErrorState,
  LoadingView,
  SectionTitle,
  sansFont,
  sansMedium,
  sansSemiBold,
  serifFont,
} from '@/components/UI';

export default function BookingDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookingId = Number(id);

  const booking = useGetBooking(bookingId);
  const messages = useListBookingMessages(bookingId);
  const [chatBody, setChatBody] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const advance = useAdvanceBooking({
    mutation: { onSuccess: () => qc.invalidateQueries() },
  });
  const update = useUpdateBooking({
    mutation: { onSuccess: () => qc.invalidateQueries() },
  });
  const sendMsg = useSendBookingMessage({
    mutation: {
      onSuccess: () => {
        setChatBody('');
        qc.invalidateQueries();
      },
    },
  });
  const review = useCreateReview({
    mutation: {
      onSuccess: () => {
        setRating(0);
        setComment('');
        qc.invalidateQueries();
      },
    },
  });

  if (booking.isLoading) return <LoadingView />;
  if (booking.isError || !booking.data)
    return <ErrorState onRetry={() => booking.refetch()} />;

  const b = booking.data;
  const isLive = LIVE_STATUSES.includes(b.status);
  const canCancel = ['pending', 'confirmed'].includes(b.status);
  const canReview = b.status === 'completed' && !b.hasReview;
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const cancel = () => {
    Alert.alert('Cancel booking', 'Are you sure you want to cancel this booking?', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Cancel booking',
        style: 'destructive',
        onPress: () => update.mutate({ id: b.id, data: { status: 'cancelled' } }),
      },
    ]);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: topPad + 8,
        paddingHorizontal: 20,
        paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 32,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={() => router.back()} hitSlop={10} testID="back-button">
        <Feather name="arrow-left" size={22} color={colors.foreground} />
      </Pressable>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}>
        <Text style={{ color: colors.foreground, fontFamily: serifFont, fontSize: 26, flex: 1 }}>
          {b.serviceName}
        </Text>
        <Badge
          label={statusLabel(b.status)}
          color={isLive ? colors.primaryForeground : colors.secondaryForeground}
          bg={isLive ? colors.primary : colors.secondary}
        />
      </View>
      <Text style={{ color: colors.mutedForeground, fontFamily: sansFont, fontSize: 14, marginTop: 2 }}>
        {b.providerName} · booked by {b.memberName}
      </Text>

      {b.status === 'en_route' && b.etaMinutes != null && (
        <Card style={{ marginTop: 14, backgroundColor: withAlpha(colors.primary, 0.12), borderColor: withAlpha(colors.primary, 0.3) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Feather name="navigation" size={18} color={colors.primary} />
            <Text style={{ color: colors.foreground, fontFamily: sansSemiBold, fontSize: 15 }}>
              Arriving in about {b.etaMinutes} minutes
            </Text>
          </View>
        </Card>
      )}

      <Card style={{ marginTop: 14 }}>
        <DetailRow icon="calendar" label={formatDateTime(b.scheduledAt)} />
        <DetailRow icon="map-pin" label={b.addressLabel} />
        <DetailRow icon="tag" label={`${b.categoryName} · ${formatAED(b.priceEstimate)}`} />
        {b.instructions ? <DetailRow icon="file-text" label={b.instructions} /> : null}
      </Card>

      {/* Timeline */}
      <SectionTitle title="Timeline" />
      <Card>
        {b.events.map((e, i) => (
          <View key={e.id} style={styles.timelineRow}>
            <View style={{ alignItems: 'center' }}>
              <View style={[styles.timelineDot, { backgroundColor: colors.primary }]} />
              {i < b.events.length - 1 && (
                <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
              )}
            </View>
            <View style={{ flex: 1, paddingBottom: i < b.events.length - 1 ? 14 : 0 }}>
              <Text style={{ color: colors.foreground, fontFamily: sansSemiBold, fontSize: 14 }}>
                {statusLabel(e.status)}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontFamily: sansFont, fontSize: 13 }}>
                {e.note}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontFamily: sansFont, fontSize: 11.5, marginTop: 2 }}>
                {formatDateTime(e.occurredAt)}
              </Text>
            </View>
          </View>
        ))}
      </Card>

      {isLive && (
        <View style={{ marginTop: 12 }}>
          <Button
            testID="advance-booking"
            label="Simulate next update"
            variant="secondary"
            icon="fast-forward"
            loading={advance.isPending}
            onPress={() => advance.mutate({ id: b.id })}
          />
        </View>
      )}

      {/* Chat */}
      {(isLive || (messages.data ?? []).length > 0) && (
        <>
          <SectionTitle title="Chat" />
          <Card>
            {(messages.data ?? []).length === 0 ? (
              <Text style={{ color: colors.mutedForeground, fontFamily: sansFont, fontSize: 13 }}>
                No messages yet.
              </Text>
            ) : (
              (messages.data ?? []).map((m) => (
                <View
                  key={m.id}
                  style={[
                    styles.chatBubble,
                    {
                      alignSelf: m.sender === 'member' ? 'flex-end' : 'flex-start',
                      backgroundColor: m.sender === 'member' ? colors.primary : colors.secondary,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: m.sender === 'member' ? colors.primaryForeground : colors.secondaryForeground,
                      fontFamily: sansFont,
                      fontSize: 14,
                    }}
                  >
                    {m.body}
                  </Text>
                </View>
              ))
            )}
            {isLive && (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'flex-end' }}>
                <TextInput
                  testID="booking-chat-input"
                  value={chatBody}
                  onChangeText={setChatBody}
                  placeholder={`Message ${b.providerName}…`}
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  style={[
                    styles.chatInput,
                    { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border },
                  ]}
                />
                <Pressable
                  testID="booking-chat-send"
                  disabled={!chatBody.trim() || sendMsg.isPending}
                  onPress={() => sendMsg.mutate({ id: b.id, data: { body: chatBody.trim() } })}
                  style={({ pressed }) => [
                    styles.sendBtn,
                    {
                      backgroundColor: colors.primary,
                      opacity: !chatBody.trim() || sendMsg.isPending ? 0.5 : pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Feather name="arrow-up" size={16} color={colors.primaryForeground} />
                </Pressable>
              </View>
            )}
          </Card>
        </>
      )}

      {/* Review */}
      {canReview && (
        <>
          <SectionTitle title="Rate this service" />
          <Card>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Pressable key={i} onPress={() => setRating(i + 1)} hitSlop={6} testID={`star-${i + 1}`}>
                  <Feather
                    name="star"
                    size={26}
                    color={i < rating ? colors.primary : colors.muted}
                  />
                </Pressable>
              ))}
            </View>
            <TextInput
              testID="review-comment"
              value={comment}
              onChangeText={setComment}
              placeholder="How did it go?"
              placeholderTextColor={colors.mutedForeground}
              multiline
              style={[
                styles.chatInput,
                { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border, marginBottom: 12, minHeight: 70 },
              ]}
            />
            <Button
              testID="submit-review"
              label="Submit review"
              disabled={rating === 0 || !comment.trim()}
              loading={review.isPending}
              onPress={() =>
                review.mutate({ data: { bookingId: b.id, rating, comment: comment.trim() } })
              }
            />
          </Card>
        </>
      )}
      {b.status === 'completed' && b.hasReview && (
        <Card style={{ marginTop: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Feather name="check-circle" size={16} color={colors.success} />
            <Text style={{ color: colors.foreground, fontFamily: sansMedium, fontSize: 14 }}>
              You reviewed this booking
            </Text>
          </View>
        </Card>
      )}

      {canCancel && (
        <View style={{ marginTop: 16 }}>
          <Button
            testID="cancel-booking"
            label="Cancel booking"
            variant="outline"
            icon="x"
            loading={update.isPending}
            onPress={cancel}
          />
        </View>
      )}
    </ScrollView>
  );
}

function DetailRow({ icon, label }: { icon: keyof typeof Feather.glyphMap; label: string }) {
  const colors = useColors();
  return (
    <View style={styles.detailRow}>
      <Feather name={icon} size={15} color={colors.primary} />
      <Text style={{ color: colors.foreground, fontFamily: sansFont, fontSize: 14, flex: 1 }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  timelineRow: { flexDirection: 'row', gap: 12 },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  timelineLine: { width: 2, flex: 1, marginTop: 2 },
  chatBubble: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    maxWidth: '80%',
  },
  chatInput: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
