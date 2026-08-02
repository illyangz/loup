import type { BookingStatus } from '@workspace/api-client-react';

type Palette = {
  primary: string;
  pack1: string;
  pack2: string;
  pack3: string;
  pack4: string;
  pack5: string;
  pack6: string;
};

type BaseMember = { id: number; isCurrentUser?: boolean };

export function getMemberIndex(memberId: number, members?: BaseMember[]) {
  if (!members) return memberId;
  const sorted = [...members].sort((a, b) => a.id - b.id);
  const nonCurrent = sorted.filter((m) => !m.isCurrentUser);
  const idx = nonCurrent.findIndex((m) => m.id === memberId);
  return idx >= 0 ? idx : memberId;
}

export function getMemberColor(
  palette: Palette,
  memberId: number,
  isCurrentUser: boolean = false,
  members?: BaseMember[],
): string {
  if (isCurrentUser) return palette.primary;
  const packs = [
    palette.pack1,
    palette.pack2,
    palette.pack3,
    palette.pack4,
    palette.pack5,
    palette.pack6,
  ];
  const index = getMemberIndex(memberId, members);
  return packs[index % 6] ?? palette.pack1;
}

export function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}

export function formatAED(amount: number): string {
  return `AED ${amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  return `${formatDay(iso)}, ${formatTime(iso)}`;
}

export const LIVE_STATUSES: BookingStatus[] = [
  'confirmed',
  'en_route',
  'arrived',
  'in_progress',
];

export const ACTIVE_STATUSES: BookingStatus[] = [
  'en_route',
  'arrived',
  'in_progress',
];

export function statusLabel(status: BookingStatus): string {
  const map: Record<string, string> = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    en_route: 'En route',
    arrived: 'Arrived',
    in_progress: 'In progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return map[status] ?? status;
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

// Lucide icon name (web) -> Feather icon name (mobile)
export function categoryIcon(lucideName: string): string {
  const map: Record<string, string> = {
    Sparkles: 'star',
    AirVent: 'wind',
    Wrench: 'tool',
    Droplets: 'droplet',
    Zap: 'zap',
    Car: 'truck',
    Shirt: 'tag',
    ChefHat: 'coffee',
    Scissors: 'scissors',
    Flower2: 'sun',
    Dog: 'github',
    Baby: 'smile',
    Dumbbell: 'activity',
    Laptop: 'monitor',
    PaintRoller: 'edit-2',
    Bug: 'shield',
    Hammer: 'tool',
    Truck: 'truck',
    Home: 'home',
    Heart: 'heart',
    Leaf: 'feather',
    Waves: 'droplet',
  };
  return map[lucideName] ?? 'grid';
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
