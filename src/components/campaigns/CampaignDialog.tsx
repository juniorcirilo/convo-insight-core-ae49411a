import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Search } from "lucide-react";
import { useCampaigns, Campaign } from "@/hooks/campaigns/useCampaigns";
import { useWhatsAppInstances } from "@/hooks/whatsapp/useWhatsAppInstances";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  instance_id: z.string().min(1, "Selecione uma instância"),
  message_content: z.string().min(1, "Mensagem é obrigatória"),
  scheduled_at: z.string().optional(),
});

interface CampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign?: Campaign | null;
}

export const CampaignDialog = ({ open, onOpenChange, campaign }: CampaignDialogProps) => {
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  
  const { createCampaign, updateCampaign, isCreating, isUpdating } = useCampaigns();
  const { instances } = useWhatsAppInstances();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      instance_id: "",
      message_content: "",
      scheduled_at: "",
    },
  });

  const selectedInstanceId = form.watch("instance_id");

  // Fetch contacts for selected instance (only opt-in contacts)
  const { data: contacts, isLoading: contactsLoading } = useQuery({
    queryKey: ["campaign-contacts", selectedInstanceId, contactSearch],
    queryFn: async () => {
      if (!selectedInstanceId) return [];
      
      let query = supabase
        .from("whatsapp_contacts")
        .select("id, name, phone_number, opt_in, is_group")
        .eq("instance_id", selectedInstanceId)
        .eq("opt_in", true)
        .eq("is_group", false)
        .order("name");
      
      if (contactSearch) {
        query = query.or(`name.ilike.%${contactSearch}%,phone_number.ilike.%${contactSearch}%`);
      }
      
      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedInstanceId,
  });

  useEffect(() => {
    if (campaign) {
      form.reset({
        name: campaign.name,
        description: campaign.description || "",
        instance_id: campaign.instance_id,
        message_content: campaign.message_content,
        scheduled_at: campaign.scheduled_at || "",
      });
      setSelectedContacts(campaign.target_contacts as string[] || []);
    } else {
      form.reset({
        name: "",
        description: "",
        instance_id: "",
        message_content: "",
        scheduled_at: "",
      });
      setSelectedContacts([]);
    }
  }, [campaign, form]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const payload = {
      name: values.name,
      instance_id: values.instance_id,
      message_content: values.message_content,
      description: values.description,
      target_contacts: selectedContacts,
      scheduled_at: values.scheduled_at || undefined,
    };

    if (campaign) {
      updateCampaign({ id: campaign.id, ...payload });
    } else {
      createCampaign(payload);
    }
    
    onOpenChange(false);
  };

  const toggleContact = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const selectAllContacts = () => {
    if (contacts) {
      setSelectedContacts(contacts.map(c => c.id));
    }
  };

  const deselectAllContacts = () => {
    setSelectedContacts([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{campaign ? "Editar Campanha" : "Nova Campanha"}</DialogTitle>
          <DialogDescription>
            Configure os detalhes da campanha e selecione os destinatários
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Campanha</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Black Friday 2024" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="instance_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instância</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma instância" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {instances?.map((instance) => (
                          <SelectItem key={instance.id} value={instance.id}>
                            {instance.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Breve descrição da campanha" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message_content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mensagem</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Digite a mensagem que será enviada..."
                      className="min-h-[120px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    A mensagem será enviada para todos os contatos selecionados
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="scheduled_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agendar envio (opcional)</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormDescription>
                    Deixe em branco para salvar como rascunho
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Contact Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FormLabel>Destinatários</FormLabel>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    <Users className="h-3 w-3 mr-1" />
                    {selectedContacts.length} selecionados
                  </Badge>
                  <Button type="button" variant="ghost" size="sm" onClick={selectAllContacts}>
                    Todos
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={deselectAllContacts}>
                    Nenhum
                  </Button>
                </div>
              </div>

              {selectedInstanceId ? (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar contatos..."
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  <ScrollArea className="h-[200px] border rounded-md p-2">
                    {contactsLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : contacts && contacts.length > 0 ? (
                      <div className="space-y-2">
                        {contacts.map((contact) => (
                          <div
                            key={contact.id}
                            className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                            onClick={() => toggleContact(contact.id)}
                          >
                            <Checkbox 
                              checked={selectedContacts.includes(contact.id)}
                              onCheckedChange={() => toggleContact(contact.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{contact.name}</p>
                              <p className="text-sm text-muted-foreground">{contact.phone_number}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        Nenhum contato com opt-in encontrado
                      </div>
                    )}
                  </ScrollArea>
                  <p className="text-xs text-muted-foreground">
                    Apenas contatos com opt-in ativo são exibidos
                  </p>
                </>
              ) : (
                <div className="border rounded-md p-4 text-center text-muted-foreground">
                  Selecione uma instância para ver os contatos
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isCreating || isUpdating || selectedContacts.length === 0}>
                {(isCreating || isUpdating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {campaign ? "Salvar" : "Criar Campanha"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
