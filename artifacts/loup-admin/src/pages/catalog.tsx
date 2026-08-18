import { useState } from "react";
import { Layout } from "@/components/layout";
import { useCategories, useServices, useCreateCategory, useUpdateCategory, useCreateService, useUpdateService } from "@/hooks/api-hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, BookOpen, Clock, Store } from "lucide-react";
import { formatAED } from "@/lib/utils";
import * as TabsPrimitive from "@radix-ui/react-tabs";

export default function Catalog() {
  const { data: categories, isLoading: catsLoading } = useCategories();
  const { data: services, isLoading: servsLoading } = useServices();
  
  const createCat = useCreateCategory();
  const updateCat = useUpdateCategory();
  
  const [newCat, setNewCat] = useState({ name: "", tagline: "", icon: "", startingPrice: "" });
  const [isCatOpen, setIsCatOpen] = useState(false);

  const handleCreateCategory = async () => {
    if (!newCat.name) return;
    await createCat.mutateAsync({
      name: newCat.name,
      tagline: newCat.tagline,
      icon: newCat.icon || "sparkles",
      startingPrice: Number(newCat.startingPrice) || 0
    });
    setIsCatOpen(false);
    setNewCat({ name: "", tagline: "", icon: "", startingPrice: "" });
  };

  if (catsLoading || servsLoading) return <Layout><div className="animate-pulse">Loading...</div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Service Catalog</h1>
          <p className="text-muted-foreground mt-2">Curate categories and oversee platform-wide services.</p>
        </div>

        <TabsPrimitive.Root defaultValue="categories" className="space-y-6">
          <TabsPrimitive.List className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
            <TabsPrimitive.Trigger value="categories" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              Categories
            </TabsPrimitive.Trigger>
            <TabsPrimitive.Trigger value="services" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              All Services
            </TabsPrimitive.Trigger>
          </TabsPrimitive.List>

          <TabsPrimitive.Content value="categories" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={isCatOpen} onOpenChange={setIsCatOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 mr-2" /> New Category</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Category</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Name</label>
                      <Input placeholder="e.g. Wellness" value={newCat.name} onChange={e => setNewCat({...newCat, name: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Tagline</label>
                      <Input placeholder="Massage, Spa..." value={newCat.tagline} onChange={e => setNewCat({...newCat, tagline: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Starting Price (AED)</label>
                      <Input type="number" placeholder="0" value={newCat.startingPrice} onChange={e => setNewCat({...newCat, startingPrice: e.target.value})} />
                    </div>
                    <Button className="w-full" onClick={handleCreateCategory} disabled={createCat.isPending}>
                      Create Category
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories?.map((cat) => (
                <Card key={cat.id}>
                  <CardHeader className="flex flex-row items-start justify-between pb-2">
                    <div>
                      <CardTitle className="text-lg">{cat.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{cat.tagline}</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 mt-4">
                      <div className="flex flex-col">
                        <span className="text-2xl font-bold">{cat.providerCount}</span>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Providers</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-2xl font-bold">{cat.serviceCount}</span>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Services</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Base Price</span>
                      <span className="font-medium">{formatAED(cat.startingPrice)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsPrimitive.Content>

          <TabsPrimitive.Content value="services">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services?.map((svc) => (
                    <TableRow key={svc.id}>
                      <TableCell>
                        <div className="font-medium">{svc.name}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{svc.categoryName}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <Store className="h-3 w-3 mr-2 text-muted-foreground" />
                          {svc.providerName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="h-3 w-3 mr-1.5" />
                          {svc.durationMinutes} min
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatAED(svc.price)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsPrimitive.Content>
        </TabsPrimitive.Root>
      </div>
    </Layout>
  );
}
