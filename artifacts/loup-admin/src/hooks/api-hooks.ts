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
  LedgerEntry 
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
