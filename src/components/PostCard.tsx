import { Heart, Share2, MoreVertical, Flag, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import CommentsSection from '@/components/CommentsSection';
import ProfileAvatar from '@/components/ProfileAvatar';
import ReportDialog from '@/components/ReportDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface PostDisplay {
  id: string;
  authorId?: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string;
  clubName: string;
  content: string;
  imageUrl?: string;
  likesCount: number;
  commentsCount: number;
  isLiked?: boolean;
  createdAt: string;
}

const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2);

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
};

const PostCard = ({ post, index }: { post: PostDisplay; index: number }) => {
  const { profileId } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(post.likesCount);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (!profileId) return;
    supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', post.id)
      .eq('profile_id', profileId)
      .maybeSingle()
      .then(({ data }) => setLiked(!!data));
  }, [post.id, profileId]);

  const toggleLike = async () => {
    if (!profileId || toggling) return;
    setToggling(true);
    if (liked) {
      await supabase.from('post_likes').delete().eq('post_id', post.id).eq('profile_id', profileId);
      setLiked(false);
      setLikes(prev => Math.max(0, prev - 1));
    } else {
      await supabase.from('post_likes').insert({ post_id: post.id, profile_id: profileId });
      setLiked(true);
      setLikes(prev => prev + 1);
    }
    setToggling(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="bg-card rounded-[var(--radius)] p-4"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <div className="flex items-center gap-3 mb-3 cursor-pointer" onClick={() => post.authorId && navigate(`/user/${post.authorId}`)}>
        <ProfileAvatar
          src={post.authorAvatar}
          alt={post.authorName}
          className="w-10 h-10 rounded-full"
          fallback={<span className="text-sm font-bold text-primary">{getInitials(post.authorName)}</span>}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground truncate">{post.authorName}</span>
            <span className="text-xs text-muted-foreground">{timeAgo(post.createdAt)}</span>
          </div>
          <span className="text-xs text-accent font-semibold">{post.clubName}</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button onClick={(e) => e.stopPropagation()} className="p-1 rounded hover:bg-muted text-muted-foreground" aria-label="Mais opções">
              <MoreVertical className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            {profileId && post.authorId === profileId ? (
              <DropdownMenuItem
                onSelect={async (e) => {
                  e.preventDefault();
                  if (!confirm('Apagar este post?')) return;

                  const refresh = () => {
                    queryClient.invalidateQueries({ queryKey: ['posts'] });
                    queryClient.invalidateQueries({ queryKey: ['posts-infinite'] });
                    queryClient.invalidateQueries({ queryKey: ['user-posts'] });
                    queryClient.invalidateQueries({ queryKey: ['profile'] });
                  };

                  const { data, error } = await supabase
                    .from('posts')
                    .update({ deleted_at: new Date().toISOString() })
                    .eq('id', post.id)
                    .select('id');

                  if (!error && data && data.length > 0) {
                    toast.success('Post apagado');
                    refresh();
                    return;
                  }

                  if (error) console.error('[PostCard] soft delete falhou:', error);

                  const { data: delData, error: delError } = await supabase
                    .from('posts')
                    .delete()
                    .eq('id', post.id)
                    .select('id');

                  if (delError) {
                    console.error('[PostCard] delete falhou:', delError);
                    toast.error(`Erro ao apagar: ${delError.message}`);
                    return;
                  }
                  if (!delData || delData.length === 0) {
                    toast.error('Você não tem permissão para apagar esta publicação.');
                    return;
                  }
                  toast.success('Post apagado');
                  refresh();
                }}

                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" /> Apagar post
              </DropdownMenuItem>
            ) : (
              <ReportDialog
                targetType="post"
                targetId={post.id}
                trigger={
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                    <Flag className="w-3.5 h-3.5 mr-2" /> Denunciar
                  </DropdownMenuItem>
                }
              />
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className="text-sm text-foreground leading-relaxed mb-3">{post.content}</p>

      <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-border">
        <button onClick={toggleLike} disabled={!profileId} className="flex items-center gap-1.5 text-sm transition-colors group">
          <Heart className={`w-4 h-4 transition-colors ${liked ? 'fill-accent text-accent' : 'text-muted-foreground group-hover:text-accent'}`} />
          <span className={liked ? 'text-accent font-semibold' : 'text-muted-foreground'}>{likes}</span>
        </button>
        <CommentsSection postId={post.id} initialCount={post.commentsCount} onCountChange={setCommentsCount} />
        <button
          onClick={async () => {
            const url = `${window.location.origin}/?post=${post.id}`;
            try {
              await navigator.clipboard.writeText(url);
              toast.success('Link copiado!');
            } catch {
              toast(url, { description: 'Copie o link manualmente' });
            }
          }}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors ml-auto"
          aria-label="Compartilhar"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

export default PostCard;
