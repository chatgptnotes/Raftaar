-- Enable INSERT operations for public users on bookings table
-- This allows the emergency location form to submit data from the client side

-- Create policy to allow anyone to insert emergency bookings
CREATE POLICY "Allow public emergency booking inserts"
ON public.bookings
FOR INSERT
TO public
WITH CHECK (true);
