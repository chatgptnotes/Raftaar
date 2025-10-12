-- Fix RLS policies for driver_assignment_queue table
-- This fixes the 406 Not Acceptable error

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow all operations on driver_assignment_queue" ON driver_assignment_queue;
DROP POLICY IF EXISTS "Enable read for all" ON driver_assignment_queue;
DROP POLICY IF EXISTS "Enable insert for all" ON driver_assignment_queue;
DROP POLICY IF EXISTS "Enable update for all" ON driver_assignment_queue;
DROP POLICY IF EXISTS "Enable delete for all" ON driver_assignment_queue;

-- Enable RLS
ALTER TABLE driver_assignment_queue ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for all operations
-- This allows the application to perform all operations
CREATE POLICY "Allow all operations on driver_assignment_queue"
ON driver_assignment_queue
FOR ALL
USING (true)
WITH CHECK (true);

-- Verify the table permissions
GRANT ALL ON driver_assignment_queue TO anon, authenticated, service_role;

-- Show current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'driver_assignment_queue';
