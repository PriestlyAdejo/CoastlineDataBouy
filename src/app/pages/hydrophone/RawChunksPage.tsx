import { isBrightonDemo } from "../../lib/demoMode";
import { useDeploymentView } from "../../hooks/useDeploymentView";
import { RawRecordingChunks } from "../../components/hydrophone/RawRecordingChunks";
import { FutureAnalysisPlaceholder } from "../../components/hydrophone/FutureAnalysisPlaceholder";

export function RawChunksPage() {
  const vm = useDeploymentView();
  if (!isBrightonDemo()) {
    return <RawRecordingChunks />;
  }
  if (!vm) {
    return <FutureAnalysisPlaceholder title="Raw recording chunks" />;
  }
  return <RawRecordingChunks replayMode replayFiles={vm.files} />;
}
