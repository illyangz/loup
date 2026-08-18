import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  adminFetch, 
  AdminOverview, 
  AdminInstitution, 
  AdminProvider, 
  QualityFlag, 
  AdminCategory, 
  AdminService, 
  AdminBooking, 
  LedgerEntry,
  AdminAnalytics,
  AdminIncident,
  IncidentNote,
} from "@/lib/api";

// Overview
export function useOverview() {
  return useQuery<AdminOverview>({
    queryKey: ["admin", "overview"],
    queryFn: () => adminFetch("/v1/admin/overview"),
  });
}

export function useQualityFlags() {
  return useQuery<QualityFlag[]>({
    queryKey: ["admin", "quality-flags"],
    queryFn: () => adminFetch("/v1/admin/quality-flags"),
  });
}

export function useResolveQualityFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => adminFetch(`/v1/admin/quality-flags/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "resolved" })
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "quality-flags"] });
      qc.invalidateQueries({ queryKey: ["admin", "providers"] });
      qc.invalidateQueries({ queryKey: ["admin", "overview"] });
    }
  });
}

// Institutions
export function useInstitutions() {
  return useQuery<AdminInstitution[]>({
    queryKey: ["admin", "institutions"],
    queryFn: () => adminFetch("/v1/admin/institutions"),
  });
}

export function useCreateInstitution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; type: string; city: string; country: string }) => 
      adminFetch("/v1/admin/institutions", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "institutions"] })
  });
}

export function useUpdateInstitution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; city?: string; active?: boolean } }) => 
      adminFetch(`/v1/admin/institutions/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "institutions"] })
  });
}

export function useCreateCampus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => 
      adminFetch(`/v1/admin/institutions/${id}/campuses`, { method: "POST", body: JSON.stringify({ name }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "institutions"] })
  });
}

// Providers
export function useProviders() {
  return useQuery<AdminProvider[]>({
    queryKey: ["admin", "providers"],
    queryFn: () => adminFetch("/v1/admin/providers"),
  });
}

export function useUpdateProviderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: number; action: "approve" | "suspend" }) => 
      adminFetch(`/v1/admin/providers/${id}`, { method: "PATCH", body: JSON.stringify({ action }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "providers"] });
      qc.invalidateQueries({ queryKey: ["admin", "overview"] });
    }
  });
}

// Catalog
export function useCategories() {
  return useQuery<AdminCategory[]>({
    queryKey: ["admin", "categories"],
    queryFn: () => adminFetch("/v1/admin/categories"),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; tagline: string; icon: string; startingPrice: number }) => 
      adminFetch("/v1/admin/categories", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "categories"] })
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; tagline?: string; startingPrice?: number } }) => 
      adminFetch(`/v1/admin/categories/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "categories"] })
  });
}

export function useServices() {
  return useQuery<AdminService[]>({
    queryKey: ["admin", "services"],
    queryFn: () => adminFetch("/v1/admin/services"),
  });
}

export function useCreateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description: string; price: number; durationMinutes: number; providerId: number }) => 
      adminFetch("/v1/admin/services", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "services"] })
  });
}

export function useUpdateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; description?: string; price?: number; durationMinutes?: number } }) => 
      adminFetch(`/v1/admin/services/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "services"] })
  });
}

// Bookings
export function useBookings(status?: string) {
  return useQuery<AdminBooking[]>({
    queryKey: ["admin", "bookings", status],
    queryFn: () => {
      const qs = status ? `?status=${encodeURIComponent(status)}` : "";
      return adminFetch(`/v1/admin/bookings${qs}`);
    },
  });
}

export function useUpdateBookingStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: "cancelled" | "completed" }) => 
      adminFetch(`/v1/admin/bookings/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "bookings"] })
  });
}

// Ledger
export function useLedger(institutionId?: number) {
  return useQuery<LedgerEntry[]>({
    queryKey: ["admin", "ledger", institutionId],
    queryFn: () => {
      const qs = institutionId ? `?institution=${institutionId}` : "";
      return adminFetch(`/v1/admin/ledger${qs}`);
    },
  });
}

export function useRefundLedgerEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => 
      adminFetch(`/v1/admin/ledger/${id}/refund`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "ledger"] })
  });
}

export function useAnalytics() {
  return useQuery<AdminAnalytics>({
    queryKey: ["admin", "analytics"],
    queryFn: () => adminFetch("/v1/admin/analytics"),
    refetchInterval: 60_000,
  });
}

// Incidents
export function useIncidents(status?: string) {
  return useQuery<AdminIncident[]>({
    queryKey: ["admin", "incidents", status],
    queryFn: () => {
      const qs = status ? `?status=${encodeURIComponent(status)}` : "";
      return adminFetch(`/v1/admin/incidents${qs}`);
    },
  });
}

export function useResolveIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, resolution }: { id: number; status: string; resolution?: string }) =>
      adminFetch(`/v1/admin/incidents/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, resolution }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "incidents"] });
      qc.invalidateQueries({ queryKey: ["admin", "bookings"] });
      qc.invalidateQueries({ queryKey: ["admin", "overview"] });
    },
  });
}

export function useAssignIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assigneeName }: { id: number; assigneeName: string | null }) =>
      adminFetch(`/v1/admin/incidents/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ assigneeName }),
      }),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ["admin", "incidents"] });
      qc.invalidateQueries({ queryKey: ["admin", "incidents", id, "notes"] });
    },
  });
}

export function useIncidentNotes(incidentId: number | null) {
  return useQuery<IncidentNote[]>({
    queryKey: ["admin", "incidents", incidentId, "notes"],
    queryFn: () => adminFetch(`/v1/admin/incidents/${incidentId}/notes`),
    enabled: incidentId !== null,
  });
}

export function useAddIncidentNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) =>
      adminFetch(`/v1/admin/incidents/${id}/notes`, {
        method: "POST",
        body: JSON.stringify({ note }),
      }),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ["admin", "incidents", id, "notes"] });
    },
  });
}
