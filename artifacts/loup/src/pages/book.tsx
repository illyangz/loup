import { useEffect, useState } from "react"
import { useParams, useLocation } from "wouter"
import {
  useGetProvider,
  useListAddresses,
  useCreateBooking,
  useGetCheckoutPreview,
  getListBookingsQueryKey,
  getGetHomeSummaryQueryKey,
  getGetEmployeeOverviewQueryKey,
} from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  ArrowLeft, ArrowRight, MapPin, Calendar, FileText, Loader2,
  CreditCard, Building2, Check, ChevronRight, Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"

function aed(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "AED", maximumFractionDigits: 0 }).format(v)
}

const STEPS = ["Service & Date", "Payment Split", "Confirm"]

export default function Book() {
  const { providerId: pidStr } = useParams<{ providerId: string }>()
  const providerId = Number(pidStr)
  const [, setLocation] = useLocation()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const searchParams = new URLSearchParams(window.location.search)
  const initialServiceId = searchParams.get("serviceId")

  const { data: provider } = useGetProvider(providerId, {
    query: { enabled: !!providerId, queryKey: ["getProvider", providerId] as const },
  })
  const { data: addresses } = useListAddresses()
  const createBooking = useCreateBooking()

  const [step, setStep] = useState(1)
  const [serviceId, setServiceId] = useState<string>(initialServiceId || "")
  const [addressId, setAddressId] = useState<string>("")
  const [scheduledAt, setScheduledAt] = useState<string>("")
  const [instructions, setInstructions] = useState<string>("")
  const [allowanceAmount, setAllowanceAmount] = useState<number>(0)
  const [cardNumber, setCardNumber] = useState("")

  // Default to tomorrow at 10 AM
  useEffect(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(10, 0, 0, 0)
    const offset = new Date().getTimezoneOffset() * 60000
    setScheduledAt(new Date(tomorrow.getTime() - offset).toISOString().slice(0, -8))
  }, [])

  // Set default service if available
  useEffect(() => {
    if (!serviceId && provider?.services[0]) {
      setServiceId(String(provider.services[0].id))
    }
  }, [provider, serviceId])

  // Set default address
  useEffect(() => {
    if (!addressId && addresses?.[0]) {
      setAddressId(String(addresses[0].id))
    }
  }, [addresses, addressId])

  const selectedService = provider?.services.find(s => s.id.toString() === serviceId)

  const { data: preview } = useGetCheckoutPreview(
    { serviceId: Number(serviceId) },
    { query: { enabled: !!serviceId && step >= 2, queryKey: ["checkoutPreview", serviceId] as const } }
  )

  // Sync allowance slider when preview loads
  useEffect(() => {
    if (preview) setAllowanceAmount(preview.employerContribution)
  }, [preview?.employerContribution])

  const copayment = preview ? Math.max(0, preview.institutionalPrice - allowanceAmount) : 0

  const step1Valid = !!serviceId && !!addressId && !!scheduledAt
  const step2Valid = true // slider always in valid range

  const handleComplete = () => {
    if (!serviceId || !addressId || !scheduledAt) return
    createBooking.mutate(
      {
        data: {
          serviceId: Number(serviceId),
          addressId: Number(addressId),
          scheduledAt: new Date(scheduledAt).toISOString(),
          instructions: instructions || undefined,
          allowanceContribution: allowanceAmount > 0 ? allowanceAmount : undefined,
        },
      },
      {
        onSuccess: (booking) => {
          toast({ title: "Booking Confirmed ✓", description: "Your service has been scheduled and your benefit applied." })
          queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() })
          queryClient.invalidateQueries({ queryKey: getGetHomeSummaryQueryKey() })
          queryClient.invalidateQueries({ queryKey: getGetEmployeeOverviewQueryKey() })
          setLocation(`/bookings/${booking.id}`)
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to create booking.", variant: "destructive" })
        },
      }
    )
  }

  if (!provider) {
    return (
      <div className="p-8 text-center text-muted-foreground animate-pulse">
        Loading provider details…
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Back header */}
      <header className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="rounded-full bg-secondary shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-2xl font-serif tracking-tight truncate">Book Service</h1>
          <p className="text-muted-foreground text-sm truncate">{provider.name}</p>
        </div>
      </header>

      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((label, i) => {
          const idx = i + 1
          const done = step > idx
          const active = step === idx
          return (
            <div key={label} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1.5">
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition-all border",
                  done && "bg-emerald-500/20 border-emerald-500/40 text-emerald-400",
                  active && "bg-primary border-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.5)]",
                  !active && !done && "bg-white/5 border-white/10 text-white/40",
                )}>
                  {done ? <Check className="h-4 w-4" /> : idx}
                </div>
                <span className={cn(
                  "text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap",
                  active ? "text-white" : done ? "text-emerald-400" : "text-white/30"
                )}>{label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn("flex-1 h-px mx-2 mb-5 transition-colors", done ? "bg-emerald-500/40" : "bg-white/10")} />
              )}
            </div>
          )
        })}
      </div>

      {/* ── STEP 1: Service & Date ── */}
      {step === 1 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="glass-card rounded-3xl p-6 space-y-6">
            <div className="space-y-3">
              <Label className="text-sm font-semibold uppercase tracking-wider text-white/60">Select service</Label>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger className="h-14 bg-white/5 border-white/10">
                  <SelectValue placeholder="Choose a service" />
                </SelectTrigger>
                <SelectContent>
                  {provider.services.map(svc => (
                    <SelectItem key={svc.id} value={svc.id.toString()}>
                      <div className="flex justify-between items-center w-full min-w-[200px]">
                        <span>{svc.name}</span>
                        <span className="text-muted-foreground ml-4 text-sm">{svc.price} AED</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold uppercase tracking-wider text-white/60">
                <MapPin className="inline h-3.5 w-3.5 mr-1.5" />Service location
              </Label>
              <Select value={addressId} onValueChange={setAddressId}>
                <SelectTrigger className="h-14 bg-white/5 border-white/10">
                  <SelectValue placeholder="Choose an address" />
                </SelectTrigger>
                <SelectContent>
                  {addresses?.map(addr => (
                    <SelectItem key={addr.id} value={addr.id.toString()}>
                      {addr.label} — {addr.area}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold uppercase tracking-wider text-white/60">
                <Calendar className="inline h-3.5 w-3.5 mr-1.5" />Date & time
              </Label>
              <Input
                type="datetime-local"
                className="h-14 bg-white/5 border-white/10"
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold uppercase tracking-wider text-white/60">
                <FileText className="inline h-3.5 w-3.5 mr-1.5" />Instructions <span className="text-white/30 normal-case tracking-normal font-normal">(optional)</span>
              </Label>
              <textarea
                className="flex min-h-[90px] w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm placeholder:text-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="E.g., key is under the mat, gate code is 1234…"
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
              />
            </div>
          </div>

          {selectedService && (
            <div className="glass-card rounded-2xl px-5 py-4 flex justify-between items-center text-sm text-white/60">
              <span>{selectedService.name}</span>
              <span className="font-semibold text-white">{aed(selectedService.price)} <span className="text-white/40 font-normal">list price</span></span>
            </div>
          )}

          <Button
            className="w-full h-14 text-base font-semibold rounded-2xl"
            disabled={!step1Valid}
            onClick={() => setStep(2)}
          >
            Review payment split <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      )}

      {/* ── STEP 2: Payment Split ── */}
      {step === 2 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="glass-card rounded-3xl p-6 space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-white/50 font-semibold mb-4">Price breakdown</p>
              <div className="space-y-3">
                {preview ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">List (public) price</span>
                      <span className="line-through text-white/40">{aed(preview.publicPrice)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60 flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" />Meridian institutional price
                      </span>
                      <span className="font-semibold text-emerald-400">{aed(preview.institutionalPrice)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-white/40">Your saving</span>
                      <span className="text-emerald-400">−{aed(preview.institutionalSaving ?? 0)}</span>
                    </div>
                  </>
                ) : (
                  <div className="h-16 bg-white/5 rounded-xl animate-pulse" />
                )}
              </div>
            </div>

            {preview && (
              <div className="border-t border-white/10 pt-6 space-y-5">
                <div>
                  <div className="flex justify-between items-baseline mb-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/50 font-semibold">Apply benefit allowance</p>
                    <span className="text-xs text-white/40">{aed(preview.availableAllowance)} available</span>
                  </div>
                  <div className="space-y-3">
                    <input
                      type="range"
                      min={0}
                      max={Math.min(preview.availableAllowance, preview.institutionalPrice)}
                      step={5}
                      value={allowanceAmount}
                      onChange={e => setAllowanceAmount(Number(e.target.value))}
                      className="w-full accent-[hsl(var(--primary))] h-2 rounded-full"
                    />
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Benefit covers</span>
                      <span className="font-semibold text-primary">{aed(allowanceAmount)}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Employer contribution</span>
                    <span className="font-medium text-primary">{aed(allowanceAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Your out-of-pocket</span>
                    <span className={cn("font-semibold", copayment === 0 ? "text-emerald-400" : "text-white")}>
                      {copayment === 0 ? "AED 0 — fully covered!" : aed(copayment)}
                    </span>
                  </div>
                  <div className="h-px bg-white/10" />
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Total service cost</span>
                    <span>{aed(preview.institutionalPrice)}</span>
                  </div>
                </div>

                {allowanceAmount === 0 && (
                  <p className="text-xs text-amber-400/80">
                    Tip: slide right to let your Meridian benefit cover some or all of this cost.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 h-12 rounded-2xl border-white/10" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button className="flex-2 h-12 px-8 rounded-2xl font-semibold" disabled={!step2Valid} onClick={() => setStep(3)}>
              Confirm split <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Confirm ── */}
      {step === 3 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="glass-card rounded-3xl p-6 space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-white/50 font-semibold mb-4">Booking summary</p>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Service</span>
                  <span className="font-medium">{selectedService?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Provider</span>
                  <span className="font-medium">{provider.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Date & time</span>
                  <span className="font-medium">{new Date(scheduledAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Location</span>
                  <span className="font-medium">{addresses?.find(a => a.id === Number(addressId))?.label}</span>
                </div>
                {instructions && (
                  <div className="flex justify-between gap-4">
                    <span className="text-white/60 shrink-0">Notes</span>
                    <span className="text-right text-white/80 text-xs">{instructions}</span>
                  </div>
                )}
              </div>
            </div>

            {preview && (
              <div className="border-t border-white/10 pt-5">
                <p className="text-xs uppercase tracking-[0.18em] text-white/50 font-semibold mb-4">Payment</p>
                <div className="space-y-2 text-sm mb-5">
                  <div className="flex justify-between">
                    <span className="text-white/60">Benefit applied</span>
                    <span className="text-primary font-semibold">{aed(allowanceAmount)}</span>
                  </div>
                  {copayment > 0 && (
                    <div className="flex justify-between">
                      <span className="text-white/60">Your card</span>
                      <span className="font-semibold">{aed(copayment)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold border-t border-white/10 pt-2">
                    <span>Total</span>
                    <span>{aed(preview.institutionalPrice)}</span>
                  </div>
                </div>

                {copayment > 0 ? (
                  <div className="space-y-3">
                    <Label className="text-xs text-white/60 flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5" />Card for {aed(copayment)} copayment
                    </Label>
                    <div className="relative">
                      <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                      <Input
                        type="text"
                        maxLength={19}
                        placeholder="•••• •••• •••• ••••"
                        className="h-14 pl-11 bg-white/5 border-white/10 font-mono tracking-widest"
                        value={cardNumber}
                        onChange={e => setCardNumber(e.target.value.replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim())}
                      />
                    </div>
                    <p className="text-[11px] text-white/30">Demo mode — no real charge will occur.</p>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-emerald-400 shrink-0" />
                    <p className="text-sm text-emerald-300">Your benefit fully covers this service. No card needed.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 h-12 rounded-2xl border-white/10" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button
              className="flex-2 h-12 px-8 rounded-2xl font-semibold bg-gradient-to-br from-[hsl(var(--primary))] to-[#d27c4b] text-black"
              disabled={createBooking.isPending || (copayment > 0 && cardNumber.replace(/\s/g, "").length < 16)}
              onClick={handleComplete}
            >
              {createBooking.isPending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Check className="h-5 w-5 mr-2" />}
              Complete booking
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
