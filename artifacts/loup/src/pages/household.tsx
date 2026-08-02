import { useGetHousehold, useListHouseholdActivity } from "@workspace/api-client-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Users, Crown, CreditCard, Activity, CalendarCheck, MessageSquare, ShieldAlert } from "lucide-react"

export default function Household() {
  const { data: household, isLoading: isLoadingHousehold } = useGetHousehold()
  const { data: activity, isLoading: isLoadingActivity } = useListHouseholdActivity()

  const getActivityIcon = (kind: string) => {
    switch (kind) {
      case 'booking_created': return <CalendarCheck className="h-4 w-4 text-blue-500" />
      case 'booking_completed': return <CalendarCheck className="h-4 w-4 text-emerald-500" />
      case 'payment': return <CreditCard className="h-4 w-4 text-primary" />
      case 'review': return <MessageSquare className="h-4 w-4 text-amber-500" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header>
        <h1 className="text-3xl font-serif tracking-tight flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          The Pack
        </h1>
        <p className="text-muted-foreground mt-2">
          {isLoadingHousehold ? <Skeleton className="h-5 w-48" /> : `Manage ${household?.name} household`}
        </p>
      </header>

      {/* Members */}
      <section className="space-y-4">
        <h2 className="text-2xl font-serif tracking-tight">Members</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {isLoadingHousehold ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}><CardContent className="p-5 flex gap-4"><Skeleton className="h-12 w-12 rounded-full" /><div className="space-y-2 flex-1"><Skeleton className="h-5 w-1/2" /><Skeleton className="h-4 w-1/3" /></div></CardContent></Card>
            ))
          ) : (
            household?.members.map(member => {
              const spendPercent = member.monthlySpendLimit 
                ? Math.min(100, Math.round((member.monthToDateSpend / member.monthlySpendLimit) * 100))
                : 0
              const isNearLimit = spendPercent >= 85

              return (
                <Card key={member.id} className={`border-border ${member.isCurrentUser ? 'border-primary/30 bg-primary/5' : ''}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                          <AvatarFallback className={member.role === 'head' || member.role === 'owner' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}>
                            {member.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{member.name}</h3>
                            {member.isCurrentUser && <Badge variant="secondary" className="text-[10px] h-5 px-1.5 py-0">You</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            {member.role === 'head' || member.role === 'owner' ? <Crown className="h-3 w-3 text-amber-500" /> : null}
                            {member.relation}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 pt-4 border-t border-border/50">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Month to date</span>
                        <span className="font-medium">{member.monthToDateSpend} AED</span>
                      </div>
                      
                      {member.monthlySpendLimit && (
                        <div className="space-y-1.5">
                          <Progress 
                            value={spendPercent} 
                            className={`h-2 ${isNearLimit ? '[&>div]:bg-destructive' : ''}`}
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{spendPercent}% used</span>
                            <span className="flex items-center gap-1">
                              {isNearLimit && <ShieldAlert className="h-3 w-3 text-destructive" />}
                              Limit: {member.monthlySpendLimit}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </section>

      {/* Activity Feed */}
      <section className="space-y-4">
        <h2 className="text-2xl font-serif tracking-tight">Recent Activity</h2>
        <Card>
          <CardContent className="p-0">
            {isLoadingActivity ? (
              <div className="p-6 space-y-6">
                {[1,2,3].map(i => <div key={i} className="flex gap-4"><Skeleton className="h-10 w-10 rounded-full" /><div className="space-y-2 flex-1"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/4" /></div></div>)}
              </div>
            ) : activity?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No recent activity</div>
            ) : (
              <div className="divide-y divide-border">
                {activity?.map(item => (
                  <div key={item.id} className="p-4 sm:p-5 flex gap-4 hover:bg-secondary/20 transition-colors">
                    <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      {getActivityIcon(item.kind)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium text-foreground">{item.memberName}</span>
                        {' '}
                        <span className="text-muted-foreground">{item.description}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.occurredAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </span>
                        {item.amount && (
                          <>
                            <span className="text-muted-foreground/30">•</span>
                            <span className="text-xs font-medium text-foreground">{item.amount} AED</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}