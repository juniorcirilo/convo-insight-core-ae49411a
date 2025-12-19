-- Add pipeline_insight field to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS pipeline_insight jsonb DEFAULT '{}'::jsonb;

-- Add negotiation status if not exists (for Kanban compatibility)
-- The lead_status enum already has: new, contacted, qualified, proposal, negotiation, won, lost

-- Create lead_status_history table for tracking movements
CREATE TABLE IF NOT EXISTS public.lead_status_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    old_status text,
    new_status text NOT NULL,
    changed_by uuid REFERENCES public.profiles(id),
    reason text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on lead_status_history
ALTER TABLE public.lead_status_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for lead_status_history
CREATE POLICY "Admins and supervisors can view all history"
ON public.lead_status_history
FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'supervisor'));

CREATE POLICY "Agents can view history of assigned leads"
ON public.lead_status_history
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.leads 
        WHERE leads.id = lead_status_history.lead_id 
        AND (leads.assigned_to = auth.uid() OR leads.assigned_to IS NULL)
    )
);

CREATE POLICY "Users can insert history"
ON public.lead_status_history
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_lead_status_history_lead_id ON public.lead_status_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_status_history_created_at ON public.lead_status_history(created_at DESC);