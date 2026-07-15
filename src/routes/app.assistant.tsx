import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bot,
  FileSearch,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  api,
  useChatSessions,
  useDeleteChatSession,
  useRenameChatSession,
  useRun,
} from "../api";
import type { ChatSessionSummary } from "../api";
import { RunView } from "../components/workflow/RunView";
import { cn } from "../lib/utils";

// Persist the conversation across tab switches / reloads. The session_id continues the
// server-side session; the mirrored messages give an instant restore before history
// round-trips; the active run keeps the in-chat workflow (and composer gate) alive.
const SESSION_LS = "aios.chat.session_id";
const MESSAGES_LS = "aios.chat.messages";
const ACTIVE_RUN_LS = "aios.chat.active_run";

function loadStoredMessages(): Msg[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(MESSAGES_LS) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is Msg =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string",
    );
  } catch {
    return [];
  }
}

function loadStored(key: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.localStorage.getItem(key) ?? undefined;
}

// --- Conversations sidebar: pure grouping + formatting helpers --------------
type SessionGroup = { label: string; sessions: ChatSessionSummary[] };

/** Bucket sessions into Today / Yesterday / Previous 7 days / Older on
 *  `last_activity ?? created_at`. Pure — empty groups are dropped by the caller. */
function groupSessionsByDate(sessions: ChatSessionSummary[]): SessionGroup[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayMs = 86_400_000;
  const buckets: Record<string, ChatSessionSummary[]> = {
    Today: [],
    Yesterday: [],
    "Previous 7 days": [],
    Older: [],
  };
  for (const s of sessions) {
    const raw = s.last_activity ?? s.created_at;
    const ts = new Date(raw).getTime();
    if (Number.isNaN(ts) || ts >= startOfToday) buckets.Today.push(s);
    else if (ts >= startOfToday - dayMs) buckets.Yesterday.push(s);
    else if (ts >= startOfToday - 7 * dayMs) buckets["Previous 7 days"].push(s);
    else buckets.Older.push(s);
  }
  return (["Today", "Yesterday", "Previous 7 days", "Older"] as const)
    .filter((k) => buckets[k].length > 0)
    .map((k) => ({ label: k, sessions: buckets[k] }));
}

/** Short timestamp for a session row: `10:42 AM` if today, else `Jun 7`. */
function formatSessionTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  return sameDay
    ? d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export const Route = createFileRoute("/app/assistant")({ component: Assistant });

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTED: { icon: LucideIcon; label: string }[] = [
  { icon: FileSearch, label: "Summarize my most recent document." },
  { icon: Sparkles, label: "What can this platform do for my team?" },
  { icon: Bot, label: "Draft a status update from this week's activity." },
  { icon: ShieldCheck, label: "Explain how approvals work here." },
  { icon: Zap, label: "Call the RFI Copilot." },
];

const CAPABILITIES: { icon: LucideIcon; title: string; detail: string }[] = [
  { icon: FileSearch, title: "Grounded", detail: "Answers cite your own documents when enabled." },
  { icon: ShieldCheck, title: "Controlled", detail: "Nothing posts — the assistant only drafts." },
  { icon: Sparkles, title: "Traced", detail: "Every turn is logged to your audit trail." },
];

function Assistant() {
  const [messages, setMessages] = useState<Msg[]>(() => loadStoredMessages());
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [useRag, setUseRag] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | undefined>(() => loadStored(SESSION_LS));
  const [activeRunId, setActiveRunId] = useState<string | undefined>(() =>
    loadStored(ACTIVE_RUN_LS),
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  const qc = useQueryClient();
  const { data: sessions = [], isLoading: sessionsLoading } = useChatSessions();
  const renameSession = useRenameChatSession();
  const deleteSession = useDeleteChatSession();

  const activeTitle = sessions.find((s) => s.id === sessionId)?.title ?? "New chat";

  // Composer gate — while a run the assistant started is still in flight, block the
  // input until it settles. Shares the ["run", runId] query with the inline RunView.
  const { data: activeRun, isError: activeRunError } = useRun(activeRunId);
  const activeRunTerminal =
    activeRunError || // a stale/removed run id shouldn't lock the composer forever
    activeRun?.status === "completed" ||
    activeRun?.status === "rejected";
  const composerLocked = Boolean(activeRunId) && !activeRunTerminal;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, activeRunId]);

  // Persist session + transcript so a tab switch keeps the conversation.
  useEffect(() => {
    if (sessionId) window.localStorage.setItem(SESSION_LS, sessionId);
  }, [sessionId]);
  useEffect(() => {
    if (messages.length > 0)
      window.localStorage.setItem(MESSAGES_LS, JSON.stringify(messages));
  }, [messages]);
  // Keep the active run persisted while it's live; drop it once terminal (or cleared)
  // so a later mount doesn't restore a finished run and re-gate the composer.
  useEffect(() => {
    if (activeRunId && !activeRunTerminal)
      window.localStorage.setItem(ACTIVE_RUN_LS, activeRunId);
    else window.localStorage.removeItem(ACTIVE_RUN_LS);
  }, [activeRunId, activeRunTerminal]);

  // On mount, if a session was stored, pull its authoritative transcript and hydrate
  // over the instant (localStorage) restore. Failures keep the local copy.
  useEffect(() => {
    const stored = loadStored(SESSION_LS);
    if (!stored) return;
    let cancelled = false;
    api
      .getChatHistory(stored)
      .then((h) => {
        if (cancelled || !Array.isArray(h.messages)) return;
        const hydrated: Msg[] = h.messages
          .filter(
            (m) =>
              (m.role === "user" || m.role === "assistant") &&
              typeof m.content === "string",
          )
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
        if (hydrated.length > 0) setMessages(hydrated);
      })
      .catch(() => {
        /* keep the locally-restored messages */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || streaming || composerLocked) return;
    setError(null);
    setInput("");
    setMessages((m) => [
      ...m,
      { role: "user", content: message },
      { role: "assistant", content: "" },
    ]);
    setStreaming(true);
    let failed: string | null = null;
    try {
      let got = false;
      for await (const chunk of api.chatStream({
        message,
        session_id: sessionId, // send stored id → server CONTINUES the session
        use_rag: useRag,
        workspace: "construction", // this is the Construction workspace
      })) {
        if (chunk.session_id) setSessionId(chunk.session_id);
        if (chunk.workflow?.run_id) setActiveRunId(chunk.workflow.run_id); // run started
        if (chunk.error) {
          failed = chunk.error; // backend signalled a failure (e.g. LLM unavailable)
          break;
        }
        if (chunk.delta) {
          got = true;
          setMessages((m) => {
            const copy = [...m];
            copy[copy.length - 1] = {
              role: "assistant",
              content: copy[copy.length - 1].content + chunk.delta,
            };
            return copy;
          });
        }
      }
      if (!failed && !got) failed = "The assistant didn't return a response. Please try again.";
    } catch {
      failed =
        "The assistant is unavailable. An LLM provider key may not be configured on the backend.";
    } finally {
      setStreaming(false);
    }
    if (failed) {
      setError(failed);
      setMessages((m) => m.slice(0, -1)); // drop the empty assistant bubble
    }
    // The turn just finished ([DONE]) — a brand-new session now has a title +
    // preview server-side, so refresh the sidebar to reflect it.
    qc.invalidateQueries({ queryKey: ["chat-sessions"] });
  };

  const reset = () => {
    setMessages([]);
    setSessionId(undefined);
    setActiveRunId(undefined);
    setError(null);
    window.localStorage.removeItem(SESSION_LS);
    window.localStorage.removeItem(MESSAGES_LS);
    window.localStorage.removeItem(ACTIVE_RUN_LS);
    qc.invalidateQueries({ queryKey: ["chat-sessions"] });
  };

  // Open a past session from the sidebar: continue its server-side session, pull
  // its authoritative transcript, and drop any inline run from the previous chat.
  const loadSession = async (id: string) => {
    if (id === sessionId) return;
    setError(null);
    setSessionId(id); // persisted to SESSION_LS by the effect above
    setActiveRunId(undefined);
    window.localStorage.removeItem(ACTIVE_RUN_LS);
    try {
      const h = await api.getChatHistory(id);
      const hydrated: Msg[] = (Array.isArray(h.messages) ? h.messages : [])
        .filter(
          (m) =>
            (m.role === "user" || m.role === "assistant") && typeof m.content === "string",
        )
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
      setMessages(hydrated);
      window.localStorage.setItem(MESSAGES_LS, JSON.stringify(hydrated));
    } catch {
      setMessages([]);
    }
  };

  const handleRename = (id: string, current: string) => {
    const next = window.prompt("Rename conversation", current);
    if (next == null) return;
    const title = next.trim();
    if (!title || title === current) return;
    renameSession.mutate({ id, title });
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("Delete this conversation? This can't be undone.")) return;
    deleteSession.mutate(id, {
      onSuccess: () => {
        if (id === sessionId) reset(); // deleting the active chat → fresh session
      },
    });
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Conversations sidebar (desktop) */}
      <ConversationsSidebar
        className="hidden w-[300px] shrink-0 md:flex"
        sessions={sessions}
        loading={sessionsLoading}
        activeId={sessionId}
        onNew={reset}
        onSelect={loadSession}
        onRename={handleRename}
        onDelete={handleDelete}
      />

      {/* Chat column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="mb-4 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              AI Assistant · Copilot online
            </div>
            <div className="mt-2 flex items-center gap-2">
              <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">
                {activeTitle}
              </h1>
              {sessionId && (
                <button
                  onClick={() => handleRename(sessionId, activeTitle)}
                  title="Rename conversation"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-border bg-surface text-muted-foreground transition hover:border-primary/50 hover:text-primary"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          {(hasMessages || activeRunId) && (
            <button
              onClick={reset}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium transition hover:border-primary/50 hover:text-primary"
            >
              <RefreshCw className="h-3.5 w-3.5" /> New chat
            </button>
          )}
        </div>

        {/* Conversation */}
      <div
        ref={scrollRef}
        className="nice-scroll flex-1 overflow-y-auto rounded-2xl border border-border bg-surface/50 p-4 md:p-6"
      >
        {hasMessages || activeRunId ? (
          <div className="mx-auto flex max-w-3xl flex-col gap-5">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn("flex gap-3", m.role === "user" && "flex-row-reverse")}
              >
                <div
                  className={cn(
                    "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
                    m.role === "user"
                      ? "bg-secondary text-secondary-foreground"
                      : "brand-gradient text-primary-foreground shadow-sm shadow-primary/25",
                  )}
                >
                  {m.role === "user" ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                </div>
                <div
                  className={cn(
                    "max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    m.role === "user"
                      ? "rounded-tr-sm bg-primary text-primary-foreground"
                      : "rounded-tl-sm border border-border bg-card text-foreground",
                  )}
                >
                  {m.content || (streaming ? <TypingDots /> : "")}
                </div>
              </div>
            ))}

            {/* The assistant started a workflow — show it live inline (steps light up,
                Approve/Reject, result). The composer stays gated until it settles. */}
            {activeRunId && (
              <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card/40 p-4">
                <RunView runId={activeRunId} />
              </div>
            )}
          </div>
        ) : (
          <EmptyState onAsk={send} />
        )}
      </div>

      {error && (
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-3"
      >
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-surface p-2 transition focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder={
              composerLocked ? "Finish the workflow above to continue…" : "Message the assistant…"
            }
            disabled={streaming || composerLocked}
            className="max-h-40 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={streaming || composerLocked || !input.trim()}
            className="brand-gradient grid h-9 w-9 shrink-0 place-items-center rounded-lg text-primary-foreground shadow-sm shadow-primary/25 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between px-1">
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={useRag}
              onChange={(e) => setUseRag(e.target.checked)}
              className="accent-[var(--primary)]"
            />
            Use my documents
          </label>
          <span className="text-[11px] text-muted-foreground">
            {composerLocked
              ? "Finish the workflow above to continue"
              : "Enter to send · Shift+Enter for a new line"}
          </span>
        </div>
      </form>
      </div>
    </div>
  );
}

function ConversationsSidebar({
  className,
  sessions,
  loading,
  activeId,
  onNew,
  onSelect,
  onRename,
  onDelete,
}: {
  className?: string;
  sessions: ChatSessionSummary[];
  loading: boolean;
  activeId?: string;
  onNew: () => void;
  onSelect: (id: string) => void;
  onRename: (id: string, current: string) => void;
  onDelete: (id: string) => void;
}) {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? sessions.filter(
          (s) =>
            s.title.toLowerCase().includes(q) || s.preview.toLowerCase().includes(q),
        )
      : sessions;
    return groupSessionsByDate(filtered);
  }, [sessions, query]);

  return (
    <aside
      className={cn(
        "flex-col overflow-hidden rounded-2xl border border-border bg-surface/50",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-3">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          <MessageSquare className="h-3.5 w-3.5 text-primary" />
          Conversations
        </div>
        <button
          onClick={onNew}
          title="New chat"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-border bg-surface text-muted-foreground transition hover:border-primary/50 hover:text-primary"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5 transition focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* List */}
      <div className="nice-scroll flex-1 overflow-y-auto px-2 pb-3">
        {loading ? (
          <div className="px-2 py-6 text-center text-xs text-muted-foreground">
            Loading conversations…
          </div>
        ) : groups.length === 0 ? (
          <div className="px-2 py-6 text-center text-xs text-muted-foreground">
            {sessions.length === 0
              ? "No conversations yet. Start one on the right."
              : "No conversations match your search."}
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.label} className="mt-2 first:mt-0">
              <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {group.label}
              </div>
              <div className="flex flex-col gap-0.5">
                {group.sessions.map((s) => {
                  const active = s.id === activeId;
                  return (
                    <div
                      key={s.id}
                      className={cn(
                        "group relative flex cursor-pointer items-start gap-2 rounded-lg px-2 py-2 transition",
                        active
                          ? "bg-primary/10 ring-1 ring-primary/20"
                          : "hover:bg-card",
                      )}
                      onClick={() => onSelect(s.id)}
                    >
                      <MessageSquare
                        className={cn(
                          "mt-0.5 h-4 w-4 shrink-0",
                          active ? "text-primary" : "text-muted-foreground",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "flex-1 truncate text-sm font-medium",
                              active ? "text-primary" : "text-foreground",
                            )}
                          >
                            {s.title || "Untitled"}
                          </span>
                          <span className="shrink-0 text-[10px] text-muted-foreground group-hover:hidden">
                            {formatSessionTime(s.last_activity ?? s.created_at)}
                          </span>
                          {/* Hover actions */}
                          <span className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRename(s.id, s.title);
                              }}
                              title="Rename"
                              className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground transition hover:bg-surface hover:text-primary"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(s.id);
                              }}
                              title="Delete"
                              className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground transition hover:bg-surface hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        </div>
                        {s.preview && (
                          <div className="mt-0.5 truncate text-xs text-muted-foreground">
                            {s.preview}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

function EmptyState({ onAsk }: { onAsk: (p: string) => void }) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col py-8">
      <div className="text-center">
        <div className="brand-gradient mx-auto grid h-14 w-14 place-items-center rounded-2xl text-primary-foreground shadow-lg shadow-primary/25">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="mt-4 text-[11px] font-medium uppercase tracking-[0.22em] text-primary">
          Workspace Copilot
        </div>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
          Ask anything, or start with a suggestion.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          The assistant reasons over your organization's data and drafts answers for you — every
          turn is traced.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {SUGGESTED.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.label}
              onClick={() => onAsk(s.label)}
              className="group flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3.5 text-left transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-sm"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
                <Icon className="h-4 w-4" />
              </span>
              <span className="flex-1 text-sm font-medium">{s.label}</span>
              <Send className="h-3.5 w-3.5 text-muted-foreground transition group-hover:text-primary" />
            </button>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {CAPABILITIES.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.title} className="rounded-xl border border-border bg-surface p-4">
              <Icon className="h-4 w-4 text-primary" />
              <div className="mt-2 text-sm font-semibold">{c.title}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{c.detail}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex gap-1">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:150ms]" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:300ms]" />
    </span>
  );
}
