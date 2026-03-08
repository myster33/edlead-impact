import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  paid: "default",
  failed: "destructive",
  refunded: "secondary",
};

export function MarketplaceOrdersTab() {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["marketplace-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_orders")
        .select("*, marketplace_products(title)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Orders</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : orders.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No orders yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order: any) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.marketplace_products?.title || "—"}</TableCell>
                  <TableCell>
                    <div>{order.user_name}</div>
                    <div className="text-xs text-muted-foreground">{order.user_email}</div>
                  </TableCell>
                  <TableCell>{order.currency} {Number(order.total_amount).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={statusColors[order.payment_status] || "outline"}>
                      {order.payment_status}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(new Date(order.created_at), "dd MMM yyyy HH:mm")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
