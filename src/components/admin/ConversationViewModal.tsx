import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MessagesContainer } from '@/components/chat/MessagesContainer';
import { useWhatsAppMessages } from '@/hooks/whatsapp/useWhatsAppMessages';
import { Loader2 } from 'lucide-react';
import { InternalNoteInput } from './InternalNoteInput';
import { useAuth } from '@/contexts/AuthContext';

interface ConversationViewModalProps {
  conversationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConversationViewModal({
  conversationId,
  open,
  onOpenChange,
}: ConversationViewModalProps) {
  const { messages, isLoading } = useWhatsAppMessages(conversationId || '');
  const { isAdmin, isSupervisor } = useAuth();
  const canSendInternalNotes = isAdmin || isSupervisor;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Visualizar Conversa</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : conversationId ? (
            <>
              <div className="flex-1 overflow-hidden">
                <MessagesContainer
                  conversationId={conversationId}
                  messages={messages}
                  isLoading={isLoading}
                />
              </div>
              {canSendInternalNotes && (
                <InternalNoteInput conversationId={conversationId} />
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Nenhuma conversa selecionada
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
