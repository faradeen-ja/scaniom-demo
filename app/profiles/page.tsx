import { ProfileManager } from "@/components/ProfileManager";

export default function ProfilesPage() {
  return <div className="profile-page page-stack">
    <section className="page-heading dark-heading compact-heading"><span className="eyebrow">SCANIOM CONTROL PROFILES</span><h1>Select the Control authority.</h1><p>Cloud is the public default. Self-hosted, private-enterprise, staging and local profiles keep the same Open Immune ↔ Scaniom authorization contract.</p></section>
    <ProfileManager/>
  </div>;
}
