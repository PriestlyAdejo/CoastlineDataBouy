import "leaflet/dist/leaflet.css";
import "./app/lib/leafletTileImagePatch";
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(<App />);
