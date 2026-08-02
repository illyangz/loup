import { useEffect, useState } from "react"
import { useParams, useLocation } from "wouter"
import { useGetProvider, useListAddresses, useCreateBooking, getListBookingsQueryKey, getGetHomeSummaryQueryKey } from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, MapPin, Calendar, FileText, Loader2 } from "lucide-react"

export default function Book() {
  const { providerId: pidStr } = useParams<{ providerId: string }>()
  const providerId = Number(pidStr)
  
  const [, setLocation] = useLocation()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const searchParams = new URLSearchParams(window.location.search)
  const initialServiceId = searchParams.get("serviceId")

  const { data: provider } = useGetProvider(providerId, { query: { enabled: !!providerId, queryKey: ['getProvider', providerId] as const } })
  const { data: addresses } = useListAddresses()
  
  const createBooking = useCreateBooking()

  const [serviceId, setServiceId] = useState<string>(initialServiceId || "")
  const [addressId, setAddressId] = useState<string>("")
  const [scheduledAt, setScheduledAt] = useState<string>("")
  const [instructions, setInstructions] = useState<string>("")

  // Default to 1 day from now at 10 AM
  useEffect(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(10, 0, 0, 0)
    
    // Format for datetime-local input (YYYY-MM-DDThh:mm)
    const tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
    const localISOTime = (new Date(tomorrow.getTime() - tzoffset)).toISOString().slice(0,-8);
    setScheduledAt(localISOTime)
  }, [])

  const selectedService = provider?.services.find(s => s.id.toString() === serviceId)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!serviceId || !addressId || !scheduledAt) return
    
    // Convert local time back to UTC for API
    const date = new Date(scheduledAt)
    
    createBooking.mutate({
      data: {
        serviceId: Number(serviceId),
        addressId: Number(addressId),
        scheduledAt: date.toISOString(),
        instructions: instructions || undefined
      }
    }, {
      onSuccess: (booking) => {
        toast({ title: "Booking Confirmed", description: "Your service has been scheduled." })
        queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() })
        queryClient.invalidateQueries({ queryKey: getGetHomeSummaryQueryKey() })
        setLocation(`/bookings/${booking.id}`)
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to create booking.", variant: "destructive" })
      }
    })
  }

  if (!provider) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading provider details...</div>

  return (
    <div className="max-w-xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="rounded-full bg-secondary">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-serif tracking-tight">Book Service</h1>
          <p className="text-muted-foreground text-sm">{provider.name}</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardContent className="p-6 space-y-6">
            {/* Service Selection */}
            <div className="space-y-3">
              <Label className="text-base flex items-center gap-2"><span className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">1</span> Select Service</Label>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger className="h-14">
                  <SelectValue placeholder="Choose a service" />
                </SelectTrigger>
                <SelectContent>
                  {provider.services.map(service => (
                    <SelectItem key={service.id} value={service.id.toString()}>
                      <div className="flex justify-between items-center w-full min-w-[200px]">
                        <span>{service.name}</span>
                        <span className="text-muted-foreground ml-4">{service.price} AED</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Address Selection */}
            <div className="space-y-3">
              <Label className="text-base flex items-center gap-2"><MapPin className="h-8 w-8 p-1.5 rounded-full bg-primary/10 text-primary" /> Service Location</Label>
              <Select value={addressId} onValueChange={setAddressId}>
                <SelectTrigger className="h-14">
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

            {/* Date & Time */}
            <div className="space-y-3">
              <Label className="text-base flex items-center gap-2"><Calendar className="h-8 w-8 p-1.5 rounded-full bg-primary/10 text-primary" /> Date & Time</Label>
              <Input 
                type="datetime-local" 
                className="h-14"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>

            {/* Instructions */}
            <div className="space-y-3">
              <Label className="text-base flex items-center gap-2"><FileText className="h-8 w-8 p-1.5 rounded-full bg-primary/10 text-primary" /> Instructions (Optional)</Label>
              <textarea 
                className="flex min-h-[100px] w-full rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="E.g., Key is under the mat, gate code is 1234..."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Total & Submit */}
        {selectedService && (
          <Card className="bg-primary text-primary-foreground border-0">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-80">Estimated Total</p>
                <p className="text-3xl font-serif mt-1">{selectedService.price} <span className="text-sm font-sans">AED</span></p>
              </div>
              <Button 
                type="submit" 
                size="lg" 
                className="bg-white text-primary hover:bg-white/90 px-8"
                disabled={!serviceId || !addressId || !scheduledAt || createBooking.isPending}
              >
                {createBooking.isPending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                Confirm Booking
              </Button>
            </CardContent>
          </Card>
        )}
      </form>
    </div>
  )
}