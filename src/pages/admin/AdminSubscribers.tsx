import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Mail, Phone, Search, Loader2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

export default function AdminSubscribers() {
  const [subSearch, setSubSearch] = useState("");
  const [contactSearch, setContactSearch] = useState("");

  const { data: subscribers = [], isLoading: subsLoading } = useQuery({
    queryKey: ["admin-subscribers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_subscribers")
        .select("*")
        .order("subscribed_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Use applications table for contact info (email + phone)
  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ["admin-contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("id, full_name, student_email, student_phone, parent_email, parent_phone, school_name, province, country, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filteredSubs = subscribers.filter((s) =>
    s.email.toLowerCase().includes(subSearch.toLowerCase())
  );

  const filteredContacts = contacts.filter((c) => {
    const q = contactSearch.toLowerCase();
    return (
      c.full_name.toLowerCase().includes(q) ||
      c.student_email.toLowerCase().includes(q) ||
      c.student_phone.includes(q)
    );
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Subscribers & Contacts</h1>
          <p className="text-muted-foreground">View newsletter subscribers and applicant contact details</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full p-2 bg-primary/10"><Mail className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-2xl font-bold">{subscribers.length}</p>
                  <p className="text-sm text-muted-foreground">Newsletter subscribers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full p-2 bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-2xl font-bold">{contacts.length}</p>
                  <p className="text-sm text-muted-foreground">Applicant contacts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full p-2 bg-primary/10"><Phone className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-2xl font-bold">{contacts.filter((c) => c.student_phone).length}</p>
                  <p className="text-sm text-muted-foreground">Phone numbers</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="subscribers">
          <TabsList>
            <TabsTrigger value="subscribers">Newsletter subscribers</TabsTrigger>
            <TabsTrigger value="contacts">Applicant contacts</TabsTrigger>
          </TabsList>

          <TabsContent value="subscribers">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle>Newsletter subscribers</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search email..." className="pl-9" value={subSearch} onChange={(e) => setSubSearch(e.target.value)} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {subsLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : filteredSubs.length === 0 ? (
                  <p className="text-center py-12 text-muted-foreground">No subscribers found.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Subscribed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubs.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.email}</TableCell>
                          <TableCell>
                            <Badge variant={s.is_active ? "default" : "secondary"}>
                              {s.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{format(new Date(s.subscribed_at), "dd MMM yyyy")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contacts">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle>Applicant contact details</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search name, email, phone..." className="pl-9" value={contactSearch} onChange={(e) => setContactSearch(e.target.value)} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {contactsLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : filteredContacts.length === 0 ? (
                  <p className="text-center py-12 text-muted-foreground">No contacts found.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="hidden sm:table-cell">Phone</TableHead>
                        <TableHead className="hidden md:table-cell">Parent email</TableHead>
                        <TableHead className="hidden md:table-cell">Parent phone</TableHead>
                        <TableHead className="hidden lg:table-cell">Province</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredContacts.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.full_name}</TableCell>
                          <TableCell>{c.student_email}</TableCell>
                          <TableCell className="hidden sm:table-cell">{c.student_phone}</TableCell>
                          <TableCell className="hidden md:table-cell">{c.parent_email}</TableCell>
                          <TableCell className="hidden md:table-cell">{c.parent_phone}</TableCell>
                          <TableCell className="hidden lg:table-cell">{c.province}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
