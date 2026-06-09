import "leaflet/dist/leaflet.css";
import "./app/lib/leafletTileImagePatch";
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { applyHandoverUrlParams, enforceHandoverSession } from "./app/lib/handoverMode";
import "./styles/index.css";

applyHandoverUrlParams();
enforceHandoverSession();

createRoot(document.getElementById("root")!).render(<App />);
