-- Improvements for drivers table
-- Adds constraints for data integrity and validation

-- ========================================
-- STEP 1: Add UNIQUE constraints
-- ========================================

-- Email should be unique (if provided)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'drivers_email_unique'
  ) THEN
    ALTER TABLE public.drivers
    ADD CONSTRAINT drivers_email_unique UNIQUE (email);
    RAISE NOTICE '✅ Added UNIQUE constraint on email';
  END IF;
END $$;

-- Phone should be unique (critical for driver calls!)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'drivers_phone_unique'
  ) THEN
    ALTER TABLE public.drivers
    ADD CONSTRAINT drivers_phone_unique UNIQUE (phone);
    RAISE NOTICE '✅ Added UNIQUE constraint on phone';
  END IF;
END $$;

-- Vehicle number should be unique
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'drivers_vehicle_number_unique'
  ) THEN
    ALTER TABLE public.drivers
    ADD CONSTRAINT drivers_vehicle_number_unique UNIQUE (vehicle_number);
    RAISE NOTICE '✅ Added UNIQUE constraint on vehicle_number';
  END IF;
END $$;

-- ========================================
-- STEP 2: Add CHECK constraints for valid values
-- ========================================

-- Current status should only be 'online', 'offline', or 'busy'
ALTER TABLE public.drivers
DROP CONSTRAINT IF EXISTS valid_current_status;

ALTER TABLE public.drivers
ADD CONSTRAINT valid_current_status CHECK (
  current_status IN ('online', 'offline', 'busy', 'on_trip')
);

-- Service type validation (basic, icu, advanced, etc.)
ALTER TABLE public.drivers
DROP CONSTRAINT IF EXISTS valid_service_type;

ALTER TABLE public.drivers
ADD CONSTRAINT valid_service_type CHECK (
  service_type IS NULL OR
  service_type IN ('basic', 'icu', 'advanced', 'nicu', 'ventilator')
);

-- Phone number format validation (Indian numbers)
-- Must start with +91 or be 10 digits
ALTER TABLE public.drivers
DROP CONSTRAINT IF EXISTS valid_phone_format;

ALTER TABLE public.drivers
ADD CONSTRAINT valid_phone_format CHECK (
  phone ~ '^(\+91|91)?[6-9][0-9]{9}$'
);

-- ========================================
-- STEP 3: Add validation for coordinates
-- ========================================

-- Latitude must be between -90 and 90
ALTER TABLE public.drivers
DROP CONSTRAINT IF EXISTS valid_latitude;

ALTER TABLE public.drivers
ADD CONSTRAINT valid_latitude CHECK (
  latitude IS NULL OR (latitude >= -90 AND latitude <= 90)
);

-- Longitude must be between -180 and 180
ALTER TABLE public.drivers
DROP CONSTRAINT IF EXISTS valid_longitude;

ALTER TABLE public.drivers
ADD CONSTRAINT valid_longitude CHECK (
  longitude IS NULL OR (longitude >= -180 AND longitude <= 180)
);

-- Both coordinates should be set together (not one without the other)
ALTER TABLE public.drivers
DROP CONSTRAINT IF EXISTS coordinates_together;

ALTER TABLE public.drivers
ADD CONSTRAINT coordinates_together CHECK (
  (latitude IS NULL AND longitude IS NULL) OR
  (latitude IS NOT NULL AND longitude IS NOT NULL)
);

-- ========================================
-- STEP 4: Add index for phone lookup (used in calls)
-- ========================================
CREATE INDEX IF NOT EXISTS idx_drivers_phone
ON public.drivers(phone)
WHERE phone IS NOT NULL;

-- ========================================
-- STEP 5: Add index for vehicle number lookup
-- ========================================
CREATE INDEX IF NOT EXISTS idx_drivers_vehicle_number
ON public.drivers(vehicle_number)
WHERE vehicle_number IS NOT NULL;

-- ========================================
-- STEP 6: Add composite index for availability + location search
-- ========================================
CREATE INDEX IF NOT EXISTS idx_drivers_available_with_location
ON public.drivers(is_available, current_status, latitude, longitude)
WHERE is_available = true
  AND current_status = 'online'
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL;

-- ========================================
-- Verification and Summary
-- ========================================

-- Show all constraints
SELECT
  conname AS constraint_name,
  contype AS constraint_type
FROM pg_constraint
WHERE conrelid = 'public.drivers'::regclass
ORDER BY conname;

-- Show all indexes
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'drivers'
ORDER BY indexname;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '╔══════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ Drivers Table Improvements Complete!    ║';
  RAISE NOTICE '║                                              ║';
  RAISE NOTICE '║  • UNIQUE constraints added                  ║';
  RAISE NOTICE '║  • CHECK constraints for validation          ║';
  RAISE NOTICE '║  • Coordinate validation added               ║';
  RAISE NOTICE '║  • Additional indexes for performance        ║';
  RAISE NOTICE '╚══════════════════════════════════════════════╝';
END $$;
