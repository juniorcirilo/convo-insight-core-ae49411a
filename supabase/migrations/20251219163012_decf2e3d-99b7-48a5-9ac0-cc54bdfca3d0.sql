-- Enum for lead status
CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost');

-- Enum for lead source
CREATE TYPE lead_source AS ENUM ('whatsapp', 'website', 'referral', 'ads', 'organic', 'other');

-- Leads table
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES public.whatsapp_contacts(id),
  conversation_id UUID REFERENCES public.whatsapp_conversations(id),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  company TEXT,
  status lead_status NOT NULL DEFAULT 'new',
  source lead_source NOT NULL DEFAULT 'whatsapp',
  value DECIMAL(12,2) DEFAULT 0,
  probability INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
  expected_close_date DATE,
  assigned_to UUID REFERENCES public.profiles(id),
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

-- Lead activities/history
CREATE TABLE public.lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  activity_type TEXT NOT NULL, -- 'status_change', 'note', 'call', 'email', 'meeting', 'task'
  description TEXT,
  old_value TEXT,
  new_value TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sales targets/goals
CREATE TABLE public.sales_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id), -- null = team target
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  target_value DECIMAL(12,2) NOT NULL,
  target_leads INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_targets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leads
CREATE POLICY "Admins and supervisors can manage all leads"
ON public.leads FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'supervisor'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'supervisor'));

CREATE POLICY "Agents can view and update assigned leads"
ON public.leads FOR SELECT
USING (auth.uid() IS NOT NULL AND (assigned_to = auth.uid() OR assigned_to IS NULL));

CREATE POLICY "Agents can update their assigned leads"
ON public.leads FOR UPDATE
USING (auth.uid() IS NOT NULL AND assigned_to = auth.uid());

-- RLS Policies for lead_activities
CREATE POLICY "Users can view activities of accessible leads"
ON public.lead_activities FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create activities"
ON public.lead_activities FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for sales_targets
CREATE POLICY "Admins can manage targets"
ON public.sales_targets FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view targets"
ON public.sales_targets FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Triggers for updated_at
CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sales_targets_updated_at
BEFORE UPDATE ON public.sales_targets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for performance
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX idx_leads_created_at ON public.leads(created_at);
CREATE INDEX idx_lead_activities_lead_id ON public.lead_activities(lead_id);