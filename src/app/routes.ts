import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { DesignSystem } from "./pages/DesignSystem";
import { HistoricalData } from "./pages/HistoricalData";
import { Telemetry } from "./pages/Telemetry";
import { Environment } from "./pages/Environment";
import { LocationMap } from "./pages/LocationMap";
import { SystemHealth } from "./pages/SystemHealth";
import { Alerts } from "./pages/Alerts";
import { Files } from "./pages/Files";
import { DeploymentTools } from "./pages/DeploymentTools";
import { Documentation } from "./pages/Documentation";
import { SettingsPage } from "./pages/Settings";
import { HydrophoneLayout } from "./components/hydrophone/HydrophoneLayout";
import { StationSummary } from "./pages/hydrophone/StationSummary";
import { DailyEvents } from "./pages/hydrophone/DailyEvents";
import { AcousticEvents } from "./pages/hydrophone/AcousticEvents";
import { DailySoundscape } from "./pages/hydrophone/DailySoundscape";
import { SpectralDensities } from "./pages/hydrophone/SpectralDensities";
import { SoundLevels } from "./pages/hydrophone/SoundLevels";
import { RecordingEffort } from "./pages/hydrophone/RecordingEffort";
import { RawChunksPage } from "./pages/hydrophone/RawChunksPage";
import { WaveformPreview } from "./pages/hydrophone/WaveformPreview";
import { VesselMechanicalCandidates } from "./pages/hydrophone/VesselMechanicalCandidates";
import { MlClassifierScores } from "./pages/hydrophone/MlClassifierScores";
import { AnomalyQualityControl } from "./pages/hydrophone/AnomalyQualityControl";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: "telemetry", Component: Telemetry },
      {
        path: "hydrophone",
        Component: HydrophoneLayout,
        children: [
          { index: true, Component: StationSummary },
          { path: "chunks", Component: RawChunksPage },
          { path: "waveform", Component: WaveformPreview },
          { path: "vessel-mechanical", Component: VesselMechanicalCandidates },
          { path: "ml-scores", Component: MlClassifierScores },
          { path: "quality", Component: AnomalyQualityControl },
          { path: "daily-events", Component: DailyEvents },
          { path: "acoustic-events", Component: AcousticEvents },
          { path: "soundscape", Component: DailySoundscape },
          { path: "spectral", Component: SpectralDensities },
          { path: "levels", Component: SoundLevels },
          { path: "effort", Component: RecordingEffort },
        ],
      },
      { path: "environment", Component: Environment },
      { path: "map", Component: LocationMap },
      { path: "system-health", Component: SystemHealth },
      { path: "alerts", Component: Alerts },
      { path: "data", Component: HistoricalData },
      { path: "files", Component: Files },
      { path: "deployment", Component: DeploymentTools },
      { path: "docs", Component: Documentation },
      { path: "settings", Component: SettingsPage },
      { path: "design-system", Component: DesignSystem },
    ],
  },
]);
