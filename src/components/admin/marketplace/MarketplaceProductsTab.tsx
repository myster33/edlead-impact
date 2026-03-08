import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ExternalLink, ShoppingCart } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

interface ProductForm {
  title: string;
  description: string;
  short_description: string;
  image_url: string;
  original_price: string;
  discounted_price: string;
  discount_percentage: string;
  product_type: "internal" | "external";
  external_url: string;
  seller_name: string;
  terms_conditions: string;
  coupon_code: string;
  quantity_limit: string;
  category_id: string;
  is_featured: boolean;
  is_active: boolean;
  eligibility: string[];
  tags: string;
}

const defaultForm: ProductForm = {
  title: "", description: "", short_description: "", image_url: "",
  original_price: "", discounted_price: "", discount_percentage: "",
  product_type: "external", external_url: "", seller_name: "",
  terms_conditions: "", coupon_code: "", quantity_limit: "",
  category_id: "", is_featured: false, is_active: true,
  eligibility: ["student", "parent", "educator"], tags: "",
};

export function MarketplaceProductsTab() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<ProductForm>(defaultForm);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["marketplace-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_products")
        .select("*, marketplace_categories(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["marketplace-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_categories")
        .select("id, name")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title,
        description: form.description,
        short_description: form.short_description || null,
        image_url: form.image_url || null,
        original_price: parseFloat(form.original_price) || 0,
        discounted_price: form.discounted_price ? parseFloat(form.discounted_price) : null,
        discount_percentage: form.discount_percentage ? parseFloat(form.discount_percentage) : null,
        product_type: form.product_type,
        external_url: form.external_url || null,
        seller_name: form.seller_name || null,
        terms_conditions: form.terms_conditions || null,
        coupon_code: form.coupon_code || null,
        quantity_limit: form.quantity_limit ? parseInt(form.quantity_limit) : null,
        category_id: form.category_id || null,
        is_featured: form.is_featured,
        is_active: form.is_active,
        eligibility: form.eligibility,
        tags: form.tags ? form.tags.split(",").map(t => t.trim()) : [],
      };

      if (editing) {
        const { error } = await supabase.from("marketplace_products").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("marketplace_products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-products"] });
      toast.success(editing ? "Product updated" : "Product created");
      setDialogOpen(false);
      setEditing(null);
    },
    onError: () => toast.error("Failed to save product"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("marketplace_products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-products"] });
      toast.success("Product deleted");
    },
  });

  const openCreate = () => { setEditing(null); setForm(defaultForm); setDialogOpen(true); };

  const openEdit = (p: any) => {
    setEditing(p);
    setForm({
      title: p.title, description: p.description, short_description: p.short_description || "",
      image_url: p.image_url || "", original_price: String(p.original_price),
      discounted_price: p.discounted_price ? String(p.discounted_price) : "",
      discount_percentage: p.discount_percentage ? String(p.discount_percentage) : "",
      product_type: p.product_type, external_url: p.external_url || "",
      seller_name: p.seller_name || "", terms_conditions: p.terms_conditions || "",
      coupon_code: p.coupon_code || "", quantity_limit: p.quantity_limit ? String(p.quantity_limit) : "",
      category_id: p.category_id || "", is_featured: p.is_featured, is_active: p.is_active,
      eligibility: p.eligibility || ["student", "parent", "educator"],
      tags: (p.tags || []).join(", "),
    });
    setDialogOpen(true);
  };

  const toggleEligibility = (role: string) => {
    setForm(f => ({
      ...f,
      eligibility: f.eligibility.includes(role) ? f.eligibility.filter(r => r !== role) : [...f.eligibility, role],
    }));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Products & Deals</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1" /> Add Product</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Product</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><Label>Title</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
                <div className="col-span-2"><Label>Short Description</Label><Input value={form.short_description} onChange={e => setForm(f => ({ ...f, short_description: e.target.value }))} /></div>
                <div className="col-span-2"><Label>Full Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4} /></div>
                <div><Label>Category</Label>
                  <Select value={form.category_id} onValueChange={v => setForm(f => ({ ...f, category_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>{categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Type</Label>
                  <Select value={form.product_type} onValueChange={v => setForm(f => ({ ...f, product_type: v as "internal" | "external" }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="external">External (claim & redirect)</SelectItem>
                      <SelectItem value="internal">Internal (buy on platform)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Original Price (ZAR)</Label><Input type="number" value={form.original_price} onChange={e => setForm(f => ({ ...f, original_price: e.target.value }))} /></div>
                <div><Label>Discounted Price</Label><Input type="number" value={form.discounted_price} onChange={e => setForm(f => ({ ...f, discounted_price: e.target.value }))} /></div>
                <div><Label>Discount %</Label><Input type="number" value={form.discount_percentage} onChange={e => setForm(f => ({ ...f, discount_percentage: e.target.value }))} /></div>
                <div><Label>Image URL</Label><Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} /></div>
                {form.product_type === "external" && (
                  <>
                    <div><Label>External URL</Label><Input value={form.external_url} onChange={e => setForm(f => ({ ...f, external_url: e.target.value }))} /></div>
                    <div><Label>Seller Name</Label><Input value={form.seller_name} onChange={e => setForm(f => ({ ...f, seller_name: e.target.value }))} /></div>
                  </>
                )}
                <div><Label>Coupon Code</Label><Input value={form.coupon_code} onChange={e => setForm(f => ({ ...f, coupon_code: e.target.value }))} /></div>
                <div><Label>Quantity Limit</Label><Input type="number" value={form.quantity_limit} onChange={e => setForm(f => ({ ...f, quantity_limit: e.target.value }))} /></div>
                <div className="col-span-2"><Label>Terms & Conditions</Label><Textarea value={form.terms_conditions} onChange={e => setForm(f => ({ ...f, terms_conditions: e.target.value }))} rows={3} /></div>
                <div className="col-span-2"><Label>Tags (comma-separated)</Label><Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} /></div>
                <div className="col-span-2">
                  <Label>Eligibility</Label>
                  <div className="flex gap-4 mt-1">
                    {["student", "parent", "educator"].map(role => (
                      <label key={role} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={form.eligibility.includes(role)} onCheckedChange={() => toggleEligibility(role)} />
                        <span className="capitalize">{role}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2"><Switch checked={form.is_featured} onCheckedChange={v => setForm(f => ({ ...f, is_featured: v }))} /><Label>Featured</Label></div>
                <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} /><Label>Active</Label></div>
              </div>
              <Button onClick={() => saveMutation.mutate()} disabled={!form.title || !form.description || !form.original_price || saveMutation.isPending} className="w-full">
                {saveMutation.isPending ? "Saving..." : "Save Product"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : products.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No products yet. Add your first product or deal.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Claims</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {p.image_url && <img src={p.image_url} alt="" className="w-10 h-10 rounded object-cover" />}
                      <div>
                        <div className="font-medium">{p.title}</div>
                        {p.is_featured && <Badge variant="secondary" className="text-xs">Featured</Badge>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{p.marketplace_categories?.name || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={p.product_type === "internal" ? "default" : "outline"}>
                      {p.product_type === "internal" ? <><ShoppingCart className="h-3 w-3 mr-1" />Buy</> : <><ExternalLink className="h-3 w-3 mr-1" />Claim</>}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      {p.discounted_price ? (
                        <>
                          <span className="line-through text-muted-foreground text-xs">R{Number(p.original_price).toFixed(2)}</span>
                          <span className="ml-1 font-semibold">R{Number(p.discounted_price).toFixed(2)}</span>
                        </>
                      ) : (
                        <span>R{Number(p.original_price).toFixed(2)}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{p.quantity_claimed}{p.quantity_limit ? `/${p.quantity_limit}` : ""}</TableCell>
                  <TableCell>{p.is_active ? <span className="text-green-600">Active</span> : <span className="text-muted-foreground">Inactive</span>}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
