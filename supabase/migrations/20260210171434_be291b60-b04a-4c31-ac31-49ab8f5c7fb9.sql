
ALTER TABLE public.chat_conversations 
  ADD COLUMN IF NOT EXISTS visitor_phone TEXT,
  ADD COLUMN IF NOT EXISTS escalated_to_whatsapp BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS chat_topic TEXT;

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS is_ai_response BOOLEAN DEFAULT false;
