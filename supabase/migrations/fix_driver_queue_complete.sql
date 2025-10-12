-- Complete Fix for driver_assignment_queue table
-- Fixes: 406 errors, missing statuses, missing columns
-- Created: 2025-10-12

-- ========================================
-- STEP 1: Add missing response_analysis column
-- ========================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'driver_assignment_queue'
    AND column_name = 'response_analysis'
  ) THEN
    ALTER TABLE public.driver_assignment_queue
    ADD COLUMN response_analysis JSONB;

    COMMENT ON COLUMN public.driver_assignment_queue.response_analysis
    IS 'AI analysis of driver call transcript including response type, confidence, and keywords';
  END IF;
END $$;

-- ========================================
-- STEP 2: Drop old CHECK constraint and create new one with all statuses
-- ========================================
ALTER TABLE public.driver_assignment_queue
DROP CONSTRAINT IF EXISTS valid_status;

ALTER TABLE public.driver_assignment_queue
ADD CONSTRAINT valid_status CHECK (
  status IN (
    'pending',
    'calling',
    'accepted',
    'rejected',
    'no_answer',
    'failed',
    'unclear',
    'cancelled',
    'cancelled_due_to_acceptance',
    'cancelled_driver_already_assigned'
  )
);

-- ========================================
-- STEP 3: Fix RLS Policies - Support both authenticated and anon roles
-- ========================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.driver_assignment_queue;
DROP POLICY IF EXISTS "Allow all operations on driver_assignment_queue" ON public.driver_assignment_queue;
DROP POLICY IF EXISTS "Enable read for all" ON public.driver_assignment_queue;
DROP POLICY IF EXISTS "Enable insert for all" ON public.driver_assignment_queue;
DROP POLICY IF EXISTS "Enable update for all" ON public.driver_assignment_queue;
DROP POLICY IF EXISTS "Enable delete for all" ON public.driver_assignment_queue;

-- Enable RLS (if not already enabled)
ALTER TABLE public.driver_assignment_queue ENABLE ROW LEVEL SECURITY;

-- Create comprehensive policy for all operations
-- This allows both authenticated users AND anon role (for client-side operations)
CREATE POLICY "Allow all operations for all roles"
ON public.driver_assignment_queue
FOR ALL
USING (true)
WITH CHECK (true);

-- ========================================
-- STEP 4: Grant permissions to all necessary roles
-- ========================================
GRANT ALL ON public.driver_assignment_queue TO anon;
GRANT ALL ON public.driver_assignment_queue TO authenticated;
GRANT ALL ON public.driver_assignment_queue TO service_role;

-- Grant sequence permissions if any
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ========================================
-- STEP 5: Verify configuration
-- ========================================

-- Show current policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'driver_assignment_queue';

-- Show column information
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'driver_assignment_queue'
ORDER BY ordinal_position;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ driver_assignment_queue table has been successfully updated!';
  RAISE NOTICE '   - Added response_analysis JSONB column';
  RAISE NOTICE '   - Updated status constraint with all required statuses';
  RAISE NOTICE '   - Fixed RLS policies for anon + authenticated roles';
  RAISE NOTICE '   - Granted all necessary permissions';
END $$;
