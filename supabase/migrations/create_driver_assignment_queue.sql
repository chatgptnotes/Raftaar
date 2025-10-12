-- Driver Assignment Queue Table
-- Stores fallback driver list for automatic driver assignment with retry logic
-- If first driver says "No" or doesn't answer, system automatically calls next driver

CREATE TABLE IF NOT EXISTS public.driver_assignment_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  position INT NOT NULL, -- 1 = first driver, 2 = second fallback, 3 = third fallback
  status TEXT NOT NULL DEFAULT 'pending', -- pending, calling, accepted, rejected, no_answer, failed
  call_id TEXT, -- Bolna execution_id for tracking the call
  response TEXT, -- Driver's response: "yes", "no", or null
  called_at TIMESTAMP WITH TIME ZONE,
  responded_at TIMESTAMP WITH TIME ZONE,
  distance TEXT, -- Distance from driver to booking location
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_booking_driver UNIQUE(booking_id, driver_id),
  CONSTRAINT valid_position CHECK (position >= 1 AND position <= 3),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'calling', 'accepted', 'rejected', 'no_answer', 'failed'))
);

-- Indexes for faster queries
CREATE INDEX idx_queue_booking_position ON public.driver_assignment_queue(booking_id, position);
CREATE INDEX idx_queue_status ON public.driver_assignment_queue(status);
CREATE INDEX idx_queue_call_id ON public.driver_assignment_queue(call_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.driver_assignment_queue ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for authenticated users
CREATE POLICY "Enable all operations for authenticated users"
ON public.driver_assignment_queue
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_driver_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_driver_queue_timestamp
BEFORE UPDATE ON public.driver_assignment_queue
FOR EACH ROW
EXECUTE FUNCTION update_driver_queue_updated_at();

-- Comments
COMMENT ON TABLE public.driver_assignment_queue IS 'Queue for automatic driver assignment with fallback logic';
COMMENT ON COLUMN public.driver_assignment_queue.position IS 'Priority order: 1 = first driver, 2 = second fallback, 3 = third fallback';
COMMENT ON COLUMN public.driver_assignment_queue.status IS 'Current status: pending, calling, accepted, rejected, no_answer, failed';
COMMENT ON COLUMN public.driver_assignment_queue.call_id IS 'Bolna API execution_id for tracking the call';
COMMENT ON COLUMN public.driver_assignment_queue.response IS 'Driver response: yes, no, or null if no answer';
