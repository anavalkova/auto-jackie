DROP POLICY "drivers send inquiries" ON public.inquiries;
CREATE POLICY "drivers send inquiries" ON public.inquiries FOR INSERT TO authenticated
WITH CHECK (driver_id = auth.uid() AND status IN ('new'::inquiry_status, 'booked'::inquiry_status));