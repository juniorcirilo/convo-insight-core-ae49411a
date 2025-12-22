-- Add is_internal column to whatsapp_messages
ALTER TABLE public.whatsapp_messages 
ADD COLUMN is_internal BOOLEAN NOT NULL DEFAULT false;

-- Add sent_by column to track who sent internal messages
ALTER TABLE public.whatsapp_messages 
ADD COLUMN sent_by UUID REFERENCES public.profiles(id);

-- Create index for filtering internal messages
CREATE INDEX idx_whatsapp_messages_is_internal 
ON public.whatsapp_messages(is_internal) 
WHERE is_internal = true;

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view messages of accessible conversations" ON public.whatsapp_messages;

-- Create new SELECT policy that filters internal messages based on role
CREATE POLICY "Users can view messages of accessible conversations" 
ON public.whatsapp_messages 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND can_access_conversation(auth.uid(), conversation_id)
  AND (
    -- External messages: everyone with conversation access can see
    is_internal = false
    OR
    -- Internal messages: only admins and supervisors can see
    (is_internal = true AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'supervisor')))
  )
);

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can insert messages in accessible conversations" ON public.whatsapp_messages;

-- Create new INSERT policy for internal messages
CREATE POLICY "Users can insert messages in accessible conversations" 
ON public.whatsapp_messages 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND can_access_conversation(auth.uid(), conversation_id)
  AND (
    -- External messages: any user with access can send
    is_internal = false
    OR
    -- Internal messages: only admins and supervisors can create
    (is_internal = true AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'supervisor')))
  )
);

-- Comment explaining the internal message system
COMMENT ON COLUMN public.whatsapp_messages.is_internal IS 'If true, message is an internal note visible only to admins and supervisors, not sent to WhatsApp';