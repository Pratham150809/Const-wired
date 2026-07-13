import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  Bot,
  FileSearch,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { api } from "../api";
import { cn } from "../lib/utils";

export const Route = createFileRoute("/app/assistant")({ component: Assistant });

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTED: { icon: LucideIcon; label: string }[] = [
  { icon: FileSearch, label: "Summarize my most recent document." },
  { icon: Sparkles, label: "What can this platform do for my team?" },
  { icon: Bot, label: "Draft a status update from this week's activity." },
  { icon: ShieldCheck, label: "Explain how approvals work here." },
];

const CAPABILITIES: { icon: LucideIcon; title: string; detail: string }[] = [
  { icon: FileSearch, title: "Grounded", detail: "Answers cite your own documents when enabled." },
  { icon: ShieldCheck, title: "Controlled", detail: "Nothing posts — the assistant only drafts." },
  { icon: Sparkles, title: "Traced", detail: "Every turn is logged to your audit trail." },
];

function Assistant() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [useRag, setUseRag] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionId = useRef<string | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || streaming) return;
    setError(null);
    setInput("");
    setMessages((m) => [
      ...m,
      { role: "user", content: message },
      { role: "assistant", content: "" },
    ]);
    setStreaming(true);
    try {
      for await (const chunk of api.chatStream({
        message,
        session_id: sessionId.current,
        use_rag: useRag,
      })) {
        if (chunk.session_id) sessionId.current = chunk.session_id;
        if (chunk.delta) {
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
    } catch {
      setError(
        "The assistant is unavailable. An LLM provider key may not be configured on the backend.",
      );
      setMessages((m) => m.slice(0, -1)); // drop the empty assistant bubble
    } finally {
      setStreaming(false);
    }
  };

  const reset = () => {
    setMessages([]);
    sessionId.current = undefined;
    setError(null);
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            AI Assistant
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            Chat grounded in your organization's data
          </h1>
        </div>
        {hasMessages && (
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
        {hasMessages ? (
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
            placeholder="Message the assistant…"
            disabled={streaming}
            className="max-h-40 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
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
            Enter to send · Shift+Enter for a new line
          </span>
        </div>
      </form>
    </div>
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
