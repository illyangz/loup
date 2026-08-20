import { useRef, useState } from "react";
import { Layout } from "@/components/layout";
import { useReveal } from "@/hooks/use-reveal";
import { useInstitutions, useCreateInstitution, useUpdateInstitution, useCreateCampus } from "@/hooks/api-hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, Landmark, Plus, MapPin, Users } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function Institutions() {
  const { data: institutions, isLoading } = useInstitutions();
  const createInstitution = useCreateInstitution();
  const updateInstitution = useUpdateInstitution();
  const createCampus = useCreateCampus();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newInst, setNewInst] = useState({ name: "", type: "", city: "", country: "" });

  const [selectedInst, setSelectedInst] = useState<number | null>(null);
  const [isCampusOpen, setIsCampusOpen] = useState(false);
  const [newCampus, setNewCampus] = useState({ name: "" });

  const handleCreate = async () => {
    if (!newInst.name || !newInst.city) return;
    await createInstitution.mutateAsync(newInst);
    setIsCreateOpen(false);
    setNewInst({ name: "", type: "", city: "", country: "" });
  };

  const handleAddCampus = async () => {
    if (!selectedInst || !newCampus.name) return;
    await createCampus.mutateAsync({ id: selectedInst, name: newCampus.name });
    setIsCampusOpen(false);
    setNewCampus({ name: "" });
  };

  const toggleStatus = (id: number, current: boolean) => {
    updateInstitution.mutate({ id, data: { active: !current } });
  };

  const headerRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  useReveal(headerRef, { y: 12, immediate: true });
  useReveal(statsRef, { y: 12, stagger: true, immediate: true, delay: 0.06 });
  useReveal(tableRef, { y: 16, immediate: true, delay: 0.14 });

  if (isLoading) return <Layout><div className="animate-pulse">Loading...</div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <div ref={headerRef} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl tracking-tight">Institutions</h1>
            <p className="text-muted-foreground mt-2">Manage enterprise clients and campus deployments.</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Add Institution</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Institution</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Institution Name</label>
                  <Input placeholder="e.g. Dubai Future Academy" value={newInst.name} onChange={e => setNewInst({...newInst, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <Input placeholder="e.g. University" value={newInst.type} onChange={e => setNewInst({...newInst, type: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">City</label>
                    <Input placeholder="Dubai" value={newInst.city} onChange={e => setNewInst({...newInst, city: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Country</label>
                    <Input placeholder="UAE" value={newInst.country} onChange={e => setNewInst({...newInst, country: e.target.value})} />
                  </div>
                </div>
                <Button className="w-full" onClick={handleCreate} disabled={createInstitution.isPending}>
                  Create Institution
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div ref={statsRef} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="transition-transform hover:-translate-y-0.5 hover:border-primary/40">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Institutions</CardTitle>
              <Landmark className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{institutions?.filter(i => i.active).length ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">of {institutions?.length ?? 0} total</p>
            </CardContent>
          </Card>
          <Card className="transition-transform hover:-translate-y-0.5 hover:border-primary/40">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{institutions?.reduce((sum, i) => sum + i.employeeCount, 0) ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">across all institutions</p>
            </CardContent>
          </Card>
          <Card className="transition-transform hover:-translate-y-0.5 hover:border-primary/40">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Campuses</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{institutions?.reduce((sum, i) => sum + i.campusCount, 0) ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">deployment locations</p>
            </CardContent>
          </Card>
        </div>

        {/* Cards below sm, real table sm+ */}
        <div ref={tableRef} className="sm:hidden space-y-3">
          {institutions?.map((inst) => (
            <Card key={inst.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 shrink-0 rounded-lg bg-secondary flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{inst.name}</div>
                    <div className="text-xs text-muted-foreground">{inst.type}</div>
                  </div>
                </div>
                <Badge variant={inst.active ? "default" : "secondary"} className="shrink-0">
                  {inst.active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-muted-foreground">
                <span className="flex items-center"><MapPin className="h-3 w-3 mr-1" />{inst.city}, {inst.country}</span>
                <span><span className="font-medium text-foreground">{inst.campusCount}</span> campuses</span>
                <span><span className="font-medium text-foreground">{inst.employeeCount}</span> employees</span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Dialog open={isCampusOpen && selectedInst === inst.id} onOpenChange={(open) => {
                  setIsCampusOpen(open);
                  if (open) setSelectedInst(inst.id);
                }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-1" /> Campus
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Campus to {inst.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Campus Name</label>
                        <Input placeholder="e.g. North Campus" value={newCampus.name} onChange={e => setNewCampus({ name: e.target.value })} />
                      </div>
                      <Button className="w-full" onClick={handleAddCampus} disabled={createCampus.isPending}>
                        Add Campus
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button variant="ghost" size="sm" onClick={() => toggleStatus(inst.id, inst.active)}>
                  {inst.active ? "Deactivate" : "Activate"}
                </Button>
              </div>
            </Card>
          ))}
          {institutions?.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
              No institutions yet. Add your first one to get started.
            </div>
          )}
        </div>
        <Card className="hidden sm:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Institution</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Campuses</TableHead>
                <TableHead>Employees</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {institutions?.map((inst) => (
                <TableRow key={inst.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="font-semibold">{inst.name}</div>
                        <div className="text-xs text-muted-foreground">{inst.type}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center text-muted-foreground">
                      <MapPin className="h-3 w-3 mr-1" />
                      {inst.city}, {inst.country}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <span className="font-medium">{inst.campusCount}</span> locations
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{inst.employeeCount}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={inst.active ? "default" : "secondary"}>
                      {inst.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Dialog open={isCampusOpen && selectedInst === inst.id} onOpenChange={(open) => {
                        setIsCampusOpen(open);
                        if(open) setSelectedInst(inst.id);
                      }}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Plus className="h-4 w-4 mr-1" /> Campus
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Campus to {inst.name}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 mt-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Campus Name</label>
                              <Input placeholder="e.g. North Campus" value={newCampus.name} onChange={e => setNewCampus({name: e.target.value})} />
                            </div>
                            <Button className="w-full" onClick={handleAddCampus} disabled={createCampus.isPending}>
                              Add Campus
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => toggleStatus(inst.id, inst.active)}
                      >
                        {inst.active ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {institutions?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No institutions yet. Add your first one to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </Layout>
  );
}
