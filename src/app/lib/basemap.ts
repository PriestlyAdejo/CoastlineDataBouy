/** Dark basemap — Esri canvas tiles tend to load more reliably than Carto behind strict browsers / blockers. */
export const NEREUS_DARK_BASEMAP = {
  url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
  attribution:
    "Tiles &copy; Esri &mdash; Source: Esri, HERE, Garmin, FAO, NOAA, USGS, EPA, NPS, USGS, USDA",
} as const;
