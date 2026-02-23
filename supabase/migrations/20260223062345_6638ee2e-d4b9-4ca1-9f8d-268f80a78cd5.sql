
-- Create admin direct messages table
CREATE TABLE public.admin_direct_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_direct_messages ENABLE ROW LEVEL SECURITY;

-- Admins can view their own messages (sent or received)
CREATE POLICY "Users can view their own DMs"
ON public.admin_direct_messages
FOR SELECT
TO authenticated
USING (
  sender_id IN (SELECT id FROM admin_users WHERE user_id = auth.uid())
  OR recipient_id IN (SELECT id FROM admin_users WHERE user_id = auth.uid())
);

-- Admins can send DMs
CREATE POLICY "Users can send DMs"
ON public.admin_direct_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id IN (SELECT id FROM admin_users WHERE user_id = auth.uid())
);

-- Users can mark messages as read (update is_read on messages they received)
CREATE POLICY "Users can mark received DMs as read"
ON public.admin_direct_messages
FOR UPDATE
TO authenticated
USING (
  recipient_id IN (SELECT id FROM admin_users WHERE user_id = auth.uid())
);

-- Users can delete their own sent messages
CREATE POLICY "Users can delete their own sent DMs"
ON public.admin_direct_messages
FOR DELETE
TO authenticated
USING (
  sender_id IN (SELECT id FROM admin_users WHERE user_id = auth.uid())
);

-- Create index for fast conversation lookups
CREATE INDEX idx_admin_dms_sender ON public.admin_direct_messages(sender_id, created_at DESC);
CREATE INDEX idx_admin_dms_recipient ON public.admin_direct_messages(recipient_id, created_at DESC);
CREATE INDEX idx_admin_dms_conversation ON public.admin_direct_messages(sender_id, recipient_id, created_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_direct_messages;
