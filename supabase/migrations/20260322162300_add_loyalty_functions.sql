-- Add loyalty_points field to profiles table if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;

-- Function to convert loyalty points to LEUS
CREATE OR REPLACE FUNCTION convert_points_to_leus(p_user_id UUID, p_points INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    tier TEXT;
    conversion_rate INTEGER;
    leus_amount INTEGER;
BEGIN
    -- Check if user has enough points
    IF p_points < 100 THEN
        RAISE EXCEPTION 'Minimum 100 points required for conversion';
    END IF;

    -- Get user's current tier
    SELECT
        CASE
            WHEN loyalty_points >= 3000 THEN 'Platinum'
            WHEN loyalty_points >= 1000 THEN 'Gold'
            ELSE 'Silver'
        END INTO tier
    FROM profiles
    WHERE id = p_user_id;

    -- Set conversion rate based on tier
    conversion_rate := CASE
        WHEN tier = 'Platinum' THEN 80
        WHEN tier = 'Gold' THEN 90
        ELSE 100
    END;

    -- Calculate LEUS amount (points / conversion_rate)
    leus_amount := p_points / conversion_rate;

    -- Update user's loyalty points and LEUS balance
    UPDATE profiles
    SET
        loyalty_points = loyalty_points - p_points,
        leus_balance = leus_balance + leus_amount,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Record the transaction
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
        'LOYALTY_CONVERSION_' || p_user_id || '_' || EXTRACT(epoch FROM NOW())::TEXT
    );

    -- Check if operation was successful
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Failed to update user profile';
    END IF;
END;
$$;

-- Function to add loyalty points for various activities
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
AS $$
BEGIN
    -- Update user's loyalty points
    UPDATE profiles
    SET
        loyalty_points = loyalty_points + p_points,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Record the transaction
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
        COALESCE(p_reference, p_type || '_' || p_user_id || '_' || EXTRACT(epoch FROM NOW())::TEXT)
    );

    -- Check if operation was successful
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Failed to add loyalty points';
    END IF;
END;
$$;

-- Function to award signup bonus
CREATE OR REPLACE FUNCTION award_signup_bonus(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user already has signup bonus
    IF EXISTS (
        SELECT 1 FROM wallet_transactions
        WHERE user_id = p_user_id AND type = 'signup_bonus'
    ) THEN
        RETURN; -- Already awarded
    END IF;

    -- Award 50 points for signup
    PERFORM add_loyalty_points(p_user_id, 50, 'signup_bonus', 'Welcome bonus for joining LeaseUs');
END;
$$;

-- Function to award points for service payment
CREATE OR REPLACE FUNCTION award_service_payment_points(p_user_id UUID, p_amount_pence INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    points_earned INTEGER;
BEGIN
    -- Calculate points: 1 point per £1 spent
    points_earned := p_amount_pence / 100;

    -- Award points for service payment
    PERFORM add_loyalty_points(
        p_user_id,
        points_earned,
        'points_earned',
        'Points earned from service payment',
        'PAYMENT_' || p_user_id || '_' || EXTRACT(epoch FROM NOW())::TEXT
    );
END;
$$;

-- Function to award referral bonus
CREATE OR REPLACE FUNCTION award_referral_bonus(p_referrer_id UUID, p_referee_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Award 100 points to referrer
    PERFORM add_loyalty_points(
        p_referrer_id,
        100,
        'referral_bonus',
        'Bonus for referring a new user',
        'REFERRAL_' || p_referrer_id || '_' || p_referee_id
    );
END;
$$;

-- Function to award provider bonus
CREATE OR REPLACE FUNCTION award_provider_bonus(p_provider_id UUID, p_booking_amount_pence INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    bonus_points INTEGER;
BEGIN
    -- Calculate bonus: 10% of booking amount in points
    bonus_points := (p_booking_amount_pence / 100) / 10;

    -- Award bonus points to provider
    PERFORM add_loyalty_points(
        p_provider_id,
        bonus_points,
        'provider_bonus',
        'Bonus for completed service',
        'PROVIDER_BONUS_' || p_provider_id || '_' || EXTRACT(epoch FROM NOW())::TEXT
    );
END;
$$;