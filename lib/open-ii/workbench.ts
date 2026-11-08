import type { OpenIiContextResponse, OperatorEnvironment, OperatorWorkload } from "@/lib/open-ii/types";
import type { LabRuntime, LabStepStatus, LabTopologyNode } from "@/lib/open-ii/labs";

export function resourceTitle(value: { id: string; name?: string; slug?: string } | null | undefined): string {
  if (!value) return "Not selected";
  return value.name || value.slug || value.id;
}

export function workloadEnvironmentId(workload: OperatorWorkload | null | undefined): string {
  return String(workload?.environment_id || workload?.environmentId || "");
}

export function selectedEnvironment(context: OpenIiContextResponse): OperatorEnvironment | null {
  const id = context.workspace?.environmentId || "";
  if (!id) return null;
  return context.environments.find((item) => item.id === id) || null;
}

export function selectedWorkload(context: OpenIiContextResponse): OperatorWorkload | null {
  const id = context.workspace?.workloadId || "";
  if (!id) return null;
  return context.workloads.find((item) => item.id === id) || null;
}

export function topologyNodeStatus(node: LabTopologyNode, runtime: LabRuntime): LabStepStatus | "neutral" {
  if (!node.stepId) return "neutral";
  return runtime.runtimeSteps.find((step) => step.id === node.stepId)?.status || "locked";
}

export function labProgress(runtime: LabRuntime): { verified: number; total: number; percent: number } {
  const total = runtime.runtimeSteps.length;
  const verified = runtime.runtimeSteps.filter((step) => step.status === "verified").length;
  return { verified, total, percent: total ? Math.round((verified / total) * 100) : 0 };
}
