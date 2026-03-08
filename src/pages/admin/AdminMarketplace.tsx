import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarketplaceProductsTab } from "@/components/admin/marketplace/MarketplaceProductsTab";
import { MarketplaceCategoriesTab } from "@/components/admin/marketplace/MarketplaceCategoriesTab";
import { MarketplaceClaimsTab } from "@/components/admin/marketplace/MarketplaceClaimsTab";
import { MarketplaceOrdersTab } from "@/components/admin/marketplace/MarketplaceOrdersTab";

const AdminMarketplace = () => {
  const [activeTab, setActiveTab] = useState("products");

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Marketplace</h1>
          <p className="text-muted-foreground">
            Manage discounts, products, and services for portal users.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="products">Products & Deals</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="claims">Claims</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <MarketplaceProductsTab />
          </TabsContent>
          <TabsContent value="categories">
            <MarketplaceCategoriesTab />
          </TabsContent>
          <TabsContent value="claims">
            <MarketplaceClaimsTab />
          </TabsContent>
          <TabsContent value="orders">
            <MarketplaceOrdersTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminMarketplace;
