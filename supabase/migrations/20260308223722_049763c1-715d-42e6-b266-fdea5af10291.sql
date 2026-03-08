ALTER TABLE public.school_chat_knowledge 
ADD COLUMN content_type text NOT NULL DEFAULT 'text',
ADD COLUMN document_url text,
ADD COLUMN document_name text,
ADD COLUMN document_size integer;