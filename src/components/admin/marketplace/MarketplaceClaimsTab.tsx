import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export function MarketplaceClaimsTab() {
  const { data: claims = [], isLoading } = useQuery({
    queryKey: ["marketplace-claims"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_claims")
        .select("*, marketplace_products(title)")
        .order("claimed_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deal Claims</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : claims.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No claims yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Claimed At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {claims.map((claim: any) => (
                <TableRow key={claim.id}>
                  <TableCell className="font-medium">{claim.marketplace_products?.title || "—"}</TableCell>
                  <TableCell>{claim.user_name}</TableCell>
                  <TableCell>{claim.user_email}</TableCell>
                  <TableCell><Badge variant="outline">{claim.user_role}</Badge></TableCell>
                  <TableCell>
                    <Badge variant={claim.status === "claimed" ? "default" : claim.status === "redeemed" ? "secondary" : "outline"}>
                      {claim.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(new Date(claim.claimed_at), "dd MMM yyyy HH:mm")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
