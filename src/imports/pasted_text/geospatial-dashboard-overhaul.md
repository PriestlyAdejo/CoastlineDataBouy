You are a senior product designer, geospatial dashboard designer, environmental data UX designer, interaction designer, and Figma systems architect. You are modifying an **existing Figma dashboard**, not producing a loose concept.

Your job is to **directly overhaul the Location / Map page and the Overview page map experience** so they become a fully integrated geospatial monitoring and deployment-planning system for a coastal sensing buoy dashboard.

Do not just improve labels.
Do not only redesign the side panel.
Do not leave overlays as fake toggles.
Do not return a shallow summary.

I need you to make **actual design and structural changes** in the Figma file so the map system becomes:
- more useful
- more realistic
- more geospatially rich
- more operational
- more visually impressive
- more consistent between Overview and Location / Map
- more component-driven
- more portfolio-worthy

---

# PROJECT CONTEXT

This is a final-year university engineering dashboard for a **coastal multi-sensor sensing buoy** system.

The buoy is:
- compact
- hydrophone-led
- GPS-enabled
- telemetry-enabled
- environmental monitoring capable
- local-first logging
- summary/live-dashboard oriented rather than full raw continuous streaming

The dashboard must support:
- live status monitoring
- buoy location tracking
- deployment planning
- environmental context
- map-based situational awareness
- historical review
- technical presentation / portfolio screenshots

---

# CORE SYSTEM CONTEXT TO RESPECT

Assume the buoy and dashboard currently revolve around:
- Hydrophone / acoustic preview analytics
- GPS / location / track
- IMU / motion
- battery and power telemetry
- internal enclosure health
- water temperature and environmental support sensing
- LoRa / Wi-Fi / system health telemetry
- historical data access
- public environmental context layers where useful

Do not turn this into a fake giant commercial observatory.
But do make the map feel expandable, intelligent, and professionally structured.

---

# MAIN PROBLEM TO FIX

The current result is still not enough.

## What is still wrong
1. The map overlays are not actually present in the way I want.
2. The map page still does not feel fully geospatially rich enough.
3. The Overview page map and the Location / Map page do not yet feel like the same system.
4. The Overview right pane needs to be refactored.
5. The Overview right pane should be fed by content selected from the left-side Monitoring pages.
6. Each relevant Monitoring page should have a subtle action such as **Show in Overview**, **Pin to Overview**, or **Add to Overview Panel** so users can control what appears in the Overview right pane.
7. The map overlays need to be visibly rendered on the map itself, not just listed as toggles.

You must fix all of this.

---

# PRIMARY GOAL

Create a **true geospatial dashboard system** where:

## A. Location / Map page
- becomes a full-screen, dominant operational map
- includes visibly rendered overlays on the map
- supports richer map intelligence
- supports public environmental/ocean/weather/context layers
- clearly shows selected buoy state
- includes floating detail panels and legends
- supports forecast/deployment decision-making

## B. Overview page
- uses the **same visual and interaction language** as the full Location / Map page
- contains a smaller but clearly related version of the same map system
- uses the same marker logic, overlay logic, selected state logic, and panel logic
- has a refactored right pane that becomes a modular Overview panel
- allows widgets from Monitoring pages to populate the right pane intentionally

---

# CRITICAL REQUIREMENT: THE OVERLAYS MUST ACTUALLY APPEAR ON THE MAP

This is the most important correction.

Do not just add overlay toggles in a side panel.
Do not just say “weather warnings on/off.”
Actually design the map so the overlays are **visibly represented on the map canvas**.

I want real visual map layers such as:

## Ocean / marine overlays
- wave height heatmap
- wave direction vectors or directional field
- currents heatmap
- current direction vectors / streamlines
- wind speed / wind direction overlay
- sea-state or marine suitability shading

## Weather / forecast overlays
- storm warning regions
- weather risk zones
- forecast-driven map tinting or raster-style conditions
- forecast timeline / time-step behaviour

## Ecological / contextual overlays
- wildlife distribution / habitat probability style overlays using public data where realistic
- marine protected areas
- restricted zones
- protected boundaries
- exclusion / caution zones
- deployment zones / anchor radius / drift envelope

## Operational overlays
- buoy positions
- selected buoy halo
- buoy tracks
- recent movement / drift traces
- selected node footprint
- alert zones or site-specific context

These layers must be **visually visible on the map itself** in the design:
- heatmaps
- shaded polygons
- contours
- risk masks
- stripes / hatch patterns for protected areas
- vector arrows
- forecast zones
- region fills
- highlighted site circles
- anchor radius outlines
- track lines

Make them tasteful, dark-mode compatible, and readable.

---

# VERY IMPORTANT: FIND AND USE PUBLIC DATA SOURCES / APIs / MAP SOURCES

Use **publicly available environmental / geospatial data sources** to inform the map overlay architecture.

If you are able to search or reason from available public sources, identify suitable source types for:
- waves
- currents
- wind
- marine forecast
- weather
- storms
- protected areas
- wildlife / habitat / ecological distribution context
- coastal environmental boundaries

Examples of the kinds of external sources to design around:
- public weather APIs
- marine forecast APIs
- Copernicus-style ocean products
- EMODnet-style marine layers
- NOAA / ECMWF / Met Office / national hydrographic / marine data products
- public protected-area datasets
- biodiversity / ecological distribution datasets

If the design tool cannot connect to live data, still build the UI **as if these source-backed overlays are supported**, with clear source labels and realistic active states.

In the UI, clearly distinguish:
- Live buoy telemetry
- Public forecast/model layer
- Public habitat/ecology layer
- Static reference boundary
- Public warning feed
- Internal operational layer

Do not misrepresent external overlays as if they are directly measured by our buoy.

---

# LOCATION / MAP PAGE: WHAT I WANT

## 1. FULL-SCREEN MAP DOMINANCE
The map must take over almost all of the content area.
Keep:
- left dashboard sidebar visible
- app shell visible
- floating controls over the map
- floating right-side contextual panel
- floating legends / chips / time controls

But the map should clearly be the primary surface.

## 2. STRONGER SELECTED BUOY STATE
The selected buoy must be much more obvious.

Use:
- glow / halo
- stronger marker treatment
- label / chip / node name
- selected ring
- focus state
- clearer link between selected map marker and floating right-side panel

Hover state and selected state must look different.

## 3. FLOATING RIGHT PANEL
The right panel must float over the map and support modes such as:
- selected buoy info
- overlay details
- environmental context
- forecast summary
- deployment risk
- legend / source context
- alert snippets

## 4. FLOATING MAP CONTROLS
Include or improve:
- zoom in/out
- recenter on selected buoy
- fit all buoys
- basemap switcher
- layers control
- legend
- forecast / time slider access
- pin current view to Overview
- export snapshot
- compare site mode if appropriate

## 5. OVERLAYS MUST BE ON-MAP
Design the overlays directly on the map surface.
I want to see:
- wave heat coloring
- current or wind arrows
- protected area polygons
- wildlife / ecological regions
- storm / risk overlays
- forecast regions
- deployment suitability tinting
- boundary lines
- anchor radius / drift circle
- track lines

## 6. DEPLOYMENT SUPPORT
The map should help answer:
- should I deploy here?
- what are the risks?
- what is the wave/current/weather situation?
- is this inside a protected zone?
- what is forecast to happen?

Include deployment context such as:
- wind
- wave height
- current speed
- visibility if relevant
- weather warnings
- suitability score / badge
- caution / unsafe / suitable state
- region-level warnings

## 7. TIME / FORECAST CONTROL
Add map time behaviour:
- now
- +6h
- +12h
- +24h
- +48h
- historical
- forecast
- playback if useful

Overlays that are forecast-based should visibly respond to time state.

---

# OVERVIEW PAGE: WHAT I WANT

The Overview page map must be refactored so it feels like the **same system** as the Location / Map page.

## Required changes
- Use the same marker logic
- Use the same selected-buoy visual language
- Use the same hover tooltip style
- Use a simplified version of the same overlay system
- Use the same environmental context logic
- Use the same basemap / overlay intelligence style
- Make the Overview map clearly a compact operational preview of the full map page

The Overview map should not feel like a separate weaker product.

### Overview map should support:
- buoy hover tooltip
- selected buoy state
- click-to-focus behaviour
- quick overlay chips
- quick environmental context
- click-through to full Location / Map page
- clear relation to right-side overview panel

---

# OVERVIEW RIGHT PANE: COMPLETE REFACTOR REQUIRED

The Overview right pane needs to be rebuilt into a **modular overview surface** rather than a static collection of cards.

It should contain:
- selected buoy summary
- overview metrics
- pinned widgets from Monitoring pages
- deployment snippets
- alert snippets
- telemetry snippets
- environmental snippets
- hydrophone snippets
- system-health snippets
- trend snippets

This right pane should feel like a configurable command-summary area.

---

# MONITORING PAGES MUST FEED THE OVERVIEW

This is extremely important.

The sections in the left navigation under Monitoring should control what can appear in the Overview right pane.

For each relevant Monitoring page, add a subtle but real action like:
- Show in Overview
- Pin to Overview
- Add to Overview Panel
- Include in Overview

This action should exist on the page itself in a low-key but clear way.

## Relevant pages include
- Telemetry
- Hydrophone
- Environment
- Location / Map
- System Health
- Alerts
- Historical / Trends if relevant

### Example behaviour
- Telemetry page has a detailed graph or widget -> user can pin it to Overview
- Environment page has selected current conditions or trend card -> user can show it in Overview
- System Health page has storage/battery/watchdog cards -> user can include them in Overview
- Hydrophone page has acoustic preview summary -> user can pin it to Overview
- Location / Map page can pin the selected map context / environmental context card to Overview

This should be designed intentionally, not as a hack.

---

# WHAT I NEED YOU TO DESIGN FOR THIS OVERVIEW-PINNING SYSTEM

Create a proper component/system for Overview customisation.

Include:
- “Show in Overview” button or action on relevant pages
- selected state for widgets already shown in Overview
- add/remove interaction state
- subtle success feedback
- Overview right-pane layout rules
- widget size types
- widget priority rules
- drag/reorder optional if appropriate
- empty state / default state for Overview panel
- pinned source label if useful

The Overview right pane should look curated and modular, not random.

---

# LAYER / OVERLAY ARCHITECTURE I WANT

Group layers clearly.

## Suggested groups

### 1. Operational
- buoy positions
- buoy tracks
- selected buoy anchor radius
- drift envelope
- deployment zones
- alert markers

### 2. Ocean Conditions
- wave height
- wave direction
- current speed
- current vectors
- wind speed / direction
- sea-state suitability

### 3. Weather / Forecast
- storm warnings
- forecast regions
- adverse weather zones
- forecast timeline

### 4. Ecological / Reference
- protected areas
- wildlife distribution
- habitat probability zones
- ecological sensitivity areas
- marine boundaries / restricted zones

Each layer should have:
- toggle
- visual map representation
- source label
- units
- legend access
- active chip
- loading / unavailable state
- optional opacity or intensity control when useful

---

# FOCUS ON COMPONENTS

Create or modify reusable components for:
- overview map container
- location map container
- buoy marker default
- buoy marker hover
- buoy marker selected
- buoy marker alert
- selected buoy glow state
- map tooltip
- floating right-side panel shell
- overview right-pane widget card
- “Show in Overview” action
- pinned widget state
- overlay chip
- layer group panel
- basemap switcher
- legend card
- forecast timeline bar
- suitability badge
- environmental context card
- selected node card
- protected-area label
- wildlife layer label
- risk badge
- source badge
- map snapshot/export button

These must all match the existing dashboard design system.

---

# VISUAL DIRECTION

Use the existing dark technical oceanic aesthetic, but make it stronger and clearer.

The final map system should feel:
- flagship
- premium
- full-screen
- scientific
- marine-technical
- geospatially intelligent
- dark and cinematic but readable
- useful to engineers
- strong for screenshots and presentations

Avoid:
- default GIS clutter
- fake sci-fi nonsense
- unreadable rainbow overlays
- side panels with fake toggles but no visible layers
- weak selected state
- overview and map page feeling disconnected

---

# DO NOT MISS THIS

You must actually:
1. make the overlays visibly appear on the map
2. refactor the Overview map so it uses the same system as the full map page
3. refactor the Overview right pane into a modular panel
4. add “Show in Overview” / “Pin to Overview” actions on Monitoring pages so those pages can feed the Overview right pane

These are the main things I need fixed.

---

# WHAT I NEED YOU TO PRODUCE

Modify the design and structure with this output logic in mind:

A. Design intent for the new shared map system  
B. New Location / Map page layout and hierarchy  
C. Overview map redesign so it matches the full map system  
D. Overview right-pane redesign and widget architecture  
E. Monitoring-page-to-Overview pinning system  
F. Overlay and public-data layer architecture  
G. Map components to create / update  
H. Interaction and behaviour rules  
I. Selected buoy emphasis and clarity improvements  
J. Figma implementation order / build priority  

Make strong design decisions.
Be specific.
Be implementation-ready.
Do not ask unnecessary clarifying questions.
Actually redesign the system, not just describe it.