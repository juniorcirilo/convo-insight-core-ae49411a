-- Add new columns to sectors table for ticket support
ALTER TABLE public.sectors ADD COLUMN IF NOT EXISTS tipo_atendimento TEXT DEFAULT 'humano';
ALTER TABLE public.sectors ADD COLUMN IF NOT EXISTS gera_ticket BOOLEAN DEFAULT false;
ALTER TABLE public.sectors ADD COLUMN IF NOT EXISTS mensagem_boas_vindas TEXT;
ALTER TABLE public.sectors ADD COLUMN IF NOT EXISTS mensagem_encerramento TEXT;

-- Add check constraint for tipo_atendimento
ALTER TABLE public.sectors ADD CONSTRAINT sectors_tipo_atendimento_check 
CHECK (tipo_atendimento IN ('humano', 'chatbot'));

-- Create tickets table
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  sector_id UUID NOT NULL REFERENCES public.sectors(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'em_atendimento', 'finalizado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES public.profiles(id)
);

-- Create feedbacks table
CREATE TABLE public.feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  nota INTEGER NOT NULL CHECK (nota >= 1 AND nota <= 5),
  comentario TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add ticket_id to whatsapp_messages
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS ticket_id UUID REFERENCES public.tickets(id);

-- Enable RLS on new tables
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tickets
CREATE POLICY "Users can view tickets of accessible conversations"
ON public.tickets FOR SELECT
USING (auth.uid() IS NOT NULL AND can_access_conversation(auth.uid(), conversation_id));

CREATE POLICY "Users can insert tickets for accessible conversations"
ON public.tickets FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND can_access_conversation(auth.uid(), conversation_id));

CREATE POLICY "Users can update tickets of accessible conversations"
ON public.tickets FOR UPDATE
USING (auth.uid() IS NOT NULL AND can_access_conversation(auth.uid(), conversation_id));

-- RLS Policies for feedbacks
CREATE POLICY "Admins and supervisors can view all feedbacks"
ON public.feedbacks FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY "Anyone can insert feedback for their ticket"
ON public.feedbacks FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_id AND can_access_conversation(auth.uid(), t.conversation_id)
  )
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_tickets_conversation_id ON public.tickets(conversation_id);
CREATE INDEX IF NOT EXISTS idx_tickets_sector_id ON public.tickets(sector_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_feedbacks_ticket_id ON public.feedbacks(ticket_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_ticket_id ON public.whatsapp_messages(ticket_id);