import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface AdminConversation {
  id: string;
  contact_id: string;
  instance_id: string;
  assigned_to: string | null;
  status: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number | null;
  created_at: string;
  contact: {
    id: string;
    name: string;
    phone_number: string;
    profile_picture_url: string | null;
  } | null;
  instance: {
    id: string;
    name: string;
    status: string | null;
  } | null;
  assigned_agent: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    status: string | null;
  } | null;
}

interface AdminConversationsFilters {
  status?: string;
  instanceId?: string;
  agentId?: string;
  search?: string;
}

export const useAdminConversations = (filters?: AdminConversationsFilters) => {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'conversations', filters],
    queryFn: async () => {
      let query = supabase
        .from('whatsapp_conversations')
        .select(`
          *,
          contact:whatsapp_contacts(id, name, phone_number, profile_picture_url),
          instance:whatsapp_instances(id, name, status),
          assigned_agent:profiles!whatsapp_conversations_assigned_to_fkey(id, full_name, avatar_url, status)
        `)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters?.instanceId) {
        query = query.eq('instance_id', filters.instanceId);
      }

      if (filters?.agentId) {
        if (filters.agentId === 'unassigned') {
          query = query.is('assigned_to', null);
        } else {
          query = query.eq('assigned_to', filters.agentId);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      let conversations = data as AdminConversation[];

      // Apply search filter client-side
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        conversations = conversations.filter(conv => 
          conv.contact?.name?.toLowerCase().includes(searchLower) ||
          conv.contact?.phone_number?.includes(searchLower) ||
          conv.last_message_preview?.toLowerCase().includes(searchLower)
        );
      }

      return conversations;
    },
  });

  // Real-time subscription for conversation updates
  useEffect(() => {
    const channel = supabase
      .channel('admin-conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_conversations',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin', 'conversations'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_messages',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin', 'conversations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Calculate statistics
  const stats = {
    total: data?.length ?? 0,
    active: data?.filter(c => c.status === 'active').length ?? 0,
    waiting: data?.filter(c => c.status === 'waiting').length ?? 0,
    unassigned: data?.filter(c => !c.assigned_to).length ?? 0,
    withUnread: data?.filter(c => (c.unread_count ?? 0) > 0).length ?? 0,
  };

  return {
    conversations: data ?? [],
    isLoading,
    error,
    refetch,
    stats,
  };
};
