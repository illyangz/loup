import { useRef } from "react";
import { Layout } from "@/components/layout";
import { useReveal } from "@/hooks/use-reveal";
import { useProviders, useUpdateProviderStatus, useResolveQualityFlag } from "@/hooks/api-hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Star, ShieldAlert, CheckCircle2, Clock, Users } from "lucide-react";
import { formatAED } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function Providers() {
  const { data: providers, isLoading } = useProviders();
  const updateStatus = useUpdateProviderStatus();
  const resolveFlag = useResolveQualityFlag();

  const headerRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  useReveal(headerRef, { y: 12, immediate: true });
  useReveal(statsRef, { y: 12, stagger: true, immediate: true, delay: 0.06 });
  useReveal(tableRef, { y: 16, immediate: true, delay: 0.14 });

  if (isLoading) return <Layout><div className="animate-pulse">Loading...</div></Layout>;

  const activeCount = providers?.filter(p => p.status === "active").length ?? 0;
  const pendingCount = providers?.filter(p => p.status === "pending").length ?? 0;
  const flaggedCount = providers?.filter(p => p.hasOpenFlag).length ?? 0;

  return (
    <Layout>
      <div className="space-y-6">
        <div ref={headerRef}>
          <h1 className="font-serif text-3xl tracking-tight">Providers</h1>
          <p className="text-muted-foreground mt-2">Manage service providers, handle approvals, and monitor quality.</p>
        </div>

        <div ref={statsRef} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="transition-transform hover:-translate-y-0.5 hover:border-primary/40">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Providers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeCount}</div>
              <p className="text-xs text-muted-foreground mt-1">of {providers?.length ?? 0} total</p>
            </CardContent>
          </Card>
          <Card className="transition-transform hover:-translate-y-0.5 hover:border-primary/40">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approval</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingCount}</div>
              <p className="text-xs text-muted-foreground mt-1">awaiting review</p>
            </CardContent>
          </Card>
          <Card className="transition-transform hover:-translate-y-0.5 hover:border-primary/40">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Open Quality Flags</CardTitle>
              <ShieldAlert className={`h-4 w-4 ${flaggedCount > 0 ? "text-destructive" : "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${flaggedCount > 0 ? "text-destructive" : ""}`}>{flaggedCount}</div>
              <p className="text-xs text-muted-foreground mt-1">providers flagged</p>
            </CardContent>
          </Card>
        </div>

        {/* Cards below sm, real table sm+ */}
        <div ref={tableRef} className="sm:hidden space-y-3">
          {providers?.map((provider) => (
            <Card key={provider.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{provider.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{provider.tagline}</div>
                </div>
                <Badge variant={provider.status === "active" ? "default" : "secondary"} className="shrink-0">{provider.status}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-muted-foreground">
                <Badge variant="outline">{provider.categoryName}</Badge>
                <span className="flex items-center"><Star className="h-3.5 w-3.5 mr-1 text-muted-foreground fill-muted-foreground" />{provider.rating.toFixed(1)} ({provider.reviewCount})</span>
                <span>{provider.jobsCompleted} jobs</span>
              </div>
              <div className="mt-2">
                {provider.hasOpenFlag ? (
                  <div className="flex items-center text-destructive text-sm">
                    <ShieldAlert className="h-4 w-4 mr-1.5" />
                    <span className="font-medium">{provider.openFlagCount} open flag{provider.openFlagCount === 1 ? "" : "s"}</span>
                  </div>
                ) : (
                  <div className="flex items-center text-muted-foreground text-sm">
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    <span>No quality flags</span>
                  </div>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {provider.hasOpenFlag && provider.qualityFlags.map(flag => (
                  <Button key={flag.id} variant="outline" size="sm" onClick={() => resolveFlag.mutate(flag.id)} disabled={resolveFlag.isPending}>
                    Resolve Flag
                  </Button>
                ))}
                {provider.status === "pending" && (
                  <Button size="sm" onClick={() => updateStatus.mutate({ id: provider.id, action: "approve" })}>Approve</Button>
                )}
                {provider.status === "active" && (
                  <Button variant="destructive" size="sm" onClick={() => updateStatus.mutate({ id: provider.id, action: "suspend" })}>Suspend</Button>
                )}
                {provider.status === "suspended" && (
                  <Button variant="outline" size="sm" onClick={() => updateStatus.mutate({ id: provider.id, action: "approve" })}>Restore</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
        <Card className="hidden sm:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Performance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Quality Flags</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {providers?.map((provider) => (
                <TableRow key={provider.id}>
                  <TableCell>
                    <div>
                      <div className="font-semibold">{provider.name}</div>
                      <div className="text-xs text-muted-foreground">{provider.tagline}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{provider.categoryName}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1.5 min-w-[8rem]">
                      <div className="flex items-center text-sm font-medium">
                        <Star className="h-4 w-4 mr-1 text-muted-foreground fill-muted-foreground" />
                        {provider.rating.toFixed(1)} <span className="text-muted-foreground font-normal ml-1">({provider.reviewCount})</span>
                      </div>
                      <Progress value={(provider.rating / 5) * 100} className="h-1.5" />
                      <div className="text-xs text-muted-foreground">
                        {provider.jobsCompleted} jobs
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={provider.status === "active" ? "default" : "secondary"}
                    >
                      {provider.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {provider.hasOpenFlag ? (
                      <div className="flex items-center text-destructive">
                        <ShieldAlert className="h-4 w-4 mr-1.5" />
                        <span className="font-medium text-sm">{provider.openFlagCount} open</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 mr-1.5 text-muted-foreground" />
                        <span className="text-sm">Clear</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {provider.hasOpenFlag && provider.qualityFlags.map(flag => (
                         <Button 
                           key={flag.id}
                           variant="outline" 
                           size="sm"
                           onClick={() => resolveFlag.mutate(flag.id)}
                           disabled={resolveFlag.isPending}
                         >
                           Resolve Flag
                         </Button>
                      ))}
                      
                      {provider.status === "pending" && (
                        <Button 
                          size="sm"
                          onClick={() => updateStatus.mutate({ id: provider.id, action: "approve" })}
                        >
                          Approve
                        </Button>
                      )}
                      
                      {provider.status === "active" && (
                        <Button 
                          variant="destructive"
                          size="sm"
                          onClick={() => updateStatus.mutate({ id: provider.id, action: "suspend" })}
                        >
                          Suspend
                        </Button>
                      )}
                      
                      {provider.status === "suspended" && (
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => updateStatus.mutate({ id: provider.id, action: "approve" })}
                        >
                          Restore
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </Layout>
  );
}
