import { validateOpenIiSession } from "@/lib/open-ii/auth";
import { controlApi } from "@/lib/open-ii/control-client";
import { noStore } from "@/lib/open-ii/http";
import { profileCliCommands } from "@/lib/open-ii/profile-contract";
import { requestHost } from "@/lib/open-ii/profile-store";
import { loadWorkspaceResources, selectedWorkspace } from "@/lib/open-ii/workspace";
import type { ControlDeploymentResponse } from "@/lib/open-ii/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const current = await validateOpenIiSession(requestHost(request));
  if (!current) return noStore({ error: "Not connected to Scaniom Control." }, { status: 401 });
  try {
    const [resources, workspace, deployment] = await Promise.all([
      loadWorkspaceResources(current.profile, current.session),
      selectedWorkspace(current.profile, current.session),
      controlApi<ControlDeploymentResponse>(current.profile, "/api/v1/control/deployment", current.session.token),
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
      cli: profileCliCommands(current.profile),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return noStore({ error: message }, { status: 502 });
  }
}
