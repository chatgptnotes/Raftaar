-- Add columns for emergency location form data to bookings table
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS pincode TEXT,
  ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Add indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_bookings_city ON public.bookings USING btree (city);
CREATE INDEX IF NOT EXISTS idx_bookings_pincode ON public.bookings USING btree (pincode);
CREATE INDEX IF NOT EXISTS idx_bookings_phone_number ON public.bookings USING btree (phone_number);

-- Add comments for documentation
COMMENT ON COLUMN public.bookings.address IS 'Full address from emergency location form';
COMMENT ON COLUMN public.bookings.city IS 'City from emergency location form';
COMMENT ON COLUMN public.bookings.pincode IS 'Pincode/ZIP code from emergency location form';
COMMENT ON COLUMN public.bookings.phone_number IS 'Contact phone number from emergency location form';
