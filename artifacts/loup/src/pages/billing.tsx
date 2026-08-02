import { useState } from "react"
import { 
  useGetBillingStatement, 
  useListPaymentMethods, 
  usePayBillingStatement,
  getGetBillingStatementQueryKey,
  getListBillingHistoryQueryKey,
  getGetHomeSummaryQueryKey
} from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { Receipt, CreditCard, Wallet, Banknote, CheckCircle2, AlertCircle, ChevronRight, Loader2 } from "lucide-react"

export default function Billing() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  const { data: statement, isLoading: isLoadingStatement } = useGetBillingStatement()
  const { data: paymentMethods, isLoading: isLoadingMethods } = useListPaymentMethods()
  
  const payStatement = usePayBillingStatement()
  
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [selectedMethodId, setSelectedMethodId] = useState<string>("")
  const [isSuccessState, setIsSuccessState] = useState(false)

  const handlePay = () => {
    if (!selectedMethodId) return
    
    payStatement.mutate({ data: { paymentMethodId: Number(selectedMethodId) } }, {
      onSuccess: () => {
        setIsSuccessState(true)
        setTimeout(() => {
          setIsPaymentOpen(false)
          setIsSuccessState(false)
          queryClient.invalidateQueries({ queryKey: getGetBillingStatementQueryKey() })
          queryClient.invalidateQueries({ queryKey: getListBillingHistoryQueryKey() })
          queryClient.invalidateQueries({ queryKey: getGetHomeSummaryQueryKey() })
          toast({ title: "Payment Successful", description: "Your household bill has been settled." })
        }, 2000)
      },
      onError: () => {
        toast({ title: "Payment Failed", description: "There was an issue processing your payment.", variant: "destructive" })
      }
    })
  }

  // Pre-select default method
  if (paymentMethods && !selectedMethodId && !isLoadingMethods) {
    const defaultMethod = paymentMethods.find(m => m.isDefault)
    if (defaultMethod) setSelectedMethodId(defaultMethod.id.toString())
  }

  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'card': return <CreditCard className="h-5 w-5" />
      case 'wallet': return <Wallet className="h-5 w-5" />
      case 'cash': return <Banknote className="h-5 w-5" />
      default: return <CreditCard className="h-5 w-5" />
    }
  }

  if (isLoadingStatement) {
    return <div className="p-8 space-y-6"><Skeleton className="h-10 w-48" /><Skeleton className="h-[200px] w-full" /><Skeleton className="h-[400px] w-full" /></div>
  }

  if (!statement) return <div>No billing statement available.</div>

  const isOpen = statement.status === "open"

  return (
    <div className="space-y-8 animate-in fade-in pb-20">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-serif tracking-tight">Billing</h1>
          <p className="text-muted-foreground mt-1">Consolidated household statement</p>
        </div>
      </header>

      {/* Main Statement Card */}
      <Card className={`overflow-hidden border-2 ${isOpen ? 'border-primary' : 'border-border'}`}>
        <div className={`p-6 sm:p-8 ${isOpen ? 'bg-primary text-primary-foreground' : 'bg-card'}`}>
          <div className="flex justify-between items-start mb-6">
            <div>
              <Badge variant={isOpen ? "secondary" : "outline"} className={isOpen ? "bg-white/20 text-white border-0" : "bg-emerald-100 text-emerald-800"}>
                {isOpen ? 'Open Statement' : 'Paid'}
              </Badge>
              <h2 className="text-2xl font-serif mt-3">{statement.month}</h2>
            </div>
            {!isOpen && <CheckCircle2 className="h-8 w-8 text-emerald-500" />}
          </div>
          
          <div className="flex items-baseline gap-2">
            <span className="text-5xl sm:text-6xl font-serif tracking-tight">{statement.total}</span>
            <span className="text-xl font-medium opacity-80">AED</span>
          </div>
          
          {!isOpen && statement.paidAt && (
            <p className="text-sm mt-4 text-muted-foreground">
              Paid on {new Date(statement.paidAt).toLocaleDateString()} via {statement.paidWith}
            </p>
          )}
        </div>
        
        {isOpen && (
          <div className="p-6 bg-card border-t border-border">
            <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="w-full h-14 text-lg shadow-md">
                  Settle Bill
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                {isSuccessState ? (
                  <div className="py-12 flex flex-col items-center justify-center space-y-4 animate-in zoom-in-95 duration-300">
                    <div className="h-20 w-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2">
                      <CheckCircle2 className="h-10 w-10" />
                    </div>
                    <DialogTitle className="text-2xl text-center">Payment Successful</DialogTitle>
                    <p className="text-muted-foreground text-center">Your statement has been paid in full.</p>
                  </div>
                ) : (
                  <>
                    <DialogHeader>
                      <DialogTitle>Settle Statement</DialogTitle>
                      <DialogDescription>
                        Pay your consolidated household bill for {statement.month}.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-6">
                      <div className="flex justify-between items-center mb-6 p-4 rounded-xl bg-secondary/50">
                        <span className="font-medium">Total due</span>
                        <span className="text-2xl font-serif">{statement.total} AED</span>
                      </div>
                      
                      <h4 className="text-sm font-medium mb-3 px-1">Payment Method</h4>
                      {isLoadingMethods ? (
                        <Skeleton className="h-32 w-full" />
                      ) : (
                        <RadioGroup value={selectedMethodId} onValueChange={setSelectedMethodId} className="space-y-3">
                          {paymentMethods?.map(method => (
                            <Label 
                              key={method.id}
                              htmlFor={method.id.toString()}
                              className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                selectedMethodId === method.id.toString() 
                                  ? 'border-primary bg-primary/5' 
                                  : 'border-border hover:border-primary/50'
                              }`}
                            >
                              <div className="flex items-center gap-4">
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                                  selectedMethodId === method.id.toString() ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                                }`}>
                                  {getMethodIcon(method.type)}
                                </div>
                                <div>
                                  <p className="font-medium text-base leading-none mb-1">{method.label}</p>
                                  {method.detail && <p className="text-sm text-muted-foreground">{method.detail}</p>}
                                </div>
                              </div>
                              <RadioGroupItem value={method.id.toString()} id={method.id.toString()} />
                            </Label>
                          ))}
                        </RadioGroup>
                      )}
                    </div>
                    
                    <DialogFooter>
                      <Button 
                        size="lg" 
                        className="w-full h-14 text-lg" 
                        onClick={handlePay}
                        disabled={!selectedMethodId || payStatement.isPending}
                      >
                        {payStatement.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                        Pay {statement.total} AED
                      </Button>
                    </DialogFooter>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </div>
        )}
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* By Member Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Spend by Member</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {statement.byMember.map(member => (
              <div key={member.memberId} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-secondary">{member.initials}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{member.memberName}</span>
                </div>
                <span className="font-medium">{member.amount} AED</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* By Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Spend by Category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {statement.byCategory.map(cat => (
              <div key={cat.categoryName} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{cat.categoryName}</span>
                </div>
                <span className="font-medium">{cat.amount} AED</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Itemized Line Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Line Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {statement.items.map(item => (
              <div key={item.id} className="p-4 sm:p-6 flex justify-between items-center hover:bg-secondary/20 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium leading-none">{item.serviceName}</p>
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5 py-0 rounded-sm font-normal">
                      {item.categoryName}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {item.providerName} • {item.memberName}
                  </p>
                  <p className="text-xs text-muted-foreground opacity-70">
                    {new Date(item.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{item.amount} AED</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}