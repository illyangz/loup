import React, { useMemo, useState } from 'react';
import {
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
  useCreateBooking,
  useGetProvider,
  useListAddresses,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { formatAED, withAlpha } from '@/lib/utils';
import {
  Button,
  ErrorState,
  LoadingView,
  Pill,
  sansFont,
  sansMedium,
  sansSemiBold,
  serifFont,
} from '@/components/UI';

const TIME_SLOTS = ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

export default function BookScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ providerId: string; serviceId?: string }>();
  const providerId = Number(params.providerId);

  const provider = useGetProvider(providerId);
  const addresses = useListAddresses();

  const [serviceId, setServiceId] = useState<number | null>(
    params.serviceId ? Number(params.serviceId) : null,
  );
  const [addressId, setAddressId] = useState<number | null>(null);
  const [dayOffset, setDayOffset] = useState<number>(1);
  const [time, setTime] = useState<string>('10:00');
  const [instructions, setInstructions] = useState('');

  const create = useCreateBooking({
    mutation: {
      onSuccess: (booking) => {
        qc.invalidateQueries();
        router.replace(`/booking/${booking.id}`);
      },
    },
  });

  const days = useMemo(() => {
    return Array.from({ length: 10 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return d;
    });
  }, []);

  if (provider.isLoading || addresses.isLoading) return <LoadingView />;
  if (provider.isError || !provider.data)
    return <ErrorState onRetry={() => provider.refetch()} />;

  const p = provider.data;
  const selectedService = p.services.find((s) => s.id === serviceId);
  const effectiveAddressId = addressId ?? addresses.data?.[0]?.id ?? null;
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const confirm = () => {
    if (serviceId == null || effectiveAddressId == null) return;
    const d = days[dayOffset] ?? days[0]!;
    const [h, m] = time.split(':').map(Number);
    const scheduled = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h!, m!);
    create.mutate({
      data: {
        serviceId,
        addressId: effectiveAddressId,
        scheduledAt: scheduled.toISOString(),
        ...(instructions.trim() ? { instructions: instructions.trim() } : {}),
      },
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: topPad + 8,
          paddingHorizontal: 20,
          paddingBottom: 140,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back} testID="back-button">
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={{ color: colors.foreground, fontFamily: serifFont, fontSize: 28, marginTop: 10 }}>
          Book {p.name}
        </Text>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>SERVICE</Text>
        <View style={{ gap: 8 }}>
          {p.services.map((s) => (
            <Pill
              key={s.id}
              testID={`pick-service-${s.id}`}
              label={`${s.name} · ${formatAED(s.price)}`}
              active={serviceId === s.id}
              onPress={() => setServiceId(s.id)}
            />
          ))}
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>LOCATION</Text>
        <View style={{ gap: 8 }}>
          {(addresses.data ?? []).map((a) => (
            <Pill
              key={a.id}
              testID={`pick-address-${a.id}`}
              label={`${a.label} · ${a.area}`}
              active={effectiveAddressId === a.id}
              onPress={() => setAddressId(a.id)}
            />
          ))}
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>DAY</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {days.map((d, i) => {
            const active = dayOffset === i;
            return (
              <Pressable
                key={i}
                testID={`pick-day-${i}`}
                onPress={() => setDayOffset(i)}
                style={[
                  styles.dayChip,
                  {
                    backgroundColor: active ? withAlpha(colors.primary, 0.15) : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={{ color: active ? colors.primary : colors.mutedForeground, fontFamily: sansMedium, fontSize: 12 }}>
                  {i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' })}
                </Text>
                <Text style={{ color: active ? colors.primary : colors.foreground, fontFamily: sansSemiBold, fontSize: 16 }}>
                  {d.getDate()}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>TIME</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TIME_SLOTS.map((t) => (
            <Pill key={t} label={t} active={time === t} onPress={() => setTime(t)} testID={`pick-time-${t}`} />
          ))}
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>INSTRUCTIONS (OPTIONAL)</Text>
        <TextInput
          testID="booking-instructions"
          value={instructions}
          onChangeText={setInstructions}
          placeholder="Gate code, pets, parking…"
          placeholderTextColor={colors.mutedForeground}
          multiline
          style={[
            styles.notes,
            { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border },
          ]}
        />
      </ScrollView>

      {/* Sticky footer */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 12) + (Platform.OS === 'web' ? 34 : 0),
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.mutedForeground, fontFamily: sansFont, fontSize: 12 }}>Estimated total</Text>
          <Text style={{ color: colors.foreground, fontFamily: sansSemiBold, fontSize: 20 }}>
            {selectedService ? formatAED(selectedService.price) : '—'}
          </Text>
        </View>
        <Button
          testID="confirm-booking"
          label="Confirm booking"
          disabled={serviceId == null || effectiveAddressId == null}
          loading={create.isPending}
          onPress={confirm}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { alignSelf: 'flex-start' },
  label: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 11.5,
    letterSpacing: 1,
    marginTop: 22,
    marginBottom: 10,
  },
  dayChip: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 2,
  },
  notes: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    minHeight: 80,
    fontFamily: 'Outfit_400Regular',
    fontSize: 15,
    textAlignVertical: 'top',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
  },
});
