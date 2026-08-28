import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useChatRooms } from "@/hooks/useSupabaseData";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Send, Flag, Trash2, Check, CheckCheck, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { containsProfanity } from "@/lib/profanity";
import TeacherBadge from "@/components/TeacherBadge";
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

interface LiveMsg {
  id: string;
  senderId: string; // profileId
  senderName: string;
  senderAvatar: string | null;
  senderIsTeacher: boolean;
  content: string;
  created_at: number;
  deleted?: boolean;
  reactions?: Record<string, string[]>;
  readBy?: string[];
}

const MAX_LEN = 300;
const EMOJIS = ["❤️", "😂", "😮", "😢", "👍", "🔥"];
const formatTime = (ms: number) =>
  new Date(ms).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

const ChatRoomScreen = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { profileId, user } = useAuth();
  const { data: rooms } = useChatRooms();
  const room = (rooms || []).find((r) => r.id === roomId);

  const [me, setMe] = useState<{ name: string; avatar: string | null; is_teacher: boolean } | null>(null);
  const [messages, setMessages] = useState<LiveMsg[]>([]);
  const [input, setInput] = useState("");
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({}); // profileId -> name
  const [onlineCount, setOnlineCount] = useState(0);
  const [reportOpen, setReportOpen] = useState<LiveMsg | null>(null);
  const [reportReason, setReportReason] = useState("");
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingExpiry = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const channelName = useMemo(() => (roomId ? `club-room:${roomId}` : null), [roomId]);

  // Load own profile info
  useEffect(() => {
    if (!profileId) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("name, avatar, is_teacher")
        .eq("id", profileId)
        .maybeSingle();
      if (data) setMe({ name: data.name, avatar: data.avatar, is_teacher: !!data.is_teacher });
    })();
  }, [profileId]);

  // Setup realtime channel
  useEffect(() => {
    if (!channelName || !profileId || !me) return;
    const channel = supabase.channel(channelName, {
      config: { presence: { key: profileId }, broadcast: { self: false } },
    });
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "message" }, ({ payload }) => {
        const msg = payload as LiveMsg;
        setMessages((prev) => [...prev, msg]);
        channel.send({ type: "broadcast", event: "read", payload: { messageId: msg.id, readerId: profileId } });
      })
      .on("broadcast", { event: "delete" }, ({ payload }) => {
        setMessages((prev) => prev.map((m) => (m.id === payload.messageId ? { ...m, deleted: true } : m)));
      })
      .on("broadcast", { event: "reaction" }, ({ payload }) => {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== payload.messageId) return m;
            const reactions = { ...(m.reactions || {}) };
            const list = new Set(reactions[payload.emoji] || []);
            if (list.has(payload.reactorId)) list.delete(payload.reactorId);
            else list.add(payload.reactorId);
            if (list.size === 0) delete reactions[payload.emoji];
            else reactions[payload.emoji] = Array.from(list);
            return { ...m, reactions };
          }),
        );
      })
      .on("broadcast", { event: "read" }, ({ payload }) => {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== payload.messageId) return m;
            const set = new Set(m.readBy || []);
            set.add(payload.readerId);
            return { ...m, readBy: Array.from(set) };
          }),
        );
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload.from === profileId) return;
        setTypingUsers((prev) => ({ ...prev, [payload.from]: payload.name }));
        if (typingExpiry.current[payload.from]) clearTimeout(typingExpiry.current[payload.from]);
        typingExpiry.current[payload.from] = setTimeout(() => {
          setTypingUsers((prev) => {
            const copy = { ...prev };
            delete copy[payload.from];
            return copy;
          });
        }, 2500);
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setOnlineCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ profileId, name: me.name, online_at: Date.now() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      Object.values(typingExpiry.current).forEach((t) => clearTimeout(t));
      typingExpiry.current = {};
    };
  }, [channelName, profileId, me]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers]);

  const broadcastTyping = useCallback(() => {
    if (!channelRef.current || !profileId || !me) return;
    channelRef.current.send({ type: "broadcast", event: "typing", payload: { from: profileId, name: me.name } });
  }, [profileId, me]);

  const onInputChange = (v: string) => {
    if (v.length > MAX_LEN) return;
    setInput(v);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(broadcastTyping, 200);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !profileId || !channelRef.current || !me) return;
    if (containsProfanity(text)) {
      toast.error("Sua mensagem contém conteúdo inadequado e não pode ser enviada.");
      return;
    }
    if (text.length > MAX_LEN) return;
    if (!(await checkRateLimit("club_chat", profileId))) return;
    const msg: LiveMsg = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      senderId: profileId,
      senderName: me.name,
      senderAvatar: me.avatar,
      senderIsTeacher: me.is_teacher,
      content: text,
      created_at: Date.now(),
      reactions: {},
      readBy: [],
    };
    setMessages((prev) => [...prev, msg]);
    channelRef.current.send({ type: "broadcast", event: "message", payload: msg });
    setInput("");
  };

  const handleDelete = (msg: LiveMsg) => {
    if (!channelRef.current || !profileId || msg.senderId !== profileId) return;
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, deleted: true } : m)));
    channelRef.current.send({ type: "broadcast", event: "delete", payload: { messageId: msg.id } });
  };

  const handleReact = (msg: LiveMsg, emoji: string) => {
    if (!channelRef.current || !profileId) return;
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msg.id) return m;
        const reactions = { ...(m.reactions || {}) };
        const list = new Set(reactions[emoji] || []);
        if (list.has(profileId)) list.delete(profileId);
        else list.add(profileId);
        if (list.size === 0) delete reactions[emoji];
        else reactions[emoji] = Array.from(list);
        return { ...m, reactions };
      }),
    );
    channelRef.current.send({ type: "broadcast", event: "reaction", payload: { messageId: msg.id, emoji, reactorId: profileId } });
  };

  const submitReport = async () => {
    if (!reportOpen || !user) return;
    if (reportReason.trim().length < 5) {
      toast.error("Descreva o motivo (mín. 5 caracteres).");
      return;
    }
    await supabase.from("reports").insert({
      reporter_id: user.id,
      target_type: "message",
      target_id: reportOpen.id,
      reason: `[Clube ${room?.name}] ${reportOpen.content}\nMotivo: ${reportReason.trim()}`.slice(0, 500),
    });
    toast.success("Denúncia enviada.");
    setReportOpen(null);
    setReportReason("");
  };

  if (!room) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Conversa não encontrada.</p>
      </div>
    );
  }

  const remaining = MAX_LEN - input.length;
  const typingNames = Object.values(typingUsers);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-primary text-primary-foreground py-3 px-4 flex items-center gap-3 sticky top-0 z-10">
        <Link to="/chat" className="hover:opacity-80 transition-opacity">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold truncate">{room.name}</h1>
          <p className="text-[10px] opacity-80 flex items-center gap-1">
            <Users className="w-3 h-3" /> {onlineCount} online
          </p>
        </div>
      </header>

      <div className="bg-muted/40 border-b border-border px-4 py-1.5 text-[10px] text-center text-muted-foreground">
        Chat ao vivo — mensagens não são salvas e somem ao sair.
      </div>

      <main className="flex-1 overflow-y-auto px-4 py-4 pb-2">
        <div className="max-w-lg mx-auto flex flex-col gap-2">
          {messages.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-12">
              Envie a primeira mensagem para começar.
            </p>
          )}
          <AnimatePresence initial={false}>
            {messages.map((msg) => {
              const isOwn = msg.senderId === profileId;
              const readers = (msg.readBy || []).filter((id) => id !== msg.senderId).length;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[78%] flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                    {!isOwn && (
                      <span className="text-[10px] font-semibold text-primary mb-0.5 ml-1 flex items-center gap-1">
                        {msg.senderName}
                        {msg.senderIsTeacher && <TeacherBadge />}
                      </span>
                    )}
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
                            {isOwn ? (
                              <button
                                onClick={() => handleDelete(msg)}
                                className="flex items-center gap-1 text-xs text-destructive px-2 py-1 hover:bg-destructive/10 rounded"
                              >
                                <Trash2 className="w-3 h-3" /> Apagar
                              </button>
                            ) : (
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
                        readers > 0 ? (
                          <CheckCheck className="w-3 h-3 text-accent" />
                        ) : (
                          <Check className="w-3 h-3 text-muted-foreground" />
                        )
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {typingNames.length > 0 && (
            <div className="text-[11px] text-muted-foreground italic ml-2">
              {typingNames.slice(0, 2).join(", ")} digitando...
            </div>
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
};

export default ChatRoomScreen;
