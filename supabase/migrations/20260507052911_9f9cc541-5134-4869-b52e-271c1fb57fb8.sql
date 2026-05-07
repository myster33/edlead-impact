
-- Fix chat_conversations SELECT policy (was: session_id = session_id which is always true)
DROP POLICY IF EXISTS "Visitors can view their own conversations" ON public.chat_conversations;

CREATE POLICY "Admins can view all conversations"
ON public.chat_conversations
FOR SELECT
USING (public.is_admin(auth.uid()));

-- SECURITY DEFINER function to allow visitors to look up their own conversation by session_id.
-- Returns only the minimal fields needed to restore the chat widget.
CREATE OR REPLACE FUNCTION public.get_visitor_conversation(_session_id text)
RETURNS TABLE (
  id uuid,
  visitor_name text,
  escalated_to_whatsapp boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, visitor_name, escalated_to_whatsapp
  FROM public.chat_conversations
  WHERE session_id = _session_id
    AND status = 'open'
  ORDER BY created_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_visitor_conversation(text) TO anon, authenticated;
