import { useState } from "react";
import { Layout } from "@/components/layout";
import { useInstitutions, useCreateInstitution, useUpdateInstitution, useCreateCampus } from "@/hooks/api-hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, Plus, Settings2, MapPin } from "lucide-react";
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

  if (isLoading) return <Layout><div className="animate-pulse">Loading...</div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Institutions</h1>
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

        <Card>
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
                    <Badge variant={inst.active ? "success" : "secondary"}>
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
            </TableBody>
          </Table>
        </Card>
      </div>
    </Layout>
  );
}
