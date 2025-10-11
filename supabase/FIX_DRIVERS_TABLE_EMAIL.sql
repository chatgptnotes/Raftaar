-- ================================================
-- FIX DRIVERS TABLE - MAKE EMAIL NULLABLE
-- ================================================
-- Run this SQL in Supabase SQL Editor
-- ================================================

-- Make email column nullable (remove NOT NULL constraint)
ALTER TABLE public.drivers
ALTER COLUMN email DROP NOT NULL;

-- Drop the unique constraint on email
ALTER TABLE public.drivers
DROP CONSTRAINT IF EXISTS drivers_email_key;

-- Drop the email index if it exists
DROP INDEX IF EXISTS idx_drivers_email;

-- ================================================
-- SUCCESS!
-- ================================================
-- Email field is now optional in drivers table
-- You can create drivers without email
-- ================================================
