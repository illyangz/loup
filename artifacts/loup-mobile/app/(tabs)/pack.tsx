import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import {
  getListPackMessagesQueryKey,
  useCreateServiceRequest,
  useGetHousehold,
  useListHouseholdActivity,
  useListPackMessages,
  useListProviders,
  useGetProvider,
  useListServiceRequests,
  useSendPackMessage,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import {
  formatAED,
  formatDateTime,
  getMemberColor,
  withAlpha,
} from '@/lib/utils';
import {
  Avatar,
  Button,
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

type Segment = 'thread' | 'requests' | 'members';

export default function PackScreen() {
  const colors = useColors();
  const pad = useScreenPadding();
  const [segment, setSegment] = useState<Segment>('thread');

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: pad.top + 12 }}>
      <View style={{ paddingHorizontal: 20 }}>
        <ScreenHeader title="The Pack" subtitle="Your household, in sync" />
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <Pill label="Thread" active={segment === 'thread'} onPress={() => setSegment('thread')} />
          <Pill label="Requests" active={segment === 'requests'} onPress={() => setSegment('requests')} />
          <Pill label="Members" active={segment === 'members'} onPress={() => setSegment('members')} />
        </View>
      </View>
      {segment === 'thread' && <Thread />}
      {segment === 'requests' && <Requests />}
      {segment === 'members' && <Members />}
    </View>
  );
}

function Thread() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const pad = useScreenPadding();
  const qc = useQueryClient();
  const [body, setBody] = useState('');

  const messages = useListPackMessages({
    query: { queryKey: getListPackMessagesQueryKey(), refetchInterval: 10_000 },
  });
  const household = useGetHousehold();
  const send = useSendPackMessage({
    mutation: {
      onSuccess: () => {
        setBody('');
        qc.invalidateQueries();
      },
    },
  });

  const members = household.data?.members;
  const data = useMemo(() => [...(messages.data ?? [])].reverse(), [messages.data]);

  if (messages.isLoading) return <LoadingView />;
  if (messages.isError) return <ErrorState onRetry={() => messages.refetch()} />;

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <FlatList
        inverted
        data={data}
        keyExtractor={(m) => String(m.id)}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        scrollEnabled={data.length > 0}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, paddingTop: 8 }}
        ListEmptyComponent={
          <EmptyState icon="message-circle" title="No messages yet" subtitle="Say hello to the pack." />
        }
        renderItem={({ item: m }) => {
          const color = getMemberColor(colors, m.memberId, m.isCurrentUser, members);
          return (
            <View
              style={[
                styles.msgRow,
                { justifyContent: m.isCurrentUser ? 'flex-end' : 'flex-start' },
              ]}
            >
              {!m.isCurrentUser && <Avatar initials={m.initials} color={color} size={30} />}
              <View
                style={[
                  styles.bubble,
                  {
                    backgroundColor: m.isCurrentUser ? colors.primary : colors.card,
                    borderColor: colors.border,
                    borderWidth: m.isCurrentUser ? 0 : 1,
                  },
                ]}
              >
                {!m.isCurrentUser && (
                  <Text style={{ color, fontFamily: sansSemiBold, fontSize: 12, marginBottom: 2 }}>
                    {m.memberName.split(' ')[0]}
                  </Text>
                )}
                <Text
                  style={{
                    color: m.isCurrentUser ? colors.primaryForeground : colors.foreground,
                    fontFamily: sansFont,
                    fontSize: 15,
                  }}
                >
                  {m.body}
                </Text>
                <Text
                  style={{
                    color: m.isCurrentUser
                      ? withAlpha(colors.primaryForeground, 0.7)
                      : colors.mutedForeground,
                    fontFamily: sansFont,
                    fontSize: 10.5,
                    marginTop: 3,
                    alignSelf: 'flex-end',
                  }}
                >
                  {new Date(m.sentAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          );
        }}
      />
      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 10) + (pad.bottom - 24 > 60 ? 49 : 0),
          },
        ]}
      >
        <TextInput
          testID="pack-message-input"
          value={body}
          onChangeText={setBody}
          placeholder="Message the pack…"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { color: colors.foreground, backgroundColor: colors.background }]}
          multiline
        />
        <Pressable
          testID="pack-send"
          disabled={!body.trim() || send.isPending}
          onPress={() => send.mutate({ data: { body: body.trim() } })}
          style={({ pressed }) => [
            styles.sendBtn,
            {
              backgroundColor: colors.primary,
              opacity: !body.trim() || send.isPending ? 0.5 : pressed ? 0.8 : 1,
            },
          ]}
        >
          <Feather name="arrow-up" size={18} color={colors.primaryForeground} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function Requests() {
  const colors = useColors();
  const pad = useScreenPadding();
  const [showNew, setShowNew] = useState(false);
  const requests = useListServiceRequests();

  if (requests.isLoading) return <LoadingView />;
  if (requests.isError) return <ErrorState onRetry={() => requests.refetch()} />;

  const pending = (requests.data ?? []).filter((r) => r.status === 'pending');
  const decided = (requests.data ?? []).filter((r) => r.status !== 'pending');

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: pad.bottom }}
    >
      <Button label="Request a service" icon="plus" onPress={() => setShowNew(true)} testID="new-request" />
      <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>PENDING</Text>
      {pending.length === 0 ? (
        <EmptyState icon="check-circle" title="Nothing pending" />
      ) : (
        pending.map((r) => <RequestCard key={r.id} r={r} />)
      )}
      <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>DECIDED</Text>
      {decided.length === 0 ? (
        <EmptyState icon="archive" title="No decided requests yet" />
      ) : (
        decided.map((r) => <RequestCard key={r.id} r={r} />)
      )}
      <NewRequestModal visible={showNew} onClose={() => setShowNew(false)} />
    </ScrollView>
  );
}

function RequestCard({ r }: { r: { id: number; serviceName: string; providerName: string; memberName: string; note: string; price: number; status: string; createdAt: string } }) {
  const colors = useColors();
  const statusColor =
    r.status === 'approved' ? colors.success : r.status === 'declined' ? colors.destructive : colors.primary;
  return (
    <Card style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: colors.foreground, fontFamily: sansSemiBold, fontSize: 15, flex: 1 }} numberOfLines={1}>
          {r.serviceName}
        </Text>
        <Text style={{ color: statusColor, fontFamily: sansSemiBold, fontSize: 12, textTransform: 'capitalize' }}>
          {r.status}
        </Text>
      </View>
      <Text style={{ color: colors.mutedForeground, fontFamily: sansFont, fontSize: 13, marginTop: 2 }}>
        {r.memberName} · {r.providerName} · {formatAED(r.price)}
      </Text>
      <Text style={{ color: colors.mutedForeground, fontFamily: sansFont, fontSize: 13, marginTop: 4 }} numberOfLines={2}>
        “{r.note}”
      </Text>
    </Card>
  );
}

function NewRequestModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [providerId, setProviderId] = useState<number | null>(null);
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [note, setNote] = useState('');

  const providers = useListProviders({});
  const provider = useGetProvider(providerId ?? 0, {
    query: { enabled: providerId != null, queryKey: ['getProvider', providerId] },
  });
  const create = useCreateServiceRequest({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries();
        setProviderId(null);
        setServiceId(null);
        setNote('');
        onClose();
      },
    },
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 8 }}>
          <Text style={{ color: colors.foreground, fontFamily: sansSemiBold, fontSize: 18, flex: 1 }}>
            Request a service
          </Text>
          <Pressable onPress={onClose} hitSlop={10} testID="close-request-modal">
            <Feather name="x" size={22} color={colors.mutedForeground} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24, gap: 8 }} keyboardShouldPersistTaps="handled">
          <Text style={[styles.groupLabel, { color: colors.mutedForeground, marginTop: 0 }]}>PROVIDER</Text>
          {(providers.data ?? []).map((p) => (
            <Pill
              key={p.id}
              label={`${p.name} · ${p.categoryName}`}
              active={providerId === p.id}
              onPress={() => {
                setProviderId(p.id);
                setServiceId(null);
              }}
            />
          ))}
          {providerId != null && (
            <>
              <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>SERVICE</Text>
              {(provider.data?.services ?? []).map((s) => (
                <Pill
                  key={s.id}
                  label={`${s.name} · ${formatAED(s.price)}`}
                  active={serviceId === s.id}
                  onPress={() => setServiceId(s.id)}
                />
              ))}
            </>
          )}
          <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>WHY DO YOU NEED IT?</Text>
          <TextInput
            testID="request-note"
            value={note}
            onChangeText={setNote}
            placeholder="Add a note for the head of household"
            placeholderTextColor={colors.mutedForeground}
            multiline
            style={[
              styles.noteInput,
              { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border },
            ]}
          />
          <Button
            label="Send request"
            testID="submit-request"
            disabled={serviceId == null || !note.trim()}
            loading={create.isPending}
            onPress={() => {
              if (serviceId != null && note.trim()) {
                create.mutate({ data: { serviceId, note: note.trim() } });
              }
            }}
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

function Members() {
  const colors = useColors();
  const pad = useScreenPadding();
  const household = useGetHousehold();
  const activity = useListHouseholdActivity();

  if (household.isLoading) return <LoadingView />;
  if (household.isError || !household.data)
    return <ErrorState onRetry={() => household.refetch()} />;

  const members = household.data.members;

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: pad.bottom }}>
      {members.map((m) => {
        const color = getMemberColor(colors, m.id, m.isCurrentUser, members);
        const limit = m.monthlySpendLimit;
        const pct = limit ? Math.min(1, m.monthToDateSpend / limit) : null;
        return (
          <Card key={m.id} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Avatar initials={m.initials} color={color} size={40} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ color: colors.foreground, fontFamily: sansSemiBold, fontSize: 15 }}>
                    {m.name}
                  </Text>
                  {m.role === 'head' && <Feather name="award" size={14} color={colors.primary} />}
                </View>
                <Text style={{ color: colors.mutedForeground, fontFamily: sansFont, fontSize: 13 }}>
                  {m.relation}
                  {m.isCurrentUser ? ' · You' : ''}
                </Text>
              </View>
              <Text style={{ color: colors.foreground, fontFamily: sansMedium, fontSize: 13 }}>
                {formatAED(m.monthToDateSpend)}
              </Text>
            </View>
            {pct != null && (
              <View style={{ marginTop: 10 }}>
                <View style={[styles.limitTrack, { backgroundColor: colors.muted }]}>
                  <View
                    style={[
                      styles.limitFill,
                      {
                        width: `${pct * 100}%`,
                        backgroundColor: pct >= 0.85 ? colors.destructive : color,
                      },
                    ]}
                  />
                </View>
                <Text style={{ color: colors.mutedForeground, fontFamily: sansFont, fontSize: 11.5, marginTop: 4 }}>
                  {formatAED(m.monthToDateSpend)} of {formatAED(limit ?? 0)} monthly limit
                </Text>
              </View>
            )}
          </Card>
        );
      })}

      <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>RECENT ACTIVITY</Text>
      {(activity.data ?? []).map((a) => (
        <View key={a.id} style={[styles.activityRow, { borderColor: colors.border }]}>
          <Feather
            name={
              a.kind === 'payment'
                ? 'credit-card'
                : a.kind === 'review'
                  ? 'star'
                  : a.kind === 'booking_completed'
                    ? 'check-circle'
                    : 'calendar'
            }
            size={16}
            color={colors.primary}
          />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.foreground, fontFamily: sansFont, fontSize: 14 }}>
              {a.description}
            </Text>
            <Text style={{ color: colors.mutedForeground, fontFamily: sansFont, fontSize: 12 }}>
              {a.memberName} · {formatDateTime(a.occurredAt)}
            </Text>
          </View>
          {a.amount != null && (
            <Text style={{ color: colors.foreground, fontFamily: sansMedium, fontSize: 13 }}>
              {formatAED(a.amount)}
            </Text>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 10,
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: 'Outfit_400Regular',
    fontSize: 15,
    maxHeight: 110,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 11.5,
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 10,
  },
  noteInput: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    minHeight: 90,
    fontFamily: 'Outfit_400Regular',
    fontSize: 15,
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  limitTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  limitFill: {
    height: 6,
    borderRadius: 3,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
});
