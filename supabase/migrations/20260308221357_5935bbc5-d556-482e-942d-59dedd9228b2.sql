
-- 1. School Chat Knowledge Base
CREATE TABLE public.school_chat_knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.school_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.school_chat_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School staff can manage knowledge" ON public.school_chat_knowledge
  FOR ALL TO authenticated
  USING (is_school_staff(auth.uid(), school_id))
  WITH CHECK (is_school_staff(auth.uid(), school_id));

CREATE POLICY "School members can view knowledge" ON public.school_chat_knowledge
  FOR SELECT TO authenticated
  USING (is_school_member(auth.uid(), school_id));

CREATE POLICY "Main admins can manage all knowledge" ON public.school_chat_knowledge
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

-- 2. School Chat Conversations
CREATE TABLE public.school_chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  visitor_name text,
  visitor_role text NOT NULL DEFAULT 'guest',
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz DEFAULT now()
);

ALTER TABLE public.school_chat_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create school chat conversations" ON public.school_chat_conversations
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can view own session conversations" ON public.school_chat_conversations
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can update own conversations" ON public.school_chat_conversations
  FOR UPDATE TO anon, authenticated
  USING (true);

CREATE POLICY "Main admins can manage all school conversations" ON public.school_chat_conversations
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "School staff can view school conversations" ON public.school_chat_conversations
  FOR SELECT TO authenticated
  USING (is_school_staff(auth.uid(), school_id));

-- 3. School Chat Messages
CREATE TABLE public.school_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.school_chat_conversations(id) ON DELETE CASCADE,
  sender_type text NOT NULL DEFAULT 'visitor',
  content text NOT NULL,
  is_ai_response boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.school_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert school chat messages" ON public.school_chat_messages
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can view school chat messages" ON public.school_chat_messages
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Main admins can manage all school messages" ON public.school_chat_messages
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.school_chat_messages;

-- Trigger for updated_at on knowledge
CREATE TRIGGER update_school_chat_knowledge_updated_at
  BEFORE UPDATE ON public.school_chat_knowledge
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
