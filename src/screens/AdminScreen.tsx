import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Users, BookOpen, CalendarDays, Shield, FileText, Pencil, Settings2, Ban, UserX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

// Fetch the school of the currently authenticated admin so we can scope all
// admin queries/mutations to that school only.
const useAdminSchool = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['admin-school', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('school')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data?.school ?? null;
    },
    enabled: !!user?.id,
  });
};
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

type Tab = 'clubs' | 'events' | 'posts' | 'users';

const AdminScreen = () => {
  const [activeTab, setActiveTab] = useState<Tab>('clubs');
  const queryClient = useQueryClient();
  const { isAdmin, loading: adminLoading } = useAdmin();

  if (adminLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">Verificando permissões...</div>;
  }
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center gap-3">
        <Shield className="w-10 h-10 text-destructive" />
        <h1 className="text-lg font-bold text-foreground">Acesso restrito</h1>
        <p className="text-sm text-muted-foreground">Apenas administradores podem acessar este painel.</p>
        <Link to="/profile" className="text-primary text-sm font-semibold hover:underline">Voltar ao perfil</Link>
      </div>
    );
  }

  const tabs = [
    { key: 'clubs' as const, label: 'Clubes', icon: BookOpen },
    { key: 'events' as const, label: 'Eventos', icon: CalendarDays },
    { key: 'posts' as const, label: 'Posts', icon: FileText },
    { key: 'users' as const, label: 'Usuários', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-primary text-primary-foreground py-4 px-6 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link to="/profile" className="hover:opacity-80 transition-opacity">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Shield className="w-5 h-5" />
          <h1 className="text-xl font-extrabold tracking-tight">Painel Admin</h1>
        </div>
      </header>

      <div className="flex border-b border-border bg-card sticky top-[57px] z-10">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3 text-xs font-bold text-center transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
              activeTab === tab.key
                ? 'text-accent border-accent'
                : 'text-muted-foreground border-transparent hover:text-foreground'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      <main className="max-w-lg mx-auto p-4">
        {activeTab === 'clubs' && <AdminClubs />}
        {activeTab === 'events' && <AdminEvents />}
        {activeTab === 'posts' && <AdminPosts />}
        {activeTab === 'users' && <AdminUsers />}
      </main>
    </div>
  );
};

const AdminClubs = () => {
  const queryClient = useQueryClient();
  const { data: adminSchool } = useAdminSchool();
  const { data: clubs, isLoading } = useQuery({
    queryKey: ['admin-clubs', adminSchool],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .eq('school', adminSchool!)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!adminSchool,
  });
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('BookOpen');

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIcon, setEditIcon] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) return;
    const { error } = await supabase.from('clubs').insert({ name, description, icon });
    if (error) { toast.error('Erro ao criar clube'); return; }
    toast.success('Clube criado!');
    setOpen(false);
    setName(''); setDescription(''); setIcon('BookOpen');
    queryClient.invalidateQueries({ queryKey: ['admin-clubs'] }); queryClient.invalidateQueries({ queryKey: ['clubs'] });
  };

  const openEdit = (club: any) => {
    setEditId(club.id);
    setEditName(club.name);
    setEditDescription(club.description || '');
    setEditIcon(club.icon || 'BookOpen');
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editId || !editName.trim()) return;
    const { error } = await supabase.from('clubs').update({
      name: editName,
      description: editDescription,
      icon: editIcon,
    }).eq('id', editId);
    if (error) { toast.error('Erro ao atualizar clube'); return; }
    toast.success('Clube atualizado!');
    setEditOpen(false);
    setEditId(null);
    queryClient.invalidateQueries({ queryKey: ['admin-clubs'] }); queryClient.invalidateQueries({ queryKey: ['clubs'] });
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('clubs').delete().eq('id', id);
    if (error) { toast.error('Erro ao deletar clube'); return; }
    toast.success('Clube deletado');
    queryClient.invalidateQueries({ queryKey: ['admin-clubs'] }); queryClient.invalidateQueries({ queryKey: ['clubs'] });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground">Clubes ({(clubs || []).length})</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" /> Novo Clube</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar Clube</DialogTitle></DialogHeader>
            <div className="flex flex-col gap-3">
              <Input placeholder="Nome do clube" value={name} onChange={e => setName(e.target.value)} />
              <Input placeholder="Descrição" value={description} onChange={e => setDescription(e.target.value)} />
              <Input placeholder="Ícone (ex: BookOpen, Code, Music)" value={icon} onChange={e => setIcon(e.target.value)} />
              <Button onClick={handleCreate}>Criar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Clube</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-3">
            <Input placeholder="Nome do clube" value={editName} onChange={e => setEditName(e.target.value)} />
            <Input placeholder="Descrição" value={editDescription} onChange={e => setEditDescription(e.target.value)} />
            <Input placeholder="Ícone (ex: BookOpen, Code, Music)" value={editIcon} onChange={e => setEditIcon(e.target.value)} />
            <Button onClick={handleUpdate}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : (
        (clubs || []).map((club, i) => (
          <motion.div
            key={club.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="bg-card rounded-[var(--radius)] p-3 flex items-center justify-between"
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground">{club.name}</p>
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{club.description}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => openEdit(club)} className="text-accent hover:bg-accent/10 p-2 rounded-lg transition-colors">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(club.id)} className="text-destructive hover:bg-destructive/10 p-2 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
};

const AdminEvents = () => {
  const queryClient = useQueryClient();
  const { data: adminSchool } = useAdminSchool();
  const { data: clubs } = useQuery({
    queryKey: ['admin-clubs', adminSchool],
    queryFn: async () => {
      const { data, error } = await supabase.from('clubs').select('*').eq('school', adminSchool!).order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!adminSchool,
  });
  const { data: events, isLoading } = useQuery({
    queryKey: ['admin-events', adminSchool],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*, clubs!inner(name, icon, school)')
        .eq('clubs.school', adminSchool!)
        .order('date');
      if (error) throw error;
      return data;
    },
    enabled: !!adminSchool,
  });
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [clubId, setClubId] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editClubId, setEditClubId] = useState('');

  const handleCreate = async () => {
    if (!title.trim() || !clubId || !date || !time || !location) { toast.error('Preencha todos os campos'); return; }
    const { error } = await supabase.from('events').insert({ title, description, date, time, location, club_id: clubId });
    if (error) { toast.error('Erro ao criar evento'); return; }
    toast.success('Evento criado!');
    setOpen(false);
    setTitle(''); setDescription(''); setDate(''); setTime(''); setLocation(''); setClubId('');
    queryClient.invalidateQueries({ queryKey: ['admin-events'] }); queryClient.invalidateQueries({ queryKey: ['events'] });
  };

  const openEdit = (event: any) => {
    setEditId(event.id);
    setEditTitle(event.title);
    setEditDescription(event.description || '');
    setEditDate(event.date || '');
    setEditTime(event.time || '');
    setEditLocation(event.location || '');
    setEditClubId(event.club_id || '');
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editId || !editTitle.trim() || !editClubId || !editDate || !editTime || !editLocation) {
      toast.error('Preencha todos os campos'); return;
    }
    const { error } = await supabase.from('events').update({
      title: editTitle,
      description: editDescription,
      date: editDate,
      time: editTime,
      location: editLocation,
      club_id: editClubId,
    }).eq('id', editId);
    if (error) { toast.error('Erro ao atualizar evento'); return; }
    toast.success('Evento atualizado!');
    setEditOpen(false);
    setEditId(null);
    queryClient.invalidateQueries({ queryKey: ['admin-events'] }); queryClient.invalidateQueries({ queryKey: ['events'] });
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) { toast.error('Erro ao deletar evento'); return; }
    toast.success('Evento deletado');
    queryClient.invalidateQueries({ queryKey: ['admin-events'] }); queryClient.invalidateQueries({ queryKey: ['events'] });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground">Eventos ({(events || []).length})</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" /> Novo Evento</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar Evento</DialogTitle></DialogHeader>
            <div className="flex flex-col gap-3">
              <Input placeholder="Título" value={title} onChange={e => setTitle(e.target.value)} />
              <Input placeholder="Descrição" value={description} onChange={e => setDescription(e.target.value)} />
              <select
                value={clubId}
                onChange={e => setClubId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Selecione um clube</option>
                {(clubs || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              <Input placeholder="Horário (ex: 14:00)" value={time} onChange={e => setTime(e.target.value)} />
              <Input placeholder="Local" value={location} onChange={e => setLocation(e.target.value)} />
              <Button onClick={handleCreate}>Criar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Evento</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-3">
            <Input placeholder="Título" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
            <Input placeholder="Descrição" value={editDescription} onChange={e => setEditDescription(e.target.value)} />
            <select
              value={editClubId}
              onChange={e => setEditClubId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Selecione um clube</option>
              {(clubs || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
            <Input placeholder="Horário (ex: 14:00)" value={editTime} onChange={e => setEditTime(e.target.value)} />
            <Input placeholder="Local" value={editLocation} onChange={e => setEditLocation(e.target.value)} />
            <Button onClick={handleUpdate}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : (
        (events || []).map((event, i) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="bg-card rounded-[var(--radius)] p-3 flex items-center justify-between"
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground">{event.title}</p>
              <p className="text-xs text-muted-foreground">{event.date} • {event.location}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => openEdit(event)} className="text-accent hover:bg-accent/10 p-2 rounded-lg transition-colors">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(event.id)} className="text-destructive hover:bg-destructive/10 p-2 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
};

const AdminPosts = () => {
  const queryClient = useQueryClient();
  const { data: adminSchool } = useAdminSchool();
  const { data: posts, isLoading } = useQuery({
    queryKey: ['admin-posts', adminSchool],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*, profiles!posts_author_id_fkey(name, username, avatar), clubs!inner(name, school)')
        .eq('clubs.school', adminSchool!)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!adminSchool,
  });

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('posts').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error('Erro ao deletar post'); return; }
    toast.success('Post deletado');
    queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
    queryClient.invalidateQueries({ queryKey: ['posts'] });
  };

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-bold text-foreground">Posts ({(posts || []).length})</h2>
      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : (
        (posts || []).map((post, i) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="bg-card rounded-[var(--radius)] p-3 flex items-center justify-between"
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">{post.profiles?.name || 'Anônimo'}</p>
              <p className="text-xs text-muted-foreground truncate">{post.content}</p>
            </div>
            <button onClick={() => handleDelete(post.id)} className="text-destructive hover:bg-destructive/10 p-2 rounded-lg transition-colors shrink-0">
              <Trash2 className="w-4 h-4" />
            </button>
          </motion.div>
        ))
      )}
    </div>
  );
};

const AdminUsers = () => {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const { isAdmin } = useAdmin();

  const [manageOpen, setManageOpen] = useState(false);
  const [manageTarget, setManageTarget] = useState<{ user_id: string; name: string } | null>(null);
  const [action, setAction] = useState<'suspend' | 'delete'>('suspend');
  const [submitting, setSubmitting] = useState(false);

  const { data: adminSchool } = useAdminSchool();
  const { data: profiles, isLoading } = useQuery({
    queryKey: ['admin-profiles', adminSchool],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('school', adminSchool!)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!adminSchool,
  });

  const { data: roles } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles').select('*');
      if (error) throw error;
      return data;
    },
  });

  const toggleAdmin = async (userId: string, currentlyAdmin: boolean) => {
    if (!userId) return;
    if (currentlyAdmin) {
      const { error } = await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', 'admin');
      if (error) { toast.error('Erro ao remover admin'); return; }
      toast.success('Admin removido');
    } else {
      const { error } = await supabase.from('user_roles').insert({ user_id: userId, role: 'admin' });
      if (error) { toast.error('Erro ao promover admin'); return; }
      toast.success('Promovido a admin!');
    }
    queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
  };

  const isUserAdmin = (userId: string | null) =>
    !!userId && (roles || []).some(r => r.user_id === userId && r.role === 'admin');

  const openManage = (profile: any) => {
    if (!profile.user_id) { toast.error('Usuário sem conta vinculada.'); return; }
    setManageTarget({ user_id: profile.user_id, name: profile.name });
    setAction('suspend');
    setManageOpen(true);
  };

  const confirmManage = async () => {
    if (!manageTarget) return;
    if (manageTarget.user_id === currentUser?.id) {
      toast.error('Você não pode realizar essa ação na sua própria conta.');
      return;
    }
    setSubmitting(true);
    try {
      if (action === 'suspend') {
        const { error } = await supabase.rpc('ban_user_by_admin' as any, { target_user_id: manageTarget.user_id });
        if (error) throw error;
        toast.success(`${manageTarget.name} foi suspenso temporariamente.`);
      } else {
        const { error } = await supabase.rpc('delete_user_by_admin' as any, { target_user_id: manageTarget.user_id });
        if (error) throw error;
        toast.success(`${manageTarget.name} foi excluído permanentemente.`);
      }
      setManageOpen(false);
      setManageTarget(null);
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao executar ação');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-bold text-foreground">Usuários ({(profiles || []).length})</h2>
      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : (
        (profiles || []).map((profile, i) => {
          const admin = isUserAdmin(profile.user_id);
          const isSelf = profile.user_id === currentUser?.id;
          return (
            <motion.div
              key={profile.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-card rounded-[var(--radius)] p-3 flex items-center gap-2"
              style={{ boxShadow: 'var(--shadow-card)' }}
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                {profile.avatar ? (
                  <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-primary">{profile.name.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{profile.name}</p>
                <p className="text-xs text-muted-foreground truncate">@{profile.username}</p>
              </div>
              {admin && (
                <span className="text-[10px] font-bold bg-accent/10 text-accent px-2 py-0.5 rounded-full">ADMIN</span>
              )}
              <button
                onClick={() => toggleAdmin(profile.user_id, admin)}
                disabled={!profile.user_id}
                className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors ${
                  admin
                    ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                    : 'bg-accent/10 text-accent hover:bg-accent/20'
                }`}
              >
                {admin ? 'Remover' : 'Promover'}
              </button>
              <button
                onClick={() => openManage(profile)}
                disabled={!profile.user_id || isSelf}
                title={isSelf ? 'Você não pode gerenciar sua própria conta' : 'Gerenciar conta'}
                className="text-muted-foreground hover:text-foreground hover:bg-muted p-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Settings2 className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })
      )}

      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerenciar conta</DialogTitle>
            <DialogDescription>
              Escolha uma ação para <span className="font-semibold text-foreground">{manageTarget?.name}</span>. Esta operação afeta o acesso da conta.
            </DialogDescription>
          </DialogHeader>

          <RadioGroup value={action} onValueChange={(v) => setAction(v as 'suspend' | 'delete')} className="gap-3 py-2">
            <label htmlFor="opt-suspend" className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/50">
              <RadioGroupItem value="suspend" id="opt-suspend" className="mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <Ban className="w-4 h-4 text-yellow-600" /> Suspensão Temporária
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Bloqueia o acesso do usuário, mas mantém todos os dados. Pode ser revertida depois.
                </p>
              </div>
            </label>

            <label htmlFor="opt-delete" className="flex items-start gap-3 rounded-lg border border-destructive/40 p-3 cursor-pointer hover:bg-destructive/5">
              <RadioGroupItem value="delete" id="opt-delete" className="mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm font-bold text-destructive">
                  <UserX className="w-4 h-4" /> Exclusão Permanente
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Remove definitivamente o usuário, seu perfil e suas permissões. Esta ação não pode ser desfeita.
                </p>
              </div>
            </label>
          </RadioGroup>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setManageOpen(false)} disabled={submitting}>Cancelar</Button>
            <Button
              variant={action === 'delete' ? 'destructive' : 'default'}
              onClick={confirmManage}
              disabled={submitting}
            >
              {submitting ? 'Processando...' : action === 'delete' ? 'Excluir permanentemente' : 'Suspender conta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminScreen;
