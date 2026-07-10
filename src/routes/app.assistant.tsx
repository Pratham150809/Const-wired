import { createFileRoute } from "@tanstack/react-router";
import { Bot, RefreshCw, Send, Sparkles, User } from "lucide-react";
import { useRef, useState } from "react";

import { api } from "../api";
import { PageHeader } from "../components/common/PageHeader";

export const Route = createFileRoute("/app/assistant")({ component: Assistant });

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTED = [
  "Summarize my most recent document.",
  "What can this platform do for my team?",
  "Draft a status update from this week's activity.",
  "Explain how approvals work here.",
];

function Assistant() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [useRag, setUseRag] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionId = useRef<string | undefined>(undefined);

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

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <PageHeader
        title="AI Assistant"
        description="Chat grounded in your organization's data. Every turn is traced."
        actions={
          messages.length > 0 ? (
            <button
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-sm hover:bg-surface-2"
            >
              <RefreshCw className="h-3.5 w-3.5" /> New chat
            </button>
          ) : undefined
        }
      />

      {/* Conversation */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-surface/50 p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/15 text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <p className="text-sm text-muted-foreground">
              Ask anything, or start with a suggestion.
            </p>
            <div className="flex max-w-xl flex-wrap justify-center gap-2">
              {SUGGESTED.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-foreground transition hover:border-primary hover:text-primary"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                    m.role === "user"
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-primary/15 text-primary"
                  }`}
                >
                  {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div
                  className={`max-w-[80%] whitespace-pre-wrap rounded-xl px-4 py-2.5 text-sm ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-card text-foreground"
                  }`}
                >
                  {m.content || (streaming ? "…" : "")}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-3 flex items-center gap-2"
      >
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={useRag}
            onChange={(e) => setUseRag(e.target.checked)}
            className="accent-[var(--primary)]"
          />
          Use my documents
        </label>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message the assistant…"
          disabled={streaming}
          className="flex-1 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
