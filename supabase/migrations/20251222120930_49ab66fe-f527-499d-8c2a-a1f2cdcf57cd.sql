-- 1. Corrigir política recursiva de user_sectors
-- A política atual referencia user_sectors dentro de user_sectors, causando recursão infinita

DROP POLICY IF EXISTS "Users can view sector members" ON public.user_sectors;

CREATE POLICY "Users can view sector members"
ON public.user_sectors
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND (
    user_id = auth.uid() 
    OR user_belongs_to_sector(auth.uid(), sector_id)
  )
);

-- 2. Corrigir RLS de leads para que agents vejam apenas seus próprios leads
-- Atualmente permite visualizar leads assigned_to = null, o que expõe leads não atribuídos

DROP POLICY IF EXISTS "Agents can view and update assigned leads" ON public.leads;

CREATE POLICY "Agents can view assigned leads or unassigned"
ON public.leads
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'supervisor'::app_role) 
    OR assigned_to = auth.uid()
  )
);

-- 3. Adicionar coluna sector_id na tabela leads para permitir filtro por setor (opcional para admin)
-- Essa coluna será usada para relacionar leads com setores

ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS sector_id uuid REFERENCES public.sectors(id) ON DELETE SET NULL;