import { validateOpenIiSession } from "@/lib/open-ii/auth";
import { controlApi } from "@/lib/open-ii/control-client";
import { noStore } from "@/lib/open-ii/http";
import { profileCliCommands } from "@/lib/open-ii/profile-contract";
import { requestHost } from "@/lib/open-ii/profile-store";
import { loadWorkspaceResources, selectedWorkspace } from "@/lib/open-ii/workspace";
import type {
  ControlDeploymentResponse,
  OperatorAttachmentState,
  OperatorConnection,
  OperatorNode,
  OperatorPolicy,
} from "@/lib/open-ii/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ItemEnvelope<T> = { items?: T[] };

async function optionalItems<T>(profile: Parameters<typeof controlApi>[0], token: string, route: string): Promise<T[]> {
  try {
    const body = await controlApi<ItemEnvelope<T>>(profile, route, token);
    return Array.isArray(body.items) ? body.items : [];
  } catch {
    return [];
  }
}

async function optionalAttachmentState(profile: Parameters<typeof controlApi>[0], token: string, workloadId: string | null | undefined): Promise<OperatorAttachmentState | null> {
  if (!workloadId) return null;
  try {
    return await controlApi<OperatorAttachmentState>(profile, `/api/v1/operator/attachments?workload=${encodeURIComponent(workloadId)}`, token);
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const current = await validateOpenIiSession(requestHost(request));
  if (!current) return noStore({ error: "Not connected to Scaniom Control." }, { status: 401 });
  try {
    const [resources, workspace, deployment] = await Promise.all([
      loadWorkspaceResources(current.profile, current.session),
      selectedWorkspace(current.profile, current.session),
      controlApi<ControlDeploymentResponse>(current.profile, "/api/v1/control/deployment", current.session.token),
    ]);

    const [nodes, connections, policies, attachments] = await Promise.all([
      optionalItems<OperatorNode>(current.profile, current.session.token, "/api/v1/operator/nodes"),
      optionalItems<OperatorConnection>(current.profile, current.session.token, "/api/v1/operator/connections"),
      optionalItems<OperatorPolicy>(current.profile, current.session.token, "/api/v1/operator/policy"),
      optionalAttachmentState(current.profile, current.session.token, workspace?.workloadId),
    ]);

    return noStore({
      profile: {
        name: current.profile.name,
        label: current.profile.label,
        type: current.profile.type,
        controlUrl: current.profile.controlUrl,
      },
      identity: current.session.identity,
      whoami: current.whoami,
      deployment: deployment.deployment,
      workspace,
      environments: resources.environments,
      workloads: resources.workloads,
      nodes,
      connections,
      policies,
      attachments,
      cli: profileCliCommands(current.profile),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return noStore({ error: message }, { status: 502 });
  }
}
