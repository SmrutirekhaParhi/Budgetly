-- Add PIN authentication fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS pin_verified BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS last_pin_login TIMESTAMPTZ;

-- Add type column to expenses table if it doesn't exist
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'EXPENSE' CHECK (type IN ('INCOME', 'EXPENSE'));

-- Drop old function if it exists
DROP FUNCTION IF EXISTS public.set_user_pin_on_signup(uuid, text);

-- Create function to verify PIN
CREATE OR REPLACE FUNCTION public.verify_user_pin(user_email TEXT, pin_input TEXT)
RETURNS TABLE(success BOOLEAN, user_id UUID, message TEXT) AS $$
DECLARE
  v_user_id UUID;
  v_pin_code TEXT;
BEGIN
  -- Get user_id and pin from profiles
  SELECT au.id, p.pin_code INTO v_user_id, v_pin_code
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.user_id = au.id
  WHERE au.email = user_email;

  -- Check if user exists
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false::BOOLEAN, NULL::UUID, 'User not found'::TEXT;
    RETURN;
  END IF;

  -- Check if PIN is set
  IF v_pin_code IS NULL OR v_pin_code = '' THEN
    RETURN QUERY SELECT false::BOOLEAN, v_user_id, 'PIN not configured'::TEXT;
    RETURN;
  END IF;

  -- Verify PIN
  IF v_pin_code = pin_input THEN
    -- Update last_pin_login timestamp
    UPDATE public.profiles 
    SET last_pin_login = now(), pin_verified = true
    WHERE public.profiles.user_id = v_user_id;
    
    RETURN QUERY SELECT true::BOOLEAN, v_user_id, 'PIN verified'::TEXT;
  ELSE
    RETURN QUERY SELECT false::BOOLEAN, v_user_id, 'Invalid PIN'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to set PIN during signup
CREATE OR REPLACE FUNCTION public.set_user_pin_on_signup(p_user_id UUID, p_pin_code TEXT)
RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
BEGIN
  -- Validate PIN format (6 digits)
  IF p_pin_code !~ '^\d{6}$' THEN
    RETURN QUERY SELECT false::BOOLEAN, 'PIN must be 6 digits'::TEXT;
    RETURN;
  END IF;

  -- Update PIN for user
  UPDATE public.profiles 
  SET pin_code = p_pin_code, pin_verified = true
  WHERE user_id = p_user_id;

  RETURN QUERY SELECT true::BOOLEAN, 'PIN set successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
