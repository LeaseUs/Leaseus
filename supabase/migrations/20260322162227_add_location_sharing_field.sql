-- Add location sharing permission field to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS share_location_with_provider BOOLEAN DEFAULT false;

-- Create index for location sharing queries
CREATE INDEX IF NOT EXISTS idx_profiles_share_location ON profiles (share_location_with_provider) WHERE share_location_with_provider = true;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';