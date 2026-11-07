import "server-only";
import { readWorkspaceCookie, writeWorkspaceCookie } from "@/lib/open-ii/cookies";
import { controlApi } from "@/lib/open-ii/control-client";
import type { OpenIiSession, OperatorEnvironment, OperatorWorkload, ResolvedControlProfile, WorkspaceCookieState } from "@/lib/open-ii/types";

function itemsFrom<T>(body: unknown): T[] {
  if (!body || typeof body !== "object" || Array.isArray(body)) return [];
  const items = (body as { items?: unknown }).items;
  return Array.isArray(items) ? items as T[] : [];
}

export async function loadWorkspaceResources(profile: ResolvedControlProfile, session: OpenIiSession): Promise<{
  environments: OperatorEnvironment[];
  workloads: OperatorWorkload[];
}> {
  const [environmentBody, workloadBody] = await Promise.all([
    controlApi<unknown>(profile, "/api/v1/operator/environments", session.token),
    controlApi<unknown>(profile, "/api/v1/operator/workloads", session.token),
  ]);
  return {
    environments: itemsFrom<OperatorEnvironment>(environmentBody),
    workloads: itemsFrom<OperatorWorkload>(workloadBody),
  };
}

function matches(ref: string, value: { id: string; name?: string; slug?: string }): boolean {
  const needle = ref.trim().toLowerCase();
  return [value.id, value.name, value.slug].some((item) => String(item || "").toLowerCase() === needle);
}

export async function selectedWorkspace(profile: ResolvedControlProfile, session: OpenIiSession): Promise<WorkspaceCookieState | null> {
  const stored = await readWorkspaceCookie();
  if (!stored || stored.version !== 1 || stored.profileName !== profile.name || stored.organizationId !== session.identity.organizationId) return null;
  return stored;
}

export async function setWorkspaceSelection(input: { environment?: unknown; workload?: unknown }, profile: ResolvedControlProfile, session: OpenIiSession): Promise<WorkspaceCookieState> {
  const { environments, workloads } = await loadWorkspaceResources(profile, session);
  const environmentRef = String(input.environment || "").trim();
  const workloadRef = String(input.workload || "").trim();
  const environment = environmentRef ? environments.find((item) => matches(environmentRef, item)) : null;
  if (environmentRef && !environment) throw new Error(`Environment not found: ${environmentRef}`);
  const workload = workloadRef ? workloads.find((item) => matches(workloadRef, item)) : null;
  if (workloadRef && !workload) throw new Error(`Workload not found: ${workloadRef}`);

  const workloadEnvironmentId = workload ? String(workload.environment_id || workload.environmentId || "") : "";
  if (environment && workload && workloadEnvironmentId && workloadEnvironmentId !== environment.id) {
    throw new Error("The selected workload does not belong to the selected environment.");
  }
  const effectiveEnvironmentId = environment?.id || workloadEnvironmentId || null;
  const state: WorkspaceCookieState = {
    version: 1,
    profileName: profile.name,
    organizationId: session.identity.organizationId,
    environmentId: effectiveEnvironmentId,
    workloadId: workload?.id || null,
  };
  await writeWorkspaceCookie(state);
  return state;
}
