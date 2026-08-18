export const ADMIN_HEADERS = {
  "Content-Type": "application/json",
  "x-loup-demo-role": "admin",
};

export async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      ...ADMIN_HEADERS,
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

export type AdminOverview = {
  totalInstitutions: number;
  totalEmployees: number;
  bookingsToday: number;
  platformRevenueEstimate: number;
  qualityWarningsCount: number;
  activeProviders: number;
};

export type AdminInstitution = {
  id: number;
  name: string;
  slug: string;
  type: string;
  city: string;
  country: string;
  active: boolean;
  campusCount: number;
  campuses: { id: number; name: string }[];
  employeeCount: number;
  createdAt: string;
};

export type AdminProvider = {
  id: number;
  name: string;
  tagline: string;
  categoryId: number;
  categoryName: string;
  rating: number;
  reviewCount: number;
  jobsCompleted: number;
  verified: boolean;
  availableNow: boolean;
  startingPrice: number;
  status: string;
  openFlagCount: number;
  hasOpenFlag: boolean;
  reducedRouting: boolean;
  qualityFlags: { id: number; flagType: string; currentValue: number; threshold: number }[];
};

export type QualityFlag = {
  id: number;
  providerId: number;
  providerName: string;
  flagType: string;
  threshold: number;
  currentValue: number;
  status: string;
  reviewedAt: string | null;
  createdAt: string;
};

export type AdminCategory = {
  id: number;
  name: string;
  slug: string;
  tagline: string;
  icon: string;
  startingPrice: number;
  providerCount: number;
  serviceCount: number;
};

export type AdminService = {
  id: number;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  providerId: number;
  providerName: string;
  categoryId: number | null;
  categoryName: string;
};

export type AdminBooking = {
  id: number;
  memberName: string;
  providerName: string;
  serviceName: string;
  categoryName: string;
  scheduledAt: string;
  status: string;
  priceEstimate: number;
  instructions: string | null;
};

export type LedgerEntry = {
  id: number;
  employeeId: number;
  employeeName: string;
  entryType: string;
  amount: number;
  referenceType: string | null;
  referenceId: number | null;
  note: string | null;
  createdAt: string;
};

export type AdminAnalytics = {
  bookingsPerDay: { date: string; count: number }[];
  revenueByCategory: { categoryName: string; revenue: number; bookingCount: number }[];
  redemptionByInstitution: {
    institutionId: number;
    institutionName: string;
    authorizedAmount: number;
    redeemedAmount: number;
    redemptionRate: number;
  }[];
};

export type AdminIncident = {
  id: number;
  bookingId: number | null;
  bookingStatus: string | null;
  bookingScheduledAt: string | null;
  bookingPriceEstimate: number | null;
  employeeId: number | null;
  employeeName: string | null;
  providerName: string | null;
  memberName: string | null;
  category: string;
  description: string;
  status: string;
  resolution: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

export type IncidentNote = {
  id: number;
  incidentId: number;
  authorRole: string;
  note: string;
  createdAt: string;
};
