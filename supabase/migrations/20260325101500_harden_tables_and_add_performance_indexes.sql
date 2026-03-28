-- Harden frequently used tables and add indexes for the app's hottest filters.
-- This migration is intentionally forward-only so we do not rewrite older migrations.

-- Normalize common defaults on profiles.
ALTER TABLE IF EXISTS profiles
  ALTER COLUMN share_location_with_provider SET DEFAULT false;

ALTER TABLE IF EXISTS profiles
  ALTER COLUMN loyalty_points SET DEFAULT 0;

-- Add lightweight guards that prevent bad writes without blocking the migration on old rows.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_business_lat_valid'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_business_lat_valid
      CHECK (business_lat IS NULL OR business_lat BETWEEN -90 AND 90) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_business_lng_valid'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_business_lng_valid
      CHECK (business_lng IS NULL OR business_lng BETWEEN -180 AND 180) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_loyalty_points_non_negative'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_loyalty_points_non_negative
      CHECK (loyalty_points IS NULL OR loyalty_points >= 0) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_leus_balance_non_negative'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_leus_balance_non_negative
      CHECK (leus_balance IS NULL OR leus_balance >= 0) NOT VALID;
  END IF;
END
$$;

-- Profiles query paths
CREATE INDEX IF NOT EXISTS idx_profiles_role_location
  ON profiles (role, business_lat, business_lng)
  WHERE business_lat IS NOT NULL AND business_lng IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_local_partner_location
  ON profiles (is_local_partner, accepts_leus, business_lat, business_lng)
  WHERE is_local_partner = true
    AND accepts_leus = true
    AND business_lat IS NOT NULL
    AND business_lng IS NOT NULL;

-- Listings query paths
CREATE INDEX IF NOT EXISTS idx_listings_provider_status
  ON listings (provider_id, status);

CREATE INDEX IF NOT EXISTS idx_listings_status_created_at
  ON listings (status, created_at DESC);

-- Bookings query paths
CREATE INDEX IF NOT EXISTS idx_bookings_provider_status_created_at
  ON bookings (provider_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_client_created_at
  ON bookings (client_id, created_at DESC);

-- Wallet / loyalty query paths
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_created_at
  ON wallet_transactions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_type_created_at
  ON wallet_transactions (user_id, type, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_transactions_signup_bonus_once
  ON wallet_transactions (user_id)
  WHERE type = 'signup_bonus';

-- Notifications / reviews / listing images
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created_at
  ON notifications (user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_created_at
  ON reviews (reviewee_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_listing_images_listing_primary
  ON listing_images (listing_id, is_primary DESC);

-- Concurrency-safe loyalty functions.
CREATE OR REPLACE FUNCTION convert_points_to_leus(p_user_id UUID, p_points INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_points INTEGER;
    conversion_rate INTEGER;
    leus_amount INTEGER;
BEGIN
    IF p_points IS NULL OR p_points < 100 THEN
        RAISE EXCEPTION 'Minimum 100 points required for conversion';
    END IF;

    SELECT loyalty_points
    INTO current_points
    FROM profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF current_points IS NULL THEN
        RAISE EXCEPTION 'User profile not found';
    END IF;

    IF current_points < p_points THEN
        RAISE EXCEPTION 'Insufficient loyalty points';
    END IF;

    conversion_rate := CASE
        WHEN current_points >= 3000 THEN 80
        WHEN current_points >= 1000 THEN 90
        ELSE 100
    END;

    leus_amount := p_points / conversion_rate;

    UPDATE profiles
    SET
        loyalty_points = current_points - p_points,
        leus_balance = COALESCE(leus_balance, 0) + leus_amount,
        updated_at = NOW()
    WHERE id = p_user_id;

    INSERT INTO wallet_transactions (
        user_id,
        type,
        points_delta,
        leus_delta,
        notes,
        reference
    ) VALUES (
        p_user_id,
        'points_redeemed',
        -p_points,
        leus_amount,
        'Converted loyalty points to LEUS',
        'LOYALTY_CONVERSION_' || p_user_id || '_' || EXTRACT(epoch FROM clock_timestamp())::TEXT
    );
END;
$$;

CREATE OR REPLACE FUNCTION add_loyalty_points(
    p_user_id UUID,
    p_points INTEGER,
    p_type TEXT,
    p_notes TEXT DEFAULT NULL,
    p_reference TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    updated_user_id UUID;
BEGIN
    IF p_points IS NULL OR p_points <= 0 THEN
        RAISE EXCEPTION 'Points to add must be greater than zero';
    END IF;

    UPDATE profiles
    SET
        loyalty_points = COALESCE(loyalty_points, 0) + p_points,
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING id INTO updated_user_id;

    IF updated_user_id IS NULL THEN
        RAISE EXCEPTION 'Failed to update user profile';
    END IF;

    INSERT INTO wallet_transactions (
        user_id,
        type,
        points_delta,
        notes,
        reference
    ) VALUES (
        p_user_id,
        p_type,
        p_points,
        COALESCE(p_notes, p_type),
        COALESCE(p_reference, p_type || '_' || p_user_id || '_' || EXTRACT(epoch FROM clock_timestamp())::TEXT)
    );
END;
$$;

CREATE OR REPLACE FUNCTION award_signup_bonus(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    bonus_awarded INTEGER;
    updated_user_id UUID;
BEGIN
    INSERT INTO wallet_transactions (
        user_id,
        type,
        points_delta,
        notes,
        reference
    ) VALUES (
        p_user_id,
        'signup_bonus',
        50,
        'Welcome bonus for joining LeaseUs',
        'SIGNUP_BONUS_' || p_user_id
    )
    ON CONFLICT DO NOTHING
    RETURNING 1 INTO bonus_awarded;

    IF bonus_awarded IS NULL THEN
        RETURN;
    END IF;

    UPDATE profiles
    SET
        loyalty_points = COALESCE(loyalty_points, 0) + 50,
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING id INTO updated_user_id;

    IF updated_user_id IS NULL THEN
        RAISE EXCEPTION 'User profile not found';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION award_service_payment_points(p_user_id UUID, p_amount_pence INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    points_earned INTEGER;
BEGIN
    points_earned := GREATEST(COALESCE(p_amount_pence, 0), 0) / 100;

    IF points_earned = 0 THEN
        RETURN;
    END IF;

    PERFORM add_loyalty_points(
        p_user_id,
        points_earned,
        'points_earned',
        'Points earned from service payment',
        'PAYMENT_' || p_user_id || '_' || EXTRACT(epoch FROM clock_timestamp())::TEXT
    );
END;
$$;

CREATE OR REPLACE FUNCTION award_referral_bonus(p_referrer_id UUID, p_referee_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM add_loyalty_points(
        p_referrer_id,
        100,
        'referral_bonus',
        'Bonus for referring a new user',
        'REFERRAL_' || p_referrer_id || '_' || p_referee_id
    );
END;
$$;

CREATE OR REPLACE FUNCTION award_provider_bonus(p_provider_id UUID, p_booking_amount_pence INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    bonus_points INTEGER;
BEGIN
    bonus_points := GREATEST(COALESCE(p_booking_amount_pence, 0), 0) / 100 / 10;

    IF bonus_points = 0 THEN
        RETURN;
    END IF;

    PERFORM add_loyalty_points(
        p_provider_id,
        bonus_points,
        'provider_bonus',
        'Bonus for completed service',
        'PROVIDER_BONUS_' || p_provider_id || '_' || EXTRACT(epoch FROM clock_timestamp())::TEXT
    );
END;
$$;

NOTIFY pgrst, 'reload schema';
