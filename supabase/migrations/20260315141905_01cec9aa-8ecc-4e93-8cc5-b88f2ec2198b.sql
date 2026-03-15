
CREATE TABLE public.shop_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  status text NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  set_by_admin uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shop_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription" ON public.shop_subscriptions 
  FOR SELECT TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage subscriptions" ON public.shop_subscriptions 
  FOR ALL TO authenticated 
  USING (has_role(auth.uid(), 'platform_admin')) 
  WITH CHECK (has_role(auth.uid(), 'platform_admin'));
