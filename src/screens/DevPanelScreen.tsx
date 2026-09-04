import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, LogOut, ArrowLeft, Terminal, Trophy, Megaphone, Flag,
  Users, BarChart3, ShieldCheck, ShieldOff, Trash2, RotateCcw, Ban, Plus,
} from "lucide-react";
import { toast } from "sonner";

type ScopeOpt = "global" | "nacional" | "estadual_pi";

export default function DevPanelScreen() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isDev, setIsDev] = useState<boolean | null>(null);
  const [tab, setTab] = useState("stats");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/dev-login", { replace: true }); return; }
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "developer").maybeSingle()
      .then(({ data }) => {
        if (!data) { toast.error("Acesso restrito a desenvolvedores."); navigate("/dev-login", { replace: true }); }
        else setIsDev(true);
      });
  }, [user, authLoading, navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/dev-login", { replace: true });
  };

  if (authLoading || isDev === null) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-semibold">Painel Desenvolvedor</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-1" /> Sair
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-3 md:grid-cols-7 w-full h-auto">
          <TabsTrigger value="stats"><BarChart3 className="w-3.5 h-3.5 mr-1" />Stats</TabsTrigger>
          <TabsTrigger value="olympiads"><Trophy className="w-3.5 h-3.5 mr-1" />Olimpíadas</TabsTrigger>
          <TabsTrigger value="users"><Users className="w-3.5 h-3.5 mr-1" />Usuários</TabsTrigger>
          <TabsTrigger value="posts"><Flag className="w-3.5 h-3.5 mr-1" />Posts</TabsTrigger>
          <TabsTrigger value="reports"><Flag className="w-3.5 h-3.5 mr-1" />Denúncias</TabsTrigger>
          <TabsTrigger value="announce"><Megaphone className="w-3.5 h-3.5 mr-1" />Anúncios</TabsTrigger>
          <TabsTrigger value="schools"><Terminal className="w-3.5 h-3.5 mr-1" />Escolas</TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="mt-4"><StatsTab /></TabsContent>
        <TabsContent value="olympiads" className="mt-4"><OlympiadsTab /></TabsContent>
        <TabsContent value="users" className="mt-4"><UsersTab /></TabsContent>
        <TabsContent value="posts" className="mt-4"><PostsTab /></TabsContent>
        <TabsContent value="reports" className="mt-4"><ReportsTab /></TabsContent>
        <TabsContent value="announce" className="mt-4"><AnnouncementsTab /></TabsContent>
        <TabsContent value="schools" className="mt-4"><SchoolsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------- STATS ---------- */
function StatsTab() {
  const { data } = useQuery({
    queryKey: ["dev-stats"],
    queryFn: async () => {
      const [users, posts, events, schools, clubs, reports] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("posts").select("id", { count: "exact", head: true }).is("deleted_at", null),
        supabase.from("events").select("id", { count: "exact", head: true }),
        supabase.from("schools").select("id", { count: "exact", head: true }),
        supabase.from("clubs").select("id", { count: "exact", head: true }),
        supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      return {
        users: users.count ?? 0, posts: posts.count ?? 0, events: events.count ?? 0,
        schools: schools.count ?? 0, clubs: clubs.count ?? 0, reports: reports.count ?? 0,
      };
    },
  });

  const items = [
    { label: "Usuários", value: data?.users, icon: Users },
    { label: "Posts", value: data?.posts, icon: Flag },
    { label: "Eventos", value: data?.events, icon: Trophy },
    { label: "Escolas ativas", value: data?.schools, icon: Terminal },
    { label: "Clubes", value: data?.clubs, icon: ShieldCheck },
    { label: "Denúncias pendentes", value: data?.reports, icon: Flag },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {items.map(({ label, value, icon: Icon }) => (
        <Card key={label}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{value ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ---------- OLYMPIADS ---------- */
function OlympiadsTab() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["dev-olympiads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competitions").select("*").neq("scope", "local").order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<"open" | "closed">("open");
  const [scope, setScope] = useState<ScopeOpt>("nacional");

  const reset = () => { setEditing(null); setName(""); setDescription(""); setDate(""); setLocation(""); setStatus("open"); setScope("nacional"); };

  const openCreate = () => { reset(); setOpen(true); };
  const openEdit = (c: any) => {
    setEditing(c);
    setName(c.name ?? "");
    setDescription(c.description ?? "");
    setDate(c.date ? String(c.date).slice(0, 10) : "");
    setLocation(c.location ?? "");
    setStatus((c.status as "open" | "closed") ?? "open");
    setScope((c.scope as ScopeOpt) ?? "nacional");
    setOpen(true);
  };

  const submit = async () => {
    if (!name.trim() || !date) { toast.error("Preencha nome e data"); return; }
    if (editing) {
      const { error } = await supabase.from("competitions").update({
        name, description, date, location: location || "Online", status, scope,
      } as any).eq("id", editing.id);
      if (error) { toast.error("Erro: " + error.message); return; }
      toast.success("Olimpíada atualizada!");
    } else {
      const { error } = await supabase.from("competitions").insert({
        name, description, date, time: "", location: location || "Online", status, scope,
      } as any);
      if (error) { toast.error("Erro: " + error.message); return; }
      toast.success("Olimpíada cadastrada para todas as escolas!");
    }
    setOpen(false); reset();
    qc.invalidateQueries({ queryKey: ["dev-olympiads"] });
    qc.invalidateQueries({ queryKey: ["competitions"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta olimpíada?")) return;
    const { error } = await supabase.from("competitions").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir");
    else { toast.success("Excluída"); qc.invalidateQueries({ queryKey: ["dev-olympiads"] }); qc.invalidateQueries({ queryKey: ["competitions"] }); }
  };

  const toggleStatus = async (id: string, current: string) => {
    const next = current === "open" ? "closed" : "open";
    const { error } = await supabase.from("competitions").update({ status: next }).eq("id", id);
    if (error) toast.error("Erro");
    else { qc.invalidateQueries({ queryKey: ["dev-olympiads"] }); qc.invalidateQueries({ queryKey: ["competitions"] }); }
  };

  const scopeBadge = (s: string) =>
    s === "global" ? "Global" : s === "nacional" ? "Nacional" : s === "estadual_pi" ? "Estadual — Piauí" : s;

  return (
    <div>
      <Button className="mb-3" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Nova olimpíada</Button>
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar Olimpíada" : "Cadastrar Olimpíada Global"}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-3">
            <Input placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
            <Textarea placeholder="Descrição" value={description} onChange={(e) => setDescription(e.target.value)} />
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <Input placeholder="Local (ou Online)" value={location} onChange={(e) => setLocation(e.target.value)} />
            <Select value={status} onValueChange={(v: any) => setStatus(v)}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Inscrições abertas</SelectItem>
                <SelectItem value="closed">Inscrições encerradas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={scope} onValueChange={(v: any) => setScope(v)}>
              <SelectTrigger><SelectValue placeholder="Escopo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nacional">Nacional</SelectItem>
                <SelectItem value="global">Global</SelectItem>
                <SelectItem value="estadual_pi">Estadual — Piauí</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={submit}>{editing ? "Salvar alterações" : "Cadastrar"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-2">
        {(data ?? []).map((c: any) => (
          <Card key={c.id}>
            <CardContent className="p-3 flex justify-between items-center gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm">{c.name}</p>
                  <Badge variant="outline" className="text-[10px]">{scopeBadge(c.scope)}</Badge>
                  <Badge variant={c.status === "open" ? "default" : "secondary"} className="text-[10px]">{c.status === "open" ? "Abertas" : "Encerradas"}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{new Date(c.date).toLocaleDateString("pt-BR")} · {c.location}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" onClick={() => openEdit(c)}>Editar</Button>
                <Button size="sm" variant="outline" onClick={() => toggleStatus(c.id, c.status)}>{c.status === "open" ? "Encerrar" : "Reabrir"}</Button>
                <Button size="sm" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {(data ?? []).length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhuma olimpíada global ainda.</p>}
      </div>
    </div>
  );
}


/* ---------- USERS ---------- */
function UsersTab() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [schoolFilter, setSchoolFilter] = useState<string>("all");

  const { data: schools } = useQuery({
    queryKey: ["dev-schools-list"],
    queryFn: async () => (await supabase.from("schools").select("name").order("name")).data ?? [],
  });

  const { data: users } = useQuery({
    queryKey: ["dev-users-all"],
    queryFn: async () => (await supabase.from("profiles").select("*").order("name")).data ?? [],
  });

  const { data: roles } = useQuery({
    queryKey: ["dev-roles-all"],
    queryFn: async () => (await supabase.from("user_roles").select("user_id, role")).data ?? [],
  });

  const adminSet = useMemo(() => new Set((roles ?? []).filter(r => r.role === "admin").map(r => r.user_id)), [roles]);

  const filtered = useMemo(() => {
    const term = q.toLowerCase().trim();
    return (users ?? []).filter((u: any) => {
      if (schoolFilter !== "all" && u.school !== schoolFilter) return false;
      if (!term) return true;
      return (u.name?.toLowerCase().includes(term) || u.username?.toLowerCase().includes(term));
    });
  }, [users, q, schoolFilter]);

  const refresh = () => { qc.invalidateQueries({ queryKey: ["dev-users-all"] }); qc.invalidateQueries({ queryKey: ["dev-roles-all"] }); };

  const restore = async (uid: string) => {
    const { error } = await supabase.rpc("restore_user_by_dev", { target_user_id: uid });
    if (error) toast.error(error.message); else { toast.success("Conta restaurada"); refresh(); }
  };
  const hardDelete = async (uid: string) => {
    if (!confirm("DELETAR PERMANENTEMENTE este usuário? Esta ação é irreversível.")) return;
    const { error } = await supabase.rpc("hard_delete_user_by_dev", { target_user_id: uid });
    if (error) toast.error(error.message); else { toast.success("Usuário excluído permanentemente"); refresh(); }
  };
  const tempBan = async (uid: string) => {
    const dStr = prompt("Banir por quantos dias?");
    if (!dStr) return;
    const days = parseInt(dStr, 10);
    if (!days || days < 1) { toast.error("Número inválido"); return; }
    const { error } = await supabase.rpc("ban_user_temp_by_dev", { target_user_id: uid, days });
    if (error) toast.error(error.message); else { toast.success(`Usuário banido por ${days} dia(s)`); refresh(); }
  };
  const toggleAdmin = async (uid: string, isAdmin: boolean) => {
    const { error } = await supabase.rpc("set_admin_role_by_dev", { target_user_id: uid, make_admin: !isAdmin });
    if (error) toast.error(error.message); else { toast.success(isAdmin ? "Cargo de admin removido" : "Usuário promovido a admin"); refresh(); }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar usuário..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={schoolFilter} onValueChange={setSchoolFilter}>
          <SelectTrigger className="md:w-72"><SelectValue placeholder="Escola" /></SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="all">Todas as escolas</SelectItem>
            {(schools ?? []).map((s: any) => <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="h-[60vh] rounded-md border">
        <div className="p-2 space-y-2">
          {filtered.map((u: any) => {
            const isAdmin = adminSet.has(u.user_id);
            const isDeleted = !!u.deleted_at;
            return (
              <Card key={u.id} className={isDeleted ? "opacity-60" : ""}>
                <CardContent className="p-3 flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{u.name}</p>
                      {isAdmin && <Badge variant="default" className="text-[10px]">Admin</Badge>}
                      {u.developer && <Badge className="text-[10px] bg-primary">Dev</Badge>}
                      {isDeleted && <Badge variant="destructive" className="text-[10px]">Deletado</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">@{u.username} · {u.school}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {isDeleted ? (
                      <Button size="sm" variant="outline" onClick={() => restore(u.user_id)}>
                        <RotateCcw className="w-3.5 h-3.5 mr-1" />Restaurar
                      </Button>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" onClick={() => toggleAdmin(u.user_id, isAdmin)}>
                          {isAdmin ? <><ShieldOff className="w-3.5 h-3.5 mr-1" />Rebaixar</> : <><ShieldCheck className="w-3.5 h-3.5 mr-1" />Promover</>}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => tempBan(u.user_id)}>
                          <Ban className="w-3.5 h-3.5 mr-1" />Banir
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => hardDelete(u.user_id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {!filtered.length && <p className="text-sm text-muted-foreground text-center py-8">Nenhum usuário encontrado.</p>}
        </div>
      </ScrollArea>
    </div>
  );
}

/* ---------- POSTS ---------- */
function PostsTab() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["dev-posts-all"],
    queryFn: async () => (await supabase
      .from("posts")
      .select("*, profiles!posts_author_id_fkey(name, username), clubs!posts_club_id_fkey(name, school)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(200)).data ?? [],
  });

  const del = async (id: string) => {
    if (!confirm("Excluir este post?")) return;
    const { error } = await supabase.from("posts").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Post excluído"); qc.invalidateQueries({ queryKey: ["dev-posts-all"] }); }
  };

  return (
    <ScrollArea className="h-[65vh] rounded-md border">
      <div className="p-2 space-y-2">
        {(data ?? []).map((p: any) => (
          <Card key={p.id}>
            <CardContent className="p-3">
              <div className="flex justify-between gap-2">
                <p className="text-xs text-muted-foreground">@{p.profiles?.username} · {p.clubs?.name}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{p.clubs?.school}</Badge>
                  <Button size="sm" variant="ghost" onClick={() => del(p.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </div>
              <p className="text-sm mt-1">{p.content}</p>
            </CardContent>
          </Card>
        ))}
        {!(data ?? []).length && <p className="text-sm text-muted-foreground text-center py-8">Sem posts.</p>}
      </div>
    </ScrollArea>
  );
}

/* ---------- REPORTS ---------- */
function ReportsTab() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  const { data } = useQuery({
    queryKey: ["dev-reports", filter],
    queryFn: async () => {
      let q = supabase.from("reports").select("*").order("created_at", { ascending: false });
      if (filter === "pending") q = q.eq("status", "pending");
      const { data, error } = await q;
      if (error) throw error;
      const reports = data ?? [];

      const postIds = reports.filter((r: any) => r.target_type === "post").map((r: any) => r.target_id);
      const msgIds = reports.filter((r: any) => r.target_type === "message").map((r: any) => r.target_id);

      const [postsRes, dmsRes, chatRes] = await Promise.all([
        postIds.length
          ? supabase.from("posts").select("id, content, profiles!posts_author_id_fkey(name, username)").in("id", postIds)
          : Promise.resolve({ data: [] as any[] }),
        msgIds.length
          ? supabase.from("direct_messages").select("id, content, sender:profiles!direct_messages_sender_id_fkey(name, username)").in("id", msgIds)
          : Promise.resolve({ data: [] as any[] }),
        msgIds.length
          ? supabase.from("chat_messages").select("id, content, profiles!chat_messages_sender_id_fkey(name, username)").in("id", msgIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const postMap = new Map<string, any>((postsRes.data ?? []).map((p: any) => [p.id, p]));
      const dmMap = new Map<string, any>((dmsRes.data ?? []).map((m: any) => [m.id, m]));
      const chatMap = new Map<string, any>((chatRes.data ?? []).map((m: any) => [m.id, m]));

      return reports.map((r: any) => {
        let content: string | null = null;
        let authorName: string | null = null;
        let authorUsername: string | null = null;
        if (r.target_type === "post") {
          const p = postMap.get(r.target_id);
          if (p) {
            content = p.content;
            authorName = p.profiles?.name ?? null;
            authorUsername = p.profiles?.username ?? null;
          }
        } else {
          const m = dmMap.get(r.target_id) || chatMap.get(r.target_id);
          if (m) {
            content = m.content;
            const prof = m.sender ?? m.profiles;
            authorName = prof?.name ?? null;
            authorUsername = prof?.username ?? null;
          }
        }
        return { ...r, _content: content, _authorName: authorName, _authorUsername: authorUsername };
      });
    },
  });

  const resolve = async (id: string, status: "resolved" | "ignored") => {
    const { error } = await supabase.from("reports").update({
      status, resolved_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(status === "resolved" ? "Resolvida" : "Ignorada"); qc.invalidateQueries({ queryKey: ["dev-reports"] }); }
  };

  const deleteTarget = async (r: any) => {
    if (!confirm(`Excluir ${r.target_type === "post" ? "post" : "mensagem"} denunciado(a)?`)) return;
    if (r.target_type === "post") {
      const { error } = await supabase.from("posts").update({ deleted_at: new Date().toISOString() }).eq("id", r.target_id);
      if (error) { toast.error(error.message); return; }
    } else {
      // tenta DM, depois chat de clube
      const { error: e1 } = await supabase.from("direct_messages").delete().eq("id", r.target_id);
      if (e1) {
        const { error: e2 } = await supabase.from("chat_messages").delete().eq("id", r.target_id);
        if (e2) { toast.error(e2.message); return; }
      }
    }
    await resolve(r.id, "resolved");
  };

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <Button variant={filter === "pending" ? "default" : "outline"} size="sm" onClick={() => setFilter("pending")}>Pendentes</Button>
        <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>Todas</Button>
      </div>
      <ScrollArea className="h-[60vh] rounded-md border">
        <div className="p-2 space-y-2">
          {(data ?? []).map((r: any) => (
            <Card key={r.id}>
              <CardContent className="p-3 space-y-2">
                <div className="flex justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{r.target_type === "post" ? "Post" : "Mensagem"}</Badge>
                    <Badge
                      className="text-[10px]"
                      variant={r.status === "pending" ? "default" : r.status === "resolved" ? "secondary" : "outline"}
                    >
                      {r.status}
                    </Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString("pt-BR")}</span>
                </div>

                <div className="rounded-md border bg-muted/30 p-2">
                  <p className="text-[11px] text-muted-foreground mb-1">
                    Autor: {r._authorName ? <span className="font-medium text-foreground">{r._authorName}</span> : <span className="italic">desconhecido</span>}
                    {r._authorUsername && <span> · @{r._authorUsername}</span>}
                  </p>
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {r._content ?? <span className="italic text-muted-foreground">Conteúdo indisponível (já removido ou mensagem de chat ao vivo).</span>}
                  </p>
                </div>

                <p className="text-xs"><span className="text-muted-foreground">Motivo:</span> {r.reason}</p>

                {r.status === "pending" && (
                  <div className="flex gap-1 flex-wrap">
                    <Button size="sm" variant="default" onClick={() => deleteTarget(r)} disabled={!r._content}>Excluir conteúdo</Button>
                    <Button size="sm" variant="outline" onClick={() => resolve(r.id, "resolved")}>Resolver</Button>
                    <Button size="sm" variant="ghost" onClick={() => resolve(r.id, "ignored")}>Ignorar</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {!(data ?? []).length && <p className="text-sm text-muted-foreground text-center py-8">Sem denúncias.</p>}
        </div>
      </ScrollArea>
    </div>
  );
}


/* ---------- ANNOUNCEMENTS ---------- */
function AnnouncementsTab() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [expiresHours, setExpiresHours] = useState("24");
  const [sending, setSending] = useState(false);

  const { data } = useQuery({
    queryKey: ["dev-announcements"],
    queryFn: async () => (await supabase.from("global_announcements").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const send = async () => {
    if (!title.trim() || !message.trim()) { toast.error("Preencha título e mensagem"); return; }
    setSending(true);
    const expiresAt = expiresHours ? new Date(Date.now() + parseInt(expiresHours) * 3600 * 1000).toISOString() : null;
    const { error } = await supabase.rpc("broadcast_global_announcement", {
      _title: title, _message: message, _expires_at: expiresAt,
    });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Anúncio enviado a todos os usuários!");
    setTitle(""); setMessage(""); setExpiresHours("24");
    qc.invalidateQueries({ queryKey: ["dev-announcements"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Remover anúncio?")) return;
    const { error } = await supabase.from("global_announcements").delete().eq("id", id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["dev-announcements"] });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <h3 className="font-semibold text-sm">Novo anúncio global</h3>
          <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="Mensagem" value={message} onChange={(e) => setMessage(e.target.value)} />
          <div className="flex gap-2 items-center">
            <label className="text-xs text-muted-foreground">Expira em (h):</label>
            <Input type="number" min={1} className="w-24" value={expiresHours} onChange={(e) => setExpiresHours(e.target.value)} />
          </div>
          <Button onClick={send} disabled={sending}>
            <Megaphone className="w-4 h-4 mr-1" />{sending ? "Enviando..." : "Enviar para todos"}
          </Button>
        </CardContent>
      </Card>

      <div>
        <h3 className="font-semibold text-sm mb-2">Anúncios anteriores</h3>
        <div className="space-y-2">
          {(data ?? []).map((a: any) => {
            const expired = !!a.expires_at && new Date(a.expires_at).getTime() < Date.now();
            return (
              <Card key={a.id}>
                <CardContent className="p-3 flex justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{a.title}</p>
                      <Badge variant={expired ? "secondary" : "default"} className="text-[10px]">
                        {expired ? "Expirado" : "Ativo"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{a.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(a.created_at).toLocaleString("pt-BR")}
                      {a.expires_at && ` · ${expired ? "expirou" : "expira"} ${new Date(a.expires_at).toLocaleString("pt-BR")}`}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => remove(a.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}

          {!(data ?? []).length && <p className="text-sm text-muted-foreground text-center py-6">Nenhum anúncio.</p>}
        </div>
      </div>
    </div>
  );
}

/* ---------- SCHOOLS (existing combined data viewer) ---------- */
function SchoolsTab() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmed, setConfirmed] = useState(false);

  const { data: schools } = useQuery({
    queryKey: ["dev-schools"],
    queryFn: async () => (await supabase.from("schools").select("*").order("name")).data ?? [],
  });

  const filteredSchools = useMemo(() => {
    if (!schools) return [];
    const term = search.toLowerCase().trim();
    return term ? schools.filter((s: any) => s.name.toLowerCase().includes(term)) : schools;
  }, [schools, search]);

  const selectedNames = useMemo(() => (schools ?? []).filter((s: any) => selected.has(s.id)).map((s: any) => s.name), [schools, selected]);

  const toggle = (id: string) => {
    const next = new Set(selected); next.has(id) ? next.delete(id) : next.add(id); setSelected(next);
  };
  const toggleAll = () => {
    if (!filteredSchools.length) return;
    const allSelected = filteredSchools.every((s: any) => selected.has(s.id));
    const next = new Set(selected);
    filteredSchools.forEach((s: any) => (allSelected ? next.delete(s.id) : next.add(s.id)));
    setSelected(next);
  };

  if (confirmed) return <SchoolsDataView schoolNames={selectedNames} onBack={() => setConfirmed(false)} />;

  return (
    <div>
      <div className="relative mb-3">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar escola..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="flex items-center justify-between mb-3 text-sm">
        <Button variant="outline" size="sm" onClick={toggleAll}>
          {filteredSchools.length && filteredSchools.every((s: any) => selected.has(s.id)) ? "Desmarcar visíveis" : "Selecionar visíveis"}
        </Button>
        <span className="text-muted-foreground">{selected.size} selecionada(s)</span>
      </div>
      <ScrollArea className="h-[50vh] rounded-md border">
        <div className="p-2 space-y-1">
          {filteredSchools.map((s: any) => (
            <label key={s.id} className="flex items-center gap-3 p-3 rounded-md hover:bg-accent cursor-pointer">
              <Checkbox checked={selected.has(s.id)} onCheckedChange={() => toggle(s.id)} />
              <span className="text-sm">{s.name}</span>
            </label>
          ))}
        </div>
      </ScrollArea>
      <Button className="w-full mt-4" disabled={selected.size === 0} onClick={() => setConfirmed(true)}>
        Ver dados ({selected.size})
      </Button>
    </div>
  );
}

function SchoolsDataView({ schoolNames, onBack }: { schoolNames: string[]; onBack: () => void }) {
  const { data: users } = useQuery({
    queryKey: ["dev-school-users", schoolNames],
    queryFn: async () => (await supabase.from("profiles").select("*").in("school", schoolNames).order("name")).data ?? [],
  });
  const { data: clubs } = useQuery({
    queryKey: ["dev-school-clubs", schoolNames],
    queryFn: async () => (await supabase.from("clubs").select("*").in("school", schoolNames).order("name")).data ?? [],
  });
  const clubIds = useMemo(() => (clubs ?? []).map((c: any) => c.id), [clubs]);
  const { data: events } = useQuery({
    queryKey: ["dev-school-events", clubIds], enabled: clubIds.length > 0,
    queryFn: async () => (await supabase.from("events").select("*, clubs!events_club_id_fkey(name, school)").in("club_id", clubIds).order("date", { ascending: false })).data ?? [],
  });
  const { data: posts } = useQuery({
    queryKey: ["dev-school-posts", clubIds], enabled: clubIds.length > 0,
    queryFn: async () => (await supabase.from("posts").select("*, profiles!posts_author_id_fkey(name, username), clubs!posts_club_id_fkey(name, school)").in("club_id", clubIds).is("deleted_at", null).order("created_at", { ascending: false })).data ?? [],
  });

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-3"><ArrowLeft className="w-4 h-4 mr-1" />Voltar</Button>
      <div className="mb-3 flex flex-wrap gap-1">
        {schoolNames.map((n) => <Badge key={n} variant="secondary" className="text-xs">{n}</Badge>)}
      </div>
      <Tabs defaultValue="users">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="users">Usuários ({users?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="clubs">Clubes ({clubs?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="events">Eventos ({events?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="posts">Posts ({posts?.length ?? 0})</TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="space-y-2 mt-4">
          {(users ?? []).map((u: any) => (
            <Card key={u.id}><CardContent className="p-3 flex justify-between items-center">
              <div><p className="font-medium text-sm">{u.name}</p><p className="text-xs text-muted-foreground">@{u.username}</p></div>
              <Badge variant="outline" className="text-xs">{u.school}</Badge>
            </CardContent></Card>
          ))}
        </TabsContent>
        <TabsContent value="clubs" className="space-y-2 mt-4">
          {(clubs ?? []).map((c: any) => (
            <Card key={c.id}><CardContent className="p-3 flex justify-between items-center">
              <div><p className="font-medium text-sm">{c.name}</p><p className="text-xs text-muted-foreground line-clamp-1">{c.description}</p></div>
              <Badge variant="outline" className="text-xs">{c.school}</Badge>
            </CardContent></Card>
          ))}
        </TabsContent>
        <TabsContent value="events" className="space-y-2 mt-4">
          {(events ?? []).map((e: any) => (
            <Card key={e.id}><CardContent className="p-3">
              <div className="flex justify-between"><p className="font-medium text-sm">{e.title}</p><Badge variant="outline" className="text-xs">{e.clubs?.school}</Badge></div>
              <p className="text-xs text-muted-foreground">{e.clubs?.name} · {new Date(e.date).toLocaleDateString("pt-BR")}</p>
            </CardContent></Card>
          ))}
        </TabsContent>
        <TabsContent value="posts" className="space-y-2 mt-4">
          {(posts ?? []).map((p: any) => (
            <Card key={p.id}><CardContent className="p-3">
              <div className="flex justify-between"><p className="text-xs text-muted-foreground">@{p.profiles?.username} · {p.clubs?.name}</p><Badge variant="outline" className="text-xs">{p.clubs?.school}</Badge></div>
              <p className="text-sm mt-1 line-clamp-2">{p.content}</p>
            </CardContent></Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
