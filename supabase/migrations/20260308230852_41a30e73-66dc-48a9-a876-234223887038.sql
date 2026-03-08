
ALTER TABLE public.school_chat_conversations 
ADD COLUMN ai_paused boolean NOT NULL DEFAULT false,
ADD COLUMN admin_last_reply_at timestamptz;

ALTER TABLE public.school_chat_messages 
ADD COLUMN sender_name text;
