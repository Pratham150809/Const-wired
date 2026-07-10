import { createFileRoute } from "@tanstack/react-router";
import { KeyRound, Cpu } from "lucide-react";

import { useTenant } from "../api";
import { PageHeader } from "../components/common/PageHeader";
import { EmptyState } from "../components/common/states";
import { useSession } from "../lib/session";

export const Route = createFileRoute("/app/settings")({ component: SettingsPage });

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-4 text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 py-2.5 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

function SettingsPage() {
  const { me } = useSession();
  const tenant = useTenant();

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Settings"
        description="Your profile, tenant, and provider configuration."
      />

      <div className="grid gap-5">
        <Section title="Profile">
          <Row label="Email" value={me?.email ?? me?.user_id ?? "—"} />
          <Row label="Roles" value={me?.roles.join(", ") || "none"} />
          <Row label="User ID" value={<span className="font-mono text-xs">{me?.user_id}</span>} />
        </Section>

        <Section title="Tenant">
          {tenant.isLoading ? (
            <div className="h-20 animate-pulse rounded-lg bg-muted" />
          ) : tenant.error ? (
            <p className="text-sm text-muted-foreground">Could not load tenant details.</p>
          ) : (
            <>
              <Row label="Name" value={tenant.data?.name ?? "—"} />
              <Row label="Slug" value={tenant.data?.slug ?? "—"} />
              <Row label="Status" value={tenant.data?.status ?? "—"} />
            </>
          )}
        </Section>

        <Section title="LLM Providers">
          <EmptyState
            icon={Cpu}
            title="Provider configuration not available yet"
            description="Per-tenant model + provider settings need a backend endpoint. Models are currently configured centrally via the LiteLLM gateway."
          />
        </Section>

        <Section title="API Keys">
          <EmptyState
            icon={KeyRound}
            title="No API-key management yet"
            description="Programmatic API keys will appear here once the backend exposes a keys endpoint."
          />
        </Section>
      </div>
    </div>
  );
}
