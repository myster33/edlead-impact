import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { School, CheckCircle, XCircle, Search, Users, MapPin, Pencil } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { SchoolEditDialog } from "@/components/admin/SchoolEditDialog";

interface SchoolRecord {
  id: string;
  name: string;
  address: string | null;
  province: string | null;
  country: string;
  school_code: string;
  emis_number: string | null;
  email: string | null;
  phone: string | null;
  is_verified: boolean;
  created_at: string;
}

export default function AdminSchools() {
  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});
  const { toast } = useToast();
  const { adminUser } = useAdminAuth();

  const fetchSchools = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("schools")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSchools((data || []) as SchoolRecord[]);

      // Fetch user counts per school
      const { data: users } = await supabase
        .from("school_users")
        .select("school_id");
      
      if (users) {
        const counts: Record<string, number> = {};
        users.forEach((u: any) => {
          counts[u.school_id] = (counts[u.school_id] || 0) + 1;
        });
        setUserCounts(counts);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchSchools(); }, []);

  const handleVerify = async (schoolId: string, verify: boolean) => {
    const { error } = await supabase
      .from("schools")
      .update({ is_verified: verify, verified_by: adminUser?.id })
      .eq("id", schoolId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: verify ? "School verified" : "Verification revoked" });
      fetchSchools();
    }
  };

  const filtered = schools.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.school_code.toLowerCase().includes(search.toLowerCase()) ||
    s.province?.toLowerCase().includes(search.toLowerCase())
  );

  const verifiedCount = schools.filter(s => s.is_verified).length;
  const pendingCount = schools.filter(s => !s.is_verified).length;

  return (
    <AdminLayout>
      <Helmet>
        <title>Schools Management | edLEAD Admin</title>
      </Helmet>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Schools</h1>
          <p className="text-muted-foreground">View, verify, and manage registered schools</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Schools</CardTitle>
              <School className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{schools.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Verified</CardTitle>
              <CheckCircle className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{verifiedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Verification</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingCount}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <School className="h-5 w-5" />All Schools
              </CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search schools..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Loading...</p>
            ) : filtered.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No schools found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>School Name</TableHead>
                    <TableHead>EMIS No.</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Province</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(school => (
                    <TableRow key={school.id}>
                      <TableCell className="font-medium">{school.name}</TableCell>
                      <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{school.emis_number || "—"}</code></TableCell>
                      <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{school.school_code}</code></TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {school.province || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-sm">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          {userCounts[school.id] || 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={school.is_verified ? "default" : "secondary"}>
                          {school.is_verified ? "Verified" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(school.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {school.is_verified ? (
                          <Button size="sm" variant="outline" onClick={() => handleVerify(school.id, false)}>
                            <XCircle className="h-3 w-3 mr-1" />Revoke
                          </Button>
                        ) : (
                          <Button size="sm" variant="default" onClick={() => handleVerify(school.id, true)}>
                            <CheckCircle className="h-3 w-3 mr-1" />Verify
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
