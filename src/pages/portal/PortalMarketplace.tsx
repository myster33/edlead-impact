import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Search, ExternalLink, ShoppingCart, Star, Tag, Percent, Clock, CheckCircle } from "lucide-react";

const PortalMarketplace = () => {
  const { user, portalUser } = usePortalAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ["portal-marketplace-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["portal-marketplace-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_products")
        .select("*, marketplace_categories(name, icon)")
        .eq("is_active", true)
        .order("is_featured", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["marketplace-reviews", selectedProduct?.id],
    queryFn: async () => {
      if (!selectedProduct) return [];
      const { data, error } = await supabase
        .from("marketplace_reviews")
        .select("*")
        .eq("product_id", selectedProduct.id)
        .eq("is_approved", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProduct,
  });

  const { data: myClaims = [] } = useQuery({
    queryKey: ["my-marketplace-claims"],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("marketplace_claims")
        .select("product_id")
        .eq("user_id", user.id);
      if (error) throw error;
      return data.map((c: any) => c.product_id);
    },
    enabled: !!user,
  });

  const claimMutation = useMutation({
    mutationFn: async (product: any) => {
      if (!user || !portalUser) throw new Error("Not authenticated");
      const { error } = await supabase.from("marketplace_claims").insert({
        product_id: product.id,
        user_id: user.id,
        school_user_id: portalUser.id,
        user_role: portalUser.role,
        user_name: portalUser.full_name,
        user_email: portalUser.email,
      });
      if (error) throw error;
      // Increment claim count
      await supabase.from("marketplace_products")
        .update({ quantity_claimed: (product.quantity_claimed || 0) + 1 })
        .eq("id", product.id);
    },
    onSuccess: (_, product) => {
      queryClient.invalidateQueries({ queryKey: ["my-marketplace-claims"] });
      queryClient.invalidateQueries({ queryKey: ["portal-marketplace-products"] });
      toast.success("Deal claimed! Redirecting to seller...");
      if (product.external_url) {
        setTimeout(() => window.open(product.external_url, "_blank"), 1500);
      }
    },
    onError: () => toast.error("Failed to claim deal"),
  });

  const filteredProducts = products.filter((p: any) => {
    const matchesSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "all" || p.category_id === selectedCategory;
    const matchesEligibility = !portalUser || (p.eligibility || []).includes(portalUser.role);
    return matchesSearch && matchesCategory && matchesEligibility;
  });

  const featuredProducts = filteredProducts.filter((p: any) => p.is_featured);
  const regularProducts = filteredProducts.filter((p: any) => !p.is_featured);

  const openDetail = (product: any) => {
    setSelectedProduct(product);
    setDetailOpen(true);
  };

  const avgRating = reviews.length > 0 ? (reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length).toFixed(1) : null;

  return (
    <PortalLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Marketplace</h1>
          <p className="text-muted-foreground">Exclusive discounts, products, and services for our community.</p>
        </div>

        {/* Search and filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search deals..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant={selectedCategory === "all" ? "default" : "outline"} size="sm" onClick={() => setSelectedCategory("all")}>
              All
            </Button>
            {categories.map((cat: any) => (
              <Button key={cat.id} variant={selectedCategory === cat.id ? "default" : "outline"} size="sm" onClick={() => setSelectedCategory(cat.id)}>
                {cat.icon && <span className="mr-1">{cat.icon}</span>}{cat.name}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No deals available</h3>
            <p className="text-muted-foreground">Check back soon for new offers!</p>
          </div>
        ) : (
          <>
            {/* Featured deals */}
            {featuredProducts.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Star className="h-5 w-5 text-yellow-500" /> Featured Deals</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {featuredProducts.map((p: any) => (
                    <ProductCard key={p.id} product={p} onDetail={openDetail} onClaim={claimMutation} claimed={myClaims.includes(p.id)} />
                  ))}
                </div>
              </div>
            )}

            {/* All deals */}
            {regularProducts.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">All Deals</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {regularProducts.map((p: any) => (
                    <ProductCard key={p.id} product={p} onDetail={openDetail} onClaim={claimMutation} claimed={myClaims.includes(p.id)} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Product detail dialog */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            {selectedProduct && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl">{selectedProduct.title}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {selectedProduct.image_url && (
                    <img src={selectedProduct.image_url} alt={selectedProduct.title} className="w-full h-64 object-cover rounded-lg" />
                  )}
                  <div className="flex items-center gap-3 flex-wrap">
                    {selectedProduct.marketplace_categories?.name && (
                      <Badge variant="outline">{selectedProduct.marketplace_categories.icon} {selectedProduct.marketplace_categories.name}</Badge>
                    )}
                    {selectedProduct.discount_percentage && (
                      <Badge variant="destructive"><Percent className="h-3 w-3 mr-1" />{selectedProduct.discount_percentage}% OFF</Badge>
                    )}
                    {selectedProduct.product_type === "internal" ? (
                      <Badge><ShoppingCart className="h-3 w-3 mr-1" />Buy on Platform</Badge>
                    ) : (
                      <Badge variant="secondary"><ExternalLink className="h-3 w-3 mr-1" />External Deal</Badge>
                    )}
                    {avgRating && <Badge variant="outline"><Star className="h-3 w-3 mr-1 text-yellow-500" />{avgRating} ({reviews.length})</Badge>}
                  </div>

                  <div className="flex items-baseline gap-3">
                    {selectedProduct.discounted_price ? (
                      <>
                        <span className="text-3xl font-bold">R{Number(selectedProduct.discounted_price).toFixed(2)}</span>
                        <span className="text-lg line-through text-muted-foreground">R{Number(selectedProduct.original_price).toFixed(2)}</span>
                      </>
                    ) : (
                      <span className="text-3xl font-bold">R{Number(selectedProduct.original_price).toFixed(2)}</span>
                    )}
                  </div>

                  {selectedProduct.seller_name && (
                    <p className="text-sm text-muted-foreground">Sold by: <strong>{selectedProduct.seller_name}</strong></p>
                  )}

                  <p className="text-foreground whitespace-pre-wrap">{selectedProduct.description}</p>

                  {selectedProduct.coupon_code && (
                    <div className="bg-muted p-3 rounded-lg flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      <span className="text-sm">Use code: <strong className="font-mono">{selectedProduct.coupon_code}</strong></span>
                    </div>
                  )}

                  {selectedProduct.terms_conditions && (
                    <div className="text-sm text-muted-foreground">
                      <strong>Terms & Conditions:</strong>
                      <p className="mt-1 whitespace-pre-wrap">{selectedProduct.terms_conditions}</p>
                    </div>
                  )}

                  {selectedProduct.quantity_limit && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {selectedProduct.quantity_limit - (selectedProduct.quantity_claimed || 0)} of {selectedProduct.quantity_limit} remaining
                    </p>
                  )}

                  {/* Reviews section */}
                  {reviews.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-semibold">Reviews</h3>
                      {reviews.map((r: any) => (
                        <div key={r.id} className="bg-muted p-3 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="flex">{Array.from({ length: r.rating }, (_, i) => <Star key={i} className="h-3 w-3 fill-yellow-500 text-yellow-500" />)}</div>
                            <span className="text-sm font-medium">{r.user_name}</span>
                          </div>
                          {r.comment && <p className="text-sm mt-1">{r.comment}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-4">
                    {selectedProduct.product_type === "external" ? (
                      myClaims.includes(selectedProduct.id) ? (
                        <Button className="w-full" variant="outline" disabled><CheckCircle className="h-4 w-4 mr-2" />Already Claimed</Button>
                      ) : (
                        <Button className="w-full" onClick={() => claimMutation.mutate(selectedProduct)} disabled={claimMutation.isPending}>
                          <ExternalLink className="h-4 w-4 mr-2" />Claim Deal & Visit Seller
                        </Button>
                      )
                    ) : (
                      <Button className="w-full" onClick={() => toast.info("Stripe checkout coming soon!")}>
                        <ShoppingCart className="h-4 w-4 mr-2" />Buy Now — R{Number(selectedProduct.discounted_price || selectedProduct.original_price).toFixed(2)}
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PortalLayout>
  );
};

function ProductCard({ product, onDetail, onClaim, claimed }: { product: any; onDetail: (p: any) => void; onClaim: any; claimed: boolean }) {
  const isSoldOut = product.quantity_limit && product.quantity_claimed >= product.quantity_limit;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => onDetail(product)}>
      <div className="relative">
        {product.image_url ? (
          <img src={product.image_url} alt={product.title} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-48 bg-muted flex items-center justify-center">
            <Tag className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        {product.discount_percentage && (
          <Badge variant="destructive" className="absolute top-2 right-2">-{product.discount_percentage}%</Badge>
        )}
        {product.is_featured && (
          <Badge className="absolute top-2 left-2 bg-yellow-500"><Star className="h-3 w-3 mr-1" />Featured</Badge>
        )}
        {isSoldOut && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
            <Badge variant="secondary" className="text-lg">Sold Out</Badge>
          </div>
        )}
      </div>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          {product.marketplace_categories?.name && (
            <Badge variant="outline" className="text-xs">{product.marketplace_categories.icon} {product.marketplace_categories.name}</Badge>
          )}
          <Badge variant={product.product_type === "internal" ? "default" : "secondary"} className="text-xs">
            {product.product_type === "internal" ? "Buy" : "Claim"}
          </Badge>
        </div>
        <h3 className="font-semibold text-lg leading-tight line-clamp-2">{product.title}</h3>
        {product.short_description && <p className="text-sm text-muted-foreground line-clamp-2">{product.short_description}</p>}
        {product.seller_name && <p className="text-xs text-muted-foreground">by {product.seller_name}</p>}
        <div className="flex items-baseline gap-2">
          {product.discounted_price ? (
            <>
              <span className="text-xl font-bold">R{Number(product.discounted_price).toFixed(2)}</span>
              <span className="text-sm line-through text-muted-foreground">R{Number(product.original_price).toFixed(2)}</span>
            </>
          ) : (
            <span className="text-xl font-bold">R{Number(product.original_price).toFixed(2)}</span>
          )}
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        {product.product_type === "external" ? (
          claimed ? (
            <Button variant="outline" size="sm" className="w-full" disabled><CheckCircle className="h-4 w-4 mr-1" />Claimed</Button>
          ) : (
            <Button variant="outline" size="sm" className="w-full" onClick={e => { e.stopPropagation(); onClaim.mutate(product); }} disabled={isSoldOut || onClaim.isPending}>
              <ExternalLink className="h-4 w-4 mr-1" />Claim Deal
            </Button>
          )
        ) : (
          <Button size="sm" className="w-full" onClick={e => { e.stopPropagation(); toast.info("Stripe checkout coming soon!"); }} disabled={isSoldOut}>
            <ShoppingCart className="h-4 w-4 mr-1" />Buy Now
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export default PortalMarketplace;
