
-- Chat conversations table
CREATE TABLE public.chat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  visitor_name TEXT,
  visitor_email TEXT,
  visitor_country TEXT DEFAULT 'South Africa',
  visitor_province TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  assigned_to UUID REFERENCES public.admin_users(id),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Chat messages table
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('visitor', 'admin')),
  sender_id UUID REFERENCES public.admin_users(id),
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Chat conversations RLS policies
CREATE POLICY "Anyone can create chat conversations"
ON public.chat_conversations FOR INSERT
WITH CHECK (true);

CREATE POLICY "Visitors can view their own conversations"
ON public.chat_conversations FOR SELECT
USING (session_id = session_id OR is_admin(auth.uid()));

CREATE POLICY "Admins can update conversations"
ON public.chat_conversations FOR UPDATE
USING (is_admin(auth.uid()));

-- Chat messages RLS policies
CREATE POLICY "Anyone can send messages"
ON public.chat_messages FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view messages in their conversation or admins view all"
ON public.chat_messages FOR SELECT
USING (
  conversation_id IN (
    SELECT id FROM public.chat_conversations WHERE session_id = session_id
  ) OR is_admin(auth.uid())
);

CREATE POLICY "Admins can update messages"
ON public.chat_messages FOR UPDATE
USING (is_admin(auth.uid()));

-- Indexes
CREATE INDEX idx_chat_conversations_session ON public.chat_conversations(session_id);
CREATE INDEX idx_chat_conversations_status ON public.chat_conversations(status);
CREATE INDEX idx_chat_conversations_assigned ON public.chat_conversations(assigned_to);
CREATE INDEX idx_chat_messages_conversation ON public.chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_created ON public.chat_messages(created_at);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Update timestamp trigger
CREATE TRIGGER update_chat_conversations_updated_at
BEFORE UPDATE ON public.chat_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
