ALTER TABLE public.inbox_messages ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_inbox_messages_archived_at ON public.inbox_messages(user_id, archived_at);