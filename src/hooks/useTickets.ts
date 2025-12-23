import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Ticket {
  id: string;
  conversation_id: string;
  sector_id: string;
  status: 'aberto' | 'em_atendimento' | 'finalizado';
  created_at: string;
  closed_at: string | null;
  closed_by: string | null;
}

export interface Feedback {
  id: string;
  ticket_id: string;
  nota: number;
  comentario: string | null;
  created_at: string;
}

export const useTickets = (conversationId?: string) => {
  const queryClient = useQueryClient();

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ticket', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;

      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('conversation_id', conversationId)
        .neq('status', 'finalizado')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as Ticket | null;
    },
    enabled: !!conversationId,
  });

  const createTicket = useMutation({
    mutationFn: async ({ conversationId, sectorId }: { conversationId: string; sectorId: string }) => {
      const { data, error } = await supabase
        .from('tickets')
        .insert({
          conversation_id: conversationId,
          sector_id: sectorId,
          status: 'aberto',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket'] });
      toast.success('Ticket criado');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar ticket');
    },
  });

  const updateTicketStatus = useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status: 'aberto' | 'em_atendimento' | 'finalizado' }) => {
      const updateData: any = { status };
      
      if (status === 'finalizado') {
        const { data: { user } } = await supabase.auth.getUser();
        updateData.closed_at = new Date().toISOString();
        updateData.closed_by = user?.id;
      }

      const { data, error } = await supabase
        .from('tickets')
        .update(updateData)
        .eq('id', ticketId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ticket'] });
      if (variables.status === 'finalizado') {
        toast.success('Ticket finalizado');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar ticket');
    },
  });

  const closeTicket = useMutation({
    mutationFn: async (ticketId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('tickets')
        .update({
          status: 'finalizado',
          closed_at: new Date().toISOString(),
          closed_by: user?.id,
        })
        .eq('id', ticketId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket'] });
      toast.success('Ticket finalizado com sucesso');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao finalizar ticket');
    },
  });

  const submitFeedback = useMutation({
    mutationFn: async ({ ticketId, nota, comentario }: { ticketId: string; nota: number; comentario?: string }) => {
      const { data, error } = await supabase
        .from('feedbacks')
        .insert({
          ticket_id: ticketId,
          nota,
          comentario: comentario || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Feedback enviado, obrigado!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao enviar feedback');
    },
  });

  return {
    ticket,
    isLoading,
    createTicket,
    updateTicketStatus,
    closeTicket,
    submitFeedback,
  };
};

// Hook for listing all tickets (admin view)
export const useTicketsList = (sectorId?: string, status?: string) => {
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['tickets-list', sectorId, status],
    queryFn: async () => {
      let query = supabase
        .from('tickets')
        .select(`
          *,
          whatsapp_conversations!inner(
            id,
            whatsapp_contacts!inner(name, phone_number)
          ),
          sectors!inner(name)
        `)
        .order('created_at', { ascending: false });

      if (sectorId) {
        query = query.eq('sector_id', sectorId);
      }

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return { tickets, isLoading };
};
