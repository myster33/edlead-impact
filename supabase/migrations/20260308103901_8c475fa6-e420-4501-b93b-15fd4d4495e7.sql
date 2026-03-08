
-- Marketplace categories
CREATE TABLE public.marketplace_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.marketplace_categories ENABLE ROW LEVEL SECURITY;

-- Marketplace products/services
CREATE TABLE public.marketplace_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.marketplace_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  short_description TEXT,
  image_url TEXT,
  gallery_urls TEXT[] DEFAULT '{}',
  original_price NUMERIC(10,2) NOT NULL,
  discounted_price NUMERIC(10,2),
  discount_percentage NUMERIC(5,2),
  currency TEXT NOT NULL DEFAULT 'ZAR',
  product_type TEXT NOT NULL DEFAULT 'external' CHECK (product_type IN ('internal', 'external')),
  external_url TEXT,
  seller_name TEXT,
  seller_logo_url TEXT,
  terms_conditions TEXT,
  eligibility TEXT[] DEFAULT ARRAY['student', 'parent', 'educator'],
  coupon_code TEXT,
  quantity_limit INTEGER,
  quantity_claimed INTEGER NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  tags TEXT[] DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.marketplace_products ENABLE ROW LEVEL SECURITY;

-- Product variants (sizes, colors, etc.)
CREATE TABLE public.marketplace_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.marketplace_products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value TEXT NOT NULL,
  price_adjustment NUMERIC(10,2) DEFAULT 0,
  stock_quantity INTEGER,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.marketplace_variants ENABLE ROW LEVEL SECURITY;

-- Claims for external products (redirect to seller)
CREATE TABLE public.marketplace_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.marketplace_products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  school_user_id UUID REFERENCES public.school_users(id),
  user_role TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'claimed' CHECK (status IN ('claimed', 'redeemed', 'expired'))
);
ALTER TABLE public.marketplace_claims ENABLE ROW LEVEL SECURITY;

-- Orders for internal products (direct purchase)
CREATE TABLE public.marketplace_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.marketplace_products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.marketplace_variants(id),
  user_id UUID NOT NULL,
  school_user_id UUID REFERENCES public.school_users(id),
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.marketplace_orders ENABLE ROW LEVEL SECURITY;

-- Reviews and ratings
CREATE TABLE public.marketplace_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.marketplace_products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.marketplace_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Categories: admins manage, portal users read active
CREATE POLICY "Admins can manage categories" ON public.marketplace_categories FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Authenticated users can view active categories" ON public.marketplace_categories FOR SELECT USING (is_active = true);

-- Products: admins manage, portal users read active
CREATE POLICY "Admins can manage products" ON public.marketplace_products FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Authenticated users can view active products" ON public.marketplace_products FOR SELECT USING (is_active = true AND (starts_at IS NULL OR starts_at <= now()) AND (expires_at IS NULL OR expires_at > now()));

-- Variants: admins manage, users read
CREATE POLICY "Admins can manage variants" ON public.marketplace_variants FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Authenticated users can view available variants" ON public.marketplace_variants FOR SELECT USING (is_available = true);

-- Claims: admins view all, users insert own and view own
CREATE POLICY "Admins can manage claims" ON public.marketplace_claims FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Users can create claims" ON public.marketplace_claims FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can view own claims" ON public.marketplace_claims FOR SELECT USING (user_id = auth.uid());

-- Orders: admins view all, users insert own and view own
CREATE POLICY "Admins can manage orders" ON public.marketplace_orders FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Users can create orders" ON public.marketplace_orders FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can view own orders" ON public.marketplace_orders FOR SELECT USING (user_id = auth.uid());

-- Reviews: admins manage, users insert own, anyone reads approved
CREATE POLICY "Admins can manage reviews" ON public.marketplace_reviews FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Users can submit reviews" ON public.marketplace_reviews FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Anyone can view approved reviews" ON public.marketplace_reviews FOR SELECT USING (is_approved = true OR is_admin(auth.uid()));

-- Update triggers
CREATE TRIGGER update_marketplace_categories_updated_at BEFORE UPDATE ON public.marketplace_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_marketplace_products_updated_at BEFORE UPDATE ON public.marketplace_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_marketplace_orders_updated_at BEFORE UPDATE ON public.marketplace_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
