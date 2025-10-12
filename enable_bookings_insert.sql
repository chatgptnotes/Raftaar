-- Enable INSERT operations for public users on bookings table
-- This allows the emergency location form to submit data from the client side

-- Create policy to allow anyone to insert emergency bookings
CREATE POLICY "Allow public emergency booking inserts"
ON public.bookings
FOR INSERT
TO public
WITH CHECK (true);

-- Optional: If you want to allow users to view only their own bookings later,
-- you can add this policy (commented out for now):
-- CREATE POLICY "Users can view their own bookings"
-- ON public.bookings
-- FOR SELECT
-- TO public
-- USING (phone_number = current_setting('request.jwt.claims', true)::json->>'phone');

-- Verify RLS is enabled (it should already be enabled)
-- ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
