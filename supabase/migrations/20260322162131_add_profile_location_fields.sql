-- Add location fields to profiles table for navigation functionality
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_lat DOUBLE PRECISION;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_lng DOUBLE PRECISION;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_address TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location_city TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS share_location_with_provider BOOLEAN DEFAULT false;

-- Ensure preferences column exists (it should already exist, but adding for completeness)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferences JSONB;

-- Create index for location queries
CREATE INDEX IF NOT EXISTS idx_profiles_business_lat_lng ON profiles (business_lat, business_lng) WHERE business_lat IS NOT NULL AND business_lng IS NOT NULL;

-- Create index for location sharing
CREATE INDEX IF NOT EXISTS idx_profiles_share_location ON profiles (share_location_with_provider) WHERE share_location_with_provider = true;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';