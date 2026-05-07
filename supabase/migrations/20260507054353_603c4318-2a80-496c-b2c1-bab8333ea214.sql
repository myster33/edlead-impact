DROP POLICY IF EXISTS "Anyone can view messages in their conversation or admins view a" ON public.chat_messages;
DROP POLICY IF EXISTS "Admins can view all chat messages" ON public.chat_messages;

CREATE POLICY "Admins can view all chat messages"
ON public.chat_messages
FOR SELECT
TO public
USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.get_visitor_chat_messages(_session_id text, _conversation_id uuid)
RETURNS TABLE(
  id uuid,
  content text,
  sender_type text,
  created_at timestamptz,
  is_ai_response boolean,
  sender_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.id,
    m.content,
    m.sender_type,
    m.created_at,
    COALESCE(m.is_ai_response, false) AS is_ai_response,
    m.sender_id
  FROM public.chat_messages m
  INNER JOIN public.chat_conversations c ON c.id = m.conversation_id
  WHERE c.id = _conversation_id
    AND c.session_id = _session_id
    AND c.status = 'open'
  ORDER BY m.created_at ASC;
$$;

REVOKE ALL ON FUNCTION public.get_visitor_chat_messages(text, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_visitor_chat_messages(text, uuid) TO anon, authenticated;