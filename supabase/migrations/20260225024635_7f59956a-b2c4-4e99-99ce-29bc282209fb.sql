
-- Add brand customization columns to shop_settings
ALTER TABLE public.shop_settings 
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS brand_color text DEFAULT 'blue',
  ADD COLUMN IF NOT EXISTS language text DEFAULT 'fr';

-- Create storage bucket for shop logos
INSERT INTO storage.buckets (id, name, public) VALUES ('shop-logos', 'shop-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for shop logos
CREATE POLICY "Anyone can view shop logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'shop-logos');

CREATE POLICY "Authenticated users can upload their logo"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'shop-logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their logo"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'shop-logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their logo"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'shop-logos' AND auth.uid() IS NOT NULL);
