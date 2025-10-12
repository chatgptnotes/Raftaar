-- Add new status for timeout scenarios
-- This prevents next driver being called when driver actually accepted but transcript delayed

-- Drop old constraint
ALTER TABLE public.driver_assignment_queue
DROP CONSTRAINT IF EXISTS valid_status;

-- Add new constraint with additional status
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
    'cancelled_driver_already_assigned',
    'timeout_but_booking_assigned'
  )
);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Added timeout_but_booking_assigned status to constraint';
END $$;
