import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { Json } from "@/lib/supabase/database.types";

export interface AuditEvent {
  actor: string | null;
  action: string;
  target: string;
  metadata?: Record<string, Json>;
}

// A failed audit write must never block the action it's logging (e.g. a delete or
// share should still succeed even if the audit row fails to write) — so this
// swallows errors after logging them with context, rather than throwing.
export async function logAudit(event: AuditEvent): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("audit_log").insert({
    actor: event.actor,
    action: event.action,
    target: event.target,
    metadata: event.metadata ?? null,
  });

  if (error) {
    console.error("logAudit: failed to write audit_log row", {
      action: event.action,
      target: event.target,
      message: error.message,
    });
  }
}
