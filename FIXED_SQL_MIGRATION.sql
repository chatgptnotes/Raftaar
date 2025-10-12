-- ========================================
-- DRIVER ASSIGNMENT QUEUE TABLE
-- Run this SQL in Supabase SQL Editor
-- ========================================

-- Drop table if exists (to start fresh)
DROP TABLE IF EXISTS public.driver_assignment_queue CASCADE;

-- Create table
CREATE TABLE public.driver_assignment_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  position INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  call_id TEXT,
  response TEXT,
  called_at TIMESTAMP WITH TIME ZONE,
  responded_at TIMESTAMP WITH TIME ZONE,
  distance TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_booking_driver UNIQUE(booking_id, driver_id),
  CONSTRAINT valid_position CHECK (position >= 1 AND position <= 3),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'calling', 'accepted', 'rejected', 'no_answer', 'failed', 'cancelled'))
);

-- Create indexes
CREATE INDEX idx_queue_booking_position ON public.driver_assignment_queue(booking_id, position);
CREATE INDEX idx_queue_status ON public.driver_assignment_queue(status);
CREATE INDEX idx_queue_call_id ON public.driver_assignment_queue(call_id);

-- Enable RLS
ALTER TABLE public.driver_assignment_queue ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public read access" ON public.driver_assignment_queue;
DROP POLICY IF EXISTS "Allow public insert access" ON public.driver_assignment_queue;
DROP POLICY IF EXISTS "Allow public update access" ON public.driver_assignment_queue;
DROP POLICY IF EXISTS "Allow public delete access" ON public.driver_assignment_queue;

-- Create permissive policies for all operations (anon + authenticated)
CREATE POLICY "Allow public read access"
ON public.driver_assignment_queue
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow public insert access"
ON public.driver_assignment_queue
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow public update access"
ON public.driver_assignment_queue
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public delete access"
ON public.driver_assignment_queue
FOR DELETE
TO anon, authenticated
USING (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_driver_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_driver_queue_timestamp ON public.driver_assignment_queue;

CREATE TRIGGER trigger_update_driver_queue_timestamp
BEFORE UPDATE ON public.driver_assignment_queue
FOR EACH ROW
EXECUTE FUNCTION update_driver_queue_updated_at();

-- Grant permissions
GRANT ALL ON public.driver_assignment_queue TO anon;
GRANT ALL ON public.driver_assignment_queue TO authenticated;

-- Add comments
COMMENT ON TABLE public.driver_assignment_queue IS 'Queue for automatic driver assignment with fallback logic';
COMMENT ON COLUMN public.driver_assignment_queue.position IS 'Priority order: 1 = first driver, 2 = second fallback, 3 = third fallback';
COMMENT ON COLUMN public.driver_assignment_queue.status IS 'Current status: pending, calling, accepted, rejected, no_answer, failed, cancelled';
