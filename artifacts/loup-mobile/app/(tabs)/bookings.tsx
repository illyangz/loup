import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  useGetHousehold,
  useListBookings,
  type Booking,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { dateKey, getMemberColor, sameDay, withAlpha } from '@/lib/utils';
import { BookingCard } from '@/components/BookingCard';
import {
  Avatar,
  EmptyState,
  ErrorState,
  LoadingView,
  Pill,
  ScreenHeader,
  SectionTitle,
  sansFont,
  sansMedium,
  sansSemiBold,
  useScreenPadding,
} from '@/components/UI';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
type Scope = 'upcoming' | 'active' | 'past';

export default function BookingsScreen() {
  const colors = useColors();
  const pad = useScreenPadding();
  const today = new Date();
  const [monthDate, setMonthDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<Date>(today);
  const [memberFilter, setMemberFilter] = useState<number | null>(null);
  const [scope, setScope] = useState<Scope>('upcoming');

  const all = useListBookings({ scope: 'all' });
  const household = useGetHousehold();

  const members = household.data?.members;

  const filtered = useMemo(() => {
    const list = all.data ?? [];
    return memberFilter == null ? list : list.filter((b) => b.memberId === memberFilter);
  }, [all.data, memberFilter]);

  const byDate = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of filtered) {
      const k = dateKey(new Date(b.scheduledAt));
      const arr = map.get(k) ?? [];
      arr.push(b);
      map.set(k, arr);
    }
    return map;
  }, [filtered]);

  const scopedList = useMemo(() => {
    const now = Date.now();
    const list = filtered.filter((b) => {
      if (scope === 'past')
        return b.status === 'completed' || b.status === 'cancelled';
      if (scope === 'active')
        return ['en_route', 'arrived', 'in_progress'].includes(b.status);
      // upcoming
      return (
        !['completed', 'cancelled'].includes(b.status) &&
        new Date(b.scheduledAt).getTime() >= now - 3 * 3600_000
      );
    });
    return list.sort((a, b) =>
      scope === 'past'
        ? +new Date(b.scheduledAt) - +new Date(a.scheduledAt)
        : +new Date(a.scheduledAt) - +new Date(b.scheduledAt),
    );
  }, [filtered, scope]);

  const dayBookings = byDate.get(dateKey(selectedDay)) ?? [];

  // Calendar grid
  const grid = useMemo(() => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const first = new Date(year, month, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [monthDate]);

  if (all.isLoading || household.isLoading) return <LoadingView />;
  if (all.isError) return <ErrorState onRetry={() => all.refetch()} />;

  const monthLabel = monthDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: pad.top + 12,
        paddingBottom: pad.bottom,
        paddingHorizontal: 20,
      }}
    >
      <ScreenHeader title="Bookings" subtitle="The family calendar" />

      {/* Member filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 14 }}>
        <Pill label="Everyone" active={memberFilter == null} onPress={() => setMemberFilter(null)} />
        {(members ?? []).map((m) => {
          const color = getMemberColor(colors, m.id, m.isCurrentUser, members);
          return (
            <Pressable
              key={m.id}
              testID={`member-filter-${m.id}`}
              onPress={() => setMemberFilter(memberFilter === m.id ? null : m.id)}
              style={({ pressed }) => [
                styles.memberPill,
                {
                  backgroundColor:
                    memberFilter === m.id ? withAlpha(color, 0.15) : colors.card,
                  borderColor: memberFilter === m.id ? color : colors.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Avatar initials={m.initials} color={color} size={22} />
              <Text style={{ color: memberFilter === m.id ? color : colors.mutedForeground, fontFamily: sansMedium, fontSize: 13 }}>
                {m.name.split(' ')[0]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Month header */}
      <View style={styles.monthRow}>
        <Pressable
          testID="prev-month"
          onPress={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1))}
          hitSlop={10}
        >
          <Feather name="chevron-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={{ color: colors.foreground, fontFamily: sansSemiBold, fontSize: 17 }}>
          {monthLabel}
        </Text>
        <Pressable
          testID="next-month"
          onPress={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1))}
          hitSlop={10}
        >
          <Feather name="chevron-right" size={22} color={colors.foreground} />
        </Pressable>
        <Pressable
          testID="today-button"
          onPress={() => {
            setMonthDate(new Date(today.getFullYear(), today.getMonth(), 1));
            setSelectedDay(today);
          }}
          style={{ marginLeft: 'auto' }}
        >
          <Text style={{ color: colors.primary, fontFamily: sansMedium, fontSize: 13 }}>Today</Text>
        </Pressable>
      </View>

      {/* Calendar grid */}
      <View style={[styles.calendar, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <View style={styles.weekRow}>
          {WEEKDAYS.map((d, i) => (
            <Text key={i} style={[styles.weekday, { color: colors.mutedForeground }]}>
              {d}
            </Text>
          ))}
        </View>
        <View style={styles.daysWrap}>
          {grid.map((d, i) => {
            if (!d) return <View key={i} style={styles.dayCell} />;
            const dayList = byDate.get(dateKey(d)) ?? [];
            const isSelected = sameDay(d, selectedDay);
            const isToday = sameDay(d, today);
            return (
              <Pressable
                key={i}
                testID={`day-${d.getDate()}`}
                onPress={() => setSelectedDay(d)}
                style={[
                  styles.dayCell,
                  isSelected && {
                    backgroundColor: withAlpha(colors.primary, 0.15),
                    borderRadius: 12,
                  },
                ]}
              >
                <Text
                  style={{
                    color: isToday ? colors.primary : colors.foreground,
                    fontFamily: isToday || isSelected ? sansSemiBold : sansFont,
                    fontSize: 14,
                  }}
                >
                  {d.getDate()}
                </Text>
                <View style={styles.dotRow}>
                  {dayList.slice(0, 4).map((b) => (
                    <View
                      key={b.id}
                      style={[
                        styles.dot,
                        {
                          backgroundColor: getMemberColor(
                            colors,
                            b.memberId,
                            members?.find((m) => m.id === b.memberId)?.isCurrentUser ?? false,
                            members,
                          ),
                        },
                      ]}
                    />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Selected day */}
      <SectionTitle
        title={selectedDay.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })}
      />
      {dayBookings.length === 0 ? (
        <EmptyState icon="calendar" title="Nothing scheduled" subtitle="A quiet day for the household." />
      ) : (
        dayBookings.map((b) => (
          <BookingCard
            key={b.id}
            booking={b}
            memberColor={getMemberColor(
              colors,
              b.memberId,
              members?.find((m) => m.id === b.memberId)?.isCurrentUser ?? false,
              members,
            )}
          />
        ))
      )}

      {/* Scoped list */}
      <SectionTitle title="All bookings" />
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        {(['upcoming', 'active', 'past'] as Scope[]).map((sc) => (
          <Pill
            key={sc}
            label={sc === 'upcoming' ? 'Up next' : sc === 'active' ? 'Active' : 'Past'}
            active={scope === sc}
            onPress={() => setScope(sc)}
          />
        ))}
      </View>
      {scopedList.length === 0 ? (
        <EmptyState icon="inbox" title="No bookings here" />
      ) : (
        scopedList.map((b) => (
          <BookingCard
            key={b.id}
            booking={b}
            memberColor={getMemberColor(
              colors,
              b.memberId,
              members?.find((m) => m.id === b.memberId)?.isCurrentUser ?? false,
              members,
            )}
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  memberPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  calendar: {
    borderWidth: 1,
    padding: 10,
  },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Outfit_500Medium',
    fontSize: 11,
  },
  daysWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: 6,
    minHeight: 44,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 3,
    height: 5,
  },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
});
