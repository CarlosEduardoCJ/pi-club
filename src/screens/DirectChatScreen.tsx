import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Send, Flag, Trash2, Check, CheckCheck } from "lucide-react";
import TeacherBadge from "@/components/TeacherBadge";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { containsProfanity } from "@/lib/profanity";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { checkRateLimit } from "@/lib/rateLimit";

interface OtherProfile {
  id: string;
  user_id: string;
  name: string;
  username: string;
  avatar: string | null;
  is_teacher: boolean;
  school: string;
}

interface DBMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  deleted: boolean;
  reactions: Record<string, string[]> | null;
  read_at: string | null;
  created_at: string;
}

const MAX_LEN = 300;
const EMOJIS = ["❤️", "😂", "😮", "😢", "👍", "🔥"];

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

const formatDay = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, today)) return "Hoje";
  if (sameDay(d, yest)) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const getInitials = (n: string) =>
  n.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

export default function DirectChatScreen() {
  const { otherId } = useParams<{ otherId: string }>();
  const navigate = useNavigate();
  const { profileId, user } = useAuth();

  const [me, setMe] = useState<{ school: string; name: string } | null>(null);
  const [other, setOther] = useState<OtherProfile | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<DBMessage[]>([]);
  const [input, setInput] = useState("");
  const [otherTyping, setOtherTyping] = useState(false);
  const [otherOnline, setOtherOnline] = useState(false);
  const [reportOpen, setReportOpen] = useState<DBMessage | null>(null);
  const [reportReason, setReportReason] = useState("");
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const otherTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const presenceChannelName = useMemo(() => {
    if (!profileId || !otherId) return null;
    const [a, b] = [profileId, otherId].sort();
    return `dm-presence:${a}:${b}`;
  }, [profileId, otherId]);

  // Load profiles + authorization
  useEffect(() => {
    if (!profileId || !otherId) return;
    (async () => {
      const [{ data: meData }, { data: otherData }] = await Promise.all([
        supabase.from("profiles").select("school, name").eq("id", profileId).maybeSingle(),
        supabase
          .from("profiles")
          .select("id, user_id, name, username, avatar, is_teacher, school, deleted_at")
          .eq("id", otherId)
          .maybeSingle(),
      ]);
      if (!meData || !otherData) { setAuthorized(false); return; }
      setMe({ school: meData.school, name: meData.name });
      if (otherData.deleted_at || otherData.school !== meData.school) { setAuthorized(false); return; }
      setOther(otherData as OtherProfile);
      setAuthorized(true);
    })();
  }, [profileId, otherId]);

  // Load history + realtime
  useEffect(() => {
    if (!profileId || !otherId || authorized !== true) return;

    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("direct_messages")
        .select("*")
        .or(
          `and(sender_id.eq.${profileId},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${profileId})`,
        )
        .order("created_at", { ascending: true })
        .limit(500);
      if (cancelled) return;
      setMessages((data as DBMessage[]) || []);
      // mark all incoming unread as read
      const unread = (data || []).filter(
        (m: any) => m.recipient_id === profileId && !m.read_at,
      );
      if (unread.length) {
        await supabase
          .from("direct_messages")
          .update({ read_at: new Date().toISOString() })
          .in("id", unread.map((m: any) => m.id));
      }
    })();

    const ch = supabase
      .channel(`dm-db:${[profileId, otherId].sort().join(":")}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages" },
        (payload) => {
          const m = payload.new as DBMessage;
          const isPair =
            (m.sender_id === profileId && m.recipient_id === otherId) ||
            (m.sender_id === otherId && m.recipient_id === profileId);
          if (!isPair) return;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          if (m.recipient_id === profileId && !m.read_at) {
            supabase
              .from("direct_messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", m.id);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "direct_messages" },
        (payload) => {
          const m = payload.new as DBMessage;
          const isPair =
            (m.sender_id === profileId && m.recipient_id === otherId) ||
            (m.sender_id === otherId && m.recipient_id === profileId);
          if (!isPair) return;
          setMessages((prev) => prev.map((x) => (x.id === m.id ? m : x)));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "direct_messages" },
        (payload) => {
          const m = payload.old as DBMessage;
          setMessages((prev) => prev.filter((x) => x.id !== m.id));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [profileId, otherId, authorized]);

  // Presence + typing channel
  useEffect(() => {
    if (!presenceChannelName || !profileId || authorized !== true) return;
    const channel = supabase.channel(presenceChannelName, {
      config: { presence: { key: profileId }, broadcast: { self: false } },
    });
    channelRef.current = channel;
    channel
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload.from === profileId) return;
        setOtherTyping(true);
        if (otherTypingTimeoutRef.current) clearTimeout(otherTypingTimeoutRef.current);
        otherTypingTimeoutRef.current = setTimeout(() => setOtherTyping(false), 2500);
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setOtherOnline(Object.keys(state).some((k) => k === otherId));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ profileId, online_at: Date.now() });
        }
      });
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [presenceChannelName, profileId, otherId, authorized]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, otherTyping]);

  const broadcastTyping = useCallback(() => {
    if (!channelRef.current || !profileId) return;
    channelRef.current.send({ type: "broadcast", event: "typing", payload: { from: profileId } });
  }, [profileId]);

  const onInputChange = (v: string) => {
    if (v.length > MAX_LEN) return;
    setInput(v);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(broadcastTyping, 200);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !profileId || !otherId) return;
    if (containsProfanity(text)) {
      toast.error("Sua mensagem contém conteúdo inadequado e não pode ser enviada.");
      return;
    }
    if (text.length > MAX_LEN) return;
    if (!(await checkRateLimit("direct_message", profileId))) return;
    setInput("");
    const { error } = await supabase.from("direct_messages").insert({
      sender_id: profileId,
      recipient_id: otherId,
      content: text,
    });
    if (error) {
      toast.error("Não foi possível enviar.");
      setInput(text);
    }
  };

  const handleDelete = async (msg: DBMessage) => {
    if (msg.sender_id !== profileId) return;
    await supabase
      .from("direct_messages")
      .update({ deleted: true, content: "" })
      .eq("id", msg.id);
  };

  const handleReact = async (msg: DBMessage, emoji: string) => {
    if (!profileId) return;
    const reactions = { ...(msg.reactions || {}) };
    const list = new Set(reactions[emoji] || []);
    if (list.has(profileId)) list.delete(profileId);
    else list.add(profileId);
    if (list.size === 0) delete reactions[emoji];
    else reactions[emoji] = Array.from(list);
    await supabase.from("direct_messages").update({ reactions }).eq("id", msg.id);
  };

  const submitReport = async () => {
    if (!reportOpen || !user || !other) return;
    if (reportReason.trim().length < 5) {
      toast.error("Descreva o motivo (mín. 5 caracteres).");
      return;
    }
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      target_type: "message",
      target_id: reportOpen.id,
      reason: reportReason.trim().slice(0, 500),
      content_snapshot: reportOpen.content,
      reported_user_id: other.user_id,
    } as never);
    if (error) {
      await supabase.from("reports").insert({
        reporter_id: user.id,
        target_type: "message",
        target_id: reportOpen.id,
        reason: `[DM ${other.name}] ${reportOpen.content}\nMotivo: ${reportReason.trim()}`.slice(0, 500),
      });
    }
    const { data: admins } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    const adminUserIds = (admins || []).map((a) => a.user_id);
    if (adminUserIds.length > 0) {
      const { data: adminProfiles } = await supabase
        .from("profiles")
        .select("id, school")
        .in("user_id", adminUserIds)
        .eq("school", other.school);
      const rows = (adminProfiles || []).map((p) => ({
        profile_id: p.id,
        type: "report",
        message: `Denúncia de mensagem entre ${me?.name} e ${other.name}: "${reportOpen.content.slice(0, 120)}" — Motivo: ${reportReason.trim().slice(0, 160)}`,
        from_user: me?.name || "Usuário",
        from_avatar: "",
        is_read: false,
      }));
      if (rows.length) await supabase.from("notifications").insert(rows);
    }
    toast.success("Denúncia enviada.");
    setReportOpen(null);
    setReportReason("");
  };

  if (authorized === false) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 gap-3">
        <p className="text-sm text-muted-foreground text-center">
          Você só pode conversar com usuários da sua escola.
        </p>
        <Button onClick={() => navigate("/chat")}>Voltar</Button>
      </div>
    );
  }
  if (!other || authorized === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Carregando...</p>
      </div>
    );
  }

  const remaining = MAX_LEN - input.length;

  // Group messages by day
  let lastDay = "";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-primary text-primary-foreground py-3 px-4 flex items-center gap-3 sticky top-0 z-10">
        <Link to="/chat" className="hover:opacity-80">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="relative w-9 h-9 rounded-full bg-primary-foreground/15 flex items-center justify-center overflow-hidden">
          {other.avatar && !other.avatar.startsWith("preset:") ? (
            <img src={other.avatar} alt={other.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-bold">{getInitials(other.name)}</span>
          )}
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-primary ${
              otherOnline ? "bg-green-500" : "bg-muted-foreground/60"
            }`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm font-bold truncate">{other.name}</h1>
            {other.is_teacher && <TeacherBadge />}
          </div>
          <p className="text-[10px] opacity-80">
            {otherTyping ? "Digitando..." : otherOnline ? "Online agora" : "Offline"}
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-lg mx-auto flex flex-col gap-2">
          {messages.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-12">
              Envie a primeira mensagem para iniciar a conversa.
            </p>
          )}
          <AnimatePresence initial={false}>
            {messages.map((msg) => {
              const isOwn = msg.sender_id === profileId;
              const readByOther = isOwn && !!msg.read_at;
              const day = formatDay(msg.created_at);
              const showDay = day !== lastDay;
              lastDay = day;
              return (
                <div key={msg.id}>
                  {showDay && (
                    <div className="text-center my-3">
                      <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                        {day}
                      </span>
                    </div>
                  )}
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[78%] flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed text-left ${
                              isOwn
                                ? "bg-primary text-primary-foreground rounded-br-md"
                                : "bg-card text-foreground rounded-bl-md"
                            } ${msg.deleted ? "italic opacity-60" : ""}`}
                            style={!isOwn ? { boxShadow: "var(--shadow-card)" } : undefined}
                          >
                            {msg.deleted ? "Mensagem apagada" : msg.content}
                          </button>
                        </PopoverTrigger>
                        {!msg.deleted && (
                          <PopoverContent className="w-auto p-1.5" align={isOwn ? "end" : "start"}>
                            <div className="flex items-center gap-1">
                              {EMOJIS.map((e) => (
                                <button
                                  key={e}
                                  onClick={() => handleReact(msg, e)}
                                  className="text-lg hover:scale-125 transition-transform p-1"
                                >
                                  {e}
                                </button>
                              ))}
                            </div>
                            <div className="flex items-center gap-1 border-t border-border mt-1 pt-1">
                              {isOwn && (
                                <button
                                  onClick={() => handleDelete(msg)}
                                  className="flex items-center gap-1 text-xs text-destructive px-2 py-1 hover:bg-destructive/10 rounded"
                                >
                                  <Trash2 className="w-3 h-3" /> Apagar
                                </button>
                              )}
                              {!isOwn && (
                                <button
                                  onClick={() => {
                                    setReportOpen(msg);
                                    setReportReason("");
                                  }}
                                  className="flex items-center gap-1 text-xs text-destructive px-2 py-1 hover:bg-destructive/10 rounded"
                                >
                                  <Flag className="w-3 h-3" /> Denunciar
                                </button>
                              )}
                            </div>
                          </PopoverContent>
                        )}
                      </Popover>

                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div className="flex gap-1 mt-0.5 mx-1 flex-wrap">
                          {Object.entries(msg.reactions).map(([emoji, ids]) => (
                            <button
                              key={emoji}
                              onClick={() => handleReact(msg, emoji)}
                              className="text-[11px] bg-card border border-border rounded-full px-1.5 py-0.5 flex items-center gap-0.5"
                            >
                              <span>{emoji}</span>
                              <span className="text-muted-foreground">{ids.length}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-1 mt-0.5 mx-1">
                        <span className="text-[9px] text-muted-foreground">{formatTime(msg.created_at)}</span>
                        {isOwn && !msg.deleted && (
                          readByOther ? (
                            <CheckCheck className="w-3 h-3 text-accent" />
                          ) : (
                            <Check className="w-3 h-3 text-muted-foreground" />
                          )
                        )}
                      </div>
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </AnimatePresence>
          {otherTyping && (
            <div className="text-[11px] text-muted-foreground italic ml-2">Digitando...</div>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      <div className="border-t border-border bg-card px-4 py-3 sticky bottom-0">
        <div className="max-w-lg mx-auto flex items-end gap-2">
          <div className="flex-1 bg-background border border-border rounded-2xl px-4 py-2">
            <textarea
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Digite uma mensagem..."
              rows={1}
              maxLength={MAX_LEN}
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none max-h-24"
            />
            <div className="flex justify-end">
              <span className={`text-[10px] ${remaining <= 30 ? "text-destructive" : "text-muted-foreground"}`}>
                {remaining}
              </span>
            </div>
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="w-9 h-9 rounded-full bg-accent text-accent-foreground flex items-center justify-center hover:bg-accent/90 transition-colors disabled:opacity-40 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      <Dialog open={!!reportOpen} onOpenChange={(o) => !o && setReportOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Denunciar mensagem</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="text-xs bg-muted p-2 rounded">{reportOpen?.content}</div>
            <Textarea
              placeholder="Descreva o motivo da denúncia..."
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              maxLength={500}
            />
            <Button onClick={submitReport}>Enviar denúncia</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
