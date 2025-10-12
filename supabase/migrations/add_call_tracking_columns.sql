-- ================================================
-- ADD CALL TRACKING COLUMNS TO BOOKINGS TABLE
-- Track when calls are made to victims and drivers
-- ================================================

-- Add columns to track call status
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS victim_call_made BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS victim_call_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS victim_call_status TEXT,
ADD COLUMN IF NOT EXISTS driver_call_made BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS driver_call_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS driver_call_status TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_victim_call_made ON bookings(victim_call_made);
CREATE INDEX IF NOT EXISTS idx_bookings_driver_call_made ON bookings(driver_call_made);

-- Add comments for documentation
COMMENT ON COLUMN bookings.victim_call_made IS 'Whether a call was made to the victim/patient';
COMMENT ON COLUMN bookings.victim_call_time IS 'Timestamp when the victim call was initiated';
COMMENT ON COLUMN bookings.victim_call_status IS 'Status of the victim call (success/failed)';
COMMENT ON COLUMN bookings.driver_call_made IS 'Whether a call was made to the assigned driver';
COMMENT ON COLUMN bookings.driver_call_time IS 'Timestamp when the driver call was initiated';
COMMENT ON COLUMN bookings.driver_call_status IS 'Status of the driver call (success/failed)';
