import { Layout } from "@/components/layout";
import { useProviders, useUpdateProviderStatus, useResolveQualityFlag } from "@/hooks/api-hooks";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Star, ShieldAlert, CheckCircle2, MoreHorizontal } from "lucide-react";
import { formatAED } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function Providers() {
  const { data: providers, isLoading } = useProviders();
  const updateStatus = useUpdateProviderStatus();
  const resolveFlag = useResolveQualityFlag();

  if (isLoading) return <Layout><div className="animate-pulse">Loading...</div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Providers</h1>
          <p className="text-muted-foreground mt-2">Manage service providers, handle approvals, and monitor quality.</p>
        </div>

        <Card>
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
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center text-sm font-medium">
                        <Star className="h-4 w-4 mr-1 text-primary fill-primary" />
                        {provider.rating.toFixed(1)} <span className="text-muted-foreground font-normal ml-1">({provider.reviewCount})</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {provider.jobsCompleted} jobs
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={provider.status === "active" ? "success" : provider.status === "pending" ? "warning" : "secondary"}
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
                        <CheckCircle2 className="h-4 w-4 mr-1.5 text-green-500/50" />
                        <span className="text-sm">Clear</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {provider.hasOpenFlag && provider.qualityFlags.filter(f => f.status === "open").map(flag => (
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
