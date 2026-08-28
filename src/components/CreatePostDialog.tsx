import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send } from 'lucide-react';
import { useProfileClubs, useProfile } from '@/hooks/useSupabaseData';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { containsProfanity, PROFANITY_MESSAGE } from '@/lib/profanity';
import { checkRateLimit } from "@/lib/rateLimit";

const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2);

const CreatePostDialog = () => {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [clubId, setClubId] = useState('');
  const [loading, setLoading] = useState(false);
  const { profileId } = useAuth();
  const { data: profileData } = useProfile(profileId || '');
  const { data: myClubs } = useProfileClubs(profileId || '');
  const queryClient = useQueryClient();

  const clubs = (myClubs || []).map(m => m.clubs).filter(Boolean);

  const handleSubmit = async () => {
    if (!content.trim() || !clubId || !profileId) {
      toast.error('Preencha todos os campos');
      return;
    }
    if (containsProfanity(content)) {
      toast.error(PROFANITY_MESSAGE);
      return;
    }
    setLoading(true);
    if (!(await checkRateLimit('post', profileId))) {
      setLoading(false);
      return;
    }
    const { error } = await supabase.from('posts').insert({
      content: content.trim(),
      club_id: clubId === '__all__' ? null : clubId,
      author_id: profileId,
    });
    setLoading(false);
    if (error) {
      toast.error('Erro ao publicar');
      return;
    }
    toast.success('Post publicado!');
    setContent('');
    setClubId('');
    setOpen(false);
    queryClient.invalidateQueries({ queryKey: ['posts'] });
  };

  const userName = profileData?.name || 'Usuário';

  return (
    <>
      {/* Composer trigger card */}
      <div
        onClick={() => setOpen(true)}
        className="bg-card rounded-[var(--radius)] p-4 cursor-pointer hover:shadow-md transition-shadow"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-primary">{getInitials(userName)}</span>
          </div>
          <div className="flex-1 bg-muted rounded-full px-4 py-2.5 text-sm text-muted-foreground">
            No que você está pensando?
          </div>
        </div>
      </div>

      {/* Full dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar publicação</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-primary">{getInitials(userName)}</span>
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{userName}</p>
                <Select value={clubId} onValueChange={setClubId}>
                  <SelectTrigger className="h-7 text-xs border-none bg-muted px-2 py-0 w-auto min-w-[140px]">
                    <SelectValue placeholder="Publicar em qual clube?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos (Feed Geral)</SelectItem>
                    {clubs.map((club: any) => (
                      <SelectItem key={club.id} value={club.id}>{club.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Textarea
              placeholder="Compartilhe algo com seus colegas..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="border-none bg-transparent resize-none text-base focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
              autoFocus
            />
            <div className="flex items-center justify-end pt-2 border-t border-border">
              <Button
                onClick={handleSubmit}
                disabled={loading || !content.trim() || !clubId}
                size="sm"
                className="gap-2"
              >
                <Send className="w-4 h-4" />
                {loading ? 'Publicando...' : 'Publicar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CreatePostDialog;
