-- ================================================
-- UPDATE DRIVERS TABLE - ADD MISSING COLUMNS
-- ================================================
-- Run this SQL in Supabase SQL Editor
-- ================================================

-- Add latitude and longitude columns for Google Maps location
ALTER TABLE public.drivers
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;

ALTER TABLE public.drivers
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Create index for location queries
CREATE INDEX IF NOT EXISTS idx_drivers_location
ON public.drivers USING btree (latitude, longitude);

-- ================================================
-- SUCCESS!
-- ================================================
-- Drivers table updated with location columns
-- ================================================
