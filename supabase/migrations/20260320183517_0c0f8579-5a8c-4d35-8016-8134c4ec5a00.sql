DROP POLICY IF EXISTS "Admin role users can modify system settings" ON public.system_settings;
CREATE POLICY "Admin role users can modify system settings"
  ON public.system_settings
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));