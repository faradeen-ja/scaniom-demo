import { ScaniomConnection } from "@/components/ScaniomConnection";
import { WorkspaceContext } from "@/components/WorkspaceContext";

export default function WorkspacePage() {
  return <div className="page-stack"><section className="page-heading"><span className="eyebrow">OPEN IMMUNE WORKBENCH · FOUNDATION</span><h1>Authority before canvas.</h1><p>This first accepted slice connects the real Scaniom profile, identity, organization, environment, and workload. The guided Fabric Tree + Matrix attaches to this context next.</p></section><ScaniomConnection compact/><WorkspaceContext/></div>;
}
