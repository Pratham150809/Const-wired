import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Search } from "lucide-react";
import { useState } from "react";

import { useRetrieveDocuments } from "../api";
import { PageHeader } from "../components/common/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/common/states";

export const Route = createFileRoute("/app/knowledge")({ component: Knowledge });

function confidenceTone(score: number): string {
  if (score >= 0.75) return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
  if (score >= 0.5) return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
  return "bg-muted text-muted-foreground";
}

function Knowledge() {
  const [query, setQuery] = useState("");
  const search = useRetrieveDocuments();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) search.mutate(query.trim());
  };

  const results = search.data?.results ?? [];

  return (
    <div>
      <PageHeader
        title="Knowledge"
        description="Semantic search across your tenant's documents. Results are ranked by confidence."
      />

      <form onSubmit={onSubmit} className="relative mb-6 max-w-2xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask a question or search your documents…"
          className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-24 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="submit"
          disabled={search.isPending || !query.trim()}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          Search
        </button>
      </form>

      {search.isPending ? (
        <LoadingState label="Searching…" />
      ) : search.isError ? (
        <ErrorState
          message="Search failed. Embeddings require an LLM provider key on the backend."
          onRetry={() => query.trim() && search.mutate(query.trim())}
        />
      ) : !search.data ? (
        <EmptyState
          icon={BookOpen}
          title="Search your knowledge base"
          description="Enter a question above to retrieve the most relevant passages from your documents."
        />
      ) : results.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No matches"
          description={`Nothing found for “${query}”.`}
        />
      ) : (
        <div className="grid gap-3">
          {results.map((r, i) => (
            <div
              key={`${r.document_id}-${r.chunk_index}-${i}`}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="font-mono text-xs text-muted-foreground">
                  Source: {r.document_id.slice(0, 8)}… · chunk {r.chunk_index}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${confidenceTone(r.score)}`}
                >
                  {(r.score * 100).toFixed(0)}% match
                </span>
              </div>
              <p className="text-sm text-foreground/90">{r.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
