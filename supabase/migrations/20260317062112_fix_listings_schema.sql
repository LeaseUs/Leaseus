ALTER TABLE listings ADD COLUMN IF NOT EXISTS category_name TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS booking_type TEXT DEFAULT 'fixed';
NOTIFY pgrst, 'reload schema';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS category_name TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS booking_type TEXT DEFAULT 'fixed';

INSERT INTO storage.buckets (id, name, public) 
VALUES ('listing-images', 'listing-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY IF NOT EXISTS "Public read listing images"
ON storage.objects FOR SELECT
USING (bucket_id = 'listing-images');

NOTIFY pgrst, 'reload schema';