import { useRef, useState } from "react";
import { Layout } from "@/components/layout";
import { useCategories, useServices, useCreateCategory, useUpdateCategory, useCreateService, useUpdateService } from "@/hooks/api-hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useReveal } from "@/hooks/use-reveal";
import { Plus, BookOpen, Clock, Store, PackageSearch } from "lucide-react";
import { formatAED } from "@/lib/utils";

export default function Catalog() {
  const { data: categories, isLoading: catsLoading } = useCategories();
  const { data: services, isLoading: servsLoading } = useServices();

  const createCat = useCreateCategory();
  const updateCat = useUpdateCategory();

  const [newCat, setNewCat] = useState({ name: "", tagline: "", icon: "", startingPrice: "" });
  const [isCatOpen, setIsCatOpen] = useState(false);

  const headerRef = useRef<HTMLDivElement>(null);
  const catGridRef = useRef<HTMLDivElement>(null);
  const servicesTableRef = useRef<HTMLDivElement>(null);
  useReveal(headerRef, { y: 12, immediate: true });
  useReveal(catGridRef, { y: 16, stagger: true, immediate: true, delay: 0.1 });
  useReveal(servicesTableRef, { y: 16, immediate: true });

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
        <div ref={headerRef}>
          <h1 className="font-serif text-3xl tracking-tight">Service Catalog</h1>
          <p className="text-muted-foreground mt-2">Curate categories and oversee platform-wide services.</p>
        </div>

        <Tabs defaultValue="categories" className="space-y-6">
          <TabsList>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="services">All Services</TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="space-y-4">
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
            
            <div ref={catGridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories?.map((cat) => (
                <Card key={cat.id} className="transition-all hover:-translate-y-0.5 hover:border-primary/40">
                  <CardHeader className="flex flex-row items-start justify-between pb-2">
                    <div>
                      <CardTitle className="text-lg">{cat.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{cat.tagline}</p>
                    </div>
                    <div className="h-10 w-10 rounded bg-secondary flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-muted-foreground" />
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
          </TabsContent>

          <TabsContent value="services">
            {services?.length === 0 ? (
              <Card>
                <div className="py-10 text-center text-muted-foreground">
                  <PackageSearch className="mx-auto mb-2 h-6 w-6 text-muted-foreground/60" />
                  No services in the catalog yet.
                </div>
              </Card>
            ) : (
              <>
                {/* Cards below sm, real table sm+ */}
                <div ref={servicesTableRef} className="sm:hidden space-y-3">
                  {services?.map((svc) => (
                    <Card key={svc.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="font-medium min-w-0 truncate">{svc.name}</div>
                        <div className="shrink-0 font-medium">{formatAED(svc.price)}</div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-muted-foreground">
                        <Badge variant="secondary">{svc.categoryName}</Badge>
                        <span className="flex items-center"><Store className="h-3 w-3 mr-1.5" />{svc.providerName}</span>
                        <span className="flex items-center"><Clock className="h-3 w-3 mr-1.5" />{svc.durationMinutes} min</span>
                      </div>
                    </Card>
                  ))}
                </div>
                <Card className="hidden sm:block">
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
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
