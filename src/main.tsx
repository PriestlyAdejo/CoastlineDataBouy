import "leaflet/dist/leaflet.css";
import "./app/lib/leafletTileImagePatch";
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import {
  applyHandoverReadableClass,
  applyHandoverUrlParams,
  enforceHandoverSession,
} from "./app/lib/handoverMode";
import {
  applyShowcaseUrlParams,
  enforceShowcaseSession,
} from "./app/lib/showcaseMode";
import "./styles/index.css";

applyShowcaseUrlParams();
applyHandoverUrlParams();
enforceShowcaseSession();
enforceHandoverSession();
applyHandoverReadableClass();

createRoot(document.getElementById("root")!).render(<App />);
