import { ReleaseControl } from "../ReleaseControl";
import { WorkspaceHeader } from "@/components/patterns/WorkspaceHeader";

export default function SettingsReleasePage() {
  return <div data-settings-route="release"><WorkspaceHeader size="page" eyebrow="settings / release" title="release control" summary="Inspect the server-governed Beta track and release state. Browser state never activates protected chat." accent="attention" /><div className="mt-6"><ReleaseControl /></div></div>;
}
